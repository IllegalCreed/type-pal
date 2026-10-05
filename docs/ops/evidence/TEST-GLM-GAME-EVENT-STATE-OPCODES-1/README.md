# TEST-GLM-GAME-EVENT-STATE-OPCODES-1 证据目录

分支 `codex/glm-game-event-state-opcodes-r1`。Coding Owner:GLM;范围:`event-system.ts`
applyRawOpcode 业务分支与 `event-opcode-player.ts` 状态写回的**臂级**排重 + 未证状态业务合同。

## 文件

- [dedup-ledger.md](dedup-ledger.md) — 逐臂排重账(NEW×8 / REG / unreachable / defensive)
  + 方法、数据面佐证与判例。
- [directed-vitest.json](directed-vitest.json) — 定向 8/8,file×fullName×status 逐条。
- [mutation-points.json](mutation-points.json) — 8 针(find/replaceWith 全文唯一锚 + targetContract 精确 fullName)。
- [mutation-lib.mjs](mutation-lib.mjs) — r2 判据库(与 TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 已验收资产逐字节一致)。
- [mutation-runner.mjs](mutation-runner.mjs) — 三态 runner(仅换卡名/测试文件参数化)。
- [mutation-selftest.mjs](mutation-selftest.mjs) / [selftest-results.json](selftest-results.json) —
  判据自测 10/10(7 类 r1 误收反例全被 r2 拒,sanity 合法针形不过严;合成相位零 spawn 零临时树)。
- [mutation-results.json](mutation-results.json) — **8/8 VALID**(r2 判据;每针红相位恰一失败且
  精确命中目标合同、唯一 AssertionError、执行集/状态零漂移、恢复 identity 全等、产品源 sha 复原)。
- [mutation-logs/](mutation-logs/) — 8 针 × 3 相位 × stdout/stderr 规整全文(trimEof + 恰一换行,
  bytes/sha256 按落盘字节;受 `*.log` gitignore 约束,已 `git add -f`)。
- [coverage-probe/](coverage-probe/) — 两轮 v8 statement 级 coverage 原始 JSON
  (event/opcode 21 文件 574 测试 + game 全量 3498 测试并集,`--coverage.include` 限两目标文件)。
- [onenter-walk-reachability.md](onenter-walk-reachability.md) — onEnter 段走位/骑乘 op 数据下界扫描
  (party 走位现实可达 0x70×6/0x7a×5/0x7b×10;NPC 走位/骑乘 0 处)。

## 复现

```bash
pnpm --filter @type-pal/game exec vitest run src/core/event-system.glm-event-state-opcodes.test.ts
node docs/ops/evidence/TEST-GLM-GAME-EVENT-STATE-OPCODES-1/mutation-selftest.mjs
node docs/ops/evidence/TEST-GLM-GAME-EVENT-STATE-OPCODES-1/mutation-runner.mjs   # 自改产品源三态后复原
```
