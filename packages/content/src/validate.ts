// 轻量 guard(zod 接缝):校验 loader 加载的工程 JSON 形状。
// 只查「数组/对象 + 必需键在 + id 是 string」,不齐就 throw 具体错误。
// 编辑器产大量手改 JSON 时再上 zod(局部替换这些函数,签名不变)。
import type { CharacterTemplate, ItemData, SceneDef, SkillData } from './index.js'

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
  })
  return arr
}

export function validateCharacters(json: unknown): CharacterTemplate[] {
  const arr = assertArray<CharacterTemplate>(json, 'characters')
  arr.forEach((c, i) => {
    const o = assertObject(c, `characters[${i}]`)
    requireKeys(o, ['id', 'baseStats', 'initialEquipment', 'initialMagic'], `characters[${i}]`)
    if (typeof (c as { id: unknown }).id !== 'string')
      throw new Error(`characters[${i}]: id 非string`)
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

export function validateLocale(json: unknown): Record<string, string> {
  const o = assertObject(json, 'locale')
  // 值都应是 string
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== 'string') throw new Error(`locale: 键 "${k}" 的值非string`)
  }
  return o as Record<string, string>
}
