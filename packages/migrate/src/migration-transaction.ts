import {
  closeSync,
  existsSync,
  fsyncSync,
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
  scope: 'project' | 'baseline'
  content?: string
}

interface JournalOperation {
  kind: 'write' | 'delete'
  target: string
  scope: TransactionChange['scope']
  staged?: string
  hash?: string
}

interface JournalV1 {
  version: 1
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

function applyJournal(repo: string, journal: JournalV1, options: TransactionOptions = {}): void {
  journal.operations.forEach((operation, index) => {
    const target = resolve(repo, operation.target)
    if (!targetMatches(repo, operation)) {
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

function cleanup(repo: string, journal: JournalV1): void {
  const journalPath = resolve(repo, JOURNAL_REL)
  if (existsSync(journalPath)) unlinkSync(journalPath)
  rmSync(resolve(repo, CONTROL_REL, 'transactions', journal.id), { recursive: true, force: true })
}

export function recoverMigrationTransaction(repo: string): boolean {
  const journalPath = resolve(repo, JOURNAL_REL)
  if (!existsSync(journalPath)) return false
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as JournalV1
  if (journal.version !== 1 || !Array.isArray(journal.operations))
    throw new Error('迁移事务 journal 格式无效')
  applyJournal(repo, journal)
  cleanup(repo, journal)
  return true
}

export function commitMigrationTransaction(
  repo: string,
  changes: readonly TransactionChange[],
  options: TransactionOptions = {},
): void {
  if (existsSync(resolve(repo, JOURNAL_REL)))
    throw new Error('存在未恢复迁移事务；请先调用 recoverMigrationTransaction')
  const normalized = changes.map((change) => ({ ...change, target: safeRel(change.target) }))
  if (new Set(normalized.map((change) => change.target)).size !== normalized.length)
    throw new Error('迁移事务包含重复目标')
  const id = sha256(
    JSON.stringify(
      normalized.map((change) => ({
        target: change.target,
        scope: change.scope,
        hash: change.content === undefined ? null : sha256(change.content),
      })),
    ),
  ).slice(0, 16)
  const transactionRel = `${CONTROL_REL}/transactions/${id}`
  const operations: JournalOperation[] = normalized.map((change, index) => {
    if (change.content === undefined)
      return { kind: 'delete', target: change.target, scope: change.scope }
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
    }
  })
  const journal: JournalV1 = { version: 1, id, operations }
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
