#!/bin/bash
# 需要依赖 curl, 只处理 Linux 和 Mac，不运行 Windows

rust_target=""
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

function matchPlatform() {
    local platform=$(uname -s)
    local arch=$(uname -m)
    local isMusl=$1
    
    echo "[Debug] System: $platform $arch $isMusl"
    
    # Linux 平台
    if [ "$platform" == "Linux" ]; then
        if [ "$arch" == "x86_64" ]; then
            rust_target=$([ "$isMusl" == "true" ] && echo null || echo 'x86_64-unknown-linux-gnu')
            return 0
        fi
        
        if [ "$arch" == "riscv64" ]; then
            rust_target=$([ "$isMusl" == "true" ] && echo null || echo 'riscv64gc-unknown-linux-gnu')
            return 0
        fi
        
        if [ "$arch" == "s390x" ]; then
            rust_target='s390x-unknown-linux-gnu'
            return 0
        fi
        
        rust_target=$([ "$isMusl" == "true" ] && echo null || echo 'aarch64-unknown-linux-gnu')
        return 0
    fi
    # FreeBSD
    if [ "$platform" == "FreeBSD" ]; then
        rust_target='x86_64-unknown-freebsd'
        return 0
    fi
    # macOS
    if [ "$platform" == "Darwin" ]; then
        if [ "$arch" == "x86_64" ]; then
            rust_target='x86_64-apple-darwin'
            return 0
        fi
        rust_target='aarch64-apple-darwin'
        return 0
    fi
    rust_target='x86_64-unknown-linux-gnu'
}

matchPlatform false
echo "[Info] $rust_target"

function getLatestVersion() {
    # 使用 curl 获取最新版本的 JSON 数据
    response=$(curl -s https://ungh.cc/repos/KonghaYao/cn-font-split/releases/latest)
    
    # 使用 grep 和 sed 解析出 "tag" 的值
    version=$(echo "$response" | grep -o '"tag":"[^"]*"' | sed 's/"tag":"\([^"]*\)"/\1/')
    
    # 输出版本号
    echo "$version"
}

# 解析命令行参数
# 定义 安装指令
function cn_i() {
    # 平台
    p=""
    version=""

    # default 和 default@7.0.0 的解析 
    if [[ "$1" == *"@"* ]]; then
        p="${1%@*}"
        version="${1#*@}"
    else
        p="$1"
    fi

    # 自动拿平台
    if [ "$p"=="default" ]; then
        p="$rust_target"
    fi
    # 自动拿版本
    if [ "$version"=="" ]; then
        version=$(getLatestVersion)
    fi
    echo "$p@$version"


    ext="so"
    plat=$(uname -s) 
    if [ "$plat" == "Darwin" ]; then
        ext="dylib"
    fi
    curl -o "$SCRIPT_DIR/libffi-$p.$ext" "$CN_FONT_SPLIT_GH_HOST/KonghaYao/cn-font-split/releases/download/$version/libffi-$p.$ext"
}

# 定义 查看指令
function cn_ls() {
    # 遍历当前文件夹下以 libffi 开头的文件

    VERSION_FILE="$SCRIPT_DIR/version"

    if [ -f "$VERSION_FILE" ]; then
        # 输出 version 文件内容
        echo -e "\nYour cn-font-split core version: "
        echo -e "\033[0;32m$(cat "$VERSION_FILE")\033[0m"
        echo -e "\nYou can cn-font-split i default"
        else
        echo "version 文件不存在"
    fi
}

# 主程序
case "$1" in
    i)
        cn_i "$2"
        ;;
    ls)
        cn_ls
        ;;
    *)
        echo "Usage: cn i default or cn ls"
        exit 1
        ;;
esac