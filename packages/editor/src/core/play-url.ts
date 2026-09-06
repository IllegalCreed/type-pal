import { isWorkspaceId } from './workspace-context.js'

/** Workspace identity is independent of whether this editor has bound a local content directory. */
export interface EditorPlayIdentity {
  readonly projectId: string
  readonly workspaceId: string
  readonly source: 'http' | 'local'
}

export type PlayProjectLocation =
  | Readonly<{ source: 'local'; projectId: string; workspaceId: string }>
  | Readonly<{ source: 'http'; projectId: string; saveWorkspaceId?: string }>

export function playProjectQuery(identity: EditorPlayIdentity): string {
  if (
    !identity ||
    typeof identity.projectId !== 'string' ||
    !identity.projectId.trim() ||
    !isWorkspaceId(identity.workspaceId) ||
    !['http', 'local'].includes(identity.source)
  )
    throw new Error('试玩项目或工作区身份无效')
  const key = identity.source === 'local' ? 'workspace' : 'save-workspace'
  return `project=${encodeURIComponent(identity.projectId)}&${key}=${encodeURIComponent(identity.workspaceId)}`
}

/** Reject ambiguous identities before any loader/handle/storage access; other game parameters stay untouched. */
export function parsePlayProjectLocation(params: URLSearchParams): PlayProjectLocation {
  for (const key of ['project', 'workspace', 'save-workspace'])
    if (params.getAll(key).length > 1) throw new Error(`试玩身份参数 ${key} 重复`)
  const projectId = params.get('project')
  if (projectId === null || !projectId.trim()) throw new Error('缺少有效的试玩项目标识')
  const local = params.has('workspace'),
    scopedHttp = params.has('save-workspace')
  if (local && scopedHttp) throw new Error('试玩工作区参数不能同时指定')
  if (local || scopedHttp) {
    const workspaceId = params.get(local ? 'workspace' : 'save-workspace')
    if (!isWorkspaceId(workspaceId)) throw new Error('试玩工作区标识无效')
    return local
      ? { source: 'local', projectId, workspaceId }
      : { source: 'http', projectId, saveWorkspaceId: workspaceId }
  }
  return { source: 'http', projectId }
}
