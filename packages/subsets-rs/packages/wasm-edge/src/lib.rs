use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use web_sys::js_sys;
#[wasm_bindgen]
pub struct Callback {
    callback: js_sys::Function,
}

#[wasm_bindgen]
impl Callback {
    #[wasm_bindgen(constructor)]
    pub fn new(callback: js_sys::Function) -> Callback {
        Callback { callback }
    }
    pub fn call(&self, arg: Vec<u8>) {
        let this = JsValue::NULL;
        let arg = JsValue::from(arg);
        self.callback.call1(&this, &arg).unwrap();
    }
}

#[wasm_bindgen]
pub fn font_split(name: Vec<u8>, callback: &Callback) {
    let data: Vec<u8> = name.iter().map(|x| x + 1).collect();
    callback.call(data);
}
