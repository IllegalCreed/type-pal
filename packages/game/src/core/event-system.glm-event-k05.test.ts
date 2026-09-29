/**
 * TEST-GLM-EVENT-WAVE-K-1 · K05 对话、调色板、音画等待与消费
 *
 * 审计行(组 K05):
 * - 现行 caller:mode.ts:63(tickEventSystem;tickSceneAutoFadeIn 每帧在 explore/event 前置跑)、
 *   event-system.ts:2490-2516(0x73 分支)、:700(tickSceneAutoFadeIn)、:659(isEventCursorAtMakeSceneStep)。
 * - 旧测证据(排重):
 *   - 调色板 ramp 家族 0x50/0x51/0x80/0x8C/0x93/0x4F/0x9B 全有旧证(event-system.test.ts
 *     :4784-:5112)—— **唯独 0x73 fadeScreen 全仓零断言**(grep OP_FADE_SCREEN/0x73 测试零命中;
 *     mode.test.ts:129/168 仅注释提及)。
 *   - tickSceneAutoFadeIn::5162(explore)、:5176(event 阻塞态/frame-wait)、:5225(camera-pan 执行态)
 *     → **0x70 PartyWalkTo / 0x44 Ride「即将执行」态的 MakeScene 步判定零断言**。
 * - 一手真值:reference/sdlpal/script.c:2140-2147(case 0x0073:VIDEO_BackupScreen + PAL_MakeScene +
 *   VIDEO_FadeScreen(operand[0]));video.c VIDEO_FadeScreen(`wSpeed++; wSpeed *= 10;` 12×6=72 步,
 *   每步 SDL_Delay(wSpeed) → 总时长 = (op0+1)×10×72 ms);script.c:2364-2366 + scene.c:503-508
 *   (走位/骑乘每步 PAL_GameUpdate→PAL_MakeScene→`if(fNeedToFadeIn) PAL_FadeIn`)。
 * - 缺口结论:0x73 全合同(状态数学 + 等待消费)、MakeScene 步判定的走位/骑乘臂可达且无旧证 → 新增;
 *   其余 palette fade 家族与 camera-pan 臂已证不重做。
 */
import type { AbstractKey, Command, InputSnapshot, Palette } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from './command-bus.js'
import {
  buildLabelMap,
  OP_FADE_SCREEN,
  OP_PARTY_WALK_TO,
  OP_PLAY_SOUND,
  OP_RIDE_OBJECT_4,
  OP_SET_CAMERA,
  OP_SHAKE_SCREEN,
  tickEventSystem,
  tickSceneAutoFadeIn,
} from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

function mkPal(c: [number, number, number]): Palette {
  return {
    colors: Array.from({ length: 256 }, () => [c[0], c[1], c[2]] as [number, number, number]),
    cycles: [],
  }
}

function soundsOf(gs: GameState): number[] {
  return gs.pendingSounds ?? []
}

describe('K05 opcode 0x73 fadeScreen:dither fadeState 数学 + 等待消费(sdlpal script.c:2140-2147 + video.c VIDEO_FadeScreen)', () => {
  it('0x73[1] → fadeState{speed:1,totalMs:1440} + 清黑屏保持/冻屏 + waiting=fade-screen;到时消费 → ip++ 同帧续跑', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.sceneLoading = true // 模拟 loadScene 序中冻屏(0x73 是可渲染 yield,须解冻)
    gs.blackScreenHold = true // 模拟此前 0x76 填黑保持
    const commands: Command[] = [
      { op: 'raw', opcode: OP_FADE_SCREEN, operands: [1, 0, 0] }, // ip0:speed=1
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [77, 0, 0] }, // ip1:fade 完成当帧续跑
      { op: 'end' }, // ip2
    ]
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
    gs.mode = 'event'
    // —— 触发:进 fade-screen 等待,ip 不动 ——
    tickEventSystem(gs, snap(), createCommandBus())
    // dither 引擎数学(video.c):(op0+1)×10ms × 72 步 = 2×10×72 = 1440ms
    expect(gs.fadeState?.speed).toBe(1)
    expect(gs.fadeState?.totalMs).toBe(1440)
    expect(gs.blackScreenHold).toBe(false) // PAL_MakeScene 等价重绘 → 黑屏保持解除
    expect(gs.sceneLoading).toBe(false) // 可渲染 yield → 冻屏解除
    expect(gs.eventCursor?.waiting).toBe('fade-screen')
    expect(gs.eventCursor?.ip).toBe(0) // 未消费 opcode
    expect(soundsOf(gs)).toEqual([]) // 后续 op 未跑

    // —— 消费:墙钟推进越过 totalMs(不睡眠:直接老化的 fadeState.startTimeMs = 时间合同输入) ——
    const fade = gs.fadeState
    expect(fade).toBeDefined()
    if (fade) fade.startTimeMs -= 1600
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.fadeState).toBeUndefined() // fade 收尾清态
    expect(gs.eventCursor?.waiting).toBeUndefined()
    expect(soundsOf(gs)).toEqual([77]) // ip++ 后同帧 fall-through 跑后续 op
    expect(gs.mode).toBe('explore') // end 收尾
  })
})

describe('K05 tickSceneAutoFadeIn MakeScene 步判定:0x70 PartyWalkTo / 0x44 Ride / 0x7F pan 即将执行态消费 needToFadeIn', () => {
  function gsAtOp(opcode: number, operands: [number, number, number]): GameState {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.basePalette = mkPal([120, 60, 30])
    gs.palette = mkPal([0, 0, 0])
    gs.needToFadeIn = true
    gs.mode = 'event'
    const commands: Command[] = [{ op: 'raw', opcode, operands, label: 'L_0' }]
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 } // waiting undefined = 即将执行
    return gs
  }

  it('0x70 / 0x44 / 0x7F 多帧 pan(即将执行)→ 消费 needToFadeIn 启动淡入(黑→base,target=basePalette 昼色)', () => {
    const cases: Array<[number, [number, number, number]]> = [
      [OP_PARTY_WALK_TO, [10, 10, 0]],
      [OP_RIDE_OBJECT_4, [10, 10, 0]],
      [OP_SET_CAMERA, [8, 4, 3]], // 多帧 pan:op2>1 才算 MakeScene 步(单帧/回正不算)
    ]
    for (const [opcode, operands] of cases) {
      const gs = gsAtOp(opcode, operands)
      tickSceneAutoFadeIn(gs)
      expect(gs.needToFadeIn).toBe(false)
      expect(gs.paletteFadeState).toBeDefined()
      expect(gs.paletteFadeState?.targetColors[0]).toEqual([120, 60, 30])
    }
  })

  it('负控:cursor 停在非 MakeScene op(0x35 shake)→ 不消费(sdlpal shake 帧不跑 PAL_MakeScene)', () => {
    const gs = gsAtOp(OP_SHAKE_SCREEN, [10, 10, 0])
    tickSceneAutoFadeIn(gs)
    expect(gs.needToFadeIn).toBe(true)
    expect(gs.paletteFadeState).toBeUndefined()
  })
})
