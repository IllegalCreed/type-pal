# CODE62 speedrun timer 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「CODE62 speedrun timer 当前复审切片」的主题按原文时点保留(摘录:> 2026-10-18 波次门勘误：本页引用的 47–52统一门回执 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，)。

## 范围与证据

原报告含章节[CODE62 speedrun timer 当前复审切片、结论与验证]、1个链接;固定main源1809B(SHA 5d19fcd9f46c)。当前存活入口:[README.md](../53-wave-gates/README.md)。

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1809B / SHA-256 5d19fcd9f46c738e56ab3c6285be8f36a4ab890420e3d6b69ba29563def3c967；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE62 speedrun timer 当前复审切片

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

基点：`c69d69300`；分支：`codex/code-quality-3y`。本片重新核验 timer 状态机；不改变 checkpoint 数据、speedrun API 或工具 UI。当前卡复审为 `partial`。

完整读取 `speedrun/timer.ts`、`timer.test.ts`、`timer.glm-phase1-leaves.test.ts`、`timer.boundaries.test.ts`，并读取 `speedrun/index.ts`、`snapshot.ts`、`store.ts`、`overlay.ts` caller。工具层没有 SDLPal 同形态 timer primary，行为以当前 PalTimer/checkpoint 设计和真实 caller 为 oracle。

## 结论与验证

- 纯状态机 ownership 清晰：scene>0 且 canMove 才起表，wall-clock delta 非负累加；每帧最多推进一个 checkpoint；finished 后不再累计。
- 香蕉暂停拿到香蕉直接恢复且不走倒计时；F8 手动暂停用 3 秒恢复倒计时，2999/3000ms 边界、恢复帧不计暂停跨度；setStep 清检测记忆/prev snapshot；PB 与 `bestsDirty`/`justResumed` 都是一次性消费。
- 直接 3 files / 22 tests passed；覆盖起表、顺序打点、PB、香蕉/手动暂停、倒计时、setStep、reset、检测器边界和实例隔离。
- `pnpm --filter @type-pal/game typecheck`：passed；store/index/overlay/tools-panel 相邻合同已在 61/58 窄批通过；coverage 等沿用 [`53-wave-gates`](../53-wave-gates/README.md)，本片不重复运行昂贵 coverage。

未关闭：checkpoint 数据与 PalTimer 视觉/剧情体验仍不在本片验收范围；62 当前 `partial`，不是整卡 `accept/done`。
```
<!-- incremental-original-source:end -->
