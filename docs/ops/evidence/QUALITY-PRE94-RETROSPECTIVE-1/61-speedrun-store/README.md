# CODE61 speedrun store 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

历史 CODE-QUALITY-61 的 localStorage 设置/最佳成绩边界需重新核验:基点 ce424cf89、分支 codex/code-quality-3y,不改变 checkpoint 数据、speedrun 公共 API 或工具面板形态;整卡复审为 partial。2026-10-18 波次勘误:统一门 [README.md](../53-wave-gates/README.md) 已撤回'通过/收口'信用,不得沿用为本片验收或合并依据。

## 范围与证据

完整读取 tools/speedrun/store.ts、store.test.ts、store.glm-phase1-leaves.test.ts;读取 speedrun/index.ts、overlay.ts、tools-panel.ts:723-805 与 timer/checkpoint caller。localStorage 按可被用户编辑的字符串输入对待;typecheck 沿本批同一 game 工具窗口通过。

## 发现

loadBests 以当前 defaults 为骨架,只接受现有 key 的 null 或有限非负 number;未知 key、坏 JSON、数组/标量和非法值均回退,不污染 defaults;loadSettings 仅按 '1'/'0' 解释三项开关。真实 timer 合同保留小数毫秒 PB(1000.5);非法值反控覆盖负数、字符串、Infinity、布尔、对象、ghost key、null/数组/标量。直接 2 files/9 tests passed;相邻 speedrun/index.test.ts、speedrun/overlay.test.ts、tools-panel.test.ts 3 files/30 tests passed。

## 结论

持久层输入净化切片核验成立,整卡仍 partial;本页原逐文件/定向结果按各自证据保留,旧计数不改写为 0。PalTimer 设计文档与 checkpoint 数据只作 caller/oracle,未扩张为产品机制验收。

## 整改与复核

coverage 等昂贵门本片不重复运行(波次回执仅为历史表述)。未重跑任何命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1754B / SHA-256 6b035f6a9eabe0a50d08ae1bcaf62622152bea685d0e8e14aa2afdc648eb3d57；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE61 speedrun store 当前复审切片

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

基点：`ce424cf89`；分支：`codex/code-quality-3y`。本片重新核验 localStorage 设置/最佳成绩边界；不改变 checkpoint 数据、speedrun 公共 API 或工具面板形态。当前卡复审为 `partial`。

## 读取与结论

完整读取 `packages/game/src/tools/speedrun/store.ts`、`store.test.ts`、`store.glm-phase1-leaves.test.ts`；读取 `speedrun/index.ts`、`overlay.ts`、`tools-panel.ts:723-805` 与 timer/checkpoint caller。localStorage 是可被用户编辑的字符串输入，`loadBests` 以当前 defaults 为骨架，只接受现有 key 的 `null` 或有限非负 number，未知 key、坏 JSON、数组/标量和非法值均回退，不污染 defaults；`loadSettings` 仅按 `'1'/'0'` 解释三项开关。

## 验证

- 直接：2 files / 9 tests passed
- 相邻：`speedrun/index.test.ts`、`speedrun/overlay.test.ts`、`tools-panel.test.ts`，3 files / 30 tests passed
- 真实 timer 合同保留小数毫秒 PB（1000.5），非法值反控覆盖负数、字符串、Infinity、布尔、对象、ghost key、null/数组/标量
- `pnpm --filter @type-pal/game typecheck`：沿本批同一 game 工具窗口通过；coverage 等沿用 [`53-wave-gates`](../53-wave-gates/README.md)，本片不重复运行昂贵 coverage

未关闭：PalTimer 设计文档与 checkpoint 数据只作 caller/oracle，未扩张为产品机制验收；61 当前 `partial`，不是整卡 `accept/done`。
```
<!-- incremental-original-source:end -->
