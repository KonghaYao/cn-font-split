import { DataType, open, load, createPointer, funcConstructor, arrayConstructor, unwrapPointer } from "ffi-rs";
import fs from 'fs';
const inputBuffer = new Uint8Array(fs.readFileSync("../../../../demo/public/SmileySans-Oblique.ttf").buffer);

// 首先用key打开动态库以便关闭
// 只需打开一次。
open({
  library: 'libffi', // key
  path: "/app/cn-font-split/packages/subsets-rs/target/release/libffi.so" // 路径
})

const func = (a, b) => {
  console.log(a, b);
  // free function memory when it is not in use
  // freePointer({
  //   paramsType: [funcConstructor({
  //     paramsType: [
  //       DataType.I32,
  //       DataType.Boolean,
  //       DataType.String,
  //       DataType.Double,
  //       arrayConstructor({ type: DataType.StringArray, length: 2 }),
  //       arrayConstructor({ type: DataType.I32Array, length: 3 }),
  //       personType,
  //     ],
  //     retType: DataType.Void,
  //   })],
  //   paramsValue: funcExternal
  // })
};
// suggest using createPointer to create a function pointer for manual memory management
const funcExternal = createPointer({
  paramsType: [funcConstructor({
    paramsType: [
      DataType.U8Array
    ],
    retType: DataType.Void,
  })],
  paramsValue: [func]
})
const r = load({
  library: "libffi", // 动态库文件的路径
  funcName: 'font_split', // 要调用的函数名
  retType: DataType.Void, // 返回值类型
  paramsType: [DataType.U8Array, DataType.I32, DataType.External], // 参数类型
  paramsValue: [inputBuffer, inputBuffer.length, unwrapPointer(funcExternal)[0]] // 实际参数值
  // freeResultMemory: true, // 是否需要自动释放返回值的内存,默认为false
})