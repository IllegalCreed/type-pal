# TEST-GLM-GAME-TURN-BOUNDARIES-1 证据索引(GLM r1)

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把历史 ops evidence 接入 `evidence-receipt-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知、任务状态和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 证据身份
- `id`：原始证据记录或任务证据目录身份（保留于 quote）。
- `schemaVersion`：若原文提供则保留于 quote。
- `status`：historical receipt；不改写为当前 verified。
- candidate/source SHA：source `845aeefbf769a2976ccb480a5339cdca39fc230122b301ff54b25a109d004438`；after 见本批 review record。

## 来源与输入
- caller/source refs（file:line）：由原始证据记录保全；本页 source `docs/ops/evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/README.md`。
- 合法输入与版本：固定历史 source revision、原始数据/命令和记录环境。
- 执行时间和环境：以原始 receipt 为准；本次迁移不重跑。

## 断言与业务 oracle
- 业务 oracle：原始 receipt 的 caller、输入、断言和结果关系可追溯。
- 原子断言：quote 中每条机器/人工断言保持原样。
- 排重对象：对应 task card、同批 evidence 和 successor receipt。

## 结果
- 逐步结果、退出码、产物：保留原始记录；不把历史回执升格为当前通过。
- 失败：原始失败、rework、未执行和 unknown 信号继续保留。

## 限制与复核
- 未执行/未覆盖：本次不执行 runtime、E2E、视觉或 coverage。
- 不得外推的结论：不得外推当前产品完成、当前 runtime、E2E、视觉或 coverage。
- 复核条件：当前 consumer、source/oracle、task card 和独立验收重新齐全后才可重开。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `a1ac53bbea78b58ee88e5a3a53894a2fcaf595eb`；本轮为 2026-10-17 R39。
- 归档原因：历史 ops evidence 只作为时点回执保留，避免把旧执行记录当作当前事实。

## 原始结论
- `- 交付物:`packages/game/src/core/battle/battle-turn-boundaries.glm-turn.test.ts`(15 合同,单文件)`；原文完整语义保留于下方 quote。

## 当时证据
- 原始标题、章节、任务状态、命令、产物、SHA 和链接保留于 quote。

## 当前有效性
historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：当前 consumer 和 fresh receipt 仍待重新核对。

## 继任文档
- 当前 canonical 文档：对应 task card、当前 evidence consumer 和重新生成的 receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；不删除原始历史证据。
- 若重新启用的复核条件：以合法输入重跑，核对业务 oracle、artifact SHA 和独立 review。

## 原文保全
固定源 revision `a1ac53bbea78b58ee88e5a3a53894a2fcaf595eb`，source SHA `845aeefbf769a2976ccb480a5339cdca39fc230122b301ff54b25a109d004438`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-TURN-BOUNDARIES-1 证据索引(GLM r1)
>
> - 交付物:`packages/game/src/core/battle/battle-turn-boundaries.glm-turn.test.ts`(15 合同,单文件)
> - 排重账:[dedup-ledger.md](dedup-ledger.md)(15 新增轴 + 登记未测项 + 判例)
> - 身份集:[identity.json](identity.json)(file×fullName×status,15/15 passed)
> - 反控:[mutation-results.json](mutation-results.json) 15/15 VALID;逐相位 raw 见
>   [mutation-logs/](mutation-logs/)(`SHARED-original.*` + 每针 `-red.*`/`-restored.*`;
>   覆盖 15 针 × 红/恢复两相位 + 共享原始绿;`*.log` 受 .gitignore `*.log` 规则约束,须 `git add -f`)
>
> ## 反控口径
>
> 每针 = 源码单点变异(find 恰命中 1 次才有效)→ 定向文件全量跑:
> 红相位要求 exit≠0 且目标合同 failed 且失败为业务 AssertionError;恢复后源文件 sha256 与
> 原始一致(cleanupRestored),全文件恢复绿。**所有 15 针红相位 failed-total 均恰为 1**
> (只杀目标合同,精确命中);identitySet 逐相位落盘,hash 记入 mutation-results.json。
>
> | 针 | 源行 | 变异(节选) | 目标合同 |
> |---|---|---|---|
> | MUT-01 | battle-finalization.ts:29 | `? 'lost'`→`? 'fled'` | C1 lost 归类 |
> | MUT-02 | battle-finalization.ts:27 | `? 'won'`→`? 'fled'` | C2 forced 归类 |
> | MUT-03 | battle-system.ts:620 | flee `return 0.5`→`return 1` | C3 flee ×0.5 |
> | MUT-04 | battle-system.ts:618 | item `return 3`→`return 1` | C4 item ×3 |
> | MUT-05 | battle-system.ts:758 | `dex = Math.floor(dex / 2)`→`dex = dex` | C5 濒死 ÷2 |
> | MUT-06 | battle-system.ts:2507 | `!enemy.defeated && …> 0`→`…>= 0` | C6 死敌跳过 |
> | MUT-07 | battle-system.ts:2109 | `!role \|\| role.hp <= 0`→`!role` | C8 fleeAnim 活员 |
> | MUT-08 | battle-system.ts:2154 | 删 `e.defeated \|\|` | C9 敌逃死槽 |
> | MUT-09 | battle-system.ts:3046 | `ps.wPoisonScript = next`→`void next` | C10 毒回写 |
> | MUT-10 | battle-system.ts:3128 | `if (poisonChangedHp)`→`if (false)` | C11 DM12 |
> | MUT-11 | battle-system.ts:3032 | `if (!battleDecidedByCombat)`→`if (true)` | C12 跳毒门 |
> | MUT-12 | battle-system.ts:2586 | fThisTurnCoop 门→`if (false)` | C13 合击吞并 |
> | MUT-13 | battle-system.ts:2593 | 粘性门→`else if (false)` | C14 围攻粘性 |
> | MUT-14 | battle-system.ts:2183 | 隐身门→`if (false)` | C15 隐身 turnStart |
> | MUT-15 | battle-system.ts:430 | fleeAnim hold 早退删 return | C7 flee 中止队列 |
>
> (完整 argv/find/replace/sha/首条业务 AssertionError 见 mutation-results.json)
>
> ## 质量门(见卡回执)
>
> 定向 15/15;相邻(battle 全目录 35 文件)906/906;game 全量/typecheck/lint 0-0-0/docs/
> diff --check 见任务卡回执数值。
<!-- original-source-quote:end -->
