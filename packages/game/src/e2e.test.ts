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
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'right' })
    // npcFromEventObject 收的是原版像素坐标(x/32 → col, y/16 → row),所以构造时 ×32 / ×16
    gs.npcs = [
      npcFromEventObject({
        id: 1,
        x: 8 * 32, y: 5 * 16,
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
    expect(gs.party.col).toBe(7) // 走到 col 7 = NPC 前面(NPC 在 col 8)
  })
})
