# Defects / 未证账 — TEST-CURSOR-ASSET-UI-LARGE-1

## 产品缺陷（本卡只举证不停全卡）

- 无已确认需停整卡的产品缺陷。C02 观测到的「焦点对象外部变更关上传面板」「帧数不足拒新增后类型菜单仍开」按现行为写入断言，未改产品。

## 合同/证据限制

- **合同账（717）** 已由 `generate-contracts.mjs` 从各 `*.cursor-r1.test.ts(x)` 逐例解析生成（非 batch UI 模板账）。全文分片落在 [contracts/C01.json](./contracts/C01.json)…[C10.json](./contracts/C10.json)；瘦索引 [contracts-index.json](./contracts-index.json) 仅含 total/existingProof/netNewEstimate、shard 路径与 id→shard（无合同正文）。
- **existing-proof（14）**：原 9 + R3 的 C05-G01-01 / C06-G07-02/03/04 + **R4 的 C05-G01-02**（wave2:38-49 order=0 排在缺省之前完整数组）。**净新结构上限 703**（717−14）；全量语义排重仍未完，不得仅凭 ≥700 签 accept。
- **真账（R4-01）**：
  - `humanVerified` 仅 `verification: human-ledger`（C01–C10 staging 逐条件读取后合并）；`enrich-batch-human` **不再**因共享字符串设 `humanVerified=true`；工具候选进 `toolOldAssertionCandidate`，与人工核定分离。
  - `caller` 分栏 `production | harness`；harness **不算**生产 caller。
  - `sourceCondition` 跳过 props/回调类型行；props≠条件。
  - **oldMatcher-none = 685**（诚实账：去掉假晋升后上升）；同轴旧证晋升约 32 条。禁止臆造旧行号。
- 反控 **54** / 净新目标 **50** / cross-check **4**：CTR-C05-08/09 + CTR-C09-04/29 为旧证 cross-check；**CTR-C05-10** 补净新（C05-G01-06 nextSpriteActionId 最小空洞 vs max+1）。CTR-C08-34 kind 感度已关闭，本轮未重采。未全量重采未变针。
- 自动脚本预览/完成流停线；私有 coverage 非正式 ratchet。

## 视觉流程

- 12 条 flows 全 pass（R2 相位证据保留，本轮未重拍）。C08-G02-02 非空 placement + kind/target 精确轴与 CTR-C08-34 感度已对齐（R12 accept，不重开）。

## 全包 test 环境

- Editor 全包数字以本轮 gates 实测为准；本 worktree 需本地 gitignored `projects/pal/assets/migrated/sprites`（与主安装树对齐），不入库、不改真实源数据。
