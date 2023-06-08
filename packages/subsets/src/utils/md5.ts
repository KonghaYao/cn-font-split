import crypto from "crypto";

export function md5(buffer: Buffer) {
    let sf = crypto.createHash("md5");
    sf.update(buffer);
    return sf.digest("hex");
}
