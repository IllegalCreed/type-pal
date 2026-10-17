# CODE62 speedrun timer 当前复审切片

基点：`c69d69300`；分支：`codex/code-quality-3y`。本片重新核验 timer 状态机；不改变 checkpoint 数据、speedrun API 或工具 UI。当前卡复审为 `partial`。

完整读取 `speedrun/timer.ts`、`timer.test.ts`、`timer.glm-phase1-leaves.test.ts`、`timer.boundaries.test.ts`，并读取 `speedrun/index.ts`、`snapshot.ts`、`store.ts`、`overlay.ts` caller。工具层没有 SDLPal 同形态 timer primary，行为以当前 PalTimer/checkpoint 设计和真实 caller 为 oracle。

## 结论与验证

- 纯状态机 ownership 清晰：scene>0 且 canMove 才起表，wall-clock delta 非负累加；每帧最多推进一个 checkpoint；finished 后不再累计。
- 香蕉暂停拿到香蕉直接恢复且不走倒计时；F8 手动暂停用 3 秒恢复倒计时，2999/3000ms 边界、恢复帧不计暂停跨度；setStep 清检测记忆/prev snapshot；PB 与 `bestsDirty`/`justResumed` 都是一次性消费。
- 直接 3 files / 22 tests passed；覆盖起表、顺序打点、PB、香蕉/手动暂停、倒计时、setStep、reset、检测器边界和实例隔离。
- `pnpm --filter @type-pal/game typecheck`：passed；store/index/overlay/tools-panel 相邻合同已在 61/58 窄批通过；coverage 等沿用 [`53-wave-gates`](../53-wave-gates/README.md)，本片不重复运行昂贵 coverage。

未关闭：checkpoint 数据与 PalTimer 视觉/剧情体验仍不在本片验收范围；62 当前 `partial`，不是整卡 `accept/done`。
