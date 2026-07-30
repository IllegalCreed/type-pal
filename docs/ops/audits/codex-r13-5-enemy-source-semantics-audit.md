# P7-R13-5 敌人脚本源语义审计

日期：2026-07-30
范围：PAL `enemyObjects` 的 `scriptOnTurnStart`、`scriptOnReady`、
`scriptOnBattleEnd`，以及最终 `EnemyDef`、boss encounter overlay 与 Reforge 战斗消费。

## 结论

R13-5 不是“把 31 条 pending opcode 补进白名单”即可完成。

当前 `translate-enemy-scripts.ts` 把 plain / advance / reset 三种 END 都当作同一种分段边界，
再用绝对 `turn >= k` 近似原版敌钩子的持久脚本指针；遇到后续 label 还会直接截断。这个模型会
同时丢失：

- 概率失败后留在当前入口、下次激活重试；
- advance 后持久进入下一段；
- reset 后回到初始段；
- 同一次激活内的条件跳转和随机多臂；
- `0x67` 改写的当前施法参数跨激活持续生效。
- ready hook 中的 summon / transform / divide 是行动选择前的即时副作用，执行后仍会进入
  正常敌行动；把它们投成一条 `AiRule` 会错误吞掉本轮行动。

因此 `pendingScripts=[]` 只能证明“没有字符串备注”，不能证明敌人行为已忠实迁移。R13-5 必须
以逐源站 disposition、敌钩多次激活轨迹和 raw → overlay → final 三层映射为验收权威。

本轮只读构建账：

- raw enemy objects：153；
- raw projection：153；
- final enemies：153；
- 带脚本敌人：54；
- pending：12 个敌人、31 个 source site；
- pending ID：`420, 421, 422, 435, 463, 469, 483, 486, 499, 519, 539, 547`；
- boss overlay 当前附着 8 个 encounter，并清空 enemy `435/454/478/485/496` 的 per-enemy
  choreography；
- 15 个 battleEnd hook 当前均恰为 1 stage；最终 15 个 `onDefeated` 只含
  `giveItem/dialog/chance branch/stopScript`，尚无世界写指令。

当前 pending 清单可由权威构建直接复算：

```bash
node --import tsx --input-type=module -e \
  "import { loadPalMigrationSources } from './packages/migrate/src/pal-migration-io.ts';
   import { buildPalMigration } from './packages/migrate/src/pal-migration.ts';
   const r=buildPalMigration(loadPalMigrationSources(process.cwd()));
   console.log(JSON.stringify(r.report.enemies.pendingScripts,null,2));
   process.exit(0)"
```

## 12 个 pending 敌人逐项 disposition

| 敌人 | 源入口 | 源语义与当前偏差 | R13-5 处置 |
|---|---|---|---|
| 420 跳跳蛙 | turnStart `L_42840`；ready `L_42890` | turnStart 的 `0x06[45,0]` 两臂都留在同入口，只多一次 RNG；当前 `once:true` 却把“每轮首只播声”降成整场一次。ready 是概率重试后召唤一次并进入稳态，当前绝对 turn 会无界重复召唤。 | pending gate 记 structured-equivalent；根脚本按持久 cursor 重译。 |
| 421 大手 | ready `L_42677` | 首门在 self-summon 与 enemy-441×2 两臂间选择，含失败重试、advance/reset；当前丢 self-summon、游标与 reset。 | 完整敌钩状态机。 |
| 422 怪老子 | turnStart `L_42840`；ready `L_42634` | turnStart 同 420。ready 的阈值大于 100，门本身恒 fall-through；随后 `L_42637/L_42639` 在 pass 与 cast305 间循环，当前 label 截断后变成永久 cast305。 | 门记 explicit-no-op；循环按 cursor 重译。 |
| 435 六脚蜘蛛 | turnStart `L_41533` | 有效链在 `41553 0x89`、`41554 plain END` 结束；`41555 0x07` 属邻接无标签链，从 hook 不可达。 | `41555` 记 unreachable/out-of-root；修 CFG 的 plain END 终止。 |
| 463 麒麟 | ready `L_42930` | 顺序概率门得到 cast328 / cast381 / cast378 / pass，所有臂 reset；当前只剩 pass。 | 有序条件边 + fallback，钉 RNG 边界。 |
| 469 狐狸精 | ready `L_42428` | 12 段循环，含 tgt=0 重试、303/316/317、召唤 enemy403×4、pass、末尾 reset；当前 `turn>=3` 召唤无界并遮蔽后续。 | 完整 cursor 循环。 |
| 483 林月如二 | turnStart `L_41386` | `0x77[1]` 请求 3000ms stop-music fade → 对话 → sound213 → wait1600ms → music38；当前只剩对话与音效，BattleSession 还会忽略 wait，通用 `stopMusic` 也丢 fade 参数。 | battle-only `stopMusic.fadeMs` + choreography runtime；做动态顺序 canary。 |
| 486 半人蛇 | ready `L_42457` | `0x06[30,0]` 几何重试，成功后逐段 advance 到对白+magic338，再 pass/clear/reset；当前固定 `turn>=7` 且不循环。 | 完整 cursor 循环。 |
| 499 绿叶小妖 | turnStart `L_40963` | 赵灵儿在队分支：对白→敌逃→概率门→说明对白。当前把对白塞进同 body，但 runtime 遇 flee 会清队列，后段永不可达。 | 保留 `playerInParty` 双臂；flee 延迟到当前演出体收尾后结算。 |
| 519 明王 | turnStart `L_42237`；ready `L_42384`；battleEnd `L_42424` | 第二阶段永久给赵灵儿 `level+11/maxHP+170/maxMP+190/attack+100/magic+155/defense+55/speed+80/luck+30`，再全队复活、回满、赵灵儿白闪；当前只保留对白/319/382。battleEnd 给 item230+旁白。 | 新增 battle-only 固定角色成长与角色施法表现语义；战中、战后 world、save/reload 三点一致。 |
| 539 毒神龙 | turnStart `L_42394` | 两个 advance 后进入顺序门，选择 373/352/372 并 reset，当前 magic 跨激活持续；当前被压成绝对回合后永久 372。 | cursor + 当前 fallback action。 |
| 547 八头蛇 | ready `L_42912` | `0xA2[4]` 等概率四臂，各臂有不同“本轮/下轮/reset”序列；当前只剩 cast373@50。 | 单次 RNG 的四路选择 + cursor。 |

## 强制非 pending 金丝雀

### enemy-496 石长老

`L_41432` 的 `0x79[盖罗娇,41473]` 是真双臂：

- 无盖罗娇：赵灵儿 / 李逍遥 / 石长老对白，进入 fallback 385；
- 有盖罗娇：盖罗娇 / 石长老对白，随后 378 → 328 → pass → `endBattle terminate`。

当前 translator 以“encounter 绑定后队伍门无意义”为由只保留不跳臂；overlay 又只把 lead boss
的演出挂到 encounter。`team34=[527,496,527]` 中 496 不是 lead，`team37=[496]` 则拿到错误
的不跳臂。s106 战前明确把队伍设为 `[anu,gai-luojiao,anu]`，是可复现的反例。

R13-5 必须保留 `playerInParty` / `not playerInParty` 两臂，并按实际 encounter + party context
投影；现有 `AiCond` 足够，不需为 496 新增条件 schema。

### enemy-483 林月如二

动态 canary 必须观察 `stop music(fadeMs=3000) → sound213 → 1600ms hold → music38` 的真实
时间顺序，并验证新曲请求不会被旧 fade 的迟到 stop 误杀；不能只断言 JSON 中出现了四个 kind。

### enemy-519 明王

八项固定成长不是随机升级，也不是战内 Extra buff。它必须：

1. 以稳定 ActorDef id 找到赵灵儿，修改无装备的 battle persistent snapshot；
2. 立即反映到当前战斗数值；
3. 排队写回现有 `CharacterInstance` 字段，保留原 exp；
4. 战后存档并重开后仍在；
5. 后续 `revivePartyAll` 与 `increaseHpMp` 使用增长后的新上限；
6. `0x92[2]` 的角色施法 / 白闪表现绑定赵灵儿，而不是脆弱的 party 下标。

## 必须另签的公共 delta

1. **敌钩持久程序**：现有绝对回合 `AiRule[]` 不能表达 421/469/486/539/547 的重试与
   reset 循环。需要 battle-local、按敌实例维护 cursor 的 authorable enemy hook flow；
   plain / advance / reset、同激活 continue、条件边和单次 RNG 多臂必须是一等语义。
2. **battle-only 演出动作**：`BattleChoreography.body` 不能继续裸用整个 `Command[]`；
   要收窄为 runtime 穷尽实现的战斗动作 union，并新增稳定 actor id 的固定成长和施法白闪。
3. **canonical onDefeated authority**：content v5 工程的战后脚本必须通过现有
   `ScriptProjectRuntimeV5.runCommands` transient activity 执行；不得再写
   `legacyWorldScriptScratchV5`。无需新增导出 runner API，但按 K5 仍属执行权威 delta。
4. **生成期 fail-loud**：battleEnd 多 stage 在读取 `[0]` 前抛错；任意 runtime-refused
   choreography action 必须在最终 target 写盘前抛错；BattleSession default 分支也必须穷尽
   抛错，不能 log-only。
5. **敌实例生命周期**：summon 使用目标敌初始的三条脚本指针；divide 复制当前实例的三条
   指针；transform 只替换视觉/数值对象并保留原指针。因此 battle runtime 必须把当前
   visual/stat def 与 script owner 分开，战后脚本也从原 script owner 读取。

存档已有全部角色持久字段，敌钩 cursor 只活在当前战斗，因此 **SAVE schema 不变**。

## 最低机器验收

1. baseline 冻结为 12 enemy / 31 site；每个 site 有
   `translated | equivalent | unreachable` disposition，并有 raw → overlay → final target；
   153 / 153 / 153 恒等。
2. CFG 钉 plain / advance / reset / label：
   `435@41555` unreachable、422 保留 `42637/42639`、547 保留四个 `0xA2` 臂。
3. deterministic RNG + 多 activation trace：
   421、469、486、539、547；463 四臂边界；420/422 每轮首只音效。
4. 动态 canary：
   483 时序；519 八属性、复活、回满、白闪、战后 world、save/reload；
   496 team34/team37 双臂；499 两臂且 flee 后说明对白可达。
5. 生成期负测：
   battleEnd 两 stage、未知 choreography action、onDefeated 非 canonical-safe action 都在
   write 前失败，并带 enemy id / name / hook / source address。
6. 正式全量重迁、独立第二进程与 live dry-run 均零计划；project/baseline 无手工修补。

## 代码锚点

- `packages/migrate/src/translate-enemy-scripts.ts:54-109`：错误 segment 模型；
- 同文件 `:162-176`：错误的 0x79 假设；
- 同文件 `:183-223`：复杂 0x06 只记 pending；
- 同文件 `:329-334`：把 advance 误压成整场 once；
- 同文件 `:378-384`：ready/turnStart 顺序与 battleEnd `[0]` 截断；
- `packages/migrate/src/pal-boss-overlay.ts:3-5,25-31,74-78`：encounter overlay；
- `packages/reforge/src/battle/battle-session.ts:673-731`：choreography runtime；
- `packages/reforge/src/main.ts:2537-2555`：legacy onDefeated runner；
- `packages/reforge/src/legacy-runtime-shell-v5.ts:198-214`：structured-clone scratch；
- `packages/migrate/src/experimental/script-v5/runtime-capability-audit.ts:445-483,555-565`：
  final target capability gate。
- `reference/sdlpal/fight.c:1719-1724`：ready hook 先执行，随后仍进入正常敌行动；
- `reference/sdlpal/script.c:2789-2826,2870-2922,2954-2969`：divide 复制三条脚本指针、
  summon 从目标对象初始化三条指针、transform 只换对象/数值而不改三条指针。
