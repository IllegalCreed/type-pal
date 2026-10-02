# Defects / 未证账 — TEST-CURSOR-ASSET-UI-LARGE-1

## 产品缺陷（本卡只举证不停全卡）

- 无已确认需停整卡的产品缺陷。C02 观测到的「焦点对象外部变更关上传面板」「帧数不足拒新增后类型菜单仍开」按现行为写入断言，未改产品。

## 合同/证据限制

- **合同账（707）** 已由 `generate-contracts.mjs` 从各 `*.cursor-r1.test.ts(x)` 逐例解析生成（非 batch UI 模板账）。全文分片落在 [contracts/C01.json](./contracts/C01.json)…[C10.json](./contracts/C10.json)；瘦索引 [contracts-index.json](./contracts-index.json) 仅含 total/existingProof/netNewEstimate、shard 路径与 id→shard（无合同正文）。每条含 `primarySource`、`sourceCondition`（导出行 + 函数首段条件/body 片段）、`caller`（测试调用行 + 最多 ~8 条 packages/editor/src 生产调用方，excl. `*.test.*` / `__tests__`）、`legalInput`（含测试体内 fixture 构造原文）、`oracle`（完整 `expect()` 行 join，无 240 截断）、结构化 `oldAssertion`、`testSourceLine`。不再用字段截断规避 Biome 1MiB；单片均 &lt;1MiB。
- **existing-proof（13）**：原 9 + CURSOR-R3-02 核出的 **C05-G01-01**、**C06-G07-02/03/04**。**净新结构上限 704**（717−13 ≥700）；全量语义排重仍未完，不得仅凭 ≥700 签 accept。
- **真账（R3-01）**：分片保留；`contract-human-overrides.json` 人工核定覆盖重生。跨行 oracle 已修（`oracle-incomplete=0`）。`generate-contracts-last` 现报 proofGaps（oldMatcher-none / export-only / production-caller-none），不再用 ledgerDebtCount=0 冒充零债。禁止臆造旧行号。
- 反控 **53** / 净新目标 **50**：CTR-C05-08→cross-check（旧零基 index）；CTR-C05-09 补 C05-G01-02 真新目标；CTR-C08-34 重采为 kind-rewrite 针（旧 `:387` length 仍绿、新 kind/target 独红）。另 CTR-C09-04/29 cross-check 保留。未全量重采未变针。
- 自动脚本预览/完成流停线；私有 coverage 非正式 ratchet。

## 视觉流程

- 12 条 flows 全 pass（R2 相位证据保留，本轮未重拍）。C08-G02-02 非空 placement + kind/target 精确轴与 CTR-C08-34 感度已对齐。

## 全包 test 环境

- Editor 全包 **4493/4493**（含 `tests/world-sprite-behavior.pal.test.ts`）；本 worktree 需本地 gitignored `projects/pal/assets/migrated/sprites`（与主安装树对齐），不入库、不改真实源数据。
