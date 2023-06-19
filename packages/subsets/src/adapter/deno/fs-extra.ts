import path from "path";
export const outputFile = async (file: string, data: any) => {
    const dir = path.dirname(file);
    const { ensureDir } = await import(
        "https://deno.land/std@0.192.0/fs/ensure_dir.ts"
    );
    await ensureDir(dir);
    if (typeof data === "string") {
        const encoder = new TextEncoder();
        data = encoder.encode(data);
    }
    return Deno.writeFile(file, data);
};
