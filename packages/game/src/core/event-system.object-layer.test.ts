/** SHORT 层级写入；同一真实事件入口分别验证负值回绕和正值，不冒称场景像素验收。 */
import type { Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { buildLabelMap, OP_SET_OBJECT_LAYER, tickEventSystem } from './event-system.js'
import { createInitialGameState } from './game-state.js'

function idleInput(): InputSnapshot {
  return { held: new Set(), pressed: new Set(), frameNum: 0 }
}

describe('opcode 0x7e — signed event-object layer', () => {
  it('op1=0xFFFE → sLayer=-2(SHORT wrap,立交/负层合同);单轴对照 op1=3 → 3(正数直通)', () => {
    // —— 负值 wrap:op1=0xFFFE(WORD 视角 65534)→ SHORT -2 ——
    const gsNeg = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const negCmds: Command[] = [
      { op: 'raw', opcode: OP_SET_OBJECT_LAYER, operands: [0xffff, 0xfffe, 0] }, // self
      { op: 'end' },
    ]
    gsNeg.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    gsNeg.eventCursor = {
      commands: negCmds,
      labelMap: buildLabelMap(negCmds),
      ip: 0,
      currentEventObjectId: 7,
    }
    gsNeg.mode = 'event'
    tickEventSystem(gsNeg, idleInput())
    expect(gsNeg.npcs[0]?.sLayer).toBe(-2)

    // —— 单轴对照:同脚本仅 op1 改 3 → 正数直通(排除"恒取负"式误实现) ——
    const gsPos = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const posCmds: Command[] = [
      { op: 'raw', opcode: OP_SET_OBJECT_LAYER, operands: [0xffff, 3, 0] },
      { op: 'end' },
    ]
    gsPos.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    gsPos.eventCursor = {
      commands: posCmds,
      labelMap: buildLabelMap(posCmds),
      ip: 0,
      currentEventObjectId: 7,
    }
    gsPos.mode = 'event'
    tickEventSystem(gsPos, idleInput())
    expect(gsPos.npcs[0]?.sLayer).toBe(3)
  })
})
