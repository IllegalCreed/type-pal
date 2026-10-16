# TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 证据 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 90fa1fea9dc30fa1816566943acfa51bbaabbca3fe99dd8e56994fdd48fd3d18。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 183ec0bf0b7ce290bcfa68839e5ce9d29af3245a；本轮 R66。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 证据：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `183ec0bf0b7ce290bcfa68839e5ce9d29af3245a`，source SHA `90fa1fea9dc30fa1816566943acfa51bbaabbca3fe99dd8e56994fdd48fd3d18`；下方 quote 可逆回原始 UTF-8 字节。
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
