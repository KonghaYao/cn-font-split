export async function sha256(data: Uint8Array | string) {
    if (typeof data === 'string') {
        data = new TextEncoder().encode(data);
    }
    if (!globalThis.crypto) {
        const crypto = await import('node:crypto');
        const hash = crypto.createHash('sha256');
        hash.update(data);
        return hash.digest('hex');
    }
    // 使用 Web Crypto API 计算 SHA-256 哈希值
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // 将 ArrayBuffer 转换为十六进制字符串
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    return hashHex;
}
