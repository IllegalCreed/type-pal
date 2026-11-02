# TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 门禁回执（r1，2026-10-06）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: quality-gate-v1 / 1.0.0

本页是 TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 的 r1 门禁回执：执行环境 darwin 24.6.0 arm64、node v22.23.2、分支 codex/glm-migrate-plan-transaction-r1（基 origin/main cb12a63e2）。

## Gate scope

- r1 候选（2 净新合同 migration-plan-transaction.glm-r1.test.ts）的定向/相邻/migrate 全量/repo typecheck/lint 五门。

## Diagnostics policy

- 逐门原始输出（数字为 vitest 汇总行；lint 为 lint-zero 完整报告；无诊断豁免）。

## Commands and raw counts

- 定向（unit）：vitest run --project unit src/migration-plan-transaction.glm-r1.test.ts → 1 文件 2/2 passed。
- 相邻（unit，7 模块全部兄弟套件+baseline/merge/path/write-guard/shop-author-merge 共 29 文件）：29 passed (29)、294 passed (294)。
- migrate 全量（unit+pal）：pnpm test → 97 passed (97)、740 passed (740)。
- repo typecheck：pnpm -r run typecheck → exit 0。
- lint（lint-zero 门）：pnpm lint → PASS — 3462 files; 0 errors / 0 warnings / 0 infos。

## Decision

- 五门全过，r1 证据成立（接收归 Codex 独立验收）。

## Stop line

- docs 门与 diff --check 见交付记录（README.md）；不因门绿代验收。

## 历史范围

- TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 r1 门禁回执（五门数字）；固定源 revision 183ec0bf0b7c…。

## 原始结论

- 定向 2/2、相邻 294/294、全量 740/740、typecheck exit0、lint 3462 文件 0/0/0。

## 当时证据

- 各门命令与汇总行在 quote 保全。

## 当前有效性

historical。r1 时点实测。

## 继任文档

当前结论归同目录 README.md。

## 原文保全

固定 source revision `183ec0bf0b7ce290bcfa68839e5ce9d29af3245a`，source SHA `78fbabae1bfe11755b966ed6d25ad7d74efc19c99506cec7ece3d470a4d7b2d7`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 门禁回执（r1，2026-10-06）
>
> 执行环境：darwin 24.6.0 arm64，node v22.23.2，分支 codex/glm-migrate-plan-transaction-r1（基 origin/main cb12a63e2）。
>
> ## 定向（unit）
> ```
> pnpm exec vitest run --config vitest.config.ts --project unit src/migration-plan-transaction.glm-r1.test.ts
> Test Files  1 passed (1)
>       Tests  2 passed (2)
> ```
>
> ## 相邻（unit，7 模块全部兄弟套件 + baseline/merge/path/write-guard/shop-author-merge）
> ```
> pnpm exec vitest run --config vitest.config.ts --project unit <29 files: migration-plan×3 migration-transaction×4>
>   <migration-write-plan×4 migration-project-io×4 pal-current-publication×2(unit) pal-store-boundary×2(unit)>
>   <migration-path migration-baseline×2 migration-merge×4 migration-write-guard shop-author-merge 本卡新文件>
> Test Files  29 passed (29)
>       Tests  294 passed (294)
> ```
>
> ## migrate 全量（unit + pal）
> ```
> pnpm test
> Test Files  97 passed (97)
>       Tests  740 passed (740)
> ```
>
> ## repo typecheck
> ```
> pnpm -r run typecheck   # exit 0
> ```
>
> ## lint（lint-zero 门）
> ```
> pnpm lint   # lint: PASS — 3462 files; 0 errors / 0 warnings / 0 infos
> ```
>
<!-- original-source-quote:end -->
