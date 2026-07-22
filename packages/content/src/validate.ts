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
} from './index.js'
import { isMapAssetId } from './map-index.js'
import { checkCommands, checkEntityPages, checkStages } from './script.js'

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

/** 运行时/编辑器只接受规范 contentVersion 4；v2/v3 只能在项目升级边界读取。 */
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
    validateOptionalAssetId(animation, 'sound', `skills.skills[${i}].animation`)
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
