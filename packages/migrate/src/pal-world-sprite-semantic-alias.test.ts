import {
  type AuthorSceneDef,
  type SpriteDef,
  validateAuthorScenes,
  validateSprites,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { applyPalWorldSpriteSemanticAliases } from './pal-world-sprite-semantic-alias.js'

const semantic: SpriteDef = {
  id: 'li-xiaoyao',
  asset: 'sprite.pal.002',
  label: '李逍遥(大世界)',
  layout: { kind: 'directional', framesPerDir: 3 },
}
const legacy: SpriteDef = { ...semantic, id: 'sprite-2', label: '原精灵 2' }
const alias = {
  semanticId: 'li-xiaoyao',
  references: [{ sceneId: 's020', entityId: 'e344' }],
  evidence: 'test evidence',
} as const

function scene(id: string, entityId: string, sprite: string): AuthorSceneDef {
  const [value] = validateAuthorScenes([
    {
      id,
      mapId: 'map-1',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [{ id: entityId, pos: { col: 0, row: 0, height: 0 }, sprite, facing: 'left' }],
    },
  ])
  if (!value) throw new Error('Missing validated scene fixture')
  return value
}

function apply(currentSprite = 'sprite-2', currentSprites: SpriteDef[] = [semantic, legacy]) {
  return applyPalWorldSpriteSemanticAliases({
    currentSprites: validateSprites(currentSprites),
    generatedSprites: validateSprites([semantic]),
    currentScenes: new Map([['s020', scene('s020', 'e344', currentSprite)]]),
    generatedScenes: new Map([['s020', scene('s020', 'e344', 'li-xiaoyao')]]),
    roleSpritesByNumber: new Map([[2, semantic]]),
    aliases: [alias],
  })
}

describe('PAL 场景角色精灵语义别名 overlay', () => {
  test('只退休严格等价重复定义并改清单内引用，二次应用零变化', () => {
    const first = apply()
    expect(first.sprites).toEqual([semantic])
    const rewrittenEntity = first.updatedScenes.get('s020')?.entities[0]
    expect(rewrittenEntity).toEqual(scene('s020', 'e344', 'li-xiaoyao').entities[0])
    expect(rewrittenEntity).not.toHaveProperty('actor')
    expect(first.report).toEqual([
      {
        semanticId: 'li-xiaoyao',
        legacyId: 'sprite-2',
        references: 1,
        definitionRetired: true,
      },
    ])

    const second = apply('li-xiaoyao', first.sprites)
    expect(second.sprites).toEqual(first.sprites)
    expect(second.report[0]).toEqual(
      expect.objectContaining({ references: 0, definitionRetired: false }),
    )
  })

  test('重复定义资源或布局不同会 fail-loud', () => {
    expect(() => apply('sprite-2', [{ ...legacy, asset: 'sprite.pal.003' }, semantic])).toThrow(
      /资源、布局或动作容器不严格等价/,
    )
    expect(() =>
      apply('sprite-2', [
        { ...legacy, layout: { kind: 'directional', framesPerDir: 4 } },
        semantic,
      ]),
    ).toThrow(/资源、布局或动作容器不严格等价/)
    expect(() =>
      apply('sprite-2', [
        {
          ...legacy,
          poses: {
            idle: { label: '待机', steps: [{ frame: 0, durationMs: 100 }] },
          },
        },
        semantic,
      ]),
    ).toThrow(/资源、布局或动作容器不严格等价/)
  })

  test('清单外 legacy 引用与 generated 引用漂移都会 fail-loud', () => {
    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        currentSprites: [semantic, legacy],
        generatedSprites: [semantic],
        currentScenes: new Map([
          ['s020', scene('s020', 'e344', 'sprite-2')],
          ['s021', scene('s021', 'e345', 'sprite-2')],
        ]),
        generatedScenes: new Map([['s020', scene('s020', 'e344', 'li-xiaoyao')]]),
        roleSpritesByNumber: new Map([[2, semantic]]),
        aliases: [alias],
      }),
    ).toThrow(/清单外场景引用 s021\/e345/)

    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        currentSprites: [semantic, legacy],
        generatedSprites: [semantic],
        currentScenes: new Map([['s020', scene('s020', 'e344', 'sprite-2')]]),
        generatedScenes: new Map(),
        roleSpritesByNumber: new Map([[2, semantic]]),
        aliases: [alias],
      }),
    ).toThrow(/纯迁移核场景引用集合漂移/)
  })

  test('reports an unconfigured role and refuses an unlisted duplicate definition on either surface', () => {
    const wuHou: SpriteDef = {
      id: 'wu-hou',
      asset: 'sprite.pal.525',
      label: '巫后(大世界)',
      layout: { kind: 'directional', framesPerDir: 3 },
    }
    const args = {
      currentSprites: [semantic, legacy, wuHou],
      generatedSprites: [semantic, wuHou],
      currentScenes: new Map([['s020', scene('s020', 'e344', 'sprite-2')]]),
      generatedScenes: new Map([['s020', scene('s020', 'e344', 'li-xiaoyao')]]),
      roleSpritesByNumber: new Map([
        [2, semantic],
        [525, wuHou],
      ]),
      aliases: [alias],
    } as const
    const result = applyPalWorldSpriteSemanticAliases(args)
    expect(result.roleClosure).toEqual([
      {
        semanticId: 'li-xiaoyao',
        legacyId: 'sprite-2',
        configured: true,
        currentLegacy: 'equivalent',
        generatedLegacy: 'absent',
      },
      {
        semanticId: 'wu-hou',
        legacyId: 'sprite-525',
        configured: false,
        currentLegacy: 'absent',
        generatedLegacy: 'absent',
      },
    ])

    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        ...args,
        currentSprites: [
          ...args.currentSprites,
          { ...wuHou, id: 'sprite-525', label: '原精灵 525' },
        ],
      }),
    ).toThrow(/wu-hou: 全角色语义别名闭包遗漏严格重复定义 sprite-525/)

    expect(() =>
      applyPalWorldSpriteSemanticAliases({
        ...args,
        generatedSprites: [
          ...args.generatedSprites,
          { ...wuHou, id: 'sprite-525', label: '原精灵 525' },
        ],
      }),
    ).toThrow(/wu-hou: 全角色语义别名闭包遗漏严格重复定义 sprite-525/)
  })
})
