use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};

// 状态结构体可以用来保存应用状态，例如密钥或配置
#[derive(Clone)]
pub struct AppState {
    pub origin_token: String, // 应该是你的原始令牌或者是用于哈希的秘密值
}

// 创建一个函数来生成token，用于测试或者比较
fn generate_token(origin_token: &str, timestamp: u64) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{}{}", origin_token, timestamp));
    format!("{:x}", hasher.finalize())
}

// 中间件用于检查传入请求的授权头
pub async fn auth_middleware(req: Request, next: Next) -> Response {
    let origin_token =
        std::env::var("AUTH_TOKEN").expect("AUTH_TOKEN must be set");
    let state = AppState { origin_token };
    // 获取当前时间戳（秒级）
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();

    // 获取Authorization头部，并尝试解析为Bearer token格式
    let authorization_header =
        if let Some(auth) = req.headers().get(header::AUTHORIZATION) {
            auth.to_str().ok().unwrap().strip_prefix("Bearer ").unwrap() // 假设使用的是 Bearer token 方式
        } else {
            return Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body("Missing or invalid Authorization header".into())
                .unwrap();
        };

    // 6 秒间隔
    let now = now / 10;

    // 检查token是否正确
    let expected_token = generate_token(&state.origin_token, now);
    if authorization_header == expected_token {
        // 如果token匹配，则继续处理请求
        return next.run(req).await;
    }
    // 如果没有找到匹配的token，返回未授权响应
    Response::builder()
        .status(StatusCode::UNAUTHORIZED)
        .body("Invalid token".into())
        .unwrap()
}
