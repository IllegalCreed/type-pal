# @type-pal/pal-extract — 第一阶段原始资源提取工具

读取 `data/raw/` 的 MKF、RPG 等原始数据，解码资源、反汇编事件并生成 `data/extracted/`。
类型和纯解码工具来自 `@type-pal/shared`；生成目录可重建，不手工编辑。提取缺陷修在本包真源。
原始数据可以证明表格和脚本事实，不能单凭 sdlpal 推断原版全部运行时行为，考证纪律见 [CLAUDE.md](../../CLAUDE.md)。

从仓库根运行：

```sh
pnpm --filter @type-pal/pal-extract extract
pnpm --filter @type-pal/pal-extract extract:videos
pnpm --filter @type-pal/pal-extract test
pnpm --filter @type-pal/pal-extract typecheck
```

提取需要本地原始素材；视频转换还需要 ffmpeg。第二阶段的 canonical 工程生成与发布归
[@type-pal/migrate](../migrate/README.md)，Reforge/editor 不直接读取本包的提取数据目录。
