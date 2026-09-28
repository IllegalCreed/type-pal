# EDITOR-SCRIPT-CARD-UI-1 — 脚本步骤卡与继续按钮

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: functional-minimal

## 验收与收口（2026-09-28）

Codex已修复普通继续按钮误带箭头、步骤卡半块hover/圆角不一致及标题数量粘连。
正式6010页面实际播放和键盘详情往返通过；编号/数量与元信息分组回归保持现有行为。
完整check10,176、官方ratchet与保护1529f97e的单次strict-fast9,715全部通过，
TC及lint2,391文件error/warning/info全零；覆盖基线完全不变（B47,637/63,361）。
首轮设计系统两项登记失败已按真实producer补齐，没有放宽门禁。
Codex核定review→done并归档，见[验证回执](../../../../testing/script-card-ui.md)。
本卡不关闭E2E-001/002待办；无下一位Agent提示词，不需其它席位。

## 准入与范围

2026-09-28用户截图指出：继续按钮有误导下拉箭头、步骤卡仅上半块亮蓝高亮、圆角不一致、
步骤编号与指令数粘连。Codex核定build allowed，单一实现Owner。

当前入口为ScriptEditor.tsx:3918后的CanonicalScriptFlowEditor与PreviewCanvas.tsx:594的普通确认按钮。
DsButton会把children包在单个span中；步骤卡的grid因此未作用于内容行，primary:hover又覆盖卡片背景。
目标是保留选择/详情行为，改用现行DsPressable域选择面、卡片统一hover/selected，采用DS-F.4圆角/间距，
继续按钮仅保留明确动作。第一阶段/原版N/A；这是二阶段作者UI，截图和当前调用链是直接依据。

白名单：上述两组件、editor.css对应步骤卡规则、text-overflow-adoption.json两条真实短标记登记、
现有PreviewCanvas回归标题定位与ScriptEditor结构回归、本卡/索引与测试回执、官方覆盖率基线刷新。
既有选择/详情/继续回调测试复跑，editor TC/全仓lint零诊断；真实6010页面复核整卡状态、圆角和编号间距。
E2E-001翻页缺陷反例保留在独立e2e工作树，002导航任务不混入本卡。
