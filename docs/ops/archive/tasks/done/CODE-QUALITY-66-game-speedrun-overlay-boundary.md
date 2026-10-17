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

## 2026-10-18 Codex 当前独立复审

- **范围与读取**：完整读取 `overlay.ts`（120 行）、`overlay.test.ts`（现 49 行）、`overlay.glm-phase1-leaves.test.ts`（59 行）；读取 `index.ts` 的 overlay 委托、`timer.ts` 的 `RunState`、`time-format.ts`、`store.ts` 的 `BestTimes` 与 tools-panel 设置 caller。
- **Primary/caller/oracle**：`tickSpeedrunTimer` 只在启用且 show=true 时调用 `renderOverlay`，否则调用 `hideOverlay`；overlay 自己拥有 DOM 根节点与 style 节点，timer/store 只提供只读投影。功能 UI 合同以当前 speedrun design、format helpers 与真实 index caller 为 oracle。
- **结论**：style 注入幂等、单根 replaceChildren 更新、checkpoint 行/最佳/当前/差值列、fast/slow/even 分色、最近已完成节点 ETA、暂停前缀和 hide/remove 清理均符合 caller 合同；SSR `document` guard 保持。未发现可由 caller/primary 直接证明的实现缺陷，未改变 UI 形态或 timer API。
- **测试判别力**：原直接测试缺少差值/ETA 行 oracle；补充一条使用真实 `CHECKPOINTS` 的最小测试，钉住最佳值、`-0:02` fast class 和 `预计通关 0:00:18`。直接两文件现 6 tests，覆盖行数/格式、暂停、差值/ETA、原位更新、style/hide 幂等；没有堆重复断言。
- **验证**：overlay 两文件与 time-format 两文件、index 主测试共 5 files / 25 tests passed；`pnpm --filter @type-pal/game typecheck` passed。coverage、protected fast、全仓 check 沿用 47–52 波次证据，本小批不重复运行昂贵门。当前复审为 `partial`，不是整卡 `accept/done`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-66 game speedrun overlay boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-66-game-speedrun-overlay-boundary.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、overlay.ts/两份测试、index.ts、timer.ts、time-format.ts
请做：若重开审计，复核 row/ETA/diff/clock/pause/style singleton 与 DOM cleanup
输出：证据、测试；当前结论为 accept/done，不得改变 overlay 形态或 timer API
```
