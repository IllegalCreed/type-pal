import type { LegacyManifestV11, LegacyManifestV12 } from './character.js'
import type { EnemyTeamDef, LegacyEnemyTeamDefV11 } from './enemy.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  path: string,
): void {
  const allowed = new Set(keys)
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${path}.${key}: 未知字段`)
  }
}

/** 严格校验 v12 敌队结构；不做跨表引用检查。 */
export function validateEnemyTeamStructureV12(value: unknown): EnemyTeamDef[] {
  if (!Array.isArray(value)) throw new Error('enemyTeams: 期望数组')
  const seen = new Set<string>()
  return value.map((raw, index) => {
    const path = `enemyTeams[${index}]`
    if (!isRecord(raw)) throw new Error(`${path}: 期望对象`)
    assertOnlyKeys(raw, ['id', 'slots'], path)
    if (typeof raw.id !== 'string' || raw.id.length === 0)
      throw new Error(`${path}.id: 期望非空 string`)
    if (seen.has(raw.id)) throw new Error(`${path}.id: 重复敌队 id "${raw.id}"`)
    seen.add(raw.id)
    if (!Array.isArray(raw.slots)) throw new Error(`${path}.slots: 期望数组`)
    if (raw.slots.length > 5) throw new Error(`${path}.slots: 槽位数超上限 5`)
    raw.slots.forEach((slot, slotIndex) => {
      if (slot !== null && (typeof slot !== 'string' || slot.length === 0))
        throw new Error(`${path}.slots[${slotIndex}]: 期望 string|null`)
    })
    return { id: raw.id, slots: [...raw.slots] as Array<string | null> }
  })
}

/** 严格校验 v12 敌队跨表引用；null 槽不参与引用。 */
export function validateEnemyTeamReferencesV12(
  teams: readonly EnemyTeamDef[],
  enemyIds: ReadonlySet<string>,
): void {
  teams.forEach((team, teamIndex) => {
    team.slots.forEach((enemyId, slotIndex) => {
      if (enemyId !== null && !enemyIds.has(enemyId))
        throw new Error(
          `enemyTeams[${teamIndex}](${team.id}).slots[${slotIndex}]: 敌人 "${enemyId}" 不在 enemies`,
        )
    })
  })
}

/** 组合结构与引用边界；loader/editor 应显式调用此函数。 */
export function validateEnemyTeamsV12(
  value: unknown,
  enemyIds?: ReadonlySet<string>,
): EnemyTeamDef[] {
  const teams = validateEnemyTeamStructureV12(value)
  if (enemyIds) validateEnemyTeamReferencesV12(teams, enemyIds)
  return teams
}

/** v11 → v12 本地工程升级：按原顺序把 members 映射为 slots，不凭空制造 PAL 空洞。 */
export function upgradeEnemyTeamsV11ToV12(value: unknown): EnemyTeamDef[] {
  if (!Array.isArray(value)) throw new Error('enemyTeams: v11 期望数组')
  const legacy = value.map((raw, index) => {
    const path = `enemyTeams[${index}]`
    if (!isRecord(raw)) throw new Error(`${path}: 期望对象`)
    assertOnlyKeys(raw, ['id', 'members'], path)
    if (typeof raw.id !== 'string' || raw.id.length === 0)
      throw new Error(`${path}.id: 期望非空 string`)
    if (!Array.isArray(raw.members)) throw new Error(`${path}.members: 期望数组`)
    if (raw.members.length > 5) throw new Error(`${path}.members: 成员数超上限 5`)
    raw.members.forEach((member, memberIndex) => {
      if (typeof member !== 'string' || member.length === 0)
        throw new Error(`${path}.members[${memberIndex}]: 期望非空 string`)
    })
    return raw as unknown as LegacyEnemyTeamDefV11
  })
  // 通过 current validator 检查重复 id 与最终结构，避免升级器产生半合法值。
  return validateEnemyTeamStructureV12(
    legacy.map((team) => ({ id: team.id, slots: [...team.members] })),
  )
}

/** v11 manifest → v12：只升级内容 epoch，SAVE 门槛保持 8。 */
export function upgradeManifestV11ToV12(value: unknown): LegacyManifestV12 {
  if (!isRecord(value)) throw new Error('manifest: 期望对象')
  if (value.contentVersion !== 11) throw new Error('manifest: 期望 contentVersion 11')
  if (value.minimumSaveVersion !== 8)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion 11 期望 8，收到 ${String(value.minimumSaveVersion)}`,
    )
  return {
    ...(clone(value) as unknown as LegacyManifestV11),
    contentVersion: 12,
    minimumSaveVersion: 8,
  }
}
