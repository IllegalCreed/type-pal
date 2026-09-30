import type { SpriteDef } from '@type-pal/content'
import { palSpriteAssetId } from '@type-pal/content'
import type { SourceEventObject, SourceScene } from './pal-source-types.js'
import {
  assertPalWorldSpriteLayoutOverlaySources,
  PAL_WORLD_SPRITE_LAYOUT_OVERLAYS,
  type PalWorldSpriteLayoutOverlay,
} from './pal-world-sprite-layouts.js'
import { sceneSlug } from './source-facts.js'

/** PAL 迁移器保留的中性 SpriteDef id；玩法职责不得编码进资源身份。 */
export function migratedSpriteId(spriteNum: number, layoutVariantFrames?: number): string {
  return `sprite-${spriteNum}${layoutVariantFrames === undefined ? '' : `-f${layoutVariantFrames}`}`
}

/** 静态布局证据预注册与按使用懒取；不读取或翻译任何场景事件脚本。 */
export function createPalWorldSpriteRegistry(
  srcScenes: readonly SourceScene[],
  roleSpritesByNum: ReadonlyMap<number, SpriteDef>,
  options: {
    worldSpriteFrameCounts?: readonly number[]
    sceneSemanticSpriteIds?: ReadonlySet<string>
  } = {},
) {
  const orderedScenes = [...srcScenes].sort((left, right) => left.sceneId - right.sceneId)
  const report: {
    layoutConflicts: string[]
    layoutEvidence: Array<{
      spriteNum: number
      definitionId: string
      source: 'scene' | 'pal-overlay'
      evidence: string
    }>
  } = { layoutConflicts: [], layoutEvidence: [] }
  if (options.worldSpriteFrameCounts)
    assertPalWorldSpriteLayoutOverlaySources(options.worldSpriteFrameCounts)
  // ── 精灵布局注册表(预扫描 + 只读解析)──
  // 先扫描全部 scene 声明，再叠加逐项 PAL 布局证据；引用路径不猜默认布局。
  type LayoutRegistration = {
    spriteNum: number
    id: string
    layout: SpriteDef['layout']
    source: 'scene' | 'pal-overlay'
    evidence: string
    label: string
    /** 稳定视觉定义由角色迁移持有；场景只复用 id，不能再生成一份重复 SpriteDef。 */
    externalDefinition?: true
  }
  const layoutKey = (layout: SpriteDef['layout']): string =>
    layout.kind === 'directional'
      ? `directional:${layout.framesPerDir}`
      : layout.kind === 'loop'
        ? `loop:${layout.frameCount}:${layout.ticksPerFrame ?? ''}`
        : 'static'
  const sceneLayout = (nSpriteFrames: number): SpriteDef['layout'] =>
    nSpriteFrames > 0 ? { kind: 'directional', framesPerDir: nSpriteFrames } : { kind: 'static' }
  const roleSpriteAliasFor = (spriteNum: number): SpriteDef | undefined => {
    const roleSprite = roleSpritesByNum.get(spriteNum)
    if (!roleSprite || roleSprite.asset !== palSpriteAssetId(spriteNum)) return undefined
    if (!options.sceneSemanticSpriteIds?.has(roleSprite.id)) return undefined
    return roleSprite
  }
  type SceneLayoutEvidence = {
    nSpriteFrames: number
    sceneId: number
    entityId: number
  }
  const sceneEvidenceBySprite = new Map<number, Map<number, SceneLayoutEvidence>>()
  for (const sourceScene of orderedScenes) {
    for (const entity of [...sourceScene.eventObjects].sort((left, right) => left.id - right.id)) {
      if (entity.spriteNum <= 0) continue
      const nSpriteFrames = entity.nSpriteFrames ?? 0
      const layouts = sceneEvidenceBySprite.get(entity.spriteNum) ?? new Map()
      const existing = layouts.get(nSpriteFrames)
      if (
        !existing ||
        sourceScene.sceneId < existing.sceneId ||
        (sourceScene.sceneId === existing.sceneId && entity.id < existing.entityId)
      )
        layouts.set(nSpriteFrames, {
          nSpriteFrames,
          sceneId: sourceScene.sceneId,
          entityId: entity.id,
        })
      sceneEvidenceBySprite.set(entity.spriteNum, layouts)
    }
  }

  const overlaysBySprite = new Map<number, PalWorldSpriteLayoutOverlay>(
    PAL_WORLD_SPRITE_LAYOUT_OVERLAYS.map((overlay) => [overlay.spriteNum, overlay] as const),
  )
  if (overlaysBySprite.size !== PAL_WORLD_SPRITE_LAYOUT_OVERLAYS.length)
    throw new Error('PAL 大世界精灵布局 overlay 含重复 spriteNum')

  const sceneRegistrationByKey = new Map<string, LayoutRegistration>()
  const allSpriteNums = new Set([...sceneEvidenceBySprite.keys(), ...overlaysBySprite.keys()])
  for (const spriteNum of [...allSpriteNums].sort((left, right) => left - right)) {
    const sceneEvidence = [...(sceneEvidenceBySprite.get(spriteNum)?.values() ?? [])].sort(
      (left, right) =>
        left.sceneId - right.sceneId ||
        left.entityId - right.entityId ||
        left.nSpriteFrames - right.nSpriteFrames,
    )
    const overlay = overlaysBySprite.get(spriteNum)
    const semanticRoleSprite = roleSpriteAliasFor(spriteNum)
    const primaryLayout =
      semanticRoleSprite?.layout ??
      overlay?.layout ??
      sceneLayout(sceneEvidence[0]?.nSpriteFrames ?? 0)
    const primaryKey = layoutKey(primaryLayout)
    const layouts = new Map<string, LayoutRegistration>()
    if (semanticRoleSprite) {
      layouts.set(layoutKey(semanticRoleSprite.layout), {
        spriteNum,
        id: semanticRoleSprite.id,
        layout: semanticRoleSprite.layout,
        source: 'scene',
        evidence: `player-roles spriteNum=${spriteNum}`,
        label: semanticRoleSprite.label,
        externalDefinition: true,
      })
    }
    if (overlay) {
      const key = layoutKey(overlay.layout)
      if (!layouts.has(key))
        layouts.set(key, {
          spriteNum,
          id: migratedSpriteId(spriteNum),
          layout: overlay.layout,
          source: 'pal-overlay',
          evidence: overlay.evidence,
          label: `原精灵 ${spriteNum}(0x65 换装)`,
        })
    }
    for (const evidence of sceneEvidence) {
      const layout = sceneLayout(evidence.nSpriteFrames)
      const key = layoutKey(layout)
      const matchesPrimary = key === primaryKey
      // overlay 与场景证据相同 = 同一个 stable base；保留历史人读 label，避免纯布局修复
      // 与作者改名形成无意义 MG2 冲突。不同布局才建立 scene -f<n> 变体。
      const registration: LayoutRegistration = layouts.has(key)
        ? layouts.get(key)!
        : {
            spriteNum,
            id: matchesPrimary
              ? migratedSpriteId(spriteNum)
              : migratedSpriteId(spriteNum, evidence.nSpriteFrames),
            layout,
            source: 'scene',
            evidence: `scene ${sceneSlug(evidence.sceneId)}/e${evidence.entityId} nSpriteFrames=${evidence.nSpriteFrames}`,
            label: `原精灵 ${spriteNum}`,
          }
      layouts.set(key, registration)
      sceneRegistrationByKey.set(`${spriteNum}:${evidence.nSpriteFrames}`, registration)
    }
    for (const registration of layouts.values())
      if (!registration.externalDefinition && registration.id !== migratedSpriteId(spriteNum))
        report.layoutConflicts.push(registration.id)
  }
  report.layoutConflicts.sort()

  const spriteDefs = new Map<string, SpriteDef>()
  const recordedLayoutEvidence = new Set<string>()
  const ensureSpriteDefinition = (registration: LayoutRegistration): string => {
    if (registration.externalDefinition) return registration.id
    if (!spriteDefs.has(registration.id))
      spriteDefs.set(registration.id, {
        id: registration.id,
        asset: palSpriteAssetId(registration.spriteNum),
        label: registration.label,
        layout: registration.layout,
      })
    const evidenceKey = `${registration.spriteNum}:${registration.id}:${registration.source}`
    if (!recordedLayoutEvidence.has(evidenceKey)) {
      recordedLayoutEvidence.add(evidenceKey)
      report.layoutEvidence.push({
        spriteNum: registration.spriteNum,
        definitionId: registration.id,
        source: registration.source,
        evidence: registration.evidence,
      })
    }
    return registration.id
  }
  const spriteRef = (entity: SourceEventObject): string => {
    const nSpriteFrames = entity.nSpriteFrames ?? 0
    const registration = sceneRegistrationByKey.get(`${entity.spriteNum}:${nSpriteFrames}`)
    if (!registration)
      throw new Error(`sprite ${entity.spriteNum} 缺场景布局注册: nSpriteFrames=${nSpriteFrames}`)
    return ensureSpriteDefinition(registration)
  }

  return { spriteDefs, spriteRef, report }
}
