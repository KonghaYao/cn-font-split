####################################################################################################
## Builder
####################################################################################################
FROM rust:1.84.0-bullseye AS builder
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/' /etc/apt/sources.list
RUN apt update && apt install -y openssl build-essential pkg-config libssl-dev
RUN update-ca-certificates


ENV USER=konghayao
ENV UID=10001

RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    "${USER}"


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