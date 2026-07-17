import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from './migration-baseline.js'
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

  test('manifest 切换前中断时仍保留旧值，恢复后才执行最后切换', () => {
    const repo = tempRepo()
    writeFileSync(resolve(repo, 'manifest-old.json'), 'unmanaged')
    const manifestPath = resolve(repo, 'projects/pal/manifest.json')
    const manifestDir = resolve(repo, 'projects/pal')
    mkdirSync(manifestDir, { recursive: true })
    writeFileSync(manifestPath, 'old-manifest\n')
    const assetPath = resolve(repo, 'projects/pal/assets/sound.wav')
    mkdirSync(resolve(repo, 'projects/pal/assets'), { recursive: true })
    writeFileSync(assetPath, 'valid-wave')
    const preconditions = [{ target: 'projects/pal/assets/sound.wav', hash: sha256('valid-wave') }]
    const changes: TransactionChange[] = [
      { target: 'projects/pal/content/a.json', scope: 'project', content: 'project-v2\n' },
      {
        target: 'packages/migrate/baselines/pal/_state.json',
        scope: 'baseline',
        content: 'state-v2\n',
      },
      {
        target: 'projects/pal/manifest.json',
        scope: 'manifest',
        content: 'new-manifest\n',
        preconditions,
      },
    ]
    expect(() =>
      commitMigrationTransaction(repo, changes, {
        afterOperation: (_operation, index) => {
          if (index === 1) throw new Error('before-manifest')
        },
      }),
    ).toThrow('before-manifest')
    expect(readFileSync(manifestPath, 'utf8')).toBe('old-manifest\n')
    writeFileSync(assetPath, 'broken-wave')
    expect(() => recoverMigrationTransaction(repo)).toThrow('资源闭包不符')
    expect(readFileSync(manifestPath, 'utf8')).toBe('old-manifest\n')
    writeFileSync(assetPath, 'valid-wave')
    expect(recoverMigrationTransaction(repo)).toBe(true)
    expect(readFileSync(manifestPath, 'utf8')).toBe('new-manifest\n')
  })

  test('拒绝非最后、删除或伪装 scope 的 manifest 操作', () => {
    const repo = tempRepo()
    const ready = resolve(repo, 'projects/pal/assets/ready.bin')
    mkdirSync(resolve(repo, 'projects/pal/assets'), { recursive: true })
    writeFileSync(ready, 'ready')
    const preconditions = [{ target: 'projects/pal/assets/ready.bin', hash: sha256('ready') }]
    expect(() =>
      commitMigrationTransaction(repo, [
        {
          target: 'projects/pal/manifest.json',
          scope: 'manifest',
          content: '{}\n',
          preconditions,
        },
        { target: 'projects/pal/content/a.json', scope: 'project', content: '{}\n' },
      ]),
    ).toThrow('最后一项')
    expect(() =>
      commitMigrationTransaction(repo, [
        { target: 'projects/pal/manifest.json', scope: 'manifest', preconditions },
      ]),
    ).toThrow('只能写入')
    expect(() =>
      commitMigrationTransaction(repo, [
        { target: 'projects/pal/manifest.json', scope: 'project', content: '{}\n' },
      ]),
    ).toThrow('固定目标')
  })

  test('journal 发布后不覆盖提交窗口内的并发修改', () => {
    const repo = tempRepo()
    const second = resolve(repo, 'projects/pal/content/b.json')
    mkdirSync(resolve(repo, 'projects/pal/content'), { recursive: true })
    writeFileSync(second, 'b1\n')
    expect(() =>
      commitMigrationTransaction(
        repo,
        [
          { target: 'projects/pal/content/a.json', scope: 'project', content: 'a2\n' },
          { target: 'projects/pal/content/b.json', scope: 'project', content: 'b2\n' },
        ],
        {
          afterOperation: (_operation, index) => {
            if (index === 0) writeFileSync(second, 'user-change\n')
          },
        },
      ),
    ).toThrow('提交窗口被修改')
    expect(readFileSync(second, 'utf8')).toBe('user-change\n')
  })

  test('恢复前拒绝被篡改的 id/target/staged/precondition，不碰越界文件', () => {
    const repo = tempRepo()
    const control = resolve(repo, '.type-pal-migrate')
    mkdirSync(control, { recursive: true })
    const journalPath = resolve(control, 'pal-journal.json')
    const victim = resolve(repo, 'victim.txt')
    writeFileSync(victim, 'keep')
    const id = 'a'.repeat(16)
    const baseWrite = {
      kind: 'write',
      target: 'projects/pal/content/a.json',
      scope: 'project',
      staged: `.type-pal-migrate/transactions/${id}/stage/000000`,
      hash: sha256('new'),
      previousHash: null,
    }
    const cases: { label: string; journal: unknown }[] = [
      {
        label: 'id',
        journal: { version: 2, id: '../../victim', operations: [baseWrite] },
      },
      {
        label: 'target',
        journal: {
          version: 2,
          id,
          operations: [{ ...baseWrite, target: '../victim.txt' }],
        },
      },
      {
        label: 'staged',
        journal: {
          version: 2,
          id,
          operations: [{ ...baseWrite, staged: '../victim.txt' }],
        },
      },
      {
        label: 'precondition',
        journal: {
          version: 2,
          id,
          operations: [
            {
              ...baseWrite,
              target: 'projects/pal/manifest.json',
              scope: 'manifest',
              preconditions: [{ target: '../victim.txt', hash: sha256('keep') }],
            },
          ],
        },
      },
    ]
    for (const entry of cases) {
      writeFileSync(journalPath, JSON.stringify(entry.journal))
      expect(() => recoverMigrationTransaction(repo), entry.label).toThrow()
      expect(readFileSync(victim, 'utf8'), entry.label).toBe('keep')
    }
  })
})
