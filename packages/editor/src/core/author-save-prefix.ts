import { type AuthorSavePlan, type SaveSignature, savePrefix } from './author-save-plan.js'

export interface SaveCursor {
  completed: number
  /** Durable issuance BEFORE author IO; at most one operation can be uncertain. */
  issued: boolean
}
export interface SaveDiskState {
  files: ReadonlyMap<string, SaveSignature>
  directories: ReadonlyMap<string, boolean>
}
const EMPTY_FILE: SaveSignature =
  'bin:0:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

export class AuthorSaveRecoveryConflict extends Error {
  constructor(readonly path: string) {
    super(`项目恢复冲突：${path}；已停止恢复，未继续覆盖，恢复数据仍保留`)
    this.name = 'AuthorSaveRecoveryConflict'
  }
}

/**
 * Reconcile a crash's one uncertain operation against the FULL authorized prefix.
 * This does not perform writes or authorize recovery. Arbitrary future target bytes are rejected.
 */
export function reconcileSaveCursor(
  plan: AuthorSavePlan,
  cursor: SaveCursor,
  disk: SaveDiskState,
): SaveCursor {
  if (typeof cursor.issued !== 'boolean') throw new Error('恢复 issued 状态无效')
  const expected = savePrefix(plan, cursor.completed)
  let result = { ...cursor }
  if (cursor.issued) {
    const step = plan.steps[cursor.completed]
    if (!step) throw new Error('恢复已完成但仍有 issued 步骤')
    if (step.kind === 'mkdir') {
      const actual = disk.directories.get(step.path)
      if (actual === true) {
        expected.directories.set(step.path, true)
        result = { completed: cursor.completed + 1, issued: false }
      } else if (actual !== expected.directories.get(step.path)) {
        throw new AuthorSaveRecoveryConflict(step.path)
      }
    } else {
      const actual = disk.files.get(step.path)
      const before = expected.files.get(step.path)
      const after = step.kind === 'write' ? step.signature : null
      if (actual === after) {
        expected.files.set(step.path, after)
        result = { completed: cursor.completed + 1, issued: false }
      } else if (step.kind === 'write' && before === null && actual === EMPTY_FILE) {
        // getFileHandle(create:true) succeeded, but the first stream never closed.
        expected.files.set(step.path, EMPTY_FILE)
      } else if (actual !== before) {
        throw new AuthorSaveRecoveryConflict(step.path)
      }
    }
  }
  for (const [path, signature] of expected.files)
    if (!disk.files.has(path) || disk.files.get(path) !== signature)
      throw new AuthorSaveRecoveryConflict(path)
  for (const [path, exists] of expected.directories)
    if (!disk.directories.has(path) || disk.directories.get(path) !== exists)
      throw new AuthorSaveRecoveryConflict(path)
  return result
}
