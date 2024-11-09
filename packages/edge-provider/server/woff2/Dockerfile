FROM docker.io/rust:1.82.0-bookworm AS build

# ARG pkg=woff2

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

FROM docker.io/debian:bookworm-slim

WORKDIR /app

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