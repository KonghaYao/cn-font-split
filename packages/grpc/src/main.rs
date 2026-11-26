use cn_font_proto::{
    api_interface::{EventMessage, InputTemplate},
    font_services::font_api_server::{FontApi, FontApiServer},
};
use cn_font_split::font_split;
use std::{pin::Pin, time::Duration};
use tokio::sync::mpsc;
use tokio_stream::Stream;
use tokio_stream::wrappers::UnboundedReceiverStream;
use tonic::{
    Request, Response, Status, codec::CompressionEncoding, transport::Server,
};

#[derive(Debug, Default)]
pub struct FontApiPort {}

#[tonic::async_trait]
impl FontApi for FontApiPort {
    type FontSplitStream =
        Pin<Box<dyn Stream<Item = Result<EventMessage, Status>> + Send>>;
    async fn font_split(
        &self,
        request: Request<InputTemplate>,
    ) -> Result<Response<Self::FontSplitStream>, Status> {
        let input = request.into_inner();

        let (tx, rx) = mpsc::unbounded_channel::<Result<EventMessage, _>>();
        println!("{}", input.input.len());
        tokio::spawn(async move {
            let _ = font_split(input, |e| {
                // println!("{} {}", &e.message, tx.is_closed());
                let _ = tx.send(Ok(e));
            });
        });
        // println!("{}", rx.is_closed());
        let output_stream = UnboundedReceiverStream::new(rx);
        Ok(Response::new(Box::pin(output_stream) as Self::FontSplitStream))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt().with_max_level(tracing::Level::DEBUG).init();
    let addr = "127.0.0.1:50051".parse()?;
    // let data_dir =
    //     std::path::PathBuf::from_iter([std::env!("CARGO_MANIFEST_DIR")]);
    // let cert = std::fs::read_to_string(data_dir.join("tls/server.pem"))?;
    // let key = std::fs::read_to_string(data_dir.join("tls/server.key"))?;

    // let identity = Identity::from_pem(cert, key);
    println!("server listening on {}", addr);

    Server::builder()
        .initial_stream_window_size(Some(1 << 24)) // 设置初始流窗口大小
        .initial_connection_window_size(Some(1 << 24)) // 设置初始连接窗口大小
        .max_frame_size(Some(0xFFFFFF))
        .concurrency_limit_per_connection(1)
        .http2_max_pending_accept_reset_streams(Some(1000))
        .timeout(Duration::from_secs(60))
        .http2_keepalive_timeout(Some(Duration::from_secs(60)))
        .add_service(
            FontApiServer::new(FontApiPort::default())
                .max_decoding_message_size(100 * 1024 * 1024)
                .max_encoding_message_size(100 * 1024 * 1024)
                .accept_compressed(CompressionEncoding::Gzip),
        )
        .serve(addr)
        .await?;

    Ok(())
}

// 多线程 runtime：`font_split` 内部是同步阻塞调用，会占住一个 worker 线程，
// 单线程 runtime 下消费事件流的 future 无法被调度。
#[tokio::test(flavor = "multi_thread")]
async fn test_font_split() {
    use tokio_stream::StreamExt;

    async fn test_on(path: &str) {
        use cn_font_utils::read_binary_file;
        let font_file = read_binary_file(path)
            .unwrap_or_else(|e| panic!("failed to read font file {path}: {e}"));
        let request = Request::new(InputTemplate {
            input: font_file,
            ..Default::default()
        });

        // 进程内直接调用被测实现，不经过 gRPC 网络层。
        let port = FontApiPort::default();
        let mut stream = port
            .font_split(request)
            .await
            .expect("font_split should accept the request")
            .into_inner();

        let mut count = 0usize;
        while let Some(message) = stream.next().await {
            let message = message
                .unwrap_or_else(|e| panic!("stream from {path} failed: {e}"));
            println!("{:?}", message.message);
            count += 1;
        }
        assert!(count > 0, "expected at least one event from {path}");
    }

    test_on("../demo/public/SmileySans-Oblique.ttf").await;
    test_on("../demo/public/SmileySans-Oblique.ttf.woff2").await;
}
