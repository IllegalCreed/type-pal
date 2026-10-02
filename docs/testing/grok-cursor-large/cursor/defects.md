# Defects / 未证账 — TEST-CURSOR-ASSET-UI-LARGE-1

## 产品缺陷（本卡只举证不停全卡）

- 无已确认需停整卡的产品缺陷。C02 观测到的「焦点对象外部变更关上传面板」「帧数不足拒新增后类型菜单仍开」按现行为写入断言，未改产品。

## 合同/证据限制

- **合同账（707）** 已由 `generate-contracts.mjs` 从各 `*.cursor-r1.test.ts(x)` 逐例解析生成（非 batch UI 模板账）。全文分片落在 [contracts/C01.json](./contracts/C01.json)…[C10.json](./contracts/C10.json)；瘦索引 [contracts-index.json](./contracts-index.json) 仅含 total/existingProof/netNewEstimate、shard 路径与 id→shard（无合同正文）。每条含 `primarySource`、`sourceCondition`（导出行 + 函数首段条件/body 片段）、`caller`（测试调用行 + 最多 ~8 条 packages/editor/src 生产调用方，excl. `*.test.*` / `__tests__`）、`legalInput`（含测试体内 fixture 构造原文）、`oracle`（完整 `expect()` 行 join，无 240 截断）、结构化 `oldAssertion`、`testSourceLine`。不再用字段截断规避 Biome 1MiB；单片均 &lt;1MiB。
- **existing-proof（9）**：C09-G02-01/02/03/05/06/10、C09-G01-04、C07-G01-02、C07-G01-10；**净新估算 708**（717−9 ≥700）。CURSOR-R2 补 C06-G07 StampPreviewCanvas 十例闭合第 70 组。C07-G01-02/10 的 `oldTestSha` 为同文件 prior-case（C07-G01-01）真实 git blob SHA，不再用占位符 `same-file-prior-case`。
- **剩余 ledger debt**：除上述 9 条外，约 **708** 条仅从头注释 **排重** 引用旧 suite 文件名，**未**自动解析到旧测试 `fullName` + 行级 matcher（字段显式 `none — no line-level overlap proven…`）。禁止臆造行号；全量跨队列排重仍待 Codex。
- 反控 **52** 枚三态 / **52** 不同目标：净新 **50**（含 CTR-C05-08、CTR-C08-34）；**CTR-C09-04/29** 标 `existing-proof-cross-check`（对应 C09-G02-02/05），保留历史反控、不计新增目标配额。源/身份未变旧针未全量重采。
- 唯一 judge 拒收自测：[judge-selftest.mjs](./judge-selftest.mjs) / [judge-selftest.json](./judge-selftest.json)；生成后 `biome format --write`，连续 selftest→lint 零 format。
- 自动脚本预览/完成流（world-sprite-behavior）按派发停线，未作主合同。
- 私有 coverage 不可与官方 baseline 相加；正式收益只认 Codex 并集实测。

## 视觉流程

- 12 条 flows 全 pass（见 [flows/flow-index.json](./flows/flow-index.json)）。CURSOR-R2-04：DS01 在鼠标前独立记录 `afterKeyboard`/`focusBeforeKb`/`keyboardPass`（本轮键盘 pass、`usedFallback=false`）；DS02 持久化 `afterWideKeyboard`/`afterNarrowKeyboard` 相位（宽窗 c 已证，窄回 b 不否决）；其它已成立阶段与未受影响截图未重拍。C08-G02-02 已补真实 `stampPlacements` 非空边与精确关系集。

## 全包 test 环境

- Editor 全包 **4493/4493**（含 `tests/world-sprite-behavior.pal.test.ts`）；本 worktree 需本地 gitignored `projects/pal/assets/migrated/sprites`（与主安装树对齐），不入库、不改真实源数据。
