# CODE-QUALITY-68 — game speedrun countdown test contracts

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools/speedrun
Visual Verification Timing: functional-ui（倒计时 DOM 单节点）

## 范围

- `packages/game/src/tools/speedrun/countdown.test.ts`
- `packages/game/src/tools/speedrun/countdown.glm-phase1-leaves.test.ts`

## 验证

完整读取 `countdown.ts` 与两份测试；定向 4 tests 全绿，覆盖挂出/更新/null 移除、单例复用、相同节点更新、移除后重建与 pointer-events。speedrun wave 的全仓 check、ratchet、protected fast、lint-zero、docs/content review、ledger 已通过；无实现改动。

## 交接

2026-10-13 Codex：测试合同原子、DOM oracle 真实、与实现排重；accept/done。账本收口为 `3266 / 316 closed / 8 review / 2942 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-68 game speedrun countdown test contracts
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-68-game-speedrun-countdown-tests.md
当前状态：done，已归档；当前结论 accept/done，不得直接重用本卡授权实现
```
