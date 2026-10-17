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

## 2026-10-18 Codex 当前独立复审

- **范围与读取**：完整读取 `snapshot.ts`（58 行）、`snapshot.test.ts`（62 行），并读取 `speedrun/index.ts` 的主循环入口、`timer.ts` 的输入合同、`detectors.ts` 的消费方、`shell/main-loop.ts` 的 rAF caller、`GameState` 相关字段和 speedrun design §4.1。
- **Primary/caller/oracle**：当前 PalTimer/checkpoint 设计是工具真值；`tickSpeedrunTimer` 每帧把 `GameState` 投影成快照，`SpeedrunTimer`/detectors 只消费投影；`GameState` 的 inventory、battleState、mode、sceneLoading、paletteFadeState、suspendRaf 是状态 owner。
- **结论**：快照为每次调用新建 inventory/enemy `Set`，只收 count>0 物品；战斗敌人 id 去重但总血量按槽位求和（含阵亡槽）；`canMove` 只由 explore 且非 scene-loading、palette-fade、suspendRaf 门控，不把 boot 预载误当可移动。未发现可由 caller/primary 直接证明的实现缺陷，也未改变产品行为或公共接口。
- **测试判别力**：直接 `snapshot.test.ts` 7 tests 覆盖合法投影、count=0 排除、战斗 id/总血和五个 canMove 反例；相邻 detectors/index 测试 5 files / 32 tests 通过。没有新增弱重复测试。
- **验证**：`pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/snapshot.test.ts` 通过；相邻 speedrun snapshot/detectors/index 五文件 32 tests 通过；`pnpm --filter @type-pal/game typecheck` 通过。coverage、protected fast、全仓 check 沿用 47–52 波次证据，本小批不重复运行昂贵门。当前复审为 `partial`，不是整卡 `accept/done`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-63 game speedrun snapshot boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-63-game-speedrun-snapshot-boundary.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、snapshot.ts/test、index.ts、main-loop.ts:175、speedrun design §4.1
请做：若重开审计，复核快照 ownership、canMove 门控、BattleSnap 集合与输入隔离
输出：证据、测试；当前结论为 accept/done
```
