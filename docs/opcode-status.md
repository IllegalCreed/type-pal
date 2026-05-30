# Opcode Status · type-pal

> 脚本 opcode / 事件解释器逐指令实现状态 —— **标注清楚所有 opcode,最后不漏任何一个**。**事件 / opcode 的单一真值源**(163 全集)。
> **职责**:本表 owns 每个 opcode 的实现状态。引擎功能(menu / battle / scene / cutscene)→ [feature-status](feature-status.md);资源提取 → [resource-status](resource-status.md)。
> **三表**:[feature-status](feature-status.md)(引擎功能)· opcode-status(事件 / opcode,本表)· [resource-status](resource-status.md)(资源提取)
> **图例**:✅ done · ⚠️ partial(extraction 已收集目标,runtime 待)· ⬜ todo · N/A
> **类别**:A=控制流/数据 · B=移动/NPC · C=palette · D=audio/FBP/视觉(需 M6 infra)· E=战斗 · S=系统/UI
> **最后更新**:2026-05-30 — **E 类法术伤害结算 keystone + 0x66**:E1 inline 攻击法术伤害接进 performMagic(5 元素咒真伤害)+ 0x42 SimulateMagic + **0x66 throw weapon**(与 0x42 共用 simulateMagic)+ 投掷物全链(符/卵/武器)+ 补提取 rgObject(object-magics.json)。+ **0x68/0x91 jump** + **0x21 伤害** + **0x5B/0x39 HP** + **敌人毒 pipeline(0x28 apply + 0x5E check + postAction 毒 tick)**。剩余 D 类音频(需 M6)+ E 类其余战斗 opcode(0x60/0x9E/0x6B/0x30 等)。
>
> sdlpal 真值出处:`reference/sdlpal/script.c`(PAL_InterpretInstruction 587-3115 / PAL_RunTriggerScript 3140+ / PAL_RunAutoScript 3482+)。全集:控制流 0x00-0x0A + 数据/动作 0x0B-0xA6(不存在:0x32 / 0x48 / 0x72 / 0x9D)。

> **2026-05-29 session 5 大批完成**(见各 commit):
> - C 类调色板:0x53/0x54 昼夜(+ 夜间调色板真值接线)、0x80 PaletteFade、0x8B setPalette —— **全 ✅**
> - D 类视觉:0x4F FadeToRed、0x50/0x51 FadeOut/In、0x93 SceneFade、0x9B FadeToScene(特效 A);
>   0x71 wave、0x76 ShowFBP(dither)、0xA4 ScrollFBP、0xA5 ShowFBP+effectSprite(特效 B);
>   0x36/0x37 RNG(特效 C);0x96 EndingAnimation + PAL_EndingScreen DOS 全编排 —— **全 ✅**
> - 配套:开场/结局双版 devpanel、夜间调色板/SOUNDS/Musics/map104·164 提取补齐。
>
> 剩余 D 类只剩**音频**(需 M6 音频子系统):0x45 battle music、0x77 stop music、0xA3 CD music。
> **A/S 类至此全 ✅**(逐条记录):
> - 0x4D wait-any-key:✅ 已实现(2026-05-30,commit 53c8cbf;waiting='wait-key',Confirm/Menu/Cancel 解除)
> - 0x4E load-game:✅ 已实现(2026-05-30,commit 56fe8b7;fade-out + 重载 gs.currentSaveSlot + 停脚本)
> - 0xA0 quit/ending:✅ 已实现(2026-05-30,commit 30a4822;WIN95 播 4/5/6.mp4→回标题,DOS 直接回标题,跳过引擎 credits)
> - 0x78 / 0xA6:✅ 显式 no-op 文档化(2026-05-30,commit 1196faf;0x78 本游戏 35 用全空操作,0xA6 0 用)
> - 0x0A goto-if-no:✅ 已实现(2026-05-30;waiting='confirm' 阻塞否/是确认框,否/cancel→goto operand[0],
>   是→ip++;复用 drawConfirmBox;否/是 toggle;PAL_ClearDialog(FALSE) 问句留屏 + isDialogContinuationOp 豁免
>   Space-wait。script.c:3373-3387 / uigame.c:342-365;26 用,水果贩"要不要来几个"等。**A 类至此全 ✅**)
> - 0x41 mark-failed:✅ **早已实现**(OP_MARK_SCRIPT_FAILED case event-system.ts:3355 → fScriptSuccess=false;
>   配 consumePendingItem 按 g_fScriptSuccess gate 扣物品。此前本表误标 ⬜,2026-05-30 订正)
>
> dialog/text(2026-05-30):逐字符颜色控制符全套 ✅(commit 77f6c2e;`"`黄/`-`青/`'``@`红 toggle + 消费 `()$~\`)
> + 时间驱动打字 ✅(commit bea9475;$NN 变速 + ~NN 尾暂停,对齐 sdlpal iDelayTime)。
> scene:0x05 redraw 对齐 PAL_MakeScene 自动淡入(commit ef70491,修仙灵岛靠岸黑屏);autoScript goto 不消耗帧
> (commit eaaa1d5,修张四划船掉船尾);scene-load 失败兜底解冻(commit 9791497)。

## 控制流(0x00-0x0A)

| op | 含义 | 状态 | 备注 |
|----|------|------|------|
| 0x00 | end(stop,park) | ✅ | event-system 'end' |
| 0x01 | end advance(下一行) | ✅ | onEnter 持久化 + autoScript |
| 0x02 | end reset(resetTo) | ✅ | autoScript reset loop |
| 0x03 | goto | ✅ | 含 shared#L_x 跨 scene |
| 0x04 | call script(子脚本) | ✅ | 调用栈(238 次最高频) |
| 0x05 | redraw screen / ClearDialog | ✅ | 对齐 sdlpal PAL_MakeScene(needToFadeIn→淡入,修仙灵岛靠岸黑屏,ef70491) |
| 0x06 | jump by rate | ✅ | OP_JUMP_BY_RATE |
| 0x07 | start battle | ✅ | |
| 0x08 | replace entry with next | ✅ | 默认 raw 路径 ip++ 已等价(continue);wNextScriptEntry resume 边缘情形未做 |
| 0x09 | wait N frames | ✅ | frame-wait |
| 0x0A | goto if player selected no | ✅ | waiting='confirm' 否/是确认框;否/cancel→goto operand[0],是→ip++(script.c:3373) |

## 数据/动作 0x0B-0xA6 — 已实现 ✅

0x0B-0x2F(移动 contact / 属性 / 物品 / poison / status 主干)、0x35 shake、0x40 setTriggerMethod、
0x43 playMusic、0x46 setPartyPos、0x47 playSfx、0x49 setObjState、0x4A setBattlefield、
0x55 addMagic、0x56 removeMagic、0x58 jumpIfItemLess、0x59 loadScene、0x5D jumpIfNotPoisonKind、
0x61 jumpIfNotPoisoned、0x65 setPlayerSprite、0x6C npcWalkOneStep、0x6E playerWalkOneStep、
0x6F syncObjState、0x70 walkParty、0x73 fadeScreen、0x74 jumpIfNotAllFullHP、0x75 setParty、
0x79 jumpIfPlayerInParty、0x7F moveViewport、0x81 jumpIfNotFacing、0x82 npcWalkToHigh、
0x83 jumpIfObjNotInZone、0x86 jumpIfNotEquipped、0x8E restoreScreen、0x90 setObjectScript、
0x94 jumpIfObjState、0x95 jumpIfScene、0x9A setMultiObjState、0xA2 randomJump、
setDialogStyle 0x3B-0x3E。

**B 类移动全套(2026-05-28)**:0x3F/0x44/0x97 rideObject(speed 2/4/8)、0x4B nullify、
0x4C monsterChase、0x52 hideObject、0x62/0x63 chasePause/Speedup、0x7A/0x7B partyWalkTo(speed 4/8)、
0x7C npcWalkTo(speed 4 + stagger)、0x7D moveObject、0x7E setObjectLayer、0x87 animateObject。

## 数据/动作 0x0B-0xA6 — 待实现 ⬜⚠️

### A 控制流/数据 / 系统 S — **全部 ✅(2026-05-30 0x0A 收口)**
| op | 含义 | 状态 | 备注 |
|----|------|------|------|
| 0x0A | goto if selected no | ✅A | waiting='confirm' 阻塞否/是确认框(否=WORD19/是=WORD20,默认否)。否/cancel/Menu→goto operand[0],是→ip++。PAL_ClearDialog(FALSE) 问句留屏 + isDialogContinuationOp 豁免 Space-wait;复用 drawConfirmBox(draw-confirm.ts)。script.c:3373-3387 / uigame.c:342-365,26 用 |
| 0x41 | mark script failed | ✅A | OP_MARK_SCRIPT_FAILED case(event-system.ts:3355)→ gs.fScriptSuccess=false;consumePendingItem 按 g_fScriptSuccess gate 扣物品(script.c:1623-1627)。此前误标 ⬜,2026-05-30 订正 |
| 0x6D | set scene enter/teleport script | ✅A | onEnter 全局 override → loadScene 时解析为 local ip(op2 teleport 暂略) |
| 0x84 | place used item as event object | ✅A | pCurrent(op0)放 party 正前方 + sState=op1;挡→jump op2(2026-05-28) |
| 0x85 | delay N | ✅A | UTIL_Delay(op0*80ms)time-based waiting='delay'(autoScript 暂停)(script.c:2511,2026-05-29) |
| 0x8D | increase player level | ✅A | PAL_PlayerLevelUp 端口:level+clamp99 + stat 增长(Math.random)+ Exp 重置(global.c:2347,2026-05-29) |
| 0x8F | halve cash | ✅A | dwCash = floor(dwCash/2)(script.c:2598,2026-05-29) |
| 0x98 | set follower | ✅A | 数据✅(gs.followers+nFollower)+ 视觉✅(present computeFollowerRenderItems,trail[3+k]/恒3帧/iStepFrameFollower[0,2,0,1],sdlpal scene.c:210-226/732-743/767-771,6 单测)。**operand = MGO sprite chunk 直接**(res.c:335-348 follower 路径,**不**走队员 rgwSpriteNum[role] 查表,res.c:325)→ 临时同行 NPC(scene 102 书生 = chunk 82/83,非 6 人角色表)直接 npcSpriteFrames.get(chunk)。chunk 未载入→跳过(防御)。**跨场景持久已 ✓**(npcSpriteFrames 累积不清 + gs.followers 换场景不重置 + 全 gs 存档;sdlpal 是"0x98 kLoadPlayerSprite 载一次 + 换场景只 kLoadScene 不重载"实现,等价)。进场景定位:OP_SET_PARTY_POS(0x46)✅ 补填 gs.trail[0..4]=队伍位置+身后偏移(sdlpal script.c 0x46,commit f159e32,2 单测)→ 进新场景跟随者/队员立刻排好。**跨场景三条腿(数据/sprite/trail)全对齐 sdlpal** |
| 0x99 | change map for scene | ✅A | mapNum override + op0=0xFFFF map-only reload hook(换 tilemap 不中断脚本) |
| 0xA0 | quit game | ✅S | _quitHandler:WIN95 播 4/5/6.mp4→回标题,DOS 直接回标题(跳引擎 credits)(script.c:2988,30a4822) |
| 0xA1 | set all party pos = first | ✅A | 全 trail(5)= 队首世界坐标+朝向 → follower 聚拢(script.c:2998,2026-05-29) |
| 0x4D | wait for any key | ✅S | waiting='wait-key',Confirm(kKeySearch)/Menu/Cancel(kKeyMenu)解除(play.c:602,53c8cbf) |
| 0x4E | load last saved game | ✅S | fade-out + _loadLastSaveHandler(gs.currentSaveSlot)+ 停脚本(script.c:1760,56fe8b7) |

### B 移动 / NPC / chase — 全部 ✅(2026-05-28)
| op | 含义 | 状态 | 备注(sdlpal 出处) |
|----|------|------|------|
| 0x3F | ride event object low speed | ✅ | partyRideEventObject speed 2(script.c:1609 / fn 203-307);主 while 阻塞 retry |
| 0x44 | ride normal speed | ✅ | speed 4(script.c:1654) |
| 0x97 | ride higher speed | ✅ | speed 8(script.c:2705) |
| 0x4B | nullify event object short while | ✅ | self.sVanishTime=-15(script.c:1726-1730) |
| 0x4C | chase player | ✅ | monsterChasePlayer(script.c:1733-1751 / fn 309-501);障碍检测经 setObstacleChecker hook(=!isWalkable) |
| 0x52 | hide event object(default 800) | ✅ | self.sState*=-1 + sVanishTime=op0?op0:800(script.c:1794-1799) |
| 0x62 | pause enemy chasing | ✅ | wChasespeedChangeCycles=op0, wChaseRange=0(script.c:1967-1972) |
| 0x63 | speed up enemy chasing | ✅ | wChasespeedChangeCycles=op0, wChaseRange=3(script.c:1975-1980) |
| 0x7A | walk party high speed | ✅ | partyWalkTo speed 4(script.c:2249) |
| 0x7B | walk party highest speed | ✅ | partyWalkTo speed 8(script.c:2256) |
| 0x7C | walk straight to pos | ✅ | npcWalkTo speed 4 + stagger gate `(id&1)^(frameNum&1)`(script.c:2259-2275) |
| 0x7D | move event object | ✅ | pCurrent.x+=SHORT(op1) y+=SHORT(op2)(script.c:2277-2283) |
| 0x7E | set layer of event object | ✅ | pCurrent.sLayer=SHORT(op1)(script.c:2285-2290) |
| 0x87 | animate event object | ✅ | NPCWalkOneStep(id,0):仅推进动画帧(script.c:2540-2544) |

> 注:**0x5C 不是 B 类** —— `g_Battle.iHidingTime = -op0`(script.c:1907-1911)是**战斗**态(party 隐身回合),已移到 E 类。

### E 战斗(多数需战斗系统/enemy 状态前置)

> **2026-05-30 法术伤害结算 keystone 完成**(commit 见下):
> - **E1 inline 攻击法术伤害**:`performMagic` 接上 `PAL_BattleCommitAction kBattleActionMagic`
>   offensive 内联结算(fight.c:4270-4318)。此前 `calcMagicDamage` **零 caller**,5 个元素咒
>   (风/雷/水/火/土,mn0-5,baseDamage>0)打 0 血 → 现真伤害。player→enemy only(enemy 施法是
>   另一 sdlpal 函数);guard `(SHORT)baseDamage>0`;str=role.magicStrength(装备加成暂略);
>   minDamage=1;applyToAll→全体;防御类(applyToPlayer/Party/Trance)不结算。
> - **共享核心** `applyMagicDamage`(battle/magic-damage.ts):inline 与 0x42 同源,只差 magStr 来源
>   + minDamage(1 vs 0)。def=(SHORT)defense+(level+6)*4 clamp≥0 → calcMagicDamage(mult=1)→
>   `max(dmg,minDamage)` → health-=。
> - **0x42 SimulateMagic ✅** + **0x66 throw weapon ✅**(共用 `simulateMagic` 核心,= sdlpal
>   PAL_BattleSimulateMagic 一个函数;0x66 多 `w=op1*5+attackStrength*RandomLong(0,3)` 一步)
>   + **投掷物全链**:`performThrowItem`(scriptOnThrow + 扣 1)+ throw-item action 派发 +
>   战斗物品菜单 throwable→throw-item 路由。符/镖/卵/蛊(0x42)+ 武器(0x66 长鞭/木剑/仙女剑…)全可用。
> - **补提取 rgObject**:`object-magics.json`(parseObjectMagics dump 完整 OBJECT 数组 magic-union 视图)
>   —— 0x42 op0 可低至 24(item 段之下,不在 spells.json [296..397]);全 15 个 op0 站点可解析。
>   object24→magic96 baseDamage=64537=SHORT−999(sentinel)→ 0x42 算 0 伤害(投掷物动画,真伤害靠
>   后随 0x21/0x28 opcode);真伤害投掷物如 天师符 obj349→magic54 baseDamage140。
>
> **仍待**:0x42 不 emit 伤害弹幕(BattleCtx 无 bus,同其它战斗 opcode);offensive 特效法术的
> scriptOnSuccess(回梦/夺魂 0x60 KO / 0x68 jump 等)未跑 —— 依赖 0x60/0x68/0x91/0x9E 等 E 类待做
> opcode,keystone 元素咒(scriptOnSuccess=0)不受影响。

| op | 含义 | 备注 |
|----|------|------|
| 0x30 | increase player stat temp by % | battle buff |
| 0x31 | change battle sprite temp | |
| 0x21 | inflict flat damage to enemy | ✅ **battle handler**(此前只 explore 主干):op0!=0 全体 / 否则单体(ctx.target),health -= op1 clamp≥0(script.c:0021)。梅花镖/银针 scriptOnThrow 真伤害(0x42=0 动画 sentinel,真伤靠这);毒 tick 也用。battle-opcodes.ts |
| 0x28 | apply poison to enemy | ✅ **battle handler**:op0!=0 全体 / 否则单体(ctx.target);`RandomLong(0,9)>=resistanceToSorcery` 抗性判定 + 去重 + 槽满(MAX_POISONS 16)→ 加 {poisonId:op1, scriptEntry:objectPoisons[op1].enemyScript}(script.c:0028)。毒蛇卵/卵/蛊 throw。注:sdlpal 立即跑一次 wEnemyScript,ts 改 postAction tick 跑(差一拍)。battle-opcodes.ts |
| 0x33 | collect enemy for items | |
| 0x34 | transform collected enemies to items | |
| 0x38 | teleport party out of scene | |
| 0x39 | drain HP from enemy | ✅ enemy.health -= op0;movingPlayer.hp += op0(clamp maxHP)(script.c:0039)。吸星锁 scriptOnThrow:enemy=ctx.target,player=caster。battle-opcodes.ts |
| 0x3A | player flee battle | |
| 0x42 | simulate magic for player | ✅ PAL_BattleSimulateMagic(fight.c:5300)。op0=magic object id / op1=baseDamage(当 magStr)/ op2=target+1(0→eventObjectID)。applyToAll flag 优先→全体,否则 i=op2-1<0 用 eventObjectID / 仍<0 自动选首活敌;guard 无符号 `baseDamage>0‖op1>0`(magic96=−999 进但算 0);minDamage=0;共享 applyMagicDamage。battle-opcodes.ts;script.c:1630-1640。投掷物 scriptOnThrow ×40 站点全靠它 |
| 0x57 | set magic base damage by MP | |
| 0x5A | halve player HP | |
| 0x5B | halve enemy HP | ✅ w=floor(health/2)+1,cap op0;health -= w(script.c:005B)。无影毒 scriptOnThrow:enemy=ctx.target。battle-opcodes.ts |
| 0x5C | hide party for a while(battle) | g_Battle.iHidingTime=-op0(script.c:1907-1911)— 原误判 B,实为战斗态 |
| 0x5E | jump if enemy no poison | ✅ 敌人(ctx.target)毒槽无 op0 种毒 → jump op1(script.c:005E)。配齐**敌人毒 pipeline**:BattleEnemy.poisons by-ID + 0x28 apply + postAction 毒 tick。battle-opcodes.ts |
| 0x5F | kill player | |
| 0x60 | KO enemy | |
| 0x64 | jump if enemy HP > % | ⚠️ extraction 已收集目标,runtime 待 |
| 0x66 | throw weapon to enemy | ✅ script.c:2007-2014:`w=op1*5+PAL_GetPlayerAttackStrength(movingPlayer)*RandomLong(0,3)` → 调**同一** PAL_BattleSimulateMagic(target=eventObjectID,magStr=w)。与 0x42 共用 `simulateMagic`(magic-damage.ts)。32 个可投掷武器(长鞭/木剑/铁剑/仙女剑…)scriptOnThrow 用;op0∈{344,360}。attackStrength 经 BattleCtx.playerRoles 注入(performThrowItem),装备加成略 |
| 0x67 | enemy use magic | |
| 0x68 | jump if enemy turn | ✅ `if (g_Battle.fEnemyMoving) jump op0`(script.c:2025)。ts:fEnemyMoving ≈ caster 是 enemy(法术 scriptOnSuccess 敌人施法时 caster=enemy → jump,玩家施法 ip++)。op0=0 → jump 全局 end。battle-opcodes.ts,9 用 |
| 0x69 | enemy escape | |
| 0x6A | steal from enemy | |
| 0x6B | blow away enemies | |
| 0x88 | set magic base damage by money | |
| 0x89 | set battle result | |
| 0x8A | enable auto-battle | |
| 0x91 | jump if enemy not first of kind | ✅ 数同 wObjectID 敌人,self_pos>1(非首个)→ jump op0(script.c:2091)。ts 同种=同 e.id。用途:同种敌人组脚本只在第一个跑。真实数据 op0 全 0(→跳到 end)。battle-opcodes.ts,5 用 |
| 0x92 | magic casting anim (battle) | |
| 0x9C | enemy division | |
| 0x9E | enemy summon | |
| 0x9F | enemy transform | |

### C palette / D audio·FBP·视觉
| op | 含义 | 类 | 状态 |
|----|------|-----|------|
| 0x36 | set current playing RNG anim | D | ✅ 8872b54(特效 C) |
| 0x37 | play RNG anim | D | ✅ 8872b54(_rngPlayHandler + playRng) |
| 0x4F | fade screen to red(game over) | D | ✅ fec9a11(特效 A buildFadeToRed) |
| 0x50 | screen fade out | D | ✅ fec9a11(冻屏淡黑 015f77e) |
| 0x51 | screen fade in | D | ✅ fec9a11(+ 夜色 target ac8612e) |
| 0x53 | use day palette | C | ✅ 8fe20e4 |
| 0x54 | use night palette | C | ✅ 8fe20e4(夜色接线 ac8612e) |
| 0x71 | wave screen | D | ✅ 8872b54(present screen-wave PAL_ApplyWave) |
| 0x76 | show FBP picture | D | ✅ 5c7aece(PAL_ShowFBP dither fade-in) |
| 0x80 | toggle day/night palette | C | ✅ fec9a11(+ 夜色 target ac8612e) |
| 0x8B | change current palette | C | ✅(_fetchPalette setPalette) |
| 0x8C | fade from/to color | D | ✅ fec9a11(buildColorFade) |
| 0x93 | fade screen + update scene | D | ✅ fec9a11(SceneFade,scene-fade 放行 autoScript) |
| 0x96 | show ending animation | D | ✅ d517919(PAL_EndingAnimation 400 帧) |
| 0x9B | fade to current scene | D | ✅ fec9a11(复用 dither fadeState) |
| 0xA4 | scroll FBP to screen | D | ✅ 046a583(PAL_ScrollFBP 220 步) |
| 0xA5 | show FBP with sprite effects | D | ✅ f600c03(复用 showFbp + effectSprite 叠加) |
| **0x45** | set battle music | D | ⬜ **M6 音频** |
| **0x77** | stop music | D | ⬜ **M6 音频** |
| **0xA3** | play CD music(RIX fallback) | D | ⬜ **M6 音频** |
| 0xA6 | backup screen | D | ✅ 显式 no-op(本游戏 0 调用;0x73 内部已 backup)(script.c:3069,1196faf) |
| 0x78 | FIXME ???(sdlpal `case 0x78: break;`) | — | ✅ 显式 no-op(sdlpal 标 FIXME 字面空操作;本游戏 35 用全空)(script.c:2224,1196faf) |
