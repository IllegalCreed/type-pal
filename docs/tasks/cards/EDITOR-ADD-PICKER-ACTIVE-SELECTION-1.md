# EDITOR-ADD-PICKER-ACTIVE-SELECTION-1 — 候选高亮与待提交选择

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-29
Template: task-card-v1 / 1.0.0
Visual Verification Timing: functional

## 目标

初始道具等候选弹窗由 `DsAddPickerDialog` 持有待提交选择，`DsVirtualListbox` 持有键盘高亮。合法三项列表中，用 Enter 选中第一个候选后按向下键，现行实现把高亮恢复到第一项。应当让方向键移动高亮、Enter 更新待提交选择，最后由确认按钮添加当前选择。

## 范围

项目启动候选的方向键和 Enter，以及共用列表框在预制动作目录中的相邻行为。

## 前提与证据

[设计系统的候选追加合同](../../phase2/specs/editor-design-system.md#候选高亮与待提交选择)规定方向键和 Enter 由搜索输入接管，明确确认后再写入。当前库存入口经 ProjectWorkbenchTab 按候选 ID 写入一条库存项。

正式 AddPicker 回归在 add-picker-active-selection-before 执行得到一红五十二绿。失败发生在 item-000 与 item-001 的 DOM 高亮断言。用例文本由父卡归档的 add-picker-active-selection-red.patch 保留，作用于现行 add-picker.test.tsx。

## 验收

获准后复验方向键只移动高亮、Enter 更新待提交选择、确认后仅写入最终选中的候选。复核预制动作目录，以及业务主动改变选中项时的焦点。

## 状态与交接

2026-11-29 用户批准按方向键移动高亮、Enter 改选、「添加」写入的顺序实施。冻结重放仍一红三十五绿。列表框在外部选中键实际发生有效变化时同步活跃项。随后七份定向及相邻专测 61 项通过且无诊断，包括初始状态入口和预制动作目录。整窗及原件归[治理父卡](QUALITY-EDITOR-SPRITE-AUTHORING-1.md)。
