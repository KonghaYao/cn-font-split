# proto-to-cli

`proto-to-cli` 是一个用于将 Protocol Buffers 文件转换为命令行接口（CLI）工具的插件。通过该插件，你可以快速地根据 `.proto` 文件生成相应的 CLI 命令，方便开发者进行操作。

## 支持的生成目标

目前，proto-to-cli 支持以下目标适配器：

1. [commander](https://www.npmjs.com/package/commander): 生成基于 commander 库的 CLI 工具。

## 安装

首先，你需要确保已经安装了 Node.js 环境。然后可以通过 npm 安装 `proto-to-cli`：

```bash
npm i proto-to-cli
```

## 使用方法

### 基本用法

proto-to-cli 提供了一个简单的命令行接口来生成代码。你可以使用以下命令来生成 CLI 工具：

```bash
proto-to-cli -i <proto文件路径> -t commander -m <消息名称> -o <输出文件路径>
```

参数说明

-   -i, --input <path>: 指定输入的 .proto 文件路径。
-   -t, --target <target_name>: 指定目标适配器，默认值为 commander。
-   -m, --message_name <name>: 指定 .proto 文件中的消息名称。
-   -o, --output <path>: 指定生成的文件保存路径。

### 示例

假设你有一个名为 example.proto 的文件，并且你想将其转换为一个名为 my-cli 的 CLI 工具，你可以运行以下命令：

```bash
proto-to-cli -i example.proto -t commander -m MyMessage -o my-cli.ts
```

这将会生成一个 Typescript 文件 my-cli.ts

```ts
import { getCliParams } from 'my-cli.ts';
getCliParams(process.argv);
```

如果你有其他需求，欢迎提交 issue 或 pull request！

## 贡献

我们非常欢迎任何形式的贡献！如果你有任何想法或建议，请随时联系我们或提交 PR。

## 许可证

proto-to-cli 采用 MIT 许可证
