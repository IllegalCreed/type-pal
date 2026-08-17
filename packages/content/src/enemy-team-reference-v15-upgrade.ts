import type { ManifestV14, ManifestV15 } from './character.js'

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function teamId(value: unknown, path: string): string {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new Error(`${path}: 期望非负安全整数`)
  return `team-${String(value)}`
}

/** content14 -> 15 的唯一内容变换；同树覆盖 hostile 和所有 startBattle 根。 */
export function upgradeEnemyTeamReferencesV14ToV15<T>(input: T, rootPath = 'content'): T {
  const visit = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) return value.map((entry, index) => visit(entry, `${path}[${index}]`))
    if (!value || typeof value !== 'object') return value
    const current = value as Record<string, unknown>
    if (current.kind === 'startBattle') {
      if ('enemyTeamId' in current)
        throw new Error(`${path}: 已是 content15 startBattle，拒绝重复升级`)
      const next = Object.fromEntries(
        Object.entries(current)
          .filter(([key]) => key !== 'team')
          .map(([key, child]) => [key, visit(child, `${path}.${key}`)]),
      )
      next.enemyTeamId = teamId(current.team, `${path}.team`)
      return next
    }
    const next = Object.fromEntries(
      Object.entries(current).map(([key, child]) => [key, visit(child, `${path}.${key}`)]),
    )
    if ('hostile' in current && current.hostile !== undefined) {
      const hostile = record(next.hostile, `${path}.hostile`)
      if ('enemyTeamId' in hostile) throw new Error(`${path}.hostile: 已是 content15，拒绝重复升级`)
      next.hostile = {
        ...Object.fromEntries(Object.entries(hostile).filter(([key]) => key !== 'team')),
        enemyTeamId: teamId(hostile.team, `${path}.hostile.team`),
      }
    }
    return next
  }
  return visit(input, rootPath) as T
}

export function upgradeManifestV14ToV15(manifest: ManifestV14): ManifestV15 {
  if (manifest.contentVersion !== 14)
    throw new Error(`manifest: 期望 contentVersion 14，收到 ${String(manifest.contentVersion)}`)
  if (manifest.minimumSaveVersion !== 8)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion 14 期望 8，收到 ${String(manifest.minimumSaveVersion)}`,
    )
  return { ...(JSON.parse(JSON.stringify(manifest)) as ManifestV14), contentVersion: 15 }
}
