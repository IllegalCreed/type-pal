# 战斗子系统逐函数审计（B 单元 / phase2-foundation）

> 日期 2026-07-05 · 三方对照 = sdlpal 真值（reference）→ 一阶段（packages/game）→ reforge（packages/content + packages/reforge）。
> 方法 = 每单元四步：① sdlpal 锚点逐函数 ② 一阶段承接 ③ reforge 承接 ④ 差异裁决。
> 状态记号：✅ 对齐 · ⚠️ 偏差（需裁决）· ❌ 缺失 · 🟰 结构性免疫。

---

## 单元 1 — 状态系统（status）

### ① sdlpal 真值

**设置语义** `global.c:2173 PAL_SetPlayerStatus(role, statusID, numRound)` —— 关键的**非对称**写入规则（坏状态 / 好状态 / puppet 各不同）：

| 分支 | 条件 | 行为 | 锚点 |
|---|---|---|---|
| 加速↔迟缓互斥 | set Slow 且 Haste>0 / set Haste 且 Slow>0 | **Remove 对方**后直接 return（不写新值） | `global.c:2200-2218`（PAL_CLASSIC 关，`#ifndef PAL_CLASSIC`） |
| 坏状态（confused/sleep/silence/`#ifdef PAL_CLASSIC` paralyzed / `#else` slow） | **已有（==0 才写）**不刷新 | `if (cur==0) cur=numRound` | `global.c:2234-2237` |
| puppet | 仅对死者（HP==0）写；且取**较长**（`cur<numRound` 才写） | —— | `global.c:2244-2254` |
| 好状态（bravery/protect/dualAttack/haste） | 仅对活者；取**较长**（`cur<numRound` 才写） | —— | `global.c:2264-2268` |

**衰减语义** `fight.c:1632-1638`（player）/`1655-1661`（enemy）：回合末遍历 `kStatusAll`，`if (cur>0) cur--`。**全 status 统一递减**，含 boolean 类（haste/slow/bravery…）。

**清除语义** `global.c:2311 PAL_ClearAllPlayerStatus`：战末遍历 `if (cur<=999) cur=0` —— `>999` = 装备永久效果，保留。`PAL_RemovePlayerStatus`（`global.c:2300-2308`）同 `<=999` gate。

### ② 一阶段承接

`packages/game/src/core/battle/status.ts`（46 行）：
- `tickOwnerStatus`（L21-27）：`for k of STATUS_KEYS: if (v>0) s[k]=v-1` —— ✅ 衰减全 10 项（文件头注释明确修了"旧版只减 5 项 boolean 类不衰减"的 bug）。
- `canAct`（L38-41）：`sleep<=0 && paralyzed<=0` —— ✅。
- `canCastMagic`（L44-46）：`silence<=0` —— ✅。

**设置语义在哪？** 一阶段**不在 status.ts**，而是走 `dispatchBattleOpcode` 的 `OP_SET_PLAYER_STATUS=0x002D` / `OP_SET_ENEMY_STATUS=0x002E`（`battle-opcodes.ts:202-204`），由脚本解释器调 `PAL_SetPlayerStatus` 的 TS 对应物。需核实这些 case 是否忠实复刻了非对称写入（见下裁决）。

### ③ reforge 承接

`packages/content/src/battle-formulas.ts`（223 行）：
- `BattleStatus`（L186-197）+ `emptyBattleStatus`（L199-201）：10 项计数器，✅。
- `tickBattleStatus`（L208-213）：全 10 项 `if (v>0) s[k]=v-1`，✅ 衰减。
- `canAct`（L216-218）/ `canCastMagic`（L221-222）：✅。

**设置语义** —— reforge **不走脚本 opcode**，改为数据驱动的 `applyStatus` skill effect（`content/skill.ts:33`、`item.ts:37`）。在 `reforge/battle-core.ts` 两处实现：
- 敌→玩家（L569-575）：`p.status[eff.status] = Math.max(p.status[eff.status], eff.turns)` —— 仅"取较长"。
- 玩家→敌（L414-422）：先命中判 `rng(0,9) >= resistanceToSorcery`，命中后 `Math.max(...)` —— 取较长。

### ④ 差异裁决

| 检查点 | sdlpal | 一阶段 | reforge | 裁决 |
|---|---|---|---|---|
| 衰减全 status（含 boolean） | ✅ | ✅ | ✅ | 🟰 三方一致 |
| **坏状态已有不刷新** | `if(cur==0)` | 由 0x2D handler 承（需核实） | ❌ **无**（一律 `Math.max`） | ⚠️ **reforge 缺失** |
| **好状态取较长** | `if(cur<numRound)` | 同 | ✅ `Math.max` | ✅ |
| **puppet 仅死者** | `if(HP==0)` | 同 | ❌ 无 puppet 分支 | ⚠️ reforge 缺失（puppet = 复活态，目前无死亡/复活链路） |
| **加速↔迟缓互斥** | set 时 Remove 对方 | 同（0x2D handler） | ❌ **无**（可同时持有 haste+slow） | ⚠️ **reforge 缺失** —— 任务核心提问"设置语义在哪"的答案：reforge 把它丢了 |
| **>999 装备永久** | tick 不碰（>0 才减；装备值>999 永不触底）、ClearAll ≤999 gate | 一阶段 tick `v>0` 同样不碰>999 | ❌ reforge `Math.max` 永不会把>999 装备值覆盖；但无"装备永久"概念（装备加成走 stats 派生，不进 status 计数器） | 🟰 结构性免疫（reforge 装备加成不入 status 槽） |
| `canAct`/`canCastMagic` | —— | ✅ | ✅ | 🟰 |

**结论**：reforge 的 `applyStatus` 只实现了"取较长 + 命中判定"，**丢失了三条 sdlpal 关键语义**：(a) 坏状态已有不刷新；(b) haste↔slow 互斥（ClearHaste/ClearSlow）；(c) puppet 仅死者。复刻精度上 (b) 影响最大（可同时被加速+迟缓，出手顺序 `getPlayerActualDexterity` 只看 haste 会算错）。建议在 `battle-core.ts` 两处 `applyStatus` case 加 `setStatus()` 中心函数，复刻 `PAL_SetPlayerStatus` 的 switch。

**2026-07-05 已修**：`applyPlayerStatus`（battle-formulas，纯函数+单测）实现三条语义 + 互斥；敌方侧另修一条本审计未点破的——0x2E 是**直接赋值**（script.c:1391，短回合可覆写长回合）非取较长 → `applyEnemyStatus`。附注：dex 只看 haste 是 **CLASSIC 忠实**（slow/dying 修正整段包在 `#ifndef PAL_CLASSIC`，fight.c:365-380；敌侧同 fight.c:314-331），互斥修复是防 schema 超集数据（手工内容用 slow）自相矛盾，PAL 数据不触发。

---

## 单元 2 — 敌人 AI

### ① sdlpal 真值

**双轨**：
1. **脚本轨**（`fight.c:1184-1230` 状态机）：
   - `fTurnStart` gate（每轮一次）→ `wScriptOnTurnStart`（`1186-1187`）—— boss 嘲讽/剧情对话/分段推进。
   - `kFighterCom` state → `wScriptOnReady`（`1226-1227`）—— 出手前改写 `e.wMagic`/`wActionType`。
   - **store-back 推进**：`wScriptOnTurnStart = PAL_RunTriggerScript(wScriptOnTurnStart, i)` —— 返回值回写 = **分段状态机**：脚本跑到 `0x89`(set battle result) 或 jump 即断点，下轮从新 entry 续跑（**林天南撑 7 回合 = 第 8 段脚本内 `0x89 BattleResult=0` terminate**，`script.c:2557-2562`）。
2. **内置 fallback**（`fight.c:4551 PAL_BattleEnemyPerformAction`）：
   - `4578` 先选目标（消耗 RNG），`4582-4589` sleep/paralyzed/hiding → `goto end`（pass）。
   - `4591-4655` confused → 选活敌（含自己），选中自己→pass，否则 `attack-mate`（伤害 = `calcBaseDamage*2/physRes`，`4638`）。
   - `4656-4658` 魔法门：`wMagic!=0 && RandomLong(0,9)<wMagicRate && silence==0`（短路序耗 RNG）；`wMagic==0xFFFF` sentinel → pass（`4663`）。
   - 否则物理（`4920+`）。

### ② 一阶段承接

`packages/game/src/core/battle/enemy-ai.ts`（130 行）**只做 fallback**（文件头 L14-19 明示"脚本驱动由 battle opcode / battle-system 上游接入"）：
- `decideEnemyAction`（L68-130）：party 目标 `rangeInclusive+while(HP==0)重摇`（✅ RNG 对齐 `4540-4545`），sleep/paralyzed→pass（L88-90），confused→`enemySlots` 拒绝采样（L97-106，✅ 对齐 `4489`），魔法门短路序 + 0xFFFF sentinel（L118-128，✅）。
- 脚本轨：`battle-system.ts:535 runEnemyTurnStartScripts`（每轮 selectAction 前跑，`turnStartDoneForTurn` guard）+ `battle-opcodes.ts` 解释 `scriptOnTurnStart` 字节码（含 store-back 推进、0x89 terminate）。

### ③ reforge 承接

`packages/content/src/enemy-ai.ts`（147 行）= **条件规则列表**（数据驱动，非脚本解释）：
- `AiCond`（L22-34）含 `hpBelow/turn/chance/aloneAlive/firstOfKind/difficulty/all/any/not`；`AiAction`（L36-43）含 `attack/cast/summon/transform/divide/flee/pass`。
- `decideByRules`（L112-127）：首条命中即本回合行动；沉默时 cast 规则跳过继续匹配（L122，✅ 对齐"被沉默仍普攻"）。
- **分段状态机 / 林天南**：reforge **不复刻 store-back script entry**，改为 `EnemyDef.choreography`（`content/enemy.ts:53-61`）—— `at:'turnStart'`、`when:{turn:8}`、`once:true`、`body:[...{kind:'endBattle',result:'terminate'}]`。`battle-session.ts:261-278 collectChoreo` 每轮求值 `when`，命中播 body。

### ④ 差异裁决

| 检查点 | sdlpal | 一阶段 | reforge | 裁决 |
|---|---|---|---|---|
| fallback 物/法/守门 | ✅ | ✅（RNG 逐抽对齐） | ✅（迁移器翻成 `[chance]cast+兜底attack`） | 🟰 |
| sleep/paralyzed→pass | ✅ | ✅ | ✅（`canAct` gate in `performEnemyAction`） | 🟰 |
| confused 选活敌/选中自己 pass | ✅ | ✅（含 enemySlots 拒绝采样） | ❌ **无 confused 分支** | ⚠️ reforge 缺失（confused 敌行为未建模） |
| 魔法 0xFFFF sentinel→pass | ✅ | ✅ | 🟰 不适用（reforge 无 sentinel，magic 为可选 skillId） | 🟰 |
| **分段状态机（林天南撑7回合=第8段0x89）** | ✅ script store-back | ✅ 字节码解释 + store-back | ✅ **但表达不同**：`choreography when:{turn:8} once endBattle.terminate` | 🟰 **语义等价**（任务核实点：reforge enemy-ai **有**此能力，走 choreography + `when:turn`，非 advance 状态机） |
| `wScriptOnReady`（出手前改写行动） | ✅ | ✅（battle-opcodes） | ❌ 无 ready 钩（choreography 只有 turnStart/battleStart） | ⚠️ reforge 缺 ready 窗口（影响"敌 HP 低于阈值临时换技能"类） |

**结论**：reforge AI 把 sdlpal 的"脚本字节码 + store-back advance"重写成"声明式规则 + choreography 条件触发"。**林天南分段语义被覆盖**（`when:{turn:8}` + `endBattle.terminate`），任务核心提问核实通过。两处真实缺失：(a) confused 敌行为；(b) `onReady` 出手前改写窗。fallback 路径 RNG/短路序一阶段已 1:1，reforge 不直接跑 RNG（随机在 `pickAiTarget`/`chance`）。

---

## 单元 3 — 防御 / 逃跑

### ① sdlpal 真值

**防御设置** `fight.c:4110-4117 kBattleActionDefend`：`fDefending=TRUE` + `rgDefenseExp.wCount+=2`。

**防御减伤**（两路径，**法术不是单纯/2**）：
- 物理 `fight.c:4926-4929`：`if(fDefending) def*=2` —— 防御**翻倍 def**（在 calcBaseDamage 前）。
- 法术 `fight.c:4801-4803`（AoE）/`4836-4838`（单体）：`sDamage /= ((defending?2:1) * (Protect>0?2:1)) + (autoDefend?1:0)` —— **加性除因子**（defending×protect 相乘，autoDefend 加 1）。

**逃跑** `fight.c:4119-4171 kBattleActionFlee`：
- `str = PAL_GetPlayerFleeRate(role)`（`global.c:1868`：base + Σ装备）。
- `def = Σ活敌 ((SHORT)e.wDexterity + (e.wLevel+6)*4)` —— ⚠️ **原版 bug**：敌抵抗项误用 `wDexterity`（身法），死字段 `wFleeRate`（吉运）全引擎零读。
- `if ((SHORT)def<0) def=0`。
- `success = (str >= RandomLong(0,def)) && !fIsBoss`（`4143`，&& 恒消费 RNG）。
- 成功 → `PAL_BattlePlayerEscape`；失败 → 3 步右下挪 + 帧1 + `BATTLE_LABEL_ESCAPEFAIL` + `rgFleeExp.wCount+=2`（`4155-4170`）。

### ② 一阶段承接

- `defend.ts`（21 行）：`p.defending=true`，✅（减伤在 enemy→player 攻击结算消费）。
- `flee.ts`（76 行）：**有意 bug 修复**（文件头 L12-17 明示，user 2026-06-13 选修复版）—— `def` 改用 `be.e.fleeRate`（让死字段活过来）；`roll=rangeInclusive(0,def)`；成功→`fleeAnim`，失败→`buildFleeFailTimeline` + `rgFleeExp+=2`，✅。
- **法术防御除因子**：`magic-damage.ts:256-260`：`divisor=((defending?2:1)*(protectFactor))+(autoDefend?1:0)`，`Math.trunc(dmg/divisor)` —— ✅ **忠实 sdlpal 加性公式**。

### ③ reforge 承接

`reforge/battle-core.ts`：
- 防御设置：`buildActionQueue` 时 `s.players[i].defending = (pendingActions.get(i)?.kind==='defend')`（L301）。
- **物理减伤** `applyDefense`（L160-162）：`defending ? Math.trunc(damage/2) : damage` —— ⚠️ **`/2` 而非 sdlpal `def*=2`**。
- **法术减伤**（L544-557 敌→玩家 / L385-397 玩家→敌）：同一 `applyDefense(/2)` 包裹 `calcMagicDamage` —— ⚠️ **只/2，无 protect 因子、无 autoDefend**。
- 逃跑（L458-474）：`def=Σ活敌(fleeRate+(level+6)*4)`（✅ 用 fleeRate = 一阶段修复版），`roll=Math.floor(rng()*(def+1))`，`if(p.fleeRate>=roll)` → `phase='fled'`，否则 log 失败。

### ④ 差异裁决

| 检查点 | sdlpal | 一阶段 | reforge | 裁决 |
|---|---|---|---|---|
| 防御物理 `def*=2` | ✅ | ✅（enemy→player 物理结算） | ✅ 已修 | ✅ **已修(2026-07-05 敌物攻装配全链)**：enemy→player 走 `def = p.defense × (defending?2:1)` 前置(fight.c:4926 语义,分段跨档保留)；player→enemy 的 applyDefense 后置 /2 留存但敌人无防御动作 = 不可达死支 |
| 防御法术除因子（加性 `(defending?2:1)*(protect?2:1)+(autoDefend?1:0)`） | ✅ | ✅ `magic-damage.ts:259` | ✅ 已修 | ✅ **已修(2026-07-06)**：`magicDefenseDivisor`(battle-formulas) + applyEnemySkill 全链——1/3 资格预掷(活+无眠/定/乱,效果前)、trunc(/divisor)、钳余血无最小1(fight.c:4805)；顺带补 **magStr 级数项 `+(级+6)×6`(fight.c:4673,GLM 漏网)** 与 resistMult 20(fight.c:4798)；演出摆防御姿 frame3 注起手末帧(battle-anim)。单测+真机(team-156/176:结算/钳余血/零伤害状态施法格挡)验证 |
| 逃跑 str=fleeRate+装备 | ✅ | ✅ `getPlayerFleeRate` | ✅ 含装备派生 | ✅ **已核(2026-07-05)**：链路 = migrate `luck: role.fleeRate`(base) + 装备 0x17 行 21→statBonus 'luck' → main.ts `fleeRate: effectiveStat(c,'luck')` 活派生，同 PAL_GetPlayerFleeRate 语义 |
| 逃跑 def 用 fleeRate(修复) | bug 用 dexterity | ✅ 修复用 fleeRate | ✅ fleeRate | 🟰（一阶段+reforge 都用修复版；还原原版改回 dexterity） |
| `!fIsBoss` gate | ✅（boss 必失败） | ✅ `flee.ts:57` | ✅ 已修 | ✅ **已修(2026-07-05)**：BattleState.boss(0x07 fIsBoss=!op2，69 处场景 boss 标烘焙) + 掷骰先消费再 `!s.boss` 拦(fight.c:4143 rng 流序)；单测钉 boss 场恒逃不掉 |
| 失败演出（3步挪+LABEL_ESCAPEFAIL） | ✅ | ✅ `buildFleeFailTimeline` | ❌ 仅 log（演出归 M4d） | ⚠️ 演出未接（M4d 范畴） |
| `rgFleeExp+=2`（失败） | ✅ | ✅ `flee.ts:73` | ✅ 已修 | ✅ **已修(2026-07-05)**：失败分支 `addHidden('luck', 2)`(fight.c:4170，仅逃者本人)；HIDDEN_STAT_KEYS 七池含 luck，结算 applyHiddenExp 原样分配 |

**结论(2026-07-06 更新)**：三处精度问题**全清** —— (a) 物理防御前置 def×2、(c) boss 逃跑锁已修（敌物攻装配全链 + boss 标烘焙）；(b) 法术防御除因子已修（2026-07-06：`magicDefenseDivisor` 加性公式 + autoDefend 1/3 预掷 + 钳余血 + magStr 级数项/resistMult 20 两处 GLM 漏网一并补，演出 frame3 注起手末帧）。fleeRate 装备派生、失败 +2 吉运池已核/已修。

---

## 单元 4 — 战斗位置

### ① sdlpal 真值

**玩家位** `battle.c:27 g_rgPlayerPos[3][3][2]`（硬编码）：
```
1 player : (240,170)
2 players: (200,176),(256,152)
3 players: (180,180),(234,170),(270,146)   ← 任务给的"玩家 {70,140}{100,110}{160,100}"实为敌位误标
```
赋值 `battle.c:903-907`：`posOriginal/pos = g_rgPlayerPos[maxPartyIdx][i]`。

**敌位** `battle.c:936-942`：`x=EnemyPos.pos[i][maxEnemyIdx].x; y=...y + e.wYPosOffset` —— 来自 `DATA.MKF chunk 13`（`global.h:401 ENEMYPOS pos[5][5]`），**非硬编码**。3 敌 layout = `{70,140}{100,110}{160,100}`（实测 `data/extracted/data/enemy-pos.json` layouts[2]）。

**attackWhole 落点** `fight.c:2173-2186 PAL_PlayerCanAttackAll`：法术全屏时**逐敌画特效在各自 EnemyPos**（`EnemyPos.pos[j][maxEnemyIdx]` + yPosOffset），非三点镜像。

### ② 一阶段承接

`packages/game/src/core/battle/battle-positions.ts`（93 行）：
- `PLAYER_POSITIONS_BY_COUNT`（L19-48）：1/2/3 人 ✅ **1:1** sdlpal 表；4/5 人沿用 3 人 + 加格兜底（sdlpal 表只到 3）。
- `ENEMY_POSITIONS_FALLBACK`（L54-60）：`{160,80}{100,60}{220,60}…` —— ⚠️ **与真表不符**（真表 3 敌 = `{70,140}{100,110}{160,100}`），但仅作 EnemyPosTable **缺失时兜底**。
- `getEnemyBasePos`（L84-93）：优先 `enemyPos.layouts[count-1]`（真表），✅；`+ yPosOffset`，✅。
- `getPlayerBasePos`（L66-74）：✅。

### ③ reforge 承接

`packages/reforge/src/battle/battle-positions.ts`（42 行）：
- `PLAYER_POSITIONS_BY_COUNT`（L7-13）：✅ 与一阶段逐项一致。
- `ENEMY_POSITIONS_BY_COUNT`（L19-25）：3 敌 `{70,140}{100,110}{160,100}` —— ✅ **与 enemy-pos.json 真表逐项对齐**（一阶段 fallback 表的错误值此处未沿用，reforge 用了真值）。
- `getPlayerBasePos`（L28-31）/ `getEnemyBasePos`（L34-42，`+yPosOffset`）：✅。

### ④ 差异裁决

| 检查点 | sdlpal | 一阶段 | reforge | 裁决 |
|---|---|---|---|---|
| 玩家 3 人 `{180,180}{234,170}{270,146}` | ✅ | ✅ | ✅ | 🟰 |
| 敌 3 人 `{70,140}{100,110}{160,100}` | ✅（DATA chunk13） | ✅（用真表；fallback 值错但不走） | ✅（硬编码真值） | 🟰 |
| 任务提问"attackWhole 三点镜像 {180,180}... vs 玩家 {70,140}..." | —— | —— | —— | ⚠️ **任务表述错位**：`{180,180}{234,170}{270,146}` 是**玩家**位，`{70,140}{100,110}{160,100}` 是**敌**位（不是同一方对照）。reforge 两表分别对齐各自真值，**无漂移** |
| yPosOffset（battle.c:939） | ✅ | ✅ | ✅ | 🟰 |
| attackWhole 逐敌落点（fight.c:2179） | ✅ | ✅（battle-opcodes/anim 用 getEnemyBasePos 逐敌） | 🟰 reforge 无 attackWhole 概念（数据驱动 effects 全屏即遍历 enemyTargets，落点由 present 据各自 basePos 画） | 🟰 结构性等价 |

**结论**：reforge battle-positions **完全对齐** sdlpal 真值（玩家硬码表 + 敌 DATA chunk13 真值）。任务提问的"三点镜像 vs 玩家"是**敌方位与玩家方位的对照表述**，实际两套坐标分属敌/我，reforge 各自正确。唯一遗留：一阶段 `ENEMY_POSITIONS_FALLBACK` 的兜底值与真表不符（但仅在数据缺失时触发，不影响正常对齐）。

---

## 单元 5 — 战斗 opcodes（脚本侧）

### ① sdlpal 真值（`script.c PAL_InterpretInstruction`，battle/event 上下文共用）

| opcode | 语义 | 锚点 | battle 上下文 |
|---|---|---|---|
| `0x0007` | Start battle（op0=team, op1=onLose entry, op2=onFlee entry；`!op2`→fIsBoss） | `script.c:3314-3333` | 战后据 result 跳 onLose/onFlee/续行；末 `fAutoBattle=FALSE` |
| `0x004A` | Set current battlefield（op0=fieldNum → `wNumBattleField`） | `script.c:1719-1724` | 影响法术元素加成 |
| `0x0052` | Hide event object（op0 ? op0 : 800 帧；`sState*=-1`） | `script.c:1794-1800` | event 侧 |
| `0x0053` | Use day palette（`fNightPalette=FALSE`） | `script.c:1802-1807` | event 侧 |
| `0x0089` | Set battle result（`BattleResult=op0`：3=Won/1=Lost/0xFFFF=Fleed/0=Terminated） | `script.c:2557-2562` | 林天南撑7回合=第8段 0x89 terminate |
| `0x008A` | Enable auto-battle next battle（`fAutoBattle=TRUE`） | `script.c:2564-2569` | **双解释器坑**（见 N1） |

### ② 一阶段承接

`packages/game/src/core/battle/battle-opcodes.ts`（1447 行，`dispatchBattleOpcode` L362）—— **battle 侧解释器**，覆盖 ~40 个核心 opcode（含 0x2D/0x2E set status、0x42 simulateMagic、0x66 throw、0x9C/0x9E/0x9F summon/divide/transform、0x89 set result）。

任务点名的 5 个：
- `0x07/0x4A/0x52/0x53` —— **不在 battle-opcodes.ts**（属 event 侧，`event-system.ts` 解释；battle 上下文不跑这 4 个）。
- `0x89` —— ✅ `OP_SET_BATTLE_RESULT`（L280, case L748-762）：Won/Lost/Terminated 分支映射 `state.phase`，✅。
- `0x8A` —— ✅ `OP_ENABLE_AUTO_BATTLE`（L283），**battle 侧 case 在 `event-system.ts:4036-4040`**（文件头 L152-157 注释明确：事件脚本里设 → `gs.fAutoBattle=true` → startBattle seed 进战斗）。

**双解释器坑（N1，harvest 已提）**：0x8A 原一阶段**只在战斗侧实现**，事件侧 default no-op → 石长老自动战变手动（commit `0f71695e` 补事件侧）。

### ③ reforge 承接

reforge **无 opcode 解释器**（数据驱动）：脚本字节码 → migrator → 声明式 `Command` AST（`script-runner.ts`），战斗 opcode 映射：
- `0x07` startBattle → `Command.kind:'startBattle'`（`script-runner.ts:294-299`）：`h.startBattle(team,{auto})`，返回 `'win'/'lose'/'flee'`，onLose/onFlee 续跑。✅ 语义等价。
- `0x4A` setBattlefield → `BattleFieldDef.magicEffect`（`content/enemy.ts:114-119`）喂 `calcMagicDamage.fieldEffect`。
- `0x52/0x53` → event Command（vanishEntity / palette）。
- `0x89` → `choreography body: {kind:'endBattle',result:'terminate'}`（`battle-session.ts:322-329`）。✅。
- `0x8A` → `startBattle` 的 `opts.auto` 字段（`script-runner.ts:295`、`battle-session.ts:178/411`）。

### ④ 差异裁决

| 检查点 | sdlpal | 一阶段 | reforge | 裁决 |
|---|---|---|---|---|
| `0x07` startBattle 三分支（win/lose/flee） | ✅ | ✅（event-system） | ✅（Command + onLose/onFlee） | 🟰 |
| `0x89` set result（含 terminate 无奖励） | ✅ | ✅ | ✅（choreography endBattle.terminate + enemyFled 免奖励） | 🟰 |
| `0x8A` 双解释器坑（漏事件侧） | —— | ⚠️ **曾漏**（commit `0f71695e` 补） | 🟰 **结构性免疫**：单一 async 解释器 + `startBattle.auto` 字段，无 battle/event 分裂 | 🟰 **任务核心提问核实通过**：reforge 单解释器免疫 0x8A 漏侧 |
| `0x4A/0x52/0x53` | ✅ | ✅（event-system） | ✅（Command / data） | 🟰 |
| battle 上下文 opcode 子集（0x2D/0x2E/0x42/0x66/0x9C…） | ✅ ~100+ | ⚠️ ~40 核心（其余 console.debug skip，D26 兜底） | 🟰 不适用（reforge 无字节码，全走数据驱动 skill effects） | 🟰 结构性等价（精度取决于 migrator 覆盖率，非解释器本身） |

**结论**：reforge 用**单一声明式 Command 解释器**取代 sdlpal 的 battle/event 双 `PAL_InterpretInstruction`，**结构性免疫 0x8A 双解释器漏侧**（任务核心提问核实通过，与 harvest N1 结论一致）。`0x07/0x89/0x4A` 等战斗侧 opcode 语义通过 migrator 映射到 `startBattle`/`endBattle`/`BattleFieldDef` 等数据节点，语义等价。

---

## 汇总裁决矩阵

| 单元 | sdlpal 真值 | 一阶段忠实度 | reforge 忠实度 | 关键 gap |
|---|---|---|---|---|
| 1 状态 | 非对称设置 + 全递减 + >999 | ✅ | ⚠️ 衰减✅，**设置语义丢 3 条**（坏状态不刷新/haste↔slow互斥/puppet仅死者） | reforge `applyStatus` 只 max |
| 2 敌 AI | 脚本 store-back + fallback | ✅（RNG 1:1） | 🟰 规则+choreography 等价；缺 confused/onReady | 林天南分段✅覆盖 |
| 3 防御/逃跑 | 物理def*2 / 法术加性除因子 / !isBoss | ✅ | ✅ 三项已修(07-05 物理+boss、07-06 法术除因子全链) | 已清 |
| 4 位置 | 玩家硬码 / 敌 DATA chunk13 | ✅ | ✅ | 无（任务表述敌/我位错位） |
| 5 opcodes | 双解释器 | ⚠️ 0x8A曾漏(已补) | 🟰 单解释器免疫 | 无 |

**最高优先级修复建议**（按影响；带 ✅ 的已落）：
1. ✅(已修) **reforge 逃跑漏 `!isBoss` gate**（单元3）—— boss 可逃 = 机制性 bug。
2. ✅(已修) **reforge 状态设置丢 haste↔slow 互斥**（单元1）—— 影响出手序计算。
3. ✅(已修 2026-07-06) **reforge 法术防御丢 protect/autoDefend 除因子**（单元3）—— 数值偏差。
4. ✅(已修) **reforge 物理防御 `/2` 后置 vs `def*=2` 前置**（单元3）—— calcBaseDamage 跨档偏差。
5. reforge confused 敌行为 + onReady 钩（单元2）—— 功能补全（P2 状态簇在途）。

> 注：单元4、5 reforge 已结构性对齐/免疫，无需动作。单元2 林天南分段核实通过（choreography `when:{turn:8}` + `endBattle.terminate`）。
