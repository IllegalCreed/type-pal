import { type CharacterInstance, HIDDEN_STAT_KEYS, isCarryableStatusId } from '@type-pal/content'
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
 * 状态枚举复用 content 的 `isCarryableStatusId` 真源，不另建清单。
 */

/** 数组逐下标校验（含稀疏空洞——forEach 会跳过洞，坏载荷可借此漏检）。 */
function eachIndex(
  list: readonly unknown[],
  path: string,
  check: (entry: unknown, p: string) => void,
): void {
  for (let index = 0; index < list.length; index += 1) check(list[index], `${path}[${index}]`)
}

/**
 * 画布 toast 单行自逻辑 x≈120 起绘；完整字段路径可能超出画布（R4）。
 * `message` 携带完整路径供日志/测试断言；`shortMessage` 只取末段字段名且限长，保证完整可见。
 */
export class CurrentSaveStructureError extends Error {
  readonly field: string
  readonly expected: string
  readonly shortMessage: string

  constructor(field: string, expected: string) {
    super(`存档 ${field} ${expected}`)
    this.name = 'CurrentSaveStructureError'
    this.field = field
    this.expected = expected
    const leaf = field.split('.').slice(-2).join('.').slice(0, 24)
    this.shortMessage = `存档损坏：${leaf}`
  }
}

const FACINGS = new Set(['up', 'down', 'left', 'right'])
const HIDDEN_KEYS = new Set<string>(HIDDEN_STAT_KEYS)

function fail(path: string, expected: string): never {
  throw new CurrentSaveStructureError(path, expected)
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
  eachIndex(list, path, (entry, p) => {
    if (typeof entry !== 'string') fail(p, '必须为字符串')
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
  eachIndex(list, path, (entry, p) => {
    const status = requireRecord(entry, p)
    if (!isCarryableStatusId(status.status)) fail(`${p}.status`, '必须是可携带状态枚举')
    requireFiniteNumber(status.turns, `${p}.turns`)
  })
}

function assertActivePoisons(value: unknown, path: string): void {
  const list = requireArray(value, path)
  eachIndex(list, path, (entry, p) => {
    const poison = requireRecord(entry, p)
    requireFiniteNumber(poison.poisonId, `${p}.poisonId`)
    requireFiniteNumber(poison.tickIndex, `${p}.tickIndex`)
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
    // 类型是 AssetId | undefined（string）；null 不在合同内（audio.currentMusic 的显式静音
    // 语义不外推到这里）。
    if (typeof v !== 'string') fail(p, '必须为字符串')
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
  eachIndex(list, path, (entry, p) => assertCharacterInstance(entry, p))
}

function assertInventory(value: unknown, path: string): void {
  const list = requireArray(value, path)
  eachIndex(list, path, (entry, p) => {
    const slot = requireRecord(entry, p)
    requireNonEmptyString(slot.itemId, `${p}.itemId`)
    requireFiniteNumber(slot.count, `${p}.count`)
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
