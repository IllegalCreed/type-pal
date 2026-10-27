import {
  type AuthorSavePlan,
  copySaveBatchEnd,
  type SaveSignature,
  type SaveStep,
  savePrefix,
} from './author-save-plan.js'

export interface SaveCursor {
  completed: number
  /** Durable issuance BEFORE author IO; at most one operation can be uncertain. */
  issued: boolean
  batchEnd?: number | null
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
  if (!cursor.issued && cursor.batchEnd != null) throw new Error('未发出操作却带恢复批次')
  const expected = savePrefix(plan, cursor.completed)
  let result = { ...cursor }
  if (
    plan.version === 2 &&
    cursor.issued &&
    cursor.batchEnd == null &&
    copySaveBatchEnd(plan, cursor.completed) > cursor.completed + 1
  )
    throw new Error('恢复批次缺少完整范围')
  if (cursor.batchEnd != null) {
    if (
      !cursor.issued ||
      plan.version !== 2 ||
      cursor.batchEnd !== copySaveBatchEnd(plan, cursor.completed) ||
      cursor.batchEnd <= cursor.completed + 1
    )
      throw new Error('恢复批次范围与封存计划不符')
    let allAfter = true
    for (let i = cursor.completed; i < cursor.batchEnd; i++) {
      const step = plan.steps[i]!
      if (step.kind !== 'write') throw new Error('恢复批次包含非写入步骤')
      const actual = disk.files.get(step.path)
      if (actual === step.signature) expected.files.set(step.path, step.signature)
      else {
        allAfter = false
        if (expected.files.get(step.path) !== null || (actual !== null && actual !== EMPTY_FILE))
          throw new AuthorSaveRecoveryConflict(step.path)
        expected.files.set(step.path, actual)
      }
    }
    if (allAfter) result = { completed: cursor.batchEnd, issued: false, batchEnd: null }
  } else if (cursor.issued) {
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

/** Same per-target check used between the full entry/exit disk scans, without O(n²) map copies. */
export function assertSaveTargetBeforeIO(
  plan: AuthorSavePlan,
  cursor: SaveCursor,
  prefix: SaveDiskState,
  actual: SaveSignature | boolean | undefined,
): void {
  if (
    !Number.isSafeInteger(cursor.completed) ||
    cursor.completed < 0 ||
    cursor.completed >= plan.steps.length ||
    typeof cursor.issued !== 'boolean'
  )
    throw new Error('恢复游标越界')
  const step = plan.steps[cursor.completed]!
  const before =
    step.kind === 'mkdir' ? prefix.directories.get(step.path) : prefix.files.get(step.path)
  const after = step.kind === 'mkdir' ? true : step.kind === 'remove' ? null : step.signature
  // The entry scan alone may reconcile an uncertain close. A change AFTER admission
  // must still stop, just as the former full-prefix loop rejected a changed cursor.
  if (cursor.issued && actual === after) throw new AuthorSaveRecoveryConflict(step.path)
  if (cursor.issued && step.kind === 'write' && before === null && actual === EMPTY_FILE) return
  if (actual === undefined || actual !== before) throw new AuthorSaveRecoveryConflict(step.path)
}

export function advanceSavePrefix(prefix: ReturnType<typeof savePrefix>, step: SaveStep): void {
  if (step.kind === 'mkdir') prefix.directories.set(step.path, true)
  else prefix.files.set(step.path, step.kind === 'remove' ? null : step.signature)
}
