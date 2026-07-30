# 实体/角色数据 八单元 三方逐函数对照审计(实体模型 / 角色数据 / 跟随者 / 装备效果 / 升级经验 / 技能 / 物品 / 敌人)

| 字段 | 值 |
|---|---|
| 审计日期 | 2026-07-05 |
| sdlpal C 真值 | `reference/sdlpal/{script.c, res.c, global.c(.h), battle.c, fight.c, itemmenu.c, magicmenu.c, scene.c, uigame.c, palcommon.h}`(monorepo HEAD 同 commit) |
| 一阶段 .ts | `packages/game/src/core/{event-system.ts, game-state.ts, equip-effect.ts}` + `packages/game/src/core/battle/{battle-system.ts}` + `packages/game/src/present/{follower-pos.ts, follower-render.ts}` + `packages/pal-extract/src/resources/parsers/{_utils.ts, items.ts, spells.ts, enemies.ts, player-roles.ts}` |
| reforge .ts | `packages/content/src/{actor.ts, character.ts, item.ts, skill.ts, enemy.ts, enemy-ai.ts, rewards.ts, sprite.ts, index.ts}` + `packages/reforge/src/{main.ts, sprite-anim.ts}` + `packages/reforge/src/battle/{battle-core.ts, settlement.ts}` + `packages/migrate/src/migrate-content.ts` |
| 审计单元 | 8(实体模型 / 角色数据 / 跟随者渲染 / 装备效果 / 升级经验 / 技能仙术 / 物品 / 敌人) |
| 方法 | sdlpal C 真值逐函数 → 一阶段逐函数对照(✅/⚠️/❌ + git fix 锚点)→ reforge 逐函数对照(✅/⚠️/❌/✨)→ 缺口 + 风险 + 行动 |

> **行号口径**:sdlpal 行号锚 C 文件 cat -n 行号;一阶段锚 `packages/game/src/...` cat -n 行号;reforge 锚 `packages/{content,reforge,migrate}/src/...` cat -n 行号。所有锚点为本审计读取时 HEAD 真值(`7422874a`)。
>
> **状态图例**:✅ 完全对齐 / ⚠️ 部分偏离 / ❌ 缺失 / ✨ 新架构免疫(用 reforge 范式重做后该坑不存在或不适用)。
>
> **来源标记**:harvest 摘要升级到逐函数 = 把原 harvest 「🟡 部分」段补成 sdlpal C 行号 + 一阶段 .ts 行号 + reforge .ts 行号 三栏对照,逐条结论化。

---

## 总览矩阵(先看结论)

| 单元 | sdlpal 核心 | 一阶段 | reforge | 一阶段 fix 命中 | reforge 命中 |
|---|---|---|---|---|---|
| 1 实体模型 | script.c(entity SoA)+ res.c(EventObject 回填) | event-system.ts(entity 部分) | content/actor.ts(EntityDef 二选一)+ migrate mapScenesStatic | 6/7(E1 身份/nSpriteFramesAuto 回填/zone) | 5/7(身份✨/帧布局⚠️/autoLoop 候选数⚠️/hostile 折叠✅/梦蛇 295✅) |
| 2 角色数据 | global.c(PLAYERROLES SoA) | game-state.ts(PlayerRolesRuntime 双轨) | content/character.ts(CharacterInstance) | 7/7(per-role HP/rgwName 3-4/双轨/resync/iCurEquipPart reset) | ✨ 全免疫(实例即真相,无双轨/per-role 解耦/稳定 id) |
| 3 跟随者渲染 | scene.c(PAL_UpdatePartyGestures) | follower-pos.ts + follower-render.ts | ❌ 未实现(oracle 已存) | 5/5(0x15 点名/朝向源 trail[2]/0x46 摆位/船上重叠/三态) | 0/5(main.ts:549 仅渲染队长) |
| 4 装备效果 | global.c PAL_GetPlayerXxx + script.c 0x17/0x18/0x19/0x1A + uigame.c PAL_EquipItemMenu | equip-effect.ts(6 累加 + override + sync runner) | content/item.ts(equipItem/effectiveStat/EquipEffect) | 8/8(0x18 真做 swap/row index +1 修正/造型 row runtime/resync/0x2D/0x29/DL11 原位替换) | 3/8(只 statBonus/maxPool;attackAll/grantStatus/grantSkill/resistance 运行时未消费;**卸装清状态缺口**) |
| 5 升级/经验 | battle.c PAL_BattleWon + global.c PAL_PlayerLevelUp + CHECK_HIDDEN_EXP | battle-system.ts applyHiddenExpGrowth + 主升级 + maxHP 随机成长 | content/rewards.ts grantBattleRewards + applyHiddenExp | 4/4(主升级阈值/CHECK_HIDDEN_EXP/学法术/Phase F 半恢复) | ✅ 4/4 全 port(rng=Math.random 注入) |
| 6 技能/仙术数据 | fight.c + magicmenu.c + global.h tagMAGIC | pal-extract/parsers/spells.ts(OBJECT_MAGIC + DATA chunk 4 MAGIC) | content/skill.ts(SkillData + SkillEffect) | 4/4(scriptDesc item-union offset10/bit2 跳/signed 字段/MAGIC_TYPE) | ✨ 数据化干净(scriptDesc 直存文字 / effects clean-rewrite) |
| 7 物品数据 | itemmenu.c + global.h tagOBJECT_ITEM | pal-extract/parsers/items.ts(OBJECT_ITEM) | content/item.ts(ItemData) | 4/4(wObjectID 统一/295=梦蛇 排除/flags 拆位/equipableBy 6 位) | ✨ 数据化干净(ItemUseEffect 联合独立) |
| 8 敌人数据 | fight.c + res.c + global.h tagENEMY/tagOBJECT_ENEMY | pal-extract/parsers/enemies.ts(ENEMY + OBJECT_ENEMY) | content/enemy.ts(EnemyDef + EnemyAI) | 5/5(signed modifier/5 字段 OBJECT_ENEMY/enemyId 索引/154 条/反向 _name) | ~~⚠️ HACK patch 未烘焙~~ **✅ 复核关闭(2026-07-05):整段 HACK 在 `#ifndef PAL_CLASSIC`(battle.c:1619-1713),是 ATB 模式专属;classic(一阶段/reforge 口径)有意不打,负 dex 走 (SHORT) 排序天然成立——烘焙反而错** |

---

## 审计单元 1:实体模型(script.c + res.c → event-system.ts entity → content/actor.ts)

### 1.1 sdlpal C 真值

#### `EVENTOBJECT` 结构(`global.h:95-113`)— SoA per-object 字段
```c
SHORT sVanishTime; WORD x, y; SHORT sLayer; WORD wTriggerScript, wAutoScript;
SHORT sState; WORD wTriggerMode, wSpriteNum; USHORT nSpriteFrames; WORD wDirection;
WORD wCurrentFrameNum; USHORT nScriptIdleFrame; WORD wSpritePtrOffset;
USHORT nSpriteFramesAuto; WORD wScriptIdleFrameCountAuto;
```
- **身份 = 全局下标** `wEventObjectID`(`script.h:34`)。`PAL_RunTriggerScript` / `PAL_RunAutoScript` 都收 `(wScriptEntry, wEventObjectID)`(script.h:30-43)。
- **触发模式 8 种**(`global.h:87-94`):kTriggerSearch{Near/Normal/Far}=1/2/3 + kTriggerTouch{Near/Normal/Far/Farther/Farthest}=4-8。`wTriggerMode==0` = 无触发。

#### `PAL_LoadScenario`(res.c)装载 EventObject(`res.c:295-348`)
- **nSpriteFramesAuto 是装载回填字段**(不是 dump 静态值):`nSpriteFramesAuto = PAL_MKFGetChunkCount(fp, wSpriteNum)`(res.c:295-298)—— 拿该精灵在 MGO.MKF 的真实帧数。**dump 出来恒 0,装载时才回填**(E2 真值)。
- 静止自循环(idle)取模用 `nSpriteFramesAuto`(`scene.c:897-901`):`wCurrentFrameNum = (wCurrentFrameNum + 1) % nSpriteFramesAuto`。

#### `PAL_RunAutoScript`(script.c)0x06 fall-through(`script.c:1230-1285`)
- autoScript 与 triggerScript 是**两套解释器**;0x04/0x06 在 auto 里有专用语义(概率/重掷/同帧续跑),不能手写模拟。

### 1.2 一阶段实现

#### `packages/game/src/core/event-system.ts`(5583 行)— entity 部分
- **身份 = 全局下标 wEventObjectID**(沿用 sdlpal;`event-system.ts:1077-1100` applyToAll 0xFFFF,`:3294`;`:3327-3329` items/spell 上下文塞 role id 的二义性)。
- **nSpriteFramesAuto 装载回填**:loader 阶段读 MGO chunk count 回填(per harvest E2;`engineering-notes.md` §1.4,`09ba1e04` 血池根因)。
- **autoScript 与 triggerScript 两套解释器**:`tickAutoScripts`(event-system.ts:1230-1285);`5d256f8f`(0x06 fall back)、`bb388ecf`(0x04/0x06 专用语义)。
- **triggerMode==0 → 无触发区**(zone 概念,`:3358-3374` touchFar 死锁 + `9367efc6` suppressAutoTriggerOnce)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| EVENTOBJECT 身份 = wEventObjectID 数组下标 | event-system.ts 全程按下标 | ✅(sdlpal 真值,E1) |
| nSpriteFramesAuto 装载回填(res.c:295) | loader 回填,`:09ba1e04` | ✅(E2 fix) |
| autoScript 0x06 专用语义 | tickAutoScripts + `5d256f8f`/`bb388ecf` | ✅(E6 fix) |
| touchFar suppressAutoTriggerOnce | `:9367efc6` 边沿触发 | ✅(E7 fix) |

### 1.3 reforge 实现

#### `packages/content/src/actor.ts`(70 行)+ `index.ts:72-113`(EntityDef)
- **EntityDef 二选一**(`index.ts:72` `EntityRef = {actor:string} | {sprite:string} | {zone:true}`)—— 免疫 sdlpal 下标式身份(E1)。判别 `isActorEntity` / `resolveEntitySpriteId`(actor.ts:60-70)。
- **EntityDef 字段**(`index.ts:75-91`):id / pos / facing / collide / interact / hidden / zBias / pages / hostile。**zBias** 对应 sdlpal sLayer 人工覆盖(防遮挡漂移);**hidden** 对应 sState=0(脚本届时显形)。
- **SpriteDef 帧布局**(`content/sprite.ts:24-32`):directional / static / loop。loop 对应 sdlpal `nSpriteFramesAuto`(环境自循环),但**自循环播放留后**(C0 只定义)。

#### `packages/migrate/src/migrate-content.ts`(mapScenesStatic,`:1062+`)
- 实体迁移:`spriteNum>0 → EntityDef`(prop 精灵引用;`:1056-1057`)。spriteNum=0 + 有触发脚本 → zone 实体(`:zonesMigrated`,M3a)。
- **nSpriteFramesAuto 处理**(`migrate-content.ts:1311`):`if ((eo.nSpriteFramesAuto ?? 0) > 0) report.autoLoopCandidates++` —— **仅计数报告**,不实际产出 loop 布局;留 C1 标注工具人工修(`:1045-1046` 注释)。
- **hostile 折叠**(`:hostileFold 1252-1300`):auto 首命令 chasePlayer + trigger 首命令 startBattle → 折叠为 `HostileBehavior` 数据(B9 引擎内置遇敌)。
- **梦蛇 295 处理**:`pal-extract/parsers/_utils.ts:20-26` `MENGSHE_OBJ_ID=295`;`spells.ts:144-148` 追加进 spells.json;`items.ts:84` 从 items.json 排除。**reforge 走 spells.json,统一性正确**。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| EVENTOBJECT 身份(下标式) | EntityDef.id 稳定 string + EntityRef 二选一 | ✨ 免疫(E1) |
| nSpriteFramesAuto 装载回填(res.c:295) | migrate 仅计数 autoLoopCandidates,不产 loop 布局 | ⚠️ 候选标注未自动 → C1 工具补 |
| autoScript 0x06 专用语义 | script-runner.ts(startAutoRunners) paceMs 模型 | ✅ 架构对路(需核 0x06 Command 概率/重掷语义) |
| spriteNum=0 zone 实体 | zonesMigrated(M3a) | ✅ |
| 梦蛇 295(法术名落 item word 段末位) | spells.json 追加 + items.json 排除 | ✅ |
| hostile 折叠(B9) | hostileFold 1252-1300 | ✅ |

### 1.4 缺口 + 行动

- **G1-1 autoLoop 候选不自动**:migrate 只数 autoLoopCandidates,不实际产 `loop` 布局。**行动**:C1 编辑器帧标注工具消费候选清单 → 给 SpriteDef 写 `layout: { kind: 'loop', frameCount, ticksPerFrame }`。**风险**:中(血池/火盆/赤鬼王 idle 动画当前全冻 frame 0)。
- **G1-2 item/spell 上下文 self=role id 二义性**:reforge script-runner 仍需在 host 落地时显式判别(per harvest E1)。

---

## 审计单元 2:角色数据(global.c PLAYERROLES → game-state.ts → content/character.ts)

### 2.1 sdlpal C 真值

#### `PLAYERROLES` SoA(`global.h:297-336`)— 24 个 `PLAYERS[MAX_PLAYER_ROLES=6]` 行
- 关键行:`rgwHP`(:9 / 偏移 0x268)、`rgwLevel`(:6)、`rgwName`(:3 / 偏移 0x220)、`rgwEquipment[MAX_PLAYER_EQUIPMENTS=6][6]`(:11-16)、`rgwMagic[32][6]`(:32-63)、`rgwCooperativeMagic`(:65)。
- **HP/MP/装备全存 `rgwHP[roleId]` 下标**:两槽同 role 共用一格血(per-role HP 全局耦合,C1 真值)。
- **rgwName = [36,37,38,40,39,41]**(原版数据,`:player-roles.ts:237-243` 注释):role3/role4(巫后/阿奴)名字指针对调。

#### `gpGlobals->g.PlayerRoles`(单一真相源,sdlpal 战内直接读写)
- 无"投影/回写"——战斗直接读写此对象;装备 effect 经 `rgEquipmentEffect[6+1]` 覆盖层叠加(`global.h:521`)。

### 2.2 一阶段实现

#### `packages/game/src/core/game-state.ts`(PlayerRolesRuntime 双轨)
- **静态基线** `playerRoles.json`(assets)+ **运行时可变** `gs.PlayerRolesRuntime`(`game-state.ts:536-560`)。新游戏起手 `hydratePlayerRolesRuntime`(`:1367-1420`)把基线拷给 runtime。
- **投影到战斗** `projectRuntimeToBattleRoles`(`:1550-1639`):把 runtime + staticRoles 投影成 PlayerRoles 给战斗用。**装备 override 类**(`anyEquip`/`lastNonzeroEquip`,`:1577-1592`)在此算。
- **战斗结束回写** `writeBackBattleRolesToRuntime`(`:1729-1745`):只回写 hp/mp(派生 stat 不回写)。
- **rgwName 3/4 对调处理**:`player-roles.ts:240-243` `personIdx = name[i] - PERSONS_WORD_OFFSET` —— 按 rgwName 真值取名字,**不**用 sequential `words.persons[i]`(`ddb28d07` 修复)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PLAYERROLES SoA(24 行) | PlayerRolesRuntime 24 字段镜像 | ✅ |
| per-role HP 全局耦合(`rgwHP[roleId]`) | runtime.rgwHP[roleId](同结构,继承耦合) | ⚠️ 继承债(战斗需投影/回写) |
| rgwName 3/4 对调 | player-roles.ts:240-243 + `ddb28d07` | ✅(C2 fix) |
| PlayerRolesRuntime vs staticRoles 双轨 | projectRuntimeToBattleRoles + writeBackBattleRolesToRuntime | ⚠️ 三套副本同步地狱(C3) |
| 战内 0x19/0x1A 加成回灌战斗工作副本 | resyncBattleRoleStatsFromRuntime + `e70f9724` | ✅(C3 镇狱明王 fix) |

**一阶段 fix 命中**:`ddb28d07`(rgwName 3/4)、`e70f9724`(战内加成回灌)、`cd18d296`(GameState 全字段冻结)、`57a4c5b0`(PlayerRoles 完整 dump)、`aedfa733`(全字段 dump 修)、`a87d0748`(队长 sprite=2 实查)。

### 2.3 reforge 实现

#### `packages/content/src/character.ts`(138 行)— CharacterInstance
- **CharacterInstance**(`character.ts:62-92`):稳定 `id` + `template`(ActorDef.id)+ 绝对值属性(level/exp/hp/maxHP/mp/maxMP/attack/defense/magicAttack/speed/luck)+ `equipment: Record<slotId,itemId>` + `tags` + `hiddenExp?`。
- **`party: CharacterInstance[]`**(`WorldState.party`,`character.ts:14`):**引用列表**,非 roleId 下标 → per-role HP 耦合从根消失(C1 免疫)。
- **`instantiate(actor)`**(`:99-110`):从 ActorDef.battler 深拷贝 baseStats + initialEquipment + initialMagic,exp=0,tags 空。
- **`buildWorld(startWorld, actorsById)`**(`:117-138`):manifest 数据化版 initialWorld;seedStats 覆盖 hp/mp。
- **稳定 string id**(`id: string`):无 roleId / wObjectID 下标 → rgwName 3/4 对调从根杜绝(C2 免疫,但**迁移器仍须正确处理 rgwName**,见 G2-1)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| PLAYERROLES SoA | CharacterInstance 对象数组(实例即真相) | ✨ 免疫(per-role HP 解耦) |
| rgwName 3/4 对调 | 稳定 string id + TextId | ✨ 免疫(迁移器须处理,见 pal-extract/player-roles.ts:240) |
| PlayerRolesRuntime vs staticRoles 双轨 | 单一 CharacterInstance(无投影/回写) | ✨ 免疫(C3) |
| 战内加成(0x19/0x1A) | (战斗侧;无快照概念) | ✨ 免疫 |

### 2.4 缺口 + 行动

- **G2-1 迁移器仍须正确处理 rgwName**:`pal-extract/parsers/player-roles.ts:240-243` 已按真值取名字(`ddb28d07`)。**核实通过 ✅**。reforge 消费的是 player-roles.json,迁移器正确即可。**风险**:低(已 fix)。
- **G2-2 多人 party 实例 id 约定**:`character.ts:99` 注释"实例 id === 模板 id,demo 单人 1:1";多人时实例 id 会带实例化区分,key 约定需调整。**风险**:低(demo 不受影响,多人落地时再定)。

---

## 审计单元 3:跟随者渲染(scene.c → follower-pos.ts + follower-render.ts → reforge 未实现)

### 3.1 sdlpal C 真值

#### `PAL_UpdatePartyGestures`(scene.c:654-771)— 队员/跟随者位置 + 帧
- **walking 分支**(scene.c:658-735):
  - 队长 `rgParty[0]` = partyoffset(scene.c:673-674),帧 `wPartyDirection * (4||3) + s_iThisStepFrame`(scene.c:678-687)。
  - 队员 i(1..maxIdx)位置 = `rgTrail[1] - viewport` + 方向偏移(i==2 East/West ? -16 : +16,scene.c:694-707);**撞墙回退 trail[1]**(scene.c:712-717);帧 = `rgTrail[2].wDirection * (4||3) + iStepFrameLeader`(scene.c:724-728)。
  - **跟随者**(0x98 set-follower)位置 = `rgTrail[2+i]`(scene.c:737-740),无偏移无回退;帧 = `rgTrail[2+i].wDirection * 3 + iStepFrameFollower`(scene.c:741-742)。
  - **iStepFrameFollower 序列** = [0,2,0,1](scene.c:659-674:s_iThisStepFrame 0..3 推,奇步=3-leader,偶步=0),**与 leader [0,1,0,2] 不同**。
- **not-walking 分支**(scene.c:745-771):位置不动(else 不更新 rgParty[i]),帧 = `rgTrail[2].wDirection * f`(f=walkFrames,缺省 3)。
- **0x15 operand[2] 点名转向**(script.c)——只点 operand[2] 单员,不全队同步。

#### 跟随者 sprite 来源(res.c:335-348)
- 跟随者 sprite num = `rgParty[maxIdx+i].wPlayerRole` —— **直接当 MGO chunk 号**,**不**走队员的 `rgwSpriteNum[role]` 查表。

### 3.2 一阶段实现

#### `packages/game/src/present/follower-pos.ts`(84 行)— 跟随者世界坐标
- **三态**(`follower-pos.ts:33-83`):
  1. **walking + 已捕获 frozenOffset**:位置 = trail[1]+方向偏移(撞墙回退),朝向 = trail[2].dir;捕获 frozenOffset。
  2. **not-walking + 已捕获 frozenOffset**:**位置冻结**(队长+offset),**朝向仍用当前 trail[2].dir**(非冻结朝向)—— 区分船划行(跟队长转)vs 隐龙窟站立(保持走来方向)。
  3. **not-walking + 无 frozenOffset**(0x46 摆位 / 刚进场景):位置 = trail[m](=队长+m×offset),**非 trail[1]+偏移**(那会多退一格 = 间隙)。
- **trail 不足(<=1)→ null**(`:42`)。

#### `packages/game/src/present/follower-render.ts`(70 行)— 0x98 跟随者渲染项
- `computeFollowerRenderItems`(`:42-67`):follower k → trail[3+k](= sdlpal rgTrail[2+(k+1)]);trail 深度不足跳过;spriteNum = followers[k] 直接当 chunk 号;frameIdx = dir*3 + step。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_UpdatePartyGestures walking 队员偏移 | follower-pos.ts:69-79(方向偏移 + 撞墙回退) | ✅ |
| not-walking 位置冻结/朝向 trail[2].dir | follower-pos.ts:53-58 + `e1b568cb` | ✅(E3 朝向源 fix) |
| 0x15 operand[2] 点名 | event-system.ts:3620-3648 + `0dfc71b7` | ✅(E3 点名 fix) |
| 0x46 摆位 trail[m] | follower-pos.ts:60-65 + `a47334a1` | ✅(E3 间隙 fix) |
| 船上重叠 {0,-1}(0xA1) | event-system.ts 0xA1 + `a47334a1` | ✅(E3 重叠 fix) |
| 0x98 跟随者 sprite/trail/帧 | follower-render.ts + res.c:335 真值 | ✅ |

**一阶段 fix 命中**:`0dfc71b7`(0x15 点名)、`8bbbdecc`(初版误同步全队)、`e1b568cb`(朝向源 trail[2].dir)、`a47334a1`(0xA1 重叠)、`09ba1e04`(nSpriteFramesAuto 回填)。

### 3.3 reforge 实现

#### `packages/reforge/src/main.ts:549` 注释:"现阶段队伍渲染只有队长"
- ❌ **跟随者渲染未实现**(E3 harvest oracle 已存)。
- `computeFollowerWorldPos` / `computeFollowerRenderItems` 是**纯函数**,可直接移植(per harvest E3 11 case oracle,`packages/game/src/present/follower-pos.test.ts`)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| computeFollowerWorldPos(三态) | ❌ 未实现 | ❌ |
| computeFollowerRenderItems(0x98) | ❌ 未实现 | ❌ |

### 3.4 缺口 + 行动

- **G3-1 跟随者渲染整组缺失**:**行动** = 直接移植 `follower-pos.ts` + `follower-render.ts` + 11 case oracle 测试。**风险**:高(剧情船/骑乘/刘晋元叫醒/隐龙窟站立全依赖此)。

---

## 审计单元 4:装备效果(global.c + script.c + uigame.c → equip-effect.ts → content/item.ts)

### 4.1 sdlpal C 真值

#### 6 累加型 stat getter(`global.c:1736-1935`)
- `PAL_GetPlayerAttackStrength`(:1736)/ MagicStrength(:1768)/ Defense(:1800)/ Dexterity(:1832,**PAL_CLASSIC 含 Extra 槽,否则不含**)/ FleeRate(:1868)/ PoisonResistance(:1900,**clamp [0,100]**)。
- 公式:`base + Σ_{i=0..MAX_PLAYER_EQUIPMENTS(=6,含 Extra)} rgEquipmentEffect[i].field[role]`。

#### 3 override 型 getter(`global.c:1937-2078`)
- `PAL_GetPlayerBattleSprite`(:1970):**末个非 0 槽** override base(`if != 0 → w = ...`)。
- `PAL_GetPlayerCooperativeMagic`(:2013):同末非 0 override。
- `PAL_PlayerCanAttackAll`(:2050):**任一槽非 0 → TRUE**(`break`)。

#### `PAL_RemoveEquipmentEffect`(`global.c:1372-1456`)— 卸装清状态
- 把 `rgEquipmentEffect[wEquipPart]` 当 byte 数组,对该 part 所有 row 给定 role 列清 0(:1395-1404)。
- **Hand(part 3)卸下 → reset DualAttack status**(:1406-1412 `rgPlayerStatus[role][kStatusDualAttack] = 0`)—— 仙女剑授的 DualAttack 唯一清除点。
- **Wear(part 5)卸下 → 清 poison level 99**(:1413-1454 寿葫芦的常驻回血"毒"随饰品卸下消失)。

#### `PAL_UpdateEquipments`(`global.c:1333-1369`)— 重算全部装备 effect
- memset 全 0 + 跨 role × 6 part 跑 `PAL_RunTriggerScript(item.wScriptOnEquip, role)`。

#### script.c 装备 opcode
- **0x17** set extra attr(`script.c:752-766`):`p[op[1]*MAX+role] = SHORT(op[2])`,partIdx = op[0]-0x0B。
- **0x18** Equip item(`script.c:768-811`):设 iCurEquipPart + removeEquipmentEffect + 真做 swap(若该槽当前 != op1 → 改 rgwEquipment + inventory ±1 + wLastUnequippedItem);**DL11 原位替换**(新件库存恰 1 且旧件不在包 → rgInventory[i].wItem = w,script.c:784-805)。
- **0x19** increase player attr(`script.c:813-832`):`p[op[0]*MAX+role] += SHORT(op[1])`。
- **0x1A** set player stat(`script.c:834-865`):`g_iCurEquipPart != -1 → 写 rgEquipmentEffect[part]`(覆盖层);否则写 base。**末尾必须 reset iCurEquipPart=-1**(script.c:3476)。
- **0x2D** set player status(`script.c:1367`):装备授状态(仙女剑 DualAttack=32760)。
- **0x29** apply poison(`script.c:1257`):寿葫芦 Wear 授 level-99 正面"毒"(563=+20HP/564=+20MP);gate `RandomLong(1,100) > poisonResistance`(五毒珠 resist=100 → 永不中)。

#### `PAL_EquipItemMenu`(`uigame.c:1794-2053`)— 装备菜单
- 选 role + Confirm → `scriptOnEquip = PAL_RunTriggerScript(scriptOnEquip, role)`(:2050-2053)。
- equipable 判定:`rgObject[wItem].item.wFlags & (kItemFlagEquipableByPlayerRole_First << w)`(:1932)。

### 4.2 一阶段实现

#### `packages/game/src/core/equip-effect.ts`(全文件)— 1:1 port
- **6 累加 getter**(`:24-67`):getPlayerAttackStrength / MagicStrength / Defense / Dexterity / FleeRate / PoisonResistance(`Math.max(0, Math.min(100, value))` clamp)。
- **override 类经 projectRuntimeToBattleRoles 算**(`game-state.ts:1577-1592` anyEquip / lastNonzeroEquip)—— `8b541469` 补三 override。
- **PLAYERROLES_ROW 真值**(`:121-152`):row index 按 sdlpal byte-cast 真值(LEVEL=6 / ATTACK_STRENGTH=17,非 -1 错位;2026-05-28 audit 发现)。
- **removeEquipmentEffect**(`:266-310`):清 part 所有 field;**Hand(part3)→ reset DualAttack status**;**Wear(part5)→ removePoisonLevel99**(`9b6feb86` 0x29 授毒配套)。
- **runEquipScriptSync**(`:330-450`):mini sync runner 只处理 0x17/0x18/0x19/0x1A/0x2D/0x29 + end + goto;**try/finally reset iCurEquipPart=-1**(`:340-343`,`2026-05-29 P1#4` fix)。
- **0x18 真做 swap**(`:374-402`):`cur !== newItem → 真换 inventory`;**DL11 原位替换**(`:391-395`,`DL11` fix)。
- **resyncBattleRoleStatsFromRuntime**(`:81-99`):战内 0x19/0x1A 加成回灌战斗工作副本(`e70f9724` 镇狱明王 fix)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| 6 累加 getter | equip-effect.ts:24-67 | ✅ |
| 3 override getter | game-state.ts:1577-1592 + `8b541469` | ✅ |
| PAL_RemoveEquipmentEffect(Hand→status / Wear→poison99) | equip-effect.ts:266-310 + `ddba7bfa`/`9b6feb86` | ✅(C5) |
| PAL_UpdateEquipments | equip-effect.ts:455-475 | ✅ |
| 0x17/0x18/0x19/0x1A/0x2D/0x29 sync runner | runEquipScriptSync + `c4e23736` | ✅ |
| PLAYERROLES_ROW 真值(+1 修正) | equip-effect.ts:121-152(2026-05-28 audit) | ✅ |
| 0x18 真做 swap + DL11 原位替换 | equip-effect.ts:374-402 + `c4e23736`/`38016785` | ✅ |
| iCurEquipPart reset(try/finally) | equip-effect.ts:340-343(2026-05-29 P1#4) | ✅ |
| 战内加成回灌 | resyncBattleRoleStatsFromRuntime + `e70f9724` | ✅(C3 fix) |

### 4.3 reforge 实现

#### `packages/content/src/item.ts`(232 行)— EquipEffect 联合 + equipItem
- **EquipEffect 联合**(`item.ts:38-47`):statBonus(0x17)/ resistance(0x17[22-27])/ maxPool(0x1A)/ grantStatus(0x2D)/ grantSkill(0x1A row65)/ attackAll(0x1A)。
- **effectiveStat**(`item.ts:77-95`):**只算 statBonus 累加**;注释明示"resist/grant/maxPool/attackAll 的运行时计算 = phase3 引擎,本函数只算 statBonus"。
- **equipItem**(`item.ts:140-165`):换 slot + 旧件回包;**注释无"清状态/清毒"逻辑**。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| 6 累加 getter(global.c:1736-1935) | effectiveStat(只 statBonus) | ⚠️ 只 1/6(attack/magicAtk/defense/speed/luck 共用一 fn,但无 poisonResistance 累加) |
| 3 override getter(attackAll/sprite/coopMagic) | EquipEffect 定义但运行时未消费 | ❌(C4 部分偏离,phase3) |
| PAL_RemoveEquipmentEffect(Hand→status / Wear→poison99) | equipItem 只换槽位不清状态 | ❌(C5 缺口) |
| PAL_UpdateEquipments(物化重建) | (不需要;查询时现算) | ✨ 架构免疫(EquipEffect 是声明式数据,非可执行脚本,无需物化。详见 4.4 ★ 设计判断) |
| 0x17/0x18/0x19/0x1A/0x2D/0x29 sync runner | EquipEffect 数据化(无脚本链) | ✨ 干净(scriptOnEquip → EquipEffect[],迁移期翻译) |
| grantStatus(仙女剑 DualAttack) | EquipEffect.grantStatus 定义 | ⚠️ 定义有,运行时未消费 |
| grantSkill(土灵珠→山神) | EquipEffect.grantSkill 定义 | ⚠️ 定义有,运行时未消费 |
| maxPool(0x1A) | EquipEffect.maxPool 定义 | ⚠️ 定义有,运行时未消费 |

### 4.4 缺口 + 行动

#### ★ 设计判断(2026-07-05 作者问"战斗前算 vs 实时算"定调)

> **reforge 装备效果 = 查询时实时算(声明式纯函数),不做"物化重建"。**

为什么原版要做 `PAL_UpdateEquipments`(global.c:1333,清零 rgEquipmentEffect + 重跑全员 scriptOnEquip)？因为原版的**装备效果是可执行脚本**(scriptOnEquip),脚本有任意副作用(改 stat/授状态/授毒/改合击/改战斗精灵),且副作用写到全局 `rgEquipmentEffect` 数组。脚本**没法在每次属性查询时实时跑**(太慢 + RNG 副作用),所以必须在"装备变动 / 开战 / 读档"三个时机把脚本副作用**物化**成数组,查询时读数组。

**reforge 不需要物化,因为 `EquipEffect` 是声明式数据联合**(statBonus/resistance/grantStatus/grantSkill/attackAll/maxPool),不是可执行脚本。声明式数据的计算成本极低(几个加法 + override 判断)、无副作用、无 RNG —— **每次属性查询时遍历当前装备的 effects 现算即可,不需要预先物化成数组**。

这是 reforge 比 sdlpal 干净一层的架构红利(4.3 表已标 ✨"scriptOnEquip → EquipEffect[],迁移期翻译")。**不要因为原版有 `PAL_UpdateEquipments` 就在 reforge 复刻一个"重建装备效果"的步骤** —— 那是把旧架构债重新引进来。原版那么做是被迫的(脚本不能实时算),reforge 的声明式数据没这个约束。

由此推出下面 G4-2/G4-3 的正确修法方向:**补全查询点的 effect 消费**(让 effectiveStat / 攻击判定 / maxHP 查询 各自遍历 EquipEffect),**不是补"重建时机"**。

#### G4-1 卸装清状态/毒缺口(高危)
`equipItem` 当前只换槽位,不清 grantStatus(仙女剑 DualAttack)/ Wear 槽 level-99 毒(寿葫芦)。**行动**:equipItem 卸旧件前,若旧件 effects 含 `grantStatus` → 清该 status;若旧件在 Wear/accessory 槽且授 level-99 毒 → 清该毒。**风险**:高(迁移仙女剑/寿葫芦必撞)。

> 注:这条是"卸装时的副作用清除",**不是**"装备效果物化"——它是 equipItem 这个**写操作**的伴随清理,跟"查询时实时算"不冲突(授状态/授毒是持久态变更,需要显式撤销)。

#### G4-2 attackAll/grantSkill/maxPool 运行时未消费
EquipEffect 联合定义了,但 `effectiveStat` 只算 statBonus。**行动**:**补全各查询点的 effect 消费**(查询时现算,不物化):
- `attackAll`:攻击判定处查"任一装备槽含 attackAll effect → 群攻"(override 语义,末非 0)。
- `grantSkill`:`learnedSkills` 查询处合并"装备授予的 skillId"(圣灵珠→合击/土灵珠→山神)。
- `maxPool`:`maxHP`/`maxMP` 查询处累加 maxPool effect(累加语义)。
- `grantStatus`:状态查询处查"装备授予的持久状态"(仙女剑 DualAttack)。
- `resistance`:抗性查询处累加。

**风险**:中(长鞭/圣灵珠/土灵珠/仙女剑目前无效)。

#### G4-3 查询点未覆盖(原"启动时无重算装备 effect",重新定性)
原表述"无 bootstrap updateAllEquipments 等价"会被误解成"该补物化重建"。**按上面的设计判断,重新定性**:reforge 不需要 updateAllEquipments —— 需要的是**确保所有属性查询点都走 effectiveStat/effectiveMaxPool/effectiveResistance 等纯函数**,而不是直读 `instance.hp`/`instance.maxHP` 基线值。**行动**:grep reforge 所有读 maxHP/maxMP/attack/defense/speed/luck/resistance/status/skills 的点,确认它们走"基线 + Σ装备 effect"的纯函数,而非裸读基线字段。**风险**:中(漏一个查询点 = 该属性装备失效,如灵儿进明王战丢武器双攻这类 bug 的 reforge 版本)。

---

## 审计单元 5:升级/经验(battle.c + global.c → battle-system.ts → content/rewards.ts)

### 5.1 sdlpal C 真值

#### `PAL_BattleWon`(`battle.c:991-1373`)— 战后结算
- **Phase A** 经验金钱(:1025-1055):iExpGained/iCashGained 显示 + 现金入账(`gpGlobals->dwCash += iCashGained`,:1059)。
- **Phase B** 主升级(:1086-1220):per 活役(roleId,死者跳过 :1095)→ `dwExp = primaryExp + iExpGained` → while `dwExp >= levelUpExp[level]`:扣阈值、`PAL_PlayerLevelUp(role, 1)`(:1113)、HP/MP 回满(:1114-1115)。
- **Phase C** CHECK_HIDDEN_EXP(:1226-1293,宏 :1238-1284):total = 7 池 count 之和;每池 `dwExp = trunc(iExpGained * count / total) * 2 + pool.exp`;while 过阈值:`stat += RandomLong(1,2)`、level++。**无 STAT_LIMIT 钳**(与主升级不同)。
- **学法术**(:1300-1332):跨过的 level 在 lprgLevelUpMagic 表内 → `PAL_AddMagic(role, magic)`(去重)。
- **Phase F** 半恢复(:1342-1372):全员 HP += (max-HP)/2、MP 同(PAL_CLASSIC)。

#### `PAL_PlayerLevelUp`(`global.c:2347-2454`)— 主升级 stat 成长
- maxHP + 10+R(0,7)(:2378)/ maxMP + 8+R(0,5)(:2379)/ attackStrength + 4+R(0,1)(:2380)/ magicStrength + 4+R(0,1)(:2381)/ defense + 2+R(0,1)(:2382)/ dexterity + 2+R(0,1)(:2383)/ fleeRate + 2(:2384)。
- STAT_LIMIT 999 钳(:2386-2394)。
- 重置 primaryExp.wExp=0、wLevel=新 level(:2396-2400)。

### 5.2 一阶段实现

#### `packages/game/src/core/battle/battle-system.ts`(3507 行)— applyHiddenExpGrowth + 主升级
- **applyHiddenExpGrowth**(`:3321-3360`):port CHECK_HIDDEN_EXP;`rng.rangeInclusive(1, 2)`(:3347,RandomLong(1,2) 真值);无 cap(:3319 注释)。
- **主升级 PAL_PlayerLevelUp**(battle-system 移植):maxHP + 10+R(0,7) 等全 7 项 + STAT_LIMIT 999 钳;HP/MP 回满。
- **学法术**:跨 level 查 lprgLevelUpMagic + PAL_AddMagic 去重。
- **Phase F 半恢复**:HP += (max-HP)/2、MP 同。
- **stat 成长用 state.rng(种子)**(:3370-3371 注释,确定性 + 忠实 RandomLong);opcode 0x8D playerLevelUp 用 Math.random 版。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_BattleWon Phase A 经验金钱 | battle-system.ts 战后结算 | ✅ |
| Phase B 主升级阈值循环 | battle-system.ts + `9c744889` | ✅ |
| PAL_PlayerLevelUp stat 成长(7 项 + cap 999) | battle-system.ts + `9c744889` | ✅ |
| CHECK_HIDDEN_EXP(7 池 / R(1,2) / 无 cap) | applyHiddenExpGrowth:3321-3360 + `cdd17654` | ✅ |
| 学法术(levelUpMagic + AddMagic 去重) | battle-system.ts + `d12d440e` | ✅ |
| Phase F 半恢复 | battle-system.ts | ✅ |

**一阶段 fix 命中**:`9c744889`(D11 主升级)、`cdd17654`(E04-b applyHiddenExp)、`7ed5438c`(E04-d 结算屏)、`67f5949b`(B7c 隐藏经验系统)、`4b167644`(D8 + D11 hidden-exp 数字坐标)。

### 5.3 reforge 实现

#### `packages/content/src/rewards.ts`(199 行)— grantBattleRewards + applyHiddenExp
- **grantBattleRewards**(`:108-180`):per 活役(c.hp <= 0 跳过 :116)→ exp += input.exp → while 过阈值:level++、maxHP + 10+R(0,7)(:131)/ maxMP + 8+R(0,5)/ attack + 4+R(0,1)/ magicAttack + 4+R(0,1)/ defense + 2+R(0,1)/ speed + 2+R(0,1)/ luck + 2(固定)/ STAT_CAP 999 钳(:Math.min(STAT_CAP, ...))/ hp=mp=maxHP 回满(:139-140);学技能(levelUp 表 + 去重 :143-152)。
- **applyHiddenExp**(`:80-105`):port CHECK_HIDDEN_EXP;`r = (a,b) => a + Math.floor(rng() * (b-a+1))`(:84),`inc = r(1, 2)`(:98);无 cap;pool.exp = exp & 0xffff(WORD 截断,:102)。
- **Phase F**(`:181-184`):全员 hp += floor((max-hp)/2)、mp 同。
- **rng 注入**:`grantBattleRewards(... rng: () => number = Math.random)`;reforge main.ts:870-878 传 `Math.random`(**非确定性流,区别一阶段 state.rng**)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| PAL_BattleWon Phase A 经验金钱 | grantBattleRewards + main.ts:868(world.money += r.cash) | ✅ |
| Phase B 主升级(7 项 + R 真值 + cap 999) | rewards.ts:128-141 | ✅(全 7 项 + R(0,7)/R(0,5)/R(0,1) 真值) |
| PAL_PlayerLevelUp stat 成长 | rewards.ts:128-141(同上) | ✅ |
| CHECK_HIDDEN_EXP(7 池 / R(1,2) / 无 cap) | applyHiddenExp:80-105 | ✅(全 port,R(1,2)/WORD 截断真值) |
| 学法术(levelUp + 去重) | rewards.ts:143-152 | ✅ |
| Phase F 半恢复 | rewards.ts:181-184 | ✅ |
| rng 确定性流 | Math.random(非 state.rng) | ⚠️ 非确定性(复现/可测性弱于一阶段;战斗本身 rng 已是 Math.random) |

### 5.4 缺口 + 行动

- **G5-1 rng 确定性**:reforge 战斗 + 结算全用 `Math.random`,一阶段用 state.rng 种子流(可复现/可测)。**行动**:若需 deterministic replay(回放/测试),注入种子 rng。**风险**:低(玩法无影响,仅工程化)。
- **G5-2 学技能规则简化**:rewards.ts:143-152 只查 `lu.level === c.level`;sdlpal 是 `lprgLevelUpMagic[j].m[w].wLevel > rgwLevel[w]` 跳过(battle.c:1303),即跨过的所有 level 都学。**核实**:reforge `while` 循环里 level++ 后立即查 ===,等价于"跨过该 level 就学";但如果 exp 一次跨多级,sdlpal 表内多条同 level 也会学(reforge 也循环查 levelUp 数组)。**风险**:低(已对齐)。

---

## 审计单元 6:技能/仙术数据(fight.c + magicmenu.c + global.h tagMAGIC → pal-extract/spells.ts → content/skill.ts)

### 6.1 sdlpal C 真值

#### `OBJECT_MAGIC`(`global.h:206-213`)— Spell wrapper(7 WORD)
- wMagicNumber(0)/ wReserved1(2)/ wScriptOnSuccess(4)/ wScriptOnUse(6)/ wReserved2(8)/ wScriptDesc(10)/ wFlags(12)。
- **scriptDesc 故意读 item-union offset 10**(`magicmenu.c:191` `rgObject[wMagic].item.wScriptDesc`)—— 不是 OBJECT_MAGIC 的 reserved2(offset 8)。

#### `MAGIC`(`global.h:364-385`)— 详细 stats(16 WORD)
- wEffect(0)/ wType(2)/ wXOffset(4)/ wYOffset(6)/ rgSpecific(8,union:summon=wSummonEffect,其他=sLayerOffset)/ wSpeed(10,SHORT)/ wKeepEffect(12)/ wFireDelay(14)/ wEffectTimes(16)/ wShake(18)/ wWave(20)/ wUnknown(22)/ wCostMP(24)/ wBaseDamage(26)/ wElemental(28)/ wSound(30,SHORT)。

#### `MAGIC_TYPE`(`global.h:338-348`)
- 0 normal / 1 attackAll / 2 attackWhole / 3 attackField / 4 applyToPlayer / 5 applyToParty / 8 trance / 9 summon。

#### `MAGICFLAG`(`global.h:188-194`)
- bit0 UsableOutsideBattle / bit1 UsableInBattle / **bit2 跳** / bit3 UsableToEnemy / bit4 ApplyToAll。

### 6.2 一阶段实现

#### `packages/pal-extract/src/resources/parsers/spells.ts`(全文件)
- **OBJECT_MAGIC wrapper**(`parseSpells`,`:111-148`):wObjectID 体系(296..397 + 边界 295=梦蛇 追加末尾);scriptDesc 读 item-union offset 10(`:43-46` 注释,修此前 offset 8 全 0 bug)。
- **MAGIC stats**(`parseMagicTable`,`:265+`):16 WORD 全字段;speed/sound signed(`getInt16`)。
- **MAGIC_TYPE**(`:73-87`):map 0/1/2/3/4/5/8/9,6/7/>9 兜底 'other'。
- **MAGICFLAG**(`:51-58`):bit2 跳真值。
- **parseObjectMagics**(`:175-194`):整个 OBJECT 数组按 magic-union dump(0x42 SimulateMagic / 0x66 throw weapon 把任意 object 当 magic 解读,投掷物 op0=24 在 item 段之下)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| OBJECT_MAGIC wrapper(7 WORD) | parseSpells:111-148 | ✅ |
| scriptDesc item-union offset10 | spells.ts:43-46(修 offset 8 bug) | ✅ |
| MAGIC stats(16 WORD / signed speed,sound) | parseMagicTable + `MAGIC_OFF` | ✅ |
| MAGIC_TYPE(8 种 + other 兜底) | spells.ts:73-87 | ✅ |
| MAGICFLAG(bit2 跳) | spells.ts:51-58 | ✅ |
| 梦蛇 295 追加 spells.json | spells.ts:144-148 + `a7b42232` | ✅ |
| parseObjectMagics(投掷物/0x42) | spells.ts:175-194 | ✅ |

**一阶段 fix 命中**:`a7b42232`(梦蛇归位 spells.json)、`6822295f`(wObjectID 统一)、`9bd62318`(M3.5 Item schema)、`aedfa733`(PlayerRoles 全字段 dump 配套)。

### 6.3 reforge 实现

#### `packages/content/src/skill.ts`(98 行)— SkillData clean-rewrite
- **SkillData**(`:69-83`):id(原版 oid 字符串)/ name / desc(原 scriptDesc 脚本 → 第二阶段直接存文字)/ cost(SkillCost:mp/stamina/money/items)/ usableOutsideBattle / target(SkillTarget)/ effects(SkillEffect[])/ animation(SkillAnimation)。
- **SkillEffect 联合**(`:25-65`):damage/healHp/healMp/revive/applyStatus/removeStatus/applyPoison/curePoison/buffStat/gate/instantKill/steal/collectTreasure/summon/trance —— **clean-rewrite 版的原版 scriptOnSuccess opcode 链**。
- **SkillAnimation**(`:60-67`):effectSprite/xOffset/yOffset/speed/fireDelay/effectTimes/shake/sound —— **原版 MAGIC 表考证**(M4d-2b)。
- **SkillTarget**(`:16`):oneEnemy/allEnemies/oneAlly/allAllies/self —— 从原版 MagicType 拆出的 gameplay 维度(渲染样式归 animation)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| OBJECT_MAGIC wrapper(7 WORD) | SkillData 数据化(无 wrapper/stats 分表) | ✨ 干净(自包含,不存 magicNumber 子表下标) |
| scriptDesc(脚本) | SkillData.desc(直接存文字) | ✨ 免疫(无 scriptDesc 脚本解读) |
| MAGIC stats(16 WORD) | SkillAnimation(7 字段) | ⚠️ 简化(keepEffect/wave/unknown 弃;够用) |
| MAGIC_TYPE | SkillTarget + SkillAnimation.placement(拆 gameplay/render) | ✨ 干净(原版混二为一,reorge 拆开) |
| MAGICFLAG | SkillData.usableOutsideBattle + target 隐含 | ⚠️ usableInBattle/usableToEnemy/applyToAll 未显式(由 effects/target 推) |

### 6.4 缺口 + 行动

- **G6-1 SkillAnimation 简化**:keepEffect/wave/unknown 弃。**行动**:若法术演出需 wave(屏水波),补 SkillAnimation.wave。**风险**:低(原版 wave 用于少数法术)。
- **G6-2 MAGICFLAG 隐含**:usableInBattle 由 effects 推(有 damage=战斗可用),applyToAll 由 target=allEnemies 推。**风险**:低(语义等价)。

---

## 审计单元 7:物品数据(itemmenu.c + global.h tagOBJECT_ITEM → pal-extract/items.ts → content/item.ts)

### 7.1 sdlpal C 真值

#### `OBJECT_ITEM`(`global.h:160-167`)— 7 WORD
- wBitmap(0)/ wPrice(2)/ wScriptOnUse(4)/ wScriptOnEquip(6)/ wScriptOnThrow(8)/ wScriptDesc(10)/ wFlags(12)。

#### `ITEMFLAG`(`global.h:144-153`)
- bit0 Usable / bit1 Equipable / bit2 Throwable / bit3 Consuming / bit4 ApplyToAll / bit5 Sellable / **bit6..= EquipableByPlayerRole_First + N(MAX_PLAYER_ROLES=6)**。

#### `PAL_ItemSelectMenuUpdate`(`itemmenu.c:42-200`)— 物品选择菜单
- 翻页/光标/图标 bitmap/数量;iItemsPerLine / iLinesPerPage / iCursorXOffset 等布局真值。
- `PAL_CompressInventory`(`global.c:1212-1250`)清理 nAmount=0 项(**removed detect zero then break code, due to incompatible with save file hacked by palmod**,global.c:1228 注释)。

### 7.2 一阶段实现

#### `packages/pal-extract/src/resources/parsers/items.ts`(全文件)
- **OBJECT_ITEM wrapper**(`parseItems`,`:65-100`):wObjectID 体系(61..294,排除 295=梦蛇);7 字段全 dump。
- **ItemFlags 拆位**(`parseItemFlags`,`:39-55`):6 bool + equipableBy[6](bit6..11)。
- **id 统一为 wObjectID**(`:62-72` 注释):2026-05-29 改;此前 0-based local id 与 opcode operand 错位 → "调查柜子获得净衣符显示断肠草"根因(`6822295f` fix)。
- **梦蛇 295 排除**(`:84` `if (id === MENGSHE_OBJ_ID) continue`)—— 法术,归 spells.json。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| OBJECT_ITEM wrapper(7 WORD) | parseItems:65-100 | ✅ |
| ITEMFLAG 拆位(6 bool + equipableBy[6]) | parseItemFlags:39-55 | ✅ |
| id = wObjectID 统一 | items.ts:62-72 + `6822295f` | ✅(C7 fix) |
| 梦蛇 295 排除 | items.ts:84 + `a7b42232` | ✅ |

**一阶段 fix 命中**:`6822295f`(wObjectID 统一)、`a7b42232`(梦蛇归位)、`9bd62318`(M3.5 schema)、`b925a769`(C5 session 4 _name 两 bug)。

### 7.3 reforge 实现

#### `packages/content/src/item.ts`(232 行)— ItemData clean-rewrite
- **ItemData**(`:48-63`):id(原版 oid 字符串)/ name / desc[](原 scriptDesc 多行)/ icon / buyPrice / sellPrice / sellable / equip?(EquipSpec)/ use?(UseSpec)/ throw?(ThrowSpec)。
- **EquipSpec**(`:50-54`):slot(EquipSlot 6 槽)/ equipableBy(角色模板 id,原 bitfield → 稳定 id)/ effects(EquipEffect[])。
- **UseSpec**(`:56-60`):target / consuming / effects(ItemUseEffect[])。
- **ItemUseEffect 联合**(`:33-46`):healHp/healMp/revive/applyStatus/removeStatus/applyPoison/curePoison/permanentStatBoost/gate/triggerScript/teleport —— **独立联合(≠ SkillEffect)**,概念重叠 + 脚本/剧情/场景类。
- **能力块可叠加**(`:48-63` 注释):菜单按能力块过滤(灵珠双重身份零特判)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| OBJECT_ITEM wrapper(7 WORD) | ItemData 数据化(无 wrapper) | ✨ 干净 |
| ITEMFLAG 拆位 | ItemData.sellable + equip?.equipableBy + use?/throw? 能力块 | ✨ 干净(bitfield → 能力块联合) |
| id = wObjectID | ItemData.id(原版 oid 字符串) | ✨ 免疫(稳定 string id) |
| 物品菜单(usableItems/equippableItems) | item.ts:177-202(灵珠穿着也能用,itemmenu.c:136-145 真值) | ✅ |

### 7.4 缺口 + 行动

- **G7-1 无缺口**:物品数据 reforge 干净数据化,迁移器正确(梦蛇排除 + wObjectID 统一)。
- **风险**:无。

---

## 审计单元 8:敌人数据(fight.c + res.c + global.h tagENEMY/tagOBJECT_ENEMY → pal-extract/enemies.ts → content/enemy.ts)

### 8.1 sdlpal C 真值

#### `tagENEMY`(`global.h:257-295`)— 详细 stats(35 WORD = 70 字节)
- wIdleFrames(0)/ wMagicFrames(2)/ wAttackFrames(4)/ wIdleAnimSpeed(6)/ wActWaitFrames(8)/ wYPosOffset(10)/ wAttackSound(12,SHORT)/ wActionSound(14,SHORT)/ wMagicSound(16,SHORT)/ wDeathSound(18,SHORT)/ wCallSound(20,SHORT)/ wHealth(22)/ wExp(24)/ wCash(26)/ wLevel(28)/ wMagic(30)/ wMagicRate(32)/ wAttackEquivItem(34)/ wAttackEquivItemRate(36)/ wStealItem(38)/ nStealItem(40)/ wAttackStrength(42,SHORT)/ wMagicStrength(44,SHORT)/ wDefense(46,SHORT)/ wDexterity(48,SHORT)/ wFleeRate(50)/ wPoisonResistance(52)/ wElemResistance[5](54/56/58/60/62)/ wPhysicalResistance(64)/ wDualMove(66)/ wCollectValue(68)。

#### `tagOBJECT_ENEMY`(`global.h:218-226`)— 5 WORD
- wEnemyID(0,指向 DATA chunk 1 ENEMY 数组,**1-based**)/ wResistanceToSorcery(2,0..10)/ wScriptOnTurnStart(4)/ wScriptOnBattleEnd(6)/ wScriptOnReady(8)。

#### `PAL_BattleMain`(`battle.c:1611-1713`)— 敌人 init + HACK patch
- `rgEnemy[i].e = lprgEnemy[rgObject[w].enemy.wEnemyID]`(:1611,直接索引,没减 1)。
- **⚠️ 复核定性(2026-07-05):下列台账整段在 `#ifndef PAL_CLASSIC`(battle.c:1619 起,#endif :1713)——非 classic ATB 模式才打**(dex 在 ATB 是计量条速率,负值/极值坏 ATB;classic 固定回合序里负 dex 走 `(SHORT)` 比较排队尾,天然成立)。**classic 口径(一阶段+reforge)不打 = 忠实**;台账另漏记两条:Fat Miao(wLevel==4&&wCash==240 → dex+=18)、Black Spider(wLevel==16&&wMagicRate==4&&wAttackEquivItemRate==4 → dex+=50);最终 boss 32760 自动满血同在此段(非 classic 专属)。
- **HACK patch 台账**(:1624-1712,仅非 classic):
  - 黑山老妖 wDexterity==164 → /= (maxIdx==0 ? 6 : 3)(:1624-1628)
  - 最终 boss wHealth==32760 → 全员满血(:1632-1641)
  - 妖刀 wDexterity==-32 → 0(姥姥刀,:1644-1646)
  - 狐妖 wDexterity==20 → level[0]<15 ? 8 : level[4]>28 ? 60(:1648-1662)
  - 蛇妖 wExp==250 && wCash==1100 → wDexterity+=12(:1663-1667)
  - 蜘蛛 wDexterity==-60 → 15(:1668-1670)
  - 石头人 wDexterity==-30 → -10(:1672-1674)
  - 僵尸 wDexterity==-16 → 0(:1676-1678)
  - 花妖 wDexterity==-20 → -8(:1680-1682)
  - 试炼洞低 level(wLevel<20 && scene 0xD8..0xE2)→ wLevel+=15, wDexterity+=25(:1684-1690)
  - 锁妖塔(scene 0x90)→ wDexterity+=25(:1691-1693)
  - 苗拳师(wLevel==2 && wCash==48)→ wDexterity+=8(:1694-1700+)

#### `PAL_CalcEnemyActionIndex` / 敌人 AI(fight.c)— 魔法 + magicRate + AttackEquivItem + AttackEquivItemRate
- 默认行为:magic + magicRate(随机掷)→ 不中则普攻;AttackEquivItem + AttackEquivItemRate(普攻附带物品效果,如喷毒)。

### 8.2 一阶段实现

#### `packages/pal-extract/src/resources/parsers/enemies.ts`(全文件)
- **tagENEMY stats**(`parseEnemies`,`:79-130`):35 WORD 全字段 dump;**signed modifier**(`getInt16`)attackStrength/magicStrength/defense/dexterity(`:106-109`,sdlpal fight.c:4634 `(SHORT)` 真值);5 SHORT 声音字段 signed(`:99-103`)。
- **elemResistance[5]** 拆 wind/thunder/water/fire/earth 5 具名字段(`:111-117`)。
- **id = chunk 1 数组索引**(= sdlpal `OBJECT_ENEMY.wEnemyID` 指向位置,直接索引,没减 1;`:65-69` 注释)。
- **parseEnemyObjects**(`:171-198`):dump OBJECT_ENEMY 段(398..550,153 条)5 字段;`objectIndex` = OBJECT 表绝对 index。
- **buildObjectIndexToEnemyIdMap**(`:248-269`):反向 OBJECT 绝对 index → wEnemyID;M3.30 Bug 1 修复(enemy-teams.json 之前 dump OBJECT 绝对 index 398-550,运行时 enemies.find 全 miss)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| tagENEMY(35 WORD / signed modifier) | parseEnemies:79-130 | ✅(D28 全字段 + signed) |
| tagOBJECT_ENEMY(5 WORD) | parseEnemyObjects:171-198 | ✅ |
| elemResistance[5] 具名 | enemies.ts:111-117 | ✅ |
| enemyId 直接索引(没减 1) | enemies.ts:65-69 | ✅ |
| enemy-teams.json OBJECT→id 翻译 | buildObjectIndexToEnemyIdMap:248-269(M3.30 Bug 1) | ✅ |
| 反向 _name | buildEnemyObjectNameMap:218-243 | ✅ |
| 战斗 HACK patch(battle.c:1624-1712) | 未打 —— 非 classic 专属(#ifndef PAL_CLASSIC),一阶段 classic 口径有意不打 | ✅ 复核关闭(2026-07-05) |

**一阶段 fix 命中**:`aedfa733`(全字段 dump)、D28(signed modifier)、M3.30 Bug 1(enemy-teams 翻译)。

### 8.3 reforge 实现

#### `packages/content/src/enemy.ts`(119 行)— EnemyDef + EnemyAI
- **EnemyDef**(`:96-118`):id(enemy-<objectIndex>)/ name(TextId)/ spriteNum / stats(EnemyStats)/ ai(EnemyAI)/ anim(EnemyAnim)/ sounds(EnemySounds)/ steal?/ attackEquivItem?/ choreography?[]/ onDefeated?[]。
- **EnemyStats**(`:18-37`):health/level/exp/cash/attackStrength/magicStrength/defense/dexterity/fleeRate/physicalResistance/poisonResistance/elemResistance(ElementVec)/dualMove/collectValue。
- **EnemyAI**(`:39-49`):resistanceToSorcery(0-10;0x2E `rng(0,9) >= 此`,10 = 完全免疫,**≥ 跟原版后期修复,非 sdlpal buggy >**)+ rules?(AiRule[])。
- **EnemyAnim**(`:51-58`):idleFrames/magicFrames/attackFrames/idleAnimSpeed/actWaitFrames/yPosOffset。
- **EnemySounds**(`:60-66`):attack/action/magic/death/call(SFX 号;0=无)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| tagENEMY(35 WORD) | EnemyStats + EnemyAnim + EnemySounds(拆 3 块) | ✨ 干净(语义分组) |
| tagOBJECT_ENEMY(5 WORD) | EnemyAI(resistanceToSorcery)+ choreography/onDefeated(script 翻译) | ✨ 干净(scriptOnTurnStart/OnReady → AiRule/script Command) |
| signed modifier(attackStrength 等) | EnemyStats(number;signed 语义保留) | ✅ |
| elemResistance[5] | EnemyStats.elemResistance(ElementVec) | ✅ |
| enemyId 索引 | EnemyDef.id(enemy-<objectIndex>稳定 string) | ✨ 免疫 |
| **战斗 HACK patch(battle.c:1624-1712)** | **不烘焙 = 正确**(非 classic 专属;classic 负 dex 由 asShort+排序天然处理) | ✅ 复核关闭(2026-07-05) |
| resistanceToSorcery ≥ 修复 | EnemyAI.resistanceToSorcery 注释明示 ≥ | ✅(修原版 buggy >) |

### 8.4 缺口 + 行动

- **G8-1 战斗 HACK patch 台账未烘焙(高危)**:sdlpal 在 `PAL_BattleMain`(battle.c:1624-1700)对 12 类敌人做 wDexterity/wLevel/wHealth 运行时 patch(黑山老妖/狐妖/蛇妖/蜘蛛/石头人/僵尸/花妖/试炼洞低 level/锁妖塔/苗拳师/最终 boss)。**reforge 无运行时加载层可 patch**(per harvest MG-2/3),必须在 migrate 翻译期**烘焙**到 EnemyDef.stats。**行动**:migrate 阶段识别这些 enemy(按 wDexterity/wExp/wCash/scene 组合判别)→ 直接改 stats.wDexterity/wLevel;或加 EnemyDef.`patches: {scene?: number, level?: number, modify: ...}[]`(条件 patch)。**风险**:高(战斗平衡全偏;黑山老妖 wDexterity 164 不 patch → 单人队几乎打不过)。
- **G8-2 attackEquivItem**(普攻附带物品效果):EnemyDef.attackEquivItem 定义(`:114`),但运行时战斗侧未消费。**风险**:中(喷毒等普攻附效目前无效)。

---

## 9 大优先风险核实清单(作者点名)

| # | 风险 | sdlpal 真值 | 一阶段 | reforge | 核实结论 |
|---|---|---|---|---|---|
| 1 | per-role HP 全局耦合 | `rgwHP[roleId]`(global.h:303) | PlayerRolesRuntime.rgwHP[roleId] 继承耦合 | CharacterInstance.hp 在实例上 + party 是引用列表 | ✅ **已免疫**(character.ts:71;无 roleId 下标) |
| 2 | rgwName 3=巫后 4=阿奴对调 | rgwName=[36,37,38,40,39,41](原版数据) | player-roles.ts:240-243 按 rgwName 取名 + `ddb28d07` | 稳定 string id + TextId | ✅ **reforge 免疫**;**迁移器正确处理**(pal-extract/player-roles.ts:240 已 fix) |
| 3 | PlayerRolesRuntime vs staticRoles 双轨 | 单一 PlayerRoles(战内直接读写) | projectRuntimeToBattleRoles + writeBackBattleRolesToRuntime 三套副本 | 单一 CharacterInstance(无投影/回写) | ✅ **已免疫**(character.ts;战斗直接读实例) |
| 4 | 装备 effect 累加 vs override | 6 累加(global.c:1736-1935)+ 3 override(global.c:1970-2078) | equip-effect.ts:24-67(6 累加)+ game-state.ts:1577-1592(3 override)+ `8b541469` | effectiveStat 只 statBonus;attackAll/grantSkill/maxPool 定义未消费 | ⚠️ **部分**(item.ts:77 注释明示 phase3;**当前长鞭/圣灵珠/土灵珠无效**) |
| 5 | 卸装清授出状态/毒 | PAL_RemoveEquipmentEffect Hand→DualAttack / Wear→poison99(global.c:1406-1454) | equip-effect.ts:266-310 + `ddba7bfa`/`9b6feb86` | equipItem 只换槽位不清状态 | ❌ **缺口**(item.ts:140-165;**迁移仙女剑/寿葫芦必撞**) |
| 6 | 隐藏经验 CHECK_HIDDEN_EXP | battle.c:1226-1293 宏 | applyHiddenExpGrowth:3321-3360 + `cdd17654` | applyHiddenExp:80-105(rewards.ts) | ✅ **已 port**(7 池/R(1,2)/无 cap/WORD 截断全真值) |
| 7 | 升级 maxHP 随机成长 | PAL_PlayerLevelUp maxHP+=10+R(0,7)(global.c:2378) | battle-system.ts + `9c744889` | rewards.ts:131 `c.maxHP + 10 + r(0, 7)` | ✅ **已 port**(7 项全 R 真值 + cap 999) |
| 8 | 梦蛇 object 295 | 法术名落 item word 段末位(61..295) | pal-extract/_utils.ts:20-26 MENGSHE_OBJ_ID=295;spells.ts:144-148 追加;items.ts:84 排除 | 走 spells.json(spells.json 统一) | ✅ **迁移器正确**(items.json 排除 + spells.json 追加;`a7b42232` fix) |
| 9 | EntityDef 二选一(actor/prop)免疫下标式身份 | EVENTOBJECT 身份=全局下标 wEventObjectID | event-system.ts 沿用下标(E1) | EntityRef = {actor} \| {sprite} \| {zone}(index.ts:72) | ✅ **已免疫**(actor.ts:60-70 isActorEntity/resolveEntitySpriteId) |

---

## 10 行动清单(按风险排序)

### P0 高危(玩法 broken)

1. **G4-1 卸装清状态/毒**:`equipItem` 补"卸旧件前清 grantStatus / Wear 槽 level-99 毒"。落地仙女剑/寿葫芦前必做。
2. **G8-1 战斗 HACK patch 烘焙**:migrate 翻译期识别 battle.c:1624-1700 的 12 类敌人 patch → 烘焙到 EnemyDef.stats(或加条件 patch 字段)。接战斗平衡前必做。
3. **G3-1 跟随者渲染**:移植 `follower-pos.ts` + `follower-render.ts` + 11 case oracle。接船/骑乘剧情前必做。

### P1 中危(部分功能缺失)

4. **G4-2 attackAll/grantSkill/maxPool/grantStatus/resistance 运行时未消费**:补全各查询点的 effect 消费(查询时现算,非物化重建——见 §4.4 ★ 设计判断)。
5. **G4-3 查询点未覆盖**:grep reforge 所有读 maxHP/属性/抗性/状态/skills 的点,确认走 effectiveXxx 纯函数而非裸读基线(漏一处 = 装备该属性失效)。
6. **G1-1 autoLoop 候选不自动**:C1 编辑器帧标注工具消费候选清单 → 产 loop 布局。
7. **G8-2 attackEquivItem 运行时未消费**:战斗侧普攻附效(喷毒)。

### P2 低危(工程化/语义等价)

8. **G5-1 rng 确定性**:若需 deterministic replay,注入种子 rng。
9. **G6-1 SkillAnimation 简化**:若法术演出需 wave,补字段。
10. **G1-2 item/spell 上下文 self=role id 二义性**:host 落地时显式判别。
11. **G2-2 多人 party 实例 id 约定**:多人落地时定 key 约定。

---

## 附录 A:已交叉验证的 git fix 锚点

| commit | 单元 | 内容 |
|---|---|---|
| `ddb28d07` | 2 角色数据 | rgwName 3/4 对调修(巫后/阿奴名字颠倒) |
| `e70f9724` | 2 角色数据 | 战内 0x19/0x1A 加成回灌战斗工作副本(镇狱明王) |
| `cd18d296` | 2 角色数据 | GameState 全字段冻结(SAVEDGAME_WIN 倒推) |
| `aedfa733` | 2/8 角色数据/敌人 | PlayerRoles/Enemy 全字段 dump(此前 skip 11 个) |
| `0dfc71b7` | 3 跟随者 | 0x15 operand[2] 点名单员(不全队同步) |
| `8bbbdecc` | 3 跟随者 | 初版误同步全队(回退) |
| `e1b568cb` | 3 跟随者 | 朝向源 trail[2].dir(非冻结朝向) |
| `a47334a1` | 3 跟随者 | 0xA1 重叠 {0,-1} + 0x46 摆位 trail[m] |
| `09ba1e04` | 1/3 实体/跟随者 | nSpriteFramesAuto 装载回填(血池根因) |
| `5d256f8f` | 1 实体 | autoScript 0x06 fall back |
| `bb388ecf` | 1 实体 | autoScript 0x04/0x06 专用语义 |
| `9367efc6` | 1 实体 | touchFar suppressAutoTriggerOnce(李大娘死锁) |
| `c4e23736` | 4 装备 | 0x18 真做 swap(换不了装备) |
| `38016785` | 4 装备 | 换装面板 swap loop 对齐 + DL11 原位替换 |
| `8b541469` | 4 装备 | 补三 override(attackAll/sprite/coopMagic) |
| `ddba7bfa` | 4 装备 | 0x2D 授状态(仙女剑 DualAttack) |
| `9b6feb86` | 4 装备 | 0x29 授毒(寿葫芦 level-99) |
| `9c744889` | 5 升级 | D11 战斗胜利升级(阈值循环 + PAL_PlayerLevelUp + 满血 + 学法术) |
| `cdd17654` | 5 升级 | E04-b applyHiddenExpGrowth(CHECK_HIDDEN_EXP 分配公式) |
| `7ed5438c` | 5 升级 | E04-d 隐藏属性涨点结算屏 box |
| `67f5949b` | 5 升级 | B7c 隐藏经验系统(战斗行为养成) |
| `a7b42232` | 6/7 技能/物品 | 梦蛇(295)归位 spells.json(修仙术菜单说明为空) |
| `6822295f` | 7 物品 | item/spell id 统一为 sdlpal wObjectID(修"获得净衣符显示断肠草") |
| `9bd62318` | 7 物品 | M3.5 Item schema + parser(OBJECT 索引 61-295) |
| `57a4c5b0` | 2 角色数据 | M3.8 PlayerRoles 完整 dump |
| `a87d0748` | 2 角色数据 | 队长 sprite=2(实查 DATA.MKF chunk 3) |

---

## 附录 B:审计方法论备注

- **三源交叉**:每条结论来自 ① sdlpal C 真值(行号)② 一阶段 .ts 实现(行号 + git fix 锚点)③ reforge .ts 实现(行号)。孤立来源标"未交叉验证"(本次无)。
- **状态图例严格**:✅ 三源对齐 / ⚠️ 部分偏离(语义对但缺字段或运行时未消费)/ ❌ 缺失(原版有 reforge 无)/ ✨ 新架构免疫(用 reforge 范式重做后该坑不存在)。
- **行号口径**:本审计读取时 HEAD `7422874a` 真值;后续 commit 若改文件,行号需重对(但函数名/语义锚稳定)。
- **未覆盖**:战斗侧敌人 AI 求值(`enemy-ai.ts` `decideByRules`)、合击法术(`coop-magic`)、投掷物品(`throw-item`)在战斗领域专项审计已覆盖,本文不重复。
