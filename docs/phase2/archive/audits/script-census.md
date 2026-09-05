# 原版事件脚本字节码普查(M3 设计输入,2026-07-02)

> 语料:`data/extracted/events/all.json`,43,503 指令,160 opcode;295 场景,
> 触发对象 3,681(2,322 唯一链)/auto 2,165(287 唯一)/onEnter 160(146 唯一)/onTeleport 67。
> 方法:链按 label 去重,线性走到首个 end/无条件 goto(不跟随跳转)。
> 摘要与设计决策见 `script-model-m3-design.md`;本文是全表存档。

## 全局 op 频率 Top 40(累计 94.1%)

| # | op | 名称 | 含义 | count | % |
|---|------|------|------|-------|-----|
| 1 | 0xFFFF | showDialog | 显示对话文本 | 13513 | 31.06 |
| 2 | 0x0000 | end | 停止执行 | 3874 | 8.91 |
| 3 | 0x0005 | redrawScreen | 重绘屏幕(PAL_MakeScene,清对话箱) | 2671 | 6.14 |
| 4 | 0x0009 | waitFrames | 等待 N 帧 | 1999 | 4.60 |
| 5 | 0x003D | dlgStyleBottom | 对话框置下部 | 1544 | 3.55 |
| 6 | 0x0049 | setObjectState | 设事件对象 state | 1373 | 3.16 |
| 7 | 0x003C | dlgStyleTop | 对话框置上部 | 1307 | 3.00 |
| 8 | 0x0001 | end.advance | 停止+触发入口推进下一段 | 1186 | 2.73 |
| 9 | 0x0046 | setPartyPos | 设队伍坐标 | 1064 | 2.45 |
| 10 | 0x0015 | setPartyDirection | 设队员朝向+姿势 | 915 | 2.10 |
| 11 | 0x0050 | fadeOut | 屏幕淡出 | 907 | 2.08 |
| 12 | 0x0059 | loadScene | 切换场景 | 882 | 2.03 |
| 13 | 0x0016 | setObjDirAndFrame | 设对象朝向+姿势 | 730 | 1.68 |
| 14 | 0x0002 | end.reset | 停止+触发入口重置指定段 | 513 | 1.18 |
| 15 | 0x000F | setObjDirOrFrame | 设对象朝向或帧 | 493 | 1.13 |
| 16 | 0x0003 | goto | 无条件跳(op1=帧延迟) | 484 | 1.11 |
| 17 | 0x0014 | setObjectGesture | 设姿势帧(强制朝南) | 475 | 1.09 |
| 18 | 0x003E | dlgStyleNarration | 中央叙述框 | 452 | 1.04 |
| 19 | 0x0007 | startBattle | 开战(op1 败跳/op2 逃跳) | 434 | 1.00 |
| 20 | 0x001F | giveItem | 加物品 | 425 | 0.98 |
| 21 | 0x0011 | npcWalkToSpeed2 | NPC 走到(慢,隔帧) | 421 | 0.97 |
| 22 | 0x0024 | setAutoScript | 设 autoScript 入口 | 418 | 0.96 |
| 23 | 0x0010 | npcWalkToSpeed3 | NPC 走到 | 387 | 0.89 |
| 24 | 0x007A | partyWalkTo4 | 队伍走到(速4) | 381 | 0.88 |
| 25 | 0x008E | restoreScreen | 恢复屏幕 | 351 | 0.81 |
| 26 | 0x0004 | callScript | 调子脚本 | 327 | 0.75 |
| 27 | 0x007F | setCamera | 视口 pan | 317 | 0.73 |
| 28 | 0x0047 | playSfx | 音效 | 313 | 0.72 |
| 29 | 0x006E | playerWalkOneStep | 主角单步 | 313 | 0.72 |
| 30 | 0x006C | npcWalkOneStep | NPC 单步 | 295 | 0.68 |
| 31 | 0x00A7 | noop | 无操作 | 295 | 0.68 |
| 32 | 0x007D | moveObject | 对象位移 | 275 | 0.63 |
| 33 | 0x0067 | enemyUseMagic | 敌施法(战斗侧) | 251 | 0.58 |
| 34 | 0x0006 | jumpByRate | 概率跳 | 235 | 0.54 |
| 35 | 0x0025 | setTriggerScript | 设 trigger 入口 | 221 | 0.51 |
| 36 | 0x0017 | setPlayerExtraAttr | 设附加属性 | 213 | 0.49 |
| 37 | 0x0040 | setTriggerMethod | 设触发方式 | 204 | 0.47 |
| 38 | 0x0087 | animateObject | 推动画帧 | 189 | 0.43 |
| 39 | 0x0043 | playMusic | 背景音乐 | 155 | 0.36 |
| 40 | 0x0065 | setPlayerSprite | 设行走图 | 124 | 0.29 |

对话族合计 38.6%(showDialog + bottom 1544/top 1307/narration 452/center 112)。

## 触发链形状(2,322 唯一)

线性 76.2% / conditional 14.7%(321 条只是 startBattle 败逃分支;真数据条件跳 ≤22 条)
/ call-linear 8.8% / goto-only 0.2%。链长中位 4,p90=9,最长 416(scene32 大 cutscene)。
线性细分:传送 33.3% / 纯对话 18.7% / 对话+状态 17.9% / 含时间线 12.3% / 纯状态 2.8%。
终结:end 1656 / goto 285 / end.advance 227 / end.reset 153。

Top 链形:门传送(loadScene setPartyPos fadeOut end)×666、遇敌(startBattle goto)×274、
宝箱(callScript 叙述框 showDialog giveItem end.reset)×136、纯对话×2 ~×4 291、
楼梯走位传送×79、拾取+消失×72、传送变体×61。

## 跳转/分支族(31 op,结构重建必须覆盖)

| op | 名称 | 语义 | 目标操作数 | 次数 |
|------|------|------|-----------|------|
| 0x02 | end.reset | 触发段重置 | op0 | 513 |
| 0x03 | goto | 无条件(op1 帧延迟) | op0 | 484 |
| 0x04 | callScript | 调子脚本(收集目标) | op0 | 327 |
| 0x06 | jumpByRate | random≥op0 → 跳 | op1 | 235 |
| 0x07 | startBattle | 败op1/逃op2(≠0 才跳) | op1/op2 | 434(378双/48仅败/8无) |
| 0x0A | gotoIfNo | 是否框选"否"跳 | op0 | 26 |
| 0x1E | addCash | 减钱不足跳 | op1 | 59(真分支 10) |
| 0x20 | removeItem | 物品不足跳(op2=0 不分支) | op2 | 46 |
| 0x2E | setEnemyStatus | 敌抗命中跳 | op2 | 10 |
| 0x33/0x34/0x38/0x3A | 收妖/炼丹/传送/逃跑失败跳 | | op0 | 各1 |
| 0x58 | jumpIfItemLess | 物品<op1 跳 | op2 | 9 |
| 0x5D/0x5E/0x61 | 毒类条件跳 | | op1/op1/op0 | 12/6/2 |
| 0x64 | jumpIfEnemyHpAbove | 敌HP>op0% 跳 | op1 | 2 |
| 0x68 | jumpIfEnemyTurn | 敌回合跳 | op0 | 9 |
| 0x74 | jumpIfNotAllFullHp | 有人没满血跳 | op0 | 3 |
| 0x79 | jumpIfPlayerInParty | 队含角色跳 | op1 | 8 |
| 0x81 | jumpIfNotFacing | 未面对对象跳 | op2 | 26 |
| 0x83 | jumpIfObjNotInZone | 不在区域跳 | op2 | 2 |
| 0x84 | placeUsedItem | 放置受阻跳 | op2 | 2 |
| 0x86 | jumpIfNotEquipped | 未装备跳 | op2 | 1 |
| 0x91 | jumpIfEnemyNotFirst | 非同种首敌跳(战斗) | op0 | 5 |
| 0x94 | jumpIfObjState | 对象state==op1 跳 | op2 | 26 |
| 0x95 | jumpIfScene | 当前场景==op0 跳 | op1 | 1 |
| 0x9C/0x9E | 分裂/召唤失败跳(战斗) | | op1/op2 | 2/32 |
| 0xA2 | randomJump | 相对随机跳 [i+1,i+op0] | 相对 | 2 |

脚本指针写入(目标当入口收集):0x24 setAutoScript(op1,418)/0x25 setTriggerScript
(op1,221)/0x40 setTriggerMethod(204,无目标)。

## 等待/阻塞族

**A 等待态**:showDialog(13513)/waitFrames(1999)/fadeOut·In·ToRed(907/4/1)/
loadScene(882)/setCamera pan(317)/fadeScreen(69)/gotoIfNo confirm(26)/buy·sellMenu
(23/5)/playRNG(20)/sceneFade(16)/delay 80ms(10)/colorFade 族(12)/showFBP(4)/quit(1)。
waitKey/scrollFBP/fbpEffect/endingAnim 本作 0 用。
**B 原地重试(每 tick 一步)**:npcWalkTo 2/3/4/8(421/387/32/97)、partyWalkTo 4/2/8
(381/33/56)、rideObject 4/2/8(112/2/1)。startBattle 模态阻塞。
单步 op(0x0B-0x0E/0x6C/0x6E)与 0x87 单 tick 即完。

## autoScript(287 唯一)

整循环体:线性 65.2% / conditional 21.3%(jumpByRate 59 = 随机徘徊)/ goto-only 12.9%。
终结:end 126 / end.reset 117(41%,标准巡逻循环)/ goto 44。链长中位 6,p90=22,最长 136。
逐帧段中位 3 指令;Top 形:end.advance 空拍×14、walkTo end×12、syncObjState end.reset×9、
setObjectGesture end.advance×8(逐帧手动动画)。
主导 op(链出现率):waitFrames 39% / setObjDirOrFrame 32% / walkTo 族 ~47% / jumpByRate 21%
/ setObjectGesture 15% —— 走位步+帧动画+等待+随机分支四件套。

## onEnter(146 唯一)

97.9% 线性(0 conditional)。纯瞬时状态 53.4% / enter 内链跳 21.9% / 入场 cutscene 17.1%
/ 对话+状态 6.8%。终结 end 104 / end.advance 40(首访 cutscene 演完推进)。
链长中位 5,p90=84,最长 468(scene153)。
主导:playMusic 52% / setPartyPos 46% / showDialog 40% / **setBattleField 36%** /
dlgStyleBottom 36% / redrawScreen 36% / setPartyDirection 32% / setObjDirAndFrame 25%。
开头模式:`playMusic end`×18、`setBattleField end`×12、`setBattleField playMusic end`×9。
