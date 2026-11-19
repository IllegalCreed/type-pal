import { type AuthorSceneDef, type SpriteDef, validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import { applyPalWorldSpriteSemanticAliases } from './pal-world-sprite-semantic-alias.js'

function aliasesFixture() {
  const semantic: SpriteDef = {
    id: 'li-xiaoyao',
    asset: 'sprite.pal.002',
    label: '李逍遥',
    layout: { kind: 'directional', framesPerDir: 3 },
  }
  const [authorScene] = validateAuthorScenes([
    {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [{ id: 'e1', pos: { col: 0, row: 0, height: 0 }, sprite: 'sprite-2' }],
    },
  ])
  if (!authorScene) throw new Error('Missing validated scene fixture')
  return {
    currentSprites: [semantic],
    generatedSprites: [semantic],
    currentScenes: new Map([['s001', authorScene]]),
    generatedScenes: new Map([
      ['s001', { id: 's001', entities: [{ id: 'e1', sprite: 'li-xiaoyao' }] }],
    ]),
    roleSpritesByNumber: new Map([[2, semantic]]),
    aliases: [
      {
        semanticId: 'li-xiaoyao',
        references: [{ sceneId: 's001', entityId: 'e1' }],
        evidence: 'The extracted actor and entity use the same source sprite and layout.',
      },
    ],
  }
}

test('rejects a repeated alias, unrecognized role, empty reference list or repeated reference', () => {
  const args = aliasesFixture()
  const [alias] = args.aliases
  if (!alias) throw new Error('Missing alias fixture')
  expect(() => applyPalWorldSpriteSemanticAliases({ ...args, aliases: [alias, alias] })).toThrow(
    'PAL 场景角色语义别名清单含重复 semanticId',
  )
  expect(() =>
    applyPalWorldSpriteSemanticAliases({
      ...args,
      aliases: [{ ...alias, semanticId: 'ghost' }],
    }),
  ).toThrow('ghost: 语义别名不属于完整角色精灵域')
  expect(() =>
    applyPalWorldSpriteSemanticAliases({
      ...args,
      aliases: [{ ...alias, references: [] }],
    }),
  ).toThrow('li-xiaoyao: 语义别名缺逐引用证据')
  expect(() =>
    applyPalWorldSpriteSemanticAliases({
      ...args,
      aliases: [{ ...alias, references: [...alias.references, ...alias.references] }],
    }),
  ).toThrow('li-xiaoyao: 语义别名引用清单含重复项')
})

test('requires a current and generated semantic definition and a generated surface without a duplicate', () => {
  const args = aliasesFixture()
  const role = args.generatedSprites[0]
  if (!role) throw new Error('Missing generated sprite fixture')
  expect(() => applyPalWorldSpriteSemanticAliases({ ...args, currentSprites: [] })).toThrow(
    'li-xiaoyao: current/generated 缺完整角色域语义 SpriteDef',
  )
  expect(() =>
    applyPalWorldSpriteSemanticAliases({
      ...args,
      generatedSprites: [...args.generatedSprites, { ...role, id: 'sprite-2' }],
    }),
  ).toThrow('li-xiaoyao: 纯迁移核仍生成重复定义 sprite-2')
})

test('diagnoses missing and incompatible current targets without applying a partial alias', () => {
  const args = aliasesFixture()
  const authorScene = args.currentScenes.get('s001')
  if (!authorScene) throw new Error('Missing scene fixture')
  const before = structuredClone(args)
  const emptyScenes = new Map<string, AuthorSceneDef>()
  function sceneWith(entities: AuthorSceneDef['entities']): ReadonlyMap<string, AuthorSceneDef> {
    return new Map([['s001', { ...authorScene!, entities }]])
  }
  const pos = { col: 0, row: 0, height: 0 }
  expect(() => applyPalWorldSpriteSemanticAliases({ ...args, currentScenes: emptyScenes })).toThrow(
    'li-xiaoyao: current 缺场景 s001',
  )
  expect(() =>
    applyPalWorldSpriteSemanticAliases({
      ...args,
      currentScenes: sceneWith([{ id: 'e1', pos, zone: true }]),
    }),
  ).toThrow('s001/e1: 不是 SpriteDef 场景实体')
  expect(() =>
    applyPalWorldSpriteSemanticAliases({
      ...args,
      currentScenes: sceneWith([{ id: 'e1', pos, sprite: 'sprite-3' }]),
    }),
  ).toThrow('s001/e1: 期望 sprite-2 或 li-xiaoyao，实际 sprite-3')
  expect(() =>
    applyPalWorldSpriteSemanticAliases({ ...args, currentScenes: sceneWith([]) }),
  ).toThrow('li-xiaoyao: current 场景 s001 缺实体 e1')
  expect(args).toEqual(before)
})

test('rejects a malformed non-object entity in generated source evidence', () => {
  const args = aliasesFixture()
  expect(() =>
    applyPalWorldSpriteSemanticAliases({
      ...args,
      generatedScenes: new Map([['s001', { id: 's001', entities: ['raw'] }]]),
    }),
  ).toThrow('s001: 场景实体必须是 object')
})
