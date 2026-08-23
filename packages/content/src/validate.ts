// 轻量 guard(zod 接缝):校验 loader 加载的工程 JSON 形状。
// 只查「数组/对象 + 必需键在 + id 是 string」,不齐就 throw 具体错误。
// 编辑器产大量手改 JSON 时再上 zod(局部替换这些函数,签名不变)。

import {
  checkBattleChoreography,
  checkEnemyAi,
  checkEnemyOnDefeatedCommands,
} from './enemy-script.js'
import type {
  ActorDef,
  AssetCatalogV1,
  BattleFieldDef,
  EnemyDef,
  ItemData,
  SceneDef,
  SkillData,
  SpriteDef,
  CurrentManifest,
  EntryPoint,
  StartWorld,
} from './index.js'
import type { ItemUseEffect, ThrowEffect } from './item.js'
import { ITEM_USE_EFFECT_KINDS, itemUseSupportsContext, THROW_EFFECT_KINDS } from './item.js'
import type { AuthorItemCore, AuthorItemUseEffect } from './author-item-core.js'
import { AUTHOR_ITEM_USE_EFFECT_KINDS, authorItemUseSupportsContext } from './author-item-core.js'
import { isMapAssetId } from './map-index.js'
import type { BaseSceneDef } from './scene-core.js'
import { checkEntityPages, checkStages } from './script.js'
import { checkScriptRef } from './script-library.js'
import {
  checkBaseAuthorCommands,
  checkEntityAddress,
  checkBaseEntityBehaviors,
  checkBaseEntityPages,
  checkBaseSceneHooks,
  type CommandValidationOptions,
} from './author-script-core.js'
import { ENEMY_RUNTIME_SKILL_EFFECT_KINDS } from './skill.js'
import { CONTENT_VERSION, CURRENT_PROJECT_MINIMUM_SAVE_VERSION } from './character.js'
import { validateManifestAssetConfig } from './asset.js'

/** 显式要求的对象键;缺任一 throw。 */
function requireKeys(obj: object, keys: readonly string[], ctx: string): void {
  for (const k of keys) {
    if (!(k in obj)) throw new Error(`${ctx}: 缺键 "${k}"`)
  }
}

function requireOnlyKeys(obj: object, keys: readonly string[], ctx: string): void {
  const allowed = new Set(keys)
  for (const key of Object.keys(obj))
    if (!allowed.has(key)) throw new Error(`${ctx}.${key}: 未知字段`)
}

function assertArray<T>(x: unknown, ctx: string): T[] {
  if (!Array.isArray(x)) throw new Error(`${ctx}: 期望数组`)
  return x as T[]
}

function assertObject(x: unknown, ctx: string): object {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) throw new Error(`${ctx}: 期望对象`)
  return x as object
}

function assertNever(value: never, ctx: string): never {
  throw new Error(`${ctx}: 未处理的判别值 ${String(value)}`)
}

/** manifest/入口点共用的资源池边界；collectValue 保持历史专用字段，禁止双份真相。 */
export function validateStartWorldResources(startWorld: unknown, ctx = 'startWorld'): void {
  const world = assertObject(startWorld, ctx) as Partial<StartWorld> & {
    resources?: unknown
  }
  if (world.resources === undefined) return
  const resources = assertObject(world.resources, `${ctx}.resources`) as Record<string, unknown>
  for (const [key, value] of Object.entries(resources)) {
    if (key.trim().length === 0) throw new Error(`${ctx}.resources: 资源键不能为空`)
    if (key !== key.trim()) throw new Error(`${ctx}.resources.${key}: 资源键不得包含首尾空格`)
    if (key === 'collectValue')
      throw new Error(`${ctx}.resources.collectValue: 保留资源必须使用专用世界字段`)
    if (!Number.isSafeInteger(value) || Number(value) < 0)
      throw new Error(`${ctx}.resources.${key}: 必须是非负安全整数`)
  }
}

/** 当前 canonical 入口世界的完整形状；不做跨表引用检查。 */
export function validateStartWorld(startWorld: unknown, ctx = 'startWorld'): StartWorld {
  const world = assertObject(startWorld, ctx) as Record<string, unknown>
  requireKeys(world, ['party', 'money', 'learnedSkills', 'inventory'], ctx)
  requireOnlyKeys(
    world,
    ['party', 'money', 'learnedSkills', 'inventory', 'resources', 'seedStats'],
    ctx,
  )

  const party = assertArray<unknown>(world.party, `${ctx}.party`)
  party.forEach((actorId, index) => {
    if (typeof actorId !== 'string' || actorId.trim().length === 0)
      throw new Error(`${ctx}.party[${index}]: 期望非空角色 id`)
  })
  if (!Number.isSafeInteger(world.money) || Number(world.money) < 0)
    throw new Error(`${ctx}.money: 必须是非负安全整数`)

  const learnedSkills = assertObject(
    world.learnedSkills,
    `${ctx}.learnedSkills`,
  ) as Record<string, unknown>
  for (const [actorId, rawSkills] of Object.entries(learnedSkills)) {
    if (actorId.trim().length === 0) throw new Error(`${ctx}.learnedSkills: 角色 id 不能为空`)
    const skills = assertArray<unknown>(rawSkills, `${ctx}.learnedSkills.${actorId}`)
    skills.forEach((skillId, index) => {
      if (typeof skillId !== 'string' || skillId.trim().length === 0)
        throw new Error(`${ctx}.learnedSkills.${actorId}[${index}]: 期望非空技能 id`)
    })
  }

  const inventory = assertArray<unknown>(world.inventory, `${ctx}.inventory`)
  inventory.forEach((rawEntry, index) => {
    const entry = assertObject(rawEntry, `${ctx}.inventory[${index}]`) as Record<string, unknown>
    requireKeys(entry, ['itemId', 'count'], `${ctx}.inventory[${index}]`)
    requireOnlyKeys(entry, ['itemId', 'count'], `${ctx}.inventory[${index}]`)
    if (typeof entry.itemId !== 'string' || entry.itemId.trim().length === 0)
      throw new Error(`${ctx}.inventory[${index}].itemId: 期望非空物品 id`)
    if (!Number.isSafeInteger(entry.count) || Number(entry.count) < 0)
      throw new Error(`${ctx}.inventory[${index}].count: 必须是非负安全整数`)
  })

  if (world.seedStats !== undefined) {
    const seedStats = assertObject(world.seedStats, `${ctx}.seedStats`) as Record<string, unknown>
    for (const [actorId, rawStats] of Object.entries(seedStats)) {
      if (actorId.trim().length === 0) throw new Error(`${ctx}.seedStats: 角色 id 不能为空`)
      const stats = assertObject(rawStats, `${ctx}.seedStats.${actorId}`) as Record<string, unknown>
      requireOnlyKeys(stats, ['hp', 'mp'], `${ctx}.seedStats.${actorId}`)
      for (const key of ['hp', 'mp'] as const) {
        const value = stats[key]
        if (value !== undefined && (!Number.isSafeInteger(value) || Number(value) < 0))
          throw new Error(`${ctx}.seedStats.${actorId}.${key}: 必须是非负安全整数`)
      }
    }
  }

  validateStartWorldResources(world, ctx)
  return world as unknown as StartWorld
}

/**
 * 校验 current manifest 的唯一启动模型并返回直接启动入口。
 * 入口场景索引若传入，会同时验证所有入口，而不是只验证默认项。
 */
export function validateCurrentManifestStartup(
  manifest: unknown,
  sceneIds?: readonly string[],
  ctx = 'manifest',
): { manifest: CurrentManifest; defaultEntry: EntryPoint } {
  const value = assertObject(manifest, ctx) as Record<string, unknown>
  requireKeys(
    value,
    [
      'id',
      'name',
      'contentVersion',
      'defaultEntryId',
      'entryPoints',
      'content',
      'assets',
      'minimumSaveVersion',
    ],
    ctx,
  )
  requireOnlyKeys(
    value,
    [
      'id',
      'name',
      'contentVersion',
      'defaultEntryId',
      'entryPoints',
      'content',
      'assets',
      'minimumSaveVersion',
    ],
    ctx,
  )
  for (const key of ['id', 'name', 'defaultEntryId'] as const)
    if (typeof value[key] !== 'string' || value[key].trim().length === 0)
      throw new Error(`${ctx}.${key}: 期望非空 string`)
  if (value.contentVersion !== CONTENT_VERSION)
    throw new Error(`${ctx}.contentVersion: 期望 ${CONTENT_VERSION}`)
  if (value.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(`${ctx}.minimumSaveVersion: 期望 ${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}`)
  const content = assertObject(value.content, `${ctx}.content`) as Record<string, unknown>
  for (const [key, path] of Object.entries(content)) {
    if (key.trim().length === 0) throw new Error(`${ctx}.content: 内容键不能为空`)
    if (typeof path !== 'string' || path.trim().length === 0)
      throw new Error(`${ctx}.content.${key}: 期望非空工程相对路径`)
  }
  validateManifestAssetConfig(value.assets, undefined, `${ctx}.assets`)

  const entries = assertArray<unknown>(value.entryPoints, `${ctx}.entryPoints`)
  if (entries.length === 0) throw new Error(`${ctx}.entryPoints: 至少需要一个真实入口`)
  const seen = new Set<string>()
  const canonicalEntries = entries.map((rawEntry, index): EntryPoint => {
    const indexCtx = `${ctx}.entryPoints[${index}]`
    const entry = assertObject(rawEntry, indexCtx) as Record<string, unknown>
    requireKeys(entry, ['id', 'label', 'scene', 'startWorld'], indexCtx)
    if (typeof entry.id !== 'string' || entry.id.trim().length === 0)
      throw new Error(`${indexCtx}.id: 期望非空 string`)
    if (entry.id !== entry.id.trim()) throw new Error(`${indexCtx}.id: 不得包含首尾空格`)
    const id = entry.id
    if (seen.has(id)) throw new Error(`${indexCtx}.id: 入口 id "${id}" 重复`)
    seen.add(id)
    const entryCtx = `${ctx}.entryPoints[${id}]`
    requireOnlyKeys(entry, ['id', 'label', 'scene', 'introVideo', 'startWorld'], entryCtx)
    for (const key of ['label', 'scene'] as const)
      if (typeof entry[key] !== 'string' || entry[key].trim().length === 0)
        throw new Error(`${entryCtx}.${key}: 期望非空 string`)
    for (const key of ['label', 'scene'] as const)
      if ((entry[key] as string) !== (entry[key] as string).trim())
        throw new Error(`${entryCtx}.${key}: 不得包含首尾空格`)
    if (entry.introVideo !== undefined && (typeof entry.introVideo !== 'string' || !entry.introVideo))
      throw new Error(`${entryCtx}.introVideo: 期望非空 AssetId`)
    if (sceneIds && !sceneIds.includes(entry.scene as string))
      throw new Error(`${entryCtx}.scene: 场景 "${String(entry.scene)}" 不在 scenes/index.json`)
    return {
      id,
      label: entry.label as string,
      scene: entry.scene as string,
      ...(entry.introVideo === undefined ? {} : { introVideo: entry.introVideo as string }),
      startWorld: validateStartWorld(entry.startWorld, `${entryCtx}.startWorld`),
    }
  })
  const defaultEntry = canonicalEntries.find((entry) => entry.id === value.defaultEntryId)
  if (!defaultEntry)
    throw new Error(`${ctx}.defaultEntryId: 入口 "${String(value.defaultEntryId)}" 不存在`)
  return { manifest: value as unknown as CurrentManifest, defaultEntry }
}

function validateOptionalAssetId(record: Record<string, unknown>, key: string, ctx: string): void {
  const value = record[key]
  if (value !== undefined && (typeof value !== 'string' || value.length === 0))
    throw new Error(`${ctx}.${key}: 期望非空 AssetId`)
}

function validateSoundFields(
  value: unknown,
  fields: readonly string[],
  ctx: string,
): Record<string, unknown> {
  const sounds = assertObject(value, ctx) as Record<string, unknown>
  for (const field of fields) validateOptionalAssetId(sounds, field, ctx)
  return sounds
}

function validateGridPos(x: unknown, ctx: string): void {
  const pos = assertObject(x, ctx) as { col?: unknown; row?: unknown; height?: unknown }
  requireKeys(pos, ['col', 'row', 'height'], ctx)
  for (const key of ['col', 'row', 'height'] as const) {
    if (typeof pos[key] !== 'number' || !Number.isFinite(pos[key]))
      throw new Error(`${ctx}.${key}: 期望有限数`)
  }
}

function validateFacing(x: unknown, ctx: string): void {
  if (x !== 'up' && x !== 'down' && x !== 'left' && x !== 'right')
    throw new Error(`${ctx}: 期望 up/down/left/right`)
}

function validateSceneArray(json: unknown): SceneDef[] {
  const arr = assertArray<SceneDef>(json, 'scenes')
  arr.forEach((s, i) => {
    const o = assertObject(s, `scenes[${i}]`)
    requireKeys(o, ['id', 'mapId', 'entry', 'entities'], `scenes[${i}]`)
    if (typeof (s as { id: unknown }).id !== 'string') throw new Error(`scenes[${i}]: id 非string`)
    if (!isMapAssetId((s as { mapId: unknown }).mapId))
      throw new Error(`scenes[${i}].mapId: 期望合法稳定地图 id`)
    const entry = assertObject((s as { entry: unknown }).entry, `scenes[${i}].entry`) as {
      pos?: unknown
      facing?: unknown
    }
    requireKeys(entry, ['pos', 'facing'], `scenes[${i}].entry`)
    validateGridPos(entry.pos, `scenes[${i}].entry.pos`)
    validateFacing(entry.facing, `scenes[${i}].entry.facing`)
    const namedEntries = (s as { entries?: unknown }).entries
    if (namedEntries !== undefined) {
      const record = assertObject(namedEntries, `scenes[${i}].entries`) as Record<string, unknown>
      for (const [entryId, value] of Object.entries(record)) {
        if (!entryId) throw new Error(`scenes[${i}].entries: 命名落点 id 不能为空`)
        const named = assertObject(value, `scenes[${i}].entries.${entryId}`) as {
          label?: unknown
          pos?: unknown
          facing?: unknown
        }
        requireKeys(named, ['pos'], `scenes[${i}].entries.${entryId}`)
        if (named.label !== undefined && typeof named.label !== 'string')
          throw new Error(`scenes[${i}].entries.${entryId}.label: 期望 string`)
        validateGridPos(named.pos, `scenes[${i}].entries.${entryId}.pos`)
        if (named.facing !== undefined)
          validateFacing(named.facing, `scenes[${i}].entries.${entryId}.facing`)
      }
    }
    // (paletteId 字段已退役 W7a-3:只留盘 0,校验一并去)
    // 实体引用:actor ⊕ sprite 恰一(C0;都有/都无 → 数据错)。
    const ents = (s as { entities: unknown }).entities
    if (!Array.isArray(ents)) throw new Error(`scenes[${i}].entities: 期望数组`)
    ents.forEach((e, j) => {
      const eo = assertObject(e, `scenes[${i}].entities[${j}]`)
      requireKeys(eo, ['id', 'pos'], `scenes[${i}].entities[${j}]`)
      const refs = ['actor', 'sprite', 'zone'].filter((k) => k in eo).length
      if (refs !== 1)
        throw new Error(`scenes[${i}].entities[${j}]: 须恰有 actor/sprite/zone 之一(现 ${refs} 个)`)
      if ('zone' in eo && 'facing' in eo)
        throw new Error(`scenes[${i}].entities[${j}].facing: zone 无朝向`)
      if (!('zone' in eo) && 'facing' in eo)
        validateFacing(eo.facing, `scenes[${i}].entities[${j}].facing`)
      // M3:行为页(可选)形状检查
      if ('pages' in eo && (eo as { pages?: unknown }).pages !== undefined)
        checkEntityPages((eo as { pages: unknown }).pages, `scenes[${i}].entities[${j}].pages`)
    })
    // M3:进场脚本(可选)
    if ('onEnter' in o && (o as { onEnter?: unknown }).onEnter !== undefined)
      checkStages((o as { onEnter: unknown }).onEnter, `scenes[${i}].onEnter`, {
        allowSceneEntry: true,
      })
    if ('onTeleport' in o && (o as { onTeleport?: unknown }).onTeleport !== undefined)
      checkStages((o as { onTeleport: unknown }).onTeleport, `scenes[${i}].onTeleport`)
  })
  return arr
}

export function validateScenes(json: unknown): SceneDef[] {
  return validateSceneArray(json)
}

/** 当前场景共享形状 guard；脚本命令方言由调用方显式注入。 */
export function validateBaseScenes(
  json: unknown,
  options: CommandValidationOptions = {},
): BaseSceneDef[] {
  const arr = assertArray<BaseSceneDef>(json, 'scenes')
  arr.forEach((scene, sceneIndex) => {
    const scenePath = `scenes[${sceneIndex}]`
    const sceneRecord = assertObject(scene, scenePath) as Record<string, unknown>
    if ('onEnter' in sceneRecord) throw new Error(`${scenePath}.onEnter: current 作者态脚本必须位于 hooks.onEnter`)
    if ('onTeleport' in sceneRecord)
      throw new Error(`${scenePath}.onTeleport: current 作者态脚本必须位于 hooks.onTeleport`)
    checkBaseSceneHooks(sceneRecord.hooks, `${scenePath}.hooks`, options)

    const entities = assertArray<Record<string, unknown>>(
      sceneRecord.entities,
      `${scenePath}.entities`,
    )
    entities.forEach((entity, entityIndex) => {
      const entityPath = `${scenePath}.entities[${entityIndex}]`
      const entityRecord = assertObject(entity, entityPath) as Record<string, unknown>
      const hasPages = entityRecord.pages !== undefined
      if (hasPages)
        checkBaseEntityPages(
          entityRecord.pages,
          entityRecord.behaviors,
          entityRecord.initialPage,
          entityPath,
          options,
        )
      else {
        if (entityRecord.initialPage !== undefined)
          throw new Error(`${entityPath}.initialPage: 必须与非空 pages 一起声明`)
        if (entityRecord.behaviors !== undefined)
          checkBaseEntityBehaviors(entityRecord.behaviors, entityPath, options)
      }

      if (entityRecord.hostile !== undefined) {
        const hostile = assertObject(entityRecord.hostile, `${entityPath}.hostile`) as Record<
          string,
          unknown
        >
        if (hostile.onLose !== undefined && hostile.onLose !== 'gameOver')
          checkBaseAuthorCommands(hostile.onLose, `${entityPath}.hostile.onLose`, options)
      }
    })
  })

  // 复用稳定的场景空间/资源字段 guard；当前作者行为字段已在上方独立验证。
  const spatialOnly = arr.map((scene) => {
    const { hooks: _hooks, ...base } = scene
    return {
      ...base,
      entities: scene.entities.map((entity) => {
        const {
          behaviors: _behaviors,
          initialPage: _initialPage,
          pages: _pages,
          hostile,
          ...entityBase
        } = entity
        return {
          ...entityBase,
          ...(hostile === undefined
            ? {}
            : {
                hostile: {
                  ...hostile,
                  onLose: hostile.onLose === 'gameOver' ? 'gameOver' : undefined,
                },
              }),
        }
      }),
    }
  })
  validateSceneArray(spatialOnly)
  return arr
}

/** 角色定义形状校验:id/name/spriteId 必为 string;battler 若在,查三块必需键。 */
export function validateActors(json: unknown): ActorDef[] {
  const arr = assertArray<ActorDef>(json, 'actors')
  arr.forEach((a, i) => {
    const o = assertObject(a, `actors[${i}]`)
    requireKeys(o, ['id', 'name', 'spriteId'], `actors[${i}]`)
    const rec = a as unknown as Record<string, unknown>
    for (const k of ['id', 'name', 'spriteId'] as const) {
      if (typeof rec[k] !== 'string') throw new Error(`actors[${i}]: ${k} 非string`)
    }
    validateOptionalAssetId(rec, 'face', `actors[${i}]`)
    if (rec.portraits !== undefined) {
      const portraits = assertObject(rec.portraits, `actors[${i}].portraits`) as Record<
        string,
        unknown
      >
      requireKeys(portraits, ['default'], `actors[${i}].portraits`)
      validateOptionalAssetId(portraits, 'default', `actors[${i}].portraits`)
      if (portraits.expressions !== undefined) {
        const expressions = assertObject(
          portraits.expressions,
          `actors[${i}].portraits.expressions`,
        ) as Record<string, unknown>
        for (const [expression, asset] of Object.entries(expressions)) {
          if (expression.length === 0)
            throw new Error(`actors[${i}].portraits.expressions: 表情名不能为空`)
          if (typeof asset !== 'string' || asset.length === 0)
            throw new Error(
              `actors[${i}].portraits.expressions[${JSON.stringify(expression)}]: 期望非空 AssetId`,
            )
        }
      }
    }
    const battler = (a as { battler?: unknown }).battler
    if (battler !== undefined) {
      const bo = assertObject(battler, `actors[${i}].battler`) as Record<string, unknown>
      requireKeys(
        bo,
        ['baseStats', 'initialEquipment', 'initialMagic', 'battleSprite'],
        `actors[${i}].battler`,
      )
      if ('battleSpriteNum' in bo || 'battleSpritePath' in bo)
        throw new Error(`actors[${i}].battler: 旧 battleSpriteNum/battleSpritePath 已退役`)
      if (typeof bo.battleSprite !== 'string' || bo.battleSprite.length === 0)
        throw new Error(`actors[${i}].battler.battleSprite: 期望非空 BattleSpriteDef.id`)
      if (bo.sounds !== undefined)
        validateSoundFields(
          bo.sounds,
          ['attack', 'critical', 'weapon', 'magic', 'cover', 'dying', 'death'],
          `actors[${i}].battler.sounds`,
        )
      // E18-1(K2):三字段结构校验——coveredBy/cooperativeMagic 非空字符串;casualty 两层形状。
      if (bo.coveredBy !== undefined) {
        if (typeof bo.coveredBy !== 'string' || bo.coveredBy.length === 0)
          throw new Error(`actors[${i}].battler.coveredBy: 期望非空 actor id`)
      }
      if (bo.cooperativeMagicSkillId !== undefined) {
        if (
          typeof bo.cooperativeMagicSkillId !== 'string' ||
          bo.cooperativeMagicSkillId.length === 0
        )
          throw new Error(`actors[${i}].battler.cooperativeMagicSkillId: 期望非空 skill id`)
      }
      if (bo.casualty !== undefined)
        validateCasualtyShape(bo.casualty, `actors[${i}].battler.casualty`)
    }
  })
  return arr
}

/** E18-1(K2):casualty 结构校验(fail-closed)——gates 数组、chance∈[1,100] 整数、
 *  style 枚举、effect kind 判别、tempStatBuff.percent 整数 ≥1。 */
function validateCasualtyShape(json: unknown, path: string): void {
  const o = assertObject(json, path) as Record<string, unknown>
  for (const slot of ['friendDeath', 'dying'] as const) {
    if (o[slot] === undefined) continue
    const script = assertObject(o[slot], `${path}.${slot}`) as Record<string, unknown>
    const gates = assertArray(script.gates, `${path}.${slot}.gates`)
    gates.forEach((g, gi) => {
      const gate = assertObject(g, `${path}.${slot}.gates[${gi}]`) as Record<string, unknown>
      if (
        !Number.isInteger(gate.chance) ||
        (gate.chance as number) < 1 ||
        (gate.chance as number) > 100
      )
        throw new Error(
          `${path}.${slot}.gates[${gi}].chance: 期望整数 ∈[1,100]（原版 0x06 概率门 r∈[1,100] r≥chance）`,
        )
      validateCasualtyBranch(gate.branch, `${path}.${slot}.gates[${gi}].branch`)
    })
    validateCasualtyBranch(script.fallback, `${path}.${slot}.fallback`)
  }
}

function validateCasualtyBranch(json: unknown, path: string): void {
  const o = assertObject(json, path) as Record<string, unknown>
  const lines = assertArray(o.lines, `${path}.lines`)
  lines.forEach((line, li) => {
    const lo = assertObject(line, `${path}.lines[${li}]`) as Record<string, unknown>
    if (typeof lo.text !== 'string' || lo.text.length === 0)
      throw new Error(`${path}.lines[${li}].text: 期望非空 TextId`)
    if (lo.style !== 'bottom' && lo.style !== 'top' && lo.style !== 'narration')
      throw new Error(`${path}.lines[${li}].style: 期望 bottom|top|narration`)
  })
  const effects = assertArray(o.effects, `${path}.effects`)
  effects.forEach((eff, ei) => {
    const eo = assertObject(eff, `${path}.effects[${ei}]`) as Record<string, unknown>
    if (eo.kind === 'heal') {
      if (eo.resource !== 'hp' && eo.resource !== 'mp')
        throw new Error(`${path}.effects[${ei}].resource: 期望 hp|mp`)
    } else if (eo.kind === 'tempStatBuff') {
      if (eo.stat !== 'attack' && eo.stat !== 'magic' && eo.stat !== 'speed' && eo.stat !== 'luck')
        throw new Error(`${path}.effects[${ei}].stat: 期望 attack|magic|speed|luck`)
      if (!Number.isInteger(eo.percent) || (eo.percent as number) < 1)
        throw new Error(`${path}.effects[${ei}].percent: 期望整数 ≥1`)
    } else {
      throw new Error(`${path}.effects[${ei}].kind: 期望 heal|tempStatBuff`)
    }
  })
}

export function validateSkills(json: unknown): {
  skills: SkillData[]
  levelUp: Record<string, unknown>
} {
  const enemyRuntimeEffectKinds = new Set<string>(ENEMY_RUNTIME_SKILL_EFFECT_KINDS)
  const o = assertObject(json, 'skills')
  requireKeys(o, ['skills', 'levelUp'], 'skills')
  const skills = assertArray<SkillData>((json as { skills: unknown }).skills, 'skills.skills')
  skills.forEach((s, i) => {
    const so = assertObject(s, `skills.skills[${i}]`) as Record<string, unknown>
    requireKeys(so, ['id', 'name', 'cost', 'target', 'effects', 'animation'], `skills.skills[${i}]`)
    if (so.lifetimeLimit !== undefined) {
      const lifetimeLimit = requireSafeInteger(
        so.lifetimeLimit,
        `skills.skills[${i}].lifetimeLimit`,
      )
      if (lifetimeLimit <= 0) throw new Error(`skills.skills[${i}].lifetimeLimit: 期望正整数`)
    }
    const cost = assertObject(so.cost, `skills.skills[${i}].cost`) as Record<string, unknown>
    if (cost.items !== undefined) {
      const items = assertArray<Record<string, unknown>>(
        cost.items,
        `skills.skills[${i}].cost.items`,
      )
      items.forEach((entry, itemIndex) => {
        const where = `skills.skills[${i}].cost.items[${itemIndex}]`
        const itemCost = assertObject(entry, where) as Record<string, unknown>
        requireOnlyKeys(itemCost, ['itemId', 'amount'], where)
        requireKeys(itemCost, ['itemId', 'amount'], where)
        if (typeof itemCost.itemId !== 'string' || itemCost.itemId.length === 0)
          throw new Error(`${where}.itemId: 期望非空物品 ID`)
        const amount = requireSafeInteger(itemCost.amount, `${where}.amount`)
        if (amount <= 0) throw new Error(`${where}.amount: 期望正整数`)
      })
    }
    const animation = assertObject(so.animation, `skills.skills[${i}].animation`) as Record<
      string,
      unknown
    >
    validateSkillAnimation(animation, `skills.skills[${i}].animation`)
    const effects = assertArray<Record<string, unknown>>(so.effects, `skills.skills[${i}].effects`)
    effects.forEach((effect, effectIndex) => {
      validateSkillEffect(
        assertObject(effect, `skills.skills[${i}].effects[${effectIndex}]`) as Record<
          string,
          unknown
        >,
        `skills.skills[${i}].effects[${effectIndex}]`,
      )
    })
    if (so.execution !== undefined) {
      const execution = assertObject(so.execution, `skills.skills[${i}].execution`) as Record<
        string,
        unknown
      >
      requireOnlyKeys(execution, ['player', 'enemy'], `skills.skills[${i}].execution`)
      for (const side of ['player', 'enemy'] as const) {
        const raw = execution[side]
        if (raw === undefined) continue
        const override = assertObject(raw, `skills.skills[${i}].execution.${side}`) as Record<
          string,
          unknown
        >
        requireOnlyKeys(
          override,
          ['effects', 'animation', 'prepare'],
          `skills.skills[${i}].execution.${side}`,
        )
        if (override.effects !== undefined) {
          const branchEffects = assertArray<Record<string, unknown>>(
            override.effects,
            `skills.skills[${i}].execution.${side}.effects`,
          )
          branchEffects.forEach((effect, effectIndex) => {
            validateSkillEffect(
              assertObject(
                effect,
                `skills.skills[${i}].execution.${side}.effects[${effectIndex}]`,
              ) as Record<string, unknown>,
              `skills.skills[${i}].execution.${side}.effects[${effectIndex}]`,
            )
            if (side === 'enemy' && !enemyRuntimeEffectKinds.has(String(effect.kind)))
              throw new Error(
                `skills.skills[${i}].execution.enemy.effects[${effectIndex}].kind: 敌方 runtime 不支持 ${String(effect.kind)}`,
              )
          })
        }
        if (override.animation !== undefined)
          validateSkillAnimation(
            assertObject(
              override.animation,
              `skills.skills[${i}].execution.${side}.animation`,
            ) as Record<string, unknown>,
            `skills.skills[${i}].execution.${side}.animation`,
          )
        if (override.prepare !== undefined) {
          if (side === 'enemy')
            throw new Error(
              `skills.skills[${i}].execution.enemy.prepare: 敌方 runtime 不支持施法前置效果`,
            )
          const prepares = assertArray<Record<string, unknown>>(
            override.prepare,
            `skills.skills[${i}].execution.${side}.prepare`,
          )
          if (prepares.length > 1)
            throw new Error(`skills.skills[${i}].execution.${side}.prepare: 只允许一个前置资源效果`)
          prepares.forEach((prepare, prepareIndex) => {
            const po = assertObject(
              prepare,
              `skills.skills[${i}].execution.${side}.prepare[${prepareIndex}]`,
            ) as Record<string, unknown>
            requireOnlyKeys(
              po,
              ['kind', 'resource', 'multiplier', 'consume'],
              `skills.skills[${i}].execution.${side}.prepare[${prepareIndex}]`,
            )
            if (po.kind !== 'remainingResourceDamage')
              throw new Error(
                `skills.skills[${i}].execution.${side}.prepare[${prepareIndex}].kind: 未知前置效果`,
              )
            if (po.resource !== 'mp' || po.consume !== 'all')
              throw new Error(
                `skills.skills[${i}].execution.${side}.prepare[${prepareIndex}]: 只支持清空剩余 MP`,
              )
            requireFiniteNumber(
              po.multiplier,
              `skills.skills[${i}].execution.${side}.prepare[${prepareIndex}].multiplier`,
              { positive: true },
            )
          })
        }
      }
    }
  })
  assertObject((json as { levelUp: unknown }).levelUp, 'skills.levelUp')
  return { skills, levelUp: (json as { levelUp: Record<string, unknown> }).levelUp }
}

const ITEM_STATUS_IDS = new Set([
  'confused',
  'paralyzed',
  'sleep',
  'silence',
  'puppet',
  'bravery',
  'protect',
  'haste',
  'dualAttack',
])

function requireFiniteNumber(
  value: unknown,
  ctx: string,
  opts?: { positive?: boolean; nonzero?: boolean; integer?: boolean },
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${ctx}: 期望有限数`)
  if (opts?.integer && !Number.isInteger(value)) throw new Error(`${ctx}: 期望整数`)
  if (opts?.positive && value <= 0) throw new Error(`${ctx}: 期望正数`)
  if (opts?.nonzero && value === 0) throw new Error(`${ctx}: 不得为 0`)
  return value
}

function requireSafeInteger(value: unknown, ctx: string): number {
  const number = requireFiniteNumber(value, ctx, { integer: true })
  if (!Number.isSafeInteger(number)) throw new Error(`${ctx}: 期望安全整数`)
  return number
}

function validateSkillAnimation(animation: Record<string, unknown>, ctx: string): void {
  requireOnlyKeys(
    animation,
    [
      'effectSprite',
      'placement',
      'xOffset',
      'yOffset',
      'layerOffset',
      'speed',
      'fireDelay',
      'effectTimes',
      'shake',
      'preShake',
      'wave',
      'sound',
      'keepEffect',
    ],
    ctx,
  )
  if (!Number.isInteger(animation.effectSprite) || (animation.effectSprite as number) < 0)
    throw new Error(`${ctx}.effectSprite: 期望非负整数`)
  if (
    animation.placement !== undefined &&
    !['normal', 'attackAll', 'attackWhole', 'attackField'].includes(String(animation.placement))
  )
    throw new Error(`${ctx}.placement: 非法落点模式`)
  for (const key of [
    'xOffset',
    'yOffset',
    'layerOffset',
    'speed',
    'fireDelay',
    'effectTimes',
    'shake',
    'wave',
  ])
    if (
      animation[key] !== undefined &&
      (typeof animation[key] !== 'number' || !Number.isFinite(animation[key]))
    )
      throw new Error(`${ctx}.${key}: 期望有限数`)
  if (animation.keepEffect !== undefined && typeof animation.keepEffect !== 'boolean')
    throw new Error(`${ctx}.keepEffect: 期望 boolean`)
  if (animation.preShake !== undefined) {
    const pre = assertObject(animation.preShake, `${ctx}.preShake`) as Record<string, unknown>
    requireOnlyKeys(pre, ['frames', 'level'], `${ctx}.preShake`)
    requireFiniteNumber(pre.frames, `${ctx}.preShake.frames`, { positive: true, integer: true })
    requireFiniteNumber(pre.level, `${ctx}.preShake.level`, { positive: true })
  }
  validateOptionalAssetId(animation, 'sound', ctx)
}

function validateSkillEffect(effect: Record<string, unknown>, ctx: string): void {
  if (typeof effect.kind !== 'string') throw new Error(`${ctx}.kind: 期望 string`)
  if (effect.kind === 'summon') {
    if ('godId' in effect) throw new Error(`${ctx}.godId: 已退役；请使用 battleSprite`)
    if (typeof effect.battleSprite !== 'string' || effect.battleSprite.length === 0)
      throw new Error(`${ctx}.battleSprite: 期望非空 BattleSpriteDef.id`)
    validateOptionalAssetId(effect, 'sound', ctx)
  }
  if (effect.kind === 'trance') {
    if ('sprite' in effect) throw new Error(`${ctx}.sprite: 已退役；请使用 battleSprite`)
    if (typeof effect.battleSprite !== 'string' || effect.battleSprite.length === 0)
      throw new Error(`${ctx}.battleSprite: 期望非空 BattleSpriteDef.id`)
  }
  if (effect.kind === 'resourceDelta') {
    requireOnlyKeys(effect, ['kind', 'resource', 'delta'], ctx)
    if (effect.resource !== 'hp' && effect.resource !== 'mp')
      throw new Error(`${ctx}.resource: 只支持 hp/mp`)
    requireFiniteNumber(effect.delta, `${ctx}.delta`)
  }
}

function validateOptionalUnavailableMessage(effect: Record<string, unknown>, ctx: string): void {
  if (
    effect.unavailableMessage !== undefined &&
    (typeof effect.unavailableMessage !== 'string' || effect.unavailableMessage.length === 0)
  )
    throw new Error(`${ctx}.unavailableMessage: 期望非空 string`)
}

function validateItemUseEffect(effect: Record<string, unknown>, ctx: string): void {
  if (typeof effect.kind !== 'string') throw new Error(`${ctx}.kind: 期望 string`)
  if (!(effect.kind in ITEM_USE_EFFECT_KINDS))
    throw new Error(`${ctx}.kind: 未知物品效果 ${effect.kind}`)
  const kind = effect.kind as ItemUseEffect['kind']
  switch (kind) {
    case 'healHp':
    case 'healMp':
      requireFiniteNumber(effect.amount, `${ctx}.amount`, { nonzero: true, integer: true })
      break
    case 'extraPoisonRes':
      requireFiniteNumber(effect.amount, `${ctx}.amount`, { positive: true, integer: true })
      break
    case 'revive': {
      const percent = requireFiniteNumber(effect.hpPercent, `${ctx}.hpPercent`, { positive: true })
      if (percent > 100) throw new Error(`${ctx}.hpPercent: 不得大于 100`)
      break
    }
    case 'applyStatus':
      if (typeof effect.status !== 'string' || !ITEM_STATUS_IDS.has(effect.status))
        throw new Error(`${ctx}.status: 未知状态 ${String(effect.status)}`)
      requireFiniteNumber(effect.turns, `${ctx}.turns`, { positive: true, integer: true })
      break
    case 'removeStatus': {
      const statuses = assertArray<unknown>(effect.statuses, `${ctx}.statuses`)
      if (statuses.length === 0) throw new Error(`${ctx}.statuses: 不得为空`)
      const seen = new Set<string>()
      statuses.forEach((status, index) => {
        if (typeof status !== 'string' || !ITEM_STATUS_IDS.has(status))
          throw new Error(`${ctx}.statuses[${index}]: 未知状态 ${String(status)}`)
        if (seen.has(status)) throw new Error(`${ctx}.statuses[${index}]: 状态 ${status} 重复`)
        seen.add(status)
      })
      break
    }
    case 'applyPoison':
      if (typeof effect.poisonId !== 'string' || effect.poisonId.length === 0)
        throw new Error(`${ctx}.poisonId: 期望非空稳定 id`)
      break
    case 'curePoison':
      if (
        effect.curesTier !== undefined &&
        !['common', 'severe', 'incurable'].includes(String(effect.curesTier))
      )
        throw new Error(`${ctx}.curesTier: 期望 common/severe/incurable`)
      if (
        effect.poisonId !== undefined &&
        (typeof effect.poisonId !== 'string' || effect.poisonId.length === 0)
      )
        throw new Error(`${ctx}.poisonId: 期望非空稳定 id`)
      if (effect.curesTier === undefined && effect.poisonId === undefined)
        throw new Error(`${ctx}: curesTier/poisonId 至少需要一个`)
      break
    case 'permanentStatBoost':
      if (
        !['attack', 'magicAttack', 'defense', 'speed', 'luck', 'maxHP', 'maxMP'].includes(
          String(effect.stat),
        )
      )
        throw new Error(`${ctx}.stat: 未知永久属性 ${String(effect.stat)}`)
      requireFiniteNumber(effect.delta, `${ctx}.delta`, { nonzero: true, integer: true })
      break
    case 'gate': {
      const chance =
        effect.chance === undefined
          ? 100
          : requireFiniteNumber(effect.chance, `${ctx}.chance`, {
              positive: true,
              integer: true,
            })
      if (chance > 100) throw new Error(`${ctx}.chance: 不得大于 100`)
      break
    }
    case 'runScript':
      checkScriptRef(effect.script, `${ctx}.script`)
      break
    case 'runSceneHook':
      if (effect.hook !== 'onTeleport') throw new Error(`${ctx}.hook: 当前只支持 onTeleport`)
      validateOptionalUnavailableMessage(effect, ctx)
      break
    case 'craftRecipe': {
      validateOptionalUnavailableMessage(effect, ctx)
      const recipes = assertArray<Record<string, unknown>>(effect.recipes, `${ctx}.recipes`)
      if (recipes.length === 0) throw new Error(`${ctx}.recipes: 至少需要一条配方`)
      for (const [recipeIndex, recipe] of recipes.entries()) {
        for (const field of ['ingredients', 'products'] as const) {
          const entries = assertArray<Record<string, unknown>>(
            recipe[field],
            `${ctx}.recipes[${recipeIndex}].${field}`,
          )
          if (entries.length === 0)
            throw new Error(`${ctx}.recipes[${recipeIndex}].${field}: 不得为空`)
          for (const [entryIndex, entry] of entries.entries()) {
            const path = `${ctx}.recipes[${recipeIndex}].${field}[${entryIndex}]`
            if (typeof entry.itemId !== 'string' || entry.itemId.length === 0)
              throw new Error(`${path}.itemId: 期望非空 string`)
            requireFiniteNumber(entry.count, `${path}.count`, { positive: true, integer: true })
          }
        }
      }
      break
    }
    case 'drawFromResourcePool': {
      validateOptionalUnavailableMessage(effect, ctx)
      if (typeof effect.resource !== 'string' || effect.resource.trim().length === 0)
        throw new Error(`${ctx}.resource: 期望非空稳定 id`)
      if (effect.resource !== effect.resource.trim())
        throw new Error(`${ctx}.resource: 稳定 id 不得包含首尾空白`)
      const maxRoll = requireFiniteNumber(effect.maxRoll, `${ctx}.maxRoll`, {
        positive: true,
        integer: true,
      })
      const rewards = assertArray<Record<string, unknown>>(effect.rewards, `${ctx}.rewards`)
      if (rewards.length < maxRoll) throw new Error(`${ctx}.rewards: 至少覆盖 maxRoll 档`)
      rewards.forEach((entry, rewardIndex) => {
        const path = `${ctx}.rewards[${rewardIndex}]`
        if (typeof entry.itemId !== 'string' || entry.itemId.length === 0)
          throw new Error(`${path}.itemId: 期望非空 string`)
        requireFiniteNumber(entry.count, `${path}.count`, { positive: true, integer: true })
      })
      break
    }
    case 'hideParty':
      requireFiniteNumber(effect.turns, `${ctx}.turns`, { positive: true, integer: true })
      break
    case 'modifyHostileAwareness':
      if (effect.rangeMultiplier !== 0 && effect.rangeMultiplier !== 3)
        throw new Error(`${ctx}.rangeMultiplier: 期望 0 或 3`)
      requireFiniteNumber(effect.durationMs, `${ctx}.durationMs`, {
        positive: true,
        integer: true,
      })
      break
    case 'scaleCurrentHp':
      requireFiniteNumber(effect.numerator, `${ctx}.numerator`, {
        positive: true,
        integer: true,
      })
      requireFiniteNumber(effect.denominator, `${ctx}.denominator`, {
        positive: true,
        integer: true,
      })
      break
    case 'levelUp':
      requireFiniteNumber(effect.levels, `${ctx}.levels`, { positive: true, integer: true })
      break
    case 'placeEntityInFront':
      checkEntityAddress(effect.target, `${ctx}.target`)
      requireFiniteNumber(effect.state, `${ctx}.state`, { integer: true })
      validateOptionalUnavailableMessage(effect, ctx)
      break
    case 'dieIfNotPoisoned':
      break
    default:
      assertNever(kind, `${ctx}.kind`)
  }
}

/** 投掷效果独立 guard；每个判别分支严格 exact-key，非法内容不得进入消费阶段。 */
function validateThrowEffect(effect: Record<string, unknown>, ctx: string): void {
  if (typeof effect.kind !== 'string') throw new Error(`${ctx}.kind: 期望 string`)
  if (!(effect.kind in THROW_EFFECT_KINDS))
    throw new Error(`${ctx}.kind: 未知投掷效果 ${effect.kind}`)
  const kind = effect.kind as ThrowEffect['kind']
  switch (kind) {
    case 'magicDamage': {
      requireOnlyKeys(effect, ['kind', 'baseDamage', 'element', 'strength'], ctx)
      requireSafeInteger(effect.baseDamage, `${ctx}.baseDamage`)
      if (
        !['none', 'wind', 'thunder', 'water', 'fire', 'earth', 'poison'].includes(
          String(effect.element),
        )
      )
        throw new Error(`${ctx}.element: 未知投掷元素 ${String(effect.element)}`)
      const strength = assertObject(effect.strength, `${ctx}.strength`) as Record<string, unknown>
      if (strength.kind === 'fixed') {
        requireOnlyKeys(strength, ['kind', 'value'], `${ctx}.strength`)
        const value = requireSafeInteger(strength.value, `${ctx}.strength.value`)
        if (value < 0) throw new Error(`${ctx}.strength.value: 不得小于 0`)
      } else if (strength.kind === 'casterAttack') {
        requireOnlyKeys(strength, ['kind', 'bonus', 'multiplier'], `${ctx}.strength`)
        const bonus = requireSafeInteger(strength.bonus, `${ctx}.strength.bonus`)
        if (bonus < 0) throw new Error(`${ctx}.strength.bonus: 不得小于 0`)
        const multiplier = assertObject(
          strength.multiplier,
          `${ctx}.strength.multiplier`,
        ) as Record<string, unknown>
        requireOnlyKeys(multiplier, ['kind', 'min', 'max'], `${ctx}.strength.multiplier`)
        if (multiplier.kind !== 'uniformInt')
          throw new Error(`${ctx}.strength.multiplier.kind: 期望 uniformInt`)
        const min = requireSafeInteger(multiplier.min, `${ctx}.strength.multiplier.min`)
        const max = requireSafeInteger(multiplier.max, `${ctx}.strength.multiplier.max`)
        if (min < 0 || max < 0) throw new Error(`${ctx}.strength.multiplier: min/max 不得小于 0`)
        if (min > max) throw new Error(`${ctx}.strength.multiplier: min 不得大于 max`)
      } else {
        throw new Error(`${ctx}.strength.kind: 期望 fixed/casterAttack`)
      }
      break
    }
    case 'fixedDamage':
      requireOnlyKeys(effect, ['kind', 'amount'], ctx)
      if (requireSafeInteger(effect.amount, `${ctx}.amount`) <= 0)
        throw new Error(`${ctx}.amount: 期望正数`)
      break
    case 'applyPoison':
      requireOnlyKeys(effect, ['kind', 'poisonId'], ctx)
      if (typeof effect.poisonId !== 'string' || effect.poisonId.length === 0)
        throw new Error(`${ctx}.poisonId: 期望非空稳定 id`)
      break
    case 'currentHpDamage': {
      requireOnlyKeys(effect, ['kind', 'numerator', 'denominator', 'bonus', 'cap'], ctx)
      if (requireSafeInteger(effect.numerator, `${ctx}.numerator`) <= 0)
        throw new Error(`${ctx}.numerator: 期望正数`)
      if (requireSafeInteger(effect.denominator, `${ctx}.denominator`) <= 0)
        throw new Error(`${ctx}.denominator: 期望正数`)
      const bonus = requireSafeInteger(effect.bonus, `${ctx}.bonus`)
      if (bonus < 0) throw new Error(`${ctx}.bonus: 不得小于 0`)
      if (requireSafeInteger(effect.cap, `${ctx}.cap`) <= 0) throw new Error(`${ctx}.cap: 期望正数`)
      break
    }
    case 'applyStatus':
      requireOnlyKeys(effect, ['kind', 'status', 'turns', 'onResist'], ctx)
      if (typeof effect.status !== 'string' || !ITEM_STATUS_IDS.has(effect.status))
        throw new Error(`${ctx}.status: 未知状态 ${String(effect.status)}`)
      if (requireSafeInteger(effect.turns, `${ctx}.turns`) <= 0)
        throw new Error(`${ctx}.turns: 期望正数`)
      if (effect.onResist !== 'continue' && effect.onResist !== 'stopTarget')
        throw new Error(`${ctx}.onResist: 期望 continue/stopTarget`)
      break
    case 'killIfHpAtMost': {
      requireOnlyKeys(effect, ['kind', 'percent'], ctx)
      const percent = requireSafeInteger(effect.percent, `${ctx}.percent`)
      if (percent <= 0) throw new Error(`${ctx}.percent: 期望正数`)
      if (percent > 100) throw new Error(`${ctx}.percent: 不得大于 100`)
      break
    }
    case 'damageAndHealCaster':
      requireOnlyKeys(effect, ['kind', 'damage', 'heal'], ctx)
      if (requireSafeInteger(effect.damage, `${ctx}.damage`) <= 0)
        throw new Error(`${ctx}.damage: 期望正数`)
      if (requireSafeInteger(effect.heal, `${ctx}.heal`) <= 0)
        throw new Error(`${ctx}.heal: 期望正数`)
      break
    default:
      assertNever(kind, `${ctx}.kind`)
  }
}

/** 单条当前投掷能力的公开 fail-closed 边界；战斗消费前与整表 validator 共用。 */
export function checkThrowSpec(
  value: unknown,
  ctx = 'throw',
): asserts value is import('./item.js').ThrowSpec {
  const thrown = assertObject(value, ctx) as Record<string, unknown>
  requireOnlyKeys(thrown, ['target', 'effects', 'sound', 'presentation'], ctx)
  if (thrown.target !== 'oneEnemy' && thrown.target !== 'allEnemies')
    throw new Error(`${ctx}.target: 期望 oneEnemy/allEnemies`)
  validateOptionalAssetId(thrown, 'sound', ctx)
  if (thrown.presentation !== undefined) {
    const presentation = assertObject(thrown.presentation, `${ctx}.presentation`) as Record<
      string,
      unknown
    >
    requireOnlyKeys(presentation, ['kind', 'animation'], `${ctx}.presentation`)
    if (presentation.kind !== 'magic') throw new Error(`${ctx}.presentation.kind: 期望 magic`)
    validateSkillAnimation(
      assertObject(presentation.animation, `${ctx}.presentation.animation`) as Record<
        string,
        unknown
      >,
      `${ctx}.presentation.animation`,
    )
  }
  const effects = assertArray<Record<string, unknown>>(thrown.effects, `${ctx}.effects`)
  if (effects.length === 0) throw new Error(`${ctx}.effects: 不得为空`)
  effects.forEach((effect, effectIndex) => {
    validateThrowEffect(effect, `${ctx}.effects[${effectIndex}]`)
  })
}

function validateAuthorItemUseEffect(
  effect: Record<string, unknown>,
  ctx: string,
  options: CommandValidationOptions,
): void {
  if (typeof effect.kind !== 'string') throw new Error(`${ctx}.kind: 期望 string`)
  if (!(effect.kind in AUTHOR_ITEM_USE_EFFECT_KINDS))
    throw new Error(`${ctx}.kind: 未知作者物品效果 ${effect.kind}`)
  if (effect.kind === 'runScript') {
    requireOnlyKeys(effect, ['kind', 'script'], ctx)
    if (typeof effect.script !== 'string' || effect.script.trim().length === 0)
      throw new Error(`${ctx}.script: 期望稳定 shared script id`)
    return
  }
  if (effect.kind === 'itemPrivateScript') {
    requireOnlyKeys(effect, ['kind', 'script'], ctx)
    const script = assertObject(effect.script, `${ctx}.script`) as Record<string, unknown>
    requireOnlyKeys(script, ['id', 'label', 'body'], `${ctx}.script`)
    if (script.id !== 'use') throw new Error(`${ctx}.script.id: item-private 固定为 use`)
    if (script.label !== undefined && typeof script.label !== 'string')
      throw new Error(`${ctx}.script.label: 期望 string`)
    checkBaseAuthorCommands(script.body, `${ctx}.script.body`, options)
    return
  }
  validateItemUseEffect(effect, ctx)
}

function isItemPrivateRuntimeEffect(
  effect: Record<string, unknown>,
  itemId: string,
  slot: 'use' | 'throw',
): boolean {
  if (effect.kind !== 'runScript') return false
  const script = effect.script
  if (typeof script !== 'object' || script === null || Array.isArray(script)) return false
  const ref = script as Record<string, unknown>
  return ref.chunk === '__author-script-runtime' && ref.id === `item:${itemId}:${slot}`
}

export function validateItems(json: unknown): ItemData[] {
  const arr = assertArray<ItemData>(json, 'items')
  arr.forEach((it, i) => {
    const o = assertObject(it, `items[${i}]`)
    requireKeys(o, ['id', 'name', 'buyPrice', 'sellPrice', 'sellable'], `items[${i}]`)
    if (typeof (it as { id: unknown }).id !== 'string') throw new Error(`items[${i}]: id 非string`)
    const record = it as unknown as Record<string, unknown>
    validateOptionalAssetId(record, 'icon', `items[${i}]`)
    for (const field of ['use', 'throw'] as const) {
      if (record[field] === undefined) continue
      const spec = assertObject(record[field], `items[${i}].${field}`) as Record<string, unknown>
      validateOptionalAssetId(spec, 'sound', `items[${i}].${field}`)
    }
    if (record.use !== undefined) {
      const use = assertObject(record.use, `items[${i}].use`) as Record<string, unknown>
      if (typeof use.consuming !== 'boolean')
        throw new Error(`items[${i}].use.consuming: 期望 boolean`)
      if (!['oneAlly', 'allAllies', 'self', 'scene'].includes(String(use.target)))
        throw new Error(`items[${i}].use.target: 期望 oneAlly/allAllies/self/scene`)
      if (use.battleOnly !== undefined && typeof use.battleOnly !== 'boolean')
        throw new Error(`items[${i}].use.battleOnly: 期望 boolean`)
      if (use.menuAfterUse !== undefined && !['keep', 'close'].includes(String(use.menuAfterUse)))
        throw new Error(`items[${i}].use.menuAfterUse: 期望 keep/close`)
      const effects = assertArray<Record<string, unknown>>(use.effects, `items[${i}].use.effects`)
      const itemId = String(record.id)
      const isPrivateRuntime = (effect: Record<string, unknown>) =>
        isItemPrivateRuntimeEffect(effect, itemId, 'use')
      const external = effects.filter(
        (effect) =>
          (effect.kind === 'runScript' && !isPrivateRuntime(effect)) ||
          effect.kind === 'runSceneHook' ||
          effect.kind === 'placeEntityInFront',
      )
      if (external.length > 0 && (external.length !== 1 || effects.length !== 1))
        throw new Error(
          `items[${i}].use.effects: 外部脚本/场景钩子必须作为唯一效果；复杂编排请放入被引用脚本，以免失败时提交半套世界修改`,
        )
      effects.forEach((effect, effectIndex) => {
        validateItemUseEffect(effect, `items[${i}].use.effects[${effectIndex}]`)
      })
      const typedUse = use as unknown as import('./item.js').UseSpec
      const supportsWorld = itemUseSupportsContext(typedUse, 'world')
      const supportsBattle = itemUseSupportsContext(typedUse, 'battle')
      if (effects.length > 0 && use.battleOnly === true && !supportsBattle)
        throw new Error(`items[${i}].use.effects: battleOnly 用途包含不可用于战斗的效果`)
      if (effects.length > 0 && !supportsWorld && !supportsBattle)
        throw new Error(`items[${i}].use.effects: 效果组合不存在可执行的世界/战斗上下文`)
      const sceneKinds = new Set([
        'runScript',
        'runSceneHook',
        'craftRecipe',
        'drawFromResourcePool',
        'modifyHostileAwareness',
        'placeEntityInFront',
      ])
      const privateScriptNeedsCharacterTarget = effects.some(
        (effect) =>
          !isPrivateRuntime(effect) &&
          effect.kind !== 'gate' &&
          !sceneKinds.has(String(effect.kind)),
      )
      const hasSceneEffect = effects.some((effect) =>
        isPrivateRuntime(effect)
          ? !privateScriptNeedsCharacterTarget
          : sceneKinds.has(String(effect.kind)),
      )
      const hasCharacterOrBattleEffect = effects.some(
        (effect) =>
          !isPrivateRuntime(effect) &&
          !sceneKinds.has(String(effect.kind)) &&
          effect.kind !== 'gate',
      )
      if (hasSceneEffect && hasCharacterOrBattleEffect)
        throw new Error(`items[${i}].use.effects: 场景/剧情效果不能与角色或战斗效果混合`)
      if (effects.length > 0 && hasSceneEffect && use.target !== 'scene')
        throw new Error(`items[${i}].use.target: 场景/剧情效果必须使用 scene`)
      if (effects.length > 0 && use.target === 'scene' && !hasSceneEffect)
        throw new Error(`items[${i}].use.target: scene 目标必须包含场景/剧情效果`)
      if (effects.some((effect) => effect.kind === 'hideParty') && use.target !== 'allAllies')
        throw new Error(`items[${i}].use.target: hideParty 必须使用 allAllies`)
      if (use.consuming === true) {
        for (const [effectIndex, effect] of effects.entries()) {
          if (effect.kind !== 'craftRecipe') continue
          const recipes = effect.recipes as Record<string, unknown>[]
          for (const [recipeIndex, recipe] of recipes.entries()) {
            const ingredients = recipe.ingredients as Record<string, unknown>[]
            if (ingredients.some((entry) => entry.itemId === record.id))
              throw new Error(
                `items[${i}].use.effects[${effectIndex}].recipes[${recipeIndex}]: consuming 工具不能同时作为自身配方材料`,
              )
          }
        }
      }
    }
    if (record.throw !== undefined) {
      checkThrowSpec(record.throw, `items[${i}].throw`)
    }
    if (record.equip !== undefined) {
      const equip = assertObject(record.equip, `items[${i}].equip`) as Record<string, unknown>
      const equipableBy = assertArray<unknown>(equip.equipableBy, `items[${i}].equip.equipableBy`)
      equipableBy.forEach((actorId, actorIndex) => {
        if (typeof actorId !== 'string' || actorId.length === 0)
          throw new Error(`items[${i}].equip.equipableBy[${actorIndex}]: 期望非空 ActorDef.id`)
      })
      const effects = assertArray<Record<string, unknown>>(
        equip.effects,
        `items[${i}].equip.effects`,
      )
      let battleSpriteEffects = 0
      effects.forEach((effect, effectIndex) => {
        if (effect.kind !== 'battleSprite') return
        battleSpriteEffects += 1
        const ctx = `items[${i}].equip.effects[${effectIndex}]`
        requireOnlyKeys(effect, ['kind', 'byActor'], ctx)
        const byActor = assertObject(effect.byActor, `${ctx}.byActor`) as Record<string, unknown>
        for (const [actorId, battleSprite] of Object.entries(byActor)) {
          if (actorId.length === 0 || actorId !== actorId.trim())
            throw new Error(`${ctx}.byActor: ActorDef.id 必须非空且不得包含首尾空格`)
          if (
            typeof battleSprite !== 'string' ||
            battleSprite.length === 0 ||
            battleSprite !== battleSprite.trim()
          )
            throw new Error(`${ctx}.byActor.${actorId}: 期望非空且无首尾空格的 BattleSpriteDef.id`)
        }
      })
      if (battleSpriteEffects > 1)
        throw new Error(`items[${i}].equip.effects: battleSprite 效果最多一个`)
    }
  })
  return arr
}

/** 当前物品共享形状 guard；物品私有脚本方言由调用方注入。 */
export function validateAuthorItemCore(
  json: unknown,
  options: CommandValidationOptions = {},
): AuthorItemCore[] {
  const arr = assertArray<AuthorItemCore>(json, 'items')
  arr.forEach((item, itemIndex) => {
    const itemRecord = assertObject(item, `items[${itemIndex}]`) as Record<string, unknown>
    if (itemRecord.use !== undefined) {
      const spec = assertObject(itemRecord.use, `items[${itemIndex}].use`) as Record<
        string,
        unknown
      >
      const effects = assertArray<AuthorItemUseEffect>(spec.effects, `items[${itemIndex}].use.effects`)
      effects.forEach((effect, effectIndex) => {
        const ctx = `items[${itemIndex}].use.effects[${effectIndex}]`
        validateAuthorItemUseEffect(effect as unknown as Record<string, unknown>, ctx, options)
      })
      const privateScripts = effects.filter((effect) => effect.kind === 'itemPrivateScript')
      if (privateScripts.length > 1)
        throw new Error(`items[${itemIndex}].use.effects: item-private use 槽只能出现一次`)
    }
    if (item.use !== undefined) {
      const supportsWorld = authorItemUseSupportsContext(item.use, 'world')
      const supportsBattle = authorItemUseSupportsContext(item.use, 'battle')
      if (item.use.effects.length > 0 && item.use.battleOnly === true && !supportsBattle)
        throw new Error(`items[${itemIndex}].use.effects: battleOnly 用途包含不可用于战斗的效果`)
      if (item.use.effects.length > 0 && !supportsWorld && !supportsBattle)
        throw new Error(`items[${itemIndex}].use.effects: 效果组合不存在可执行的世界/战斗上下文`)
    }
  })

  // 复用当前非脚本物品规则；脚本效果只替换成等价的世界专用占位引用。
  const commonShape = arr.map((item) => {
    const mapUse = (spec: AuthorItemCore['use']) => {
      if (spec === undefined) return undefined
      const sceneKinds = new Set([
        'runScript',
        'runSceneHook',
        'craftRecipe',
        'drawFromResourcePool',
        'modifyHostileAwareness',
        'placeEntityInFront',
      ])
      const privateScriptNeedsCharacterTarget = spec.effects.some(
        (effect) =>
          effect.kind !== 'itemPrivateScript' &&
          effect.kind !== 'gate' &&
          !sceneKinds.has(effect.kind),
      )
      return {
        ...spec,
        effects: spec.effects.map((effect) => {
          if (effect.kind === 'runScript')
            return { kind: 'runScript' as const, script: { chunk: '__author__', id: 'script' } }
          if (effect.kind === 'itemPrivateScript')
            return privateScriptNeedsCharacterTarget
              ? { kind: 'gate' as const, chance: 100 }
              : {
                  kind: 'modifyHostileAwareness' as const,
                  rangeMultiplier: 0 as const,
                  durationMs: 1,
                }
          return effect
        }),
      }
    }
    return { ...item, use: mapUse(item.use) }
  })
  validateItems(commonShape)
  return arr
}

/** 战场定义 guard；背景只接受稳定 AssetId，缺席明确表示黑底。 */
export function validateBattleFields(json: unknown): BattleFieldDef[] {
  const arr = assertArray<BattleFieldDef>(json, 'battleFields')
  const ids = new Set<number>()
  arr.forEach((field, index) => {
    const ctx = `battleFields[${index}]`
    const record = assertObject(field, ctx) as Record<string, unknown>
    requireKeys(record, ['id', 'screenWave', 'magicEffect'], ctx)
    // 保留旧字段的专用升级诊断，再进入严格 unknown-key 门。
    if ('bg' in record) throw new Error(`${ctx}.bg: 旧路径字段已退役，请升级为 background AssetId`)
    requireOnlyKeys(record, ['id', 'name', 'background', 'screenWave', 'magicEffect'], ctx)
    if (!Number.isSafeInteger(record.id) || Number(record.id) < 0)
      throw new Error(`${ctx}.id: 期望非负安全整数`)
    const id = Number(record.id)
    if (ids.has(id)) throw new Error(`${ctx}.id: 重复战场 id ${id}`)
    ids.add(id)
    if (record.name !== undefined && typeof record.name !== 'string')
      throw new Error(`${ctx}.name: 期望 string`)
    validateOptionalAssetId(record, 'background', ctx)
    if (typeof record.screenWave !== 'number' || !Number.isFinite(record.screenWave))
      throw new Error(`${ctx}.screenWave: 期望有限数`)
    const magicEffect = assertObject(record.magicEffect, `${ctx}.magicEffect`) as Record<
      string,
      unknown
    >
    const elements = ['wind', 'thunder', 'water', 'fire', 'earth'] as const
    requireKeys(magicEffect, elements, `${ctx}.magicEffect`)
    requireOnlyKeys(magicEffect, elements, `${ctx}.magicEffect`)
    for (const element of elements) {
      if (typeof magicEffect[element] !== 'number' || !Number.isFinite(magicEffect[element]))
        throw new Error(`${ctx}.magicEffect.${element}: 期望有限数`)
    }
  })
  return arr
}

/** 敌人定义轻量 guard；音效边界必须拒绝旧数字/负号协议。 */
export function validateEnemies(
  json: unknown,
  options: CommandValidationOptions = {},
): EnemyDef[] {
  const arr = assertArray<EnemyDef>(json, 'enemies')
  arr.forEach((enemy, index) => {
    const ctx = `enemies[${index}]`
    const record = assertObject(enemy, ctx) as Record<string, unknown>
    requireKeys(record, ['id', 'name', 'battleSprite', 'yPosOffset', 'stats', 'ai', 'sounds'], ctx)
    if (typeof record.id !== 'string' || record.id.length === 0)
      throw new Error(`${ctx}.id: 期望非空 string`)
    if ('spriteNum' in record || 'spritePath' in record || 'anim' in record)
      throw new Error(
        `${ctx}: 旧 spriteNum/spritePath/anim 已退役；请使用 battleSprite + yPosOffset`,
      )
    if (typeof record.battleSprite !== 'string' || record.battleSprite.length === 0)
      throw new Error(`${ctx}.battleSprite: 期望非空 BattleSpriteDef.id`)
    if (typeof record.yPosOffset !== 'number' || !Number.isFinite(record.yPosOffset))
      throw new Error(`${ctx}.yPosOffset: 期望有限数`)
    checkEnemyAi(record.ai, `${ctx}.ai`, options)
    const sounds = validateSoundFields(
      record.sounds,
      ['attack', 'action', 'magic', 'death', 'call'],
      `${ctx}.sounds`,
    )
    if (
      sounds.suppressMagicEffectSound !== undefined &&
      typeof sounds.suppressMagicEffectSound !== 'boolean'
    )
      throw new Error(`${ctx}.sounds.suppressMagicEffectSound: 期望 boolean`)
    if (record.choreography !== undefined) {
      checkBattleChoreography(record.choreography, `${ctx}.choreography`, options)
    }
    if (record.onDefeated !== undefined)
      checkEnemyOnDefeatedCommands(record.onDefeated, `${ctx}.onDefeated`, options)
  })
  return arr
}

/** 精灵注册表形状校验:id/asset/label + layout，并可与 catalog 的 sprite kind 交叉校验。 */
export function validateSprites(json: unknown, catalog?: AssetCatalogV1): SpriteDef[] {
  const arr = assertArray<SpriteDef>(json, 'sprites')
  const ids = new Set<string>()
  arr.forEach((sp, i) => {
    const o = assertObject(sp, `sprites[${i}]`) as Record<string, unknown>
    requireKeys(o, ['id', 'asset', 'label', 'layout'], `sprites[${i}]`)
    const id = (sp as { id: unknown }).id
    if (typeof id !== 'string' || id.length === 0)
      throw new Error(`sprites[${i}]: id 期望非空string`)
    if (ids.has(id)) throw new Error(`sprites[${i}]: 重复 id "${id}"`)
    ids.add(id)
    if ('spriteNum' in o) throw new Error(`sprites[${i}].spriteNum: 已退役；请升级为 asset AssetId`)
    if ('path' in o)
      throw new Error(`sprites[${i}].path: 已退役；物理路径只能来自 assets/index.json`)
    const asset = (sp as { asset: unknown }).asset
    if (typeof asset !== 'string' || asset.trim().length === 0)
      throw new Error(`sprites[${i}].asset: 期望非空 AssetId`)
    if (catalog) {
      const record = catalog.assets[asset]
      if (!record) throw new Error(`sprites[${i}].asset: AssetId "${asset}" 不在 catalog`)
      if (record.kind !== 'sprite')
        throw new Error(`sprites[${i}].asset: AssetId "${asset}" 期望 sprite，实际 ${record.kind}`)
    }
    if (typeof (sp as { label: unknown }).label !== 'string')
      throw new Error(`sprites[${i}]: label 非string`)
    const layout = assertObject((sp as { layout: unknown }).layout, `sprites[${i}].layout`)
    const kind = (layout as { kind?: unknown }).kind
    if (kind === 'directional') {
      requireOnlyKeys(layout, ['kind', 'framesPerDir'], `sprites[${i}].layout`)
      const framesPerDir = (layout as { framesPerDir?: unknown }).framesPerDir
      if (framesPerDir === undefined)
        throw new Error(`sprites[${i}].layout: directional 缺 framesPerDir(number)`)
      if (!Number.isInteger(framesPerDir) || (framesPerDir as number) <= 0)
        throw new Error(`sprites[${i}].layout: directional framesPerDir 期望正整数`)
    } else if (kind === 'static') {
      requireOnlyKeys(layout, ['kind'], `sprites[${i}].layout`)
    } else {
      throw new Error(`sprites[${i}].layout: kind 非法("${String(kind)}")`)
    }
    if (o.poses !== undefined) {
      const poses = assertObject(o.poses, `sprites[${i}].poses`)
      for (const [actionId, rawAction] of Object.entries(poses)) {
        const actionPath = `sprites[${i}].poses[${JSON.stringify(actionId)}]`
        if (actionId.trim().length === 0) throw new Error(`${actionPath}: ActionId 不能为空`)
        const action = assertObject(rawAction, actionPath) as Record<string, unknown>
        requireOnlyKeys(action, ['label', 'order', 'steps', 'loopFrom'], actionPath)
        if (typeof action.label !== 'string' || action.label.trim().length === 0)
          throw new Error(`${actionPath}.label: 期望非空 string`)
        if (
          action.order !== undefined &&
          (!Number.isInteger(action.order) || (action.order as number) < 0)
        )
          throw new Error(`${actionPath}.order: 期望非负整数`)
        const steps = assertArray<unknown>(action.steps, `${actionPath}.steps`)
        if (steps.length === 0) throw new Error(`${actionPath}.steps: 期望非空数组`)
        steps.forEach((rawStep, stepIndex) => {
          const stepPath = `${actionPath}.steps[${stepIndex}]`
          const step = assertObject(rawStep, stepPath) as Record<string, unknown>
          requireOnlyKeys(step, ['frame', 'durationMs', 'cues'], stepPath)
          requireKeys(step, ['frame', 'durationMs'], stepPath)
          if (!Number.isInteger(step.frame) || (step.frame as number) < 0)
            throw new Error(`${stepPath}.frame: 期望非负整数`)
          if (!Number.isInteger(step.durationMs) || (step.durationMs as number) <= 0)
            throw new Error(`${stepPath}.durationMs: 期望正整数`)
          if (step.cues !== undefined) {
            const cues = assertArray<unknown>(step.cues, `${stepPath}.cues`)
            cues.forEach((rawCue, cueIndex) => {
              const cuePath = `${stepPath}.cues[${cueIndex}]`
              const cue = assertObject(rawCue, cuePath) as Record<string, unknown>
              requireOnlyKeys(cue, ['kind', 'asset'], cuePath)
              requireKeys(cue, ['kind', 'asset'], cuePath)
              if (cue.kind !== 'sound') throw new Error(`${cuePath}.kind: 首期只允许 sound`)
              if (typeof cue.asset !== 'string' || cue.asset.trim().length === 0)
                throw new Error(`${cuePath}.asset: 期望非空 AssetId`)
              if (catalog) {
                const record = catalog.assets[cue.asset]
                if (!record)
                  throw new Error(`${cuePath}.asset: AssetId "${cue.asset}" 不在 catalog`)
                if (record.kind !== 'sound')
                  throw new Error(
                    `${cuePath}.asset: AssetId "${cue.asset}" 期望 sound，实际 ${record.kind}`,
                  )
              }
            })
          }
        })
        if (
          action.loopFrom !== undefined &&
          (!Number.isInteger(action.loopFrom) ||
            (action.loopFrom as number) < 0 ||
            (action.loopFrom as number) >= steps.length)
        )
          throw new Error(`${actionPath}.loopFrom: 期望小于 steps.length 的非负整数`)
      }
    }
  })
  return arr
}

export function validateLocale(
  json: unknown,
  opts: { allowSoftWrap?: boolean } = {},
): Record<string, string> {
  const o = assertObject(json, 'locale')
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== 'string') throw new Error(`locale: 键 "${k}" 的值非string`)
    if (!opts.allowSoftWrap && /[\r\n]/.test(v))
      throw new Error(`locale: 键 "${k}" 含换行；请拆成 DialogueCue.rows`)
  }
  return o as Record<string, string>
}
