# ② 零散 opcode 剩余实现规格(0x4D / 0x4E / 0xA0)

Status: historical
Last reviewed: 2026-10-15
Owner: Codex（文档治理；原作者与原任务 Owner 保留在历史原文）
Template: plan-status-v1 / 1.0.0

## 目标与时间范围

2026-05-30 第一阶段的 0x4D、0x4E、0xA0 剩余 opcode 规格与完成快照。这里保存原计划与当时用户决策，不作为当前实现待办；sdlpal 是当时引用的参考实现，不替代原始游戏真值。

## 里程碑

| 项 | 原计划与原完成记录 | 范围 |
|---|---|---|
| 0x4D | wait-key；原文记 commit 53c8cbf | 永久等待 Confirm/Cancel 的原规格 |
| 0x4E | load-last-save；原文记 commit 56fe8b7 | 淡出、当前槽重载与停止 trigger script |
| 0xA0 | quit；原文记 commit 30a4822 | 用户选择跳过 sdlpal credits，WIN95 结局后回标题 |

## 当前状态

历史顶部声明三项已于 2026-05-30 完成，game 903 测与 typecheck/实机验证为原述。正文中“下轮直接实现”“需查/加 handler”等是完成横幅之前的计划，不重新打开任务，也不证明当前 event-system 仍是旧 if-chain。

## 阻塞与决策

保留用户于当日对 0xA0 跳过 PAL_AdditionalCredits、直接回标题的选择。原 source 的代码行号、全局注入和 waiting 细节属于该时点；要修改当前行为须重新核当前 caller 与一手证据，不照抄旧结构。

## 下一步

本计划没有新的实施下一步。当前缺陷走 Ops 任务与一阶段真值核验；本次不执行游戏、单测或覆盖率。

## 历史范围

2026-05-30 的冻结计划/完成记录，原 implementation suggestions 与完成记录同页保留，各自时序明确。

## 当时证据

原文的三提交、script.c/play.c/global.c 线索与 in-game 场景记录完整保留。源 Git blob/SHA 可从本批保留回执取回；不把旧 file:line 当今天的有效位置。

## 当前有效性

historical。完成横幅覆盖当时未完计划语气，不关闭今天的任何 Ops 修复，也不构成二阶段重写合同。

## 继任文档

一阶段方针见[CLAUDE](../../../CLAUDE.md)，当前缺陷入口见[Ops 审计](../../ops/audits/pre-e2e/summary.md)；不存在本次新指定的产品继任实现。

## 原始结论

以下完整原文保留原语义、日期、引用和测试数：

> # ② 零散 opcode 剩余实现规格(0x4D / 0x4E / 0xA0)
>
> > **✅ 全部完成(2026-05-30)**:0x4D commit 53c8cbf / 0x4E commit 56fe8b7 / 0xA0 commit 30a4822。
> > 各带单测,typecheck + 全测试通过(game 903)。in-game 验:0x4E = 打输一场战斗(game-over "胜败乃兵家常事也"→ 淡黑重载上次存档);0xA0 = scene-281 结局(赵灵儿"糟了!快走!"→ WIN95 播 4/5/6.mp4 → 回标题)。
>
>
> > 系统读源 + byte-level 用量已完成(本 session 早段)。0x78/0xA6 已 no-op 文档化(commit 1196faf)。
> > 下面三个需新 handler/waiting 基建,规格已锁(含 0xA0 用户决策),下轮直接实现。
> > 决策(2026-05-30 用户定):**0xA0 跳过 sdlpal 引擎 credits(PAL_AdditionalCredits),直接回标题**。
>
> 落点:全在 `packages/game/src/core/event-system.ts` 的 tickEventSystem if-chain(非 applyRawOpcode —— 这三个是阻塞/控制流,需设 waiting / 停游标 / 调 handler)。OP 常量加在 0xA1 附近(同 0x78/0xA6 区)。
>
> ## 0x4D wait-for-any-key(本游戏 0 用,为完整性)
> sdlpal:`case 0x004D: PAL_WaitForKey(0); break;`(script.c:1753-1758)= `PAL_WaitForKeyInternal(0, FALSE)`
> (play.c:603-638)→ **永久等**,只认 `kKeySearch | kKeyMenu`(空格/Esc 类),非任意键。
> ts 实现:
> - OP_WAIT_FOR_KEY = 0x004D。
> - tickEventSystem 加 if:设 `cursor.waiting = 'wait-key'` + return。
> - 在 tickEventSystem 顶部 waiting 派发加 `'wait-key'` 分支:`if (input.pressed.has('Confirm') || input.pressed.has('Cancel')) { cursor.waiting=undefined; cursor.ip++ }` else return。
>   (Confirm≈kKeySearch、Cancel/Menu≈kKeyMenu —— 核对 shell input 映射的 AbstractKey 名。)
> - mode.ts:'wait-key' 不放行 autoScript(同 dialog,阻塞)。
>
> ## 0x4E load-last-save(本游戏 1 用)
> sdlpal:`case 0x004E: PAL_FadeOut(1); PAL_ReloadInNextTick(gpGlobals->bCurrentSaveSlot); return 0;`(script.c:1760-1766)
> - PAL_FadeOut(1):屏幕淡黑(同 0x50,delay=1=600ms)。
> - PAL_ReloadInNextTick(slot)(global.c:889-912):SetLoadFlags + fEnteringScene + fNeedToFadeIn + dwFrameNum=0 → 下 tick 主循环 reload 该 slot。
> - **return 0**:不同于 break,终止该 trigger script(PAL_RunTriggerScript `while(wScriptEntry!=0)`)。
> ts 实现:
> - OP_LOAD_LAST_SAVE = 0x004E。
> - 复用 OP_FADE_OUT 的 buildFadeOut(curColors, 600, now) + needToFadeIn=true。
> - 调 load handler 重载**当前存档槽**:需 (a) gs 里的当前槽字段(查/加 gs.currentSaveSlot;bootstrap loadGameFromSlot 写存档时记之),(b) event-system 加 `_loadGameHandler` 注入(setLoadGameHandler 模式,bootstrap 注入 → loadGameFromSlot(slot))。
>   注:bootstrap 已有 loadGameFromSlot + 一个 setLoadGameHandler(给菜单 load 用,在别处)。确认它是否能被 opcode 复用 / 是否要单独注入点。
> - 停脚本:clear gs.eventCursor(或设终止),对齐 return 0。
> - 0 用?不,1 用 —— 能 in-game 验(找 all.json 那 1 处 0x4E 的触发场景)。
>
> ## 0xA0 quit(本游戏 1 用,scene-281 结局)
> sdlpal:`if (gConfig.fIsWIN95) PAL_EndingScreen(); PAL_AdditionalCredits(); PAL_Shutdown(0);`(script.c:2988-2996)
> - DOS:不调 EndingScreen(结局靠脚本前面的 FBP/anim opcode 已跑完)→ AdditionalCredits → Shutdown。
> - **用户决策:跳过 AdditionalCredits(sdlpal 引擎 credits,非游戏内容)**。
> ts 实现:
> - OP_QUIT = 0x00A0。
> - 加 quit handler 注入(setQuitHandler 模式):
>   - WIN95(buildFlag==='win95'):播 win95 结局(playAvi 4/5/6,bootstrap 已有结局 mp4 序)→ 回 OpeningMenu/标题。
>   - DOS:结局已由前序 opcode 跑完 → 直接回标题(重置到 OpeningMenu / reload 初始)。
> - tickEventSystem 设 waiting + 调 handler(同 ending-anim modal 模式:suspendRaf + 播放 + 完成回标题)。
> - 回标题 = 复用 bootstrap 的 OpeningMenu 启动路径(startGameHandler / 重新 showOpeningMenu)。需确认 bootstrap 暴露的回标题入口。
>
> ## 实现顺序建议
> 1. 0x4D(最简,纯 waiting 状态)。
> 2. 0x4E(fade + load handler + 停脚本)。
> 3. 0xA0(quit handler + win95 ending + 回标题,最复杂)。
> 每个单独 commit,引 sdlpal file:line。每个做完 typecheck + 全测试。0x4E/0xA0 各 1 用,可 in-game 验(找触发场景)。
>
