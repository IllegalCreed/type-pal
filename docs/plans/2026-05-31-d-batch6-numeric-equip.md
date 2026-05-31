# B6 — 数值精度 + 装备(D3残 / D14残)详细 plan

> 总 roadmap:[2026-05-31-d-series-completion-roadmap.md](2026-05-31-d-series-completion-roadmap.md) B6。
> 起手按 CLAUDE.md TOP 0 完整读 callpath + 按反 shallow 规则 byte-level 验真实数据。
> user 2026-05-31 强调:"有很多特殊武器,还有攻击全体的武器,攻击两次的武器等等" —— 正是本批要让其真生效。

---

## 0. sdlpal 全 callpath 读完清单(TOP 0)

### D3 — 玩家物理攻击公式
- read entry: `PAL_BattlePlayerPerformAction`(fight.c:3577-3758)kBattleActionAttack **全文** ✓
  - 单体分支(sTarget != -1)fight.c:3623-3675 ✓
  - 群攻分支(sTarget == -1)fight.c:3676-3749 ✓
  - dualAttack 双击 loop `for (t=0; t<(rgPlayerStatus[role][kStatusDualAttack]?2:1); t++)`(3628 / 3681)✓
- recursive deps:
  - `PAL_CalcPhysicalAttackDamage`(fight.c:253-286)✓ → `PAL_CalcBaseDamage`(fight.c:131-171)✓
  - `RandomLong(from,to)`(util.c:222-248,**闭区间含两端**)✓
  - `RandomFloat(from,to)`(util.c:250-277,**闭区间**)✓
- branch identified:单体 vs 群攻;dualAttack t-loop;crit(1/6 OR bravery);李逍遥 role==0 bonus(1/12);群攻 division 逐敌减半 + 命中序 index[]={2,1,0,4,3}
- 注:**enemy→player 物理攻击** 的 `str+RandomLong(0,2)` / `+RandomLong(0,1)` / fAutoDefend evade / Protect `/=2`(fight.c:4938/5056-5062)**归 D27残 / B2,不在本批**。本批 D3 严格 = **玩家→敌人**。

### D14 — 装备 scriptOnEquip + removeEquipmentEffect 副作用
- read entry: `PAL_UpdateEquipments`(global.c:1333-1369)✓ —— memset rgEquipmentEffect=0,逐 role×part 跑 `wScriptOnEquip = PAL_RunTriggerScript(scriptOnEquip, role)`
- `PAL_RemoveEquipmentEffect`(global.c:1371-1456)✓ —— 清 effect 行;**Hand(part3)→ `rgPlayerStatus[role][kStatusDualAttack]=0`**;**Wear(part5)→ 移除 level≥99 毒(数组压缩,`<99` 保留)**
- scriptOnEquip 内 opcode case(script.c):
  - `0x2D`(script.c:1367-1375)✓ → `PAL_SetPlayerStatus(role, op0, op1)`
  - `0x29`(script.c:1257-1285)✓ → `RandomLong(1,100) > poisonResistance` gate + `PAL_AddPoisonForPlayer(role, op1)`
  - `PAL_SetPlayerStatus`(global.c:2173-2277)✓ —— good 状态(Bravery/Protect/DualAttack/Haste):`HP!=0 && cur<rounds` 才 set
  - `PAL_ClearAllPlayerStatus`(global.c:2310-2344)✓ / `PAL_RemovePlayerStatus`(global.c:2279-2308)✓ —— **只清 value ≤ 999**,装备状态(32760)免清
- enum:`kBodyPart` Head=0/Body=1/Shoulder=2/**Hand=3**/Feet=4/**Wear=5**/Extra=6(global.h:65-71);`kStatusAll=9`,DualAttack=8(global.h:42-55)
- global state:`rgPlayerStatus[MAX_PLAYER_ROLES][kStatusAll]`(global.h:522,持久);`rgPoisonStatus`(global.h:547)

### byte-level 真实数据验证(反 shallow)
- 106 件装备有 scriptOnEquip;沿 chain 走命中 opcode:0x17×212 / 0x18×106 / 0x1A×18 / **0x2D×5** / **0x29×2**
- **0x2D 的 5 件全授 DualAttack rounds=32760(永久),全 Hand 部位**:仙女剑(170)/芙蓉刀(176)/柳月刀(177)/双龙剑(181)/玄冥宝刀(187)
- **0x29 的 1 件 = 寿葫芦(269,Wear 部位)**,授"毒" 563 + 564,二者 level **均 99**(常驻,卸 Wear 才清)。**关键(user 2026-05-31 纠 + byte-level 坐实):这是正面效果不是诅咒** —— sdlpal "毒" = 通用每回合 playerScript 效果,正负皆可:
  - 毒 563 playerScript(IP 40860)= `0x1B op=[0,20,0]` → **每回合 +20 HP**
  - 毒 564 playerScript(IP 40858)= `0x1C op=[0,20,0]` → **每回合 +20 MP**
  - 对比真伤害毒 552(IP 40866)= `0x1B op=[0,65524,0]` → 65524 当 SHORT = **-12 HP**(扣血)
  - 即寿葫芦 = **每回合回血回蓝**的好装备,level-99 让效果常驻直到卸下 Wear
- 群攻武器(attackAll)走 `rgwAttackAll` 装备 effect(长鞭等),已在 D18 路由到 sTarget==-1 群攻分支
- **其它特殊装备(走既有 0x17/0x1A stat 系统,非本批 0x2D/0x29,已工作)**:五毒珠(262)poisonResist=100→百毒不侵(`RandomLong(1,100)>100` 永假);风/雷/水/火/土灵珠(263-267)对应 elemResist+50;圣灵珠(260)magStr+128/def+15+改合击。**副作用**:五毒珠 resist=100 会连寿葫芦正面"毒"也挡(同一 0x29 gate)= sdlpal 真实行为,复用同 gate 自然忠实。

---

## 1. 差异表

### D3-a 单体攻击(attack.ts 单体路径)
| # | sdlpal 真值(fight.c) | ts 现状 | 改 |
|---|---|---|---|
| 1 | `damage += RandomLong(1,2)`(3637) | 无 | 加 jitter(state.rng 闭区间 1..2) |
| 2 | `RandomLong(0,5)==0 \|\| bravery>0 → damage*=3; crit`(3639-3647) | 无 | 加 crit:1/6 或 bravery>0 → ×3 |
| 3 | `role==0 && RandomLong(0,11)==0 → damage*=2; crit`(3649-3656) | 无 | 李逍遥 1/12 bonus ×2 |
| 4 | `damage=(SHORT)(damage*RandomFloat(1,1.125))`(3658) | 无 | 末乘 [1,1.125] 浮动 + SHORT 截断 |
| 5 | `for t<(dualAttack?2:1)`(3628) 整段重复 | 攻击 1 次 | DualAttack → 整伤害+动画做 2 次 |
| 6 | `if(damage<=0)damage=1`(3660) | 有(150) | 保持,**置于浮动后**(顺序对齐) |

### D3-b 群攻(attack.ts `targetIdx<0` 路径)
| # | sdlpal 真值(fight.c:3681-3748) | ts 现状 | 改 |
|---|---|---|---|
| 1 | `fCritical=(RandomLong(0,5)==0\|\|bravery>0)` 整轮一次(3687) | 无 | 群攻 crit 一次摇,作用全敌 ×3 |
| 2 | 命中序 `index[]={2,1,0,4,3}`(3684) | 顺序 0..n | 按 index 序遍历 |
| 3 | `division` 初 1,每命中一个活敌 `*=2`,`damage/=division`(3719/3729) | 无减半 | 逐敌减半(首敌全额,次半,再 1/4 …) |
| 4 | dualAttack t-loop(3681) | 1 次 | 同 D3-a #5 |
| 5 | 群攻 **不加** RandomLong(1,2) / RandomFloat | n/a | **保持不加**(真值即无) |

### D14-a scriptOnEquip 新 opcode(equip-effect.ts `runEquipScriptSync`)
| # | sdlpal | ts 现状 | 改 |
|---|---|---|---|
| 1 | 0x2D `PAL_SetPlayerStatus`(script.c:1367) | default 分支 skip + debug log | 接 0x2D → 写持久 `gs.rgPlayerStatus`(good 状态 set-if-longer 规则) |
| 2 | 0x29 add poison(script.c:1257) | skip | 接 0x29 → `addPoisonForPlayer`(抽出共享 helper,RandomLong(1,100)>resist gate) |

### D14-b removeEquipmentEffect 副作用(equip-effect.ts)
| # | sdlpal(global.c:1406-1455) | ts 现状 | 改 |
|---|---|---|---|
| 1 | Hand(3)→ `rgPlayerStatus[role][DualAttack]=0` | 注释 "留 follow-up" | Hand → `gs.rgPlayerStatus[role][8]=0` |
| 2 | Wear(5)→ 清 level≥99 毒 | "留 follow-up" | Wear → 新 helper `removePoisonLevel99(gs,role)` |

### D14-c 持久状态桥(架构,[[architecture-before-features]])
ts 战斗 status 是 BattleState 局部、每场重建(B1/D21 决策),**无持久 rgPlayerStatus** → 装备授的 DualAttack 进不了战斗。忠实且最小的桥:
- 新 `gs.rgPlayerStatus: number[][]`(6×9,初值 0),**仅装备 0x2D 写 / removeEquipmentEffect 清**(不承载战斗局部状态,后者仍 battle-local,B1 不回退)。
- `createBattleState` seed:`player.status[*] = gs.rgPlayerStatus[roleId][*]`(装备状态 32760 > 999,B1 每回合 -1 衰减一整场仍 > 999,战末随 battleState 丢弃 → 不写回,持久层 32760 不动 = 等价 sdlpal `>999` 免清)。
- 卸装唯一清除点:`removeEquipmentEffect(Hand)`(0x18 换装链内已调)→ 清持久 DualAttack。`updateAllEquipments` 重跑所有 scriptOnEquip,Hand 的 0x18 先清后(若双击武器)0x2D 重置 → 与 sdlpal 一致。

> **scope 边界(诚实标注,非偷懒)**:战斗中途换装(equip-battle action)即时 reset DualAttack —— equip-battle 仍是 D2 stub(B4 范围),本批不做;持久桥已为其留好接口(removeEquipmentEffect 已能清)。其余 in-scope 场景(战前装/卸、跨战斗持久)全做。

---

## 2. TDD 实施步骤(bite-sized;每步先写失败测,数据级断言)

> RNG 可测:`bravery>0` 走 crit 是**无 RNG 确定路径**;李逍遥 bonus / jitter / RandomFloat / division 用 seeded `state.rng` + 注入桩断言。

### 落点文件
- `core/battle/actions/attack.ts`(D3-a/b 公式)
- `core/battle/formulas.ts`(若抽 jitter/crit helper)
- `core/util/rng.ts`(确认有 `rangeInclusive` + 加 `rangeFloat`?查现有 API)
- `core/equip-effect.ts`(D14-a 0x2D/0x29 + D14-b Hand/Wear)
- `core/event-system.ts`(抽共享 `addPoisonForPlayer` helper + `removePoisonLevel99`)
- `core/game-state.ts`(新 `rgPlayerStatus` 字段 + 初始化)
- `core/battle/battle-state.ts`(createBattleState seed status from gs.rgPlayerStatus)

### 步骤
1. **rng API**:确认 `state.rng.rangeInclusive(a,b)`(闭区间)存在;加 `rangeFloat(a,b)`(闭区间浮点,对齐 RandomFloat)。单测 rng 边界。
2. **D3-a 单体公式**:attack.ts 单体 damage 重写 = base + RandomLong(1,2) → crit(1/6 OR bravery)→ 李逍遥 → ×RandomFloat(1,1.125) → SHORT → max(1)。测:bravery→×3;role0 bonus(seed);jitter 范围;floor。
3. **D3-a dualAttack 双击**:读 `player.status.dualAttack>0` → t-loop 2 次(两次独立摇 + 两次 HP 扣 + 两次伤害数字 / 两次挥击动画 if 时间线支持,否则两数字 + 注 D17)。测:dualAttack 队员攻击 → 敌人受两次扣血。
4. **D3-b 群攻 crit + division**:重写 `targetIdx<0` 分支 = crit 一次摇 + index 序 {2,1,0,4,3} + division 逐敌减半 + dualAttack t-loop。测:3 敌时伤害比 ≈ 1 : 1/2 : 1/4;crit×3 全敌。
5. **gs.rgPlayerStatus 字段**:game-state.ts 加 6×9 number[][] 初值 0 + createInitial。测初始全 0。
6. **D14-a 0x2D**:runEquipScriptSync 接 0x2D → setPlayerStatus(gs.rgPlayerStatus, role, op0, op1) good/bad/puppet 规则。测:装仙女剑(170)→ gs.rgPlayerStatus[role][8]=32760。
7. **D14-a 0x29**:抽 `addPoisonForPlayer(gs,role,poisonId)` 共享 helper(event-system OP_POISON_PLAYER 改调它),runEquipScriptSync 接 0x29 调之。测:装寿葫芦(269)→ rgPoisonStatus 含 563/564(每回合 +20HP/+20MP 的正面"毒",非诅咒)。
8. **battle seed**:createBattleState `player.status` 从 gs.rgPlayerStatus seed。测:gs.rgPlayerStatus[role][8]=32760 → 开战 player.status.dualAttack=32760 → 攻击两次(串 #3)。
9. **D14-b Hand reset**:removeEquipmentEffect part==3 → gs.rgPlayerStatus[role][8]=0。测:装仙女剑后卸 Hand → dualAttack 清 0 → 下场战斗单击。
10. **D14-b Wear poison99**:新 `removePoisonLevel99(gs,role)`,removeEquipmentEffect part==5 调之。测:装寿葫芦中毒后卸 Wear → 563/564 清,低级毒保留。
11. **回归**:`pnpm test`(game)全绿 + typecheck。逐 commit 引 sdlpal 行号。

### commit 切分(每行为一 commit)
- c1: rng rangeFloat + 单体公式(jitter/crit/李逍遥/RandomFloat)
- c2: dualAttack 双击(单体 + 群攻 t-loop)
- c3: 群攻 crit + division
- c4: gs.rgPlayerStatus 持久层 + createBattleState seed
- c5: 0x2D scriptOnEquip → setPlayerStatus(+ Hand reset)
- c6: 0x29 scriptOnEquip → addPoisonForPlayer 共享 helper(+ Wear poison99 清)

---

## 3. 完成判据(对齐 roadmap B6)
- [ ] 物理伤害含 RandomLong(1,2) jitter + crit(1/6 OR bravery ×3)+ 李逍遥 1/12 ×2 + RandomFloat(1,1.125) 浮动
- [ ] 群攻含 crit + division 逐敌减半(命中序 {2,1,0,4,3})
- [ ] DualAttack 武器(仙女剑等 5 件)开战真的攻击两次;卸 Hand 装备后失效
- [ ] 寿葫芦(269,Wear)装上 → level-99 正面"毒"(每回合 +20HP/+20MP);卸 Wear 装备后清除
- [ ] attack.test / equip-effect.test / battle-state.test / event-system.test 覆盖每条
- [ ] `pnpm test` 全绿 + typecheck;每 commit 引 sdlpal `file:行号`
