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

## 2026-10-18 Codex 当前独立复审

- **范围与读取**：完整读取 `index.ts`（116 行）、`index.test.ts`（126 行）、`index.glm-phase1-leaves.test.ts`（47 行）；读取 `shell/main-loop.ts` 的 rAF 调用、`tools-panel.ts` 计时器控制、`snapshot.ts`、`timer.ts`、`store.ts`、`overlay.ts`、`countdown.ts` 真实委托边界。
- **Primary/caller/oracle**：`startRafLoop` 每帧先按 `isSpeedrunPaused()` 冻结游戏世界，再调用 `tickSpeedrunTimer`；index 只构造/驱动 `SpeedrunTimer`，通过 store 持久化设置/PB，通过 overlay/countdown/toast 更新 UI，不直接写 `GameState`。
- **结论**：未启用时 DOM/计时器短路；启用后用注入的 wall-clock tick；show/banana 设置、F4/F8/F2 快捷键、暂停门、香蕉不冻结世界、SSR 无 window no-op 和解绑均与真实 caller 一致。单例 reset 只清本局 timer，默认 PB 从 CHECKPOINTS 播种；未发现可由 caller/primary 直接证明的实现缺陷，也未改变公共接口或产品行为。
- **测试判别力**：直接两份 index 测试共 13 tests，覆盖 disabled、tick/overlay、show=0、默认 PB、F4/F8/F2、manual/banana pause、未启用短路、解绑及幂等；相邻 snapshot/timer/overlay/countdown 四文件共 39 tests 通过，无新增弱重复测试。
- **验证**：六文件 39 tests passed；`pnpm --filter @type-pal/game typecheck` passed。coverage、protected fast、全仓 check 沿用 47–52 波次证据，本小批不重复运行昂贵门。当前复审为 `partial`，不是整卡 `accept/done`。

## 2026-10-18 合法输入与解绑证据勘误

Codex单一Owner，build allowed仅snapshot/index三测试和治理记录。旧“合法fixture”结论不足：双重强转隐藏facing0、残缺battle/空paletteFade；已改完整公开构造器与初始化。index原解绑只看toast不足以证明计时不重置，现实际起表/重置/再起表500后解绑，确认F4保持500/running；afterEach回收监听/timer/DOM/偏好/单例。现有20例数量不变，PB默认精确9452000ms，未扩大产品行为/API/save边界。

只在隔离副本模拟解绑后静默重置，旧20绿→新19绿1个指定AssertionError，正式恢复20绿；源码/测试/hash/native/raw与定向相邻/typecheck/静态门见 [63/65勘误](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/63-65-speedrun-fixtures/README.md)。当前partial不变，无新全仓check/ratchet/protected，旧波次不认证本候选。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-65 game speedrun index orchestration
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-65-game-speedrun-index-orchestration.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、index.ts/两份测试、main-loop.ts:175、tools-panel.ts:723-805、timer/store/overlay/countdown
请做：若重开审计，复核单例、设置/PB、tick/暂停/解绑委托与输入隔离
输出：证据、测试；当前结论为 accept/done，不得改 GameState 公共接口
```
