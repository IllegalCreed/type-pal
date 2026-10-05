# EDITOR-MAP-SELECTION-NOTICE-1 — Esc 清选后的状态通知语义

Status: done
Owner: pre005_editor_edges（实现）；Codex Root（独立验收）
Phase: phase2
Capability: editor-authoring / map-selection
Visual Verification Timing: dev-functional（实施时最小地图选区/Esc 回显）

## 已核观察

2026-10-02用户清边角准入见[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)。
Root与独立核验确认底栏是操作通知；Esc真正清选和Inspector明确清空应如鼠标清选报告“选区已清空。”。
此修复不依赖把底栏改成实时状态栏，故下方旧待选歧义已消解。两入口共享清选回调，保留其它Esc优先级。
Root premise verified/design agree/build allowed，限MapMode及相邻回归，不改变全局通知机制。

GLM L 候选 `e2b3f43770c9968d72b16a34f3d0173a271cc4ca` 的
`docs/testing/archive/legacy/batches/glm-next-triple/wave-L/functional-visual.md` 与截图
`visual/02-map-selection-made.png`、`visual/03-map-selection-esc-cleared.png` 显示：
Esc 后 Inspector 已回到「属性/选中图层」，底部仍写「已选择 1 个视觉槽、1 个格点。」。
截图 SHA256 已由 Codex 核对，03 截图可见状态矛盾；选区实际清除已由 UI 回显证明。

源锚点：`packages/editor/src/ui/MapMode.tsx:2178-2187` 选择时通知；`:2646`
Esc 清选区只派发 `clear-selection`；`packages/editor/src/ui/EditorDiagnosticsBar.tsx:82-87`
把最近的 `workspaceNotice` 持续渲染为底部消息。原版/一阶段 N/A（现行编辑器
通知设计，不是原版地图机制），二阶段行为已核；未见通知自动过期证据。

## Root实测与独立接收

`beb5ac462`共享清选回调仅处理真正清空，原Esc高优先级分支不变；Root独立87项定向通过。
6014实际选一个地图格点分别Esc、Inspector清空，两次底栏均“选区已清空。”且Inspector回地图属性，
保存/撤销仍disabled，不修改地图。截图`build/pre005/map-escape-cleared.png`和`map-inspector-cleared.png`。
既有MapMode.kimi-workflows的65条act警告在未改main复现，`d406cbcee`只修真实资源完成等待边界；
Root独立5/5且无stderr。未抑制console、改fixture或静态规则。统一质量门归母卡。

## 初始产品歧义（已由母卡核实）

O1 暂不定为产品 bug：若底栏表达“当前选区”，before → after 应在 Esc 后清除或
更新选择数量；若底栏表达“最近操作事件”，可保留历史文案，但需清楚标示其不是
当前状态。最强替代解释就是后者；若现行设计规范已经定义底栏为事件日志，可据
一手锚点关闭本卡。未经用户明确选择与 Codex 准入，不改产品或写测试冻结文案。
