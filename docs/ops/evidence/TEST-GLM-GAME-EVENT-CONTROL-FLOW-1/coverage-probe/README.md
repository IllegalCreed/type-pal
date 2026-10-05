# coverage 实证探针(排重账 §判例的数据源)

两次 vitest v8 statement 级 coverage,只收 `src/core/event-system.ts` 本卡疑点区段
(1254-1469 / 1499-1513 / 1814-1824 / 1879-1991 / 2381-2419 / 3435-3453 / 4387-4413)
的逐 statement 命中数,作为 NEW/unreachable 判定的直接证据。JSON 见 [statement-hits.json](statement-hits.json)。

复现(worktree `packages/game` 下):

```bash
pnpm exec vitest run <files...> --coverage \
  --coverage.include='src/core/event-system.ts' \
  --coverage.reportsDirectory=/tmp/ecov --coverage.reporter=json
```

- run1-3files:`event-system.test.ts + cov85 + glm-event-contracts`(374 tests)
- run2-10files:run1 + `k01/k02/k04/k06 + dialogue-pagination(.glm-contracts) + mode`(415 tests)

关键读数(run2):

| statement | 行 | 命中 | 结论 |
|---|---|---|---|
| 3443-3449(fail-closed 块内 7 条) | 3443-3449 | 0 | resolveConfirmGoto 目标缺失臂零证 → NEW it 1 |
| 2389 `clearDialogBoxes(gs)` 体 | 2389 | 0 | 0x7F 清屏体零证(657 型 fixture 开火时 box 不在场)→ NEW it 2 两臂一并补 |
| 1815/1819/1822(ip 越界链内) | 1814-1823 | 各 1 | mode.test.ts 单 op fixture 已证 → REG(判例:3 文件子集曾误判 UNHIT) |
| 1934-1946(DL17 idleFrames 臂) | 1930-1942 | 2-3 | 旧测已证 → REG |
| 1985-1991(goto 缺失终止) | 1985-1991 | ≥1 | 旧测 1432 已证 → REG |
