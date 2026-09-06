import { type CharacterInstance, HIDDEN_STAT_KEYS } from '@type-pal/content'
import { type CurrentSavePayload, SAVE_VERSION } from './types.js'

/**
 * SAVE-PREFLIGHT-1：当前 SAVE8 载荷的确定性结构 guard。
 *
 * 从 unknown 开始先校验再当作类型使用；字段清单以 `save/types.ts` 的 `CurrentSavePayload` 与
 * `content/character.ts` 的 `WorldState`/`CharacterInstance` 现行类型为唯一真源：
 * 必需字段缺失即拒、可选子树缺席合法、存在时按形状检查。数值叶只要求有限数
 * （Number.isFinite）——不发明数值上限、取整、非负或可通行约束；脚本世界态有分数格位移
 * （grid.ts pixelDeltaToGridDelta），坐标三轴按有限数放行。
 *
 * 深层语义子树（script / hostileAwareness / skillUseCounts / entityLifecycles）仍由
 * current-codec 的既有 guard/normalizer 校验，本模块只验它们的外层形状，不复制第二套解释。
 */

const FACINGS = new Set(['up', 'down', 'left', 'right'])
const HIDDEN_KEYS = new Set<string>(HIDDEN_STAT_KEYS)

function fail(path: string, expected: string): never {
  throw new Error(`存档 ${path} ${expected}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail(path, '必须为对象')
  return value
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, '必须为数组')
  return value
}

function requireFiniteNumber(value: unknown, path: string): number {
  if (!isFiniteNumber(value)) fail(path, '必须为有限数')
  return value
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(path, '必须为非空字符串')
  return value
}

function requireStringArray(value: unknown, path: string): void {
  const list = requireArray(value, path)
  list.forEach((entry, index) => {
    if (typeof entry !== 'string') fail(`${path}[${index}]`, '必须为字符串')
  })
}

function requireStringRecord(value: unknown, path: string): void {
  const record = requireRecord(value, path)
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry !== 'string') fail(`${path}[${JSON.stringify(key)}]`, '必须为字符串')
  }
}

function requireFiniteNumberRecord(value: unknown, path: string): void {
  const record = requireRecord(value, path)
  for (const [key, entry] of Object.entries(record)) {
    if (!isFiniteNumber(entry)) fail(`${path}[${JSON.stringify(key)}]`, '必须为有限数')
  }
}

/** 可选子树：缺席合法；存在时按 expected 形状检查。 */
function optional(value: unknown, path: string, check: (v: unknown, p: string) => void): void {
  if (value === undefined) return
  check(value, path)
}

function assertGridPos(value: unknown, path: string): void {
  const pos = requireRecord(value, path)
  requireFiniteNumber(pos.col, `${path}.col`)
  requireFiniteNumber(pos.row, `${path}.row`)
  requireFiniteNumber(pos.height, `${path}.height`)
}

function assertCarriedStatuses(value: unknown, path: string): void {
  const list = requireArray(value, path)
  list.forEach((entry, index) => {
    const status = requireRecord(entry, `${path}[${index}]`)
    if (typeof status.status !== 'string' || status.status.length === 0)
      fail(`${path}[${index}].status`, '必须为非空字符串')
    requireFiniteNumber(status.turns, `${path}[${index}].turns`)
  })
}

function assertActivePoisons(value: unknown, path: string): void {
  const list = requireArray(value, path)
  list.forEach((entry, index) => {
    const poison = requireRecord(entry, `${path}[${index}]`)
    requireFiniteNumber(poison.poisonId, `${path}[${index}].poisonId`)
    requireFiniteNumber(poison.tickIndex, `${path}[${index}].tickIndex`)
  })
}

function assertHiddenExp(value: unknown, path: string): void {
  const record = requireRecord(value, path)
  for (const [key, entry] of Object.entries(record)) {
    if (!HIDDEN_KEYS.has(key)) fail(`${path}[${JSON.stringify(key)}]`, '不是合法的隐藏成长属性键')
    const pool = requireRecord(entry, `${path}[${JSON.stringify(key)}]`)
    requireFiniteNumber(pool.exp, `${path}[${JSON.stringify(key)}].exp`)
    requireFiniteNumber(pool.level, `${path}[${JSON.stringify(key)}].level`)
  }
}

function assertAppearance(value: unknown, path: string): void {
  const appearance = requireRecord(value, path)
  optional(appearance.spriteId, `${path}.spriteId`, (v, p) => {
    if (typeof v !== 'string') fail(p, '必须为字符串')
  })
  optional(appearance.portrait, `${path}.portrait`, (v, p) => {
    if (v !== null && typeof v !== 'string') fail(p, '必须为字符串或 null（显式无立绘）')
  })
  optional(appearance.battleSprite, `${path}.battleSprite`, (v, p) => {
    if (typeof v !== 'string') fail(p, '必须为字符串')
  })
}

function assertCharacterInstance(value: unknown, path: string): void {
  const instance = requireRecord(value, path)
  requireNonEmptyString(instance.id, `${path}.id`)
  requireNonEmptyString(instance.template, `${path}.template`)
  for (const field of [
    'level',
    'exp',
    'hp',
    'maxHP',
    'mp',
    'maxMP',
    'attack',
    'defense',
    'magicAttack',
    'speed',
    'luck',
  ] as const)
    requireFiniteNumber(instance[field], `${path}.${field}`)
  requireStringRecord(instance.equipment, `${path}.equipment`)
  requireStringArray(instance.tags, `${path}.tags`)
  optional(instance.hiddenExp, `${path}.hiddenExp`, assertHiddenExp)
  optional(instance.poisons, `${path}.poisons`, assertActivePoisons)
  optional(instance.extraStatuses, `${path}.extraStatuses`, assertCarriedStatuses)
  optional(instance.extraPoisonRes, `${path}.extraPoisonRes`, requireFiniteNumber)
  optional(instance.appearance, `${path}.appearance`, assertAppearance)
}

function assertInstanceList(value: unknown, path: string): void {
  const list = requireArray(value, path)
  for (let index = 0; index < list.length; index += 1)
    assertCharacterInstance(list[index], `${path}[${index}]`)
}

function assertInventory(value: unknown, path: string): void {
  const list = requireArray(value, path)
  list.forEach((entry, index) => {
    const slot = requireRecord(entry, `${path}[${index}]`)
    requireNonEmptyString(slot.itemId, `${path}[${index}].itemId`)
    requireFiniteNumber(slot.count, `${path}[${index}].count`)
  })
}

function assertLearnedSkills(value: unknown, path: string): void {
  const record = requireRecord(value, path)
  for (const [key, entry] of Object.entries(record))
    requireStringArray(entry, `${path}[${JSON.stringify(key)}]`)
}

function assertSkillUseCounts(value: unknown, path: string): void {
  const record = requireRecord(value, path)
  for (const [key, entry] of Object.entries(record))
    requireFiniteNumberRecord(entry, `${path}[${JSON.stringify(key)}]`)
}

function assertAudio(value: unknown, path: string): void {
  const audio = requireRecord(value, path)
  optional(audio.currentMusic, `${path}.currentMusic`, (v, p) => {
    // 缺字段 = 尚未建立音乐状态；null = 显式静音；字符串 = AssetId。
    if (v !== null && typeof v !== 'string') fail(p, '必须为字符串或 null（显式静音）')
  })
}

function assertHostileAwareness(value: unknown, path: string): void {
  const awareness = requireRecord(value, path)
  if (awareness.rangeMultiplier !== 0 && awareness.rangeMultiplier !== 3)
    fail(`${path}.rangeMultiplier`, '必须为 0 或 3')
  requireFiniteNumber(awareness.remainingMs, `${path}.remainingMs`)
}

function assertWorld(value: unknown, path: string): void {
  const world = requireRecord(value, path)
  assertInstanceList(world.party, `${path}.party`)
  optional(world.reserve, `${path}.reserve`, assertInstanceList)
  requireFiniteNumber(world.money, `${path}.money`)
  assertLearnedSkills(world.learnedSkills, `${path}.learnedSkills`)
  optional(world.skillUseCounts, `${path}.skillUseCounts`, assertSkillUseCounts)
  assertInventory(world.inventory, `${path}.inventory`)
  optional(world.ambience, `${path}.ambience`, (v, p) => {
    if (typeof v !== 'string') fail(p, '必须为字符串')
  })
  optional(world.collectValue, `${path}.collectValue`, requireFiniteNumber)
  optional(world.resources, `${path}.resources`, requireFiniteNumberRecord)
  optional(world.audio, `${path}.audio`, assertAudio)
  optional(world.hostileAwareness, `${path}.hostileAwareness`, assertHostileAwareness)
  // 深层语义由 current-codec 既有 guard/normalizer 校验；这里只验外层形状。
  optional(world.script, `${path}.script`, requireRecord)
  optional(world.entityLifecycles, `${path}.entityLifecycles`, requireRecord)
}

function assertPosition(value: unknown, path: string): void {
  const position = requireRecord(value, path)
  requireNonEmptyString(position.sceneId, `${path}.sceneId`)
  assertGridPos(position.pos, `${path}.pos`)
  if (typeof position.facing !== 'string' || !FACINGS.has(position.facing))
    fail(`${path}.facing`, '必须为 up/down/left/right 四方向枚举')
}

export function assertCurrentSaveStructure(value: unknown): asserts value is CurrentSavePayload {
  const payload = requireRecord(value, '载荷')
  if (payload.version !== SAVE_VERSION) fail('载荷.version', `必须为 ${SAVE_VERSION}`)
  requireNonEmptyString(payload.projectId, '载荷.projectId')
  if (typeof payload.contentVersion !== 'number')
    fail('载荷.contentVersion', '必须为数字（等值校验由 preflight 负责）')
  assertWorld(payload.world, '载荷.world')
  assertPosition(payload.position, '载荷.position')
}

export type { CharacterInstance }
