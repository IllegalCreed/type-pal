# CODE67 speedrun checkpoint tests 当前复审切片

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

基点：`f40509dae`；分支：`codex/code-quality-3y`。本片只复核 checkpoint 静态测试和 timer/detector boundary 判别力，不宣称运行时坐标/BGM 校准完成；CODE-QUALITY-67 当前复审为 `partial`。

## 实际读取与依据

- 直接测试：`packages/game/src/tools/speedrun/checkpoints.test.ts`（27 行）、`timer.boundaries.test.ts`（124 行）。
- 相邻实现/caller：`checkpoints.ts`（110 行）、`timer.ts`、`detectors.ts`、`speedrun/index.ts`。
- Primary/design：speedrun design checkpoint/PalTimer 注释和 §4.4；5 个坐标、学功夫 BGM、香蕉格及实际触发仍需要浏览器 `window.__tpgs` 实跑，静态测试不替代该证据。

## 逐文件结论

`checkpoints.test.ts` 的 3 个测试验证 21 个 checkpoint 的数量/id 唯一和参考时间单调、首尾标签以及 BANANA 的 scene/item/三格/零容差。它没有把坐标或 BGM 静态值冒充实跑，正确保留 §4.4 的未知边界。`timer.boundaries.test.ts` 的 6 个测试通过真实 `SpeedrunTimer`/detector caller 验证同 now 与 finished 停表、manual pause 2999/3000ms、一次性 dirty/justResumed、setStep 清 prev/mem、实例间 best/mem 隔离、集合/容差/prev null/caiyi 反例。读取过程中未发现测试重复、恒真或与实现脱节。

## 验证

- 定向/相邻：checkpoint、timer boundary、detectors、timer — 4 files / 31 tests passed。
- 类型：`pnpm --filter @type-pal/game typecheck` — passed。
- 覆盖率、protected fast、全仓 `pnpm check`：沿用 [`53-wave-gates`](../53-wave-gates/README.md) 稳定波次证据，本小批不重复运行昂贵门。

运行时坐标/BGM/香蕉触发实跑仍 pending；未关闭 checkpoint 数据或其它 pre‑94 卡。
