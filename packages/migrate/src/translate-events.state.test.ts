import { describe, expect, test } from 'vitest'
import { body, raw, translation } from './__tests__/translation-fixtures.js'

describe('current translation state boundaries', () => {
  test('party resource pools, resurrection and equipment slots retain distinct fields', () => {
    expect(
      body([
        raw(0x1b, [1, 65534]),
        raw(0x1d, [1, 7]),
        raw(0x22, [1, 5]),
        raw(0x23, [2, 0]),
        raw(0x23, [2, 3]),
        raw(0x55, [42, 2]),
      ]),
    ).toEqual([
      { kind: 'increaseHpMp', delta: -2, pools: 'hp' },
      { kind: 'increaseHpMp', delta: 7 },
      { kind: 'revivePartyAll', tenths: 5 },
      { kind: 'unequip', role: 2, slot: 'all' },
      { kind: 'unequip', role: 2, slot: 2 },
      { kind: 'learnSkill', role: 1, skill: '42' },
    ])
  })

  test('party selection preserves source order and filters empty and unregistered roles', () => {
    expect(body([raw(0x75, [4, 1, 5]), raw(0x75, [0, 7, 2]), raw(0x75, [])])).toEqual([
      { kind: 'setParty', members: ['wu-hou', 'li-xiaoyao', 'anu'] },
      { kind: 'setParty', members: ['zhao-linger'] },
      { kind: 'setParty', members: [] },
    ])
  })

  test('map override calls resolver and distinguishes current scene from named scene', () => {
    const seen: number[] = []
    expect(
      body([raw(0x99, [65535, 9]), raw(0x99, [2, 8])], 'e3', {
        mapIdForNum: (num) => {
          seen.push(num)
          return num === 9 ? 'river' : 'mountain'
        },
      }),
    ).toEqual([
      { kind: 'setSceneMapOverride', mapId: 'river' },
      { kind: 'setSceneMapOverride', scene: 's001', mapId: 'mountain' },
    ])
    expect(seen).toEqual([9, 8])
    expect(body([raw(0x99, [2, 8])])).toEqual([
      { kind: 'setSceneMapOverride', scene: 's001', mapId: 'map-008' },
    ])
  })

  test('entity layer and conditional sync sign-extend without terminating fallthrough', () => {
    expect(
      body([raw(0x7e, [0, 65535]), raw(0x49, [2, 65534]), raw(0x6f, [2, 65535]), raw(0x09, [2])]),
    ).toEqual([
      { kind: 'setEntityLayer', entity: 'e3', layer: -1 },
      { kind: 'setEntityState', entity: 'e1', state: -2 },
      {
        kind: 'branch',
        cond: { kind: 'entityState', entity: 'e1', is: -1 },
        then: [{ kind: 'setEntityState', entity: 'e3', state: -1 }],
      },
      { kind: 'wait', ms: 80 },
    ])
  })

  test.each([0x7e, 0x6f] as const)('ownerless state opcode %i records a gap', (opcode) => {
    const f = translation([raw(opcode)])
    expect(f.run(undefined)).toEqual([{ body: [] }])
    expect(f.ctx.report.gaps).toHaveLength(1)
    expect(f.ctx.report.gaps[0]).toMatchObject({ opcode, owner: 'scene', reachable: true })
  })

  test('facing and frame sentinels independently preserve or clear authored fields', () => {
    expect(
      body([
        raw(0x0f, [65535, 7]),
        raw(0x0f, [3, 65535]),
        raw(0x0f, [65535, 65535]),
        raw(0x14, [5]),
        raw(0x16, [2, 1, 8]),
        raw(0x16, [0, 1, 8]),
      ]),
    ).toEqual([
      { kind: 'setEntityFrame', entity: 'e3', frame: 7 },
      { kind: 'setEntityFacing', entity: 'e3', facing: 'right' },
      { kind: 'setEntityFacing', entity: 'e3', facing: 'down' },
      { kind: 'setEntityFrame', entity: 'e3', frame: 5 },
      { kind: 'setEntityFacing', entity: 'e1', facing: 'left' },
      { kind: 'setEntityFrame', entity: 'e1', frame: 8 },
    ])
  })

  test('trigger mode ranges include touch zero and clear without a bogus trigger', () => {
    expect(body([1, 3, 4, 8, 9].map((mode) => raw(0x40, [2, mode])))).toEqual([
      { kind: 'setEntityTriggerMode', entity: 'e1', on: 'interact', range: 1 },
      { kind: 'setEntityTriggerMode', entity: 'e1', on: 'interact', range: 3 },
      { kind: 'setEntityTriggerMode', entity: 'e1', on: 'touch', range: 0 },
      { kind: 'setEntityTriggerMode', entity: 'e1', on: 'touch', range: 4 },
      { kind: 'setEntityTriggerMode', entity: 'e1' },
    ])
  })

  test('wait, wave, shake, ambience and fade retain independent timing units', () => {
    expect(
      body([
        raw(0x09, [0]),
        raw(0x85, [3]),
        raw(0x35, [5, 0]),
        raw(0x71, [4, 65535]),
        raw(0x53),
        raw(0x54),
        raw(0x80, [0]),
        raw(0x80, [1]),
        raw(0x8c, [0, 0, 0]),
        raw(0x8c, [0, 2, 1]),
        raw(0x93, [65532]),
        raw(0x93, [0]),
      ]),
    ).toEqual([
      { kind: 'wait', ms: 40 },
      { kind: 'wait', ms: 240 },
      { kind: 'shakeScreen', frames: 5, level: 4 },
      { kind: 'setScreenWave', level: 4, progression: -1 },
      { kind: 'setAmbience', ambience: 'day' },
      { kind: 'setAmbience', ambience: 'night' },
      { kind: 'toggleDayNight', ms: 3200 },
      { kind: 'toggleDayNight', ms: 800 },
      { kind: 'fade', dir: 'out', ms: 640 },
      { kind: 'fade', dir: 'in', ms: 1280 },
      { kind: 'fade', dir: 'out', ms: 1600 },
      { kind: 'fade', dir: 'in', ms: 6400 },
    ])
  })

  test('music fallback uses track operand one and treats zero as explicit stop', () => {
    expect(
      body([
        raw(0xa3, [99, 3]),
        raw(0xa3, [99, 0]),
        raw(0x77),
        raw(0x8f),
        raw(0x26, [2]),
        raw(0x27, [3]),
        raw(0x4e),
        raw(0x4f),
      ]),
    ).toEqual([
      { kind: 'playMusic', asset: 'music.pal.003' },
      { kind: 'stopMusic' },
      { kind: 'stopMusic' },
      { kind: 'halveMoney' },
      { kind: 'openShop', shop: 2, mode: 'buy' },
      { kind: 'openShop', shop: 3, mode: 'sell' },
      { kind: 'loadLastSave' },
      { kind: 'fade', dir: 'out', ms: 900, color: 'red' },
    ])
  })
})
