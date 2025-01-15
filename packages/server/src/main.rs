use std::{convert::Infallible, env};

use axum::{
    body::Body,
    extract::DefaultBodyLimit,
    http::{HeaderMap, Response},
    response::{sse::Event, IntoResponse, Sse},
    routing::{get, post},
    Json, Router,
};
use cn_font_proto::api_interface::{EventMessage, EventName, InputTemplate};
use cn_font_split::font_split;
use reqwest;
use reqwest::multipart;
use reqwest::Error;
use serde::Deserialize;
use tokio::sync::mpsc::{self};
use tokio_stream::StreamExt as _;
#[shuttle_runtime::main]
async fn main(
    #[shuttle_runtime::Secrets] secrets: shuttle_runtime::SecretStore,
) -> shuttle_axum::ShuttleAxum {
    secrets.into_iter().for_each(|(key, val)| {
        std::env::set_var(key, val);
    });
    let app = Router::new().route("/", get(|| async { "Hello, Rust!" })).route(
        "/upload",
        post(upload).layer(DefaultBodyLimit::max(1024 * 1024 * 80)),
    );
    Ok(app.into())
}

#[derive(Deserialize)]
struct UploadPayload {
    file_folder: String,
    file_url: String,
}
async fn upload(Json(payload): Json<UploadPayload>) -> Response<Body> {
    let file_vec = fetch_binary_file(&payload.file_url).await.unwrap();
    let template = InputTemplate { input: file_vec, ..Default::default() };

    // 设置响应头
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", "text/event-stream".parse().unwrap());
    headers.insert("Cache-Control", "no-cache".parse().unwrap());
    headers.insert("Connection", "keep-alive".parse().unwrap());

    let (tx, mut rx) = mpsc::unbounded_channel::<Event>();
    // 启动异步任务，该任务会调用回调函数并将数据发送到通道中
    tokio::spawn(async move {
        let buffer = Vec::new();
        let hash = format!("{:?}", md5::compute(buffer.as_slice()));
        font_split(template, |data: EventMessage| {
            match EventName::try_from(data.event).unwrap() {
                EventName::Unspecified => {}
                EventName::OutputData => {
                    let event =
                        EventName::try_from(data.event).unwrap().as_str_name();
                    let _ = tx.send(
                        Event::default()
                            .data(data.message.clone())
                            .event(event),
                    );
                    let binary = data.data.unwrap();
                    let folder = payload.file_folder.clone();
                    // safe_collection.push(binary);
                    tokio::spawn(async move {
                        upload_data(
                            binary,
                            folder,
                            String::from(data.message.clone()),
                        )
                        .await
                    });
                }
                EventName::End => {}
            };
        });

        let _ = tx.send(Event::default().id("result").event(hash));
    });

    let sse_stream = async_stream::stream! {
        // 创建一个无缓冲的通道
        while let Some(item) = rx.recv().await {
            yield item
        }
    };
    let try_str = sse_stream.map(Ok::<_, Infallible>);
    // 返回 SSE 响应
    let sse_response =
        Sse::new(try_str).keep_alive(axum::response::sse::KeepAlive::new());
    sse_response.into_response()
}

async fn upload_data(binary: Vec<u8>, folder: String, file_name: String) {
    //
    // 创建 multipart 表单
    let form = multipart::Form::new()
        .part(
            "file",
            multipart::Part::bytes(binary).file_name(file_name.clone()),
        )
        .text("fileName", file_name.clone())
        .text("useUniqueFileName", "false")
        .text("folder", folder)
        .text("isPrivateFile", "false");
    // 发送 POST 请求
    let token = "Basic ".to_owned() + &env::var("IMAGEKIT_TOKEN").unwrap();
    let client = reqwest::Client::new();
    let response = client
        .post("https://upload.imagekit.io/api/v1/files/upload")
        .header("Accept", "application/json")
        .header("authorization", token.clone())
        .multipart(form)
        .send()
        .await
        .unwrap();

    // 检查响应状态
    if response.status().is_success() {
        println!("{} 上传成功", file_name.clone());
    } else {
        println!(
            "Failed to upload file {} {}",
            response.status().as_str(),
            response.text().await.unwrap()
        );
    }
}

async fn fetch_binary_file(url: &str) -> Result<Vec<u8>, Error> {
    let response = reqwest::get(url).await?;
    let bytes = response.bytes().await?;
    Ok(bytes.to_vec())
}
