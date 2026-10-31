# CODE67 speedrun checkpoint tests 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「CODE67 speedrun checkpoint tests 当前复审切片」的主题按原文时点保留(摘录:> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据)。

## 范围与证据

原报告含章节[CODE67 speedrun checkpoint tests 当前复审切片、实际读取与依据、逐文件结论、验证]、1个链接;固定main源2093B(SHA 1d2591094418)。当前存活入口:[README.md](../53-wave-gates/README.md)

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2093B / SHA-256 1d2591094418a62c4b3e07840cde914cf1633921530cb84460cfe4b45671fe46；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
