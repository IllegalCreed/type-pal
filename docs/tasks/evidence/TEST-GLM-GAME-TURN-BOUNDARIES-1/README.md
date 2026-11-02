# TEST-GLM-GAME-TURN-BOUNDARIES-1 证据索引(GLM r1)

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-GAME-TURN-BOUNDARIES-1 的证据索引（GLM r1）：交付物 battle-turn-boundaries.glm-turn.test.ts 单文件 15 合同+排重账+身份集+反控 15/15 VALID。

## 证据身份

- 交付物：15 合同（单文件）；dedup-ledger.md（15 新增轴+登记未测项+判例）；identity.json（15/15 passed）；mutation-results.json 15/15 VALID；mutation-logs（15 针×红/恢复+共享原始绿）。

## 来源与输入

- 反控口径：每针源码单点变异（find 恰命中 1 次）→定向全量跑；红相位 exit≠0 且目标合同 failed 且业务 AssertionError；恢复后源 sha 逐字节一致；所有 15 针红相位 failed-total 均恰 1。

## 断言与业务 oracle

- 十五针（源行/变异/目标）：MUT-01/02 battle-finalization.ts:29/:27 归类串改（C1 lost/C2 forced）；MUT-03/04 battle-system.ts:620/:618 倍率改（C3 flee×0.5/C4 item×3）；MUT-05 :758 dex÷2 删（C5 濒死）；MUT-06 :2507 死敌跳过（C6）；MUT-15 :430 fleeAnim hold 早退（C7 中止队列）；MUT-07 :2109 活员门（C8 fleeAnim）；MUT-08 :2154 敌逃死槽（C9）；MUT-09 :3046 毒回写（C10）；MUT-10 :3128 DM12 门（C11）；MUT-11 :3032 跳毒门（C12）；MUT-12 :2586 合击吞并门（C13）；MUT-13 :2593 围攻粘性门（C14）；MUT-14 :2183 隐身门（C15 turnStart）。

## 结果

- 质量门：定向 15/15；相邻 battle 全目录 35 文件 906/906；game 全量/typecheck/lint 0-0-0/docs/diff 见任务卡回执数值。

## 限制与复核

- memory 补充：r1 已推 b8dc938d0（15 合同/15 针全 VALID 每针恰 1 红）待 Codex 验收；副作用计数 oracle 须核计数主体判例在 ledger。

## 历史范围

- TEST-GLM-GAME-TURN-BOUNDARIES-1 r1 证据索引（15 合同+15 针）；固定源 revision a1ac53bbea78…（direct 规则）。

## 原始结论

- C1-C15 十五回合边界合同全绿；每针恰一红。

## 当时证据

- 十五针表与质量门指针在 quote 保全。

## 当前有效性

historical。r1 时点待验收（后续 dispatch 记录其证据未接收待复核）。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `a1ac53bbea78b58ee88e5a3a53894a2fcaf595eb`，source SHA `845aeefbf769a2976ccb480a5339cdca39fc230122b301ff54b25a109d004438`；下方 quote 逆回读规则：剥引用后与固定原源逐字节相等（direct，不 trim、不替换）。
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
