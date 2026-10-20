# 中毒机制 + 战斗头像颜色 实现规划(2026-05-31)

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-19
Template: plan-status-v1 / 1.0.0

本页是中毒机制与战斗头像颜色实现规划的归档重写。sdlpal 真值出处、ts 现状缺口与三批次实现方案在下方 quote 逐字节保全；本页只做历史边界与模板接入，不授当前实现信用。

## 目标与时间范围

- 目标（user 指令原文）：实现中毒机制（投掷毒/法术中毒/4 基础+7 高级毒/抗性）+ 战斗头像颜色（中毒染色+死亡黑白）。
- 时间范围：2026-05-31 规划，先完成 opcode 审计与文档修正（55d52cc）再实施。

## 里程碑

- 真值预读完成：毒 OBJECT 结构（global.h:209-217 poison union）、应用毒（script.c:1185-1230 0x28）、cure（script.c:1071/1091 CurePoisonByLevel(role,3)）、头像色（uibattle.c:114-162 PAL_PlayerInfoBox face）；数据已 plumb 无需重新提取。
- 三批次方案：①核心毒 runtime（setObjectPoisons 注入、0x29 加抗性、存真 scriptEntry、玩家毒 tick）②战斗状态/毒 opcode（0x2A/0x2E/0x2D/0x2F/0x61 fix）③头像色（drawPlayerInfoBoxes 读 rgPoisonStatus → bPoisonColor → blitSpriteMonoColor 重染）。

## 当前状态

- historical：执行顺序由 user 确定（审计→实现），poison/status opcode bug 随批次 1-2 修；实现进度按当时主线推进。

## 阻塞与决策

- 理解 workflow（wnt5uzmt7）关键修正记入 quote（2026-05-31），防止按错误假设实现。

## 下一步

- 历史时点规划；当前毒机制与头像行为以现行代码、[magic-status](../status/magic-status.md)/[item-status](../status/item-status.md) 与 game-mechanics 真值为准。

## 历史范围

- phase1 plans 实现规划；时点 2026-05-31；固定来源与 source SHA 见下方保全节。

## 原始结论

- 三批次方案与真值出处清单为原始结论本体。

## 当时证据

- sdlpal 行号引用、数据 plumb 声明与 workflow 修正在 quote 保全。

## 当前有效性

- historical。规划按当时缺口写成；当前毒公式条目按状态表规则作专题真值。

## 继任文档

- [magic-status](../status/magic-status.md)、game-mechanics 与现行毒相关测试；[目录导航](README.md)。

## 原文保全

固定源 revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，source SHA `d6cdfbd33a3ccaede59411873aff3e9902ac08c2297e8e746a299fb8f317c40b`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # 中毒机制 + 战斗头像颜色 实现规划(2026-05-31)
>
> > user 指令:审计完更新文档后,实现中毒机制(投掷毒/法术中毒/4 基础+7 高级毒/抗性)+ 战斗头像颜色(中毒染色 + 死亡黑白,我之前漏的)。
>
> ## sdlpal 真值出处(已预读)
>
> ### 毒 OBJECT 结构(global.h:209-217 poison union)
> - `wPoisonLevel` 毒等级(头像色只认 ≤3)
> - `wColor` 中毒头像染色(palette index)
> - `wPlayerScript` 玩家中毒每回合脚本
> - `wEnemyScript` 敌人中毒每回合脚本
> - 抗性:`enemy.wResistanceToSorcery`(global.h:203,0 min 10 max,抗法术+毒)
>
> ### 数据已 plumb(无需重新提取)
> - `data/extracted/data/object-poisons.json`(565 OBJECT)+ `ObjectPoisonView`(tables.ts:160)已含 `id/level/color/playerScript/enemyScript`。
> - 真毒 object 约 id 551-560(level 0-3 + color + 双脚本)→ 4 基础(level≤?)+ 7 高级。**实现时按 0x28/throw/spell 实际引用精确锚定**(避免 union 字段误判,565 里很多非毒 object 的其它 union 字段非零)。
>
> ### 头像色(uibattle.c:114-162 PAL_PlayerInfoBox face)
> ```
> bPoisonColor = 0xFF
> for each MAX_POISONS(16) 毒槽 of 该队员:
>   w = rgPoisonStatus[i][partyIndex].wPoisonID
>   if w!=0 && rgObject[w].poison.wPoisonLevel <= 3:
>     if level >= wMaxLevel: wMaxLevel=level; bPoisonColor = poison.wColor   # 最高 level 毒的色赢
> if rgwHP[role]==0: bPoisonColor = 0    # 死亡强制黑白 mono + 无 time meter
> 渲染: bPoisonColor==0xFF → 正常 PAL_RLEBlitToSurface(满色)
>       else → PAL_RLEBlitMonoColor(face, ..., bPoisonColor, 0)  # 单色 mono 重染
> ```
> → ts `drawPlayerInfoBoxes`(present/battle/draw-battle-ui.ts)需:① 读队员毒状态算 bPoisonColor ② mono 重染 blit(头像精灵按单 palette index 重画)。需 mono-blit helper。
>
> ### 应用毒(script.c:1185-1230,0x28)
> - 敌人:`if RandomLong(0,9) >= enemy.wResistanceToSorcery` → 找空毒槽加 {wPoisonID, wEnemyScript}。
> - 玩家版同构(用 player resistance — 待查 PAL_AddPoisonForPlayer 真值)。
>
> ### cure(script.c:1071/1091 CurePoisonByLevel(role,3))
> - 现 ts "简版全清";数据已有 level → 可改按 level 过滤(虽 maxLevel=3 时全清等价,但 maxLevel=1 治毒丹要部分清)。
>
> ## ts 现状缺口
> | 处 | 现状 | 待做 |
> |---|---|---|
> | 0x28 apply poison(敌) | ✅ 有 resistance 检查 | 复核 |
> | 0x29 poison-player | 简版:**无抗性检查**直接加(event-system 3495) | 加 player resistance |
> | 0x61 jumpIfPlayerNotPoisoned | **bug:恒跳**(battle-opcodes 927) | 读真实 player 毒状态 |
> | cure 0x22/0x5D/D15/D21 | 简版全清 | 按 level 过滤(数据已有) |
> | 头像色 | **完全没画** | drawPlayerInfoBoxes mono 重染(中毒色 + 死亡黑白) |
> | 玩家战斗内中毒 tick | ? | 每回合跑 wPlayerScript(对照敌 tick) |
> | 投掷毒 | E2 throw 部分(0x28) | 复核全链 |
> | 法术中毒 | ? | spell scriptOnUse 0x28/0x29 |
>
> ## 理解 workflow(wnt5uzmt7)关键修正(2026-05-31)
>
> - **真毒 12 个**:object id 551-562。基础 4(551 L0c16 / 552 L1c64 / 553 L1c33 / 554 L2c224)+ 高级 8(555-560 L3 各色 / 561-562 L4 c0 仅 enemyScript)。**数据驱动,数量自动适配**(user 说 7 高级 ≈ 555-561 有 player 效果的)。
> - **玩家中毒 = opcode 0x29**(非 0x28!0x28=敌人毒)。抗性 `poisonResistance` **0-100** scale,判定 `RandomLong(1,100) > resist`(敌人 0x28 用 wResistanceToSorcery 0-10,`RandomLong(0,9) >= resist`)。
> - **cure 玩家毒 = 0x2B(byKind)/ 0x2C(byLevel)**;cure 敌人毒 = 0x2A(byKind,battle)。
> - 玩家毒存**全局 `gs.rgPoisonStatus[`${slot}_${role}`]`**(持久,16 槽/role);`{wPoisonID, wPoisonScript}`,wPoisonScript = obj.playerScript。
> - **每回合玩家毒 tick**(fight.c:1670-1697,PAL_BattleStartFrame action queue 耗尽时):遍历队员每毒槽跑 wPlayerScript(target=该队员 role)+ 状态 -1 衰减。**ts 缺**(敌毒 tick 在 tickPostAction 有,玩家没)。
> - **已有 helper**:`getPlayerPoisonResistance`(equip-effect.ts:75)、`curePlayerPoisonByKind/ByLevel`(event-system)。`poisonResistance` 字段已在 PlayerRole(tables.ts:303)。`objectPoisons`(ObjectPoisonView level/color/playerScript/enemyScript)已 plumb 进 BattleResources/loader。
> - **注入**:event-system 用模块级 `set*` pattern → 加 `setObjectPoisons` 供 applyRawOpcode 0x29/cure 取 scriptEntry+level。
>
> ## 全部中毒**施加**路径(user 2026-05-31 补充,别遗漏)
>
> 1. **投掷毒**:毒物品 scriptOnThrow → 0x28(敌)/ 0x29(我方)。performThrowItem,cde56f2 后脚本控制流通。
> 2. **法术/技能中毒(双向)**:skill scriptOnUse/Success → 0x28 毒敌 / 0x29 毒我方。performMagic,经 dispatchBattleOpcode(0x28)+ applyRawOpcode fall(0x29)。
> 3. **敌人普通攻击中毒**(fight.c:5139-5146):敌物理命中(`iCoverIndex==-1 && !fAutoDefend`)→ `attackEquivItemRate >= RandomLong(1,10)` && `poisonResistance < RandomLong(1,100)` → 跑 `rgObject[attackEquivItem].item.wScriptOnUse`(target=被打队员)→ 等价毒物品脚本 0x29 中毒。**ts attack.ts 敌→我 分支需补此段**;enemies.json 已有 attackEquivItem/attackEquivItemRate;equiv-item scriptOnUse 经 runScript(battle)。
>
> ## 实现批次(TDD,逐批 commit)
>
> 1. **核心毒 runtime**:setObjectPoisons 注入 + 0x29 加抗性 + 存真 scriptEntry(playerScript)+ curePlayerPoisonByLevel 用真 level + tickPostAction 加玩家毒 tick。
> 2. **战斗状态/毒 opcode**:0x2A cure-enemy-kind(dispatchBattleOpcode)/ 0x2E set-enemy-status(抗性+jump)/ 0x2D set-player-status / 0x2F remove-player-status / 0x61 fix(op[0]+isPlayerPoisoned)。
> 3. **头像色**:drawPlayerInfoBoxes 读 gs.rgPoisonStatus + objectPoisons → bPoisonColor(最高 level≤3 色 / 死亡 0 / 默认 0xFF)→ blitSpriteMonoColor 重染(复用现有 helper)。
>
> ## 执行顺序(user 定)— 已完成审计 + 文档
> 1. ~~opcode 审计 → opcode-status.md 修正~~ ✅(55d52cc)。
> 2. 实现中毒机制 + 头像色(本文档批次 1-3)。poison/status bug(0x2A/2D/2E/2F/61)随批次 1-2 修。
<!-- original-source-quote:end -->
