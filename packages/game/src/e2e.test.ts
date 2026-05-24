import { describe, it, expect } from 'vitest'
import type { AbstractKey, Command, InputSnapshot, Tilemap } from '@type-pal/shared'
import { createInitialGameState, npcFromEventObject } from './core/game-state.js'
import { createCommandBus } from './core/command-bus.js'
import { buildLabelMap } from './core/event-system.js'
import { ReplayInputSource } from './shell/input.js'
import { tickN, type LoopContext } from './shell/main-loop.js'

function flatMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

function snap(held: AbstractKey[] = [], pressed: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return {
    held: new Set(held),
    pressed: new Set(pressed),
    frameNum,
  }
}

describe('M2 e2e:右 3 步 → Confirm → Confirm', () => {
  it('完整 NPC 触发流程,最终 mode=explore + dialogBox 已清', () => {
    // M5 P0.0:party/npc 改像素坐标(X_STEP=16/Y_STEP=8)。
    // sdlpal scene.c:804-805 East: dx=+16, dy=+8。起点(80,40),3 次右后=(128,64)。
    // facing=right → confirm target=party+Right=(144,72)。
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    // npcFromEventObject:eo.x/y 是 sdlpal pixel,我们的单位 = floor(eo/2)。
    // 把 NPC 放在 Confirm target (144,72) → eo.x=288, eo.y=144。
    gs.npcs = [
      npcFromEventObject({
        id: 1,
        x: 288, y: 144,
        spriteNum: 78,
        triggerLabel: 'L_2',
        triggerMode: 0,
      }),
    ]

    const commands: Command[] = [
      { op: 'raw', opcode: 0, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0, operands: [0, 0, 0] },
      { op: 'showDialog', messageIndex: 0, text: '你好', label: 'L_2' },
      { op: 'end' },
    ]
    const labelMap = buildLabelMap(commands)

    const input = new ReplayInputSource([
      snap(['Right'], [], 0), // tick 0:右
      snap(['Right'], [], 1), // tick 1:右
      snap(['Right'], [], 2), // tick 2:右
      snap([], ['Confirm'], 3), // tick 3:Confirm — SceneSystem 触发 NPC + 切 mode=event
      snap([], [], 4),           // tick 4:event 模式跑 showDialog → waiting
      snap([], ['Confirm'], 5), // tick 5:释放 waiting → end → 回 explore
    ])

    const bus = createCommandBus()
    const ctx: LoopContext = {
      gs, bus, input,
      tilemap: flatMap(20, 20),
      eventCommands: commands, labelMap,
      onPresent: () => {},
    }

    tickN(6, ctx)

    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.dialogBox).toBeUndefined()
    // 走了 3 步 Right(East: dx=+16, dy=+8):x=5*16+3*16=8*16, y=5*8+3*8=8*8
    expect(gs.party.x).toBe(8 * 16)
    expect(gs.party.y).toBe(8 * 8)
  })
})
