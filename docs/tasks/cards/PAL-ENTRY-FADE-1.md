# PAL-ENTRY-FADE-1 — 场景淡入同时执行前景正文

Status: build
Phase: phase2
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Visual Verification Owner: Codex / User
Visual Verification Timing: mixed
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Branch: codex/q2-content-coverage

## 目标

雪崖淡入时剑圣向酒剑仙走近，停四拍后转左开口。入场步骤持有这段动作及其结束条件。

## 范围

显式入场淡入、前景运行器、编辑器预览和 `s150` 作者编排。同一入场步骤允许显式选择淡入和正文同时开始，步骤收尾等待两者结束。沿用现有帧时钟、呈现和位置权限。

## 前提真值门

| 维度 | 已核事实 | 一手依据 |
| --- | --- | --- |
| 原盘 | 雪崖进场清震并定位队伍，剑圣在淡入期间按世界拍走近，15 步后站定四拍再转左。 | [原盘动作与场景](../../phase1/game-mechanics.md#2026-11-19-七星盘龙柱返场与倒塌演出) |
| 第一阶段 | 同一盘龙柱场景实跑看到 15 次位移。全亮时已走 7 步。 | [Q2 回执](../../testing/domains/cross-phase/battle-foundation/report.md) |
| 二阶段 | 现有顺序是准备、等待淡入、执行正文。临时自动行为方案通过画面验证，脚本权属待纠正。 | [前景运行器](../../../packages/reforge/src/script-runner-core.ts) |
| 反证 | 如首句前由剑圣的自动行为产生步伐，或原生实绘缺步、提前转身、漏出中间场景，拒绝候选。 | [E2E 合同](../../testing/e2e/contract.md#e2e-收口硬门用户2026-10-042026-10-12补充) |

## 上下文锚点

[Q2 剧情回执](E2E-Q2-1-battle-foundation.md) · [二阶段开工规则](../../phase2/READ-FIRST.md) · [脚本合同](../../phase2/specs/script-system.md) · [入场指南](../../phase2/guides/scene-entry-authoring.md)

## 验收条件

1. 未选择重叠的入场仍依次完成准备、揭示和正文。显式重叠在准备结束后开始，淡入和正文两者均完成后才提交步骤。取消沿当前 runner 收尾。
2. 先以同局双端日志验证实际淡入、15 步的坐标与帧、停顿、转向和首句。核前景命令 caller，确认剑圣没有自动执行。
3. 核编辑器打开该步骤时的相关实体状态与运行预览，保留原速带声分屏及失败对照。报告同时记录未实跑的后继脚本。
4. 相关静态门零诊断。作者合同、证据和当前状态随任务同步。

## 当前模式推进记录

2026-11-19 Codex build allowed。Codex 单写入场、校验、编辑器提示和场景作者内容。dragon_replay 负责隔离录制和只读脚本核对。原盘记录与同局双端原件已核，用户明确要求把剧情脚本合理性纳入验收。

## Draft: 设计与风险

用一个入场淡入选项表达并行。准备期仍持有旧帧，只有目标世界的首步和定位等初始布置发生在黑幕下。淡入和后续正文使用同一 runner 的取消信号，在收尾处汇合。需验证正文与淡入谁先结束都不会提前提交，以及正常前景脚本没有继承自动行为的任务周期。

## Build: 实现与自测

执行结果沿 [Q2 报告](../../testing/domains/cross-phase/battle-foundation/report.md) 回写。

## Review: 审查与返工

同局原件须同时支持画面义务与命令运行权属。原临时自动行为方案保留为反控。

## 用户验收

原速双声道分屏待提交。

## 交接日志

2026-11-19 从 Q2 剑圣走位返工拆出淡入重叠能力，当前实现与录制处于同次复验窗口。

## 下一位 Agent 提示词

先核当前候选、E2E 原件和逐入口台账，按稳定 `s150` 入场身份复验。保留前景和自动调用的源字段。
