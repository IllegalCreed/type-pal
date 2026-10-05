# coverage 实证探针(排重账 §方法 / §1 NEW 判定的数据源)

两轮 vitest v8 statement 级 coverage,`--coverage.include` 限
`src/core/event-system.ts` + `src/core/event-opcode-player.ts`:

- run1(21 文件 574 tests):event/opcode 相关全家族(event-system×15、dialogue-pagination×2、
  event-opcode-player×4、event-opcodes.cov85、mode、game-state×2、battle runscript-rearm)。
- run2(**game 全套件 3498 tests**,权威并集):零命中清单与 run1 一致 → 无单文件子集假阳性。

逐语句命中数(NEW/REG/unreachable 判定直接证据)见 [statement-hits.json](statement-hits.json):
`uncoveredStatements` = run2 全量零命中语句清单(event-system 100 条、event-opcode-player 1 条);
`rangesOfInterest` = 本卡 NEW 六区段 + REG 关键锚区段逐语句命中。

复现(worktree `packages/game` 下):

```bash
pnpm exec vitest run [<files...> 或全量] --coverage \
  --coverage.include='src/core/event-system.ts' \
  --coverage.include='src/core/event-opcode-player.ts' \
  --coverage.reporter=json --coverage.reportsDirectory=/tmp/ecov
```

关键读数(run2,行:命中数):

| 区段 | 读数 | 结论 |
|---|---|---|
| 4781-4783(零距离到达)/4790(pose 清)/4830-4834(到达复位) | 全 0 | 走位三臂零证 → W1/W2/W3 |
| 2674-2675(party 走到达推进)/2723-2724(NPC)/2756-2757(骑乘) | 全 0 | 拦截到达推进臂;W1 证 party 侧,NPC/骑乘同形登记 |
| 2823-2824(loadScene skip 臂) | 0 | L1(主臂 2810-2818 命中 ≥5) |
| 5084-5090(runEnterScript goto 命中/缺失) | 全 0 | E1a/E1b(ip 越界 5065、end 臂 5072-5079 命中 → REG) |
| 4949-4957(菱形回弹子臂)/4937-4938(随机轴)/4969(x≥0 象限) | 全 0 | M1 NEW;后两者同形登记 |
| 4488(rgwData 扩展) | 0 | S1(主臂 4489/播种 4472-4487 命中 → REG) |
| event-opcode-player.ts:98(`if (!eqRow) return true` 语句体) | 0 | opcode-residual 卡已登记防御守卫 → 本文件零新增 |
