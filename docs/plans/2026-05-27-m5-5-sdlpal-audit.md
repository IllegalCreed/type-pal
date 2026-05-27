# M5.5 · sdlpal 全源 audit(deviation report)

**Goal:** 对 reference/sdlpal 全 46 个 .c 源逐文件 / 逐函数审计,与 type-pal ts port 1:1
对照,产 deviation 列表 + follow-up task。**audit 不实现 — 实现留 M6+。**

**Format:** 每文件一节,列已 port 函数 / 未 port 函数 / ts 与 sdlpal 差异 / 实施
follow-up。文件按 game logic 相关性优先级排序。

## 优先级

### Tier 1(game 核心逻辑,已大量 port)
- scene.c — 探索物理 / 渲染遮挡(P0 期间审过)
- play.c — PartyWalk / UpdateParty
- script.c — opcode interpreter(100+ case)
- battle.c — ActionQueue / BattleStart / BattleWon
- fight.c — PerformAction / 升级公式
- global.c — LOAD_DATA / SAVEDGAME

### Tier 2(UI / 数据加载,部分 port)
- res.c / map.c / text.c / font.c — 资源解码 / 文本渲染
- input.c — 输入
- itemmenu.c / magicmenu.c / uigame.c / uibattle.c — 菜单(M 股做了 state machine 等价)

### Tier 3(低优先 — 渲染底层 / 音频 / 配置)
- video.c / video_glsl.c / glslp.c / overlay.c / mini_glloader.c / aviplay.c / palette.c
- audio.c / mp3play.c / oggplay.c / opusplay.c / midi*.c / resampler.c / rngplay.c / sound.c
- palcfg.c / palcommon.c / paldebug.c / ending.c / game.c / main.c / util.c

---

---

## sdlpal 自身 bug / 设计缺陷(audit 过程发现)

> 这些是 sdlpal C 代码本身的 bug / 边界 case,ts port 时应避免重蹈,或显式 fix。

### Bug-1:`PAL_BattleSelectAutoTarget` 死循环(fight.c:4500-4517)

```c
i = RandomLong(0, g_Battle.wMaxEnemyIndex);
while (g_Battle.rgEnemy[i].wObjectID == 0 || g_Battle.rgEnemy[i].e.wHealth == 0)
{
   i = RandomLong(0, g_Battle.wMaxEnemyIndex);
}
return i;
```

**问题**:如果所有 enemy 全死(wObjectID 全 0 / wHealth 全 0),这是**无退出 while**。
理论上 PAL_BattleWon 在 enemy 全死时触发,不会进入此函数 — 但如果某些 magic /
script 在 enemy 死后这一帧内还调到 SelectAutoTarget(竞态),死循环卡死。

**ts port 处理**:加 safety break(最多重试 N=g_Battle.wMaxEnemyIndex+1 次,失败返回 -1
让 caller fallback Pass action)。

### Bug-2:`PAL_BattleStealFromEnemy` 无 dead target 检查(fight.c:5193+)

```c
PAL_BattleStealFromEnemy(WORD wTarget, WORD wStealRate)
{
   // ... 直接用 wTarget 索引 rgEnemy:
   x = PAL_X(g_Battle.rgEnemy[wTarget].pos) + 64 - offset;
   y = PAL_Y(g_Battle.rgEnemy[wTarget].pos) + 22 + offset;
   // ... iColorShift = 6,然后 try steal item
}
```

**问题**:R 重复键 carry over prevAction(line 1857-1860 复用 prevAction.ActionType 但
让 sTarget 重选)。如果 prevAction = 飞龙探云手(steal magic),validate 走 magic
case(line 3286+),fToEnemy 标志可能未设 → line 3500 dead check 跳过 → wTarget
保留死敌 0 → 偷死敌时 anim 播放到死敌位置(视觉异常),`g_Battle.rgEnemy[0].e.wHealth`
可能 underflow 到 65504(sentinel),steal item check 拿空槽位 item。

**用户原话报的现象**:R 重复 + 上轮目标已死时,飞龙探云手等偷盗类技能异常行为。

**ts port 处理**:在 PerformAction 入口加 target alive check(`if (target.health <= 0)
auto-reselect via SelectAutoTarget()` + Bug-1 的 safety break);或在 R 重复 validate
prevAction.sTarget 时就直接 reselect target,不让 dead target 进入 action handler。

---

## 全 448 函数 audit 总览

> 自动 keyword grep 结果:**363 个 sdlpal 函数 ts code 完全无对应 keyword**(81%);
> **82 个有 keyword match,需逐个手工核**。下面是按文件分组的详细 audit 表
> — 每个函数一行,4 列状态:
>
> - ✓ 真 port(ts 路径有对应实现)
> - ⚠️ 简版 port / 差异(具体说明)
> - ✗ 未 port(by design 用 web API 替代 或 follow-up 未做)
> - N/A 不需 port(sdlpal 内部 helper / debug / GL pipeline 等)
> - ? 自动 grep 有 keyword match,**待手工核**

正在逐文件填,初始批量自动状态(grep keyword 在 ts code 内是否出现)在
[`/tmp/audit-state/funcs.tsv`](file:///tmp/audit-state/funcs.tsv);本文档为
权威版本,初始批量结果会被人工核审覆盖。

### audio.c(19 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 44 | `AUDIO_MixNative` | ✗ | _待审_ |
| 65 | `AUDIO_AdjustVolume` | ✗ | _待审_ |
| 81 | `AUDIO_FillBuffer` | ✗ | _待审_ |
| 169 | `AUDIO_CD_Available` | ✗ | _待审_ |
| 177 | `AUDIO_OpenDevice` | ✗ | _待审_ |
| 381 | `AUDIO_CloseDevice` | ✗ | _待审_ |
| 442 | `AUDIO_GetDeviceSpec` | ✗ | _待审_ |
| 450 | `AUDIO_ChangeVolumeByValue` | ✗ | _待审_ |
| 464 | `AUDIO_IncreaseVolume` | ✗ | _待审_ |
| 491 | `AUDIO_DecreaseVolume` | ✗ | _待审_ |
| 518 | `AUDIO_PlaySound` | ? | _待审_ |
| 547 | `AUDIO_PlayMusic` | ✗ | _待审_ |
| 576 | `AUDIO_PlayCDTrack` | ✗ | _待审_ |
| 639 | `AUDIO_EnableMusic` | ✗ | _待审_ |
| 647 | `AUDIO_MusicEnabled` | ✗ | _待审_ |
| 655 | `AUDIO_EnableSound` | ✗ | _待审_ |
| 663 | `AUDIO_SoundEnabled` | ✗ | _待审_ |
| 671 | `AUDIO_Lock` | ✗ | _待审_ |
| 679 | `AUDIO_Unlock` | ✗ | _待审_ |

### aviplay.c(9 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 111 | `PAL_ReadAVIInfo` | ✗ | _待审_ |
| 411 | `PAL_ReadDataChunk` | ✗ | _待审_ |
| 471 | `PAL_AVIFeedAudio` | ✗ | _待审_ |
| 502 | `PAL_AVIInit` | ✗ | _待审_ |
| 510 | `PAL_AVIShutdown` | ✗ | _待审_ |
| 518 | `PAL_RenderAVIFrameToSurface` | ✗ | _待审_ |
| 643 | `PAL_PlayAVI` | ✗ | _待审_ |
| 776 | `AVI_FillAudioBuffer` | ✗ | _待审_ |
| 806 | `AVI_GetPlayState` | ✗ | _待审_ |

### battle.c(22 函数)

> 大部分是战斗渲染层(SpriteObject 管理 + draw),ts 端 present/battle/ 简版接管;
> 核心逻辑(BattleWon / StartBattle)已 port。

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 34 | `PAL_BattleDrawBackground` | ⚠️ | present/battle/draw-battle-bg.ts(M3 T25 简版,无 wave/cycle 动画)|
| 86 | `PAL_BattleDrawEnemySprites` | ⚠️ | present/battle/draw-battle-sprites.ts(简版,无 ColorShift 死敌效果)|
| 143 | `PAL_BattleDrawPlayerSprites` | ⚠️ | 同上 |
| 216 | `PAL_BattleDrawMagicSprites` | ✗ | magic 特效 sprite(B-w3.b follow-up,FIRE/RGM/RNG sprite sheet)|
| 248 | `PAL_BattleClearSpriteObject` | N/A | sdlpal 内部 SpriteObject 数组管理,ts 用 entries 数组 + JS GC |
| 272 | `PAL_BattleSpriteAddUnlock` | N/A | 同上 |
| 282 | `PAL_BattleAddSpriteObject` | N/A | 同上 |
| 330 | `PAL_BattleRemoveSpriteObject` | N/A | 同上 |
| 361 | `PAL_BattleAddFighterSpriteObject` | N/A | 同上 |
| 409 | `PAL_BattleSortSpriteObjecByPos` | ✓ | present/battle/present-battle.ts entries 按 baseY sort(等价)|
| 473 | `PAL_BattleDrawAllSprites` | ⚠️ | present-battle.ts:presentBattleFrame(简版,无 colorShift / hiding mask)|
| 505 | `PAL_BattleDrawAllSpritesWithColorShift` | ✗ | 死敌 / 中毒 / 高亮 colorShift 效果;follow-up |
| 565 | `PAL_BattleMakeScene` | ⚠️ | present-battle.ts 等价 — 调 DrawBackground + DrawAllSprites + UI;简版无 wave 等 |
| 609 | `PAL_BattleFadeScene` | ✗ | 战斗入场 fade;follow-up M6 体验 |
| 685 | `PAL_BattleMain` | ⚠️ | battle-system.ts:tickBattle(异步 raf 循环驱动 vs sdlpal 同步 frame loop;逻辑等价)|
| 807 | `PAL_FreeBattleSprites` | N/A | JS GC |
| 856 | `PAL_LoadBattleSprites` | ⚠️ | assets/loader.ts 内一次 fetch battle sprites(无 per-enemy lazy load) |
| 949 | `PAL_LoadBattleBackground` | ✓ | assets/loader.ts:battleBgs fetch |
| 991 | `PAL_BattleWon` | ⚠️ | battle-system.ts:finalizeBattle won 分支(B-w1.c expGained 入 gs.Exp.rgPrimaryExp + dwCash);**未做 levelup loop while dwExp >= rgLevelUpExp[level]**(B-w1.c follow-up)+ 4 段视觉 box 未做(M6 UI)|
| 1376 | `PAL_BattleEnemyEscape` | ✗ | enemy 主动逃跑(BOSS script 触发);ts 端 opcode 0x69 stub,完整 anim follow-up |
| 1438 | `PAL_BattlePlayerEscape` | ⚠️ | actions/flee.ts:performFlee(fleeRate vs enemy.dex 简版 RNG;sdlpal 真值含 BOSS 不许逃 + party 全员 fleeRate 综合)|
| 1531 | `PAL_StartBattle` | ✓ | battle-system.ts:startBattle(buildBattleState + 入 mode='battle' + emit battleStarted)|

### ending.c(5 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 27 | `PAL_EndingSetEffectSprite` | ✗ | _待审_ |
| 49 | `PAL_ShowFBP` | ✗ | _待审_ |
| 153 | `PAL_ScrollFBP` | ✗ | _待审_ |
| 282 | `PAL_EndingAnimation` | ✗ | _待审_ |
| 396 | `PAL_EndingScreen` | ✗ | _待审_ |

### fight.c(36 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 29 | `PAL_IsPlayerDying` | ⚠️ | inline 在 actions handlers / formulas 内,无独立 helper;hp < maxHp/5 阈值未严格统一 |
| 52 | `PAL_IsPlayerHealthy` | ✗ | 未独立 helper;ts code grep 无引用,follow-up 需要时按 sdlpal "全 status 0 + hp > maxHP/5" 真值加 |
| 79 | `PAL_BattleSelectAutoTarget` | ✗ | 含 Bug-1 死循环;ts decideEnemyAction 用 RNG 选 alive enemy,需补 sdlpal 真值 + safety break |
| 87 | `PAL_BattleSelectAutoTargetFrom` | ✗ | 同上;follow-up B-w2.a 接 wScriptOnReady 时用 |
| 131 | `PAL_CalcBaseDamage` | ✓ | formulas.ts:calcBaseDamage(fight.c:131-171 真值,3 分支 atk>def/def*0.6/etc) |
| 174 | `PAL_CalcMagicDamage` | ✓ | formulas.ts:calcMagicDamage(5 元素 + 抗 + fieldEffect + poison 完整 port,B-w1.b)|
| 253 | `PAL_CalcPhysicalAttackDamage` | ✓ | formulas.ts:calcPhysicalAttackDamage(resist != 0 除法 + 防 div by zero)|
| 289 | `PAL_GetEnemyDexterity` | ✓ | formulas.ts:getEnemyDexterity((level+6)*3 + dex(SHORT))|
| 336 | `PAL_GetPlayerActualDexterity` | ✓ | formulas.ts:getPlayerActualDexterity(haste*3 + 999 clamp,M3 classic 路径)|
| 395 | `PAL_UpdateTimeChargingUnit` | N/A | ATB 路径(D39 classic 不 port) |
| 427 | `PAL_GetTimeChargingSpeed` | N/A | ATB 路径(D39) |
| 469 | `PAL_BattleDelay` | ✗ | 战斗 anim 帧延迟(渲染);ts 端 battle anim 简版 FloatingNums 等,follow-up |
| 561 | `PAL_BattleBackupStat` | ✗ | 备份 stat 给 BattleDisplayStatChange 算变化;ts BattlePlayer.prevHp/prevMp 等价 |
| 603 | `PAL_BattleDisplayStatChange` | ⚠️ | ts FloatingNumsLayer 显伤害数字 — 简版,无 sdlpal 完整 stat box anim |
| 719 | `PAL_BattlePostActionCheck` | ✗ | 每 action 后检 enemy 死亡 / poison tick / status;ts 在 advance 内 inline 简版,需 audit M6 |
| 916 | `PAL_BattleUpdateFighters` | ✗ | ATB 路径为主(classic 简化);ts 端 advance 内 inline |
| 1023 | `PAL_BattlePlayerCheckReady` | ✓ | status.ts:tickStatusEffects(B-w1.a:sleep/paralyzed/confused/silence/puppet 每回合 -1)|
| 1073 | `PAL_BattleStartFrame` | ⚠️ | battle-system.ts:tickBattle / advance 等价 classic 路径(line 1706+);ATB 路径(1077-1700)不 port D39 |
| 1811 | `PAL_BattleCommitAction` | ⚠️ | battle-system.ts performBattleAction 等价;**未含 sdlpal 真值 confused → attack mate + dying check + Sleep status auto-pass** follow-up |
| 2008 | `PAL_BattleShowPlayerAttackAnim` | ✗ | 渲染 anim,B-w3.b follow-up |
| 2266 | `PAL_BattleShowPlayerUseItemAnim` | ✗ | 同上 |
| 2338 | `PAL_BattleShowPlayerPreMagicAnim` | ✗ | 同上(magic 前摇)|
| 2448 | `PAL_BattleShowPlayerDefMagicAnim` | ✗ | 防御 magic anim |
| 2609 | `PAL_BattleShowPlayerOffMagicAnim` | ✗ | 攻击 magic anim |
| 2847 | `PAL_BattleShowEnemyMagicAnim` | ✗ | enemy magic anim |
| 3072 | `PAL_BattleShowPlayerSummonMagicAnim` | ✗ | 召唤 anim;B-w2.b summon stub 未做 |
| 3190 | `PAL_BattleShowPostMagicAnim` | ✗ | magic 后摇 anim |
| 3249 | `PAL_BattlePlayerValidateAction` | ⚠️ | ts battle-system 内 validate 简版(MP 不足 fallback / target 死重选);**未做 R 重复 prevAction 复用 + dead target reselect 完整逻辑**(Bug-2 fix 需要)|
| 3511 | `PAL_BattleCheckHidingEffect` | ✗ | iHidingTime > 0 时跳过 enemy action;ts 端无 hiding 概念,follow-up |
| 3552 | `FIGHT_DetectMagicTargetChange` | ✗ | magic target 重选 anim 跟随;follow-up 渲染层 |
| 3577 | `PAL_BattlePlayerPerformAction` | ⚠️ | 拆 5 action 各 ts module:actions/attack.ts / magic.ts / item.ts / defend.ts / flee.ts;**未含 BlowAway / status apply 完整真值** follow-up |
| 4489 | `PAL_BattleEnemySelectEnemyTargetIndex` | ✗ | enemy AI 选友军 target(混乱状态);follow-up |
| 4520 | `PAL_BattleEnemySelectTargetIndex` | ✗ | enemy AI 选 player target(默认 alive RNG);ts decideEnemyAction 简版 random,follow-up 精确公式 |
| 4551 | `PAL_BattleEnemyPerformAction` | ⚠️ | ts decideEnemyAction → performBattleAction 简版;**未通过 wScriptOnReady bytecode 走真 AI**(B-w2.a 待 接入 runScript)|
| 5193 | `PAL_BattleStealFromEnemy` | ✗ | opcode 0x6A;含 **Bug-2**(无 dead target check);ts 端 opcode 未具名,follow-up + fix |
| 5301 | `PAL_BattleSimulateMagic` | ✗ | opcode 0x42 wrapper 模拟 magic 不消 MP;follow-up |
| 4489 | `PAL_BattleEnemySelectEnemyTargetIndex` | ✗ | _待审_ |
| 4520 | `PAL_BattleEnemySelectTargetIndex` | ✗ | _待审_ |
| 4551 | `PAL_BattleEnemyPerformAction` | ? | _待审_ |
| 5193 | `PAL_BattleStealFromEnemy` | ✗ | _待审_ |
| 5301 | `PAL_BattleSimulateMagic` | ✗ | _待审_ |

### font.c(6 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 201 | `PAL_LoadUserFont` | ✗ | _待审_ |
| 434 | `PAL_InitFont` | ✗ | _待审_ |
| 513 | `PAL_FreeFont` | ✗ | _待审_ |
| 522 | `PAL_DrawCharOnSurface` | ✗ | _待审_ |
| 611 | `PAL_CharWidth` | ✗ | _待审_ |
| 632 | `PAL_FontHeight` | ✗ | _待审_ |

### game.c(1 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 25 | `PAL_GameMain` | ✗ | _待审_ |

### global.c(46 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 51 | `PAL_IsWINVersion` | N/A | sdlpal 同支 DOS/WIN 双版本,ts 端只 WIN95 真值(D36) |
| 112 | `PAL_DetectCodePage` | N/A | sdlpal 简繁日韩 + GBK/Big5;ts 端 UTF-8 + word.dat 已 dump _name |
| 154 | `PAL_InitGlobals` | ⚠️ | bootstrap.ts:bootstrap 初始化 gs 默认值;**未做** sdlpal fpDATA chunk 重 load(我们 extract 一次性 dump 替代) |
| 211 | `PAL_FreeGlobals` | N/A | JS GC |
| 269 | `PAL_ReadGlobalGameData` | N/A | sdlpal 从二进制 chunk read;ts extract 一次性 JSON dump |
| 312 | `PAL_InitGlobalGameData` | N/A | 同上 |
| 378 | `PAL_LoadDefaultGame` | ⚠️ | bootstrap.ts:createInitialGameState + 默认值;sdlpal 真值是从 SAVEDGAME 切片 0 load 而非 default |
| 562 | `PAL_LoadGame_Common` | N/A | DOS/WIN 共用 load helper;D37 不字节兼容 |
| 642 | `PAL_LoadGame_DOS` | N/A | D37 |
| 689 | `PAL_LoadGame_WIN` | N/A | core/save/api.ts:Save.loadSlot(JSON+IndexedDB,不字节兼容 sdlpal *.RPG) |
| 727 | `PAL_LoadGame` | ⚠️ | Save.loadSlot 路径不同(slot id 1-5) |
| 735 | `PAL_SaveGame_Common` | N/A | D37 |
| 804 | `PAL_SaveGame_DOS` | N/A | D37 |
| 844 | `PAL_SaveGame_WIN` | N/A | core/save/api.ts:Save.saveSlot(JSON) |
| 877 | `PAL_SaveGame` | ⚠️ | 同上 |
| 889 | `PAL_ReloadInNextTick` | ✗ | scene 切换 reload flag(我们 loadScene 异步 callback 替代,无单独 flag) |
| 915 | `PAL_InitGameData` | ⚠️ | bootstrap.ts:fetchAndInit 异步等价;sdlpal 同步 load 不同 |
| 957 | `PAL_CountItem` | ⚠️ | inventory.find(itemId).count inline 多处;follow-up 抽 helper |
| 1020 | `PAL_GetItemIndexToInventory` | ⚠️ | inventory.findIndex inline |
| 1063 | `PAL_AddItemToInventory` | ✓ | event-system.ts:addItemToInventory(I-w1.a chest opcode 助手,M5 完整 port) |
| 1175 | `PAL_GetItemAmount` | ⚠️ | inline,无 helper |
| 1212 | `PAL_CompressInventory` | ⚠️ | addItemToInventory count=0 自动 filter,语义合并 |
| 1254 | `PAL_IncreaseHPMP` | ✗ | 加 HP/MP 时 cap maxHP/maxMP;ts actions/magic.ts inline,未抽 helper |
| 1333 | `PAL_UpdateEquipments` | ✗ | 装备 effect 累加到 stat;**ts 端 装备 effect 完全未消费**(M-w1.b 数据层有,运行时忽略) follow-up |
| 1372 | `PAL_RemoveEquipmentEffect` | ✗ | 同上 |
| 1459 | `PAL_AddPoisonForPlayer` | ✗ | rgPoisonStatus[16][6] 数组写 poison id+duration;**ts 端 poison 单独 MAX_POISONS 数组未 port**(status field 含 confused/paralyzed 但 poison 单独管理) follow-up |
| 1520 | `PAL_CurePoisonByKind` | ✗ | 同上 |
| 1567 | `PAL_CurePoisonByLevel` | ✗ | 同上 |
| 1617 | `PAL_IsPlayerPoisonedByLevel` | ✗ | 同上 |
| 1687 | `PAL_IsPlayerPoisonedByKind` | ✗ | 同上 |
| 1736 | `PAL_GetPlayerAttackStrength` | ⚠️ | role.attackStrength inline;sdlpal 真值含装备 + bravery status 加成(简版无) |
| 1768 | `PAL_GetPlayerMagicStrength` | ⚠️ | 同上 |
| 1800 | `PAL_GetPlayerDefense` | ⚠️ | sdlpal 含 protect status 双倍 follow-up |
| 1832 | `PAL_GetPlayerDexterity` | ✓ | formulas.ts:getPlayerActualDexterity(haste/slow 修饰,(level+6)*3+dex) |
| 1868 | `PAL_GetPlayerFleeRate` | ⚠️ | role.fleeRate inline;sdlpal 含装备加成 |
| 1900 | `PAL_GetPlayerPoisonResistance` | ⚠️ | inline 无装备加成 |
| 1937 | `PAL_GetPlayerElementalResistance` | ⚠️ | formulas.ts inline 5 elem 抗;无装备加成 |
| 1978 | `PAL_GetPlayerBattleSprite` | ⚠️ | role.spriteNumInBattle 直接读;sdlpal opcode 0x31 临时改未做(M5 opcode 0x65 是大世界 sprite) |
| 2013 | `PAL_GetPlayerCooperativeMagic` | ⚠️ | role.cooperativeMagic 已 dump;协力触发(B-w3.a)未做 |
| 2048 | `PAL_PlayerCanAttackAll` | ⚠️ | role.attackAll 读;ts attack action 简版未做 attackAll 分支 follow-up |
| 2084 | `PAL_AddMagic` | ✗ | 学法术加 rgwMagic[32][role] 槽位;opcode 0x55 未具名 follow-up |
| 2139 | `PAL_RemoveMagic` | ✗ | 0x56 未具名 |
| 2173 | `PAL_SetPlayerStatus` | ⚠️ | BattlePlayer.status fields 直接 mutate,无 helper(opcode 0x2D 未具名) |
| 2280 | `PAL_RemovePlayerStatus` | ⚠️ | 同上 |
| 2311 | `PAL_ClearAllPlayerStatus` | ✗ | 战斗结束清全 status;ts finalizeBattle 未 clear follow-up |
| 2347 | `PAL_PlayerLevelUp` | ✗ | **B-w1.c levelup loop 未做**(while dwExp >= rgLevelUpExp + 8 类 stat 加成) follow-up 核心 |

### glslp.c(1 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 172 | `line_tokenize` | ✗ | _待审_ |

### input.c(22 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 95 | `PAL_DetectJoystick` | ✗ | _待审_ |
| 163 | `PAL_GetCurrDirection` | ? | _待审_ |
| 192 | `PAL_KeyDown` | ✗ | _待审_ |
| 244 | `PAL_KeyUp` | ✗ | _待审_ |
| 291 | `PAL_UpdateKeyboardState` | ✗ | _待审_ |
| 350 | `PAL_KeyboardEventFilter` | ✗ | _待审_ |
| 436 | `PAL_MouseEventFilter` | ✗ | _待审_ |
| 625 | `PAL_JoystickEventFilter` | ✗ | _待审_ |
| 761 | `PAL_UpdateJoyStickState` | ✗ | _待审_ |
| 837 | `PAL_SetTouchBounds` | ✗ | _待审_ |
| 850 | `PAL_GetTouchArea` | ✗ | _待审_ |
| 919 | `PAL_SetTouchAction` | ✗ | _待审_ |
| 971 | `PAL_UnsetTouchAction` | ✗ | _待审_ |
| 987 | `PAL_TouchRepeatCheck` | ✗ | _待审_ |
| 1013 | `PAL_TouchEventFilter` | ✗ | _待审_ |
| 1113 | `PAL_EventFilter` | ✗ | _待审_ |
| 1188 | `PAL_ClearKeyState` | ✗ | _待审_ |
| 1210 | `PAL_InitInput` | ✗ | _待审_ |
| 1244 | `PAL_ShutdownInput` | ✗ | _待审_ |
| 1273 | `PAL_PollEvent` | ✗ | _待审_ |
| 1308 | `PAL_ProcessEvent` | ✗ | _待审_ |
| 1342 | `PAL_RegisterInputFilter` | ✗ | _待审_ |

### itemmenu.c(3 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 29 | `PAL_ItemSelectMenuUpdate` | ✗ | _待审_ |
| 314 | `PAL_ItemSelectMenuInit` | ✗ | _待审_ |
| 380 | `PAL_ItemSelectMenu` | ? | _待审_ |

### magicmenu.c(3 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 36 | `PAL_MagicSelectionMenuUpdate` | ✗ | _待审_ |
| 302 | `PAL_MagicSelectionMenuInit` | ✗ | _待审_ |
| 413 | `PAL_MagicSelectionMenu` | ? | _待审_ |

### main.c(5 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 50 | `PAL_Init` | ? | _待审_ |
| 131 | `PAL_Shutdown` | ✗ | _待审_ |
| 179 | `PAL_TrademarkScreen` | ✗ | _待审_ |
| 206 | `PAL_SplashScreen` | ✗ | _待审_ |
| 461 | `main` | ? | _待审_ |

### map.c(6 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 26 | `PAL_LoadMap` | ✗ | _待审_ |
| 157 | `PAL_FreeMap` | ✗ | _待审_ |
| 198 | `PAL_MapGetTileBitmap` | ? | _待审_ |
| 262 | `PAL_MapTileIsBlocked` | ✗ | _待审_ |
| 302 | `PAL_MapGetTileHeight` | ? | _待审_ |
| 356 | `PAL_MapBlitToSurface` | ? | _待审_ |

### midi.c(2 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 29 | `MIDI_SetVolume` | ✗ | _待审_ |
| 43 | `MIDI_Play` | ✗ | _待审_ |

### midi_timidity.c(4 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 50 | `TIMIDITY_FillBuffer` | ✗ | _待审_ |
| 70 | `TIMIDITY_Shutdown` | ✗ | _待审_ |
| 84 | `TIMIDITY_Play` | ✗ | _待审_ |
| 166 | `TIMIDITY_Init` | ✗ | _待审_ |

### midi_tsf.c(5 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 40 | `TSF_Close` | ✗ | _待审_ |
| 87 | `TSF_FillBuffer` | ✗ | _待审_ |
| 131 | `TSF_Play` | ✗ | _待审_ |
| 176 | `TSF_Shutdown` | ✗ | _待审_ |
| 193 | `TSF_Init` | ✗ | _待审_ |

### mp3play.c(5 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 53 | `MP3_FillBuffer` | ✗ | _待审_ |
| 73 | `MP3_Shutdown` | ✗ | _待审_ |
| 85 | `MP3_Play` | ✗ | _待审_ |
| 134 | `MP3_Init` | ✗ | _待审_ |
| 155 | `MP3_Init` | ✗ | _待审_ |

### oggplay.c(5 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 257 | `OGG_FillBuffer` | ✗ | _待审_ |
| 399 | `OGG_Play` | ✗ | _待审_ |
| 455 | `OGG_Shutdown` | ✗ | _待审_ |
| 471 | `OGG_Init` | ✗ | _待审_ |
| 509 | `OGG_Init` | ✗ | _待审_ |

### opusplay.c(5 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 117 | `OPUS_FillBuffer` | ✗ | _待审_ |
| 211 | `OPUS_Play` | ✗ | _待审_ |
| 272 | `OPUS_Shutdown` | ✗ | _待审_ |
| 288 | `OPUS_Init` | ✗ | _待审_ |
| 321 | `OPUS_Init` | ✗ | _待审_ |

### palcfg.c(20 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 112 | `PAL_ParseConfigLine` | ✗ | _待审_ |
| 192 | `PAL_ConfigName` | ✗ | _待审_ |
| 200 | `PAL_ConfigIndex` | ✗ | _待审_ |
| 215 | `PAL_ConfigType` | ✗ | _待审_ |
| 223 | `PAL_LimitConfig` | ✗ | _待审_ |
| 273 | `PAL_FreeConfig` | ✗ | _待审_ |
| 295 | `PAL_LoadConfig` | ✗ | _待审_ |
| 628 | `PAL_SaveConfig` | ✗ | _待审_ |
| 690 | `PAL_GetConfigItem` | ✗ | _待审_ |
| 747 | `PAL_SetConfigItem` | ✗ | _待审_ |
| 865 | `PAL_GetConfigBoolean` | ✗ | _待审_ |
| 874 | `PAL_GetConfigNumber` | ✗ | _待审_ |
| 888 | `PAL_GetConfigInteger` | ✗ | _待审_ |
| 897 | `PAL_GetConfigUnsigned` | ✗ | _待审_ |
| 906 | `PAL_GetConfigString` | ✗ | _待审_ |
| 915 | `PAL_SetConfigBoolean` | ✗ | _待审_ |
| 933 | `PAL_SetConfigNumber` | ✗ | _待审_ |
| 947 | `PAL_SetConfigInteger` | ✗ | _待审_ |
| 965 | `PAL_SetConfigUnsigned` | ✗ | _待审_ |
| 983 | `PAL_SetConfigString` | ✗ | _待审_ |

### palcommon.c(15 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 28 | `PAL_CalcShadowColor` | ✗ | _待审_ |
| 36 | `PAL_RLEBlitToSurface` | ? | _待审_ |
| 46 | `PAL_RLEBlitToSurfaceWithShadow` | ? | _待审_ |
| 245 | `PAL_RLEBlitWithColorShift` | ✗ | _待审_ |
| 446 | `PAL_RLEBlitMonoColor` | ✗ | _待审_ |
| 651 | `PAL_FBPBlitToSurface` | ✗ | _待审_ |
| 698 | `PAL_RLEGetWidth` | ✗ | _待审_ |
| 737 | `PAL_RLEGetHeight` | ✗ | _待审_ |
| 776 | `PAL_SpriteGetNumFrames` | ✗ | _待审_ |
| 803 | `PAL_SpriteGetFrame` | ✗ | _待审_ |
| 855 | `PAL_MKFGetChunkCount` | ✗ | _待审_ |
| 887 | `PAL_MKFGetChunkSize` | ✗ | _待审_ |
| 939 | `PAL_MKFReadChunk` | ✗ | _待审_ |
| 1016 | `PAL_MKFGetDecompressedSize` | ✗ | _待审_ |
| 1085 | `PAL_MKFDecompressChunk` | ? | _待审_ |

### paldebug.c(1 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 26 | `PAL_ShowSearchTriggerRange` | ✗ | _待审_ |

### palette.c(8 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 25 | `PAL_GetPalette` | ✗ | _待审_ |
| 93 | `PAL_SetPalette` | ? | _待审_ |
| 123 | `PAL_FadeOut` | ✗ | _待审_ |
| 193 | `PAL_FadeIn` | ✗ | _待审_ |
| 262 | `PAL_SceneFade` | ✗ | _待审_ |
| 381 | `PAL_PaletteFade` | ✗ | _待审_ |
| 462 | `PAL_ColorFade` | ✗ | _待审_ |
| 595 | `PAL_FadeToRed` | ✗ | _待审_ |

### play.c(9 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 25 | `PAL_GameUpdate` | ⚠️ | scene-system.ts:tickSceneSystem + main-loop.ts:tickByMode 综合等价;sdlpal `PAL_GameUpdate` 含 NPC 自动移动 + dwTime / dwFrameNum 累加 / contact 触发 / cover tile,我们拆到 scene-system + present + 各 tick |
| 244 | `PAL_GameUseItem` | ⚠️ | 大世界用物品流程;ts 端 inventory-menu state machine 简版,真 script(item.scriptOnUse)未跑 follow-up |
| 328 | `PAL_GameEquipItem` | ⚠️ | 装备物品;ts equip-menu state machine,真 stat 加成未做(see global.c UpdateEquipments) |
| 362 | `PAL_GetSearchTriggerRange` | ✓ | scene-system.ts:findContactNpc 等价(M3.5 triggerMode 4-8 距离判定) |
| 423 | `PAL_Search` | ⚠️ | Confirm 键 search 流程;scene-system.ts tickSceneSystem 内简版 Confirm 触发 + loadEventFromNpc |
| 513 | `PAL_StartFrame` | ✓ | shell/main-loop.ts:startRafLoop + singleTick |
| 603 | `PAL_WaitForKeyInternal` | ✓ | event-system.ts dialog waiting=dialog phase(state machine 等价 sync 等键) |
| 641 | `PAL_WaitForKey` | ✓ | PAL_WaitForKeyInternal wrapper;同上 |
| 663 | `PAL_WaitForAnyKey` | ✓ | 同上 dialog 状态机 |

### res.c(9 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 38 | `PAL_FreeEventObjectSprites` | ✗ | _待审_ |
| 73 | `PAL_FreePlayerSprites` | ✗ | _待审_ |
| 101 | `PAL_InitResources` | ✗ | _待审_ |
| 123 | `PAL_FreeResources` | ✗ | _待审_ |
| 164 | `PAL_SetLoadFlags` | ? | _待审_ |
| 191 | `PAL_LoadResources` | ? | _待审_ |
| 358 | `PAL_GetCurrentMap` | ✗ | _待审_ |
| 385 | `PAL_GetPlayerSprite` | ✗ | _待审_ |
| 412 | `PAL_GetEventObjectSprite` | ✗ | _待审_ |

### rngplay.c(3 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 28 | `PAL_RNGReadFrame` | ✗ | _待审_ |
| 140 | `PAL_RNGBlitToSurface` | ✗ | _待审_ |
| 372 | `PAL_RNGPlay` | ✗ | _待审_ |

### scene.c(10 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 40 | `PAL_AddSpriteToDraw` | ✓ | (隐式)present.ts entries 数组 push |
| 77 | `PAL_CalcCoverTiles` | ✓ | draw-tilemap.ts:addCoverTileEntries(完整 5×5 scan + iTileHeight 真值) |
| 181 | `PAL_SceneDrawSprites` | ✓ | present.ts 内 NPC + party 段(用真实 sLayer 真值 + scriptedFrame 优先级) |
| 365 | `PAL_ApplyWave` | ✗ | 战场水波视觉;follow-up M6 |
| 453 | `PAL_MakeScene` | ✓ | 同上(已审过) |
| 512 | `PAL_CheckObstacle` | ✓ | scene-system.ts:isWalkable(单点 wrapper) |
| 522 | `PAL_CheckObstacleWithRange` | ✓ | scene-system.ts:isWalkable(完整 sState>=2 检查,M5.Sync.2 D38) |
| 636 | `PAL_UpdatePartyGestures` | ✓ | event-system.ts partyWalkTo 内 walkingFrame.walking + stepFrame 推进;present.ts 优先级 walking>scriptedFrame |
| 779 | `PAL_UpdateParty` | ✓ | partyWalkTo 内 trail.unshift + UpdatePartyGestures(M5.Sync.2 完整 port) |
| 851 | `PAL_NPCWalkOneStep` | ✓ | event-system.ts:0x6C opcode handler(dir*N+iFrame + 2/3 重映射,M5.Sync.2 91dc2e2) |

### script.c(9 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 31 | `PAL_NPCWalkTo` | ✓ | event-system.ts:npcWalkTo helper(0x10/0x11/0x82 opcode handlers) |
| 101 | `PAL_PartyWalkTo` | ✓ | event-system.ts:partyWalkTo(opcode 0x70 handler;D36 camera viewport 改造后字段对齐) |
| 203 | `PAL_PartyRideEventObject` | ✗ | 骑 event object(船 / 御剑等)opcode,ts 端 follow-up |
| 310 | `PAL_MonsterChasePlayer` | ✗ | enemy 追玩家(opcode 0x4C chase);ts 端 follow-up,scene-system 简版 contact 触发 |
| 504 | `PAL_AdditionalCredits` | N/A | sdlpal 加 credits 显示;ts 端 N/A |
| 587 | `PAL_InterpretInstruction` | ⚠️ | event-system.ts:tickEventSystem 主循环(M5 简版具名 35 opcode)+ runScript(battle ctx);**完整 100+ case 仍 70+ 未具名 follow-up** |
| 3088 | `MESSAGE_GetSpan` | N/A | dialog text span 计算;ts 端 render-text inline 等价 |
| 3140 | `PAL_RunTriggerScript` | ⚠️ | event-system.ts:runScript runtimeMode=event 等价(M3 已 port);**未真做 wScriptOnReady 调用入口**(B-w2.a follow-up) |
| 3482 | `PAL_RunAutoScript` | ⚠️ | event-system.ts:tickAutoScripts(M5.Sync.2 已 port autoScript runner — 每 active NPC 每 tick 跑 1 op);**autoScript 真值循环 4 个状态(reset/loop/etc)简版未做** |

### sound.c(14 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 73 | `SOUND_LoadWAVEData` | ✗ | _待审_ |
| 160 | `SOUND_LoadVOCData` | ✗ | _待审_ |
| 233 | `SOUND_ResampleMix_U8_Mono_Mono` | ✗ | _待审_ |
| 292 | `SOUND_ResampleMix_U8_Mono_Stereo` | ✗ | _待审_ |
| 351 | `SOUND_ResampleMix_U8_Stereo_Mono` | ✗ | _待审_ |
| 414 | `SOUND_ResampleMix_U8_Stereo_Stereo` | ✗ | _待审_ |
| 480 | `SOUND_ResampleMix_S16_Mono_Mono` | ✗ | _待审_ |
| 539 | `SOUND_ResampleMix_S16_Mono_Stereo` | ✗ | _待审_ |
| 598 | `SOUND_ResampleMix_S16_Stereo_Mono` | ✗ | _待审_ |
| 661 | `SOUND_ResampleMix_S16_Stereo_Stereo` | ✗ | _待审_ |
| 728 | `SOUND_Play` | ✗ | _待审_ |
| 851 | `SOUND_Shutdown` | ✗ | _待审_ |
| 891 | `SOUND_FillBuffer` | ✗ | _待审_ |
| 940 | `SOUND_Init` | ✗ | _待审_ |

### text.c(29 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 66 | `PAL_ParseLine` | ✗ | _待审_ |
| 111 | `PAL_ReadOneLine` | ✗ | _待审_ |
| 154 | `PAL_ReadMessageFile` | ✗ | _待审_ |
| 649 | `PAL_InitText` | ✗ | _待审_ |
| 897 | `PAL_FreeText` | ✗ | _待审_ |
| 966 | `PAL_GetWord` | ✗ | _待审_ |
| 988 | `PAL_GetMsg` | ✗ | _待审_ |
| 1010 | `PAL_GetMsgNum` | ✗ | _待审_ |
| 1039 | `PAL_UnescapeText` | ✗ | _待审_ |
| 1075 | `PAL_DrawText` | ? | _待审_ |
| 1088 | `PAL_DrawTextUnescape` | ✗ | _待审_ |
| 1186 | `PAL_DialogSetDelayTime` | ✗ | _待审_ |
| 1208 | `PAL_StartDialog` | ? | _待审_ |
| 1219 | `PAL_StartDialogWithOffset` | ? | _待审_ |
| 1356 | `PAL_DialogWaitForKeyWithMaximumSeconds` | ✗ | _待审_ |
| 1451 | `PAL_DialogWaitForKey` | ? | _待审_ |
| 1459 | `TEXT_DisplayText` | ✗ | _待审_ |
| 1616 | `PAL_ShowDialogText` | ? | _待审_ |
| 1752 | `PAL_ClearDialog` | ? | _待审_ |
| 1787 | `PAL_EndDialog` | ? | _待审_ |
| 1820 | `PAL_IsInDialog` | ✗ | _待审_ |
| 1842 | `PAL_DialogIsPlayingRNG` | ✗ | _待审_ |
| 1864 | `PAL_GetInvalidChar` | ✗ | _待审_ |
| 1882 | `PAL_GetCodePage` | ✗ | _待审_ |
| 1890 | `PAL_SetCodePage` | ✗ | _待审_ |
| 1898 | `PAL_DetectCodePageForString` | ✗ | _待审_ |
| 1964 | `PAL_MultiByteToWideCharCP` | ✗ | _待审_ |
| 2232 | `PAL_MultiByteToWideChar` | ✗ | _待审_ |
| 2263 | `PAL_swprintf` | ✗ | _待审_ |

### ui.c(17 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 27 | `PAL_CreateBoxInternal` | ✗ | _待审_ |
| 52 | `PAL_InitUI` | ✗ | _待审_ |
| 93 | `PAL_FreeUI` | ✗ | _待审_ |
| 119 | `PAL_CreateBox` | ✗ | _待审_ |
| 131 | `PAL_CreateBoxWithShadow` | ✗ | _待审_ |
| 242 | `PAL_CreateSingleLineBox` | ✗ | _待审_ |
| 252 | `PAL_CreateSingleLineBoxWithShadow` | ✗ | _待审_ |
| 355 | `PAL_DeleteBox` | ✗ | _待审_ |
| 401 | `PAL_ReadMenu` | ✗ | _待审_ |
| 640 | `PAL_DrawNumber` | ✗ | _待审_ |
| 749 | `PAL_TextWidth` | ✗ | _待审_ |
| 763 | `PAL_MenuTextMaxWidth` | ✗ | _待审_ |
| 797 | `PAL_WordMaxWidth` | ✗ | _待审_ |
| 836 | `PAL_WordWidth` | ✗ | _待审_ |
| 864 | `PAL_LoadObjectDesc` | ✗ | _待审_ |
| 931 | `PAL_FreeObjectDesc` | ✗ | _待审_ |
| 961 | `PAL_GetObjectDesc` | ✗ | _待审_ |

### uibattle.c(12 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 31 | `PAL_PlayerInfoBox` | ✗ | _待审_ |
| 272 | `PAL_BattleUIIsActionValid` | ✗ | _待审_ |
| 344 | `PAL_BattleUIDrawMiscMenu` | ✗ | _待审_ |
| 417 | `PAL_BattleUIMiscMenuUpdate` | ✗ | _待审_ |
| 472 | `PAL_BattleUIMiscItemSubMenuUpdate` | ✗ | _待审_ |
| 548 | `PAL_BattleUIShowText` | ✗ | _待审_ |
| 582 | `PAL_BattleUIPlayerReady` | ✗ | _待审_ |
| 624 | `PAL_BattleUIUseItem` | ✗ | _待审_ |
| 675 | `PAL_BattleUIThrowItem` | ✗ | _待审_ |
| 722 | `PAL_BattleUIPickAutoMagic` | ✗ | _待审_ |
| 785 | `PAL_BattleUIUpdate` | ✗ | _待审_ |
| 1770 | `PAL_BattleUIShowNum` | ? | _待审_ |

### uigame.c(23 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 42 | `PAL_DrawOpeningMenuBackground` | ✗ | _待审_ |
| 83 | `PAL_OpeningMenu` | ? | _待审_ |
| 169 | `PAL_SaveSlotMenu` | ? | _待审_ |
| 242 | `PAL_SelectionMenu` | ? | _待审_ |
| 320 | `PAL_TripleMenu` | ? | _待审_ |
| 343 | `PAL_ConfirmMenu` | ? | _待审_ |
| 368 | `PAL_SwitchMenu` | ? | _待审_ |
| 394 | `PAL_BattleSpeedMenu` | ✗ | _待审_ |
| 451 | `PAL_ShowCash` | ✗ | _待审_ |
| 494 | `PAL_SystemMenu_OnItemChange` | ✗ | _待审_ |
| 516 | `PAL_SystemMenu` | ? | _待审_ |
| 654 | `PAL_InGameMagicMenu` | ? | _待审_ |
| 878 | `PAL_InventoryMenu` | ? | _待审_ |
| 922 | `PAL_InGameMenu_OnItemChange` | ✗ | _待审_ |
| 944 | `PAL_InGameMenu` | ? | _待审_ |
| 1051 | `PAL_PlayerStatus` | ? | _待审_ |
| 1289 | `PAL_ItemUseMenu` | ? | _待审_ |
| 1503 | `PAL_BuyMenu_OnItemChange` | ✗ | _待审_ |
| 1615 | `PAL_BuyMenu` | ? | _待审_ |
| 1710 | `PAL_SellMenu_OnItemChange` | ✗ | _待审_ |
| 1755 | `PAL_SellMenu` | ? | _待审_ |
| 1794 | `PAL_EquipItemMenu` | ? | _待审_ |
| 2059 | `PAL_QuitGame` | ✗ | _待审_ |

### util.c(33 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 47 | `flength` | ✗ | _待审_ |
| 59 | `trim` | ? | _待审_ |
| 102 | `UTIL_va` | ✗ | _待审_ |
| 169 | `lsrand` | ? | _待审_ |
| 195 | `lrand` | ✗ | _待审_ |
| 222 | `RandomLong` | ? | _待审_ |
| 251 | `RandomFloat` | ? | _待审_ |
| 280 | `UTIL_Delay` | ? | _待审_ |
| 296 | `TerminateOnError` | ✗ | _待审_ |
| 348 | `UTIL_malloc` | ✗ | _待审_ |
| 370 | `UTIL_calloc` | ✗ | _待审_ |
| 393 | `UTIL_OpenRequiredFile` | ✗ | _待审_ |
| 415 | `UTIL_OpenRequiredFileForMode` | ✗ | _待审_ |
| 451 | `UTIL_OpenFile` | ✗ | _待审_ |
| 473 | `UTIL_OpenFileForMode` | ✗ | _待审_ |
| 514 | `UTIL_OpenFileAtPath` | ✗ | _待审_ |
| 523 | `UTIL_OpenFileAtPathForMode` | ✗ | _待审_ |
| 554 | `UTIL_CloseFile` | ✗ | _待审_ |
| 579 | `UTIL_IsFileExist` | ✗ | _待审_ |
| 590 | `UTIL_GetFullPathName` | ✗ | _待审_ |
| 658 | `UTIL_CombinePath` | ✗ | _待审_ |
| 719 | `UTIL_GlobalBuffer` | ✗ | _待审_ |
| 728 | `UTIL_CheckResourceFiles` | ✗ | _待审_ |
| 787 | `UTIL_GetScreenSize` | ✗ | _待审_ |
| 796 | `UTIL_IsAbsolutePath` | ✗ | _待审_ |
| 804 | `UTIL_Platform_Init` | ✗ | _待审_ |
| 814 | `UTIL_Platform_Quit` | ✗ | _待审_ |
| 848 | `UTIL_LogAddOutputCallback` | ✗ | _待审_ |
| 873 | `UTIL_LogRemoveOutputCallback` | ✗ | _待审_ |
| 890 | `UTIL_LogOutput` | ✗ | _待审_ |
| 933 | `UTIL_LogSetLevel` | ✗ | _待审_ |
| 946 | `UTIL_LogToFile` | ✗ | _待审_ |
| 961 | `UTIL_LogSetPrelude` | ✗ | _待审_ |

### video.c(20 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 150 | `VIDEO_Startup` | ✗ | _待审_ |
| 400 | `VIDEO_Shutdown` | ✗ | _待审_ |
| 479 | `VIDEO_RenderCopy` | ✗ | _待审_ |
| 517 | `VIDEO_UpdateScreen` | ? | _待审_ |
| 646 | `VIDEO_SetPalette` | ✗ | _待审_ |
| 705 | `VIDEO_Resize` | ✗ | _待审_ |
| 789 | `VIDEO_GetPalette` | ✗ | _待审_ |
| 811 | `VIDEO_ToggleScaleScreen` | ✗ | _待审_ |
| 835 | `VIDEO_ToggleFullscreen` | ✗ | _待审_ |
| 935 | `VIDEO_ChangeDepth` | ✗ | _待审_ |
| 988 | `VIDEO_SaveScreenshot` | ✗ | _待审_ |
| 1030 | `VIDEO_ShakeScreen` | ✗ | _待审_ |
| 1056 | `VIDEO_SwitchScreen` | ✗ | _待审_ |
| 1130 | `VIDEO_FadeScreen` | ? | _待审_ |
| 1293 | `VIDEO_SetWindowTitle` | ✗ | _待审_ |
| 1319 | `VIDEO_CreateCompatibleSurface` | ✗ | _待审_ |
| 1327 | `VIDEO_CreateCompatibleSizedSurface` | ✗ | _待审_ |
| 1373 | `VIDEO_DuplicateSurface` | ✗ | _待审_ |
| 1404 | `VIDEO_UpdateSurfacePalette` | ✗ | _待审_ |
| 1433 | `VIDEO_DrawSurfaceToScreen` | ✗ | _待审_ |

### video_glsl.c(3 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 230 | `if` |  | _待审_ |
| 260 | `if` |  | _待审_ |
| 264 | `if` |  | _待审_ |
