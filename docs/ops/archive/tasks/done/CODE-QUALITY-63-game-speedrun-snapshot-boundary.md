# CODE-QUALITY-63 — game speedrun snapshot boundary

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools/speedrun
Visual Verification Timing: N/A（纯快照投影）

## 目标

逐文件核验 speedrun `buildSnapshot` 及测试，确认 inventory、battle enemy identity/HP、wall-clock inputs 和 canMove 门控只读投影 `GameState`，不提前起表或泄漏可变集合。

## 范围

- `packages/game/src/tools/speedrun/snapshot.ts`
- `packages/game/src/tools/speedrun/snapshot.test.ts`

只读相邻 caller/oracle：`speedrun/index.ts:31-42`、`speedrun/timer.ts`、`shell/main-loop.ts:175`、`GameState`、speedrun design §4.1。

## 验证

- 完整读取实现/测试及真实 index/main-loop caller；snapshot tests 覆盖 count>0 inventory、battle id/HP 汇总、scene/mode/sceneLoading/paletteFade/suspendRaf canMove 五门。
- 定向 snapshot 6 tests；与 speedrun store/timer/detector wave 共用 game 全包 3523、`pnpm check`、ratchet、protected fast、lint-zero、docs/content/ledger。

## 交接

- 2026-10-13 Codex：`buildSnapshot` 的 inventory count>0、BattleSnap id/HP、scene/mode/sceneLoading/paletteFade/suspendRaf canMove 门控均有真实 index/main-loop caller 与 6 tests 证据；未发现直接缺陷。账本收口为 `3266 / 303 closed / 8 review / 2955 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-63 game speedrun snapshot boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-63-game-speedrun-snapshot-boundary.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、snapshot.ts/test、index.ts、main-loop.ts:175、speedrun design §4.1
请做：若重开审计，复核快照 ownership、canMove 门控、BattleSnap 集合与输入隔离
输出：证据、测试；当前结论为 accept/done
```
