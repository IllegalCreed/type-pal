# ED-FRAME-TIMELINE-VIRTUALIZATION-1 - 长帧动画时间线 DOM windowing

Status: draft
Phase: phase2
Capability: Editor frame-animation performance
Coding Owner: Codex
Reviewer: Kimi + GLM
Risk: 高（虚拟化与横向reorder/选择/滚动/焦点语义耦合）
Depends On: `ED-ACTION-GROUP-ADOPTION-2`

## 追踪原因

`FrameAnimationEditor.tsx:616-626,901-950` 当前仍对全部帧挂载 card/handle/两枚move button，只按
visible集合延迟canvas解码；410帧并非真正DOM virtualization。这违反既有
`A7-3-cutscene-asset-workbench.md:72,367,418-420` 的12–15可见项约束，也超过最新Web Interface
Guidelines对50项列表的virtualize建议。

## 目标与删除条件

- 真实DOM只保留可视窗口 + 有界overscan，同时保留总轨宽和稳定frame.id。
- offscreen来源/目标仍支持handle pointer、键盘Home/End、左右移动、选择范围、自动滚动与live announcement。
- 1/3/64/410帧在首/中/末、缩放与横滚后选择/焦点不丢；本地draft history与唯一保存command不变。
- 完成并通过性能/交互/浏览器矩阵后，任务转`done`并关闭board开放债，任务卡保留历史；不得以
  ADOPTION-2的“未新增节点”冒充完成。

## 当前门禁

本卡仅建立可追踪债务，尚未完成独立前提矩阵与设计审签；`ED-ACTION-GROUP-ADOPTION-2`不得夹带实现。

## 下一位 Agent 提示词

无下一位 Agent 提示词；等待ADOPTION-2完成及用户安排优先级后再补完整设计与三签。
