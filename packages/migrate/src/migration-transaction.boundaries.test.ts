/**
 * TEST-MIGRATION-BOUNDARIES-1 T02（返工）：migration-transaction journal v2 单轴。
 * 既有 migration-transaction.test 已覆盖删除 hash/中断补完/manifest 并发/篡改主干——不重复。
 * 本文件：至少两操作的真实 commit 中断取得 current journal（留下待提交 staging），单轴坏
 * operations/kind/hash/staged/version/id 拒绝且拒绝后**全部自建文件**字节保留（快照逐文件
 * 比对）；合法同 journal 恢复对照成功且二次幂等。
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { commitMigrationTransaction, recoverMigrationTransaction } from './migration-transaction.js'

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'tb10-tx-'))
  roots.push(root)
  return root
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/** 全部自建文件快照：repo 内每个文件路径 → 字节内容（目录递归）。 */
function snapshotAllFiles(repo: string): Map<string, string> {
  const out = new Map<string, string>()
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile()) out.set(full, readFileSync(full, 'utf8'))
    }
  }
  walk(repo)
  return out
}

/** 两操作真实中断：第 0 个操作提交后中断 → journal 留存且第二操作 staging 待提交。 */
function interruptedTwoOp(repo: string): {
  journalPath: string
  firstTarget: string
  secondTarget: string
} {
  mkdirSync(resolve(repo, 'projects/pal/content'), { recursive: true })
  mkdirSync(resolve(repo, 'packages/migrate/baselines/pal'), { recursive: true })
  expect(() =>
    commitMigrationTransaction(
      repo,
      [
        {
          target: 'projects/pal/content/a.json',
          scope: 'project',
          expectedPreviousHash: null,
          content: '{"k":1}',
        },
        {
          target: 'projects/pal/content/b.json',
          scope: 'project',
          expectedPreviousHash: null,
          content: '{"k":2}',
        },
      ],
      {
        afterOperation: (_operation, index) => {
          if (index === 0) throw new Error('interrupt') // 第 0 个已提交、第 1 个留 pending
        },
      },
    ),
  ).toThrow('interrupt')
  return {
    journalPath: resolve(repo, '.type-pal-migrate/pal-journal.json'),
    firstTarget: resolve(repo, 'projects/pal/content/a.json'),
    secondTarget: resolve(repo, 'projects/pal/content/b.json'),
  }
}

describe('T02 journal v2 单轴（两操作真实中断）', () => {
  test('合法同 journal 恢复成功：第二操作补完落盘；二次恢复幂等 false；journal 清理', () => {
    const repo = tempRepo()
    const { journalPath, firstTarget, secondTarget } = interruptedTwoOp(repo)
    const raw = JSON.parse(readFileSync(journalPath, 'utf8')) as {
      version: number
      operations: unknown[]
    }
    expect(raw.version).toBe(2)
    expect(raw.operations).toHaveLength(2)
    expect(existsSync(secondTarget)).toBe(false) // 中断点：第二操作未落盘（待提交）
    expect(recoverMigrationTransaction(repo)).toBe(true)
    expect(readFileSync(firstTarget, 'utf8')).toBe('{"k":1}') // 已提交操作保持
    expect(readFileSync(secondTarget, 'utf8')).toBe('{"k":2}') // 待提交操作补完
    expect(recoverMigrationTransaction(repo)).toBe(false)
    expect(existsSync(journalPath)).toBe(false)
  })
  test('单轴坏 operations/kind/hash/staged/version/id 拒绝且拒绝后全部自建文件字节保留', () => {
    const tamper = (mutate: (journal: Record<string, unknown>) => void): string => {
      const repo = tempRepo()
      const { journalPath } = interruptedTwoOp(repo)
      const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Record<string, unknown>
      mutate(journal)
      writeFileSync(journalPath, `${JSON.stringify(journal)}\n`, 'utf8')
      const before = snapshotAllFiles(repo)
      const message = (() => {
        try {
          recoverMigrationTransaction(repo)
          return 'recovered'
        } catch (error) {
          return (error as Error).message
        }
      })()
      expect(message).not.toBe('recovered') // 每一轴都必须以业务错误拒绝
      expect(snapshotAllFiles(repo)).toEqual(before) // 拒绝后全部自建文件逐字节保留
      return message
    }
    expect(
      tamper((journal) => {
        journal.operations = 'nope'
      }),
    ).toBe('迁移事务 journal 操作表无效')
    expect(
      tamper((journal) => {
        ;(journal.operations as Array<Record<string, unknown>>)[1]!.kind = 'rename'
      }),
    ).toBe('迁移事务 journal 操作 kind 无效: projects/pal/content/b.json')
    expect(
      tamper((journal) => {
        ;(journal.operations as Array<Record<string, unknown>>)[1]!.hash = '0'.repeat(64)
      }),
    ).toBe('事务恢复缺少有效 staging: projects/pal/content/b.json')
    expect(
      tamper((journal) => {
        ;(journal.operations as Array<Record<string, unknown>>)[1]!.staged = 'deadbeef'
      }),
    ).toBe('迁移事务 journal staging 路径不符: projects/pal/content/b.json')
    expect(
      tamper((journal) => {
        journal.version = 3
      }),
    ).toBe('迁移事务 journal 版本或 id 无效')
    expect(
      tamper((journal) => {
        journal.id = 'zzzz'
      }),
    ).toBe('迁移事务 journal 版本或 id 无效')
  })
})
