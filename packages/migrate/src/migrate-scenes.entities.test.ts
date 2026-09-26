import { pixelToGrid } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  body,
  eventObject,
  migrate,
  raw,
  sourceScene,
} from './__tests__/scene-migration-fixtures.js'
import type { SourceCmd } from './source-facts.js'

describe('current scene migration entities', () => {
  test('zones retain real scripts and static anchors are kept last with state collision and layer', () => {
    const objects = [
      eventObject({ id: 0, spriteNum: 0, sState: 0, sLayer: -2 }),
      eventObject({ id: 1, spriteNum: 0, triggerMode: 1, triggerLabel: 'L_10', sState: 2 }),
      eventObject({ id: 2, sState: 0, sLayer: 3, direction: 2, nSpriteFramesAuto: 1 }),
      eventObject({ id: 3, spriteNum: 0, autoLabel: 'L_20' }),
    ]
    const out = migrate(
      [sourceScene({ eventObjects: objects })],
      new Map([[500, [raw(9, [2], 'L_10'), { op: 'end' }, raw(9, [3], 'L_20'), { op: 'end' }]]]),
    )
    const entities = out.scenes[0]!.entities
    expect(entities.map((e) => e.id)).toEqual(['e1', 'e2', 'e3', 'e0'])
    expect(entities[3]).toEqual({
      id: 'e0',
      zone: true,
      pos: { ...pixelToGrid(32, 16), height: 0 },
      hidden: true,
      zBias: -2,
      pages: undefined,
    })
    expect(entities[0]).toMatchObject({ zone: true, collide: true })
    expect(entities[0]).not.toHaveProperty('facing')
    expect(entities[1]).toMatchObject({ sprite: 'sprite-42', hidden: true, zBias: 3, facing: 'up' })
    expect(body(out, entities[0]!.pages![0]!.trigger!.stages[0]!.body)).toEqual([
      { kind: 'wait', ms: 80 },
    ])
    expect(body(out, entities[2]!.pages![0]!.auto!.stages[0]!.body)).toEqual([
      { kind: 'wait', ms: 120 },
    ])
    expect(out.report).toMatchObject({
      entities: 1,
      hidden: 1,
      zonesMigrated: 2,
      stateAnchorsMigrated: 1,
      triggerZonesSkipped: 0,
      autoLoopCandidates: 1,
    })
  })
  test.each([
    undefined,
    0,
    -1,
    1,
    3,
    4,
    8,
    9,
  ])('trigger mode %s maps only the supported range', (mode) => {
    const out = migrate(
      [sourceScene({ eventObjects: [eventObject({ triggerMode: mode, triggerLabel: 'L_10' })] })],
      new Map([[500, [raw(9, [1], 'L_10'), { op: 'end' }]]]),
    )
    const trigger = out.scenes[0]!.entities[0]!.pages?.[0]?.trigger
    if (mode === undefined || mode <= 0 || mode > 8) expect(trigger).toBeUndefined()
    else {
      expect(trigger).toMatchObject({
        on: mode <= 3 ? 'interact' : 'touch',
        range: mode <= 3 ? mode : mode - 4,
      })
      expect(body(out, trigger!.stages[0]!.body)).toEqual([{ kind: 'wait', ms: 40 }])
    }
  })
  test('empty script retains its real empty stage while missing labels do not invent ports', () => {
    const out = migrate(
      [
        sourceScene({
          eventObjects: [
            eventObject({ triggerMode: 1, triggerLabel: 'L_10', autoLabel: 'L_404' }),
            eventObject({ id: 2, triggerMode: 1 }),
          ],
        }),
      ],
      new Map([[500, [{ label: 'L_10', op: 'end' }]]]),
    )
    const [empty, missing] = out.scenes[0]!.entities
    expect(body(out, empty!.pages![0]!.trigger!.stages[0]!.body)).toEqual([])
    expect(empty!.pages![0]!.auto).toBeUndefined()
    expect(missing!.pages).toBeUndefined()
    expect(out.scriptReport.gaps.some((g) => g.reason.includes('L_404'))).toBe(true)
  })
  test('shared auto head skips waits and animation, ignores sentinel direction and allows explicit south', () => {
    const out = migrate(
      [
        sourceScene({
          eventObjects: [
            eventObject({ autoLabel: 'L_10', direction: 2 }),
            eventObject({ id: 2, autoLabel: 'L_20', direction: 3 }),
          ],
        }),
      ],
      new Map([
        [
          -1,
          [
            raw(9, [1], 'L_10'),
            raw(0x87),
            raw(0x0f, [0xffff, 0]),
            raw(0x0f, [1, 0]),
            { op: 'end' },
            raw(0x14, [0], 'L_20'),
            { op: 'end' },
          ],
        ],
      ]),
    )
    expect(out.scenes[0]!.entities.map((e) => e.facing)).toEqual(['left', undefined])
    expect(out.report.facingFromAuto).toBe(2)
  })
  test.each([
    'other',
    'nonraw',
    'limit',
  ] as const)('auto facing does not speculate beyond %s', (stop) => {
    const prefix: SourceCmd[] =
      stop === 'limit'
        ? Array.from({ length: 16 }, () => raw(9, [1]))
        : [stop === 'nonraw' ? { op: 'end' } : raw(0x49, [0, 1])]
    prefix[0]!.label = 'L_10'
    const out = migrate(
      [sourceScene({ eventObjects: [eventObject({ direction: 3, autoLabel: 'L_10' })] })],
      new Map([[500, [...prefix, raw(0x0f, [2, 0]), { op: 'end' }]]]),
    )
    expect(out.scenes[0]!.entities[0]!.facing).toBe('right')
    expect(out.report.facingFromAuto).toBe(0)
  })
  test('only the exact empty s294 map-zero stub is omitted', () => {
    const out = migrate([sourceScene({ sceneId: 294, mapNum: 0 }), sourceScene()])
    expect(out.scenes.map((s) => s.id)).toEqual(['s500'])
    for (const bad of [
      sourceScene({ mapNum: 0 }),
      sourceScene({ sceneId: 294, mapNum: 0, onEnterLabel: 'L_1' }),
      sourceScene({ sceneId: 294, mapNum: 0, onTeleportLabel: 'L_1' }),
      sourceScene({ sceneId: 294, mapNum: 0, eventObjects: [eventObject()] }),
    ]) {
      const before = structuredClone(bad)
      expect(() => migrate([bad])).toThrow(/不是精确 s294 空 stub/)
      expect(bad).toEqual(before)
    }
  })
})
