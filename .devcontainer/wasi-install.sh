# only in dev-container
apt install wget
WASI_OS=linux
WASI_ARCH=x86_64
WASI_VERSION=24
WASI_VERSION_FULL=${WASI_VERSION}.0
wget https://github.moeyy.xyz/https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_VERSION}/wasi-sdk-${WASI_VERSION_FULL}-${WASI_ARCH}-${WASI_OS}.tar.gz
if [ ! -d "/opt/wasi-sdk" ]; then
  mkdir /opt/wasi-sdk
fi
tar xvf wasi-sdk-${WASI_VERSION_FULL}-${WASI_ARCH}-${WASI_OS}.tar.gz -C /opt/wasi-sdk
rm wasi-sdk-${WASI_VERSION_FULL}-${WASI_ARCH}-${WASI_OS}.tar.gz
export WASI_SYSROOT="/opt/wasi-sdk/wasi-sdk-${WASI_VERSION_FULL}-${WASI_ARCH}-${WASI_OS}/share/wasi-sysroot"
echo "\nexport WASI_SYSROOT=\"${WASI_SYSROOT}\"\n" >> ~/.bashrc
echo "\nexport WASI_SDK_PATH=\"/opt/wasi-sdk/wasi-sdk-${WASI_VERSION_FULL}-${WASI_ARCH}-${WASI_OS}/\"\n" >> ~/.bashrc
