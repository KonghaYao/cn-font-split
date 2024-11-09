#[macro_use]
extern crate rocket;
use crate::rocket::tokio::io::AsyncReadExt;
use rocket::data::{Data, ToByteUnit};
use woff::version2::compress;

#[route(POST, uri = "/woff2", data = "<data>")]
async fn compress_handler<'a>(data: Data<'a>) -> Result<Vec<u8>, String> {
    // 读取上传的数据
    let mut buffer = Vec::new();
    if let Err(e) = data.open(20.megabytes()).read_to_end(&mut buffer).await {
        return Err(format!("Failed to read data: {}", e));
    }
    // 调用 compress 函数
    match compress(&buffer, String::from(""), 1, true) {
        Some(compressed_data) => Ok(compressed_data),
        None => Err("Compression failed".into()),
    }
}

#[launch]
fn rocket() -> _ {
    rocket::build().mount("/", routes![compress_handler])
}
