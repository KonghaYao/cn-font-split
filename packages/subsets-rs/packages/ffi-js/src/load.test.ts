// bun test ./src/load.test.ts
import { matchPlatform } from './load'
// @ts-ignore
import { test } from 'bun:test'
import assert from 'node:assert'

test("multi-platform", () => {
    assert.strictEqual(matchPlatform('win32', "x64", () => false), "x86_64-pc-windows-msvc")
    assert.strictEqual(matchPlatform('win32', "arm64", () => false), "aarch64-pc-windows-msvc")
    assert.strictEqual(matchPlatform('darwin', "x64", () => false), "x86_64-apple-darwin")
    assert.strictEqual(matchPlatform('darwin', "arm64", () => false), "aarch64-apple-darwin")
    assert.strictEqual(matchPlatform('freebsd', "x64", () => false), "x86_64-unknown-freebsd")
    assert.strictEqual(matchPlatform('linux', "x64", () => false), "x86_64-unknown-linux-gnu")
    assert.strictEqual(matchPlatform('linux', "arm64", () => false), "aarch64-unknown-linux-gnu")
    assert.strictEqual(matchPlatform('linux', "riscv64", () => false), "riscv64gc-unknown-linux-gnu")
    assert.strictEqual(matchPlatform('linux', "s390x", () => false), "s390x-unknown-linux-gnu")
    assert.strictEqual(matchPlatform('linux', "x64", () => true), "wasm32-wasip1")
    assert.strictEqual(matchPlatform('linux', "arm64", () => true), "wasm32-wasip1")
    assert.strictEqual(matchPlatform('linux', "riscv64", () => true), "wasm32-wasip1")
    assert.strictEqual(matchPlatform('android', "arm64", () => false), "wasm32-wasip1")
    assert.strictEqual(matchPlatform('android', "arm", () => false), "wasm32-wasip1")
    assert.strictEqual(matchPlatform('win32', "ia32", () => false), "wasm32-wasip1")
})
