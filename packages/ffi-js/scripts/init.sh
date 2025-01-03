#!/bin/bash
# 需要依赖 curl, 只处理 Linux 和 Mac，不运行 Windows

rust_target=""
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
VERSION_FILE="$SCRIPT_DIR/version"
GH_HOST="$CN_FONT_SPLIT_GH_HOST"
if [ -z "$GH_HOST" ]; then
    GH_HOST="https://github.com"
fi
echo $GH_HOST

# 定义颜色代码
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # 没有颜色（重置）

# 定义一个带颜色输出的函数
colorEcho() {
    local color="$1"
    shift
    echo -e "${!color}$*${NC}"
}

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
    response=$(curl -sL https://ungh.cc/repos/KonghaYao/cn-font-split/releases/latest)

    # 使用 grep 和 sed 解析出 "tag" 的值
    version=$(echo "$response" | grep -o '"tag":"[^"]*"' | sed 's/"tag":"\([^"]*\)"/\1/')

    # 输出版本号
    echo "$version"
}

function getAllVersion() {
    response=$(curl -sL https://ungh.cc/repos/KonghaYao/cn-font-split/releases)
    # 使用 grep 和 sed 解析出 "tag" 的值
    # 输出版本号
    colorEcho BLUE "All versions: "
    echo "$response" | grep -o '"tag":"[^"]*"' | sed 's/"tag":"\([^"]*\)"/\1/' | (
        count=0
        while read -r tag; do
            if [ $count -lt 5 ]; then
                colorEcho GREEN "  $tag"
                ((count++))
            else
                break
            fi
        done
    )
}

# 解析命令行参数
# 定义 安装指令
function cn_i() {
    # 平台
    p=""
    version=""

    # default 和 default@7.0.0 的解析
    if [ "$1" != "${1%@*}" ]; then
        p="${1%@*}"
        version="${1#*@}"
    else
        p="$1"
    fi
    # 自动拿平台
    if [ "$p" = "default" ]; then
        p="$rust_target"
    fi
    # 自动拿版本
    if [ -z "$version" ]; then
        version=$(getLatestVersion)
    fi
    echo "$p@$version"

    ext="so"
    if echo "$p" | grep -q "apple"; then
        ext="dylib"
    fi
    if echo "$p" | grep -q "wasm"; then
        ext="wasm"
    fi
    local download_url="$GH_HOST/KonghaYao/cn-font-split/releases/download/$version/libffi-$p.$ext"
    echo $download_url

    curl -fsSL -o "$SCRIPT_DIR/libffi-$p.$ext" "$download_url"

    # 检查 version 文件是否存在
    if [ -f "$VERSION_FILE" ]; then
        sed "/^$p/d" "$VERSION_FILE" >temp && mv temp "$VERSION_FILE"
        echo "$p@$version" >>"$VERSION_FILE"
    else
        echo "$p@$version" >"$VERSION_FILE"
    fi
}

# 定义 查看指令
function cn_ls() {
    if [ -f "$VERSION_FILE" ]; then
        # 输出 version 文件内容
        echo -e "\nYour cn-font-split core version: "
        colorEcho GREEN "  $(cat "$VERSION_FILE")\n"
    else
        colorEcho RED "version 文件不存在; cn-font-cli i default\n"
    fi
    getAllVersion

    ls -l $SCRIPT_DIR/libffi-*

    echo -e "\nuse cn-font-split i to install"
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
    echo "Usage: cn-font-cli i default or cn-font-cli ls"
    exit 1
    ;;
esac
