# CODE-QUALITY-66 — game speedrun overlay boundary

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools/speedrun
Visual Verification Timing: functional-ui（DOM layout/data mapping；不做剧情 E2E）

## 目标

逐文件核验速通 overlay DOM 渲染及两份测试，确认 checkpoint row/最佳/差值/当前时间、预计通关、暂停前缀、隐藏/幂等生命周期保持 timer/store 合同。

## 范围

- `packages/game/src/tools/speedrun/overlay.ts`
- `packages/game/src/tools/speedrun/overlay.test.ts`
- `packages/game/src/tools/speedrun/overlay.glm-phase1-leaves.test.ts`

只读相邻 caller/oracle：`speedrun/index.ts:37-42`、`timer.ts`、`time-format.ts`、`tools-panel.ts`、DOM/pixel-less functional tests。

## 验证

- 完整读取实现/两份测试/真实 index caller；核 overlay style singleton、row mapping、diff color、ETA、clock/paused prefix、hide/remove。
- 定向 overlay 主/GLM 6 tests；与 speedrun wave 共用 game 全包 3523、`pnpm check`、ratchet、protected fast、lint-zero、docs/content/ledger；无实现改动，视觉形态保持现行合同。

## 交接

- 2026-10-13 Codex：完整读取 overlay 120 行、测试与 index/timer/time-format caller；row/ETA/diff/clock/pause/style singleton/DOM remove 合同均有 oracle，未发现直接缺陷。账本收口为 `3266 / 309 closed / 8 review / 2949 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-66 game speedrun overlay boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-66-game-speedrun-overlay-boundary.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、overlay.ts/两份测试、index.ts、timer.ts、time-format.ts
请做：若重开审计，复核 row/ETA/diff/clock/pause/style singleton 与 DOM cleanup
输出：证据、测试；当前结论为 accept/done，不得改变 overlay 形态或 timer API
```
