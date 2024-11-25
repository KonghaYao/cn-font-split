use tonic::{transport::Server, Request, Response, Status};

pub mod cn_font_server {
    tonic::include_proto!("api_interface");
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // tracing_subscriber::fmt::init();

    // let addr = "127.0.0.1:3000".parse().unwrap();

    // Server::builder()
    //     // GrpcWeb is over http1 so we must enable it.
    //     .accept_http1(true)
    //     .serve(addr)
    //     .await?;

    Ok(())
}
