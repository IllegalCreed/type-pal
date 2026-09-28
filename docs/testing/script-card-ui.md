# 脚本步骤卡与继续按钮修复

2026-09-28，Codex按用户截图修复二阶段作者界面；基点1529f97e。

## 原因与范围

- `PreviewCanvas.tsx` 的普通确认按钮直接写了“继续 ▾”，没有下拉菜单。改为“继续”，确认回调不变。
- `ScriptEditor.tsx` 的步骤选择面用了 `DsButton`：其单层children包装使原grid未分开标题/数量；
  primary按钮hover只染上半块，同时按钮和外卡使用不同圆角。
- 按现行设计系统的域选择面合同改为 `DsPressable`；标题、指令数、首次运行和下一步说明分组，
  父卡统一selected/hover背景与10px卡片圆角，使用规范间距。步骤详情仍是独立普通动作按钮。
- 保留原选择、详情、继续行为，补明确可访问名与整卡键盘焦点环；不改脚本数据/执行语义。

## 直接验证

现有ScriptEditor流程回归补标题/数量独立节点、元信息分行及可访问名断言；PreviewCanvas回归
更新纯确认按钮定位，继续核真实确认回调。定向两文件27/27、editor typecheck零诊断。

在6010的独立验证标签打开正式s001页面、实际播放进场脚本：

1. 对话按钮显示“继续”，不带箭头。
2. 步骤1选中并hover、步骤2未选中：两卡160×114px、圆角均10px；选择按钮背景透明，
   状态由整卡呈现，不再上下断层。标题/数量水平间距分别约40.68/52.28px。
3. “首次运行”和“下次进入步骤 2”各自占行；正文数字不孤立换行。
4. Tab到详情按钮有2px焦点环，Enter打开“步骤 1 · 详情”，关闭回到原按钮；
   Shift+Tab回选择面，父卡显示2px焦点环。

实测截图：`build/verification/script-card-ui/selected-hover.png`（本地忽略证据，非入库资产）。
SHA-256：`7553d6a6a6adaddb44d06e8de3895677b7a0d84a6ddf95b1ab8334847566b786`。
用户原标签未写入内容，验证标签已关闭；6010开发服务继续保留。
仅验功能性UI，不把此次播放当E2E-001/002剧情收口或full/Q1/Q2验收。

## 质量门

首轮完整check发现两条新增nowrap CSS尚未登记，设计系统adoption与text-overflow门正确拒绝。
补记当前CanonicalScriptFlowEditor真实入口的编号/数量短标记：不截断、不加排除、不改审计规则；
没有改变业务语义或用预期失败掩盖问题。新增断言的单处格式诊断也已按Biome修正。

最终完整check 10,176项全绿（editor 3,288项），全部typecheck通过，lint 2,391文件
0 error / 0 warning / 0 info。
官方ratchet 9,715项/730生产文件通过：四指标分子/分母及基线文件均未改变，
分支仍为47,637/63,361=75.18%。此次不宣称覆盖率提升。

保护基点1529f97e的单次strict-fast 9,715项/730文件同样通过，零回退。
Codex独立核定[任务收口](../ops/archive/tasks/done/EDITOR-SCRIPT-CARD-UI-1-step-selection.md)。原始日志位于
`/tmp/codex-script-card-ui-{check-final,ratchet,strict}.log`；首次失败保留于
`/tmp/codex-script-card-ui-check.log`。
