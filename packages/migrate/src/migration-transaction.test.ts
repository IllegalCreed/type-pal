import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
  const root = mkdtempSync(resolve(tmpdir(), 'type-pal-mg2-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('migration transaction', () => {
  test('提交工程与 baseline 后清理 journal', () => {
    const repo = tempRepo()
    commitMigrationTransaction(repo, [
      { target: 'projects/pal/content/a.json', scope: 'project', content: 'new-project\n' },
      {
        target: 'packages/migrate/baselines/pal/content/a.json',
        scope: 'baseline',
        content: 'new-base\n',
      },
    ])
    expect(readFileSync(resolve(repo, 'projects/pal/content/a.json'), 'utf8')).toBe('new-project\n')
    expect(
      readFileSync(resolve(repo, 'packages/migrate/baselines/pal/content/a.json'), 'utf8'),
    ).toBe('new-base\n')
    expect(recoverMigrationTransaction(repo)).toBe(false)
  })

  test('第 k 个 rename 后中断可幂等补完', () => {
    const repo = tempRepo()
    const changes: TransactionChange[] = [
      { target: 'projects/pal/content/a.json', scope: 'project', content: 'a2\n' },
      { target: 'projects/pal/content/b.json', scope: 'project', content: 'b2\n' },
      {
        target: 'packages/migrate/baselines/pal/content/a.json',
        scope: 'baseline',
        content: 'base2\n',
      },
    ]
    expect(() =>
      commitMigrationTransaction(repo, changes, {
        afterOperation: (_operation, index) => {
          if (index === 0) throw new Error('fault')
        },
      }),
    ).toThrow('fault')
    expect(recoverMigrationTransaction(repo)).toBe(true)
    expect(readFileSync(resolve(repo, 'projects/pal/content/b.json'), 'utf8')).toBe('b2\n')
    expect(
      readFileSync(resolve(repo, 'packages/migrate/baselines/pal/content/a.json'), 'utf8'),
    ).toBe('base2\n')
  })

  test('baseline 推进中断时不使用旧 base，恢复会完成同一事务', () => {
    const repo = tempRepo()
    writeFileSync(resolve(repo, 'old-base.txt'), 'unmanaged')
    expect(() =>
      commitMigrationTransaction(
        repo,
        [
          { target: 'projects/pal/content/a.json', scope: 'project', content: 'project-v2\n' },
          {
            target: 'packages/migrate/baselines/pal/content/a.json',
            scope: 'baseline',
            content: 'base-v2\n',
          },
          {
            target: 'packages/migrate/baselines/pal/_state.json',
            scope: 'baseline',
            content: 'state-v2\n',
          },
        ],
        {
          afterOperation: (operation) => {
            if (operation.scope === 'baseline') throw new Error('baseline-fault')
          },
        },
      ),
    ).toThrow('baseline-fault')
    expect(readFileSync(resolve(repo, 'projects/pal/content/a.json'), 'utf8')).toBe('project-v2\n')
    expect(recoverMigrationTransaction(repo)).toBe(true)
    expect(readFileSync(resolve(repo, 'packages/migrate/baselines/pal/_state.json'), 'utf8')).toBe(
      'state-v2\n',
    )
    expect(readFileSync(resolve(repo, 'old-base.txt'), 'utf8')).toBe('unmanaged')
  })
})
