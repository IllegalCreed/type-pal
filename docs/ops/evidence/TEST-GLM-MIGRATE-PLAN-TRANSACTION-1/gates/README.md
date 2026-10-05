# TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 门禁回执（r1，2026-10-06）

执行环境：darwin 24.6.0 arm64，node v22.23.2，分支 codex/glm-migrate-plan-transaction-r1（基 origin/main cb12a63e2）。

## 定向（unit）
```
pnpm exec vitest run --config vitest.config.ts --project unit src/migration-plan-transaction.glm-r1.test.ts
Test Files  1 passed (1)
      Tests  2 passed (2)
```

## 相邻（unit，7 模块全部兄弟套件 + baseline/merge/path/write-guard/shop-author-merge）
```
pnpm exec vitest run --config vitest.config.ts --project unit <29 files: migration-plan×3 migration-transaction×4>
  <migration-write-plan×4 migration-project-io×4 pal-current-publication×2(unit) pal-store-boundary×2(unit)>
  <migration-path migration-baseline×2 migration-merge×4 migration-write-guard shop-author-merge 本卡新文件>
Test Files  29 passed (29)
      Tests  294 passed (294)
```

## migrate 全量（unit + pal）
```
pnpm test
Test Files  97 passed (97)
      Tests  740 passed (740)
```

## repo typecheck
```
pnpm -r run typecheck   # exit 0
```

## lint（lint-zero 门）
```
pnpm lint   # lint: PASS — 3462 files; 0 errors / 0 warnings / 0 infos
```
