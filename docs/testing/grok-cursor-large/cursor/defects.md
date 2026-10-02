# Defects / 未证账 — TEST-CURSOR-ASSET-UI-LARGE-1

## 产品缺陷（本卡只举证不停全卡）

- 无已确认需停整卡的产品缺陷。C02 观测到的「焦点对象外部变更关上传面板」「帧数不足拒新增后类型菜单仍开」按现行为写入断言，未改产品。

## 合同/证据限制

- **contracts.json（707）** 已由 `generate-contracts.mjs` 从各 `*.cursor-r1.test.ts(x)` 逐例解析生成（非 batch UI 模板账）。每条含 `primarySource`、`sourceCondition`（产品导出行）、`caller`（测试调用行）、`legalInput`、`oracle`（断言行摘要）、结构化 `oldAssertion`、`testSourceLine`。长字段截断 ≤240 字以过 Biome 1MiB 门，真源仍在测试文件。
- **existing-proof（9）**：C09-G02-01/02/03/05/06/10、C09-G01-04、C07-G01-02、C07-G01-10；**净新估算 698**（707−9）。70 组 / 700 目标未缩围；**缺口 ≥2** 与全量排重仍待 Codex。
- **剩余 ledger debt**：除上述 9 条外，约 **698** 条仅从头注释 **排重** 引用旧 suite 文件名，**未**在本轮自动解析到旧测试 `fullName` + 断言行级 matcher（字段显式 `none — no line-level overlap proven in this generator pass`）。全量跨 L/M/P/Q/O 排重仍待 Codex/后续 pass，禁止臆造行号。
- 反控 **50** 枚三态 receipt，**50 不同** file×fullName 目标（CURSOR-R1-02 重采 7 针闭合原 43→50）；判据变且源/身份未变的 43 针已 `rejudge-counters.mjs` 重判保留。
- 唯一 judge 拒收自测：[judge-selftest.mjs](./judge-selftest.mjs) / [judge-selftest.json](./judge-selftest.json)（邻居身份/exit2/raw 未处理/ clean raw）。
- 自动脚本预览/完成流（world-sprite-behavior）按派发停线，未作主合同。
- 私有 coverage 不可与官方 baseline 相加；正式收益只认 Codex 并集实测。

## 视觉流程

- 12 条 flows 全 pass（见 [flows/flow-index.json](./flows/flow-index.json)）。CURSOR-R1-04 已修：R01 过滤行集、R02 用途筛选、R03 聚焦、R04 产品 PreviewCanvas、R05 选择变化、R06 缺失恢复、DS03 草稿 Escape、DS01/02 真实键盘、AR01 失败中相；AR02/DS04/既有截图 hash 策略保留。

## 全包 test 环境

- Editor 全包 **4493/4493**（含 `tests/world-sprite-behavior.pal.test.ts`）；本 worktree 需本地 gitignored `projects/pal/assets/migrated/sprites`（与主安装树对齐），不入库、不改真实源数据。
