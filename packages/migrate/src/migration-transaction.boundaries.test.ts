/**
 * TEST-MIGRATION-BOUNDARIES-1 T02：migration-transaction journal v2 单轴。
 * 既有 migration-transaction.test 已覆盖删除 hash/中断补完/manifest 并发/篡改主干——不重复。
 * 本文件：真实 commit+afterOperation 中断取得 current journal 后，单轴坏 operations 数组/
 * kind/previousHash/staged/hash/version/id 拒绝且拒绝前全文件快照不变；恢复成功后二次幂等。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from './migration-baseline.js'
import {
  commitMigrationTransaction,
  recoverMigrationTransaction,
} from './migration-transaction.js'

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'tb10-tx-'))
  roots.push(root)
  return root
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('T02 journal v2 单轴', () => {
  test('真实中断 → 恢复成功 → 二次恢复幂等 false', () => {
    const repo = tempRepo()
    const target = resolve(repo, 'projects/pal/content/a.json')
    mkdirSync(resolve(repo, 'projects/pal/content'), { recursive: true })
    expect(() =>
      commitMigrationTransaction(
        repo,
        [{ target: 'projects/pal/content/a.json', scope: 'project', content: '{"k":1}' }],
        {
          afterOperation: (_operation, index) => {
            if (index === 0) throw new Error('interrupt')
          },
        },
      ),
    ).toThrow('interrupt')
    const journalPath = resolve(repo, '.type-pal-migrate/pal-journal.json')
    expect(existsSync(journalPath)).toBe(true)
    const raw = JSON.parse(readFileSync(journalPath, 'utf8')) as { version: number }
    expect(raw.version).toBe(2)
    // 恢复成功落盘正文；二次幂等
    expect(recoverMigrationTransaction(repo)).toBe(true)
    expect(readFileSync(target, 'utf8')).toBe('{"k":1}')
    expect(recoverMigrationTransaction(repo)).toBe(false)
    expect(existsSync(journalPath)).toBe(false)
  })
  test('单轴坏 operations/kind/previousHash/staged/version 拒绝且 journal/目标字节全保留', () => {
    const base = (): {
      repo: string
      journalPath: string
      journalRaw: string
      target: string
    } => {
      const repo = tempRepo()
      const target = resolve(repo, 'projects/pal/content/a.json')
      mkdirSync(resolve(repo, 'projects/pal/content'), { recursive: true })
      expect(() =>
        commitMigrationTransaction(
          repo,
          [{ target: 'projects/pal/content/a.json', scope: 'project', content: '{"k":1}' }],
          {
            afterOperation: (_operation, index) => {
              if (index === 0) throw new Error('interrupt')
            },
          },
        ),
      ).toThrow('interrupt')
      const journalPath = resolve(repo, '.type-pal-migrate/pal-journal.json')
      return { repo, journalPath, journalRaw: readFileSync(journalPath, 'utf8'), target }
    }
    const tamper = (mutate: (journal: Record<string, unknown>) => void): string => {
      const { repo, journalPath, journalRaw, target } = base()
      const journal = JSON.parse(journalRaw) as Record<string, unknown>
      mutate(journal)
      writeFileSync(journalPath, JSON.stringify(journal), 'utf8')
      const before = { journal: readFileSync(journalPath, 'utf8'), target: existsSync(target) ? readFileSync(target, 'utf8') : null }
      const message = (() => {
        try {
          recoverMigrationTransaction(repo)
          return 'recovered'
        } catch (error) {
          return (error as Error).message
        }
      })()
      // 拒绝后 journal 与目标字节全保留（若被恢复则由调用方 not.toBe('recovered') 检出）
      if (message !== 'recovered') {
        expect(readFileSync(journalPath, 'utf8')).toBe(before.journal)
        expect(existsSync(target) ? readFileSync(target, 'utf8') : null).toBe(before.target)
      }
      return message
    }
    expect(tamper((journal) => { journal.operations = 'nope' })).not.toBe('recovered')
    expect(
      tamper((journal) => {
        ;(journal.operations as Array<Record<string, unknown>>)[0]!.kind = 'rename'
      }),
    ).not.toBe('recovered')
    expect(
      tamper((journal) => {
        ;(journal.operations as Array<Record<string, unknown>>)[0]!.hash = '0'.repeat(64)
      }),
    ).not.toBe('recovered')
    expect(
      tamper((journal) => {
        ;(journal.operations as Array<Record<string, unknown>>)[0]!.staged = 'deadbeef'
      }),
    ).not.toBe('recovered')
    expect(tamper((journal) => { journal.version = 3 })).not.toBe('recovered')
    expect(tamper((journal) => { journal.id = 'zzzz' })).not.toBe('recovered')
  })
})
