import os
from ctypes import CDLL, CFUNCTYPE, c_size_t, POINTER, c_ubyte, string_at
import sys
from typing import Any
from .gen import index_pb2
from pathlib import Path
import platform

current_file_path = os.path.abspath(__file__)

# 获取当前文件所在的目录
current_dir = os.path.dirname(current_file_path)


def create_api(ctx):
    output_dir = Path(ctx["outDir"])

    def cb(pointer, size):
        byte_data = string_at(pointer, size)
        cloned_byte_data = bytes(byte_data)
        msg = index_pb2.EventMessage()  # type: ignore
        msg.ParseFromString(cloned_byte_data)
        if msg.event == 0:
            print("构建成功")
        if msg.event == 1:
            print(msg.message)
            output_dir.mkdir(parents=True, exist_ok=True)

            file_name = msg.message
            file_path = output_dir / file_name

            with open(file_path, "wb") as file:
                file.write(msg.data)
        if msg.event == 2:
            # OUTPUTDATA
            print("hello")

    return cb


def get_library_extension():
    """根据操作系统返回适当的库文件扩展名"""
    if sys.platform.startswith("win"):
        return ".dll"
    elif sys.platform.startswith("darwin"):
        return ".dylib"
    else:
        return ".so"  # 默认为 Linux 或其他 Unix 系统


def font_split(info):
    bin_path = os.getenv("CN_FONT_SPLIT_BIN")
    if bin_path is None:
        bin_path = os.path.join(
            current_dir,
            "gen/libffi-"
            + match_platform(current_platform, current_arch, is_musl)
            + get_library_extension(),
        )
    # print(bin_path)
    lib = CDLL(bin_path)
    callback_type = CFUNCTYPE(None, POINTER(c_ubyte), c_size_t)
    lib.font_split.argtypes = [POINTER(c_ubyte), c_size_t, callback_type]
    lib.font_split.restype = None
    data = None
    with open(info["input"], "rb") as file:
        data = file.read()
    temp = index_pb2.InputTemplate(input=data).SerializeToString()  # type: ignore
    buffer = (c_ubyte * len(temp))(*list(temp))
    return lib.font_split(buffer, len(temp), callback_type(create_api(info)))


# font_split({
#     "input": '../demo/public/SmileySans-Oblique.ttf',
#     "outDir": "./dist"
# })


# 获取当前平台和架构
current_platform = platform.system().lower()
current_arch = platform.machine().lower()

# 修正平台和架构的值
platform_map = {
    "windows": "win32",
    "darwin": "darwin",
    "linux": "linux",
    "freebsd": "freebsd",
    "android": "android",
}

arch_map = {
    "x86_64": "x86_64",
    "amd64": "x86_64",
    "i386": "x86",
    "i686": "x86",
    "armv7l": "arm",
    "aarch64": "arm64",
    "arm64": "arm64",
    "riscv64": "riscv64",
    "s390x": "s390x",
}

# 转换平台和架构
current_platform = platform_map.get(current_platform, current_platform)
current_arch = arch_map.get(current_arch, current_arch)


def match_platform(platform: str, arch: str, is_musl: Any) -> str:
    platform_arch_map = {
        "android": {
            "arm64": None,
            "arm": None,
        },
        "win32": {
            "x86_64": "x86_64-pc-windows-msvc",
            "arm64": "aarch64-pc-windows-msvc",
        },
        "darwin": {
            "x86_64": "x86_64-apple-darwin",
            "arm64": "aarch64-apple-darwin",
        },
        "freebsd": {
            "x86_64": "x86_64-unknown-freebsd",
        },
        "linux": {
            "x86_64": None if is_musl() else "x86_64-unknown-linux-gnu",
            "arm64": None if is_musl() else "aarch64-unknown-linux-gnu",
            "arm": None,
            "riscv64": None if is_musl() else "riscv64gc-unknown-linux-gnu",
            "s390x": "s390x-unknown-linux-gnu",
        },
    }
    return platform_arch_map.get(platform, {}).get(arch, "wasm32-wasip1")


# 示例
def is_musl():
    # 这里可以放置实际的检测逻辑
    return False
