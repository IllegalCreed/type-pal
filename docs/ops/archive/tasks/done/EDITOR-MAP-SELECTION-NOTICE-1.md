# EDITOR-MAP-SELECTION-NOTICE-1 — Esc 清选后的状态通知语义

Status: done
Owner: pre005_editor_edges（实现）；Codex Root（独立验收）
Phase: phase2
Capability: editor-authoring / map-selection
Visual Verification Timing: dev-functional（实施时最小地图选区/Esc 回显）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 GLM L 波证据暴露的地图选区通知矛盾窄修历史记录：Esc 真清选/Inspector 清空后底栏仍显示“已选择 1 个视觉槽、1 个格点。”；下述验证均为原卡时点陈述，本次文档治理未重跑。

## 目标

让两处清选入口（Esc、Inspector 清空）与鼠标清选一致报告“选区已清空。”，消除选区已清而底栏仍显示旧计数的矛盾；不把底栏改成实时状态栏。

## 范围

- 范围内：MapMode.tsx:2178-2187 选择通知、:2646 Esc 只派发 clear-selection、EditorDiagnosticsBar.tsx:82-87 持续渲染最近 workspaceNotice 的现行链；实现 beb5ac462 共享清选回调仅处理真正清空，保留其它 Esc 优先级。产品歧义（底栏=操作通知 vs 实时状态）已由母卡核实为操作通知，旧待选歧义消解。
- 范围外：全局通知机制、底栏语义重设计；原版/第一阶段 N/A（现行编辑器通知设计）。

## 前提与证据

证据源自 GLM L 候选 e2b3f43770c9968d72b16a34f3d0173a271cc4ca 的 wave-L functional-visual 与截图 02/03：Esc 后 Inspector 已回“属性/选中图层”而底栏仍写旧计数；截图 SHA256 已由 Codex 核对，选区实际清除由 UI 回显证明。未见通知自动过期证据。Root premise verified/design agree/build allowed，限 MapMode 及相邻回归。
- 当前状态：done（历史终态）

## 验收

原卡记录：Root 独立 87 项定向通过；6014 实际选一个地图格点分别 Esc、Inspector 清空，两次底栏均“选区已清空。”且 Inspector 回地图属性、保存/撤销仍 disabled、不修改地图，截图 build/pre005/map-escape-cleared.png 与 map-inspector-cleared.png。既有 MapMode.kimi-workflows 的 65 条 act 警告在未改 main 复现，d406cbcee 只修真实资源完成等待边界；Root 独立 5/5 且无 stderr，未抑制 console、改 fixture 或静态规则；统一质量门归母卡。以上均为原卡时点结果，本页未复跑。本页迁移验收：source/after SHA、quote 逆回读、模板与历史 overlay 章节、链接通过。

## 状态与交接

原卡由 Root 独立验收收口，无下一位贡献者提示词；初始产品歧义段（O1）保留为历史取证。S14 本页治理只改写泛化封套。

## 历史范围

2026-10-02 用户清边角准入见[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)；同日实现与 Root 独立接收。2026-10-17 R42 泛化封套，2026-10-18 S14 逐篇改写。

## 原始结论

`Status: done`：两清选入口统一报告“选区已清空。”经 Root 独立验收；底栏为操作通知的产品定性同时成立。原卡全文在下方 quote 保全。

## 当时证据

源码锚点 MapMode.tsx:2178-2187/:2646、EditorDiagnosticsBar.tsx:82-87；实现 beb5ac462 与 d406cbcee；GLM L 候选截图与 functional-visual；Root 截图 build/pre005/*.png。本页治理未新增任何执行。

## 当前有效性

historical。通知语义与 act 警告边界结论为修复时点结果；当前编辑器行为以现行测试与代码为准。

## 继任文档

同窗边角修见[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)与[EDITOR-SCENE-FACING-1](EDITOR-SCENE-FACING-1-clear-override.md)、[EDITOR-AUTO-LOCATOR-1](EDITOR-AUTO-LOCATOR-1-current-script-target.md)。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `00c446bb179f0bcccc7093c4d082f6562502649045e9529d95493e7653ec1a7c`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # EDITOR-MAP-SELECTION-NOTICE-1 — Esc 清选后的状态通知语义
>
> Status: done
> Owner: pre005_editor_edges（实现）；Codex Root（独立验收）
> Phase: phase2
> Capability: editor-authoring / map-selection
> Visual Verification Timing: dev-functional（实施时最小地图选区/Esc 回显）
>
> ## 已核观察
>
> 2026-10-02用户清边角准入见[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)。
> Root与独立核验确认底栏是操作通知；Esc真正清选和Inspector明确清空应如鼠标清选报告“选区已清空。”。
> 此修复不依赖把底栏改成实时状态栏，故下方旧待选歧义已消解。两入口共享清选回调，保留其它Esc优先级。
> Root premise verified/design agree/build allowed，限MapMode及相邻回归，不改变全局通知机制。
>
> GLM L 候选 `e2b3f43770c9968d72b16a34f3d0173a271cc4ca` 的
> `docs/testing/archive/legacy/batches/glm-next-triple/wave-L/functional-visual.md` 与截图
> `visual/02-map-selection-made.png`、`visual/03-map-selection-esc-cleared.png` 显示：
> Esc 后 Inspector 已回到「属性/选中图层」，底部仍写「已选择 1 个视觉槽、1 个格点。」。
> 截图 SHA256 已由 Codex 核对，03 截图可见状态矛盾；选区实际清除已由 UI 回显证明。
>
> 源锚点：`packages/editor/src/ui/MapMode.tsx:2178-2187` 选择时通知；`:2646`
> Esc 清选区只派发 `clear-selection`；`packages/editor/src/ui/EditorDiagnosticsBar.tsx:82-87`
> 把最近的 `workspaceNotice` 持续渲染为底部消息。原版/一阶段 N/A（现行编辑器
> 通知设计，不是原版地图机制），二阶段行为已核；未见通知自动过期证据。
>
> ## Root实测与独立接收
>
> `beb5ac462`共享清选回调仅处理真正清空，原Esc高优先级分支不变；Root独立87项定向通过。
> 6014实际选一个地图格点分别Esc、Inspector清空，两次底栏均“选区已清空。”且Inspector回地图属性，
> 保存/撤销仍disabled，不修改地图。截图`build/pre005/map-escape-cleared.png`和`map-inspector-cleared.png`。
> 既有MapMode.kimi-workflows的65条act警告在未改main复现，`d406cbcee`只修真实资源完成等待边界；
> Root独立5/5且无stderr。未抑制console、改fixture或静态规则。统一质量门归母卡。
>
> ## 初始产品歧义（已由母卡核实）
>
> O1 暂不定为产品 bug：若底栏表达“当前选区”，before → after 应在 Esc 后清除或
> 更新选择数量；若底栏表达“最近操作事件”，可保留历史文案，但需清楚标示其不是
> 当前状态。最强替代解释就是后者；若现行设计规范已经定义底栏为事件日志，可据
> 一手锚点关闭本卡。未经用户明确选择与 Codex 准入，不改产品或写测试冻结文案。
<!-- original-source-quote:end -->
