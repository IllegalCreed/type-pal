import { loadWorkspaceRecord, type WorkspaceHandleRecord } from './handle-store.js'

export async function resolvePlayWorkspaceRecord(
  workspaceId: string,
  projectId: string,
  loadRecord: (workspaceId: string) => Promise<WorkspaceHandleRecord | null> = loadWorkspaceRecord,
): Promise<WorkspaceHandleRecord> {
  const record = await loadRecord(workspaceId)
  if (!record) throw new Error('本地工作区句柄已失效，请回到编辑器重新打开项目。')
  if (record.projectId !== projectId)
    throw new Error('试玩链接的项目 id 与本地 workspace identity 不一致。')
  return record
}

export function assertLoadedPlayProjectIdentity(
  expectedProjectId: string,
  actualProjectId: string,
): void {
  if (actualProjectId !== expectedProjectId)
    throw new Error('本地目录 manifest 项目 id 与试玩 workspace identity 不一致。')
}
