# Opcode Status · type-pal

> 脚本 opcode / 事件解释器逐指令实现状态 —— **标注清楚所有 opcode,最后不漏任何一个**。**事件 / opcode 的单一真值源**(163 全集)。
> **职责**:本表 owns 每个 opcode 的实现状态。引擎功能(menu / battle / scene / cutscene)→ [feature-status](feature-status.md);资源提取 → [resource-status](resource-status.md)。
> **三表**:[feature-status](feature-status.md)(引擎功能)· opcode-status(事件 / opcode,本表)· [resource-status](resource-status.md)(资源提取)
> **图例**:✅ done · ⚠️ partial(extraction 已收集目标,runtime 待)· ⬜ todo · N/A
> **类别**:A=控制流/数据 · B=移动/NPC · C=palette · D=audio/FBP/视觉(需 M6 infra)· E=战斗 · S=系统/UI
> **⚠️ 2026-05-31 逐 opcode 审计修正**:对全 163 opcode 拿 ts 实现对 sdlpal 源逐分支核对(38-agent 审计 + 35-agent 对抗复核)发现 **25 处真问题**(此前误标 ✅):10 🐞bug / 9 ⬜missing-branch / 6 ⚠️简版。**详见下方「审计修正表」,该表对所列 opcode 覆盖本文件正文表格的 ✅ 标注**。此前"全 opcode ✅ 无 todo"的断言**不成立**。
>
> **历史最后更新**:2026-05-30 — E 类 + D 音频收口(opcode handler 存在 + 单测,但**非全分支 1:1**,见审计表)。本轮补齐:
>   battle 0x5F kill-player / 0x5C hide / 0x6B blow / 0x89 set-result / 0x8A auto-battle / 0x33 collect /
>   0x3A flee / 0x9C division / 0x9F transform / 0x30 stat-buff% / 0x31 sprite(present no-op)/
>   0x92 magic-anim(present no-op)/ 0x6A steal;explore 0x34 妖魔转化 / 0x38 teleport-out(fail-path);
>   audio 0x45/0x77/0xA3(state-set,真播待 M6);并修 0x64 maxHp 用 BattleEnemy.maxHealth(非 prevHp 近似)。
>   带文档化残:0x38(dungeon teleport script)/ 0x69(escaped 不掉落)/ 0x30(per-battle Extra 战末清)。
>   早前:法术伤害结算 keystone + 0x42/0x66 simulateMagic + 投掷物全链 + 毒 pipeline + 0x57/0x88 set-magic-damage。
>
> sdlpal 真值出处:`reference/sdlpal/script.c`(PAL_InterpretInstruction 587-3115 / PAL_RunTriggerScript 3140+ / PAL_RunAutoScript 3482+)。全集:控制流 0x00-0x0A + 数据/动作 0x0B-0xA6(不存在:0x32 / 0x48 / 0x72 / 0x9D)。

> **2026-05-29 session 5 大批完成**(见各 commit):
> - C 类调色板:0x53/0x54 昼夜(+ 夜间调色板真值接线)、0x80 PaletteFade、0x8B setPalette —— **全 ✅**
> - D 类视觉:0x4F FadeToRed、0x50/0x51 FadeOut/In、0x93 SceneFade、0x9B FadeToScene(特效 A);
>   0x71 wave、0x76 ShowFBP(dither)、0xA4 ScrollFBP、0xA5 ShowFBP+effectSprite(特效 B);
>   0x36/0x37 RNG(特效 C);0x96 EndingAnimation + PAL_EndingScreen DOS 全编排 —— **全 ✅**
> - 配套:开场/结局双版 devpanel、夜间调色板/SOUNDS/Musics/map104·164 提取补齐。
>
> D 类**音频** 0x45/0x77/0xA3 已接 **state-set**(gs.wNumBattleMusic / wNumMusic);真播(RIX/fade)待 M6 音频子系统。
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

## 🔬 2026-05-31 逐 opcode 审计修正表(权威 — 覆盖正文 ✅)

> 方法:全 163 opcode 拿 ts 实现(applyRawOpcode + dispatchBattleOpcode + tickEventSystem/runScript + runOneAutoOp 全 dispatch 路径)对 sdlpal `script.c`/`fight.c`/`global.c` **逐分支**核对(38-agent 审计),再 35-agent **对抗复核**滤假阳性。下表所列 opcode 的真实状态以此为准。
> 图例:🐞 bug(逻辑错,需修) · ⬜ missing-branch(分支/实现缺) · ⚠️ 简版(主干对、子分支缺)

### 审计真问题 25 处 → **17 已修/逻辑done ✅ / 7 子系统待修 ⬜ / 1 CLASSIC 本就对**
> (0x05 复核后实为"逻辑已做、残仅 cutscene pacing",并入 0x02/03 同源;0x96 audit 误判,CLASSIC 本就对。)

| op | 状态 | commit | 缺口 / 修法 |
|----|------|--------|------|
| 0x1B/1C/1D | ✅ 已修 | 2c3d25d | applyHPMPDelta 加活人 gate(`rgwHP>0`,死人不加 HP/MP);战斗路径本已有 |
| 0x20 | ✅ 已修 | f98ab33 | removeItem 全逻辑:条件检查 + 装备槽消耗 + 不足跳 op[2] + RemoveEquipmentEffect |
| 0x22 | ✅ 已修 | de0424f | battle revive 清全 9 状态;大世界无 status 模型(N/A) |
| 0x23 | ✅ 已修 | 1b24ea9 | removeEquipment 卸装备先 RemoveEquipmentEffect 撤加成(+全移无条件 1:1) |
| 0x2A | ✅ 已修 | d91e9a8 | 战斗 cure-enemy-poison-by-kind 新增(dispatchBattleOpcode) |
| 0x2D/2E/2F | ✅ 已修 | b8eb7da | set/remove player·enemy status(kStatus CLASSIC 映射 + 0x2E 抗性判定+跳) |
| 0x59 | ✅ 已修 | 2c3d25d | loadScene guard:`>0 && ≤MAX_SCENES(300) && !=cur` |
| 0x60 | ✅ 已修 | 2c3d25d | KO-enemy 用 ctx.target(wEventObjectID),非 operand[0](数据恒0→恒杀 enemy[0]) |
| 0x61 | ✅ 已修 | d91e9a8 | jumpIfPlayerNotPoisoned 用 op[0] + 查 isPlayerPoisoned(非恒跳) |
| 0x69 | ✅ 已修 | 40ef07c | enemy-escape → phase=fleed(Terminated 无奖励),非 health=0 误给击杀 |
| 0x6F | ✅ 已修 | 2c3d25d | syncObjState operand[1] 加 SHORT cast(signExtendI16) |
| 0x9E | ✅ 已修 | 2c3d25d | enemy-summon 加 `iHidingTime>0` fail 检查(隐身保护) |
| **0x30** | ✅ 已修 | — | per-battle Extra slot:0x30 写 rgEquipmentEffect[6]=trunc(base*op1/100)不叠加 + 战末清;projectRuntimeToBattleRoles 并入装备 effect → 战斗读 effective(**D14 修**)(script.c:1406-1427) |
| **0x38 / 0x6D** | ✅ 已修 | — | 0x38 成功路径 call+return 跑 teleport 脚本(onTeleportLabel→sceneOnTeleportEntry,override 优先)；0x6D op2→sceneOnTeleportOverride + both-zero 清(script.c:1558/2069-2087) |
| 0x05 | ✅ 逻辑done/残pacing | — | ClearDialog(TRUE)逻辑 + needToFadeIn 淡入**已做**(explore+battle);RNG-restore/BattleMakeScene 分支**对 ts 自动渲染 N/A**;残仅 no-dialog 分支 `UTIL_Delay(op1*60)` 帧延迟 —— **与 0x03 同源**(见下) |
| **0x02 / 0x03** | ⬜ 待修 | — | trigger(tickEventSystem @1556)+ battle(runScript @2276)的 goto/reset 缺 frameDelay gate(autoScript runOneAutoOp @1035 已有)。frameDelay goto 实为 **trigger 过场"NPC 走 N 步"循环**(`0x6C 走一步→0x05 重绘+延迟→0x03 goto frameDelay 计步`,@191/2615/7339 等 17 处)→ ts 无 frameDelay 计数会死循环(SINGLE_TICK_LIMIT)。需 **yield-per-step 模型**(每帧走一步)+ 0x05 的 UTIL_Delay pacing 一起修。谨慎,弄错破过场。 |
| **0x7F** | ✅ 已修 | — | 三分支:回正/绝对跳(op2=0xFFFF camera=op0*32-160,op1*16-112)/相对 pan;多帧 pan→waiting='camera-pan' 逐帧移 camera(script.c:2292-2379) |
| **0x8E** | ✅ 本就忠实 | — | 复核订正:sdlpal 备份在画完 title/portrait 后取(text.c:1734)→ RestoreScreen 留 title/portrait 清 body = ts partialClear 净视觉等价,非残 |
| 0x96 | ✅ 本就对 | — | CLASSIC/DOS build fIsWIN95=false → 总是调 PAL_EndingAnimation 正确(audit 误判) |

> 另:**跳转基建 c386653**(jumpToGlobalIp 无 label fall back globalIp)让上述 0x1E/0x20/0x61 等战斗条件跳转到
> 未打 label 失败分支(乾坤一掷"钱不够"/酒神"酒不足")真正可达;**法术 commit 顺序 a7c8cd2**(效果动画/伤害
> gate 在 scriptOnUse 成功)修"没钱/没道具仍放动画"。

### 审计假阳性 5 处(复核维持 ✅ — 审计 agent 误判)

| op | 维持 ✅ 原因 |
|----|-----------|
| 0x09 | wait:increment-compare 模式下 op[0]==0 与 ==1 等价,ts(`||1`)行为与 sdlpal 一致 |
| 0x21 | inflict-damage:审计漏看 dispatchBattleOpcode(battle-opcodes:280 已实现 consumed),applyRawOpcode 的 skip 是大世界 stub |
| 0x42 | simulate-magic:本就 battle-only,经 dispatchBattleOpcode 处理;simulateMagic = PAL_BattleSimulateMagic 等价 |
| 0x98 | set-follower:审计指的 sprite/位置在 present 层(computeFollowerRenderItems)已做,非 opcode 缺 |
| 0x9C | enemy-division:复核认 sdlpal 计数语义被审计误读,ts 逻辑实际对 |

### 非 bug 简版 5 处(by design / 待 M6,已记残)

| op | 说明 |
|----|------|
| 0x07 | start-battle 缺 onLose/onFlee 续跑(P0.e by design,留 M5 P1-Battle 系列) |
| 0x18 | equip 缺 slot-swap 优化(库存顺序差异,净值正确,无玩法影响) |
| 0x28 | apply-poison 战斗内分支/抗性已对,仅毒脚本 tick 差一拍(postAction,文档化残) |
| 0x43 | play-music 缺 loop/fade 参数(真播待 M6 音频) |
| 0x47 | play-sound 纯 stub(真播待 M6 音频) |

> **修复进度(2026-05-31,全部对 sdlpal 源逐行核对)**:
> - ✅ **已修 19 个**:0x1E(cde56f2)/ 0x29 poison 抗性+真脚本(a6ecf64)/ 0x61(d91e9a8)/ 0x2A(d91e9a8)/
>   0x1B-1D 活人 gate(2c3d25d)/ 0x6F SHORT cast(2c3d25d)/ 0x60 用 ctx.target(2c3d25d)/ 0x9E iHidingTime(2c3d25d)/
>   0x59 scene guard+上界(2c3d25d+fe…)/ 0x23 RemoveEquipmentEffect(1b24ea9+1:1)/ 0x20 removeItem 装备消耗+失败跳(f98ab33)/
>   0x69 escape→terminate 无奖励(已确认 battle.c:1434)/ 0x2D/0x2E/0x2F 状态 opcode(b8eb7da,kStatus CLASSIC 映射)/
>   0x22 revive 清全 9 状态(de0424f)。配套:玩家毒 tick + cure-by-level + 头像染色 + 敌普攻 equivItem 中毒。
> - ✅ **战斗控制流基建修(c386653,关键)**:`jumpToGlobalIp` 跳转目标无 label 时 fall back globalIp ——
>   disasm 只给"命名 goto 目标"打 label,raw-opcode 条件跳转(0x1E 钱/0x20 道具/0x06 概率/JUMP_IF_*)的失败
>   分支目标常**无 label**(如乾坤一掷"钱不够"@43064 / 酒神"酒不足"@43078),旧逻辑查 labelMap 不到 → 静默不跳
>   → 没钱仍放乾坤一掷且 0 伤害。修后这类失败/分支跳转**全部恢复**。（user 真机报,已验。）
> - ✅ **法术 commit 顺序修(a7c8cd2)**:performMagic 把效果动画/inline 伤害/scriptOnSuccess **gate 在
>   scriptOnUse 成功**上(对齐 fight.c:4196/4231 `if(g_fScriptSuccess)`);此前没钱/没道具失败仍放动画 + 结算。
>   MP 仍总扣(fight.c:4190)。注:战斗法术菜单变红只看 MP/UsableInBattle,**不看钱**(magicmenu.c:340-365)——
>   绝招(costMP=1)+ usableInBattle 可选(白),没钱用了才弹失败提示,非红。
> - ✅ **0x30 stat-buff% + D14 收口(本轮)**:per-battle Extra slot 模型 1:1 sdlpal `script.c:1406-1427`。
>   ① `projectRuntimeToBattleRoles` 第 3 参 `gs.rgEquipmentEffect` → 战斗 stat 投影成 **effective = base +
>   Σ rgEquipmentEffect[0..6]**(mirror `PAL_GetPlayerAttackStrength` 等 getter global.c:1736-1975,PAL_CLASSIC
>   i=0..6 含 Extra;attack/magic/def/dex/flee/poison/elem,后两 clamp [0,100];maxHP/MP/level 无 getter 不并入)
>   → 战斗吃装备加成(**D14 修**)。② 0x30 写 `gs.rgEquipmentEffect[6]`(Extra)`= trunc(base_runtime *
>   (SHORT)op1 / 100)`,base 取**未 buff** 的 PlayerRolesRuntime(→ 多次不叠加)+ 经 getter recompute snapshot
>   立即生效。③ 战末 finalizeBattleCleanup `removeEquipmentEffect(role, Extra)`(battle-system.ts:2046)清 → 战后消失。
>   验:Extra slot 写入 / effective=base+Extra / 多次不叠加 / 战后回 base / 负 op1 debuff / 投影并入装备(8+2 单测)。
> - ✅ **0x38 / 0x6D teleport script 收口(本轮)**:① extractor 已 dump `onTeleportLabel`(scene.ts:78,67 场景);
>   plumb 过 SceneAssets(loader.ts)+ bootstrap fetch/return + loadSceneCommon 缓存 `gs.sceneOnTeleportEntry`
>   (onTeleportLabel L_<n>→n 全局 entry)。② 0x6D op2 → `gs.sceneOnTeleportOverride[scene]`(持久,对称 onEnter
>   override)+ op1==0&&op2==0 清 both(script.c:2069-2087)。③ 0x38 成功路径(`!fInBattle && teleport!=0`):
>   仿 0x04 call 压返回帧 + 跳 teleport entry(子脚本 end 弹帧回 caller 续跑 0x47/0xA1);override 优先 base;
>   battle 中走失败(script.c:1558-1569)。归隐脱出(scene 41 dialog cutscene / 163·226 loadScene+fade)走异步
>   cursor;loadScene 延迟 reload → callStack 返回帧不丢。验:0x6D op2/both-zero-clear、0x38 call+return、override
>   优先、battle gate(9 单测)。**残**:scene 41 dialog-heavy teleport 全链时序待真引擎实测确认。
> - ✅ **0x7F moveViewport / camera pan 收口(本轮)**:script.c:2292-2379。三分支:① 回正(op0==0&&op1==0)
>   camera=party-(160,112);② 绝对跳(op2==0xFFFF)camera=(op0*32-160, op1*16-112)脱离 party;③ 相对 pan
>   camera += (SHORT op0, SHORT op1)。**多帧 pan(op2 帧,180 站点)** → tickEventSystem 拦截设 waiting='camera-pan'
>   逐 tick 移 camera(do-while 第一帧立即移 + 余 op2-1 帧 waiting);单帧/autoScript 走 applyRawOpcode 即移一次。
>   ts 模型 party_screen=party.world-camera → 只移 camera 即等价 sdlpal 三联(viewport/party.world/partyoffset)净视觉。
>   验:回正/绝对跳/单帧/多帧逐帧/负 SHORT(6 单测)。**残**:pan cutscene 视觉时序待真引擎实测确认。
> - ✅ **0x8E RestoreScreen 本就忠实**(复核订正,非残):sdlpal text.c:1727-1737 真值 — 备份在**画完 title/portrait
>   后、画首条 body 前**(`nCurrentDialogLine==0`)取 → VIDEO_RestoreScreen 恢复 = **title/portrait 留、body 清**。
>   ts state-driven 的 `partialClear`(保 titleText+portraitIcon 清 body,event-system.ts:1481)**净视觉等价**,
>   无需 pixel backup buffer。原"缺 VIDEO_RestoreScreen"残注系误判,已订正。
> - ⬜ **剩 1 组子系统(非纯 logic bug,需专门做)**:
>   - **0x02 / 0x03 (+0x05 pacing) cutscene NPC 走步循环**:frameDelay goto 实为 trigger 过场"NPC 走 N 步"
>     循环(`0x6C 走一步 → 0x05 重绘+UTIL_Delay → 0x03 goto frameDelay 计步`,17 处)。autoScript(runOneAutoOp)
>     已处理 frameDelay;**trigger(tickEventSystem @1556)+ battle(runScript @2276)缺** → ts 无计数会死循环。
>     需 yield-per-step 模型(每帧走一步)+ 0x05 no-dialog 分支 UTIL_Delay pacing。谨慎,弄错破过场时序。
> - ✅ **0x05 主体已做**(复核):ClearDialog 逻辑 + 淡入(explore+battle);RNG/battle 重绘分支 N/A(ts 自动渲染);
>   残仅 cutscene 走步的 UTIL_Delay pacing(并入上面 0x02/03)。
> - ✅ **本就对(无需改)**:0x96(CLASSIC/DOS build "总是调"正确)/ 0x09·0x21·0x42·0x98·0x9C(审计假阳性,复核维持 ✅)。

## 控制流(0x00-0x0A)

| op | 含义 | 状态 | 备注 |
|----|------|------|------|
| 0x00 | end(stop,park) | ✅ | event-system 'end' |
| 0x01 | end advance(下一行) | ✅ | onEnter 持久化 + autoScript |
| 0x02 | end reset(resetTo) | 🐞 bug | autoScript reset loop ✅;但 **trigger(tickEventSystem)缺 idleFrames 延迟 gate**(见审计表) |
| 0x03 | goto | 🐞 bug | 跳转 ✅;但 **trigger + 战斗路径缺 frameDelay(op[1])gate**(见审计表) |
| 0x04 | call script(子脚本) | ✅ | 调用栈(238 次最高频) |
| 0x05 | redraw screen / ClearDialog | ✅ 逻辑done | ClearDialog(TRUE)+ needToFadeIn 淡入 ✅(ef70491);RNG-restore/BattleMakeScene 分支对 ts 自动渲染 **N/A**;残仅 no-dialog UTIL_Delay pacing(与 0x03 cutscene 走步同源,见审计表) |
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

## 数据/动作 0x0B-0xA6 — 收口完成 ✅(2026-05-30)

> **全 opcode 收口**:A/B/C/D/E/S 类逐条 ✅。**无 ⬜(todo)剩余**。
> 仅两处带 **✅/⚠️ 残**(逻辑已接、有文档化子系统缺口):
> - **0x38** teleport-out:失败路径忠实;dungeon 归隐脱出(scriptOnTeleport!=0)待 SceneAssets 暴露 onTeleportLabel + run-trigger-script。
> - **0x69** enemy escape:health=0 触发死亡掉落,sdlpal 逃跑不掉战利品 — 待 escaped 标志。
> 另:0x30(per-battle Extra 战末清,ts mutate 持久)、0x31/0x92(present 演出 stub no-op)、
> 0x45/0x77/0xA3(state-set,真播待 M6 音频)—— 均逻辑层就绪,缺口为既有子系统(present/audio/equip-effect)。

### A 控制流/数据 / 系统 S — **全部 ✅(2026-05-30 0x0A 收口)**
| op | 含义 | 状态 | 备注 |
|----|------|------|------|
| 0x0A | goto if selected no | ✅A | waiting='confirm' 阻塞否/是确认框(否=WORD19/是=WORD20,默认否)。否/cancel/Menu→goto operand[0],是→ip++。PAL_ClearDialog(FALSE) 问句留屏 + isDialogContinuationOp 豁免 Space-wait;复用 drawConfirmBox(draw-confirm.ts)。script.c:3373-3387 / uigame.c:342-365,26 用 |
| 0x41 | mark script failed | ✅A | OP_MARK_SCRIPT_FAILED case(event-system.ts:3355)→ gs.fScriptSuccess=false;consumePendingItem 按 g_fScriptSuccess gate 扣物品(script.c:1623-1627)。此前误标 ⬜,2026-05-30 订正 |
| 0x6D | set scene enter/teleport script | ✅A | op1→onEnter 全局 override(loadScene 解析消耗)；**op2→onTeleport 全局 override(sceneOnTeleportOverride 持久)**；op1==0&&op2==0 清 both(script.c:2069-2087) |
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

### E 战斗 — **全部 ✅(2026-05-30 E 类收口;0x38/0x69 带文档化残)**

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
| 0x30 | increase player stat temp by % | ✅ **per-battle Extra slot 1:1**(script.c:1406-1427,梦蛇):写 `gs.rgEquipmentEffect[6][rgwX][role] = trunc(base_runtime*(SHORT)op1/100)`,base 取**未 buff** PlayerRolesRuntime(op0 row 17atk/18mag/19def/20dex)→ 多次不叠加 + 经 getter recompute snapshot。战斗读 effective 经 projectRuntimeToBattleRoles 并入装备 effect(**D14 修**)。战末 removeEquipmentEffect(role,Extra) 清 → 战后消失。battle-opcodes.ts / game-state.ts |
| 0x31 | change battle sprite temp | ✅ **present-only no-op**:临时换战斗精灵(script.c:0031);present-battle 只画 idle frame[0] 静态精灵(D17)→ 逻辑层 no-op,精灵替换待 present |
| 0x21 | inflict flat damage to enemy | ✅ **battle handler**(此前只 explore 主干):op0!=0 全体 / 否则单体(ctx.target),health -= op1 clamp≥0(script.c:0021)。梅花镖/银针 scriptOnThrow 真伤害(0x42=0 动画 sentinel,真伤靠这);毒 tick 也用。battle-opcodes.ts |
| 0x28 | apply poison to enemy | ✅ **battle handler**:op0!=0 全体 / 否则单体(ctx.target);`RandomLong(0,9)>=resistanceToSorcery` 抗性判定 + 去重 + 槽满(MAX_POISONS 16)→ 加 {poisonId:op1, scriptEntry:objectPoisons[op1].enemyScript}(script.c:0028)。毒蛇卵/卵/蛊 throw。注:sdlpal 立即跑一次 wEnemyScript,ts 改 postAction tick 跑(差一拍)。battle-opcodes.ts |
| 0x33 | collect enemy for items | ✅ enemy(caster).collectValue!=0 → gs.wCollectValue += collectValue;否则 jump op0(script.c:0033)。battle-opcodes.ts |
| 0x34 | transform collected enemies to items | ✅ **explore**:wCollectValue>0 → RandomLong(1,cv) cap9(PAL_CLASSIC)扣 cv + 发 store[0].rgwItems[i] 入包(setStoreTable 注入);cv==0 → jump op0(script.c:1452,妖魔转化)。物品框 dialog 是 present 层 → 跳过。event-system.ts |
| 0x38 | teleport party out of scene | ✅ **explore**(script.c:1554-1571):成功(`!fInBattle && teleport!=0`)→ 仿 0x04 call 压返回帧 + 跳 teleport entry(`sceneOnTeleportOverride[scene] ?? sceneOnTeleportEntry`),子脚本 end 弹帧回 caller(续跑 0x47/0xA1);失败 → fScriptSuccess=FALSE + jump op0。归隐脱出 scene 41/163/226 等(onTeleportLabel,67 场景）。**残**:scene 41 dialog-heavy 全链时序待真引擎确认。event-system.ts |
| 0x39 | drain HP from enemy | ✅ enemy.health -= op0;movingPlayer.hp += op0(clamp maxHP)(script.c:0039)。吸星锁 scriptOnThrow:enemy=ctx.target,player=caster。battle-opcodes.ts |
| 0x3A | player flee battle | ✅ isBoss → jump op0(不可逃);否则 phase='fleed'(PAL_BattlePlayerEscape)(script.c:003A)。battle-opcodes.ts |
| 0x42 | simulate magic for player | ✅ PAL_BattleSimulateMagic(fight.c:5300)。op0=magic object id / op1=baseDamage(当 magStr)/ op2=target+1(0→eventObjectID)。applyToAll flag 优先→全体,否则 i=op2-1<0 用 eventObjectID / 仍<0 自动选首活敌;guard 无符号 `baseDamage>0‖op1>0`(magic96=−999 进但算 0);minDamage=0;共享 applyMagicDamage。battle-opcodes.ts;script.c:1630-1640。投掷物 scriptOnThrow ×40 站点全靠它 |
| 0x57 | set magic base damage by MP | ✅ magic[op0→magicNumber].baseDamage = casterMP*(op1||8);清 casterMP(script.c:0057,酒神 scriptOnUse)。performMagic 注入 magicTables/playerRoles → 0x57 改 baseDamage → E1 inline 读新值结算。battle-opcodes.ts |
| 0x5A | halve player HP | ✅ handler:目标队员(ctx.target,退回 caster)HP /= 2(floor)(script.c:005A,无影毒 use)。performItem 注入 playerRoles。**注**:无影毒-use 可达性待 item 队员目标路由(现 item→enemy),handler 就绪 |
| 0x5B | halve enemy HP | ✅ w=floor(health/2)+1,cap op0;health -= w(script.c:005B)。无影毒 scriptOnThrow:enemy=ctx.target。battle-opcodes.ts |
| 0x5C | hide party for a while(battle) | ✅ state.iHidingTime = -op0(party 隐身回合,script.c:1907-1911)。原误判 B 类,实为战斗态。battle-opcodes.ts |
| 0x5E | jump if enemy no poison | ✅ 敌人(ctx.target)毒槽无 op0 种毒 → jump op1(script.c:005E)。配齐**敌人毒 pipeline**:BattleEnemy.poisons by-ID + 0x28 apply + postAction 毒 tick。battle-opcodes.ts |
| 0x5F | kill player | ✅ 目标队员(ctx.target,退回 caster)role.hp=0(script.c:005F)。battle-opcodes.ts |
| 0x60 | KO enemy | ✅(2c3d25d 修)KO `ctx.target`(=wEventObjectID,夺魂/灵葫咒 scriptOnSuccess 的目标敌)否则 caster;health=0(script.c:1950 无 operand)。**此前误用 operand[0](数据恒0→恒杀 enemy[0])已修**。battle-opcodes.ts |
| 0x64 | jump if enemy HP > % | ✅ (currentHp*100 > maxHp*op0) → jump op1(script.c:1989)。maxHp 用 **BattleEnemy.maxHealth**(满血,战中不变),非逐回合 prevHp(2026-05-30 修近似失真 + 加 maxHealth 字段)。battle-opcodes.ts |
| 0x66 | throw weapon to enemy | ✅ script.c:2007-2014:`w=op1*5+PAL_GetPlayerAttackStrength(movingPlayer)*RandomLong(0,3)` → 调**同一** PAL_BattleSimulateMagic(target=eventObjectID,magStr=w)。与 0x42 共用 `simulateMagic`(magic-damage.ts)。32 个可投掷武器(长鞭/木剑/铁剑/仙女剑…)scriptOnThrow 用;op0∈{344,360}。attackStrength 经 BattleCtx.playerRoles 注入(performThrowItem),装备加成略 |
| 0x67 | enemy use magic | ✅ enemy(caster).e.magic=op0;magicRate=op1?op1:10(script.c:0067)。battle-opcodes.ts |
| 0x68 | jump if enemy turn | ✅ `if (g_Battle.fEnemyMoving) jump op0`(script.c:2025)。ts:fEnemyMoving ≈ caster 是 enemy(法术 scriptOnSuccess 敌人施法时 caster=enemy → jump,玩家施法 ip++)。op0=0 → jump 全局 end。battle-opcodes.ts,9 用 |
| 0x69 | enemy escape | ✅(40ef07c 修)→ `phase='fleed'`(sdlpal battle.c:1434 PAL_BattleEnemyEscape 设 kBattleResultTerminated,**终止战斗无奖励**)。**此前 health=0 被当击杀误给 exp/cash 已修**。battle-opcodes.ts |
| 0x6A | steal from enemy | ✅ PAL_BattleStealFromEnemy(target,op0=rate)(fight.c:5193)。nStealItem>0 && (RandomLong(0,10)<=rate‖rate==0):wStealItem==0 偷钱 c=n/RandomLong(2,3)→dwCash;else 偷物 nStealItem--+AddItem。动画/提示 dialog present-only 跳过。battle-opcodes.ts |
| 0x6B | blow away enemies | ✅ state.iBlow = (SHORT)op0(吹飞敌人位移,script.c:006B)。battle-opcodes.ts |
| 0x88 | set magic base damage by money | ✅ i=min(dwCash,5000);dwCash-=i;magic[op0→mn].baseDamage=floor(i*2/5)(script.c:0088,乾坤一掷 scriptOnUse)。performMagic 注入 magicTables/gs → 0x88 改 baseDamage + 扣钱 → E1 全体结算。battle-opcodes.ts |
| 0x89 | set battle result | ✅ op0:3→won/1→lost/(0xFFFF·0)→fleed/1000+→不改(script.c:0089)。battle-opcodes.ts |
| 0x8A | enable auto-battle | ✅ gs.fAutoBattle=true(script.c:008A)。battle-opcodes.ts |
| 0x91 | jump if enemy not first of kind | ✅ 数同 wObjectID 敌人,self_pos>1(非首个)→ jump op0(script.c:2091)。ts 同种=同 e.id。用途:同种敌人组脚本只在第一个跑。真实数据 op0 全 0(→跳到 end)。battle-opcodes.ts,5 用 |
| 0x92 | magic casting anim (battle) | ✅ **present-only no-op**:PAL_BattleShowPlayerPreMagicAnim + iColorShift cycle(script.c:0092,施法前摇);present-battle 跳过所有战斗动画(D17)→ no-op |
| 0x9C | enemy division | ✅ 分裂:仅 1 活敌 + health>1 → 分裂 op0+1 份各 floor((h+w)/(w+1));否则 jump op1(script.c:009C)。battle-opcodes.ts |
| 0x9E | enemy summon | ✅ **logic**:召唤 op1 只 op0(对象 id;0/0xFFFF=自身同种)敌人到空槽(MAX 5);房间不足/**我方隐身 iHidingTime>0(2c3d25d 补)**/自身睡眠·麻痹·混乱 → fail,op2≠0 jump op2(script.c:009E)。obj→enemyObjects[objectIndex]→enemyId→enemies.json 满血;经 enemy scriptOnReady runScript 注入 summonTables。**注**:召唤兽渲染需 present 层加载 battle sprite(follow-up);logic(行动/受击)已通。battle-opcodes.ts |
| 0x9F | enemy transform | ✅ 变身:非隐身/睡眠 → self.e={...base, health:keepHealth}(summonTables 取 base id op0)(script.c:009F)。battle-opcodes.ts |

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
| 0x45 | set battle music | D | ✅ gs.wNumBattleMusic = op0(script.c:1658,进战斗选 BGM)。纯 state-set,真播待 M6。event-system.ts |
| 0x77 | stop music | D | ✅ gs.wNumMusic = 0(script.c:2215,op0 fade 秒:0→2.0,否则 op0*3)。state-set,真停待 M6。event-system.ts |
| 0xA3 | play CD music(RIX fallback) | D | ✅ gs.wNumMusic = op1(script.c:3023);ts 无 CD → 等价 sdlpal "CD 不可用回退 RIX"(PlayMusic(op1));op0(CD track,SHORT)记 log。真播待 M6。event-system.ts |
| 0xA6 | backup screen | D | ✅ 显式 no-op(本游戏 0 调用;0x73 内部已 backup)(script.c:3069,1196faf) |
| 0x78 | FIXME ???(sdlpal `case 0x78: break;`) | — | ✅ 显式 no-op(sdlpal 标 FIXME 字面空操作;本游戏 35 用全空)(script.c:2224,1196faf) |
