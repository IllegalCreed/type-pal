/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · migration-transaction 残余分支合同。
 *
 * 排重 basis（旧 fullName 不重复）：migration-transaction.test.ts 覆盖规划 hash 校验、
 * journal 清理、apply/recover 主路径；migration-transaction.boundaries.test.ts 与
 * migration-transaction.glm-o.test.ts 覆盖 scope/路径/precondition 主拒绝面。
 * 本文件只补 fast lcov 一手测量的未覆盖 edge（所有写入仅进 mkdtemp 临时 repo）：
 * - validateJournal：version≠2 与 id 非 16-hex（:108 双方向）。
 * - journal write 操作 previousHash 非 hex（:124）。
 * - manifest 前置条件 hash 非 hex（:150）。
 * - cleanup 时 journal 已被 afterOperation 回调删除 → 跳过 unlink、事务照常成功（:260 false）。
 * - commit：project 操作 expectedPreviousHash 非 hex（:303）。
 * - commit：非 project 操作携带 expectedPreviousHash（:306）。
 * 不覆盖（ledger）：:198「只能包含一个 manifest 操作」——所有 validateManifestOrdering
 * 调用点都先经 per-op scope 规则（manifest scope 钉死固定目标 projects/pal/manifest.json、
 * project/baseline scope 禁止该目标）与重复目标拒绝（:120/:296），两个 manifest 匹配操作
 * 在到达排序检查前必被先行拒绝，构造上不可达。
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  commitMigrationTransaction,
  recoverMigrationTransaction,
  type TransactionChange,
} from './migration-transaction.js'

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'kimi-r1-mgtx-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const CONTROL = '.type-pal-migrate'
const JOURNAL_REL = `${CONTROL}/pal-journal.json`
const TX_ID = 'abcdef0123456789'
const VALID_HASH = 'a'.repeat(64)

function writeJournal(repo: string, journal: unknown): void {
  mkdirSync(resolve(repo, CONTROL), { recursive: true })
  writeFileSync(resolve(repo, JOURNAL_REL), `${JSON.stringify(journal)}\n`)
}

function manifestWriteOp(preconditions: unknown[]): Record<string, unknown> {
  return {
    kind: 'write',
    target: 'projects/pal/manifest.json',
    scope: 'manifest',
    staged: `${CONTROL}/transactions/${TX_ID}/stage/000000`,
    hash: VALID_HASH,
    previousHash: null,
    preconditions,
  }
}

describe('KIMI-R1 迁移事务 journal 校验残余分支', () => {
  test('version≠2 与 id 非 16-hex 均拒绝（不恢复、不清理）', () => {
    const repoA = tempRepo()
    writeJournal(repoA, { version: 1, id: TX_ID, operations: [] })
    expect(() => recoverMigrationTransaction(repoA)).toThrow('迁移事务 journal 版本或 id 无效')
    expect(existsSync(resolve(repoA, JOURNAL_REL))).toBe(true) // 拒绝后 journal 保留待查

    const repoB = tempRepo()
    writeJournal(repoB, { version: 2, id: 'not-a-hex-id', operations: [] })
    expect(() => recoverMigrationTransaction(repoB)).toThrow('迁移事务 journal 版本或 id 无效')
    expect(existsSync(resolve(repoB, JOURNAL_REL))).toBe(true)

    const repoC = tempRepo() // id 缺省（undefined → ?? '' 臂）
    writeJournal(repoC, { version: 2, operations: [] })
    expect(() => recoverMigrationTransaction(repoC)).toThrow('迁移事务 journal 版本或 id 无效')
    expect(existsSync(resolve(repoC, JOURNAL_REL))).toBe(true)
  })

  test('write 操作 previousHash 非 hex 或缺省均拒绝', () => {
    const repo = tempRepo()
    writeJournal(repo, {
      version: 2,
      id: TX_ID,
      operations: [
        {
          kind: 'write',
          target: 'projects/pal/content/a.json',
          scope: 'project',
          staged: `${CONTROL}/transactions/${TX_ID}/stage/000000`,
          hash: VALID_HASH,
          previousHash: 'not-a-hash',
        },
      ],
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      '迁移事务 journal previousHash 无效: projects/pal/content/a.json',
    )

    const repoB = tempRepo() // previousHash 缺省（undefined → ?? '' 臂）
    writeJournal(repoB, {
      version: 2,
      id: TX_ID,
      operations: [
        {
          kind: 'write',
          target: 'projects/pal/content/a.json',
          scope: 'project',
          staged: `${CONTROL}/transactions/${TX_ID}/stage/000000`,
          hash: VALID_HASH,
        },
      ],
    })
    expect(() => recoverMigrationTransaction(repoB)).toThrow(
      '迁移事务 journal previousHash 无效: projects/pal/content/a.json',
    )
  })

  test('manifest 前置条件 hash 非 hex 或缺省均拒绝', () => {
    const repo = tempRepo()
    writeJournal(repo, {
      version: 2,
      id: TX_ID,
      operations: [manifestWriteOp([{ target: 'projects/pal/assets/migrated/a.png', hash: 'zz' }])],
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      'manifest 前置条件 hash 无效: projects/pal/assets/migrated/a.png',
    )

    const repoB = tempRepo() // precondition.hash 缺省（undefined → ?? '' 臂）
    writeJournal(repoB, {
      version: 2,
      id: TX_ID,
      operations: [manifestWriteOp([{ target: 'projects/pal/assets/migrated/a.png' }])],
    })
    expect(() => recoverMigrationTransaction(repoB)).toThrow(
      'manifest 前置条件 hash 无效: projects/pal/assets/migrated/a.png',
    )
  })
})

describe('KIMI-R1 迁移事务 commit 残余分支', () => {
  test('afterOperation 回调删除 journal 后 cleanup 跳过 unlink，事务照常提交', () => {
    const repo = tempRepo()
    commitMigrationTransaction(
      repo,
      [
        {
          target: 'projects/pal/content/a.json',
          scope: 'project',
          expectedPreviousHash: null,
          content: 'new\n',
        },
      ],
      {
        afterOperation: () => {
          unlinkSync(resolve(repo, JOURNAL_REL)) // 模拟外部提前清账：cleanup 必须容忍
        },
      },
    )
    expect(existsSync(resolve(repo, 'projects/pal/content/a.json'))).toBe(true)
    expect(existsSync(resolve(repo, JOURNAL_REL))).toBe(false)
    const txDir = resolve(repo, CONTROL, 'transactions')
    expect(!existsSync(txDir) || readdirSync(txDir).length === 0).toBe(true) // staging 已清
    expect(recoverMigrationTransaction(repo)).toBe(false) // 无遗留事务
  })

  test('project 操作 expectedPreviousHash 非 hex 或 undefined 均拒绝', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(repo, [
        {
          target: 'projects/pal/content/a.json',
          scope: 'project',
          expectedPreviousHash: 'not-a-hash',
          content: 'x',
        },
      ]),
    ).toThrow('事务 expectedPreviousHash 无效: projects/pal/content/a.json')

    // expectedPreviousHash: undefined（own key 但值缺省 → ?? '' 臂；typed 合法对象上
    // 以 defineProperty 注入 undefined，避免任何类型跳板）
    const change: TransactionChange = {
      target: 'projects/pal/content/a.json',
      scope: 'project',
      expectedPreviousHash: null,
      content: 'x',
    }
    Object.defineProperty(change, 'expectedPreviousHash', { value: undefined })
    expect(() => commitMigrationTransaction(repo, [change])).toThrow(
      '事务 expectedPreviousHash 无效: projects/pal/content/a.json',
    )
  })

  test('baseline 操作携带 expectedPreviousHash 拒绝（仅 project 可携带）', () => {
    const repo = tempRepo()
    const changes = JSON.parse(
      JSON.stringify([
        {
          target: 'packages/migrate/baselines/pal/content/a.json',
          scope: 'baseline',
          expectedPreviousHash: null,
          content: 'x',
        },
      ]),
    ) as TransactionChange[]
    expect(() => commitMigrationTransaction(repo, changes)).toThrow(
      '只有 project 操作可以携带 expectedPreviousHash: packages/migrate/baselines/pal/content/a.json',
    )
  })
})
