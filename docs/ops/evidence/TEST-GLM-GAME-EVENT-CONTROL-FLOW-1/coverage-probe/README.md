# coverage 实证探针(排重账 §判例的数据源)

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 coverage 实证探针说明：两次 vitest v8 statement 级 coverage，只收 src/core/event-system.ts 本卡疑点区段（1254-1469/1499-1513/1814-1824/1879-1991/2381-2419/3435-3453/4387-4413）的逐 statement 命中数，作为 NEW/unreachable 判定的直接证据；JSON 见同目录 statement-hits.json。

## 证据身份

- run1-3files：event-system.test+cov85+glm-event-contracts（374 tests）；run2-10files：run1+k01/k02/k04/k06+dialogue-pagination(.glm-contracts)+mode（415 tests）。

## 来源与输入

- 复现命令（worktree packages/game 下）：pnpm exec vitest run <files> --coverage --coverage.include=src/core/event-system.ts --coverage.reportsDirectory=/tmp/ecov --coverage.reporter=json。

## 断言与业务 oracle

- 关键读数（run2）：3443-3449（fail-closed 块内 7 条）命中 0→resolveConfirmGoto 目标缺失臂零证 NEW it1；2389 clearDialogBoxes 体命中 0→0x7F 清屏体零证 NEW it2 两臂一并补；1815/1819/1822（ip 越界链内）各 1→mode.test 单 op fixture 已证 REG（判例：3 文件子集曾误判 UNHIT）；1934-1946（DL17 idleFrames 臂）2-3→REG；1985-1991（goto 缺失终止）≥1→旧测 1432 已证 REG。

## 结果

- 探针数据直接支撑排重账 NEW×2/unreachable 判定。

## 限制与复核

- 只读探针：不改变产品/测试；覆盖率口径仅限两目标文件。

## 历史范围

- TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 coverage 探针说明（两轮 v8 statement 实证）；固定源 revision 4ce17faa06c6…。

## 原始结论

- 3443-3449 与 2389 零命中→两 NEW；1815 族各 1→REG（3 文件子集误判判例）。

## 当时证据

- 复现命令与读数表在 quote 保全。

## 当前有效性

historical。探针时点数据。

## 继任文档

当前结论归同目录 README.md 与 dedup-ledger.md。

## 原文保全

固定 source revision `4ce17faa06c6ce05f4a4868de380e25d4854e575`，source SHA `14566f1e1c7e05b8d4e65672d1a48952bfd23117c35f275ffec32141c5c8047f`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # coverage 实证探针(排重账 §判例的数据源)
>
> 两次 vitest v8 statement 级 coverage,只收 `src/core/event-system.ts` 本卡疑点区段
> (1254-1469 / 1499-1513 / 1814-1824 / 1879-1991 / 2381-2419 / 3435-3453 / 4387-4413)
> 的逐 statement 命中数,作为 NEW/unreachable 判定的直接证据。JSON 见 [statement-hits.json](statement-hits.json)。
>
> 复现(worktree `packages/game` 下):
>
> ```bash
> pnpm exec vitest run <files...> --coverage \
>   --coverage.include='src/core/event-system.ts' \
>   --coverage.reportsDirectory=/tmp/ecov --coverage.reporter=json
> ```
>
> - run1-3files:`event-system.test.ts + cov85 + glm-event-contracts`(374 tests)
> - run2-10files:run1 + `k01/k02/k04/k06 + dialogue-pagination(.glm-contracts) + mode`(415 tests)
>
> 关键读数(run2):
>
> | statement | 行 | 命中 | 结论 |
> |---|---|---|---|
> | 3443-3449(fail-closed 块内 7 条) | 3443-3449 | 0 | resolveConfirmGoto 目标缺失臂零证 → NEW it 1 |
> | 2389 `clearDialogBoxes(gs)` 体 | 2389 | 0 | 0x7F 清屏体零证(657 型 fixture 开火时 box 不在场)→ NEW it 2 两臂一并补 |
> | 1815/1819/1822(ip 越界链内) | 1814-1823 | 各 1 | mode.test.ts 单 op fixture 已证 → REG(判例:3 文件子集曾误判 UNHIT) |
> | 1934-1946(DL17 idleFrames 臂) | 1930-1942 | 2-3 | 旧测已证 → REG |
> | 1985-1991(goto 缺失终止) | 1985-1991 | ≥1 | 旧测 1432 已证 → REG |
>
<!-- original-source-quote:end -->
