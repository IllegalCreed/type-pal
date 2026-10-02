# EDITOR-SCENE-FACING-1 — 切场景指令无法清除显式朝向

Status: review
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

2026-10-02实现`beb5ac462`、writer补证`00f577411`已由Root逐文件审读并接收候选。
Root独立定向表单/地图87项、完整writer16项通过。真实6014隔离合成工程逐个默认/命名/临时坐标
选择“保持”→完成→重开弹层，均不再恢复left，门口/12,2,0/过渡保留；截图`build/pre005/facing-cleared.png`。
保存证明分层：公开表单提交和生产serializer/current loader在3项回归；完整授权/writeProject/finishOpen
在FSA/IDB宿主替身上三形态两次写入、committed及原字段全等。浏览器后台OS目录picker未出现，
未完成原生目录保存，不冒称物理磁盘保存；该系统边界未由本修改动。统一质量门归母卡。
旧诊断加载时替换oracle已退役，历史代码/红绿证据由Git523cf97d保留，正式当前回归承担保护。

下方为初始登记范围，实施准入已由母卡覆盖。

当前仅登记，不借补测改变产品。后续窄修须保留其它调用的朝向继承、三种落点互斥、过渡信息；
覆盖默认/命名/坐标三态的显式朝向清除与保存重开，最小浏览器核选项与实际提交一致。
不更改运行时朝向策略或scene schema；原版/第一阶段N/A（现行表单的保持选项与无覆写合同）。
无需固定AI签字，Codex核准范围后独立实施；不能随补测done宣称本缺陷已修。
