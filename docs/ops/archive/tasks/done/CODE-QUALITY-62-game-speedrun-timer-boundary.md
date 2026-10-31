# CODE-QUALITY-62 — game speedrun timer boundary

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-62 — game speedrun timer boundary」的任务归属与历史边界。原目标见原文(摘录:逐文件核验 SpeedrunTimer wall-clock 起表、依序 detector、PB 更新、香蕉暂停、手动暂停倒计时、setStep/reset 和一次性 dirty flags，保持 PalTimer 对齐注释与现有工具行为。);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-62 — game speedrun timer boundary、目标、范围、前提真值门、验证、交接],共1个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源4071B(SHA f878eb8184d9);原卡前提按原时点保留。当前存活入口:[README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-62 — game speedrun timer boundary的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文1个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4071B / SHA-256 f878eb8184d99becca6d788bda095c43efb11de459a05dd842ae7c9abc1c17e0；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# CODE-QUALITY-62 — game speedrun timer boundary

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools/speedrun
Visual Verification Timing: N/A（纯状态机）

## 目标

逐文件核验 SpeedrunTimer wall-clock 起表、依序 detector、PB 更新、香蕉暂停、手动暂停倒计时、setStep/reset 和一次性 dirty flags，保持 PalTimer 对齐注释与现有工具行为。

## 范围

- `packages/game/src/tools/speedrun/timer.ts`
- `packages/game/src/tools/speedrun/timer.test.ts`
- `packages/game/src/tools/speedrun/timer.glm-phase1-leaves.test.ts`

只读相邻 oracle：`timer.boundaries.test.ts`、`speedrun/index.ts`、`snapshot.ts`、`detectors.ts`、`tools-panel.ts:723-805`、`docs/phase1/plans/2026-06-18-speedrun-timer*.md`、`checkpoints.ts` PalTimer 坐标注释。

## 前提真值门

- 一句话行为 / 工程前提：计时只在 scene>0 且 `canMove` 时起表；每帧最多推进一个 checkpoint；暂停/恢复不把暂停跨度计入，PB 只在完整通关且破纪录时更新。
- 原版/primary source：PalTimer 源码不在仓库，N/A；现有 checkpoint/timer 注释与 phase1 design 是当前工具真值，detector boundary tests 是 oracle。
- 当前实现：`timer.ts:1-218`；index/overlay/tools-panel caller；三份测试与 boundary tests覆盖全部状态分支。
- `before -> after`：文件仍待逐文件核验 -> 通过 caller/oracle/状态边界登记已验证；不改变 checkpoint 数据或计时产品形态。
- 最强替代解释 / 可证伪观察：wall clock 回退、同 now tick、暂停边界、setStep 后 detector mem 残留会改变结果；已有 boundary tests 与完整测试反控这些分支。

## 验证

- 定向：timer 主/GLM/boundary 三份测试；与 CODE-QUALITY-61 共用 29 tests、game 全包 3523、全仓 check、ratchet、protected fast、lint-zero、docs/content/ledger。
- 不改 timer 实现，除非直接反例击穿现有合同。

## 交接

- 2026-10-13 Codex：完整读取 timer 218 行、三份测试、index/snapshot/detectors/tools-panel caller 与 speedrun design；起表、依序 detector、PB、香蕉/手动暂停、倒计时、setStep/reset、一次性 flags 均有直接 oracle，未发现直接缺陷。账本收口为 `3266 / 298 closed / 8 review / 2960 pending`。

## 2026-10-18 Codex 当前独立复审

- **范围与读取**：完整读取 `timer.ts`、`timer.test.ts`、`timer.glm-phase1-leaves.test.ts`、`timer.boundaries.test.ts`；读取 `speedrun/index.ts`、`snapshot.ts`、`store.ts`、`overlay.ts` caller。
- **结论**：scene>0 且 canMove 起表、delta 非负累加、依序单步、finished 停表、香蕉直接恢复、F8 三秒恢复、2999/3000ms 边界、setStep/reset、PB/dirty/justResumed 一次性消费和 detector 实例隔离均与当前设计一致；未发现直接缺陷。
- **验证**：3 files/22 tests、game typecheck通过；coverage 等沿用 [`53-wave-gates`](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)，不重复运行昂贵 coverage。当前复审为 `partial`，不是整卡 `accept/done`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-62 game speedrun timer boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-62-game-speedrun-timer-boundary.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、timer.ts/两份测试/timer.boundaries.test.ts、index.ts、snapshot.ts、detectors.ts、speedrun design
请做：若重开审计，复核起表/依序/PB/香蕉/手动暂停/setStep/reset ownership
输出：证据、测试；当前结论为 accept/done，不得改 checkpoint 数据
```
````
<!-- incremental-original-source:end -->
