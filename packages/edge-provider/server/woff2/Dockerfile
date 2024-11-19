FROM docker.io/rust:1.82.0-alpine3.19 AS build
# 使用国内的 rsproxy.cn 的源，alpine需要设置 RUSTFLAGS 环境变量
ENV  RUSTUP_DIST_SERVER="https://rsproxy.cn" \
    RUSTUP_UPDATE_ROOT="https://rsproxy.cn/rustup" \
    RUSTFLAGS=-Ctarget-feature=-crt-static
# 安装编译需要的一些依赖
RUN sed -e 's/dl-cdn[.]alpinelinux.org/mirrors.aliyun.com/g' -i~ /etc/apk/repositories 
RUN apk add --update --no-cache build-base

WORKDIR /build
COPY . .

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    set -eux;\
    cargo build --release;
# 查看编译产物所在位置
# RUN ls -la target/release
RUN objcopy --compress-debug-sections target/release/woff2 ./main

################################################################################

FROM docker.io/alpine:3.19

WORKDIR /app
RUN sed -e 's/dl-cdn[.]alpinelinux.org/mirrors.aliyun.com/g' -i~ /etc/apk/repositories 
RUN apk add libstdc++ libgcc

## copy the main binary
COPY --from=build /build/main ./

## copy runtime assets which may or may not exist
COPY --from=build /build/Rocket.tom[l] ./static
COPY --from=build /build/stati[c] ./static
COPY --from=build /build/template[s] ./templates

## ensure the container listens globally on port 8080
ENV ROCKET_ADDRESS=0.0.0.0
ENV ROCKET_PORT=8080

CMD ./main