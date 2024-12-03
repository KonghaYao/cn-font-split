FROM konghayao123/best-cn-dev-container:1.1.0
RUN . /init/rust.sh
RUN . /root/.cargo/env
RUN apt install -y protobuf-compiler && protoc --version
RUN rustup target add wasm32-wasip1
