# EDITOR-SCENE-FACING-1 — 切场景指令无法清除显式朝向

Status: build
Owner: pre005_editor_edges（实现）；Codex Root（独立验收）
Phase: phase2
Visual Verification Timing: dev-functional（修复时做最小弹窗闭环）

## 已核事实

2026-10-02用户要求清当前边角；[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)已核准本窄修。
当前真实位置为`command-form-world.tsx:585/693`，公开表单诊断再次复现只多出facing:left。
仅保持回调显式makeLoadScene，保留其它rebuild继承、三落点及过渡；Root与独立核验均premise verified/design agree，build allowed。
下面初始draft描述和旧路径仅作历史取证，不再是未授权状态。

来源[当前表单补测](../../testing/codex-command-forms/README.md)，基点7bd8f064。
真实公开CanonicalScriptBodyEditor→CommandForm→完成，合法loadScene已有facing:left，
改坐标后在朝向选“(保持)”仍提交left。诊断exit1为完整输出多出facing字段，不是环境/timeout。
`CommandForm.tsx:1162`的rebuild默认实参`facing = cmd.facing`将选择器`:1284`传入的undefined
再次替换成旧朝向。`makeLoadScene`:92-98已明确undefined代表无显式覆写。
隔离oracle只把保持选择的重建改为直接makeLoadScene，原诊断1/1通过；产品未改。

## 实施边界

当前仅登记，不借补测改变产品。后续窄修须保留其它调用的朝向继承、三种落点互斥、过渡信息；
覆盖默认/命名/坐标三态的显式朝向清除与保存重开，最小浏览器核选项与实际提交一致。
不更改运行时朝向策略或scene schema；原版/第一阶段N/A（现行表单的保持选项与无覆写合同）。
无需固定AI签字，Codex核准范围后独立实施；不能随补测done宣称本缺陷已修。
