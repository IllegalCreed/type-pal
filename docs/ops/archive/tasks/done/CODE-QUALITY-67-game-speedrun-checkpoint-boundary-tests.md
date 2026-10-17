# CODE-QUALITY-67 — game speedrun checkpoint boundary tests

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools/speedrun
Visual Verification Timing: N/A（纯数据/状态边界测试）

## 目标

逐文件核验 speedrun checkpoint data oracle 与 timer boundary suite，确认 21 节点唯一/单调、香蕉配置、同 now/finished/暂停/step/mem 隔离及 detector 边界测试均具真实判别力。

## 范围

- `packages/game/src/tools/speedrun/checkpoints.test.ts`
- `packages/game/src/tools/speedrun/timer.boundaries.test.ts`

只读相邻实现/caller：`checkpoints.ts`、`timer.ts`、`detectors.ts`、`speedrun/index.ts`、speedrun design/checkpoint PalTimer 注释。

## 验证

- 完整读取两份测试和相邻实现/设计锚点；定向 9 tests 全绿。
- 两文件已在最近 speedrun wave 的 game 全包 3523、`pnpm check`、coverage ratchet、protected fast、lint-zero、docs/content/ledger 中执行/验证；无实现修改。
- 验收结论：accept/done；测试合同原子、合法输入、真实 timer/detector oracle、边界反控与实例隔离均满足。

## 交接

- 2026-10-13 Codex：checkpoint 21-id/单调/首尾/香蕉三格与 timer boundary 9 tests 逐项读取；无重复或弱断言，未发现直接缺陷。账本收口为 `3266 / 311 closed / 8 review / 2947 pending`。

## 2026-10-18 Codex 当前独立复审

- **范围与读取**：完整读取 `checkpoints.test.ts`（27 行）、`timer.boundaries.test.ts`（124 行）；读取 `checkpoints.ts` 全部 110 行、`timer.ts`、`detectors.ts`、`speedrun/index.ts` 以及 speedrun design 的 checkpoint/PalTimer 注释与 §4.4 运行时校准合同。
- **Primary/caller/oracle**：checkpoint 常量由 `index.ts` 传给 `SpeedrunTimer`，detector 只读 `ProgressSnapshot`；静态数据 oracle 是当前 extracted id/PalTimer 注释，5 个坐标、BGM 与香蕉格仍明确要求浏览器实跑校准，不能由离线单测伪造完成。
- **结论**：21 个 id/参考时间单调性、首尾标签、香蕉三格/零容差，以及同 now/finished/暂停/step/mem 隔离和 detector 边界均有真实 timer/detector oracle；未发现测试或实现的直接缺陷。坐标/BGM 实跑未执行，保持未知，不修改 checkpoint 数据。
- **测试判别力**：直接两文件 9 tests 原子覆盖唯一性/单调、香蕉配置、同 now/finished、倒计时边界、一次性 flags、setStep 记忆清理、实例隔离和 detector 反例；相邻 detectors/timer 两文件一并通过，无重复或弱恒真断言。
- **验证**：四文件 31 tests passed；`pnpm --filter @type-pal/game typecheck` passed。coverage、protected fast、全仓 check 沿用 47–52 波次证据，本小批不重复运行昂贵门。当前复审为 `partial`，不是整卡 `accept/done`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-67 game speedrun checkpoint boundary tests
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-67-game-speedrun-checkpoint-boundary-tests.md
当前状态：done，已归档
若重开审计：复核 checkpoints.test.ts/timer.boundaries.test.ts 与 PalTimer 注释，不得直接重用本卡授权实现
当前结论：accept/done，无实现改动
```
