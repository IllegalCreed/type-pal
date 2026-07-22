import type {
  Command,
  EntityDef,
  SceneDef,
  ScriptChunkV1,
  ScriptIndexV1,
  SpriteDef,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  auditPalSpriteActions,
  type NamedCommandRoot,
  type PalSpriteActionCensusReport,
} from './pal-sprite-action-census.js'

const pos = { col: 0, row: 0, height: 0 }

function sceneWith(args: {
  auto: readonly Command[]
  autoStages?: NonNullable<NonNullable<EntityDef['pages']>[number]['auto']>['stages']
  trigger?: readonly Command[]
  onEnterPrepare?: readonly Command[]
  sprite?: string
  extraEntities?: EntityDef[]
}): SceneDef {
  return {
    id: 's001',
    mapId: 'map-001',
    entry: { pos, facing: 'down' },
    ...(args.onEnterPrepare
      ? {
          onEnter: [
            {
              body: [],
              entry: { prepare: [...args.onEnterPrepare], reveal: { kind: 'cut' as const } },
            },
          ],
        }
      : {}),
    entities: [
      {
        id: 'e1',
        pos,
        ...(args.sprite === undefined ? { zone: true as const } : { sprite: args.sprite }),
        pages: [
          {
            ...(args.trigger
              ? {
                  trigger: {
                    on: 'interact' as const,
                    stages: [{ body: [...args.trigger] }],
                  },
                }
              : {}),
            auto: {
              stages: args.autoStages
                ? structuredClone(args.autoStages)
                : [{ body: [...args.auto] }],
            },
          },
        ],
      },
      ...(args.extraEntities ?? []),
    ],
  }
}

function run(args: {
  auto: readonly Command[]
  trigger?: readonly Command[]
  autoStages?: NonNullable<NonNullable<EntityDef['pages']>[number]['auto']>['stages']
  onEnterPrepare?: readonly Command[]
  scripts?: Record<string, Command[]>
  extraRoots?: NamedCommandRoot[]
  extraEntities?: EntityDef[]
  frameCount?: number
  sprite?: SpriteDef
}): PalSpriteActionCensusReport {
  const scripts = args.scripts ?? {}
  const chunkId = 'scene/s001'
  const chunks: Record<string, ScriptChunkV1> = Object.keys(scripts).length
    ? { [chunkId]: { version: 1, id: chunkId, scripts } }
    : {}
  const index: ScriptIndexV1 = {
    version: 1,
    shards: { shared: 16, global: {} },
    chunks: Object.keys(scripts).length
      ? { [chunkId]: { path: 'chunks/scene/s001.json', bytes: 1 } }
      : {},
  }
  const sprite: SpriteDef =
    args.sprite ??
    ({
      id: 'sprite-1',
      asset: 'sprite.pal.001',
      label: 'fixture',
      layout: { kind: 'static' },
    } as const)
  return auditPalSpriteActions({
    scenes: [
      sceneWith({
        auto: args.auto,
        autoStages: args.autoStages,
        trigger: args.trigger,
        onEnterPrepare: args.onEnterPrepare,
        sprite: sprite.id,
        extraEntities: args.extraEntities,
      }),
    ],
    sprites: [sprite],
    scriptIndex: index,
    scriptChunks: chunks,
    frameCountByAsset: new Map([[sprite.asset, args.frameCount ?? 4]]),
    extraRoots: args.extraRoots,
  })
}

const ref = (id: string, kind: 'callScript' | 'jumpScript' = 'callScript'): Command => ({
  kind,
  // 故意给 stale chunk；census 必须按稳定 id 解析。
  ref: { chunk: 'stale/chunk', id },
})

describe('PAL sprite action census', () => {
  test('真实节拍保留 frame 中途 cue，不能合并相邻同帧 step', () => {
    const report = run({
      auto: [
        { kind: 'setEntityFrame', entity: 'e1', frame: 2 },
        { kind: 'playSound', asset: 'sound.pal.001' },
        { kind: 'wait', ms: 80 },
      ],
    })
    expect(report.summary.acceptedInstances).toBe(1)
    expect(report.actions[0]?.timeline).toMatchObject({
      loopFrom: 0,
      durationMs: 420,
      cycleDurationMs: 420,
      steps: [
        { frame: 2, durationMs: 100 },
        {
          frame: 2,
          durationMs: 320,
          cues: [{ kind: 'sound', asset: 'sound.pal.001' }],
        },
      ],
    })
  })

  test('call 内 jump 是尾转移，目标结束后回 caller，jump 后命令不可达', () => {
    const report = run({
      auto: [ref('A'), { kind: 'setEntityFrame', entity: 'e1', frame: 3 }],
      scripts: {
        A: [
          { kind: 'setEntityFrame', entity: 'e1', frame: 1 },
          ref('B', 'jumpScript'),
          { kind: 'setEntityFrame', entity: 'e1', frame: 99 },
        ],
        B: [{ kind: 'setEntityFrame', entity: 'e1', frame: 2 }],
      },
    })
    expect(report.instances[0]?.reasons).toEqual([])
    expect(report.actions[0]?.timeline.steps.map((step) => step.frame)).toEqual([1, 2, 3])
  })

  test('call 环拒绝，self jump 的有时长帧环允许', () => {
    const recursive = run({
      auto: [ref('A')],
      scripts: { A: [ref('B')], B: [ref('A')] },
    })
    expect(recursive.instances[0]?.reasons).toContain('call-cycle')

    const jumping = run({
      auto: [ref('L')],
      scripts: {
        L: [
          { kind: 'setEntityFrame', entity: 'e1', frame: 1 },
          { kind: 'setEntityFrame', entity: 'e1', frame: 2 },
          ref('L', 'jumpScript'),
        ],
      },
    })
    expect(jumping.instances[0]?.reasons).toEqual([])
    expect(jumping.actions[0]?.timeline.cycleDurationMs).toBe(200)
  })

  test('branch 两臂全部审计，随机、移动、状态分别留拒绝原因', () => {
    const report = run({
      auto: [
        {
          kind: 'branch',
          cond: { kind: 'chance', percent: 50 },
          then: [{ kind: 'moveEntity', entity: 'e1', to: pos, speed: 'normal' }],
          else: [{ kind: 'setEntityState', entity: 'e1', state: 0 }],
        },
      ],
    })
    expect(report.instances[0]?.reasons).toEqual(
      expect.arrayContaining(['random-branch', 'movement', 'state-or-visibility']),
    )
  })

  test('越界、显式/隐式混用、跨实体写均 fail closed', () => {
    const report = run({
      frameCount: 2,
      auto: [
        { kind: 'setEntityFrame', entity: 'e1', frame: 2 },
        { kind: 'animEntity', entity: 'e1' },
        { kind: 'setEntityFrame', entity: 'e2', frame: 0 },
      ],
    })
    expect(report.instances[0]?.reasons).toEqual(
      expect.arrayContaining(['invalid-frame', 'mixed-frame-mode', 'cross-entity']),
    )
  })

  test('incoming write 按执行根 provenance 判定，共享 body 的 trigger 不可冒充 own auto', () => {
    const shared = [
      { kind: 'setEntityFrame', entity: 'e1', frame: 1 } as const,
      { kind: 'setEntityFrame', entity: 'e1', frame: 2 } as const,
      ref('shared', 'jumpScript'),
    ]
    const report = run({
      auto: [ref('shared')],
      trigger: [ref('shared')],
      scripts: { shared },
    })
    expect(report.summary.provenBeforeIncomingWrites).toBe(1)
    expect(report.summary.acceptedInstances).toBe(0)
    expect(report.instances[0]?.reasons).toContain('external-write')
    expect(
      report.instances[0]?.externalWrites.some((site) => site.rootId.includes(':trigger:')),
    ).toBe(true)
  })

  test('incoming walker 用 (scriptId,self) 去重，同一脚本的第二个 self 不得被吞掉', () => {
    const report = run({
      auto: [
        { kind: 'setEntityFrame', entity: 'e1', frame: 1 },
        { kind: 'setEntityFrame', entity: 'e1', frame: 2 },
      ],
      scripts: { L: [{ kind: 'vanishEntity' }] },
      extraRoots: [
        {
          id: 'global:self-fixture',
          body: [
            { kind: 'callScript', ref: { chunk: 'stale', id: 'L' }, self: 'e2' },
            { kind: 'callScript', ref: { chunk: 'stale', id: 'L' }, self: 'e1' },
          ],
          kind: 'extra',
        },
      ],
    })
    expect(report.summary.acceptedInstances).toBe(0)
    expect(report.instances[0]?.externalWrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: 'e1', category: 'state', rootId: 'global:self-fixture' }),
      ]),
    )
  })

  test.each([
    ['setEntityAuto', 'script'],
    ['setEntityAuto', 'stages'],
    ['setEntityTrigger', 'script'],
    ['setEntityTrigger', 'stages'],
  ] as const)('%s 的 %s binding 是未来执行根，并保留安装 provenance', (kind, form) => {
    const body: Command[] = [{ kind: 'setEntityFrame', entity: 'e1', frame: 3 }]
    const binding =
      form === 'script'
        ? { script: { chunk: 'stale', id: 'binding-body' } }
        : { stages: [{ body }] }
    const report = run({
      auto: [
        { kind: 'setEntityFrame', entity: 'e1', frame: 1 },
        { kind: 'setEntityFrame', entity: 'e1', frame: 2 },
      ],
      scripts: form === 'script' ? { 'binding-body': body } : undefined,
      extraEntities: [{ id: 'e2', pos, sprite: 'sprite-1' }],
      extraRoots: [
        {
          id: `global:${kind}:${form}`,
          body: [{ kind, entity: 'e2', ...binding } as Command],
          kind: 'extra',
        },
      ],
    })
    const write = report.instances[0]?.externalWrites.find((site) => site.category === 'frame')
    expect(write).toMatchObject({ target: 'e1', rootKind: 'dynamic' })
    expect(write?.activatedBy).toEqual([
      expect.objectContaining({
        installerRootId: `global:${kind}:${form}`,
        kind,
        self: 'e2',
      }),
    ])
  })

  test.each([
    'setSceneOnEnter',
    'setSceneOnTeleport',
  ] as const)('%s binding 以无 self 的场景根执行', (kind) => {
    const report = run({
      auto: [
        { kind: 'setEntityFrame', entity: 'e1', frame: 1 },
        { kind: 'setEntityFrame', entity: 'e1', frame: 2 },
      ],
      scripts: { 'scene-binding': [{ kind: 'setEntityFrame', entity: 'e1', frame: 3 }] },
      extraRoots: [
        {
          id: `global:${kind}`,
          body: [
            {
              kind,
              scene: 's001',
              script: { chunk: 'stale', id: 'scene-binding' },
            },
          ],
          kind: 'extra',
        },
      ],
    })
    const write = report.instances[0]?.externalWrites.find((site) => site.category === 'frame')
    expect(write?.activatedBy[0]).toMatchObject({ kind, scriptId: 'scene-binding' })
    expect(write?.activatedBy[0]).not.toHaveProperty('self')
  })

  test('无显式内容根的 orphan script 不得伪装成 runtime 入口', () => {
    const report = run({
      auto: [
        { kind: 'setEntityFrame', entity: 'e1', frame: 1 },
        { kind: 'setEntityFrame', entity: 'e1', frame: 2 },
      ],
      scripts: { orphan: [{ kind: 'setEntityFrame', entity: 'e1', frame: 3 }] },
    })
    expect(report.summary.acceptedInstances).toBe(1)
    expect(report.instances[0]?.externalWrites).toEqual([])
    expect(JSON.stringify(report)).not.toContain('extra:orphan-script')
  })

  test('finite-intro 与真正无可见动作分开拒绝，并保留 timeline 证据', () => {
    const intro = run({
      auto: [],
      autoStages: [
        {
          body: [{ kind: 'setEntityFrame', entity: 'e1', frame: 1 }],
          next: 'advance',
        },
        { body: [{ kind: 'setEntityFrame', entity: 'e1', frame: 2 }] },
      ],
    })
    expect(intro.instances[0]?.reasons).toContain('finite-intro')
    expect(intro.instances[0]?.reasons).not.toContain('no-visible-action')
    expect(intro.instances[0]?.timeline).toMatchObject({ behavior: 'finite-intro', loopFrom: 1 })
    expect(intro.summary.finiteIntroInstances).toBe(1)

    const still = run({
      auto: [{ kind: 'setEntityFrame', entity: 'e1', frame: 0 }],
    })
    expect(still.instances[0]?.reasons).toContain('no-visible-action')
    expect(still.instances[0]?.timeline?.behavior).toBe('loop')
  })

  test('scene onEnter 的 entry.prepare 也是显式执行根', () => {
    const report = run({
      auto: [
        { kind: 'setEntityFrame', entity: 'e1', frame: 1 },
        { kind: 'setEntityFrame', entity: 'e1', frame: 2 },
      ],
      onEnterPrepare: [{ kind: 'setEntityFrame', entity: 'e1', frame: 3 }],
    })
    expect(report.instances[0]?.externalWrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rootId: 'scene:s001:on-enter:stage:0:entry:prepare',
          target: 'e1',
        }),
      ]),
    )
  })

  test('无外观 zone 全量计数且不会进入动作候选', () => {
    const report = run({ auto: [{ kind: 'wait', ms: 100 }] })
    // run helper 默认会给 sprite；单独构造 zone 以验证顶层口径。
    const index: ScriptIndexV1 = {
      version: 1,
      shards: { shared: 16, global: {} },
      chunks: {},
    }
    const zoneReport = auditPalSpriteActions({
      scenes: [sceneWith({ auto: [{ kind: 'wait', ms: 100 }] })],
      sprites: [],
      scriptIndex: index,
      scriptChunks: {},
      frameCountByAsset: new Map(),
    })
    expect(report.summary.directSprite).toBe(1)
    expect(zoneReport.summary).toMatchObject({ page0Auto: 1, directSprite: 0, noVisualSource: 1 })
    expect(zoneReport.instances[0]?.primaryReason).toBe('no-visual-source')
  })

  test('稳态循环旋转归一为同一家族，并保留实例 phaseMs', () => {
    const scripts: Record<string, Command[]> = {}
    const entities: EntityDef[] = []
    ;[
      [1, 2, 3],
      [2, 3, 1],
      [3, 1, 2],
    ].forEach((frames, index) => {
      const id = `L${index}`
      scripts[id] = [
        ...frames.map((frame) => ({
          kind: 'setEntityFrame' as const,
          entity: `e${index + 1}`,
          frame,
        })),
        { kind: 'jumpScript', ref: { chunk: 'stale', id } },
      ]
      entities.push({
        id: `e${index + 1}`,
        pos,
        sprite: 'sprite-1',
        pages: [
          { auto: { stages: [{ body: [{ kind: 'callScript', ref: { chunk: 'stale', id } }] }] } },
        ],
      })
    })
    const index: ScriptIndexV1 = {
      version: 1,
      shards: { shared: 16, global: {} },
      chunks: { c: { path: 'chunks/c.json', bytes: 1 } },
    }
    const scene: SceneDef = {
      id: 's001',
      mapId: 'map-001',
      entry: { pos, facing: 'down' },
      entities,
    }
    const sprite: SpriteDef = {
      id: 'sprite-1',
      asset: 'sprite.pal.001',
      label: 'fixture',
      layout: { kind: 'static' },
    }
    const report = auditPalSpriteActions({
      scenes: [scene],
      sprites: [sprite],
      scriptIndex: index,
      scriptChunks: { c: { version: 1, id: 'c', scripts } },
      frameCountByAsset: new Map([[sprite.asset, 4]]),
    })
    expect(report.summary).toMatchObject({ exactActions: 3, steadyCycleFamilies: 1 })
    expect(
      report.instances
        .map((instance) => instance.timeline?.phaseMs)
        .sort((a, b) => (a ?? 0) - (b ?? 0)),
    ).toEqual([0, 100, 200])
  })
})
