import type { ActorDef } from './actor.js'
import type {
  AssetCatalogV1,
  AssetId,
  AssetRole,
  LegacyAssetConfigV3,
  LegacyAssetFamily,
} from './asset.js'
import {
  legacyPalPortraitAssetId,
  palBattleBackgroundAssetId,
  palItemIconAssetId,
  palMusicAssetId,
  validateAssetCatalog,
  validateManifestAssetConfigV3,
} from './asset.js'
import type { LegacyManifestV3, LoadedManifest, ProjectManifest, WorldState } from './character.js'
import type { SceneDef } from './index.js'
import type { LegacyPoseDefV3, SpriteActionDef, SpriteDef } from './sprite.js'

export const LEGACY_LAYOUT_LOOP_ACTION_ID = 'legacy-layout-loop' as const

export interface SpriteDefinitionsV3ToV4Result {
  sprites: SpriteDef[]
  /** 旧 layout.loop 被折叠出的默认动作；场景升级器据此登记 direct entity 页绑定。 */
  legacyLayoutActions: Readonly<Record<string, typeof LEGACY_LAYOUT_LOOP_ACTION_ID>>
}

interface ManifestV2 {
  id: string
  name: string
  contentVersion: 2
  entryScene: string
  entryPoints?: LegacyManifestV3['entryPoints']
  content: Record<string, string>
  assets?: Record<string, unknown>
  startWorld: LegacyManifestV3['startWorld']
}

function object(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${where}: 期望对象`)
  return value as Record<string, unknown>
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  where: string,
): void {
  const allowedKeys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!allowedKeys.has(key)) throw new Error(`${where}.${key}: 未知字段`)
}

function nonEmptyString(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new Error(`${where}: 期望非空 string`)
  return value
}

function positiveInteger(value: unknown, where: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) throw new Error(`${where}: 期望正整数`)
  return value as number
}

function nonNegativeInteger(value: unknown, where: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(`${where}: 期望非负整数`)
  return value as number
}

function legacyPositiveAsset(
  value: unknown,
  where: string,
  assetFor: (legacy: number) => AssetId,
): AssetId | undefined {
  if (typeof value === 'string') {
    if (value.length === 0) throw new Error(`${where}: AssetId 不能为空`)
    return value
  }
  if (!Number.isInteger(value) || (value as number) < 0)
    throw new Error(`${where}: 期望非负旧编号或 AssetId`)
  return value === 0 ? undefined : assetFor(value as number)
}

function requiredLegacyPortraitAssetId(legacy: number): AssetId {
  const asset = legacyPalPortraitAssetId(legacy)
  if (!asset) throw new Error(`旧立绘号 ${legacy} 不能转换为 AssetId`)
  return asset
}

/** 旧 actor 立绘号的纯、幂等规范化；expressions 的 0 同样表示字段缺席。 */
export function upgradeLegacyActorImages<T>(input: T): T {
  const actors = cloneJson(input) as unknown
  if (!Array.isArray(actors)) throw new Error('actors: 期望数组')
  actors.forEach((raw, index) => {
    const actor = object(raw, `actors[${index}]`)
    if (actor.portraits === undefined) return
    const portraits = object(actor.portraits, `actors[${index}].portraits`)
    const defaultAsset = legacyPositiveAsset(
      portraits.default,
      `actors[${index}].portraits.default`,
      requiredLegacyPortraitAssetId,
    )
    const expressions =
      portraits.expressions === undefined
        ? undefined
        : object(portraits.expressions, `actors[${index}].portraits.expressions`)
    const nextExpressions: Record<string, AssetId> = {}
    for (const [name, value] of Object.entries(expressions ?? {})) {
      const asset = legacyPositiveAsset(
        value,
        `actors[${index}].portraits.expressions[${JSON.stringify(name)}]`,
        requiredLegacyPortraitAssetId,
      )
      if (asset) nextExpressions[name] = asset
    }
    if (!defaultAsset) {
      if (Object.keys(nextExpressions).length)
        throw new Error(`actors[${index}].portraits.default: 0 与非空 expressions 无法规范化`)
      delete actor.portraits
      return
    }
    actor.portraits = {
      default: defaultAsset,
      ...(Object.keys(nextExpressions).length ? { expressions: nextExpressions } : {}),
    }
  })
  return actors as T
}

/** 旧物品 bitmap 号的纯、幂等规范化；0 正式变为无 icon 字段。 */
export function upgradeLegacyItemImages<T>(input: T): T {
  const items = cloneJson(input) as unknown
  if (!Array.isArray(items)) throw new Error('items: 期望数组')
  items.forEach((raw, index) => {
    const item = object(raw, `items[${index}]`)
    if (item.icon === undefined) return
    const asset = legacyPositiveAsset(item.icon, `items[${index}].icon`, palItemIconAssetId)
    if (asset) item.icon = asset
    else delete item.icon
  })
  return items as T
}

const DROP_STATIC_COMMAND = Symbol('drop-static-command')

/** 对话与 setActorAppearance 的旧数字立绘递归升级；输入不原地修改。 */
export function upgradeLegacyStaticImageCommands<T>(input: T): T {
  // The migration planner invokes this normalizer for every content file in three snapshots.
  // Most canonical v5 files contain no legacy static-image command at all; prove that cheaply
  // before allocating a detached copy of the whole JSON tree. The scan is conservative: any
  // potentially relevant command is sent through the existing validating rewrite below.
  const hasPotentialLegacyCommand = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(hasPotentialLegacyCommand)
    if (!value || typeof value !== 'object') return false
    const source = value as Record<string, unknown>
    if (
      source.kind === 'setActorAppearance' &&
      'portrait' in source &&
      typeof source.portrait !== 'string'
    )
      return true
    if (source.kind === 'dialog') {
      const cue = source.cue
      if (cue && typeof cue === 'object') {
        const portrait = (cue as Record<string, unknown>).portrait
        if (
          portrait &&
          typeof portrait === 'object' &&
          'icon' in portrait &&
          typeof (portrait as Record<string, unknown>).icon !== 'string'
        )
          return true
      }
    }
    return Object.values(source).some(hasPotentialLegacyCommand)
  }
  if (!hasPotentialLegacyCommand(input)) return input

  const walk = (value: unknown, where: string): unknown | typeof DROP_STATIC_COMMAND => {
    if (Array.isArray(value))
      return value.flatMap((child, index) => {
        const next = walk(child, `${where}[${index}]`)
        return next === DROP_STATIC_COMMAND ? [] : [next]
      })
    if (!value || typeof value !== 'object') return value
    const source = value as Record<string, unknown>
    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(source)) {
      const next = walk(child, `${where}.${key}`)
      if (next !== DROP_STATIC_COMMAND) output[key] = next
    }
    if (source.kind === 'dialog' && source.cue && typeof source.cue === 'object') {
      const cue = object(output.cue, `${where}.cue`)
      if (cue.portrait !== undefined) {
        const portrait = object(cue.portrait, `${where}.cue.portrait`)
        if ('icon' in portrait && 'asset' in portrait)
          throw new Error(`${where}.cue.portrait: icon 与 asset 不能并存`)
        if ('icon' in portrait) {
          const asset = legacyPositiveAsset(
            portrait.icon,
            `${where}.cue.portrait.icon`,
            requiredLegacyPortraitAssetId,
          )
          if (asset) cue.portrait = { asset, side: portrait.side }
          else delete cue.portrait
        }
      }
    }
    if (source.kind === 'setActorAppearance' && source.portrait !== undefined) {
      const asset = legacyPositiveAsset(
        source.portrait,
        `${where}.portrait`,
        requiredLegacyPortraitAssetId,
      )
      if (asset) output.portrait = asset
      else delete output.portrait
      if (
        output.spriteId === undefined &&
        output.portrait === undefined &&
        output.battleSprite === undefined
      )
        return DROP_STATIC_COMMAND
    }
    return output
  }
  const upgraded = walk(input, 'content')
  if (upgraded === DROP_STATIC_COMMAND) throw new Error('命令根不能是空形象命令')
  return upgraded as T
}

const PAL_LEGACY_BATTLE_FIELD_COUNT = 58
const PAL_FIRST_REAL_BATTLE_FIELD_ID = 6
const PAL_LAST_REAL_BATTLE_FIELD_ID = 57
const PAL_BATTLE_FIELD_ELEMENTS = ['wind', 'thunder', 'water', 'fire', 'earth'] as const

function assertLegacyPalBattleFieldPlaceholders(fields: Record<string, unknown>[]): void {
  for (let id = 0; id < PAL_FIRST_REAL_BATTLE_FIELD_ID; id++) {
    const where = `battleFields[${id}]`
    const field = fields[id]
    if (!field) throw new Error(`${where}: 缺 PAL 非战场占位`)
    exactKeys(field, ['id', 'screenWave', 'magicEffect'], where)
    if (field.screenWave !== 0) throw new Error(`${where}.screenWave: PAL 非战场占位必须为 0`)
    const magicEffect = object(field.magicEffect, `${where}.magicEffect`)
    exactKeys(magicEffect, PAL_BATTLE_FIELD_ELEMENTS, `${where}.magicEffect`)
    for (const element of PAL_BATTLE_FIELD_ELEMENTS) {
      if (magicEffect[element] !== 0)
        throw new Error(`${where}.magicEffect.${element}: PAL 非战场占位必须为 0`)
    }
  }
}

function normalizeLegacyPalBattleFields<T>(input: T, separateDomain: boolean): T {
  const fields = cloneJson(input) as unknown
  if (!Array.isArray(fields)) throw new Error('battleFields: 期望数组')
  const records = fields.map((raw, index) => {
    const field = object(raw, `battleFields[${index}]`)
    if (!Number.isInteger(field.id) || (field.id as number) < 0)
      throw new Error(`battleFields[${index}].id: 期望非负整数`)
    if ('bg' in field)
      throw new Error(
        `battleFields[${index}].bg: 旧路径无法安全推导资源；请在可写工程中重新迁移静态图像`,
      )
    if (
      field.background !== undefined &&
      (typeof field.background !== 'string' || field.background.length === 0)
    )
      throw new Error(`battleFields[${index}].background: 期望非空 AssetId`)
    if (
      field.background === undefined &&
      (field.id as number) >= PAL_FIRST_REAL_BATTLE_FIELD_ID &&
      (field.id as number) <= PAL_LAST_REAL_BATTLE_FIELD_ID
    )
      field.background = palBattleBackgroundAssetId(field.id as number)
    return field
  })
  const isCompleteLegacyPalTable =
    records.length === PAL_LEGACY_BATTLE_FIELD_COUNT &&
    records.every((field, index) => field.id === index)
  if (separateDomain && isCompleteLegacyPalTable) {
    assertLegacyPalBattleFieldPlaceholders(records)
    fields.splice(0, PAL_FIRST_REAL_BATTLE_FIELD_ID)
  }
  return fields as T
}

/**
 * PAL battle-fields 历史 canonicalizer：补齐 6-57 背景但保留原 58 槽父表。
 *
 * R13/C1 历史三值合并依赖这条 byte-stable 语义；当前领域分离必须显式调用下方 successor API。
 */
export function upgradeLegacyPalBattleFields<T>(input: T): T {
  return normalizeLegacyPalBattleFields(input, false)
}

/**
 * PAL 旧表到现代 Battlefield 域的单向分离。
 *
 * 只有完整的 PAL 58 槽旧表才会剔除已经由资产域分离的 0-5 非战场占位；任意现代/局部列表都保留
 * 显式 id（包括 id 0），避免把 PAL 的历史编号规则泄漏成通用 schema 规则。
 */
export function separateLegacyPalBattleFieldDomain<T>(input: T): T {
  return normalizeLegacyPalBattleFields(input, true)
}

/** 旧存档世界态立绘规范化；party 与 reserve 共用同一规则。 */
export function upgradeLegacyWorldPortraits<T extends WorldState>(input: T): T {
  const world = cloneJson(input)
  for (const [collection, characters] of [
    ['party', world.party],
    ['reserve', world.reserve ?? []],
  ] as const) {
    characters.forEach((character, index) => {
      const appearance = character.appearance as
        | { spriteId?: string; portrait?: unknown; battleSprite?: number }
        | undefined
      if (!appearance || appearance.portrait === undefined) return
      const asset = legacyPositiveAsset(
        appearance.portrait,
        `world.${collection}[${index}].appearance.portrait`,
        requiredLegacyPortraitAssetId,
      )
      if (asset) appearance.portrait = asset
      else delete appearance.portrait
      if (Object.keys(appearance).length === 0) delete character.appearance
    })
  }
  return world
}

function legacyFamilies(assets: Record<string, unknown>): LegacyAssetFamily[] {
  const families = new Set<LegacyAssetFamily>()
  if (assets.root !== undefined)
    for (const family of [
      'battle-sprite',
      'effect-sprite',
      'battle-background',
      'rng',
      'video',
      'image',
    ] as const)
      families.add(family)
  if (assets.tilesets !== undefined) families.add('tileset')
  if (assets.sprites !== undefined) families.add('sprite')
  if (assets.palettes !== undefined) families.add('color-table')
  if (assets.sounds !== undefined) families.add('sound')
  if (assets.portraits !== undefined) families.add('portrait')
  if (assets.faces !== undefined) families.add('face')
  if (assets.itemIcons !== undefined) families.add('item-icon')
  return [...families]
}

/**
 * v2 清单 -> v3 清单纯变换。调用方先用注入 reader/hash 建好 catalog；本函数不读文件。
 * 音乐族不会进入 legacy，旧 music 目录只允许在升级边界被消费一次。
 */
export function upgradeManifestV2ToV3(args: {
  manifest: unknown
  catalog: AssetCatalogV1
  roles?: Partial<Record<AssetRole, AssetId>>
  catalogPath?: string
}): LegacyManifestV3 {
  const raw = object(args.manifest, 'manifest') as unknown as ManifestV2
  if (raw.contentVersion !== 2) throw new Error(`manifest: 期望 contentVersion 2`)
  const oldAssets = object(raw.assets ?? {}, 'manifest.assets')
  if ('ui' in oldAssets)
    throw new Error(
      'manifest.assets.ui: 旧工程 UI 主题没有可安全升级的 slot 契约；请备份并移除该自定义后重试',
    )
  const content = { ...raw.content }
  delete content.music
  const legacy: LegacyAssetConfigV3 = {
    families: legacyFamilies(oldAssets),
    ...Object.fromEntries(
      [
        'root',
        'tilesets',
        'sprites',
        'palettes',
        'sounds',
        'portraits',
        'faces',
        'itemIcons',
        'images',
        'rng',
        'videos',
      ].flatMap((key) => (typeof oldAssets[key] === 'string' ? [[key, oldAssets[key]]] : [])),
    ),
  }
  const catalog = validateAssetCatalog(args.catalog)
  const assets = {
    catalog: args.catalogPath ?? 'assets/index.json',
    roles: { ...args.roles },
    ...(legacy.families.length ? { legacy } : {}),
  }
  validateManifestAssetConfigV3(assets, catalog)
  return {
    id: raw.id,
    name: raw.name,
    contentVersion: 3,
    entryScene: raw.entryScene,
    ...(raw.entryPoints ? { entryPoints: cloneJson(raw.entryPoints) } : {}),
    content,
    assets,
    startWorld: cloneJson(raw.startWorld),
  }
}

function upgradeLegacyPoseV3(
  raw: unknown,
  actionId: string,
  order: number,
  where: string,
): SpriteActionDef {
  const pose = object(raw, where)
  exactKeys(pose, ['frames', 'mode', 'ticksPerFrame'], where)
  if (!Array.isArray(pose.frames) || pose.frames.length === 0)
    throw new Error(`${where}.frames: 期望非空数组`)
  const frames = pose.frames.map((frame, index) =>
    nonNegativeInteger(frame, `${where}.frames[${index}]`),
  )
  if (pose.mode !== 'static' && pose.mode !== 'loop')
    throw new Error(`${where}.mode: 期望 static|loop`)
  const ticksPerFrame =
    pose.ticksPerFrame === undefined
      ? 1
      : positiveInteger(pose.ticksPerFrame, `${where}.ticksPerFrame`)
  const actionFrames = pose.mode === 'static' ? frames.slice(0, 1) : frames
  return {
    label: actionId,
    order,
    steps: actionFrames.map((frame) => ({ frame, durationMs: ticksPerFrame * 250 })),
    ...(pose.mode === 'loop' ? { loopFrom: 0 } : {}),
  }
}

/**
 * contentVersion 3 SpriteDef -> v4 动作模型的纯变换。
 *
 * 旧 static pose 的既有语义只显示 frames[0]；升级时不得把其余帧擅自解释为一次性动画。
 * 旧 layout.loop 会变成一个默认循环动作，场景页绑定由 upgradeSceneDefinitionsV3ToV4 补齐。
 */
export function upgradeSpriteDefinitionsV3ToV4(input: unknown): SpriteDefinitionsV3ToV4Result {
  if (!Array.isArray(input)) throw new Error('sprites: 期望数组')
  const legacyLayoutActions: Record<string, typeof LEGACY_LAYOUT_LOOP_ACTION_ID> = {}
  const ids = new Set<string>()
  const sprites = input.map((raw, index): SpriteDef => {
    const where = `sprites[${index}]`
    const sprite = object(raw, where)
    exactKeys(sprite, ['id', 'asset', 'label', 'layout', 'poses'], where)
    const id = nonEmptyString(sprite.id, `${where}.id`)
    if (ids.has(id)) throw new Error(`${where}.id: 重复 id ${JSON.stringify(id)}`)
    ids.add(id)
    const asset = nonEmptyString(sprite.asset, `${where}.asset`)
    if (typeof sprite.label !== 'string') throw new Error(`${where}.label: 期望 string`)

    const rawLayout = object(sprite.layout, `${where}.layout`)
    const kind = rawLayout.kind
    let layout: SpriteDef['layout']
    let legacyLoop: { frameCount: number; ticksPerFrame: number } | undefined
    if (kind === 'directional') {
      exactKeys(rawLayout, ['kind', 'framesPerDir'], `${where}.layout`)
      layout = {
        kind,
        framesPerDir: positiveInteger(rawLayout.framesPerDir, `${where}.layout.framesPerDir`),
      }
    } else if (kind === 'static') {
      exactKeys(rawLayout, ['kind'], `${where}.layout`)
      layout = { kind }
    } else if (kind === 'loop') {
      exactKeys(rawLayout, ['kind', 'frameCount', 'ticksPerFrame'], `${where}.layout`)
      legacyLoop = {
        frameCount: positiveInteger(rawLayout.frameCount, `${where}.layout.frameCount`),
        ticksPerFrame:
          rawLayout.ticksPerFrame === undefined
            ? 1
            : positiveInteger(rawLayout.ticksPerFrame, `${where}.layout.ticksPerFrame`),
      }
      layout = { kind: 'static' }
    } else {
      throw new Error(`${where}.layout.kind: 期望 directional|static|loop`)
    }

    const poses: Record<string, SpriteActionDef> = {}
    if (sprite.poses !== undefined) {
      const rawPoses = object(sprite.poses, `${where}.poses`)
      for (const [actionId, rawPose] of Object.entries(rawPoses)) {
        nonEmptyString(actionId, `${where}.poses ActionId`)
        poses[actionId] = upgradeLegacyPoseV3(
          rawPose as LegacyPoseDefV3,
          actionId,
          Object.keys(poses).length,
          `${where}.poses[${JSON.stringify(actionId)}]`,
        )
      }
    }
    if (legacyLoop) {
      if (Object.hasOwn(poses, LEGACY_LAYOUT_LOOP_ACTION_ID))
        throw new Error(
          `${where}.poses[${JSON.stringify(LEGACY_LAYOUT_LOOP_ACTION_ID)}]: 与升级器保留 ActionId 冲突`,
        )
      poses[LEGACY_LAYOUT_LOOP_ACTION_ID] = {
        label: '默认循环',
        order: Object.keys(poses).length,
        steps: Array.from({ length: legacyLoop.frameCount }, (_, frame) => ({
          frame,
          durationMs: legacyLoop.ticksPerFrame * 250,
        })),
        loopFrom: 0,
      }
      legacyLayoutActions[id] = LEGACY_LAYOUT_LOOP_ACTION_ID
    }
    return {
      id,
      asset,
      label: sprite.label,
      layout,
      ...(Object.keys(poses).length ? { poses } : {}),
    }
  })
  return { sprites, legacyLayoutActions }
}

function rejectDynamicLegacyLoopReferences(
  node: unknown,
  where: string,
  legacyLoopIds: ReadonlySet<string>,
): void {
  if (Array.isArray(node)) {
    node.forEach((child, index) => {
      rejectDynamicLegacyLoopReferences(child, `${where}[${index}]`, legacyLoopIds)
    })
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  const references: unknown[] = []
  if (record.kind === 'setActorSprite') references.push(record.sprite)
  if (record.kind === 'setActorAppearance') references.push(record.spriteId)
  if (record.kind === 'setFollowers' && Array.isArray(record.sprites))
    references.push(...record.sprites)
  for (const reference of references)
    if (typeof reference === 'string' && legacyLoopIds.has(reference))
      throw new Error(
        `${where}: 动态引用旧 layout.loop 精灵 ${JSON.stringify(reference)}，无法无损登记 EntityPage.animation；请在编辑器中人工升级`,
      )
  for (const [key, child] of Object.entries(record))
    rejectDynamicLegacyLoopReferences(child, `${where}.${key}`, legacyLoopIds)
}

/** 把旧 layout.loop 的 direct entity 消费点登记为页默认动作。 */
export function upgradeSceneDefinitionsV3ToV4(args: {
  scenes: unknown
  actors: readonly Pick<ActorDef, 'id' | 'spriteId'>[]
  legacyLayoutActions: Readonly<Record<string, typeof LEGACY_LAYOUT_LOOP_ACTION_ID>>
}): SceneDef[] {
  if (!Array.isArray(args.scenes)) throw new Error('scenes: 期望数组')
  const scenes = cloneJson(args.scenes) as unknown[]
  const legacyLoopIds = new Set(Object.keys(args.legacyLayoutActions))
  if (legacyLoopIds.size === 0) return scenes as SceneDef[]

  const actorSprites = new Map(args.actors.map((actor) => [actor.id, actor.spriteId]))
  for (const [actorId, spriteId] of actorSprites)
    if (legacyLoopIds.has(spriteId))
      throw new Error(
        `actors[${JSON.stringify(actorId)}].spriteId: 旧 layout.loop 经角色/玩家动态消费，无法无损登记实体页动作`,
      )
  rejectDynamicLegacyLoopReferences(scenes, 'scenes', legacyLoopIds)

  scenes.forEach((rawScene, sceneIndex) => {
    const scene = object(rawScene, `scenes[${sceneIndex}]`)
    if (!Array.isArray(scene.entities)) throw new Error(`scenes[${sceneIndex}].entities: 期望数组`)
    scene.entities.forEach((rawEntity, entityIndex) => {
      const entity = object(rawEntity, `scenes[${sceneIndex}].entities[${entityIndex}]`)
      const sprite = typeof entity.sprite === 'string' ? entity.sprite : undefined
      if (!sprite || !legacyLoopIds.has(sprite)) return
      const action = args.legacyLayoutActions[sprite]
      const binding = { sprite, action, loop: true as const }
      if (entity.pages === undefined) {
        entity.pages = [{ animation: binding }]
        return
      }
      if (!Array.isArray(entity.pages))
        throw new Error(`scenes[${sceneIndex}].entities[${entityIndex}].pages: 期望数组`)
      if (entity.pages.length === 0) entity.pages.push({ animation: binding })
      else
        entity.pages.forEach((rawPage, pageIndex) => {
          const page = object(
            rawPage,
            `scenes[${sceneIndex}].entities[${entityIndex}].pages[${pageIndex}]`,
          )
          if (page.animation !== undefined) {
            if (JSON.stringify(page.animation) !== JSON.stringify(binding))
              throw new Error(
                `scenes[${sceneIndex}].entities[${entityIndex}].pages[${pageIndex}].animation: 与旧 layout.loop 升级目标冲突`,
              )
          } else page.animation = binding
        })
    })
  })
  return scenes as SceneDef[]
}

/** 清单版本只在 sprites/scenes 已成功升级并落盘后最后提交。 */
export function upgradeManifestV3ToV4(manifest: unknown): LoadedManifest {
  const raw = object(manifest, 'manifest')
  if (raw.contentVersion !== 3) throw new Error('manifest: 期望 contentVersion 3')
  return { ...(cloneJson(raw) as unknown as LegacyManifestV3), contentVersion: 4 }
}

function numericTrack(value: unknown): number | undefined {
  const track = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(track) ? track : undefined
}

/** 递归升级场景、脚本 chunk、敌人编舞中的旧音乐字段；输入不原地修改。 */
export function upgradeV2MusicReferences<T>(input: T): T {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk)
    if (!value || typeof value !== 'object') return value
    const source = value as Record<string, unknown>
    if (source.kind === 'playMusic' && 'musicId' in source) {
      const track = numericTrack(source.musicId)
      if (track === undefined) throw new Error(`playMusic.musicId: 期望整数`)
      const rest = Object.fromEntries(
        Object.entries(source).filter(([key]) => key !== 'musicId' && key !== 'kind'),
      )
      return track <= 0
        ? {
            ...Object.fromEntries(Object.entries(rest).map(([key, child]) => [key, walk(child)])),
            kind: 'stopMusic',
          }
        : {
            ...Object.fromEntries(Object.entries(rest).map(([key, child]) => [key, walk(child)])),
            kind: 'playMusic',
            asset: palMusicAssetId(track),
          }
    }
    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(source)) {
      if (key === 'musicId' || key === 'battleMusicId') continue
      output[key] = walk(child)
    }
    if (source.kind === 'startBattle' && 'musicId' in source) {
      const track = numericTrack(source.musicId)
      if (track === undefined) throw new Error(`startBattle.musicId: 期望整数`)
      output.music = track <= 0 ? null : palMusicAssetId(track)
    } else if ('musicId' in source) {
      const track = numericTrack(source.musicId)
      if (track === undefined) throw new Error(`musicId: 期望整数`)
      output.music = track <= 0 ? null : palMusicAssetId(track)
    }
    if ('battleMusicId' in source) {
      const track = numericTrack(source.battleMusicId)
      if (track === undefined) throw new Error(`battleMusicId: 期望整数`)
      output.battleMusic = track <= 0 ? null : palMusicAssetId(track)
    }
    return output
  }
  return walk(input) as T
}

/** 旧 music.json 的作者别名合并进 catalog label；无别名条目不制造第二份数据。 */
export function applyV2MusicLabels(catalog: AssetCatalogV1, legacyMusic: unknown): AssetCatalogV1 {
  const next = cloneJson(validateAssetCatalog(catalog))
  if (!Array.isArray(legacyMusic)) throw new Error('content/music.json: 期望数组')
  for (const [index, raw] of legacyMusic.entries()) {
    const entry = object(raw, `content/music.json[${index}]`)
    const track = numericTrack(entry.id)
    if (track === undefined || track <= 0)
      throw new Error(`content/music.json[${index}].id: 期望正整数`)
    const record = next.assets[palMusicAssetId(track)]
    if (!record) throw new Error(`旧音乐 ${track} 在 catalog 中无对应 AssetId`)
    if (entry.name !== undefined) {
      if (typeof entry.name !== 'string')
        throw new Error(`content/music.json[${index}].name: 期望字符串`)
      record.label = entry.name
    }
  }
  return next
}

export type LegacySoundAssetResolver = (legacyId: number) => AssetId | undefined

function legacySoundAsset(
  value: unknown,
  resolveSound: LegacySoundAssetResolver,
  where: string,
): AssetId | undefined {
  if (typeof value === 'string') return value
  if (!Number.isInteger(value)) throw new Error(`${where}: 期望整数或 AssetId`)
  const legacy = value as number
  if (legacy === 0) return undefined
  const id = Math.abs(legacy)
  const asset = resolveSound(id)
  if (!asset && id !== 122) throw new Error(`${where}: 旧音效 ${id} 没有可迁移 WAV`)
  return asset
}

const DROP_COMMAND = Symbol('drop-command')

/** 递归升级场景、chunk 与敌人编舞中的 playSound；已知空槽 122 还原为无命令。 */
export function upgradeLegacySoundCommands<T>(input: T, resolveSound: LegacySoundAssetResolver): T {
  const walk = (value: unknown, where: string): unknown | typeof DROP_COMMAND => {
    if (Array.isArray(value))
      return value.flatMap((child, index) => {
        const next = walk(child, `${where}[${index}]`)
        return next === DROP_COMMAND ? [] : [next]
      })
    if (!value || typeof value !== 'object') return value
    const source = value as Record<string, unknown>
    if (source.kind === 'playSound' && 'soundId' in source) {
      const asset = legacySoundAsset(source.soundId, resolveSound, `${where}.soundId`)
      if (!asset) return DROP_COMMAND
      const output: Record<string, unknown> = { kind: 'playSound', asset }
      for (const [key, child] of Object.entries(source)) {
        if (key === 'kind' || key === 'soundId') continue
        const next = walk(child, `${where}.${key}`)
        if (next !== DROP_COMMAND) output[key] = next
      }
      return output
    }
    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(source)) {
      const next = walk(child, `${where}.${key}`)
      if (next !== DROP_COMMAND) output[key] = next
    }
    return output
  }
  const upgraded = walk(input, 'commands')
  if (upgraded === DROP_COMMAND) throw new Error('命令根不能是空音效命令')
  return upgraded as T
}

const ACTOR_SOUND_FIELDS = [
  'attack',
  'critical',
  'weapon',
  'magic',
  'cover',
  'dying',
  'death',
] as const
const ENEMY_SOUND_FIELDS = ['attack', 'action', 'magic', 'death', 'call'] as const

function upgradeSoundObject(
  sounds: Record<string, unknown>,
  fields: readonly string[],
  resolveSound: LegacySoundAssetResolver,
  where: string,
): void {
  for (const field of fields) {
    if (!(field in sounds)) continue
    const asset = legacySoundAsset(sounds[field], resolveSound, `${where}.${field}`)
    if (asset) sounds[field] = asset
    else delete sounds[field]
  }
}

export function upgradeLegacyActorSounds<T>(input: T, resolveSound: LegacySoundAssetResolver): T {
  const actors = cloneJson(input) as unknown
  if (!Array.isArray(actors)) throw new Error('actors: 期望数组')
  actors.forEach((raw, index) => {
    const actor = object(raw, `actors[${index}]`)
    if (actor.battler === undefined) return
    const battler = object(actor.battler, `actors[${index}].battler`)
    if (battler.sounds === undefined) return
    upgradeSoundObject(
      object(battler.sounds, `actors[${index}].battler.sounds`),
      ACTOR_SOUND_FIELDS,
      resolveSound,
      `actors[${index}].battler.sounds`,
    )
  })
  return actors as T
}

export function upgradeLegacyEnemySounds<T>(input: T, resolveSound: LegacySoundAssetResolver): T {
  const enemies = cloneJson(input) as unknown
  if (!Array.isArray(enemies)) throw new Error('enemies: 期望数组')
  enemies.forEach((raw, index) => {
    const enemy = object(raw, `enemies[${index}]`)
    const sounds = object(enemy.sounds, `enemies[${index}].sounds`)
    const legacyMagic = sounds.magic
    upgradeSoundObject(sounds, ENEMY_SOUND_FIELDS, resolveSound, `enemies[${index}].sounds`)
    if (typeof legacyMagic === 'number' && legacyMagic < 0) sounds.suppressMagicEffectSound = true
  })
  return enemies as T
}

export function upgradeLegacySkillSounds<T>(input: T, resolveSound: LegacySoundAssetResolver): T {
  const root = cloneJson(input) as unknown
  const skills = object(root, 'skills')
  if (!Array.isArray(skills.skills)) throw new Error('skills.skills: 期望数组')
  skills.skills.forEach((raw, index) => {
    const skill = object(raw, `skills.skills[${index}]`)
    const animation = object(skill.animation, `skills.skills[${index}].animation`)
    if ('sound' in animation) {
      const asset = legacySoundAsset(
        animation.sound,
        resolveSound,
        `skills.skills[${index}].animation.sound`,
      )
      if (asset) animation.sound = asset
      else delete animation.sound
    }
    if (!Array.isArray(skill.effects)) throw new Error(`skills.skills[${index}].effects: 期望数组`)
    skill.effects.forEach((rawEffect, effectIndex) => {
      const effect = object(rawEffect, `skills.skills[${index}].effects[${effectIndex}]`)
      if (effect.kind !== 'summon' || !('sound' in effect)) return
      const asset = legacySoundAsset(
        effect.sound,
        resolveSound,
        `skills.skills[${index}].effects[${effectIndex}].sound`,
      )
      if (asset) effect.sound = asset
      else delete effect.sound
    })
  })
  return root as T
}

export function upgradeLegacyItemSounds<T>(input: T, resolveSound: LegacySoundAssetResolver): T {
  const items = cloneJson(input) as unknown
  if (!Array.isArray(items)) throw new Error('items: 期望数组')
  items.forEach((raw, index) => {
    const item = object(raw, `items[${index}]`)
    for (const field of ['use', 'throw'] as const) {
      if (item[field] === undefined) continue
      const spec = object(item[field], `items[${index}].${field}`)
      if (!('sound' in spec)) continue
      const asset = legacySoundAsset(spec.sound, resolveSound, `items[${index}].${field}.sound`)
      if (asset) spec.sound = asset
      else delete spec.sound
    }
  })
  return items as T
}

/** 只退出 sound family；调用方负责先建好 catalog 和二进制，再把此 manifest 最后落盘。 */
export function exitLegacySoundFamily<V extends number>(args: {
  manifest: ProjectManifest<V>
  roles?: Partial<Record<AssetRole, AssetId>>
  catalog?: AssetCatalogV1
}): ProjectManifest<V> {
  const next = cloneJson(args.manifest)
  next.assets.roles = { ...args.roles, ...args.manifest.assets.roles }
  if (args.manifest.assets.legacy) {
    const { sounds: _retiredSounds, ...legacy } = args.manifest.assets.legacy
    next.assets.legacy = {
      ...legacy,
      families: args.manifest.assets.legacy.families.filter((family) => family !== 'sound'),
    }
  }
  validateManifestAssetConfigV3(next.assets, args.catalog, '升级后 manifest.assets')
  return next
}
