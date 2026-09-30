import type { SpriteDef } from '@type-pal/content'
import { palSpriteAssetId } from '@type-pal/content'
import {
  assertPalWorldSpriteLayoutOverlaySources,
  PAL_WORLD_SPRITE_LAYOUT_OVERLAYS,
  type PalWorldSpriteLayoutOverlay,
} from './pal-world-sprite-layouts.js'
import type { SourceEventObject, SourceScene } from './scene-migration-source-plan.js'
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
  // 0x65/0x1A 只携带资源号，没有布局信息。先扫描全部 scene 声明，再叠加逐项 PAL
  // 证据；翻译脚本时只查表，绝不在引用路径上创建 directional/3 默认值。
  type LayoutRegistration = {
    spriteNum: number
    nSpriteFrames?: number
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
  const roleSpriteAliasFor = (
    spriteNum: number,
    layout: SpriteDef['layout'] | undefined,
    usage: 'script' | 'scene',
  ): SpriteDef | undefined => {
    const roleSprite = roleSpritesByNum.get(spriteNum)
    if (!roleSprite || roleSprite.asset !== palSpriteAssetId(spriteNum)) return undefined
    if (layout && layoutKey(roleSprite.layout) !== layoutKey(layout)) return undefined
    if (usage === 'scene' && !options.sceneSemanticSpriteIds?.has(roleSprite.id)) return undefined
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

  const registrationsBySprite = new Map<number, Map<string, LayoutRegistration>>()
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
    const semanticRoleSprite = roleSpriteAliasFor(spriteNum, undefined, 'scene')
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
            nSpriteFrames: evidence.nSpriteFrames,
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
    registrationsBySprite.set(spriteNum, layouts)
    for (const registration of layouts.values())
      if (!registration.externalDefinition && registration.id !== migratedSpriteId(spriteNum))
        report.layoutConflicts.push(registration.id)
  }
  report.layoutConflicts.sort()

  const spriteDefs = new Map<string, SpriteDef>()
  const recordedLayoutEvidence = new Set<string>()
  const ensureSpriteDefinitionIn = (
    definitions: Map<string, SpriteDef>,
    registration: LayoutRegistration,
    recordEvidence: boolean,
  ): string => {
    if (registration.externalDefinition) return registration.id
    if (!definitions.has(registration.id))
      definitions.set(registration.id, {
        id: registration.id,
        asset: palSpriteAssetId(registration.spriteNum),
        label: registration.label,
        layout: registration.layout,
      })
    if (recordEvidence) {
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
    }
    return registration.id
  }
  const ensureSpriteDefinition = (registration: LayoutRegistration): string =>
    ensureSpriteDefinitionIn(spriteDefs, registration, true)
  const spriteRef = (entity: SourceEventObject): string => {
    const nSpriteFrames = entity.nSpriteFrames ?? 0
    const registration = sceneRegistrationByKey.get(`${entity.spriteNum}:${nSpriteFrames}`)
    if (!registration)
      throw new Error(`sprite ${entity.spriteNum} 缺场景布局注册: nSpriteFrames=${nSpriteFrames}`)
    return ensureSpriteDefinition(registration)
  }

  /** 0x65 / 0x1A field=2 / 0x98 共用的只读旧号解析器。 */
  const resolveSpriteIdForNum = (
    num: number,
    ensure: (registration: LayoutRegistration) => string,
  ): string => {
    const roleSprite = roleSpriteAliasFor(num, undefined, 'script')
    if (roleSprite) return roleSprite.id
    const layouts = registrationsBySprite.get(num)
    if (!layouts?.size) throw new Error(`sprite ${num} 缺布局证据；禁止从脚本资源号猜布局`)
    const overlay = overlaysBySprite.get(num)
    if (overlay) {
      const registration = layouts.get(layoutKey(overlay.layout))
      if (!registration) throw new Error(`sprite ${num} 的 PAL overlay 未进入布局注册表`)
      return ensure(registration)
    }
    if (layouts.size !== 1)
      throw new Error(
        `sprite ${num} 有 ${layouts.size} 种场景布局，脚本资源号无法消歧；需要逐项 PAL overlay`,
      )
    return ensure([...layouts.values()][0]!)
  }

  return { spriteDefs, spriteRef, resolveSpriteIdForNum, ensureSpriteDefinitionIn, report }
}
