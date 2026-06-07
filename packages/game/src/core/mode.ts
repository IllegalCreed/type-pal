/**
 * 顶层模式机分发(02 架构)。
 * M2:explore → tickSceneSystem,event → tickEventSystem。
 * M3 (T14):battle → tickBattle(T14 stub,T22 真实现)。
 */

import type { InputSnapshot } from '@type-pal/shared'
import { tickBattle } from './battle/battle-system.js'
import type { CommandBus } from './command-bus.js'
import type { GameState } from './game-state.js'
import { tickAutoScripts, tickChaseTimer, tickEventSystem, tickSceneAutoFadeIn } from './event-system.js'
import { tickMenu } from './menu/menu-mode.js'
import { tickSceneSystem } from './scene-system.js'

export function tickByMode(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  gs.frameNum++ // 全局逻辑帧计数器(D13);所有模式都推进

  // 特效 A:explore 模式 auto fade-in(sdlpal scene.c:503 PAL_MakeScene)。FadeOut→loadScene→无 onEnter
  // door 切换淡黑后,scene settled(explore)且 needToFadeIn → 自动 FadeIn 恢复屏幕。须在
  // tickSceneSystem 前调:fade 进行中冻结探索(忠实 PAL_FadeIn 阻塞)。
  tickSceneAutoFadeIn(gs)

  // port sdlpal `PAL_GameUpdate` 调度真值(play.c:169-192):autoScript 循环在**每个** PAL_GameUpdate
  // 都跑(无条件,不受 fTrigger gate)。PAL_GameUpdate 被调:主循环(explore)、0x09 wait、脚本控制
  // 的 PartyWalkTo / 滚屏 / Ride(script.c:191/300/2366 每步 PAL_GameUpdate(FALSE))。**不**被调:
  // dialog typing/wait-key、0x73 fadeScreen、0x85 delay、scene 重载(这些是真正阻塞的 spin)。
  //
  // 我们 tick 模型映射:explore 分支在 tickSceneSystem 内按 PAL_StartFrame 顺序跑
  // trigger → autoScript → blocker push → party update;event 模式下 waiting ∈ {undefined(脚本步进:party-walk/滚屏/ride 每 tick re-run 同 ip),
  // 'frame-wait'(0x09), 'scene-fade'(0x93 SceneFade — sdlpal 淡入边 PAL_GameUpdate)} 跑;
  // waiting ∈ {dialog, fade-screen, scene-load, delay, palette-fade} 或 sceneLoading(切场景冻屏)不跑。
  // P2#6a 修:旧版只在 event+frame-wait 跑 → 脚本控制走路/滚屏/骑乘期间 NPC 冻结(sdlpal 仍在动)。
  // 特效 A:'scene-fade'(0x93 / 0x80 fUpdateScene)放行 autoScript —— sdlpal PAL_SceneFade 每步调
  // PAL_GameUpdate(FALSE),NPC/动画淡入期间不冻(否则 SceneFade 进场 NPC 静止,不忠实)。
  // M4(2026-06-07 sdlpal 审查):'camera-pan'(0x7F 相对 pan,op2!=0xFFFF)放行 autoScript ——
  //   sdlpal script.c:2364-2366 相对 pan 每帧调 PAL_GameUpdate(FALSE),pan 期间 NPC autoScript /
  //   追逐 timer 不冻(否则边平移边走的 NPC 会在 pan 那几帧静止)。
  const w = gs.eventCursor?.waiting
  const shouldRunAutoScripts =
    !gs.sceneLoading
    && gs.mode === 'event'
    && (w === undefined || w === 'frame-wait' || w === 'scene-fade' || w === 'camera-pan')
  if (shouldRunAutoScripts) {
    tickAutoScripts(gs)
    // sdlpal play.c:235-238 PAL_GameUpdate 体内每帧:追逐 timer 自减(0x62 驱魔香/0x63 十里香 到期复位 wChaseRange)。
    //   必须与 tickAutoScripts 共享 shouldRunAutoScripts 门 —— PAL_GameUpdate 在 dialog typing / 0x85 delay /
    //   palette-fade 等 spin-loop 不被调用;否则长对话/延时会多扣 cycles 使追逐暂停/加速提前到期
    //   (2026-06-02 review 修:此前在门外每帧无条件扣)。
    tickChaseTimer(gs)
  }

  const prevMode = gs.mode
  switch (gs.mode) {
    case 'explore':
      tickSceneSystem(gs, input, bus)
      break
    case 'event':
      tickEventSystem(gs, input, bus)
      break
    case 'battle':
      tickBattle(gs, input, bus)
      break
    case 'menu':
      // M5.6 W0.a:大世界菜单 modal 子 mode;dispatch 输入到栈顶 menu,
      // 栈空时 tickMenu 自动切回 'explore'。
      tickMenu(gs, input, bus)
      break
  }

  // BUG1 修(2026-06-04 user 报"出战斗后还能看见死怪,再 fade 才把怪刷掉"):0x07 触发的战斗结束后
  //   finalizeBattle→resumePostBattleScript 把 mode 翻 'event' + 设 eventCursor,但**不执行 opcode**;
  //   续跑脚本的 0x52 隐怪要等下一个 event tick 才跑,中间会 present 一帧大世界露出未隐藏的死怪(sState>0)。
  //   sdlpal PAL_StartBattle 同步返回后,0x07 handler 在同一调用栈立刻续跑 goto→0x52(隐怪)→0x50(FadeOut),
  //   中间不重绘 → 死怪在任何画面出现前就隐了。这里对齐:战斗结束转 'event' 时,**同 tick** 立即驱动一次
  //   tickEventSystem 把续跑脚本步进到首个 waitable(0x52 在任何 present 前执行),消除"先露一帧死怪"。
  //   仅 0x07 续跑(battle→'event')触发;转 'explore'(非 0x07 战斗)或仍 'battle' 不步进。
  if (prevMode === 'battle' && gs.mode === 'event') {
    tickEventSystem(gs, input, bus)
  }
}
