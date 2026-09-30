/** TEST-GLM-WAVE-O-1 O05：大世界精灵注册/语义别名/物品方案 label 推导的残余合同。
 *  旧证：world-sprite-layout-registry.test.ts、pal-world-sprite-semantic-alias.test.ts、
 *  pal-item-scheme-labels.test.ts 覆盖常规布局与别名闭包；本卡按 gap-map 直击未覆盖臂：
 *  场景布局变体、别名清单校验、改写失败轴、canonical label 后缀与 hook 选择边。
 */
import { describe, expect, test } from 'vitest'
import type { AuthorSceneDef, SpriteDef } from '@type-pal/content'
import { createPalWorldSpriteRegistry, migratedSpriteId } from './pal-world-sprite-registry.js'
import { applyPalWorldSpriteSemanticAliases } from './pal-world-sprite-semantic-alias.js'
import { assertPalItemSchemeLabelInvariant } from './pal-item-scheme-labels.js'
import type { SourceEventObject, SourceScene } from './pal-source-types.js'
import type { AuthorItemData } from '@type-pal/content'

const roleSprite = (num: number, id: string): SpriteDef => ({
  id,
  asset: `sprite.pal.${String(num).padStart(3, '0')}`,
  label: id,
  layout: { kind: 'directional', framesPerDir: 3 },
})

describe('O05 createPalWorldSpriteRegistry：布局证据与变体', () => {
  const sceneWith = (spriteNum: number, nSpriteFrames: number, entityId = 1): SourceScene => ({
    sceneId: 1,
    mapNum: 1,
    eventObjects: [{ id: entityId, x: 0, y: 0, spriteNum, nSpriteFrames } as SourceEventObject],
  })

  test('spriteRef 未注册（无场景证据直接取）→ fail-loud', () => {
    const registry = createPalWorldSpriteRegistry([], new Map())
    expect(() => registry.spriteRef({ id: 5, x: 0, y: 0, spriteNum: 9 })).toThrow(
      'sprite 9 缺场景布局注册: nSpriteFrames=0',
    )
  })

  test('同一精灵两种 nSpriteFrames → stable base + -f<frames> 变体并报 layoutConflicts', () => {
    const scenes: SourceScene[] = [
      { sceneId: 1, mapNum: 1, eventObjects: [{ id: 1, x: 0, y: 0, spriteNum: 9, nSpriteFrames: 0 }] },
      { sceneId: 2, mapNum: 1, eventObjects: [{ id: 2, x: 0, y: 0, spriteNum: 9, nSpriteFrames: 3 }] },
    ]
    const registry = createPalWorldSpriteRegistry(scenes, new Map())
    // spriteDefs 懒生成：必须经 spriteRef 消费后才登记。
    const staticRef = registry.spriteRef({ id: 1, x: 0, y: 0, spriteNum: 9, nSpriteFrames: 0 })
    const variantRef = registry.spriteRef({ id: 2, x: 0, y: 0, spriteNum: 9, nSpriteFrames: 3 })
    expect(staticRef).toBe(migratedSpriteId(9))
    expect(variantRef).toBe(migratedSpriteId(9, 3))
    expect([...registry.spriteDefs.keys()].sort()).toEqual([migratedSpriteId(9), migratedSpriteId(9, 3)].sort())
    expect(registry.report.layoutConflicts).toContain(migratedSpriteId(9, 3))
  })

  test('角色精灵别名：asset 匹配且在语义集内 → externalDefinition（不重复生成）', () => {
    const li = roleSprite(2, 'li-xiaoyao')
    const scenes = [
      { sceneId: 20, mapNum: 1, eventObjects: [{ id: 344, x: 0, y: 0, spriteNum: 2, nSpriteFrames: 3 }] },
    ]
    const registry = createPalWorldSpriteRegistry(scenes, new Map([[2, li]]), {
      sceneSemanticSpriteIds: new Set(['li-xiaoyao']),
    })
    const ref = registry.spriteRef({ id: 344, x: 0, y: 0, spriteNum: 2, nSpriteFrames: 3 })
    expect(ref).toBe('li-xiaoyao')
    expect(registry.spriteDefs.has('li-xiaoyao')).toBe(false)
    expect(registry.report.layoutConflicts).toEqual([])
  })

  test('角色精灵 asset 不匹配（旧号漂移）→ 不作别名，按场景证据注册', () => {
    const wrong = { ...roleSprite(2, 'li-xiaoyao'), asset: 'sprite.pal.999' }
    const scenes = [
      { sceneId: 20, mapNum: 1, eventObjects: [{ id: 344, x: 0, y: 0, spriteNum: 2, nSpriteFrames: 3 }] },
    ]
    const registry = createPalWorldSpriteRegistry(scenes, new Map([[2, wrong]]), {
      sceneSemanticSpriteIds: new Set(['li-xiaoyao']),
    })
    const ref = registry.spriteRef({ id: 344, x: 0, y: 0, spriteNum: 2, nSpriteFrames: 3 })
    expect(ref).toBe(migratedSpriteId(2))
  })
})

describe('O05 applyPalWorldSpriteSemanticAliases：清单校验与改写失败轴', () => {
  const semantic = roleSprite(2, 'li-xiaoyao')
  const legacy: SpriteDef = { ...semantic, id: 'sprite-2', label: '原精灵 2' }
  const aliases = [
    {
      semanticId: 'li-xiaoyao',
      references: [{ sceneId: 's001', entityId: 'e1' }],
      evidence: 'e',
    },
  ]
  const scenes = (sprite: string): AuthorSceneDef[] => [
    {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [{ id: 'e1', pos: { col: 0, row: 0, height: 0 }, sprite }],
    } as AuthorSceneDef,
  ]

  test('别名清单重复 semanticId → fail-loud', () => {
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        currentSprites: [semantic],
        generatedSprites: [semantic],
        currentScenes: new Map(),
        generatedScenes: new Map(),
        roleSpritesByNumber: new Map([[2, semantic]]),
        aliases: [aliases[0]!, aliases[0]!],
      }),
    ).toThrow('PAL 场景角色语义别名清单含重复 semanticId')
  })

  test('别名不属于角色精灵域 / 缺逐引用证据 逐轴拒绝', () => {
    const args = {
      currentSprites: [semantic],
      generatedSprites: [semantic],
      currentScenes: new Map(),
      generatedScenes: new Map(),
      roleSpritesByNumber: new Map([[2, semantic]]),
    }
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        ...args,
        aliases: [{ ...aliases[0]!, semanticId: 'ghost' }],
      }),
    ).toThrow('ghost: 语义别名不属于完整角色精灵域')
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        ...args,
        aliases: [{ ...aliases[0]!, references: [] }],
      }),
    ).toThrow('li-xiaoyao: 语义别名缺逐引用证据')
  })

  test('current/generated 缺语义 SpriteDef → fail-loud', () => {
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        currentSprites: [],
        generatedSprites: [semantic],
        currentScenes: new Map(),
        generatedScenes: new Map(),
        roleSpritesByNumber: new Map([[2, semantic]]),
        aliases,
      }),
    ).toThrow('li-xiaoyao: current/generated 缺完整角色域语义 SpriteDef')
  })

  test('纯迁移核仍生成 legacy 重复定义 → fail-loud', () => {
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        currentSprites: [semantic],
        generatedSprites: [semantic, legacy],
        currentScenes: new Map(),
        generatedScenes: new Map(),
        roleSpritesByNumber: new Map([[2, semantic]]),
        aliases,
      }),
    ).toThrow('li-xiaoyao: 纯迁移核仍生成重复定义 sprite-2')
  })

  test('生成场景引用集合与别名清单漂移 → fail-loud', () => {
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        currentSprites: [semantic],
        generatedSprites: [semantic],
        currentScenes: new Map(),
        generatedScenes: new Map([['s001', { id: 's001', entities: [{ id: 'e1', sprite: 'li-xiaoyao' }] }]]),
        roleSpritesByNumber: new Map([[2, semantic]]),
        aliases: [
          {
            semanticId: 'li-xiaoyao',
            references: [
              { sceneId: 's001', entityId: 'e1' },
              { sceneId: 's001', entityId: 'e2' },
            ],
            evidence: 'e',
          },
        ],
      }),
    ).toThrow(/纯迁移核场景引用集合漂移/)
  })

  test('清单外场景引用 legacy id → fail-loud', () => {
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        currentSprites: [semantic, legacy],
        generatedSprites: [semantic],
        currentScenes: new Map([['s002', scenes('sprite-2')[0]!]]),
        generatedScenes: new Map([
          ['s001', { id: 's001', entities: [{ id: 'e1', sprite: 'li-xiaoyao' }, { id: 'e2', sprite: 'li-xiaoyao' }] }],
        ]),
        roleSpritesByNumber: new Map([[2, semantic]]),
        aliases: [
          {
            semanticId: 'li-xiaoyao',
            references: [
              { sceneId: 's001', entityId: 'e1' },
              { sceneId: 's001', entityId: 'e2' },
            ],
            evidence: 'e',
          },
        ],
      }),
    ).toThrow(/发现清单外场景引用 s002\/e1/)
  })

  test('改写轴：current 缺场景 / 实体非 SpriteDef / sprite 意外 / 缺实体 逐轴拒绝', () => {
    const base = {
      currentSprites: [semantic],
      generatedSprites: [semantic],
      generatedScenes: new Map([['s001', { id: 's001', entities: [{ id: 'e1', sprite: 'li-xiaoyao' }] }]]),
      roleSpritesByNumber: new Map([[2, semantic]]),
      aliases,
    }
    expect(() =>
      applyPalWorldSpriteSemanticAliases({ ...base, currentScenes: new Map() }),
    ).toThrow('li-xiaoyao: current 缺场景 s001')
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        ...base,
        currentScenes: new Map([
          ['s001', { ...scenes('sprite-2')[0]!, entities: [{ id: 'e1', zone: true }] } as AuthorSceneDef],
        ]),
      }),
    ).toThrow('s001/e1: 不是 SpriteDef 场景实体')
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        ...base,
        currentScenes: new Map([['s001', scenes('sprite-999')[0]!]]),
      }),
    ).toThrow(/期望 sprite-2 或 li-xiaoyao，实际 sprite-999/)
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        ...base,
        currentScenes: new Map([['s001', { ...scenes('sprite-2')[0]!, entities: [] }]]),
      }),
    ).toThrow('li-xiaoyao: current 场景 s001 缺实体 e1')
  })

  test('合法改写：legacy 等价定义退休、引用改写计数与 roleClosure 记录', () => {
    const result = applyPalWorldSpriteSemanticAliases({
      currentSprites: [semantic, legacy],
      generatedSprites: [semantic],
      currentScenes: new Map([['s001', scenes('sprite-2')[0]!]]),
      generatedScenes: new Map([['s001', { id: 's001', entities: [{ id: 'e1', sprite: 'li-xiaoyao' }] }]]),
      roleSpritesByNumber: new Map([[2, semantic]]),
      aliases,
    })
    expect(result.sprites.map(({ id }) => id)).toEqual(['li-xiaoyao'])
    expect(result.report[0]).toMatchObject({ references: 1, definitionRetired: true })
    expect(result.roleClosure[0]).toMatchObject({
      semanticId: 'li-xiaoyao',
      legacyId: 'sprite-2',
      configured: true,
      currentLegacy: 'equivalent',
      generatedLegacy: 'absent',
    })
  })

  test('非 object 实体（原始值）在引用扫描时 fail-loud', () => {
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        currentSprites: [semantic],
        generatedSprites: [semantic],
        currentScenes: new Map(),
        generatedScenes: new Map([['s001', { id: 's001', entities: ['raw'] }]]),
        roleSpritesByNumber: new Map([[2, semantic]]),
        aliases,
      }),
    ).toThrow('s001: 场景实体必须是 object')
  })
})

describe('O05 assertPalItemSchemeLabelInvariant：canonical label 与选择边', () => {
  const behavior = (label: string, flow?: object) => ({ label, order: 0, flow: flow ?? {
    kind: 'stages',
    initial: 'main',
    stages: [{ id: 'main', body: [] }],
  } })
  const sceneWithBehavior = (label: string, flow?: object): AuthorSceneDef =>
    ({
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'e1',
          pos: { col: 0, row: 0, height: 0 },
          sprite: 'li-xiaoyao',
          behaviors: { trigger: { b1: behavior(label, flow) } },
        },
      ],
    }) as AuthorSceneDef
  const itemSelecting = (id: string, name: string): AuthorItemData =>
    ({
      id,
      name,
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: true,
        effects: [
          {
            kind: 'itemPrivateScript',
            script: {
              id: 'use',
              body: [
                {
                  kind: 'selectEntityBehavior',
                  target: { scene: 's001', entity: 'e1' },
                  channel: 'trigger',
                  selection: { kind: 'use', value: 'b1' },
                },
              ],
            },
          },
        ],
      },
    }) as unknown as AuthorItemData

  test('item 私有脚本可达 + canonical label → 报告确定性 label 与 path', () => {
    const report = assertPalItemSchemeLabelInvariant({
      items: [itemSelecting('268', '炼蛊皿')],
      scenes: [sceneWithBehavior('炼蛊皿剧情方案')],
      expectedSchemes: 1,
      expectedMachineInners: 0,
    })
    expect(report.labels).toEqual([
      { id: 'b1', itemId: '268', path: 'scenes.s001.entities.e1.behaviors.trigger.b1', label: '炼蛊皿剧情方案' },
    ])
  })

  test('canonical 但不可达（无 item 选择边）→ 零 item root 拒绝', () => {
    const plainItem = {
      id: '268',
      name: '炼蛊皿',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
    } as unknown as AuthorItemData
    expect(() =>
      assertPalItemSchemeLabelInvariant({
        items: [plainItem],
        scenes: [sceneWithBehavior('炼蛊皿剧情方案')],
        expectedSchemes: 0,
        expectedMachineInners: 0,
      }),
    ).toThrow('PAL 物品剧情方案零 item root: scenes.s001.entities.e1.behaviors.trigger.b1')
  })

  test('非 canonical 后缀「0」不满足顶层 label 规则（可达后按名称漂移拒绝）', () => {
    expect(() =>
      assertPalItemSchemeLabelInvariant({
        items: [itemSelecting('268', '炼蛊皿')],
        scenes: [sceneWithBehavior('炼蛊皿剧情方案 0')],
        expectedSchemes: 1,
        expectedMachineInners: 0,
      }),
    ).toThrow(/名称漂移.*炼蛊皿剧情方案 0/)
  })

  test('机器 flow：label 同步为「方案名连续流程」→ machine-inner 计数与报告', () => {
    const report = assertPalItemSchemeLabelInvariant({
      items: [itemSelecting('268', '炼蛊皿')],
      scenes: [
        sceneWithBehavior('炼蛊皿剧情方案', {
          kind: 'stateMachine',
          machine: {
            id: 'm',
            label: '炼蛊皿剧情方案连续流程',
            initial: 'a',
            states: { a: { label: 'a', body: [], next: { kind: 'stay' } } },
          },
        }),
      ],
      expectedSchemes: 1,
      expectedMachineInners: 1,
    })
    expect(report.machineInners).toBe(1)
    expect(report.labels[0]).toMatchObject({
      label: '炼蛊皿剧情方案',
      machineLabel: '炼蛊皿剧情方案连续流程',
    })
  })

  test('opaque 摘要名节点可达但仍存活 → 永久门禁拒绝', () => {
    expect(() =>
      assertPalItemSchemeLabelInvariant({
        items: [itemSelecting('268', '炼蛊皿')],
        scenes: [sceneWithBehavior('物品剧情行为 0123456789ab')],
        expectedSchemes: 1,
        expectedMachineInners: 0,
      }),
    ).toThrow('PAL 物品剧情方案仍含 1 个 opaque label')
  })

  test('同一地址重复注册（同场景重复出现）→ 节点重复拒绝', () => {
    const scene = sceneWithBehavior('炼蛊皿剧情方案')
    expect(() =>
      assertPalItemSchemeLabelInvariant({
        items: [],
        scenes: [scene, scene],
        expectedSchemes: 0,
        expectedMachineInners: 0,
      }),
    ).toThrow('PAL 物品剧情方案节点重复: scenes.s001.entities.e1.behaviors.trigger.b1')
  })

  test('selectSceneHooks 的 use 选择边同样建立可达性（hook 方案节点）', () => {
    const hookScene = {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
      hooks: {
        onEnter: {
          variants: {
            h1: behavior('炼蛊皿剧情方案'),
          },
        },
      },
    } as unknown as AuthorSceneDef
    const itemWithHookSelect = {
      id: '268',
      name: '炼蛊皿',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: true,
        effects: [
          {
            kind: 'itemPrivateScript',
            script: {
              id: 'use',
              body: [
                {
                  kind: 'selectSceneHooks',
                  scene: 's001',
                  selection: { onEnter: { kind: 'use', value: 'h1' } },
                },
              ],
            },
          },
        ],
      },
    } as unknown as AuthorItemData
    const report = assertPalItemSchemeLabelInvariant({
      items: [itemWithHookSelect],
      scenes: [hookScene],
      expectedSchemes: 1,
      expectedMachineInners: 0,
    })
    expect(report.labels[0]).toMatchObject({
      id: 'h1',
      path: 'scenes.s001.hooks.onEnter.variants.h1',
      label: '炼蛊皿剧情方案',
    })
  })

  test('选择图成环 → fail-loud', () => {
    const scene = {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'e1',
          pos: { col: 0, row: 0, height: 0 },
          sprite: 'li-xiaoyao',
          behaviors: {
            trigger: {
              b1: behavior('炼蛊皿剧情方案', {
                kind: 'stages',
                initial: 'main',
                stages: [
                  {
                    id: 'main',
                    body: [
                      {
                        kind: 'selectEntityBehavior',
                        target: { scene: 's001', entity: 'e1' },
                        channel: 'trigger',
                        selection: { kind: 'use', value: 'b1' },
                      },
                    ],
                  },
                ],
              }),
            },
          },
        },
      ],
    } as unknown as AuthorSceneDef
    expect(() =>
      assertPalItemSchemeLabelInvariant({
        items: [itemSelecting('268', '炼蛊皿')],
        scenes: [scene],
        expectedSchemes: 1,
        expectedMachineInners: 0,
      }),
    ).toThrow(/PAL 物品剧情方案选择图成环/)
  })
})
