# EDITOR-SPRITE-ACTION-EMPTY-DIRECTORY-1 — 删空预制动作后保持工作台可用

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-28
Template: task-card-v1 / 1.0.0
Visual Verification Timing: functional

## 目标

从大世界精灵库编辑预制动作，确认删除该用途最后一个动作后，页内抛出 `Maximum update depth exceeded`，实际浏览器变成空白页。

## 范围

动作目录、当前地址和删除后的焦点。

## 前提与证据

- 真实 gzip RLE 作者工程、正式大世界精灵库和编辑命令。目录搜索、过滤排序和无效名称三个控制例通过，删空目录反例失败。更新夹具使路由回灌遵循 DataMode 后仍复现。
- Chrome 以 PAL 李逍遥为临时精灵，新建并确认删除唯一动作，`pageerror` 收到同一 React 错误，工作区正文为空。未保存项目。
- 空目录中子组件仍向宿主发送 `undefined`。宿主对同一个弹窗重复写入状态，造成下一轮通知。删除命令本身的历史和引用校验单独保留。

## 验收

依据[设计系统有序项与焦点约定](../../phase2/specs/editor-design-system.md#ds-c4d-有序集合与排序手柄v2120)。从真实入口确认删除最后一项只写一条历史，弹窗保留且焦点回到新建，撤销后动作可访问。原生浏览器和正式定向反例均复跑。

## 状态与交接

2026-11-28 已留失败记录，当时等待作者可见行为裁决，与[动作草稿保存](EDITOR-SPRITE-ACTION-FOCUSED-DRAFT-1.md)的修复分别处理。

2026-11-28 用户选择保留空动作编辑器并聚焦新建。空目录停止发送隐式选中通知，显式删除仍清理当前动作。真实宿主的目录用例核对取消删除、后继和前项、最后动作删除后焦点、撤销，历史与内容均符合约定。Chrome 同一作者入口确认空目录正常显示、新建按钮获得焦点、无页面错误。集中门和集成随父卡。
