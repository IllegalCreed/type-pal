# TEST-GLM-GAME-BATTLE-STATE-1 排重账(GLM r1)

排重域:卡面独占范围内 `battle-system.ts`、`battle-state.ts`、`battle-runtime-context.ts`、
`battle/actions/*`、`enemy-ai.ts`、`turn-queue.ts`、`battle-settlement.ts`、
`battle-finalization.ts`、`battle-progression.ts`、`battle-anim-driver.ts` / `anim-timeline.ts`
的旧测:`__tests__/battle-system.test.ts`(184 it)、`battle-system.cov85.test.ts`(14)、
`battle-system.glm-next-wave.test.ts`(3)、`battle-opcodes.test.ts` / `battle-opcodes.cov85.test.ts` /
`battle-opcodes.glm-next-wave.test.ts`(经勘察,本卡范围只涉及其对 battle-system 接线的部分)、
`__tests__/actions.test.ts`(89)、`__tests__/throw-item.test.ts`(6)、`__tests__/attack-mate.test.ts`(7)、
`actions/` 下三个 glm-next-wave(8)、`__tests__/enemy-ai.test.ts`(14)、`__tests__/turn-queue.test.ts`(9)、
`__tests__/battle-state.test.ts`(14)、`battle-state.glm-next-wave.test.ts`(4)、
`battle-runtime-context.test.ts`(3)、`battle-finalization.test.ts`(2)、
`battle-settlement.glm-next-wave.test.ts`(5)、`battle-progression.glm-next-wave.test.ts`(5)、
`__tests__/battle-levelup.test.ts`(11)、已归档 Game 卡 `battle-turn-boundaries.glm-turn.test.ts`(15)
与其余相邻(battle-anim-driver 24 / anim-timeline.glm-next-wave 5 / battle-anim-integration 4 /
death-fade 16 / battle-dialog 13 / casualty-sounds 11 / status 7 / runscript-rearm 5 /
formulas / coop-magic / magic-damage / magic-inline-damage / battle-opcodes 系)。
另核对了在途候选 `codex/coverage85-glm-game-r1` @46ace96e0(193 合同所在分支)对下列各轴零覆盖。

## 新增合同(10,全部未证轴;源锚 / caller / oracle)

| # | 合同(节选) | 源锚 | 公开 caller | oracle | 排重结论 |
|---|---|---|---|---|---|
| C1 | haste 状态队员行动 dex ×3 进队列 wiring | battle-system.ts:747-751 + formulas.ts:210-217 | tickBattle 建队列(pendingActions 直填) | actionQueue 序 [p0( haste), p1, 敌] | 公式单测已有(formulas.test.ts:242;actions.test.ts:2545 直调公式),但**status→queue 构建接线**三文件 grep `haste` 零队列断言;slow 为 PAL_CLASSIC 不实现(formulas.ts:215)无合同可立 |
| C2 | DH3 未学法术降级(攻击系→普攻 / 辅助系→防御) | battle-system.ts:2634-2644(known 门) | tickPerformAction(pendingActions magic) | 攻击系:敌掉血+MP 不扣;辅助系:defending+敌不掉血+MP 不扣 | 旧 DH3 测全在 silence/MP/数量臂(battle-system.test.ts:3956-4036);`known`(rgwMagic 有数据但查无该 spell)臂全仓无证。两臂同一 gate 合一 it(同 :3987 throw/item 双臂先例) |
| C3 | DL7 被沉默敌仍消费一次魔法掷骰 | enemy-ai.ts:119-121 | decideEnemyAction(公开导出) | 掷骰计数 silenced===control===1;silenced type=attack,control type=magic | enemy-ai.test.ts:122 只断言 type=attack;DL7 注释自述「仍先消耗掷骰(RNG 流偏移)」的消耗次数轴无证。计数 oracle 先例:battle-system.test.ts:635(BUG-1 dice23) |
| C4 | scriptOnReady 返回值回写 show-once | battle-system.ts:2520-2549 | tickPerformAction 敌方项 | 0x01 advance end → scriptOnReady 1→2 | turnStart 侧回写两臂已证(battle-system.test.ts:1174/1204);ready 侧(:2526 赋值)全仓无断言(battle-opcodes 的 scriptOnReady 断言均属 0x9E 召唤 roster 语义) |
| C5 | defend → rgDefenseExp.wCount += 2 | battle-system.ts:2815-2818 | tickPerformAction(pendingActions defend) | wCount 0→2 | 全目录 grep `rgDefenseExp` 仅负向断言(battle-turn-boundaries:478 =0);+2 正向累积无证 |
| C6 | 玩家施法 → rgMagicExp +=R(2,3) + rgMagicPowerExp +=1 | battle-system.ts:2855-2861 | tickPerformAction(pendingActions magic) | mp 30→25(真施法)+ rgMagicExp∈[2,3] + rgMagicPowerExp=1 | BUG-1(battle-system.test.ts:616)只证敌方 0 掷骰;玩家正向累积两池全仓无断言(rgMagicExp 仅 battle-progression:77 作夹具) |
| C7 | expGained=0 → 无 exp-cash 屏;cash 仍无条件入账 | battle-settlement.ts:119-127 | buildBattleWonSettlement(公开导出) | screens===[] 且 dwCash +50 | settlement glm-next-wave 两 build 测均 exp≥1;`if (expGained>0)` 门与「cash 无条件」在 0 经验输入下无证 |
| C8 | Phase E:defeated 槽照跑 scriptOnBattleEnd 且返回值不回写 | battle-settlement.ts:160-189 | tickBattleSettlement(公开导出) | battleDialogQueue 1 行(执行)且 scriptOnBattleEnd 保持 1(advance-end 返回 3 不回写) | settlement glm-next-wave:201-258 两场敌均**未标 defeated**(非真实 won 形态);「不按 health 过滤」与「返回值不回写」(对照 turnStart/ready 回写)两臂无证 |
| C9 | rgwMagic 32 槽全满 → 不再学新法术 | battle-progression.ts:288-306(PAL_AddMagic 空槽臂) | battleWonLevelUp(公开导出) | learnedMagics==[] 且无 354 写入 | battle-levelup.test.ts 覆盖 level 门/已学去重(:159/:182);槽满 false 臂全仓无证 |
| C10 | 升级快照有效值含装备加成 | battle-progression.ts:216-246(battle.c:1184-1212) | battleWonLevelUp | snapshot.attack.old=27(=base20+装备7)、cur=base+7 | 旧快照断言(battle-levelup:102-108)全无装备;带装备的有效值口径(old=oldBase+(eff−cur))无证 |

## 登记未证但不新增(同 caller/同 oracle 形态、换数字、机制同形或无可行业务 oracle)

- **turn-queue.ts 全臂**(降序/同 dex 敌先/dualMove 二抽两臂/dex-1 回退):turn-queue.test.ts 9 例 +
  battle-system.test.ts:1007/1020/3879;turn-boundaries 卡同判,零新增。dex-1 回退后的 dex 值
  为换 oracle 精度,不另包装。
- **battle-state.ts createBattleState 全臂**:battle-state.test.ts 14 + glm-next-wave 4
  (>3 抛错/roleId/prevHp 三快照/D14 seed/DH1 空槽/pos 表/fAutoBattle seed)。零新增。
- **battle-runtime-context.ts 全 6 导出**(get/set Resources、getBattleLiveRoles、set/getRunScript、
  clear):battle-runtime-context.test.ts 3 例全覆盖。零新增。
- **battle-finalization**:lost/forced 归类与 HP/MP 回写(turn-boundaries C1/C2)、terminated→wonIp
  (battle-system.test.ts:182)、cleanup 资源释放序(battle-finalization.test.ts:28-79)。零新增。
- **battle-settlement**:屏超时(boss 5500/其余 3000)、屏序、首帧不收键/翻页、Phase E 只跑一次 +
  对话 hold、半血恢复公式(settlement glm-next-wave 5 例 + battle-levelup)。零新增。
- **battle-progression**:升级公式/余数/满级/999 钳/level 门/去重/隐藏涨点边角
  (battle-levelup 11 + progression glm-next-wave 5 + battle-system.test.ts:63-300)。
  WORD 截断臂需 >65535 累积,构造非自然输入且判别弱,登记不写。
- **倍率臂**:flee ×0.5 / item ×3 / 濒死 ÷2 已由 turn-boundaries C3-C5 证;defend ×5
  (battle-system.test.ts:1849)、support-magic ×3 / coop ×10 同函数换臂,turn-boundaries 已登记同形。
- **battle/actions**:performAttack/performAttackMate/performMagic/performItem/performThrowItem/
  performDefend/performFlee/performCoopMagic/performEnemyConfusedAttack 主臂
  (actions.test.ts 89 + throw-item 6 + attack-mate 7 + glm-next-wave 8 + coop-magic.test.ts)。
  forcedTarget 参数臂(attack-mate.ts:42)只有 resolveConfusedAttack 内部消费,直传即换包装,登记。
  performFlee 成功音 45 已由 turn-boundaries C7 经 tickBattle 证(金蝉脱壳 actions.test.ts:1688 为 0x3A 路径)。
- **enemy-ai 其余臂**:无活玩家 pass / party·enemySlots 拒绝重摇采样 / confused 选中自己 pass /
  0xFFFF 哨兵 / 确定性(enemy-ai.test.ts 全 14 例)。sleep/paralyzed→pass 两臂同形保留旧测。
- **主菜单/杂项/法术物品网格/目标选择/单敌·单人队·All 态短路/回退重选/iPrevEnemyTarget**
  (battle-system.test.ts:2118-3274 各段)与 selectAutoTargetFrom 全臂(:3630-3657)。零新增。
- **输入锁/对话 hold**:对话键不漏(:3022)、延迟期不起菜单(cov85:215)、菜单延后(:884)、
  narration 1.4s(battle-dialog:103)、top/bottom 同屏(battle-dialog:158)、effect 0x69 内联
  (battle-dialog:196)。零新增。
- **DH3 其余臂**:silence→attack(:3956)、MP 不足→attack/defend(:3967/:3976)、throw/item 数量 0
  (:3986)、attackAll 目标规整两向(:4006/:4023)。本卡只补 known 臂(C2)。
- **E04 其余臂**:攻击 +1/R(2,3)health(battle-system.test.ts:262)、敌方 0 掷骰 BUG-1(:616)、
  flee 失败 +2(actions.test.ts:1158)、flee 成功不累积为互补臂(恒绿风险,登记)。
- **battle-anim-driver / anim-timeline**:applyAnimFrame/applyAnimFrameVisual/startBattleAnim/
  stepBattleAnimRender/playerRestFrame/resetFighters(battle-anim-driver 24 例);afterComplete 完成回调
  与队列恢复(battle-system.test.ts:3441 UseItem 前摇 + battle-anim-integration:136);
  advanceBattleAnimFrames 无 0 时长帧的生产输入,durationMs=0 跨帧臂不可合法构造,登记。
- **iBlow 每行动 reset(battle-system.ts:2500)**:消费方在 anim-timeline 视觉位移层
  (anim-timeline.ts:929),headless 下无独立业务 oracle;0x6B 设置与位移本身已由
  battle-opcodes/anim-timeline 测覆盖。登记为已知未证接线,不写空转测试。
- **shouldCheckPlayerCasualties 的 magic/item→player-target 臂**(:971-986):attack 臂
  (battle-system.test.ts:1246-1305)与玩家攻击不触发臂(:1308)已证,敌方法术打队员触发臂
  为同一 gate 换 action 形态,登记。
- **scriptOnReady 0x00 plain-end 重跑臂**:与 turnStart 0x00 机制同形(battle-system.test.ts:1174
  两轮重显已证机制;runscript-rearm.test.ts 证返回值契约);ready 侧回写接线由本卡 C4 钉住,
  plain-end 重跑臂无独立判别点(回写值与原值相同),登记不包装。
- **DL3 fThisTurnCoop 回合末清 / DL1 跨回合形态**:吞并/粘性本体已由 turn-boundaries C13/C14 证,
  回合末清为互补臂,登记。

## 相邻旧测证据锚点(本账引用的 file:line 均为实读)

- battle-system.test.ts:BUG-1 :616-639;DH3 :3956-4036;turnStart 回写 :1174/:1204;快照/隐藏 exp
  :63-300;#311 :585-610;R 跨战斗 :2177-2341;毒 tick :3549-3618。
- battle-turn-boundaries.glm-turn.test.ts:15 it 全量(见该卡回执)。
- enemy-ai.test.ts / turn-queue.test.ts / battle-state*.test.ts / battle-runtime-context.test.ts /
  battle-settlement.glm-next-wave.test.ts / battle-progression.glm-next-wave.test.ts /
  battle-levelup.test.ts / actions.test.ts / throw-item.test.ts / attack-mate.test.ts /
  battle-anim-driver.test.ts / battle-dialog.test.ts / casualty-sounds.test.ts / status.test.ts /
  runscript-rearm.test.ts / death-fade.test.ts / battle-anim-integration.test.ts:逐 it 清单存
  本卡勘察过程(会话内 5 组并行通读),结论已并入上表。
