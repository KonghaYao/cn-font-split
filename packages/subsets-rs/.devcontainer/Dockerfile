FROM konghayao123/best-cn-dev-container:1.1.0
RUN . /init/rust.sh
RUN apt install -y llvm clang
RUN apt install -y protobuf-compiler && protoc --version
RUN rustup target add wasm32-wasip1
COPY wasi-install.sh wasi-install.sh
RUN . wasi-install.sh
COPY wasm-opt-install.sh wasm-opt-install.sh
RUN . wasm-opt-install.sh