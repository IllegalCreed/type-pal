# EDITOR-MAP-SELECTION-NOTICE-1 — Esc 清选后的状态通知语义

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `bb7b1d24e9e517e09730282b104ce51b4204cb0b`；本轮为 2026-10-17 R42。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

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
