# EDITOR-SCENE-FACING-1 — 切场景指令无法清除显式朝向

Status: done
Owner: pre005_editor_edges（实现）；Codex Root（独立验收）
Phase: phase2
Visual Verification Timing: dev-functional（修复时做最小弹窗闭环）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是命令表单补测（TEST-CODEX-COMMAND-FORMS-1）暴露的现行编辑器缺陷窄修历史记录：切场景指令选“(保持)”朝向后仍提交旧显式朝向；下述验证均为原卡时点陈述，本次文档治理未重跑。

## 目标

修复 CommandForm 朝向“(保持)”语义：合法 loadScene 已有 facing:left、改坐标后选“(保持)”完成，应不再提交 left（undefined 代表无显式覆写），同时保留其它 rebuild 继承、三落点互斥与过渡信息。

## 范围

- 范围内：真实位置 command-form-world.tsx:585/693 仅保持回调显式 makeLoadScene；实现 beb5ac462、writer 补证 00f577411，均经 Root 逐文件审读接收；覆盖默认/命名/坐标三态的显式朝向清除与保存重开。
- 范围外：运行时朝向策略、scene schema、产品其它行为；原版/第一阶段 N/A（现行表单的保持选项与无覆写合同）。

## 前提与证据

根因：CommandForm.tsx:1162 的 rebuild 默认实参 `facing = cmd.facing` 把选择器 :1284 传入的 undefined 再次替换成旧朝向；makeLoadScene:92-98 已明确 undefined 代表无显式覆写。发现源自 codex-command-forms 补测（基点 7bd8f064）的公开表单诊断：合法 loadScene 带 facing:left、朝向选“(保持)”仍提交 left，诊断 exit 1 为完整输出多出 facing 字段。隔离 oracle 只把保持选择的重建改为直接 makeLoadScene，原诊断 1/1 通过、产品未改；旧诊断加载时替换 oracle 已退役，红绿证据由 Git 523cf97d 保留。
- 当前状态：done（历史终态）

## 验收

原卡记录：Root 独立定向表单/地图 87 项、完整 writer 16 项通过；真实 6014 隔离合成工程逐个默认/命名/临时坐标选“保持”→完成→重开弹层，均不再恢复 left，门口/12,2,0/过渡保留，截图 build/pre005/facing-cleared.png。保存证明分层：公开表单提交与生产 serializer/current loader 3 项回归；完整授权/writeProject/finishOpen 在 FSA/IDB 宿主替身上三形态两次写入、committed 及原字段全等。浏览器后台 OS 目录 picker 未出现，未冒称物理磁盘保存，该系统边界未由本修改动；统一质量门归母卡。以上均为原卡时点结果，本页未复跑。本页迁移验收：source/after SHA、quote 逆回读、模板与历史 overlay 章节、链接通过。

## 状态与交接

原卡由 Root 独立验收收口，无下一位贡献者提示词；“不能随补测 done 宣称本缺陷已修”的初始登记边界已由实现与验收关闭。S14 本页治理只改写泛化封套，不改动产品与测试现状。

## 历史范围

2026-10-02 用户要求清当前边角，[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md) 核准本窄修；同日实现与 Root 验收。2026-10-17 R41 泛化封套，2026-10-18 S14 逐篇改写。

## 原始结论

`Status: done`：朝向“(保持)”不再继承旧显式覆写，经 Root 独立验收；初始 draft 描述与旧路径仅作历史取证。原卡全文在下方 quote 保全。

## 当时证据

源码锚点 command-form-world.tsx:585/693、CommandForm.tsx:1162、makeLoadScene:92-98；实现 beb5ac462 与补证 00f577411；截图 build/pre005/facing-cleared.png；Git 523cf97d 保留旧红绿证据。本页治理未新增任何执行。

## 当前有效性

historical。修复时点的表单行为结论不外推为当前 main 现状；现行朝向合同以当前测试与代码为准。物理磁盘保存当时未验证，该边界保留。

## 继任文档

发现批次见[TEST-CODEX-COMMAND-FORMS-1](TEST-CODEX-COMMAND-FORMS-1-current-dialogs.md)；同窗边角修见[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)与[EDITOR-MAP-SELECTION-NOTICE-1](EDITOR-MAP-SELECTION-NOTICE-1.md)。

## 原文保全

固定源 revision `b9901f97a3a09359cbeaed9dde126e6f44b7f229`，source SHA `cbee188f31d42785557a6e612523abd55117043bc3571d429f6b379c8f78621a`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # EDITOR-SCENE-FACING-1 — 切场景指令无法清除显式朝向
>
> Status: done
> Owner: pre005_editor_edges（实现）；Codex Root（独立验收）
> Phase: phase2
> Visual Verification Timing: dev-functional（修复时做最小弹窗闭环）
>
> ## 已核事实
>
> 2026-10-02用户要求清当前边角；[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)已核准本窄修。
> 当前真实位置为`command-form-world.tsx:585/693`，公开表单诊断再次复现只多出facing:left。
> 仅保持回调显式makeLoadScene，保留其它rebuild继承、三落点及过渡；Root与独立核验均premise verified/design agree，build allowed。
> 下面初始draft描述和旧路径仅作历史取证，不再是未授权状态。
>
> 来源[当前表单补测](../../../../testing/archive/legacy/batches/codex-command-forms/README.md)，基点7bd8f064。
> 真实公开CanonicalScriptBodyEditor→CommandForm→完成，合法loadScene已有facing:left，
> 改坐标后在朝向选“(保持)”仍提交left。诊断exit1为完整输出多出facing字段，不是环境/timeout。
> `CommandForm.tsx:1162`的rebuild默认实参`facing = cmd.facing`将选择器`:1284`传入的undefined
> 再次替换成旧朝向。`makeLoadScene`:92-98已明确undefined代表无显式覆写。
> 隔离oracle只把保持选择的重建改为直接makeLoadScene，原诊断1/1通过；产品未改。
>
> ## 实施边界
>
> 2026-10-02实现`beb5ac462`、writer补证`00f577411`已由Root逐文件审读并接收候选。
> Root独立定向表单/地图87项、完整writer16项通过。真实6014隔离合成工程逐个默认/命名/临时坐标
> 选择“保持”→完成→重开弹层，均不再恢复left，门口/12,2,0/过渡保留；截图`build/pre005/facing-cleared.png`。
> 保存证明分层：公开表单提交和生产serializer/current loader在3项回归；完整授权/writeProject/finishOpen
> 在FSA/IDB宿主替身上三形态两次写入、committed及原字段全等。浏览器后台OS目录picker未出现，
> 未完成原生目录保存，不冒称物理磁盘保存；该系统边界未由本修改动。统一质量门归母卡。
> 旧诊断加载时替换oracle已退役，历史代码/红绿证据由Git523cf97d保留，正式当前回归承担保护。
>
> 下方为初始登记范围，实施准入已由母卡覆盖。
>
> 当前仅登记，不借补测改变产品。后续窄修须保留其它调用的朝向继承、三种落点互斥、过渡信息；
> 覆盖默认/命名/坐标三态的显式朝向清除与保存重开，最小浏览器核选项与实际提交一致。
> 不更改运行时朝向策略或scene schema；原版/第一阶段N/A（现行表单的保持选项与无覆写合同）。
> 无需固定AI签字，Codex核准范围后独立实施；不能随补测done宣称本缺陷已修。
<!-- original-source-quote:end -->
