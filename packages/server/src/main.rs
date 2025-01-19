use std::sync::{Arc, Mutex};

use axum::{
    body::Body,
    extract::DefaultBodyLimit,
    http::Response,
    routing::{get, post},
    Json, Router,
};
use cn_font_proto::api_interface::{
    input_template::PreviewImage, EventMessage, EventName, InputTemplate,
};
use cn_font_split::font_split;
use cn_font_utils::output_file;
use futures::future::join_all;
use reqwest::Error;
use serde::Deserialize;
use tower_http::compression::CompressionLayer;
use tower_http::services::ServeDir;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route(
            "/",
            get(|| async {
                "Hello, I'm cn-font-split server for online building!"
            }),
        )
        .nest_service("/assets", ServeDir::new("assets"))
        .layer(CompressionLayer::new())
        .route(
            "/upload",
            post(split_font).layer(DefaultBodyLimit::max(1024 * 1024 * 80)),
        );
    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:9000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[derive(Deserialize)]
struct UploadPayload {
    file_folder: String,
    file_url: String,
}
async fn split_font(Json(payload): Json<UploadPayload>) -> Response<Body> {
    let file_vec = fetch_binary_file(&payload.file_url).await.unwrap();
    let template = InputTemplate {
        input: file_vec,
        preview_image: Some(PreviewImage {
            name: "preview".to_string(),
            text: "中文网字计划\nThe Chinese Web Fonts Plan".to_string(),
        }),
        ..Default::default()
    };

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
    Response::builder().body(Body::from("success")).unwrap()
}

/// 网络 IO 实在是太慢了，需要直接存储到本地
async fn upload_data(binary: Vec<u8>, folder: String, file_name: String) {
    // 写入到本地服务器的指定路径
    let file_path = format!("./assets{}/{}", folder, file_name);
    output_file(&file_path, &binary).expect("写入文件失败");
    println!("{} 上传成功", file_path.clone());
}

async fn fetch_binary_file(url: &str) -> Result<Vec<u8>, Error> {
    let response = reqwest::get(url).await?;
    let bytes = response.bytes().await?;
    Ok(bytes.to_vec())
}
