/** Runtime storage identity, not a field in the portable current save payload. */
export type SaveScope =
  | Readonly<{ kind: 'project'; projectId: string }>
  | Readonly<{ kind: 'workspace'; projectId: string; workspaceId: string }>

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Snapshot caller-owned input so neither async opens nor later mutations can redirect a store. */
export function normalizeSaveScope(value: unknown): SaveScope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('存档归属无效')
  const scope = value as Record<string, unknown>
  const { kind, projectId } = scope
  if (kind !== 'project' && kind !== 'workspace') throw new Error('存档归属类型无效')
  const allowed = kind === 'project' ? ['kind', 'projectId'] : ['kind', 'projectId', 'workspaceId']
  const keys = Reflect.ownKeys(scope)
  if (
    keys.length !== allowed.length ||
    keys.some((key) => typeof key !== 'string' || !allowed.includes(key))
  )
    throw new Error('存档归属字段无效')
  if (!nonBlank(projectId)) throw new Error('存档项目标识无效')
  if (kind === 'project') return Object.freeze({ kind, projectId })
  const { workspaceId } = scope
  if (!nonBlank(workspaceId)) throw new Error('存档工作区标识无效')
  return Object.freeze({ kind, projectId, workspaceId })
}

export function assertSaveScopeProject(scope: SaveScope, projectId: string): SaveScope {
  const bound = normalizeSaveScope(scope)
  if (bound.projectId !== projectId) throw new Error('存档归属与当前项目不一致')
  return bound
}

/** Ordered, tagged tuples preserve exact ids without delimiter collisions or legacy lookups. */
export function saveScopeDatabaseName(scope: SaveScope): string {
  const bound = normalizeSaveScope(scope)
  const tuple =
    bound.kind === 'project'
      ? ['project', bound.projectId]
      : ['workspace', bound.projectId, bound.workspaceId]
  return `type-pal-saves:${JSON.stringify(tuple)}`
}
