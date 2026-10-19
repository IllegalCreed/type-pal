# ED-FRAME-TIMELINE-VIRTUALIZATION-1 - 长帧动画时间线 DOM windowing

Status: cancelled（2026-09-01，用户恢复原始visible/native-drag形态后合并入RESTORE-1）
Phase: phase2
Capability: Editor frame-animation performance
Coding Owner: Codex
Reviewer: Kimi + GLM
Risk: 高（虚拟化与横向reorder/选择/滚动/焦点语义耦合）
Merged Into: `ED-FRAME-TIMELINE-UX-RESTORE-1`
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是为 410 帧场景追踪“真正 DOM virtualization”债务的历史卡：发现于 FrameAnimationEditor 只按 visible 集合延迟 canvas 解码、仍对全部帧挂载 card/handle/移动按钮；2026-09-01 用户否决整套 handle 形态后取消，仍有效的有界可见窗口债务由 ED-FRAME-TIMELINE-UX-RESTORE-1 接管。

## 目标

消除长帧时间线的 DOM 挂载债务：410 帧时间线违反既有 12–15 可见项约束与 50 项列表 virtualize 建议，要求真实 DOM 只保留可视窗口。

## 范围

- 范围内：FrameAnimationEditor.tsx:616-626,901-950 的全帧挂载问题追踪、公共 handle/Home/End/移动按钮下的 DOM windowing 设计。
- 范围外：用户随后否决的 handle/move 交互形态本身；RESTORE-1 接管的实现（旧精确可视窗口+overscan、总轨宽、稳定 frame.id、selection/history、唯一 save command）。

## 前提与证据

原卡锚点 FrameAnimationEditor.tsx:616-626,901-950 与 A7-3-cutscene-asset-workbench.md:72,367,418-420 的可见项约束。用户裁决恢复 c799cb35^ 的 pointer-only 整卡 native drag，原目标不再适用；恢复任务不得只删按钮而漏掉原先有界可见帧挂载。
- 当前状态：cancelled（历史终态；合并入 RESTORE-1）

## 验收

原卡验收为取消裁决与替代关系：本卡保留历史并标 cancelled/superseded；RESTORE-1 通过 visible DOM 验收后关闭 board 开放债。本页治理验收：quote 字节保全、逆回读按记录规则相等、模板与 overlay 章节齐全。

## 状态与交接

原卡明确无下一位 Agent 提示词；本债由 RESTORE-1 按原始 visible window 形态共同关闭。本页治理不恢复本卡、不重授 build。

## 历史范围

2026-09-01 取消裁决与替代关系；固定源 dce008a777bb45658e9d7a146624db9b57469f63（S15 批次源快照）。2026-10-17 R32 误标 phase1 的泛化封套，2026-10-18 S15 逐篇纠正为本 phase2 历史卡正文。

## 原始结论

`Status: cancelled`（2026-09-01）：用户恢复原始 visible/native-drag 形态，债务并入 ED-FRAME-TIMELINE-UX-RESTORE-1。原卡全文在下方 quote 保全。

## 当时证据

FrameAnimationEditor.tsx:616-626,901-950；A7-3 约束行；取消裁决/追踪原因/替代关系/门禁各节。本页治理未重跑任何浏览器验证。

## 当前有效性

historical。时间线 DOM 形态的当前事实以现行代码与 RESTORE-1 后继记录为准；本卡不构成恢复 handle 形态或跳过可见窗口债务的授权。

## 继任文档

承接卡为 done/ED-FRAME-TIMELINE-UX-RESTORE-1（若在册）与现行帧动画编辑器代码；同窗口取消卡见[ED-ACTION-GROUP-ADOPTION-2](ED-ACTION-GROUP-ADOPTION-2-frame-animation-timeline.md)。

## 原文保全

固定源 revision `dce008a777bb45658e9d7a146624db9b57469f63`，source SHA `1de6e7cacfc4a1a9877566d0abd38ffcf22f48d882be8c3df7f5169506ff5926`；下方 quote 逆回读规则：直接逆回多 1B；精确排除 end 标记前恰一个未引用分隔 LF 后与原源逐字节相等（不 trim、不替换）。
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
