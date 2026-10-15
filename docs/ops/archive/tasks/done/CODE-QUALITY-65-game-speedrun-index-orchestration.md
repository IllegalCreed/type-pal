# CODE-QUALITY-65 — game speedrun index orchestration

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools/speedrun
Visual Verification Timing: functional-ui（overlay/countdown 委托；不做剧情 E2E）

## 目标

逐文件核验 speedrun 单例编排、主循环 tick、快捷键、设置/PB persistence、暂停门与 reset/解绑测试，确认 index 只协调已核验的 snapshot/timer/store/overlay 能力，不越界改 GameState。

## 范围

- `packages/game/src/tools/speedrun/index.ts`
- `packages/game/src/tools/speedrun/index.test.ts`
- `packages/game/src/tools/speedrun/index.glm-phase1-leaves.test.ts`

只读相邻 caller/oracle：`packages/game/src/shell/main-loop.ts:175`、`tools-panel.ts:723-805`、`snapshot.ts`、`timer.ts`、`store.ts`、`overlay.ts`、`countdown.ts`。

## 验证

- 完整读取实现/两份测试/真实 main-loop 与 tools-panel caller；覆盖 disabled short-circuit、wall-clock tick、overlay、F4/F8/F2、paused gate、banana 不冻结、解绑。
- 定向 index 主/GLM 12 tests；与 speedrun wave 共用 game 全包 3523、`pnpm check`、ratchet、protected fast、lint-zero、docs/content/ledger；无实现改动。

## 交接

- 2026-10-13 Codex：完整读取 index 116 行、测试和 main-loop/tools-panel caller；disabled/tick/overlay/F4/F8/F2/paused/banana/解绑合同全部有 oracle，未发现直接缺陷。账本收口为 `3266 / 309 closed / 8 review / 2949 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-65 game speedrun index orchestration
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-65-game-speedrun-index-orchestration.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、index.ts/两份测试、main-loop.ts:175、tools-panel.ts:723-805、timer/store/overlay/countdown
请做：若重开审计，复核单例、设置/PB、tick/暂停/解绑委托与输入隔离
输出：证据、测试；当前结论为 accept/done，不得改 GameState 公共接口
```
