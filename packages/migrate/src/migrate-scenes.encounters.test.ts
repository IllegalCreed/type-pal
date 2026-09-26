import { describe, expect, test } from 'vitest'
import {
  body,
  eventObject,
  migrate,
  raw,
  sourceScene,
} from './__tests__/scene-migration-fixtures.js'
import type { SourceCmd } from './source-facts.js'

function encounter(trigger: SourceCmd[], auto: SourceCmd[] = [], tail: SourceCmd[] = []) {
  trigger[0]!.label = 'L_10'
  if (auto[0]) auto[0].label = 'L_100'
  return migrate(
    [
      sourceScene({
        eventObjects: [
          eventObject({
            triggerMode: 4,
            triggerLabel: 'L_10',
            ...(auto.length ? { autoLabel: 'L_100' } : {}),
          }),
        ],
      }),
    ],
    new Map([[500, [...trigger, { op: 'end' }, ...auto, { op: 'end' }, ...tail]]]),
  )
}
describe('current scene migration encounters', () => {
  test('standard encounter folds stable team chase and respawn while retaining original root evidence', () => {
    const out = encounter([raw(7, [9]), raw(0x52, [120])], [raw(0x4c, [6, 3, 1])])
    expect(out.scenes[0]!.entities[0]!.hostile).toEqual({
      enemyTeamId: 'team-9',
      chase: { range: 6, speed: 3, floating: true },
      respawnSeconds: 12,
    })
    expect(out.scenes[0]!.entities[0]!.pages).toBeUndefined()
    expect(out.report.hostilesFolded).toBe(1)
    expect(out.foldedHostileRoots).toHaveLength(1)
    expect(out.foldedHostileRoots[0]).toMatchObject({ sceneId: 's500', entityId: 'e1' })
    expect(out.foldedHostileRoots[0]!.roots.map((r) => r.body)).toEqual([
      [
        { kind: 'startBattle', enemyTeamId: 'team-9', boss: true },
        { kind: 'vanishEntity', seconds: 12 },
      ],
      [{ kind: 'chasePlayer', range: 6, speed: 3, floating: true }],
    ])
  })
  test('stationary encounter does not invent chase or respawn and default chase keeps exact defaults', () => {
    expect(encounter([raw(7, [2])]).scenes[0]!.entities[0]!.hostile).toEqual({
      enemyTeamId: 'team-2',
    })
    expect(encounter([raw(7, [2])], [raw(0x4c)]).scenes[0]!.entities[0]!.hostile).toEqual({
      enemyTeamId: 'team-2',
      chase: { range: 8, speed: 4 },
    })
  })
  test.each([
    'prefix',
    'suffix',
    'auto',
  ] as const)('non-template %s keeps executable pages instead of discarding story commands', (extra) => {
    const trigger = [raw(7, [2])]
    if (extra === 'prefix') trigger.unshift(raw(9, [1]))
    if (extra === 'suffix') trigger.push(raw(9, [1]))
    const out = encounter(trigger, extra === 'auto' ? [raw(9, [2])] : [])
    const entity = out.scenes[0]!.entities[0]!
    expect(entity.hostile).toBeUndefined()
    expect(out.report.hostilesFolded).toBe(0)
    expect(out.foldedHostileRoots).toEqual([])
    const actual = body(out, entity.pages![0]!.trigger!.stages[0]!.body)
    expect(actual.filter((c) => c.kind === 'startBattle')).toEqual([
      { kind: 'startBattle', enemyTeamId: 'team-2', boss: true },
    ])
    expect(
      extra === 'auto'
        ? body(out, entity.pages![0]!.auto!.stages[0]!.body)
        : actual.filter((c) => c.kind === 'wait'),
    ).toEqual([{ kind: 'wait', ms: extra === 'auto' ? 80 : 40 }])
  })
  test('defeat game-over collapses to the default but a story loss remains executable', () => {
    const over = encounter(
      [raw(7, [2, 200])],
      [],
      [raw(0x4f, [], 'L_200'), raw(0x4e), { op: 'end' }],
    )
    expect(over.scenes[0]!.entities[0]!.hostile).toEqual({ enemyTeamId: 'team-2' })
    const story = encounter([raw(7, [2, 200])], [], [raw(9, [3], 'L_200'), { op: 'end' }])
    const hostile = story.scenes[0]!.entities[0]!.hostile!
    expect(Array.isArray(hostile.onLose)).toBe(true)
    if (Array.isArray(hostile.onLose))
      expect(body(story, hostile.onLose)).toEqual([{ kind: 'wait', ms: 120 }])
  })
  test('referenced standard tail is unfolded only for template recognition', () => {
    const jump: SourceCmd & { to: string } = { op: 'goto', to: 'L_200' }
    const out = encounter([raw(7, [3]), jump], [], [raw(0x52, [90], 'L_200'), { op: 'end' }])
    expect(out.scenes[0]!.entities[0]!.hostile).toEqual({
      enemyTeamId: 'team-3',
      respawnSeconds: 9,
    })
    expect(out.foldedHostileRoots[0]!.roots[0]!.body.some((c) => c.kind === 'jumpScript')).toBe(
      true,
    )
  })
})
