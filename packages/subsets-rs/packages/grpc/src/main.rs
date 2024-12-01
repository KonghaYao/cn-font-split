use cn_font_proto::{
    api_interface::{EventMessage, InputTemplate},
    font_services::font_api_server::{FontApi, FontApiServer},
};
use cn_font_split::font_split;
use std::{pin::Pin, time::Duration, usize};
use tokio::sync::mpsc;
use tokio_stream::wrappers::UnboundedReceiverStream;
use tokio_stream::Stream;
use tonic::{
    codec::CompressionEncoding, transport::Server, Request, Response, Status,
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

        let (tx, mut rx) = mpsc::unbounded_channel::<Result<EventMessage, _>>();
        println!("{}", input.input.len());
        tokio::spawn(async move {
            font_split(input, |e| {
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

#[tokio::test]
async fn test_font_split() {
    use cn_font_proto::font_services::font_api_client::FontApiClient;
    use cn_font_utils::read_binary_file;
    let path = "../../../demo/public/SmileySans-Oblique.ttf";
    let font_file = read_binary_file(&path).expect("Failed to read file");
    let data = InputTemplate { input: font_file, ..Default::default() };

    let mut client =
        FontApiClient::connect("http://0.0.0.0:50051").await.unwrap();
    let mut stream = client.font_split(data).await.unwrap().into_inner();
    while let Ok(Some(next_message)) = stream.message().await {
        println!("{:?}", next_message.message);
    }
}
