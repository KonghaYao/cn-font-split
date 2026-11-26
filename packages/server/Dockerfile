####################################################################################################
## Builder
##
## 8.0 冻结：基础镜像固定 rust:1.84.0，低于本仓库 MSRV 1.85，只能构建 README 中
## 冻结的 7.4 依赖（crates.io cn-font-split 7.4.0）。升级到 8.x 依赖时必须先把
## 这里换成 rust:1.85 及以上，详见 ./README.md 的「冻结说明（8.0）」。
####################################################################################################
FROM rust:1.84.0-bullseye AS builder
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/' /etc/apt/sources.list
RUN apt update && apt install -y openssl build-essential pkg-config libssl-dev
RUN update-ca-certificates

WORKDIR /app
RUN mkdir /app/.cargo/
RUN echo '[source.crates-io] \nreplace-with = "rsproxy-sparse" \n[source.rsproxy-sparse] \nregistry = "sparse+https://rsproxy.cn/index/" \n[net] \ngit-fetch-with-cli = true' > /app/.cargo/config.toml

#  欺骗缓存 cargo 依赖
RUN mkdir ./src && touch ./src/main.rs 
COPY ./Cargo.toml .
COPY ./Cargo.lock .
RUN cargo fetch


COPY ./ .

RUN cargo build  --release

####################################################################################################
## Final image
####################################################################################################
FROM debian:bullseye-slim

COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

WORKDIR /app

RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/' /etc/apt/sources.list
RUN apt update && apt install -y openssl ca-certificates
RUN update-ca-certificates
COPY --from=builder /app/target/release/server ./

EXPOSE 9000
CMD ["/app/server"]