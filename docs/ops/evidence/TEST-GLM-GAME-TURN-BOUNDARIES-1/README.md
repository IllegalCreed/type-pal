# TEST-GLM-GAME-TURN-BOUNDARIES-1 证据索引(GLM r1)

- 交付物:`packages/game/src/core/battle/battle-turn-boundaries.glm-turn.test.ts`(15 合同,单文件)
- 排重账:[dedup-ledger.md](dedup-ledger.md)(15 新增轴 + 登记未测项 + 判例)
- 身份集:[identity.json](identity.json)(file×fullName×status,15/15 passed)
- 反控:[mutation-results.json](mutation-results.json) 15/15 VALID;逐相位 raw 见
  [mutation-logs/](mutation-logs/)(`SHARED-original.*` + 每针 `-red.*`/`-restored.*`;
  覆盖 15 针 × 红/恢复两相位 + 共享原始绿;`*.log` 受 .gitignore `*.log` 规则约束,须 `git add -f`)

## 反控口径

每针 = 源码单点变异(find 恰命中 1 次才有效)→ 定向文件全量跑:
红相位要求 exit≠0 且目标合同 failed 且失败为业务 AssertionError;恢复后源文件 sha256 与
原始一致(cleanupRestored),全文件恢复绿。**所有 15 针红相位 failed-total 均恰为 1**
(只杀目标合同,精确命中);identitySet 逐相位落盘,hash 记入 mutation-results.json。

| 针 | 源行 | 变异(节选) | 目标合同 |
|---|---|---|---|
| MUT-01 | battle-finalization.ts:29 | `? 'lost'`→`? 'fled'` | C1 lost 归类 |
| MUT-02 | battle-finalization.ts:27 | `? 'won'`→`? 'fled'` | C2 forced 归类 |
| MUT-03 | battle-system.ts:620 | flee `return 0.5`→`return 1` | C3 flee ×0.5 |
| MUT-04 | battle-system.ts:618 | item `return 3`→`return 1` | C4 item ×3 |
| MUT-05 | battle-system.ts:758 | `dex = Math.floor(dex / 2)`→`dex = dex` | C5 濒死 ÷2 |
| MUT-06 | battle-system.ts:2507 | `!enemy.defeated && …> 0`→`…>= 0` | C6 死敌跳过 |
| MUT-07 | battle-system.ts:2109 | `!role \|\| role.hp <= 0`→`!role` | C8 fleeAnim 活员 |
| MUT-08 | battle-system.ts:2154 | 删 `e.defeated \|\|` | C9 敌逃死槽 |
| MUT-09 | battle-system.ts:3046 | `ps.wPoisonScript = next`→`void next` | C10 毒回写 |
| MUT-10 | battle-system.ts:3128 | `if (poisonChangedHp)`→`if (false)` | C11 DM12 |
| MUT-11 | battle-system.ts:3032 | `if (!battleDecidedByCombat)`→`if (true)` | C12 跳毒门 |
| MUT-12 | battle-system.ts:2586 | fThisTurnCoop 门→`if (false)` | C13 合击吞并 |
| MUT-13 | battle-system.ts:2593 | 粘性门→`else if (false)` | C14 围攻粘性 |
| MUT-14 | battle-system.ts:2183 | 隐身门→`if (false)` | C15 隐身 turnStart |
| MUT-15 | battle-system.ts:430 | fleeAnim hold 早退删 return | C7 flee 中止队列 |

(完整 argv/find/replace/sha/首条业务 AssertionError 见 mutation-results.json)

## 质量门(见卡回执)

定向 15/15;相邻(battle 全目录 35 文件)906/906;game 全量/typecheck/lint 0-0-0/docs/
diff --check 见任务卡回执数值。
