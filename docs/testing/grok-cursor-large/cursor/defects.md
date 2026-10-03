# Defects / 未证账 — TEST-CURSOR-ASSET-UI-LARGE-1

## 产品缺陷（本卡只举证不停全卡）

- 无已确认需停整卡的产品缺陷。

## 合同/证据限制

- **合同账（717）** 分片在 [contracts/C01.json](./contracts/C01.json)…[C10.json](./contracts/C10.json)。
- **existing-proof（15）**（含 R6 **C01-G01-10** 引用 tab/panel）/ **净新结构上限 702**（717−15）。全量语义排重未完。
- **真账（R6）**：
  - human-ledger **18** / staging-draft **699**；staging builder 自动输出仅为 staging-draft，候选进 `toolOldAssertionCandidate`。
  - **C05-G05-06** 旧 blob 已纠正为 `SpriteActionEditor.test.tsx@16cb19c3…`；非法 JSON/拒收与精确 notice 分子轴。
  - **C05-G01-03** 撤回：wave2 `toEqual` ≠ 新 `toBe` 同引用。
  - **C03-G04-03** 旧失败 alert ≠ 坏→好恢复（恢复子轴 pending）。
  - **C04-G07-05** 旧帧序 ≠ 全部 durationMs（duration pending）。
  - **C05-G01-06** 中间空洞净新轴与 CTR-C05-10 保持 accept。
  - oldMatcher-none **565**；export-only 19；production-caller-none 104。
- 反控 **54** / 净新目标 **50** / cross-check **4**：数量门已闭，不补/换针。12 flows 不重拍。

## 视觉流程

- 12 条 flows 全 pass（相位证据保留，本轮未重拍）。

## 全包 test 环境

- Editor 全包数字以本轮 gates 实测为准。
