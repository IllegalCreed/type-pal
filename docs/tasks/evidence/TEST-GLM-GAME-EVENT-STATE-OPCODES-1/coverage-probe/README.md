# coverage 实证探针(排重账 §方法 / §1 NEW 判定的数据源)

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-GAME-EVENT-STATE-OPCODES-1 的 coverage 实证探针说明：两轮 v8 statement 级 coverage，--coverage.include 限 event-system.ts 与 event-opcode-player.ts 两目标文件。

## 证据身份

- run1（21 文件 574 tests）：event/opcode 相关全家族；run2（game 全套件 3498 tests，权威并集）：零命中清单与 run1 一致→无单文件子集假阳性。
- statement-hits.json：uncoveredStatements=run2 全量零命中语句清单（event-system 100 条、event-opcode-player 1 条）；rangesOfInterest=NEW 六区段+REG 关键锚区段逐语句命中。

## 来源与输入

- 复现（worktree packages/game 下）：pnpm exec vitest run [<files> 或全量] --coverage --coverage.include 两文件 --coverage.reporter=json --coverage.reportsDirectory=/tmp/ecov。

## 断言与业务 oracle

- 关键读数（run2 行:命中数）：4781-4783 零距离到达/4790 pose 清/4830-4834 到达复位全 0→走位三臂 W1/W2/W3；2674-2675 party/2723-2724 NPC/2756-2757 骑乘到达推进臂全 0（W1 证 party 侧，NPC/骑乘同形登记）；2823-2824 loadScene skip 臂 0→L1（主臂 2810-2818 命中≥5）；5084-5090 runEnterScript goto 命中/缺失全 0→E1a/E1b（ip 越界 5065、end 臂 5072-5079 命中→REG）；4948-4951 菱形回弹子臂 0→M1 NEW（随机轴/象限同形登记）；4488 rgwData 扩展 0→S1；event-opcode-player.ts:98 语句体 0→opcode-residual 卡已登记防御守卫本文件零新增。

## 结果

- 探针数据直接支撑 8 NEW 判定与 opcode-player 零新增结论。

## 限制与复核

- 只读探针；两轮几乎一致互证。

## 历史范围

- TEST-GLM-GAME-EVENT-STATE-OPCODES-1 coverage 探针说明（两轮权威并集）；固定源 revision 7d609719e234…。

## 原始结论

- 零命中清单支撑 W1-W3/L1/E1a/E1b/M1/S1 八 NEW 与 opcode-player 零新增。

## 当时证据

- 复现命令与读数表在 quote 保全。

## 当前有效性

historical。探针时点数据。

## 继任文档

当前结论归同目录 README.md 与 dedup-ledger.md。

## 原文保全

固定 source revision `7d609719e2347f6367712a54f2f81ccf3830b657`，source SHA `0ed6b6b2acf443ca5bd69bd6a1206f66f58becd761bf62b24d715f63dabbbade`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # coverage 实证探针(排重账 §方法 / §1 NEW 判定的数据源)
>
> 两轮 vitest v8 statement 级 coverage,`--coverage.include` 限
> `src/core/event-system.ts` + `src/core/event-opcode-player.ts`:
>
> - run1(21 文件 574 tests):event/opcode 相关全家族(event-system×15、dialogue-pagination×2、
>   event-opcode-player×4、event-opcodes.cov85、mode、game-state×2、battle runscript-rearm)。
> - run2(**game 全套件 3498 tests**,权威并集):零命中清单与 run1 一致 → 无单文件子集假阳性。
>
> 逐语句命中数(NEW/REG/unreachable 判定直接证据)见 [statement-hits.json](statement-hits.json):
> `uncoveredStatements` = run2 全量零命中语句清单(event-system 100 条、event-opcode-player 1 条);
> `rangesOfInterest` = 本卡 NEW 六区段 + REG 关键锚区段逐语句命中。
>
> 复现(worktree `packages/game` 下):
>
> ```bash
> pnpm exec vitest run [<files...> 或全量] --coverage \
>   --coverage.include='src/core/event-system.ts' \
>   --coverage.include='src/core/event-opcode-player.ts' \
>   --coverage.reporter=json --coverage.reportsDirectory=/tmp/ecov
> ```
>
> 关键读数(run2,行:命中数):
>
> | 区段 | 读数 | 结论 |
> |---|---|---|
> | 4781-4783(零距离到达)/4790(pose 清)/4830-4834(到达复位) | 全 0 | 走位三臂零证 → W1/W2/W3 |
> | 2674-2675(party 走到达推进)/2723-2724(NPC)/2756-2757(骑乘) | 全 0 | 拦截到达推进臂;W1 证 party 侧,NPC/骑乘同形登记 |
> | 2823-2824(loadScene skip 臂) | 0 | L1(主臂 2810-2818 命中 ≥5) |
> | 5084-5090(runEnterScript goto 命中/缺失) | 全 0 | E1a/E1b(ip 越界 5065、end 臂 5072-5079 命中 → REG) |
> | 4949-4957(菱形回弹子臂)/4937-4938(随机轴)/4969(x≥0 象限) | 全 0 | M1 NEW;后两者同形登记 |
> | 4488(rgwData 扩展) | 0 | S1(主臂 4489/播种 4472-4487 命中 → REG) |
> | event-opcode-player.ts:98(`if (!eqRow) return true` 语句体) | 0 | opcode-residual 卡已登记防御守卫 → 本文件零新增 |
>
<!-- original-source-quote:end -->
