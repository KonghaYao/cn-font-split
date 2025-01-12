/// 计算给定的 `Vec<u8>` 在千字节（KB）中的大小。
pub fn u8_size_in_kb(vec: &Vec<u8>) -> f64 {
    let size_in_bytes = vec.len();
    let size_in_kb = size_in_bytes as f64 / 1024.0;
    size_in_kb
}

/// 将 `Vec<u32>` 转换为 `String`，每个 `u32` 值被视为一个 Unicode 代码点。
pub fn vec_u32_to_string(vec: &Vec<u32>) -> String {
    let chars: Vec<char> = vec
        .iter()
        .map(|u| std::char::from_u32(u.clone()).unwrap_or(' '))
        .collect();
    chars.into_iter().collect()
}

/// 读取指定路径的完成二进制文件，并返回 Vec<u8>。
pub fn read_binary_file(file_path: &str) -> std::io::Result<Vec<u8>> {
    use std::io::Read;
    let mut file = std::fs::File::open(file_path)?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)?;
    Ok(buffer)
}

pub fn u32_array_to_u8_array(input: &[u32]) -> Vec<u8> {
    let mut output = Vec::with_capacity(input.len() * 4);
    for &num in input {
        output.push(num as u8);
        output.push((num >> 8) as u8);
        output.push((num >> 16) as u8);
        output.push((num >> 24) as u8);
    }
    output
}

pub fn u8_array_to_u32_array(arr: &[u8]) -> Vec<u32> {
    assert!(arr.len() % 4 == 0, "File length is not a multiple of 4");
    arr.chunks(4)
        .map(|chunk| {
            u32::from_be_bytes([chunk[3], chunk[2], chunk[1], chunk[0]])
        })
        .collect()
}
/// 输出一个文件，会自动创建文件夹
pub fn output_file(file_path: &str, buffer: &Vec<u8>) -> std::io::Result<()> {
    use std::fs::File;
    use std::io::Write;
    use std::path::Path;
    let path = Path::new(file_path);

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut file = File::create(path)?;
    file.write_all(buffer)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_u8_size_in_kb() {
        let vec = vec![0; 2048]; // 2048 bytes
        assert_eq!(u8_size_in_kb(&vec), 2.0);
    }

    #[test]
    fn test_vec_u32_to_string() {
        let vec = vec![72, 101, 108, 108, 111]; // "Hello"
        assert_eq!(vec_u32_to_string(&vec), "Hello");

        let vec_with_invalid = vec![72, 101, 108, 108, 111, 0x110000]; // "Hello "
        assert_eq!(vec_u32_to_string(&vec_with_invalid), "Hello ");
    }

    #[test]
    fn test_read_binary_file() {
        use std::io::Write;
        let file_path = "test.bin";
        let data = vec![1, 2, 3, 4, 5];

        // 创建一个测试文件
        {
            let mut file = std::fs::File::create(file_path).unwrap();
            file.write_all(&data).unwrap();
        }

        // 读取文件并验证内容
        let result = read_binary_file(file_path).unwrap();
        assert_eq!(result, data);

        // 删除测试文件
        std::fs::remove_file(file_path).unwrap();
    }

    #[test]
    fn test_u32_array_to_u8_array() {
        let input = vec![0x12345678, 0x90abcdef];
        let expected_output =
            vec![0x78, 0x56, 0x34, 0x12, 0xef, 0xcd, 0xab, 0x90];
        let output = u32_array_to_u8_array(&input);
        assert_eq!(output, expected_output);
    }

    #[test]
    fn test_u8_array_to_u32_array() {
        let input = vec![0x78, 0x56, 0x34, 0x12, 0xef, 0xcd, 0xab, 0x90];
        let expected_output = vec![0x12345678, 0x90abcdef];
        let output = u8_array_to_u32_array(&input);
        assert_eq!(output, expected_output);
    }

    #[test]
    fn test_round_trip_conversion() {
        let input = vec![0x12345678, 0x90abcdef, 0xdeadbeef];
        let u8_array = u32_array_to_u8_array(&input);
        let output = u8_array_to_u32_array(&u8_array);
        assert_eq!(input, output);
    }
}
