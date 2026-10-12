# CODE-QUALITY-61 — game speedrun store boundary

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

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-61 game speedrun store boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-61-game-speedrun-store-boundary.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、store.ts/两份测试、speedrun/index.ts、tools-panel.ts:723-805、checkpoint design
请做：若重开审计，复核非法值反例与小数毫秒合同
输出：反例、diff、测试；当前结论为 accept/done
```
