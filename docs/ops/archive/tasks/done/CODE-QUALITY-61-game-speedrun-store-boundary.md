# CODE-QUALITY-61 — game speedrun store boundary

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-61 — game speedrun store boundary」的任务归属与历史边界。原目标见原文(摘录:逐文件核验 speedrun localStorage 设置/最佳成绩持久化，确认坏 JSON、未知 key、非法数值与默认副本边界；先写失败反例，再做最小 fail-closed 修复。);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-61 — game speedrun store boundary、目标、范围、前提真值门、验证、交接],共1个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源4148B(SHA 196ac0a8cb38);原卡前提按原时点保留。当前存活入口:[README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-61 — game speedrun store boundary的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文1个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4148B / SHA-256 196ac0a8cb38927c9fdda1cbbddcebba86326ef2c15a3fd220839e7be7067393；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# CODE-QUALITY-61 — game speedrun store boundary

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools/speedrun
Visual Verification Timing: N/A（localStorage 纯逻辑）

## 目标

逐文件核验 speedrun localStorage 设置/最佳成绩持久化，确认坏 JSON、未知 key、非法数值与默认副本边界；先写失败反例，再做最小 fail-closed 修复。

## 范围

- `packages/game/src/tools/speedrun/store.ts`
- `packages/game/src/tools/speedrun/store.test.ts`
- `packages/game/src/tools/speedrun/store.glm-phase1-leaves.test.ts`

只读相邻 caller/oracle：`speedrun/index.ts`、`tools-panel.ts:723-805`、`speedrun/overlay.ts`、phase1 speedrun design/checkpoint docs、localStorage tests。

## 前提真值门

- 一句话行为 / 工程前提：speedrun 设置与 PB 是工具层 localStorage 数据；未知/损坏成绩不得污染计时器或 UI，缺失 key 用当前 checkpoint defaults。
- 原版/primary source：PalTimer 成绩存储无直接仓库源码，N/A；当前 type-pal 设计以 `BestTimes`/checkpoint defaults 为唯一工具合同。
- 当前实现：`store.ts:1-50`；caller 通过 speedrun index/tools-panel 读写；现有 tests 覆盖默认、往返、缺 key、坏 JSON/ghost key，但未覆盖非法值类型/负数。
- `before -> after`：`loadBests` 会把任意 JSON 值 cast 成 number|null；after 只接受 null 或有限非负 number，其余回退对应 default。
- 最强替代解释 / 可证伪观察：若 `setSpeedrunBest`/所有 producer 已证明永远只写合法值且 localStorage 不可被外部修改，宽松读取仍可成立；但 localStorage 是可编辑字符串，工具入口必须防御坏数据。

## 验证

- 失败反例先行：旧实现把负数/字符串成绩原样投影；新增实现只接受 null 或有限非负 number，保留 rAF 真实小数毫秒 PB。
- 定向 store 9 tests，timer/tools 相邻合计 29 tests；game 全包 3523、全仓 check、ratchet、protected fast、lint-zero、docs/content/ledger 全部通过。
- 不改 speedrun schema、checkpoint 数据或公共 API。

## 交接

- 2026-10-13 Codex：完整读取 store/index/tools-panel/overlay caller；修复 localStorage bests fail-closed，接受真实计时器产生的小数毫秒，未知 key/坏 JSON/非法容器均回退 defaults。账本收口为 `3266 / 298 closed / 8 review / 2960 pending`。

## 2026-10-18 Codex 当前独立复审

- **范围与读取**：完整读取 `speedrun/store.ts`、`store.test.ts`、`store.glm-phase1-leaves.test.ts`；读取 `speedrun/index.ts`、`overlay.ts`、`tools-panel.ts:723-805` 与 timer/checkpoint caller。
- **结论**：localStorage 输入按 fail-closed 处理：设置只识别 `'1'/'0'`，bests 只接受当前 defaults 已有 key 的 `null` 或有限非负 number；坏 JSON、未知 key、数组/标量、负数、Infinity、字符串/对象均回退且不污染 defaults。合法小数毫秒 PB 保留。
- **验证**：直接 2 files/9 tests、相邻 index/overlay/tools-panel 3 files/30 tests通过；game typecheck 通过；coverage 等沿用 [`53-wave-gates`](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。当前复审为 `partial`，不是整卡 `accept/done`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-61 game speedrun store boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-61-game-speedrun-store-boundary.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、store.ts/两份测试、speedrun/index.ts、tools-panel.ts:723-805、checkpoint design
请做：若重开审计，复核非法值反例与小数毫秒合同
输出：反例、diff、测试；当前结论为 accept/done
```
````
<!-- incremental-original-source:end -->
