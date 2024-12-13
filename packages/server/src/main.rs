use std::{
    convert::Infallible,
    env,
    io::Write,
    sync::{Arc, Mutex},
};

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
use storage::OssApi;
use tokio::sync::mpsc::{self};
use tokio_stream::StreamExt as _;
use zip::write::FileOptions;

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
    
    let oss = OssApi::new(&env::var("S3_ENDPOINT").unwrap());
    oss.init_font_system().await;

    let (tx, mut rx) = mpsc::unbounded_channel::<Event>();
    // 启动异步任务，该任务会调用回调函数并将数据发送到通道中
    tokio::spawn(async move {
        let mut buffer = Vec::new();
        let hash = format!("{:?}", md5::compute(buffer.as_slice()));
        let zip_writer = zip::ZipWriter::new(std::io::Cursor::new(&mut buffer));
        let safe_zip = Arc::new(Mutex::new(zip_writer));
        let result_font = oss.get_bucket("result-font");
        font_split(template, |data: EventMessage| {
            let a = Arc::clone(&safe_zip);
            let mut safe_zip = a.lock().unwrap();
            match EventName::try_from(data.event).unwrap() {
                EventName::Unspecified => {}
                EventName::OutputData => {
                    safe_zip
                        .start_file::<String, ()>(
                            data.message.clone(),
                            FileOptions::default(),
                        )
                        .unwrap();
                    let binary = data.data.unwrap();
                    safe_zip.write_all(&binary).unwrap();
                }
                EventName::End => {}
            };

            let event = EventName::try_from(data.event).unwrap().as_str_name();
            let _ =
                tx.send(Event::default().id(data.message.clone()).event(event));
        });

        let safe_zip =
            Arc::try_unwrap(safe_zip).ok().unwrap().into_inner().unwrap();
        safe_zip.finish().unwrap();
        let _ = result_font.put_object(hash.clone() + ".zip", &buffer).await;
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
