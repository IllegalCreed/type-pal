# CODE65 speedrun index 当前复审切片

基点：`f7423f6a8`；分支：`codex/code-quality-3y`。本片只复核单例编排、主循环 tick、设置/PB persistence、暂停门和快捷键解绑，不改变 GameState、公共 API 或产品行为；CODE-QUALITY-65 当前复审为 `partial`。

## 实际读取与依据

- 实现/直接测试：`packages/game/src/tools/speedrun/index.ts`（116 行）、`index.test.ts`（126 行）、`index.glm-phase1-leaves.test.ts`（47 行）。
- 真实 caller/委托：`packages/game/src/shell/main-loop.ts` 的 `startRafLoop`、`packages/game/src/tools/tools-panel.ts` 计时器操作，以及 `snapshot.ts`、`timer.ts`、`store.ts`、`overlay.ts`、`countdown.ts`。
- Primary/oracle：speedrun design §4–§6、`SpeedrunTimer`/store/checkpoint 合同和真实 DOM/键盘 caller；index 不是 GameState owner。

## 逐文件结论

`index.ts` 的 `tickSpeedrunTimer` 在无 `document` 或 disabled 时短路；启用后从 `GameState` 建 snapshot、推进单例 `SpeedrunTimer`，仅在 dirty/justResumed 时写 PB 或提示，并按 show 设置委托 overlay/countdown。`setupSpeedrunHotkeys` 只在 enabled 时处理 F4/F8/F2，返回可重复调用的解绑函数；`isSpeedrunPaused` 只把 manual pause 交给主循环冻结，香蕉暂停允许玩家走到树上取物。单例 reset、默认 bests 播种和 store 持久化均保持职责边界。读取过程中未发现错误吞没、共享状态泄漏、异步资源清理或公共边界缺陷。

两份直接测试共 13 tests：主测试覆盖 disabled/tick/overlay/show、默认 PB、F4/F8/F2、manual/banana pause；GLM leaves 覆盖启用时解绑、未启用短路和解绑幂等。snapshot/timer/overlay/countdown 相邻四文件共 39 tests 的 caller 合同一并通过，无新增重复或恒真断言。

## 验证

- 定向/相邻：index 两份测试、snapshot、timer、overlay、countdown — 6 files / 39 tests passed。
- 类型：`pnpm --filter @type-pal/game typecheck` — passed。
- 覆盖率、protected fast、全仓 `pnpm check`：沿用 [`53-wave-gates`](../53-wave-gates/README.md) 稳定波次证据，本小批不重复运行昂贵门。

未关闭 overlay、checkpoint 实跑或其它 pre‑94 卡；未知保持 pending/partial。
