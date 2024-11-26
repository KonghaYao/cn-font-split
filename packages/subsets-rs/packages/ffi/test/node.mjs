import { DataType, open, close, load, createPointer, funcConstructor, arrayConstructor, unwrapPointer } from "ffi-rs";
import fs from 'fs';
const inputBuffer = new Uint8Array(fs.readFileSync("../../../../demo/public/SmileySans-Oblique.ttf").buffer);

// 首先用key打开动态库以便关闭
// 只需打开一次。
open({
  library: 'libffi', // key
  path: "/app/cn-font-split/packages/subsets-rs/target/release/libffi.so" // 路径
})

const func = (a, b) => {
  let rightArray = a.slice(0, b);
  console.log(b, rightArray.length);
};
// suggest using createPointer to create a function pointer for manual memory management
const funcExternal = createPointer({
  paramsType: [funcConstructor({
    paramsType: [
      arrayConstructor({
        type: DataType.U8Array,
        length: 1024 * 256,
      }),
      DataType.I32
    ],
    retType: DataType.Void,
  })],
  paramsValue: [func]
})
load({
  library: "libffi", // 动态库文件的路径
  funcName: 'font_split', // 要调用的函数名
  retType: DataType.Void, // 返回值类型
  paramsType: [DataType.U8Array, DataType.I32, DataType.External], // 参数类型
  paramsValue: [inputBuffer, inputBuffer.length, unwrapPointer(funcExternal)[0]], // 实际参数值
  freeResultMemory: true, // 是否需要自动释放返回值的内存,默认为false
})
// close("libffi");