# MIGRATION-CHROME-BAKE-PREFLIGHT-1 — 引擎素材重建的失败前置检查

Status: done
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-20
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

让维护命令重建引擎默认素材时，原有素材在输入读取或已有完整性检查失败后保持可用。明确输出目录和光标数据的风险。

## 范围

`pnpm bake` 及实际入口 `packages/migrate/scripts/bake-assets.mts`。归属为 Reforge 引擎 chrome 的重建产物，运行时通过 `engine-chrome/registry.ts` 使用。

## 前提与证据

| 来源 | 已核事实 |
|---|---|
| 提取源 | 命令读 PAL 索引 PNG、调色板 0 和真实光标数据。冻结的状态框图来自作者素材。 |
| 第一阶段 | 引擎自身的索引色绘制有不同的输出所有权。共用输入来自 PAL 提取。 |
| 基点 | 入口按图写盘，随后才读状态框 seed、光标以及核验 85 份 UI PNG 的总字节和摘要。 |
| 获准候选 | 在首次覆盖前完成素材读取、编码、现有作者 seed 和 85 份 PNG 的字节与摘要校验。 |
| 输出归属 | 隔离重建中将 `ui/box` 链接到另一个临时素材目录。命令退出 0，目标中旧图的 SHA256 变为原盘图。 |
| 光标数据 | 隔离输入中只增大原光标的长度字段。真实 bake 退出 0 并覆盖旧光标。Reforge 的 `loadCursorFrames` 拒绝该发布字节，正常对照仍解出三帧。 |

将真实入口、源码和预先存在的 PNG 放到隔离目录。只移除末尾光标输入，命令退出 1 且现有 `ui/box/frame-00.png` 已变化。使用确定的旧图 bytes 和当前真实图作 oracle，分支及原有资源目录保持原样。完整成功校验仍用 [上一批 89 文件字节证据](../evidence/QUALITY-MIGRATION-SOURCE-PROJECTIONS-1.tar.gz)。

## 验收

缺失后置输入、作者 seed、总摘要、光标校验或输出链接失败，各自要求已有磁盘树不变。正常隔离输入运行后，87 项 chrome 素材与现行产物逐字节相同，其中两项作者 seed 只校验。磁盘写入失败的全套回滚尚未纳入本卡合同。

## 状态与交接

2026-11-20 用户批准先完成既有校验再替换。如上三处先有正式红例。隔离现场另证输出目录和单文件链接会覆盖外部旧文件、错误光标长度会覆盖原产物，用户批准两项都修。第二轮三个指定反例因磁盘树的字节变化失败，修复后七个真实 CLI 例全部通过。路径守卫 25 例和运行时光标 5 例相邻通过。

重用迁移路径守卫和 Shared 的光标帧解码，正式重建保持原盘读取和现行产物字节。逐文件八维、原始执行和 SHA 见[现行窗口](QUALITY-REFORGE-PRESENTATION-1.md#上一窗口的-review)。本卡局部验收完成，集中门与合并取窗口卡的执行回执。
