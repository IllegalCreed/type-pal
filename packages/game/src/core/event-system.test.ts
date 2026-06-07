import { describe, it, expect, vi } from 'vitest'
import type { Command, InputSnapshot, AbstractKey, Palette } from '@type-pal/shared'
import {
  tickEventSystem, tickAutoScripts, tickChaseTimer, buildLabelMap, runScript, runEnterScript, setFetchPalette,
  setStartBattleHandler,
  OP_START_BATTLE, OP_SET_BATTLE_FIELD, OP_SET_SCENE_OBJECT_STATE,
  OP_SET_PARTY_DIRECTION,
  OP_WAIT_FRAMES, OP_SET_OBJECT_POS,
  OP_SET_OBJECT_GESTURE, OP_SET_EVENT_OBJECT_DIR_AND_FRAME, OP_SET_EVENT_OBJECT_DIR_OR_FRAME,
  OP_CALL_SCRIPT,
  OP_NPC_WALK_ONE_STEP, OP_PLAYER_WALK_ONE_STEP, OP_SET_PLAYER_SPRITE,
  OP_MOVE_OBJECT, OP_SET_OBJECT_LAYER, OP_ANIMATE_OBJECT,
  OP_NULLIFY_OBJECT, OP_HIDE_OBJECT, OP_CHASE_PAUSE, OP_CHASE_SPEEDUP,
  OP_PARTY_WALK_TO_4, OP_PARTY_WALK_TO_8, OP_NPC_WALK_TO_4,
  OP_RIDE_OBJECT_2, OP_RIDE_OBJECT_4, OP_RIDE_OBJECT_8, OP_MONSTER_CHASE,
  setObstacleChecker, setGlobalEvents, resolveScriptLabel,
  startOverworldItemScript, setSceneLoader,
  OP_PLAY_MUSIC, OP_PLAY_SOUND, OP_FADE_OUT, OP_FADE_IN, OP_SCENE_FADE, OP_PALETTE_FADE, OP_COLOR_FADE,
  OP_FADE_TO_RED, OP_FADE_TO_SCENE, tickSceneAutoFadeIn, OP_REDRAW_SCREEN, OP_RESTORE_SCREEN,
  OP_SHAKE_SCREEN,
  OP_SET_RNG, OP_PLAY_RNG, OP_WAVE_SCREEN, setRngPlayHandler, type RngPlayHandlerInput,
  OP_SHOW_FBP, setShowFbpHandler, type ShowFbpHandlerInput,
  OP_SCROLL_FBP, setScrollFbpHandler,
  OP_ENDING_ANIMATION, setEndingAnimationHandler,
  OP_WAIT_FOR_KEY,
  OP_LOAD_LAST_SAVE, setLoadLastSaveHandler,
  OP_QUIT, setQuitHandler,
  OP_GOTO_IF_NO,
  OP_TRANSFORM_COLLECTED, OP_TELEPORT_OUT, setStoreTable,
  OP_SET_BATTLE_MUSIC, OP_STOP_MUSIC, OP_PLAY_CD_MUSIC,
  OP_NOOP_A7,
  setObjectPoisons, curePlayerPoisonByLevel, walkFrameMod,
  type BattleCtx,
} from './event-system.js'
import { createInitialGameState, resumePostBattleScript, type GameState } from './game-state.js'
import { createCommandBus } from './command-bus.js'
import { setWordTable } from './word-lookup.js'
import type { BattleState } from './battle/battle-state.js'
import { createSeedableRng } from './rng.js'

function snap(pressed: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum }
}

function loadEvent(gs: GameState, commands: Command[], startIp = 0): void {
  gs.eventCursor = {
    commands,
    labelMap: buildLabelMap(commands),
    ip: startIp,
  }
  gs.mode = 'event'
}

describe('walkFrameMod(NPC 走路帧取模,scene.c:893)', () => {
  it('M3/L4:按 nSpriteFrames 取模(3→%4、1/2/4→%n、0→不推帧)', () => {
    expect(walkFrameMod(4, 3)).toBe(0) // nSpriteFrames=3 → mod 4(标准走路怪)
    expect(walkFrameMod(3, 3)).toBe(3)
    expect(walkFrameMod(2, 2)).toBe(0) // mod 2
    expect(walkFrameMod(3, 2)).toBe(1) // 旧 %4 会得 3(渗进相邻方向帧);新 mod 2 = 1
    expect(walkFrameMod(5, 1)).toBe(0) // mod 1 恒 0
    expect(walkFrameMod(4, 4)).toBe(0) // mod 4 与 C 相等
    expect(walkFrameMod(3, 0)).toBe(0) // nSpriteFrames=0(单姿势)不推帧
    expect(walkFrameMod(2, undefined)).toBe(2) // undefined → 退回标准 %4(未 hydrate 兼容)
  })
})

describe('buildLabelMap', () => {
  it('收集所有带 label 的命令', () => {
    const cmds: Command[] = [
      { op: 'end' },
      { op: 'showDialog', messageIndex: 0, text: 'a', label: 'L_1' },
      { op: 'end', label: 'L_2' },
    ]
    expect(buildLabelMap(cmds)).toEqual({ L_1: 1, L_2: 2 })
  })
})

describe('EventSystem', () => {
  it('showDialog → 设 dialogBox + waiting + emit', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '你好' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dialogBox?.currentLineText).toBe('你好')
    expect(gs.eventCursor?.waiting).toBe('dialog')
    expect(bus.drain()[0]?.cmd.op).toBe('showDialogBox')
  })

  // C5(gameOverActive 重构):死亡序列 L_41075 是 0x4F 后跟 4 句 showDialog。showDialog 会清 sceneLoading
  //   (event-system.ts:1647),若死亡 hold 复用 sceneLoading,这 4 句对话就会露大世界 —— 这正是当初发明
  //   gameOverActive 的根因。回归保证:showDialog 清 sceneLoading,但**绝不**碰 gameOverActive / deathHoldActive。
  it('showDialog 清 sceneLoading 但不碰 gameOverActive/deathHoldActive(死亡4句对话不露大世界)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.gameOverActive = true   // 0x4F 已点亮死亡演出
    gs.sceneLoading = true     // 同时有冻屏(对照:showDialog 该清它)
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '大侠请重新来过吧' }, // 死亡对话之一
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneLoading).toBe(false)   // showDialog 清了 sceneLoading
    expect(gs.gameOverActive).toBe(true)  // 但死亡演出标记原样保留 → present 续 hold 染红帧 + 画对话
  })

  it('waiting=dialog + Confirm 释放 → ip++ + 继续到 end → mode=explore', () => {
    //  tick 1: showDialog 入,startDialogLine,waiting=dialog
    //  tick 2 (Confirm): skip-typing → 整行设满 → **return**(满行渲染一帧,2026-05-29 fix B)
    //  tick 3 (Confirm): line-done → 自动 ip++ → end → 有行 → setWaitingEndKey
    //  tick 4 (Confirm): waiting-end-key → dialog-end → 清 dialogBox + waiting=undef → end → mode=explore
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '你好' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.dialogBox).toBeUndefined()
  })

  // BUG fix(2026-06-02):开场梦境三句对话均以 ~NN 收尾。sdlpal text.c:1552 `~` → nCurrentDialogLine=-1,
  //   回 PAL_ShowDialogText ++ → 0 → 段末/清屏的 PAL_ClearDialog(TRUE) 见 line==0 不调 PAL_DialogWaitForKey
  //   (text.c:1770)→ **无黄色向下箭头 + 自动推进**。旧实现用恒真的 shownLines/currentLineText 代理 → 误等键画箭头。
  it('梦境序列:`~` 收尾的 center/bottom 三句遇 0x05/0x8E/end 全程不等键、自动推进(sdlpal nCurrentDialogLine=0)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleCenter' },
      { op: 'showDialog', messageIndex: 0, text: '李逍遥，李逍遥！~30' }, // center,~ 收尾
      { op: 'raw', opcode: OP_REDRAW_SCREEN, operands: [0, 0, 0] },     // 0x05 PAL_ClearDialog(TRUE)+MakeScene
      { op: 'setDialogStyleBottom' },
      { op: 'showDialog', messageIndex: 1, text: '李逍遥:' },           // 姓名 title(不计行)
      { op: 'showDialog', messageIndex: 2, text: '哇哇！~40' },          // bottom,~ 收尾
      { op: 'raw', opcode: OP_RESTORE_SCREEN, operands: [0, 0, 0] },    // 0x8E PAL_ClearDialog(TRUE)+RestoreScreen
      { op: 'showDialog', messageIndex: 3, text: '既然落在你的手里，' }, // 正文(count→1)
      { op: 'showDialog', messageIndex: 4, text: '要杀要剐！~60' },      // ~ 收尾(count→0)
      { op: 'end' },                                                     // PAL_EndDialog line==0 不等键
    ])
    // 全程不按任何键(原版梦境是自动 cutscene)。逐 tick 检查绝不进等键 phase。
    let everWaited = false
    let ticks = 0
    for (; ticks < 300; ticks++) {
      tickEventSystem(gs, snap(), bus)
      // 0x05 redraw 现在按 sdlpal UTIL_Delay(60ms)设 waiting='delay';测试里跳过实时延时(delay 非等键,不影响断言)
      if (gs.eventCursor?.waiting === 'delay') gs.eventCursor.delayUntilMs = 0
      const ph = gs.dialogBox?.phase
      if (ph === 'waiting-end-key' || ph === 'waiting-page-key') everWaited = true
      if (gs.eventCursor === undefined) break // 脚本自动跑完
    }
    expect(everWaited).toBe(false)          // 三句全程无等键 → 无黄色箭头(BUG 修复核心断言)
    expect(gs.eventCursor).toBeUndefined()  // 无按键也自动推进到 end
    expect(gs.dialogBox).toBeUndefined()    // 末句 ~ 收尾 → end 直接关 dialog 不等键
    expect(gs.mode).toBe('explore')
  })

  it('快按 Space:skip-typing 当 tick 整行设满但 cursor **不**推进(留一帧渲染),下一 tick 才 line-done 推进', () => {
    // 2026-05-29 梦境快按 Space 只出 1 行就渐变的根因修复:skip 后整行先渲染一帧,
    // 否则下条 opcode(loadScene/fade 等渲染门)那帧把满行盖掉 → 玩家没看见。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    // 时间驱动后短行 1 tick 即打完,用长行(16 字 ≈ 384ms > 100ms/tick)保证 Confirm 时仍在 typing。
    const longLine = '这是一句比较长的对话需要好几帧才能打完字'
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: longLine },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)            // tick1: typing(部分字)
    expect(gs.dialogBox?.phase).toBe('typing')  // 长行未打完
    tickEventSystem(gs, snap(['Confirm']), bus) // tick2: Confirm → skip → 整行设满 + return
    expect(gs.eventCursor?.ip).toBe(0)          // **没**推进(cursor 还在 showDialog,满行本帧渲染)
    expect(gs.dialogBox?.charsRevealed).toBe(longLine.length) // 整行已满(可渲染)
    expect(gs.dialogBox?.phase).toBe('line-done')
    tickEventSystem(gs, snap(), bus)            // tick3: line-done 自动推进 → ip=1(end)
    expect(gs.eventCursor?.ip).toBe(1)          // 已推进到 end
  })

  it('setDialogStyle 累积到 currentDialogStyle', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleTop' },
      { op: 'showDialog', messageIndex: 0, text: 'x' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogStyle).toBe('top')
    expect(gs.dialogBox?.style).toBe('top')
  })

  it('setDialogStyleTop 带 arg0 (iNumCharFace) + arg1 (bFontColor) → 写入 gs.currentDialogPortraitIcon/FontColor', () => {
    // sdlpal script.c:3404 PAL_StartDialog(kDialogUpper, op[1], op[0], ...)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleTop', arg0: 55, arg1: 12 },
      { op: 'showDialog', messageIndex: 0, text: 'x' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogPortraitIcon).toBe(55)
    expect(gs.currentDialogFontColor).toBe(12)
    expect(gs.dialogBox?.portraitIcon).toBe(55)
    expect(gs.dialogBox?.fontColor).toBe(12)
  })

  it('setDialogStyleCenter arg0 = fontColor(不是 portraitIcon — sdlpal Center 不画头像)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleCenter', arg0: 22 },
      { op: 'showDialog', messageIndex: 0, text: 'x' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogPortraitIcon).toBeUndefined()
    expect(gs.currentDialogFontColor).toBe(22)
  })

  it('setDialogStyleX 在 top/bottom 切换时保留另一侧旧对话', () => {
    // sdlpal script.c:3389-3426 真值:每 setDialogStyleX 入口先 PAL_ClearDialog(TRUE)
    // PAL_ClearDialog 只清 nCurrentDialogLine,不擦屏;随后 PAL_StartDialog(top/bottom) 也不擦另一侧旧像素。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleBottom', arg0: 5, arg1: 10 },   // NPC head
      { op: 'showDialog', messageIndex: 0, text: 'A' },
      { op: 'setDialogStyleTop', arg0: 55, arg1: 12 },     // 主角 head — 应触发 ClearDialog wait
      { op: 'showDialog', messageIndex: 0, text: 'B' },
      { op: 'end' },
    ])
    // tick 1: setDialogStyleBottom 直接 apply(无 prev dialog) + showDialog 入 dialogBox = 'A' typing
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogStyle).toBe('bottom')
    expect(gs.currentDialogPortraitIcon).toBe(5)
    expect(gs.dialogBox?.currentLineText).toBe('A')
    // tick 2 Confirm: skip-typing → line-done → 自动 ip++ → setDialogStyleTop → applySetDialogStyle 检测 prev dialog
    // → setWaitingPageKey + pendingStyle = {top, 55, 12} + waiting='dialog' return
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.dialogBox?.phase).toBe('waiting-page-key')
    expect(gs.dialogBox?.pendingStyle).toEqual({ style: 'top', portraitIcon: 55, fontColor: 12 })
    expect(gs.currentDialogStyle).toBe('bottom')  // 还未 apply
    // tick 3 Confirm: page-advance → 读 pendingStyle apply → 旧 bottom 冻结进 dialogBoxKept,
    // active dialogBox 清空 + ip++ → 下条 showDialog 重建 top。
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.currentDialogStyle).toBe('top')
    expect(gs.currentDialogPortraitIcon).toBe(55)
    expect(gs.currentDialogFontColor).toBe(12)
    expect(gs.dialogBoxKept?.style).toBe('bottom')
    expect(gs.dialogBoxKept?.currentLineText).toBe('A')
    expect(gs.dialogBoxKept?.portraitIcon).toBe(5)
    expect(gs.dialogBox?.currentLineText).toBe('B')   // showDialog 已 startDialogLine
    expect(gs.dialogBox?.style).toBe('top')
    expect(gs.dialogBox?.portraitIcon).toBe(55)
  })

  it('raw 命令 skip + console.debug + ip++', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    // 用两个明确未具名 opcode 走 default debug 分支(0x10 / 0x49 等已陆续实做,改用 0xC0 / 0xD0)
    loadEvent(gs, [
      { op: 'raw', opcode: 0xC0, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0xD0, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore') // 一帧内连跑完
    expect(debugSpy).toHaveBeenCalledTimes(2)
    debugSpy.mockRestore()
  })

  it('goto 跳转', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'goto', to: 'target' },
      { op: 'raw', opcode: 0, operands: [0, 0, 0] }, // 不应执行
      { op: 'end', label: 'target' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore')
  })

  it('单 tick > 256 条 → 抛错防死循环', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const cmds: Command[] = []
    for (let i = 0; i < 1000; i++) cmds.push({ op: 'raw', opcode: 0, operands: [0, 0, 0] })
    loadEvent(gs, cmds)
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    expect(() => tickEventSystem(gs, snap(), bus)).toThrow(/single-tick instruction limit/)
    debugSpy.mockRestore()
  })
})

/** 最小 BattleState fixture(T17 runScript 测试用;无需真实 enemy/player 数据)。 */
function makeMinimalBattleCtx(): BattleCtx {
  const state: BattleState = {
    players: [],
    enemies: [],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    phase: 'preBattle',
    turn: 0,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    menuState: 'main',
    selectedAction: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
  }
  return { state, caster: { type: 'player', idx: 0 } }
}

describe('runScript (M3 T17, battle mode)', () => {
  it('runtimeMode=explore 不传 battleCtx 时 end 立即返回,不修改 GameState', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const before = JSON.stringify(gs)
    const bus = createCommandBus()
    runScript({
      commands: [{ op: 'end' }],
      ip: 0,
      bus,
      runtimeMode: 'explore',
    })
    expect(JSON.stringify(gs)).toBe(before) // GameState 完全不动
    expect(bus.drain()).toEqual([])
  })

  it('runtimeMode=battle + showDialog → 入 battleDialogQueue(战斗对话 hold 消费,不再 emit showBattleMessage)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const ctx = makeMinimalBattleCtx()
    runScript({
      commands: [
        { op: 'showDialog', messageIndex: 0, text: '受到攻击' },
        { op: 'end' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: ctx,
    })
    // 改入队(由 tickBattleDialog 复用大世界 gs.dialogBox 渲染 + 等键),不再 emit showBattleMessage
    expect(bus.drain()).toHaveLength(0)
    expect(ctx.state.battleDialogQueue).toEqual([
      { text: '受到攻击', style: 'bottom', portrait: undefined, fontColor: undefined, clearBefore: undefined },
    ])
    // runScript 本身不碰 explore gs.dialogBox(由战斗 hold 填)
    expect(gs.dialogBox).toBeUndefined()
  })

  it('runtimeMode=battle + setDialogStyleTop → 下条 showDialog 入队带该风格 + portrait/fontColor', () => {
    const bus = createCommandBus()
    const ctx = makeMinimalBattleCtx()
    runScript({
      commands: [
        { op: 'setDialogStyleTop', arg0: 12, arg1: 0x2D },
        { op: 'showDialog', messageIndex: 0, text: '哼!' },
        { op: 'end' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: ctx,
    })
    expect(ctx.state.battleDialogQueue).toEqual([
      { text: '哼!', style: 'top', portrait: 12, fontColor: 0x2D, clearBefore: undefined },
    ])
  })

  it('D26(2b):dialog 序列中 0x69 敌逃跑入队为 effect(保序);队列空时立即跑', () => {
    const bus = createCommandBus()
    // (a) 已有 dialog 入队(蛇女灵儿 obj502@41060:嘲讽 → 0x69 → narration)→ 0x69 defer 为 effect 条目,
    //     保 sdlpal 序(嘲讽对话 → 逃跑动画 → narration),不在收集时立即跑。
    const ctx = makeMinimalBattleCtx()
    runScript({
      commands: [
        { op: 'showDialog', messageIndex: 0, text: '何方妖孽' },
        { op: 'raw', opcode: 0x69, operands: [0, 0, 0] },
        { op: 'showDialog', messageIndex: 0, text: '半人蛇妖逃走了' },
        { op: 'end' },
      ],
      ip: 0, bus, runtimeMode: 'battle', battleCtx: ctx,
    })
    expect(ctx.state.battleDialogQueue).toEqual([
      { text: '何方妖孽', style: 'bottom', portrait: undefined, fontColor: undefined, clearBefore: undefined },
      { effect: { opcode: 0x69, operands: [0, 0, 0] } },
      { text: '半人蛇妖逃走了', style: 'bottom', portrait: undefined, fontColor: undefined, clearBefore: undefined },
    ])
    expect(ctx.state.enemyEscapeAnim).toBeUndefined() // defer:收集时不立即跑逃跑动画

    // (b) 队列空(无前置对话)→ 0x69 立即跑(set enemyEscapeAnim),不入队(0x69→narration 序天然对)
    const ctx2 = makeMinimalBattleCtx()
    runScript({
      commands: [
        { op: 'raw', opcode: 0x69, operands: [0, 0, 0] },
        { op: 'end' },
      ],
      ip: 0, bus, runtimeMode: 'battle', battleCtx: ctx2,
    })
    expect(ctx2.state.enemyEscapeAnim).toEqual({ step: 0 }) // 立即跑
    expect(ctx2.state.battleDialogQueue ?? []).toEqual([])    // 未入队
  })

  it('battle raw 0x35:缓冲到 pendingScreenShake,不提前写全局 shakeTime', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const ctx = { ...makeMinimalBattleCtx(), gs, pendingScreenShake: { time: 0, level: 0 } }
    runScript({
      commands: [
        { op: 'raw', opcode: OP_SHAKE_SCREEN, operands: [14, 0, 0] },
        { op: 'end' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: ctx,
    })

    expect(gs.shakeTime).toBe(0)
    expect(gs.shakeLevel).toBe(0)
    expect(ctx.pendingScreenShake).toEqual({ time: 14, level: 4 })
  })

  it('runtimeMode=battle + 0x05 ClearDialog → 下条 showDialog 入队标 clearBefore', () => {
    const bus = createCommandBus()
    const ctx = makeMinimalBattleCtx()
    runScript({
      commands: [
        { op: 'showDialog', messageIndex: 0, text: 'A' },
        { op: 'raw', opcode: 0x05, operands: [0, 0, 0] },
        { op: 'showDialog', messageIndex: 0, text: 'B' },
        { op: 'end' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: ctx,
    })
    expect(ctx.state.battleDialogQueue?.map((l) => ({ text: l.text, clearBefore: l.clearBefore }))).toEqual([
      { text: 'A', clearBefore: undefined },
      { text: 'B', clearBefore: true }, // 0x05 在 A 后 → B 标 clearBefore
    ])
  })

  it('runtimeMode=battle + raw → console.debug 含 [event-system battle] 前缀 + ip++', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const bus = createCommandBus()
    runScript({
      commands: [
        // 0xC0(192)+ 0x99 都不在 dispatchBattleOpcode 具名集 → D26 debug skip。
        // (注:0x42 SimulateMagic 现已具名 consumed,不再走 skip,故此处换用 0xC0 当未具名样例。)
        { op: 'raw', opcode: 0xC0, operands: [1, 2, 3] },
        { op: 'raw', opcode: 0x99, operands: [0, 0, 0] },
        { op: 'end' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: makeMinimalBattleCtx(),
    })
    expect(debugSpy).toHaveBeenCalledTimes(2)
    // 前缀含 battle 标记,方便 T20/T21 grep
    const firstCall = debugSpy.mock.calls[0]?.[0] as string
    expect(firstCall).toMatch(/\[event-system battle\]/)
    expect(firstCall).toMatch(/opcode=192/) // 0xC0 = 192(未具名样例)
    debugSpy.mockRestore()
  })

  it('runtimeMode=battle + 未具名 raw(0x06 概率跳)+ gs → fall 到 applyRawOpcode 真生效:法术失败分支可达', () => {
    // 结构修(2026-05-31):battle raw 未被 dispatchBattleOpcode 消费 → fall 到大世界统一解释器 applyRawOpcode
    //   (对齐 sdlpal 单一 PAL_InterpretInstruction)。0x06 jump-by-rate rate=0 → RandomLong(1,100)>=0 恒真
    //   → 必跳 operand[1](L_3 失败分支)。旧:battle raw 直接 skip → 0x06 不跳 → 失败分支(setDialogStyle
    //   Narration + showDialog "失败 没有效果" msg13364)永不达。需 gs(applyRawOpcode 形参)。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const ctx = { ...makeMinimalBattleCtx(), gs }
    runScript({
      commands: [
        { op: 'raw', opcode: 0x06, operands: [0, 3, 0], label: 'L_0' }, // rate=0 恒跳 → L_3
        { op: 'showDialog', messageIndex: 0, text: '成功路径(被跳过)' }, // index 1(跳过)
        { op: 'end' }, // index 2
        { op: 'setDialogStyleNarration', arg0: 0, arg1: 0, label: 'L_3' }, // index 3
        { op: 'showDialog', messageIndex: 13364, text: '失败　没有效果' }, // index 4
        { op: 'end' }, // index 5
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: ctx,
    })
    // 跳到失败分支 → narration 居中框入队(成功路径文本未入队)
    expect(ctx.state.battleDialogQueue?.map((l) => ({ text: l.text, style: l.style }))).toEqual([
      { text: '失败　没有效果', style: 'narration' },
    ])
  })

  it('runtimeMode=battle + 0x1E 减钱不足 → 跳 operand[1](资源条件跳转在战斗内真生效)', () => {
    // 0x1E:operand[0]<0 且 dwCash < |operand[0]| → jump operand[1];否则 dwCash += operand[0]。
    //   钱不足分支(sdlpal script.c:952-968)在战斗法术脚本(花钱法术)中靠它。结构修后 fall 到 applyRawOpcode。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 5 // 不足以扣 100
    const bus = createCommandBus()
    const ctx = { ...makeMinimalBattleCtx(), gs }
    runScript({
      commands: [
        { op: 'raw', opcode: 0x1E, operands: [0xFF9C, 3, 0], label: 'L_0' }, // -100;cash=5<100 → 跳 L_3
        { op: 'showDialog', messageIndex: 0, text: '够钱(跳过)' },
        { op: 'end' },
        { op: 'showDialog', messageIndex: 0, text: '钱不够', label: 'L_3' },
        { op: 'end' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: ctx,
    })
    expect(ctx.state.battleDialogQueue?.map((l) => l.text)).toEqual(['钱不够'])
    expect(gs.dwCash).toBe(5) // 未扣(走了 jump 分支)
  })

  it('runtimeMode=battle:条件跳转目标**未打 label** → fall back globalIp(修乾坤一掷43064/酒神43078)', () => {
    // 真 bug(user 报):乾坤一掷"钱不够"分支 @43064 / 酒神"酒不足"@43078 **无 label**;cursor 带 labelMap
    //   时 jumpToGlobalIp 查 L_<n> 查不到 → 旧逻辑静默不跳 → 没钱仍放乾坤一掷且 0 伤害。修:fall back globalIp。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 0 // 没钱
    const bus = createCommandBus()
    const ctx = { ...makeMinimalBattleCtx(), gs }
    runScript({
      commands: [
        { op: 'raw', opcode: 0x1E, operands: [0xFFFF, 3, 0], label: 'L_0' }, // -1;cash=0<1 → 跳 index3(**无 label**)
        { op: 'raw', opcode: 0x88, operands: [394, 0, 0] }, // 成功路径 set-damage-by-money(应跳过)
        { op: 'end' },
        { op: 'showDialog', messageIndex: 0, text: '钱不够，只好作罢' }, // index3:无 label 失败分支
        { op: 'end' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: ctx,
    })
    // 跳到未打 label 的 index3 → "钱不够"入队(0x88 成功路径未走)
    expect(ctx.state.battleDialogQueue?.[0]?.text).toBe('钱不够，只好作罢')
  })

  it('runtimeMode=battle 缺 battleCtx 抛错', () => {
    const bus = createCommandBus()
    expect(() =>
      runScript({
        commands: [{ op: 'end' }],
        ip: 0,
        bus,
        runtimeMode: 'battle',
      }),
    ).toThrow(/battleCtx/)
  })

  it('runtimeMode=explore 误传 battleCtx 抛错', () => {
    const bus = createCommandBus()
    expect(() =>
      runScript({
        commands: [{ op: 'end' }],
        ip: 0,
        bus,
        runtimeMode: 'explore',
        battleCtx: makeMinimalBattleCtx(),
      }),
    ).toThrow(/explore/)
  })

  it('goto 跳转在 battle mode 仍生效', () => {
    const bus = createCommandBus()
    runScript({
      commands: [
        { op: 'goto', to: 'target' },
        { op: 'raw', opcode: 0, operands: [0, 0, 0] }, // 不应执行
        { op: 'end', label: 'target' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: makeMinimalBattleCtx(),
    })
    expect(bus.drain()).toEqual([]) // 没 emit 任何东西(raw 被跳过)
  })

  it('battle mode 下 setDialogStyle* 视为 no-op skip,不改 GameState', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const beforeStyle = gs.currentDialogStyle
    const bus = createCommandBus()
    runScript({
      commands: [
        { op: 'setDialogStyleTop' },
        { op: 'setDialogStyleBottom' },
        { op: 'end' },
      ],
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: makeMinimalBattleCtx(),
    })
    // GameState.currentDialogStyle 完全不动(不变量)
    expect(gs.currentDialogStyle).toBe(beforeStyle)
  })

  it('死循环防御:battle mode raw 链 > 256 条抛错', () => {
    const bus = createCommandBus()
    const cmds: Command[] = []
    for (let i = 0; i < 1000; i++) cmds.push({ op: 'raw', opcode: 0, operands: [0, 0, 0] })
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    expect(() =>
      runScript({
        commands: cmds,
        ip: 0,
        bus,
        runtimeMode: 'battle',
        battleCtx: makeMinimalBattleCtx(),
      }),
    ).toThrow(/single-tick instruction limit/)
    debugSpy.mockRestore()
  })
})

describe('loadScene opcode handler stub(M3.5 T10 / B 路线)', () => {
  it('explore mode 撞 loadScene → no-op + console.warn + ip++ 不抛错', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    // M4 P3:无 _sceneLoader 注入时走 warn 分支(配置缺失 → warn 比 debug 更准)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    loadEvent(gs, [
      { op: 'loadScene', sceneId: 42 },
      { op: 'end' },
    ])
    // 不抛错(stub no-op)
    expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
    // 一帧内 loadScene + end 连跑完 → mode=explore
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
    // console.warn 被调用,信息含 loadScene + sceneId
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const msg = warnSpy.mock.calls[0]?.[0] as string
    expect(msg).toContain('loadScene')
    expect(msg).toContain('42')
    warnSpy.mockRestore()
  })

  it('battle mode 同样 stub(D26 跨 mode 一致):no-op + console.debug + ip++', () => {
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    expect(() =>
      runScript({
        commands: [
          { op: 'loadScene', sceneId: 7 },
          { op: 'end' },
        ],
        ip: 0,
        bus,
        runtimeMode: 'battle',
        battleCtx: makeMinimalBattleCtx(),
      }),
    ).not.toThrow()
    // stub 是 no-op,不 emit 任何 bus 命令
    expect(bus.drain()).toEqual([])
    // console.debug 被调用,信息含 loadScene + sceneId + battle 前缀(D26 跨 mode 一致)
    expect(debugSpy).toHaveBeenCalledTimes(1)
    const msg = debugSpy.mock.calls[0]?.[0] as string
    expect(msg).toContain('loadScene')
    expect(msg).toContain('7')
    expect(msg).toMatch(/\[event-system battle\]/)
    debugSpy.mockRestore()
  })
})

describe('setPalette opcode handler(M4 P3.T2)', () => {
  const fakePalette: Palette = { colors: Array(256).fill([0, 0, 0]) as [number, number, number][], cycles: [] }

  it('explore mode: fetchPalette 被调用,gs.palette 异步更新', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const mockFetch = vi.fn().mockResolvedValue(fakePalette)
    setFetchPalette(mockFetch)

    loadEvent(gs, [
      { op: 'setPalette', paletteIndex: 3 },
      { op: 'end' },
    ])

    tickEventSystem(gs, snap(), bus)

    // tickEventSystem は同期で ip++ して end まで走る → mode=explore
    expect(gs.mode).toBe('explore')
    // fetchPalette が paletteIndex=3 で呼ばれていること
    expect(mockFetch).toHaveBeenCalledOnce()
    expect(mockFetch).toHaveBeenCalledWith(3)

    // Promise が resolve するのを待つ
    await vi.waitFor(() => expect(gs.palette).toBe(fakePalette))
  })

  it('explore mode: fetchPalette 未注入 → console.debug + ip++ 不抛错', () => {
    // reset injection to null so handler takes the "未注入" branch
    setFetchPalette(null)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    loadEvent(gs, [
      { op: 'setPalette', paletteIndex: 5 },
      { op: 'end' },
    ])

    expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
    expect(gs.mode).toBe('explore')
    expect(debugSpy).toHaveBeenCalledTimes(1)
    const msg = debugSpy.mock.calls[0]?.[0] as string
    expect(msg).toContain('setPalette')
    expect(msg).toContain('5')
    debugSpy.mockRestore()
    // cleanup: restore a no-op fetchPalette so other tests aren't affected
    setFetchPalette(() => Promise.resolve(fakePalette))
  })

  it('battle mode(runScript): setPalette → no-op skip + console.debug + ip++', () => {
    setFetchPalette(() => Promise.resolve(fakePalette))
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    expect(() =>
      runScript({
        commands: [
          { op: 'setPalette', paletteIndex: 2 },
          { op: 'end' },
        ],
        ip: 0,
        bus,
        runtimeMode: 'battle',
        battleCtx: makeMinimalBattleCtx(),
      }),
    ).not.toThrow()

    expect(bus.drain()).toEqual([])
    expect(debugSpy).toHaveBeenCalledTimes(1)
    const msg = debugSpy.mock.calls[0]?.[0] as string
    expect(msg).toContain('setPalette')
    expect(msg).toContain('2')
    expect(msg).toMatch(/\[event-system battle\]/)
    debugSpy.mockRestore()
  })
})

// ── P0.e: opcode 7 startBattle handler 注入 ──────────────────────────────────
describe('opcode 7 startBattle(P0.e — sdlpal script.c:3318 PAL_StartBattle)', () => {
  it('raw#7 → 调 startBattle handler + 清 eventCursor + mode 切 battle', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const handler = vi.fn(({ gs: handlerGs }: { gs: GameState }) => {
      handlerGs.mode = 'battle'
    })
    setStartBattleHandler(handler)

    loadEvent(gs, [
      { op: 'raw', opcode: OP_START_BATTLE, operands: [15, 41075, 41073] },
      { op: 'end' },
    ])

    tickEventSystem(gs, snap(), bus)

    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith({
      gs,
      enemyTeamId: 15,
      isBoss: false,
    })
    expect(gs.mode).toBe('battle')
    expect(gs.eventCursor).toBeUndefined()
    setStartBattleHandler(null)
  })

  it('showDialog 纯控制符行("$00"/"$02")→ 跳过不加空行(死亡脚本 L_41075,sdlpal 无可见字不开行)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    loadEvent(gs, [
      { op: 'showDialog', text: '$00', messageIndex: 0 },           // 纯打字速度码 → 跳过,不加空行
      { op: 'showDialog', text: '大侠请重新来过吧', messageIndex: 0 }, // 真行
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), createCommandBus())
    // 首个真行(大侠...)= currentLine;$00 没加空行 → 无 shown 空行堆积
    expect(gs.dialogBox?.currentLineText ?? '').toContain('大侠')
    expect(gs.dialogBox?.shownLines.length ?? 0).toBe(0)
  })

  it('raw#7 存 postBattleResume(战后接回触发脚本 → 修打完怪不消失,script.c:3318-3331)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    setStartBattleHandler(({ gs: g }: { gs: GameState }) => { g.mode = 'battle' })
    loadEvent(gs, [
      { op: 'raw', opcode: OP_START_BATTLE, operands: [15, 41075, 41073] }, // ip0
      { op: 'raw', opcode: 0x52, operands: [150, 0, 0] },                   // ip1:0x52 隐藏怪
      { op: 'end' },                                                       // ip2
    ])
    gs.eventCursor!.currentEventObjectId = 3 // 开战那只怪的 event object id
    gs.eventCursor!.triggerOwnerId = 3
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.eventCursor).toBeUndefined() // 战斗中清 cursor
    expect(gs.postBattleResume?.wonIp).toBe(1) // 胜 → 0x07 后下一条(0x52)
    expect(gs.postBattleResume?.lostIp).toBe(41075) // 负 → op[1]
    expect(gs.postBattleResume?.fledIp).toBe(41073) // 逃 → op[2]
    expect(gs.postBattleResume?.currentEventObjectId).toBe(3) // 战末 0x52 隐藏的是这只怪
    setStartBattleHandler(null)
  })

  it('operand[2]=0 → isBoss=true(sdlpal !operand[2])', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const handler = vi.fn(({ gs: g }: { gs: GameState }) => { g.mode = 'battle' })
    setStartBattleHandler(handler)

    loadEvent(gs, [
      { op: 'raw', opcode: OP_START_BATTLE, operands: [5, 0, 0] },
      { op: 'end' },
    ])

    tickEventSystem(gs, snap(), bus)

    expect(handler).toHaveBeenCalledWith({
      gs,
      enemyTeamId: 5,
      isBoss: true,
    })
    setStartBattleHandler(null)
  })

  it('handler 未注入 → warn + 清 cursor 但不抛错(P0.e 简化版安全网)', () => {
    setStartBattleHandler(null)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    loadEvent(gs, [
      { op: 'raw', opcode: OP_START_BATTLE, operands: [7, 0, 0] },
      { op: 'end' },
    ])

    expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
    expect(warnSpy).toHaveBeenCalled()
    expect(gs.eventCursor).toBeUndefined()
    warnSpy.mockRestore()
  })

  it('具名 op:startBattle → 同 raw#7 走 handler 路径', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const handler = vi.fn(({ gs: g }: { gs: GameState }) => { g.mode = 'battle' })
    setStartBattleHandler(handler)

    loadEvent(gs, [
      { op: 'startBattle', enemyTeamId: 9, operands: [9, 0, 1234] },
      { op: 'end' },
    ])

    tickEventSystem(gs, snap(), bus)

    expect(handler).toHaveBeenCalledWith({
      gs,
      enemyTeamId: 9,
      isBoss: false,
    })
    expect(gs.mode).toBe('battle')
    expect(gs.eventCursor).toBeUndefined()
    setStartBattleHandler(null)
  })
})

describe('opcode 0xA7 explicit no-op', () => {
  it('推进脚本且不落入 unknown raw debug(sdlpal script.c:3639)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    try {
      loadEvent(gs, [
        { op: 'raw', opcode: OP_NOOP_A7, operands: [0, 0, 0] },
        { op: 'end' },
      ])

      tickEventSystem(gs, snap(), bus)

      expect(gs.eventCursor).toBeUndefined()
      expect(
        debugSpy.mock.calls.some(([msg]) => {
          const text = String(msg)
          return text.includes('skip raw opcode=0x00a7') || text.includes('skip raw opcode=167')
        }),
      ).toBe(false)
    }
    finally {
      debugSpy.mockRestore()
    }
  })
})

// ── P2#5: goto "shared#L_xxx" → 单一全局数组(剥 shared# 前缀,经全局 labelMap 解析)──────
// 旧模型 shared.json 是独立切片(setSharedEvents 切 cursor.commands);P2#5 塌缩成单一全局数组:
// 'shared#L_X' 前缀剥掉后即全局 L_X,经 _globalLabelMap 解全局 ip,cursor 不再换来源(默认读全局)。
describe('goto shared#L_xxx(P2#5 — 单一全局数组,剥前缀经全局 labelMap 解析)', () => {
  it('goto shared#L_X → 剥前缀经全局 labelMap 跳到全局 ip + 跑该处命令', () => {
    // 全局数组:idx0=trigger 入口(goto shared#L_S1),idx2=L_S1 目标(showDialog "in shared")。
    const globalCommands: Command[] = [
      { op: 'goto', to: 'shared#L_S1' },                                       // 0: 入口
      { op: 'end' },                                                           // 1
      { op: 'showDialog', messageIndex: 0, text: 'in shared', label: 'L_S1' }, // 2: 共享目标
      { op: 'end' },                                                           // 3
    ]
    setGlobalEvents(globalCommands)
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const bus = createCommandBus()
      // 生产 cursor 只存 ip,默认读全局数组(无 commands/labelMap override)。
      gs.eventCursor = { ip: 0 }
      gs.mode = 'event'

      tickEventSystem(gs, snap(), bus)

      // P2#5:cursor 不换来源(commands/labelMap 仍 undefined → 默认全局);ip 落到全局 L_S1 = idx2。
      expect(gs.eventCursor?.commands).toBeUndefined()
      expect(gs.eventCursor?.labelMap).toBeUndefined()
      expect(gs.eventCursor?.ip).toBe(2)
      expect(gs.dialogBox?.currentLineText).toBe('in shared')
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('shared# label 全局不存在 → warn + skip(不抛错,不死循环)', () => {
    // 旧模型:缺 shared label 立即抛 `shared goto label` 错。P2#5 设计意图(migration rule 3):
    //   主 while goto 改 warn + skip(不抛错)。
    // ⚠ 疑似生产 BUG(留 failing,不 mask):主 while 的 goto case(event-system.ts:1160-1170)
    //   解不到 label 时只 console.warn + `break`,**不推进 cursor.ip** → 同一 goto 被反复重读 →
    //   触发 SINGLE_TICK_LIMIT(256)guard 抛 `single-tick instruction limit` 错。
    //   autoCursor 的 goto(event-system.ts:765-781)解不到时清 cursor(不死循环),两路不一致 —
    //   主 while goto 应同样在解不到时清 cursor / 推进 ip,而非自旋到 tick-limit。
    setGlobalEvents([
      { op: 'goto', to: 'shared#L_DOES_NOT_EXIST' }, // 0: 目标不在全局 labelMap → 应 warn skip
      { op: 'end' },                                 // 1: 脚本结束
    ])
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const bus = createCommandBus()
      gs.eventCursor = { ip: 0 }
      gs.mode = 'event'

      expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
      expect(gs.mode).toBe('explore')
      expect(gs.eventCursor).toBeUndefined()
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('普通 goto(无 shared# 前缀)走 cursor.labelMap 原路径', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'goto', to: 'L_LOCAL' },
      { op: 'showDialog', messageIndex: 0, text: 'wrong path' },
      { op: 'end', label: 'L_LOCAL' },
    ])

    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore')
    expect(gs.dialogBox).toBeUndefined()
  })

  it('shared# 目标处 end → mode 回 explore + 清 cursor', () => {
    setGlobalEvents([
      { op: 'goto', to: 'shared#L_S_END' }, // 0: 入口
      { op: 'end' },                        // 1
      { op: 'end', label: 'L_S_END' },      // 2: 共享目标 = end
    ])
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const bus = createCommandBus()
      gs.eventCursor = { ip: 0 }
      gs.mode = 'event'

      tickEventSystem(gs, snap(), bus)

      expect(gs.mode).toBe('explore')
      expect(gs.eventCursor).toBeUndefined()
    }
    finally {
      setGlobalEvents([])
    }
  })
})

// ── P0.e: opcode 0x4A setBattlefield 写 gs.wNumBattleField ────────────────────
describe('opcode 0x4A setBattlefield(P0.e — sdlpal script.c:1719)', () => {
  it('raw#0x4A → gs.wNumBattleField = operand[0]', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    expect(gs.wNumBattleField).toBe(0) // M5 Sync.1: 改为 required 字段, 初始值 0

    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_BATTLE_FIELD, operands: [10, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)

    expect(gs.wNumBattleField).toBe(10)
    expect(gs.mode).toBe('explore')
  })

  it('多次 setBattlefield → 写入最后一次值', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_BATTLE_FIELD, operands: [5, 0, 0] },
      { op: 'raw', opcode: OP_SET_BATTLE_FIELD, operands: [10, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wNumBattleField).toBe(10)
  })
})

// ── Sync.2 fix3: 5 个 cutscene opcode(scene 1 onEnter 高频用) ──────────────

describe('opcode 0x0009 wait N frames(sdlpal script.c:3593-3604)', () => {
  it('wait 3 frames → cursor 卡 3 tick 再 ip++', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_WAIT_FRAMES, operands: [3, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('frame-wait')
    expect(gs.eventCursor?.waitFramesRemaining).toBe(3)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waitFramesRemaining).toBe(2)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waitFramesRemaining).toBe(1)
    tickEventSystem(gs, snap(), bus)
    // 第 3 次 waitFramesRemaining 减到 0 → clear waiting + ip++ + end → mode=explore
    expect(gs.mode).toBe('explore')
  })

  it('wait operand[0]==0 → 视作 1 帧(sdlpal 真值 fallback)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_WAIT_FRAMES, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waitFramesRemaining).toBe(1)
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore')
  })
})

describe('opcode 0x004D wait-for-any-key(sdlpal script.c:1753 / play.c:602-638 PAL_WaitForKeyInternal(0,FALSE))', () => {
  it('设 waiting=wait-key 永久阻塞,无按键不前进', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_WAIT_FOR_KEY, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('wait-key')
    expect(gs.eventCursor?.ip).toBe(0) // 未推进
    // 连续多 tick 无按键 → 仍卡在 wait-key
    tickEventSystem(gs, snap(), bus)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('wait-key')
    expect(gs.mode).toBe('event')
  })

  it('Confirm(kKeySearch)解除 → 清 waiting + ip++ + 续跑到 end → mode=explore', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_WAIT_FOR_KEY, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('wait-key')
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.mode).toBe('explore') // 解除 + ip++ + end
  })

  it('Menu(kKeyMenu)与 Cancel 同样解除', () => {
    for (const key of ['Menu', 'Cancel'] as const) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'raw', opcode: OP_WAIT_FOR_KEY, operands: [0, 0, 0] },
        { op: 'end' },
      ])
      tickEventSystem(gs, snap(), bus)
      expect(gs.eventCursor?.waiting).toBe('wait-key')
      tickEventSystem(gs, snap([key]), bus)
      expect(gs.mode).toBe('explore')
    }
  })

  it('方向键不解除 wait-key(sdlpal 只认 kKeySearch|kKeyMenu)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_WAIT_FOR_KEY, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    tickEventSystem(gs, snap(['Up']), bus)
    expect(gs.eventCursor?.waiting).toBe('wait-key')
    expect(gs.mode).toBe('event')
  })
})

describe('opcode 0x000A goto-if-no / ConfirmMenu(sdlpal script.c:3373-3387 / uigame.c:342-365)', () => {
  // sdlpal:PAL_ClearDialog(FALSE) → PAL_ConfirmMenu(否=19/是=20,nDefault=0=否);
  //   !ConfirmMenu()(否 / cancel)→ wScriptEntry=operand[0](goto);else(是)→ wScriptEntry++。
  // 本地命令布局:ip0=0x0A(operand[0]=3 → goto L_3),ip1=是分支,ip2=end,ip3=否分支(L_3),ip4=end。
  function load0a(gs: GameState): void {
    loadEvent(gs, [
      { op: 'raw', opcode: OP_GOTO_IF_NO, operands: [3, 0, 0] },
      { op: 'showDialog', messageIndex: 0, text: 'YES' },
      { op: 'end' },
      { op: 'showDialog', messageIndex: 1, text: 'NO', label: 'L_3' },
      { op: 'end' },
    ])
  }

  it('进入 → waiting=confirm + 默认 否(confirmYes=false)+ ip 不动', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    load0a(gs)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('confirm')
    expect(gs.eventCursor?.confirmYes).toBe(false)
    expect(gs.eventCursor?.ip).toBe(0)
  })

  it('无按键 → 永久阻塞(autoScript 冻,ip 不动)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    load0a(gs)
    tickEventSystem(gs, snap(), bus)
    tickEventSystem(gs, snap(), bus)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('confirm')
    expect(gs.eventCursor?.ip).toBe(0)
  })

  it('Up/Down/Left/Right 切换选择(2 项 next/prev 均 toggle,sdlpal ui.c wrap),不提交', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    load0a(gs)
    tickEventSystem(gs, snap(), bus) // enter,默认 否
    tickEventSystem(gs, snap(['Right']), bus)
    expect(gs.eventCursor?.confirmYes).toBe(true)
    tickEventSystem(gs, snap(['Left']), bus)
    expect(gs.eventCursor?.confirmYes).toBe(false)
    tickEventSystem(gs, snap(['Up']), bus)
    expect(gs.eventCursor?.confirmYes).toBe(true)
    tickEventSystem(gs, snap(['Down']), bus)
    expect(gs.eventCursor?.confirmYes).toBe(false)
    // 仍阻塞
    expect(gs.eventCursor?.waiting).toBe('confirm')
    expect(gs.eventCursor?.ip).toBe(0)
  })

  it('是(Right + Confirm)→ ip++ 跨过 0x0A → 跑是分支(showDialog "YES")', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    load0a(gs)
    tickEventSystem(gs, snap(), bus)          // enter
    tickEventSystem(gs, snap(['Right']), bus)  // 选 是
    tickEventSystem(gs, snap(['Confirm']), bus) // 提交 是 → ip++ → showDialog YES
    expect(gs.eventCursor?.waiting).toBe('dialog')
    expect(gs.dialogBox?.currentLineText).toBe('YES')
  })

  it('否(默认 + Confirm)→ goto operand[0] → 跑否分支(showDialog "NO")', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    load0a(gs)
    tickEventSystem(gs, snap(), bus)            // enter,默认 否
    tickEventSystem(gs, snap(['Confirm']), bus)  // 提交 否 → goto L_3 → showDialog NO
    expect(gs.dialogBox?.currentLineText).toBe('NO')
  })

  it('Cancel / Menu 等价 否(sdlpal CANCELLED→FALSE)→ goto operand[0],即便已选 是', () => {
    for (const key of ['Cancel', 'Menu'] as const) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const bus = createCommandBus()
      load0a(gs)
      tickEventSystem(gs, snap(), bus)
      tickEventSystem(gs, snap(['Right']), bus) // 故意选 是
      tickEventSystem(gs, snap([key]), bus)      // Cancel/Menu → 仍 goto 否分支
      expect(gs.dialogBox?.currentLineText).toBe('NO')
    }
  })

  it('PAL_ClearDialog(FALSE):问句 confirm 期保留可见,选完才清(且不触发 Space-wait pre-op clear)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '要不要' },
      { op: 'raw', opcode: OP_GOTO_IF_NO, operands: [3, 0, 0] },
      { op: 'end' },
      { op: 'end', label: 'L_3' },
    ])
    // 问句逐字打完 → 自动推进到 0x0A;0x0A 在 isDialogContinuationOp 豁免 →
    //   不走 default 的 Space-wait pre-op clear,直接进 confirm(问句仍在屏)。
    for (let i = 0; i < 12 && gs.eventCursor?.waiting !== 'confirm'; i++) {
      tickEventSystem(gs, snap(), bus)
    }
    expect(gs.eventCursor?.waiting).toBe('confirm')        // 不是 'dialog'(Space-wait)
    expect(gs.dialogBox?.currentLineText).toBe('要不要')    // 问句 confirm 期保留
    // 选 否(默认)→ goto L_3(end)→ 清问句 + 结束脚本
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.mode).toBe('explore')
  })
})

describe('opcode 0x0046 setPartyPos 填 trail(sdlpal script.c 0x46:rgTrail[0..4]=队伍位置+身后偏移)', () => {
  // sdlpal:进场景定位时把 rgTrail[0..4] 全填成队伍世界坐标 + i*(xOffset,yOffset)(每槽往身后退一格),
  //   朝向 = wPartyDirection。→ 队员 / 0x98 跟随者进场景立刻排好(否则 trail 残留旧场景 / 空)。
  //   xOffset = (左||下)?16:-16;yOffset = (左||上)?8:-8。

  it('设位置 → gs.trail 填满 5 槽,每槽身后偏 i*(xOff,yOff),朝向=队伍朝向(down:xOff=16,yOff=-8)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x46, operands: [2, 3, 0] }, // px=2*32=64, py=3*16=48
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.trail).toHaveLength(5)
    expect(gs.trail[0]).toEqual({ x: 64, y: 48, dir: 'down' })
    expect(gs.trail[1]).toEqual({ x: 64 + 16, y: 48 - 8, dir: 'down' })
    expect(gs.trail[4]).toEqual({ x: 64 + 4 * 16, y: 48 - 4 * 8, dir: 'down' })
  })

  it('朝向决定 offset 符号(left→+16/+8;right→-16/-8;up→-16/+8;down→+16/-8)', () => {
    const cases = [
      ['left', 16, 8], ['right', -16, -8], ['up', -16, 8], ['down', 16, -8],
    ] as const
    for (const [facing, xOff, yOff] of cases) {
      const gs = createInitialGameState({ x: 0, y: 0, facing })
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'raw', opcode: 0x46, operands: [1, 1, 0] }, // px=32, py=16
        { op: 'end' },
      ])
      tickEventSystem(gs, snap(), bus)
      expect(gs.trail[2]).toEqual({ x: 32 + 2 * xOff, y: 16 + 2 * yOff, dir: facing })
    }
  })
})

describe('opcode 0x00A0 quit(sdlpal script.c:2988-2996;用户决策:跳过 PAL_AdditionalCredits 回标题)', () => {
  it('有 _quitHandler:调 handler 一次 + 设 waiting=quit 阻塞(不步进/不重复调)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    let called = 0
    setQuitHandler(() => { called++ })
    loadEvent(gs, [
      { op: 'raw', opcode: OP_QUIT, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(called).toBe(1)
    expect(gs.eventCursor?.waiting).toBe('quit')
    expect(gs.eventCursor?.ip).toBe(0) // 未步进
    // 后续 tick:waiting=quit 派发分支 block,handler 不重复调(回标题前 cursor 弃用由 bootstrap 异步做)
    tickEventSystem(gs, snap(), bus)
    expect(called).toBe(1)
    expect(gs.eventCursor?.waiting).toBe('quit')
    setQuitHandler(null)
  })

  it('无 _quitHandler:降级清 cursor(不卡死)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    setQuitHandler(null)
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    loadEvent(gs, [
      { op: 'raw', opcode: OP_QUIT, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor).toBeUndefined()
    debugSpy.mockRestore()
  })
})

describe('opcode 0x0013 setObjectPos(sdlpal script.c:716-722)', () => {
  it('设当前 trigger NPC 坐标 → gs.npcs[id].x/y', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 5, x: 100, y: 100, spriteNum: 1 }]
    // 手动模拟 scene-system 触发:设 currentEventObjectId
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_OBJECT_POS, operands: [0, 200, 150] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(200)
    expect(gs.npcs[0]?.y).toBe(150)
  })

  it('无 currentEventObjectId → 跳过 + warn(不抛错)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_OBJECT_POS, operands: [0, 50, 60] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(warnSpy).toHaveBeenCalled()
    expect(gs.mode).toBe('explore')
    warnSpy.mockRestore()
  })
})

describe('opcode 0x0014 setObjectGesture(sdlpal script.c:724-730)— pose 核心', () => {
  it('设 npc.scriptedFrame=operand[0] + 强制 facing=down', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, facing: 'up' }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [5, 0, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.scriptedFrame).toBe(5)
    expect(gs.npcs[0]?.facing).toBe('down')  // sdlpal 强制 kDirSouth
  })
})

describe('opcode 0x0016 setEventObjectDirAndFrame(sdlpal script.c:741-750)', () => {
  it('operand[0]=0xFFFF → 用 self(currentEventObjectId)+ facing=operand[1] + scriptedFrame=operand[2]', () => {
    // fix4:operand[0]=0/0xFFFF → self;operand[0]==0 在 0x16 是 silent skip,所以 self 用 0xFFFF
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1 }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_EVENT_OBJECT_DIR_AND_FRAME, operands: [0xFFFF, 2, 8] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('up')
    expect(gs.npcs[0]?.scriptedFrame).toBe(8)
  })

  it('operand[0] 显式 NPC id(1-based)→ 作用于 npcs.find(id==op0-1),即使 currentEventObjectId 不同', () => {
    // fix4:operand[0] = 8 → 显式找 npc.id = 7(1-based op[0] - 1 = 0-based id)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [
      { id: 0, x: 0, y: 0, spriteNum: 1 },
      { id: 7, x: 100, y: 0, spriteNum: 1 },
    ]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_EVENT_OBJECT_DIR_AND_FRAME, operands: [8, 1, 5] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 0   // self 是 npc 0,但 operand[0]=8 显式找 npc 7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBeUndefined()       // npc 0 未改
    expect(gs.npcs[1]?.facing).toBe('left')          // npc 7 被改
    expect(gs.npcs[1]?.scriptedFrame).toBe(5)
  })

  it('operand[0]==0 → no-op(sdlpal 真值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, facing: 'down', scriptedFrame: 3 }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_EVENT_OBJECT_DIR_AND_FRAME, operands: [0, 2, 8] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('down')       // 未改
    expect(gs.npcs[0]?.scriptedFrame).toBe(3)     // 未改
  })
})

describe('opcode 0x000F setEventObjectDirOrFrame(sdlpal script.c:663-675)', () => {
  it('operand[0] != 0xFFFF → 设 facing;operand[1] != 0xFFFF → 设 scriptedFrame', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 4, x: 0, y: 0, spriteNum: 1 }]
    loadEvent(gs, [
      // operand[0]=3 → right (kDirEast),operand[1]=2 → frame=2
      { op: 'raw', opcode: OP_SET_EVENT_OBJECT_DIR_OR_FRAME, operands: [3, 2, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 4
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('right')
    expect(gs.npcs[0]?.scriptedFrame).toBe(2)
  })

  it('operand[0]==0xFFFF → 仅设 scriptedFrame,不改 facing', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 4, x: 0, y: 0, spriteNum: 1, facing: 'left' }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_EVENT_OBJECT_DIR_OR_FRAME, operands: [0xFFFF, 7, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 4
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('left')      // 未改
    expect(gs.npcs[0]?.scriptedFrame).toBe(7)
  })
})

describe('opcode 0x0015 setPartyDirectionAndFrame(sdlpal script.c:732-739)— fix3 真值修', () => {
  it('设 facing=op[0] + partyScriptedFrame[op[2]] = op[0]*3 + op[1]', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      // op[0]=2 (up=North), op[1]=1 (frame offset), op[2]=0 (leader)
      // 期望 wFrame = 2*3 + 1 = 7,facing=up
      { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [2, 1, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.facing).toBe('up')
    expect(gs.partyScriptedFrame[0]).toBe(7)
  })

  it('member index 非 0 → 写到对应槽位', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [1, 2, 2] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.partyScriptedFrame[2]).toBe(1 * 3 + 2)  // dir=1 (left) * 3 + 2 = 5
    expect(gs.partyScriptedFrame[0]).toBeUndefined()
  })
})

describe('opcode 0x006C npcWalkOneStep(sdlpal script.c:2056-2063)', () => {
  it('apply operand[1]/[2] 偏移 + SHORT 真转(负值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 3, x: 100, y: 50, spriteNum: 1 }]
    loadEvent(gs, [
      // operand[1] = -8(0xFFF8 SHORT),operand[2] = +4
      { op: 'raw', opcode: OP_NPC_WALK_ONE_STEP, operands: [0, 0xFFF8, 4] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(92)
    expect(gs.npcs[0]?.y).toBe(54)
  })

  it('Sync.2 fix5:每次调 wCurrentFrameNum++ 循环 mod 4(初值 undefined → 0,然后 1/2/3/0)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 9, x: 0, y: 0, spriteNum: 628 }]
    const cmds: Array<{ op: 'raw', opcode: number, operands: [number, number, number] }> = []
    for (let i = 0; i < 5; i++) {
      cmds.push({ op: 'raw' as const, opcode: OP_NPC_WALK_ONE_STEP, operands: [0, 0, 0] })
    }
    loadEvent(gs, [...cmds, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 9
    // 单 tick 跑完 5 walkOneStep + end:scriptedFrame 应循环到 (0+1+1+1+1) mod 4 = 4 mod 4 = 0
    // (undefined → 0 → 1 → 2 → 3 → 0)
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.scriptedFrame).toBe(0)  // 5 次后回到 0
  })
})

describe('B 类移动 opcode(sdlpal script.c 真值)', () => {
  function setup(npcs: GameState['npcs']) {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = npcs
    return { gs, bus }
  }

  it('0x7D moveObject:pCurrent.x += SHORT(op1), y += SHORT(op2)(script.c:2277-2283)', () => {
    const { gs, bus } = setup([{ id: 3, x: 100, y: 50, spriteNum: 1 }])
    // op0=0 → self(currentEventObjectId);op1 = -8(0xFFF8 SHORT),op2 = +6
    loadEvent(gs, [{ op: 'raw', opcode: OP_MOVE_OBJECT, operands: [0, 0xFFF8, 6] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(92)
    expect(gs.npcs[0]?.y).toBe(56)
  })

  it('0x7D moveObject:operand[0] 显式选其他 NPC(1-based → id==op0-1)', () => {
    const { gs, bus } = setup([
      { id: 3, x: 0, y: 0, spriteNum: 1 },
      { id: 7, x: 200, y: 100, spriteNum: 1 },
    ])
    loadEvent(gs, [{ op: 'raw', opcode: OP_MOVE_OBJECT, operands: [8, 10, 20] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3   // self=3,但 op0=8 → 选 id=7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.x).toBe(210)
    expect(gs.npcs[1]?.y).toBe(120)
  })

  it('0x7E setObjectLayer:pCurrent.sLayer = SHORT(op1)(script.c:2285-2290)', () => {
    const { gs, bus } = setup([{ id: 3, x: 0, y: 0, spriteNum: 1, sLayer: 0 }])
    loadEvent(gs, [{ op: 'raw', opcode: OP_SET_OBJECT_LAYER, operands: [0, 3, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sLayer).toBe(3)
  })

  it('0x87 animateObject:仅推进动画帧 mod 4,不位移(script.c:2540-2544 PAL_NPCWalkOneStep id,0)', () => {
    const { gs, bus } = setup([{ id: 3, x: 100, y: 50, spriteNum: 1, scriptedFrame: 0 }])
    loadEvent(gs, [{ op: 'raw', opcode: OP_ANIMATE_OBJECT, operands: [0, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.scriptedFrame).toBe(1)
    expect(gs.npcs[0]?.x).toBe(100)   // 无位移
    expect(gs.npcs[0]?.y).toBe(50)
  })

  it('0x4B nullifyObject:self.sVanishTime = -15(script.c:1726-1730)', () => {
    const { gs, bus } = setup([{ id: 3, x: 0, y: 0, spriteNum: 1 }])
    loadEvent(gs, [{ op: 'raw', opcode: OP_NULLIFY_OBJECT, operands: [0, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sVanishTime).toBe(-15)
  })

  it('0x52 hideObject:self.sState *= -1; sVanishTime = op0?op0:800(script.c:1794-1799)', () => {
    const { gs, bus } = setup([{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 2 }])
    loadEvent(gs, [{ op: 'raw', opcode: OP_HIDE_OBJECT, operands: [0, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(-2)
    expect(gs.npcs[0]?.sVanishTime).toBe(800)   // op0=0 → 默认 800
  })

  it('0x52 hideObject:op0 非 0 → sVanishTime = op0', () => {
    const { gs, bus } = setup([{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 }])
    loadEvent(gs, [{ op: 'raw', opcode: OP_HIDE_OBJECT, operands: [120, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(-1)
    expect(gs.npcs[0]?.sVanishTime).toBe(120)
  })

  it('0x62 chasePause:wChasespeedChangeCycles=op0, wChaseRange=0(script.c:1967-1972)', () => {
    const { gs, bus } = setup([])
    loadEvent(gs, [{ op: 'raw', opcode: OP_CHASE_PAUSE, operands: [50, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wChasespeedChangeCycles).toBe(50)
    expect(gs.wChaseRange).toBe(0)
  })

  it('0x63 chaseSpeedup:wChasespeedChangeCycles=op0, wChaseRange=3(script.c:1975-1980)', () => {
    const { gs, bus } = setup([])
    loadEvent(gs, [{ op: 'raw', opcode: OP_CHASE_SPEEDUP, operands: [30, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wChasespeedChangeCycles).toBe(30)
    expect(gs.wChaseRange).toBe(3)
  })

  it('0x7A partyWalkTo speed 4:每 tick 走 1 step(|dx|>8 → ±8)(script.c:2245-2249)', () => {
    const { gs, bus } = setup([])
    gs.party.x = 0; gs.party.y = 0
    // target (10,0,0) → tx=320,远 → 一步走 speed*2=8
    loadEvent(gs, [{ op: 'raw', opcode: OP_PARTY_WALK_TO_4, operands: [10, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(8)
    expect(gs.eventCursor?.ip).toBe(0)   // 未到 → 不 ip++,下 tick 续走
  })

  it('0x7B partyWalkTo speed 8:一步走 16(script.c:2252-2256)', () => {
    const { gs, bus } = setup([])
    gs.party.x = 0; gs.party.y = 0
    loadEvent(gs, [{ op: 'raw', opcode: OP_PARTY_WALK_TO_8, operands: [10, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(16)
  })

  it('0x7C npcWalkTo speed 4:stagger gate TRUE(id 偶 + frameNum 偶)→ 走', () => {
    const { gs, bus } = setup([{ id: 2, x: 0, y: 0, spriteNum: 1 }])
    gs.frameNum = 0   // (id+1=3)&1=1 ^ 0&1=0 → 1 → gate TRUE
    // target (10,10,0):tx=320 ty=160,两轴均 >= speed*2 → 走 1 step(非 snap)
    loadEvent(gs, [{ op: 'raw', opcode: OP_NPC_WALK_TO_4, operands: [10, 10, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 2
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(8)   // 'right' → +2 * speed4
    expect(gs.npcs[0]?.y).toBe(4)   // 'right' → +1 * speed4
  })

  it('0x7C npcWalkTo speed 4:stagger gate FALSE(id 奇 + frameNum 偶)→ 本 tick 不走 + 重试', () => {
    const { gs, bus } = setup([{ id: 1, x: 0, y: 0, spriteNum: 1 }])
    gs.frameNum = 0   // (id+1=2)&1=0 ^ 0&1=0 → 0 → gate FALSE
    loadEvent(gs, [{ op: 'raw', opcode: OP_NPC_WALK_TO_4, operands: [10, 10, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 1
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(0)   // 隔帧:本 tick 跳过
    expect(gs.eventCursor?.ip).toBe(0)   // 未推进,下 tick 重试
  })

  it('0x3F/0x44/0x97 rideObject:party + 骑乘对象一起移动 dx/dy(script.c:203-307)', () => {
    const { gs, bus } = setup([{ id: 5, x: 200, y: 100, spriteNum: 1 }])
    gs.party.x = 0; gs.party.y = 0
    // 0x44 speed 4,target (10,0,0) → tx=320,xOffset=320 → dx=8;yOffset=0 → dy=0
    loadEvent(gs, [{ op: 'raw', opcode: OP_RIDE_OBJECT_4, operands: [10, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(8)       // party 移动
    expect(gs.npcs[0]?.x).toBe(208)  // 骑乘对象同步移动 +8
    expect(gs.npcs[0]?.y).toBe(100)  // y 不变
    expect(gs.party.facing).toBe('right')
  })

  it('0x4C monsterChase:无障碍 → 朝 party 走 1 步 + 设朝向(script.c:309-501)', () => {
    setObstacleChecker(null)   // 无 checker → isObstacle 恒 false(无障碍)
    const { gs, bus } = setup([{ id: 4, x: 132, y: 50, spriteNum: 1, facing: 'up' }])
    gs.party.x = 100; gs.party.y = 60   // party 在怪左下方,x=-32 y=10(均非 0,不触发 random)
    gs.wChaseRange = 1
    // op0=maxDist(默认 8),op1=speed(默认 4),op2=floating(0)
    loadEvent(gs, [{ op: 'raw', opcode: OP_MONSTER_CHASE, operands: [0, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 4
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('down')   // x<0,y>=0 → kDirSouth=down
    expect(gs.npcs[0]?.x).toBe(124)           // 132 + (-2 * speed4)
    expect(gs.npcs[0]?.y).toBe(54)            // 50 + (1 * speed4)
  })

  it('0x4C monsterChase:wChaseRange==0(驱魔香)→ 原地打转换向,不位移', () => {
    setObstacleChecker(null)
    const { gs, bus } = setup([{ id: 4, x: 132, y: 50, spriteNum: 1, facing: 'down' }])
    gs.party.x = 100; gs.party.y = 60
    gs.wChaseRange = 0
    gs.frameNum = 1   // 奇帧 → 换向
    loadEvent(gs, [{ op: 'raw', opcode: OP_MONSTER_CHASE, operands: [0, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 4
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('left')   // down(0) → +1 → left(1)
    expect(gs.npcs[0]?.x).toBe(132)           // wMonsterSpeed=0 → 不位移
    expect(gs.npcs[0]?.y).toBe(50)
  })
})

describe('opcode 0x0005 redrawScreen / PAL_ClearDialog(TRUE)(sdlpal script.c:3267-3297)— fix5', () => {
  it('有 dialog → wait page key(等 Confirm 翻页 + 清屏)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: 'A' },
      { op: 'raw', opcode: 5, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)  // 起 dialog typing
    tickEventSystem(gs, snap(['Confirm']), bus) // skip-typing + line-done auto ip++ → 0x05 → wait page key
    expect(gs.dialogBox?.phase).toBe('waiting-page-key')
    expect(gs.eventCursor?.waiting).toBe('dialog')
  })

  it('无 dialog → sdlpal UTIL_Delay(60ms):设 waiting=delay,延时完才 ip++ 续跑(script.c:3293)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 5, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    // 0x05 redraw 不再立即续跑:设 time-based delay(60ms)—— 走一步序列(0x0B-0x0E)逐帧动画的节拍源
    expect(gs.eventCursor?.waiting).toBe('delay')
    expect(gs.dialogBox).toBeUndefined()
    gs.eventCursor!.delayUntilMs = 0  // 强制延时已过(测试不实际等 60ms)
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore')   // 延时完 → ip++ → end
  })
})

describe('opcode 0x006E playerWalkOneStep(sdlpal script.c:2091-2113)', () => {
  it('trail unshift + party.x/y += operand[0]/[1](SHORT)+ wLayer 设', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'right' })
    const bus = createCommandBus()
    gs.trail = [{ x: 84, y: 42, dir: 'right' }]
    loadEvent(gs, [
      // operand[0] = 16(向右),operand[1] = 8,operand[2] = 1 → wLayer = 8
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [16, 8, 1] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(116)
    expect(gs.party.y).toBe(58)
    expect(gs.wLayer).toBe(8)
    // trail 头部应是原 party 位置(100, 50, right)
    expect(gs.trail[0]).toEqual({ x: 100, y: 50, dir: 'right' })
    expect(gs.trail).toHaveLength(2)  // unshift 后 [新, 旧]
  })

  it('trail 已 5 项 → unshift 后截至长度 5', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })
    const bus = createCommandBus()
    gs.trail = Array.from({ length: 5 }, (_, i) => ({ x: i, y: i, dir: 'down' as const }))
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [0, 8, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.trail).toHaveLength(5)
    expect(gs.trail[0]).toEqual({ x: 100, y: 50, dir: 'down' })
  })

  // B2:多步 trail 时序 render-chain —— 连续 op6e,trail 累积 leader 历史(最近在前,cap 5),
  //   followers 消费 trail[1..](= leader N 步前位置)实现"滞后跟随"。
  //   单步 unshift / cap5 / 单帧 follower 位置已分散测;此处补**连续走的完整时序**(B2 残留)。
  it('B2 连走 4 步 → trail 逐步 unshift 累积 leader 历史 + follower 滞后跟随', () => {
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    const bus = createCommandBus()
    gs.trail = [{ x: 100, y: 100, dir: 'down' }] // 起点
    // op6e unshift 用"走前"的 party 位置(scene.c:2097-2101);每步 +16 y(向下)
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [0, 16, 0] },
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [0, 16, 0] },
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [0, 16, 0] },
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [0, 16, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus) // 无 waitable,一 tick 跑完 4 步
    expect(gs.party).toMatchObject({ x: 100, y: 164 }) // 100 + 4*16
    // trail = [第4步走前, 第3步走前, 第2步走前, 第1步走前, 初始残留](cap 5,最近在前)
    expect(gs.trail).toHaveLength(5)
    expect(gs.trail.map((t) => t.y)).toEqual([148, 132, 116, 100, 100])
    // 渲染链:party-member follower 跟 trail[1](leader 1 步前)→ 恒在 leader 身后(y 更小)
    expect(gs.trail[1]!.y).toBeLessThan(gs.party.y)
    // 0x98 follower 跟 trail[3](更深)→ 滞后更多(更靠后)
    expect(gs.trail[3]!.y).toBeLessThan(gs.trail[1]!.y)
  })

  it('operand[0]==0 && operand[1]==0 → 不推 stepFrame(sdlpal 真值)', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })
    const bus = createCommandBus()
    gs.walkingFrame = { stepFrame: 2, walking: false }
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.walkingFrame.stepFrame).toBe(2)
    expect(gs.walkingFrame.walking).toBe(false)
  })

  it('密道帧修:0x6E 设 walking=true 后,0x15 给 leader 设 pose → 清 walking(scene1 李逍遥爬密道帧错乱根因)', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [0, 16, 0] }, // 移动 → 0x6E 设 walking=true
      { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [0, 4, 0] },   // leader pose 帧 = dir0*3+4 = 4
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    // sdlpal 0x15 写 rgParty.wFrame 覆盖步频(script.c:737)→ ts:0x15 清 walking,present 用 scriptedFrame
    //   (密道爬帧 chunk193[4]),否则 0x6E 的 walking=true 把爬帧拽成步频帧 0,1,0,2。
    expect(gs.partyScriptedFrame[0]).toBe(4)
    expect(gs.walkingFrame.walking).toBe(false)
  })

  it('0x15 给 follower(member>0)设 pose 不清 leader walking(只 leader 帧被 0x15 覆盖)', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PLAYER_WALK_ONE_STEP, operands: [0, 16, 0] }, // walking=true
      { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [0, 4, 1] },   // member 1(follower)
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.walkingFrame.walking).toBe(true) // leader walking 不被 follower 的 0x15 清(gate member===0)
  })
})

describe('autoScript goto 不消耗帧(sdlpal script.c:3549-3557 goto begin)— 张四划船掉船尾修复(2026-05-30)', () => {
  it('循环 autoscript [move, goto→move] 每 tick 都移动(goto 同帧续跑,不丢帧)', () => {
    // 张四划船 36147 = 16×移动 op + goto 回头。旧码 goto return 消耗一帧 → 每圈丢 1 帧 → 比船慢 → 掉船尾。
    // 简化模型:ip0 移动(+4,-2),ip1 goto→ip0。修后每 tick 必移动一次。
    setGlobalEvents([
      { op: 'raw', opcode: OP_MOVE_OBJECT, operands: [0, 4, 0xfffe], label: 'L_0' }, // ip0: self.x+=4, y-=2(SHORT)
      { op: 'goto', to: 'L_0', label: 'L_1' },                                        // ip1: 跳回 ip0
    ])
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const npc = { id: 0, x: 100, y: 100, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }
      gs.npcs = [npc]
      for (let i = 0; i < 6; i++) tickAutoScripts(gs)
      // 6 tick = 6 次移动(goto 不丢帧);旧码 goto 消耗帧 → 仅 3 次 → x=112
      expect(npc.x).toBe(100 + 6 * 4) // 124
      expect(npc.y).toBe(100 - 6 * 2) // 88
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('全-instant goto 自环 → 深度护栏停 autoCursor(不爆栈)', () => {
    setGlobalEvents([
      { op: 'goto', to: 'L_0', label: 'L_0' }, // ip0: goto 自身(无移动的死循环)
    ])
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const npc: { id: number; x: number; y: number; spriteNum: number; sState: number; autoCursor?: { ip: number } }
        = { id: 0, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }
      gs.npcs = [npc]
      tickAutoScripts(gs) // 不应爆栈/死循环
      expect(npc.autoCursor).toBeUndefined() // 护栏停掉
    }
    finally {
      setGlobalEvents([])
    }
  })
})

describe('对话期触发 NPC 的 autoScript 冻结 — NPC 转向玩家后保持(sdlpal PAL_RunTriggerScript 阻塞期 owner autoScript 不跑)', () => {
  // 根因(2026-06-03):tickByMode 在 tickEventSystem 之前先跑 tickAutoScripts;talk 触发后下一 tick
  // eventCursor.waiting 仍 undefined(showDialog 尚未步进),mode.ts 门放行 autoScript。若 tickAutoScripts
  // 不排除正被触发的那个 NPC(triggerOwnerId),它自己的 idle/巡逻 autoScript(0x0B-0x0E/0x0F/0x14/0x16/0x4C
  // 等写 npc.facing)会在 showDialog 锁屏前抢跑一步,把 applySearchVisualEffect 设的"面向玩家"覆盖回去 →
  // 用户看到"转向一帧立刻转回"。sdlpal:PAL_RunTriggerScript 阻塞期 owner NPC 卡在脚本里,autoScript 绝不跑。
  it('eventCursor.triggerOwnerId 对应 NPC → tickAutoScripts 跳过它,facing 保持面向玩家', () => {
    // autoScript = 0x0B walkOneStepSouth:跑一步会把 self.facing 改成 'down'(模拟会转向的 idle/巡逻 autoScript)
    setGlobalEvents([
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0], label: 'L_0' },
      { op: 'end' },
    ])
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      // applySearchVisualEffect 等价:NPC 已被 talk 触发、面向玩家(此处 'up')
      gs.npcs = [{ id: 0, x: 100, y: 100, spriteNum: 1, sState: 1, facing: 'up', autoCursor: { ip: 0 } }]
      // talk 触发后:mode='event' + eventCursor(triggerOwnerId=该 NPC, waiting 未设=undefined)
      gs.eventCursor = { ip: 0, currentEventObjectId: 0, triggerOwnerId: 0 }
      tickAutoScripts(gs)
      expect(gs.npcs[0]!.facing).toBe('up')        // owner autoScript 未跑 → 保持面向玩家
      expect(gs.npcs[0]!.autoCursor?.ip).toBe(0)    // autoCursor 未推进(被跳过)
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('非 owner NPC 的 autoScript 仍正常跑(不过度冻结 — party-walk 期场上其它 NPC 照动)', () => {
    setGlobalEvents([
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0], label: 'L_0' },
      { op: 'end' },
    ])
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.npcs = [{ id: 5, x: 100, y: 100, spriteNum: 1, sState: 1, facing: 'up', autoCursor: { ip: 0 } }]
      // 触发 owner 是另一个 NPC(id 3),当前 NPC(id 5)非 owner → 应照常跑 autoScript
      gs.eventCursor = { ip: 0, currentEventObjectId: 3, triggerOwnerId: 3 }
      tickAutoScripts(gs)
      expect(gs.npcs[0]!.facing).toBe('down')       // 非 owner → walkOneStepSouth 改 facing
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('owner 在 0x09 frame-wait 期间 autoScript 照跑(水月宫赵灵儿对话后走向右上;sdlpal play.c:172-191 无 owner 排除)', () => {
    // sdlpal PAL_GameUpdate 自动脚本循环(play.c:172-191)对场景内每个 sState>0 对象都跑 PAL_RunAutoScript,
    //   **不排除**正在执行触发脚本的 owner;owner 自动脚本在触发脚本的 0x09 wait(每帧 PAL_GameUpdate(FALSE))期间跑。
    // 对话朝向 fix 只需堵 waiting===undefined 那一 tick(触发后第一条 opcode 步进前);frame-wait 期间该跑就跑。
    // 复刻 水月宫:赵灵儿(owner)对话后 op36 设自己 autoScript=walk(L_4330 走向右上),op9 wait 14 期间应逐帧走,
    //   而非被整段跳过 → 原地等 14 帧后 op73 直接隐藏("缺少移动,原地消失",2026-06-05 user 报)。
    setGlobalEvents([
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0], label: 'L_0' },  // walkOneStepSouth:跑一步=改 facing+推进 ip
      { op: 'end' },
    ])
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.npcs = [{ id: 0, x: 100, y: 100, spriteNum: 1, sState: 1, facing: 'up', autoCursor: { ip: 0 } }]
      // owner 触发脚本已步进到 0x09 wait → waiting='frame-wait'(sdlpal 此时 PAL_GameUpdate(FALSE) 跑 owner autoScript)
      gs.eventCursor = { ip: 0, currentEventObjectId: 0, triggerOwnerId: 0, waiting: 'frame-wait' }
      tickAutoScripts(gs)
      expect(gs.npcs[0]!.autoCursor?.ip).toBe(1)   // frame-wait 期间 owner autoScript 跑了(0x0B → ip++);bug 版被跳 → 仍 0
      expect(gs.npcs[0]!.facing).toBe('down')       // walkOneStepSouth 把 facing 改 down(证明真跑了一步)
    }
    finally {
      setGlobalEvents([])
    }
  })
})

describe('opcode 0x0049 setSceneObjectState(sdlpal script.c:1711-1717)— fix4', () => {
  it('operand[0]=0 → silent no-op', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 0, x: 0, y: 0, spriteNum: 1, sState: 0 }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [0, 5, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(0)  // 未改
  })

  it('operand[0]=0xFFFF → self;operand[1] → sState', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 11, x: 0, y: 0, spriteNum: 628, sState: 1 }]
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [0xFFFF, -1 & 0xFFFF, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 11
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(-1)
  })

  it('operand[0]=explicit NPC id(1-based)→ 选别的 NPC', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [
      { id: 0, x: 0, y: 0, spriteNum: 1, sState: 0 },
      { id: 11, x: 0, y: 0, spriteNum: 628, sState: 0 },
    ]
    loadEvent(gs, [
      // operand[0]=12 → id=11(1-based - 1)
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [12, 3, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(0)   // 未改
    expect(gs.npcs[1]?.sState).toBe(3)
  })

  it('跨 scene:目标不在当前 scene → 回退全局 allEventObjects 改状态(客栈苗人→房间苗人显形)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    // 当前 scene 只有 id 59(客栈苗人头领);房间苗人头领是全局 obj 24(sState=0 隐藏),不在当前 scene。
    const roomMiao = { id: 24, x: 544, y: 288, spriteNum: 207, sState: 0 }
    gs.npcs = [{ id: 59, x: 0, y: 0, spriteNum: 207, sState: 2 }]
    gs.allEventObjects = [roomMiao, { id: 59, x: 0, y: 0, spriteNum: 207, sState: 2 }]
    // allEventObjects 需按 id 索引可取(resolveTargetNpc 用 allEventObjects[targetId])
    const dense: typeof gs.allEventObjects = []
    dense[24] = roomMiao
    dense[59] = gs.npcs[0]!
    gs.allEventObjects = dense
    loadEvent(gs, [
      // 0x49 [25,2,0]:operand[0]=25 → id 24(不在当前 scene)→ 全局表 obj 24 sState=2
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [25, 2, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 59
    tickEventSystem(gs, snap(), bus)
    expect(roomMiao.sState).toBe(2)   // 跨 scene 改到全局对象,进房间时 slice 引用即显形
  })

  it('setTriggerScript(0x25):operand[0] 选对象(非 self)→ 改该对象 triggerLabel(客栈酒剑仙)', () => {
    // sdlpal script.c:1147-1155:pCurrent(operand[0] 选)->wTriggerScript = op1,非 self。
    // 客栈 `0x25 [63, 604]`:李大娘对话后把酒剑仙(对象 63=id62)trigger 改 L_604(开新对话)。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },                              // 触发 cutscene 的 self
      { id: 62, x: 100, y: 100, spriteNum: 56, sState: 2, triggerLabel: 'L_601' }, // 酒剑仙
    ]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x25, operands: [63, 604, 0] }, // op0=63 → id62,trigger → L_604
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.triggerLabel).toBe('L_604')      // 酒剑仙(operand[0] 选)改了
    expect(gs.npcs[0]?.triggerLabel).toBeUndefined()    // self(id5)没动(旧 bug 会误改 self)
  })
})

describe('NPC trigger 脚本推进持久化(sdlpal play.c pEvtObj->wTriggerScript = RunTriggerScript)', () => {
  it('0x01 advance:trigger 跑完 → triggerResume 续跑下一条(不每次接触重播 cutscene)', () => {
    // 客栈李大娘苗人演出 L_285 以 0x01 收尾 → sdlpal 推进 wTriggerScript 到下一条("记得喔"),
    // 再接触不重播全段。旧实现不持久化 → 重播(2026-05-28 user 发现)。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 56, x: 0, y: 0, spriteNum: 21, sState: 2 }]
    const commands: Command[] = [
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [1, 0, 0] }, // 0: 演出
      { op: 'end', advance: true },                                      // 1: 0x01 advance
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [2, 0, 0] }, // 2: 续跑目标("记得喔")
      { op: 'end' },                                                     // 3
    ]
    gs.eventCursor = { commands, labelMap: {}, ip: 0, currentEventObjectId: 56, triggerOwnerId: 56 }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), bus) // 跑 ip0 raw → ip1 end advance → 持久化 + 结束
    expect(gs.mode).toBe('explore')
    expect(gs.npcs[0]?.triggerResume?.ip).toBe(2)             // 续跑指 idx2,不重播 idx0
    // P2#5:triggerResume 只存全局 ip(不内嵌 commands)→ 续跑时默认读单一全局数组。
    expect(gs.npcs[0]?.triggerResume?.commands).toBeUndefined()
  })

  it('0x00 plain:trigger 跑完 → triggerResume **不动**(sdlpal 返回起始 entry,原地可重触发)', () => {
    // 已推进到续跑点(idx 5)的 trigger 再跑、以 plain 收尾 → 应停在 idx 5(原地),不回退重播。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const commands: Command[] = [
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [0, 0, 0] }, // 0..4 占位
      { op: 'end' }, { op: 'end' }, { op: 'end' }, { op: 'end' },
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [1, 0, 0] }, // 5: 续跑点
      { op: 'end' },                                                     // 6: 0x00 plain
    ]
    const resume = { commands, labelMap: {}, ip: 5 }
    gs.npcs = [{ id: 62, x: 0, y: 0, spriteNum: 56, sState: 2, triggerResume: resume }]
    gs.eventCursor = { commands, labelMap: {}, ip: 5, currentEventObjectId: 62, triggerOwnerId: 62 }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.triggerResume?.ip).toBe(5)            // plain 不动 → 停在续跑点 5(不回退原点)
  })

  it('0x08 checkpoint:推进 resume 点到 0x08 后 + 继续跑;0x00 plain 不覆盖 → 重触发跳过 0x08 前内容(P2#6b)', () => {
    // 商店类:[内容..., 0x08, buyMenu, 0x00 end] — 重触发从 0x08 后续(不重播对话)。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.dwCash = 100
    gs.npcs = [{ id: 5, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    const commands: Command[] = [
      { op: 'giveItem', itemId: 1, count: 1 },         // 0:第一次内容(0x08 前)
      { op: 'raw', opcode: 0x08, operands: [0, 0, 0] }, // 1:0x08 checkpoint
      { op: 'raw', opcode: 0x8f, operands: [0, 0, 0] }, // 2:halveCash(0x08 后,代表 buyMenu 等)
      { op: 'end' },                                    // 3:0x00 plain
    ]
    gs.eventCursor = { commands, labelMap: {}, ip: 0, currentEventObjectId: 5, triggerOwnerId: 5 }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(50)                       // 0x08 继续跑到 halveCash(没停)
    expect(gs.npcs[0]?.triggerResume?.ip).toBe(2)    // checkpoint = 0x08 后(ip1→2);重触发跳过 ip0 giveItem
  })

  it('0x25 setTriggerScript:清 triggerResume(新 trigger label 生效,不被旧续跑点盖)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 62, x: 0, y: 0, spriteNum: 56, sState: 2, triggerLabel: 'L_601', triggerResume: { commands: [], labelMap: {}, ip: 9 } },
    ]
    loadEvent(gs, [
      { op: 'raw', opcode: 0x25, operands: [63, 604, 0] }, // 设 id62 trigger L_604
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.triggerLabel).toBe('L_604')
    expect(gs.npcs[1]?.triggerResume).toBeUndefined()       // 旧续跑点清掉 → L_604 生效
  })
})

describe('对话框样式复位(sdlpal PAL_EndDialog text.c:1814 → kDialogUpper)', () => {
  it('脚本结束 → currentDialogStyle 复位 top(下段无 setDialogStyle 的 showDialog 用 top 默认)', () => {
    // 厨房李大娘 L_560 直接 showDialog 没 setDialogStyle → 应继承 top 默认而非上段 cutscene 的
    // center/narration(2026-05-28 "逍遥快把酒菜"显示成居中框的根因)。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.currentDialogStyle = 'narration'  // 上段 cutscene 残留
    loadEvent(gs, [
      { op: 'raw', opcode: 0x35, operands: [0, 0, 0] }, // 任意非对话 raw(shakeScreen stub)
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogStyle).toBe('top')            // PAL_EndDialog 复位
  })
})

describe('opcode 0x0065 setPlayerSprite(sdlpal script.c:1999-2004)— fix4', () => {
  it('operand[0]=0 (主角) + operand[1]=spriteId → 写 runtime rgwSpriteNum + 兼容 partyLeaderSpriteId', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_PLAYER_SPRITE, operands: [0, 18, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwSpriteNum[0]).toBe(18)
    expect(gs.partyLeaderSpriteId).toBe(18)
  })

  it('operand[0] != 0(非主角)→ 写对应角色 rgwSpriteNum,不污染队长', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_PLAYER_SPRITE, operands: [1, 18, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwSpriteNum[1]).toBe(18)
    expect(gs.partyLeaderSpriteId).toBeUndefined()
  })
})

describe('setDialogStyleX 真值 reset(每次 opcode 重设 portrait/fontColor,不 inherit)— fix6', () => {
  it('setDialogStyleTop arg0=55 → showDialog → 0x05 + Confirm → setDialogStyleBottom 无 arg0 → 主角对话不显头像', () => {
    // scene 1 真实 flow:李大娘对话(头像 55)→ ClearDialog → 李逍遥对话(无头像)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleTop', arg0: 55, arg1: 0x4F },
      { op: 'showDialog', messageIndex: 0, text: '李大娘A' },
      { op: 'raw', opcode: 5, operands: [0, 0, 0] },   // ClearDialog
      { op: 'setDialogStyleBottom' },                   // 无 arg0 → portraitIcon undefined
      { op: 'showDialog', messageIndex: 0, text: '李逍遥B' },
      { op: 'end' },
    ])
    // tick 1: setDialogStyleTop + showDialog → dialogBox 含 portraitIcon=55(charsRevealed=0,未 tickDialog)
    tickEventSystem(gs, snap(), bus)
    expect(gs.dialogBox?.portraitIcon).toBe(55)
    expect(gs.currentDialogPortraitIcon).toBe(55)
    // tick 2 Confirm:时间驱动短行('李大娘A' 3 字)1 tick 打完 → line-done 自动推进 → opcode 5 ClearDialog
    //   → 有 currentLineText → waiting-page-key(等键清屏)
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.dialogBox?.phase).toBe('waiting-page-key')
    // tick 3 Confirm: page-advance(fullClear)→ clear dialogBox + ip++ → setDialogStyleBottom(无 arg0)
    //   → 无 prev dialog 行 → apply + ip++ → showDialog → startDialogLine portraitIcon=undefined
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.currentDialogPortraitIcon).toBeUndefined()
    expect(gs.currentDialogStyle).toBe('bottom')
    expect(gs.dialogBox?.portraitIcon).toBeUndefined()   // 主角对话不显头像 ✓
    expect(gs.dialogBox?.currentLineText).toBe('李逍遥B')
  })

  it('连续 setDialogStyleTop arg0=55 → arg0=63 → portrait 重设为 63(不 inherit)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleTop', arg0: 55 },
      { op: 'showDialog', messageIndex: 0, text: 'A' },
      { op: 'raw', opcode: 5, operands: [0, 0, 0] },
      { op: 'setDialogStyleTop', arg0: 63 },
      { op: 'showDialog', messageIndex: 0, text: 'B' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.currentDialogPortraitIcon).toBe(63)
    expect(gs.dialogBox?.portraitIcon).toBe(63)
  })

  it('setDialogStyleBottom arg0=1 arg1=10 → portrait=1 + fontColor=10(显式 set,不 default)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleBottom', arg0: 1, arg1: 10 },
      { op: 'showDialog', messageIndex: 0, text: 'A' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogPortraitIcon).toBe(1)
    expect(gs.currentDialogFontColor).toBe(10)
    expect(gs.dialogBox?.portraitIcon).toBe(1)
    expect(gs.dialogBox?.fontColor).toBe(10)
  })
})

// ── M5.I-w1.a: chest opcode(addCash / addItem / removeItem / playSound)──────
// sdlpal script.c:952-968 / 970-975 / 977+ / 1704-1709 真值。
describe('I-w1.a chest opcodes', () => {
  it('addCash(0x1E):正数加;u16 0xFFFF = signed -1', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 100
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x1E, operands: [200, 0, 0] },
      { op: 'raw', opcode: 0x1E, operands: [0xFFFF, 0, 0] },  // signed -1
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(299) // 100+200-1
  })

  it('addCash:钱足 → 扣钱继续(operand[0]<0 且够)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 100
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x1E, operands: [0xFFCE, 3, 0], label: 'L_0' }, // -50;cash=100≥50 → 扣
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(50) // 100-50
  })

  it('addCash:钱不足 → 跳 operand[1] 失败分支(sdlpal script.c:961,不再简版 clamp 到 0)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 10
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x1E, operands: [0xFFCE, 3, 0], label: 'L_0' }, // -50;cash=10<50 → 跳 L_3
      { op: 'raw', opcode: 0x1F, operands: [42, 1, 0] }, // 够钱分支给道具42(被跳过)
      { op: 'end' },
      { op: 'raw', opcode: 0x1F, operands: [99, 1, 0], label: 'L_3' }, // 失败分支给道具99
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(10) // 未扣(走 jump 分支)
    expect(gs.inventory).toEqual([{ itemId: 99, count: 1 }]) // 跳到 L_3 → 给道具99(非42)
  })

  it('addItem(0x1F):空 inventory → 新增条目', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x1F, operands: [42, 3, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.inventory).toEqual([{ itemId: 42, count: 3 }])
  })

  it('0x23 removeEquipment:卸装备撤销属性加成 removeEquipmentEffect(审计修:此前残留)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = 88 // role0 slot0 装备 item 88
    gs.rgEquipmentEffect[0]!.rgwAttackStrength[0] = 50 // 该装备的攻击加成
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x23, operands: [0, 0, 0] }, { op: 'end' }]) // role0 全卸
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwEquipment[0]![0]).toBe(0) // 装备卸下
    expect(gs.rgEquipmentEffect[0]!.rgwAttackStrength[0]).toBe(0) // 加成撤销(此前残留 50)
    expect(gs.inventory.find((e) => e.itemId === 88)?.count).toBe(1) // 回包
  })

  it('0x2D SetPlayerStatus 大世界(金刚符/黑狗血 buff):写 gs.rgPlayerStatus(审计修:此前 stub no-op)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwHP[0] = 100 // 活人
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x2D, operands: [6, 20, 0] }, { op: 'end' }]) // statusId 6=Protect dur 20
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.rgPlayerStatus[0]![6]).toBe(20) // 此前 stub → 0
  })

  it('0x2D puppet(4)活人 → fScriptSuccess=false 且不设', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwHP[0] = 100
    gs.fScriptSuccess = true
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x2D, operands: [4, 20, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.rgPlayerStatus[0]![4]).toBe(0)
    expect(gs.fScriptSuccess).toBe(false)
  })

  it('0x2F RemovePlayerStatus 大世界(灵心符/银针 解状态):清 <=999', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.rgPlayerStatus[0]![2] = 5 // sleep 5
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x2F, operands: [2, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.rgPlayerStatus[0]![2]).toBe(0)
  })

  it('0x2F 不清装备永久状态(>999)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.rgPlayerStatus[0]![8] = 32760 // 装备授 DualAttack 永久哨兵
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x2F, operands: [8, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.rgPlayerStatus[0]![8]).toBe(32760) // >999 不清
  })

  it('0x22 revive 大世界:复活同时清 <=999 状态(审计修:此前残留)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwHP[0] = 0 // 死
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    gs.rgPlayerStatus[0]![2] = 5 // sleep
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x22, operands: [0, 5, 0] }, { op: 'end' }]) // 单体复活 50%
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(50) // 复活
    expect(gs.rgPlayerStatus[0]![2]).toBe(0) // 状态清(此前残留)
  })

  it('0x20 removeItem:库存足 → 从库存移除', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 42, count: 3 }]
    gs.partyMembers = [0]
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x20, operands: [42, 2, 100] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.inventory.find((e) => e.itemId === 42)?.count).toBe(1) // 3-2
  })

  it('0x20 removeItem:库存不足 + op[2]==0 → 消耗装备槽匹配装备(撤效果)(审计修)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = []
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwEquipment[1]![0] = 42 // role0 slot1 装备 item42
    gs.rgEquipmentEffect[1]!.rgwDefense[0] = 30
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x20, operands: [42, 1, 0] }, { op: 'end' }]) // op[2]=0 无失败分支
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwEquipment[1]![0]).toBe(0) // 装备被消耗
    expect(gs.rgEquipmentEffect[1]!.rgwDefense[0]).toBe(0) // 效果撤销
  })

  it('0x20 removeItem:库存不足 + op[2]!=0 → jump op[2] 失败分支', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = []
    gs.partyMembers = [0]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x20, operands: [42, 1, 3], label: 'L_0' }, // 不足 + op[2]=3 → 跳 L_3
      { op: 'raw', opcode: 0x1F, operands: [99, 1, 0] }, // 成功路径给 99(跳过)
      { op: 'end' },
      { op: 'raw', opcode: 0x1F, operands: [88, 1, 0], label: 'L_3' }, // 失败分支给 88
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.inventory.find((e) => e.itemId === 88)?.count).toBe(1) // 跳到失败分支
    expect(gs.inventory.find((e) => e.itemId === 99)).toBeUndefined() // 成功路径未走
  })

  it('addItem:已有 itemId → count 累加', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 42, count: 2 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x1F, operands: [42, 5, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.inventory).toEqual([{ itemId: 42, count: 7 }])
  })

  it('removeItem(0x20):qty=0 默认按 1 移除', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 42, count: 3 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x20, operands: [42, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.inventory).toEqual([{ itemId: 42, count: 2 }])
  })

  it('removeItem:count 减到 0 → entry 从 inventory 删除', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 42, count: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x20, operands: [42, 1, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.inventory).toEqual([])
  })

  it('playSound(0x47):push gs.pendingSounds + ip++(shell audio drain 播)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x47, operands: [10, 0, 0] },
      { op: 'end' },
    ])
    expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
    expect(gs.mode).toBe('explore') // 一帧跑完
    expect(gs.pendingSounds).toEqual([10]) // soundId 入队供 shell AudioManager 播
  })
})

// ── M5.I-w1.b: 机关 / scene-state opcode(setObjectPosRelParty / setAutoScript / shakeScreen)
describe('I-w1.b 机关 / scene-state opcodes', () => {
  it('setObjectPosRelParty(0x12):pCurrent.x = operand[1] + party.x', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x12, operands: [0, 16, 8] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 7
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(116)  // 16 + 100
    expect(gs.npcs[0]?.y).toBe(58)   // 8 + 50
  })

  it('setAutoScript(0x24):operand[1] 是全局 entry → 经全局 labelMap[L_<entry>] 解全局 ip', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    // P2#5:operand[1]=42 是全局 script entry → resolveScriptLabel(L_42)经全局 labelMap 解全局 ip。
    // 全局数组里 L_42 落在 idx7(单一全局数组 = sdlpal lprgScriptEntry,entry 号 = 下标)。
    const globalCmds: Command[] = [
      { op: 'end' }, { op: 'end' }, { op: 'end' }, { op: 'end' },
      { op: 'end' }, { op: 'end' }, { op: 'end' },
      { op: 'end', label: 'L_42' }, // 7
    ]
    setGlobalEvents(globalCmds)
    try {
      const bus = createCommandBus()
      loadEvent(gs, [
        // operand[0]=0xFFFF(self),operand[1]=42(全局 entry → L_42)
        { op: 'raw', opcode: 0x24, operands: [0xFFFF, 42, 0] },
        { op: 'end' },
      ])
      gs.eventCursor!.currentEventObjectId = 3
      tickEventSystem(gs, snap(), bus)
      expect(gs.npcs[0]?.autoLabel).toBe('L_42')
      expect(gs.npcs[0]?.autoCursor?.ip).toBe(7)   // 全局 ip
      // P2#5:autoCursor 只存全局 ip(无 labelMap override)→ 默认读全局数组。
      expect(gs.npcs[0]?.autoCursor?.labelMap).toBeUndefined()
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('setAutoScript(0x24):跨 scene 设的 entry → 经全局兜底解全局 ip(autoCursor 默认读全局数组)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    gs.sceneLabelMap = {}  // 当前 scene 切片没有 L_406(跨 scene 设的脚本)→ 全局兜底
    // 全局数组:L_406 落在 idx0(单一全局数组,跨 scene trigger 也在同数组)。
    const globalCmds: Command[] = [{ op: 'end', label: 'L_406' }]
    setGlobalEvents(globalCmds)
    try {
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'raw', opcode: 0x24, operands: [0xFFFF, 406, 0] },
        { op: 'end' },
      ])
      gs.eventCursor!.currentEventObjectId = 3
      tickEventSystem(gs, snap(), bus)
      expect(gs.npcs[0]?.autoCursor?.ip).toBe(0) // 全局 ip(L_406)
      // P2#5:autoCursor 不内嵌 commands(默认读全局数组),不再"指向 shared 切片来源"。
      expect(gs.npcs[0]?.autoCursor?.commands).toBeUndefined()
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('setAutoScript:operand[0]==0 → no-op(sdlpal `if (operand[0] != 0)` 真值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 5 } }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x24, operands: [0, 99, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.autoCursor).toEqual({ ip: 5 })  // 未改
  })

  it('setAutoScript:operand[1]=0 → 清空 autoCursor', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 3, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 5 } }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x24, operands: [0xFFFF, 0, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 3
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.autoCursor).toBeUndefined()
  })

  it('shakeScreen(0x35):op0=10,op1=4 → shakeTime=10,shakeLevel=4(script.c:1521-1535)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x35, operands: [10, 4, 0] },
      { op: 'end' },
    ])
    expect(() => tickEventSystem(gs, snap(), bus)).not.toThrow()
    expect(gs.mode).toBe('explore')
    expect(gs.shakeTime).toBe(10)
    expect(gs.shakeLevel).toBe(4)
  })

  it('shakeScreen(0x35):op1=0 → shakeLevel 默认 4(script.c:1527 if(i==0)i=4)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x35, operands: [7, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.shakeTime).toBe(7)
    expect(gs.shakeLevel).toBe(4)
  })

  it('shakeScreen(0x35):op0=0 → shakeTime=0 立即复位关抖(script.c:1531-1534)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    // 先设一次摇晃,再 op0=0 复位
    gs.shakeTime = 99
    gs.shakeLevel = 8
    loadEvent(gs, [
      { op: 'raw', opcode: 0x35, operands: [0, 8, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.shakeTime).toBe(0)
    // level 仍写入(sdlpal VIDEO_ShakeScreen 无条件写 g_wShakeLevel),但 shakeTime=0 → present 不抖
    expect(gs.shakeLevel).toBe(8)
  })

  it('shakeScreen(0x35):op0=5,op1=8 → shakeTime=5,shakeLevel=8(非默认 level)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x35, operands: [5, 8, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.shakeTime).toBe(5)
    expect(gs.shakeLevel).toBe(8)
  })
})

// ── M5.I-w1.c: NPC contact opcode(walkOneStepDir x4)──────────────────────
// sdlpal script.c:652-661 真值:0x0B-0x0E 共用 case,dir=opcode-0x0B,走 1 步。
describe('I-w1.c NPC contact opcodes', () => {
  it('walkOneStep dir=South(0x0B):facing=down,位移 (-4,+2)(PAL_NPCWalkOneStep iSpeed=2)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 5, x: 100, y: 50, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('down')
    expect(gs.npcs[0]?.x).toBe(96)   // 100 + (-2*2)
    expect(gs.npcs[0]?.y).toBe(52)   // 50 + (1*2)
  })

  it('walkOneStep dir=East(0x0E):facing=right,位移 (+4,+2)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 5, x: 100, y: 50, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x0E, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.facing).toBe('right')
    expect(gs.npcs[0]?.x).toBe(104)  // 100 + (2*2)
    expect(gs.npcs[0]?.y).toBe(52)   // 50 + (1*2)
  })

  it('walkOneStep 4 个 opcode dir 映射:0x0B/C/D/E → down/left/up/right', () => {
    const dirs = ['down', 'left', 'up', 'right'] as const
    for (let i = 0; i < 4; i++) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.npcs = [{ id: 5, x: 100, y: 50, spriteNum: 1, sState: 1 }]
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'raw', opcode: 0x0B + i, operands: [0, 0, 0] },
        { op: 'end' },
      ])
      gs.eventCursor!.currentEventObjectId = 5
      tickEventSystem(gs, snap(), bus)
      expect(gs.npcs[0]?.facing).toBe(dirs[i])
    }
  })

  it('chest 完整流程(I-w2.1 集成):trigger script 跑 addItem + setSceneObjectState + showDialog → inventory 加 / npc 隐藏 / 对话框显', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 设 chest NPC 在 (100, 50),trigger script 跑:加 1 个 item 42 + 隐藏自己 + 显对话框
    gs.npcs = [{ id: 9, x: 100, y: 50, spriteNum: 1, sState: 1, triggerLabel: 'L_chest' }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x1F, operands: [42, 1, 0], label: 'L_chest' },  // addItem 42 x1
      { op: 'raw', opcode: 0x49, operands: [0xFFFF, 0, 0] },                // setSceneObjectState self → 0 (Hidden)
      { op: 'showDialog', messageIndex: 0, text: '得到 上品丹药 ×1' },
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 9
    tickEventSystem(gs, snap(), bus)
    // 跑到 showDialog 时停在 dialog 等键
    expect(gs.inventory).toEqual([{ itemId: 42, count: 1 }])
    expect(gs.npcs[0]?.sState).toBe(0)
    expect(gs.dialogBox?.currentLineText).toBe('得到 上品丹药 ×1')
  })

  it('walkOneStep 推进 scriptedFrame mod 4(动画循环)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 5, x: 100, y: 50, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x0B, operands: [0, 0, 0] },  // 第 5 次 → frame=0(回环)
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.scriptedFrame).toBe(0)  // (-1+1)%4=0 → 1 → 2 → 3 → 0
  })
})

// ── autoScript 控制流 fall-through(2026-05-28 黑屏根因回归)─────────────────
//
// 黑屏 root cause:events 提取 BFS 对 `end` 一律不收 fall-through,但 0x0001(advance)
// 运行时 ip++ 到下一行、0x0002(reset)跳 resetTo。提取丢了续行 → local 数组把不相干的
// 邻接脚本(L_1649 setPartyPos+loadScene)塞在 autoscript(L_734)正后面 → autoscript
// ip++ 跑进 setPartyPos → party 被拉到地图空白区 → 黑屏。
//
// 真值:scene-003 id=62 autoscript(全局 734-740)= NPC 待机动画循环:
//   end advance → setGesture(1) → end advance → setGesture(0) → wait → end reset(回 734)
// 该循环**绝不能**落到后面的 setPartyPos。
describe('autoScript 控制流(sdlpal PAL_RunAutoScript script.c:3518-3547)', () => {
  // scene-003 id=62 待机动画 1:1 结构 + 一个哨兵 setPartyPos(绝不能被跑到)
  function idleLoopCommands(): Command[] {
    return [
      { op: 'end', advance: true },                       // 0: 0x0001 → ip++
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [1, 0, 0] }, // 1
      { op: 'end', advance: true },                       // 2: 0x0001 → ip++
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [0, 0, 0] }, // 3
      { op: 'raw', opcode: OP_WAIT_FRAMES, operands: [2, 0, 0] },        // 4: wait 2 帧
      { op: 'end', reset: true, resetTo: 734, idleFrames: 0 },           // 5: 0x0002 → 跳回 ip0
      // ↓ 哨兵:邻接脚本(原 L_1649)。autoscript 绝不能 fall-through 到此。
      { op: 'raw', opcode: 0x46 /* setPartyPos */, operands: [39, 56, 0] }, // 6
      { op: 'end' },                                      // 7
    ]
  }

  it('0x0002 reset:循环回 resetTo(L_734),NPC 待机动画不停 + 绝不 fall-through 到 setPartyPos', () => {
    const gs = createInitialGameState({ x: 1408, y: 1424, facing: 'down' })
    const px0 = gs.party.x
    const py0 = gs.party.y
    gs.npcs = [{ id: 62, x: 1024, y: 1680, spriteNum: 1, sState: 2, autoCursor: { ip: 0 } }]
    gs.sceneCommands = idleLoopCommands()
    gs.sceneLabelMap = { L_734: 0 } // resetTo=734 → local ip 0

    // 跑 40 帧(远超一个动画周期 6 帧)
    for (let i = 0; i < 40; i++) tickAutoScripts(gs)

    // party 位置纹丝不动 — setPartyPos(哨兵 ip6)从未被执行
    expect(gs.party.x).toBe(px0)
    expect(gs.party.y).toBe(py0)
    // autoCursor 始终在循环体内 [0,5],绝不到 ip6/ip7
    expect(gs.npcs[0]?.autoCursor).toBeDefined()
    expect(gs.npcs[0]!.autoCursor!.ip).toBeLessThanOrEqual(5)
  })

  it('0x0001 advance:autoscript 推进至下一行(不 park、不停)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 1, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }]
    // P2#5:autoCursor 默认读单一全局数组 → 脚本经 setGlobalEvents 注册(非 gs.sceneCommands)。
    setGlobalEvents([
      { op: 'end', advance: true },                       // 0 → ip++
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [2, 0, 0] }, // 1
      { op: 'end' },                                      // 2: 0x0000 park
    ])
    try {
      tickAutoScripts(gs)
      expect(gs.npcs[0]!.autoCursor!.ip).toBe(1) // 0x0001 推进到 1
      tickAutoScripts(gs)
      expect(gs.npcs[0]!.autoCursor!.ip).toBe(2) // raw 跑完推进到 2
      tickAutoScripts(gs)
      expect(gs.npcs[0]!.autoCursor!.ip).toBe(2) // 0x0000 park(原地不动)
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('sState<=0 或 sVanishTime!=0 → autoScript 不跑(隐藏怪不在后台追逐/移动)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 1, x: 0, y: 0, spriteNum: 1, sState: -1, autoCursor: { ip: 0 } },
      { id: 2, x: 0, y: 0, spriteNum: 1, sState: 1, sVanishTime: 5, autoCursor: { ip: 0 } },
    ]
    setGlobalEvents([
      { op: 'raw', opcode: OP_MOVE_OBJECT, operands: [0, 8, 4] },
      { op: 'end' },
    ])
    try {
      tickAutoScripts(gs)
      expect(gs.npcs.map((n) => ({ x: n.x, y: n.y, ip: n.autoCursor?.ip }))).toEqual([
        { x: 0, y: 0, ip: 0 },
        { x: 0, y: 0, ip: 0 },
      ])
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('0x0003 goto frameDelay:循环体每帧跑(非空等)+ 计数满后 fall-through(仙灵岛赵灵儿降临 L_5572 真值)', () => {
    // sdlpal PAL_RunAutoScript case 0x0003(script.c:3549-3564):
    //   if (op[1]==0 || ++count < op[1]) { wScriptEntry=op[0]; goto begin(同帧跑目标) }
    //   else { count=0; wScriptEntry++(fall-through 到下一条) }
    // 复刻 仙灵岛 少女(赵灵儿)降临 autoscript L_5572:move + goto frameDelay 10 → 落体连走 10 步,
    //   再减速 2 步,最后 fall-through 落地。bug 版把 frameDelay 当"空等 N 帧再跳"+ 永远跳不 fall-through
    //   → 每 11 帧才动 1 次 + 无限循环不落地("非常缓慢")。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 1, x: 0, y: 0, spriteNum: 363, sState: 2, autoCursor: { ip: 0 } }]
    setGlobalEvents([
      { op: 'raw', opcode: OP_MOVE_OBJECT, operands: [0, 8, 4], label: 'L_LOOP' }, // 0: 移自身 +8,+4
      { op: 'goto', to: 'L_LOOP', frameDelay: 10 },                                // 1: 循环回 ip0,delay 10
      { op: 'raw', opcode: OP_MOVE_OBJECT, operands: [0, 4, 2] },                  // 2: 减速
      { op: 'raw', opcode: OP_MOVE_OBJECT, operands: [0, 2, 1] },                  // 3: 减速
      { op: 'end' },                                                               // 4: park(落地)
    ])
    try {
      // sdlpal 真值帧序:F1 ip0 move#1 → F2-F10 goto 跳回 ip0 move#2-#10(count 1..9<10)→
      //   F11 goto count=10 fall-through 到 ip2 → F12 ip2 move → F13 ip3 move → F14 ip4 park。
      for (let i = 0; i < 14; i++) tickAutoScripts(gs)
      // 落体到位:10×(8,4) + (4,2) + (2,1) = (86, 43)。bug 版 14 帧只 move 2 次 → x≈16。
      expect(gs.npcs[0]!.x).toBe(86)
      expect(gs.npcs[0]!.y).toBe(43)
      // fall-through 到 park(ip4)— 证明计数满后退出循环,不再无限慢速循环(bug 版卡 ip1)。
      expect(gs.npcs[0]!.autoCursor!.ip).toBe(4)
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('丁大伯:autoLabel 入口在全局数组(sceneLabelMap 解不到)→ tickAutoScripts 走全局兜底解析 autoCursor + 跑', () => {
    // 复刻丁大伯:挥锄 autoScript 入口 entry 36205 在 events/all.json 全局区,不在 scene 切片
    //   labelMap → scene-load 解析失败 → autoCursor undefined → 冻首帧。tickAutoScripts 应走
    //   resolveScriptLabel(scene→shared→global)补解析。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // NPC 有 autoLabel 但无 autoCursor(scene-load 时 sceneLabelMap 无 L_5)
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 2, autoLabel: 'L_5' }]
    gs.sceneCommands = [{ op: 'end' }] // 当前 scene 切片(不含 L_5)
    gs.sceneLabelMap = {}
    const globalCmds: Command[] = [
      { op: 'end' }, { op: 'end' }, { op: 'end' }, { op: 'end' }, { op: 'end' },
      { op: 'end', advance: true, label: 'L_5' },                        // 5: 0x01 advance → ip6
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [3, 0, 0] }, // 6: 设帧3
      { op: 'end' },                                                     // 7: park
    ]
    setGlobalEvents(globalCmds)
    try {
      tickAutoScripts(gs)
      // 全局兜底解析 autoCursor 默认读全局数组,ip 从 5(L_5)起;首帧 0x01 advance → 6
      expect(gs.npcs[0]?.autoCursor).toBeDefined()
      // P2#5:autoCursor 只存全局 ip(无 commands override)→ 默认读 _globalCommands。
      expect(gs.npcs[0]?.autoCursor?.commands).toBeUndefined()
      expect(gs.npcs[0]!.autoCursor!.ip).toBe(6)
    }
    finally {
      setGlobalEvents([]) // 清理模块级注入,避免污染后续测试
    }
  })

  it('0x0002 reset:resetTo 全局 labelMap 无 → 停 autoCursor(不死循环)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 1, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }]
    // P2#5:reset resetTo 经全局 labelMap 解析;L_9999 不在全局数组 → 停 autoCursor。
    setGlobalEvents([{ op: 'end', reset: true, resetTo: 9999, idleFrames: 0 }])
    try {
      tickAutoScripts(gs)
      expect(gs.npcs[0]?.autoCursor).toBeUndefined()
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('0x04 call-script:autoScript 调子脚本(开门)+ op1 覆盖作用对象 + end 弹帧续跑', () => {
    // 苗人(id 5)autoScript:call 开门子脚本(作用门对象 id 9)→ 子脚本设门 sState→1 → 返回
    // 续跑设自己 gesture。验证:门(id 9)被改、苗人(id 5)续跑、autoCursor 返回主脚本。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 207, sState: 2, autoCursor: { ip: 0 } },
      { id: 9, x: 100, y: 100, spriteNum: 54, sState: 0 },  // 门,初始隐藏
    ]
    // P2#5:autoCursor 默认读单一全局数组;子脚本 L_50 在同数组 idx3(call 经全局 labelMap 解析)。
    setGlobalEvents([
      // 主脚本 @0
      { op: 'raw', opcode: OP_CALL_SCRIPT, operands: [50, 10, 0] }, // 0: call L_50,op1=10→对象 id9
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [1, 0, 0] }, // 1: 续跑(作用 self=苗人 5)
      { op: 'end' },                                                // 2: park
      // 子脚本 L_50 @3:把当前作用对象(门 id9)设 sState=1
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [0xFFFF, 1, 0], label: 'L_50' }, // 3
      { op: 'end' },                                                // 4: 子脚本 end → 弹帧回 ip1
    ])
    try {
      tickAutoScripts(gs) // 跑 0x04 → 跳子脚本 ip3
      expect(gs.npcs[0]!.autoCursor!.ip).toBe(3)
      expect(gs.npcs[0]!.autoCursor!.currentEventObjectId).toBe(9) // op1=10 → 作用对象 id9
      tickAutoScripts(gs) // 跑子脚本 0x49[65535]→门 sState=1
      expect(gs.npcs[1]?.sState).toBe(1)  // 门被开(子脚本作用门对象)
      tickAutoScripts(gs) // 子脚本 end → 弹帧回主脚本 ip1
      expect(gs.npcs[0]!.autoCursor!.ip).toBe(1)
      expect(gs.npcs[0]!.autoCursor!.currentEventObjectId).toBeUndefined() // 还原
      tickAutoScripts(gs) // 主脚本 ip1 setObjectGesture 作用 self(苗人 5)
      expect(gs.npcs[0]?.scriptedFrame).toBe(1)
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('架构统一:条件跳转(0x95 jumpIfScene)在 autoScript 内生效(经 autoCursor,非 gs.eventCursor)', () => {
    // 重构前:jumpToGlobalIp 写死 gs.eventCursor(explore 下 undefined)→ autoScript 条件跳转全失效。
    // 现在 applyRawOpcode 收 cursor → 跳转操作 autoCursor。验证:scene==3 → 跳过哨兵到 L_4。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wNumScene = 3
    const px0 = gs.party.x
    gs.npcs = [{ id: 1, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }]
    // P2#5:0x95 jump 经全局 labelMap 解析;L_4 在单一全局数组 idx4。
    setGlobalEvents([
      { op: 'raw', opcode: 0x95, operands: [3, 4, 0] },                  // 0: scene==3 → jump L_4
      { op: 'raw', opcode: 0x46, operands: [9, 9, 0] },                  // 1: 哨兵 setPartyPos(绝不能跑)
      { op: 'end' },                                                     // 2
      { op: 'end' },                                                     // 3
      { op: 'raw', opcode: OP_SET_OBJECT_GESTURE, operands: [2, 0, 0], label: 'L_4' }, // 4
      { op: 'end' },                                                     // 5
    ])
    try {
      tickAutoScripts(gs) // 0x95 scene==3 → 跳 L_4
      expect(gs.npcs[0]!.autoCursor!.ip).toBe(4)
      tickAutoScripts(gs) // ip4 setObjectGesture → frame 2
      expect(gs.npcs[0]?.scriptedFrame).toBe(2)
      expect(gs.party.x).toBe(px0) // 哨兵 setPartyPos(ip1)从未跑
    }
    finally {
      setGlobalEvents([])
    }
  })
})

describe('全局脚本解析 resolveScriptLabel(P2#5 单一全局数组,跨 scene 脚本引用)', () => {
  it('label → 全局 ip(李大娘 L_560 等 116 处跨 scene trigger 的根治)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // P2#5:无 scene/shared 层 — resolveScriptLabel 只查单一全局 labelMap(L_<n> → 全局下标)。
    // 全局脚本数组:命令带 label L_560(全局 entry index 1)、L_1(index 0)。
    setGlobalEvents([
      { op: 'end', label: 'L_1' },
      { op: 'showDialog', messageIndex: 0, text: '去去去', label: 'L_560' },
      { op: 'end' },
    ])
    try {
      const r = resolveScriptLabel(gs, 'L_560')
      expect(r?.ip).toBe(1)                  // 命中 global 的 index 1
      // P2#5:返回只含 ip(不内嵌 commands)→ caller 建的 cursor 默认读全局数组。
      expect(r?.commands).toBeUndefined()
      // 任何 scene 的 label 都在同一全局数组(不再有 scene 优先 / scene 切片来源)。
      const rOther = resolveScriptLabel(gs, 'L_1')
      expect(rOther?.ip).toBe(0)
      expect(rOther?.commands).toBeUndefined()
      // 全局无此 label → null。
      expect(resolveScriptLabel(gs, 'L_NOPE')).toBeNull()
    }
    finally {
      setGlobalEvents([])  // 复位
    }
  })
})

// ── narration(kDialogCenterWindow)自动消失(2026-05-28 物品UI卡操作回归)──────
//
// sdlpal text.c:1663-1710:kDialogCenterWindow(物品提示 "得到XX")显示后走
// PAL_DialogWaitForKeyWithMaximumSeconds(1.4)→ 最多 1.4s 自动消失(或按键提前)→
// PAL_DeleteBox + PAL_EndDialog。**不卡死等空格**。
// bug:之前 narration 走 typing → line-done → 下条 opcode 前 pre-op ClearDialog 等 Confirm,
// 用户必须按空格才能继续。
describe('narration dialog 自动消失(sdlpal text.c:1701 PAL_DialogWaitForKeyWithMaximumSeconds(1.4))', () => {
  it('narration:跑满 14 帧(1.4s @10fps)自动消失,无需 Confirm', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.currentDialogStyle = 'narration'
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', text: '得到净衣符', messageIndex: 0 },
      { op: 'end' },
    ])
    // tick 1:showDialog 建 narration 框
    tickEventSystem(gs, snap(), bus)
    expect(gs.dialogBox?.style).toBe('narration')
    // 不按任何键,跑 12 帧仍在显示(< 14)
    for (let i = 0; i < 12; i++) tickEventSystem(gs, snap(), bus)
    expect(gs.dialogBox).toBeDefined()
    // 再跑几帧凑满 14 → 自动消失(全程无 Confirm)
    for (let i = 0; i < 5; i++) tickEventSystem(gs, snap(), bus)
    expect(gs.dialogBox).toBeUndefined()
  })

  it('narration:任意键(非只 Confirm)提前消失 — sdlpal text.c:1433 dwKeyPress!=0', () => {
    // sdlpal 任意键都关:方向键 / Cancel(ESC)/ Menu 都行,不被迫等满 1.4s
    for (const key of ['Confirm', 'Cancel', 'Down', 'Menu'] as const) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.currentDialogStyle = 'narration'
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'showDialog', text: '得到净衣符', messageIndex: 0 },
        { op: 'end' },
      ])
      tickEventSystem(gs, snap(), bus) // 建框
      expect(gs.dialogBox).toBeDefined()
      tickEventSystem(gs, snap([key]), bus) // 任意键 → 立即消失
      expect(gs.dialogBox, `key=${key} 应能关闭 narration`).toBeUndefined()
    }
  })

  it('narration 消失后 cursor 继续推进(后续 opcode 不被阻塞)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.currentDialogStyle = 'narration'
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', text: '得到大蒜', messageIndex: 0 },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus) // 建框
    // Confirm 提前关 → 同 tick fall-through 跑 'end' → eventCursor 清空 → 回 explore
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.mode).toBe('explore')
  })
})

describe('0x81 jumpIfNotFacing(用桂花酒对酒剑仙 — 设对象 triggerMode 触发剧情)', () => {
  it('面对 → pCurrent(operand[0] 选的对象,非 self)triggerMode = 5+op1(应用 applyToAll 物品 self=0xFFFF)', () => {
    // facing up 几何:pCurrent.x=116,y=42 → fx=fy=0 命中(< op1*32+16)。
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'up' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 5, x: 116, y: 42, spriteNum: 1, sState: 1, triggerMode: 1 }]
    loadEvent(gs, [
      { op: 'raw', opcode: 0x81, operands: [6, 1, 999] }, // op0=6→id5,op1=1
      { op: 'end' },
    ])
    gs.eventCursor!.currentEventObjectId = 0xFFFF // applyToAll 物品上下文(self 找不到)
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.triggerMode).toBe(6) // 5+op1=6,设到 pCurrent(id5)非 self
    expect(gs.fScriptSuccess).toBe(true)
  })

  it('未面对 / 对象不存在 → jump op2 且 fScriptSuccess=false(script.c:2402/2432)', () => {
    const bus = createCommandBus()
    const gsMiss = createInitialGameState({ x: 100, y: 50, facing: 'down' })
    gsMiss.npcs = [{ id: 5, x: 116, y: 42, spriteNum: 1, sState: 1, triggerMode: 1 }]
    gsMiss.fScriptSuccess = true
    loadEvent(gsMiss, [
      { op: 'raw', opcode: 0x81, operands: [6, 1, 2] },
      { op: 'raw', opcode: OP_SET_RNG, operands: [111, 0, 0] },
      { op: 'end' },
    ])
    gsMiss.eventCursor!.currentEventObjectId = 0xFFFF
    tickEventSystem(gsMiss, snap(), bus)
    expect(gsMiss.iCurPlayingRNG).toBe(0)
    expect(gsMiss.fScriptSuccess).toBe(false)

    const gsMissing = createInitialGameState({ x: 100, y: 50, facing: 'up' })
    gsMissing.fScriptSuccess = true
    loadEvent(gsMissing, [
      { op: 'raw', opcode: 0x81, operands: [6, 1, 2] },
      { op: 'raw', opcode: OP_SET_RNG, operands: [111, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gsMissing, snap(), bus)
    expect(gsMissing.iCurPlayingRNG).toBe(0)
    expect(gsMissing.fScriptSuccess).toBe(false)
  })
})

describe('pCurrent(operand[0] 选对象)对象 opcode 类(对齐 sdlpal pCurrent,非 self)', () => {
  it('0x12 setObjectPosRelParty:operand[0] 选对象(非 self)→ 设该对象相对 party 位置', () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },   // self(触发者)
      { id: 7, x: 0, y: 0, spriteNum: 1, sState: 1 },   // op0 选的对象
    ]
    loadEvent(gs, [{ op: 'raw', opcode: 0x12, operands: [8, 16, 8] }, { op: 'end' }]) // op0=8→id7
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.x).toBe(116)   // id7 = op1 + party.x(非 self id5)
    expect(gs.npcs[1]?.y).toBe(58)
    expect(gs.npcs[0]?.x).toBe(0)     // self(id5)未动
  })

  it('0x6F syncObjState:pCurrent.sState==op1 → pEvtObj(self).sState=op1', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 0 },   // self(pEvtObj)
      { id: 7, x: 0, y: 0, spriteNum: 1, sState: 2 },   // pCurrent(op0 选)
    ]
    loadEvent(gs, [{ op: 'raw', opcode: 0x6F, operands: [8, 2, 0] }, { op: 'end' }]) // op0=8→id7,op1=2
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(2)  // pCurrent(id7).sState==2 → self(id5).sState=2
  })

  it('0x84 placeUsedItem:把 pCurrent(op0)放 party 正前方 + sState=op1(无障碍)', () => {
    setObstacleChecker(null) // 无 checker → 无障碍
    const gs = createInitialGameState({ x: 200, y: 100, facing: 'right' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 0 }]
    loadEvent(gs, [{ op: 'raw', opcode: 0x84, operands: [8, 1, 999] }, { op: 'end' }]) // op0=8→id7
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.x).toBe(216)     // facing right → party.x + 16
    expect(gs.npcs[0]?.y).toBe(108)     // party.y + 8
    expect(gs.npcs[0]?.sState).toBe(1)  // sState = op1
    expect(gs.fScriptSuccess).toBe(true)
  })

  it('0x84 placeUsedItem:sState op1 按 SHORT 写入,0xFFFF → -1', () => {
    setObstacleChecker(null)
    const gs = createInitialGameState({ x: 200, y: 100, facing: 'right' })
    const bus = createCommandBus()
    gs.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 0 }]
    loadEvent(gs, [{ op: 'raw', opcode: 0x84, operands: [8, 0xFFFF, 999] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(-1)
  })

  it('0x83 jumpIfObjNotInZone:对象不在 zone / 当前对象缺失 → jump op2 且 fScriptSuccess=false(script.c:2448-2471)', () => {
    const bus = createCommandBus()
    const gsFar = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsFar.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 7, x: 1000, y: 1000, spriteNum: 1, sState: 1 },
    ]
    gsFar.fScriptSuccess = true
    loadEvent(gsFar, [
      { op: 'raw', opcode: 0x83, operands: [8, 1, 2] },
      { op: 'raw', opcode: OP_SET_RNG, operands: [111, 0, 0] },
      { op: 'end' },
    ])
    gsFar.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gsFar, snap(), bus)
    expect(gsFar.iCurPlayingRNG).toBe(0)
    expect(gsFar.fScriptSuccess).toBe(false)

    const gsMissingSelf = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsMissingSelf.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    gsMissingSelf.fScriptSuccess = true
    loadEvent(gsMissingSelf, [
      { op: 'raw', opcode: 0x83, operands: [8, 1, 2] },
      { op: 'raw', opcode: OP_SET_RNG, operands: [111, 0, 0] },
      { op: 'end' },
    ])
    gsMissingSelf.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gsMissingSelf, snap(), bus)
    expect(gsMissingSelf.iCurPlayingRNG).toBe(0)
    expect(gsMissingSelf.fScriptSuccess).toBe(false)
  })

  it('0x84 placeUsedItem:对象不存在或前方有障碍 → jump op2 且 fScriptSuccess=false(script.c:2484/2501)', () => {
    const bus = createCommandBus()
    const gsMissing = createInitialGameState({ x: 200, y: 100, facing: 'right' })
    gsMissing.fScriptSuccess = true
    loadEvent(gsMissing, [
      { op: 'raw', opcode: 0x84, operands: [8, 1, 2] },
      { op: 'raw', opcode: OP_SET_RNG, operands: [111, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gsMissing, snap(), bus)
    expect(gsMissing.iCurPlayingRNG).toBe(0)
    expect(gsMissing.fScriptSuccess).toBe(false)

    const gsBlocked = createInitialGameState({ x: 200, y: 100, facing: 'right' })
    gsBlocked.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 0 }]
    gsBlocked.fScriptSuccess = true
    setObstacleChecker((x, y) => x === 216 && y === 108)
    try {
      loadEvent(gsBlocked, [
        { op: 'raw', opcode: 0x84, operands: [8, 1, 2] },
        { op: 'raw', opcode: OP_SET_RNG, operands: [111, 0, 0] },
        { op: 'end' },
      ])
      tickEventSystem(gsBlocked, snap(), bus)
      expect(gsBlocked.iCurPlayingRNG).toBe(0)
      expect(gsBlocked.fScriptSuccess).toBe(false)
      expect(gsBlocked.npcs[0]).toMatchObject({ x: 0, y: 0, sState: 0 })
    }
    finally {
      setObstacleChecker(null)
    }
  })
})

// ── A 类补全(A1:自包含数据/状态 opcode)──────────────────────────────────────
describe('A1 opcode:0x40 setTriggerMethod / 0x55 addMagic / 0x56 removeMagic / 0x9A setMultiState', () => {
  it('0x40 setTriggerMethod:operand[0]=0xFFFF → self;operand[0]=N → pCurrent(object N-1)(script.c:1613-1621 + 624-639)', () => {
    // sdlpal pCurrent 选取(script.c:624-639):operand[0]==0/0xFFFF → self(pEvtObj);
    //   否则 → lprgEventObject[operand[0]-1]。0x40 恒改 self 是旧 bug:水生叔 trigger
    //   `0x40 [124,6]` 本应激活张四(object 124 = id 123),却复位水生叔 → proximity 对话无限循环。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1, triggerMode: 0 },
      { id: 6, x: 0, y: 0, spriteNum: 1, sState: 1, triggerMode: 0 },
    ]
    const bus = createCommandBus()
    // operand[0]=0xFFFF → self(currentEventObjectId=5)
    loadEvent(gs, [{ op: 'raw', opcode: 0x40, operands: [0xFFFF, 4, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.triggerMode).toBe(4)  // self id5
    expect(gs.npcs[1]?.triggerMode).toBe(0)  // 未动
    // operand[0]=7 → pCurrent = object[7-1=6] = id6(非 self)
    loadEvent(gs, [{ op: 'raw', opcode: 0x40, operands: [7, 6, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.triggerMode).toBe(6)  // pCurrent id6
    expect(gs.npcs[0]?.triggerMode).toBe(4)  // self id5 不变
  })

  it('0x40:operand[0]==0 → no-op(triggerMode 不变)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 5, x: 0, y: 0, spriteNum: 1, sState: 1, triggerMode: 6 }]
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x40, operands: [0, 4, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 5
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.triggerMode).toBe(6) // 未改
  })

  it('0x55 addMagic:role=operand[1]-1,spell=operand[0] 填空槽(global.c:2084)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x55, operands: [350, 1, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    // role 0(operand[1]=1 → 1-1=0)第一个空槽 = 350
    expect(gs.PlayerRolesRuntime.rgwMagic[0]?.[0]).toBe(350)
  })

  it('0x55 addMagic:已学该法术 → no-op(不重复填槽)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 350
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x55, operands: [350, 1, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwMagic[0]?.[0]).toBe(350)
    expect(gs.PlayerRolesRuntime.rgwMagic[1]?.[0]).toBe(0) // 第二槽未被占
  })

  it('0x56 removeMagic:找到该 spell 的槽置 0(global.c:2139)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 350
    gs.PlayerRolesRuntime.rgwMagic[1]![0] = 351
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x56, operands: [350, 1, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwMagic[0]?.[0]).toBe(0) // 移除
    expect(gs.PlayerRolesRuntime.rgwMagic[1]?.[0]).toBe(351) // 其他不动
  })

  it('0x9A setMultiState:sdlpal `lprgEventObject[i-1]` for i in [op0..op1](1-based)(script.c:2756)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 4, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 6, x: 0, y: 0, spriteNum: 1, sState: 1 },
    ]
    const bus = createCommandBus()
    // P0#2:operands [4,5,2] → i=4→idx3, i=5→idx4 → 设 id 3/4(不是旧错的 id 4/5)
    loadEvent(gs, [{ op: 'raw', opcode: 0x9a, operands: [4, 5, 2] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs.map((n) => n.sState)).toEqual([2, 2, 1, 1]) // id 3/4 改成 2
  })

  it('0x9A setMultiState:范围内不在当前 scene 的对象走全局表 gs.allEventObjects(同 0x49)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 全局表:id 3..6;当前 scene 只切了 id 4
    gs.allEventObjects = [
      { id: 0, x: 0, y: 0, spriteNum: 0, sState: 1 },
      { id: 1, x: 0, y: 0, spriteNum: 0, sState: 1 },
      { id: 2, x: 0, y: 0, spriteNum: 0, sState: 1 },
      { id: 3, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 4, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 1 },
    ]
    gs.npcs = [gs.allEventObjects[4]!] // 当前 scene 只含 id 4(引用)
    const bus = createCommandBus()
    // [4,6,2] → i=4/5/6 → idx 3/4/5 → 设 id 3/4/5,其中 3/5 只在全局表
    loadEvent(gs, [{ op: 'raw', opcode: 0x9a, operands: [4, 6, 2] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.allEventObjects.map((n) => n.sState)).toEqual([1, 1, 1, 2, 2, 2]) // id 3/4/5 全改(含跨 scene)
  })

  it('0x9A setMultiState:op2 按 SHORT 写入,0xFFFF → -1(隐藏态)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.allEventObjects = [
      { id: 0, x: 0, y: 0, spriteNum: 0, sState: 1 },
      { id: 1, x: 0, y: 0, spriteNum: 1, sState: 1 },
      { id: 2, x: 0, y: 0, spriteNum: 1, sState: 1 },
    ]
    gs.npcs = [gs.allEventObjects[1]!, gs.allEventObjects[2]!]
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x9a, operands: [2, 3, 0xFFFF] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.allEventObjects.map((n) => n.sState)).toEqual([1, -1, -1])
  })
})

// ── A 类补全(2026-05-29):0x8F halveCash / 0xA1 setAllPartyPos / 0x8D levelUp / 0x85 delay ──
describe('A 类补全:0x8F / 0xA1 / 0x8D / 0x85', () => {
  it('0x8F halveCash:dwCash /= 2(向下取整)(script.c:2598-2603)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 101
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x8f, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(50)
  })

  it('0xA1 setAllPartyPos:全 trail(5 项)= 队首世界坐标 + 朝向(script.c:2998-3014)', () => {
    const gs = createInitialGameState({ x: 320, y: 240, facing: 'left' })
    gs.trail = [{ x: 1, y: 2, dir: 'up' }] // 旧 trail 被覆盖
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0xa1, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.trail).toHaveLength(5)
    for (const t of gs.trail) expect(t).toEqual({ x: 320, y: 240, dir: 'left' })
  })

  it('0x8D increasePlayerLevel:level += op0(clamp 99)+ stat 增长 + Exp 重置(global.c:2347-2409)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const r = gs.PlayerRolesRuntime
    r.rgwLevel[0] = 5
    r.rgwMaxHP[0] = 100
    r.rgwAttackStrength[0] = 20
    gs.Exp.rgPrimaryExp[0] = { wExp: 999, wLevel: 5 }
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x8d, operands: [2, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 0 // role 0
    tickEventSystem(gs, snap(), bus)
    expect(r.rgwLevel[0]).toBe(7) // +2
    // 2 级:MaxHP += (10..17)×2 → [120,134];Atk += (4..5)×2 → [28,30]
    expect(r.rgwMaxHP[0]).toBeGreaterThanOrEqual(120)
    expect(r.rgwMaxHP[0]).toBeLessThanOrEqual(134)
    expect(r.rgwAttackStrength[0]).toBeGreaterThanOrEqual(28)
    expect(r.rgwAttackStrength[0]).toBeLessThanOrEqual(30)
    expect(gs.Exp.rgPrimaryExp[0]).toEqual({ wExp: 0, wLevel: 7 }) // 重置 wExp + 同步 level
  })

  it('0x8D level clamp 99', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwLevel[0] = 98
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x8d, operands: [5, 0, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(99)
  })

  it('0x85 delay:op0>0 → waiting=delay,到 delayUntilMs 后继续跑后续 opcode(script.c:2511-2516)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 100
    const bus = createCommandBus()
    const t0 = 1000
    const spy = vi.spyOn(performance, 'now').mockReturnValue(t0)
    // 0:delay [3] → 240ms;1:halveCash(延迟后继续的证据);2:end
    loadEvent(gs, [
      { op: 'raw', opcode: 0x85, operands: [3, 0, 0] },
      { op: 'raw', opcode: 0x8f, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('delay')
    expect(gs.eventCursor?.delayUntilMs).toBe(t0 + 240)
    expect(gs.dwCash).toBe(100) // 还没跑到 halveCash
    // 未到点:仍等
    spy.mockReturnValue(t0 + 100)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('delay')
    expect(gs.dwCash).toBe(100)
    // 到点:清 waiting + 继续跑 halveCash
    spy.mockReturnValue(t0 + 240)
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(50)
    spy.mockRestore()
  })

  it('0x85 delay op0=0 → 即时(不进 waiting,本 tick 继续)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 100
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x85, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0x8f, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dwCash).toBe(50) // op0=0 即时 → 同 tick 跑到 halveCash
  })
})

// ── P0#1(2026-05-29):0x19/0x1A 行索引表错位修复(setAttackStrength 曾误写 MagicStrength)──
describe('0x19/0x1A player-stat 行索引(sdlpal global.h tagPLAYERROLES 真值)', () => {
  it('0x1A setPlayerStat operand[0]=17 → 写 AttackStrength(不是 MagicStrength)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const r = gs.PlayerRolesRuntime
    r.rgwAttackStrength[0] = 10
    r.rgwMagicStrength[0] = 20
    const bus = createCommandBus()
    // operand: [row=17(AttackStrength), value=99, role+1=1→role0]
    loadEvent(gs, [{ op: 'raw', opcode: 0x1a, operands: [17, 99, 1] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(r.rgwAttackStrength[0]).toBe(99) // 旧错表会写到 MagicStrength → 这里仍是 10
    expect(r.rgwMagicStrength[0]).toBe(20) // 未被误写
  })

  it('0x19 increasePlayerAttr operand[0]=6 → 加 Level;18 → MagicStrength;31 → CoveredBy', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const r = gs.PlayerRolesRuntime
    r.rgwLevel[0] = 3
    r.rgwMagicStrength[0] = 5
    r.rgwCoveredBy[0] = 0
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x19, operands: [6, 2, 1] },   // Level += 2
      { op: 'raw', opcode: 0x19, operands: [18, 7, 1] },  // MagicStrength += 7
      { op: 'raw', opcode: 0x1a, operands: [31, 1, 1] },  // CoveredBy = 1
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(r.rgwLevel[0]).toBe(5)
    expect(r.rgwMagicStrength[0]).toBe(12)
    expect(r.rgwCoveredBy[0]).toBe(1) // 旧错表 CoveredBy=28(写不进)→ 仍 0
  })
})

// ── P1#3(2026-05-29):g_fScriptSuccess + 物品延迟消耗 gate(sdlpal play.c:298 / script.c:3187)──
describe('P1#3 g_fScriptSuccess + 物品消耗 gate', () => {
  it('默认 fScriptSuccess=true;0x41 markScriptFailed → false', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.fScriptSuccess).toBe(true)
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x41, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.fScriptSuccess).toBe(false)
  })

  it('0x1B HP delta 单体:满血(无变化)→ false;有变化 → 保持 true(script.c:889-892)', () => {
    // 满血:HP=max → +50 不变 → false
    const gs1 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs1.PlayerRolesRuntime.rgwHP[0] = 100
    gs1.PlayerRolesRuntime.rgwMaxHP[0] = 100
    const bus = createCommandBus()
    loadEvent(gs1, [{ op: 'raw', opcode: 0x1b, operands: [0, 50, 0] }, { op: 'end' }])
    gs1.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs1, snap(), bus)
    expect(gs1.fScriptSuccess).toBe(false)
    // 受伤:HP=50 → +50 → 100(变化)→ 仍 true
    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs2.PlayerRolesRuntime.rgwHP[0] = 50
    gs2.PlayerRolesRuntime.rgwMaxHP[0] = 100
    loadEvent(gs2, [{ op: 'raw', opcode: 0x1b, operands: [0, 50, 0] }, { op: 'end' }])
    gs2.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs2, snap(), bus)
    expect(gs2.fScriptSuccess).toBe(true)
    expect(gs2.PlayerRolesRuntime.rgwHP[0]).toBe(100)
  })

  it('0x1B HP delta:死人(HP==0)→ 不改 HP + false(sdlpal PAL_IncreaseHPMP 仅活人,global.c:1287)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwHP[0] = 0 // 死人
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x1b, operands: [0, 50, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(0) // 死人 HP 不变(此前 bug:加成 50)
    expect(gs.fScriptSuccess).toBe(false) // 无变化 → false
  })

  it('0x22 revive 单体:活人(HP!=0)→ false(用复活药在活人身上)(script.c:1099)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwHP[0] = 30
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x22, operands: [0, 5, 0] }, { op: 'end' }])
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.fScriptSuccess).toBe(false)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(30) // 未复活
  })

  it('物品延迟消耗:脚本成功 → 扣 1;脚本 0x41 失败 → 不扣(play.c:298)', () => {
    const bus = createCommandBus()
    // P2#5:item.scriptOnUse 是全局 entry → resolveScriptLabel 经全局 labelMap 解全局 ip。
    // 成功脚本:L_1 = 单条 end(无失败 opcode),落在单一全局数组 idx1。
    const gsOk = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsOk.inventory = [{ itemId: 5, count: 3 }]
    setGlobalEvents([{ op: 'end' }, { op: 'end', label: 'L_1' }])
    try {
      expect(startOverworldItemScript(gsOk, 5, 1, 0, true)).toBe(true)
      expect(gsOk.pendingItemConsume).toBe(5) // 延迟:还没扣
      expect(gsOk.inventory[0]?.count).toBe(3)
      tickEventSystem(gsOk, snap(), bus)
      expect(gsOk.inventory[0]?.count).toBe(2) // 脚本成功 → 扣 1
      expect(gsOk.pendingItemConsume).toBeUndefined()
    }
    finally {
      setGlobalEvents([])
    }

    // 失败脚本:L_1 跑 0x41 再 end(L_1 落在全局 idx1)
    const gsFail = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsFail.inventory = [{ itemId: 5, count: 3 }]
    setGlobalEvents([
      { op: 'end' },
      { op: 'raw', opcode: 0x41, operands: [0, 0, 0], label: 'L_1' },
      { op: 'end' },
    ])
    try {
      startOverworldItemScript(gsFail, 5, 1, 0, true)
      tickEventSystem(gsFail, snap(), bus)
      expect(gsFail.inventory[0]?.count).toBe(3) // 脚本失败 → 不扣
      expect(gsFail.pendingItemConsume).toBeUndefined()
    }
    finally {
      setGlobalEvents([])
    }
  })

  it('applyToAll 物品(0xFFFF)用完 → 关全菜单回 explore(桂花酒);非 applyToAll → 留菜单(INNER 循环)', () => {
    const bus = createCommandBus()
    // P2#5:scriptOnUse=1 → 全局 L_1(idx1 = end)。
    setGlobalEvents([{ op: 'end' }, { op: 'end', label: 'L_1' }])
    try {
      // applyToAll(targetRoleIdOrAll=0xFFFF):脚本结束应关菜单回 explore,让世界 trigger 触发
      const gsAll = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gsAll.menuStack = [{ kind: 'inventory', state: {} }]
      startOverworldItemScript(gsAll, 272, 1, 0xFFFF, false) // 桂花酒类:applyToAll consuming=false
      expect(gsAll.itemUseApplyToAll).toBe(true)
      tickEventSystem(gsAll, snap(), bus) // L_1 = end → 脚本结束
      expect(gsAll.mode).toBe('explore')
      expect(gsAll.menuStack).toEqual([])
      expect(gsAll.itemUseApplyToAll).toBeUndefined()

      // 非 applyToAll(role 0):脚本结束 menuStack 非空 → 留 'menu'(ItemUseMenu 反复用)
      const gsOne = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gsOne.menuStack = [{ kind: 'inventory', state: {} }]
      startOverworldItemScript(gsOne, 5, 1, 0, true)
      expect(gsOne.itemUseApplyToAll).toBe(false)
      tickEventSystem(gsOne, snap(), bus)
      expect(gsOne.mode).toBe('menu')
      expect(gsOne.menuStack.length).toBe(1)
    }
    finally {
      setGlobalEvents([])
    }
  })
})

// ── onEnter 脚本持久化(2026-05-28 开场 cutscene 重进重播回归)──────────────────
//
// sdlpal play.c:64:rgScene[i].wScriptOnEnter = PAL_RunTriggerScript(wScriptOnEnter,...)
// —— onEnter 跑完把"下一条 entry"存回场景。开场 cutscene 以 0x01(advance)收尾 →
// 推进到下一条 0x00(stop)→ 重进只跑 0x00 → 不重播。
// bug:ts 每次从 onEnterLabel 重跑,没存回 → 出场景再回去 cutscene 重播。
function onEnterCursor(gs: GameState, commands: Command[], ip: number, sceneId: number): void {
  gs.eventCursor = {
    commands,
    labelMap: buildLabelMap(commands),
    ip,
    onEnterSceneId: sceneId,
    onEnterStartIp: ip,
  }
  gs.mode = 'event'
}

describe('onEnter 脚本持久化(sdlpal play.c:64)', () => {
  it('0x01(advance)收尾 → sceneOnEnterIp 存 ip+1;重进从 0x00 跑不重播 cutscene', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const commands: Command[] = [
      { op: 'raw', opcode: 0x15, operands: [0, 0, 0] }, // ip0 cutscene 动作(重进不该再跑)
      { op: 'end', advance: true }, // ip1 0x01 收尾
      { op: 'end' }, // ip2 0x00 stop
    ]
    // 首次进 scene 2:从 ip0 跑
    onEnterCursor(gs, commands, 0, 2)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor).toBeUndefined() // onEnter 结束
    expect(gs.sceneOnEnterIp[2]).toBe(2) // 0x01@ip1 → ip1+1=2(下一条 0x00)

    // 重进 scene 2:用持久化的 override ip=2(0x00)
    onEnterCursor(gs, commands, gs.sceneOnEnterIp[2]!, 2)
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneOnEnterIp[2]).toBe(2) // 0x00 → 原地不推进,cutscene(ip0)不再跑
  })

  it('0x00 直接收尾 → sceneOnEnterIp 存起始 ip(replay-in-place,"每次进都跑"的脚本)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const commands: Command[] = [
      { op: 'raw', opcode: 0x15, operands: [0, 0, 0] }, // ip0
      { op: 'end' }, // ip1 0x00(无 advance)
    ]
    onEnterCursor(gs, commands, 0, 3)
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneOnEnterIp[3]).toBe(0) // 0x00 → 返回起始 ip 0(下次仍从头跑)
  })

  it('onEnter 结束幂等清 sceneLoading(override 入口无 fadeScreen 也不残留)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.sceneLoading = true // P2#7:loadScene 设的"加载期跳渲染"标志(正常已在 loadSceneCommon 清)
    // override 入口 = 已推进过开场的 0x00(无 fadeScreen)
    onEnterCursor(gs, [{ op: 'end' }], 0, 2)
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneLoading).toBe(false) // onEnter 结束 → 幂等清(防御:任何路径不残留)
  })

  it('runEnterScript(skip-intro 同步路径):0x01 收尾也持久化 sceneOnEnterIp(重进不重播)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const commands: Command[] = [
      { op: 'raw', opcode: 0x46, operands: [10, 10, 0] }, // ip0 setPartyPos(开场起点)
      { op: 'showDialog', text: '很久很久以前', messageIndex: 0 }, // ip1 同步路径跳过对话
      { op: 'end', advance: true }, // ip2 0x01 收尾
      { op: 'end' }, // ip3 0x00
    ]
    runEnterScript(gs, commands, buildLabelMap(commands), 0, 2)
    expect(gs.sceneOnEnterIp[2]).toBe(3) // 0x01@ip2 → ip2+1=3(下一条 0x00),重进不重播开场
  })

  it('runEnterScript:cursor 传入 → 条件跳转(0x95 jumpIfScene)生效(旧版不传 cursor → no-op 走 fall-through)', () => {
    // P2#6c:旧版 runEnterScript 不传 cursor → 跳转类 opcode 在 applyRawOpcode 内 no-op → 走 fall-through
    //   (party 落 x=320)。修后跳转生效 → 走 jump 目标(x=640)。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wNumScene = 5
    const commands: Command[] = [
      { op: 'raw', opcode: 0x95, operands: [5, 99, 0] },                 // ip0: scene==5 → jump L_99
      { op: 'raw', opcode: 0x46, operands: [10, 10, 0] },               // ip1: fall-through 哨兵(x=320)
      { op: 'end' },                                                     // ip2
      { label: 'L_99', op: 'raw', opcode: 0x46, operands: [20, 20, 0] }, // ip3: jump 目标(x=640)
      { op: 'end' },                                                     // ip4
    ]
    runEnterScript(gs, commands, buildLabelMap(commands), 0)
    expect(gs.party.x).toBe(640) // 跳转生效;旧版 no-op 会走 ip1 → x=320
  })

  it('loadScene 续跑调用脚本(setPartyPos 不被抛弃)+ 脚本结束才触发 reload(sdlpal 0x59 continue,2026-05-29)', () => {
    // 无 onEnter scene 的 party 位置只能来自 loadScene 后的 setPartyPos(scene 13/wNumScene14 黑屏根因)。
    let loadedScene = -1
    setSceneLoader(async (sid) => { loadedScene = sid })
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'loadScene', sceneId: 14 },                   // ip0
        { op: 'raw', opcode: 0x46, operands: [21, 55, 0] }, // ip1 setPartyPos(续跑必须执行)
        { op: 'end' },                                      // ip2
      ])
      tickEventSystem(gs, snap(), bus)
      expect(gs.party.x).toBe(21 * 32) // setPartyPos col21 → x=672(续跑没被抛弃;旧版会丢)
      expect(gs.sceneLoading).toBe(true) // reload 期间保留旧帧
      expect(loadedScene).toBe(14)       // 脚本结束触发延迟 reload
    }
    finally {
      setSceneLoader(null)
    }
  })

  it('L3:loadScene(0x59)换场景时重置 gs.wLayer=0(sdlpal script.c:1883)', () => {
    let loadedScene = -1
    setSceneLoader(async (sid) => { loadedScene = sid })
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.wLayer = 8 // 上一场景 0x6E 设的队伍层残留(operand*8)
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'loadScene', sceneId: 14 },
        { op: 'end' },
      ])
      tickEventSystem(gs, snap(), bus)
      expect(gs.wLayer).toBe(0) // 换场景归 0(script.c:1883 gpGlobals->wLayer = 0)
      expect(loadedScene).toBe(14)
    }
    finally {
      setSceneLoader(null)
    }
  })

  it('scene-load 失败 → 清 sceneLoading + 回 explore(不永久黑屏卡死)— 仙灵岛船渡黑屏根因回归(2026-05-30)', async () => {
    // 根因:triggerPendingSceneLoad 的 _sceneLoader.catch 旧版只 log,不清 sceneLoading →
    //   async load 失败时 gs.sceneLoading 永卡 true → tickSceneAutoFadeIn 永远早退 → 0x50 FadeOut
    //   设的黑屏永不淡入 → 永久黑屏+冻结。对齐 sdlpal play.c:61 fEnteringScene 进场前无条件清。
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setSceneLoader(async () => { throw new Error('simulate scene asset fetch/decode failed') })
    try {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const bus = createCommandBus()
      loadEvent(gs, [
        { op: 'loadScene', sceneId: 15 }, // ip0:仙灵岛船渡目标(wNumScene 15)
        { op: 'end' },                    // ip1:脚本结束 → triggerPendingSceneLoad
      ])
      tickEventSystem(gs, snap(), bus)
      // 触发瞬间:sceneLoading=true(等 async),cursor 已被 end 清,mode=explore
      expect(gs.sceneLoading).toBe(true)
      // 等 _sceneLoader 的 reject + catch 兜底跑完(flush 微任务)
      await Promise.resolve()
      await Promise.resolve()
      // ★ 兜底解冻:不再永久黑屏卡死
      expect(gs.sceneLoading).toBe(false)
      expect(gs.mode).toBe('explore')
      expect(gs.eventCursor).toBeUndefined()
      expect(errSpy).toHaveBeenCalled() // 真因已记日志供定位
    }
    finally {
      setSceneLoader(null)
      errSpy.mockRestore()
    }
  })
})

// ── A2 条件跳转 opcode(2026-05-28)──────────────────────────────────────────────
// 跳转目标 = operand 值(全局 entry),经 labelMap 解析。分支用 setPartyPos(0x46)做哨兵观测:
// fall-through 落点 vs jump-target 落点不同,看 party.x 判定哪个分支跑了。
describe('A2 条件跳转 opcode', () => {
  // 公共脚本:ip0 跳转判断 → 命中跳 L_T(setPartyPos 20,20→x=640);未命中 fall-through(setPartyPos 10,10→x=320)
  function jumpScript(opcode: number, operands: [number, number, number]): Command[] {
    return [
      { op: 'raw', opcode, operands }, // ip0 条件跳转
      { op: 'raw', opcode: 0x46, operands: [10, 10, 0] }, // ip1 fall-through 哨兵
      { op: 'end' }, // ip2
      { label: 'L_99', op: 'raw', opcode: 0x46, operands: [20, 20, 0] }, // ip3 jump 目标哨兵
      { op: 'end' }, // ip4
    ]
  }

  it('0x95 jumpIfScene:wNumScene==op0 → 跳(L_99→x=640);不等 → fall-through(x=320)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wNumScene = 5
    const bus = createCommandBus()
    loadEvent(gs, jumpScript(0x95, [5, 99, 0])) // scene==5 → jump L_99
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(640) // 跳了

    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs2.wNumScene = 6
    loadEvent(gs2, jumpScript(0x95, [5, 99, 0]))
    tickEventSystem(gs2, snap(), createCommandBus())
    expect(gs2.party.x).toBe(320) // 没跳,fall-through
  })

  it('0x58 jumpIfItemLess:背包不足 op1 → 跳', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 7, count: 2 }]
    const bus = createCommandBus()
    loadEvent(gs, jumpScript(0x58, [7, 5, 99])) // item7 数量 2 < 5 → jump op2=99
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(640) // 数量不足 → 跳
  })

  it('0x79 jumpIfPlayerInParty:队伍含 name==op0 → 跳', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwName[0] = 36 // 李逍遥 name=36
    const bus = createCommandBus()
    loadEvent(gs, jumpScript(0x79, [36, 99, 0])) // name 36 在队伍 → jump op1=99
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(640)
  })

  it('0x94 jumpIfObjState:pCurrent.sState==op1 → 跳', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 4, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    const bus = createCommandBus()
    loadEvent(gs, jumpScript(0x94, [5, 2, 99])) // obj id=5(op0-1=4) sState==2 → jump op2=99
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(640)
  })

  it('0xA2 randomJump:cursor.ip += RandomLong(0,op0-1)(op0=1 → offset 0,确定)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    // op0=1 → RandomLong(0,0)=0 → ip += 0 → caller ip++ → ip1(setPartyPos 10,10 → x=320)
    loadEvent(gs, [
      { op: 'raw', opcode: 0xa2, operands: [1, 0, 0] }, // ip0
      { op: 'raw', opcode: 0x46, operands: [10, 10, 0] }, // ip1
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.party.x).toBe(320) // offset 0 → 跑 ip1
  })
})

// ── A3 数据 opcode(2026-05-28)──────────────────────────────────────────────────
describe('A3 opcode:0x75 setParty / 0x90 setObjectScript', () => {
  it('0x75 setParty:operand[0..2]=roleId+1 → partyMembers,清 poison(script.c:2164)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.rgPoisonStatus = { '0_0': { wPoisonID: 5, wPoisonScript: 0 } }
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x75, operands: [1, 2, 3] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.partyMembers).toEqual([0, 1, 2]) // roleId = operand-1
    expect(gs.rgPoisonStatus).toEqual({}) // poison 清空
  })

  it('0x75 setParty:全 0 → 兜底 [0](sdlpal HACK)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1, 2]
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x75, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.partyMembers).toEqual([0])
  })

  it('0x90 setObjectScript:rgObject[op0].rgwData[2+op2]=op1(script.c:2605)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x90, operands: [42, 777, 1] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.rgObject[42]?.rgwData[3]).toBe(777) // idx = 2 + op2(1) = 3
  })

  // ── 中毒机制(2026-05-31 批次 1:0x29 抗性 + 真 wPlayerScript + cure-by-level) ──
  it('0x29 apply-player applyAll:抗性=0 → 全队中毒,存真 wPlayerScript(setObjectPoisons)', () => {
    setObjectPoisons([{ id: 5, level: 1, color: 64, playerScript: 40866, enemyScript: 0 }])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1]
    gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 0
    gs.PlayerRolesRuntime.rgwPoisonResistance[1] = 0
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x29, operands: [1, 5, 0] }, { op: 'end' }]) // applyAll poison=5
    tickEventSystem(gs, snap(), bus)
    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 5, wPoisonScript: 40866 })
    expect(gs.rgPoisonStatus['0_1']).toEqual({ wPoisonID: 5, wPoisonScript: 40866 })
  })

  it('M12:0x29 apply-player 施毒当下跑一次 playerScript,存返回 next entry(global.c:1515)', () => {
    setObjectPoisons([{ id: 5, level: 1, color: 64, playerScript: 20, enemyScript: 0 }])
    const cmds: Command[] = [
      { op: 'raw', opcode: 0x29, operands: [0, 5, 0], label: 'L_0' },
      { op: 'end' },
      { op: 'raw', opcode: 0x1A, operands: [9, 70, 0], label: 'L_20' },
      { op: 'end', advance: true },
    ]
    setGlobalEvents(cmds)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 0
    gs.PlayerRolesRuntime.rgwHP[0] = 50
    const bus = createCommandBus()
    loadEvent(gs, cmds, 0)
    gs.eventCursor!.currentEventObjectId = 0
    tickEventSystem(gs, snap(), bus)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(70) // 入口脚本当下执行
    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 5, wPoisonScript: 4 }) // L_20 后 advance → ip+1
  })

  it('0x29 apply-player:抗性=100 → 不中毒(RandomLong(1,100) > 100 永假)', () => {
    setObjectPoisons([{ id: 5, level: 1, color: 64, playerScript: 40866, enemyScript: 0 }])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 100
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x29, operands: [1, 5, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.rgPoisonStatus['0_0']).toBeUndefined()
  })

  it('0x29 apply-player:去重 — 已有同毒不加第二槽(PAL_AddPoisonForPlayer)', () => {
    setObjectPoisons([{ id: 5, level: 1, color: 64, playerScript: 40866, enemyScript: 0 }])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 0
    gs.rgPoisonStatus = { '0_0': { wPoisonID: 5, wPoisonScript: 40866 } }
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x29, operands: [1, 5, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.rgPoisonStatus['1_0']).toBeUndefined() // 未加第二槽
  })

  it('curePlayerPoisonByLevel:maxLevel=1 只清 level≤1,留 level3(用真 level)', () => {
    setObjectPoisons([
      { id: 5, level: 1, color: 64, playerScript: 1, enemyScript: 0 },
      { id: 6, level: 3, color: 128, playerScript: 2, enemyScript: 0 },
    ])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.rgPoisonStatus = { '0_0': { wPoisonID: 5, wPoisonScript: 1 }, '1_0': { wPoisonID: 6, wPoisonScript: 2 } }
    curePlayerPoisonByLevel(gs, 0, 1)
    expect(gs.rgPoisonStatus['0_0']!.wPoisonID).toBe(0) // level1 清
    expect(gs.rgPoisonStatus['1_0']!.wPoisonID).toBe(6) // level3 留
  })

  it('0x6D setSceneScripts:op1!=0 → sceneOnEnterOverride[op0]=op1;op1=0&&op2=0 → 0(清)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x6d, operands: [3, 500, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneOnEnterOverride?.[3]).toBe(500)

    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    loadEvent(gs2, [{ op: 'raw', opcode: 0x6d, operands: [3, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs2, snap(), createCommandBus())
    expect(gs2.sceneOnEnterOverride?.[3]).toBe(0) // 清
  })

  it('0x6D op2!=0 → sceneOnTeleportOverride[op0]=op2(script.c:2077-2081)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    loadEvent(gs, [{ op: 'raw', opcode: 0x6d, operands: [5, 0, 9139] }, { op: 'end' }])
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.sceneOnTeleportOverride?.[5]).toBe(9139)
    expect(gs.sceneOnEnterOverride?.[5]).toBeUndefined() // op1=0 不动 onEnter(op2!=0,非 both-zero)
  })

  it('0x6D op1!=0 && op2!=0 → 同时设 onEnter + onTeleport', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    loadEvent(gs, [{ op: 'raw', opcode: 0x6d, operands: [5, 500, 9139] }, { op: 'end' }])
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.sceneOnEnterOverride?.[5]).toBe(500)
    expect(gs.sceneOnTeleportOverride?.[5]).toBe(9139)
  })

  it('0x6D op1=0 && op2=0 → 清 onEnter + onTeleport(script.c:2083-2086)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.sceneOnTeleportOverride = { 5: 9139 }
    loadEvent(gs, [{ op: 'raw', opcode: 0x6d, operands: [5, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.sceneOnEnterOverride?.[5]).toBe(0)
    expect(gs.sceneOnTeleportOverride?.[5]).toBe(0)
  })

  it('0x98 setFollower:operand[0..1]>0 → gs.followers + nFollower(script.c:2709)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x98, operands: [3, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.followers).toEqual([3]) // role id 直接(sdlpal 无 -1)
    expect(gs.nFollower).toBe(1)
  })

  it('0x99 changeMap:op0!=0xFFFF → sceneMapNumOverride[op0]=op1(script.c:2740)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [{ op: 'raw', opcode: 0x99, operands: [5, 99, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneMapNumOverride?.[5]).toBe(99)
  })
})

// ── 0x04 call-script(2026-05-28,238 次最高频,调用栈)──────────────────────────
describe('0x04 callScript(script.c:3258 — 调用栈)', () => {
  it('调用子脚本 → 跑完 → 返回 caller 下一条继续', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 4, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x04, operands: [50, 0, 0] }, // ip0 call L_50
      { op: 'raw', opcode: 0x46, operands: [30, 30, 0] }, // ip1 返回后:setPartyPos → x=960
      { op: 'end' }, // ip2 真结束
      { label: 'L_50', op: 'raw', opcode: 0x49, operands: [5, 7, 0] }, // ip3 子脚本:npc id4 sState=7
      { op: 'end' }, // ip4 子脚本 end → 弹栈返回 ip1
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.sState).toBe(7) // 子脚本跑了(0x49)
    expect(gs.party.x).toBe(960) // 返回 caller 后继续跑了 ip1
    expect(gs.eventCursor).toBeUndefined() // 最终 end 清 cursor
  })

  it('嵌套调用:A 调 B,B 调 C,逐层返回', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 4, x: 0, y: 0, spriteNum: 1, sState: 0 },
      { id: 5, x: 0, y: 0, spriteNum: 1, sState: 0 },
    ]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x04, operands: [60, 0, 0] }, // ip0 call B(L_60)
      { op: 'raw', opcode: 0x46, operands: [30, 30, 0] }, // ip1 A 返回后 x=960
      { op: 'end' }, // ip2
      { label: 'L_60', op: 'raw', opcode: 0x04, operands: [80, 0, 0] }, // ip3 B call C(L_80)
      { op: 'raw', opcode: 0x49, operands: [5, 1, 0] }, // ip4 B 返回后:npc id4 sState=1
      { op: 'end' }, // ip5 B end → 返回 ip1
      { label: 'L_80', op: 'raw', opcode: 0x49, operands: [6, 2, 0] }, // ip6 C:npc id5 sState=2
      { op: 'end' }, // ip7 C end → 返回 ip4
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[1]?.sState).toBe(2) // C 跑了
    expect(gs.npcs[0]?.sState).toBe(1) // B 返回后跑了
    expect(gs.party.x).toBe(960) // A 返回后跑了
    expect(gs.eventCursor).toBeUndefined()
  })

  it('op1!=0 → 子脚本内 currentEventObjectId 覆盖为 op1-1(作用于 op1 指定 npc)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 8, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: 0x04, operands: [50, 9, 0] }, // ip0 call L_50,eventObj=9(1-based)→ id 8
      { op: 'end' }, // ip1
      // 子脚本 0x14 setObjectGesture(用 self = currentEventObjectId,被覆盖为 8)→ 设 id8 scriptedFrame
      { label: 'L_50', op: 'raw', opcode: 0x14, operands: [5, 0, 0] }, // ip2
      { op: 'end' }, // ip3
    ])
    gs.eventCursor!.currentEventObjectId = 0 // caller 的
    tickEventSystem(gs, snap(), bus)
    expect(gs.npcs[0]?.scriptedFrame).toBe(5) // 子脚本 self 作用于 op1 指定的 npc id8
  })
})

describe('特效 A — 调色板 state opcode(2026-05-29)', () => {
  it('0x53 setDayPalette → gs.nightPalette=false;0x54 setNightPalette → true', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.nightPalette).toBe(false) // 默认白天
    loadEvent(gs, [{ op: 'raw', opcode: 0x54, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.nightPalette).toBe(true)
    loadEvent(gs, [{ op: 'raw', opcode: 0x53, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.nightPalette).toBe(false)
  })

  it('setPalette(0x8B)→ gs.numPalette 记当前调色板索引(供 FadeIn/SceneFade 选目标)', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.numPalette).toBe(0)
    loadEvent(gs, [{ op: 'setPalette', paletteIndex: 7 }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.numPalette).toBe(7)
  })
})

describe('特效 A 调色板淡入淡出引擎(2026-05-29 — sdlpal palette.c FadeOut/FadeIn/SceneFade/PaletteFade/ColorFade/FadeToRed)', () => {
  /** 造 256 色全填同一色的 Palette。 */
  function mkPal(c: [number, number, number]): Palette {
    return { colors: Array.from({ length: 256 }, () => [c[0], c[1], c[2]] as [number, number, number]), cycles: [] }
  }
  /** 起手:gs 带工作调色板 + 稳定 base(模拟 bootstrap 种子)。 */
  function gsWithPalette(cur: [number, number, number], base: [number, number, number]): GameState {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.palette = mkPal(cur)
    gs.basePalette = mkPal(base)
    return gs
  }
  /** 把 fade 时间推到已结束(time-based 完成模拟)。 */
  function expireFade(gs: GameState): void {
    if (gs.paletteFadeState) gs.paletteFadeState.startTimeMs = performance.now() - gs.paletteFadeState.totalMs - 100
  }

  it('0x50 FadeOut → paletteFadeState(lerp→黑)+ waiting=palette-fade + needToFadeIn=true', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([200, 100, 50], [200, 100, 50])
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_OUT, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.needToFadeIn).toBe(true)
    expect(gs.paletteFadeState?.mode).toBe('lerp')
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([0, 0, 0]) // → 黑
    expect(gs.paletteFadeState?.totalMs).toBe(600) // (op0||1)*600
    // 淡完 → finalize(工作 palette 变黑)+ 清状态 + ip 推进到 end → explore
    expireFade(gs)
    tickEventSystem(gs, snap(), bus)
    expect(gs.paletteFadeState).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined() // end → mode explore,cursor 清
    expect(gs.palette?.colors[0]).toEqual([0, 0, 0])
  })

  it('battle runScript raw fallback:0x50 FadeOut → 启动 paletteFadeState 并消费 opcode', () => {
    const gs = gsWithPalette([200, 100, 50], [200, 100, 50])
    runScript({
      commands: [{ op: 'raw', opcode: OP_FADE_OUT, operands: [2, 0, 0] }, { op: 'end' }],
      ip: 0,
      bus: createCommandBus(),
      runtimeMode: 'battle',
      battleCtx: {
        state: { phase: 'performAction' } as BattleState,
        gs,
      },
    })
    expect(gs.needToFadeIn).toBe(true)
    expect(gs.paletteFadeState?.mode).toBe('lerp')
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([0, 0, 0])
    expect(gs.paletteFadeState?.totalMs).toBe(1200)
  })

  it('0x4E load-last-save → fade-out + reloadSlotAfterFade=当前槽 → 淡完调 handler(slot) + 停脚本', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([200, 100, 50], [200, 100, 50])
    gs.currentSaveSlot = 3
    const loaded: number[] = []
    setLoadLastSaveHandler((slot) => { loaded.push(slot) })
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    loadEvent(gs, [{ op: 'raw', opcode: OP_LOAD_LAST_SAVE, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    // fade-out 启动:waiting=palette-fade,target 黑,记 reloadSlotAfterFade=3,handler 未调
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([0, 0, 0])
    expect(gs.paletteFadeState?.totalMs).toBe(600) // 同 0x50 delay=1
    expect(gs.eventCursor?.reloadSlotAfterFade).toBe(3)
    expect(loaded).toEqual([])
    expect(gs.needToFadeIn).not.toBe(true) // 0x4E 不在淡黑时设 needToFadeIn(loaded scene 淡入由 handler 设)
    // 淡完 → fire handler(slot 3)+ 停脚本(cursor 清,对齐 sdlpal return 0)
    expireFade(gs)
    tickEventSystem(gs, snap(), bus)
    expect(loaded).toEqual([3])
    expect(gs.eventCursor).toBeUndefined()
    debugSpy.mockRestore()
    setLoadLastSaveHandler(null)
  })

  it('0x05 redraw + needToFadeIn → PAL_MakeScene 自动淡入(仙灵岛靠岸黑屏修复,sdlpal script.c:3290)', () => {
    // 真因:onEnter(如仙灵岛靠岸 5117)序 setpos→0x05→对话;旧码 0x05 无 dialog 时纯 ip++,
    //   不重绘/淡入 → FadeOut(0x50)后的黑屏留到对话期(waiting='dialog' 门控挡掉 auto fade-in)→ 对话浮黑屏。
    //   sdlpal 0x05 = PAL_MakeScene(needToFadeIn → PAL_FadeIn)→ 岛在对话前淡入。
    const bus = createCommandBus()
    const gs = gsWithPalette([0, 0, 0], [180, 120, 60]) // 当前黑(FadeOut 后),base 有色
    gs.needToFadeIn = true   // sail FadeOut(0x50)设
    gs.sceneLoading = true   // loadScene 后未清
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    loadEvent(gs, [
      { op: 'raw', opcode: OP_REDRAW_SCREEN, operands: [0, 0, 0] }, // 0x05 redraw(无 dialog)
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    // 0x05 触发淡入:paletteFadeState 黑→base,waiting=palette-fade,needToFadeIn 清,sceneLoading 解冻
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.sceneLoading).toBe(false)
    expect(gs.paletteFadeState?.startColors[0]).toEqual([0, 0, 0])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([180, 120, 60])
    expect(gs.paletteFadeState?.totalMs).toBe(600)
    // 淡完 → ip++ 到 end → explore(cursor 清)
    expireFade(gs)
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor).toBeUndefined()
    debugSpy.mockRestore()
  })

  it('0x05 redraw 无 needToFadeIn → 解冻 + UTIL_Delay(60ms) 后续跑(不误触发淡入)', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([180, 120, 60], [180, 120, 60])
    gs.needToFadeIn = false
    gs.sceneLoading = true
    loadEvent(gs, [
      { op: 'raw', opcode: OP_REDRAW_SCREEN, operands: [0, 0, 0] },
      { op: 'raw', opcode: OP_SET_OBJECT_POS, operands: [0, 5, 5] }, // 哨兵:延时完后续跑(无 self → skip + ip++)
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.paletteFadeState).toBeUndefined() // 无 pending 淡入 → 不触发
    expect(gs.sceneLoading).toBe(false)         // 解冻(PAL_MakeScene 重绘)
    expect(gs.eventCursor?.waiting).toBe('delay') // 0x05 UTIL_Delay(60ms,sdlpal script.c:3293)
    gs.eventCursor!.delayUntilMs = 0             // 强制延时已过
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore')             // 延时完 → 续跑到 end
  })

  it('0x51 FadeIn → 黑→base + needToFadeIn=false', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([0, 0, 0], [180, 120, 60])
    gs.needToFadeIn = true
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_IN, operands: [2, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.paletteFadeState?.startColors[0]).toEqual([0, 0, 0])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([180, 120, 60]) // → base
    expect(gs.paletteFadeState?.totalMs).toBe(1200) // delay 2 * 600
    expireFade(gs)
    tickEventSystem(gs, snap(), bus)
    expect(gs.palette?.colors[0]).toEqual([180, 120, 60])
  })

  it('0x51 FadeIn delay 取 (SHORT)op0>0?op0:1 — 负/0 → 1', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([0, 0, 0], [10, 10, 10])
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_IN, operands: [0xffff, 0, 0] }, { op: 'end' }]) // (SHORT)0xFFFF=-1 → delay 1
    tickEventSystem(gs, snap(), bus)
    expect(gs.paletteFadeState?.totalMs).toBe(600)
  })

  it('0x93 SceneFade step>0 → scene-fade(放行 autoScript)+ 黑→base + needToFadeIn=false', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([5, 5, 5], [100, 0, 0])
    loadEvent(gs, [{ op: 'raw', opcode: OP_SCENE_FADE, operands: [2, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('scene-fade') // 关键:放行 autoScript 的 tag
    expect(gs.needToFadeIn).toBe(false) // step>0
    expect(gs.paletteFadeState?.startColors[0]).toEqual([0, 0, 0])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([100, 0, 0])
    expect(gs.paletteFadeState?.totalMs).toBe(Math.ceil(64 / 2) * 100) // 3200
  })

  it('0x93 SceneFade step<0 → cur→黑 + needToFadeIn=true', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([100, 0, 0], [100, 0, 0])
    loadEvent(gs, [{ op: 'raw', opcode: OP_SCENE_FADE, operands: [0xfffe, 0, 0] }, { op: 'end' }]) // (SHORT)0xFFFE = -2
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('scene-fade')
    expect(gs.needToFadeIn).toBe(true)
    expect(gs.paletteFadeState?.startColors[0]).toEqual([100, 0, 0])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([0, 0, 0])
  })

  it('0x80 PaletteFade → toggle night + crossfade;op0=0 → fUpdateScene → scene-fade;op0!=0 → palette-fade', () => {
    const bus = createCommandBus()
    // op0=0:fUpdateScene=true → scene-fade,32*100=3200ms
    const gs = gsWithPalette([0, 0, 0], [80, 80, 80])
    expect(gs.nightPalette).toBe(false)
    loadEvent(gs, [{ op: 'raw', opcode: OP_PALETTE_FADE, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.nightPalette).toBe(true) // toggle
    expect(gs.eventCursor?.waiting).toBe('scene-fade')
    expect(gs.paletteFadeState?.totalMs).toBe(3200)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([80, 80, 80]) // night data-blocked → day base

    // op0!=0:fUpdateScene=false → palette-fade(冻),32*25=800ms
    const gs2 = gsWithPalette([0, 0, 0], [80, 80, 80])
    loadEvent(gs2, [{ op: 'raw', opcode: OP_PALETTE_FADE, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs2, snap(), bus)
    expect(gs2.eventCursor?.waiting).toBe('palette-fade')
    expect(gs2.paletteFadeState?.totalMs).toBe(800)
  })

  it('0x8C ColorFade → approach ±4 + needToFadeIn=false;!fFrom 场景→纯色', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([100, 100, 100], [100, 100, 100])
    gs.basePalette!.colors[7] = [40, 40, 40]
    // PAL_ColorFade(op1=delay, (BYTE)op0=color, op2=fFrom);!fFrom(op2=0)= 场景淡成纯色
    loadEvent(gs, [{ op: 'raw', opcode: OP_COLOR_FADE, operands: [7, 1, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.paletteFadeState?.mode).toBe('approach')
    expect(gs.paletteFadeState?.increment).toBe(4)
    expect(gs.paletteFadeState?.startColors[0]).toEqual([100, 100, 100]) // 场景 base
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([40, 40, 40])   // 纯色 base[7]
    expect(gs.paletteFadeState?.totalMs).toBe(64 * (1 * 10)) // delay 1 → perStep 10 → 640
  })

  it('0x4F FadeToRed → approach ±8 + skipIndex 0x4F + remap', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([100, 100, 100], [100, 100, 100])
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_TO_RED, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.paletteFadeState?.mode).toBe('approach')
    expect(gs.paletteFadeState?.increment).toBe(8)
    expect(gs.paletteFadeState?.skipIndex).toBe(0x4f)
    expect(gs.paletteFadeState?.remap).toEqual({ from: 0x4f, to: 0x4e })
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([139, 0, 0]) // (300)/4+64
    expect(gs.paletteFadeState?.totalMs).toBe(2400)
  })

  // C4(gameOverActive 重构):0x4F handler 真执行时接管死亡演出标记。
  //   C2 已移除 resumePostBattleScript 里 `outcome==='lost'` 无条件置 gameOverActive,
  //   故 gameOverActive 现只由这里(脚本真跑到 0x4F)置 → 死亡红屏纯由 opcode 驱动,无"按战斗结局"判据。
  it('0x4F FadeToRed → 置 gameOverActive=true(死亡演出由 opcode 驱动,非战斗结局)', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([100, 100, 100], [100, 100, 100])
    expect(gs.gameOverActive).toBeFalsy() // 前置:未置
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_TO_RED, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.gameOverActive).toBe(true)
  })

  it('0x4F FadeToRed → 清 deathHoldActive(过渡帧 hold 交棒给 gameOverActive)', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([100, 100, 100], [100, 100, 100])
    gs.deathHoldActive = true // 模拟:T0 resume 预置了过渡帧 hold,等脚本跑到 0x4F
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_TO_RED, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.deathHoldActive).toBe(false) // 交棒:纯 hold 结束,转 gameOverActive(hold+染红+画死亡对话)
    expect(gs.gameOverActive).toBe(true)
  })

  // C7(gameOverActive 重构):死亡序列端到端时序 —— 跨 game-state(resume 判据)+ event-system(0x4F handler)。
  //   验证两标记的交棒在真事件循环里成立:T0 战败接回置 deathHoldActive(纯 hold,gameOver 未亮)→
  //   脚本跑到 0x4F → 同一拍清 deathHold、亮 gameOver、起染红 ramp。补 C1-C4 各单测没覆盖的"接缝时序"。
  it('C7 死亡序列端到端:resume→deathHold(纯hold)→0x4F→交棒 gameOver(染红)', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([100, 100, 100], [100, 100, 100])
    // mini 死亡脚本(mimic L_41075):0x43 music → 0x4F FadeToRed → showDialog → end。lostIp 指 ip1 避开"=0 续"语义。
    const deathScript: Command[] = [
      { op: 'end' },                                                    // ip0 filler
      { op: 'raw', opcode: OP_PLAY_MUSIC, operands: [1, 1, 0] },        // ip1 ← lostIp(非阻塞)
      { op: 'raw', opcode: OP_FADE_TO_RED, operands: [0, 0, 0] },       // ip2 死亡红屏
      { op: 'showDialog', messageIndex: 0, text: '大侠请重新来过吧' },  // ip3 死亡对话
      { op: 'end' },                                                    // ip4
    ]
    gs.postBattleResume = { wonIp: 0, lostIp: 1, commands: deathScript, labelMap: buildLabelMap(deathScript) }

    // T0:战败接回 → 判据扫到 0x4F → 预置 deathHoldActive(纯 hold;此刻 gameOver 还没亮,palette 还没 ramp)。
    resumePostBattleScript(gs, 'lost')
    expect(gs.deathHoldActive).toBe(true)
    expect(gs.gameOverActive).toBeFalsy()
    expect(gs.paletteFadeState).toBeFalsy() // 还没染红

    // tick1:0x43(非阻塞,ip++)→ 0x4F → 同一拍交棒。
    tickEventSystem(gs, snap(), bus)
    expect(gs.deathHoldActive).toBe(false)         // 纯 hold 结束
    expect(gs.gameOverActive).toBe(true)           // 死亡演出接管(present 改 hold+画对话)
    expect(gs.paletteFadeState?.totalMs).toBe(2400) // FadeToRed ramp 起(染保持的战斗帧)
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
  })

  it('0x9B fadeToScene → 复用 dither gs.fadeState(speed=2)+ waiting=fade-screen,不建 paletteFadeState', () => {
    const bus = createCommandBus()
    const gs = gsWithPalette([10, 10, 10], [10, 10, 10])
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_TO_SCENE, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('fade-screen')
    expect(gs.fadeState?.speed).toBe(2)
    expect(gs.fadeState?.totalMs).toBe(2160)
    expect(gs.paletteFadeState).toBeUndefined() // dither 引擎,不用色表 ramp
  })

  it('0x8B setPalette needToFadeIn=true 时不立即套屏(只更新 basePalette)', async () => {
    const fake: Palette = { colors: Array.from({ length: 256 }, () => [50, 60, 70] as [number, number, number]), cycles: [] }
    setFetchPalette(() => Promise.resolve(fake))
    const bus = createCommandBus()
    const gs = gsWithPalette([0, 0, 0], [1, 1, 1])
    gs.needToFadeIn = true
    const blackRef = gs.palette
    loadEvent(gs, [{ op: 'setPalette', paletteIndex: 4 }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    await vi.waitFor(() => expect(gs.basePalette?.colors[0]).toEqual([50, 60, 70])) // basePalette 更新
    expect(gs.palette).toBe(blackRef) // 屏幕仍黑(needToFadeIn → 不套新色)
    setFetchPalette(() => Promise.resolve(fake))
  })
})

describe('特效 A auto fade-in(sdlpal scene.c:503 PAL_MakeScene)+ FadeOut 冻屏', () => {
  function mkPal(c: [number, number, number]): Palette {
    return { colors: Array.from({ length: 256 }, () => [c[0], c[1], c[2]] as [number, number, number]), cycles: [] }
  }

  it('FadeOut 不清 sceneLoading(冻屏淡黑触发前帧,不重绘 setPartyPos 瞬移)', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.palette = mkPal([200, 100, 50])
    gs.basePalette = mkPal([200, 100, 50])
    gs.sceneLoading = true // loadScene 已设(door 切换序:setPartyPos→loadScene→FadeOut)
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_OUT, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.sceneLoading).toBe(true) // **关键**:FadeOut 保持冻屏(不像 FadeIn 解冻)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([0, 0, 0])
  })

  it('FadeIn 清 sceneLoading(需重绘目标 scene 淡入)', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.palette = mkPal([0, 0, 0])
    gs.basePalette = mkPal([100, 100, 100])
    gs.sceneLoading = true
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_IN, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.sceneLoading).toBe(false) // FadeIn 解冻
  })

  it('tickSceneAutoFadeIn:explore + needToFadeIn → 启动 FadeIn(黑→base)+ 清 flag', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'explore'
    gs.basePalette = mkPal([120, 60, 30])
    gs.palette = mkPal([0, 0, 0])
    gs.needToFadeIn = true
    tickSceneAutoFadeIn(gs)
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.paletteFadeState?.mode).toBe('lerp')
    expect(gs.paletteFadeState?.startColors[0]).toEqual([0, 0, 0])
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([120, 60, 30])
    expect(gs.paletteFadeState?.totalMs).toBe(600) // PAL_FadeIn(...,1)
  })

  it('tickSceneAutoFadeIn:event 阻塞态 / fade 中 / sceneLoading / 无 needToFadeIn 不触发;event+frame-wait 触发', () => {
    const base = (): GameState => {
      const g = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      g.basePalette = mkPal([1, 1, 1]); g.palette = mkPal([0, 0, 0]); g.needToFadeIn = true; g.mode = 'explore'
      return g
    }
    // event 模式 + 阻塞 waiting(dialog,sdlpal 此时不调 PAL_GameUpdate → 不 PAL_MakeScene)不触发
    const g1 = base(); g1.mode = 'event'; g1.eventCursor = { ip: 0, waiting: 'dialog' }; tickSceneAutoFadeIn(g1)
    expect(g1.paletteFadeState).toBeUndefined(); expect(g1.needToFadeIn).toBe(true)
    // sceneLoading 不触发
    const g2 = base(); g2.sceneLoading = true; tickSceneAutoFadeIn(g2)
    expect(g2.paletteFadeState).toBeUndefined()
    // 已有 fade 进行中不触发
    const g3 = base(); g3.fadeState = { speed: 2, totalMs: 2160, startTimeMs: 0, appliedSteps: 0 }
    tickSceneAutoFadeIn(g3); expect(g3.paletteFadeState).toBeUndefined()
    // 无 needToFadeIn 不触发
    const g4 = base(); g4.needToFadeIn = false; tickSceneAutoFadeIn(g4)
    expect(g4.paletteFadeState).toBeUndefined()
    // event 模式 + frame-wait(onEnter cutscene 的 0x09 wait;sdlpal PAL_GameUpdate 在 wait 里跑
    //   → PAL_MakeScene 按 fNeedToFadeIn 淡入)→ **触发**(香兰报信 enter=903 黑屏修复 2026-05-30)
    const g5 = base(); g5.mode = 'event'; g5.eventCursor = { ip: 0, waiting: 'frame-wait' }; tickSceneAutoFadeIn(g5)
    expect(g5.paletteFadeState).toBeDefined(); expect(g5.needToFadeIn).toBe(false)
  })
})

describe('特效 B/C opcode(RNG 0x36/0x37 + wave 0x71)', () => {
  it('0x36 SetRNG → gs.iCurPlayingRNG = op0(instant 非阻塞)', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    loadEvent(gs, [{ op: 'raw', opcode: OP_SET_RNG, operands: [7, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.iCurPlayingRNG).toBe(7)
  })

  it('0x71 WaveScreen → wScreenWave=op0,sWaveProgression=(SHORT)op1(负数符号转换)', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // op1=0xFFFE = -2(SHORT):波幅渐弱
    loadEvent(gs, [{ op: 'raw', opcode: OP_WAVE_SCREEN, operands: [40, 0xFFFE, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wScreenWave).toBe(40)
    expect(gs.sWaveProgression).toBe(-2)
  })

  it('0x37 PlayRNG → 调注入 handler(chunk=iCurPlayingRNG,end/speed 三元真值)+ waiting=rng-play + ip++', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    let captured: RngPlayHandlerInput | undefined
    setRngPlayHandler((input) => { captured = input })
    try {
      // 先 0x36 设 chunk=3,再 0x37(op0=10 start, op1=0 → end=-1, op2=0 → speed=16)
      loadEvent(gs, [
        { op: 'raw', opcode: OP_SET_RNG, operands: [3, 0, 0] },
        { op: 'raw', opcode: OP_PLAY_RNG, operands: [10, 0, 0] },
        { op: 'end' },
      ])
      tickEventSystem(gs, snap(), bus)
      expect(captured).toBeDefined()
      expect(captured!.chunkIdx).toBe(3) // 来自 gs.iCurPlayingRNG,非 operand
      expect(captured!.startFrame).toBe(10)
      expect(captured!.endFrame).toBe(-1) // op1=0 → -1(播到末帧)
      expect(captured!.speed).toBe(16) // op2=0 → 16 默认
      expect(captured!.fadeIn).toBe(false)
      expect(gs.eventCursor?.waiting).toBe('rng-play')
    }
    finally {
      setRngPlayHandler(null)
    }
  })

  it('0x50 后 0x37:首帧消费 needToFadeIn,恢复稳定 palette 并请求 RNG 淡入(山神庙传剑 CG)', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.needToFadeIn = true
    gs.palette = makeWorkingPaletteFor([0, 0, 0])
    gs.basePalette = makeWorkingPaletteFor([180, 120, 60])
    let captured: RngPlayHandlerInput | undefined
    setRngPlayHandler((input) => { captured = input })
    try {
      loadEvent(gs, [{ op: 'raw', opcode: OP_PLAY_RNG, operands: [0, 112, 16] }, { op: 'end' }])
      tickEventSystem(gs, snap(), bus)

      expect(captured?.fadeIn).toBe(true)
      expect(gs.needToFadeIn).toBe(false)
      expect(gs.palette?.colors[0]).toEqual([180, 120, 60])
      expect(gs.eventCursor?.waiting).toBe('rng-play')
    }
    finally {
      setRngPlayHandler(null)
    }
  })

  it('0x37 PlayRNG 无 handler 注入 → skip + ip++(不卡死)', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    setRngPlayHandler(null)
    loadEvent(gs, [{ op: 'raw', opcode: OP_PLAY_RNG, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor).toBeUndefined() // 跑到 end → 脚本结束
  })
})

describe('特效 A 夜间调色板(resolveNightColors fade target)', () => {
  function palWithNight(): Palette {
    return {
      colors: Array.from({ length: 256 }, () => [200, 200, 200] as [number, number, number]),
      cycles: [],
      nightColors: Array.from({ length: 256 }, () => [20, 20, 40] as [number, number, number]),
    }
  }

  it('nightPalette=true + basePalette 有 nightColors → FadeIn target = 夜色', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.palette = { colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]), cycles: [] }
    gs.basePalette = palWithNight()
    gs.nightPalette = true
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_IN, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([20, 20, 40]) // 夜色,非 [200,200,200]
  })

  it('nightPalette=false → FadeIn target = 白天色', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.palette = { colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]), cycles: [] }
    gs.basePalette = palWithNight()
    gs.nightPalette = false
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_IN, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([200, 200, 200])
  })

  it('0x80 PaletteFade toggle night → target 用 toggle 后的夜色', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.palette = makeWorkingPaletteFor([100, 100, 100])
    gs.basePalette = palWithNight()
    gs.nightPalette = false // toggle → true → 夜色 target
    loadEvent(gs, [{ op: 'raw', opcode: OP_PALETTE_FADE, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.nightPalette).toBe(true)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([20, 20, 40])
  })

  it('basePalette 无 nightColors(白天 only chunk)+ night=true → 回退白天色(不崩)', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.palette = makeWorkingPaletteFor([0, 0, 0])
    gs.basePalette = { colors: Array.from({ length: 256 }, () => [77, 77, 77] as [number, number, number]), cycles: [] }
    gs.nightPalette = true
    loadEvent(gs, [{ op: 'raw', opcode: OP_FADE_IN, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([77, 77, 77]) // 无夜色 → 白天
  })
})

function makeWorkingPaletteFor(c: [number, number, number]): Palette {
  return { colors: Array.from({ length: 256 }, () => [...c] as [number, number, number]), cycles: [] }
}

describe('特效 B FBP opcode(0x76 ShowFBP)', () => {
  it('0x76 → 调注入 handler(chunkIdx=op0, fade=op1)+ waiting=show-fbp + ip++', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    let captured: ShowFbpHandlerInput | undefined
    setShowFbpHandler((input) => { captured = input })
    try {
      loadEvent(gs, [{ op: 'raw', opcode: OP_SHOW_FBP, operands: [75, 7, 0] }, { op: 'end' }])
      tickEventSystem(gs, snap(), bus)
      expect(captured).toBeDefined()
      expect(captured!.chunkIdx).toBe(75)
      expect(captured!.fade).toBe(7)
      expect(gs.eventCursor?.waiting).toBe('show-fbp')
    }
    finally {
      setShowFbpHandler(null)
    }
  })

  it('0x76 chunk=0xFFFF → 进入黑屏保持;0x51 FadeIn 释放黑屏保持', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.palette = makeWorkingPaletteFor([0, 0, 0])
    gs.basePalette = makeWorkingPaletteFor([180, 120, 60])
    let captured: ShowFbpHandlerInput | undefined
    setShowFbpHandler((input) => { captured = input })
    try {
      loadEvent(gs, [
        { op: 'raw', opcode: OP_SHOW_FBP, operands: [65535, 0, 0] },
        { op: 'raw', opcode: OP_FADE_IN, operands: [1, 0, 0] },
        { op: 'end' },
      ])
      tickEventSystem(gs, snap(), bus)
      expect(captured?.chunkIdx).toBe(65535)
      expect(gs.blackScreenHold).toBe(true)
      expect(gs.eventCursor?.waiting).toBe('show-fbp')

      gs.eventCursor!.waiting = undefined
      tickEventSystem(gs, snap(), bus)
      expect(gs.blackScreenHold).toBe(false)
      expect(gs.eventCursor?.waiting).toBe('palette-fade')
    }
    finally {
      setShowFbpHandler(null)
    }
  })

  it('0x76 无 handler 注入 → skip + ip++(不卡死)', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    setShowFbpHandler(null)
    loadEvent(gs, [{ op: 'raw', opcode: OP_SHOW_FBP, operands: [65535, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.eventCursor).toBeUndefined()
  })
})

describe('特效 B ScrollFBP opcode(0xA4)', () => {
  it('0xA4 → 调注入 handler(chunkIdx=op0, speed=op2)+ waiting=scroll-fbp + ip++', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    let captured: { chunkIdx: number, speed: number } | undefined
    setScrollFbpHandler((input) => { captured = { chunkIdx: input.chunkIdx, speed: input.speed } })
    try {
      loadEvent(gs, [{ op: 'raw', opcode: OP_SCROLL_FBP, operands: [74, 0, 15] }, { op: 'end' }])
      tickEventSystem(gs, snap(), bus)
      expect(captured).toEqual({ chunkIdx: 74, speed: 15 }) // op0=chunk, op2=speed(op1 未用)
      expect(gs.eventCursor?.waiting).toBe('scroll-fbp')
    }
    finally {
      setScrollFbpHandler(null)
    }
  })
})

describe('结局 EndingAnimation opcode(0x96)', () => {
  it('0x96 → 调注入 handler + waiting=ending-anim + ip++', () => {
    const bus = createCommandBus()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    let called = false
    setEndingAnimationHandler(() => { called = true })
    try {
      loadEvent(gs, [{ op: 'raw', opcode: OP_ENDING_ANIMATION, operands: [0, 0, 0] }, { op: 'end' }])
      tickEventSystem(gs, snap(), bus)
      expect(called).toBe(true)
      expect(gs.eventCursor?.waiting).toBe('ending-anim')
    }
    finally {
      setEndingAnimationHandler(null)
    }
  })
})

// ── Batch C explore:0x34 transform-collected / 0x38 teleport-out ──────────────
describe('opcode 0x34 transformCollected(script.c:1452,妖魔转化)', () => {
  it('collectValue>0 → 扣 RandomLong(1,cv) + 发 store[0].rgwItems[i-1]', () => {
    setStoreTable([{ items: [100, 105, 95] }])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.wCollectValue = 3
    vi.spyOn(Math, 'random').mockReturnValue(0) // RandomLong(1,3) = floor(0*3)+1 = 1
    loadEvent(gs, [
      { op: 'raw', opcode: OP_TRANSFORM_COLLECTED, operands: [99, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wCollectValue).toBe(2) // 3 - 1
    expect(gs.inventory).toEqual([{ itemId: 100, count: 1 }]) // items[1-1]=items[0]
    vi.restoreAllMocks()
    setStoreTable([])
  })

  it('PAL_CLASSIC cap:i=RandomLong(1,cv) 截到 9', () => {
    setStoreTable([{ items: [100, 105, 95, 112, 72, 131, 97, 102, 111] }])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.wCollectValue = 100
    vi.spyOn(Math, 'random').mockReturnValue(0.999) // floor(0.999*100)+1 = 100 → cap 9
    loadEvent(gs, [
      { op: 'raw', opcode: OP_TRANSFORM_COLLECTED, operands: [99, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wCollectValue).toBe(91) // 100 - 9
    expect(gs.inventory).toEqual([{ itemId: 111, count: 1 }]) // items[9-1]=items[8]
    vi.restoreAllMocks()
    setStoreTable([])
  })

  it('L1 物品框:发物品弹 item-box dialog(炼出+物品名)+ waiting,按键关 + 推进脚本', () => {
    // sdlpal script.c:1479-1513 PAL_StartDialogWithOffset(kDialogCenterWindow,...) + ITEMBOX + PAL_ShowDialogText
    const words: string[] = []
    words[42] = '炼出'   // PAL_GetWord(42)
    words[100] = '金创药' // 物品名 = PAL_GetWord(itemId)
    setWordTable(words)
    setStoreTable([{ items: [100, 105, 95] }])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.wCollectValue = 1
    vi.spyOn(Math, 'random').mockReturnValue(0) // RandomLong(1,1) = 1 → i-1 = 0 → items[0]=100
    loadEvent(gs, [
      { op: 'raw', opcode: OP_TRANSFORM_COLLECTED, operands: [99, 0, 0] },
      { op: 'end' },
    ])
    // tick1:发物品 + 弹物品框 + 暂停(不推进 ip)
    tickEventSystem(gs, snap(), bus)
    expect(gs.inventory).toEqual([{ itemId: 100, count: 1 }])
    expect(gs.wCollectValue).toBe(0)
    expect(gs.dialogBox?.style).toBe('item-box')
    expect(gs.dialogBox?.itemBox).toEqual({ itemId: 100, line1: '炼出', line2: '金创药' })
    expect(gs.eventCursor?.waiting).toBe('dialog')
    expect(gs.eventCursor?.ip).toBe(0) // 暂停在 0x34,未推进
    // tick2:任意键关物品框(复用 narration auto-dismiss)→ 推进 ip → 'end' 结束
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.dialogBox).toBeUndefined()
    vi.restoreAllMocks()
    setStoreTable([])
    setWordTable([])
  })

  it('collectValue==0 → jump op0(跳过线性后继 op)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.wCollectValue = 0
    gs.eventCursor = {
      commands: [
        { op: 'raw', opcode: OP_TRANSFORM_COLLECTED, operands: [2, 0, 0] }, // jump idx2
        { op: 'raw', opcode: OP_SET_RNG, operands: [111, 0, 0] }, // 跳过则不设
        { op: 'end' },
      ],
      ip: 0,
    }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), bus)
    expect(gs.iCurPlayingRNG).toBe(0) // idx1 被跳过
    expect(gs.inventory).toEqual([]) // 无发放
  })

  it('i 越过 store items 长度(尾部 0 槽)→ 不发但仍扣 collectValue', () => {
    setStoreTable([{ items: [] }]) // 空 store
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.wCollectValue = 1
    vi.spyOn(Math, 'random').mockReturnValue(0) // i=1 → 扣到 0;i--=0;items[0]=undefined→不发
    loadEvent(gs, [
      { op: 'raw', opcode: OP_TRANSFORM_COLLECTED, operands: [99, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wCollectValue).toBe(0)
    expect(gs.inventory).toEqual([])
    vi.restoreAllMocks()
    setStoreTable([])
  })
})

describe('opcode 0x38 teleportOut(script.c:1554,归隐符/瞬移)', () => {
  it('失败路径:fScriptSuccess=FALSE + jump op0(scriptOnTeleport==0 场景忠实)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.fScriptSuccess = true
    gs.eventCursor = {
      commands: [
        { op: 'raw', opcode: OP_TELEPORT_OUT, operands: [2, 0, 0] }, // jump idx2
        { op: 'raw', opcode: OP_SET_RNG, operands: [111, 0, 0] }, // 跳过则不设
        { op: 'end' },
      ],
      ip: 0,
    }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), bus)
    expect(gs.fScriptSuccess).toBe(false)
    expect(gs.iCurPlayingRNG).toBe(0) // idx1 被跳过 → 确实跳转
    expect(gs.eventCursor).toBeUndefined() // 到 end
  })

  it('成功路径:!fInBattle && scene.wScriptOnTeleport!=0 → call+return 跑 teleport 脚本(script.c:1558-1562)', () => {
    // PAL_RunTriggerScript(teleport, 0xFFFF) = 压返回帧 + 跳子脚本;子脚本 end → 弹帧回 caller 续跑。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.fScriptSuccess = true
    gs.wNumScene = 42
    gs.sceneOnTeleportEntry = 3 // 当前场景 base teleport entry(= 内嵌 commands 下标,labelMap 缺→直接当 ip)
    gs.eventCursor = {
      commands: [
        { op: 'raw', opcode: OP_TELEPORT_OUT, operands: [99, 0, 0] }, // ip0:成功不走 op0=99
        { op: 'raw', opcode: 0x45, operands: [7, 0, 0] },              // ip1:返回后跑 → wNumBattleMusic=7
        { op: 'end' },                                                 // ip2:caller end
        { op: 'raw', opcode: 0x36, operands: [111, 0, 0] },            // ip3:teleport 脚本 → iCurPlayingRNG=111
        { op: 'end' },                                                 // ip4:teleport end → 弹帧回 ip1
      ],
      ip: 0,
    }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.iCurPlayingRNG).toBe(111)   // teleport 脚本跑了
    expect(gs.wNumBattleMusic).toBe(7)     // 弹帧回 caller 续跑 0x47 后续(call+return)
    expect(gs.fScriptSuccess).toBe(true)   // 成功不置 false
    expect(gs.eventCursor).toBeUndefined() // caller end
  })

  it('成功路径:sceneOnTeleportOverride[scene] 优先于 base(0x6D op2 改写)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.fScriptSuccess = true
    gs.wNumScene = 42
    gs.sceneOnTeleportEntry = 3 // base
    gs.sceneOnTeleportOverride = { 42: 6 } // override → 跳 ip6 而非 ip3
    gs.eventCursor = {
      commands: [
        { op: 'raw', opcode: OP_TELEPORT_OUT, operands: [99, 0, 0] }, // ip0
        { op: 'end' },                                                // ip1 caller end
        { op: 'end' }, { op: 'end' }, { op: 'end' }, { op: 'end' },   // ip2-5 填充
        { op: 'raw', opcode: 0x36, operands: [222, 0, 0] },           // ip6:override teleport → RNG=222
        { op: 'end' },                                                // ip7
      ],
      ip: 0,
    }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.iCurPlayingRNG).toBe(222) // 走 override entry(ip6),非 base(ip3)
  })

  it('battle 中(gs.battleState 存在)→ 失败路径(sdlpal !fInBattle gate)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.fScriptSuccess = true
    gs.wNumScene = 42
    gs.sceneOnTeleportEntry = 3
    // biome-ignore lint/suspicious/noExplicitAny: 仅置非 undefined 触发 inBattle gate
    gs.battleState = {} as any
    gs.eventCursor = {
      commands: [
        { op: 'raw', opcode: OP_TELEPORT_OUT, operands: [2, 0, 0] }, // ip0:fail → jump op0=2
        { op: 'raw', opcode: 0x36, operands: [111, 0, 0] },          // ip1:跳过
        { op: 'end' },                                               // ip2
      ],
      ip: 0,
    }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.fScriptSuccess).toBe(false) // 战斗中 → 失败
    expect(gs.iCurPlayingRNG).toBe(0)     // ip1 跳过(跳到 ip2 end)
  })
})

// ── 0x7F move viewport / camera pan(script.c:2292-2379)──────────────────────
describe('opcode 0x7F moveViewport / camera pan(script.c:2292-2379)', () => {
  it('center(op0==0&&op1==0)→ camera = party - (160,112)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.party = { x: 300, y: 200, facing: 'down' }
    gs.camera = { x: -999, y: -999 }
    loadEvent(gs, [{ op: 'raw', opcode: 0x7f, operands: [0, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.camera).toEqual({ x: 140, y: 88 }) // 300-160, 200-112
  })

  it('abs-jump(op2==0xFFFF)→ camera = (op0*32-160, op1*16-112)(脱离 party,显示绝对地图区)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.party = { x: 300, y: 200, facing: 'down' }
    gs.camera = { x: 0, y: 0 }
    loadEvent(gs, [{ op: 'raw', opcode: 0x7f, operands: [5, 3, 0xFFFF] }, { op: 'end' }])
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.camera).toEqual({ x: 0, y: -64 }) // 5*32-160=0, 3*16-112=-64
  })

  it('单帧 pan(op2<=1)→ camera += (SHORT op0, SHORT op1) 一次', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.camera = { x: 100, y: 100 }
    loadEvent(gs, [{ op: 'raw', opcode: 0x7f, operands: [8, 4, 0] }, { op: 'end' }]) // op2=0 → 1 帧
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.camera).toEqual({ x: 108, y: 104 })
  })

  it('多帧 pan(op2=3)→ waiting=camera-pan,逐帧移 (8,4),3 帧后 (24,12) + 续跑', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.camera = { x: 0, y: 0 }
    gs.eventCursor = {
      commands: [
        { op: 'raw', opcode: 0x7f, operands: [8, 4, 3] }, // ip0:3 帧 pan
        { op: 'raw', opcode: 0x36, operands: [77, 0, 0] }, // ip1:pan 完续跑 → iCurPlayingRNG=77
        { op: 'end' },
      ],
      ip: 0,
    }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), createCommandBus()) // 帧1
    expect(gs.camera).toEqual({ x: 8, y: 4 })
    expect(gs.eventCursor?.waiting).toBe('camera-pan')
    tickEventSystem(gs, snap(), createCommandBus()) // 帧2
    expect(gs.camera).toEqual({ x: 16, y: 8 })
    tickEventSystem(gs, snap(), createCommandBus()) // 帧3 → 完成 + 续跑 ip1
    expect(gs.camera).toEqual({ x: 24, y: 12 })
    expect(gs.iCurPlayingRNG).toBe(77) // pan 完弹回续跑
    expect(gs.eventCursor).toBeUndefined()
  })

  it('多帧 pan 负 SHORT(op0=65528=-8,op1=65532=-4,op2=2)→ 逐帧 (-8,-4)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.camera = { x: 100, y: 100 }
    gs.eventCursor = {
      commands: [{ op: 'raw', opcode: 0x7f, operands: [65528, 65532, 2] }, { op: 'end' }],
      ip: 0,
    }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), createCommandBus()) // 帧1
    expect(gs.camera).toEqual({ x: 92, y: 96 })
    tickEventSystem(gs, snap(), createCommandBus()) // 帧2 → 完成
    expect(gs.camera).toEqual({ x: 84, y: 92 })
  })
})

// ── 0x03 goto frameDelay(trigger cutscene NPC 走步循环,script.c:3239-3256)────
describe('opcode 0x03 goto frameDelay(trigger 走步循环,script.c:3239-3256)', () => {
  it('frameDelay 计数:loop 跑 fd 次(0x09 逐 tick yield)后退出续跑,非死循环', () => {
    // 真值 loop:`0x6E walk; 0x09 wait; 0x03 goto-back[fd]`(6 个真站点同构)。
    //   ++idleFrame < fd → 跳回 loop;>= fd → reset + ip++ 退出。0x09 提供逐 tick yield。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.eventCursor = {
      commands: [
        { op: 'raw', opcode: 0x36, operands: [11, 0, 0] }, // ip0:loop 体(setRNG=11,标记跑了)
        { op: 'raw', opcode: 0x09, operands: [0, 0, 0] },  // ip1:wait 1 帧(逐 tick yield)
        { op: 'goto', to: 'L_0', frameDelay: 3 },           // ip2:goto 回 ip0,fd=3
        { op: 'raw', opcode: 0x45, operands: [7, 0, 0] },  // ip3:退出后跑(wNumBattleMusic=7)
        { op: 'end' },
      ],
      labelMap: { L_0: 0 },
      ip: 0,
    }
    gs.mode = 'event'
    // 跑足够多 tick(若死循环则 wNumBattleMusic 永不置 / SINGLE_TICK_LIMIT 抛)。
    for (let i = 0; i < 8; i++) tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.iCurPlayingRNG).toBe(11)   // loop 体跑过
    expect(gs.wNumBattleMusic).toBe(7)   // fd=3 次后退出 → 续跑 ip3
    expect(gs.eventCursor).toBeUndefined() // 到 end
  })

  it('frameDelay 退出时机:fd=3 → 第 3 次 0x03 才退出(前 2 次跳回)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.eventCursor = {
      commands: [
        { op: 'raw', opcode: 0x36, operands: [11, 0, 0] }, // ip0
        { op: 'raw', opcode: 0x09, operands: [0, 0, 0] },  // ip1:yield
        { op: 'goto', to: 'L_0', frameDelay: 3 },           // ip2
        { op: 'raw', opcode: 0x45, operands: [7, 0, 0] },  // ip3
        { op: 'end' },
      ],
      labelMap: { L_0: 0 },
      ip: 0,
    }
    gs.mode = 'event'
    // tick1: ip0 setRNG + ip1 0x09 yield
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.wNumBattleMusic).toBe(0) // 还在 loop
    // tick2: 0x03(idle=1<3 跳)+ ip0 + 0x09 yield;tick3: 0x03(idle=2<3 跳)+ ...
    tickEventSystem(gs, snap(), createCommandBus())
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.wNumBattleMusic).toBe(0) // 仍在 loop(idle=2<3)
    // tick4: 0x03(idle=3>=3 → 退出)→ ip3 setBattleMusic
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.wNumBattleMusic).toBe(7) // 退出
  })

  it('frameDelay==0 → 普通 goto(不计数,现有行为不变)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.eventCursor = {
      commands: [
        { op: 'goto', to: 'L_2' },                          // ip0:跳 ip2
        { op: 'raw', opcode: 0x36, operands: [99, 0, 0] }, // ip1:跳过
        { op: 'raw', opcode: 0x45, operands: [7, 0, 0] },  // ip2
        { op: 'end' },
      ],
      labelMap: { L_2: 2 },
      ip: 0,
    }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.iCurPlayingRNG).toBe(0) // ip1 跳过
    expect(gs.wNumBattleMusic).toBe(7)
  })
})

// ── Batch D audio:0x45 set-battle-music / 0x77 stop-music / 0xA3 play-cd ──────
describe('audio opcodes(core state-set + shell audio 播放)', () => {
  it('0x45 setBattleMusic → gs.wNumBattleMusic = op0(script.c:1658)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_SET_BATTLE_MUSIC, operands: [7, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wNumBattleMusic).toBe(7)
  })

  it('0x77 stopMusic → gs.wNumMusic = 0(script.c:2215)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    gs.wNumMusic = 12
    loadEvent(gs, [
      { op: 'raw', opcode: OP_STOP_MUSIC, operands: [3, 0, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wNumMusic).toBe(0)
  })

  it('0xA3 playCDMusic → gs.wNumMusic = op1(RIX 回退,script.c:3023)+ looped', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PLAY_CD_MUSIC, operands: [2, 19, 0] }, // op0=CD track,op1=RIX id
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wNumMusic).toBe(19)
    expect(gs.musicLoop).toBe(true) // AUDIO_PlayMusic(op1, TRUE, 0)
  })

  // M6 音频意图层:opcode → gs 字段(shell AudioManager 每帧消费 → Web Audio)。
  it('0x43 playMusic → wNumMusic=op0 + musicLoop=(op1!=1)(script.c:1647)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    // op1=0 → loop
    loadEvent(gs, [{ op: 'raw', opcode: OP_PLAY_MUSIC, operands: [16, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.wNumMusic).toBe(16)
    expect(gs.musicLoop).toBe(true)
    // op1=1 → no-loop(一次性 stinger)
    loadEvent(gs, [{ op: 'raw', opcode: OP_PLAY_MUSIC, operands: [16, 1, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), bus)
    expect(gs.musicLoop).toBe(false)
  })

  it('0x47 playSound → push gs.pendingSounds(队列,shell drain 播)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [88, 0, 0] },
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [47, 0, 0] }, // "啧～" 不可用音
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.pendingSounds).toEqual([88, 47])
  })
})

describe('tickChaseTimer (sdlpal play.c:235-238 — 0x62/0x63 追逐 timer 到期复位)', () => {
  it('cycles 逐帧自减,到 0 → wChaseRange=1(驱魔香暂停到期恢复追逐)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wChaseRange = 0 // 0x62 驱魔香暂停
    gs.wChasespeedChangeCycles = 2
    tickChaseTimer(gs)
    expect(gs.wChasespeedChangeCycles).toBe(1)
    expect(gs.wChaseRange).toBe(0) // 未到期,仍暂停
    tickChaseTimer(gs)
    expect(gs.wChasespeedChangeCycles).toBe(0)
    expect(gs.wChaseRange).toBe(1) // 到期 → 恢复默认追逐
  })

  it('cycles=0 → 不动(不 underflow,不误改 wChaseRange)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wChaseRange = 3 // 0x63 十里香加速中(无 timer 时本应永久)
    gs.wChasespeedChangeCycles = 0
    tickChaseTimer(gs)
    expect(gs.wChasespeedChangeCycles).toBe(0)
    expect(gs.wChaseRange).toBe(3)
  })
})
