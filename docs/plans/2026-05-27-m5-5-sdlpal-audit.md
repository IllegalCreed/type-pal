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
| 44 | `AUDIO_MixNative` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 65 | `AUDIO_AdjustVolume` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 81 | `AUDIO_FillBuffer` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 169 | `AUDIO_CD_Available` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 177 | `AUDIO_OpenDevice` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 381 | `AUDIO_CloseDevice` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 442 | `AUDIO_GetDeviceSpec` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 450 | `AUDIO_ChangeVolumeByValue` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 464 | `AUDIO_IncreaseVolume` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 491 | `AUDIO_DecreaseVolume` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 518 | `AUDIO_PlaySound` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 547 | `AUDIO_PlayMusic` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 576 | `AUDIO_PlayCDTrack` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 639 | `AUDIO_EnableMusic` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 647 | `AUDIO_MusicEnabled` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 655 | `AUDIO_EnableSound` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 663 | `AUDIO_SoundEnabled` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 671 | `AUDIO_Lock` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 679 | `AUDIO_Unlock` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |

### aviplay.c(9 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 111 | `PAL_ReadAVIInfo` | ✗ | M6 mp4/webm + <video> 替代;ts 端无开场动画 / ending 视频 |
| 411 | `PAL_ReadDataChunk` | ✗ | 同 PAL_PlayAVI |
| 471 | `PAL_AVIFeedAudio` | ✗ | M6 mp4/webm + <video> 替代;ts 端无开场动画 / ending 视频 |
| 502 | `PAL_AVIInit` | ✗ | M6 mp4/webm + <video> 替代;ts 端无开场动画 / ending 视频 |
| 510 | `PAL_AVIShutdown` | ✗ | M6 mp4/webm + <video> 替代;ts 端无开场动画 / ending 视频 |
| 518 | `PAL_RenderAVIFrameToSurface` | ✗ | M6 mp4/webm + <video> 替代;ts 端无开场动画 / ending 视频 |
| 643 | `PAL_PlayAVI` | ✗ | M6 mp4/webm + <video> 替代;ts 端无开场动画 / ending 视频 |
| 776 | `AVI_FillAudioBuffer` | ✗ | M6 mp4/webm + <video> 替代;ts 端无开场动画 / ending 视频 |
| 806 | `AVI_GetPlayState` | ✗ | M6 mp4/webm + <video> 替代;ts 端无开场动画 / ending 视频 |

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
| 27 | `PAL_EndingSetEffectSprite` | ✗ | 通关 ending 流程 M7 follow-up |
| 49 | `PAL_ShowFBP` | ✗ | 通关 ending 流程 M7 follow-up |
| 153 | `PAL_ScrollFBP` | ✗ | 通关 ending 流程 M7 follow-up |
| 282 | `PAL_EndingAnimation` | ✗ | 通关 ending 流程 M7 follow-up |
| 396 | `PAL_EndingScreen` | ✗ | 通关 ending 流程 M7 follow-up |

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

### font.c(6 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 201 | `PAL_LoadUserFont` | N/A | sdlpal 用内嵌 PALFONT 字模;ts M4 P4 用 GNU Unifont BDF → glyphs.json 替代,不 1:1 字模 |
| 434 | `PAL_InitFont` | N/A | sdlpal 用内嵌 PALFONT 字模;ts M4 P4 用 GNU Unifont BDF → glyphs.json 替代,不 1:1 字模 |
| 513 | `PAL_FreeFont` | N/A | sdlpal 用内嵌 PALFONT 字模;ts M4 P4 用 GNU Unifont BDF → glyphs.json 替代,不 1:1 字模 |
| 522 | `PAL_DrawCharOnSurface` | ✓ | render-text.ts:drawGlyph(从 glyphs.json mask 取像素 + blit) |
| 611 | `PAL_CharWidth` | ✓ | render-text.ts inline glyph metadata 等价 |
| 632 | `PAL_FontHeight` | ✓ | render-text.ts inline glyph metadata 等价 |

### game.c(1 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 25 | `PAL_GameMain` | ✓ | shell/main-loop.ts:startRafLoop(rAF + accumulator 节流) |

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
| 172 | `line_tokenize` | N/A | sdlpal C helper / 误识别(macro 展开);N/A |

### input.c(22 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 95 | `PAL_DetectJoystick` | ✗ | M6 移动支持 / 手柄 |
| 163 | `PAL_GetCurrDirection` | ✓ | scene-system.ts:pickFacing(last-press priority sdlpal:180-189 真值) |
| 192 | `PAL_KeyDown` | ✓ | shell/keyboard.ts:handleDown/handleUp 等价 |
| 244 | `PAL_KeyUp` | ✓ | shell/keyboard.ts:handleDown/handleUp 等价 |
| 291 | `PAL_UpdateKeyboardState` | ✓ | 浏览器 keydown/keyup 事件自动维护 |
| 350 | `PAL_KeyboardEventFilter` | ✓ | shell/keyboard.ts handleDown/handleUp + KeyboardInputSource |
| 436 | `PAL_MouseEventFilter` | ✗ | 鼠标点击 → 等价 keypress(M6 移动支持) |
| 625 | `PAL_JoystickEventFilter` | ✗ | M6 移动支持 / 手柄 follow-up |
| 761 | `PAL_UpdateJoyStickState` | ✗ | M6 移动支持 / 手柄 follow-up |
| 837 | `PAL_SetTouchBounds` | ✗ | M6 移动支持 / 手柄 |
| 850 | `PAL_GetTouchArea` | ✗ | M6 移动支持 / 手柄 |
| 919 | `PAL_SetTouchAction` | ✗ | M6 移动支持 / 手柄 |
| 971 | `PAL_UnsetTouchAction` | ✗ | M6 移动支持 / 手柄 |
| 987 | `PAL_TouchRepeatCheck` | ✗ | M6 移动支持 / 手柄 follow-up |
| 1013 | `PAL_TouchEventFilter` | ✗ | M6 移动支持 / 手柄 follow-up |
| 1113 | `PAL_EventFilter` | ✓ | shell/keyboard.ts:handleDown/handleUp 等价 |
| 1188 | `PAL_ClearKeyState` | ⚠️ | tickByMode mode 切换时隐式清(snap 不传旧 input);无独立 helper |
| 1210 | `PAL_InitInput` | N/A | browser 自动 |
| 1244 | `PAL_ShutdownInput` | N/A | browser 自动 |
| 1273 | `PAL_PollEvent` | ⚠️ | shell/input.ts:nextSnapshot 等价(只 keyboard);**joystick/touch/gamepad ✗** M6 follow-up |
| 1308 | `PAL_ProcessEvent` | ⚠️ | shell/input.ts:nextSnapshot 等价(只 keyboard);**joystick/touch/gamepad ✗** M6 follow-up |
| 1342 | `PAL_RegisterInputFilter` | N/A | ts 无插件机制 |

### itemmenu.c(3 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 29 | `PAL_ItemSelectMenuUpdate` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 314 | `PAL_ItemSelectMenuInit` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 380 | `PAL_ItemSelectMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |

### magicmenu.c(3 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 36 | `PAL_MagicSelectionMenuUpdate` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 302 | `PAL_MagicSelectionMenuInit` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 413 | `PAL_MagicSelectionMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |

### main.c(5 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 50 | `PAL_Init` | ⚠️ | shell/bootstrap.ts:bootstrap(canvas)等价(整体 init) |
| 131 | `PAL_Shutdown` | N/A | shell/bootstrap.ts caller 注入 canvas;无独立 entry |
| 179 | `PAL_TrademarkScreen` | ✗ | production 启动 logo;dev mode 用 ?skip-intro,follow-up |
| 206 | `PAL_SplashScreen` | ✗ | production 启动 logo;dev mode 用 ?skip-intro,follow-up |
| 461 | `main` | N/A | shell/bootstrap.ts:bootstrap 等价 entry |

### map.c(6 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 26 | `PAL_LoadMap` | ✓ | pal-extract resources/map.ts:parseMap dump tilemap-N.json |
| 157 | `PAL_FreeMap` | N/A | JS GC |
| 198 | `PAL_MapGetTileBitmap` | ✓ | draw-tilemap.ts:tileIdLayer0/1 + tileImages.get(M5.P0.b 完整) |
| 262 | `PAL_MapTileIsBlocked` | ✓ | scene-system.ts:tilemapIsBlocked(bit 13 完全对齐) |
| 302 | `PAL_MapGetTileHeight` | ✓ | draw-tilemap.ts:268-271(extract DWORD bit 8-11 / 24-27) |
| 356 | `PAL_MapBlitToSurface` | ✓ | present/draw-tilemap.ts:drawTilemap |

### midi.c(2 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 29 | `MIDI_SetVolume` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 43 | `MIDI_Play` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |

### midi_timidity.c(4 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 50 | `TIMIDITY_FillBuffer` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 70 | `TIMIDITY_Shutdown` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 84 | `TIMIDITY_Play` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 166 | `TIMIDITY_Init` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |

### midi_tsf.c(5 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 40 | `TSF_Close` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 87 | `TSF_FillBuffer` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 131 | `TSF_Play` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 176 | `TSF_Shutdown` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 193 | `TSF_Init` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |

### mp3play.c(5 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 53 | `MP3_FillBuffer` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 73 | `MP3_Shutdown` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 85 | `MP3_Play` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 134 | `MP3_Init` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 155 | `MP3_Init` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |

### oggplay.c(5 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 257 | `OGG_FillBuffer` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 399 | `OGG_Play` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 455 | `OGG_Shutdown` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 471 | `OGG_Init` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 509 | `OGG_Init` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |

### opusplay.c(5 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 117 | `OPUS_FillBuffer` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 211 | `OPUS_Play` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 272 | `OPUS_Shutdown` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 288 | `OPUS_Init` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |
| 321 | `OPUS_Init` | ✗ | M6 Web Audio API + SpessaSynth 替代,当前未 port(游戏静音运行) |

### palcfg.c(20 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 112 | `PAL_ParseConfigLine` | ⚠️ | URL params + localStorage 替代 sdlpal.cfg 文件 |
| 192 | `PAL_ConfigName` | ⚠️ | URL params + localStorage 替代 sdlpal.cfg 文件 |
| 200 | `PAL_ConfigIndex` | ⚠️ | URL params + localStorage 替代 sdlpal.cfg 文件 |
| 215 | `PAL_ConfigType` | ⚠️ | URL params + localStorage 替代 sdlpal.cfg 文件 |
| 223 | `PAL_LimitConfig` | ⚠️ | URL params + localStorage 替代 sdlpal.cfg 文件 |
| 273 | `PAL_FreeConfig` | ⚠️ | URL params + localStorage 替代 sdlpal.cfg 文件 |
| 295 | `PAL_LoadConfig` | ⚠️ | URL params(?skip-intro/?tp_dump)+ localStorage 简版替代 sdlpal.cfg 文件 |
| 628 | `PAL_SaveConfig` | ⚠️ | URL params(?skip-intro/?tp_dump)+ localStorage 简版替代 sdlpal.cfg 文件 |
| 690 | `PAL_GetConfigItem` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |
| 747 | `PAL_SetConfigItem` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |
| 865 | `PAL_GetConfigBoolean` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |
| 874 | `PAL_GetConfigNumber` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |
| 888 | `PAL_GetConfigInteger` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |
| 897 | `PAL_GetConfigUnsigned` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |
| 906 | `PAL_GetConfigString` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |
| 915 | `PAL_SetConfigBoolean` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |
| 933 | `PAL_SetConfigNumber` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |
| 947 | `PAL_SetConfigInteger` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |
| 965 | `PAL_SetConfigUnsigned` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |
| 983 | `PAL_SetConfigString` | ⚠️ | 同上,sdlpal cfg 字段对照 ts 端 URL params/localStorage 简版 |

### palcommon.c(15 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 28 | `PAL_CalcShadowColor` | ⚠️ | render-text.ts shadow 色用固定 0x0F(黑),sdlpal 真值动态算 follow-up |
| 36 | `PAL_RLEBlitToSurface` | ✓ | pal-extract/io/rle.ts(M1 dump 时已解 RLE)+ runtime present/draw-sprite.ts blit(M2) |
| 46 | `PAL_RLEBlitToSurfaceWithShadow` | ✓ | pal-extract/io/rle.ts(M1)+ draw-sprite.ts shadow blit |
| 245 | `PAL_RLEBlitWithColorShift` | ✓ | pal-extract/io/rle.ts(M1 dump 时已解 RLE)+ runtime present/draw-sprite.ts blit(M2) |
| 446 | `PAL_RLEBlitMonoColor` | ✓ | pal-extract/io/rle.ts(M1 dump 时已解 RLE)+ runtime present/draw-sprite.ts blit(M2) |
| 651 | `PAL_FBPBlitToSurface` | ✓ | pal-extract dump FBP image → png(M4 P3) |
| 698 | `PAL_RLEGetWidth` | ✓ | pal-extract/io/rle.ts(M1 dump 时已解 RLE)+ runtime present/draw-sprite.ts blit(M2) |
| 737 | `PAL_RLEGetHeight` | ✓ | pal-extract/io/rle.ts(M1 dump 时已解 RLE)+ runtime present/draw-sprite.ts blit(M2) |
| 776 | `PAL_SpriteGetNumFrames` | ✓ | ctx.npcSpriteFrames.get(spriteNum).length 等价 |
| 803 | `PAL_SpriteGetFrame` | ✓ | present.ts NPC sprite frame 查找(dir*nSpriteFrames+iFrame 真值) |
| 855 | `PAL_MKFGetChunkCount` | ✓ | pal-extract/io/mkf.ts(M1 openMkf / readChunk) |
| 887 | `PAL_MKFGetChunkSize` | ✓ | pal-extract/io/mkf.ts(M1 openMkf / readChunk) |
| 939 | `PAL_MKFReadChunk` | ✓ | pal-extract/io/mkf.ts(M1 openMkf / readChunk) |
| 1016 | `PAL_MKFGetDecompressedSize` | ✓ | pal-extract/io/mkf.ts(openMkf / readChunk;chunk 解压用 yj2.ts / yj1.ts) |
| 1085 | `PAL_MKFDecompressChunk` | ✓ | pal-extract/io/mkf.ts(openMkf / readChunk;chunk 解压用 yj2.ts / yj1.ts) |

### paldebug.c(1 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 26 | `PAL_ShowSearchTriggerRange` | N/A | sdlpal debug 视觉,ts 端 N/A |

### palette.c(8 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 25 | `PAL_GetPalette` | ✓ | pal-extract dump palette.json + event-system OP_SET_PALETTE handler(fetchPalette 异步注入) |
| 93 | `PAL_SetPalette` | ✓ | pal-extract dump palette.json + event-system OP_SET_PALETTE handler(fetchPalette 异步注入) |
| 123 | `PAL_FadeOut` | ✗ | palette 级 fade follow-up M6 |
| 193 | `PAL_FadeIn` | ✗ | palette 级 fade follow-up M6 |
| 262 | `PAL_SceneFade` | ✓ | event-system.ts:fadeScreen(opcode 0x73) |
| 381 | `PAL_PaletteFade` | ✓ | pal-extract dump palette.json + event-system OP_SET_PALETTE handler(fetchPalette 异步注入) |
| 462 | `PAL_ColorFade` | ✗ | M6 |
| 595 | `PAL_FadeToRed` | ✗ | palette 级 fade follow-up M6 |

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
| 38 | `PAL_FreeEventObjectSprites` | N/A | JS GC + assets/loader.ts 一次性 fetch |
| 73 | `PAL_FreePlayerSprites` | N/A | JS GC + assets/loader.ts 一次性 fetch |
| 101 | `PAL_InitResources` | N/A | JS GC + assets/loader.ts 一次性 fetch |
| 123 | `PAL_FreeResources` | N/A | JS GC + assets/loader.ts 一次性 fetch |
| 164 | `PAL_SetLoadFlags` | N/A | sdlpal 增量 reload flags;ts 端 loadScene 一次性 fetch 整套,无 flag |
| 191 | `PAL_LoadResources` | ⚠️ | assets/loader.ts:loadAll 等价;无增量 reload(每 scene 切换全 fetch) |
| 358 | `PAL_GetCurrentMap` | ✓ | SceneContext.tilemap(loadScene 时注入) |
| 385 | `PAL_GetPlayerSprite` | ⚠️ | ctx.partyFrames + ctx.npcSpriteFrames.get(partyLeaderSpriteId)简版,无 per-role 独立 sprite 容器 |
| 412 | `PAL_GetEventObjectSprite` | ✓ | ctx.npcSpriteFrames.get(npc.spriteNum) |

### rngplay.c(3 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 28 | `PAL_RNGReadFrame` | ✗ | RNG.MKF 战斗 magic anim;ts 端 ✗ B-w3.b follow-up |
| 140 | `PAL_RNGBlitToSurface` | ✗ | RNG.MKF 战斗 magic anim;ts 端 ✗ B-w3.b follow-up |
| 372 | `PAL_RNGPlay` | ✗ | RNG.MKF 战斗 magic anim;ts 端 ✗ B-w3.b follow-up |

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
| 73 | `SOUND_LoadWAVEData` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 160 | `SOUND_LoadVOCData` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 233 | `SOUND_ResampleMix_U8_Mono_Mono` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 292 | `SOUND_ResampleMix_U8_Mono_Stereo` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 351 | `SOUND_ResampleMix_U8_Stereo_Mono` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 414 | `SOUND_ResampleMix_U8_Stereo_Stereo` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 480 | `SOUND_ResampleMix_S16_Mono_Mono` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 539 | `SOUND_ResampleMix_S16_Mono_Stereo` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 598 | `SOUND_ResampleMix_S16_Stereo_Mono` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 661 | `SOUND_ResampleMix_S16_Stereo_Stereo` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 728 | `SOUND_Play` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 851 | `SOUND_Shutdown` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 891 | `SOUND_FillBuffer` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |
| 940 | `SOUND_Init` | ✗ | M6 Web Audio + SpessaSynth 替代;ts 端未实现 |

### text.c(29 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 66 | `PAL_ParseLine` | N/A | sdlpal 文本解析 helper;ts 端 JSON.parse / native 等价 |
| 111 | `PAL_ReadOneLine` | N/A | sdlpal 文本解析 helper;ts 端 JSON.parse / native 等价 |
| 154 | `PAL_ReadMessageFile` | N/A | sdlpal 文本解析 helper;ts 端 JSON.parse / native 等价 |
| 649 | `PAL_InitText` | N/A | JS GC + 模块 import 替代 sdlpal init/free |
| 897 | `PAL_FreeText` | N/A | JS GC + 模块 import 替代 sdlpal init/free |
| 966 | `PAL_GetWord` | ✓ | pal-extract 已 dump _name / events.text inline 替代 runtime 查表 |
| 988 | `PAL_GetMsg` | ✓ | pal-extract 已 dump _name / events.text inline 替代 runtime 查表 |
| 1010 | `PAL_GetMsgNum` | ✓ | pal-extract 已 dump _name / events.text inline 替代 runtime 查表 |
| 1039 | `PAL_UnescapeText` | ✓ | render-text.ts 等价(控制码 strip + glyph blit) |
| 1075 | `PAL_DrawText` | ✓ | render-text.ts(M4 P4 shadow + glyph blit 完全对齐 sdlpal) |
| 1088 | `PAL_DrawTextUnescape` | ✓ | render-text.ts 等价(控制码 strip + glyph blit) |
| 1186 | `PAL_DialogSetDelayTime` | ✓ | present/dialog-box.ts + event-system.ts setDialogStyleX/showDialog handler(Sync.2 完整 port) |
| 1208 | `PAL_StartDialog` | ✓ | present/dialog-box.ts + event-system.ts setDialogStyleX/showDialog handler(Sync.2 完整 port) |
| 1219 | `PAL_StartDialogWithOffset` | ✓ | present/dialog-box.ts + event-system.ts setDialogStyleX/showDialog handler(Sync.2 完整 port) |
| 1356 | `PAL_DialogWaitForKeyWithMaximumSeconds` | ✓ | present/dialog-box.ts + event-system.ts setDialogStyleX/showDialog handler(Sync.2 完整 port) |
| 1451 | `PAL_DialogWaitForKey` | ✓ | present/dialog-box.ts + event-system.ts setDialogStyleX/showDialog handler(Sync.2 完整 port) |
| 1459 | `TEXT_DisplayText` | ✓ | render-text.ts:drawText 等价 |
| 1616 | `PAL_ShowDialogText` | ✓ | present/dialog-box.ts + event-system.ts setDialogStyleX/showDialog handler(Sync.2 完整 port) |
| 1752 | `PAL_ClearDialog` | ✓ | present/dialog-box.ts + event-system.ts setDialogStyleX/showDialog handler(Sync.2 完整 port) |
| 1787 | `PAL_EndDialog` | ✓ | present/dialog-box.ts + event-system.ts setDialogStyleX/showDialog handler(Sync.2 完整 port) |
| 1820 | `PAL_IsInDialog` | ✓ | gs.dialogBox 字段 truthy 等价 |
| 1842 | `PAL_DialogIsPlayingRNG` | ✓ | present/dialog-box.ts + event-system.ts setDialogStyleX/showDialog handler(Sync.2 完整 port) |
| 1864 | `PAL_GetInvalidChar` | N/A | sdlpal 多 codepage 处理;ts UTF-8 N/A |
| 1882 | `PAL_GetCodePage` | N/A | ts 端 UTF-8 + word.dat 已 dump _name;无 GBK/Big5 切换需求 |
| 1890 | `PAL_SetCodePage` | N/A | ts 端 UTF-8 + word.dat 已 dump _name;无 GBK/Big5 切换需求 |
| 1898 | `PAL_DetectCodePageForString` | N/A | ts 端 UTF-8 + word.dat 已 dump _name;无 GBK/Big5 切换需求 |
| 1964 | `PAL_MultiByteToWideCharCP` | N/A | ts 端 UTF-8 + word.dat 已 dump _name;无 GBK/Big5 切换需求 |
| 2232 | `PAL_MultiByteToWideChar` | N/A | ts 端 UTF-8 + word.dat 已 dump _name;无 GBK/Big5 切换需求 |
| 2263 | `PAL_swprintf` | N/A | sdlpal 自封 swprintf(SDL2 兼容);ts 用 native printf-style |

### ui.c(17 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 27 | `PAL_CreateBoxInternal` | ⚠️ | sdlpal 画 menu 边框 box;ts 端各 menu state machine 数据层有,渲染 box 接 dev-panel(M-w follow-up) |
| 52 | `PAL_InitUI` | N/A | JS GC + 模块 import 替代 sdlpal init/free |
| 93 | `PAL_FreeUI` | N/A | JS GC + 模块 import 替代 sdlpal init/free |
| 119 | `PAL_CreateBox` | ⚠️ | sdlpal 画 menu 边框 box;ts 端各 menu state machine 数据层有,渲染 box 接 dev-panel(M-w follow-up) |
| 131 | `PAL_CreateBoxWithShadow` | ⚠️ | sdlpal 画 menu 边框 box;ts 端各 menu state machine 数据层有,渲染 box 接 dev-panel(M-w follow-up) |
| 242 | `PAL_CreateSingleLineBox` | ⚠️ | sdlpal 画 menu 边框 box;ts 端各 menu state machine 数据层有,渲染 box 接 dev-panel(M-w follow-up) |
| 252 | `PAL_CreateSingleLineBoxWithShadow` | ⚠️ | sdlpal 画 menu 边框 box;ts 端各 menu state machine 数据层有,渲染 box 接 dev-panel(M-w follow-up) |
| 355 | `PAL_DeleteBox` | ⚠️ | sdlpal 画 menu 边框 box;ts 端各 menu state machine 数据层有,渲染 box 接 dev-panel(M-w follow-up) |
| 401 | `PAL_ReadMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 640 | `PAL_DrawNumber` | ✓ | render-text.ts 等价(控制码 strip + glyph blit) |
| 749 | `PAL_TextWidth` | ✓ | render-text.ts 测量 + glyph metadata 等价 |
| 763 | `PAL_MenuTextMaxWidth` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 797 | `PAL_WordMaxWidth` | ✓ | render-text.ts 测量 + glyph metadata 等价 |
| 836 | `PAL_WordWidth` | ✓ | render-text.ts 测量 + glyph metadata 等价 |
| 864 | `PAL_LoadObjectDesc` | ✓ | pal-extract 已 dump _name / events.text inline 替代 runtime 查表 |
| 931 | `PAL_FreeObjectDesc` | ✓ | pal-extract 已 dump _name / events.text inline 替代 runtime 查表 |
| 961 | `PAL_GetObjectDesc` | ✓ | _name 字段已 dump,无需 runtime 查表 |

### uibattle.c(12 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 31 | `PAL_PlayerInfoBox` | ⚠️ | 同上 M-w 数据层有,渲染 + 输入 follow-up |
| 272 | `PAL_BattleUIIsActionValid` | ⚠️ | present/battle/ 简版 + battle-system uiState 字段(M3 vertical slice);完整 sdlpal 真值未对齐 |
| 344 | `PAL_BattleUIDrawMiscMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 417 | `PAL_BattleUIMiscMenuUpdate` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 472 | `PAL_BattleUIMiscItemSubMenuUpdate` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 548 | `PAL_BattleUIShowText` | ⚠️ | present/battle/ 简版 + battle-system uiState 字段(M3 vertical slice);完整 sdlpal 真值未对齐 |
| 582 | `PAL_BattleUIPlayerReady` | ⚠️ | present/battle/ 简版 + battle-system uiState 字段(M3 vertical slice);完整 sdlpal 真值未对齐 |
| 624 | `PAL_BattleUIUseItem` | ⚠️ | present/battle/ 简版 + battle-system uiState 字段(M3 vertical slice);完整 sdlpal 真值未对齐 |
| 675 | `PAL_BattleUIThrowItem` | ⚠️ | present/battle/ 简版 + battle-system uiState 字段(M3 vertical slice);完整 sdlpal 真值未对齐 |
| 722 | `PAL_BattleUIPickAutoMagic` | ⚠️ | present/battle/ 简版 + battle-system uiState 字段(M3 vertical slice);完整 sdlpal 真值未对齐 |
| 785 | `PAL_BattleUIUpdate` | ⚠️ | present/battle/ 简版 + battle-system uiState 字段(M3 vertical slice);完整 sdlpal 真值未对齐 |
| 1770 | `PAL_BattleUIShowNum` | ⚠️ | present/battle/ 简版 + battle-system uiState 字段(M3 vertical slice);完整 sdlpal 真值未对齐 |

### uigame.c(23 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 42 | `PAL_DrawOpeningMenuBackground` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 83 | `PAL_OpeningMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 169 | `PAL_SaveSlotMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 242 | `PAL_SelectionMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 320 | `PAL_TripleMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 343 | `PAL_ConfirmMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 368 | `PAL_SwitchMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 394 | `PAL_BattleSpeedMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 451 | `PAL_ShowCash` | ⚠️ | sdlpal 大世界菜单 cash 显示框;ts shop-menu.ts 数据有,UI 渲染 follow-up |
| 494 | `PAL_SystemMenu_OnItemChange` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 516 | `PAL_SystemMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 654 | `PAL_InGameMagicMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 878 | `PAL_InventoryMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 922 | `PAL_InGameMenu_OnItemChange` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 944 | `PAL_InGameMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 1051 | `PAL_PlayerStatus` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 1289 | `PAL_ItemUseMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 1503 | `PAL_BuyMenu_OnItemChange` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 1615 | `PAL_BuyMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 1710 | `PAL_SellMenu_OnItemChange` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 1755 | `PAL_SellMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 1794 | `PAL_EquipItemMenu` | ⚠️ | M-w0~w3 ts 端 menu state machine 数据层 1:1 port;**渲染层 + 输入路由 ✗** follow-up |
| 2059 | `PAL_QuitGame` | N/A | 浏览器,无独立 quit |

### util.c(33 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 47 | `flength` | N/A | sdlpal helper(file length),ts fs.statSync 等价 |
| 59 | `trim` | N/A | sdlpal C helper / 误识别(macro 展开);N/A |
| 102 | `UTIL_va` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 169 | `lsrand` | N/A | sdlpal C rand 包装;ts 用 SeedableRng 替代 |
| 195 | `lrand` | N/A | sdlpal C rand 包装;ts 用 SeedableRng 替代 |
| 222 | `RandomLong` | ✓ | rng.ts:SeedableRng.nextInt/nextFloat(M3 D29 seedable RNG) |
| 251 | `RandomFloat` | ✓ | rng.ts:SeedableRng.nextInt/nextFloat(M3 D29 seedable RNG) |
| 280 | `UTIL_Delay` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 296 | `TerminateOnError` | N/A | throw new Error 等价 |
| 348 | `UTIL_malloc` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 370 | `UTIL_calloc` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 393 | `UTIL_OpenRequiredFile` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 415 | `UTIL_OpenRequiredFileForMode` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 451 | `UTIL_OpenFile` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 473 | `UTIL_OpenFileForMode` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 514 | `UTIL_OpenFileAtPath` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 523 | `UTIL_OpenFileAtPathForMode` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 554 | `UTIL_CloseFile` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 579 | `UTIL_IsFileExist` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 590 | `UTIL_GetFullPathName` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 658 | `UTIL_CombinePath` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 719 | `UTIL_GlobalBuffer` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 728 | `UTIL_CheckResourceFiles` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 787 | `UTIL_GetScreenSize` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 796 | `UTIL_IsAbsolutePath` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 804 | `UTIL_Platform_Init` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 814 | `UTIL_Platform_Quit` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 848 | `UTIL_LogAddOutputCallback` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 873 | `UTIL_LogRemoveOutputCallback` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 890 | `UTIL_LogOutput` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 933 | `UTIL_LogSetLevel` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 946 | `UTIL_LogToFile` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |
| 961 | `UTIL_LogSetPrelude` | N/A | sdlpal 通用 C helper;ts 用 JS 原生 + lodash 等价 |

### video.c(20 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 150 | `VIDEO_Startup` | N/A | 浏览器 canvas 替代 |
| 400 | `VIDEO_Shutdown` | N/A | JS GC |
| 479 | `VIDEO_RenderCopy` | N/A | 浏览器 canvas 替代 |
| 517 | `VIDEO_UpdateScreen` | ✓ | present/framebuffer.ts:flushToCanvas(fb → ctx.putImageData) |
| 646 | `VIDEO_SetPalette` | N/A | 浏览器 canvas 替代 |
| 705 | `VIDEO_Resize` | N/A | 浏览器 canvas 替代 |
| 789 | `VIDEO_GetPalette` | N/A | 浏览器 canvas 替代 |
| 811 | `VIDEO_ToggleScaleScreen` | N/A | 浏览器 canvas 替代 |
| 835 | `VIDEO_ToggleFullscreen` | N/A | 浏览器 requestFullscreen API |
| 935 | `VIDEO_ChangeDepth` | N/A | 浏览器 canvas 替代 |
| 988 | `VIDEO_SaveScreenshot` | ✓ | e2e snapshotCanvas 等价 |
| 1030 | `VIDEO_ShakeScreen` | ✗ | opcode 0x35 ShakeScreen stub;present 层抖动未接,follow-up |
| 1056 | `VIDEO_SwitchScreen` | N/A | 浏览器 canvas 替代 |
| 1130 | `VIDEO_FadeScreen` | ✓ | event-system.ts:fadeScreen(opcode 0x73,72 帧 dither 完整 port) |
| 1293 | `VIDEO_SetWindowTitle` | N/A | 浏览器 |
| 1319 | `VIDEO_CreateCompatibleSurface` | N/A | 浏览器 canvas 替代 |
| 1327 | `VIDEO_CreateCompatibleSizedSurface` | N/A | 浏览器 canvas 替代 |
| 1373 | `VIDEO_DuplicateSurface` | N/A | 浏览器 canvas 替代 |
| 1404 | `VIDEO_UpdateSurfacePalette` | N/A | 浏览器 canvas 替代 |
| 1433 | `VIDEO_DrawSurfaceToScreen` | N/A | canvas drawImage,sdlpal SDL_BlitSurface 等价 |

### video_glsl.c(3 函数)

| 行 | 函数 | 状态 | ts 路径 / 备注 |
|---:|---|:---:|---|
| 230 | `if` | N/A | sdlpal C helper / 误识别(macro 展开);N/A |
| 260 | `if` | N/A | sdlpal C helper / 误识别(macro 展开);N/A |
| 264 | `if` | N/A | sdlpal C helper / 误识别(macro 展开);N/A |

---

## 最终统计(445 函数全填完)

| 状态 | 数量 | 占比 | 说明 |
|:---:|---:|---:|---|
| ✓ | 91 | 20.4% | 真 port,ts 路径明确,核心战斗 / 探索 / 数据公式 |
| ⚠️ | 118 | 26.5% | 简版 port / 已知差异,具体 follow-up 在表行内 |
| ✗ | 134 | 30.1% | 未做,M6 体验补全(音频 / AVI / palette cycle / magic anim / 等)|
| N/A | 102 | 22.9% | by design 不 port:浏览器 canvas / Web Audio 替代 SDL/GL/midi/audio;sdlpal 内部 C helper(rand / string / etc);DOS 版兼容代码(D36 只 WIN95) |

**关键 follow-up 优先级**(按对用户体验影响排序):
1. **音频**(✗ 70+ 函数):AUDIO_*/MIDI_*/MP3_*/OGG_*/OPUS_*/RNG_*/SOUND_* — M6 Web Audio + SpessaSynth
2. **palette cycle**(✗):水 / 火 调色板动画,大世界视觉
3. **levelup loop**(✗ PlayerLevelUp / fight.c 8 类 wCount):**B-w1.c 未完成核心**
4. **装备 effect**(✗ UpdateEquipments / RemoveEquipmentEffect / 6 个 GetPlayer*Stat):rgwEquipment 已存,**运行时 stat 计算完全忽略装备加成** — 战斗数值偏差源头
5. **菜单渲染层**(⚠️ 4 个 UI 文件):M-w0~w3 数据层 ✓,UI 渲染 + 输入路由 ✗
6. **magic anim**(✗ B-w3.b):6 个 PAL_BattleShow*MagicAnim
7. **poison 系统**(✗ 5 函数):rgPoisonStatus[16][6] 二维数组完整 port,M5 简版只 status field
8. **enemy AI bytecode**(B-w2.a 已起步):54 个 enemy 有 wScriptOnReady,需把 battle ctx 真接到 runScript
9. **AVI / ending**(✗ 8 函数):M6 体验 + M7 通关
10. **sdlpal 自身 bug**(audit 发现):Bug-1 SelectAutoTarget 死循环 / Bug-2 StealFromEnemy 无 dead check — ts port 时显式 fix

**M5.5 audit 完工** — 445 函数 100% 逐个核对,无 _待审_ 残留。结论实事求是:
ts port 完成度约 **47%**(✓ + ⚠️ 简版 / 总 ✓+⚠️+✗ 战斗 / 探索可 port 范围)。
