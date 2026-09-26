import { describe, expect, it } from 'vitest'
import { translatePalMotionOpcode } from './translate-event-motion.js'

const translate = (opcode: number, operands: number[] = [], owner = 'e5') =>
  translatePalMotionOpcode({ opcode, operands, owner })

describe('PAL motion opcode translation owner', () => {
  it('maps directional steps and reports the historical missing-owner gap', () => {
    expect(translate(0x0b)).toEqual({
      handled: true,
      commands: [{ kind: 'stepEntity', entity: 'e5', dir: 'down' }],
    })
    expect(translate(0x0e)).toEqual({
      handled: true,
      commands: [{ kind: 'stepEntity', entity: 'e5', dir: 'right' }],
    })
    expect(translatePalMotionOpcode({ opcode: 0x0c, operands: [], owner: undefined })).toEqual({
      handled: true,
      commands: [],
      gap: '单步无属主',
    })
  })

  it('keeps entity destination projection and all four speed variants', () => {
    const cases = [
      [0x11, 'slow'],
      [0x10, 'normal'],
      [0x7c, 'fast'],
      [0x82, 'run'],
    ] as const
    for (const [opcode, speed] of cases)
      expect(translate(opcode, [1, 2, 1])).toEqual({
        handled: true,
        commands: [
          {
            kind: 'moveEntity',
            entity: 'e5',
            to: { col: 4, row: 1, height: 0 },
            speed,
          },
        ],
      })
  })

  it('maps party destinations, speed, and ordered nonzero role slots', () => {
    expect(translate(0x7b, [1, 2, 1])).toEqual({
      handled: true,
      commands: [{ kind: 'moveParty', to: { col: 4, row: 1, height: 0 }, speed: 'run' }],
    })
    expect(translate(0x75, [2, 0, 5])).toEqual({
      handled: true,
      commands: [{ kind: 'setParty', members: ['zhao-linger', 'anu'] }],
    })
  })

  it('distinguishes entity mount, detached global no-op, and missing owner', () => {
    expect(translate(0xa1)).toEqual({
      handled: true,
      commands: [{ kind: 'mountParty', entity: 'e5' }],
    })
    expect(translatePalMotionOpcode({ opcode: 0xa1, operands: [], owner: 'global/items' })).toEqual(
      {
        handled: true,
        commands: [],
        knownNoOp: '0xA1.globalTrail',
      },
    )
    expect(translatePalMotionOpcode({ opcode: 0xa1, operands: [], owner: undefined })).toEqual({
      handled: true,
      commands: [],
      gap: '聚拢无属主',
    })
  })

  it('keeps ride speed and signed party layer nudges', () => {
    expect(translate(0x44, [1, 2, 1])).toEqual({
      handled: true,
      commands: [
        {
          kind: 'ride',
          entity: 'e5',
          to: { col: 4, row: 1, height: 0 },
          speed: 'fast',
        },
      ],
    })
    expect(translate(0x6e, [0xffff, 0xfffe, 6])).toEqual({
      handled: true,
      commands: [{ kind: 'nudgeParty', dx: -1, dy: -2, layer: 6 }],
    })
  })

  it('resolves 1-based and self entity nudges and preserves walk animation order', () => {
    expect(translate(0x7d, [2, 0xffff, 2])).toEqual({
      handled: true,
      commands: [{ kind: 'nudgeEntity', entity: 'e1', dx: -1, dy: 2 }],
    })
    expect(translate(0x6c, [0, 3, 4])).toEqual({
      handled: true,
      commands: [
        { kind: 'nudgeEntity', entity: 'e5', dx: 3, dy: 4 },
        { kind: 'animEntity', entity: 'e5' },
      ],
    })
  })

  it('marks chase as a same-instruction terminal and rejects unrelated opcodes', () => {
    expect(translate(0x4c, [0, 0, 1])).toEqual({
      handled: true,
      commands: [{ kind: 'chasePlayer', range: 8, speed: 4, floating: true }],
      terminal: 'end',
    })
    expect(translate(0x09)).toEqual({ handled: false })
  })
})
