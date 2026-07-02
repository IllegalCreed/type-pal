// 轻量 guard(zod 接缝):校验 loader 加载的工程 JSON 形状。
// 只查「数组/对象 + 必需键在 + id 是 string」,不齐就 throw 具体错误。
// 编辑器产大量手改 JSON 时再上 zod(局部替换这些函数,签名不变)。
import type { ActorDef, ItemData, SceneDef, SkillData, SpriteDef } from './index.js'

/** 显式要求的对象键;缺任一 throw。 */
function requireKeys(obj: object, keys: readonly string[], ctx: string): void {
  for (const k of keys) {
    if (!(k in obj)) throw new Error(`${ctx}: 缺键 "${k}"`)
  }
}

function assertArray<T>(x: unknown, ctx: string): T[] {
  if (!Array.isArray(x)) throw new Error(`${ctx}: 期望数组`)
  return x as T[]
}

function assertObject(x: unknown, ctx: string): object {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) throw new Error(`${ctx}: 期望对象`)
  return x as object
}

export function validateScenes(json: unknown): SceneDef[] {
  const arr = assertArray<SceneDef>(json, 'scenes')
  arr.forEach((s, i) => {
    const o = assertObject(s, `scenes[${i}]`)
    requireKeys(o, ['id', 'map', 'entry', 'entities', 'dialogues'], `scenes[${i}]`)
    if (typeof (s as { id: unknown }).id !== 'string') throw new Error(`scenes[${i}]: id 非string`)
    // paletteId 可选;若在则须 number(缺省 0 由调用方 ?? 兜)。
    const paletteId = (s as { paletteId?: unknown }).paletteId
    if (paletteId !== undefined && typeof paletteId !== 'number')
      throw new Error(`scenes[${i}]: paletteId 非number`)
    // 实体引用:actor ⊕ sprite 恰一(C0;都有/都无 → 数据错)。
    const ents = (s as { entities: unknown }).entities
    if (!Array.isArray(ents)) throw new Error(`scenes[${i}].entities: 期望数组`)
    ents.forEach((e, j) => {
      const eo = assertObject(e, `scenes[${i}].entities[${j}]`)
      requireKeys(eo, ['id', 'pos'], `scenes[${i}].entities[${j}]`)
      const hasActor = 'actor' in eo
      const hasSprite = 'sprite' in eo
      if (hasActor === hasSprite)
        throw new Error(
          `scenes[${i}].entities[${j}]: 须恰有 actor 或 sprite 之一(现${hasActor ? '两者都有' : '两者都无'})`,
        )
    })
  })
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
    const battler = (a as { battler?: unknown }).battler
    if (battler !== undefined) {
      const bo = assertObject(battler, `actors[${i}].battler`)
      requireKeys(bo, ['baseStats', 'initialEquipment', 'initialMagic'], `actors[${i}].battler`)
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
    const so = assertObject(s, `skills.skills[${i}]`)
    requireKeys(so, ['id', 'name', 'cost', 'target', 'effects', 'animation'], `skills.skills[${i}]`)
  })
  assertObject((json as { levelUp: unknown }).levelUp, 'skills.levelUp')
  return { skills, levelUp: (json as { levelUp: Record<string, unknown> }).levelUp }
}

export function validateItems(json: unknown): ItemData[] {
  const arr = assertArray<ItemData>(json, 'items')
  arr.forEach((it, i) => {
    const o = assertObject(it, `items[${i}]`)
    requireKeys(o, ['id', 'name', 'icon', 'buyPrice', 'sellPrice', 'sellable'], `items[${i}]`)
    if (typeof (it as { id: unknown }).id !== 'string') throw new Error(`items[${i}]: id 非string`)
  })
  return arr
}

/** 精灵注册表形状校验:id/spriteNum/label + layout(kind 合法 + 按 kind 的必需字段)。 */
export function validateSprites(json: unknown): SpriteDef[] {
  const arr = assertArray<SpriteDef>(json, 'sprites')
  arr.forEach((sp, i) => {
    const o = assertObject(sp, `sprites[${i}]`)
    requireKeys(o, ['id', 'spriteNum', 'label', 'layout'], `sprites[${i}]`)
    const id = (sp as { id: unknown }).id
    if (typeof id !== 'string') throw new Error(`sprites[${i}]: id 非string`)
    const spriteNum = (sp as { spriteNum: unknown }).spriteNum
    if (typeof spriteNum !== 'number') throw new Error(`sprites[${i}]: spriteNum 非number`)
    if (typeof (sp as { label: unknown }).label !== 'string')
      throw new Error(`sprites[${i}]: label 非string`)
    const layout = assertObject((sp as { layout: unknown }).layout, `sprites[${i}].layout`)
    const kind = (layout as { kind?: unknown }).kind
    if (kind === 'directional') {
      if (typeof (layout as { framesPerDir?: unknown }).framesPerDir !== 'number')
        throw new Error(`sprites[${i}].layout: directional 缺 framesPerDir(number)`)
    } else if (kind === 'loop') {
      if (typeof (layout as { frameCount?: unknown }).frameCount !== 'number')
        throw new Error(`sprites[${i}].layout: loop 缺 frameCount(number)`)
    } else if (kind !== 'static') {
      throw new Error(`sprites[${i}].layout: kind 非法("${String(kind)}")`)
    }
  })
  return arr
}

export function validateLocale(json: unknown): Record<string, string> {
  const o = assertObject(json, 'locale')
  // 值都应是 string
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== 'string') throw new Error(`locale: 键 "${k}" 的值非string`)
  }
  return o as Record<string, string>
}
