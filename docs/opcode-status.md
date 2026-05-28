# Script opcode 实现状态(sdlpal `PAL_InterpretInstruction` / `PAL_RunTriggerScript`)

> 目的:**标注清楚所有 opcode 的实现状态,最后不漏任何一个**。
> sdlpal 真值出处:`reference/sdlpal/script.c`(PAL_InterpretInstruction 587-3115 / PAL_RunTriggerScript 3140+ / PAL_RunAutoScript 3482+)。
> 全集:控制流 0x00-0x0A + 数据/动作 0x0B-0xA6(不存在:0x32 / 0x48 / 0x72 / 0x9D)。
>
> 状态:✅ 已实现 · 🟡 部分(extraction 已收集目标,runtime 待) · ⬜ 待实现
> 类别:A=控制流/数据 · B=移动/NPC · C=palette · D=audio/FBP/视觉(需 M6 infra) · E=战斗 · S=系统/UI

最后更新:2026-05-29(A 类补 0x84/0x85/0x8D/0x8F/0xA1)

> 剩余 A/S 待实现都需前置子系统(非纯 opcode):
> - 0x0A goto-if-no:需 yes/no ConfirmMenu UI + 阻塞选择
> - 0x41 mark-failed:需 fScriptSuccess flag + 把物品消耗改成"脚本末按 success 决定扣"(item-use 流程改)
> - 0x4D wait-any-key / 0x4E load-game / 0xA0 quit:需 UI 等键 / 存档 reload / 退出子系统

## 控制流(0x00-0x0A)

| op | 含义 | 状态 | 备注 |
|----|------|------|------|
| 0x00 | end(stop,park) | ✅ | event-system 'end' |
| 0x01 | end advance(下一行) | ✅ | onEnter 持久化 + autoScript |
| 0x02 | end reset(resetTo) | ✅ | autoScript reset loop |
| 0x03 | goto | ✅ | 含 shared#L_x 跨 scene |
| 0x04 | call script(子脚本) | ✅ | 调用栈(238 次最高频) |
| 0x05 | redraw screen / ClearDialog | ✅ | |
| 0x06 | jump by rate | ✅ | OP_JUMP_BY_RATE |
| 0x07 | start battle | ✅ | |
| 0x08 | replace entry with next | ✅ | 默认 raw 路径 ip++ 已等价(continue);wNextScriptEntry resume 边缘情形未做 |
| 0x09 | wait N frames | ✅ | frame-wait |
| 0x0A | goto if player selected no | ⬜ | A:dialog yes/no 选择分支,需 dialog choice 状态 |

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

## 数据/动作 0x0B-0xA6 — 待实现 ⬜🟡

### A 控制流/数据 / 系统 S(无 battle 前置,可做)
| op | 含义 | 状态 | 备注 |
|----|------|------|------|
| 0x0A | goto if selected no | ⬜A | 需 dialog yes/no ConfirmMenu(UI + 阻塞选择,前置子系统) |
| 0x41 | mark script failed | ⬜A | 需 gs.fScriptSuccess flag + **改物品消耗为"脚本末按 success 扣"**(item-use 流程改) |
| 0x6D | set scene enter/teleport script | ✅A | onEnter 全局 override → loadScene 时解析为 local ip(op2 teleport 暂略) |
| 0x84 | place used item as event object | ✅A | pCurrent(op0)放 party 正前方 + sState=op1;挡→jump op2(2026-05-28) |
| 0x85 | delay N | ✅A | UTIL_Delay(op0*80ms)time-based waiting='delay'(autoScript 暂停)(script.c:2511,2026-05-29) |
| 0x8D | increase player level | ✅A | PAL_PlayerLevelUp 端口:level+clamp99 + stat 增长(Math.random)+ Exp 重置(global.c:2347,2026-05-29) |
| 0x8F | halve cash | ✅A | dwCash = floor(dwCash/2)(script.c:2598,2026-05-29) |
| 0x98 | set follower | 🟡A | 数据✅(gs.followers+nFollower);视觉随"多 follower per-role sprite 渲染"feature(既有 M5+ gap,party[2] 同) |
| 0x99 | change map for scene | ✅A | mapNum override + op0=0xFFFF map-only reload hook(换 tilemap 不中断脚本) |
| 0xA0 | quit game | ⬜S | 退出/回标题(需 quit/ending 子系统) |
| 0xA1 | set all party pos = first | ✅A | 全 trail(5)= 队首世界坐标+朝向 → follower 聚拢(script.c:2998,2026-05-29) |
| 0x4D | wait for any key | ⬜S | UI 等键(需阻塞键等待子系统) |
| 0x4E | load last saved game | ⬜S | 读最近存档(需存档/reload 子系统) |

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
| op | 含义 | 备注 |
|----|------|------|
| 0x30 | increase player stat temp by % | battle buff |
| 0x31 | change battle sprite temp | |
| 0x33 | collect enemy for items | |
| 0x34 | transform collected enemies to items | |
| 0x38 | teleport party out of scene | |
| 0x39 | drain HP from enemy | |
| 0x3A | player flee battle | |
| 0x42 | simulate magic for player | PAL_BattleSimulateMagic |
| 0x57 | set magic base damage by MP | |
| 0x5A | halve player HP | |
| 0x5B | halve enemy HP | |
| 0x5C | hide party for a while(battle) | g_Battle.iHidingTime=-op0(script.c:1907-1911)— 原误判 B,实为战斗态 |
| 0x5E | jump if enemy no poison | 🟡 extraction 已收集目标,runtime 待 |
| 0x5F | kill player | |
| 0x60 | KO enemy | |
| 0x64 | jump if enemy HP > % | 🟡 extraction 已收集目标,runtime 待 |
| 0x66 | throw weapon to enemy | |
| 0x67 | enemy use magic | |
| 0x68 | jump if enemy turn | |
| 0x69 | enemy escape | |
| 0x6A | steal from enemy | |
| 0x6B | blow away enemies | |
| 0x88 | set magic base damage by money | |
| 0x89 | set battle result | |
| 0x8A | enable auto-battle | |
| 0x91 | jump if enemy not first of kind | |
| 0x92 | magic casting anim (battle) | |
| 0x9C | enemy division | |
| 0x9E | enemy summon | |
| 0x9F | enemy transform | |

### C palette / D audio·FBP·视觉(需 M6 渲染/音频 infra)
| op | 含义 | 类 |
|----|------|-----|
| 0x36 | set current playing RNG anim | D |
| 0x37 | play RNG anim | D |
| 0x45 | set battle music | D |
| 0x4F | fade screen to red(game over) | 🟡D 部分(OP_ 常量在,效果待) |
| 0x50 | screen fade out | D |
| 0x51 | screen fade in | D |
| 0x53 | use day palette | C |
| 0x54 | use night palette | C |
| 0x71 | wave screen | D |
| 0x76 | show FBP picture | D |
| 0x77 | stop music | D |
| 0x78 | FIXME ???(sdlpal 未知) | ? 需查 |
| 0x80 | toggle day/night palette | C |
| 0x8B | change current palette | C |
| 0x8C | fade from/to color | D |
| 0x93 | fade screen + update scene | D |
| 0x96 | show ending animation | D |
| 0x9B | fade to current scene | D |
| 0xA3 | play CD music(RIX fallback) | D |
| 0xA4 | scroll FBP to screen | D |
| 0xA5 | show FBP with sprite effects | D |
| 0xA6 | backup screen | D |
