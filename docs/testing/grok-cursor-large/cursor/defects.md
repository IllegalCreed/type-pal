# Defects / 未证账 — TEST-CURSOR-ASSET-UI-LARGE-1

## 产品缺陷（本卡只举证不停全卡）

- 无已确认需停整卡的产品缺陷。C02 观测到的「焦点对象外部变更关上传面板」「帧数不足拒新增后类型菜单仍开」按现行为写入断言，未改产品。

## 合同/证据限制

- **合同账（717）** 分片在 [contracts/C01.json](./contracts/C01.json)…[C10.json](./contracts/C10.json)；瘦索引 [contracts-index.json](./contracts-index.json)。
- **existing-proof（14）** / **净新结构上限 703**（717−14）。全量语义排重未完，不得仅凭 ≥700 签 accept。
- **真账（R5）**：
  - `humanVerified` 仅 `verification: human-ledger`（当前 **17**）；staging/script 批赋值为 `staging-draft`（**700**），≠ 人工核定。
  - 工具候选 `toolOldAssertionCandidate` 与已晋升 `oldAssertion` 分离；同轴晋升见 staging `R5-oldmatcher-*.json`（本轮 +44 候选写入，账上 none **653**）。
  - `caller` 分栏 production|harness；props 类型不进 sourceCondition。
  - C03-G04-02/03 oracle 已补完整 `.not.toBeNull()` matcher。
  - 禁止凭同函数名/关键词裁新旧；mixed 按子轴注明。
- 反控 **54** / 净新目标 **50** / cross-check **4**：数量门已闭（含 CTR-C05-10 中间空洞），不补/换针。12 flows / kind / judge / typed 不重开。
- 自动脚本预览/完成流停线；私有 coverage 非正式 ratchet。

## 视觉流程

- 12 条 flows 全 pass（R2 相位证据保留，本轮未重拍）。

## 全包 test 环境

- Editor 全包数字以本轮 gates 实测为准；本地 gitignored `projects/pal/assets/migrated/sprites` 不入库。
