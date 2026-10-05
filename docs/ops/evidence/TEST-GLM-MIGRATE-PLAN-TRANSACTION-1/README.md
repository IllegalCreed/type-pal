# TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 证据

r1 候选（GLM，2026-10-06）：migration plan/transaction/write-plan/project-io/files/current-publication/store-boundary
七文件排重审计后交付 2 净新合同 + 1 账目修正；饱和部分见排重账。产品/schema/旧测/config/baseline/真实数据零改动。

- 排重账：[dedup-ledger.md](dedup-ledger.md)（7 文件逐轴 source:line × caller × input × oracle × fullName，
  含 asset-supply 归档判定沿用、E05 chunks 已签排除域、v8 locless 处理与六主题证据映射）。
- 反控：[counterproof.json](counterproof.json)（2/2 PASS；TSV identity artifact 见
  [counterproof-raw/](counterproof-raw/)，含 baseline/每针 mutant+restored/final-replay 共 8 相位）。
  重建：`node packages/migrate/scripts/mpt1-mutation-counterproof.mjs`。
- 净新合同（`packages/migrate/src/migration-plan-transaction.glm-r1.test.ts`，2 tests）：
  1. `commitMigrationTransaction` 两个 manifest scope 变更（不同目标）在提交排序门被拒绝且零写盘
     （migration-transaction.ts:198；修正 kimi-r1 ledger 对该臂的 unreachable 判断——该证明仅对恢复路径成立）。
  2. `buildMigrationTransactionChanges` 退役 baseline 文件不在磁盘时不产生幻影 delete，在场时仍产生真值删除
     （migration-write-plan.ts:91 false 臂；在场臂旧证作同 fixture 正控）。
- 门禁（[gates/](gates/)）：定向 2/2；相邻 29 文件 294/294；migrate 全量 97 文件 740/740；
  repo typecheck exit 0；lint 0/0/0（3462 文件）；docs 门与 diff --check 见交付记录。
- 覆盖率未按单卡统计（卡面口径：不作单卡门槛）。
