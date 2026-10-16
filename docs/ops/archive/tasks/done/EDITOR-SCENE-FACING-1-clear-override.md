# EDITOR-SCENE-FACING-1 — 切场景指令无法清除显式朝向

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
- primary source：固定 source revision `b9901f97a3a09359cbeaed9dde126e6f44b7f229` 与原卡全文。
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
- 原始日期、版本、阶段：源文档固定于 `b9901f97a3a09359cbeaed9dde126e6f44b7f229`；本轮为 2026-10-17 R41。
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
