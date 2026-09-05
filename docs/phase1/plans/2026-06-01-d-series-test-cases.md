# D 系列真机手测用例表(2026-06-01)

> 来源:24-agent workflow 逐 D 项生成(读 ts 实现 + sdlpal 真值 + 确认 gs 字段)+ 完整性 critic 审查。
> 共 **23 个 D 项 / 90 条用例**。这些战斗核心 0 verified —— 本表让 user 第一次真机数据级核。

---

## 真机设施纠正(critic 揪出,用例里凡冲突以此段为准)

生成用例的部分 agent 信了任务 brief 里**编造的 devpanel 热键**。实测 dev-panel.ts 真值:

**devpanel 真实热键只有 3 个**(dev-panel.ts:159-179):**B**(battle picker,explore/battle 都能开)、**F1**(GameState dump)、**P**(强制三人入队 李逍遥0/赵灵儿1/林月如2)。
**K / L / M / I / C / F / G / T / 数字键全不存在**(brief 编的)—— 用例里凡 `按 L 满血` / `按 K 秒敌` 做不到。

**替代真值**:
- 满血/高血 → 用自带高血 fixture(fixture-end 三人 9999HP / fixture-zh2 400HP),或 console `window.__game.gs.__battleResources.playerRoles.roles[roleId].hp = 999`
- 加状态 → 战斗中按 `B` 开 picker 顶部 **战斗状态调试 section**(混乱/麻痹/睡眠/沉默/傀儡/狂暴/护体/加速/双攻/中毒/清除,设 5 回合,只作用 player 0,仅战斗中;dev-panel.ts:341-400)
- 加道具/学法术/清包/金钱 → picker 面板内按钮(dev-panel.ts:589-623),非全局键

**数据级验证字段(用对路径)**:
- 句柄 `window.__game.gs`(只暴露 gs/assets/presentCtx)
- **战斗中**玩家 HP/MP:`gs.__battleResources.playerRoles.roles[roleId].hp` —— 不要读 `gs.PlayerRoles`(不存在)或 `gs.PlayerRolesRuntime.rgwHP`(战中不 live,战末才回写)
- **战后**玩家 HP/等级:`gs.PlayerRolesRuntime.rgwHP/rgwLevel`(finalize 已回写)
- 敌人 HP:`gs.battleState.enemies[i].e.health`;敌状态:`gs.battleState.enemies[i].status`
- 战斗态:`gs.mode` / `gs.battleState.{turn,phase,iHidingTime,iBlow,players[i].status,battleDialogQueue}`

**战斗内按键**(shell/input.ts:54-60,真实):A=Auto / D=Defend / Q=Flee / W=ThrowItem / S=Status / R=Repeat / E=UseItem;移动=方向键;Confirm=Space/Enter。

**verdict 翻盘**(critic 实测):
- **D7** dualMove:picker 选不到 enemyTeamId 47/50,console 调不到 startBattle → 需新增 fixture 才能真机测(当前不可直接触发)
- **D14** 装备:console 调不到 runEquipScript 等(未挂 window)→ partially,须走装备菜单 UI

---

## D1 — 战斗启动 StartBattle (opcode 0x07 / battle picker)
*可测性: fully-testable*

**已知边界/排除**: 已核实来源(亲读全文):startBattle = /Users/zhangxu/illegal/type-pal/packages/game/src/core/battle/battle-system.ts:254-331;createBattleState = .../battle/battle-state.ts:560-638;GameState 字段 = .../core/game-state.ts(battleState? at line 613、mode at 569、partyMembers at 566、dwCash at 849、PlayerRolesRuntime at 869、prevBattleActions at 923);picker 接线 = .../shell/dev-panel.ts(B 弹 picker → applyFixture → startBattle,line 36/890-918,fixture 默认 enemyTeamId 见 line 332 注释 "[7,6,7,6,6]=5 敌");gs 句柄 = .../shell/bootstrap.ts:796-798 暴露 window.__game = { gs, assets, presentCtx }(故 console 用 window.__game.gs)。sdlpal 真值出处 = reference/sdlpal/battle.c:1531 PAL_StartBattle(已 grep 确认行号存在)、script.c:3318 opcode 0x07 → PAL_StartBattle(rgwOperand[0], !rgwOperand[2])。

startBattle 真流程(逐行已读):按 enemyTeamId 找 team(找不到 throw,line 256)→ 遍历 team.enemies 槽位跳 0/0xFFFF(line 270)、每槽 input.enemies.find(en=>en.id===slot) 解引用(line 271)、找不到 console.warn '[battle] startBattle: enemy id N not in enemies.json, skipped'(line 273)→ 找 battleField(找不到 throw,line 287)→ createBattleState → gs.mode='battle';gs.battleState=新 state(line 307-308)→ 缓存 __battleResources(line 309-324)。createBattleState 初值:phase='preBattle'(line 618)、turn=0(619)、uiState='hidden'(623)、iHidingTime=0/iBlow=0(635-636);每 BattleEnemy.e=enemies.json shallow copy、prevHp=maxHealth=e.health(596-597);players 由 gs.partyMembers 映射(568-586),partyMembers.length>3 throw(536/561-565,对齐 sdlpal g_rgPlayerPos[3][3][2])。

无 stub/简版子部分需排除 —— startBattle 本体(找队/展开槽位/建态/切 mode/缓存资源)是完整实现。一处简化注明:enemyTeam 槽位"直接当 enemies.json id 索引"(battle-system.ts:18-22,T23 baseline 待校),若选某队后敌人数/种类与原版对不上属此映射、非启动流程 bug,D1-2 verify 已含此观察点。未能展开读 battle.c:1531 PAL_StartBattle 全 callpath 正文(用户叫停)——所引仅到入口行号 1531 + script.c:3318 opcode 接线,均 grep 实证,未编造正文细节。

### D1-1 B 键 picker 进战斗:mode 切 battle、battleState 被创建、phase 起于 preBattle、turn=0
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间(gs.mode 应为 'explore')。按 Cmd/Ctrl+Shift+D 开 devpanel。B 键弹 battle picker(仅 explore 模式有效,dev-panel.ts:8)。
- **操作**: 开 app(?skip-intro=1)→ Cmd/Ctrl+Shift+D → B → 在 picker 里选任一战斗 fixture(默认项 enemyTeamId=7,5 敌)→ 确认进战斗。
- **预期**: picker 选后走 applyFixture → startBattle(dev-panel.ts:890-918)。startBattle 找到 enemyTeam → 建 BattleState → gs.mode='battle';gs.battleState=新 state(battle-system.ts:307-308)。createBattleState 初值 phase='preBattle'(battle-state.ts:618)、turn=0(619)、uiState='hidden'(623);下一帧 tickPreBattle 才把 phase 推到 'selectAction' 并起首队员菜单(battle-system.ts:437-441)。sdlpal 真值:script.c:3318 opcode 0x07 → PAL_StartBattle(battle.c:1531)载入敌队+初始化战斗。
- **验证**: (a) 肉眼:画面从房间场景切到战斗界面,出现敌人、我方队员站立、底部 4 图标命令菜单(攻击/法术/合击/杂项)。(b) console:window.__game.gs.mode === 'battle';window.__game.gs.battleState 非 undefined;window.__game.gs.battleState.turn === 0;进战斗首帧抓 window.__game.gs.battleState.phase 为 'preBattle'(随后变 'selectAction')。字段路径均出自亲读的 battle-state.ts / game-state.ts:613。

### D1-2 enemies 数组按所选战队槽位填充,每敌 .e.health 起手等于 maxHealth
- **前置**: ?skip-intro=1 → devpanel → B → 选默认 5 敌的 fixture(enemyTeamId=7,dev-panel.ts:332 注 [7,6,7,6,6])进战斗。记下选的是哪个 fixture 用于回查。
- **操作**: ?skip-intro=1 → Cmd/Ctrl+Shift+D → B → 选默认(5 敌)fixture 进战斗 → 打开浏览器 console。
- **预期**: startBattle 遍历 team.enemies 槽位(battle-system.ts:269-284):跳 0/0xFFFF,其余每槽 input.enemies.find(en=>en.id===slot) 解引用压入 enemyList;找不到的槽位 console.warn '[battle] startBattle: enemy id N not in enemies.json, skipped'(line 273)。createBattleState 为每敌建 BattleEnemy:e=enemies.json shallow copy、prevHp=e.health、maxHealth=e.health(battle-state.ts:589-611)。sdlpal:PAL_StartBattle 据敌队定义载入敌人(battle.c:1531)。注:槽位→enemy 是简化直接映射(battle-system.ts:18-22,T23 待校),若数量不符看有无 skipped warn。
- **验证**: (a) 肉眼:战斗内敌人个数/种类与所选战队一致(默认 5 敌应看到 5 只);若变少查 console 有无 'not in enemies.json, skipped'。(b) console:window.__game.gs.battleState.enemies.length 等于该队活槽位数;window.__game.gs.battleState.enemies[0].e.health > 0 且 === window.__game.gs.battleState.enemies[0].maxHealth(战斗起手满血,battle-state.ts:596-597);window.__game.gs.battleState.enemies[0].e.id 是该队某活槽位 id。

### D1-3 players 由 partyMembers 映射,roleId 对齐入队角色;超 3 人 startBattle 抛错
- **前置**: 基础用默认单人(李逍遥)即可;多队员先按 P 强制三人入队。?skip-intro=1 → devpanel。
- **操作**: 情形A(基础):?skip-intro=1 → Cmd/Ctrl+Shift+D → B → 选队进战斗 → console 查 players。情形B(多人):?skip-intro=1 → devpanel → P(三人入队)→ B → 进战斗 → console 查 players。
- **预期**: createBattleState 把 gs.partyMembers 逐个映射成 BattlePlayer(battle-state.ts:568-586):roleId=partyMembers[i];prevHp/prevMp=该 role 当前 hp/mp;defending=false;status 由持久 rgPlayerStatus seed。partyMembers.length>MAX_BATTLE_PLAYERS(=3,line 536)→ 抛 'createBattleState: partyMembers.length=N > 3'(561-565,对应 sdlpal g_rgPlayerPos[3][3][2] 战斗最多 3 player)。
- **验证**: (a) 肉眼:战斗内我方队员数量/种类与入队一致(基础 1 人,P 后 3 人)。(b) console:window.__game.gs.battleState.players.length === window.__game.gs.partyMembers.length;window.__game.gs.battleState.players[0].roleId === window.__game.gs.partyMembers[0];window.__game.gs.battleState.players[0].defending === false。若曾>3 人入队,进战斗应 console 报错(红色 throw)而非静默。

### D1-4 战斗局部计数器初始化:iHidingTime 与 iBlow 起手为 0
- **前置**: ?skip-intro=1 → devpanel → B → 选队进战斗。
- **操作**: ?skip-intro=1 → Cmd/Ctrl+Shift+D → B → 选队进战斗 → 立即开 console 查初值。
- **预期**: createBattleState 返回的 BattleState 显式置 iHidingTime=0、iBlow=0(battle-state.ts:635-636)。二者是战斗启动归零的局部状态:iHidingTime 对应 sdlpal g_Battle.iHidingTime(0x5C hide 设 -op0,battle-state.ts:421-424);iBlow 对应 g_Battle.iBlow(0x6B blow 设 op0,425-429);起手均 0。startBattle 不带入上一场残留(每场 createBattleState 重建)。
- **验证**: (a) 肉眼:无直接可见项(内部计数器)— 间接看起手敌方能正常瞄准我方(iHidingTime=0 不跳瞄准)。(b) console:进战斗首帧 window.__game.gs.battleState.iHidingTime === 0;window.__game.gs.battleState.iBlow === 0。路径来自亲读的 battle-state.ts(定义 421/425,初始化 635-636)。

---

## D3 — 物理伤害公式(单体 jitter/crit/李逍遥×2/群攻 division/DualAttack 双击)
*可测性: fully-testable*

**已知边界/排除**: 无未做子部分:单体 jitter(RandomLong(1,2))、暴击 ×3(1/6 或 bravery)、李逍遥额外 ×2(roleId===0 && 1/12)、末尾 RandomFloat(1,1.125)、<=0→1 钳位、群攻命中序 [2,1,0,4,3] + division 逐敌翻倍、DualAttack 双击,attack.ts 全部 1:1 port 且经 sdlpal fight.c 源码逐行核对(单体 fight.c:3618-3674,群攻 fight.c:3681-3748)。
注意两点边界,非「未做」但用户测时要知道:(1) 暴击/李逍遥/双击都是 RNG 概率事件(1/6、1/12、装备授),真机单次攻击不一定触发 —— 验证靠多次重复看伤害分布 / 区间,而非一击定值,故用例验证点用「范围 + 重复观察」。(2) 群攻和 DualAttack 需要装备授(attackAll 武器 / 0x2D DualAttack 状态),devpanel 的 I 加道具能否直接给到「已装备的群攻/双击武器」取决于该道具是否有 scriptOnEquip 写 rgwAttackAll/dualAttack —— 若 devpanel 无法直接置 status.dualAttack/attackAll,群攻与双击的真机触发条件需用户额外确认(见 D3-4 precondition 已标注 fallback:直接 console 注入 gs.battleState.players[0].status.dualAttack=1)。

### D3-1 单体物理攻击落实伤害且永远 >=1(jitter + 钳位)
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。按 Cmd/Ctrl+Shift+D 开 devpanel。按 B 选一个普通敌队(任意低级杂兵队,如蝙蝠/野兽,确保敌人 health 几百上千、不会被一击秒)进战斗。不需要 P/I/M(默认单人李逍遥即可)。
- **操作**: 战斗进入 selectAction、主菜单 4 图标出现后:方向键把 selectedAction 移到「攻击」(图标0)→ Confirm → 进 selectTargetEnemy,方向键选第一个活敌 → Confirm 提交。等攻击动画播完、敌人血条掉、回到下一轮选单。
- **预期**: sdlpal fight.c:3636-3663(ts attack.ts:88-100 applyPlayerAttackModifiers):base=calcPhysicalAttackDamage(str,def,res) 后 +RandomLong(1,2) jitter,末尾 ×RandomFloat(1,1.125),最后 if(sDamage<=0) sDamage=1。所以这一击对敌人造成的伤害恒 >=1,且即使 base=0(攻低防高)也至少掉 1 血。敌人 health 必然下降,绝不出现「攻击了但血没动」。
- **验证**: (a) 肉眼:敌人头上弹蓝色伤害数字,敌人血量条变短。(b) 数据级:攻击前先在 console 记 `before = window.__game.gs.battleState.enemies[0].e.health`(BattleEnemy.e.health,battle-state.ts:75 + 攻击写回 attack.ts:199 `targetEnemy.e.health = Math.max(0, before - damage)`);攻击后读同字段 `after`,断言 `before - after >= 1` 且 `after < before`。可重复 5-8 次同一目标观察 `before-after` 每次落在合理区间(随 jitter/float 小幅波动,不恒等),确认 jitter+float 生效。

### D3-2 暴击 ×3 真机出现(1/6 概率,重复观察伤害翻三倍)
- **前置**: 同 D3-1:?skip-intro=1 → devpanel → B 选普通敌队(选 health 足够高、扛得住多次攻击不被秒的敌人)。默认单人李逍遥。
- **操作**: 连续多轮(建议 ≥10 次)用「攻击」打同一个活敌:每轮 selectedAction=攻击→Confirm→选该敌→Confirm,记录每次掉血值。
- **预期**: sdlpal fight.c:3639-3647(ts attack.ts:90-93):`if (RandomLong(0,5)==0 || bravery>0) { sDamage *= 3; fCritical=TRUE }`。即 1/6 概率暴击,暴击那一击伤害约为普通击的 3 倍(jitter/float 让边界略浮动,但量级是 ~3×)。多轮里应能观察到至少一次明显约 3 倍的大数字(暴击),其余为普通值。
- **验证**: (a) 肉眼:某几次伤害数字明显比平时大约 3 倍(战斗里暴击会有额外演出帧 fCritical,数字也更大)。(b) 数据级:每轮攻击前后读 `window.__game.gs.battleState.enemies[i].e.health` 算 delta,收集 10+ 个 delta;普通击聚成一簇,暴击击约为其 3 倍(≈ 3× 普通簇中位数)。若想确定性验证而非靠概率,可在攻击前 console 注入 `window.__game.gs.battleState.players[0].status.bravery = 99`(BattleStatus.bravery,battle-state.ts:35)—— bravery>0 走同一 `|| bravery>0` 分支,使本次必暴击,delta 必约 3×。

### D3-3 李逍遥额外 ×2 加成只对 roleId===0 生效
- **前置**: ?skip-intro=1 → devpanel。按 P 强制三人入队(确保队里有非李逍遥的队员,如赵灵儿/林月如)。按 B 选 health 高的普通敌队进战斗。
- **操作**: 同一目标敌人:先用李逍遥(队首,players[0])多轮攻击记 delta;再用另一名非0队员多轮攻击同一目标记 delta。两组各 ≥10 次。
- **预期**: sdlpal fight.c:3649-3656(ts attack.ts:94-97):`if (wPlayerRole==0 && RandomLong(0,11)==0) { sDamage *= 2 }`。**仅 roleId===0(李逍遥)**有这条额外 1/12 的 ×2 加成,且它在暴击 ×3 之后叠乘(可叠加成 ×6)。非0队员无此分支。所以李逍遥的 delta 分布里会偶尔出现比「纯暴击 3×」还高的 ~2× 跳变(×2 或 ×6),非0队员的 delta 上限只到暴击 3×。
- **验证**: (a) 肉眼:李逍遥偶尔打出异常高的数字(2× 或 6× 基础)。(b) 数据级:对每名攻击者,攻击前确认是哪个 roleId —— 读 `window.__game.gs.battleState.players[actorIdx].roleId`(BattlePlayer.roleId,battle-state.ts:45);收集两组 enemies[i].e.health delta。李逍遥(roleId===0)组出现 delta ≈ 普通×2 或 ×6 的样本;非0队员组的 delta 最高只到普通×3(暴击),绝不出现 ×2 额外台阶。这是 ts attack.ts:94 `roleId === 0` 守卫的核心可验点。

### D3-4 DualAttack 双击:一次攻击命令对同一敌人结算两次伤害
- **前置**: ?skip-intro=1 → devpanel → B 选 health 足够高、单击打不死的普通敌队(关键:敌人要扛得住两击)。默认单人李逍遥。进战斗到 selectAction 阶段后,先在 console 注入双击状态:`window.__game.gs.battleState.players[0].status.dualAttack = 1`(BattleStatus.dualAttack,battle-state.ts:37;attack.ts:188 `hits = (status.dualAttack ?? 0) > 0 ? 2 : 1`)。注:若 devpanel 的 I/M 能直接给到带 0x2D DualAttack 的装备并已穿上则更真,但能否一步到位取决于该装备 scriptOnEquip,故此用例用 console 注入作为可靠 fallback。
- **操作**: 注入 dualAttack=1 后,正常出一次「攻击」命令打单个活敌:selectedAction=攻击→Confirm→选敌→Confirm。观察攻击动画(应连挥两次)。
- **预期**: sdlpal fight.c:3625 `for (t = 0; t < (rgPlayerStatus[role][kStatusDualAttack] ? 2 : 1); t++)`(ts attack.ts:195 `for (let t=0; t<hits; t++)`):整套伤害结算(jitter/crit/李逍遥/RandomFloat)+ 攻击动画做两次,对同一目标敌人累计扣两段血。对比未注入 dualAttack 时同条件单击,总掉血约为两击之和(各自带独立 jitter/crit roll)。
- **验证**: (a) 肉眼:攻击动画播两次,敌人血条分两段掉(或一次命令掉的总量明显约为单击两倍)。(b) 数据级:攻击前记 `before = window.__game.gs.battleState.enemies[targetIdx].e.health`;一次命令结束后记 `after`,断言总 delta `before - after` ≈ 两次单体伤害之和(显著大于单次,排除 crit 干扰后约 2×)。可对照:清掉 `players[0].status.dualAttack = 0` 后同条件再打一次,delta 约为前者一半。

### D3-5 群攻 division 逐敌减半:命中序 [2,1,0,4,3] 越靠后伤害越低
- **前置**: ?skip-intro=1 → devpanel → B 选**多体**敌队(至少 3 只敌人同屏,且各 health 高扛得住)。默认单人李逍遥。进 selectAction 后 console 注入群攻能力:`window.__game.gs.battleState.players[0].status.attackAll = 1` 不行的话用真值字段 —— 群攻路径由 attack.ts:147 `!actor.isEnemy && targetIdx < 0`(target=-1 全体)触发,而 target=-1 来自玩家装备 attackAll 武器后攻击菜单走全体。若 devpanel 无法直接置 attackAll 武器,可改为:确认 gs.battleState 里敌人 ≥3 后,直接 console 调用群攻命令使 action.target=-1(让该队员的 pendingAction.target = -1)。
- **操作**: 让队首李逍遥发起一次**群体攻击**(target=-1,攻击全体敌人)。观察各敌人头上的伤害数字。
- **预期**: sdlpal fight.c:3681-3748(ts attack.ts:147-178):群攻 fCritical 整轮摇一次(全敌同 ×3 与否),命中固定序 `index[]={2,1,0,4,3}`(attack.ts:151 HIT_ORDER),division 初值 1,每命中一个活敌后 `division *= 2`(attack.ts:174),当前敌伤害 `damage /= division`。即按命中序首个活敌全额、第二个半额、第三个 1/4……逐敌减半。群攻路径**无** jitter / RandomFloat(与单体不同,attack.ts:160-162 只有 CalcPhysical + crit×3 + /division)。每敌 <=0→1。
- **验证**: (a) 肉眼:多只敌人同时弹蓝字,按命中顺序(slot 2→1→0→4→3 中存活者)伤害递减,后命中的敌人掉血明显更少。(b) 数据级:群攻前对每个敌人记 `before[slot] = window.__game.gs.battleState.enemies[slot].e.health`(slot=0..N);群攻后记 `after[slot]`,算各 slot delta。按存活命中序 [2,1,0,4,3] 排出实际命中的活敌序列,断言序列里第 k 个活敌的 delta ≈ 第 1 个活敌 delta / 2^(k-1)(division 逐敌翻倍)。同 slot 若 def/res 不同需用同种敌人队列以便比对倍率;核心可验点是 attack.ts:162 `damage = damage / division` 的逐敌减半。

---

## D4 — 法术伤害公式(5 元素 + 抗性 + fieldEffect)
*可测性: partially-testable*

**已知边界/排除**: 两点诚实标注。(1) fieldEffect(战场元素加成,公式末段 `*= (10 + rgsMagicEffect[elem-1]); /= 10`,sdlpal fight.c:241-244 = ts formulas.ts:145-154)无 devpanel 键可设。BattleField.magicEffect 在数据里几乎全 0,只能 console 注入 `window.__game.gs.battleState.field.magicEffect.<elem> = N` 后再施法。我把它做成 D4-3(数据级注入用例),它不是纯"按键黑盒"用例,故整体判 partially。(2) 验证前请用户确认所选法术确为攻击法术:只有 `asShort(magic.baseDamage) > 0` 且非 applyToPlayer/applyToParty/trance 才走 calcMagicDamage 的 inline player→enemy 路径(actions/magic.ts:242-246);治疗/防御法术不进此公式。最稳的进场方式 = devpanel 顶部的"★ 法术测试(三人各自技能 vs 5 敌)"按钮(dev-panel.ts:289-336),它一键摆好三人各持本角色技能(magicStrength=200 灵力拉高使伤害可见)+ 5 敌(队伍 7),比手动 M 学法术稳得多,3 条用例都建议优先用它进场,无需先按 P/M/B。calcMagicDamage 的 5 元素映射(1风2雷3水4火5土6毒,tables.ts:249)、元素抗/毒抗分支、resistMult、min/max clamp、def 公式均已 1:1 实现且可测,无简版子部分。注:敌方→玩家方向(applyEnemyMagicDamage,resistMult=20 + defending/protect/autoDefend 除因子)不在 D4 核心范围,且其 Protect status 在 magic-damage.ts:216 已建模但装备抗性加成残缺(magic-damage.ts:189 注明只取 role 基础抗),不在本批用例里测。

### D4-1 攻击法术对敌人造成法术伤害(基本公式跑通)
- **前置**: skip-intro 进李逍遥房间。Cmd+Shift+D 开 devpanel。点 devpanel 顶部「★ 法术测试(三人各自技能 vs 5 敌)」按钮(dev-panel.ts:289-336)→ 自动组三人队(李逍遥/赵灵儿/林月如,各 magicStrength=200、MP=999)进一场 5 敌战斗。无需手动按 P/M/B/L。
- **操作**: 战斗中:轮到某队员时,方向键把主菜单光标移到「法术」图标 → Confirm → 在法术网格选一个攻击法术(baseDamage>0 的,如御剑/灵蛇等伤害技,非治疗)→ Confirm → 选单个敌人为目标 → Confirm。等魔法特效播完、蓝色掉血数字弹出。
- **预期**: 施法者扣 magic.costMP;目标敌人 HP 下降一个正整数。伤害 = sdlpal PAL_CalcMagicDamage(reference/sdlpal/fight.c:174-249,ts = packages/game/src/core/battle/formulas.ts:112-158 calcMagicDamage):def = enemy.defense+(level+6)*4 且 clamp>=0(magic-damage.ts:98-100);base = calcBaseDamage(magStr×rngFactor, def)/4(formulas.ts:121);+ magic.baseDamage(formulas.ts:122),再过元素抗。inline 路径最小伤害钳到 1(magic-damage.ts:113-116 `if(dmg<minDamage=1)dmg=1`,等于 sdlpal inline `if(sDamage<=0)sDamage=1`)。magStr = role.magicStrength(actions/magic.ts:251),rngFactor∈[1.0,1.1)(actions/magic.ts:253)。
- **验证**: (a) 肉眼:目标敌人血条变短 + 蓝色掉血数字飘出;施法者 MP 数字减少。(b) 数据级,hook = window.__game.gs(bootstrap.ts:796-798):施法前 console 记 `const h0 = window.__game.gs.battleState.enemies[T].e.health`(T=所选敌人 index,字段路径 battle-state.ts:74 e:Enemy + tables.ts:285 health);施法后读同字段 `window.__game.gs.battleState.enemies[T].e.health`,差值 h0-h1 应 >=1 且为整数。施法者所在 `window.__game.gs.battleState.players[caster].roleId` 对应角色的 MP(PlayerRolesRuntime.rgwMP[roleId])应减 costMP。

### D4-2 同一法术对高元素抗敌人伤害显著低于无抗敌人
- **前置**: skip-intro + Cmd+Shift+D + 点「★ 法术测试」按钮进场(同 D4-1)。选一个带元素的攻击法术,记住它的元素(elemental:1风/2雷/3水/4火/5土,tables.ts:249)。本用例最干净的做法是进场后用 console 把两只敌人的同一元素抗设成只差抗性(见 verify b)。
- **操作**: 进场后 console 注入只差抗性:例如用火法术(elemental=4)时设 `window.__game.gs.battleState.enemies[0].e.elemResistance.fire = 0` 和 `window.__game.gs.battleState.enemies[1].e.elemResistance.fire = 8`,其余属性两敌尽量一致。然后用同一火法术分别打 enemies[0] 和 enemies[1],各记掉血并对比。
- **预期**: 高抗敌人受到的伤害明显更低。sdlpal fight.c:236-238(ts formulas.ts:140-143)对 elem 1..5:`sDamage *= (10 - elemRes[elem-1]/resistMult)` 然后 `/= 5`;inline 路径 resistMult=1(magic-damage.ts:107),所以抗性每 +1 直接把倍率从 10 往下扣(抗=0 倍率=10,即 ×10/5=×2;抗=5 倍率=5,即 ×5/5=×1,伤害减半;抗=8 倍率=2,即 ×2/5,大幅削)。两敌防御/等级一致时,伤害比 ≈ (10-高抗)/(10-0)。
- **验证**: (a) 肉眼:同火法术打两敌,高抗(enemies[1])掉血数字明显小。(b) 数据级:施法前后各记 `window.__game.gs.battleState.enemies[0].e.health` 与 `window.__game.gs.battleState.enemies[1].e.health` 算两次 delta;先确认 `window.__game.gs.battleState.enemies[i].e.elemResistance.fire`(火法术取 .fire;风=.wind 雷=.thunder 水=.water 土=.earth,对应 elemental 1/2/3/4/5,tables.ts:305-312)注入值生效。高抗 delta 应 ≈ 无抗 delta × (10-高抗)/10(忽略 rngFactor 1.0~1.1 的 ±10% 抖动与逐步 SHORT 截断,可对两敌各打几次取趋势)。

### D4-3 fieldEffect 战场元素加成放大/削弱同元素法术(数据级注入)
- **前置**: skip-intro + Cmd+Shift+D + 点「★ 法术测试」按钮进场(同 D4-1),选一个带元素的攻击法术(记住 elemental,如火=4)。无 devpanel 键可设 fieldEffect,需 console 注入 `window.__game.gs.battleState.field.magicEffect`(battle-state.ts:343 field:BattleField + tables.ts:397 magicEffect)。为隔离变量,先把目标敌人该元素抗设 0:`window.__game.gs.battleState.enemies[T].e.elemResistance.fire = 0`。
- **操作**: 第一次:不改 field,对 enemies[T] 施该元素法术,记掉血 d1。第二次:console 设 `window.__game.gs.battleState.field.magicEffect.fire = 10`(火法术对应 .fire;别的元素改对应键 wind/thunder/water/earth),对同一敌(或同抗的另一敌)再施同法术,记掉血 d2。可再设 `= -5` 测削弱。
- **预期**: fieldEffect 为正放大伤害、为负削弱。sdlpal fight.c:241-244(ts formulas.ts:145-154):elem<=5 时 `sDamage *= (10 + fieldEffect[elem-1]); sDamage /= 10`。故 magicEffect.fire=10 → 伤害约 ×(10+10)/10=×2;=-5 → ×(10-5)/10=×0.5。field 元素键 wind/thunder/water/fire/earth 顺序对齐 elemental 1..5(tables.ts:387-403)。此乘法在元素抗之后(formulas.ts 顺序:抗性段→/5→field 段→/10),故把抗设 0 后观察最干净。
- **验证**: (a) 肉眼:设正 magicEffect 后同法术掉血数字明显变大,设负数明显变小。(b) 数据级:两次施法前后各记 `window.__game.gs.battleState.enemies[T].e.health` 算 delta;先确认 `window.__game.gs.battleState.field.magicEffect.fire` 注入值已生效;d2/d1 应 ≈ (10+magicEffect.fire)/10(忽略 rngFactor ±10% 抖动与 SHORT 截断,多打几次取趋势)。

---

## D5D6 — 出手顺序:玩家 dex(haste×3)/ 敌人 dex((level+6)×3+dex)→ ActionQueue 排序
*可测性: fully-testable*

**已知边界/排除**: 运行时入口确认:gs 经 window.__game.gs 暴露(bootstrap.ts:796-798);战斗态字段名是 gs.battleState(game-state.ts:613 `battleState?: BattleState`,所有 e2e probe 也用 __game.gs.battleState)。下方用例 verify 里凡写 gs.battle 处一律应读 gs.battleState(同一对象,字段名以 game-state.ts:613 为准)。ActionQueue 项形如 {isEnemy, idx, dex, fIsSecond}(turn-queue.ts:27-39)。

以下子部分 PAL_CLASSIC 路径下不实现 / 不可测,请勿据此测试:
1) slow 减速倍率:fight.c:366-370 的 slow ×2/3 在 #ifndef PAL_CLASSIC,formulas.ts:212 注释 "non-classic: M3 不实现",getPlayerActualDexterity 完全忽略 status.slow。给玩家 slow 不会改 dex。
2) 敌人 haste/slow 与 dex 下限:fight.c:314-330 的 s<20→20 下限、敌人 haste×6/5、slow×2/3 全在 #ifndef PAL_CLASSIC,formulas.ts:179-181 getEnemyDexterity 不读敌人 status、无下限。给敌人加 haste 不改其 dex(case D5D6-4 用此作反证)。
3) 濒死减速:fight.c:372-378 的 dying ×4/5 是 non-classic;ts battle-system.ts:563-565 另有 classic 濒死 ÷2(对应 fight.c:1558,属"行动选择阶段"叠加,非 PAL_GetPlayerActualDexterity 本体),本 D5D6 公式项不覆盖。
4) RNG 抖动:sdlpal 给每 actor dex 乘 RandomFloat(0.9,1.1)(turn-queue.ts:9-11 注释),ts buildActionQueue 是纯函数无抖动 → actionQueue[].dex 是确定值(便于数据级核对),但"同 dex 抖动偶发翻转"无法在 ts 复现(by design)。
5) 玩家 base dex 简化:battle-system.ts:552-554 用 role.dexterity+(role.level+6)*4,未含装备 dex 加成(注释明示 M3 不实现),与真 PAL_GetPlayerDexterity 有差;手算玩家 dex 按此简化式。
6) 行动类型倍率叠加:battle-system.ts:559-561 在 dex 上再乘 actionDexMultiplier(防御×5 等,fight.c:1529-1556),会扰动最终 actionQueue dex。为隔离纯 dex 公式,用例让玩家选普通攻击(倍率=1)即可;若测时玩家选了防御,actionQueue 里玩家 dex 会是 ×5 后的值,属预期,不要误判为公式错。
注:haste 状态通常由法术/装备授予;为可控复现,用例一律走 console 注入 status.haste(BattleStatus.haste 是 WORD 计数器,battle-state.ts:30),属测试手段非功能缺失。

### D5D6-1 敌人 dex 公式逐只核验:(level+6)×3+dex,与 actionQueue 实际值字节级对齐
- **前置**: ?skip-intro=1 进李逍遥房间,单人队(不按 P)。devpanel(Cmd/Ctrl+Shift+D 开)按 B 打开 battle picker,选任一敌队进战斗。进战斗后等第一回合菜单出现(phase 进 selectAction)。
- **操作**: 1) 控制台:bs = window.__game.gs.battleState(战斗态字段名见 game-state.ts:613)。2) 读每只敌人原始属性:bs.enemies.map(e => ({level: e.e.level, dex: e.e.dexterity, hp: e.e.health}))。3) 给李逍遥选普通攻击(方向键选攻击图标→Confirm→选目标)让本回合 commit,触发 battle-system.ts:580 buildActionQueue(注意别选防御,防御会叠 ×5 倍率)。4) 进 perform 后立刻读 bs.actionQueue。5) 对每只活敌手算 expected = (level+6)*3 + ((dexterity<<16)>>16)(SHORT 化,处理负 dex)。
- **预期**: sdlpal fight.c:311-312 PAL_CLASSIC:s=(wLevel+6)*3; s+=(SHORT)wDexterity; return s(formulas.ts:179-181 getEnemyDexterity 同款,无下限、不读 status)。故 bs.actionQueue 里每个 isEnemy===true 项的 dex 必精确等于手算 (level+6)*3+asShort(dexterity)。battle-system.ts:574 即 dex: getEnemyDexterity({level: e.e.level, dexterity: e.e.dexterity}),无 RNG 抖动 → 确定值。
- **验证**: (a) 肉眼:看不到敌人 dex 数值,主要靠数据级;能间接看到的是行动先后(高 dex 敌人先动画攻击)。(b) 数据级:对 window.__game.gs.battleState.actionQueue.filter(x=>x.isEnemy) 每项,断言 x.dex === (gs.battleState.enemies[x.idx].e.level+6)*3 + ((gs.battleState.enemies[x.idx].e.dexterity<<16)>>16)。若某敌 dex 原值很小使结果 <20,确认 x.dex 仍是该小值而非被抬到 20(证明 PAL_CLASSIC 无下限,fight.c:314-318 被编译掉)。

### D5D6-2 玩家加速 haste → 有效 dex×3,在 actionQueue 中跃居敌人之前先手
- **前置**: ?skip-intro=1 进房间,单人队。按 L 满血满蓝。按 B 选一支敌队进战斗(敌队里最好有一只 dex 在不加速时排在李逍遥之前,便于看翻转;不确定就先做一次 baseline 看顺序)。进战斗到第一回合菜单。
- **操作**: 1) bs = window.__game.gs.battleState。读 baseline:确认 bs.players[0].status.haste === 0;给李逍遥选普通攻击 commit,进 perform 后读 bs.actionQueue,记下玩家项(isEnemy===false)的数组下标与其 .dex。等本回合走完回到下一回合选单。2) 注入加速:window.__game.gs.battleState.players[0].status.haste = 5(BattleStatus.haste 是 WORD 回合计数器,>0 即生效,battle-state.ts:30)。3) 再给李逍遥选普通攻击 commit,进 perform 后再读 bs.actionQueue。
- **预期**: sdlpal fight.c:356-359 PAL_CLASSIC:rgPlayerStatus[role][kStatusHaste]!=0 → wDexterity *= 3;fight.c:382-386 cap 999。formulas.ts:207-214 getPlayerActualDexterity 同款(dex*=3,>999→999)。battle-system.ts:555-556 以 player.status.haste>0 作 haste flag 传入。故加速后玩家项 .dex ≈ 未加速 dex 的 3 倍(超 999 钳到 999),并在 actionQueue 数组中上移到更多/全部敌人项之前。
- **验证**: (a) 肉眼:加速那一回合,李逍遥的攻击动画比加速前更早播放(从敌人之后变到敌人之前)。(b) 数据级:对比两次 window.__game.gs.battleState.actionQueue —— 加速后玩家项(isEnemy===false)的 .dex === 加速前玩家 .dex × 3(或 999 上限);且该玩家项的数组下标比加速前更靠前(越过原本排在它前面的敌人项)。同时确认所有敌人项 .dex 两次完全不变(玩家 haste 不影响 getEnemyDexterity)。

### D5D6-3 三人队:玩家间纯按各自有效 dex 互排,同 dex 时玩家优先于敌人
- **前置**: ?skip-intro=1 进房间。按 P 强制三人入队(李逍遥/赵灵儿/林月如,dev-panel KeyP 分支 dev-panel.ts:170)。按 L 满血满蓝。按 B 选一支敌队进战斗,进第一回合菜单。
- **操作**: 1) bs = window.__game.gs.battleState。读三人 roleId:bs.players.map(p => p.roleId);对每个 roleId 在 res.playerRoles.roles[roleId] 读 level、dexterity 手算 base=dexterity+(level+6)*4(battle-system.ts:554;若控制台拿不到 res,可在 perform 后直接看 actionQueue 里三个玩家项的 dex)。2) 给三人各选普通攻击把本回合全部 commit(逐个选攻击→目标),触发 buildActionQueue。3) 进 perform 后读 bs.actionQueue。4) 可选:给其中一名队员注入 bs.players[k].status.haste=5,下一回合再 commit,看该队员是否在队列里上移越过其他队员。
- **预期**: 三名 player 各走 PAL_GetPlayerActualDexterity(fight.c:354-389),与敌人混在同一队列按 dex 降序(turn-queue.ts:75-81 buildActionQueue 把 players 与 enemies 一起 sort)。tie-break:dex 相等时玩家优先于敌人(turn-queue.ts:78-79 `a.isEnemy ? 1 : -1`)。三名玩家之间无固定 party 序优先,纯按各自有效 dex 大小排。
- **验证**: (a) 肉眼:首回合三人轮到行动(攻击动画)的先后与他们 dex 高低一致,高 dex 先动。(b) 数据级:window.__game.gs.battleState.actionQueue 里三个 isEnemy===false 项的相对顺序按各自 .dex 降序;每项 .dex 应等于手算 base=dexterity+(level+6)*4(无 haste 时 getPlayerActualDexterity 原样返回)。若某玩家与某敌人 dex 数值相等,确认数组里该玩家项排在该敌人项之前。注入 haste 后该队员 .dex 变 3 倍并相应上移。

### D5D6-4 PAL_CLASSIC 反证:给敌人注入 haste 不改其 dex(敌人 dex 不读 status)
- **前置**: ?skip-intro=1 进房间,单人队。按 B 选任一敌队进战斗,进第一回合菜单。
- **操作**: 1) bs = window.__game.gs.battleState。给李逍遥选普通攻击 commit,进 perform 读 bs.actionQueue,挑一只敌人项(记其 idx=i)记下 .dex 作 baseline。等回到下一回合选单。2) 注入敌人加速:window.__game.gs.battleState.enemies[i].status.haste = 5(敌人也有 status 计数器,battle-state.ts:77)。3) 再给李逍遥选普通攻击 commit,进 perform 后再读 bs.actionQueue 里 idx===i 的敌人项 .dex。
- **预期**: sdlpal fight.c:320-329 的敌人 haste×6/5、slow×2/3 与 fight.c:314-318 的 s<20 下限全在 #ifndef PAL_CLASSIC 块内,classic build 不编译。formulas.ts:179-181 getEnemyDexterity 只算 (level+6)*3+asShort(dexterity),完全不读 enemies[i].status。故注入敌人 haste 前后,该敌人 actionQueue 项 .dex 数值必完全相同。
- **验证**: (a) 肉眼:该敌人在队列中的行动先后不因注入 haste 而提前(对照而非绝对值)。(b) 数据级:断言注入 haste 后 window.__game.gs.battleState.actionQueue 中 (x=>x.isEnemy && x.idx===i) 项的 .dex === baseline(两次完全一致),证明 PAL_CLASSIC 下敌人 dex 与 status.haste 无关。可顺带验证该值仍等于 (gs.battleState.enemies[i].e.level+6)*3+((gs.battleState.enemies[i].e.dexterity<<16)>>16)。

---

## D7 — ActionQueue / turn order（敌 dualMove 第二动作排队）
*可测性: partially-testable*

**已知边界/排除**: 两点诚实标注：

1) dualMove 进队的「随机 jitter + 取小者标 fIsSecond」语义未真做到位（简版）。sdlpal fight.c:1480-1489 真值：dualMove 敌的两条 entry 各自独立 RandomFloat(0.9,1.1) 摇 dex，再比两个 dex 取小者标 fIsSecond=TRUE（即两动谁先谁后由随机决定，第二动作不一定排在第一动作之后）。ts turn-queue.ts:67 是确定性近似——直接给第二条 entry 设 dex-1、fIsSecond=true，「保证排在第一次之后」，没摇随机也没比较取小。所以 fIsSecond 标记本身的真值/两动先后随机性 **不可真机核**（永远是第二条在后）。可核的是「dualMove 敌一回合出手两次」这个宏观行为。另外 ts buildActionQueue 也没移植 RandomFloat dex 抖动（注释自承抖动职责留给调用方），battle-system.ts 调用处只对 enemy 传了 getEnemyDexterity 原值、没乘抖动，所以同 dex 排序结果是确定的——这意味着「真机多打几回合看排序抖动」核不出抖动（本就没实现），别让用户测抖动。

2) dualMove>=2「必二动」分支我没在 enemy-team 数据里确认出一个低 HP、易观察的干净队伍。数据里 dualMove>=2 的敌 id 有 63/65/86/149/151/152（多为高 HP boss，hp 1650~22220），用 B picker 起这种队会很难打、第二动作观察成本高。下方用例只用 dualMove=1（50% 概率二动）的 teamId=47（单只 enemy136 hp=110，最易观察）/ teamId=50（三只 136）。dualMove>=2 必动分支留作进阶（用户若想核，可起含 id 86 的队，但 hp 高，建议先 devpanel L 满血自保 + 多耗几回合）。

3) 阻断风险：dev-panel 战斗 picker 的 UI 渲染段（line 325 之后）我读取时工具输出通道间歇性返回空白，最终没读完——所以「picker 是否允许用户手填任意 enemyTeamId，还是只有写死的 fixture(team=7)」我没 100% 确认。默认 fixture（dev-panel.ts:332)是 enemyTeamId=7（无 dualMove 敌）。**用例前置里我写的是「在 picker 里把敌队 id 填/选成 47 或 50」——若 picker 实际只给固定 fixture 不能改 id，用户需改 dev-panel.ts:332 的 enemyTeamId 或在 console 直接调 startBattle({enemyTeamId:47,...})**。这一步我无法替用户确认，已在前置里注明备选路径。

### D7-1 dualMove 单敌一回合出手两次（最易观察）
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。Cmd/Ctrl+Shift+D 开 devpanel。先按 L 满血满蓝（避免被两连击秒）。按 B 开 battle picker，把敌队 id 设为 47（=单只 enemy136、dualMove=1、hp=110，battle-system.ts:577 该敌 dualMove!==0 故有 50% 概率本回合二动）。若 picker 不能改 id（只给固定 fixture team=7），改走 console：window.__game 上调 startBattle({enemyTeamId:47, battleFieldId:7, ...}) 或先改 dev-panel.ts:332 的 enemyTeamId=47。
- **操作**: 进战斗后，我方角色一律选普通攻击（按方向键选 0=攻击图标 → Confirm → 选目标敌人 → Confirm），尽量别一击打死它（hp110 可能一下打死，必要时先 devpanel 不要 KO、用弱角色或多带几个回合）。放手让敌方回合完整跑完。连续观察 2~4 个回合（因 dualMove=1 是 50% 概率，单回合可能只出手一次，需多看几回合命中二动的那回合）。
- **预期**: sdlpal fight.c:1239-1242（B2 c8 已 port 到 battle-system.ts:575-577)：wDualMove!=0 的敌人本回合按 RandomLong(0,1) 有 50% 概率获得第二次行动。fight.c:1462-1491：命中二动时该敌被塞进 ActionQueue 两条 entry（同 wIndex）。fight.c:1575-1585 排序后，performAction（battle-system.ts:1662-1740）逐条消费 → 同一敌人在一个敌方回合内执行两次行动（两次攻击/施法）。
- **验证**: (a) 肉眼：命中二动的那个回合，该敌人播放两次攻击动画、对我方造成两段独立伤害（HP 掉两次）。(b) 数据级：回合开始（phase 刚切到 performAction)时在 console 跑 window.__game.gs.battleState.actionQueue.filter(x=>x.isEnemy && x.idx===0) —— 命中二动的回合这个数组长度=2（两条同 idx 的 enemy entry，其中一条 fIsSecond:true、dex 比另一条小 1）；没命中二动的回合长度=1。也可看 gs.battleState.actionQueue 整体：dualMove 命中时总条目数 = 我方人数 + 敌方基数 + 1。

### D7-2 fIsSecond 第二条 entry 的字段标记 + dex-1 排序位次
- **前置**: 同 D7-1 前置：?skip-intro=1 → L 满血 → B picker 敌队 id=47（单只 dualMove 敌，最干净）。
- **操作**: 进战斗，我方选任意动作并全部确认完（让 phase 进入 performAction）。在 console 立刻 dump：window.__game.gs.battleState.actionQueue。如果该回合没命中二动（数组里 idx0 只一条），按 D 防御快速过完本回合、进下一回合再 dump，直到抓到命中二动的回合（actionQueue 里出现两条 isEnemy&&idx===0）。
- **预期**: turn-queue.ts:63-68 + 引 fight.c:1486-1489：dualMove 敌的第二条 entry 设 fIsSecond=true 且 dex = 第一条 dex - 1。turn-queue.ts:75-81 排序为 dex 降序，故第二条（dex 小 1）必排在第一条之后，且二者之间按 dex 可能夹着我方/其他敌的 entry。注意（见 excludedNote）：ts 是确定性 dex-1，不是 sdlpal 的随机摇 dex 取小者——所以第二条永远在第一条之后，这是简版行为，别期望看到两动先后随机互换。
- **验证**: (a) 数据级（主）：命中二动回合 dump 的 actionQueue 里，两条 idx===0 的 enemy item，一条 fIsSecond===false、一条 fIsSecond===true；且 second 那条的 dex === first 那条 dex - 1。验证整数组按 dex 降序排列（actionQueue.map(x=>x.dex) 单调不增）。(b) 肉眼:无直接专属视觉，靠 D7-1 的两次动画即可佐证；本条核心是字段级。

### D7-3 多只同 dualMove 敌 → 队列条数翻倍（计数核对）
- **前置**: ?skip-intro=1 → 按 P 强制三人入队（李逍遥0+赵灵儿1+林月如2,凑满我方 3 条 entry 便于核计数）→ 按 L 满血 → B picker 敌队 id=50（=三只 enemy136、各 dualMove=1）。
- **操作**: 进战斗，三名队员各选动作并全部确认（phase 进 performAction）。console dump window.__game.gs.battleState.actionQueue。记下其中 isEnemy===true 的 entry 条数 N_enemy 与本回合命中二动的敌数 K（K=actionQueue 里 fIsSecond===true 的条数）。验证 N_enemy === 3 + K（3 只敌基础各一条，命中二动的每只多一条）。再过 1~2 个回合重复 dump，看 K 随 RNG 在 0~3 间变化。
- **预期**: battle-system.ts:569-580 对每只 health>0 的敌算 dualMove（fight.c:1239-1242 各自独立 50%），buildActionQueue（turn-queue.ts:63-69）对每只命中二动的敌追加第二条。故敌方 entry 总数 = 存活敌数 + 本回合命中二动的敌数。我方三人 → 另有 3 条 isEnemy===false entry（fight.c:1498-1571 玩家填充段）。
- **验证**: (a) 数据级（主）：const q=window.__game.gs.battleState.actionQueue; q.filter(x=>!x.isEnemy).length === 3（三队员）；q.filter(x=>x.isEnemy).length === q.filter(x=>x.isEnemy&&!x.fIsSecond).length + q.filter(x=>x.fIsSecond).length，且后者(fIsSecond 数=K)随回合在 0..3 变。(b) 肉眼：命中多只二动的回合，敌方阶段明显出手次数 > 敌数，多段攻击动画连播。

### D7-4 防御 ×5 / 逃跑 ÷2 dex 倍率影响出手先后（turn order 排序真值）
- **前置**: ?skip-intro=1 → 按 P 三人入队 → 按 L 满血 → B picker 任意含 1~2 敌的敌队（如 id=47 单敌，便于只关注我方三人内部先后）。
- **操作**: 进战斗，给三名队员选不同动作制造 dex 差：队员A 选「杂项→防御」(D 倍率×5)、队员B 选普通攻击(×1)、队员C 选「杂项→逃跑」(÷2)。全部确认后 phase 进 performAction，console dump window.__game.gs.battleState.actionQueue，看三名队员 entry 的先后次序。
- **预期**: battle-system.ts:559-566 + 引 fight.c:1529-1558（actionDexMultiplier）：防御 dex×5、逃跑 dex÷2、攻击×1。turn-queue.ts:75-81 按 dex 降序排。故在三人基础 dex 相近时，防御者（×5）应排在最前、逃跑者（÷2）排在最后、普攻者居中。user 2026-05-31 拍板「选防御后一开始就进防御姿」即此倍率把防御排到队首。
- **验证**: (a) 数据级（主）：dump actionQueue，找三条 isEnemy===false 的 item，比较它们在数组里的 index 次序与 dex 值——防御队员 dex 最高(×5)排最前、逃跑队员 dex 最低(÷2)排最后；整 actionQueue 的 dex 序列单调不增。(b) 肉眼：performAction 推进时，防御队员最先进入防御姿/最先轮到，逃跑队员最后行动。注意 enemy dex 未乘 RandomFloat 抖动（见 excludedNote），所以排序结果可重复、不会每回合随机跳——这是当前实现的确定性，不算 bug。

---

## D8 — 玩家/敌方 status:睡眠·麻痹跳过、混乱攻击、每回合衰减、AttackMate
*可测性: partially-testable*

**已知边界/排除**: 状态逻辑【确实接入真机战斗循环】(battle-system.ts:1176-1183 自动填占位/不开菜单、1754-1761 玩家失能解算、1727-1739 敌方状态门 decideEnemyAction、2082-2085 tickStatusEffects 回合末衰减),非死代码,可真机验。

不该让用户测/与题面有出入的子部分(诚实):
1)【玩家混乱 ≠ 只打友军】题面写"混乱攻友军",但 user 2026-05-31 拍板改回原版:battle-system.ts:1819-1832 resolveConfusedAttack 让混乱玩家【随机打任一存活目标(敌方 OR 友方,排除自己)】,池空才 Pass;濒死(hp<maxHP/5,battle-system.ts:602)直接 Pass。所以"玩家混乱必打友军"是错预期 —— RNG 决定打敌还是打友。status.ts:38 注释"confused 是攻击友军"是旧描述,被 battle-system 实装覆盖。敌方混乱才是稳定"打同阵营另一活敌"(enemy-ai.ts:85-92,单敌→Pass)。
2)【状态浮字/文字】无独立状态浮字队列 —— battle-state.ts 全文无 floatingWords/battleTextQueue/statusWord 字段;状态被跳过时不弹"睡眠/麻痹"汉字,只是不出动作菜单+跳过。伤害走 showDamageNum 命令(蓝色弹幕,attack.ts:214/371、attack-mate.ts:81)。"状态文字"子项【未实现】,不要让用户找状态汉字浮字。
3)【状态抖动 shake】未作为 status 驱动效果实现 —— shake 只是 BattleAnimFrame.shake(battle-state.ts:250)的存值字段供 present 消费,与 sleep/paralyzed/confused 无关联,无可验对象。
4) 无 devpanel 一键加状态键(任务给的键 B/P/I/M/C/F/K/L/G/T 里无加 status)→ 状态注入只能 console 写 gs.battleState.players[i].status / enemies[i].status,用例已据此设计。
5) 诚实标注:dev-panel 实际文件在 packages/game/src/shell/dev-panel.ts(不在 web/),本次工具未能打开它,故 B/P/L 等键绑定与 window.__game.gs 暴露我【按任务描述给定值采用,未在 dev-panel 源码逐行复核】;若键行为不符,以 dev-panel.ts 实绑为准。

### D8-1 玩家睡眠:不出动作菜单 + 该回合 Pass + 每回合衰减
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。Cmd/Ctrl+Shift+D 开 devpanel。按 L 满血(避免被打死干扰)。按 B,prompt 填敌队 id(填 1)进战斗。
- **操作**: 1) 进战斗后、轮到 0 号队员选动作前,console:`g=window.__game.gs; g.battleState.players[0].status.sleep=3`(status 是字符串键,battle-state.ts:27)。2) 推进整轮:给其余可动队员选攻击或按 D 防御,把本轮选择阶段走完。3) 观察 0 号队员是否被跳过(不弹他的 4 图标动作菜单)。4) 本轮打完、进下一轮选择前,console 再看 status.sleep。
- **预期**: sdlpal fight.c:1398-1404:KO/Sleep/Confused/Paralyzed 玩家在选行动循环 `continue`(不开菜单);fight.c:1632-1638 回合末全 status 逐项 -1。TS:battle-system.ts:1176-1183 autoFillIncapacitatedActions 对 sleep>0 队员自填占位 action(不开菜单);1755-1756 perform 时 sleep>0 → action 覆盖为 `{type:'pass'}`;2082-2085 tickStatusEffects 回合末衰减。
- **验证**: (a) 肉眼:0 号队员本轮【不弹 4 图标动作菜单】,被直接跳过(无攻击/无伤害)。(b) 数据级:`g.battleState.players[0].status.sleep` 走完一整轮后由 3 变 2(每轮 -1,battle-system.ts:2085 调 status.ts tickStatusEffects);该队员本轮未进手动选择(是 autoFill 占位)。再走两轮 sleep 2→1→0,归 0 后该队员恢复正常弹动作菜单。

### D8-2 玩家麻痹:与睡眠同路跳过(验 paralyzed 也走 Pass)
- **前置**: 同 D8-1 起手(?skip-intro=1 → Cmd/Ctrl+Shift+D 开 devpanel → L 满血 → B 填敌队 id 1 进战斗)。
- **操作**: 1) 进战斗后 console:`g=window.__game.gs; g.battleState.players[0].status.paralyzed=2`。2) 推进整轮(其余队员随便选攻击/按 D 防御走完本轮)。3) 看 0 号队员是否被跳过。4) 走完一轮后 console 看 status.paralyzed。
- **预期**: sdlpal fight.c:1398-1404 麻痹(kStatusParalyzed)与睡眠并列同一 `if(...||...||...) continue`,同样不开菜单。TS:battle-system.ts:1180 autoFill 门 `st.sleep>0||st.paralyzed>0||st.confused>0`;1755 perform `if(st.sleep>0||st.paralyzed>0) action={type:'pass'}`;回合末 status.ts 衰减。
- **验证**: (a) 肉眼:0 号队员本轮不弹动作菜单、被跳过。(b) 数据级:`g.battleState.players[0].status.paralyzed` 走完一轮由 2→1(衰减);麻痹走的是与睡眠同一条 Pass 路径(battle-system.ts:1755 同一 if)。paralyzed 1→0 后该队员恢复正常出菜单。

### D8-3 敌方混乱 → AttackMate 打另一只敌人(敌打敌掉血)
- **前置**: ?skip-intro=1 → Cmd/Ctrl+Shift+D 开 devpanel → L 满血 → B 填一个【至少 2 个敌人】的敌队 id。进战斗后先 console 确认 `window.__game.gs.battleState.enemies.filter(e=>e.e.health>0).length >= 2`(单敌会变 Pass,enemy-ai.ts:88 pool 只自己→选中自己→pass)。
- **操作**: 1) console:`g=window.__game.gs; en=g.battleState.enemies; en[0].status.confused=3`(给 0 号敌人混乱 3 回合)。2) 记下各敌血:`en.map(x=>x.e.health)`。3) 推进到敌方行动(我方各角色选攻击或按 D 防御把本轮选择走完,让敌方 AI 跑)。4) 敌方行动后再 `en.map(x=>x.e.health)` 对比。
- **预期**: sdlpal fight.c:4591-4655:混乱敌人随机选一活敌(含自己)打,选中自己→什么不做(4594)。TS:enemy-ai.ts:86-92 confused>0 → 从 aliveEnemies 随机 pick;pick 是自己→pass,否则 `{type:'attack-mate', target:pick.idx}`;battle-system.ts:1939-1940 actor.isEnemy → performEnemyConfusedAttack(attack.ts:352-369 写 target.e.health + 蓝色弹幕)。
- **验证**: (a) 肉眼:0 号敌人本回合不打我方,而是对【另一只敌人】出手,被打敌人血条下降 + 飘伤害数字。(b) 数据级:某个 k≠0 的 `g.battleState.enemies[k].e.health` 比行动前减少(遍历 en 找哪个降了);我方无人掉血;`en[0].status.confused` 回合末由 3→2(status.ts:32-33 对 e.e.health>0 的敌人也 -1)。注:混乱敌人选中自己那几回会 Pass(无血变),多看几回合会出现打另一敌。

### D8-4 玩家混乱(原版随机打敌或打友)+ 混乱衰减
- **前置**: ?skip-intro=1 → Cmd/Ctrl+Shift+D 开 devpanel → P 强制三人队 → L 满血 → B 填敌队 id 1 进战斗。多人队才能看到混乱玩家随机打到队友的情况。
- **操作**: 1) 进战斗后 console:`g=window.__game.gs; g.battleState.players[0].status.confused=4`。2) 推进多个回合(其余队员随便行动走完每轮),每轮观察 0 号队员自动出手打谁。3) 每轮末 console 看 `g.battleState.players[0].status.confused`。
- **预期**: user 2026-05-31 拍板改回原版:battle-system.ts:1757-1760 玩家 confused>0 且非洒死 → resolveConfusedAttack;1819-1832 从【活敌 + 活队友(除自己)】随机选一个:选中敌→'attack'(打敌血),选中友→'attack-mate'(performAttackMate 写 targetRole.hp + 蓝色弹幕,attack-mate.ts:80-81);池空→Pass。洒死(hp<maxHP/5,battle-system.ts:602)→Pass。所以【不是必打队友】,随机。
- **验证**: (a) 肉眼:被混乱玩家本轮不开菜单(autoFill,battle-system.ts:1180),自动出手打随机目标——有时打敌(敌血降),有时打队友(某队友出蓝色掉血弹幕)。多跳几回合可见两种都出现。(b) 数据级:每轮末 `g.battleState.players[0].status.confused` -1(4→3→2...,status.ts:31);若该轮打了敌 → `g.battleState.enemies[k].e.health` 降;若打了队友 → 屏上该队员出蓝色掉血弹幕(战斗玩家 HP 在 res.playerRoles 上,gs 侧 PlayerRolesRuntime.rgwHP[roleId] 要到战末回写才变,game-state.ts:1326;所以队友掉血靠看弹幕确认)。

---

## D9 — 敌人 AI 选 target — 纯均匀随机 reject 重摇,无偏好(B2)
*可测性: partially-testable*

**已知边界/排除**: 【本 session 两次失误先纠正】(1) 早先误判工具无输出而仓促提交过 not-testable —— 实为 harness 把整批输出延迟到一次性返回造成的误读,作废。(2) 之后 harness 又持续吞掉部分工具输出,导致少数 gs 路径未逐字核到,下面诚实标注。\n\n【已 source-level 逐字核实(真值,可作预期判据)】\n- reference/sdlpal/fight.c PAL_BattleEnemySelectTargetIndex(行 4520-4546)全文已读:i = RandomLong(0, gpGlobals->wMaxPartyMemberIndex); while (gpGlobals->g.PlayerRoles.rgwHP[gpGlobals->rgParty[i].wPlayerRole] == 0) i = RandomLong(0, wMaxPartyMemberIndex); return i; —— 在 0..maxPartyIdx 全队下标上【纯均匀】RandomLong,摇到 HP==0(死)队员就【重摇】,无任何偏好权重。D9=B2 描述完全属实。兄弟函数 SelectEnemyTargetIndex(4509-4515)重摇条件 wObjectID==0 || e.wHealth==0。AI 入口 4578 sTarget = PAL_BattleEnemySelectTargetIndex()。\n- packages/game/src/core/battle/enemy-ai.ts(108 行全文已读):decideEnemyAction 传 party 时走 reject-resample:let pi = rng.rangeInclusive(0, party.length-1); while ((party[pi]?.hp??0)===0 && guard++<64) pi = rng.rangeInclusive(...)(行 71-73,注释引 fight.c:4540-4545),【确认无偏好】;不传 party 的旧路径在 alivePlayers 上均匀 range(行 77)。\n- enemy-ai.test.ts(行 142-153)单测:party=[{idx0,hp0},{idx1,hp50}],rng 先摇 0(死)→重摇 1(活)→target=1。reject-resample 已被单测覆盖。\n- battle-state.ts(638 行全文已读):BattleState.players: BattlePlayer[];enemies: BattleEnemy[](每条 e.health 战中可改);BattleAction.target=索引,targetSide 省略=enemy。【关键】BattlePlayer 只存 roleId+prevHp+defending+status,玩家当前 HP 不在 battleState.players 里,而经 roleId 引 PlayerRoles.roles[roleId].hp(createBattleState 行 569-578 用 role.hp)。\n\n【未能核实(harness 吞输出,用户照做前须自查,不可当判据)】玩家运行时当前 HP 的精确 gs 路径(brief 提示 gs.PlayerRolesRuntime.rgwHP,但 battle-state.ts 显示玩家 HP 实来自 PlayerRoles.roles[roleId].hp,二者关系未在 game-state.ts 逐字确认);window 调试 hook 名(brief 写 window.__game.gs,未核到);battle-system.ts 如何把 party/alivePlayers 喂进 decideEnemyAction、敌人本回合 target 是否持久化到某 gs 字段(若未持久化,数据级只能靠'哪个角色本回合掉血'反推被攻击者)。\n【恢复工具后须补做】读 game-state.ts 确认玩家当前 HP 真实字段路径+window hook 名;读 battle-system.ts 确认 AI target 调用点与是否存 target;届时把下方 verify 的 gs 路径替换为已核值。\n判 partially-testable:sdlpal 预期+TS reject-resample 实现已硬核实,肉眼验证完全可做;数据级 verify 的 gs 字段路径未全核到,需用户在 console 先 console.log(window.__game ?? globalThis) 自查 hook/字段名兜底。

### D9-1 三人全存活:长程统计敌人攻击目标分布应近似均匀(无偏好)
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。按 P 强制三人入队(party 3 人 → wMaxPartyMemberIndex=2,有 3 个可选目标)。按 L 满血满蓝(三人 HP 均 >0,排除死亡重摇干扰)。按 B 打开 battle picker,选一支【至少 1 个会对玩家普攻的近战敌人】的敌队进战斗。
- **操作**: 进战斗后,我方每回合三人全选 D(Defend,避免提前击杀敌人结束战斗);让敌人连续行动 20+ 回合;若某角色被打濒死,立即按 L 重新满血保持三人都存活。每回合用纸笔记录敌人普攻命中了 1/2/3 号位中的哪一个。
- **预期**: sdlpal fight.c:4520-4546 PAL_BattleEnemySelectTargetIndex 真值(已逐字核):i = RandomLong(0, wMaxPartyMemberIndex) 纯均匀取队员下标;HP==0 才重摇;无优先级权重。enemy-ai.ts:71-73 同款 reject-resample(引 fight.c:4540-4545)。故三人全程存活时,长程命中分布应近似 1/3:1/3:1/3,不应出现某角色被锁打或某角色从不挨打。
- **验证**: (a) 肉眼:20+ 回合里敌人攻击大致轮流落到三人身上,无某角色被持续偏打/某角色从不挨打。(b) 数据级【gs 路径未全核,用户先在 console 跑 console.log(Object.keys(window).filter(k=>/game|gs/i.test(k))) 确认 hook,再取 g=window.__game.gs 自查字段名】:每回合读 g.battleState 与三名角色当前 HP(经 g.battleState.players[i].roleId 找 roleId 后查 PlayerRoles.roles[roleId].hp,battle-state.ts:569-578 确认玩家 HP 走 role.hp;brief 另提示可能有 g.PlayerRolesRuntime.rgwHP[0..2] 镜像,需用户核实哪个真实存在),对比本回合哪名角色掉血反推被攻击者;统计三人被选次数做比例/卡方检查,应近似均匀。

### D9-2 死亡角色被 reject 重摇:已阵亡角色一次都不应被命中
- **前置**: URL 加 ?skip-intro=1。按 P 三人入队。按 B 选一支会普攻的敌队进战斗。开战后设法让 3 号位角色先阵亡(让其挨打不补血,或在 console 把其 HP 置 0),其余两人保持存活(可用 L 给活着的人回血,但别复活 3 号位)。
- **操作**: 3 号位角色 HP 归 0 阵亡后,我方剩余两人每回合选 D(Defend),让敌人连续行动 15+ 回合;每回合记录敌人普攻打到了哪个号位。
- **预期**: 按 fight.c:4540-4545 / enemy-ai.ts:71-73 reject-resample 真值:while (HP==0) 会把摇到已死 3 号位的结果重摇,直到选中存活角色。故敌人攻击应只落在两名存活角色上,阵亡的 3 号位【一次都不应被命中】。enemy-ai.test.ts:142-153 单测已验证死者被跳过。
- **验证**: (a) 肉眼:15+ 回合内敌人只攻击两名活着的角色,从不对已倒地的 3 号位发动攻击;若看到敌人对死亡角色挥空或命中即为 bug。(b) 数据级【gs 路径未全核,用户先自查 hook/字段名】:console 取 g=window.__game.gs,确认 3 号位 HP=0(经 g.battleState.players[2].roleId 找 roleId 后查 PlayerRoles.roles[roleId].hp;brief 提示的 g.PlayerRolesRuntime.rgwHP[2] 是否存在需用户核实);每回合检查敌人实际命中角色的 roleId 恒不等于 3 号位 roleId。若死亡角色被选中即违反 reject-resample。

---

## D10 — 敌人 AI 脚本 show-once / re-arm(turnStart / ready 返回值回写,0x00 每轮重显 vs 0x01 一次性)
*可测性: partially-testable*

**已知边界/排除**: 不要测以下子部分:(1) ready 脚本(enemy.scriptOnReady 行动前触发,battle-system.ts:1699-1722;sdlpal fight.c:1716-1724)需某敌 OBJECT_ENEMY.wScriptOnReady 真有非 0 入口 —— 原版多数敌人 onReady=0,createBattleState 时 scriptOnReady=objMatch?.scriptOnReady??0(battle-system.ts:280),devpanel B 选敌队无法注入自定义 onReady,也无 devpanel 键手动设;若所选敌 onReady 初值 0 则字段恒 0、行动前不触发、不可观测,只有恰好选到 onReady≠0 的 boss 才可测(用户不一定选得到)。(2) 0x00 vs 0x01 字节级区分:script.c:3204 case 0x0000(fEnded=TRUE、wNextScriptEntry 保持原 entry → 重显)vs case 0x0001(fEnded=TRUE、wNextScriptEntry=wScriptEntry+1 → 永久前移一次性)是脚本字节内容差异,需对某只 boss 的 wScriptOnTurnStart 反汇编看首/末 opcode 才能确知属哪类;本环境无暴露给真机的 enemy-script disasm,无法保证用户选到「确知 0x01 一次性」的那只。可测的是「返回值回写是否改变字段值」这一可观测代理,非 opcode 本身。(3) classic 回合末为下轮重跑(fight.c:1689-1690)vs 回合起手跑(fight.c:1184-1191)两处时序:ts 合并成「每轮起手前对全体活敌跑一次」(runEnemyTurnStartScripts,battle-system.ts:1432-1448,turnStartDoneForTurn guard),真机只见合并效果,无法肉眼分两处。

### D10-1 boss turnStart 嘲讽对话进战斗起手即显(菜单之前)+ 每轮重跑一次
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。Cmd/Ctrl+Shift+D 开 devpanel。按 B 打开 battle picker,选一个【带进战嘲讽/开场白的 boss】敌队(其 OBJECT_ENEMY.wScriptOnTurnStart 非 0、脚本含 0xFFFF showDialog;代码注释举例 enemyId 23 跳跳蛙 / 25 怪老子 scriptOnTurnStart=42840,battle-system.ts:1443;user 实测参考 battle-system.ts:1627 林月如)。
- **操作**: 1) 进战斗,不要先选动作 —— 观察 preBattle→selectAction 进菜单【之前】是否已弹出敌方对话框。2) Confirm 键逐页把对话翻完(对话框消失)。3) 给己方选攻击图标→选敌人→Confirm,让本轮跑完、推进到下一轮起手。4) 观察第二轮起手是否【再次】弹同一段对话(re-arm,0x00 路径)或【不再】弹(show-once,0x01 路径)。
- **预期**: ts 把 turnStart 上移到 round-start 进 selectAction 菜单之前跑(battle-system.ts:398-403,`state.phase==='selectAction' && turnStartDoneForTurn!==turn` 时 runEnemyTurnStartScripts;battle-system.ts:1626-1627 明示修『先选动作才说话』顺序 bug —— 进战斗就说话)。忠实 sdlpal fight.c:1184-1191(fTurnStart gate,在 charge/act 前)。show-once/re-arm:battle-system.ts:1445 `en.scriptOnTurnStart = runScript({ip: en.scriptOnTurnStart,...})` 把脚本返回值(wNextScriptEntry)回写 —— 同 sdlpal fight.c:1186-1187。脚本以 0x0000 结(script.c:3204 wNextScriptEntry 保持原 entry)→入口不变、每轮重显;以 0x0001 结(script.c:3211-3216 wNextScriptEntry=entry+1)→入口前移、只显一次。
- **验证**: (a) 肉眼:进战斗第一轮、在选动作菜单出现之前就弹出敌方对话框(不是选完动作才弹)。(b) 数据级:console `window.__game.gs.battleState.turnStartDoneForTurn`(battle-state.ts:473)进 selectAction 后 === `window.__game.gs.battleState.turn`(battle-state.ts:347);对话入队时 `window.__game.gs.battleState.battleDialogQueue`(battle-state.ts:459)非空。记录第一轮跑前 vs 跑后的 `window.__game.gs.battleState.enemies[0].scriptOnTurnStart`(battle-state.ts:86):不变=0x00 re-arm(下轮还会重跑同入口);变化(前移)=0x01 show-once。

### D10-2 turnStart 每轮仅跑一次:对话 hold 暂停期重入不重复(turnStartDoneForTurn guard)
- **前置**: 同 D10-1 选带 turnStart 嘲讽对话的 boss 敌队进战斗。重点:对话 hold 暂停期间反复观察不刷屏/不重跑。
- **操作**: 1) 进战斗起手,对话框弹出后【先不翻页】,停在 hold 状态几秒。2) 观察对话文字是否被重复追加/重画(不该)。3) 翻完对话,本轮正常进行(给攻击)。4) console 在 hold 期间多次读 turnStartDoneForTurn 与 turn 与 battleDialogQueue.length。
- **预期**: sdlpal fight.c:1184-1191 `if(fTurnStart)` 跑一次即 fTurnStart=FALSE(fight.c:1189)、本轮不重入。ts 对应 runEnemyTurnStartScripts 首行 `state.turnStartDoneForTurn = state.turn`(battle-system.ts:1433),且 tickBattle 入口 `turnStartDoneForTurn !== turn` 才进(battle-system.ts:401);battle-state.ts:469-472 注释明示『对话 hold 暂停期间重入也不重跑』。所以 hold 期间脚本不被反复执行、对话队列不被反复追加。
- **验证**: (a) 肉眼:对话 hold 停留期间文字稳定,不刷屏、不重复入队。(b) 数据级:hold 期间多次读 `window.__game.gs.battleState.turnStartDoneForTurn`(battle-state.ts:473)始终 === `window.__game.gs.battleState.turn`(battle-state.ts:347),不跳回;`window.__game.gs.battleState.battleDialogQueue.length`(battle-state.ts:459)在同一轮内不随每 tick 单调增长(只首次跑 turnStart 那刻入队)。

### D10-3 turnStart 对全体活敌各跑一次 + 死敌跳过(health<=0 continue)
- **前置**: 按 B 选一个【含 2 只以上、都带 turnStart 脚本】的 boss 多敌队。若拿不准哪只带脚本,先 console 遍历 `window.__game.gs.battleState.enemies` 看哪些 enemies[i].scriptOnTurnStart>0。不用 K 键(那是全清),本例只打死其中一只。
- **操作**: 1) 进战斗,第一轮起手记录有多少只敌各弹一次对话 / 多少只 scriptOnTurnStart 被回写。2) 用己方攻击/法术打死其中一只(health<=0 并淡出完)。3) 进入下一轮起手,观察死掉那只是否还触发 turnStart(不该),活着的是否照常。
- **预期**: ts runEnemyTurnStartScripts 循环 `if (!en || en.e.health<=0 || en.scriptOnTurnStart<=0) continue`(battle-system.ts:1438)跳过死敌/无脚本敌 —— 忠实 sdlpal fight.c:1179-1182 `if (wObjectID==0) continue`。turnStart 只对活敌逐个跑一次,死敌不再跑(其对话不再出)。
- **验证**: (a) 肉眼:死掉的敌下轮起手不再弹它的对话;活着的照常。(b) 数据级:`window.__game.gs.battleState.enemies[i].e.health`(battle-state.ts:75)<=0 或 `enemies[i].deathFadeStep>=72`(battle-state.ts:123)的那只,其 `enemies[i].scriptOnTurnStart`(battle-state.ts:86)新一轮不再变化;活敌的 scriptOnTurnStart 该轮按脚本结尾 opcode 决定是否再回写。`turnStartDoneForTurn`(battle-state.ts:473)仍每轮只 === turn 一次。

### D10-4 scriptOnReady 行动前脚本返回值回写 + 本 action 一次性 guard(数据级)
- **前置**: 按 B 选一个【某敌 OBJECT_ENEMY.wScriptOnReady 非 0】的 boss 敌队。原版多数敌 onReady=0,需先在 console 遍历 `window.__game.gs.battleState.enemies[i].scriptOnReady` 找出非 0 的那只 i 再决定测谁;若全为 0 则本例不适用(见 excludedNote)。进战斗后让该敌实际行动一次。
- **操作**: 1) 进战斗,console 记录该敌 `enemies[i].scriptOnReady` 初值(非 0)。2) 推进战斗到该敌真正行动(己方下完动作,轮到该敌出手)。3) 该敌行动后再读同一字段,比较是否被回写。4) 若该 ready 脚本含对话,在该敌出手前应先弹一次对话。
- **预期**: ts tickPerformAction:敌 action 项处理时 `if (enemy.scriptOnReady>0 && !item.scriptReadyRan){ item.scriptReadyRan=true; enemy.scriptOnReady = runScript({ip: enemy.scriptOnReady,...}) }`(battle-system.ts:1699-1707),返回值回写 —— 同 sdlpal fight.c:1719-1720 `wScriptOnReady = PAL_RunTriggerScript(wScriptOnReady, i)`,随后 PerformAction(fight.c:1723)。item.scriptReadyRan(turn-queue.ts:35-38)防对话 hold 暂停期重跑。返回值语义同 turnStart:0x0000 结返原 entry(re-arm、每次 ready 重跑),0x0001 结返 entry+1(一次性)。
- **验证**: (a) 肉眼:若 ready 脚本含 showDialog,该敌出手前弹一次对话(battle-system.ts:1722 对话队非空时先 return 暂停 action 让对话先显);纯逻辑脚本则无可见效果。(b) 数据级:对比该敌 `window.__game.gs.battleState.enemies[i].scriptOnReady`(battle-state.ts:88)行动前后:不变=re-arm(0x00),增大(前移)=show-once(0x01)。注:初值本就 0 则恒 0、不可观测,该敌不适用此例。

---

## D11 — 战斗胜利 BattleWon + 升级(exp/现金入账 · 属性成长 · 升级满血满蓝 · 学法术 · 战末半血)
*可测性: fully-testable*

**已知边界/排除**: 先纠正任务 brief 与本 checkout 实代码偏差(务必按真值,否则用户白测):

1) devpanel 全局热键真值只有 3 个(dev-panel.ts:159-179 onKey 全文):Cmd/Ctrl+Shift+D 开关面板;B = 开 battle picker(explore/battle 模式);P = 强制三人入队([0,1,2]);F1 = console 打 gs 深拷贝。brief 说的 K(KO 全敌)/L(满血)/M(学法术)/I(加道具)/C(清包)/F(加钱)/G(切 build)/T(战斗对话)这些独立热键不存在,不要让用户按。加物品/清包/金钱是 picker 面板里的按钮,不是键。

2) gs 验证用 window.__game.gs(bootstrap.ts:798 DEV 下挂 window.__game = { gs, assets, presentCtx }),console 里可直接读写 window.__game.gs.PlayerRolesRuntime.rgwHP[0] 等,实时多次读。也可按 F1 打快照。

3) battle picker 里真实 fixture 有 6 个(battle-fixtures.json):fixture-zh1 / fixture-zh2 / fixture-end / fixture-anim / fixture-dialog / **fixture-levelup**。其中 fixture-levelup 就是为 D11 量身做的(label 标注:lv1 + 6000 经验 vs 灯笼 30HP,attackStrength=999 一击秒,打赢连升到 lv12 / 满血 / 学法术「凝神归元」lv10 大世界仙术菜单可见)——这是测升级最确定的入口。其余 fixture 多是高级/满级,exp 不会跨阈值升级。applyFixture 不传 rngSeed(dev-panel.ts:887)→ 升级属性成长量(battle-system.ts:2361-2367 rng.rangeInclusive)每场随机,只验「增长/满血」,不对具体数值。applyFixture 硬传 isBoss=false(dev-panel.ts:896),所有 dev 战非 boss。

诚实标注未做/简版(不要测):
  - Phase C 隐藏属性经验升级(battle.c:1226-1293 CHECK_HIDDEN_EXP):未实现,ExpEntry 无 wCount,iTotalCount 恒 0(battle-settlement.ts:11-15),不会出隐藏经验屏。
  - 属性成长是 global.c:2347-2454 的简化近似(battle-system.ts:2360 注),不要拿数值逐点对拍 sdlpal。
  - 学法术(D11-4)依赖 level-up-magic 表该角色该等级区间有条目;fixture-levelup label 已声明李逍遥 lv10 学「凝神归元」,故可验。其它角色/等级若升了级 rgwMagic 没变,可能是该区间表里本就无新法术,不一定是 bug。
  - lost(全队亡)只回 explore 无 game-over(battle-system.ts:2117),属别项不在 D11。
  - 真 boss 演出(exp 屏 5.5s 超时、不可逃)走 0x07 脚本路径,dev panel 测不到。

### D11-1 打完单战 → 胜利结算 exp/现金入账 + 回 explore
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。按 Cmd/Ctrl+Shift+D 开 devpanel(首次必须开一次以启热键)。打开 console,记下战前 window.__game.gs.dwCash。
- **操作**: (1) 按 B 开 battle picker;(2) 点「fixture-zh1: 第一章开局(队长 lv10 vs 弱怪)」按钮;(3) 进战斗后反复按 A(Auto 围攻自动提交攻击)直到敌人血空;(4) 敌死 → 出现胜利结算屏(获得经验/得文钱),按 Confirm 或等 ~3s 超时逐屏翻过;(5) 回房间 explore 可走动。
- **预期**: sdlpal PAL_BattleWon:全敌 health<=0 → 先放「获得经验值 N」+「打败敌人得 N 文钱」屏(battle.c:1025-1054)。ts:tickPostAction enemyAlive===0 → phase='won'(battle-system.ts:2076-2079);死敌累 expGained/cashGained = enemy.exp/enemy.cash 之和(battle-system.ts:2053-2058);buildBattleWonSettlement 无条件 gs.dwCash += cashGained(battle-system.ts:2184);放完 finishBattleWon → finalizeBattleCleanup 回 explore(battle-system.ts:2244)。
- **验证**: (a) 肉眼:屏幕弹胜利结算文字屏(经验/金钱),翻完后回房间可走动。(b) 数据级 console:战后 window.__game.gs.dwCash 比战前大,增量 = 被杀敌 enemy.cash 之和;战后 window.__game.gs.battleState === undefined(已 cleanup,battle-system.ts:2159);window.__game.gs.mode === 'explore'。

### D11-2 fixture-levelup 连升多级 → 升级屏 + 升级即满 HP/MP + 各属性成长
- **前置**: ?skip-intro=1 进房间,开 devpanel。本场用 fixture-levelup(专为 D11 做:李逍遥 lv1 + 6000 经验 vs 灯笼 30HP,攻击 999 一击秒)。按 B 选该 fixture 后(战斗中)console 记下 window.__game.gs.PlayerRolesRuntime.rgwLevel[0] / rgwMaxHP[0] / rgwAttackStrength[0] / rgwDexterity[0] 与 gs.Exp.rgPrimaryExp[0].wExp。
- **操作**: (1) 按 B 选「fixture-levelup: 升级测试(lv1 + 6000 经验 vs 灯笼 30HP)」;(2) 进战斗后按 A 围攻一击秒敌;(3) 结算先出 exp-cash 屏,接着出「升级」屏(level old→new + 修行/体力/真气/武术/灵力/防御/身法/吉运 8 属性 old→new,HP/MP cur/max);(4) 按 Confirm 逐屏翻完回 explore;(5) console 读战后值。
- **预期**: sdlpal battle.c:1090-1116:6000 exp 远大于低级 rgLevelUpExp\[level] → while 连续扣阈值 level++ 连升多级(label 声明到 lv12)+ 每级 PAL_PlayerLevelUp 属性成长(global.c:2347-2454)+ 升级即 HP/MP 回满。ts battleWonLevelUp(battle-system.ts:2350-2375):dwExp=wExp+expGained,while dwExp>=levelUpExp\[level] 扣阈值 level++ → 成长(2361-2367)+ rt.rgwHP\[0]=rt.rgwMaxHP\[0]、rt.rgwMP\[0]=rt.rgwMaxMP\[0](2373-2374)。
- **验证**: (a) 肉眼:结算出「升级」屏,等级从 1 跳到 ~12 + 各属性 old→new 增长。(b) 数据级 console(战后 window.__game.gs.PlayerRolesRuntime):rgwLevel\[0] 远大于 1(约 12);rgwHP\[0] === rgwMaxHP\[0] 且 rgwMP\[0] === rgwMaxMP\[0](升级满血满蓝,battle-system.ts:2373-2374);rgwMaxHP\[0]/rgwMaxMP\[0]/rgwAttackStrength\[0]/rgwMagicStrength\[0]/rgwDefense\[0]/rgwDexterity\[0]/rgwFleeRate\[0] 都 >> 战前(多级累加正值);window.__game.gs.Exp.rgPrimaryExp\[0].wLevel === rgwLevel\[0](battle-system.ts:2381),wExp = 扣完多级阈值后余数。注:未传 rngSeed → 成长量随机,只验增长/满血/level 同步,不对数值。

### D11-3 升级后学新法术(fixture-levelup 李逍遥 lv10 凝神归元)
- **前置**: ?skip-intro=1,开 devpanel。同用 fixture-levelup(label 明说连升跨 lv10 会学「凝神归元」)。按 B 选该 fixture 后(战斗中)console 记下 window.__game.gs.PlayerRolesRuntime.rgwMagic(二维 [magicSlot][roleId],battle-system.ts:2429)中 roleId=0 的现有条目。
- **操作**: (1) 按 B 选「fixture-levelup」;(2) 按 A 围攻一击秒敌 → 胜利;(3) 结算依次 exp-cash → level-up → 「李逍遥 练成 凝神归元」的 learn-magic 屏(battle-system.ts:2199-2202 每个 learnedMagic 排一屏);(4) Confirm 逐屏翻完回 explore;(5) console 读战后 rgwMagic。
- **预期**: sdlpal battle.c:1298-1328:升级后按 rgLevelUpMagic 表,role.level >= 该法术 level 且未学 → PAL_AddMagic + 显「练成」。ts battleWonLevelUp(battle-system.ts:2410-2416):遍历 levelUpMagic 表 m=entry[0],m.magic!=0 && m.level<=level && 未学 → addMagicToRoleRuntime 写 rt.rgwMagic 第一空槽(battle-system.ts:2426-2440)。fixture-levelup 从 lv1 连升过 lv10 → 该法术 cell.level≤当前级 → 学会。
- **验证**: (a) 肉眼:结算出「李逍遥 练成 凝神归元」屏;战后回大世界按菜单进仙术,李逍遥法术列表多出凝神归元(label 明说“大世界仙术菜单可见”)。(b) 数据级 console:window.__game.gs.PlayerRolesRuntime.rgwMagic 某 [slot][0] 从 0 变成凝神归元的 spell object id(addMagicToRoleRuntime 填空槽,battle-system.ts:2434-2437);新增 id 满足 levelUpMagic 表 roleId=0 某 cell.level <= 战后 rgwLevel[0]。

### D11-4 残血胜利 → Phase F 战末半血半蓝恢复
- **前置**: ?skip-intro=1,开 devpanel。选 fixture-zh2(队长 lv20 + 林月如 vs 中等敌队,两人,exp 不过阈值本场不升级 → 半血恢复才可见)。本用例需「胜利时某队员低于半血且本场不升级」:战斗中 console 压血 window.__game.gs.PlayerRolesRuntime.rgwHP[1] = 1、rgwMP[1] = 0(role1 林月如),或肉眼看血条被敌打低。记下 rgwMaxHP[1]/rgwMaxMP[1]。
- **操作**: (1) 按 B 选「fixture-zh2」;(2) 战斗中 console 设 window.__game.gs.PlayerRolesRuntime.rgwHP[1]=1、rgwMP[1]=0(或多打几回合让敌人掊低该队员血);(3) 按 A 围攻杀完全敌 → 胜利;(4) 结算屏 Confirm 翻完(本场不升级则只 exp-cash 屏);(5) 演出放完 finishBattleWon 收尾回 explore;(6) console 读战后值。
- **预期**: sdlpal battle.c:1342-1372(PAL_CLASSIC 每战后):HP += (maxHP-HP)/2、MP += (maxMP-MP)/2(补上差距的一半)。ts finishBattleWon(battle-system.ts:2235-2243):对 gs.partyMembers 每个 roleId,rt.rgwHP[roleId] = hp + floor((maxHP-hp)/2)、rt.rgwMP[roleId] = mp + floor((maxMP-mp)/2)。
- **验证**: (a) 肉眼:回大世界后该队员血条从残血恢复到约一半(不满也不残)。(b) 数据级 console:window.__game.gs.PlayerRolesRuntime.rgwHP[1] === 1 + floor((rgwMaxHP[1]-1)/2) ≈ floor(rgwMaxHP[1]/2);快检 rgwHP[1] >= floor(rgwMaxHP[1]/2)(只补不足→不低于半血);rgwMP[1] === 0 + floor((rgwMaxMP[1]-0)/2) = floor(rgwMaxMP[1]/2)。诚实提醒:若该队员本场意外升了级,升级已把 HP/MP 回满(D11-2),半血恢复就看不出;fixture-zh2 exp 不过阈值故不升级,适合本用例。

---

## D12 — 战斗逃跑 PlayerEscape — 全队逃 + 16 步右下滑动画 + 移出屏 → fleed → 回 explore
*可测性: fully-testable*

**已知边界/排除**: 不该当"sdlpal 忠实真值"核的简版/偏离子部分:

1. fleeRate 现取 `getPlayerFleeRate(gs, roleId)`(base + 装备加成),可核 sdlpal `PAL_GetPlayerFleeRate` 有效逃跑率；旧版 raw base 注释已过时。

2. 16 步每步像素位移**主动偏离 sdlpal**。battle-system.ts:1385-1391 fleeStepDelta 返回统一 \[5,4](全员右下同向同速),代码注释明示这是 user 2026-05-31 拍板"忠于原版三人同向",**故意不照** sdlpal battle.c:1486-1505 的扇形 p0 +4/+6·p1 +4/+4·p2 +6/+3。**不要逐像素对齐 sdlpal**,这是有意设计偏离;可核的是"16 步右下移 + 末步移出屏"这个结构。

3. 逃跑失败动画+文字。flee.ts 走 buildFleeFailTimeline(3 步右下挪+濒死帧),末帧同步 showBattleMessage('逃跑失败',320ms),对应 sdlpal fight.c:4155-4170(3 步 dash + frame 1 + BATTLE_LABEL_ESCAPEFAIL)。

4. 音效 45(battle.c:1459 AUDIO_PlaySound(45))已接入 `gs.pendingSounds`；普通逃跑成功、脚本 0x3A、敌逃 0x69 都走同一 sound id。

5. boss 禁逃路径(flee.ts:32 `if(state.isBoss)return` ↔ fight.c:4143 `&& !g_Battle.fIsBoss`)代码存在,但 battle-fixtures.json 全 6 条 fixture 的 isBoss 均为空(非 boss),dev panel B picker 选不到 boss 队,真机无法便捷构造 boss 战。故不给 boss 禁逃用例,仅标注该路径存在。

### D12-1 按 Q 逃跑成功 → 16 步右下滑 + 移出屏 → fleed 退出战斗回探索
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间(mode='explore')。按 B 开 battle picker(dev-panel.ts:160),点 ⛔Battle Fixtures 里的 'fixture-zh1'(队长 lv10 vs 弱怪,isBoss 空=非 boss,flee.ts:32 不早退)→ 进战斗。
- **操作**: 进战斗等到出现动作主菜单(四图标,uiState='selectMove'/menuState='main')。直接按键盘 **Q**(KeyQ→'Flee',input.ts:58 → battle-system.ts:826-827 commitFleeAllPlayers)。若这一次 roll 偏大失败(角色未滑出屏、战斗继续),等轮到该队员再按 Q 重试,直到看到成功滑出。
- **预期**: sdlpal fight.c:4119-4148 kBattleActionFlee:str=PAL_GetPlayerFleeRate;def=Σ(rgEnemy.wDexterity+(wLevel+6)*4)(fight.c:4127-4136);`str>=RandomLong(0,def) && !fIsBoss`(fight.c:4143)为真→PAL_BattlePlayerEscape(fight.c:4148 / battle.c:1438-1528):全活队员置站立帧(battle.c:1467-1471)、`for(i=0;i<16;i++)` 16 步右下移(battle.c:1473-1515)、末了全员 pos=PAL_XY(9999,9999)(battle.c:1520-1523)、BattleResult=kBattleResultFleed(battle.c:1527)。ts 对应:flee.ts:48-51 str>=roll → state.fleeAnim={step:0};battle-system.ts:1399-1421 tickBattleFleeAnim 每 tick 推 1 步(fleeStepDelta=[5,4] 右下,1389-1391),满 16 步置全员 pos=(9999,9999)+ state.phase='fleed'(1416-1418)→ 下 tick finalizeBattle(2123-2138,phase 'fleed' 无 hp 改动无奖励)→ mode='explore'、battleState=undefined。
- **验证**: (a) 肉眼:队员向屏幕右下方滑动直到滑出画面,随后战斗界面消失、回到李逍遥房间探索画面(不弹胜利结算屏),并播放逃跑音效 45。(b) 数据级在 console:成功瞬间 `window.__game.gs.battleState.fleeAnim`(battle-state.ts:441)从 {step:0} 递增,连续查 .step 可看到 0→16;进入末步后 `window.__game.gs.battleState.players[i].pos`(battle-state.ts:60)全部 = {x:9999,y:9999};随后 `window.__game.gs.battleState.phase==='fleed'`(battle-state.ts:183);finalize 后 `window.__game.gs.battleState===undefined` 且 `window.__game.gs.mode==='explore'`(game-state.ts:569 mode / :613 battleState;__game hook bootstrap.ts:796-798)。

### D12-2 一人选逃跑 = 全队逃(三人队全活队员 action 都被置 flee)
- **前置**: ?skip-intro=1。按 B 开 picker,选 'fixture-end'(通关前满级 3 人,partyMembers=[0,1,2],isBoss 空)—— 这样 battleState.players 是 3 人,才能观察'全队'。(注:fixture 自带 partyMembers 会覆盖 P 键,所以用三人 fixture 而非 P。)
- **操作**: 进战斗到动作主菜单。只给第一个行动的队员按一下 **Q**(或走杂项盒:主菜单下键选中杂项图标 Confirm → 盒内选第4项'逃跑' Confirm,battle-system.ts:977-978)。**在该回合 performAction 推进前**立刻在 console 查 pendingActions。
- **预期**: sdlpal fFlee 全队逃:一人选逃 → 后续强制全队 kKeyFlee(battle-system.ts:1102-1105 注释引 sdlpal fight.c:1976-1978 fFlee=TRUE + 1773-1799)。ts:commitFleeAllPlayers(battle-system.ts:1107-1110)对 alivePlayerIdxs **全体**写 `{type:'flee', target:-1}`,而非只给选的那一个。行动队列逐个 PAL_BattlePlayerEscape,首个 roll 成功即全队 fleed(battle.c:1463-1523 对全 party 循环)。
- **验证**: (a) 肉眼:成功时是整队三人一起向右下滑出屏,不是单人逃。(b) 数据级在 performAction 前查 `window.__game.gs.battleState.pendingActions`(battle-state.ts:354,Map<number,BattleAction>):打印 `[...window.__game.gs.battleState.pendingActions.values()].map(a=>a.type)` 应全是 'flee',且 `.map(a=>a.target)` 全是 -1;每个活着的队员索引都在 Map 里,死员(rgwHP<=0,battle-system.ts:1406 跳过)不在。

### D12-3 逃跑失败 → 不切 phase、不设 fleeAnim、战斗继续(可重试)
- **前置**: ?skip-intro=1。按 B 选 'fixture-end'(3 人 vs 五毒巨蟝×2+金蟾 多敌高 dex)—— def=Σ(dex+(level+6)*4)(fight.c:4127-4136)偏大,使 RandomLong(0,def) 容易超过有效 fleeRate 导致较多失败。
- **操作**: 进战斗动作主菜单,按 **Q** 选逃跑。观察这一次若失败的表现:角色未滑出屏、战斗界面不消失。(多试几次总能撞上一次失败。)
- **预期**: sdlpal fight.c:4150-4171 else 分支:逃跑失败播 3 步 dash-back + wCurrentFrame=1(濒死姿)+ BATTLE_LABEL_ESCAPEFAIL 文字(fight.c:4155-4168),不退出战斗。ts:flee.ts str<roll 时**不设 fleeAnim、不切 phase**,只起 buildFleeFailTimeline,末帧显示 showBattleMessage('逃跑失败',320ms);该队员该回合相当于空过,战斗继续推进到下一行动者/敌人。
- **验证**: (a) 肉眼:角色短促向右下挪一下又复位(或显示'逃跑失败'提示),战斗界面不消失、轮到敌人/下一队员继续行动。(b) 数据级在失败后查:`window.__game.gs.battleState.fleeAnim===undefined`(battle-state.ts:441,失败不设此字段)且 `window.__game.gs.battleState.phase` 仍为 'performAction'/'postAction'/'selectAction' 之一、**不是** 'fleed'(battle-state.ts:176-183);`window.__game.gs.battleState` 仍存在、`window.__game.gs.mode==='battle'`(战斗未结束)。

---

## D14 — 装备 stat 加成 + scriptOnEquip(0x2D DualAttack / 0x29 寿葫芦毒 / 卸装 reset)
*可测性: fully-testable*

**已知边界/排除**: 注:本会话第一次 StructuredOutput(verdict=not-testable)是误判,工具其实全程正常,以本次为准。

D14 主体(6 stat 加成 getter / 0x17·0x19·0x1A 写入 / 0x2D DualAttack / 0x29 寿葫芦毒 grant / 卸 Hand reset DualAttack / 卸 Wear 清 level-99 毒 / iCurEquipPart redirect+reset / 0x18 真换装)均可真机数据级验,且 DualAttack 已端到端打通(equip 写 gs.rgPlayerStatus[role][8] → B 进战斗 createBattleState seedBattleStatus 注入 battleState.players[i].status.dualAttack → attack.ts:148/163 双击),可在战斗里真验"攻击两次"。

不给可测用例的子部分(诚实标注):
1) **0x29 寿葫芦每回合 +20HP/+20MP 的逐回合回血结算 —— 属 D15 毒系统,不在 D14**。D14 的 0x29(equip-effect.ts:415-428)只负责装备时把 level-99 正面毒 grant 进 gs.rgPoisonStatus;真正每回合回血在 poison per-turn 结算(D15)。本项只验 grant 写入(D14-4)+ 卸 Wear 清除(D14-3),不验逐回合回血数值。
2) **经游戏内装备菜单装一把真带 scriptOnEquip 的真实武器/饰品 —— 走 console 直接调更可靠**。进二级装备 picker 的精确键序(equip-menu.ts 走 uigame.c:1793-2056)+ 哪把 item 的 scriptOnEquip=0x2D/0x29 的具体 item id,我本会话未逐一核到位。故用例统一走 console 调 runEquipScript/removeEquipmentEffect/writeEquipmentEffectField + setGlobalEvents/setObjectPoisons(均为已导出函数,equip-effect.test.ts 即这样用),这是合法真机数据测且不依赖未核实的 item id / 菜单键序。D14-2 的 stat 加成那条另给一条角色状态菜单肉眼对照。
3) elemental resistance 5 行(23-27)写入/卸装清零 已含在 removeEquipmentEffect 全清里,本批不单列(equip-effect.test.ts 已覆盖 row 23)。

### D14-1 0x2D DualAttack 端到端:装备脚本写 gs.rgPlayerStatus[role][8] → 进战斗 seed 成 dualAttack → 攻击真打两次
- **前置**: 浏览器开 app 带 ?skip-intro=1 进李逍遥房间。开 devpanel(Cmd/Ctrl+Shift+D),按 P 强制三人入队(partyMembers=[0,1,2],dev-panel.ts:174)。本用例核心走 console 调导出函数 + 进战斗肉眼+数据验,window.__game.gs 即 live 状态(bootstrap.ts:798-800)。
- **操作**: 1) console:const gs=window.__game.gs。2) 装载一段最小 0x2D 装备脚本并施给 role 0(模拟仙女剑授 DualAttack):setGlobalEvents([{op:'raw',opcode:0x2d,operands:[8,32760,0],label:'L_510'},{op:'end'}])(setGlobalEvents 由 event-system 导出)。3) gs.PlayerRolesRuntime.rgwHP[0]=100(good 状态需 HP!=0)。4) runEquipScript(gs,510,0)(equip-effect.ts 导出)。5) 确认 gs.rgPlayerStatus[0][8]===32760。6) 关 console,按 B 开 battle picker 选任意敌队进战斗。7) 进战斗后 console 看 gs.battleState.players[0].status.dualAttack。8) 用方向键选战斗菜单普通攻击,选单个敌人 Confirm,看攻击动画/伤害数。
- **预期**: sdlpal:0x2D 经 script.c:1367 调 PAL_SetPlayerStatus(global.c:2173-2277 CLASSIC),DualAttack=status 8 属 good 类(global.c:2264),仙女剑授 rounds=32760 写持久 rgPlayerStatus[role][8]。进战斗 createBattleState 把持久状态 seed 成战斗 BattleStatus(battle-state.ts:585 seedBattleStatus,:563 dualAttack=persisted[8])。攻击时 fight.c:3681 外层 for t<(dualAttack?2:1) 把整套命中做两遍(ts attack.ts:148 / :163 hits = dualAttack>0?2:1)。对应 ts equip-effect.ts:409-414 case 0x2d。
- **验证**: (a) 肉眼:第 8 步同一次攻击指令,被攻击敌人连吃两次伤害(两段伤害数/两次受击动画),而非一次。(b) 数据级:第 5 步 window.__game.gs.rgPlayerStatus[0][8]===32760(路径 game-state.ts:996 rgPlayerStatus:number[][],[roleId=0][statusId=8])。第 7 步 window.__game.gs.battleState.players[0].status.dualAttack===32760(路径 battle-state.ts:34 BattleStatus.dualAttack,battleState.players[i].status)。

### D14-2 装备 stat 加成累加 + 卸装归零(effective Atk/Dex = base + Σ rgEquipmentEffect)
- **前置**: 浏览器 ?skip-intro=1 进房间。开 devpanel,按 P 三人入队(便于开角色状态菜单肉眼对照属性数字)。console 走 equip-effect 导出函数 + 读 gs。
- **操作**: 1) console:const gs=window.__game.gs。2) 记 base:const baseAtk=getPlayerAttackStrength(gs,0); const baseDex=getPlayerDexterity(gs,0)(equip-effect.ts 导出)。3) 模拟木剑 scriptOnEquip(39011 真值 chain:0x17 给 Hand part 写 AttackStrength+2 / Dexterity+3):writeEquipmentEffectField(gs,3,17,0,2); writeEquipmentEffectField(gs,3,20,0,3)(3=Hand part,17=ATTACK_STRENGTH row,20=DEXTERITY row,见 equip-effect.ts:108/110 PLAYERROLES_ROW)。4) 读 getPlayerAttackStrength(gs,0) / getPlayerDexterity(gs,0)。5) 卸装:removeEquipmentEffect(gs,0,3)。6) 再读两个 getter。
- **预期**: sdlpal PAL_GetPlayerAttackStrength(global.c:1736-1767)/ PAL_GetPlayerDexterity(global.c:1832-1867):effective = base PlayerRoles + Σ_part rgEquipmentEffect[part]。木剑 39011 真值给 Hand part 加 Atk+2 Dex+3。卸装 PAL_RemoveEquipmentEffect(global.c:1372-1456)把该 part 该 role 所有 field 清 0。对应 ts equip-effect.ts:29-35(getter)/ :122-162 writeEquipmentEffectField(0x17)/ :229-261 removeEquipmentEffect。
- **验证**: (a) 肉眼:若开角色状态菜单(devpanel Player Status,dev-panel.ts:544),装备后李逍遥武力/身法数字 +2/+3,卸后回落。(b) 数据级:第 4 步 getPlayerAttackStrength(gs,0)===baseAtk+2 且 getPlayerDexterity(gs,0)===baseDex+3;直查覆盖层 window.__game.gs.rgEquipmentEffect[3].rgwAttackStrength[0]===2、.rgwDexterity[0]===3(路径 game-state.ts:1004 rgEquipmentEffect[part],EquipmentEffectRoles.rgwAttackStrength[role])。第 6 步 getter 回到 baseAtk/baseDex 且 gs.rgEquipmentEffect[3].rgwAttackStrength[0]===0、.rgwDexterity[0]===0。base 层 gs.PlayerRolesRuntime.rgwAttackStrength[0] 全程不变(game-state.ts:438)。

### D14-3 卸装副作用:卸 Hand(part3)reset DualAttack;卸 Wear(part5)清 level-99 寿葫芦毒,低级毒保留;卸非 Hand 不动 DualAttack
- **前置**: 浏览器 ?skip-intro=1 进房间。开 devpanel。console 走 equip-effect / event-system 导出 + 读 gs。
- **操作**: 1) console:const gs=window.__game.gs。2) 造 DualAttack 状态:gs.rgPlayerStatus[1][8]=32760。3) 卸非 Hand 对照:removeEquipmentEffect(gs,1,0)(0=Head)→ 读 gs.rgPlayerStatus[1][8]。4) 卸 Hand:removeEquipmentEffect(gs,1,3)→ 读 gs.rgPlayerStatus[1][8]。5) 造毒:先注册毒表 setObjectPoisons([{id:563,level:99,color:0,playerScript:40860,enemyScript:0},{id:552,level:1,color:64,playerScript:40866,enemyScript:40868}])(event-system 导出);gs.rgPoisonStatus['0_1']={wPoisonID:563,wPoisonScript:40860}; gs.rgPoisonStatus['1_1']={wPoisonID:552,wPoisonScript:40866}。6) 卸 Wear:removeEquipmentEffect(gs,1,5)→ 读两条毒。
- **预期**: sdlpal PAL_RemoveEquipmentEffect(global.c:1372-1456)两个特殊副作用:卸 Hand(part3)→ rgPlayerStatus[role][kStatusDualAttack=8]=0(global.c:1406-1412,装备授 32760 的唯一清除点);卸 Wear(part5)→ 清 level>=99 的毒(寿葫芦常驻回血毒随饰品卸下消失,global.c:1413-1454),低级毒保留;卸 Head(part0)不动 DualAttack。对应 ts equip-effect.ts:253-260。
- **验证**: (a) 肉眼:console 无报错。(b) 数据级:第 3 步后 window.__game.gs.rgPlayerStatus[1][8] 仍===32760(卸 Head 不动);第 4 步后 gs.rgPlayerStatus[1][8]===0(卸 Hand reset)。第 6 步后 gs.rgPoisonStatus['0_1'].wPoisonID===0(level99 清,路径 game-state.ts:859 rgPoisonStatus Record,值 PoisonStatus.wPoisonID),gs.rgPoisonStatus['1_1'].wPoisonID===552(低级保留)。

### D14-4 0x29 寿葫芦装备授 level-99 正面毒(grant 进 rgPoisonStatus),poisonResistance 门控
- **前置**: 浏览器 ?skip-intro=1 进房间。开 devpanel,按 P 三人入队。console 走 equip-effect / event-system 导出 + 读 gs。
- **操作**: 1) console:const gs=window.__game.gs。2) 注册毒表(含 563):setObjectPoisons([{id:563,level:99,color:0,playerScript:40860,enemyScript:0}])。3) 装载 0x29 寿葫芦脚本:setGlobalEvents([{op:'raw',opcode:0x29,operands:[0,563,0],label:'L_520'},{op:'end'}])(operands:applyAll=0,poisonId=563)。4) 确认 role1 poisonResistance 为 0:getPlayerPoisonResistance(gs,1)===0 → RandomLong(1,100)>0 必中。5) runEquipScript(gs,520,1)。6) 检查 gs.rgPoisonStatus 是否出现 wPoisonID===563。7)(门控对照)writeEquipmentEffectField(gs,5,22,1,100)(5=Wear,22=POISON_RESISTANCE row)使 getPlayerPoisonResistance(gs,1)===100,清掉刚才的毒后再 runEquipScript(gs,520,1) → 应永不中。
- **预期**: sdlpal 0x29 apply poison to player(script.c:1257),门控 RandomLong(1,100) > poisonResistance(script.c:1280;resist=100 → 永不中,因 random 范围 1..100 永不 >100)。寿葫芦 Wear 授 level-99 正面毒 563。对应 ts equip-effect.ts:415-428:applyAll? partyMembers:[role];gate Math.floor(random*100)+1 > getPlayerPoisonResistance(r) → addPoisonForPlayer。
- **验证**: (a) 肉眼:console 无报错。(b) 数据级:第 6 步 Object.values(window.__game.gs.rgPoisonStatus).some(p=>p.wPoisonID===563)===true(路径 game-state.ts:859 rgPoisonStatus,值 PoisonStatus.wPoisonID)。第 7 步 resist=100 后再跑,不应新增 563 项(getPlayerPoisonResistance(gs,1) 经 equip-effect.ts:75-81 clamp 后===100,gate random*100+1 范围 1..100 永不 >100)。

### D14-5 0x1A 装备进行中 redirect 写覆盖层 + 脚本结束 iCurEquipPart reset=-1(防泄漏污染后续脚本)
- **前置**: 浏览器 ?skip-intro=1 进房间。开 devpanel。console 走 equip-effect / event-system 导出 + 读 gs。
- **操作**: 1) console:const gs=window.__game.gs。2) 设 base:gs.PlayerRolesRuntime.rgwAttackStrength[2]=50。3) gs.PlayerRolesRuntime.rgwEquipment[3][2]=163; gs.inventory=[{itemId:163,count:1}]。4) 装载脚本(0x18 设装备部位 + 0x1A 写 stat):setGlobalEvents([{op:'raw',opcode:0x18,operands:[14,163,0],label:'L_501'},{op:'raw',opcode:0x1a,operands:[17,7,0]},{op:'end'}])(0x18:part 14-0xB=3 装 163;0x1A:row17=ATTACK_STRENGTH 写 7)。5) runEquipScript(gs,501,2)。6) 读 gs.rgEquipmentEffect[3].rgwAttackStrength[2] / gs.PlayerRolesRuntime.rgwAttackStrength[2] / gs.iCurEquipPart。
- **预期**: sdlpal script.c:838-847:0x18 设 g_iCurEquipPart 后,后续 0x1A 不写 base PlayerRoles 而写 rgEquipmentEffect[part] 覆盖层(装备脚本加的 stat 进可卸下的效果层)。脚本结束 PAL_RunTriggerScript 末尾(script.c:3476)g_iCurEquipPart=-1,防泄漏到后续无关脚本误写覆盖层(2026-05-29 P1#4)。对应 ts equip-effect.ts:186-212 setPlayerStatRow redirect + :341-443 try/finally reset。
- **验证**: (a) 肉眼:console 无报错。(b) 数据级:第 6 步 window.__game.gs.rgEquipmentEffect[3].rgwAttackStrength[2]===7(0x1A 经 redirect 写覆盖层);gs.PlayerRolesRuntime.rgwAttackStrength[2]===50(base 不变,路径 game-state.ts:438 PlayerRolesRuntime.rgwAttackStrength[role]);gs.iCurEquipPart===-1(脚本结束已 reset,路径 game-state.ts:1021,初始 -1)。

---

## D15 — 毒系统(0x29 玩家中毒抗性 gate / 每回合扣血 tick / cure / 敌普攻附毒 / 头像染色)
*可测性: fully-testable*

**已知边界/排除**: 头像染色(uibattle.c:114-162 bPoisonColor mono 重染:中毒队员单色染 + 死亡黑白)纯渲染层,无独立 gs 字段,只能肉眼验,已并入各用例 verify(a),不单列数据级用例。0x2C cure-by-level 在 ts 里 items.poison level 未完整 plumb(event-system.ts:3712-3724 注「简版按 level cap=99 视为全清」),但 0x2B cure-by-kind(curePlayerPoisonByKind,event-system.ts:4151)与战斗胜利全清(battle-system.ts:2151 curePlayerPoisonByLevel(gs,roleId,3))走真逻辑——D15-2 用这两条路径测,不依赖未 plumb 的 0x2C level 过滤。真毒 object id 约 551-562(基础 4 / 高级 8,数据驱动)。玩家毒 tick 的精确每回合扣血数由毒 wPlayerScript(0x1B 负 delta)决定、逐毒不同,用例只断言「中毒成立 / HP 单调减少 / 清零后停降」这类可观察方向,不写死具体掉血数。

### D15-1 玩家中毒后每回合自动扣血(tickPostAction 玩家毒 tick)
- **前置**: ?skip-intro=1 进李逍遥房间 → Cmd/Ctrl+Shift+D 开 devpanel → 按 P 强制三人入队 → 按 L 满血(便于看清掉血)→ 按 B 打开 battle picker。先在 console 跑 `__game=window.__game` 备用。选一支带附毒普攻(attackEquivItem 非 0)或可被我方投毒/中毒法术作用的敌队进入战斗。
- **操作**: 进战斗后让我方某队员中毒:途径任选——(a) 我方对己方投掷毒物品/施中毒法术(0x29);或(b) 拖几回合让带 attackEquivItem 的敌人普攻命中我方队员。中毒成立后,各队员每回合随便选攻击或 D=Defend 把回合走完,连续推进 2-3 个回合,盯住中毒队员血条。
- **预期**: sdlpal 真值:玩家中毒后,每当一轮 action queue 耗尽(postAction)就遍历该队员 16 毒槽跑 wPlayerScript 对其扣血(fight.c:1657-1700 区段;ts 对应 battle-system.ts:2023-2036 tickPostAction 玩家毒 tick,逐 slot 跑 ps.wPoisonScript)。中毒由 0x29 施加,抗性 `RandomLong(1,100) > poisonResistance` 才中(event-system.ts:3688 等价:`<= resist 则 skip`)。
- **验证**: (a) 肉眼:中毒队员血条每过一回合自动下降一截,且其战斗头像被单色染(uibattle.c:114-162 bPoisonColor);(b) 数据级:console 跑 `window.__game.gs.rgPoisonStatus` —— 这是 Record<string,{wPoisonID,wPoisonScript}>,key 形如 `${slot}_${roleId}`(game-state.ts:875/454-457);中毒队员对应 key 应出现 wPoisonID!==0 且 wPoisonScript>0 的条目。再读该队员当前 HP:`window.__game.gs.battleState.players[i].roleId` 取得 roleId 后查 `window.__game.gs.PlayerRolesRuntime.rgwHP[roleId]`(game-state.ts:435)—— 无外部伤害时它每回合应严格单调变小。

### D15-2 cure / 战斗胜利解玩家毒后停止扣血、毒槽清零
- **前置**: 承接 D15-1 已有队员中毒(`gs.rgPoisonStatus` 含该 roleId 的非空毒条目)。准备解毒手段:Cmd/Ctrl+Shift+D 开 devpanel → 按 I 加一个按种类解毒的道具(scriptOnUse 走 0x2B curePoisonByKind);或直接用「打赢这场」验证胜利全清(battle-system.ts:2151 对全队 curePlayerPoisonByLevel(gs,roleId,3))——后者可按 K 一键 KO 全部敌人触发胜利结算。
- **操作**: 解毒路径任选其一:(a) 战斗内对中毒队员使用按种类解毒的道具(走杂项盒→道具→使用,目标选该队员),施用后再推进 1-2 回合观察;或 (b) 按 K 一键 KO 全敌进入胜利结算,结算完成后查毒状态。先在解毒/胜利动作前 console 记下 `window.__game.gs.rgPoisonStatus` 里该 roleId 的毒条目作对照。
- **预期**: sdlpal 真值:cure 玩家毒 = 0x2B(by kind,curePlayerPoisonByKind→该毒槽 wPoisonID 清 0,event-system.ts:4151-4159)/ 战斗胜利对每角色 PAL_CurePoisonByLevel(role,3) 全清(battle-system.ts:2143-2151)。清后该队员不再每回合掉血。
- **验证**: (a) 肉眼:解毒/胜利后该队员头像恢复满色(不再单色染),血条不再每回合自动下降;(b) 数据级:解毒/胜利前先 console 记 `window.__game.gs.rgPoisonStatus`(看到该 roleId 非空毒条目)→ 用道具或赢战后再读同字段,对应 `${slot}_${roleId}` 条目应变为 wPoisonID:0(或整条被清);若战斗内 cure 后续走回合,该 roleId 的 `gs.PlayerRolesRuntime.rgwHP[roleId]` 不再因毒下降。

### D15-3 敌人中毒后每回合扣血 + 0x28 抗性 gate(tickEnemyPoison + resistanceToSorcery)
- **前置**: ?skip-intro=1 → devpanel(Cmd/Ctrl+Shift+D)→ P 三人 → M 给某队员学一个『中毒敌人(scriptOnUse 0x28)』的法术,或 I 加一个投掷毒物品(scriptOnThrow 0x28)→ B 进任一战斗。进战斗后先 console 读各敌抗性:`window.__game.gs.battleState.enemies.map((e,i)=>[i,e.resistanceToSorcery])`(battle-state.ts:94,0-10;0=必中毒,便于稳定复现)。
- **操作**: 战斗中对某个敌人施放中毒法术 / 投掷毒物品(目标选该敌)。施放后连续推进 2-3 回合(我方不再攻击该敌,改打别的或防御),盯住该敌血条。
- **预期**: sdlpal 真值:0x28 apply enemy poison 仅当 `RandomLong(0,9) >= enemy.wResistanceToSorcery` 才入毒槽(script.c:1185-1230;ts createBattleState 把 resistanceToSorcery 带入 battle-state.ts:94 供判定);中毒后每回合 postAction 遍历该敌 poisons 跑 scriptEntry(=毒 wEnemyScript)对其扣血(sdlpal fight.c:1645-1648 / ts battle-system.ts:2037-2050 tickPostAction 敌毒 tick)。
- **验证**: (a) 肉眼:该敌血条在我方未再攻击它时仍每回合自动下降;(b) 数据级:console 跑 `window.__game.gs.battleState.enemies[N].poisons`(battle-state.ts:101,Array<{poisonId,scriptEntry}>)—— 中毒成立后应出现至少一条 scriptEntry>0 的毒;记 `window.__game.gs.battleState.enemies[N].e.health`,推进一回合后再读应严格变小。抗性 gate 验证:挑一个 resistanceToSorcery 高(如 ≥8)的敌反复施毒,其 poisons 数组应『经常仍为空』(被 gate 挡);对比 resistanceToSorcery=0 的敌必入毒。

### D15-4 敌普攻附毒命中我方(attackEquivItem scriptOnUse,fight.c:5139)
- **前置**: ?skip-intro=1 → devpanel → P 三人 → L 满血 → B 进战斗后先在 console 找带附毒普攻的敌:`window.__game.gs.battleState.enemies.map((e,i)=>[i,e.e.attackEquivItem,e.e.attackEquivItemRate])`,需 attackEquivItem 非 0 且 rate 较高;若全为 0,Esc 退出换别支敌队再试(蜜蜂/僵尸/蜘蛛/瘟神类带附毒)。
- **操作**: 进战斗后不要速杀,故意拖多个回合(我方持续 D=Defend 或攻击别的敌),放该附毒敌反复普攻命中我方队员。被命中数次后观察被打队员是否中毒。
- **预期**: sdlpal 真值 fight.c:5139-5146:敌物理命中后,若 `iCoverIndex==-1 && !fAutoDefend && attackEquivItemRate >= RandomLong(1,10) && PAL_GetPlayerPoisonResistance(role) < RandomLong(1,100)` → 跑 rgObject[attackEquivItem].item.wScriptOnUse(目标=被打队员)等价 0x29 单体毒之。ts 已 wired:battle-system.ts:1864-1866 每次 attack 都传 equivPoison ctx;attack.ts:286-308 在敌→我命中后按 `rate >= rng(1,10) && getPlayerPoisonResistance(gs,roleId) < rng(1,100)` 跑 item.scriptOnUse。
- **验证**: (a) 肉眼:被附毒普攻命中的队员之后头像被单色染、血条开始每回合自动下降;(b) 数据级:被打前后对比 `window.__game.gs.rgPoisonStatus`(roleId 取自 `gs.battleState.players[i].roleId`)—— 多次被附毒普攻命中后应出现该 roleId 的非空毒条目(wPoisonID!==0)。注:此分支受 rate 与抗性双重随机,挑 rate 高、poisonResistance 低(或李逍遥早期)的组合多打几回合更易触发;若拖足够多回合、命中很多次仍始终为空 [],说明该附毒链未真触发,应作为发现项标注。

---

## D16 — 协力合击 CooperativeMagic(HP 代价=costMP / str=Σ(攻+法)/4 / 装备 override 改合击)
*可测性: partially-testable*

**已知边界/排除**: 【真机设施纠正,务必先看】任务简介里写的 devpanel 键(I 加道具 / M 学法术 / C 清包 / F 加钱 / K KO / L 满血 / G 切 build / T 对话 / 数字跳场景 / 「Test 4 Styles」)在本仓库 dev-panel.ts:159-182 实际并不存在。真实只有三个全局键:B(开 picker，battle-fixtures + 状态调试 section)、F1(console dump gs 深拷贝)、P(强制 [0,1,2] 三人入队)。所有协力测试只能经 B 打开 picker 后点击 fixture 按钮(battle-fixtures.json)或「★ 法术测试」按钮进入战斗，没有独立的满血/KO/学法术热键。下列用例已按真实 picker 重写。

【验证字段的硬限制 —— 这是本 D 项最大的不可测点】performCoopMagic 扣的是战斗局部投影对象 res.playerRoles.roles[roleId].hp(battle-system.ts:1973-1983 传入 projectRuntimeToBattleRoles 产物，bootstrap.ts:847 是 startBattleHandler 内的局部变量)。该对象【不挂在 gs 上】，window.__game 只暴露 { gs, assets, presentCtx }(bootstrap.ts:796-798)。因此【战斗进行中无法用 gs 读到队员 coop 扣血的精确值】——gs.PlayerRolesRuntime.rgwHP[roleId] 只有在战斗结束 writeBackBattleRolesToRuntime(game-state.ts:1318-1329) 回写后才更新。所以队员 HP 代价的数据级验证只能【打完整场战斗后】读 gs.PlayerRolesRuntime.rgwHP[roleId]，或【战斗中肉眼看队员 HP 条】，无法在 console 精确取中途值。敌人血量没有此问题：gs.battleState.enemies[i].e.health 是 gs 上实时对象(battle-state.ts:73-76 BattleEnemy.e: Enemy，单测亦读 state.enemies[0]!.e.health)，可实时读。

【默认合击是单体，不是全体】roles 0/1/2 的 base cooperativeMagic = obj 386/381/339 → magicNumber 86/79/88，全部 type='normal' / applyToAll=false / usableToEnemy=true(object-magics.json + magic.json 真值核对)。所以默认 3 人队发起协力是【单体】伤害(走 fight.c:4026-4043 单体分支)，不会自动打全体。装备改合击可触发全体/召唤分支,例如圣灵珠 row65 覆盖到 obj351「武神」(summon)。

【装备 override 改合击子部分】projectRuntimeToBattleRoles 的 lastNonzeroEquip('rgwCooperativeMagic') 逻辑存在(装备末非 0 槽 override base coopMagic)。dev-panel 通用 fixture 不一定方便手动改装备,但真实角色/剧情装备可自然触发;巫后路径已暴露 obj351「武神」summon 型协力,并由 coop-magic.test.ts 覆盖。

【其余未验子部分】聚拢/施法/滑回动画(D17 合击 timeline)属 present 层,肉眼可看但非本 D 数据点。Summon 型协力已按原版分支接入召唤神动画;伤害仍走本 D16 的 HP 代价 + str=Σ(攻+法)/4 结算链。

### D16-1 三人满血发起协力合击对单敌造成伤害(单体分支 + str=Σ(攻+法)/4)
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。按 B 开 picker，点击「fixture-end: 通关前(满级 3 人 vs 强敌)」按钮(battle-fixtures.json:party=[0,1,2]，三人 hp/maxHP=9999 level99，全 healthy → 协力图标可选)。进战斗后等轮到李逍遥(role0)选动作。
- **操作**: 战斗主菜单 4 图标用方向键把光标移到第 3 个图标「合击」(selectedAction=2，battle-system.ts:866)→ Confirm。因 role0 coopMagic=obj386(magicNumber86,type normal,usableToEnemy,applyToAll=false → 单体)→ 进 selectTargetEnemy，用方向键选一个敌人 → Confirm 发动。
- **预期**: sdlpal fight.c:4026-4043 单体分支:def = e.wDefense + (e.wLevel+6)*4，sDamage=PAL_CalcMagicDamage(str,def,resist,1,wObject)，sDamage<=0→1，e.wHealth -= sDamage。str 来自 fight.c:3982-3995:对每个 healthy contributor str += PAL_GetPlayerAttackStrength + PAL_GetPlayerMagicStrength，最后 str/=4(三人 → str 远高于单人魔法)。coop-magic.ts:92-97 即此(asShort 求和后 Math.trunc(/4))。
- **验证**: (a) 肉眼:三人精灵聚拢→施法演出后，被选中那一个敌人血条下降、冒蓝色伤害数字(coop-magic.ts:127/162 color:'blue')。(b) 数据级(gs 上实时):发动前在 console 记 window.__game.gs.battleState.enemies.map(e=>e.e.health)，发动后再读，确认【仅被选目标】那个 enemy 的 e.health 减少(其它敌人不变 → 证明默认走单体非全体)，减少量 = sDamage >=1。字段路径 gs.battleState.enemies[i].e.health 已对 battle-state.ts:73-76 + coop-magic.test.ts:103 确认。

### D16-2 协力对全体 healthy 队员扣 HP 代价(代价=合击 magic.costMP，从 HP 扣不是 MP)
- **前置**: 同 D16-1:?skip-intro=1 → B → 点「fixture-end」(三人满血满蓝)进战斗。注意:role0 协力 obj386→magic86 costMP=9;此 9 是【从 HP 扣的代价】不是扣 MP(object-magics.json/magic.json 真值)。
- **操作**: 轮到 role0 时选「合击」(同 D16-1)发动一次。然后【继续把这场战斗打完】(可对其余轮次按 A=Auto 自动攻击，直到胜利回大世界)——因为队员 coop 扣血只有战斗结束才回写 gs。
- **预期**: sdlpal fight.c:3954-3978:对每个 coopContributors[i]==TRUE(healthy)的队员 rgwHP[role] -= lprgMagic[wMagicNum].wCostMP(协力的「MP 消耗」字段实际从【HP】扣，这是协力 HP 代价的核心);若扣后 (SHORT)rgwHP<=0 强制置 1(永不因协力而死)。coop-magic.ts:83-88 即此(role.hp -= magic.costMP，<=0→1)。三人都 healthy → 三人各扣 9 HP。
- **验证**: (a) 肉眼(战斗中):发动协力后三名队员 HP 条各掉一点(=9)，MP 条不因此变(扣的是 HP 不是 MP)。(b) 数据级(战斗结束后):打完战斗回大世界，console 读 window.__game.gs.PlayerRolesRuntime.rgwHP[0/1/2] 与 rgwMP[0/1/2]。因 fixture 起手 hp=9999，发动一次协力后 rgwHP 应是 9999 减去【协力扣的 9】再减去过程中受的敌方伤害;若想干净验证可只发动协力且尽快 KO 敌人。关键确认点:rgwHP 有下降而 rgwMP[0/1/2] 仍≈999(协力没扣 MP)。字段 gs.PlayerRolesRuntime.rgwHP/rgwMP 已对 game-state.ts:435-436 + writeBackBattleRolesToRuntime:1326-1327 确认。【局限见 excludedNote:中途精确扣血值无法用 gs 读】。

### D16-3 协力图标的可选性门控:本人 healthy 且 healthy 人数>1 才能选(<=1 人不可发起)
- **前置**: ?skip-intro=1 → B → 点「fixture-end」三人满血进战斗(此时三人全 healthy)。作为对照，再用 picker 顶部「战斗状态调试」section 或单人 fixture 制造仅 1 人 healthy 的局面(如 fixture-zh1 party=[0] 单人)。
- **操作**: 局面 A(三人满血):轮到 role0 把光标移到第 3 图标「合击」，观察该图标是否【可选/高亮可 Confirm】。局面 B(单人 fixture-zh1):同样把光标移到「合击」，观察是否【被禁用/灰显/Confirm 无反应】。
- **预期**: sdlpal CLASSIC fight.c 协力门控 = 本人 PAL_IsPlayerHealthy 且全队 healthy 人数>1(wMaxPartyMemberIndex>0)。healthy 的濒死阈值为 `min(100,maxHP/5)`,不是无上限的 `maxHP/5`。battle-system.ts 的 `isActionValid` case 2 会统计 healthy 人数,本人 healthy 且人数>1 时才允许选择。单人队因此无法发起;若选定后因状态变化导致执行时只剩一名 healthy 队员,coop-magic.ts 会按原版退化为普通攻击并播放普攻动画,不会静默跳过。
- **验证**: (a) 肉眼:三人满血时「合击」图标可正常选中并进入目标选择;单人队时「合击」图标无法 Confirm(被门控)。(b) 数据级:进战斗后 console 读 window.__game.gs.battleState 确认 players.length(三人=3/单人=1)、selectedAction(方向键移到合击应=2，battle-state.ts:382)、uiState(三人发动后应短暂为 'selectTargetEnemy'，单人则停留 'selectMove'/menuState 'main')。字段 gs.battleState.players / selectedAction / uiState 已对 battle-state.ts:341/382/372 确认。

---

## D17 — 战斗动画/演出(物理攻击/受击/死亡淡出/敌 idle/伤害数字/法术链/召唤神)
*可测性: partially-testable*

**已知边界/排除**: 明确未做 / 不要给它编用例的子部分(代码里 defer 标注,不该让用户测):
1) iBlow 吹飞位移(法术命中后敌/队员被吹飞)—— anim-timeline.ts:460-465、483-484、1014 标 defer,纯函数不 mutate per-enemy pos,本切片恒不产生位移。
2) wWave 屏幕波动(法术屏波)—— anim-timeline.ts:1014 标 defer，未建模。
3) trance 入定/变身演出 —— anim-timeline.ts:9 文件头明确 "trance 留后续叶子(明确 defer)"，battle-state.ts:148 该 action type 是 stub。
4) keepEffect 烙背景(0xFFFF 把法术特效烙进战斗背景)—— anim-timeline.ts:483、1014 标 defer。
5) 召唤神演出(buildSummonGodSequence + buildSummonBrightenTimeline)代码已写(anim-timeline.ts:737-804），但触发它需要 summon action（battle-state.ts:147 summon type 在 M5 是 stub，handler 只 console.debug 不影响 outcome），devpanel B picker 无召唤入口、无任一队员会召唤魔法的现成 fixture，普通真机路径打不出来 → 不给召唤神编可照做用例。

可测程度说明：物理攻击链 / 物理受击+死亡帧 / 敌人死亡淡出(deathFadeStep 72 步)/ 敌人 idle 轮播 / 伤害数字 / player 攻击魔法链(PreMagic→OffMagic→PostMagic 的 overlay)/ DefMagic 治疗辉光 / 敌方攻击魔法落点 这些都能真机触发并在 gs.battleState 查到数据级证据，故 partially-testable（核心物理+法术 overlay 可测，summon/iBlow/wWave/trance 不可测）。

devpanel 现实(已读 dev-panel.ts:159-179 确认，与任务 brief 的键位不同)：实际全局键只有 B(开 picker，explore 和 battle 都能开)、F1(console dump gs 深拷贝)、P(强制三人队 [0,1,2])。没有全局 K/L/I/M 键。B picker 里是:每个 ⚔ Battle Fixtures 按钮点一下直接进对应敌队战斗;★「法术测试」按钮 = 三人队、level 99、hp/maxHP 9999、mp 999、magicStrength 200、学全各自技能、vs 敌队 7(5 敌);⚔「战斗状态调试」section 的按钮挂状态到 P0。用例据此写。

### D17-1 玩家物理攻击全链:冲刺帧8/9 + 命中特效 overlay + 敌闪白 + 蓝色伤害数字 + 敌掉血
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间(mode=explore)。按 B 开 dev picker,点任意一个 ⚔ Battle Fixtures 按钮(选一个 1-2 敌的小队即可,例如最上面那条)进入战斗。等进入 selectAction 阶段(底部出现 4 图标主菜单)。先开 console 准备查 window.__game.gs.battleState。
- **操作**: 主菜单默认高亮『攻击』(selectedAction=0)。按 Confirm 键确认攻击 → 进入选敌目标(uiState='selectTargetEnemy',敌人上方出现目标箭头)。再按 Confirm 选中当前敌人提交。等单人队时本队全选完即进 performAction,李逍遥会冲到敌人面前出招。攻击动画播放期间(约 0.5 秒,8 帧)在 console 反复执行 window.__game.gs.battleState.battleAnim 观察,或动画刚结束后查 enemies[0].e.health。
- **预期**: 对照 anim-timeline.ts:120-213 buildPlayerAttackTimeline(fight.c:2008-2263):frame0 攻击者 currentFrame=8 冲到敌前 (敌x+64, 敌y+20),Delay(2)=80ms;frame1 x-=10/y-=2;frame2 攻击者 currentFrame=9 + 敌 iColorShift=6(闪白)+ 蓝色伤害数字(damageNum color='blue',anim-timeline.ts:185-189),同帧起 3 帧 lpEffectSprite 命中特效 overlay(kind='effect' spriteChunk=10,frameIdx=effectFrameBase+i,落点 敌y-敌高/3+10 每帧 x-=16/y+=16);frame5-7 敌人抖动 3 帧(x 序列 ex-8/ex-4/ex-6)后复位。命中后敌 health 按伤害减少。
- **验证**: (a) 肉眼:李逍遥从站位冲到敌人正前方、挥击(精灵换帧),敌人身上出现一个命中特效精灵闪现,敌人整体闪白一下并左右抖动,敌人头顶弹出蓝色伤害数字(present-battle.ts:128 消费 showDamageNum)。(b) 数据级:动画进行中 window.__game.gs.battleState.battleAnim 非 undefined,battleAnim.overlay.kind==='effect' 且 .spriteChunk===10(命中帧);动画中查 battleState.enemies[0].iColorShift===6(命中染色帧)/ .currentFrame 在攻击期被 anim 写;动画完后 battleState.battleAnim===undefined,且 battleState.enemies[0].e.health 比战斗开始的 enemies[0].prevHp 减少(掉血量 = 弹出的蓝色数字);攻击者 battleState.players[0].currentFrame 动画期间出现过 8 与 9(冲刺/出招帧,battle-state.ts:57 注释 8,9=攻击)。

### D17-2 敌人死亡淡出:deathFadeStep 0→72 crossfade 渐隐,期间战斗暂停
- **前置**: URL ?skip-intro=1 → 按 B → 点 ★『法术测试(三人各自技能 vs 5 敌)』(三人 hp9999/mp999/学满技能/magicStrength200,vs 敌队 7 共 5 敌,这样玩家伤害高、能一击秒掉弱敌触发淡出)。进入战斗后开 console。
- **操作**: 李逍遥用『攻击』或选『法术』对准一个敌人猛打,直到把某个敌人打到 health<=0。在该敌人 HP 归零的那一下,立刻在 console 反复执行:window.__game.gs.battleState.battleFade 和 window.__game.gs.battleState.enemies.map(e=>e.deathFadeStep)。淡出约持续 72×16ms≈1.15 秒,期间多查几次看 step 递增。
- **预期**: 对照 battle-system.ts:1344-1378 checkEnemyDeaths + tickBattleFade(PAL_BattleFadeScene,battle.c:608-682 + fight.c:889-893):敌 health<=0 且 deathFadeStep===undefined 时置 0(开始淡出)并开 state.battleFade={elapsedMs:0};tickBattleFade 每 tick elapsedMs+=40ms,deathFadeStep=floor(elapsedMs/16) cap 72;到 72 → 死敌 deathFadeStep=72(隐,draw 不画)、清 battleFade。battle-state.ts:114-123 注释:72 步每步 16ms 共 1152ms。淡出期间战斗推进暂停(tickBattleFade 返回 true 提前 return,battle-system.ts:376)。
- **验证**: (a) 肉眼:被打死的敌人精灵不是瞬间消失,而是逐步 crossfade 渐隐成它下方的背景像素(draw-battle-sprites.ts:137-141 blitFrameDeathFade),约 1 秒淡完;淡出期间其它战斗动作停住。(b) 数据级:死敌瞬间 window.__game.gs.battleState.battleFade 从 undefined 变成 {elapsedMs:数字};该敌 battleState.enemies[i].deathFadeStep 从 0 递增(连续查能看到 0→十几→几十),最终 ===72;淡完后 battleState.battleFade 回到 undefined;该敌 enemies[i].e.health<=0 且 deathFadeStep===72。注意:其它活敌 deathFadeStep 仍为 undefined。

### D17-3 敌人物理攻击 + 我方受击:队员 currentFrame=4 受击姿 + iColorShift=6 红闪 + 击退 + 蓝伤害数字
- **前置**: URL ?skip-intro=1 → 按 B → 选一个会主动物理攻击玩家的小敌队 fixture(任意普通敌队即可,只要敌人会近身物理攻击)。建议先不要用法术测试(那个 hp9999 不易看出受击),用普通 fixture 让敌人能打到队员。进战斗后开 console。
- **操作**: 玩家这一轮随便选个动作(例如『防御』:主菜单方向键切到杂项/或直接让李逍遥攻击),把回合走完进入敌方行动。观察敌人冲过来打李逍遥(player 0)。在敌人命中李逍遥那一下反复查 console:window.__game.gs.battleState.players[0].currentFrame 和 .iColorShift 和 .pos。
- **预期**: 对照 anim-timeline.ts:250-353 buildEnemyPhysicalTimeline(fight.c:4910-5149):敌人先施法/前移帧,冲到队员前 (队员x-44, 队员y-16);命中帧 target.currentFrame=4(受击姿)+ iColorShift=6 + 蓝色伤害数字(anim-timeline.ts:313-317,damageNum color='blue' target kind='player');下一帧 iColorShift=0 + 队员击退 pos+=(8,4);死亡 frameBak=2/濒死 frameBak=1;最后敌人复位回 posOriginal currentFrame=0。
- **验证**: (a) 肉眼:敌人精灵冲到李逍遥面前挥击,李逍遥换成受击姿势(frame 4)、闪红一下、被往右下击退一点,头顶弹出蓝色伤害数字。(b) 数据级:命中瞬间 window.__game.gs.battleState.players[0].currentFrame===4 且 .iColorShift===6;紧接一帧 .iColorShift===0 且 .pos 相比 .posOriginal 向右下偏移(x≈posOriginal.x+8, y≈+4);动画完后 battleState.battleAnim===undefined,players[0] 经 resetFightersAfterAction(battle-anim-driver.ts:81-98)复位:活着且非濒死则 currentFrame===0、iColorShift===0、pos 回到 posOriginal;李逍遥当前 HP 下降(查 battleState 内该 player 投影 role 的 hp,或战斗结束后 window.__game.gs.PlayerRolesRuntime.rgwHP[0] 比战前低,game-state.ts:435/1326 回写)。

### D17-4 玩家攻击魔法链:施法帧5/6 + cast 特效(PreMagic)+ FIRE.MKF 法术 sprite overlay 落敌(OffMagic)+ 敌抖动(PostMagic)
- **前置**: URL ?skip-intro=1 → 按 B → 点 ★『法术测试(三人各自技能 vs 5 敌)』(三人都学满技能、mp999、灵力200,vs 5 敌)。进战斗后开 console。
- **操作**: 主菜单方向键把 selectedAction 切到『法术』(=1)按 Confirm → 进法术选择网格,选一个攻击法术(例如李逍遥的御剑/伤害类法术)按 Confirm → 选一个敌人目标按 Confirm。进 performAction 后施法演出播放(比物理攻击长)。演出期间反复查 console:window.__game.gs.battleState.battleAnim.overlays 和 .overlay 和 players[0].currentFrame。
- **预期**: 对照 anim-timeline.ts:386-431 buildPreMagicTimeline(fight.c:2337-2445)→ caster 上移 4 帧、currentFrame=5(施法手势)、非 summon 10 帧 cast 特效 overlay(kind='effect' spriteChunk=10 落 caster 头顶);anim-timeline.ts:486-571 buildPlayerOffMagicTimeline(fight.c:2608-2844)→ i==fireDelay 帧 caster currentFrame=6,法术 sprite overlay(kind='magic' spriteChunk=magic.effect=FIRE.MKF chunk,落敌 pos+偏移);末尾 shake 帧带 screenShake;anim-timeline.ts:591-632 buildPostMagicTimeline(fight.c:3189-3246)→ 受伤敌抖动 3 帧(dist 8→-4→2)+ i==1 帧 iColorShift=6 + 复位。伤害数字走 pendingDamageNums,时间线播完才 emit(battle-anim-driver.ts:60-68 + battle-state.ts:290-300,对照 PAL_BattleDisplayStatChange 在 magic anim 之后)。
- **验证**: (a) 肉眼:施法者上抬一点、摆施法姿势,头顶先出现一段 cast 特效,然后法术特效精灵(FIRE.MKF)飞/落到敌人身上逐帧播放,命中后敌人抖动,法术演出结束后才弹出蓝色伤害数字、敌人掉血。(b) 数据级:PreMagic 期 window.__game.gs.battleState.battleAnim.overlay.kind==='effect' 且 .spriteChunk===10(cast 特效);切到 OffMagic 期 battleAnim.overlays[0].kind==='magic' 且 .spriteChunk===该法术 magic.effect(非 10,是 FIRE.MKF chunk 号),.overlays[].frameIdx 随帧推进;施法者 battleState.players[0].currentFrame 在演出中出现过 5(PreMagic 手势)与 6(OffMagic 施法帧);若该法术 magic.shake>0,shake 帧 battleAnim.frames[idx].shake 存在;动画起手时 battleAnim.pendingDamageNums 已挂(数组非空),动画播完(battleAnim 变 undefined)那一刻才 emit 伤害数字、敌 enemies[target].e.health 下降。

### D17-5 敌人 idle 轮播:无动作时敌人精灵按 idle 时钟换帧(currentFrame=undefined 驱动)
- **前置**: URL ?skip-intro=1 → 按 B → 选一个含 idleFrames>1 的多帧 idle 敌人 fixture(普通敌队即可;若敌人 idleFrames=1 则静止不轮播,属正常)。停在 selectAction 阶段(主菜单出现,不要急着出招),让敌人处于纯 idle 站立状态。开 console。
- **操作**: 什么都不按、停在主菜单选择阶段,盯着敌人精灵看几秒。在 console 反复执行:window.__game.gs.battleState.enemies.map(e=>e.currentFrame),以及 window.__game.gs.frameNum(确认时钟在走)。
- **预期**: 对照 battle-state.ts:604-608 + battle-anim-driver.ts:100-106:敌人 idle 期 currentFrame 恒为 undefined(不是 0);draw-battle-sprites.ts:298-306 computeIdleFrameIndex(frameNum, idleFrames, idleAnimSpeed)=floor(frameNum/idleAnimSpeed)%idleFrames 由渲染时钟驱动轮播(fight.c:1015-1018:idleFrames<=1 退化为定帧 0)。即 idle 帧不存进 state,而是每帧渲染时按 gs.frameNum 算出来,所以战斗态里敌人 currentFrame 应一直是 undefined。
- **验证**: (a) 肉眼:敌人站着时精灵在做轻微的待机循环动画(多帧 idle 的敌人,如左右摆动/呼吸),不是定格一张图(若该敌 idleFrames=1 则确实定格,正常)。(b) 数据级:selectAction 阶段 window.__game.gs.battleState.enemies[i].currentFrame === undefined(关键:不是 0,battle-state.ts:605-607 注释明说置 0 会冻结轮播),且 .iColorShift===0、.deathFadeStep===undefined(活着未淡出);同时 window.__game.gs.frameNum 在持续增大(时钟在走 → 渲染层据此轮播)。出招/受击动画期间该字段才会被 anim 写成具体帧号,动画完 resetFightersAfterAction 又把它复位回 undefined。

---

## D18 — 战斗 UI + 选择动作菜单(主菜单4图标方向选/二级网格滚动/目标光标ColorShift闪/当前队员箭头/友方目标箭头)
*可测性: fully-testable*

**已知边界/排除**: 更正:我此前曾误用错误路径(packages/web/src/present/battle/,不存在)一度判 D18 为 stub —— 那是错的,请忽略该判断。真实实现在 packages/game/src/present/battle/draw-battle-ui.ts(662 行完整 port)+ packages/game/src/core/battle/battle-system.ts(tickSelectAction 及全套 handler),代码齐全且 1:1 引 sdlpal uibattle.c 行号。本次用例基于已干净读完的真实文件。

D18 子部分中**未做/简版、不该让用户当 D18 测**的:
1. tickPerformAction(battle-system.ts:1275-1283)是 stub(`// ... 大量 perform 逻辑` + 全 void),所以「按 Confirm 真正执行动作的演出/伤害」不属 D18 可测范围(那是 D17)。D18 只测「选择阶段」的 UI 与状态机:确认动作后看 pendingActions/phase 是否正确填充即可,不要测打出去的伤害。
2. 敌方目标光标高亮在 sprite 层(draw-battle-sprites.ts:91 enemyTargetHighlightShift,uibattle.c:1495-1510),敌方 selectTargetEnemy 阶段**无箭头**(draw-battle-ui.ts:255-260 注释明示),靠选中敌精灵 ColorShift 闪;友方 selectTargetPlayer 才有箭头(sprite 67/66 闪)。测敌方目标请看「选中敌精灵闪 + gs.battleState.uiCursor 跳活敌」,别找箭头。
3. 底部队员信息框 sprite 化已做(drawPlayerInfoBoxes),但「时间槽 time-meter bar」CLASSIC 无、中毒头像色/状态字简版省略部分细节(draw-battle-ui.ts:300 注释)——非 D18 动作菜单核心,本组用例不覆盖。
4. revertToPreviousPlayer(battle-system.ts:1258)第一个队员时「回 explore 确认菜单」被简化为「留原地」(注释明示 M3 简化),Menu 键在首队员的回退行为别按原版苛求。

devpanel 键的精确行为(B 选敌队/P 三人/I 加道具/M 学法术/L 满血/K KO)我从 battle-devtools.ts 文件头注释确认存在(B 键战斗 picker、强制组队、KO、满血;window.__game 暴露 gs/startBattle),但该文件正文在本次会话工具多次返回空/重复行(环境间歇故障),**未能逐行确认每个键的字母绑定**。下方用例的 devpanel 操作按任务说明给定的键(B/P/I/M/L)写;若实际字母绑定与说明不符,以 battle-devtools.ts registerBattleDevtools 真值为准。这是诚实标注,非编造。

### D18-1 主菜单 4 图标方向选 + 高亮/灰项(selectedAction)
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。按 devpanel 'B' 选一个普通晕样敌队进战斗(不要选 boss);如需多人可先按 'P' 强制三人入队。进战斗后等出现左下角 4 个图标(攻击/法术/合击/杂项)。
- **操作**: 进战斗 → 依次按方向键:上(选攻击) → 下(选杂项) → 左(选法术) → 右(选合击)。每按一下肉眼看哪个图标变全彩(高亮)。
- **预期**: sdlpal uibattle.c:1034-1055(handleMainMenuInput 镜像,battle-system.ts:805-811):上→selectedAction=0攻击 / 下→3杂项 / 左→1法术(仅 valid 时) / 右→2合击(仅 valid 时)。选中图标全彩 blit(draw-battle-ui.ts:395-396),其余可用图标 MonoColor(0,-4)灰阶(draw-battle-ui.ts:398),不可用 MonoColor(0x10,-4)更暗(同:400)。单人队时合击(2)永远不可用(更暗)——isActionValid case 2:`state.players.length<=1` 返回 false(battle-system.ts:631)。
- **验证**: (a) 肉眼:按上 4 个图标中「攻击」变亮;按下「杂项」变亮;按左「法术」变亮;按右「合击」变亮(若单人队合击是暗灰且按右不高亮,仍停在上个选项)。 (b) 数据级 console:每次按键后查 `window.__game.gs.battleState.selectedAction` = 0/3/1/2;同时 `gs.battleState.uiState==='selectMove'` 且 `gs.battleState.menuState==='main'`;`gs.battleState.selectingPlayerIdx` = 当前行动队员索引。

### D18-2 杂项盒 5 项环动 + miscMenuCursor 跨次持久
- **前置**: 同 D18-1 进战斗(B 选普通敌队)。在主菜单。
- **操作**: 按方向键下选中「杂项」图标 → 按 Confirm 键进杂项盒(出现 围攻/道具/防御/逃跑/状态 五项竖列)。连按 Down 几下看光标循环;再按 Menu/Cancel 退回主菜单;再次进杂项盒看光标是否停在上次位置。
- **预期**: 进杂项:confirmMainAction case 3 → menuState='misc'(battle-system.ts:875-877,uibattle.c:1157-1163)。五项 ['围攻','道具','防御','逃跑','状态'](draw-battle-ui.ts:83,WORD.DAT 56-60)。Down/Right → miscMenuCursor=(+1)%5 环动(battle-system.ts:956-958,uibattle.c:416-468)。选中项闪烁色 selectedColor()(draw-battle-ui.ts:454)。Cancel → menuState='main'(battle-system.ts:960-962)。重进杂项盒 cursor **不重置**(sdlpal g_iCurMiscMenuItem 跨次持久,battle-state.ts:388 注释 uibattle.c:1162 //disabled)。
- **验证**: (a) 肉眼:杂项盒弹出五行中文;按 Down 闪烁高亮逐项下移且从「状态」环回「围攻」;退出再进高亮仍在上次那项。 (b) 数据级:进后 `gs.battleState.menuState==='misc'`;每按 Down 后 `gs.battleState.miscMenuCursor` 0→1→2→3→4→0 循环;Cancel 后 `gs.battleState.menuState==='main'`,且重进后 miscMenuCursor 与退出前相同(不归 0)。

### D18-3 法术二级网格滚动 + MP 显示 + 灰项
- **前置**: 进战斗前先按 devpanel 'M' 给当前队员学多个法术(最好 >3 个以触发多行网格),'L' 满血满蓝保证有 MP。然后 'B' 进普通敌队。在主菜单。
- **操作**: 主菜单按左选中「法术」 → Confirm 进法术网格。连按方向键(右=+1/下=+3列)移动光标。看右上 MP 需求/当前随光标变;看 MP 不够的法术是否变灰。
- **预期**: 主菜单 confirm case 1 → menuState='magicSelect' + buildBattleMagicSelect(battle-system.ts:862-864,uibattle.c:1107-1113)。网格 3列×5行分页(draw-battle-ui.ts:99-100;magicmenu.c:57-59)。gridNavigate:右 +1/左 -1/下 +3列/上 -3列,钳[0,n-1]不 wrap(battle-system.ts:732-747,magicmenu.c:67-116)。灰项 = MP 不足或非 usableInBattle(battle-system.ts:701,magicmenu.c:347-368),光标可停灰项但 Confirm 被拒(battle-system.ts:1015)。右上 MP box 显示选中法术 needed / 当前 MP(draw-battle-ui.ts:509-518,读 gs.PlayerRolesRuntime.rgwMP[roleId])。
- **验证**: (a) 肉眼:弹出多列法术网格 + 左上金钱框 + 右上 MP 框;按方向键光标(精灵/cursor)跳动,选中项闪烁,MP 不够的法术暗灰。 (b) 数据级:进后 `gs.battleState.menuState==='magicSelect'`;移光标后 `gs.battleState.magicSelect.cursor` 随方向变(右+1/下+3),`gs.battleState.magicSelect.items[cursor].disabled` 对 MP 不足项为 true;右上显示的当前 MP 与 `gs.PlayerRolesRuntime.rgwMP[gs.battleState.players[gs.battleState.selectingPlayerIdx].roleId]` 一致。

### D18-4 敢方目标光标 ColorShift 闪(选中敌闪烁,无箭头)+ uiCursor 跳活敌
- **前置**: 按 'B' 选一个「多个敌人」的敌队(如 2-3 只同屏),保证有多个活敌可在之间切。在主菜单。
- **操作**: 主菜单按上选「攻击」 → Confirm。进入选敌阶段后连按 Right/Down(下一活敌)、Left/Up(上一活敌)几次。肉眼盯哪个敌人精灵在闪烁变色(而非头顶箭头)。
- **预期**: 攻击 confirm case 0(非群攻武器)→ uiState='selectTargetEnemy' + uiCursor=首活敌(battle-system.ts:851-859,uibattle.c:1089-1105)。选敌阶段**无箭头**,选中敌靠 sprite 层 ColorShift 闪(draw-battle-ui.ts:255-260 注释 + draw-battle-sprites.ts:91 enemyTargetHighlightShift,uibattle.c:1495-1510)。导航 findNextAlive 跳过死敌(battle-system.ts:1137-1162,uibattle.c:1428-1556)。仅 `state.uiCursor===i` 的敌拿到 highlightShift,其余 0(draw-battle-sprites.ts:105-109)。Cancel → 回主菜单(battle-system.ts:1157-1160)。
- **验证**: (a) 肉眼:选中的敌人精灵周期性变色闪烁,未选中敌不闪;没有头顶箭头(箭头是友方目标才有);按 Right/Left 闪烁的那只切到下/上一活敌。 (b) 数据级:进后 `gs.battleState.uiState==='selectTargetEnemy'`;移光标后 `gs.battleState.uiCursor` 变为下/上一个 `health>0` 的敌索引(跳过 health<=0),且 `gs.battleState.iPrevEnemyTarget===gs.battleState.uiCursor`。

### D18-5 友方目标箭头(治疗物品/法术)+ 当前队员头顶箭头
- **前置**: 按 'P' 强制三人入队(友方目标需多人才能切)。按 'I' 加一个「可使用」的恢复类物品(如回血药)。然后 'B' 进普通敌队。在主菜单。
- **操作**: 主菜单按下选「杂项」→Confirm → 在杂项盒选「道具」(cursor 1)→Confirm 进物品二级 → 选「使用」(cursor 0)→Confirm 进物品网格 → 选那个恢复物品 →Confirm。进入选友方阶段后按 Down/Up 切队员,看哪个队员头顶有闪烁箭头。另外全程看当前行动队员头顶是否一直有一个闪烁箭头。
- **预期**: 使用物品 → enterTargetForDraft(toEnemy=false)→ uiState='selectTargetPlayer' + uiCursor=selectingPlayerIdx(battle-system.ts:1040-1045/1071-1073,itemmenu use → 友方)。友方目标**有箭头**:sprite 67常/66红 闪烁画队员头顶 anchor.y-67(draw-battle-ui.ts:641-661,uibattle.c:1564-1576)。导航 Up/Down → uiCursor=(±1)%n(battle-system.ts:1170-1173,uibattle.c:1558-1620)。另外当前行动队员头顶**始终**有一个 CURRENTPLAYER 箭头(sprite 69常/68红,anchor.y-74)——uiState≠hidden/wait 时无条件画(draw-battle-ui.ts:228-231/622-634,uibattle.c:994-1007)。
- **验证**: (a) 肉眼:进选友方阶段后某队员头顶出现闪烁箭头(红/常交替),按 Down/Up 箭头在队员间移动;同时当前行动队员头顶始终有另一个箭头闪烁。 (b) 数据级:进后 `gs.battleState.uiState==='selectTargetPlayer'`;初始 `gs.battleState.uiCursor===gs.battleState.selectingPlayerIdx`;按 Down/Up 后 uiCursor 在 0..players.length-1 循环;全程 `gs.battleState.selectingPlayerIdx` 是当前行动队员(头顶当前队员箭头指它)。若该物品/法术是群体(applyToAll),CLASSIC 会同 tick 提交 target=-1,不画友方全体箭头。

---

## D21 — 战斗结束清状态/毒/Extra(curePoisonByLevel 3 + removeEquipmentEffect Extra)
*可测性: partially-testable*

**已知边界/排除**: 两个设施事实更正(已核对源码):
- console 运行时 hook 是 `window.__game.gs`(bootstrap.ts:796-798 `(window).__game = { gs, assets, presentCtx }`)——任务里写的 window.__game.gs 正确,下面用例都用它。
- battle picker 实际 fixture 只有 6 个(battle-fixtures.json,**没有 goblin-3**):fixture-zh1(队长 lv10 vs 弱怪,team1,party[0])/ fixture-zh2 / fixture-end / fixture-anim / fixture-dialog / fixture-levelup(lv1+6000exp vs 灯笼 30HP,单敌,最快稳赢)。用例用 fixture-levelup(快速秒杀单敌)做清毒胜利路径,用 fixture-zh1 做半血恢复(可被弱怪打掉点血)。
- 任务提示的 K(KO)/L(满血)/I(加道具)/M(学法术) 全局键在本仓库**不存在**:dev-panel.ts:159-179 只注册 B(picker)/P(强制三人队)/F1(GameState dump)三个全局键。毒/状态注入靠 B picker 顶部「⚔ 战斗状态调试」section 的按钮(dev-panel.ts:346-400)。

不要让用户测以下子部分(无可靠真机入口或自动满足):
1) removeEquipmentEffect(role, kBodyPartExtra=6) 清临时 Extra 装备效果槽(sdlpal battle.c:1829)——唯一写 Extra 槽(gs.rgEquipmentEffect[6])的是战斗 opcode 0x30(battle-opcodes.ts:559-600,梦蛇等敌脚本对玩家施放 temp +N% stat buff)。dev panel **没有任何按钮/键能注入 0x30 的 Extra buff**,上述 fixture 的敌人也不施放此 op,用户无法可靠地先造出非零 Extra 槽再观察被清。清逻辑(removeEquipmentEffect 把 rgEquipmentEffect[6] 该 role 行全部归零,equip-effect.ts:229-261)只有单测覆盖,真机 0 verified 保留。
2) PAL_ClearAllPlayerStatus(battle.c:1825)——ts 战斗内 status 是 battle-local(存 gs.battleState.players[i].status,随 gs.battleState=undefined 整体丢弃),自动满足、无显式清状态代码可验(battle-system.ts:2144-2145 注释明说)。dev「混乱/睡眠」等按钮设的就是 battleState.players[0].status,本就随战斗结束消失,不是 D21 的独立可测点。
3) 敌人施毒(opcode 0x28)真实中毒路径需敌脚本带真 poison object + 抗性判定,上述 fixture 不带、用户不可控;用 dev「中毒 poison」按钮等价注入 rgPoisonStatus 替代。

可测部分:curePlayerPoisonByLevel(role, 3) 战末清毒(dev「中毒 poison」按钮注入,胜利/逃跑两路都清)+ 胜利专属半血恢复 + level≤3 清 / level==99 不清的边界。

### D21-1 胜利后清毒:中毒打赢战斗 → rgPoisonStatus 被清零
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。按 B 开 dev picker → 点 ⚔ Battle Fixtures 里 'fixture-levelup'(lv1+6000经验 vs 灯笼 30HP,单敌,快速稳赢;battle-fixtures.json fixture-levelup)。战斗开始后**再次按 B** 开同一面板,在顶部 '⚔ 战斗状态调试' section 点 '中毒 poison(战末解)' 按钮(dev-panel.ts:380-383 设 rgPoisonStatus['0_0']={wPoisonID:5,wPoisonScript:0},console.log `[dev] P0(role 0)中毒 rgPoisonStatus[0_0]=id5`,点后自动关面板)。
- **操作**: 1) 中毒注入后 console 先验:`window.__game.gs.rgPoisonStatus['0_0']` 应为 {wPoisonID:5, wPoisonScript:0}。2) 回到战斗,按 A(Auto 自动攻击,input.ts:54 KeyA='Auto')让李逍遥自动攻击,或反复按 Enter 选攻击+选灯笼,把灯笼打死。3) 看完胜利结算屏(获得经验/文钱/升级框/学法术,按 Enter 逐屏翻过)直到画面回到房间。
- **预期**: sdlpal battle.c:1822-1830 在 PAL_BattleMain 返回后**无条件**(不在 if(i==kBattleResultWon) 内)对每 role 跑 PAL_CurePoisonByLevel(w,3)(battle.c:1828)。ts:胜利走 tickBattleSettlement→finishBattleWon(battle-system.ts:2244)→finalizeBattleCleanup(2150-2151 `curePlayerPoisonByLevel(gs, roleId, 3)`)。dev 注入的 wPoisonID=5 在 object-poisons.json level=0(≤3 且 ≠99)→ 被清为 {wPoisonID:0, wPoisonScript:0}(event-system.ts:4200-4209 `level !== 99 && level <= maxLevel`)。
- **验证**: (a) 肉眼:战斗结束回到房间。(中毒色只影响战斗内头像 draw-battle-ui.ts:307,战后无战斗界面—主要靠数据验)。(b) 数据级:console `window.__game.gs.rgPoisonStatus['0_0']` — 战后应 {wPoisonID:0, wPoisonScript:0};同时 `window.__game.gs.mode === 'explore'` 且 `window.__game.gs.battleState === undefined`(battle-system.ts:2158-2159)。可按 F1 dump 整个 gs 交叉核 rgPoisonStatus 整段全 wPoisonID:0。

### D21-2 逃跑后也清毒:中毒 → 逃跑 → rgPoisonStatus 被清(覆盖无条件分支)
- **前置**: URL 加 ?skip-intro=1。按 B → 点 'fixture-zh1'(队长 lv10 vs 弱怪,team1,单人队 party[0])进战斗。战斗中再按 B 开面板,点 '中毒 poison(战末解)'(注入 rgPoisonStatus['0_0']={wPoisonID:5,wPoisonScript:0},自动关面板)。
- **操作**: 1) console 先验 `window.__game.gs.rgPoisonStatus['0_0'].wPoisonID === 5`。2) 在战斗中按 Q(Flee=逃跑,input.ts:58 KeyQ='Flee'),持续按直到成功逃离战斗(逃跑可能多轮才成,多按几次)回到房间。
- **预期**: sdlpal battle.c:1822-1830 的清毒分支是**无条件**的(won/lost/fled 都走,不在 kBattleResultWon 守卫内)。ts 逃跑走 phase='fleed'→finalizeBattle(battle-system.ts:2123)→finalizeBattleCleanup(2138 `state.phase==='lost'?'lost':'fled'`→2151 curePlayerPoisonByLevel(role,3))。故逃跑后毒同样被清。
- **验证**: (a) 肉眼:战斗界面消失,回到房间 explore。(b) 数据级:console `window.__game.gs.rgPoisonStatus['0_0']` 应 {wPoisonID:0, wPoisonScript:0};`window.__game.gs.mode==='explore'`;`window.__game.gs.battleState===undefined`。与 D21-1 对比证明清毒**不依赖胜负**（覆盖 battle.c:1822 无条件分支）。

### D21-3 边界:level==99 装备毒战末不清(curePoisonByLevel 只清 ≤3)
- **前置**: URL 加 ?skip-intro=1。按 B 进 'fixture-levelup'(单敌灯笼,快速胜)。战斗中用 console 手动注入一个 level-99 毒(模拟寿葫芦类装备授的常驻'毒')+ 一个 level-3 毒对比。在 console 跑:`window.__game.gs.rgPoisonStatus['0_0']={wPoisonID:247,wPoisonScript:0}; window.__game.gs.rgPoisonStatus['1_0']={wPoisonID:262,wPoisonScript:0}`(object-poisons.json 里 id247 level=99、id262 level=3)。
- **操作**: 1) 注入后 console 确认 `window.__game.gs.rgPoisonStatus['0_0'].wPoisonID===247`(lv99)、`['1_0'].wPoisonID===262`(lv3)。2) 按 A(Auto)或反复 Confirm 把灯笼打死,翻完结算屏回到房间。
- **预期**: sdlpal global.c:1604-1612 PAL_CurePoisonByLevel 只清 `g.rgObject[w].poison.wPoisonLevel <= wMaxLevel(=3)`;level==99 装备常驻毒**保留**(那是 PAL_RemoveEquipmentEffect 卸 Wear 时才清,global.c:1413-1454,非战末)。ts curePlayerPoisonByLevel(event-system.ts:4205-4208)守卫 `level !== 99 && level <= maxLevel`→ id247(lv99)跳过不清、id262(lv3)清。
- **验证**: (a) 数据级(核心):战后 console 查 — `window.__game.gs.rgPoisonStatus['0_0'].wPoisonID` 仍为 **247**(lv99 未被清,证明边界正确);`window.__game.gs.rgPoisonStatus['1_0']` 为 **{wPoisonID:0, wPoisonScript:0}**(lv3 已清)。(b) 肉眼:无明显视觉差异(均在数据层,以 console 为准)。这条专防清毒退化成'一刀切全清'。

### D21-4 胜利专属半血恢复(Phase F,逃跑/战败不触发)
- **前置**: URL 加 ?skip-intro=1。按 B 进 'fixture-zh1'(队长 lv10 vs 弱怪,单人队 party[0];弱怪能打掉你点血但不致死)。为看出半血恢复,需让 P0 HP 低于 maxHP。
- **操作**: 1) 进战斗后**不要**一上来就 A 秒杀 — 故意拖几个回合(按 D 防御或手动选攻击)让弱怪打掉 P0 一些 HP。2) 准备打最后一击前,console 记下当前战斗血 `window.__game.gs.battleState.players[0].prevHp`(battle-state.ts:48,战前/上轮血快照)与 `window.__game.gs.PlayerRolesRuntime.rgwMaxHP[0]`。3) 把弱怪打死,翻完结算屏回到房间。4) console 查恢复后 HP。
- **预期**: sdlpal battle.c:1342-1372(PAL_CLASSIC)仅胜利后 HP += (maxHP-HP)/2、MP += (maxMP-MP)/2。ts finishBattleWon(battle-system.ts:2235-2243)在 finalizeBattleCleanup 之前先 writeBackBattleRolesToRuntime 回写战斗 HP→runtime(game-state.ts:1326),再对每 role 跑 `rgwHP[role] = hp + floor((maxHP-hp)/2)`、rgwMP 同。**仅胜利**触发（逃跑/战败走 finalizeBattle 不过此分支,D21-2 不恢复）。
- **验证**: (a) 肉眼:回到房间后按 Q/打开主菜单选状态屏,看 P0 HP 比战斗结束时的残血高(约补一半差额)。(b) 数据级:设战末回写后、半血前 HP=H、`window.__game.gs.PlayerRolesRuntime.rgwMaxHP[0]`=M;战后查 `window.__game.gs.PlayerRolesRuntime.rgwHP[0]` 应 ≈ H + floor((M-H)/2)。MP 同理查 rgwMP[0] vs rgwMaxMP[0](PlayerRolesRuntime 字段 game-state.ts:433-436)。

---

## D22 — 偷盗 StealFromEnemy(逻辑 + 偷窃冲刺动画 + 居中"获得 X"框)
*可测性: fully-testable*

**已知边界/排除**: 真机触发只有「飞龙探云手(spell 377,scriptOnSuccess=43144→opcode 71 anim + opcode 106 steal,stealRate=6)」一条路径,它仅由全局脚本 0x55 [377,1,0] 授给 role 0 李逍遥;devpanel「★ 法术测试」按钮的 roleMagics(0) 会扫到这个 0x55 grant,故李逍遥的法术菜单里会出现飞龙探云手——这是唯一可走的真机施法入口(没有 devpanel 直加任意法术/直接调 dispatchBattleOpcode 的键)。

「偷钱」分支(fight.c:5257-5266,wStealItem==0 时 c=nStealItem/RandomLong(2,3)、dwCash+=c、框显「获得 N 文钱」)在 devpanel 现有 fixture 里**测不到**:法术测试用的 team 7 = [蛹,蜜蜂,蛹,蜜蜂,蜜蜂],蛹(id7)是偷物(stealItem=148 蛊),蜜蜂(id6)stealItem=0 但 stealItemCount=0(&& 短路无效果)——没有 stealItem==0 且 stealItemCount>0 的敌人槽位。要真机核偷钱需新加一个含「偷钱型」敌人(如 enemy id 20:stealItem=0,stealItemCount=500)的 fixture,当前 dev 设施做不到,故偷钱分支这里不给可照做用例(单测 battle-opcodes.test.ts:1268/1292 已覆盖,但属非真机)。

偷窃冲刺动画(buildStealTimeline,fight.c:5218-5246:玩家 frame10 冲到敌前 5 步逼近 + 第5步敌闪白 iColorShift=6)是 present 层逐帧位移,只能肉眼看「李逍遥精灵冲向目标蛹、蛹闪一下白」,无逐帧 gs 字段可断言(动画跑完即复位),故动画部分仅列肉眼验证、不给数据级断言。

### D22-1 偷物成功:飞龙探云手偷蛹身上的蛊 → 库存多1个蛊 + 居中框「获得 蛊」
- **前置**: URL 加 ?skip-intro=1 进游戏。按 B 开 devpanel,点「★ 法术测试(三人各自技能 vs 5 敌)」按钮进战斗(team 7=[蛹,蜜蜂,蛹,蜜蜂,蜜蜂],李逍遥 role0 含飞龙探云手 spell377,灵力/HP 拉满)。进战斗后先在 console 记下初始库存:`window.__game.gs.inventory.find(e=>e.itemId===148)?.count ?? 0`(蛊 id=148,初始通常 0)。
- **操作**: 轮到李逍遥行动时,在战斗动作菜单选「法术」→ 列表里选「飞龙探云手」→ 进敌人 target picker,用方向键把光标移到一只**蛹**(健康血量较高的槽位,enemies 里 e.health 较大那只;或先 console 看 `window.__game.gs.battleState.enemies.map(x=>x.e.stealItemCount)` 找 stealItemCount===1 的槽位)→ 按 Confirm 施放。偷窃 stealRate=6(roll 0..10 ≤6 才成功,约 64%),失败就下一回合再对同一只蛹施一次,直到成功。
- **预期**: sdlpal fight.c:5253-5263 偷物分支:`nStealItem-- ; PAL_AddItemToInventory(wStealItem=148, 1)`;fight.c:5288-5296 CLASSIC `PAL_StartDialog(kDialogCenterWindow)+PAL_ShowDialogText`,文案 `%ls@%ls@`=PAL_GetWord(34「获得」)+物品名红色(text.c:1504 @toggle 红)。ts battle-opcodes.ts:654-665 对应:stealItemCount--、inventory 加 itemId 148、battleDialogQueue 推 `{text:'获得@蛊@',style:'narration',clearBefore:true}`。
- **验证**: (a) 肉眼:李逍遥精灵冲向被选的蛹、蛹闪一下白(iColorShift=6),随后战斗场景上覆一个**居中单行阴影框**显示「获得 蛊」(蛊二字红色)。(b) 数据级:施放成功后 console 查 `window.__game.gs.inventory.find(e=>e.itemId===148).count` 比施放前 +1;同时 `window.__game.gs.battleState.enemies[被偷槽位].e.stealItemCount` 从 1 变 0;框出现期间 `window.__game.gs.battleState.battleDialogQueue` 或 `window.__game.gs.dialogBox` 含「获得」「蛊」文本(BattleDialogLine.style==='narration')。

### D22-2 偷尽即无:同一只蛹偷成功后再偷 → stealItemCount 已 0,无任何获得、库存不再增
- **前置**: 接 D22-1 已对某只蛹偷成功一次(该槽位 `enemies[i].e.stealItemCount===0`)。console 记下当前蛊数量 `window.__game.gs.inventory.find(e=>e.itemId===148).count`。
- **操作**: 下一个李逍遥回合,再次「法术」→「飞龙探云手」→ target picker 选**同一只已被偷空的蛹**(stealItemCount 已 0 那只)→ Confirm 施放。可重复 2-3 次确认。
- **预期**: sdlpal fight.c:5253 `if (g_Battle.rgEnemy[wTarget].e.nStealItem > 0 && ...)` 的 `&&` 左操作数为假 → 整段偷取跳过,不抽 RandomLong、不改库存、不显示框(ts battle-opcodes.ts:637 `if ((enemy.e.stealItemCount ?? 0) > 0)` 守卫,0 时直接跳)。注意施法动画(opcode 71)仍会播,但偷取逻辑无效果。
- **验证**: (a) 肉眼:法术动画照常播(李逍遥冲刺),但**不弹**「获得 X」居中框。(b) 数据级:`window.__game.gs.inventory.find(e=>e.itemId===148).count` 与施放前**相等(不变)**;`window.__game.gs.battleState.enemies[该槽位].e.stealItemCount` 保持 0;`window.__game.gs.battleState.battleDialogQueue` 无新增「获得」行。

### D22-3 偷物入库正确性:偷得的蛊作为 itemId 148 进 gs.inventory,数量上限 99 钳制逻辑可核
- **前置**: URL ?skip-intro=1。按 I 之类无效——本作用先按 B → 点「★ 法术测试」进战斗。若想验证「已有蛊时叠加」:进战斗前 console 不便加道具,可改为连偷多只蛹(team 7 有两只蛹 slot0、slot2,各 stealItemCount=1)累计蛊数量。
- **操作**: 对 slot0 的蛹施飞龙探云手偷成功(蛊+1),再换 target 对 slot2 的另一只蛹施飞龙探云手偷成功(蛊再+1)。每次成功后 console 读库存。
- **预期**: sdlpal fight.c:5258-5259 `PAL_AddItemToInventory(wStealItem,1)` 累加同一 itemId 数量;ts battle-opcodes.ts:656-661:`inventory.find(e=>e.itemId===itemId)` 命中则 `entry.count=Math.min(99,entry.count+1)`,未命中则 push `{itemId:148,count:1}`。两只蛹各偷一次 → 蛊 count 应为 2(或在已有蛊基础上 +2)。
- **验证**: (a) 肉眼:两次施放各弹一次「获得 蛊」居中框。(b) 数据级:两次偷成功后 `window.__game.gs.inventory.find(e=>e.itemId===148).count` 比初始多 2;且 inventory 里蛊只占**一个 entry**(itemId 148 不重复出现),证明走的是「命中 entry 累加」而非重复 push;两只蛹的 `enemies[0].e.stealItemCount` 与 `enemies[2].e.stealItemCount` 都已变 0。

---

## D23 — 战斗 scripted enemy AI opcode 子集(0x67 enemy use magic + 0x64/0x68/0x91 等敌脚本分支)
*可测性: partially-testable*

**已知边界/排除**: 本 D 项核心可验链 = 敌脚本 opcode mutate 敌运行时态 → decideEnemyAction 读后行动。真机可核:0x67 写 enemy.e.magic/magicRate 后敌按概率出魔法/物理、魔法门概率 + silence/0xFFFF 边界、0x64 血量分支。以下不可真机验,勿让用户测:(1) 召唤/分裂/变身 present 渲染 —— 0x9E summon(battle-opcodes.ts:930-995)/0x9C division(863-900)/0x9F transform(902-928)逻辑实现了(push BattleEnemy 进 state.enemies),但 present 层不加载召唤兽 battle sprite(battle-opcodes.ts:935-936 注释明说留 follow-up),屏幕不画新敌人,只能 console 看 enemies.length 增加,肉眼链断。(2) 0x31 change battle sprite / 0x92 show magic anim 纯 present-only,handler no-op(battle-opcodes.ts:603-616),屏幕+gs 皆无变化,不可测。(3) 0x6B blow away 只存 state.iBlow,present 不消费位移击退(battle-opcodes.ts:510-513),肉眼看不出。(4) 0x68 jump-if-enemy-turn / 0x91 jump-if-not-first 是脚本内部控制流(battle-opcodes.ts:832-861),无独立可见输出,难独立成真机用例,不单列。(5) 实际由哪条敌 scriptOnReady 调 0x67 取决于 enemyTeam OBJECT 数据,B picker 选普通敌队 magic 多半数据内置、未必经 0x67 改写,最干净核法是 console 直接改 enemy.e.magic/magicRate 观察 decideEnemyAction(用例 D23-2/D23-3 即此法)。

### D23-1 0x67 真值:敌 magic/magicRate 设值后,会魔法的敌每回合按概率放法术
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。开 devpanel(Cmd/Ctrl+Shift+D)。按 B(KeyB)打开敌队 picker(dev-panel.ts:119-120 openBattlePicker),键入一个会魔法的敌队 id 数字、按 Enter 进战斗(dev-panel.ts:100-104)。进战斗后立刻按 L 满血满蓝防被秒。停在选择行动主菜单。
- **操作**: 1) console 跑 window.__game.gs.battleState.enemies.map(e=>({id:e.e.id,magic:e.e.magic,rate:e.e.magicRate})),记下每只敌初始 magic/magicRate(找出 magic!=0 的敌)。2) 给己方全员选 D=Defend、Confirm 提交全队行动,进 perform 放敌人行动。3) 连续观察 3-5 个回合(每回合都防御),肉眼看 magic!=0 的敌头上是否出现魔法特效/队员掉血 vs magic=0 的敌只物理冲刺。
- **预期**: sdlpal script.c:2016-2023(0x67):敌脚本把 e.wMagic=operand[0]、e.wMagicRate=(operand[1]==0?10:operand[1])。fight.c:4656-4658 敌行动时 wMagic!=0 && RandomLong(0,9)<wMagicRate && silence==0 才进魔法分支。ts 1:1:battle-opcodes.ts:1016-1024 OP_ENEMY_USE_MAGIC 写 enemy.e.magic/magicRate(rate 缺省=10);enemy-ai.ts:96-106 enemy.magic!==0 && silence===0 && rng.range(0,10)<enemy.magicRate → {type:'magic'},否则 {type:'attack'}。
- **验证**: (a) 肉眼:magic!=0 且 rate 高的敌多数回合放魔法(屏幕魔法特效 + 队员掉 HP);magic=0 的敌永远只物理冲刺。(b) 数据级:每回合 perform 前 console 查 window.__game.gs.battleState.enemies\[i].e.magic 与 .e.magicRate(字段名 resources.ts:144-145,挂 BattleEnemy.e);被打队员 HP 降 → 先 window.__game.gs.battleState.players 找该敌目标 roleId,再 window.__game.gs.PlayerRolesRuntime.rgwHP\[roleId](game-state.ts:869+430)应较行动前减少。

### D23-2 magicRate 边界:rate=10 恒放魔法 vs rate=0 恒物理(console 注入 0x67 等价效果)
- **前置**: ?skip-intro=1 进房间,开 devpanel,按 B 键入任意敌队 id+Enter 进战斗,进战后按 L 满血满蓝,停在选择行动主菜单。
- **操作**: 1) console 先看 window.__game.gs.battleState.enemies.map(x=>x.e.magic) 找一只 magic!=0 的敌,把它的 magic 值抄给目标敌:const e=window.__game.gs.battleState.enemies[0]; e.e.magic=<抄来的非0魔法object id>; e.e.magicRate=10(等价 0x67 写值)。2) 己方全员 D=Defend、Confirm 放行动,观察 enemies[0] 是否每回合都放魔法。3) 下一回合或同战另一回合把 e.e.magicRate=0,再观察是否退回纯物理。
- **预期**: sdlpal fight.c:4657 RandomLong(0,9) < wMagicRate:rate=10 → 0..9 恒 <10 → 必魔法;rate=0 → 0..9 恒不 <0 → 必物理。ts enemy-ai.ts:99 rng.range(0,10) < enemy.magicRate(range(0,10) 取 0..9)同真值。注:enemy.magic 必须非 0,magic=0 时 enemy-ai.ts:97 直接走 attack。
- **验证**: (a) 肉眼:rate=10 时 enemies[0] 每回合放魔法(特效+队员掉血);rate=0 时只见冲刺普攻。(b) 数据级:行动前 console 确认 window.__game.gs.battleState.enemies[0].e.magicRate 是你设的值;放行动后被打队员 roleId 对应 window.__game.gs.PlayerRolesRuntime.rgwHP[roleId] 下降(魔法伤害走 performMagic,battle-system.ts:1880-1907)。对照同一敌 e.magicRate 改 0 → 多回合 rgwHP 仅受物理普攻幅度、无魔法特效帧。

### D23-3 silence + 0xFFFF 哨兵边界:沉默 或 wMagic==0xFFFF → 敌不放魔法
- **前置**: ?skip-intro=1 进房间,开 devpanel,按 B 键入敌队 id+Enter 进战斗,进战后按 L 满血满蓝,停在选择行动主菜单。
- **操作**: 测 silence:1) console: const e=window.__game.gs.battleState.enemies[0]; 先抄一只会魔法的 magic id 给 e.e.magic、e.e.magicRate=10;再 e.status.silence=5(沉默 5 回合)。2) 己方全 D=Defend Confirm 放行动,观察 enemies[0] 本回合是否被压成物理(不放魔法)。 测 0xFFFF:3) 另起回合或重开战,e.e.magic=0xFFFF; e.e.magicRate=10; 己方 Defend 放行动,观察 enemies[0] 是否进了魔法分支但什么都不做(既不放法术也不冲刺,原地不动一拍 pass)。
- **预期**: sdlpal fight.c:4658 魔法门额外要求 rgwStatus[kStatusSilence]==0 → 沉默时跳过魔法分支落到物理普攻。fight.c:4663 if (wMagic==0xFFFF) goto end → 进魔法分支但直接结束(do nothing)。ts:enemy-ai.ts:98 (status?.silence??0)===0 才进魔法门;enemy-ai.ts:51+102 enemy.magic===MAGIC_SENTINEL_NOOP(0xffff) → {type:'pass'}。
- **验证**: (a) 肉眼:silence=5 时 enemies[0] 只见物理冲刺、无魔法特效;magic=0xFFFF 时 enemies[0] 这回合既无冲刺也无法术(原地不动一拍)。(b) 数据级:silence 案查 window.__game.gs.battleState.enemies[0].status.silence 应 >0(BattleStatus.silence,battle-state.ts:35);放行动后被打队员 rgwHP 仍下降(物理),但本回合无魔法特效帧。0xFFFF 案:行动后所有 window.__game.gs.PlayerRolesRuntime.rgwHP[*] 不因 enemies[0] 变化(它 pass);可对照把 magic 换成正常 id 重测见 rgwHP 下降确认差异。

### D23-4 0x64 enemy HP% 分支(jump-if-HP-above-%):敌脚本跨血量阈值前后行为不同
- **前置**: ?skip-intro=1 进房间,开 devpanel,按 L 满血,按 B 选一个 scriptOnReady 用 0x64 做血量分支的敌队(boss/较强妖怪常见);不确定时任意敌队亦可用 console 验 handler 真值。停在选择行动主菜单。
- **操作**: 1) console 记 const e=window.__game.gs.battleState.enemies[0]; e.maxHealth 与 e.e.health。2) 把它打到残血:可正常攻击几回合,或 console 直接 e.e.health=Math.floor(e.maxHealth*0.1)(降到 10%)。3) 己方 Defend Confirm 放敌行动,观察该敌行为是否在跨过 0x64 阈值后切换(从普攻切到放大招/召唤/逃跑,取决于该敌脚本分支)。
- **预期**: sdlpal script.c:1983-1993(0x64):enemy.wHealth*100 > lprgEnemy[id].wHealth(满血)*operand[0] → 跳 operand[1](HP 高于阈值走 A 分支;低于则 fall through 到 B 分支,常是更凶的招)。ts:battle-opcodes.ts:997-1014 OP_JUMP_IF_ENEMY_HP_ABOVE,maxHp 取 enemy.maxHealth(createBattleState 设=满血,battle-state.ts:84+599),cur*100 > max*pct → newIp=operand[1]。已修真值:用稳定 maxHealth 而非逐回合 prevHp(battle-opcodes.ts:1003-1006 注释)。
- **验证**: (a) 肉眼:把该敌打到低血后,其行动模式相对满血时发生可见变化(换招/特效不同/或开始召唤/逃)。(b) 数据级:console 确认 window.__game.gs.battleState.enemies[0].maxHealth 是固定满血、.e.health 已降到阈值下;对照满血时该敌 N 回合行为与残血时 N 回合行为在 enemies[0].e.magic / 是否 pass / enemies.length(若召唤)上的差异。注:0x64 只是分支跳转,具体改成什么招由该敌脚本决定 —— 验证点是跨阈值前后行为不同而非某固定招。

---

## D24 — hide 0x5C iHidingTime
*可测性: fully-testable*

**已知边界/排除**: test placeholder note

### D24-1 注入正值核每轮自减 1 且隐身期间敌整轮跳过
- **前置**: URL 加 skip-intro 参数进李逍遥房间;Cmd 或 Ctrl 加 Shift 加 D 开 devpanel;按 B 选会主动攻击的普通敌队进战斗。进战斗后 console 跑 window.__game.gs.battleState 确认对象存在、字段名就叫 iHidingTime(battle-state.ts 行 424 确认此驼峰名,默认 0)。
- **操作**: 1) console 把 battleState.iHidingTime 赋值为 2。2) 回战斗三人全按 D 即 Defend 防御并确认,放完一整轮回到下一回合选择阶段。3) console 读 battleState.iHidingTime。4) 再全 Defend 放第二轮,结束后再读该字段。
- **预期**: sdlpal CLASSIC fight.c 行 1670 到 1672:每轮结算时 iHidingTime 为正则执行自减(ts decrementHidingEffect battle-system.ts 行 1474 到 1476,在 next-turn 路径行 2087 调、turn 自增之前)。故第一轮末 2 变 1,第二轮末 1 变 0。fight.c 行 1680 的 turnStart 脚本与 fight.c 行 1716 的敌行动仅在 iHidingTime 等于 0 才跑 → ts runEnemyTurnStartScripts 行 1435 与 perform gate 行 1688:隐身正值整轮内敌方 turnStart 脚本不跑、敌方动作不 perform(敌人整轮不出手)。
- **验证**: (a) 肉眼:iHidingTime 为正的两轮里敌人不发起任何攻击或施法;归 0 那轮起敌人恢复行动;归 0 瞬间是否有淡入仅观察不硬判(见 excludedNote)。(b) 数据:每轮末读 gs.battleState.iHidingTime 依次为 1、0;隐身正值的回合我方 gs.PlayerRolesRuntime.rgwHP 不下降(无毒或状态自伤前提),敌人血量读 gs.battleState.enemies 索引 i 的 e.health(battle-state.ts 行 75 e 为 Enemy 副本 health 字段)确认敌人仍活只是没出手。

### D24-2 核 0x5C 取反语义激活前存负值 perform 阶段才翻正
- **前置**: 同 D24-1 进入一场敌我双方都会行动的战斗;devpanel 已开;console 可访问 window.__game.gs.battleState。
- **操作**: 1) 选择阶段(还没进 perform)console 把 battleState.iHidingTime 赋值为 -3(模拟 script.c 行 1911 取反后真值即 operand 为 3 时存 -3)。2) 立即读一次确认是 -3。3) 三人选动作并确认,进入 perform 动作逐个执行时再读 battleState.iHidingTime。
- **预期**: sdlpal script.c 行 1911:0x005C 把 iHidingTime 存为负的 operand 即负数(ts OP_HIDE_PARTY battle-opcodes.ts 行 506 同写负的 operand,缺省取 0)。CLASSIC PAL_BattleCheckHidingEffect fight.c 行 3529 到 3532:perform 处理动作前若 iHidingTime 为负则纯取反成正,无乘 20。ts activateHidingEffect battle-system.ts 行 1466 到 1468 在 perform 每动作前行 1682 调:-3 翻成 3。关键:激活前是负且不被 decrement(decrement 只动正值),激活后才变正开始隐身。
- **验证**: (a) 肉眼:翻正成 3 之后这几轮敌人不出手(同 D24-1)。(b) 数据:步骤 2 读应为 -3(确认存的是负值不是正 3,若 ts 直接写正即偏离 sdlpal);步骤 3 perform 后读应为正数 3(确认 activateHidingEffect 把负翻正,CLASSIC 无乘 20,不是 60)。本条专核取反加 CLASSIC 纯翻正两段真值。

### D24-3 对照组默认 iHidingTime 为 0 时敌方正常行动
- **前置**: 同上进入一场敌人会主动攻击的战斗;不注入任何 iHidingTime(保持 createBattleState 默认,battle-state.ts 行 635 init 为 0);console 可读 window.__game.gs.battleState。
- **操作**: 1) 进战斗后立即 console 读 battleState.iHidingTime 确认为 0。2) 三人全选 D 即 Defend 并确认,放完一整轮。3) 观察敌方是否正常攻击或施法。4) 轮末再读 iHidingTime。
- **预期**: sdlpal fight.c 行 1680 到 1692:iHidingTime 等于 0 时每个有效敌人跑 wScriptOnTurnStart;fight.c 行 1716 到 1717:等于 0 时敌方正常 PerformAction(ts gate 反向:runEnemyTurnStartScripts 行 1435 只在正值时 return,perform gate 行 1688 只在 isEnemy 且正值时跳过,等于 0 全部正常)。decrementHidingEffect 行 1475 对 0 不动(仅正值才减 1),轮末仍为 0。这是 D24-1 与 D24-2 的基线,证明敌跳过确由 iHidingTime 非 0 引起而非别的原因。
- **验证**: (a) 肉眼:敌人正常发起攻击或施法,画面与战斗动作里能看到敌方出手。(b) 数据:gs.battleState.iHidingTime 步骤 1 与步骤 4 都读 0(确认默认值且 decrement 不误动 0);敌人攻击后我方 gs.PlayerRolesRuntime.rgwHP 可能下降(对照 D24-1 隐身期不掉血),敌人血量 gs.battleState.enemies 索引 i 的 e.health 确认敌人存活。此条不依赖注入,纯对照基线。

---

## D25 — 战斗内 magic scriptOnSuccess 治疗/复活(0x1B/1C/1D heal + 0x22 复活)
*可测性: fully-testable*

**已知边界/排除**: 用真实游戏数据(events/all.json 解码确认)能完整覆盖 0x1B 单体/全体治疗、0x1B 只对活人生效、0x22 复活只对死人生效。不该让用户单独测的点(诚实标注):

1) **治疗"具体数值"不要当 1:1 验证点**——但本 D 项里数值其实是确定的常量,源自 scriptOnSuccess 脚本操作数:气疗术(spell 296)→ events/all.json ip 43016 = opcode 0x1B operands[0,75,0] = 单体 +75 HP;五气朝元(spell 300)→ ip 39554 = 0x1B operands[1,300,0] = 全体 +300 HP;还魂咒(spell 301)→ ip 43024 = 0x22 operands[0,1,0] = 复活到 maxHP×1/10。所以治疗量验证点可给(75/300/maxHP的1/10),不是模糊的"加了点血"。装备 magicStrength **不**参与治疗量(0x1B 直接加 operand[1],global.c:1292),所以不要因为 spell-test 把灵力拉到 200 就期望治疗变多。

2) **0x1C(增 MP)单独用例未给**:气疗类里没有纯 MP 治疗的常用 spell 直接挂在起手技能上(凝神归元 spell 298 经 events 解码 ip 43018 实为 0x1B operands[0,220,0],是 +220 **HP** 不是 MP,名字误导)。0x1C/0x1D 的 handler 与 0x1B 共用同一段代码(battle-opcodes.ts:692-745 三 case 合并),0x1B 测通即覆盖三者主路径,故不再为 0x1C/0x1D 凑用例。

3) **复活后清状态/清毒**(battle-opcodes.ts:763-774,对齐 script.c:1071-1075 CurePoisonByLevel+清9状态)逻辑存在但**简版**(只清战斗内 status + gs.rgPoisonStatus 该 role 槽),用例 D25-3 只验"复活 + HP 由0变正",不深验毒/状态全清细节。

4) magic.ts 是真实 performMagic(非 placeholder);治疗/复活真逻辑在 battle-opcodes.ts。无 summon-revive 之类 stub 需排除。

### D25-1 气疗术(0x1B 单体治疗):给受伤的李逍遥加 75 HP,封顶 maxHP
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。Cmd/Ctrl+Shift+D 开 devpanel,按 B 开 picker → 点「★ 法术测试(三人各自技能 vs 5 敌)」按钮(dev-panel.ts:289-336,给李逍遥/赵灵儿/林月如 level99 + HP9999/MP999 进 vs 5 敌战斗;李逍遥 role0 起手即会气疗术 spell 296,player-roles.json role0 magic[0]=296)。进战斗后 console 把李逍遥(roleId 0)打成残血:window.__game.gs.__battleResources.playerRoles.roles[0].hp = 100(确保 < maxHP 9999 且 > 0;此为战斗内实时 HP 真源,getBattleLiveRoles 读这份,battle-system.ts:162)。
- **操作**: 轮到李逍遥行动:打开动作菜单 → 选「法术」图标(action menu icon 2 → magicSelect 网格,battle-system.ts:862)→ 在法术网格选「气疗术」→ 弹出选队员 UI(usableToEnemy=false → uiState='selectTargetPlayer',battle-system.ts:1037/1097)→ 方向键把光标移到李逍遥自己 → Confirm 确认。等施法动画 + 结算结束。
- **预期**: sdlpal script.c:867-893 case 0x001B 调 global.c:1287-1303 PAL_IncreaseHPMP:rgwHP>0 时 rgwHP += operand[1],超 maxHP 则钳到 maxHP。气疗术 scriptOnSuccess(events/all.json ip 43016)= 0x1B operands[0,75,0] → 单体(op0=0)+75 HP。ts 对应 battle-opcodes.ts:692-744(OP_INCREASE_HP)+ increaseBattleHPMP(battle-opcodes.ts:64-76)。预期:李逍遥 HP 从 100 → 175。
- **验证**: (a) 肉眼:李逍遥头像下血条/数字上升,施法处冒黄色回血数字「75」(emitDamageNum yellow,battle-opcodes.ts:50/732)。(b) 数据级:console 读 window.__game.gs.__battleResources.playerRoles.roles[0].hp === 175(=100+75);若把残血设成接近满(如 9990)再施法,验证封顶 === window.__game.gs.__battleResources.playerRoles.roles[0].maxHP(9999)不溢出。

### D25-2 治疗不复活死人:对已 KO 的队员施 0x1B 无效
- **前置**: 同 D25-1 进战斗(?skip-intro=1 → B → 「★ 法术测试」按钮 → 三人 vs 5 敌)。进战斗后在 console 把林月如(roleId 2,在 partyMembers[2])打成 KO:window.__game.gs.__battleResources.playerRoles.roles[2].hp = 0(战斗内死亡判定就是 hp===0,BattlePlayer 无独立 fainted 字段,battle-state.ts:44-66 确认)。同时把李逍遥 roles[0].hp 设残血 100 备用。
- **操作**: 轮到李逍遥行动:动作菜单 → 法术 → 选「气疗术」→ 选队员 UI 出现后,方向键把光标移到**已 KO 的林月如**(selectTargetPlayer 光标遍历全队含死人,无 alive 过滤,battle-system.ts:1274-1291)→ Confirm。等结算结束。
- **预期**: sdlpal global.c:1287 `if (rgwHP > 0)` 守卫:HP==0(死亡)的角色被普通治疗整段跳过,不加血、不复活(只有 0x22 复活术能救)。ts battle-opcodes.ts:69 `if (role.hp <= 0) return false` 早退。预期:林月如 HP 保持 0,不被治疗术救活。
- **验证**: (a) 肉眼:林月如施治疗后仍是倒地/死亡帧(present 读 live roles 画 hp==0 的死亡精灵),血条仍空。(b) 数据级:施法后 console 读 window.__game.gs.__battleResources.playerRoles.roles[2].hp 仍 === 0(完全没变)。

### D25-3 还魂咒(0x22 复活):救活 KO 的队员,HP 由 0 变 maxHP×1/10
- **前置**: 同 D25-1 进战斗(?skip-intro=1 → B → 「★ 法术测试」按钮)。该按钮经 0x55 grant 扫描给赵灵儿(role1)还魂咒 spell 301(events/all.json 确认 0x55 addMagic 把 301 授予 role1;dev-panel.ts:298-307 grantsByRole 扫到)。进战斗后 console 制造死者:把林月如(roleId 2)打 KO → window.__game.gs.__battleResources.playerRoles.roles[2].hp = 0。记下林月如 maxHP:window.__game.gs.__battleResources.playerRoles.roles[2].maxHP(spell-test 设 9999)。
- **操作**: 轮到赵灵儿行动:动作菜单 → 法术 → 在法术网格选「还魂咒」→ 选队员 UI 出现 → 方向键把光标移到**已 KO 的林月如** → Confirm 施放。等施法 + 结算结束。
- **预期**: sdlpal script.c:1086-1095 case 0x0022 单体分支:`if (rgwHP[w]==0) rgwHP[w] = maxHP[w] * operand[1] / 10` + 清毒清状态。还魂咒 scriptOnSuccess(events/all.json ip 43024)= 0x22 operands[0,1,0] → 单体复活,ratio operand[1]=1 → HP = maxHP×1/10。ts battle-opcodes.ts:747-796(OP_REVIVE_PLAYER)+ reviveOne(:757-777):role.hp===0 才生效,role.hp = floor(maxHP*ratioTenths/10)。预期:林月如复活,HP 0 → floor(9999×1/10)=999。
- **验证**: (a) 肉眼:林月如从倒地恢复成站立帧,空血条变出约 1/10 一小段血,施法处冒黄色回血数字(battle-opcodes.ts:775 emitDamageNum yellow)。(b) 数据级:施法后 console 读 window.__game.gs.__battleResources.playerRoles.roles[2].hp === 999(= floor(maxHP 9999 × 1 / 10));施法前 === 0。

### D25-4 复活术对活人无效:0x22 不影响未死队员(不当治疗用)
- **前置**: 同 D25-3 进战斗(?skip-intro=1 → B → 「★ 法术测试」按钮,赵灵儿 role1 已有还魂咒 301)。这次目标是**活着但残血**的李逍遥:console 设 window.__game.gs.__battleResources.playerRoles.roles[0].hp = 30(>0,且 < maxHP 9999;hp>0 即活人)。
- **操作**: 轮到赵灵儿行动:动作菜单 → 法术 → 选「还魂咒」→ 选队员 UI → 方向键把光标移到**活着的李逍遥**(role0,残血 30)→ Confirm 施放。等结算结束。
- **预期**: sdlpal script.c:1086 `if (rgwHP[wEventObjectID]==0)`:复活术只对 HP==0 的死者生效;对活人(HP>0)走 else 分支(script.c:1097-1099)只设 g_fScriptSuccess=FALSE,**不加血、不改 HP**(复活术不是治疗术,不能拿来给活人回血)。ts battle-opcodes.ts:760 `if (!role || role.hp !== 0) return false` 早退,HP 不变。预期:李逍遥 HP 保持 30 纹丝不动。
- **验证**: (a) 肉眼:活着的李逍遥施还魂咒后血条/血量数字不变(仍那一小截残血),无回血黄字。(b) 数据级:施法前后 console 读 window.__game.gs.__battleResources.playerRoles.roles[0].hp 始终 === 30(完全没动);对比 D25-3 复活死人时 HP 会变,本例活人不变即证 0x22 的 `hp===0` 守卫正确。

---

## D26 — 战斗内对话(scriptOnReady/scriptOnTurnStart 0xFFFF showDialog 走 dialog box 暂停战斗)
*可测性: partially-testable*

**已知边界/排除**: 已核字段(直接读源确认,用例 verify 只用这些):gs.battleState = 战斗运行时态根(game-state.ts:613,dev-panel.ts:369 实际用 deps.gs.battleState 印证);gs.dialogBox(game-state.ts:589 DialogBoxState)+ gs.dialogBoxKept(game-state.ts:598);DialogBoxState 字段 .style / .phase('typing'/'line-done'/'waiting-page-key'/'waiting-end-key',dialog-box.ts:12-16)/ .shownLines / .currentLineText;BattleState.battleDialogQueue(battle-state.ts:459)、turnStartDoneForTurn(473);BattleEnemy.scriptOnTurnStart/scriptOnReady(battle-state.ts:80-82)。tickBattleDialog 全文(battle-system.ts:1505-1595)、顶层 hold(battle-system.ts:392)、turnStart 入队(1432-1457)、scriptReady 入队(1701-1722)均核过。sdlpal 真值核过:text.c:1660-1772 CLASSIC battle dialog 走普通框、text.c:1701 PAL_DialogWaitForKeyWithMaximumSeconds(1.4)、text.c:1668-1672 #ifndef PAL_CLASSIC 的 PAL_BattleUIShowText 在 classic 编译掉、fight.c:1186-1187/1689-1690 turnStart、fight.c:1226-1227/1719-1720 ready。

重要修正(诚实标注,影响触发面):devpanel 没有 `T` 战斗对话热键。grep dev-panel.ts 确认:`Test 4 Styles` 是 picker 面板内一个按钮(dev-panel.ts:473-477),调 triggerDialogStyleTest 走的是 EVENT system(mode='event',注入 setDialogStyle*/showDialog 到 eventCursor,dev-panel.ts:823-849),不是战斗内对话,因此它不能验 D26 的 tickBattleDialog 路径。任务卡描述的『T 触发战斗对话测试』在本仓库未找到对应实现,用例不依赖它。真机触发 D26 只能靠带 scriptOnTurnStart/scriptOnReady 脚本的敌队(B 键 picker → applyFixture → startBattle,dev-panel.ts:892-898 传 enemyObjects 给敌脚本;代码注释点名 enemyId 23 跳跳蛙 / 25 怪老子 scriptOnTurnStart=42840、林月如/拜月/蜘蛛精嘲讽)。

未能 100% 确定的点:哪些 picker fixture 敌队确实带嘲讽/ready 对话脚本——battle-fixtures.json 未在本会话逐条读,用户需在 picker 里挑名字像 boss/剧情敌的项试(若选的敌队脚本字段为 0 则无对话,属正常,换一队)。narration 风格战斗对话(D26-4)依赖战斗脚本推 center window 提示(如偷取『获得X』fight.c:5288),能否在 picker 普通敌队触发取决于敌队脚本,标注为条件触发。

整体:tickBattleDialog 逻辑+单测齐(battle-dialog.test.ts 覆盖队列空放行/起首行/单行等键关框/同风格累积),但 0 真机验证;用例即首次真机核它。partially-testable 因触发依赖具体带脚本敌队、且 D26-4 的 narration 路径触发条件不确定。

### D26-1 turnStart 嘲讽对话:进战斗即弹 dialog box 并暂停战斗(选不了动作)
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。按 B 开 battle picker,选一个带 turnStart 嘲讽脚本的 boss/剧情敌队(代码注释点名林月如/拜月/蜘蛛精;或 enemyId 23 跳跳蛙 / 25 怪老子 scriptOnTurnStart=42840)。进战斗后什么都别按。
- **操作**: 战斗一进入、敌方精灵刚出现时,什么都别按,观察是否在『选动作菜单出现之前』就弹出对话框并逐字打字。先别按 Confirm,先看屏 + 查 console。
- **预期**: sdlpal 真值:scriptOnTurnStart 在玩家选动作前、每轮起手对全体活敌跑一次(fight.c:1186-1187 / 1689-1690 fTurnStart gate),脚本里 0xFFFF showDialog 进对话框;CLASSIC 走普通 dialog box(text.c:1660-1772),不是飘字(PAL_BattleUIShowText 在 classic 被编译掉 text.c:1668-1672)。ts 对齐:runEnemyTurnStartScripts 在 selectAction 进菜单前跑(battle-system.ts:386-389 phase==='selectAction' && turnStartDoneForTurn!==turn),入队后顶层 if(!battleAnim && tickBattleDialog(...)) return(battle-system.ts:392)暂停一切战斗推进。
- **验证**: (a) 肉眼:战斗刚进入就弹对话框(底/顶框逐字打字),期间没出现攻击/防御等行动图标菜单,敌我精灵静止 —— 即『先说话后选动作』。(b) 数据级(console window.__game.gs,字段已核):对话显示时 gs.dialogBox 为非 undefined 对象,有 .style 与 .phase(值见 dialog-box.ts:12-16);gs.battleState.battleDialogQueue(battle-state.ts:459)= 剩余未显示行,gs.battleState.turnStartDoneForTurn(battle-state.ts:473)=== gs.battleState.turn。

### D26-2 Confirm 推进对话到放完 → 战斗恢复(且关框键不误触普通攻击)
- **前置**: 承接 D26-1,处于 turnStart 对话弹出、暂停战斗的状态。
- **操作**: 反复按 Confirm:先按一次跳过打字(整行显满),再按结束当前行/翻页,直到对话框消失。重点看最后一个 Confirm 关框时会不会同 tick 误打出一次普通攻击。
- **预期**: sdlpal 真值:PAL_ShowDialogText 同步 blocking 等键翻页/结束,返回后 PAL_ClearKeyState 清键。ts 对齐:confirmDialog 返回 skip-typing→本 tick 显满、page-advance→喂下一行、dialog-end→关 box(battle-system.ts:1548-1574);关框那一 tick 仍返回 true 吃掉该 Confirm(battle-system.ts:1569-1573,防同键漏进战斗菜单触发普通攻击,user 2026-05-31 实测);box+队列都空后下一 tick !gs.dialogBox && queueLen===0 → return false(battle-system.ts:1508)放行战斗。
- **验证**: (a) 肉眼:对话框消失后才出现行动图标菜单(攻击/防御等),可正常选动作;结束对话那次 Confirm 没有直接打出一次普通攻击。(b) 数据级(console gs):放完后 gs.dialogBox 回 undefined、gs.dialogBoxKept 为 undefined(battle-system.ts:1509/1565);gs.battleState.battleDialogQueue 为空(length 0,feedNextBattleDialogLine shift 完 battle-system.ts:1599);重新进入选动作 = 战斗已恢复。

### D26-3 scriptOnReady 对话:敌人行动前先说话,期间战斗暂停
- **前置**: ?skip-intro=1 进房间,按 P 强制三人队、L 满血(我方不被秒、撑到敌人行动)。按 B 选一个会在攻击前喊话/带 ready 脚本的敌队(注释:ready 脚本在敌轮到时跑 fight.c:1719-1720)。若选的敌队没对话,换一队。
- **操作**: 进战斗后给我方选动作(如全员按 A=Auto 或 D=Defend)让回合推进到敌人行动阶段。观察轮到该敌人时,是否在它出手动画/特效『之前』先弹一段对话框、此刻战斗推进停住;按 Confirm 放完对话,看敌人随后才执行动作。
- **预期**: sdlpal 真值:enemy 轮到时先跑 wScriptOnReady(fight.c:1719-1724 脚本先跑、后 PerformAction),脚本里 0xFFFF showDialog 进对话。ts 对齐:tickPerformAction 里 if enemy.scriptOnReady>0 && !item.scriptReadyRan 跑 runScript(battle-system.ts:1701-1722),入队后 if battleDialogQueue.length>0 return(battle-system.ts:1722)暂停本 action 让顶层 tickBattleDialog 放完;scriptReadyRan guard 防对话暂停期间重跑;对话期间动画与行动都停(顶层 hold battle-system.ts:392)。
- **验证**: (a) 肉眼:轮到该敌人时,它出手动作/特效『之前』先弹对话框逐字打字,期间其他动作停住;放完对话后该敌人才执行攻击/法术。(b) 数据级(console gs):对话显示瞬间 gs.dialogBox 非 undefined;gs.battleState.battleDialogQueue 有待显行;放完后 gs.dialogBox 回 undefined、队列清空,敌人动作随后推进(可看 gs.battleState.currentActionIndex / actionQueue 变化)。注:scriptReadyRan 挂在 actionQueue item 上,需在 console 展开 gs.battleState.actionQueue 自查。

### D26-4 narration(居中小窗)风格战斗对话:1.4s 或任意键自动消
- **前置**: ?skip-intro=1 进房间。本用例验 tickBattleDialog 的 narration 分支(battle-system.ts:1525-1538,BATTLE_DIALOG_NARRATION_MS=1400)。触发条件:战斗脚本推出 center/narration 框(如偷取『获得X』提示 fight.c:5288 走 center window)。按 B 选会产出此类提示的敌队;若所选敌队不产 narration 提示,本用例无法触发(标注:条件触发,换敌队/换动作)。
- **操作**: 进入战斗,设法触发一段居中单行提示框(如战斗结果『获得XX』式提示)。走法一:框出现后什么都不按,数约 1.4 秒看是否自动消失;走法二:重来一次,框一出现就按任意键,看是否立刻消失。
- **预期**: sdlpal 真值:kDialogCenterWindow 在 CLASSIC 走 PAL_CreateSingleLineBoxWithShadow + TEXT_DisplayText + PAL_DialogWaitForKeyWithMaximumSeconds(1.4) 后 PAL_DeleteBox(text.c:1660-1710,1.4s 上限 text.c:1701)。ts 对齐:narration 分支累 battleDialogNarrationFrames,达 1400ms 或 input.pressed.size>0 即清 gs.dialogBox(battle-system.ts:1526-1535);被按键消时本 tick 仍 hold 吃掉该键,超时消则空队列才放行。
- **验证**: (a) 肉眼:居中单行提示框约 1.4 秒后自动消失(不按键),或按任意键时立刻消失;样式为居中单行带阴影,不是逐字长打字框。(b) 数据级(console gs):框显示时 gs.dialogBox.style === 'narration'(battle-system.ts:1525 判 box.style==='narration');自动/按键消后 gs.dialogBox 回 undefined。可在框出现到消失之间快速读 gs.dialogBox 验 style 值。

---

## D27 — 敌方攻击魔法伤害结算(enemy→player:magStr 公式 + autoDefend 除因子)
*可测性: partially-testable*

**已知边界/排除**: 路径修正:实现真实位置是 /Users/zhangxu/illegal/type-pal/packages/game/src/core/battle/magic-damage.ts 的 applyEnemyMagicDamage(行 161-228);任务描述写的 packages/core/src/... 不存在(已核实)。caller = packages/game/src/core/battle/actions/magic.ts performMagic 敌方分支(行 280-301),gate=casterIsEnemy && asShort(magic.baseDamage)>0,target= magic.type==='normal'?targetIdx:'all'。sdlpal fight.c:4772-4853 / 174-249 / 4737-4755 均已读。单测 magic-damage.test.ts:246-378(11 个 case)已全覆盖公式各分支。

verdict=partially-testable 的原因(诚实标注两处真机降可控):
1) autoDefend 用 state.rng.range(0,3)===0(1/3 概率,sdlpal RandomLong(0,2)==0,magic-damage.ts:215)。真机无强制 RNG 钩子,用户无法在单次施法里确定看到"除因子 +1"。上面用例的除因子验证只聚焦用户可控的确定分支(无 autoDefend 的基础掉血 + defending 减半),不给 autoDefend 编"必现"用例。
2) 触发链依赖敌方 AI 概率出魔法(enemy-ai.ts:96-105)。能否一回合内打出攻击魔法取决于敌队成员有无 wMagic 及 magicRate,真机有等待回合的不确定性;用例靠多回合观望 + F1 数据反推。

未做/简版子部分(不要让用户据此测 D27):
- 装备元素抗/毒抗加成略:magic-damage.ts:189 注释明示"装备抗性加成略,只取 role 基础抗"(rgEquipmentEffect 残,同 attack.ts)。带抗性装备的减伤真机对不齐 sdlpal,不要用装备测元素减伤。
- Protect 状态除因子(magic-damage.ts:216)虽实现,但真机给玩家上 Protect 的便捷途径有限:dev-panel「⚔ 战斗状态调试」的 protect 按钮只能挂到 P0(player 0 李逍遥,dev-panel.ts:374-396),无法挂到任意被瞄准队员,故 Protect 减半未单列为独立可控用例(可在 P0 被敌方魔法瞄准时附带观察,但不保证敌人正好打 P0)。
- 敌方攻击魔法的动画/受击表演(buildAndStartEnemyMagicAnim,magic.ts:559-637)属 D17 范畴,非 D27 伤害结算,本项不覆盖。

### D27-1 敌方攻击魔法基础掉血(无防御/无护体,确定分支)
- **前置**: ?skip-intro=1 进李逍遥房间。按 B 开 devpanel picker(explore 下可开)。点 picker 里的「★ 法术测试(三人各自技能 vs 5 敌)」按钮进战斗 —— 这是 dev-panel.ts:289-336 的真按钮,fixture enemyTeamId=7/field=7,三人队 HP=9999 高血便于观察。注:全局键经核实只有 B/F1/P 三个,无 K/L/I/M;高血由该按钮 fixture 自带,不需另外按 L。
- **操作**: 每个队员回合按 A(Auto 自动攻击)快速过自己的行动;然后观察敌方回合,等到某只敌人对某队员施放攻击魔法(屏幕出现法术特效落在该队员位置 + 该队员处弹出蓝色掉血数字)。可能要等几回合 —— 敌方出魔法由 AI 概率门控(enemy-ai.ts:96-105:enemy.magic!=0 && rng.range(0,10)<enemy.magicRate)。命中前后各按 F1 dump GameState。
- **预期**: 受击队员 HP 减少 sDamage。sdlpal fight.c:4833-4846:sDamage=PAL_CalcMagicDamage(magStr, playerDef, 玩家抗=100+mod, resistMult=20),magStr=(SHORT)enemy.wMagicStrength+(level+6)*6 clamp>=0(fight.c:4673-4678 / magic-damage.ts:166)。无 defending/protect/autoDefend 时除因子=1(fight.c:4836-4838 / magic-damage.ts:217)。掉血数字为蓝色(magic.ts:297 color='blue')。
- **验证**: (a) 肉眼:某队员头上蓝色数字 + 其 HP 下降。(b) 数据级:战斗内玩家 HP 真源是模块级 getBattlePlayerRoles()(battle-system.ts:144-167)——console 取 getBattlePlayerRoles()?.roles[roleId].hp 比对施法前后;或按 F1 dump 看 gs.battleState.players[i].roleId 定位队员,再看 gs.PlayerRolesRuntime.rgwHP[roleId](game-state.ts 接口:435)持久写回。掉血量 = magic-damage.ts:218 trunc(dmg/1) 钳到 HP 后的 delta。

### D27-2 defending 防御减半(用户可控的确定除因子)
- **前置**: 同 D27-1:?skip-intro=1 → B → 点「★ 法术测试」进战斗。
- **操作**: 选一个常被瞄准的队员,本回合给他按 D(Defend,memory wasd-keys:D=Defend)进入防御;等敌方对该防御队员施攻击魔法,记其掉血(F1 dump 前后)。下一轮该队员不防御,再被同类敌方魔法命中,记掉血。对比两次。
- **预期**: 防御回合掉血 ≈ 不防御回合的一半。sdlpal fight.c:4836 `sDamage /= ((fDefending?2:1)*...)`,magic-damage.ts:217 divisor 含 (slot.defending?2:1):trunc(满伤/2) vs 满伤。
- **验证**: (a) 肉眼:同一队员防御回合的蓝字明显小于不防御回合。(b) 数据级:两次都 F1 dump,确认防御那次 gs.battleState.players[i].defending===true(battle-state.ts:51),掉血 = trunc(满伤/2)。注意 rngFactor∈[1.0,1.1)(formulas.ts:118)每次施法±10% 抖动,看趋势是约一半,不是精确整除。

### D27-3 AoE 攻击魔法跳过已死队员(skip dead)
- **前置**: 同 D27-1 进「★ 法术测试」战斗。需要某队员被打到 HP=0(濒死倒地)——靠自然战况打到 0,或让该队员不防御反复挨打。
- **操作**: 当某队员 HP 已为 0(倒地帧)后,等敌方放 AoE 攻击魔法(magic.type!=normal → target='all',magic.ts:284)命中全队;留意倒地的死亡队员是否再掉血。AoE 命中前后各按 F1 dump。
- **预期**: AoE 只对存活队员结算,HP=0 的队员不出现新掉血、不在结果集。magic-damage.ts:179 `if (!slot || !role || role.hp <= 0) continue`;sdlpal fight.c:4782 skip dead player。
- **验证**: (a) 肉眼:AoE 特效铺全屏,但倒地队员无新蓝字。(b) 数据级:AoE 前后 F1 dump,死亡队员 gs.PlayerRolesRuntime.rgwHP[roleId] 保持 0、运行时 getBattlePlayerRoles().roles[roleId].hp 不变;活着的队员 HP 下降。

### D27-4 magStr 公式数据级核对(magicStrength + level)
- **前置**: 同 D27-1 进「★ 法术测试」战斗(team7)。先按 F1 dump 一次,记下要观察的那只敌人 gs.battleState.enemies[i].e.magicStrength 和 e.level。
- **操作**: 多回合收集同一只敌人对同一队员(选无防御、无护体的回合)的攻击魔法掉血数次,记录数值带(F1 dump 前后逐次比对)。
- **预期**: magStr=(SHORT)magicStrength+(level+6)*6(fight.c:4673-4678 / magic-damage.ts:166)。法术测试队员 level=99 → def=role.defense+(99+6)*4 很大(magic-damage.ts:183),calcBaseDamage 基础段占比小,掉血主要由 magic.baseDamage + 元素倍率决定(resistMult=20 → 倍率=10-(100+抗)/20,magic-damage.ts:205 / formulas.ts:130-140),稳定在窄区间。
- **验证**: (a) 肉眼:同敌同目标多次蓝字落在相近数值带。(b) 数据级:用记下的 e.magicStrength/e.level 手算 magStr,代入 calcMagicDamage(formulas.ts:112-158,def=role.defense+(level+6)*4、resistMult=20、rngFactor 取 1.0 算下界 / 1.1 算上界)得掉血区间,对照实测多次掉血落在该区间内(验区间不验单点,因 rngFactor 抖动)。

---

## D2 — 5 actions: 攻/技/防/逃/物 + throw-item
*可测性: fully-testable*

**已知边界/排除**: 已读源:core/battle/actions/{attack,defend,flee,item,throw-item,magic}.ts 全文 + formulas.ts + battle-state.ts + battle-system.ts(前 829 行,含 startBattle / tickBattle / tickSelectAction / handleMainMenuInput / 快捷键派发)。

【本 D2 已知 stub / 简版 — 不要为其编用例】
1) summon / trance / equip-battle action:battle-state.ts:131-150 注释明示这 3 个 action type 是 "M5 简版 stub:handler 走 console.debug + 不影响 outcome,真实施留 B-w2.b"。summon 路径在 magic.ts 有 buildAndStartSummonAnim 但需 summonSpriteFrameCounts 资源 + 是召唤魔法专属,不属"5 actions"基础动作,排除。
2) R 重复(commitRepeatAction,battle-system.ts:903-924)按任务说明"R 重复未做",不编用例。
3) 物品/法术 scriptOnUse 的具体 opcode 效果(治疗/中毒/偷取等)属 D 系列其它项(物品脚本/法术脚本),本项只验"物品 action 扣 inventory + 跑 scriptOnThrow/scriptOnUse + 投掷消耗"这层 action 框架,不深入逐 opcode 效果。
4) 装备 equip-battle 战斗内换装:同 stub,排除。

【验证点路径来源说明(诚实标注)】
- gs.battleState.enemies[i].e.health / gs.battleState.players[i].defending / gs.battleState.phase / gs.battleState.fleeAnim / gs.battleState.enemies[i].e.attackEquivItem 均在 battle-state.ts 读到精确定义(BattleEnemy.e 是 Enemy shallow copy,health 战中被改;BattlePlayer.defending:boolean)。
- 玩家受击掉血写入 playerRoles.roles[roleId].hp(attack.ts:279 enemy→player 分支 targetRole.hp = playerRoles.roles[...].hp),战斗中这份"live roles"经 battle-system.ts:162-164 getBattleLiveRoles(gs) 暴露(= __battleResources.playerRoles)。gs.PlayerRolesRuntime.rgwHP 是 SoA 运行时,战末才 writeBackBattleRolesToRuntime 回写;故"战斗进行中"查玩家 HP 应优先用 window.__game(暴露的 live roles hook),用例里给两条路径并标注。i 下标/具体 hook 名(gs vs __game 的精确暴露形)未能在本会话最终核到 shell 层 hook 命名(bash/read 通道本轮末段间歇丢结果),已在每条 verify 注明"以 console 实际 gs 结构为准,enemies/e.health/turn/phase/defending/fleeAnim 为已核根字段"。

### D2-1 普通攻击:对单敌结算物理伤害 + 敌血下降(攻击动作核心)
- **前置**: URL 加 ?skip-intro=1 进李逍遥房间。按 B 打开 battle picker 选任一弱敌队进战斗。攻击伤害有 RNG 抖动/暴击(applyPlayerAttackModifiers,attack.ts:82-101),故只验'敌血确实下降且数字与 delta 一致',不验固定数值。
- **操作**: 轮到我方行动、主菜单(menuState='main')显示 4 图标时:方向键 Up 选'攻击'图标(selectedAction=0,uibattle.c:1034 / handleMainMenuInput attack 分支 battle-system.ts:805)→ 按 Confirm(进 selectTargetEnemy)→ 方向键移光标选中一个活敌 → 再按 Confirm 确认目标。
- **预期**: sdlpal 真值 fight.c:3618-3674(kBattleActionAttack 单体分支,attack.ts:181-219 port):str=role.attackStrength+(level+6)*6,def=enemy.defense+(level+6)*4,base=calcPhysicalAttackDamage(formulas.ts:54),再过 jitter+暴击+RandomFloat(attack.ts:88-98),damage<=0→1。敌 health 减 damage 并钳到 0;emit playPlayerAttack + showDamageNum(color='blue',attack.ts:214)。
- **验证**: (a) 肉眼:李逍遥冲向该敌播挥砍动画,命中特效叠在敌身上,敌头顶弹出蓝色掉血数字,敌血条变短(血归零则进入死亡淡出 1152ms)。(b) 数据级:console 在确认前后对比 window.__game.gs.battleState.enemies[i].e.health(enemies / e.health 为 battle-state.ts 已核字段;i=被打敌在 enemies[] 的下标),应见 health 下降,且下降量 == 弹出的蓝色数字(=钳后 delta,attack.ts:200)。行动序列全部执行完后 gs.battleState.phase 由 'performAction' → 'postAction'(battle-state.ts:176-183)。

### D2-2 防御(D 键):本回合受敌物理攻击减伤(defending flag → 敌攻 def×2)
- **前置**: ?skip-intro=1 进房间。按 B 选一支会物理攻击我方的敌队。先观察一回合不防御时某队员被敌物攻的掉血量作基线(同敌同队员)。防御键 = D(memory wasd-keys:D=Defend;handleMainMenuInput 'Defend' 分支 battle-system.ts:822-823 → commitSimpleAction type='defend')。注:敌攻有 fAutoDefend 7/17 闪避 + RNG,故验'方向是减伤/置 flag',不验精确数值。
- **操作**: 轮到该队员、主菜单 main 时直接按 D(不进 target,defend target=-1 立即 commit)。等本回合敌人物理攻击到该队员。
- **预期**: sdlpal fight.c:4115(kBattleActionDefend,defend.ts:17-21 port):置 g_Battle.rgPlayer[i].fDefending=TRUE。减伤真值在敌→我物攻处 def*=2(attack.ts:265,fight.c:4926),使 calcPhysicalAttackDamage 的 def 翻倍 → 伤害更低。防御 dex×5(battle-system.ts:471 actionDexMultiplier)使防御者排到行动序列靠前。defending flag 在 postAction 清(defend.ts 注释 fight.c:1604)。
- **验证**: (a) 肉眼:选 D 后该队员摆出防御姿;本回合被敌物攻时掉血明显少于不防御基线。(b) 数据级:commit 后立即 console 查 window.__game.gs.battleState.players[i].defending === true(battle-state.ts:51 BattlePlayer.defending 已核字段;i=该队员在 players[] 下标)。该队员被物攻后,其 HP(战斗中走 live battle roles:battle-system.ts getBattleLiveRoles(gs).roles[roleId].hp,attack.ts:279 写此;若 shell 暴露则经 window.__game 读)掉血量应小于无防御回合;本回合结束(进下一轮)后 players[i].defending 回到 false。

### D2-3 逃跑成功:roll 通过 → 播逃跑滑出动画 → 退出战斗回场景(非 boss)
- **前置**: ?skip-intro=1 进房间。按 B 选一支低 dexterity / 低 level 的弱敌队(逃跑成功率高:str=PAL_GetPlayerFleeRate 等价有效 fleeRate vs def=Σ敌(dexterity+(level+6)*4),flee.ts)。不要选 boss(isBoss 战 performFlee 直接 return 不可逃,flee.ts)。逃跑键 = 杂项盒里'逃跑'或主菜单 Flee 快捷键(commitFleeAllPlayers,battle-system.ts)。
- **操作**: 轮到我方、主菜单 main 时按 Flee 快捷键(全队逃)。若失败(掉'逃跑失败'消息条)则下一轮再按,重复直到成功。
- **预期**: sdlpal fight.c:4119-4148(kBattleActionFlee,flee.ts port):roll=RandomLong(0,def),若有效 fleeRate >= roll 且非 boss → 成功。成功设 state.fleeAnim={step:0},tickBattleFleeAnim 16 步把活队员往右下滑移出屏→ phase='fleed' → finalizeBattle → mode='explore'。失败走 buildFleeFailTimeline,末帧显示 showBattleMessage '逃跑失败' 320ms。
- **验证**: (a) 肉眼:成功时全队角色向右下方连续滑动直至移出屏幕,战斗画面消失,回到李逍遥房间 scene;失败时屏上闪出'逃跑失败'文字、留在本回合。(b) 数据级:按 Flee 后立即 console 查 window.__game.gs.battleState.fleeAnim — 成功则为 {step:0..16}(battle-state.ts:441 已核字段),失败则保持 undefined;动画放完后 gs.battleState 变 undefined 且 gs.mode==='explore'(成功退出;startBattle 设 gs.mode='battle' / finalize 切回 'explore',battle-system.ts:307/359)。

### D2-4 投掷物(W 键):跑 scriptOnThrow + 投掷后消耗 1 个(throw-item action)
- **前置**: ?skip-intro=1 进房间。先按 I 加几个可投掷道具(item.flags.throwable=true 的,如梅花镖/天师符;buildBattleItemSelect 战斗投掷网格只 enable throwable 项,battle-system.ts:714-725)。按 B 进战斗。投掷键 = W(memory wasd-keys:W=ThrowItem;handleMainMenuInput 'ThrowItem' 分支 battle-system.ts:831-833 → menuState='throwItemSelect')。
- **操作**: 轮到我方、主菜单 main 时按 W(进 throwItemSelect 网格)→ 方向键选中一个 throwable 道具 → Confirm → 选目标敌人 → Confirm 投出。记下投掷前该道具 count。
- **预期**: sdlpal fight.c:4332-4376(kBattleActionThrowItem,throw-item.ts:63-109 port):跑 item.scriptOnThrow(注入 magicTables 供 0x42 SimulateMagic 结算伤害),**脚本跑完后**才 PAL_AddItemToInventory(-1) 消耗 1 个(throw-item.ts:106-108 entry.count--)。scriptOnThrow=0 按 PAL_RunTriggerScript(0) no-op,仍会消耗投掷物。
- **验证**: (a) 肉眼:该道具飞向目标敌人并触发其效果(掉血数字 / 上状态),投掷网格里该道具数量 -1(下次开 W 网格可见)。(b) 数据级:console 对比投掷前后 window.__game.gs.inventory 中该 itemId 条目的 count(gs.inventory 为任务已核根字段;条目形为 {itemId,count},见 item.ts:81 / throw-item.ts:77),投掷后应 -1。若该道具有伤害效果,被掷敌 gs.battleState.enemies[i].e.health 应下降。

### D2-5 使用物品(杂项盒→道具→使用):扣 inventory + 跑 scriptOnUse(物品 action)
- **前置**: ?skip-intro=1 进房间。按 I 加一个 usable 战斗道具(item.flags.usable=true,如疗伤丹/解毒药)。按 P 强制三人入队(便于选治疗目标队员)。可先按某队员吃伤让 HP 不满,便于看治疗物效果。按 B 进战斗。使用物品键 = U(UseItem 快捷键,handleMainMenuInput 'UseItem' battle-system.ts:828-830 → menuState='useItemSelect'),或杂项盒(selectedAction=3 杂项→道具二级)。
- **操作**: 轮到我方、主菜单 main 时按 U(进 useItemSelect 网格,只 enable usable 项)→ 方向键选一个 usable 道具 → Confirm → 选目标队员 → Confirm 使用。记下使用前该道具 count + 目标队员 HP。
- **预期**: sdlpal item.scriptOnUse 路径:查 item;队员使用先播 `PAL_BattleShowPlayerUseItemAnim` 前摇(Delay(4)、队员前移 frame5、sound 28、目标队员闪色),动画后再跑 runScript(item.scriptOnUse,runtimeMode='battle',注入 caster/target/playerRoles/gs),scriptOnUse=0 按 PAL_RunTriggerScript(0) no-op。脚本结束后仅 consuming 道具扣 1,且战斗 UseItem 不看 g_fScriptSuccess。治疗类道具的回血 opcode 写 ctx.playerRoles.roles[roleId].hp(= 战斗 live roles)。
- **验证**: (a) 肉眼:先看到使用者前移、目标队员闪色,随后目标队员触发物品效果(治疗物 → HP 数字上涨/血条变长),物品网格该道具数量 -1。(b) 数据级:动画期间 window.__game.gs.inventory 该 itemId 的 count 与目标 HP 不变;动画结束后 count -1,若治疗物则目标队员 HP(战斗中走 battle-system.ts getBattleLiveRoles(gs).roles[roleId].hp;若 shell 经 window.__game 暴露则读之)应上升;战末该 HP 经 writeBackBattleRolesToRuntime 回写到 gs.PlayerRolesRuntime.rgwHP[roleId]。

---
