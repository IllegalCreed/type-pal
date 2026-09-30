# EDITOR-MAP-SELECTION-NOTICE-1 — Esc 清选后的状态通知语义

Status: draft
Owner: Codex（待产品语义裁决；不属 TEST-GLM-WAVE-L-1 测试 Owner 白名单）
Phase: phase2
Capability: editor-authoring / map-selection
Visual Verification Timing: dev-functional（实施时最小地图选区/Esc 回显）

## 已核观察

GLM L 候选 `e2b3f43770c9968d72b16a34f3d0173a271cc4ca` 的
`docs/testing/glm-next-triple/wave-L/functional-visual.md` 与截图
`visual/02-map-selection-made.png`、`visual/03-map-selection-esc-cleared.png` 显示：
Esc 后 Inspector 已回到「属性/选中图层」，底部仍写「已选择 1 个视觉槽、1 个格点。」。
截图 SHA256 已由 Codex 核对，03 截图可见状态矛盾；选区实际清除已由 UI 回显证明。

源锚点：`packages/editor/src/ui/MapMode.tsx:2178-2187` 选择时通知；`:2646`
Esc 清选区只派发 `clear-selection`；`packages/editor/src/ui/EditorDiagnosticsBar.tsx:82-87`
把最近的 `workspaceNotice` 持续渲染为底部消息。原版/一阶段 N/A（现行编辑器
通知设计，不是原版地图机制），二阶段行为已核；未见通知自动过期证据。

## 待产品选择

O1 暂不定为产品 bug：若底栏表达“当前选区”，before → after 应在 Esc 后清除或
更新选择数量；若底栏表达“最近操作事件”，可保留历史文案，但需清楚标示其不是
当前状态。最强替代解释就是后者；若现行设计规范已经定义底栏为事件日志，可据
一手锚点关闭本卡。未经用户明确选择与 Codex 准入，不改产品或写测试冻结文案。
