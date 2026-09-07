/** Read-only author-save admission protocol. A disk record never grants write authority. */
import type { FileSource } from './file-source.js'

export const PROJECT_SAVE_STATE_PATH = '.type-pal/save-state.json'
export const PROJECT_SAVE_RECOVERY_PATH = '.type-pal/save-recovery'

export interface ProjectSaveState {
  kind: 'type-pal-author-save'
  version: 1
  operationId: string
  phase: 'pending' | 'committed'
  planHash: string
}

export function parseProjectSaveState(value: unknown): ProjectSaveState {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('项目保存状态损坏，请保留目录并回到编辑器处理')
  const record = value as Record<string, unknown>
  if (
    Object.keys(record).sort().join(',') !== 'kind,operationId,phase,planHash,version' ||
    record.kind !== 'type-pal-author-save' ||
    record.version !== 1 ||
    typeof record.operationId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(record.operationId) ||
    (record.phase !== 'pending' && record.phase !== 'committed') ||
    typeof record.planHash !== 'string' ||
    !/^[0-9a-f]{64}$/.test(record.planHash)
  )
    throw new Error('项目保存状态无效或版本不符，请保留目录并回到编辑器处理')
  return {
    kind: record.kind,
    version: record.version,
    operationId: record.operationId,
    phase: record.phase,
    planHash: record.planHash,
  }
}

export async function readProjectSaveState(source: FileSource): Promise<ProjectSaveState | null> {
  let text: string
  try {
    text = await source.readText(PROJECT_SAVE_STATE_PATH)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return null
    throw error
  }
  // In particular, 200 HTML, empty files and malformed JSON are NOT a missing record.
  try {
    return parseProjectSaveState(JSON.parse(text) as unknown)
  } catch (cause) {
    throw new Error('项目保存状态无法读取，请保留目录并回到编辑器处理', { cause })
  }
}

export function projectSaveStateToken(state: ProjectSaveState | null): string {
  return JSON.stringify(state)
}

export async function assertProjectSaveReadable(source: FileSource): Promise<string> {
  const state = await readProjectSaveState(source)
  if (state?.phase === 'pending')
    throw new Error('项目有未完成的保存，请先在编辑器打开原目录完成恢复')
  return projectSaveStateToken(state)
}

/** Operation-scoped admission, not a live-project snapshot or an HTTP publishing transaction. */
export async function withStableProjectRead<T>(
  source: FileSource,
  read: () => Promise<T>,
): Promise<T> {
  const before = await assertProjectSaveReadable(source)
  const result = await read()
  if ((await assertProjectSaveReadable(source)) !== before)
    throw new Error('项目在读取期间完成了新的保存，请重新打开')
  return result
}
