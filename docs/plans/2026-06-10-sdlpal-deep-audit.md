# type-pal × sdlpal 第二轮深挖差异审查报告

> 生成日期:2026-06-10。背景:2026-06-07 第一轮逐函数对照审计(70 候选/64 confirmed)全部修复后,实玩仍持续冒 bug,根因集中在上一轮方法盲区——**跨函数执行顺序、副作用时机、状态生命周期(进入/退出/重入/读档)、系统间交接、帧级编排**。
> 方法:本轮改按**执行路径**切分 14 个范围(战斗 5 + 脚本/场景 4 + 菜单/存档/表现/输入 5),每范围一个 agent 沿 C 真实执行顺序逐步追踪对照 TS(整数语义/RNG 消费序/static/goto/提前 return/入口写回点位逐项核),并用 node 对 `data/extracted` 做触发面量化;随后全部 high/medium 候选 + 部分 low 共 50 条派 5 个对抗复核 agent 独立重核 C 源尽力推翻。
> 规模:19 个 agent(14 审计 + 5 复核),~2.8M subagent tokens。**复核结论已全部合并进下方正文**(收窄/纠正不再单列初审口径)。

## 统计

| 维度 | 数量 |
|---|---|
| 候选(去重合并后) | 81 |
| 🔴 high | 9 |
| 🟠 medium | 32 |
| 🟡 low | 39(其中 8 条已对抗复核,31 条未复核) |
| 审计期间已被修复 | 1(0x90,commit 935969b) |
| 对抗复核覆盖 | 50 条:confirmed 38 / revised 12 / **refuted 0** |

> low 级中标 `[未复核]` 的条目未做对抗复核,修复前请先按行号核对 C 源。
> 多条 finding 被 2 个初审 agent 独立撞到(DH1/DH2/DH3/DM7/DM1/DM8/DM10/DL11),互为印证。

## 修复进度(2026-06-11/12 全部落地)

按报告逐条修复,全部真值锚定 + TDD/突变验证 + `pnpm check` 全绿 + 逐条 commit
(66e9e2b..5d383b6,共 27 个修复 commit)。

- **✅ HIGH 9/9**:DH1-DH9。
- **✅ MEDIUM 32/32**:DM1-DM32 全部(含第二轮补完的 DM9 z 排序/DM11 敌 idle per-enemy
  状态机/DM29 进战斗揭场期静默)。
- **✅ LOW 33 条修复**:DLa(0x89 Terminated)/DLb(触发续扫)/DLc(触发站立帧)/DLe(0x59 立即写)/
  DLg(读档重播)/DLh(脚本后清键)/DL1-DL4/DL6-DL11/DL13-DL18/DL20-DL32。
- **📌 有意保留 5 条**(工程判断,理由如下):
  - DL5(战斗 magic/item 脚本返回值回写):全数据无 0x01 结尾实例(多数 0x00),需为 magic/item
    对象建 rgObject overlay 机制,latent 零收益 —— 待真实数据出现再做。
  - DLd(相机逐步进/pan 残留):复核确认实际触发面≈0,且 clamp 是 TS 相机模型的兜底,改动
    回归风险 > 收益。
  - DLf(异步存档快照):复核确认菜单态世界冻结,常规路径落盘 = 确认那刻;残余仅 IDB 异常慢竞态。
  - DL19(0x73 等键豁免):与"fade backup 须含对话像素"的视觉机制直接冲突,且全数据 0 相邻实例。
  - DL12(0x43/0x77 音乐 fade 参数):本项目音乐走 MIDI 后端,C 的 native MIDI 同样丢弃
    flFadeTime(audio.c)—— **忠实不做** gain ramp;计算保留注释供未来 OGG/RIX 后端。
    (DL28 的 EndingAnimation 段淡入同理部分保留:player 无 fade-in 选项,rng(10) 段已做。)
- 测试基线:1965(game)+247(extract)+88(shared) 全绿;DH2 经突变验证;修复过程中顺带修正
  2 个测试 fixture 缺陷(e2e flee 未同步 runtime fleeRate、casualty 阈值锁旧行为)。

## 审计期间用户已修(与本报告交叠)

- ✅ **0x90 SetObjectScript 写 `gs.rgObject` 无人回读**(初审 2 agent 报告+复核确认 HEAD 缺陷真实)——935969b 已修:开战播种优先读 rgObject overlay,0x90 首写按静态基线播种。本报告不再列为 open。
- e644a91(0x9C 分裂时间线无驱动)与 e8a6a1b(RNG 播放期间震屏计数冻结)为同期独立修复;后者与 DM32(fade 期间特效计数按 rAF 推进)同族不同点,DM32 仍 open。

---

## 🔴 HIGH(9 条,全部对抗复核 confirmed)

### DH1 敌队 0 占位槽被压缩——68/380 队站位错排,0x9E 召唤永远没有空槽
- 类别: correctness | 复核: confirmed(两 agent 独立发现)
- C 真值: battle.c:1604-1607 载入敌队 `w==0xFFFF → continue`(不占槽),但 battle.c:1716 `w==0` 仍 `rgEnemy[i++].wObjectID = w` **占空槽**并计入 wMaxEnemyIndex(:1719);站位 = `pos[槽位i][wMaxEnemyIndex]`(battle.c:936-937);0x9E 召唤房间 = `0..wMaxEnemyIndex` 内 `wObjectID==0` 槽数且填充不能扩槽(script.c:2890-2935)。
- TS 现状: battle-system.ts:291-292 `if (slot===0||slot===0xffff) continue` 把 0 槽与 0xFFFF 一并压缩;battle-state.ts:708-712 用紧凑索引取位;battle-opcodes.ts:1248 召唤房间只数 defeated 槽。
- 影响: 实测 **68/380** 敌队含 0 占位(赤鬼王[0,76,0]、黑巫师[0,124,0,0,0]、血云雾、狐狸精等,多为召唤型 boss)。站位/滑步轨迹/特效落点全错;且召唤房间恒 0 → **0x9E(脚本 32 处)恒走失败分支,boss 永不召唤**(赤鬼王 ready 脚本 @42512 `0x9E [419,2,0]` 实锤),战斗大幅变容易。
- 复核摘记: 质疑点"0x9C 分裂可扩槽与召唤不能扩槽矛盾"不成立——C 分裂确可扩槽(script.c:2812/2836-2840),两者并存;TS 分裂同样可扩,不受此条影响。

### DH2 CLASSIC 下 wDualMove=1 敌人应每轮必双动,TS 错用非 CLASSIC 的 50% 掷骰
- 类别: correctness | 复核: confirmed(#ifdef 边界亲核:fight.c:1155 `#ifndef PAL_CLASSIC` → :1385 `#else` → :1807 `#endif`)
- C 真值: fight.c:1478-1492(CLASSIC 侧)`if (e.wDualMove)` **无条件**入列两次,无任何 RandomLong;`wDualMove>=2 || (wDualMove && RandomLong(0,1))` 是 fight.c:1239-1242 非 CLASSIC ATB 分支。
- TS 现状: battle-system.ts:680 用了非 CLASSIC 公式(50% 掷骰),注释误锚 fight.c:1239-1242。
- 影响: 13 个 wDualMove==1 敌人(**林月如一/二(boss)**、镰刀鼬、狐狸精、枪卒等)原版每轮必两动,TS 半数回合单动——这些战斗威胁减半、节奏不对;且每轮多耗一次 RNG。(wDualMove>=2 共 6 敌不受影响。)

### DH3 perform 期缺 PAL_BattlePlayerValidateAction 降级链——封魔照常施法、MP/物品不足吞回合
- 类别: correctness | 复核: confirmed(三 agent 独立发现)
- C 真值: fight.c:3611 perform 起手必跑 validate(fight.c:3286-3358):法术未学 / `kStatusSilence>0` / `MP<wCostMP` → 攻击系法术降普攻(target -1→0)、辅助系降 Defend;投掷数量 0 → 降普攻(:3418-3422);UseItem 数量 0 → 降 Defend(:3434-3437);commit 层(fight.c:1875-1897)另有一层 MP 检查。
- TS 现状: battle-system.ts:2268-2317 perform 期只解算 sleep/paralyzed/confused+死目标重选;magic.ts:147-151 MP 不足 `warn+return`;item.ts:80-84 / throw-item.ts:80-84 count==0 `warn+return`;silence 在 perform 链路完全无检查(仅选单期 :931);R 重提(battle-system.ts:1244-1248)原样复制不复检。
- 影响: 同回合先手敌把队员封魔后该队员**照常施法**;MP 被中途耗光/物品被队友用光时,C 自动转普攻/防御,TS 该队员行动凭空消失(无动画无行为)。

### DH4 autoScript 的 0x06 jumpByRate 目标为 0 时应"原地重掷",TS 跳到 entry 0 → NPC 自动脚本永久死亡
- 类别: correctness | 复核: confirmed
- C 真值: script.c:3575-3591(RunAutoScript 专用分发)`if (RandomLong(1,100) >= op0) { if (op1!=0) {跳转} }`——**op1==0 且掷中跳转分支时 wScriptEntry 不变**,下帧重掷,即"每帧 op0% 概率推进"的随机停顿门。
- TS 现状: event-system.ts:3788-3795 OP_JUMP_BY_RATE 无 op1==0 守卫(该 handler 实现的是 InterpretInstruction 的 0x06 语义并被 auto 路径复用),直接 `jumpToGlobalIp(gs,cursor,0)` → 下帧落 `cmds[0]`=plain end → autoCursor 永久 park(event-system.ts:1200)。
- 影响: auto 可达闭包命中 **74 处**(复核口径;初审 48 为不同根集),全是 NPC 巡逻"walkTo→0x06[rate,0]→walkTo→…"随机停顿点;单次掷中冻结概率 81-93%,且循环内反复评估 → **全村闲逛 NPC 走到第一个停顿点后陆续永久冻结**。
- 修复提示: 与 DM16 同属 event-system.ts:1111-1301 autoScript runner 一个簇,建议参照 script.c:3518-3641 一起对齐。

### DH5 isWalkable 永久豁免 triggerMode≥4 的事件对象碰撞——744 个门卫/阻挡体可被穿行
- 类别: correctness | 复核: confirmed(三项数据声称全部精确复现)
- C 真值: scene.c:619-628 `if (p->sState >= kObjStateBlocker(=2)) { 曼哈顿 |dx|+|dy|*2 < 16 → 阻挡 }`,**无任何 triggerMode 条件**。
- TS 现状: scene-system.ts:385 `if (npc.triggerMode!==undefined && npc.triggerMode>=TRIGGER_MODE_AUTO_MIN(4)) continue` 豁免全部 mode 4-8 对象;追逐怪 hook、队员避障、blocker 推离全部继承该豁免。
- 影响: 静态数据 `sState>=2 且 mode 5-8` 共 **744 个**(mode5/6/7/8=669/52/21/2,挡路门卫/守卫类),C 挡人、TS 可穿行/重叠——可能直接 sequence-break 剧情。**删豁免不影响踩怪触发**:`mode==4 且 sState>=2` 为 0 个(明雷怪全部 sState≤1,本就不过 blocker 关),该豁免完全多余。

### DH6 群攻挥砍缺"全敌闪白"与"全敌收势抖动"两段演出
- 类别: correctness(演出) | 复核: confirmed
- C 真值: fight.c:2196-2207 ShowPlayerAttackAnim `sTarget==-1` 时特效 i==0 帧**所有敌人** `iColorShift=6`;:2229-2247 收势 3 帧所有敌人 `x-=dist`(8→-4→2)各 Delay(1)(colorShift 复位在收势循环之前 :2225-2228)。
- TS 现状: anim-timeline.ts:358-361 `if (targetIdx>=0)` 才染色;:399-403 群攻收势只 push 空 Delay(1)(attack.ts:202 注释自认跳过)。
- 影响: 全体攻击武器命中时敌群既不闪白也不集体晃动,只弹数字,打击感缺失。

### DH7 读档后不清空毒状态——C 读档即解毒
- 类别: correctness | 复核: confirmed
- C 真值: global.c:630 PAL_LoadGame_Common 内 `memset(rgPoisonStatus, 0, …)`——毒虽被保存(:772)但读回时无条件清零(原版"存读档解毒"机制)。
- TS 现状: bootstrap.ts:1460-1516 loadGameFromSlot `Object.assign` 原样恢复 `gs.rgPoisonStatus`,后续仅清 rgPlayerStatus/iCurInvMenuItem/sWaveProgression;0x4E 死亡重读复用同路径同样不清。唯一 `={}` 清空在 OP_SET_PARTY(对齐 script.c:2164),不在读档链。
- 影响: 带毒存档读回毒仍在(头像染色、掉血、减速持续);原版玩家惯用的"读档解毒"失效。

### DH8 带常驻屏波的战场(18/22/32/35/50)整场战斗不波动
- 类别: correctness(演出) | 复核: confirmed(数据亲核 wave=2/4/128/4/2;128 为合法大振幅非标志位,PAL_ApplyWave 仅 `==0||>=256` 关闭)
- C 真值: battle.c:1563 进战斗 `wScreenWave = battleField.wScreenWave`;battle.c:82-83 PAL_ApplyWave 挂在 DrawBackground 尾**每帧**施加。
- TS 现状: present-battle.ts:229-232 仅 `animFrame.screenWave>0`(法术帧)才 applyScreenWave;待机/菜单/普攻帧不施波。
- 影响: 5 个战场(水下/幻境类)原版全程荡漾,TS 静止、法术时突然波动。复核另发现更宽:anim-timeline.ts:908 法术帧 wave **未叠加 baseScreenWave**(仅用于 keepEffect 判定)——带常驻波战场连法术期间的波幅都偏小。

### DH9 子菜单完成操作后应关闭整个菜单回大世界,TS 弹回上级 hub
- 类别: correctness(交互流) | 复核: confirmed(`goto out` 全路径亲核)
- C 真值: uigame.c:994-1037 状态/仙术/物品三项**调用返回后无条件 `goto out`**(含子菜单内 ESC 取消的返回);PAL_SystemMenu(uigame.c:515-651)无外层循环,仅 ESC 取消返 FALSE 留 hub,其余(存档完成、**存读档槽里取消**、音乐/音效切换完)一律 return TRUE → goto out 关全部。
- TS 现状: menu-driver.ts:419-435 hub push 子菜单;:874-876/:776/:590 子菜单 done → closeTopMenu 弹回 hub;:920 存档完成回系统菜单;:468 音乐切完留系统菜单;仅 QUIT 清栈。(menu-driver.ts:453 注释"sdlpal SwitchMenu 返回后系统菜单 loop 继续"与 C 真值相反,移植时读错。)
- 影响: 原版从状态页/物品/仙术/存档出来一步回大世界;TS 要逐层多按 1-2 次 ESC,整个 ESC 层级矩阵与原版不同。

---

## 🟠 MEDIUM(32 条,全部对抗复核;按子系统分组)

### 战斗逻辑

**DM1 0x9F 变身覆写运行时 AI 脚本字段——C 保留旧形态脚本** [confirmed]
C: script.c:2954-2986 变身仅改 wObjectID/e(保 wHealth)/wCurrentFrame,三个 wScriptOn\* **不动**(沿用变身前缓存值含推进态)。TS: battle-opcodes.ts:1213-1215 从新对象表覆写。影响:4 处变身链(凤梨小妖→牡丹精@42601、傻仔龟→蛟龙@42614、小土鬼↔肥肥@42622/42628)——目标对象模板脚本全为 0,覆写后**变身链断**(无法连续变身)、凤梨小妖 battleEnd=41008 战后对白丢失。

**DM2 战斗结束未清大世界持久 rgPlayerStatus——金刚符等 buff 永久化** [confirmed]
C: battle.c:1825 任意结局后 PAL_ClearAllPlayerStatus(global.c:2331-2343,≤999 全清)+毒+Extra;C 战内外共用同一数组,战后清零即 buff 过期机制。TS: finalizeBattleCleanup(battle-system.ts:2737-2748)只清毒/Extra;战斗副本 seed 自 gs.rgPlayerStatus(battle-state.ts:700)不回写;大世界金刚符(63)/黑狗血(85)经 0x28 写持久数组 → 每场战斗重新 seed,等效永久。

**DM3 战斗退出把大世界屏波清零而非恢复进场前值** [confirmed]
C: battle.c:1559-1563 进战保存 wPrevWaveLevel/sPrevWaveProgression,:1854-1855 结束恢复。TS: battle-system.ts:2760-2763 无条件清零(修战斗内 0x71 泄漏的权宜),startBattle 无保存。影响:0x71 常驻波场景(数据 8 处用例)打完一架波即丢,直至重进场景。C 的"保存-恢复"语义可同时修掉原泄漏问题。

**DM4 逃跑成功率 def 累加未跳过已死敌** [confirmed]
C: fight.c:4127-4136 `wObjectID==0 → continue` 只累加活敌 `dex+(level+6)*4`。TS: flee.ts:42-46 全量累加(defeated 槽保留 stats)。影响:杀掉部分敌人后再逃成功率明显偏低,"先清小怪再逃"打法受损。

**DM5 boss 战逃跑提前 return——无失败演出、无 FleeExp、不消费 RNG** [confirmed]
C: fight.c:4143 `str >= RandomLong(0,def) && !fIsBoss`——RandomLong 恒消费;boss 必走失败分支(:4155-4170 三步右下挪+frame1+Delay(8)+FleeExp+=2)。TS: flee.ts:34-35 `if (state.isBoss) return` 在一切之前。影响:boss 战按逃跑零反馈。

**DM6 敌法术 autoDefend 资格在脚本执行后判定——C 在 scriptOnUse 之前预判** [confirmed]
C: fight.c:4723-4757 autoDefend 掷骰(查 sleep/paralyzed/confused 后 `RandomLong(0,2)==0`)+frame3 在 :4761 scriptOnUse/:4768 scriptOnSuccess **之前**,伤害除数(:4801/:4836)用该预判。TS: magic.ts:234/268 先跑两段脚本,magic-damage.ts:184-192 读脚本执行后状态。影响:敌"施状态+伤害"复合法术先把玩家催眠再结算时,TS 玩家被剥夺 1/3 概率减伤(最多多挨一倍伤),RNG 序亦偏移。

**DM7 傀儡(Puppet)状态死亡队员不出手** [revised:范围收窄]
C: fight.c:1731-1737 HP==0 仅 Puppet==0 改 Pass,有傀儡保留普攻照常行动(选单期 :1505-1517 已自动填普攻)。TS: battle-system.ts:2273 `role.hp>0` 才执行,无傀儡例外。复核收窄:TS 已实现傀儡三个语义(0x28 仅死人可设/死后站立帧/全灭判负豁免),**缺的仅"死亡傀儡保留普攻出手"一条**——战斗中傀儡队员变纯摆设但不致误判负。

**DM8 0x9E 自我召唤(op0=0/0xFFFF)副本拷运行时已推进的脚本入口——C 取对象表模板初值** [confirmed]
C: script.c:2885-2922 自我分支 `w=self.wObjectID` 后新敌脚本一律取 `rgObject[w].enemy.wScriptOn*`。TS: battle-opcodes.ts:1261-1267 拷 self 运行时字段(scriptOnReady 经 store-back 推进,battle-system.ts:2226)。影响:召唤副本天生带"已消费"入口,跳过起手对白/AI 节拍段;数据中自我召唤 2 处。当前被 DH1 挡住不可达,修 DH1 后显形。

### 战斗演出/渲染

**DM9 法术魔法精灵不参与 Y+sLayerOffset 统一 z 排序,恒画最上层** [revised:影响减半]
C: fight.c:2735/2755 每帧 `PAL_BattleAddSpriteObject(kBattleSpriteTypeMagic,…,sLayerOffset)`,与敌我精灵统一按 `PAL_Y+sLayerOffset` 排序(battle.c:441-442/556-558)。TS: present-battle.ts:211-224 overlays 在精灵之后单独全量 blit。复核修正:① 该字段**已抽出**为 `magic.json[].special`(raw u16,shared/tables.ts:243 注明即 sLayerOffset),只是渲染未消费;② 95 条非 summon 法术中 50 条 offset=99(≈恒最上层)与现行为巧合一致,**真正错的是 ~45 条 0/小正/负值法术**(尤其 -199/-25/-23 等应画在单位身后的地面型特效)。

**DM10 隐身(iHidingTime>0)期间队员精灵仍被绘制** [confirmed,两 agent 独立发现]
C: battle.c:207-211 `else if (iHidingTime==0)` 才 blit 队员(colorShift≠0 例外);解除时 FadeScene 渐显(fight.c:1670-1677)。TS: iHidingTime 仅 core 逻辑消费(敌跳过整轮已实现),present/ 层 grep 零命中,draw-battle-sprites.ts 队员无条件绘制。影响:0x5C 隐身(仙风云体类)逻辑生效但画面上队伍不消失,解除渐显也无。

**DM11 敌人 idle 动画:C 演出期间冻结+各敌独立相位,TS 全局时钟恒推进** [confirmed]
C: PAL_BattleDelay(fight.c:491-525)仅 fUpdateGesture=TRUE 推进敌 idle,敌方动作链全程 FALSE,法术帧循环无 idle 推进;wCurrentFrame 为 per-enemy 计数器(:999-1018)行动后从 0 重起 → 多敌相位漂移。TS: draw-battle-sprites.ts:86-95 `floor(frameNum/speed)%idleFrames` 全局时钟;driver:147 复位即回锁全局相位。影响:敌方出手/施法期间其余敌仍蠕动(C 全场静止);同种多敌永远同帧齐跳。

**DM12 动作收尾停顿成段缺失:UseItem 后 8 帧、玩家攻击法术后 5 帧、敌法术后 1+8 帧、回合末毒后 8 帧** [confirmed;"毒数字缺失"半句不实——数字有显示,缺的是停顿]
C: fight.c:4322-4324/4404-4406/4897-4908/1665-1668。TS: battle-system.ts:2121-2167 时间线播完同 tick 进下一动作;magic.ts:541/870-876 链尾无延时;回合末毒后同 tick 直转 selectAction(:2683-2697)。影响:节奏快 200-360ms,飘字叠在下一段演出/菜单上。

**DM13 colorShift 精灵缺"二遍叠绘提至最上层"** [confirmed]
C: PAL_BattleDrawAllSprites(battle.c:471-487)两遍:先全画,再仅 fHaveColorShift 叠绘一次 → 闪白/辉光精灵恒浮最前。TS: draw-battle-sprites.ts:359-366 单遍 Y 排序。影响:受击闪白角色被前方精灵遮挡时不浮起。

**DM14 治疗/辅助法术(ApplyToPlayer/Party)缺 PreMagicAnim 起手段** [revised:量化修正]
C: fight.c:4184 对**所有**玩家法术无条件先放 PreMagic(4 步前移+Delay2+frame5+10 帧 cast 特效,fight.c:2363-2444)。TS: magic.ts:705-760 两条 DefMagic 路径无 preFrames(offensive/summon/trance 均有)。复核修正:施法者并非全无动作(DefMagic 时间线自带 caster frame6,对齐 fight.c:2492-2493),**缺的是前移+frame5+施法闪光段 ≈0.7s**(非初报 1.5s)。

**DM15 AttackMate(混乱打友军)伤害数字先于走入动画** [confirmed]
C: fight.c:3791-3851 走入 frame8→frame9+击退+闪白**之后**才 DisplayStatChange(:3845)。TS: attack-mate.ts 第 5 步即时 emit showDamageNum,第 6 步才 startBattleAnim;buildAttackMateTimeline 无 damage 参数,pendingDamageNums 透传机制(5eb5050 的修法)此处未接。

### 脚本引擎/场景

**DM16 trigger-owner 的 autoScript 在 ride/party-walk 等多帧阻塞期间被整段跳过** [confirmed]
C: play.c:172-191 autoScript 循环无 owner 排除;PAL_PartyWalkTo/PAL_PartyRideEventObject 每步调 PAL_GameUpdate(FALSE)(script.c:190-191/~300)→ 阻塞走位期间 owner autoScript 照跑。TS: event-system.ts:1128-1132 `waiting===undefined` 即跳过 owner(注释自认对话朝向 workaround),而 ride/party-walk/NPC-walk 全是"同 ip 重跑+waiting 恒 undefined"。影响:**42 个对象**(scene17 莲叶 obj243-250 等,autoLabel=0x87 动画循环)乘坐移动全程动画冻结。

**DM17 0x81/0x83/0x84 缺"对象不在当前场景 → 失败跳转"判定** [confirmed,复核升置信]
C: script.c:2395-2404/2452-2461/2477-2486 先查 op0 在当前场景对象区间,不在即 `wScriptEntry=op2-1; fSuccess=FALSE`。TS: event-system.ts:4374-4383/4218-4245 经 resolveGlobalEventObject(4625-4655)回退全局表,异场景对象解析"成功"。影响:30 处(物品 scriptOnUse 跨场景共享脚本,C 的 guard 即"换个场景提示无法使用"的路由);复核找到具体巧合对(scene17 obj239 (496,232) vs scene100 obj1818 (528,248)):特定站位下假成功执行异场景动作,0x84(2 处)会把异场景对象搬到当前 party 位 = 跨场景状态污染。

### 对话/文本

**DM18 对话等键只认 Confirm——C 吞任意键翻页,Menu 键可跳字** [confirmed]
C: text.c:1433-1436 等键 `dwKeyPress != 0` 即 break(方向/ESC 均可);:1597-1608 打字中 `kKeySearch|kKeyMenu` 置 fUserSkip。TS: event-system.ts:1547 waiting 态只认 `pressed.has('Confirm')`(narration 的任意键是对的)。影响:ESC/方向键无法翻页、Menu 不能跳字,连打方向推对话的原版习惯失效。

**DM19 0x07 startBattle 前 TS 强加等键+清框——C 不清不等,台词保留进入场渐变** [confirmed]
C: script.c:3314-3333 case 0x0007 直接 PAL_StartBattle,是外层 switch 唯一带副作用却不清对话的 opcode。TS: OP_START_BATTLE 不在 isDialogContinuationOp(event-system.ts:490-509)→ pre-op 等键(:1671-1680)+清框(:1890)。影响:战前喊话后多按一次键才开战;全库 2 处(idx23538→battle293 天鬼皇、idx32723→battle113 黑苗)。

**DM20 纯控制符行("$00"/"$02")被整行跳过——丢打字速度与空行占位** [confirmed]
C: text.c:1534-1540 `$` 设全局 iDelayTime=NN\*10/7;:1745-1746 TEXT_DisplayText 返回后**无条件** posIcon 更新+nCurrentDialogLine++(纯控制行占一空行)。TS: event-system.ts:1815-1819 无可见字即 ip++,endIDelay 丢弃(:1822 注释与 C 源相悖)。影响:全库 2 处=死亡脚本 41078"$00"/41081"$02":C 瞬显($00→delay0)且正文下移一行,TS 慢打且上移一行。

**DM21 打字速度 iDelayTime 生命周期:C 脚本级持续,TS 段级重置** [revised:数量/限定修正]
C: 写点仅 text.c:885(初始)/:1204(RunTriggerScript 入口设 3,script.c:3192)/:1538($NN);StartDialog 不碰它 → $NN 跨段持续;**限定:0x04 call/0x07 battle 的嵌套 RunTriggerScript 入口会重置回 3**。TS: dialog-box.ts:275-276 每个新 box 重置 DIALOG_IDELAY_DEFAULT,仅同 box appendDialogLine 继承。影响:**~184 处**"$NN→换段→新正文"跨段调速丢失(如 $07 段 C 80ms/字 vs TS 24ms/字,$07 文本 13 处)。

**DM22 kDialogCenter 对话后缺"自动复位回 Upper"** [revised:命中口径=2 段 7 行]
C: text.c:1777-1783 **每个** PAL_ClearDialog 调用点(script.c:3271/3350/3377/3393-3432/3469 default 等)都把 center 复位为 Upper 并还原坐标/颜色。TS: gs.currentDialogStyle 写点仅 setDialogStyle/'end' 三处,0x05/pre-op 清/0x8E 后 style 残留 'center'。影响:实锤 2 段 7 行——idx17009-17010 灵儿声音"李逍遥∶"(C 回 Upper 青色姓名牌,TS 仍屏中)、idx32073-32081 石碑碑文(C title+4 行一页,TS 5 行 center 多一次翻页);属清理责任矩阵的结构性缺口。

### 菜单/存档

**DM23 装备菜单缺入口写 wLastUnequippedItem——读残值可错跳面板,边缘可达装备复制** [confirmed]
C: uigame.c:1820 进装备菜单先 `wLastUnequippedItem=wItem`(:1857-1859 每帧重读);script.c:780-810 0x18 仅在已穿不同款时写回。TS: equip-menu.ts:67-68 只写 state.selectedItemId;menu-driver.ts:743 跑完脚本无条件读 gs.wLastUnequippedItem。影响:给已穿 X 的角色再装一件 X(背包有第二件即可达)→ 读到上次换装残值,面板跳成别的物品/弹回列表;若残值物品已不在背包(如已卖),再确认可凭空装上(consumeItem 对缺失物品 no-op)——**复制链技术可达但需多步,边缘场景**。

**DM24 存/读档槽菜单默认光标不落 bCurrentSaveSlot,恒从槽 1 开始** [confirmed]
C: uigame.c:582/605 `PAL_SaveSlotMenu(bCurrentSaveSlot)`(:225 ReadMenu 默认 wDefaultSlot-1)。TS: menu-driver.ts:503/509 不传默认,save-slot-menu.ts:46 光标恒 0(primitives defaultCursor 形参存在未接线);gs.currentSaveSlot 已维护但菜单不读。影响:习惯存 3 号槽的玩家每次从槽 1 挪,易误覆盖。

**DM25 回标题再开新游戏残留上一局:屏波/battleMusic/battleField/chaseCycles/followers;且 TS 缺 C 的"进场景清屏波"二重保险** [revised]
C: 新游戏只在进程启动/FreeGlobals memset(global.c:262)发生,字段语义恒 0;**另有二重保险:fEnteringScene → res.c:238-239 进场景即清 wScreenWave/sWaveProgression,TS 无对应(缺口比"仅新游戏"更宽)**。TS: loadDefaultGame+resetSceneRuntimeForNewGame(game-state.ts:1292-1362)缺这些字段;returnToTitle→startNewGameFromPrimary 全程 mutate 同一 gs 不重建。影响:旧局水波场景退出再开新游戏 → 开场持续扭曲(静态波在 TS 自清条件下永不消散);旧局 0x98 跟随者残留队尾(渲染走 gs.followers 数组)。复核剔除:party.facing 残留被新游戏 onEnter 脚本覆盖,无实际影响。

**DM26 系统菜单读档缺整套过渡:停乐 fade 1s → FadeOut(1) → fNeedToFadeIn 淡入** [confirmed]
C: uigame.c:608-610 + global.c:910(fNeedToFadeIn)+ scene.c:503-507(进场淡入)。TS: menu-driver.ts:922-940 直接调 handler 零 audio/fade;loadGameFromSlot 瞬黑→瞬恢复;needToFadeIn 仅 0x4E 死亡路径设。TS 淡入机制本身存在,纯接线缺口,三缺三(停乐淡出/屏幕淡出/淡入)。

### Shell/过场/输入

**DM27 RNG/FBP/Ending 过场可被按键跳过且停在中间帧——原版全部不可跳、必播到尾帧** [confirmed]
C: rngplay.c:409-443 PAL_RNGPlay 主循环无任何按键检查(:407 注释"Avoid losing the last frame"印证末帧常驻);**trademark(main.c:200)走同一函数,连开机动画也不可跳**;ending.c 的 ShowFBP/ScrollFBP/EndingAnimation 同样无键检查。TS: rng-player.ts:133 默认 skipKeys=Space/Enter/Escape,:188 skipped break 停当前帧;fbp-player.ts:70/136、ending-player.ts:34 同款。影响:连打确认过对话会误跳剧情 RNG 动画,且残留中间帧(C 恒末帧),后续对话叠在错误画面上。

**DM28 标题/主菜单音乐整条缺失(RIX 5 标题曲、RIX 4 主菜单曲)** [confirmed:接线缺口非资源缺口]
C: main.c:293 splash 起手播曲 5(fade 2s)、:449-455 退出停乐;uigame.c:114 OpeningMenu 播曲 4、:157-158 确定后停乐+FadeOut。TS: bootstrap.ts:1594-1676 全程零 audio 调用(开局 wNumMusic=0 → 轮询静音);**004.mid/005.mid 资源都在,spessasynth 后端已接,可播而未接**。

**DM29 进/出战斗音乐接缝:C 1s 淡出→200ms 静默→揭场后才起战斗曲、退场 1s 淡入恢复;TS 同帧硬切且后端 fade 参数被忽略** [confirmed]
C: battle.c:716-728/1849。TS: syncShellAudio(bootstrap.ts:157-167)按 battleState 出现/消失同帧切;两个 MusicBackend 的 `stop(fadeMs?)` 参数被忽略(audio.ts:146-161、audio-midi.ts:113-120)且调用方不传。影响:遇敌瞬间场景曲掐断、战斗曲零延迟炸响。(C 的 fade 在 native MIDI 后端也是条件性的,但"先停→静默→揭场后起曲"的结构性时序与后端无关,TS 全缺。)

**DM30 fade 后按住的方向键自动恢复走路——C 要求松开重按** [confirmed,推翻尝试失败]
C: palette.c:313-316(各 fade 每步)ClearKeyState+dir=prevdir=kDirUnknown;input.c:213 `if(!fRepeat)` 才重算 dir,按住不放只产生 fRepeat=TRUE 的 KeyDown(:325-330)→ fade 后 dir 恒 Unknown 直到物理松开重按。TS: pickFacing 每 tick 直读 input.held(scene-system.ts:76-85),held 仅 keyup 删,fade 不清。影响:按住方向穿过黑场/场景渐变后径直续走,可能踩进新场景 trigger 连环触发。

**DM31 rAF 累积器追帧连跑逻辑帧——C 慢帧只顺延、绝不补帧** [confirmed]
C: game.c:75-78 与 battle.c:782-787 `PAL_DelayUntil(dwTime); dwTime=now+FRAME_TIME`——下一截止从当前时刻起算,一次渲染恰一帧逻辑。TS: main-loop.ts:75-87 accumulator while 连跑,clamp 仅 >3×interval 压回;滞后 1~3× 时单 rAF 连跑 2-3 tick 只 present 末态。影响:卡顿后走路瞬移 1-2 步、演出跳帧;accumulator 跨 mode 不清零,explore(100ms)残量进 battle(40ms)可立即多跑 2 tick。

**DM32 fade 进行期间 wave/shake 计数器按 60fps rAF 推进(应按 10/25fps 逻辑帧)** [confirmed]
C: scene.c:389 wave 累加与 video.c:615 shakeTime-- 只随逻辑帧;PAL_SceneFade 期间每 100ms 一步。TS: main-loop.ts:90 `ticked || fadeState || paletteFadeState` → fade 期间每 rAF 都 present;present.ts:254-256/621-627 每次 present 推进计数器(screen-wave.ts:33/66、screen-shake.ts:51)。影响:fade 有波场景水波快 ~6 倍、震屏 60Hz 抖且提前结束。(e8a6a1b 已修 RNG 播放期间同族问题,本条 fade 路径仍 open。)

---

## 🟡 LOW

### 已对抗复核(8 条)

- **DLa 0x89 SetBattleResult=0(Terminated)被并入 'fleed'** [revised→latent]:代码层语义合流属实(battle-opcodes.ts:752-753 vs script.c:3318-3331 Terminated 应续行),但全部 4 处实例(石长老/彩依/林天南/六脚蜘蛛/天鬼皇)的触发 0x07 **op2=0** → fledIp=undefined → 落 wonIp=下一条,**与 C 行为逐位一致**(game-state.ts:1499 注释表明有意);仅当经 op2≠0 的通用遇敌分发表入口触发才显形。
- **DLb 自动触发命中一个对象后 return 整帧扫描** [revised]:C 跑完继续扫(play.c:81-166),TS 命中即 return(scene-system.ts:227-231)——真实偏差是"命中 tick 跳过后续对象的 vanish 递减/复活/触发";初报"空脚本对象持续封死"不成立(静态数据 `mode≥4 且无 triggerLabel`=0 个,0x25 恒写可解析 label,死代码)。
- **DLc 自动触发瞬间未切站立帧(PAL_UpdatePartyGestures(FALSE))** [revised:范围收窄]:play.c:120-148 vs scene-system.ts:210-224(walking 残留 true,present.ts:275-277 盖掉 partyScriptedFrame)。收窄:仅 owner 有 sprite 帧的触发 + stepFrame 奇相位(~2/4)+ 不含 0x15/walkTo 的纯对话脚本才可见;Search 帧仅"按住方向+按调查"边缘态被盖。
- **DLd 相机每 tick 回中并 clamp(C viewport 相对步进无 clamp,0x7F pan 残留+partyoffset 反向补偿)** [revised→latent-low]:C 真值属实(scene.c:835-836、script.c:2352-2360),但 x<160/y<112 两边都不可走入、clamp 上界永不生效、唯一低位 0x46 实例(entry 16976)处于淡屏 cutscene 相机由脚本驱动——实际触发面≈0。
- **DLe 0x59 ChangeScene 延迟写 wNumScene** [confirmed latent]:C 立即写(script.c:1880),TS 等异步加载完(bootstrap.ts:770);对全部 882 处 0x59 做前向 BFS(含跨过程)0 个 wNumScene 读点命中,纯潜伏雷。
- **DLf 存档异步快照漂移** [revised:常规无害]:机制属实(menu-driver.ts:910-920 deepClone 在 IDB listSlots 往返后,C 同步 uigame.c:582-597),但 closeTopMenu 后仍在菜单态、世界冻结,clone 时 gs 实质等同确认那刻;残余风险仅 IDB 异常慢的竞态 + 菜单期间 frameNum/波计数多记几帧(无害)。
- **DLg 菜单读档后音乐不从头重播** [confirmed,限菜单读档]:C 经 uigame.c:608 先停乐故 res.c:223 必从头(player 同曲本是 no-op,rixplay.cpp:331);TS 轮询同曲续播。0x4E 死亡重读同曲场景 C/TS 行为一致,不构成差异。
- **DLh 调查触发脚本结束后缺 50ms 吞键窗** [confirmed]:play.c:504-505 `UTIL_Delay(50)+ClearKeyState` vs scene-system.ts:515 注释自认省略(理由不成立:pressed 跨快照累积)。对话末 50ms 内的第二下 Confirm 会立即重开同段对话。

### 未对抗复核(31 条,修复前请按行号核对 C 源)

战斗:
- **DL1** 执行期 auto-attack 粘性(fPrevPlayerAutoAtk)缺失——围攻中途取消后 C 强制后续队员普攻(fight.c:1447/1748-1759);TS 无对应物。
- **DL2** 濒死判定两处细节:dying-sweep 用 raw `maxHP/5`(无 min(100,…),fight.c:836-837),TS 多 min;dyingSound 在守护者失能检查之后(:841-850),TS 无条件播。
- **DL3** 合击回合失能队员行动未被 fThisTurnCoop 吞掉(fight.c:3858/3762)——TS 混乱队员多出一次攻击(healthy 队员主路径等价)。
- **DL4** 敌方 attack/magic 行动多消费一次 RandomLong(2,3)(hiddenExp 实参先求值,battle-system.ts:2413/2457)——纯 RNG 流偏移。
- **DL5** 战斗中 magic/item/throw 触发脚本返回值不回写入口(fight.c:4214 等 `wScriptOnUse = RunTriggerScript(…)`)——0x01 结尾的 show-once 不推进;多数脚本 0x00 结尾,影响依赖数据。
- **DL6** 合击 healthy≤1 降级普攻不积隐藏 exp、不掷 RandomLong(2,3)(fight.c:3374-3378→3756-3757)。
- **DL7** 被沉默敌人 C 仍先消费 wMagicRate 掷骰(fight.c:4656-4658 短路序),TS 前置短路不消费——RNG 流偏移。
- **DL8** 混乱敌打友军超杀时 C 显示完整伤害(WORD 下溢,fight.c:4645-4647),TS 显示钳后值(attack.ts:453-469)——与 TS 自家 player→enemy 路径不一致。
- **DL9** 0x9C 分裂瞬间 TS 给原敌弹蓝色掉血数字,C 静默(BackupStat 在 scriptOnReady 后刷新 prevHP,无 DisplayStatChange 窗口)。
- **DL10** 敌施法音早 ~2 帧(C 在两步滑步后播,fight.c:4683-4695);被动格挡 frame3 提前于敌手势完成(:4719-4757 在特效前)。
- **DL11** 0x18 装备缺"新件恰 1 件且旧件不在包 → 原位替换"特例(script.c:784-805),TS 恒 -1/+1,换下装备掉列表末尾(两 agent 独立发现;equip-effect.ts:398-403 与 event-system.ts:3837-3843 双实现都缺)。
- **DL23** 预战 turn-start 循环只对敌逃 break,不响应 0x89 等任意终态(battle.c:744-756 `BattleResult!=PreBattle即break`)——当前 4 处 0x89 全单敌队,latent。
- **DL30** 选敌目标态多画 4 个灰化主菜单图标(uibattle.c 仅 SelectTargetPlayer 画,TS 选敌也画,draw-battle-ui.ts:280-287)。
- **DL31** DefMagic 收尾辉光 14 帧(0..6,6..0),C 13 帧(0..5,6..0 峰值一次,fight.c:2573-2605);UseItem 同构循环 TS 正确,系笔误。
- **DL32** 敌物攻收尾恢复帧应为攻击前帧备份 wFrameBak(睡眠姿等,fight.c:4915/5108-5133),TS 固定 0/1/2——reset 兜底前 5 帧短暂站立。

脚本/场景:
- **DL13** autoScript 0x06 掷中跳转(op1≠0)消耗 1 帧,C `goto begin` 同帧续跑(script.c:3579-3585);'goto'(0x03) 已修同帧,0x06 漏修——巡逻节奏慢。
- **DL14** 战斗打断 onEnter 脚本时 0x08 checkpoint 丢失(savePostBattleResume 只存 onEnterStartIp,event-system.ts:2827-2842)——1000981 直接姊妹;当前数据 BFS 无 `0x08→0x07` 可达对,latent。
- **DL15** autoScript 0x04 call:C 同帧同步跑完子脚本(script.c:3566-3573),TS 摊成每帧一条——15 处开门/机关动画慢 2-3 帧。
- **DL16** 0x09 wait 的 operand[2](逐帧 UpdatePartyGestures(FALSE) 切站立帧)未实现(script.c:3360-3363);11 处演出等待期间队伍可能定格迈步帧。
- **DL17** trigger/onEnter 的 0x02-end 带 idleFrames("第 N 次触发后落下一条",script.c:3219-3237)未实现;auto 路径已正确,trigger 可达 0 实例,latent。
- **DL24** blocker 推离落点检查漏传 fCheckRange=TRUE(play.c:218),可被顶进 col<5/row<7 边缘带(scene-system.ts:253)。
- **DL25** PAL_PartyWalkTo 的 trail 记"移动前旧朝向"(script.c:151 在方向更新前),TS 记新朝向(event-system.ts:4740-4754)——脚本走位转弯帧跟随者朝向早一帧。
- **DL26** partyWalkTo 到达后缺 stepFrame 相位复位 &=2;^=2(script.c:199→scene.c:773-774)——紧接走路时起步左右脚相位差一拍。

对话/菜单:
- **DL18** fUserSkip 与 `~` 交互:跳字后 `~` 行尾不复位 fUserSkip(下一行应恢复逐字,text.c:1546-1554)且 `~NN` 尾停顿被吞(实例 idx27755 "$12…~70")。
- **DL19** 对话后直接接 0x73 fadeScreen 被豁免 pre-op 等键(C default case 必等,script.c:3468-3471);全库唯一相邻点以 `~` 收尾恰无差,latent。
- **DL20** 用物品目标框 Left/Right 失灵(C kKeyUp|kKeyLeft / kKeyDown|kKeyRight,uigame.c:1473-1488;TS inventoryMoveLeft/Right 在 use-target 阶段 no-op)。
- **DL21** PAL_ReadMenu 系竖排菜单(主菜单/系统/商店买/存档槽/装备·使用框/开局)Left/Right 不响应(ui.c:486/541 左右等同上下)。
- **DL22** 仙术菜单施法人不记忆(C 函数级 static 跨开启保留,uigame.c:674/719;TS 光标恒 0)——同型记忆 L40 已做物品目标框,此处遗漏。

Shell/过场:
- **DL12** 0x43/0x77 音乐淡入/淡出参数被丢弃(script.c:1647 `(op1==3&&op0!=9)?3.0:0`、:2219-2221 停乐 `op0?op0*3s:2s`),TS 只写曲号硬切(fadeSec 是未使用变量)。
- **DL27** AVI 跳过后缺 UTIL_Delay(500) 缓冲(aviplay.c:741-747)。
- **DL28** DOS 结局编排缺 2 处 fNeedToFadeIn 淡入+全程无音乐(ending.c:438-460 各段配乐);win95 数据正常通关走 mp4 不受影响,devpanel/mp4 缺失路径可达。
- **DL29** 进战斗揭场用 96 步 nibble-dither,C 为 VIDEO_SwitchScreen 6 步 stride-6 整像素置换(video.c:1092-1126,rgIndex={0,3,1,5,2,4});时长 360ms 已对齐,质感不同。

---

## 横向备注

1. **reference fork 基准**:本仓 reference/sdlpal 在"全灭判负与 Puppet"处与上游 sdlpal 不同(本仓 fEnded 不受 Puppet 抑制)。TS 与本仓 reference 一致,不计差异;若未来同步上游需复核 fOnlyPuppet 门。
2. **RNG 流对拍**:DL4/DL7 及 DM6 的 RNG 消费序偏移不影响分布,但会使同 seed 与 sdlpal 的逐抽对拍分叉——项目多处测试以 c10 对拍为基准,修复时建议顺带对齐。
3. **修复聚簇建议**:DH4+DM16+DL13/DL15(autoScript runner 簇,event-system.ts:1111-1301 ↔ script.c:3518-3641);DH1+DM8(敌槽位模型);DM25+DM3+DH8(屏波生命周期:进场景清/进出战斗保存恢复/战场常驻波);DM18+DL20/DL21(键集合);DM28+DM29+DL12(音频 fade 能力——两后端先实现 stop/play 的 gain ramp)。

## 各范围"已核对无差异"摘要

初审 14 个 agent 每个附有已核对路径清单(战斗主循环帧序/行动队列倍率与 jitter/伤害公式全链/经验升级/状态生命周期/毒结算顺序/偷窃/敌普攻链/对话四模式坐标/控制符/翻页/菜单网格导航/商店买卖/SAVEDGAME 逐字段勾验/调色板特效参数表/RNG-FBP-ending 节拍/输入边沿语义/帧率常量等,合计 200+ 条),细节见各 agent 原始输出;其中与上一轮修复(L1-L47/M1-M15/H1-H2)相关的回归复查全部通过。SAVEDGAME 字段勾验表结论:除 DH7/DM25/DM26/DLg 所列外,保存/读回/新游戏初值三列语义等价(rgEventObject 经 allEventObjects 全量持久化,含 trigger/auto checkpoint;装备效果方向为"存裸 base+读档重算",与 C 一致)。
