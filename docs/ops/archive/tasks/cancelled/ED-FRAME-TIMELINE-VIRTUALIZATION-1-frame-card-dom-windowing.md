# ED-FRAME-TIMELINE-VIRTUALIZATION-1 - 长帧动画时间线 DOM windowing

Status: cancelled（2026-09-01，用户恢复原始visible/native-drag形态后合并入RESTORE-1）
Phase: phase2
Capability: Editor frame-animation performance
Coding Owner: Codex
Reviewer: Kimi + GLM
Risk: 高（虚拟化与横向reorder/选择/滚动/焦点语义耦合）
Merged Into: `ED-FRAME-TIMELINE-UX-RESTORE-1`

## 追踪原因

`FrameAnimationEditor.tsx:616-626,901-950` 当前仍对全部帧挂载 card/handle/两枚move button，只按
visible集合延迟canvas解码；410帧并非真正DOM virtualization。这违反既有
`A7-3-cutscene-asset-workbench.md:72,367,418-420` 的12–15可见项约束，也超过最新Web Interface
Guidelines对50项列表的virtualize建议。

## 原目标与替代关系

- 原目标曾要求公共handle/Home/End/移动按钮下的DOM windowing；用户随后否决该整套可见形态，要求恢复
  `c799cb35^` 的pointer-only整卡native drag，因此原目标不再适用。
- `ED-FRAME-TIMELINE-UX-RESTORE-1`接管仍然有效的债务：真实DOM只保留旧精确可视窗口+overscan，
  保留总轨宽、稳定frame.id、selection/history与唯一save command；不再要求已被用户否决的handle/move语义。
- 本卡保留历史并标cancelled/superseded；RESTORE-1通过visible DOM验收后关闭board开放债。

## 当前门禁

本卡已合并进`ED-FRAME-TIMELINE-UX-RESTORE-1`；恢复任务不得只删按钮而漏掉原先有界可见帧挂载。

## 下一位 Agent 提示词

无下一位 Agent 提示词；本债由RESTORE-1按原始visible window形态共同关闭。
