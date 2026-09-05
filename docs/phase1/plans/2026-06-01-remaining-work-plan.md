# type-pal 剩余工作执行计划(2026-06-01)

> 来源:源码级清查 workflow(9-agent,逐项回 reference/sdlpal 核实"是否真没做",防 checkbox 过期)。
> 31 项排查 → **20 真待办**(W1-W5)+ **11 其实已做**(订正 roadmap)+ **2 死代码该删** + **2 sdlpal 真值冲突不该做**。
> 纪律:TDD(先失败数据级单测)、每项引 sdlpal file:行号、不靠截图、逐项 commit。
> source 核实基准:`common.h:26` PAL_CLASSIC=1 / `common.h:279` PAL_HAS_CONFIG_PAGE=FALSE / `battle.h:49-60` BATTLEACTIONTYPE 无 Trance/Equip / `global.h:346` kMagicTypeTrance=8。

---

## ⚠️ 先订正认知(这些不是缺口)

### 其实已做(11 项 — roadmap checkbox 过期,跟 G9/D1 一样被错标)
| 项 | 真相 |
|---|---|
| A(1) summon **action** handler | sdlpal 无 'summon' kBattleAction(battle.h:49-60 仅 9 成员);summon 是 magic type,演出已做 magic.ts:317。case 'summon' 是死分支 |
| B4(2) R 重复上次动作 | 已做 battle-system.ts:834 commitRepeatAction + prevAction 备份,对齐 sdlpal CommitAction(TRUE) |
| B4(4) 友方死目标重选 | sdlpal **本就不**重选友方死目标(fight.c:3249-3358 重选仅敌方);ts 已忠实对齐 |
| D1 enemyTeam slot 映射 | 非简化:OBJECT-index→enemyID 翻译已在**提取期**完成(enemy-teams.ts:78),slot 直当 id 正确 |
| D24 隐身排除队员 target | sdlpal 无此逻辑:隐身是全队全局效果(整轮 goto end),不按个体过滤 target;ts 已对 |
| D20-2 中毒精灵本体紫色 | **sdlpal 真值冲突,不该做**:全源 grep 证实中毒从不设精灵 iColorShift 紫色(头像染色已做) |
| G9 ShakeScreen 接主循环 | 已接:present.ts:562 `if(gs.shakeTime) applyScreenShake`,每帧主渲染路径 |
| L1-a 0x33 collectEnemy | 完全做对(battle-opcodes.ts:537 对齐 script.c:1437) |
| L1-b 0x60 KO 秒杀 | 完全做对(battle-opcodes.ts:1051,且已修过 audit bug) |
| L1-c 0x64 jump-if-HP-above | 完全做对(battle-opcodes.ts:997 对齐 script.c:1983) |
| L2-a 蛊投掷 + 0x28 附身 | 两侧已做(items.json 蛊 scriptOnThrow + 0x28 具名) |

### 死代码 / 不接(2 项 — 经 source 定性)
- **B4(1) equip-battle action**:battle.h 无 kBattleActionEquip,classic 主菜单 4 图标无换装 → **删 type,不补 handler**(并入 W1)
- **C16 TripleMenu 接线**:classic PAL_HAS_CONFIG_PAGE=FALSE,唯一消费点(QuitGame config-page 变体)在 classic 不存在 → **保留 primitive 不接**(强接 = 造无真值出处 UI,违约)

---

## W1 — 战斗公式补全 + 死代码清理(纯逻辑,无渲染依赖,最稳先做)

| 项 | effort | gap | 落点 |
|---|---|---|---|
| **D12 flee 装备感知** | S | flee.ts:36 `str=role.fleeRate` raw,漏装备加成 | flee.ts 改 `getPlayerFleeRate(gs,roleId)`(equip-effect.ts:66 已在,1:1 对 global.c:1868-1897);performFlee 签名加 gs,改 caller |
| **D27 敌魔法装备元素/毒抗** | M | magic-damage.ts:191-198 用 base 抗,漏 rgEquipmentEffect | applyEnemyMagicDamage 接 gs;**新增 getPlayerElementalResistance**(equip-effect.ts;poison 版 :75 已在,对 global.c:1937);保持 clamp `100+min(100,v)`(已对齐 global.c:1969) |
| **D7 turn-order RNG 抖动 + dualMove 独立 dex** | M | dex 没乘 RandomFloat(0.9,1.1);dualMove 第二动用 dex-1 hack 恒标 fIsSecond | battle-system.ts:554-578 插 `Math.trunc(dex*rng.rangeFloat(0.9,1.1))`(rng.ts:17 已在,对 fight.c:1474/1556);turn-queue.ts:56-84 dualMove 第二 entry 独立摇 dex + 比较定 fIsSecond(fight.c:1483-1489 谁 dex 小谁第二动) |
| **死代码清理** | S | battle-system.ts:1987-1995 summon/trance/equip-battle 三 case 死分支;battle-state.ts:148 union 'trance'/'equip-battle' 非 sdlpal action | 删三 case + 删 BattleAction union 'trance'/'equip-battle';**保留** Magic['type']='trance' + magic.ts:52 DEFENSIVE_MAGIC_TYPES |

**effort ≈ M-L(4-6h)**。先 D12 暖身;死代码清理与 union 一次清。
**风险锚**:D7 的 RNG 抽取次序必须复刻 sdlpal(全 enemy 含 dualMove 二抽 → 全 player),改完同步更新 D9 baseline 快照(c10 对拍)。WORD 赋值截断 = Math.trunc。

---

## W2 — 持久 fAutoBattle(历史上曾误判 trance 觉醒演出为 N/A)

> **2026-06-06 订正**:
> - 2026-06-01 的“trance magic id 47 完全未被引用”结论已废弃。真实路径是 object-magic 295「梦蛇」
>   回退解析到 magicNumber=47,战斗中可触发 Trance success 脚本 0x30/0x31 与变身演出。
>   当前实现已接 PreMagic 前摇 + iColorShift 闪色 + 末帧切 sprite;此计划段只保留 fAutoBattle 的历史上下文。
> - **0x8A auto-battle = 真缺口,做**(不依赖资源)。

| 项 | effort | gap | 落点 |
|---|---|---|---|
| **B4(3) 0x8A 持久 fAutoBattle 消费** | M | A 键 fAutoAttack 已做;0x8A 写 gs.fAutoBattle 但无消费方 + 战斗结束不清 | battle-system.ts init 读 gs.fAutoBattle→整队自动走 pickAutoMagic(655)/commitForceAction(882,阈值传 **9999** 对 uibattle.c:854,非现 60);finalizeBattleCleanup 清 flag(script.c:3332 单场有效)|

**effort ≈ M(2-3h)**。
**风险锚**:fAutoBattle ≠ fAutoAttack(前者 0x8A 整场、自动选法术 uibattle.c:839-880;后者 A 键单回合纯物理)。fAutoBattle 单场有效(战斗结束 script.c:3332 清,非永久)。

---

## W3 — 世界/菜单层(独立于战斗,可任意时段穿插)

| 项 | effort | gap | 落点 |
|---|---|---|---|
| **C2 Quit 二次确认** | S | menu-driver.ts:373 quit 直接清栈无确认 | classic 走 **2 项 ConfirmMenu**(uigame.c:2059-2076 `#else` 分支,默认 No);push confirm-quit,复用 draw-confirm.ts:26(2 项已对) |
| **C1/C2 菜单 label → getWord(id)** | M | in-game-menu.ts:25-48 硬编码字串,id 是 0-based 下标≠真 WORD id | 改真 id(状态=3/仙术=4/物品=5/系统=6;SAVE=11..QUIT=15)+ getWord(id) 读 words.json flat``;波及 opening-menu/inventory-action-menu/draw-* |
| **A4 OpeningMenu 坐标公式** | S | draw-opening-menu.ts:39 硬编码 x=125;真值 `125-(w>4?(w-4)*8:0)`,w=PAL_WordWidth | port wordWidth helper(ui.c:836)。⚠️ '新的故事'4 字 → w=4 → x=125 **可能已对**,gap 仅缺公式防漂移;OpeningMenu 本就无 box(9-slice 前提不成立)|
| **F1 默认新游戏字段核对** | M | (标题"非 SAVEDGAME 反序列化"是误解:sdlpal 新游戏读 MKF chunk + 字段初始化,非读存档)真活 = 逐字段核 ts hydrate 齐 global.c:434-467 默认值 | bootstrap.ts:1150 startNewGameFromPrimary + game-state.ts hydrate;**本轮未实读全文,先核**:dwCash=0/wNumScene=1/viewport=(0,0)/party=[]/Exp.level=rgwLevel |
| ~~C16 TripleMenu~~ | — | **不做**(classic 无 config-page 消费点);保留 primitive 加注释 | — |

**effort ≈ M(3-4h)**。

---

## W4 — 战斗演出视觉:OffMagic/EnemyMagic 帧改造(内聚同批,共用 builder)

> 顺序:wWave → iBlow → keepEffect(keepEffect 条件含 wScreenWave<9,须先有 wWave 接线 + 新建持久背景层)。

| 项 | effort | gap | 落点 |
|---|---|---|---|
| **wWave 屏波** | M | 原语 screen-wave.ts 在(大世界已接 present.ts:180);battle 渲染路径未接 + magic.wave bump 未推 | builder 帧带 screenWave 字段(首帧 set=magic.wave、末帧复位 0,sWaveProgression=0);present-battle.ts 渲染调 applyScreenWave(**transient,不污染 gs 存档**)。对 fight.c:2666-2667/2835 |
| **iBlow 吹飞位移** | M | builder 解构丢弃 iBlow(anim-timeline.ts:488),零 pos delta;数据已到门口(magic.ts:401 传入) | 全体受击方(活敌/全队员,非单体)逐帧 `blow=RandomLong(0,iBlow)` 累加 `x+=blow,y+=trunc(blow/2)`,末帧复位 posOriginal;**rng 注入 builder**(否则不可测)。对 fight.c:2681-2694/2901-2909 |
| **keepEffect 烙背景(0xFFFF)** | L | 无 keepEffect 逻辑;draw-battle-bg 每帧重画无持久层 | 末帧(i==l-1 && wScreenWave<9 && keepEffect==0xFFFF)产烙背景标记;present **新建 persistentBgBlits 跨帧状态**(L 主因)。对 fight.c:2757-2762,哨兵 0xFFFF 是 wKeepEffect 字段非 chunk 号 |

**effort ≈ L(6-9h)**。
**风险锚**:iBlow 每帧 RandomLong 累加(非固定序列),纯函数 builder 须注入 rng;受击方是全场活敌/全队员(死敌 wObjectID==0 跳过)非单体;末帧务必复位 posOriginal。wWave bump 不能写 gs.wScreenWave 存档字段(局部 transient)。keepEffect 是持久副作用,必在 present 层做(违 builder 纯函数哲学)。

---

## W5 — 入场/逃跑演出(present 层基础设施,放最后)

| 项 | effort | gap | 落点 |
|---|---|---|---|
| **D19 战斗入场 fade-in + wave** | L | colorShift 已做(draw-battle-bg.ts:28);**fade-in 全缺**(PAL_BattleFadeScene 12 趟对角带~600ms)+ **wave 扭曲全缺** | 新建 **battle-fade.ts**(rgIndex={0,3,1,5,2,4},x+y mod6 渐显,battle.c:343-392);core 加 'battle-intro' phase 拦输入;applyWave(陆战 wScreenWave=0→no-op,**测 0 与非 0 两路**)|
| **D13 敌逃飞出屏动画** | M | battle-opcodes.ts:1035 applyEnemyEscape 纯数据 stub(health=0,1042 行有 TODO);无飞出帧 | 生成飞出时间轴:全活敌同步 `pos.x+=5,pos.y-=2`/帧,x>320 移除,10ms/帧,末尾强清 objectId=0(**数据终态须与旧 stub 一致**);复用 D19 anim phase。对 battle.c:1376-1435 |

**effort ≈ L(5-7h)**。D19 先做(建 anim phase/帧制基础设施),D13 复用(soft dep)。
**风险锚**:D19 wave 陆战 no-op(多数 wScreenWave=0),勿误判没实现;fade 帧制(ms vs frame)先确认战斗渲染 tick 单位;fade 在 present 层不改 core 结果时序但需 core 给 intro phase 拦输入。D13 帧制 UTIL_Delay(10)=10ms/帧,多敌同步飞各自判 X>320,数据终态全敌 objectId=0 不破坏结算回归。

---

## L 系统(炼丹/蛊虫 — 多为 already-done + 端到端验证)

> L1-a/b/c(0x33/0x60/0x64)+ L2-a(投掷/附毒)**已做**(见上"其实已做")。剩端到端验证 + 物品框:

| 项 | effort | gap |
|---|---|---|
| **L1-d 紫金葫芦炼丹端到端** | M(partial) | core 0x34 已做(event-system.ts:3114 对 script.c:1452,有 3888-3951 单测)。缺:① dump 紫金葫芦(items.json id270)scriptOnUse=39713 字节确认含 0x34 + 大世界 use→runScript 端到端;② 物品框 dialog(SPRITENUM_ITEMBOX)仅 console.debug;③ _storeTable 注入源核 |
| **L2-b 蛊升级链** | L(undone) | 无"N回合后蛊升级"机制。**先 dump** 金蚕蛊(39451)/灵蛊(39524)等 scriptOnUse 字节确认升级条件 + 0x1F/0x20 + 产物 id;数据驱动非新 opcode |
| **L2-c 炼蛊皿端到端** | M(partial) | 炼蛊皿(id268)scriptOnUse=39598;0x20/0x1F 原子 op 已有。缺:dump 39598 字节 + 端到端 + 核 0x20 的 operand[2] gate + partial-removal(script.c:986)|

**风险锚**:L 系统多是 item 脚本组装(非新 opcode),核心 = dump 真脚本字节确认 op 序列 + 产物 id,别假设。store 表/脚本字节若未提取则 blocked。

---

## 建议执行顺序

**W1(公式+死代码,最稳)→ W3(菜单层,独立)→ W2(trance/auto-battle,起手验觉醒 sprite+player colorShift)→ W4(OffMagic 演出:wWave→iBlow→keepEffect)→ W5(入场 fade+逃跑飞出,建 anim phase)→ L 系统端到端**。
每项独立 commit;W1 的 D7 改完立即同步 D9 baseline 快照。

## 总工作量估
W1 ≈ M-L / W2 ≈ M-L / W3 ≈ M / W4 ≈ L / W5 ≈ L / L系统 ≈ M-L。**合计约 30-45h 等效**,跨多 session。我按批 TDD 逐项做、逐 commit,不打包推后。
