import { createHash } from 'node:crypto'
import type {
  EntityDef,
  SceneDef,
  SpriteActionDef,
  SpriteActionStep,
  SpriteDef,
} from '@type-pal/content'
import type {
  NormalizedPalActionTimeline,
  PalSpriteActionCensusReport,
} from './pal-sprite-action-census.js'

export interface PalSpriteActionMaterializationSite {
  sceneId: string
  entityId: string
  spriteId: string
  actionId: string
  startAtMs: number
}

export interface PalSpriteActionMaterializationReport {
  version: 1
  acceptedInstances: number
  changedScenes: number
  changedSpriteDefinitions: number
  materializedActions: number
  removedAutoBindings: number
  digest: string
  sites: PalSpriteActionMaterializationSite[]
}

export interface PalSpriteActionMaterializationResult {
  scenes: SceneDef[]
  sprites: SpriteDef[]
  report: PalSpriteActionMaterializationReport
}

interface ActionFamily {
  key: string
  spriteId: string
  intro: SpriteActionStep[]
  cycle: SpriteActionStep[]
  actionId: string
  sites: Array<{
    sceneId: string
    entityId: string
    phaseMs: number
    timeline: NormalizedPalActionTimeline
  }>
}

function stableDigest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function cloneSteps(steps: readonly SpriteActionStep[]): SpriteActionStep[] {
  return steps.map((step) => ({
    frame: step.frame,
    durationMs: step.durationMs,
    ...(step.cues ? { cues: step.cues.map((cue) => ({ ...cue })) } : {}),
  }))
}

function parseCanonicalCycle(key: string, where: string): SpriteActionStep[] {
  const parsed = JSON.parse(key) as unknown
  if (!Array.isArray(parsed) || !parsed.length)
    throw new Error(`${where}: steadyCycleKey 不是非空 step 数组`)
  return parsed.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`${where}[${index}]: step 期望对象`)
    const step = raw as Partial<SpriteActionStep>
    if (!Number.isInteger(step.frame) || step.frame! < 0)
      throw new Error(`${where}[${index}].frame 无效`)
    if (!Number.isFinite(step.durationMs) || step.durationMs! <= 0)
      throw new Error(`${where}[${index}].durationMs 无效`)
    if (
      step.cues?.some((cue) => cue.kind !== 'sound' || typeof cue.asset !== 'string' || !cue.asset)
    )
      throw new Error(`${where}[${index}].cues 无效`)
    return {
      frame: step.frame!,
      durationMs: step.durationMs!,
      ...(step.cues ? { cues: step.cues.map((cue) => ({ ...cue })) } : {}),
    }
  })
}

function familyKey(spriteId: string, timeline: NormalizedPalActionTimeline): string {
  const intro = timeline.steps.slice(0, timeline.loopFrom)
  return JSON.stringify([spriteId, intro, timeline.steadyCycleKey])
}

function generatedActionId(spriteId: string, key: string): string {
  return `pal-auto-v1-${stableDigest({ schema: 'pal-sprite-action@1', spriteId, family: key }).slice(0, 16)}`
}

function findEntity(scene: SceneDef, entityId: string): EntityDef {
  const entity = scene.entities.find((candidate) => candidate.id === entityId)
  if (!entity) throw new Error(`sprite action materialize: ${scene.id}/${entityId} 不存在`)
  return entity
}

/**
 * 把 G2 已证明等价的 PAL page0 auto 物化成“SpriteDef 动作 + EntityPage.animation”。
 * 输入是纯迁移产物；函数不读取 projects/pal，也不覆盖已有动作或 animation。
 */
export function materializePalSpriteActions(args: {
  scenes: readonly SceneDef[]
  sprites: readonly SpriteDef[]
  census: PalSpriteActionCensusReport
}): PalSpriteActionMaterializationResult {
  if (args.census.version !== 2)
    throw new Error(`sprite action materialize: 只接受 census v2，收到 ${args.census.version}`)

  const accepted = args.census.instances.filter(
    (instance) => instance.reasons.length === 0 && instance.timeline,
  )
  if (accepted.length !== args.census.summary.acceptedInstances)
    throw new Error(
      `sprite action materialize: accepted 计数漂移 ${accepted.length} != ${args.census.summary.acceptedInstances}`,
    )

  const families = new Map<string, ActionFamily>()
  const seenSites = new Set<string>()
  for (const instance of accepted) {
    if (!instance.spriteId || !instance.timeline)
      throw new Error(
        `sprite action materialize: ${instance.sceneId}/${instance.entityId} 缺动作证据`,
      )
    if (instance.timeline.behavior !== 'loop')
      throw new Error(
        `sprite action materialize: ${instance.sceneId}/${instance.entityId} 非 steady loop`,
      )
    const siteKey = `${instance.sceneId}\0${instance.entityId}`
    if (seenSites.has(siteKey)) throw new Error(`sprite action materialize: 重复站点 ${siteKey}`)
    seenSites.add(siteKey)
    const key = familyKey(instance.spriteId, instance.timeline)
    let family = families.get(key)
    if (!family) {
      family = {
        key,
        spriteId: instance.spriteId,
        intro: cloneSteps(instance.timeline.steps.slice(0, instance.timeline.loopFrom)),
        cycle: parseCanonicalCycle(
          instance.timeline.steadyCycleKey,
          `${instance.spriteId}.steadyCycleKey`,
        ),
        actionId: generatedActionId(instance.spriteId, key),
        sites: [],
      }
      families.set(key, family)
    }
    family.sites.push({
      sceneId: instance.sceneId,
      entityId: instance.entityId,
      phaseMs: instance.timeline.phaseMs,
      timeline: instance.timeline,
    })
  }

  const orderedFamilies = [...families.values()].sort(
    (left, right) =>
      left.spriteId.localeCompare(right.spriteId) || left.actionId.localeCompare(right.actionId),
  )
  for (const family of orderedFamilies)
    family.sites.sort(
      (left, right) =>
        left.sceneId.localeCompare(right.sceneId) || left.entityId.localeCompare(right.entityId),
    )
  if (orderedFamilies.length !== args.census.summary.steadyCycleFamilies)
    throw new Error(
      `sprite action materialize: 动作族计数漂移 ${orderedFamilies.length} != ${args.census.summary.steadyCycleFamilies}`,
    )

  const sprites = structuredClone(args.sprites) as SpriteDef[]
  const spriteById = new Map(sprites.map((sprite) => [sprite.id, sprite]))
  const familiesBySprite = new Map<string, ActionFamily[]>()
  for (const family of orderedFamilies) {
    const list = familiesBySprite.get(family.spriteId) ?? []
    list.push(family)
    familiesBySprite.set(family.spriteId, list)
  }
  for (const [spriteId, spriteFamilies] of familiesBySprite) {
    const sprite = spriteById.get(spriteId)
    if (!sprite) throw new Error(`sprite action materialize: SpriteDef ${spriteId} 不存在`)
    const existing = { ...(sprite.poses ?? {}) }
    const occupiedOrders = Object.values(existing).map((action, index) => action.order ?? index)
    const firstOrder = occupiedOrders.length ? Math.max(...occupiedOrders) + 1 : 0
    spriteFamilies.forEach((family, familyIndex) => {
      if (existing[family.actionId])
        throw new Error(`sprite action materialize: 动作 id 冲突 ${spriteId}/${family.actionId}`)
      const definition: SpriteActionDef = {
        label: spriteFamilies.length === 1 ? 'PAL 自动循环' : `PAL 自动循环 ${familyIndex + 1}`,
        order: firstOrder + familyIndex,
        steps: [...cloneSteps(family.intro), ...cloneSteps(family.cycle)],
        loopFrom: family.intro.length,
      }
      existing[family.actionId] = definition
    })
    sprite.poses = existing
  }

  const scenes = structuredClone(args.scenes) as SceneDef[]
  const sceneById = new Map(scenes.map((scene) => [scene.id, scene]))
  const sites: PalSpriteActionMaterializationSite[] = []
  const changedScenes = new Set<string>()
  for (const family of orderedFamilies) {
    for (const site of family.sites) {
      const scene = sceneById.get(site.sceneId)
      if (!scene) throw new Error(`sprite action materialize: SceneDef ${site.sceneId} 不存在`)
      const entity = findEntity(scene, site.entityId)
      if (!('sprite' in entity) || entity.sprite !== family.spriteId)
        throw new Error(
          `sprite action materialize: ${site.sceneId}/${site.entityId} 直接精灵漂移，期望 ${family.spriteId}`,
        )
      const page = entity.pages?.[0]
      if (!page?.auto?.stages.length)
        throw new Error(`sprite action materialize: ${site.sceneId}/${site.entityId} 缺 page0 auto`)
      if (page.animation)
        throw new Error(
          `sprite action materialize: ${site.sceneId}/${site.entityId} 已有 animation`,
        )
      page.animation = {
        sprite: family.spriteId,
        action: family.actionId,
        loop: true,
        ...(site.phaseMs ? { startAtMs: site.phaseMs } : {}),
      }
      delete page.auto
      changedScenes.add(site.sceneId)
      sites.push({
        sceneId: site.sceneId,
        entityId: site.entityId,
        spriteId: family.spriteId,
        actionId: family.actionId,
        startAtMs: site.phaseMs,
      })
    }
  }
  sites.sort(
    (left, right) =>
      left.sceneId.localeCompare(right.sceneId) || left.entityId.localeCompare(right.entityId),
  )

  const report: PalSpriteActionMaterializationReport = {
    version: 1,
    acceptedInstances: accepted.length,
    changedScenes: changedScenes.size,
    changedSpriteDefinitions: familiesBySprite.size,
    materializedActions: orderedFamilies.length,
    removedAutoBindings: sites.length,
    digest: stableDigest({
      schema: 'pal-sprite-action-materialization@1',
      actions: orderedFamilies.map((family) => ({
        spriteId: family.spriteId,
        actionId: family.actionId,
        intro: family.intro,
        cycle: family.cycle,
        sites: family.sites.map((site) => ({
          sceneId: site.sceneId,
          entityId: site.entityId,
          startAtMs: site.phaseMs,
        })),
      })),
    }),
    sites,
  }
  return { scenes, sprites, report }
}
