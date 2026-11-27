# UnicodeRange

`UnicodeRange` is a Rust library for parsing and stringifying Unicode ranges. It provides functionality to convert a string representation of Unicode ranges into a vector of code points and vice versa.

## Usage

```rust
use unicode_range::UnicodeRange;

fn main() {
    let input = "U+0-7F,U+007F-00FF,U+4??,U+ff65";
    let code_points = UnicodeRange::parse(input);
    println!("{:?}", code_points);

    let stringified = UnicodeRange::stringify(&code_points);
    println!("{}", stringified);
}
```

## 开发

-   MSRV：Rust 1.85（见仓库根 `rust-toolchain.toml` 与 `Cargo.toml` 的 `rust-version`）。
-   测试：`cargo test -p unicode-range`。
-   许可证：Apache-2.0（继承根 workspace 的 `license`）。
