#!/usr/bin/env python3
import argparse
import os
import sys
import subprocess
from pathlib import Path
from .font_split import font_split


def main():
    current_file_path = os.path.abspath(__file__)

    # 设置命令行参数解析
    parser = argparse.ArgumentParser(description="Process some integers.")
    subparsers = parser.add_subparsers(dest="command", help="sub-command help")

    parser.add_argument("-i", metavar="N", type=str)
    parser.add_argument("-o", metavar="N", type=str)

    # 添加 'i' 子命令
    parser_i = subparsers.add_parser("i", help="i sub-command help")
    parser_i.add_argument(
        "platformString", metavar="N", type=str, help="platform@version"
    )

    # 添加 'ls' 子命令
    parser_ls = subparsers.add_parser("ls", help="ls sub-command help")

    args = parser.parse_args()

    if args.command:
        run_init_script()
        return

    # 调用函数并打印结果
    return font_split({"input": args.i, "outDir": args.o})


def run_init_script():
    is_windows = os.name == "nt"

    # 获取除程序名和当前脚本外的所有命令行参数
    args = sys.argv[1:]

    current_dir = Path(__file__).resolve().parent

    if is_windows:
        # Windows平台下运行Powershell脚本
        script_path = current_dir / "gen/init.ps1"
        powershell_args = [
            "powershell.exe",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(script_path),
            *args,
        ]
        try:
            result = subprocess.run(powershell_args, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Error executing PowerShell script: {result.stderr}")
                return
            print(f"PowerShell script output: {result.stdout}")
        except Exception as e:
            print(f"Failed to start PowerShell script: {e}")
    else:
        # 非Windows平台（如Linux或macOS）下运行shell脚本
        script_path = current_dir / "gen/init.sh"
        try:
            result = subprocess.run(["bash", str(script_path), *args], check=True)
            print("Shell script executed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"Shell script exited with code {e.returncode}")
        except Exception as e:
            print(f"Failed to start shell script: {e}")


if __name__ == "__main__":
    main()
