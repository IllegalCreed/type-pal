# TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 的证据：r1 候选（GLM，2026-10-06）——migration plan/transaction/write-plan/project-io/files/current-publication/store-boundary 七文件排重审计后交付 2 净新合同+1 账目修正；饱和部分见排重账；产品/schema/旧测/config/baseline/真实数据零改动。

## 证据身份

- 排重账 dedup-ledger.md（7 文件逐轴，含 asset-supply 归档判定沿用、E05 chunks 已签排除域、v8 locless 处理与六主题证据映射）；反控 counterproof.json（2/2 PASS；TSV identity artifact 见 counterproof-raw/，含 baseline/每针 mutant+restored/final-replay 共 8 相位）；重建 node packages/migrate/scripts/mpt1-mutation-counterproof.mjs。

## 来源与输入

- 净新合同（migration-plan-transaction.glm-r1.test.ts，2 tests）：①commitMigrationTransaction 两个 manifest scope 变更（不同目标）在提交排序门被拒绝且零写盘（migration-transaction.ts:198；修正 kimi-r1 ledger 对该臂的 unreachable 判断——该证明仅对恢复路径成立）；②buildMigrationTransactionChanges 退役 baseline 文件不在磁盘时不产生幻影 delete，在场时仍产生真值删除（migration-write-plan.ts:91 false 臂；在场臂旧证作同 fixture 正控）。

## 断言与业务 oracle

- 2 针三态+final-replay 全 PASS；TSV 身份集四态一致。

## 结果

- 门禁（gates/）：定向 2/2；相邻 29 文件 294/294；migrate 全量 97 文件 740/740；repo typecheck exit0；lint 0/0/0（3462 文件）；docs 门与 diff --check 见交付记录。

## 限制与复核

- 覆盖率未按单卡统计（卡面口径：不作单卡门槛）。memory 补充：r1 已推 2afbb7ad0（双 manifest 排序门+幻影 delete 两合同）待 Codex 验收；unreachable 结论须按调用路径守卫次序逐路径复核判例。

## 历史范围

- TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 r1 证据（2 净新合同+1 账目修正）；固定源 revision 183ec0bf0b7c…。

## 原始结论

- manifest scope 排序门拒绝零写盘+退役文件幻影 delete 两合同。

## 当时证据

- 文件清单与门禁在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `183ec0bf0b7ce290bcfa68839e5ce9d29af3245a`，source SHA `90fa1fea9dc30fa1816566943acfa51bbaabbca3fe99dd8e56994fdd48fd3d18`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 证据
>
> r1 候选（GLM，2026-10-06）：migration plan/transaction/write-plan/project-io/files/current-publication/store-boundary
> 七文件排重审计后交付 2 净新合同 + 1 账目修正；饱和部分见排重账。产品/schema/旧测/config/baseline/真实数据零改动。
>
> - 排重账：[dedup-ledger.md](dedup-ledger.md)（7 文件逐轴 source:line × caller × input × oracle × fullName，
>   含 asset-supply 归档判定沿用、E05 chunks 已签排除域、v8 locless 处理与六主题证据映射）。
> - 反控：[counterproof.json](counterproof.json)（2/2 PASS；TSV identity artifact 见
>   [counterproof-raw/](counterproof-raw/)，含 baseline/每针 mutant+restored/final-replay 共 8 相位）。
>   重建：`node packages/migrate/scripts/mpt1-mutation-counterproof.mjs`。
> - 净新合同（`packages/migrate/src/migration-plan-transaction.glm-r1.test.ts`，2 tests）：
>   1. `commitMigrationTransaction` 两个 manifest scope 变更（不同目标）在提交排序门被拒绝且零写盘
>      （migration-transaction.ts:198；修正 kimi-r1 ledger 对该臂的 unreachable 判断——该证明仅对恢复路径成立）。
>   2. `buildMigrationTransactionChanges` 退役 baseline 文件不在磁盘时不产生幻影 delete，在场时仍产生真值删除
>      （migration-write-plan.ts:91 false 臂；在场臂旧证作同 fixture 正控）。
> - 门禁（[gates/](gates/)）：定向 2/2；相邻 29 文件 294/294；migrate 全量 97 文件 740/740；
>   repo typecheck exit 0；lint 0/0/0（3462 文件）；docs 门与 diff --check 见交付记录。
> - 覆盖率未按单卡统计（卡面口径：不作单卡门槛）。
>
<!-- original-source-quote:end -->
