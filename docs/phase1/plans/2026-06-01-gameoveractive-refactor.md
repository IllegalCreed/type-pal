# gameOverActive 重构设计(2026-06-01,user 报石长老必败战误红屏 + 架构返工)

> **背景**:`gameOverActive` 是 ts 自造字段(sdlpal 0 命中),判据 `outcome === 'lost'` 无 sdlpal 出处 →
> 石长老鬼阴山必败续剧情战(0x07[34,0,0] lostJump=0)被误置 → 错误红屏。user 实测:石长老战败直接回大世界续剧情,不出红屏。
> **方法**:2 轮 workflow(穷尽映射 + 收窄难点)+ 对抗验证 5 反例全 CORRECT。判据收敛到"脚本是否真执行 0x4F"。
> **数据真值**:0x4F 全游戏唯一在 all.json index 41076(死亡脚本 L_41075);team21/29/石长老续剧情路径线性扫描(遇 goto/end 停)均不命中 0x4F。
> **对抗验证(5/5 CORRECT)**:① T0 空窗帧倒地不丢 ② 石长老不红屏 ③ team21 不误 hold ④ 普通胜利正常重绘 ⑤ 红黑不插帧。
> **状态(2026-06-01 完成)**:C1-C7 全部实施完毕,7 commit(1dba2fd→dea6692),全包 1529 测全绿 + tsc 干净。
>   后续 user 校正战斗分类(林月如=必胜战,非续剧情;毒娘子真 boss=team42 lost=0 必败,非门口黑蜘蛛 team43):
>   已 byte-level 核 all.json 0x07 全表(434条/56剧情战)确认判据对全部命名战正确,订正注释(commit 7bf717a)。
>   **已知差异(非 bug,user 未报)**:team21 林月如 lost→对白→`goto L_41075`,judge 遇 goto 停 → 不预置 deathHold,
>   战败红屏结局仍由 0x4F handler 点亮(正确),仅那两句"多管闲事"对白期 hold 的是战后场景帧而非战斗帧。
>   若日后要 1:1 需上"通用战后保持帧+叠对白"机制(非简单跨 goto 追,会让对白 hold 时不绘)。详见 §2(a) judge 注。
>   战斗真值表已落 memory: battle-win-lose-taxonomy-verified。

---

# Design: 过渡帧 hold + 0x4F 点亮死亡视觉

## 0. 数据真值(已 byte-level 核实,data/extracted/events/all.json)

| 事实 | 证据 |
|---|---|
| `0x4F`(opcode 79, FadeToRed)在**全游戏 43503 条命令里只出现 1 次**:index **41076** | `grep opcode===79` → `[41076]` |
| 死亡脚本入口 `L_41075`=41075 序列:`41075 0x43`(音乐)→ `41076 0x4F` → `41077 setDialogStyleCenter` → `41078..41081 showDialog×4` → `41082 0x4E`(读档)→ `41083 end` | all.json 41075-41083 |
| team21 lostIp=**6186**:`setDialogStyleTop` → `showDialog×2`("林月如:多管闲事..活该!")→ **`6189 goto L_41075`**(跳进死亡脚本)→ end | all.json 6186-6190 |
| team29 lostIp=**13783**:纯续剧情 cutscene(0x78/0x49/0x75/...大量 showDialog),**首 40 条无 0x4F、无 goto L_41075** | all.json 13783-13822 |
| 石长老 lostIp **operand[1]=0** → `resolve(0)` 返回 `undefined` | savePostBattleResume event-system.ts:2497 |
| `goto L_41075` 全游戏只来自 index **6189**(team21) | grep goto.to==='L_41075' → `[6189]` |

**判据收敛**:从 `lostIp` 起**线性扫描**(遇首个 `end`/`goto` 停)若命中 opcode `0x4F` → 本场是"立即进死亡帧"的真死亡。
- 死亡(lostIp=41075):41075→41076 命中 0x4F → **true**(pre-light)。
- team21(lostIp=6186):6186→6189 先撞 `goto`(在任何 0x4F 之前)→ **false**(不 pre-light)。它先在**正常重绘**的场景上播 2 句对白,`goto 41075` 后再由 0x4F 自然点亮 —— 比 pre-light 更忠实。
- team29(13783):线性扫描无 0x4F → **false**。
- 石长老(undefined)/ 胜利 / 逃 → 根本无 lostIp 或非 lost → **false**。

唯一真死亡 lostIp=41075 命中,其余全不命中。这就是任务要的"提前点亮判据只对真死亡为真"。

---

## 1. 标记拆分:`deathHoldActive`(过渡帧)+ `gameOverActive`(0x4F 后)

不复用单一 `gameOverActive`,引入**双标记**,因为两段语义不同:

- **`deathHoldActive`(新)**:T0 战斗结算→0x4F 之间的**过渡帧 hold**。present 据此保持上一帧(战斗倒地帧)不重绘,**不**画 dialog(此刻还没 dialog)。由"lostIp 预判命中 0x4F"在 T0 同步点亮;由 0x4F handler 真执行时**移交**给 `gameOverActive`(同 tick 内 set 后者 + 清前者);由 0x4E 读档 / loadScene 兜底清(防异常残留)。
- **`gameOverActive`(沿用)**:0x4F 真执行后的死亡演出。present 保持战斗帧 + **画死亡 dialog**;palette ramp 把战斗帧染红。由 0x4F handler 点亮;由 0x4E 读档 / loadScene 清。

present hold 分支统一成"**`deathHoldActive || gameOverActive` → 保持帧**;其中只有 `gameOverActive` 段画 dialog"。两者都在 `sceneLoading` hold 之前、`fb.clear()` 之前。

> 为何不只挪判据到 0x4F、不加新标记?Q6 已证:T0 末 onPresent 时 0x4F 尚未跑(在 ip 41076,前面 41075 是 0x43 `break` 续跑),`gameOverActive=false` → 走 `present.ts:162 fb.clear()` 露大世界 1 帧。必须有 T0 同步点亮的过渡标记补这一帧。`deathHoldActive` 就是这个"战斗→event 过渡帧 hold"机制(Q6 证现有 hold 都覆盖不到)。

---

## 2. 逐 consumer 改法

### (a) `game-state.ts` resumePostBattleScript(set 点)— 用预判替换无条件置位

**现状**(误伤根因):
```ts
// game-state.ts:1304
if (outcome === 'lost') gs.gameOverActive = true
```

**改为**:
```ts
if (outcome === 'lost' && r.lostIp !== undefined) {
  if (scriptRunHits0x4F(r.commands, ip)) {  // ip 已 = r.lostIp(见 1287)
    gs.deathHoldActive = true   // T0 过渡帧 hold;0x4F handler 移交给 gameOverActive
  }
}
```
- **不再**置 `gameOverActive`(它现在由 0x4F handler 置)。
- `r.lostIp === undefined`(石长老)→ ip 已回落 wonIp(1287 的 else 不进)→ 不 hold。
- `outcome==='won'/'fled'` → 不进,与现状一致(胜利正常重绘,Q3)。

**新 helper**(放 game-state.ts 或 event-system 共享):
```ts
const OP_FADE_TO_RED = 0x4f
/** 从 startIp 线性扫描脚本 run(遇首个 end/goto 停),是否命中 0x4F(真死亡帧)。 */
export function scriptRunHits0x4F(commands: Command[] | undefined, startIp: number): boolean {
  if (!commands) return false
  for (let i = startIp; i < commands.length; i++) {
    const c = commands[i]
    if (c.op === 'end' || c.op === 'goto') return false   // run 边界:不跨 goto 追(team21 在此停 → false)
    if ((c as RawCommand).opcode === OP_FADE_TO_RED) return true
  }
  return false
}
```
- `r.commands` = `cursor.commands`(savePostBattleResume:2499 存),与 0x4F 解析时同一命令数组,index 一致 → peek 可靠。
- **遇 goto 停**是关键:team21 的 `goto L_41075`(6189)在任何 0x4F 之前 → 返 false。不追 goto 目标 = 不 pre-light team21(让它走对白重绘 + 后续 0x4F 自然点亮)。

### (b) `present.ts` presentFrame(read 点)— hold 分支并入 deathHoldActive

**现状** present.ts:137-145(只 gameOverActive,画 dialog)。**改为**:
```ts
// 死亡过渡帧 hold(deathHoldActive):T0 战斗结算→0x4F 之间,保持战斗倒地帧不重绘,不画 dialog。
if (gs.deathHoldActive) {
  return   // 纯 hold:此刻无死亡 dialog,palette 也还没 ramp(0x4F 未跑)
}
// 死亡演出(gameOverActive):0x4F 已执行,保持战斗帧染红 + 画死亡对话(不重绘大世界)。
if (gs.gameOverActive) {
  if (gs.dialogBox) drawDialogBox(fb, gs.dialogBox, ctx.glyphs, { ...ctx.dialogAssets, uiSpriteFrames: ctx.uiSpriteFrames })
  return
}
```
两分支都在 `sceneLoading` hold(151)与 `fb.clear()`(162)之前。`deathHoldActive` 先于 `gameOverActive`(T0 时只有前者 true,0x4F 后只有后者 true,不重叠)。

### (c) `event-system.ts` 0x4F handler(点亮 + 移交)

**现状** event-system.ts:2033-2040 只 `startPaletteFade(...buildFadeToRed...)`。**改为**追加:
```ts
// 0x4F 真执行 = 死亡视觉正式开始:移交 deathHold → gameOver(present 改画死亡 dialog),染当前(战斗)帧红。
gs.gameOverActive = true
gs.deathHoldActive = false
startPaletteFade(gs, cursor, buildFadeToRed(baseColors, 32 * 75, now), false)
return
```
- `gameOverActive=true` 让 present 进画-dialog 分支(随后 41078-41081 showDialog 在染红的战斗帧上叠死亡对白)。
- 同 tick 清 `deathHoldActive`(已被 gameOverActive 接管)。
- **team21 路径同样在此点亮**:它 `goto 41075` 后跑到 41076 0x4F → 此 handler 置 gameOverActive,无需 T0 pre-light。统一出口。

### (d) `event-system.ts:1647` showDialog(不动 + 验证不误清)

showDialog 清 `sceneLoading`(1647)但**不碰** `deathHoldActive`/`gameOverActive` → 死亡脚本 41078-41081 的 4 个 showDialog 不会清死亡 hold。这正是任务约束"不能被 showDialog 清"的满足点:用专用标记而非 sceneLoading(Q5 证 sceneLoading 会被 showDialog 清)。**无需改 1647**,但 TDD 要加一条回归测试钉死。

### (e) `bootstrap.ts` isDeathReload + clear(双标记都纳入)

- **isDeathReload 判据**(1230):`gs.gameOverActive === true` → 改 `gs.gameOverActive === true || gs.deathHoldActive === true`。
  理由:0x4E 读档在 41082 触发时 `gameOverActive` 已 true(0x4F 先跑),正常路径够用;`|| deathHoldActive` 是防御性兜底(理论上若读档发生在 0x4F 前,虽实际不会)。强制黑 palette 逻辑(1240-1242)不变。
- **clear**(bootstrap.ts:578 loadSceneCommon 起手):`gs.gameOverActive = false` 后追加 `gs.deathHoldActive = false`。死亡读档→新场景加载清两个标记,present 恢复正常渲染。

### (f) `scene-system.ts:452` clear(双标记)

`gs.gameOverActive = false`(452,loadScene 时清)后追加 `gs.deathHoldActive = false`。兜底:任何 loadScene(含 team21 续剧情里的 loadScene)清死亡 hold,防残留。

### (g) `game-state.ts` 类型(field 声明)

GameState 加 `deathHoldActive?: boolean`(注释:T0 战斗结算→0x4F 过渡帧 hold;0x4F handler 移交 gameOverActive)。`gameOverActive` 注释更新为"由 0x4F handler 置(非 resumePostBattleScript)"。

---

## 3. 死亡序列逐 tick 时序表

记 finalizeBattleCleanup 跑在 T0(mode 'battle' 的最后一个 battle tick)。所有 ip 指 `cursor.commands` index。

| tick | event/battle 执行 | mode | deathHold | gameOver | sceneLoading | onPresent 走哪 | 渲染结果 / 靠什么 hold |
|---|---|---|---|---|---|---|---|
| **T0** | tickBattle case 'lost' → finalizeBattle → finalizeBattleCleanup(`mode='explore'`,`battleState=undefined`,ip=41075)→ resumePostBattleScript:`mode='event'`,**scriptRunHits0x4F(cmds,41075)=true** → `deathHoldActive=true` | event | **true** | false | false | presentBattleFrame 返 false(mode≠battle)→ **presentFrame** | `deathHoldActive` true → **return,保持战斗倒地帧**。**T0 不空窗**(关键:不走 fb.clear 露大世界) |
| **T1** | event tick:ip=41075 `0x43`(music)→ OP_PLAY_MUSIC `break` 续跑 → ip=41076 `0x4F` handler:`gameOverActive=true`,`deathHoldActive=false`,startPaletteFade(FadeToRed 2400ms),`return` | event | false | **true** | false | presentFrame | `gameOverActive` true + 无 dialog → **保持战斗帧**;paletteFadeState ramp(126-132)开始把战斗帧逐帧染红 |
| T2..Tn | present 每帧 stepPaletteFade(0x4F skip idx 0x4F)→ 战斗帧渐红;event-system fade-to-red waiting handler 跑满 2400ms → ip=41077 | event | false | true | false | presentFrame | 战斗帧持续染红 hold,无 dialog |
| Tn+1 | `41077 setDialogStyleCenter` → ip++;`41078 showDialog`($00 空)set dialogBox,清 sceneLoading(已 false,no-op)→ yield | event | false | true | false | presentFrame | `gameOverActive` + `dialogBox` → drawDialogBox 在**染红战斗帧**上画对白框。**showDialog 不清 gameOverActive** → 不露大世界 |
| ... | `41079`"胜败乃兵家常事也" / `41080`"大侠请重新来过吧" / `41081`($02)逐 showDialog,每条 wait-key | event | false | true | false | presentFrame | 红帧 + 死亡对白逐句(全程 hold,Q5/约束:showDialog 清的是 sceneLoading,与此无关) |
| Treload | `41082 0x4E` PAL_ReloadInNextTick(bCurrentSaveSlot):event-system 跑 fade-out 淡黑 + 清 cursor → 调 loadGameFromSlot | event→explore | false | true(读前) | — | — | 红→黑 fade-out(bootstrap 强制黑 palette,preserved);**不插战斗帧**(isDeathReload 强制黑) |
| Treload+ | loadGameFromSlot:`isDeathReload = gameOverActive‖deathHold = true` → palette 强制全黑;Object.assign 存档;loadSceneCommon(fromSavedGame)→ bootstrap.ts:578 `gameOverActive=false`+`deathHoldActive=false` | explore | false | false | true→false | presentFrame | sceneLoading 窗口黑屏(强制黑 palette)→ fromSavedGame 立即清(651)→ needToFadeIn 从黑淡入新场景 |
| fadeIn | explore auto fade-in(scene.c:503)从黑 ramp 到存档正常色 | explore | false | false | false | presentFrame | 正常重绘新场景 + palette 淡入。死亡演出结束 |

**两个必保视觉**:① 死亡角色保持倒地 — T0(deathHold)+ T1..Treload(gameOver)全程 hold 战斗帧,0x4F 染红,无任何 fb.clear。✅ ② 红→黑不插战斗帧 — 0x4E 读档 isDeathReload 强制黑 palette(1240-1242,preserved),fb 残留战斗帧渲染为黑。✅

**对照非死亡路径(均不 hold,正常重绘)**:
- **普通胜利**(Q3):outcome='won' → resumePostBattleScript 不进 lost 分支 → deathHold/gameOver 全 false → present `fb.clear()` 重绘大世界。✅
- **team21**(lostIp=6186):scriptRunHits0x4F(cmds,6186) 在 6189 撞 goto 前无 0x4F → **false** → T0 不 pre-light → present 正常重绘,播"林月如:多管闲事"对白 → `goto 41075` → 41076 0x4F 此时才点 gameOverActive(死亡视觉正确延后到对白后)。✅
- **team29**(lostIp=13783):无 0x4F → false → 续剧情 cutscene 正常重绘。✅
- **石长老**(lostIp operand[1]=0):resolve→undefined → ip=wonIp → 不进 lost-hold 分支 → 正常续剧情。✅

---

## 4. TDD 逐 commit

每 commit:先写红测 → 实现 → 绿 → `pnpm -C packages/game test` 全过 → commit(message 引 sdlpal/all.json 出处)。

**C1 — scriptRunHits0x4F 纯函数**(game-state.test.ts)
- 红测:① `scriptRunHits0x4F(cmds, 41075)===true`(41076 命中);② `(cmds, 6186)===false`(6189 goto 前停);③ `(cmds, 13783)===false`;④ `(undefined, x)===false`;⑤ 遇 end 即停返 false。用真 all.json fixture 或手搓 `[{op:'raw',opcode:0x43},{op:'raw',opcode:0x4f},...]` / `[...,{op:'goto'}]`。
- 实现:helper 如 §2(a)。
- commit: `feat(death): scriptRunHits0x4F 死亡帧预判(all.json:41076 唯一 0x4F;team21 6189 goto 停)`

**C2 — resumePostBattleScript 用预判置 deathHoldActive**(game-state.test.ts)
- 红测:① lost+lostIp 指死亡 run(含 0x4F)→ `gs.deathHoldActive===true` 且 `gs.gameOverActive` **未置**;② lost+lostIp 指 team21-like(0x4F 前有 goto)→ deathHold/gameOver 都 false;③ lost+lostIp undefined(石长老)→ 都 false;④ won → 都 false。
- 实现:替换 1304 无条件置位为 §2(a)。加 GameState `deathHoldActive` 字段。
- commit: `feat(death): T0 过渡帧 hold 用 0x4F 预判替换 outcome==='lost' 误伤判据`

**C3 — present hold 双分支**(新 present.test.ts 或现有)
- 红测(用 fb spy / clear spy):① `deathHoldActive=true` → presentFrame 不调 `fb.clear`、不画 scene;② `gameOverActive=true`+dialogBox → 不 clear + 调 drawDialogBox;③ 两者都 false + explore → 调 `fb.clear`(普通重绘不被 hold)。
- 实现:§2(b)。
- commit: `feat(death): present deathHold(纯hold)/gameOver(hold+dialog)双分支`

**C4 — 0x4F handler 移交**(event-system.test.ts)
- 红测:跑 0x4F 命令后 `gs.gameOverActive===true` 且 `gs.deathHoldActive===false`,且 paletteFadeState 已设。
- 实现:§2(c)。
- commit: `feat(death): 0x4F handler 点亮 gameOverActive + 移交 deathHold(all.json:41076)`

**C5 — showDialog 不清死亡 hold 回归**(event-system.test.ts)
- 红测:`gameOverActive=true` 下跑 showDialog(模拟 41078)→ 跑后 `gameOverActive` 仍 true(只 sceneLoading 被清)。钉死"4 个 showDialog 不露大世界"约束。
- 实现:无(验证 1647 不碰死亡标记)。若测试已绿则纯回归 commit。
- commit: `test(death): 死亡脚本 showDialog×4 不清 gameOverActive 回归(event-system.ts:1647 只清 sceneLoading)`

**C6 — bootstrap/scene-system 清两标记 + isDeathReload**(bootstrap/scene-system 测或集成)
- 红测:① loadGameFromSlot 在 `deathHoldActive=true`(或 gameOverActive)时 isDeathReload=true → 强制黑 palette;② loadSceneCommon 后两标记都 false;③ scene-system loadScene 清两标记。
- 实现:§2(e)(f),isDeathReload 加 `|| deathHoldActive`。
- commit: `feat(death): 死亡读档/场景重载清 deathHold+gameOver 双标记(bootstrap:578/scene-system:452)`

**C7 — 端到端时序集成测**(集成/驱动测)
- 红测:模拟 T0 finalizeBattleCleanup(lostIp=41075)→ 断言 T0 present **不 fb.clear**(无空窗);驱动 event tick T1 至 0x4F → 断言 gameOver 接管 + ramp 启动;驱动到 showDialog → 断言仍 hold。对照:lostIp=6186(team21)T0 present **fb.clear**(重绘对白),其后 goto→0x4F 才点亮。
- 实现:无新代码,纯集成验收。
- commit: `test(death): 死亡序列逐tick时序 + team21/胜利不hold 集成验收`

---

## 关键文件 / 行号锚点(全 `/Users/zhangxu/illegal/type-pal/`)

- set:`packages/game/src/core/game-state.ts:1304`(resumePostBattleScript,改预判)、`:930`(gameOverActive 字段,加 deathHoldActive)、`:932-943`(postBattleResume.commands/lostIp)
- read:`packages/game/src/present/present.ts:137-145`(hold 分支)、`:162`(fb.clear)、`:624`(presentBattleFrame mode≠battle 回落)
- 0x4F handler:`packages/game/src/core/event-system.ts:2033-2040`、`:1647`(showDialog 清 sceneLoading 不清死亡标记)、`:2492-2507`(savePostBattleResume,lostIp=resolve(op[1]),commands=cursor.commands)
- clear:`packages/game/src/shell/bootstrap.ts:578`、`:1230`(isDeathReload)、`:1240-1242`(强制黑 palette)、`packages/game/src/core/scene-system.ts:452`
- 数据真值:`data/extracted/events/all.json` segments[0].commands — 0x4F 唯一在 **41076**;死亡 run 41075-41083;team21 6186-6190(6189 goto L_41075);team29 13783+(无 0x4F);`goto L_41075` 唯一来自 6189
- Command 类型:`packages/shared/src/events.ts:6-9`(RawCommand.opcode),`:160`(Command union)