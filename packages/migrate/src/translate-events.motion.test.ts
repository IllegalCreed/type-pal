import { describe, expect, test } from 'vitest'
import { body, raw, translation } from './__tests__/translation-fixtures.js'
import { assertNoMigrationGaps } from './translate-events.js'

describe('current translation motion boundaries', () => {
  test('absolute and party-relative positions preserve selector identity and signed fractional offsets', () => {
    expect(
      body([raw(0x13, [0, 48, 40]), raw(0x13, [2, 32, 16]), raw(0x12, [0xffff, 65532, 65534])]),
    ).toEqual([
      { kind: 'setEntityPos', entity: 'e3', pos: { col: 4, row: 1, height: 0 } },
      { kind: 'setEntityPos', entity: 'e1', pos: { col: 2, row: 0, height: 0 } },
      { kind: 'setEntityPosRelParty', entity: 'e3', dcol: -0.25, drow: 0 },
    ])
  })

  test('single steps retain all four directions in order', () => {
    expect(body([raw(0x0b), raw(0x0c), raw(0x0d), raw(0x0e)])).toEqual([
      { kind: 'stepEntity', entity: 'e3', dir: 'down' },
      { kind: 'stepEntity', entity: 'e3', dir: 'left' },
      { kind: 'stepEntity', entity: 'e3', dir: 'up' },
      { kind: 'stepEntity', entity: 'e3', dir: 'right' },
    ])
  })

  test('entity speed variants and half-tile position remain independent', () => {
    expect(body([0x10, 0x11, 0x7c, 0x82].map((op) => raw(op, [1, 2, 1])))).toEqual(
      ['normal', 'slow', 'fast', 'run'].map((speed) => ({
        kind: 'moveEntity',
        entity: 'e3',
        to: { col: 4, row: 1, height: 0 },
        speed,
      })),
    )
  })

  test('party and ride outputs use the same coordinates but retain distinct ownership', () => {
    expect(body([0x70, 0x7a, 0x7b, 0x3f, 0x44, 0x97].map((op) => raw(op, [1, 2, 1])))).toEqual([
      ...['slow', 'fast', 'run'].map((speed) => ({
        kind: 'moveParty',
        to: { col: 4, row: 1, height: 0 },
        speed,
      })),
      ...['slow', 'fast', 'run'].map((speed) => ({
        kind: 'ride',
        entity: 'e3',
        to: { col: 4, row: 1, height: 0 },
        speed,
      })),
    ])
  })

  test('nudge then animate preserves order and sign without grid rounding', () => {
    expect(body([raw(0x7d, [2, 65532, 2]), raw(0x6c, [0xffff, 4, 65534]), raw(0x87)])).toEqual([
      { kind: 'nudgeEntity', entity: 'e1', dx: -4, dy: 2 },
      { kind: 'nudgeEntity', entity: 'e3', dx: 4, dy: -2 },
      { kind: 'animEntity', entity: 'e3' },
      { kind: 'animEntity', entity: 'e3' },
    ])
  })

  test.each([
    [0x13, '0x13 无属主'],
    [0x12, '0x12 无属主'],
    [0x0b, '单步无属主'],
    [0x10, 'walkTo 无属主'],
    [0x3f, '骑乘无属主'],
    [0x7d, 'moveObject 无属主'],
    [0x6c, 'walkOneStep 无属主'],
    [0x87, 'animate 无属主'],
  ] as const)('ownerless opcode %i fails closed without dropping later valid work', (opcode, reason) => {
    const fixture = translation([raw(opcode), raw(0x09, [2])])
    expect(fixture.run(undefined)).toEqual([{ body: [{ kind: 'wait', ms: 80 }] }])
    expect(
      fixture.ctx.report.gaps.map((g) => ({
        opcode: g.opcode,
        reason: g.reason,
        owner: g.owner,
        sourceAddress: g.sourceAddress,
      })),
    ).toEqual([{ opcode, reason, owner: 'scene', sourceAddress: 100 }])
    expect(() => assertNoMigrationGaps(fixture.ctx.report)).toThrow(reason)
  })

  test('camera reset, absolute snap and signed pan are not interchangeable', () => {
    expect(
      body([
        raw(0x7f),
        raw(0x7f, [1, 2, 65535]),
        raw(0x7f, [65532, 2, 0]),
        raw(0x7f, [4, 65534, 6]),
      ]),
    ).toEqual([
      { kind: 'cameraSnap' },
      { kind: 'cameraSnap', to: { col: 3, row: 1, height: 0 } },
      { kind: 'cameraPan', dx: -4, dy: 2, frames: 1 },
      { kind: 'cameraPan', dx: 4, dy: -2, frames: 6 },
    ])
  })

  test('chase declaration terminates the source loop skeleton but keeps its prefix', () => {
    expect(body([raw(0x09, [2]), raw(0x4c, [0, 0, 0]), raw(0x1e, [3])])).toEqual([
      { kind: 'wait', ms: 80 },
      { kind: 'chasePlayer', range: 8, speed: 4 },
    ])
    expect(body([raw(0x4c, [6, 2, 1]), raw(0x1e, [3])])).toEqual([
      { kind: 'chasePlayer', range: 6, speed: 2, floating: true },
    ])
  })
})
