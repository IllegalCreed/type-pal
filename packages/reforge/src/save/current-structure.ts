import { type CharacterInstance, HIDDEN_STAT_KEYS, isCarryableStatusId } from '@type-pal/content'
import { type CurrentSavePayload, SAVE_VERSION } from './types.js'

/**
 * SAVE-PREFLIGHT-1：当前 SAVE12 载荷的确定性结构 guard。
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
 * 画布 toast 自逻辑 x=120 起单行绘制（320 宽画布仅余 200px）；带字段路径的文案按真实
 * 字形宽度可超限（如 hiddenExp["luck"].exp ≈248px，R4 实测），字符数截断不保证像素可见。
 * 因此 toast 用固定短文案；`message` 仍携带完整路径供 console.warn 与测试断言。
 */
export const SAVE_STRUCTURE_TOAST_TEXT = '存档损坏，无法读取'

export class CurrentSaveStructureError extends Error {
  readonly field: string
  readonly expected: string
  readonly shortMessage: string

  constructor(field: string, expected: string) {
    super(`存档 ${field} ${expected}`)
    this.name = 'CurrentSaveStructureError'
    this.field = field
    this.expected = expected
    this.shortMessage = SAVE_STRUCTURE_TOAST_TEXT
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

function requireNonNegative(value: unknown, path: string, integer = false): void {
  const number = requireFiniteNumber(value, path)
  if (number < 0 || (integer && !Number.isSafeInteger(number)))
    fail(path, integer ? '必须为非负安全整数' : '必须为非负有限数')
}

function assertSceneRuntime(value: unknown, path: string): void {
  for (const [scene, raw] of Object.entries(requireRecord(value, path))) {
    const p = `${path}.${scene}`,
      saved = requireRecord(raw, p)
    requireNonEmptyString(scene, p)
    for (const [id, rawPose] of Object.entries(requireRecord(saved.entities, `${p}.entities`))) {
      const q = `${p}.entities.${id}`,
        pose = requireRecord(rawPose, q)
      requireNonEmptyString(id, q)
      optional(pose.facing, `${q}.facing`, (v, at) => {
        if (typeof v !== 'string' || !FACINGS.has(v)) fail(at, '必须为四向朝向')
      })
      optional(pose.fixedFrame, `${q}.fixedFrame`, (v, at) => requireNonNegative(v, at, true))
      const motion = requireRecord(pose.motion, `${q}.motion`)
      optional(motion.explicitAnimation, `${q}.motion.explicitAnimation`, (v, at) =>
        requireNonNegative(v, at, true),
      )
      optional(motion.gait, `${q}.motion.gait`, (v, at) => {
        const gait = requireRecord(v, at)
        requireNonNegative(gait.phase, `${at}.phase`, true)
        optional(gait.owner, `${at}.owner`, requireNonEmptyString)
        if (
          typeof gait.source !== 'string' ||
          !['player', 'auto', 'hostile', 'script-chase', 'script'].includes(gait.source)
        )
          fail(`${at}.source`, '不是移动来源')
        if (gait.source === 'auto') requireNonEmptyString(gait.owner, `${at}.owner`)
      })
      optional(motion.move, `${q}.motion.move`, (v, at) => {
        const move = requireRecord(v, at)
        requireNonEmptyString(move.owner, `${at}.owner`)
        assertGridPos(move.to, `${at}.to`)
        if (
          typeof move.speed !== 'string' ||
          !['slow', 'normal', 'fast', 'run'].includes(move.speed)
        )
          fail(`${at}.speed`, '不是移动速度')
        for (const key of ['slowRestPending', 'slowCadence'])
          if (typeof move[key] !== 'boolean') fail(`${at}.${key}`, '必须为布尔值')
      })
    }
    eachIndex(requireArray(saved.actions, `${p}.actions`), `${p}.actions`, (rawAction, at) => {
      const action = requireRecord(rawAction, at)
      requireNonEmptyString(action.entity, `${at}.entity`)
      const track = (rawTrack: unknown, q: string): void => {
        const value = requireRecord(rawTrack, q)
        const binding = requireRecord(value.binding, `${q}.binding`)
        requireNonEmptyString(binding.sprite, `${q}.binding.sprite`)
        requireNonEmptyString(binding.action, `${q}.binding.action`)
        if (typeof binding.loop !== 'boolean') fail(`${q}.binding.loop`, '必须为布尔值')
        optional(binding.startAtMs, `${q}.binding.startAtMs`, requireNonNegative)
        if (value.source !== 'automatic' && value.source !== 'script')
          fail(`${q}.source`, '不是动作来源')
        optional(value.owner, `${q}.owner`, requireNonEmptyString)
        requireNonNegative(value.stepIndex, `${q}.stepIndex`, true)
        requireNonNegative(value.elapsedInStepMs, `${q}.elapsedInStepMs`)
        for (const key of ['finished', 'awaited'])
          if (typeof value[key] !== 'boolean') fail(`${q}.${key}`, '必须为布尔值')
        optional(value.pendingLoopStartAtMs, `${q}.pendingLoopStartAtMs`, requireNonNegative)
      }
      optional(action.base, `${at}.base`, track)
      optional(action.override, `${at}.override`, track)
      optional(action.completed, `${at}.completed`, (value, q) =>
        eachIndex(requireArray(value, q), q, track),
      )
    })
    for (const [id, rawAutomatic] of Object.entries(
      requireRecord(saved.automatic, `${p}.automatic`),
    )) {
      const q = `${p}.automatic.${id}`,
        automatic = requireRecord(rawAutomatic, q)
      requireNonEmptyString(id, q)
      // The exact continuation is validated against the canonical world's existing cursor guard.
      requireRecord(automatic.cursor, `${q}.cursor`)
      optional(automatic.wait, `${q}.wait`, (v, at) => {
        const wait = requireRecord(v, at)
        if (
          typeof wait.kind !== 'string' ||
          !['command', 'chase-pacing', 'chase-terminal', 'chase-range', 'chase-hidden'].includes(
            wait.kind,
          )
        )
          fail(`${at}.kind`, '不是自动等待类型')
        requireNonNegative(wait.durationMs, `${at}.durationMs`)
        requireNonNegative(wait.remainingMs, `${at}.remainingMs`)
        if (Number(wait.remainingMs) > Number(wait.durationMs)) fail(at, '剩余等待不能超过原时长')
      })
    }
    assertAutomaticChaseClaims(saved.chaseClaims, `${p}.chaseClaims`)
  }
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

function assertAutomaticChaseClaims(value: unknown, path: string): void {
  const claims = requireArray(value, path)
  const targets = new Set<string>()
  eachIndex(claims, path, (entry, p) => {
    const claim = requireRecord(entry, p)
    for (const key of Object.keys(claim))
      if (key !== 'owner' && key !== 'target' && key !== 'behavior')
        fail(`${p}.${key}`, '不是追逐认领字段')
    requireNonEmptyString(claim.behavior, `${p}.behavior`)
    for (const key of ['owner', 'target']) {
      const address = requireRecord(claim[key], `${p}.${key}`)
      for (const field of Object.keys(address))
        if (field !== 'scene' && field !== 'entity')
          fail(`${p}.${key}.${field}`, '不是实体地址字段')
      requireNonEmptyString(address.scene, `${p}.${key}.scene`)
      requireNonEmptyString(address.entity, `${p}.${key}.entity`)
    }
    const target = requireRecord(claim.target, `${p}.target`)
    const id = JSON.stringify([target.scene, target.entity])
    if (targets.has(id)) fail(`${p}.target`, '追逐目标不得重复')
    targets.add(id)
  })
}

export function assertCurrentSaveStructure(value: unknown): asserts value is CurrentSavePayload {
  const payload = requireRecord(value, '载荷')
  if (payload.version !== SAVE_VERSION) fail('载荷.version', `必须为 ${SAVE_VERSION}`)
  requireNonEmptyString(payload.projectId, '载荷.projectId')
  if (typeof payload.contentVersion !== 'number')
    fail('载荷.contentVersion', '必须为数字（等值校验由 preflight 负责）')
  assertWorld(payload.world, '载荷.world')
  assertPosition(payload.position, '载荷.position')
  assertSceneRuntime(payload.sceneRuntime, '载荷.sceneRuntime')
}

export type { CharacterInstance }
