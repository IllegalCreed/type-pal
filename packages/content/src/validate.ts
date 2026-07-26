// 轻量 guard(zod 接缝):校验 loader 加载的工程 JSON 形状。
// 只查「数组/对象 + 必需键在 + id 是 string」,不齐就 throw 具体错误。
// 编辑器产大量手改 JSON 时再上 zod(局部替换这些函数,签名不变)。
import type {
  ActorDef,
  AssetCatalogV1,
  BattleFieldDef,
  EnemyDef,
  ItemData,
  SceneDef,
  SkillData,
  SpriteDef,
  StartWorld,
} from './index.js'
import type { ItemUseEffect } from './item.js'
import {
  ITEM_USE_EFFECT_KINDS,
  itemUseEffectSupportsContext,
  itemUseSupportsContext,
} from './item.js'
import type { ItemDataV5, ItemUseEffectV5 } from './item-v5.js'
import {
  ITEM_USE_EFFECT_KINDS_V5,
  itemUseEffectSupportsContextV5,
  itemUseSupportsContextV5,
} from './item-v5.js'
import { isMapAssetId } from './map-index.js'
import type { SceneDefV5 } from './scene-v5.js'
import { checkCommands, checkEntityPages, checkStages } from './script.js'
import { checkScriptRef } from './script-library.js'
import {
  checkAuthorCommandsV5,
  checkEntityAddress,
  checkEntityBehaviorsV5,
  checkEntityPagesV5,
  checkSceneHooksV5,
} from './script-v5.js'

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

/** 迁移输入端显式 v4 guard；P7 切换后运行时不得再调用它。 */
export function validateScenesV4(json: unknown): SceneDef[] {
  return validateSceneArray(json)
}

/** Canonical v5 scene guard；v4 行为页与顶层场景脚本不会泄漏进正式模型。 */
export function validateScenesV5(json: unknown): SceneDefV5[] {
  const arr = assertArray<SceneDefV5>(json, 'scenes')
  arr.forEach((scene, sceneIndex) => {
    const scenePath = `scenes[${sceneIndex}]`
    const sceneRecord = assertObject(scene, scenePath) as Record<string, unknown>
    if ('onEnter' in sceneRecord) throw new Error(`${scenePath}.onEnter: v5 已迁移至 hooks.onEnter`)
    if ('onTeleport' in sceneRecord)
      throw new Error(`${scenePath}.onTeleport: v5 已迁移至 hooks.onTeleport`)
    checkSceneHooksV5(sceneRecord.hooks, `${scenePath}.hooks`)

    const entities = assertArray<Record<string, unknown>>(
      sceneRecord.entities,
      `${scenePath}.entities`,
    )
    entities.forEach((entity, entityIndex) => {
      const entityPath = `${scenePath}.entities[${entityIndex}]`
      const entityRecord = assertObject(entity, entityPath) as Record<string, unknown>
      const hasPages = entityRecord.pages !== undefined
      if (hasPages)
        checkEntityPagesV5(
          entityRecord.pages,
          entityRecord.behaviors,
          entityRecord.initialPage,
          entityPath,
        )
      else {
        if (entityRecord.initialPage !== undefined)
          throw new Error(`${entityPath}.initialPage: 必须与非空 pages 一起声明`)
        if (entityRecord.behaviors !== undefined)
          checkEntityBehaviorsV5(entityRecord.behaviors, entityPath)
      }

      if (entityRecord.hostile !== undefined) {
        const hostile = assertObject(entityRecord.hostile, `${entityPath}.hostile`) as Record<
          string,
          unknown
        >
        if (hostile.onLose !== undefined && hostile.onLose !== 'gameOver')
          checkAuthorCommandsV5(hostile.onLose, `${entityPath}.hostile.onLose`)
      }
    })
  })

  // 复用稳定的场景空间/资源字段 guard；v5 专属行为字段已在上方独立验证。
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

/** P7 发布前运行时/编辑器仍只接受规范 v4；v2/v3 只能在项目升级边界读取。 */
export function validateScenesForContentVersion(json: unknown, contentVersion: number): SceneDef[] {
  if (contentVersion !== 4)
    throw new Error(`scenes: 仅支持 contentVersion 4，收到 ${contentVersion}；请先迁移工程`)
  return validateSceneArray(json)
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
    }
  })
  return arr
}

export function validateSkills(json: unknown): {
  skills: SkillData[]
  levelUp: Record<string, unknown>
} {
  const o = assertObject(json, 'skills')
  requireKeys(o, ['skills', 'levelUp'], 'skills')
  const skills = assertArray<SkillData>((json as { skills: unknown }).skills, 'skills.skills')
  skills.forEach((s, i) => {
    const so = assertObject(s, `skills.skills[${i}]`) as Record<string, unknown>
    requireKeys(so, ['id', 'name', 'cost', 'target', 'effects', 'animation'], `skills.skills[${i}]`)
    const animation = assertObject(so.animation, `skills.skills[${i}].animation`) as Record<
      string,
      unknown
    >
    validateSkillAnimation(animation, `skills.skills[${i}].animation`)
    const effects = assertArray<Record<string, unknown>>(so.effects, `skills.skills[${i}].effects`)
    effects.forEach((effect, effectIndex) => {
      const eo = assertObject(effect, `skills.skills[${i}].effects[${effectIndex}]`) as Record<
        string,
        unknown
      >
      if (eo.kind === 'summon') {
        if ('godId' in eo)
          throw new Error(
            `skills.skills[${i}].effects[${effectIndex}].godId: 已退役；请使用 battleSprite`,
          )
        if (typeof eo.battleSprite !== 'string' || eo.battleSprite.length === 0)
          throw new Error(
            `skills.skills[${i}].effects[${effectIndex}].battleSprite: 期望非空 BattleSpriteDef.id`,
          )
        validateOptionalAssetId(eo, 'sound', `skills.skills[${i}].effects[${effectIndex}]`)
      }
      if (eo.kind === 'trance') {
        if ('sprite' in eo)
          throw new Error(
            `skills.skills[${i}].effects[${effectIndex}].sprite: 已退役；请使用 battleSprite`,
          )
        if (typeof eo.battleSprite !== 'string' || eo.battleSprite.length === 0)
          throw new Error(
            `skills.skills[${i}].effects[${effectIndex}].battleSprite: 期望非空 BattleSpriteDef.id`,
          )
      }
    })
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
  validateOptionalAssetId(animation, 'sound', ctx)
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
    case 'currentHpDamage': {
      requireFiniteNumber(effect.numerator, `${ctx}.numerator`, {
        positive: true,
        integer: true,
      })
      requireFiniteNumber(effect.denominator, `${ctx}.denominator`, {
        positive: true,
        integer: true,
      })
      const bonus = requireFiniteNumber(effect.bonus, `${ctx}.bonus`, { integer: true })
      if (bonus < 0) throw new Error(`${ctx}.bonus: 不得小于 0`)
      requireFiniteNumber(effect.cap, `${ctx}.cap`, { positive: true, integer: true })
      break
    }
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

function validateItemUseEffectV5(effect: Record<string, unknown>, ctx: string): void {
  if (typeof effect.kind !== 'string') throw new Error(`${ctx}.kind: 期望 string`)
  if (!(effect.kind in ITEM_USE_EFFECT_KINDS_V5))
    throw new Error(`${ctx}.kind: 未知 v5 物品效果 ${effect.kind}`)
  if (effect.kind === 'runScript') {
    requireOnlyKeys(effect, ['kind', 'script'], ctx)
    if (typeof effect.script !== 'string' || effect.script.trim().length === 0)
      throw new Error(`${ctx}.script: v5 期望稳定 shared script id`)
    return
  }
  if (effect.kind === 'itemPrivateScript') {
    requireOnlyKeys(effect, ['kind', 'script'], ctx)
    const script = assertObject(effect.script, `${ctx}.script`) as Record<string, unknown>
    requireOnlyKeys(script, ['id', 'label', 'body'], `${ctx}.script`)
    if (script.id !== 'use') throw new Error(`${ctx}.script.id: item-private 固定为 use`)
    if (script.label !== undefined && typeof script.label !== 'string')
      throw new Error(`${ctx}.script.label: 期望 string`)
    checkAuthorCommandsV5(script.body, `${ctx}.script.body`)
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
  return ref.chunk === '__script-v5-runtime' && ref.id === `item:${itemId}:${slot}`
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
      const thrown = assertObject(record.throw, `items[${i}].throw`) as Record<string, unknown>
      if (thrown.presentation !== undefined) {
        const presentation = assertObject(
          thrown.presentation,
          `items[${i}].throw.presentation`,
        ) as Record<string, unknown>
        requireOnlyKeys(presentation, ['kind', 'animation'], `items[${i}].throw.presentation`)
        if (presentation.kind !== 'magic')
          throw new Error(`items[${i}].throw.presentation.kind: 期望 magic`)
        validateSkillAnimation(
          assertObject(
            presentation.animation,
            `items[${i}].throw.presentation.animation`,
          ) as Record<string, unknown>,
          `items[${i}].throw.presentation.animation`,
        )
      }
      const effects = assertArray<Record<string, unknown>>(
        thrown.effects,
        `items[${i}].throw.effects`,
      )
      effects.forEach((effect, effectIndex) => {
        const ctx = `items[${i}].throw.effects[${effectIndex}]`
        validateItemUseEffect(effect, ctx)
        if (
          !itemUseEffectSupportsContext(
            effect as unknown as import('./item.js').ItemUseEffect,
            'throw',
          )
        )
          throw new Error(`${ctx}: ${String(effect.kind)} 不可用于投掷上下文`)
      })
    }
    if (record.equip !== undefined) {
      const equip = assertObject(record.equip, `items[${i}].equip`) as Record<string, unknown>
      const effects = assertArray<Record<string, unknown>>(
        equip.effects,
        `items[${i}].equip.effects`,
      )
      effects.forEach((effect, effectIndex) => {
        if (effect.kind !== 'battleSprite') return
        if (typeof effect.sprite !== 'string' || effect.sprite.length === 0)
          throw new Error(
            `items[${i}].equip.effects[${effectIndex}].sprite: 期望非空 BattleSpriteDef.id`,
          )
      })
    }
  })
  return arr
}

/** Canonical v5 item guard；shared script 使用稳定 id，物品私有脚本以内联唯一槽保存。 */
export function validateItemsV5(json: unknown): ItemDataV5[] {
  const arr = assertArray<ItemDataV5>(json, 'items')
  arr.forEach((item, itemIndex) => {
    const itemRecord = assertObject(item, `items[${itemIndex}]`) as Record<string, unknown>
    for (const field of ['use', 'throw'] as const) {
      if (itemRecord[field] === undefined) continue
      const spec = assertObject(itemRecord[field], `items[${itemIndex}].${field}`) as Record<
        string,
        unknown
      >
      const effects = assertArray<ItemUseEffectV5>(
        spec.effects,
        `items[${itemIndex}].${field}.effects`,
      )
      effects.forEach((effect, effectIndex) => {
        const ctx = `items[${itemIndex}].${field}.effects[${effectIndex}]`
        validateItemUseEffectV5(effect as unknown as Record<string, unknown>, ctx)
        if (field === 'throw' && !itemUseEffectSupportsContextV5(effect, 'throw'))
          throw new Error(`${ctx}: ${effect.kind} 不可用于投掷上下文`)
      })
      const privateScripts = effects.filter((effect) => effect.kind === 'itemPrivateScript')
      if (privateScripts.length > 1)
        throw new Error(`items[${itemIndex}].${field}.effects: item-private use 槽只能出现一次`)
    }
    if (item.use !== undefined) {
      const supportsWorld = itemUseSupportsContextV5(item.use, 'world')
      const supportsBattle = itemUseSupportsContextV5(item.use, 'battle')
      if (item.use.effects.length > 0 && item.use.battleOnly === true && !supportsBattle)
        throw new Error(`items[${itemIndex}].use.effects: battleOnly 用途包含不可用于战斗的效果`)
      if (item.use.effects.length > 0 && !supportsWorld && !supportsBattle)
        throw new Error(`items[${itemIndex}].use.effects: 效果组合不存在可执行的世界/战斗上下文`)
    }
  })

  // 复用 v4 非脚本物品规则；脚本效果只替换成等价的世界专用占位引用。
  const commonShape = arr.map((item) => {
    const mapSpec = (spec: ItemDataV5['use'] | ItemDataV5['throw']) => {
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
            return { kind: 'runScript' as const, script: { chunk: '__v5__', id: 'script' } }
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
    return { ...item, use: mapSpec(item.use), throw: mapSpec(item.throw) }
  })
  validateItems(commonShape)
  return arr
}

/** 战场定义 guard；背景只接受稳定 AssetId，缺席明确表示黑底。 */
export function validateBattleFields(json: unknown): BattleFieldDef[] {
  const arr = assertArray<BattleFieldDef>(json, 'battleFields')
  arr.forEach((field, index) => {
    const ctx = `battleFields[${index}]`
    const record = assertObject(field, ctx) as Record<string, unknown>
    requireKeys(record, ['id', 'screenWave', 'magicEffect'], ctx)
    if (!Number.isInteger(record.id) || (record.id as number) < 0)
      throw new Error(`${ctx}.id: 期望非负整数`)
    if (record.name !== undefined && typeof record.name !== 'string')
      throw new Error(`${ctx}.name: 期望 string`)
    if ('bg' in record) throw new Error(`${ctx}.bg: 旧路径字段已退役，请升级为 background AssetId`)
    validateOptionalAssetId(record, 'background', ctx)
    if (typeof record.screenWave !== 'number' || !Number.isFinite(record.screenWave))
      throw new Error(`${ctx}.screenWave: 期望有限数`)
    const magicEffect = assertObject(record.magicEffect, `${ctx}.magicEffect`) as Record<
      string,
      unknown
    >
    for (const element of ['wind', 'thunder', 'water', 'fire', 'earth'] as const) {
      if (typeof magicEffect[element] !== 'number' || !Number.isFinite(magicEffect[element]))
        throw new Error(`${ctx}.magicEffect.${element}: 期望有限数`)
    }
  })
  return arr
}

/** 敌人定义轻量 guard；音效边界必须拒绝旧数字/负号协议。 */
export function validateEnemies(json: unknown): EnemyDef[] {
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
      const choreography = assertArray<Record<string, unknown>>(
        record.choreography,
        `${ctx}.choreography`,
      )
      choreography.forEach((hook, hookIndex) => {
        const body = assertObject(hook, `${ctx}.choreography[${hookIndex}]`) as Record<
          string,
          unknown
        >
        requireKeys(body, ['at', 'body'], `${ctx}.choreography[${hookIndex}]`)
        checkCommands(body.body, `${ctx}.choreography[${hookIndex}].body`)
      })
    }
    if (record.onDefeated !== undefined) checkCommands(record.onDefeated, `${ctx}.onDefeated`)
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
  opts: { allowLegacySoftWrap?: boolean } = {},
): Record<string, string> {
  const o = assertObject(json, 'locale')
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== 'string') throw new Error(`locale: 键 "${k}" 的值非string`)
    if (!opts.allowLegacySoftWrap && /[\r\n]/.test(v))
      throw new Error(`locale: 键 "${k}" 含换行；请拆成 DialogueCue.rows`)
  }
  return o as Record<string, string>
}
