import type { AuthorSceneDef, SpriteDef } from '@type-pal/content'
import { migratedSpriteId } from './migrate-content.js'

export interface PalWorldSceneSemanticSpriteAlias {
  semanticId: string
  references: readonly { sceneId: string; entityId: string }[]
  evidence: string
}

export interface PalWorldSpriteSemanticAliasReport {
  semanticId: string
  legacyId: string
  references: number
  definitionRetired: boolean
}

function comparableDefinition(sprite: SpriteDef): unknown {
  return {
    asset: sprite.asset,
    layout: sprite.layout,
    poses: sprite.poses ?? null,
  }
}

function assertEquivalentDefinition(label: string, left: SpriteDef, right: SpriteDef): void {
  if (JSON.stringify(comparableDefinition(left)) !== JSON.stringify(comparableDefinition(right)))
    throw new Error(`${label}: 资源、布局或动作容器不严格等价`)
}

function entitySpriteReferences(
  scenes: ReadonlyMap<string, { id: string; entities: readonly unknown[] }>,
  spriteId: string,
): string[] {
  const references: string[] = []
  for (const [sceneId, scene] of scenes)
    for (const entity of scene.entities) {
      if (!entity || typeof entity !== 'object')
        throw new Error(`${sceneId}: 场景实体必须是 object`)
      const record = entity as Record<string, unknown>
      if (record.sprite === spriteId && typeof record.id === 'string')
        references.push(`${sceneId}/${record.id}`)
    }
  return references.sort()
}

function expectedReferenceKeys(alias: PalWorldSceneSemanticSpriteAlias): string[] {
  const keys = alias.references.map(({ sceneId, entityId }) => `${sceneId}/${entityId}`).sort()
  if (new Set(keys).size !== keys.length)
    throw new Error(`${alias.semanticId}: 语义别名引用清单含重复项`)
  return keys
}

/**
 * 把已逐项核清视觉等价的原始场景 SpriteDef 引用归一到稳定视觉定义。
 *
 * generated* 是纯迁移核给出的证据，current* 是需保留作者字段的 current baseline。
 * 本函数只退休严格等价的重复定义并改清单内实体的 sprite 引用，不新增 actor 绑定；
 * 任何额外引用或内容漂移都 fail-loud。
 */
export function applyPalWorldSpriteSemanticAliases(args: {
  currentSprites: readonly SpriteDef[]
  generatedSprites: readonly SpriteDef[]
  currentScenes: ReadonlyMap<string, AuthorSceneDef>
  generatedScenes: ReadonlyMap<string, { id: string; entities: readonly unknown[] }>
  roleSpritesByNumber: ReadonlyMap<number, SpriteDef>
  aliases: readonly PalWorldSceneSemanticSpriteAlias[]
}): {
  sprites: SpriteDef[]
  updatedScenes: Map<string, AuthorSceneDef>
  report: PalWorldSpriteSemanticAliasReport[]
} {
  const currentById = new Map(args.currentSprites.map((sprite) => [sprite.id, sprite]))
  const generatedById = new Map(args.generatedSprites.map((sprite) => [sprite.id, sprite]))
  const roleBySemanticId = new Map(
    [...args.roleSpritesByNumber].map(([spriteNum, sprite]) => [sprite.id, { spriteNum, sprite }]),
  )
  const retiredIds = new Set<string>()
  const updatedScenes = new Map<string, AuthorSceneDef>()
  const report: PalWorldSpriteSemanticAliasReport[] = []

  for (const alias of args.aliases) {
    const role = roleBySemanticId.get(alias.semanticId)
    if (!role) throw new Error(`${alias.semanticId}: 角色表缺稳定视觉 SpriteDef 映射`)
    const legacyId = migratedSpriteId(role.spriteNum)
    const currentSemantic = currentById.get(alias.semanticId)
    const generatedSemantic = generatedById.get(alias.semanticId)
    if (!currentSemantic || !generatedSemantic)
      throw new Error(`${alias.semanticId}: current/generated 缺语义 SpriteDef`)
    assertEquivalentDefinition(
      `${alias.semanticId}: current/generated`,
      currentSemantic,
      generatedSemantic,
    )
    assertEquivalentDefinition(
      `${alias.semanticId}: role/generated`,
      role.sprite,
      generatedSemantic,
    )
    if (generatedById.has(legacyId))
      throw new Error(`${alias.semanticId}: 纯迁移核仍生成重复定义 ${legacyId}`)

    const currentLegacy = currentById.get(legacyId)
    if (currentLegacy) {
      assertEquivalentDefinition(`${alias.semanticId}: ${legacyId}`, currentLegacy, currentSemantic)
      retiredIds.add(legacyId)
    }

    const expected = expectedReferenceKeys(alias)
    const generated = entitySpriteReferences(args.generatedScenes, alias.semanticId)
    if (JSON.stringify(generated) !== JSON.stringify(expected))
      throw new Error(
        `${alias.semanticId}: 纯迁移核场景引用集合漂移，期望 ${expected.join(',')}，实际 ${generated.join(',')}`,
      )
    const currentLegacyReferences = entitySpriteReferences(args.currentScenes, legacyId)
    const unexpected = currentLegacyReferences.filter((reference) => !expected.includes(reference))
    if (unexpected.length)
      throw new Error(`${legacyId}: 发现清单外场景引用 ${unexpected.join(',')}`)

    let referencesRewritten = 0
    for (const { sceneId, entityId } of alias.references) {
      const sourceScene = updatedScenes.get(sceneId) ?? args.currentScenes.get(sceneId)
      if (!sourceScene) throw new Error(`${alias.semanticId}: current 缺场景 ${sceneId}`)
      const entities = sourceScene.entities.map((entity) => {
        if (entity.id !== entityId) return entity
        if (!('sprite' in entity))
          throw new Error(`${sceneId}/${entityId}: 不是 SpriteDef 场景实体`)
        if (entity.sprite !== legacyId && entity.sprite !== alias.semanticId)
          throw new Error(
            `${sceneId}/${entityId}: 期望 ${legacyId} 或 ${alias.semanticId}，实际 ${entity.sprite}`,
          )
        if (entity.sprite === legacyId) referencesRewritten++
        return entity.sprite === alias.semanticId ? entity : { ...entity, sprite: alias.semanticId }
      })
      if (!entities.some((entity) => entity.id === entityId))
        throw new Error(`${alias.semanticId}: current 场景 ${sceneId} 缺实体 ${entityId}`)
      updatedScenes.set(sceneId, { ...sourceScene, entities })
    }
    report.push({
      semanticId: alias.semanticId,
      legacyId,
      references: referencesRewritten,
      definitionRetired: currentLegacy !== undefined,
    })
  }

  return {
    sprites: args.currentSprites.filter(({ id }) => !retiredIds.has(id)),
    updatedScenes,
    report,
  }
}
