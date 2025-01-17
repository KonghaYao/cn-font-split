use std::{
    env,
    sync::{Arc, Mutex},
};

use axum::{
    body::Body,
    extract::DefaultBodyLimit,
    http::Response,
    routing::{get, post},
    Json, Router,
};
use cn_font_proto::api_interface::{EventMessage, EventName, InputTemplate};
use cn_font_split::font_split;
use futures::future::join_all;
use reqwest;
use reqwest::multipart;
use reqwest::Error;
use serde::Deserialize;

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

    let handles: Arc<Mutex<Vec<EventMessage>>> =
        Arc::new(Mutex::new(Vec::new())); // 创建一个可以在线程间共享的可变向量

    font_split(template, |data: EventMessage| {
        match EventName::try_from(data.event).unwrap() {
            EventName::Unspecified => {}
            EventName::OutputData => {
                // 锁定 mutex 并插入新的任务句柄
                if let Ok(mut handles_guard) = handles.lock() {
                    handles_guard.push(data.clone());
                }
            }
            EventName::End => {}
        };
    });

    let mut all_upload = vec![];
    // 等待所有异步任务完成
    if let Ok(handles_guard) = handles.lock() {
        for i in handles_guard.iter() {
            let folder = payload.file_folder.clone();
            let message = i.message.clone();
            let h = upload_data(
                i.data.clone().unwrap(),
                folder,
                String::from(message),
            );
            all_upload.push(h);
        }
    }
    join_all(all_upload).await;
    Response::builder().body(Body::empty()).unwrap()
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
