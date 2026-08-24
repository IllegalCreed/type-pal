import type { Command, SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  mapScenesStatic,
  type SourceCmd,
  type SourceEventObject,
  type SourceScene,
} from './migrate-content.js'

const scene = (
  sceneId: number,
  eventObjects: SourceEventObject[],
  overrides: Partial<SourceScene> = {},
): SourceScene => ({ sceneId, mapNum: sceneId + 1, eventObjects, ...overrides })

const entity = (
  id: number,
  spriteNum: number,
  nSpriteFrames: number,
  overrides: Partial<SourceEventObject> = {},
): SourceEventObject => ({
  id,
  x: 0,
  y: 0,
  spriteNum,
  nSpriteFrames,
  ...overrides,
})

const actorSpriteCommands = (
  value: unknown,
): Array<Extract<Command, { kind: 'setActorSprite' }>> => {
  const found: Array<Extract<Command, { kind: 'setActorSprite' }>> = []
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (record.kind === 'setActorSprite') found.push(record as unknown as (typeof found)[number])
    for (const child of Object.values(record)) visit(child)
  }
  visit(value)
  return found
}

const changeSpriteScript = (target: number): SourceCmd[] => [
  { op: 'raw', opcode: 0x65, operands: [0, target, 0xffff], label: 'L_1' },
  { op: 'end' },
]

const liXiaoyaoSprite: SpriteDef = {
  id: 'li-xiaoyao',
  asset: 'sprite.pal.002',
  label: '李逍遥(大世界)',
  layout: { kind: 'directional', framesPerDir: 3 },
}

describe('大世界精灵布局注册表', () => {
  test('严格等价的角色语义定义同时服务场景实体与数字脚本且不重复登记', () => {
    const migrated = mapScenesStatic(
      [scene(0, [entity(1, 2, 3, { triggerMode: 1, triggerLabel: 'L_1' })])],
      new Map([[0, changeSpriteScript(2)]]),
      new Map([[2, liXiaoyaoSprite]]),
      [],
      undefined,
      { sceneSemanticSpriteIds: new Set(['li-xiaoyao']) },
    )

    expect(migrated.scenes[0]?.entities[0]).toEqual(
      expect.objectContaining({ sprite: 'li-xiaoyao' }),
    )
    expect(actorSpriteCommands(migrated.scriptChunks)).toEqual([
      { kind: 'setActorSprite', actor: 'li-xiaoyao', sprite: 'li-xiaoyao' },
    ])
    expect(migrated.sprites.filter(({ asset }) => asset === 'sprite.pal.002')).toEqual([])
  })

  test('角色候选资源不同不归一，场景保持独立定义', () => {
    const migrated = mapScenesStatic(
      [scene(0, [entity(1, 2, 3)])],
      new Map([[0, []]]),
      new Map([[2, { ...liXiaoyaoSprite, asset: 'sprite.pal.003' }]]),
      [],
      undefined,
      { sceneSemanticSpriteIds: new Set(['li-xiaoyao']) },
    )

    expect(migrated.scenes[0]?.entities[0]).toEqual(expect.objectContaining({ sprite: 'sprite-2' }))
    expect(migrated.sprites).toContainEqual({
      id: 'sprite-2',
      asset: 'sprite.pal.002',
      label: '原精灵 2',
      layout: { kind: 'directional', framesPerDir: 3 },
    })
  })

  test('角色候选布局不同不归一，场景建立显式布局变体', () => {
    const migrated = mapScenesStatic(
      [scene(0, [entity(1, 2, 0)])],
      new Map([[0, []]]),
      new Map([[2, liXiaoyaoSprite]]),
      [],
      undefined,
      { sceneSemanticSpriteIds: new Set(['li-xiaoyao']) },
    )

    expect(migrated.scenes[0]?.entities[0]).toEqual(
      expect.objectContaining({ sprite: 'sprite-2-f0' }),
    )
    expect(migrated.sprites).toContainEqual({
      id: 'sprite-2-f0',
      asset: 'sprite.pal.002',
      label: '原精灵 2',
      layout: { kind: 'static' },
    })
    expect(migrated.sprites.some(({ id }) => id === 'li-xiaoyao')).toBe(false)
  })

  test('脚本先消费、静态场景后声明时仍共用一个稳定 static 定义', () => {
    const sources = [
      scene(0, [entity(1, 100, 0, { triggerMode: 1, triggerLabel: 'L_1' })]),
      scene(3, [entity(2, 541, 0)]),
    ]
    const migrated = mapScenesStatic(
      sources,
      new Map([
        [0, changeSpriteScript(541)],
        [3, []],
      ]),
    )

    const definitions = migrated.sprites.filter(({ asset }) => asset === 'sprite.pal.541')
    expect(definitions).toEqual([
      {
        id: 'sprite-541',
        asset: 'sprite.pal.541',
        label: '原精灵 541(0x65 换装)',
        layout: { kind: 'static' },
      },
    ])
    expect(actorSpriteCommands(migrated.scriptChunks)).toEqual([
      { kind: 'setActorSprite', actor: 'li-xiaoyao', sprite: 'sprite-541' },
    ])
  })

  test('场景数组顺序不会改变稳定 id、布局或定义顺序', () => {
    const early = scene(2, [
      entity(10, 100, 0, { triggerMode: 1, triggerLabel: 'L_1' }),
      entity(11, 445, 0),
    ])
    const late = scene(9, [entity(12, 541, 0), entity(13, 445, 1)])
    const events = new Map<number, SourceCmd[]>([
      [2, changeSpriteScript(541)],
      [9, []],
    ])
    const reversedEvents = new Map([...events].reverse())

    const forward = mapScenesStatic([early, late], events)
    const reversed = mapScenesStatic([late, early], reversedEvents)

    expect(reversed.sprites).toEqual(forward.sprites)
    expect(reversed.report.layoutConflicts).toEqual(forward.report.layoutConflicts)
    expect(reversed.scriptChunks).toEqual(forward.scriptChunks)
  })

  test('有场景 nSpriteFrames=3 证据的换装保持 directional/3', () => {
    const migrated = mapScenesStatic(
      [
        scene(0, [entity(1, 100, 0, { triggerMode: 1, triggerLabel: 'L_1' })]),
        scene(3, [entity(2, 245, 3)]),
      ],
      new Map([
        [0, changeSpriteScript(245)],
        [3, []],
      ]),
    )

    expect(migrated.sprites.filter(({ asset }) => asset === 'sprite.pal.245')).toEqual([
      {
        id: 'sprite-245',
        asset: 'sprite.pal.245',
        label: '原精灵 245(0x65 换装)',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
    ])
  })

  test('没有场景证据或显式 overlay 的脚本目标 fail-loud', () => {
    expect(() =>
      mapScenesStatic(
        [scene(0, [entity(1, 100, 0, { triggerMode: 1, triggerLabel: 'L_1' })])],
        new Map([[0, changeSpriteScript(900)]]),
      ),
    ).toThrow(/sprite 900.*布局证据/)
  })

  test('0x65-only 特殊帧带只按逐项 PAL overlay 登记为 static', () => {
    const migrated = mapScenesStatic(
      [scene(0, [entity(1, 100, 0, { triggerMode: 1, triggerLabel: 'L_1' })])],
      new Map([[0, changeSpriteScript(627)]]),
    )
    expect(migrated.sprites.filter(({ asset }) => asset === 'sprite.pal.627')).toEqual([
      {
        id: 'sprite-627',
        asset: 'sprite.pal.627',
        label: '原精灵 627(0x65 换装)',
        layout: { kind: 'static' },
      },
    ])
    expect(migrated.report.layoutEvidence).toContainEqual(
      expect.objectContaining({
        spriteNum: 627,
        definitionId: 'sprite-627',
        source: 'pal-overlay',
      }),
    )
  })

  test('534 使用脚本证据支持的 directional/4，不沿用旧 directional/3', () => {
    const migrated = mapScenesStatic(
      [scene(0, [entity(1, 100, 0, { triggerMode: 1, triggerLabel: 'L_1' })])],
      new Map([[0, changeSpriteScript(534)]]),
    )
    expect(migrated.sprites.find(({ id }) => id === 'sprite-534')?.layout).toEqual({
      kind: 'directional',
      framesPerDir: 4,
    })
  })

  test('511 的唯一 scene static 证据同时服务场景实体与数字脚本引用', () => {
    const migrated = mapScenesStatic(
      [
        scene(2, [entity(1, 100, 0, { triggerMode: 1, triggerLabel: 'L_1' })]),
        scene(5, [entity(2, 511, 0)]),
      ],
      new Map([
        [2, changeSpriteScript(511)],
        [5, []],
      ]),
    )
    expect(migrated.sprites.filter(({ asset }) => asset === 'sprite.pal.511')).toEqual([
      {
        id: 'sprite-511',
        asset: 'sprite.pal.511',
        label: '原精灵 511',
        layout: { kind: 'static' },
      },
    ])
    expect(actorSpriteCommands(migrated.scriptChunks)[0]?.sprite).toBe('sprite-511')
  })

  test('同一资源有两种 scene 布局时稳定拆定义，数字脚本引用必须显式消歧', () => {
    const staticScene = scene(3, [entity(20, 700, 0)])
    const directionalScene = scene(8, [entity(21, 700, 3)])
    const withoutScript = mapScenesStatic(
      [directionalScene, staticScene],
      new Map([
        [8, []],
        [3, []],
      ]),
    )
    expect(withoutScript.sprites.filter(({ asset }) => asset === 'sprite.pal.700')).toEqual([
      {
        id: 'sprite-700',
        asset: 'sprite.pal.700',
        label: '原精灵 700',
        layout: { kind: 'static' },
      },
      {
        id: 'sprite-700-f3',
        asset: 'sprite.pal.700',
        label: '原精灵 700',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
    ])

    expect(() =>
      mapScenesStatic(
        [
          scene(1, [entity(1, 100, 0, { triggerMode: 1, triggerLabel: 'L_1' })]),
          staticScene,
          directionalScene,
        ],
        new Map([
          [1, changeSpriteScript(700)],
          [3, []],
          [8, []],
        ]),
      ),
    ).toThrow(/sprite 700 有 2 种场景布局.*需要逐项 PAL overlay/)
  })

  test('193 的 PAL overlay 固定 directional base，场景 static 保持 -f0 真变体', () => {
    const migrated = mapScenesStatic(
      [
        scene(2, [entity(1, 100, 0, { triggerMode: 1, triggerLabel: 'L_1' })]),
        scene(5, [entity(2, 193, 0)]),
      ],
      new Map([
        [2, changeSpriteScript(193)],
        [5, []],
      ]),
    )
    expect(migrated.sprites.filter(({ asset }) => asset === 'sprite.pal.193')).toEqual([
      {
        id: 'sprite-193',
        asset: 'sprite.pal.193',
        label: '原精灵 193(0x65 换装)',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
      {
        id: 'sprite-193-f0',
        asset: 'sprite.pal.193',
        label: '原精灵 193',
        layout: { kind: 'static' },
      },
    ])
  })
})
