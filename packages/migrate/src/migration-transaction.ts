import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { sha256 } from './migration-baseline.js'

const CONTROL_REL = '.type-pal-migrate'
const JOURNAL_REL = `${CONTROL_REL}/pal-journal.json`

export interface TransactionChange {
  target: string
  scope: 'project' | 'baseline' | 'manifest'
  content?: string
  /** manifest 发布前必须仍满足的磁盘闭包；会持久化进 journal 供恢复路径复核。 */
  preconditions?: readonly TransactionPrecondition[]
}

export interface TransactionPrecondition {
  target: string
  hash: string
}

interface JournalOperation {
  kind: 'write' | 'delete'
  target: string
  scope: TransactionChange['scope']
  staged?: string
  hash?: string
  previousHash: string | null
  preconditions?: TransactionPrecondition[]
}

interface JournalV2 {
  version: 2
  id: string
  operations: JournalOperation[]
}

export interface TransactionOptions {
  afterOperation?: (operation: JournalOperation, index: number) => void
}

function safeRel(path: string): string {
  if (isAbsolute(path) || path.split('/').some((part) => part === '..'))
    throw new Error(`事务目标必须是仓库内相对路径: ${path}`)
  return path.replace(/^\.\//, '')
}

const HASH_RE = /^[a-f0-9]{64}$/
const TRANSACTION_ID_RE = /^[a-f0-9]{16}$/

function strictRepoRel(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\'))
    throw new Error(`迁移事务 journal ${label} 路径无效`)
  if (isAbsolute(value) || value.startsWith('./'))
    throw new Error(`迁移事务 journal ${label} 必须是规范仓库相对路径`)
  const parts = value.split('/')
  if (parts.some((part) => part === '' || part === '.' || part === '..'))
    throw new Error(`迁移事务 journal ${label} 不得越界: ${value}`)
  return value
}

function assertNoSymlinkPath(repo: string, relativePath: string, label: string): void {
  let current = repo
  for (const part of relativePath.split('/')) {
    current = resolve(current, part)
    if (existsSync(current) && lstatSync(current).isSymbolicLink())
      throw new Error(`迁移事务 journal ${label} 不得经过符号链接: ${relativePath}`)
  }
}

function assertScopeTarget(
  scope: unknown,
  target: string,
): asserts scope is JournalOperation['scope'] {
  if (scope === 'project') {
    if (!target.startsWith('projects/pal/') || target === 'projects/pal/manifest.json')
      throw new Error(`project scope 目标越界: ${target}`)
    return
  }
  if (scope === 'baseline') {
    if (!target.startsWith('packages/migrate/baselines/pal/'))
      throw new Error(`baseline scope 目标越界: ${target}`)
    return
  }
  if (scope === 'manifest') {
    if (target !== 'projects/pal/manifest.json')
      throw new Error(`manifest scope 目标必须是固定 manifest: ${target}`)
    return
  }
  throw new Error(`迁移事务 journal scope 无效: ${String(scope)}`)
}

/** 恢复路径不信任磁盘 journal：全量验证完才允许写入或清理。 */
function validateJournal(repo: string, raw: unknown): JournalV2 {
  if (!raw || typeof raw !== 'object') throw new Error('迁移事务 journal 格式无效')
  const candidate = raw as Partial<JournalV2>
  if (candidate.version !== 2 || !TRANSACTION_ID_RE.test(candidate.id ?? ''))
    throw new Error('迁移事务 journal 版本或 id 无效')
  if (!Array.isArray(candidate.operations)) throw new Error('迁移事务 journal 操作表无效')
  const id = candidate.id!
  const targets = new Set<string>()
  const operations: JournalOperation[] = candidate.operations.map((rawOperation, index) => {
    if (!rawOperation || typeof rawOperation !== 'object')
      throw new Error(`迁移事务 journal 操作 ${index} 无效`)
    const input = rawOperation as Partial<JournalOperation>
    const target = strictRepoRel(input.target, `operations[${index}].target`)
    assertScopeTarget(input.scope, target)
    assertNoSymlinkPath(repo, target, `operations[${index}].target`)
    if (targets.has(target)) throw new Error(`迁移事务 journal 包含重复目标: ${target}`)
    targets.add(target)
    if (input.kind !== 'write' && input.kind !== 'delete')
      throw new Error(`迁移事务 journal 操作 kind 无效: ${target}`)
    if (input.previousHash !== null && !HASH_RE.test(input.previousHash ?? ''))
      throw new Error(`迁移事务 journal previousHash 无效: ${target}`)
    const expectedStaged = `${CONTROL_REL}/transactions/${id}/stage/${String(index).padStart(6, '0')}`
    if (input.kind === 'write') {
      if (!HASH_RE.test(input.hash ?? ''))
        throw new Error(`迁移事务 journal write hash 无效: ${target}`)
      const staged = strictRepoRel(input.staged, `operations[${index}].staged`)
      if (staged !== expectedStaged) throw new Error(`迁移事务 journal staging 路径不符: ${target}`)
      assertNoSymlinkPath(repo, staged, `operations[${index}].staged`)
    } else if (input.staged !== undefined || input.hash !== undefined) {
      throw new Error(`迁移事务 journal delete 不得携带 staging/hash: ${target}`)
    }
    if (input.preconditions !== undefined && !Array.isArray(input.preconditions))
      throw new Error(`迁移事务 journal preconditions 无效: ${target}`)
    if (input.scope !== 'manifest' && input.preconditions?.length)
      throw new Error(`只有 manifest 操作可以携带前置条件: ${target}`)
    const preconditions = input.preconditions?.map((rawPrecondition, preconditionIndex) => {
      if (!rawPrecondition || typeof rawPrecondition !== 'object')
        throw new Error(`迁移事务 journal precondition 无效: ${target}`)
      const precondition = rawPrecondition as Partial<TransactionPrecondition>
      const preconditionTarget = strictRepoRel(
        precondition.target,
        `operations[${index}].preconditions[${preconditionIndex}].target`,
      )
      if (!preconditionTarget.startsWith('projects/pal/'))
        throw new Error(`manifest 前置条件目标越界: ${preconditionTarget}`)
      if (!HASH_RE.test(precondition.hash ?? ''))
        throw new Error(`manifest 前置条件 hash 无效: ${preconditionTarget}`)
      assertNoSymlinkPath(repo, preconditionTarget, 'manifest precondition')
      return { target: preconditionTarget, hash: precondition.hash! }
    })
    return {
      kind: input.kind,
      target,
      scope: input.scope,
      previousHash: input.previousHash!,
      ...(input.kind === 'write' ? { staged: input.staged!, hash: input.hash! } : {}),
      ...(preconditions ? { preconditions } : {}),
    }
  })
  const journal: JournalV2 = { version: 2, id, operations }
  validateManifestOrdering(operations)
  return journal
}

function syncFile(path: string): void {
  const fd = openSync(path, 'r')
  try {
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
}

function syncDir(path: string): void {
  const fd = openSync(path, 'r')
  try {
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
}

function targetMatches(repo: string, operation: JournalOperation): boolean {
  const target = resolve(repo, operation.target)
  if (operation.kind === 'delete') return !existsSync(target)
  return existsSync(target) && sha256(readFileSync(target)) === operation.hash
}

function validateManifestOrdering(operations: readonly JournalOperation[]): void {
  const manifestTarget = 'projects/pal/manifest.json'
  const manifests = operations.filter(
    (operation) => operation.scope === 'manifest' || operation.target === manifestTarget,
  )
  if (manifests.length > 1) throw new Error('迁移事务只能包含一个 manifest 操作')
  const manifest = manifests[0]
  if (!manifest) return
  if (manifest.scope !== 'manifest' || manifest.target !== manifestTarget)
    throw new Error('manifest 操作必须使用 manifest scope 与固定目标')
  if (manifest.kind !== 'write') throw new Error('manifest 操作只能写入，不能删除')
  if (operations.at(-1) !== manifest) throw new Error('manifest 操作必须是事务最后一项')
  if (!manifest.preconditions?.length) throw new Error('manifest 操作缺资源闭包前置条件')
}

function assertPreviousTarget(repo: string, operation: JournalOperation): void {
  const target = resolve(repo, operation.target)
  const actual = existsSync(target) ? sha256(readFileSync(target)) : null
  if (actual !== operation.previousHash)
    throw new Error(`事务目标在提交窗口被修改: ${operation.target}`)
}

function assertPreconditions(repo: string, operation: JournalOperation): void {
  for (const precondition of operation.preconditions ?? []) {
    const target = resolve(repo, precondition.target)
    if (!existsSync(target) || sha256(readFileSync(target)) !== precondition.hash)
      throw new Error(`manifest 发布前资源闭包不符: ${precondition.target}`)
  }
}

function applyJournal(repo: string, journal: JournalV2, options: TransactionOptions = {}): void {
  validateManifestOrdering(journal.operations)
  journal.operations.forEach((operation, index) => {
    const target = resolve(repo, operation.target)
    assertPreconditions(repo, operation)
    if (!targetMatches(repo, operation)) {
      assertPreviousTarget(repo, operation)
      if (operation.kind === 'delete') {
        unlinkSync(target)
        syncDir(dirname(target))
      } else {
        const staged = resolve(repo, operation.staged!)
        if (!existsSync(staged) || sha256(readFileSync(staged)) !== operation.hash)
          throw new Error(`事务恢复缺少有效 staging: ${operation.target}`)
        mkdirSync(dirname(target), { recursive: true })
        renameSync(staged, target)
        syncFile(target)
        syncDir(dirname(target))
      }
    }
    options.afterOperation?.(operation, index)
  })
  for (const operation of journal.operations) {
    if (!targetMatches(repo, operation)) throw new Error(`事务提交后哈希不符: ${operation.target}`)
  }
}

function cleanup(repo: string, journal: JournalV2): void {
  const journalPath = resolve(repo, JOURNAL_REL)
  if (existsSync(journalPath)) unlinkSync(journalPath)
  rmSync(resolve(repo, CONTROL_REL, 'transactions', journal.id), { recursive: true, force: true })
}

export function recoverMigrationTransaction(repo: string): boolean {
  const journalPath = resolve(repo, JOURNAL_REL)
  if (!existsSync(journalPath)) return false
  const journal = validateJournal(repo, JSON.parse(readFileSync(journalPath, 'utf8')))
  applyJournal(repo, journal)
  cleanup(repo, journal)
  return true
}

export function hasPendingMigrationTransaction(repo: string): boolean {
  return existsSync(resolve(repo, JOURNAL_REL))
}

export function commitMigrationTransaction(
  repo: string,
  changes: readonly TransactionChange[],
  options: TransactionOptions = {},
): void {
  if (existsSync(resolve(repo, JOURNAL_REL)))
    throw new Error('存在未恢复迁移事务；请先调用 recoverMigrationTransaction')
  const normalized = changes.map((change) => ({
    ...change,
    target: safeRel(change.target),
    ...(change.preconditions
      ? {
          preconditions: change.preconditions.map((precondition) => ({
            target: safeRel(precondition.target),
            hash: precondition.hash,
          })),
        }
      : {}),
  }))
  if (new Set(normalized.map((change) => change.target)).size !== normalized.length)
    throw new Error('迁移事务包含重复目标')
  for (const change of normalized) {
    if (change.preconditions?.some((precondition) => !/^[a-f0-9]{64}$/.test(precondition.hash)))
      throw new Error(`事务前置条件 hash 无效: ${change.target}`)
    if (change.scope !== 'manifest' && change.preconditions?.length)
      throw new Error(`只有 manifest 操作可以携带前置条件: ${change.target}`)
  }
  validateManifestOrdering(
    normalized.map((change) => ({
      kind: change.content === undefined ? 'delete' : 'write',
      target: change.target,
      scope: change.scope,
      previousHash: null,
      ...(change.preconditions ? { preconditions: [...change.preconditions] } : {}),
    })),
  )
  const id = sha256(
    JSON.stringify(
      normalized.map((change) => ({
        target: change.target,
        scope: change.scope,
        hash: change.content === undefined ? null : sha256(change.content),
        preconditions: change.preconditions,
      })),
    ),
  ).slice(0, 16)
  const transactionRel = `${CONTROL_REL}/transactions/${id}`
  const operations: JournalOperation[] = normalized.map((change, index) => {
    const target = resolve(repo, change.target)
    const previousHash = existsSync(target) ? sha256(readFileSync(target)) : null
    if (change.content === undefined)
      return { kind: 'delete', target: change.target, scope: change.scope, previousHash }
    const staged = `${transactionRel}/stage/${String(index).padStart(6, '0')}`
    const full = resolve(repo, staged)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, change.content)
    syncFile(full)
    return {
      kind: 'write',
      target: change.target,
      scope: change.scope,
      staged,
      hash: sha256(change.content),
      previousHash,
      ...(change.preconditions ? { preconditions: [...change.preconditions] } : {}),
    }
  })
  validateManifestOrdering(operations)
  const journal: JournalV2 = { version: 2, id, operations }
  validateJournal(repo, journal)
  const control = resolve(repo, CONTROL_REL)
  mkdirSync(control, { recursive: true })
  const journalPath = resolve(repo, JOURNAL_REL)
  const temporary = `${journalPath}.tmp`
  writeFileSync(temporary, `${JSON.stringify(journal, null, 2)}\n`)
  syncFile(temporary)
  renameSync(temporary, journalPath)
  syncDir(control)
  applyJournal(repo, journal, options)
  cleanup(repo, journal)
}
