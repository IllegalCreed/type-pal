# 当前审计与修复依据

Status: current
Owner: Codex（导航维护；发现与修复由对应任务Owner负责）
Last reviewed: 2026-10-24
Template: governance-index-v1 / 1.0.0

## 目的

把读者送到架构治理路线、逐文件代码账本、专项审计和实际修复回执。此页只维护导航，不复制旧审计的完成计数，也不替产品缺陷或测试质量作当前接受。

## 范围

- 当前导航：架构债、CODE-QUALITY路线/逐文件账本、pre-E2E审计及其修复总览。
- 历史材料：按原日期、固定候选和原结论读取；关闭的批次不自动扩大到整仓通过。
- 当前任务授权取[看板](../board.md)与[任务索引](../tasks/index.md)；执行原件取[证据导航](../evidence/README.md)。本页不批准新的产品修复、测试执行或runtime/E2E/视觉/coverage信用。

## 当前状态

current仅指导航。架构账本、代码治理与pre-E2E材料各有自己的日期、状态和后继；旧行数、覆盖率与批次数不能用本页日期刷新。本文全文核读与目标定位已做，目标产品和所有历史执行未重审。

## 入口与责任

| 需要判断什么 | 直接入口 | 事实与Owner边界 |
|---|---|---|
| 架构队列/拆分所有权 | [全仓架构债与分批治理](architecture-debt.md) | 读原批次与独立待办；具体build仍回到对应任务卡 |
| 代码治理路线/模块范围 | [全仓代码质量治理总纲](code-quality-governance.md) | 路线不等于各模块都已审核；不把本索引当工程质量规范副本 |
| 哪个文件已有核验/仍待核 | [逐文件代码治理账本](code-quality-file-ledger.md) | 由账本与机器consumer取计数；本页不维护第二份数字 |
| 两阶段只读审计与发现 | [pre-E2E总入口](pre-e2e/README.md) | 分清确认缺陷、疑点/撤回和可选优化；只读审计不等于修复 |
| 修复是否已有窄范围收口 | [pre-E2E修复总览](pre-e2e/summary.md) | 原始候选/反例/范围及后继回执分别核；旧done不等于当前全程序通过 |
| 查已归档报告 | [ops历史归档](../archive/README.md) | 历史状态不作为新执行授权；保留固定来源和supersedes链 |

导航维护由Codex负责；审计作者对实际读取范围负责，修复Coding Owner对合法输入、反例、验证与回写负责。长期协作与文档验收规则取[现行工作流](../agent-workflow.md)与[文档质量规范](../document-quality.md)，本目录不另造一套规则。

## 证据与下一步

- 本次依据：本页固定原文四个分类入口、现行ops目录职责、各目标的头部/范围与任务索引定位；必要入口现已在quote外可见。
- 发现冲突时记录具体path/候选/claim，回原审计或当前任务修正；源SHA、历史日期、失败与撤回保留。失效链接应先查显式迁移与后继，不直接删掉原历史材料。
- 本页通过导航检查不替任何被链接材料续期；后续新增审计需在本入口与真实consumer中说明职责、来源和下一步，不能以生成新账本代替正文核验。

## 原文保全

固定source revision `516872a827ed0f6321aa18162aa8a522edbab3c4`、SHA `12754695f9e2c901c3ddaeec69522a47bb0e3dae2dbf12607f6f62d4f2b2e275`。下方marker到EOF保留旧字节；原文中的“当前”按该时点读取。 该旧quote尾部另有一个裸`>`引用空行：直接剥引用得到658B，比固定Git源657B多末尾1个LF；仅排除这一个已定位的尾部引用空行后才逐字节相等。此规则不是trim或通用删LF，原quote不改。

<!-- original-source-quote:start -->
> # 当前审计与修复依据
>
> 这里只放仍在被当前工作消费的审计台账。已归档报告见 archive/audits；文档治理的结果见任务总索引。
>
> 上级：[协作与工程维护](../README.md)。
>
> ## 分类入口
>
> - [全仓架构债与分批治理](architecture-debt.md)（2026-09-24首轮盘点；第一阶段同样治理，重构与缺陷修复分开）
> - [全仓代码质量治理总纲](code-quality-governance.md)（CODE-QUALITY-1；逐文件清单、批次边界与首批 RLE 安全）
> - [逐文件代码治理账本](code-quality-file-ledger.md)（已直接核验文件、证据和待核计数）
> - [pre-e2e](pre-e2e/README.md)
>
<!-- original-source-quote:end -->
