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

默认提取先对原始脚本执行忠实 round-trip，再校验 Win 原盘指纹并应用版本化纠正规则。
未知版本或规则前值不符会停止；不会修改 `data/raw`。所有事件切片、全量脚本及对象资源都从
同一份纠正结果生成，`script-corrections.json` 和资源清单记录来源 SHA、规则版本与已应用规则。
资源缓存版本包含最终文件内容 SHA，等长度的脚本改动也会更新缓存。

审计其它原始版本或仅需要忠实解码时，可显式运行 `pnpm --filter @type-pal/pal-extract extract --faithful`。
此模式不应用玩法修复，清单明确标记 `faithful`；产品资源使用默认模式生成。原始素材继续保留本地，
Git 只保存纠正规则和测试，不保存 raw、英文补丁包或可执行文件。
