import { describe, expect, test } from 'vitest'
import {
  body,
  eventObject,
  migrate,
  raw,
  sourceScene,
} from './__tests__/scene-migration-fixtures.js'
import { createSceneR13TranslationSession } from './migrate-content.js'
import { translateStages } from './translate-events.js'

describe('current scene migration sessions', () => {
  test('session finish owns locale report registry bodies and new sprite deltas', () => {
    const dialog = { op: 'showDialog', messageIndex: 7, text: '独立会话', label: 'L_10' }
    const out = migrate(
      [sourceScene({ eventObjects: [eventObject()] })],
      new Map([[500, [dialog, { op: 'end' }, raw(9, [2], 'L_20'), { op: 'end' }]]]),
    )
    const before = structuredClone(out)
    const first = createSceneR13TranslationSession(out)
    const other = createSceneR13TranslationSession(out)
    expect(translateStages('L_10', undefined, first.ctx)?.[0]?.body[0]?.kind).toBe('dialog')
    first.ctx.registry!.registerRoot('scene/s500/session/test', [{ kind: 'wait', ms: 120 }])
    expect(first.ctx.spriteIdForNum!(42)).toBe('sprite-42')
    expect(first.ctx.spriteIdForNum!(193)).toBe('sprite-193')
    const snapshot = first.finish()
    expect(Object.values(snapshot.locale)).toContain('独立会话')
    expect(snapshot.report.chains).toBeGreaterThan(0)
    expect(snapshot.spriteDefinitions.map((s) => s.id)).toEqual(['sprite-193'])
    expect(snapshot.scriptRegistryBodies['scene/s500/session/test']).toEqual([
      { kind: 'wait', ms: 120 },
    ])
    const expected = structuredClone(snapshot)
    snapshot.locale.changed = '外部污染'
    snapshot.report.chains = -1
    snapshot.spriteDefinitions[0]!.asset = 'sprite.bad'
    snapshot.scriptRegistryBodies['scene/s500/session/test']!.push({ kind: 'wait', ms: 999 })
    expect(first.finish()).toEqual(expected)
    expect(other.finish()).toMatchObject({
      locale: {},
      spriteDefinitions: [],
      scriptRegistryBodies: {},
    })
    expect(out).toEqual(before)
  })
  test('behavior roots are sorted complete and detached across sessions', () => {
    const out = migrate([
      sourceScene({
        sceneId: 502,
        eventObjects: [eventObject({ id: 9, triggerLabel: 'L_40', autoLabel: 'L_50' })],
      }),
      sourceScene({
        eventObjects: [
          eventObject({ id: 2, triggerLabel: 'bad' }),
          eventObject({ id: 1, autoLabel: 'L_20', triggerLabel: 'L_10' }),
        ],
      }),
    ])
    const first = createSceneR13TranslationSession(out)
    const expected = [
      { sceneId: 's500', entityId: 'e1', channel: 'auto', behaviorId: 'default', rootAddress: 20 },
      {
        sceneId: 's500',
        entityId: 'e1',
        channel: 'trigger',
        behaviorId: 'default',
        rootAddress: 10,
      },
      { sceneId: 's502', entityId: 'e9', channel: 'auto', behaviorId: 'default', rootAddress: 50 },
      {
        sceneId: 's502',
        entityId: 'e9',
        channel: 'trigger',
        behaviorId: 'default',
        rootAddress: 40,
      },
    ]
    expect(first.staticEntityBehaviorRoots).toEqual(expected)
    first.staticEntityBehaviorRoots[0]!.rootAddress = 999
    expect(createSceneR13TranslationSession(out).staticEntityBehaviorRoots).toEqual(expected)
    expect(() => createSceneR13TranslationSession(structuredClone(out))).toThrow(/原始结果/)
  })
  test('global aliases are sorted stable roots whose real bodies remain callable', () => {
    const options = {
      globalScriptAliases: [
        { id: 'shared/b', entry: 20 },
        { id: 'shared/a', entry: 10, owner: 'e1' },
      ],
    }
    const events = new Map([
      [500, [raw(9, [2], 'L_10'), { op: 'end' }, raw(9, [3], 'L_20'), { op: 'end' }]],
    ])
    const out = migrate([sourceScene()], events, options)
    const aliases = out.scriptRegistryAudit.filter((a) => a.kind === 'legacy-alias')
    expect(aliases.map((a) => a.id)).toEqual(['shared/a', 'shared/b'])
    expect(aliases.map((a) => body(out, out.scriptChunks[a.chunk]!.scripts[a.id]!))).toEqual([
      [{ kind: 'wait', ms: 80 }],
      [{ kind: 'wait', ms: 120 }],
    ])
    expect(
      migrate([sourceScene()], events, {
        globalScriptAliases: [...options.globalScriptAliases].reverse(),
      }),
    ).toEqual(out)
  })
  test.each([
    0,
    -1,
    1.5,
    Number.NaN,
  ])('invalid alias entry %s is rejected without mutating its source', (entry) => {
    const options = { globalScriptAliases: [{ id: 'global/bad', entry }] }
    const before = structuredClone(options)
    expect(() => migrate([sourceScene()], new Map(), options)).toThrow(
      /全局脚本别名 global\/bad 的入口无效/,
    )
    expect(options).toEqual(before)
  })
  test('dynamic scene hooks resolve both slots into shared bindings with installer provenance', () => {
    const events = new Map([
      [
        500,
        [
          raw(0x6d, [502, 200, 220], 'L_10'),
          raw(0x6d, [502, 200, 0]),
          { op: 'end' },
          raw(9, [2], 'L_200'),
          { op: 'end' },
          raw(9, [3], 'L_220'),
          { op: 'end' },
        ],
      ],
    ])
    const out = migrate(
      [sourceScene({ onEnterLabel: 'L_10' }), sourceScene({ sceneId: 501 })],
      events,
    )
    const commands = body(out, out.scenes[0]!.onEnter![0]!.body)
    expect(commands.map((c) => c.kind)).toEqual([
      'setSceneOnEnter',
      'setSceneOnTeleport',
      'setSceneOnEnter',
    ])
    const hooks = commands.filter(
      (c) => c.kind === 'setSceneOnEnter' || c.kind === 'setSceneOnTeleport',
    )
    expect(hooks.map((c) => body(out, c.stages![0]!.body))).toEqual([
      [{ kind: 'wait', ms: 80 }],
      [{ kind: 'wait', ms: 120 }],
      [{ kind: 'wait', ms: 80 }],
    ])
    expect(hooks[0]!.stages).toEqual(hooks[2]!.stages)
    expect(JSON.stringify(out.scriptChunks)).not.toMatch(/_addr|_sourceAddress|_owner|_path/)
    const audit = out.scriptRegistryAudit.filter((a) => a.origin?.kind === 'scene-hook-override')
    expect(audit).toHaveLength(2)
    expect(audit.map((a) => a.origin!.sceneHook)).toEqual([
      expect.objectContaining({
        targetScene: 's501',
        slot: 'on-enter',
        targetAddress: 200,
        installerSourceAddress: 10,
      }),
      expect.objectContaining({
        targetScene: 's501',
        slot: 'on-teleport',
        targetAddress: 220,
        installerSourceAddress: 10,
      }),
    ])
  })
  test.each([
    'scene',
    'script',
  ] as const)('unresolved dynamic %s is recorded as a gap instead of inventing a hook', (missing) => {
    const out = migrate(
      [
        sourceScene({ onEnterLabel: 'L_10' }),
        ...(missing === 'script' ? [sourceScene({ sceneId: 501 })] : []),
      ],
      new Map([[500, [raw(0x6d, [502, 200, 0], 'L_10'), { op: 'end' }]]]),
    )
    expect(
      out.scriptReport.gaps.some((g) =>
        g.reason.includes(
          missing === 'scene' ? '目标场景不存在 s501' : '目标脚本不可译 s501:L_200',
        ),
      ),
    ).toBe(true)
    expect(JSON.stringify(out.scriptChunks)).not.toContain('_addr')
    expect(out.scriptRegistryAudit.filter((a) => a.origin?.kind === 'scene-hook-override')).toEqual(
      [],
    )
  })
})
