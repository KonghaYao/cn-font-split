use cn_font_split::font_split;
use cn_font_split::protos::{
    font_api_server::{FontApi, FontApiServer},
    EventMessage, InputTemplate,
};
use std::pin::Pin;
use tokio::sync::mpsc;
use tokio_stream::wrappers::UnboundedReceiverStream;
use tokio_stream::Stream;
// use tonic::codegen::futures_core::Stream;
use tonic::{transport::Server, Request, Response, Status};

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
                println!("{} {}", &e.message, tx.is_closed());
                let _ = tx.send(Ok(e));
            });
        });
        println!("{}", rx.is_closed());
        let output_stream = UnboundedReceiverStream::new(rx);
        Ok(Response::new(Box::pin(output_stream) as Self::FontSplitStream))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "0.0.0.0:50051".parse()?;

    println!("server listening on {}", addr);

    Server::builder()
        .add_service(FontApiServer::new(FontApiPort::default()))
        .serve(addr)
        .await?;

    Ok(())
}

#[tokio::test]
async fn test_font_split() {
    use cn_font_split::protos::font_api_client::FontApiClient;
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
