FROM konghayao123/best-cn-dev-container:1.1.0
RUN apt install -y llvm clang pkg-config libssl-dev
RUN apt install -y protobuf-compiler && protoc --version
RUN bash /init/rust.sh
ENV RUSTUP_DIST_SERVER="https://rsproxy.cn"
ENV RUSTUP_UPDATE_ROOT="https://rsproxy.cn/rustup"
RUN /root/.cargo/bin/rustup target add wasm32-wasip1
COPY wasi-install.sh /init/
RUN . /init/wasi-install.sh
COPY wasm-opt-install.sh /init/
RUN . /init/wasm-opt-install.sh