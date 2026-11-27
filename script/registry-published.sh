#!/usr/bin/env bash
# registry 可见性探测工具，供 release-cn-font-split.yml 使用。
#
# 为什么不用 `npm view`：npm 的读取端有缓存/复制延迟（本次 8.0.0 主包从 publish
# 到可见约 2 分 10 秒），`npm view` 会把「尚未同步」固定成 404，导致门禁假阴性。
# 这里直连 https://registry.npmjs.org 的 packument，并带上唯一 query 与
# Cache-Control: no-cache，绕过沿途缓存。
#
# 用法（也可 source 后当函数用）：
#   script/registry-published.sh published <name> <version>
#   script/registry-published.sh wait_for_visible <attempts> <name@version>...
#   script/registry-published.sh latest_tag <name>
#
# 只依赖 bash 与 Node 20+ 内置的 fetch，不引入新依赖。
set -euo pipefail

REGISTRY="${REGISTRY:-https://registry.npmjs.org}"

# packument 的 URL：scoped 包的 "/" 必须编码为 %2f，末尾 t= 用于绕过缓存。
_registry_url() {
    local name="${1:?包名不能为空}"
    printf '%s/%s?t=%s%s\n' "${REGISTRY}" "${name//\//%2f}" "$(date +%s)" "${RANDOM}"
}

# published <name> <version>
# 版本存在于 registry 文档里则返回 0；否则（含网络错误、非 2xx、JSON 解析失败）返回 1。
published() {
    local name="${1:?用法：published <name> <version>}"
    local version="${2:?用法：published <name> <version>}"
    local url
    url="$(_registry_url "${name}")"
    node -e '
        const [url, version] = process.argv.slice(1);
        (async () => {
            try {
                const res = await fetch(url, {
                    headers: {
                        "cache-control": "no-cache",
                        pragma: "no-cache",
                        accept: "application/json",
                    },
                });
                if (!res.ok) process.exit(1);
                const doc = await res.json();
                process.exit(
                    doc && doc.versions && doc.versions[version] ? 0 : 1,
                );
            } catch {
                // 网络错误一律按「不可见」处理，交给调用方重试。
                process.exit(1);
            }
        })();
    ' "${url}" "${version}"
}

# latest_tag <name>
# 打印 dist-tags.latest；读取失败返回 1。仅用于告警，不作为门禁。
latest_tag() {
    local name="${1:?用法：latest_tag <name>}"
    local url
    url="$(_registry_url "${name}")"
    node -e '
        const [url] = process.argv.slice(1);
        (async () => {
            try {
                const res = await fetch(url, {
                    headers: {
                        "cache-control": "no-cache",
                        pragma: "no-cache",
                        accept: "application/json",
                    },
                });
                if (!res.ok) process.exit(1);
                const doc = await res.json();
                const latest = doc && doc["dist-tags"] && doc["dist-tags"].latest;
                if (!latest) process.exit(1);
                process.stdout.write(`${latest}\n`);
            } catch {
                process.exit(1);
            }
        })();
    ' "${url}"
}

# wait_for_visible <attempts> <name@version>...
# 每 5s 重试一次，全部可见立即返回 0；任一包在 attempts 次后仍不可见则返回 1。
wait_for_visible() {
    local attempts="${1:?用法：wait_for_visible <attempts> <name@version>...}"
    shift
    if [ "$#" -eq 0 ]; then
        echo "::error::wait_for_visible 缺少 <name@version> 参数" >&2
        return 1
    fi
    local item name version attempt
    for item in "$@"; do
        # scoped 包名形如 @scope/name@1.2.3，按「最后一个 @」切分。
        name="${item%@*}"
        version="${item##*@}"
        local visible=0
        for ((attempt = 1; attempt <= attempts; attempt++)); do
            if published "${name}" "${version}"; then
                echo "[ok] ${name}@${version} 已可见"
                visible=1
                break
            fi
            echo "[wait] ${name}@${version} 暂不可见（${attempt}/${attempts}）"
            # 每轮固定等 5s（含最后一轮）：N 次重试 = N×5s，与 workflow 里
            # 「48 次（4 分钟）」「60 次（5 分钟）」的口径一致。
            sleep 5
        done
        if [ "${visible}" -ne 1 ]; then
            echo "::error::${name}@${version} 在 ${attempts} 次重试后仍不可见" >&2
            return 1
        fi
    done
    return 0
}

# 直接执行时按子命令分发；被 source 时只定义函数。
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    command="${1:-}"
    if [ "$#" -gt 0 ]; then
        shift
    fi
    case "${command}" in
        published | wait_for_visible | latest_tag)
            "${command}" "$@"
            ;;
        *)
            echo "用法：$0 {published <name> <version>|wait_for_visible <attempts> <name@version>...|latest_tag <name>}" >&2
            exit 1
            ;;
    esac
fi
