# ED-FRAME-TIMELINE-VIRTUALIZATION-1 - 长帧动画时间线 DOM windowing

Status: cancelled
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把 phase1 历史材料接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 目标

- 可验收的工程或用户结果：历史任务目标与 cancelled 结论保持可追溯（Historical cancelled ops task card; preserve cancelled state, reasons, scope, evidence and handoff history.）。

## 范围

- 范围内：原始任务范围、取消状态、当时依赖和交接记录。
- 范围外：当前产品实现、当前待办和新的执行授权。

## 前提与证据

- 行为/工程前提：固定历史 source revision `dce008a777bb45658e9d7a146624db9b57469f63`；取消状态不等于当前缺陷结论。
- 一手证据：`docs/ops/archive/tasks/cancelled/ED-FRAME-TIMELINE-VIRTUALIZATION-1-frame-card-dom-windowing.md` 原始全文、source SHA 和 quote inverse。
- 最强替代解释与可证伪观察：当前 board、task card 或用户裁决可能已改变取舍；新证据出现时须新开卡复核。
- 当前状态：cancelled

## 验收

- 功能/文档：只验收历史记录的完整保全和状态边界。
- 测试与证据：source/after SHA、quote inverse、registry/review/routing。
- 视觉或 E2E（如适用）：本迁移不执行、不授信用。
- 不把历史回执、数量或覆盖率当作单独验收依据。

## 状态与交接

- 当前 Owner：历史原任务 Owner；文档治理由 Codex 维护。
- 阻塞/决策：- 正文信号 3:Status: cancelled（2026-09-01，用户恢复原始visible/native-drag形态后合并入RESTORE-1）
- 正文信号 24:- 本卡保留历史并标cancelled/superseded；RESTORE-1通过visible DOM验收后关闭board开放债。
- 下一步与交接提示词：如需恢复，创建新 task card，读取当前 primary source、oracle 和用户裁决。

## 历史范围

- ops archive；日期：2026-09-01；固定来源 `dce008a777bb45658e9d7a146624db9b57469f63`；source SHA `1de6e7cacfc4a1a9877566d0abd38ffcf22f48d882be8c3df7f5169506ff5926`。

## 原始结论

- ED-FRAME-TIMELINE-VIRTUALIZATION-1 - 长帧动画时间线 DOM windowing：这是 task-card，当前文档状态为 cancelled。全文 33 行、5 个标题；摘要/首段为「Status: cancelled（2026-09-01，用户恢复原始visible/native-drag形态后合并入RESTORE-1）」。属于历史/归档材料，不能单独证明当前实现。

## 当时证据

- 标题锚点：追踪原因；原目标与替代关系；当前门禁；下一位 Agent 提示词；原始正文、表格、状态词和链接在 quote 保全。

## 当前有效性

historical。do not promote historical cancelled task claims to current work without a new task card and current decision
- 历史冲突/未决：
- 正文信号 3:Status: cancelled（2026-09-01，用户恢复原始visible/native-drag形态后合并入RESTORE-1）
- 正文信号 24:- 本卡保留历史并标cancelled/superseded；RESTORE-1通过visible DOM验收后关闭board开放债。

## 继任文档

- Current ops task board, active task cards and fresh primary-source evidence.。
- 当前事实由继任规范、代码、测试和新的 review 决定。

## 原文保全

固定源 SHA `1de6e7cacfc4a1a9877566d0abd38ffcf22f48d882be8c3df7f5169506ff5926`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # ED-FRAME-TIMELINE-VIRTUALIZATION-1 - 长帧动画时间线 DOM windowing
>
> Status: cancelled（2026-09-01，用户恢复原始visible/native-drag形态后合并入RESTORE-1）
> Phase: phase2
> Capability: Editor frame-animation performance
> Coding Owner: Codex
> Reviewer: Kimi + GLM
> Risk: 高（虚拟化与横向reorder/选择/滚动/焦点语义耦合）
> Merged Into: `ED-FRAME-TIMELINE-UX-RESTORE-1`
>
> ## 追踪原因
>
> `FrameAnimationEditor.tsx:616-626,901-950` 当前仍对全部帧挂载 card/handle/两枚move button，只按
> visible集合延迟canvas解码；410帧并非真正DOM virtualization。这违反既有
> `A7-3-cutscene-asset-workbench.md:72,367,418-420` 的12–15可见项约束，也超过最新Web Interface
> Guidelines对50项列表的virtualize建议。
>
> ## 原目标与替代关系
>
> - 原目标曾要求公共handle/Home/End/移动按钮下的DOM windowing；用户随后否决该整套可见形态，要求恢复
>   `c799cb35^` 的pointer-only整卡native drag，因此原目标不再适用。
> - `ED-FRAME-TIMELINE-UX-RESTORE-1`接管仍然有效的债务：真实DOM只保留旧精确可视窗口+overscan，
>   保留总轨宽、稳定frame.id、selection/history与唯一save command；不再要求已被用户否决的handle/move语义。
> - 本卡保留历史并标cancelled/superseded；RESTORE-1通过visible DOM验收后关闭board开放债。
>
> ## 当前门禁
>
> 本卡已合并进`ED-FRAME-TIMELINE-UX-RESTORE-1`；恢复任务不得只删按钮而漏掉原先有界可见帧挂载。
>
> ## 下一位 Agent 提示词
>
> 无下一位 Agent 提示词；本债由RESTORE-1按原始visible window形态共同关闭。

<!-- original-source-quote:end -->
