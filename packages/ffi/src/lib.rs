use cn_font_proto::api_interface::{EventMessage, InputTemplate};
use cn_font_split::{EventFactory, font_split as fp};
use libc::size_t;
use prost::Message;
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::slice;

type Callback = extern "C" fn(*const u8, size_t);

/// 把事件编码成 protobuf，再通过 ABI 回调交给宿主。
fn emit(callback: Callback, message: EventMessage) {
    let mut output_data: Vec<u8> = vec![];
    if message.encode(&mut output_data).is_ok() {
        callback(output_data.as_ptr(), output_data.len());
    }
}

fn panic_message(payload: &(dyn std::any::Any + Send)) -> String {
    if let Some(message) = payload.downcast_ref::<&str>() {
        (*message).to_string()
    } else if let Some(message) = payload.downcast_ref::<String>() {
        message.clone()
    } else {
        "未知 panic（payload 不是字符串）".to_string()
    }
}

/// ABI 固定为 `void`：错误只通过 `EventName::ERROR` 事件上报，进程不再 abort。
///
/// 指针由 C/JS 侧保证有效：改为 `unsafe fn` 会破坏既有的 extern "C" ABI 约定，
/// 因此这里显式允许该 lint。
#[allow(clippy::not_unsafe_ptr_arg_deref)]
#[unsafe(no_mangle)]
pub extern "C" fn font_split(
    input: *const u8,
    input_len: size_t,
    callback: Callback,
) {
    let result = catch_unwind(AssertUnwindSafe(|| {
        // null 指针 + 0 长度构造切片属于 UB，空输入直接上报错误。
        if input.is_null() || input_len == 0 {
            emit(callback, EventMessage::error("输入字体数据为空".to_string()));
            return;
        }
        let input_slice = unsafe { slice::from_raw_parts(input, input_len) };
        match InputTemplate::decode(input_slice) {
            Ok(config) => {
                // font_split 失败时会先发送 Error 事件，这里无需重复发送。
                let _ = fp(config, |e| emit(callback, e));
            }
            Err(err) => {
                emit(
                    callback,
                    EventMessage::error(format!("输入配置解析失败: {err}")),
                );
            }
        }
    }));

    if let Err(payload) = result {
        // 意外 panic 统一转成 Error 事件；发送本身也包一层，避免二次 panic 越过 ABI。
        let message =
            format!("内部 panic: {}", panic_message(payload.as_ref()));
        let _ = catch_unwind(AssertUnwindSafe(|| {
            emit(callback, EventMessage::error(message));
        }));
    }
}
