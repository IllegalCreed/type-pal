# EDITOR-SCRIPT-CARD-UI-1 — 脚本步骤卡与继续按钮

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: functional-minimal
Last reviewed: 2026-10-15
Governance Owner: Codex（历史卡包 A 文档治理）
Template: task-card-v1 / 1.0.0

## 目标

保留 2026-09-28 用户截图触发的二阶段作者 UI 修复：普通继续按钮去除误导下拉箭头，步骤卡整块 hover/selected 与圆角统一，标题/编号/指令数分组，保持选择、详情与继续行为。

## 范围

原白名单为 CanonicalScriptFlowEditor、PreviewCanvas、对应 CSS、两个短标记 adoption、既有组件回归、卡/索引/回执和官方覆盖基线刷新。本轮只迁移历史任务卡；原范围不授权今天改组件、旧测试或 coverage。

## 前提与证据

原一手依据是用户截图及当时 ScriptEditor.tsx:3918 后入口、PreviewCanvas.tsx:594 与 DsButton children 单 span 包装。卡面说明 grid 未作用于内容行且 primary:hover 覆盖背景，选择面应使用 DsPressable。原版/第一阶段 N/A：这是二阶段作者界面。

[历史验证回执](../../../../testing/archive/legacy/editor/editor-workflows/script-card-ui.md)记录真实 6010 操作与原 1529f97e 基点；本轮核读文档，没有将旧行号认证为当前入口。反例是视觉样式修复误改选择/详情回调，或把功能预览一次播放算作剧情 E2E 收口。

## 验收

原卡的 10,176 全仓 check、9,715 strict-fast、typecheck 与 2,391 文件 lint 零诊断按2026-09-28保留，分支基线 47,637/63,361 未变。回执另记两文件 27/27，实际 6010 步骤选中/hover/键盘详情往返和 10px 圆角。

首轮两个设计系统登记失败及一处格式诊断在原回执中有修正说明；不能改写成首次全绿。本次不跑浏览器，不重验截图，不给新的测试或视觉信用。

## 状态与交接

原 Codex review→done 已按原记录生效；顶部 Status、Owner 与 functional-minimal 时机保留。E2E-001 翻页和 002 导航明确是独立任务，不随本卡关闭。无下一位产品 Agent 提示词；本次模板迁移已由根线程核语义、原文并接收，中央 SHA 已同步。

## 历史范围

2026-09-28 二阶段功能性作者界面，基点1529f97e。原截图保存于本地忽略路径 `build/verification/script-card-ui/selected-hover.png`；本次未读取该像素或临时日志，不把它们当永久已在库附件。

## 当时证据

[原回执](../../../../testing/archive/legacy/editor/editor-workflows/script-card-ui.md)给出截图 SHA-256 `7553d6a6a6adaddb44d06e8de3895677b7a0d84a6ddf95b1ab8334847566b786`、临时日志前缀、真实键盘操作和失败修正。源码/测试行号和统计均保留为历史锚，原字节在下方。

## 当前有效性

historical。已修 UI 的原结论不表示当前页面或 E2E-001/002 已验；保护基线未变不是覆盖率提升。原完整check/ratchet/strict-fast只是当日候选的记录。

## 继任文档

交付细节仍以[原验证回执](../../../../testing/archive/legacy/editor/editor-workflows/script-card-ui.md)追溯；新 UI 变化按[二阶段规则](../../../../phase2/READ-FIRST.md)及[现行工作流](../../../agent-workflow.md)核截图、caller和最小视觉证据。本卡不吞并剧情E2E后续。

## 原始结论

以下完整原卡只按原始时点解释。原字节可从 Git blob `41feabcb3db944de9bd03daf2f1fcbca71bfbb40` 回读；新增正文没有替代原历史判断。

> # EDITOR-SCRIPT-CARD-UI-1 — 脚本步骤卡与继续按钮
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: functional-minimal
>
> ## 验收与收口（2026-09-28）
>
> Codex已修复普通继续按钮误带箭头、步骤卡半块hover/圆角不一致及标题数量粘连。
> 正式6010页面实际播放和键盘详情往返通过；编号/数量与元信息分组回归保持现有行为。
> 完整check10,176、官方ratchet与保护1529f97e的单次strict-fast9,715全部通过，
> TC及lint2,391文件error/warning/info全零；覆盖基线完全不变（B47,637/63,361）。
> 首轮设计系统两项登记失败已按真实producer补齐，没有放宽门禁。
> Codex核定review→done并归档，见[验证回执](../../../../testing/archive/legacy/editor/editor-workflows/script-card-ui.md)。
> 本卡不关闭E2E-001/002待办；无下一位Agent提示词，不需其它席位。
>
> ## 准入与范围
>
> 2026-09-28用户截图指出：继续按钮有误导下拉箭头、步骤卡仅上半块亮蓝高亮、圆角不一致、
> 步骤编号与指令数粘连。Codex核定build allowed，单一实现Owner。
>
> 当前入口为ScriptEditor.tsx:3918后的CanonicalScriptFlowEditor与PreviewCanvas.tsx:594的普通确认按钮。
> DsButton会把children包在单个span中；步骤卡的grid因此未作用于内容行，primary:hover又覆盖卡片背景。
> 目标是保留选择/详情行为，改用现行DsPressable域选择面、卡片统一hover/selected，采用DS-F.4圆角/间距，
> 继续按钮仅保留明确动作。第一阶段/原版N/A；这是二阶段作者UI，截图和当前调用链是直接依据。
>
> 白名单：上述两组件、editor.css对应步骤卡规则、text-overflow-adoption.json两条真实短标记登记、
> 现有PreviewCanvas回归标题定位与ScriptEditor结构回归、本卡/索引与测试回执、官方覆盖率基线刷新。
> 既有选择/详情/继续回调测试复跑，editor TC/全仓lint零诊断；真实6010页面复核整卡状态、圆角和编号间距。
> E2E-001翻页缺陷反例保留在独立e2e工作树，002导航任务不混入本卡。
