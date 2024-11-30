use std::convert::Infallible;

use axum::{
    body::{Body, Bytes},
    extract::DefaultBodyLimit,
    http::{HeaderMap, Response},
    response::{sse::Event, IntoResponse, Sse},
    routing::{get, post},
    Router,
};
mod storage;
use cn_font_proto::api_interface::{EventMessage, EventName, InputTemplate};
use cn_font_split::font_split;
use tokio::sync::mpsc::{self};
use tokio_stream::StreamExt as _;

#[tokio::main]
async fn main() {
    let app = Router::new().route("/", get(|| async { "Hello, Rust!" })).route(
        "/upload",
        post(upload).layer(DefaultBodyLimit::max(1024 * 1024 * 100)),
    );

    println!("Running on http://localhost:3000");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn upload(file: Bytes) -> Response<Body> {
    let file_vec: Vec<u8> = file.into();
    let template = InputTemplate { input: file_vec, ..Default::default() };

    // 设置响应头
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", "text/event-stream".parse().unwrap());
    headers.insert("Cache-Control", "no-cache".parse().unwrap());
    headers.insert("Connection", "keep-alive".parse().unwrap());

    let (tx, mut rx) = mpsc::unbounded_channel::<Event>();
    // 启动异步任务，该任务会调用回调函数并将数据发送到通道中
    tokio::spawn(async move {
        font_split(template, |data: EventMessage| {
            let _ = tx.send(event_message_to_event(data));
        });
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

fn event_message_to_event(message: EventMessage) -> Event {
    let binding = message.data.unwrap();
    let event = EventName::try_from(message.event).unwrap().as_str_name();
    Event::default().id(message.message).event(event)
}
