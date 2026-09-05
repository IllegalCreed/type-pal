# @type-pal/shared — 第一阶段基础类型与资源解码工具

为第一阶段 game 与 pal-extract 提供资源格式、事件命令、输入类型和纯解码工具。
当前 Reforge 仍复用其中的 RLE codec、RleFrame / Palette 等资产格式代码（见 assets.ts 与 index.ts）；
这不把 shared 定为两阶段通用领域模型。第二阶段场景、脚本和存档合同归 `@type-pal/content`，
不得把第一阶段的字节码或角色下标模型引入第二阶段运行时。

```bash
pnpm --filter @type-pal/shared test
```
