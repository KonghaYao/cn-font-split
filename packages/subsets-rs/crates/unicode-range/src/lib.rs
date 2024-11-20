pub struct UnicodeRange;

impl UnicodeRange {
    pub fn parse(input: &str) -> Vec<u32> {
        let mut result = Vec::new();
        let ranges = input.split(',').map(str::trim);

        for range in ranges {
            if range.contains('-') {
                let parts: Vec<&str> = range.split('-').collect();
                if parts.len() == 2 {
                    if let (Ok(start), Ok(end)) = (
                        u32::from_str_radix(parts[0].trim_start_matches("U+"), 16),
                        u32::from_str_radix(parts[1].trim_start_matches("U+"), 16),
                    ) {
                        for code_point in start..=end {
                            result.push(code_point);
                        }
                    }
                }
            } else if range.contains('?') {
                let base = range.trim_start_matches("U+").replace('?', "0");
                if let Ok(base_value) = u32::from_str_radix(&base, 16) {
                    let wildcard_count = range.chars().filter(|&c| c == '?').count();
                    let start = base_value;
                    let end = base_value + (16u32.pow(wildcard_count as u32) - 1);
                    for code_point in start..=end {
                        result.push(code_point);
                    }
                }
            } else {
                if let Ok(code_point) = u32::from_str_radix(range.trim_start_matches("U+"), 16) {
                    result.push(code_point);
                }
            }
        }

        result
    }
    pub fn stringify(arr: &Vec<u32>) -> String {
        fn range_string(start: u32, end: Option<u32>) -> String {
            match end {
                None => format!("U+{:X}", start),
                Some(end) => {
                    if start == end {
                        format!("U+{:X}", start)
                    } else {
                        format!("U+{:X}-{:X}", start, end)
                    }
                }
            }
        }
        let mut sorted: Vec<u32> = arr.iter().cloned().collect();
        sorted.sort_unstable();
        sorted.dedup();

        let mut results: Vec<String> = Vec::new();
        let mut range_start: Option<u32> = None;

        for (idx, &current) in sorted.iter().enumerate() {
            let prev = if idx > 0 { Some(sorted[idx - 1]) } else { None };

            if let Some(start) = range_start {
                if let Some(prev) = prev {
                    if current - prev != 1 {
                        results.push(range_string(start, Option::from(prev)));
                        range_start = Some(current);
                    }
                }
            }

            if range_start.is_none() {
                range_start = Some(current);
            }

            if idx == sorted.len() - 1 {
                if let Some(start) = range_start {
                    if start == current {
                        results.push(range_string(current, None));
                    } else {
                        results.push(range_string(start, Some(current)));
                    }
                }
            }
        }

        results.join(",")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse() {
        let test_cases = vec!["U+ff65", "U+0-7F", "U+007F-00FF", "U+4??"].join(",");

        let mut data = UnicodeRange::parse(&test_cases);
        let mut target: Vec<u32> = vec![0xff65];

        (0x0..=0x7f).into_iter().for_each(|x| target.push(x));
        (0x7f..=0xff).into_iter().for_each(|x| target.push(x));
        (0x400..=0x4ff).into_iter().for_each(|x| target.push(x));

        target.sort(); // 确保排序一致
        data.sort(); // 确保排序一致

        assert_eq!(data.len(), target.len());
        assert_eq!(data, target)
    }

    #[test]
    fn stringify() {
        let mut target: Vec<u32> = vec![0xff65];

        (0x0..=0x7f).into_iter().for_each(|x| target.push(x));
        (0x7f..=0xff).into_iter().for_each(|x| target.push(x));
        (0x400..=0x4ff).into_iter().for_each(|x| target.push(x));
        let res = UnicodeRange::stringify(&target);
        assert_eq!(res, "U+0-FF,U+400-4FF,U+FF65")
    }
}
