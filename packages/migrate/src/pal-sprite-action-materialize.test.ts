import type { Command, SceneDef, SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type {
  NormalizedPalActionTimeline,
  PalSpriteActionCensusReport,
  PalSpriteAutoAnalysis,
} from './pal-sprite-action-census.js'
import { materializePalSpriteActions } from './pal-sprite-action-materialize.js'

const pos = { col: 0, row: 0, height: 0 }
const canonicalCycle = [
  { frame: 0, durationMs: 100 },
  { frame: 1, durationMs: 200 },
]
function timeline(args: {
  steps: NormalizedPalActionTimeline['steps']
  phaseMs: number
  loopFrom?: number
  canonical?: NormalizedPalActionTimeline['steps']
}): NormalizedPalActionTimeline {
  const loopFrom = args.loopFrom ?? 0
  const canonical = args.canonical ?? canonicalCycle
  return {
    steps: args.steps,
    loopFrom,
    durationMs: args.steps.reduce((sum, step) => sum + step.durationMs, 0),
    cycleDurationMs: canonical.reduce((sum, step) => sum + step.durationMs, 0),
    exactTimelineKey: JSON.stringify({ steps: args.steps, loopFrom }),
    steadyCycleKey: JSON.stringify(canonical),
    phaseMs: args.phaseMs,
    behavior: 'loop',
  }
}

function accepted(
  sceneId: string,
  entityId: string,
  value: NormalizedPalActionTimeline,
): PalSpriteAutoAnalysis {
  return {
    sceneId,
    entityId,
    spriteId: 'sprite-1',
    asset: 'sprite.pal.001',
    source: 'direct',
    ownAutoRootIds: [`scene:${sceneId}:${entityId}:page:0:auto:stage:0`],
    reasons: [],
    timeline: value,
    referencedScriptIds: [],
    scriptInvocations: [],
    internalWrites: [],
    externalWrites: [],
  }
}

function census(instances: PalSpriteAutoAnalysis[]): PalSpriteActionCensusReport {
  return {
    version: 2,
    timing: { commandPaceMs: 100, stageYieldMs: 40 },
    summary: {
      page0Auto: instances.length,
      directSprite: instances.length,
      actorSource: 0,
      noVisualSource: 0,
      provenBeforeIncomingWrites: instances.length,
      rejectedByExternalWrites: 0,
      acceptedInstances: instances.length,
      acceptedSpriteDefinitions: 1,
      exactActions: instances.length,
      steadyCycleFamilies: 1,
      finiteIntroInstances: 0,
    },
    reasonCounts: {},
    primaryReasonCounts: {},
    externalWriteCategoryCounts: {},
    digests: { acceptedSites: 'fixture', rejections: 'fixture', actions: 'fixture' },
    instances,
    actions: [],
  }
}

const autoBody: Command[] = [{ kind: 'setEntityFrame', entity: 'self', frame: 0 }]

function fixtureScenes(): SceneDef[] {
  return [
    {
      id: 's001',
      mapId: 'map-1',
      entry: { pos, facing: 'down' },
      entities: ['e1', 'e2'].map((id) => ({
        id,
        sprite: 'sprite-1',
        pos,
        pages: [
          {
            auto: { stages: [{ body: structuredClone(autoBody) }] },
            trigger: { on: 'interact', stages: [{ body: [{ kind: 'wait', ms: 1 }] }] },
          },
          { auto: { stages: [{ body: [{ kind: 'wait', ms: 2 }] }] } },
        ],
      })),
    },
  ]
}

const sprites: SpriteDef[] = [
  {
    id: 'sprite-1',
    asset: 'sprite.pal.001',
    label: 'fixture',
    layout: { kind: 'static' },
    poses: {
      authored: {
        label: '作者动作',
        order: 3,
        steps: [{ frame: 2, durationMs: 90 }],
      },
    },
  },
]

describe('PAL sprite action materialization', () => {
  test('旋转等价的实例共享一个动作，以 startAtMs 保留各自相位', () => {
    const scenes = fixtureScenes()
    const report = census([
      accepted('s001', 'e1', timeline({ steps: canonicalCycle, phaseMs: 0 })),
      accepted(
        's001',
        'e2',
        timeline({
          steps: [canonicalCycle[1]!, canonicalCycle[0]!],
          phaseMs: 100,
        }),
      ),
    ])

    const output = materializePalSpriteActions({ scenes, sprites, census: report })
    const generated = Object.entries(output.sprites[0]!.poses ?? {}).filter(
      ([id]) => id !== 'authored',
    )
    expect(generated).toHaveLength(1)
    expect(generated[0]?.[1]).toMatchObject({
      label: 'PAL 自动循环',
      order: 4,
      steps: canonicalCycle,
      loopFrom: 0,
    })
    const actionId = generated[0]![0]
    expect(output.scenes[0]!.entities[0]!.pages?.[0]).toMatchObject({
      animation: { sprite: 'sprite-1', action: actionId, loop: true },
      trigger: { on: 'interact' },
    })
    expect(output.scenes[0]!.entities[1]!.pages?.[0]).toMatchObject({
      animation: { sprite: 'sprite-1', action: actionId, loop: true, startAtMs: 100 },
    })
    expect(output.scenes[0]!.entities[0]!.pages?.[0]?.auto).toBeUndefined()
    expect(output.scenes[0]!.entities[0]!.pages?.[1]?.auto).toBeDefined()
    expect(output.report).toMatchObject({
      acceptedInstances: 2,
      changedScenes: 1,
      changedSpriteDefinitions: 1,
      materializedActions: 1,
      removedAutoBindings: 2,
    })

    expect(scenes[0]!.entities[0]!.pages?.[0]?.auto).toBeDefined()
    expect(sprites[0]!.poses).toEqual({
      authored: {
        label: '作者动作',
        order: 3,
        steps: [{ frame: 2, durationMs: 90 }],
      },
    })
  })

  test('有共同启动段时仍共享稳态动作，相位只在进入 loopFrom 后生效', () => {
    const intro = { frame: 3, durationMs: 50 }
    const output = materializePalSpriteActions({
      scenes: fixtureScenes(),
      sprites,
      census: census([
        accepted(
          's001',
          'e1',
          timeline({ steps: [intro, ...canonicalCycle], phaseMs: 0, loopFrom: 1 }),
        ),
        accepted(
          's001',
          'e2',
          timeline({
            steps: [intro, canonicalCycle[1]!, canonicalCycle[0]!],
            phaseMs: 100,
            loopFrom: 1,
          }),
        ),
      ]),
    })
    const generated = Object.values(output.sprites[0]!.poses ?? {}).find(
      (action) => action.label === 'PAL 自动循环',
    )
    expect(generated).toMatchObject({ steps: [intro, ...canonicalCycle], loopFrom: 1 })
  })

  test('同一精灵的真正不同动作不误合并，候选输入顺序不改变稳定 id 或报告摘要', () => {
    const otherCycle = [{ frame: 2, durationMs: 300 }]
    const first = accepted('s001', 'e1', timeline({ steps: canonicalCycle, phaseMs: 0 }))
    const second = accepted(
      's001',
      'e2',
      timeline({ steps: otherCycle, phaseMs: 0, canonical: otherCycle }),
    )
    const makeReport = (instances: PalSpriteAutoAnalysis[]): PalSpriteActionCensusReport => {
      const report = census(instances)
      report.summary.steadyCycleFamilies = 2
      return report
    }
    const forward = materializePalSpriteActions({
      scenes: fixtureScenes(),
      sprites,
      census: makeReport([first, second]),
    })
    const reversed = materializePalSpriteActions({
      scenes: fixtureScenes(),
      sprites,
      census: makeReport([second, first]),
    })

    expect(
      Object.keys(forward.sprites[0]!.poses ?? {}).filter((id) => id !== 'authored'),
    ).toHaveLength(2)
    expect(reversed).toEqual(forward)
  })

  test('已有页动作、计数漂移与非循环候选一律 fail-loud', () => {
    const value = timeline({ steps: canonicalCycle, phaseMs: 0 })
    const report = census([accepted('s001', 'e1', value)])
    const scene = fixtureScenes()[0]!
    scene.entities.splice(1)
    scene.entities[0]!.pages![0]!.animation = {
      sprite: 'sprite-1',
      action: 'authored',
      loop: true,
    }
    expect(() => materializePalSpriteActions({ scenes: [scene], sprites, census: report })).toThrow(
      '已有 animation',
    )

    expect(() =>
      materializePalSpriteActions({
        scenes: fixtureScenes(),
        sprites,
        census: {
          ...census([accepted('s001', 'e1', value), accepted('s001', 'e2', value)]),
          summary: {
            ...census([]).summary,
            acceptedInstances: 1,
            steadyCycleFamilies: 1,
          },
        },
      }),
    ).toThrow('accepted 计数漂移')

    const finite = accepted('s001', 'e1', { ...value, behavior: 'finite-intro' })
    expect(() =>
      materializePalSpriteActions({
        scenes: [fixtureScenes()[0]!],
        sprites,
        census: census([finite]),
      }),
    ).toThrow('非 steady loop')
  })
})
