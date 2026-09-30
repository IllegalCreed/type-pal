/** TEST-GLM-WAVE-O-1 O01/O03：迁移事务的提交侧校验、journal 全量验证与恢复合同。
 *  旧证：migration-transaction.test.ts 覆盖规划 hash/中断恢复/manifest 闭包/并发窗口；
 *  boundaries 覆盖 version/id/kind/hash/staged 恢复拒绝。本卡补齐其余单轴合同：
 *  safeRel/strictRepoRel 路径域、scope 目标域、重复目标、preconditions 结构、
 *  pending 互斥、提交后哈希复核、恢复期窗口篡改。全部 mkdtemp 隔离，不碰主工程。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from './migration-baseline.js'
import {
  commitMigrationTransaction,
  hasPendingMigrationTransaction,
  recoverMigrationTransaction,
  type TransactionChange,
  type TransactionPrecondition,
} from './migration-transaction.js'

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'type-pal-glm-o-tx-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const writeOp = (target: string, content: string): TransactionChange => ({
  target,
  scope: 'project',
  expectedPreviousHash: null,
  content,
})

const manifestWithPrecondition = (repo: string): TransactionChange[] => {
  const assetRel = 'projects/pal/assets/ready.bin'
  const full = resolve(repo, assetRel)
  mkdirSync(resolve(repo, 'projects/pal/assets'), { recursive: true })
  writeFileSync(full, 'ready')
  const preconditions: TransactionPrecondition[] = [
    { target: assetRel, hash: sha256('ready') },
  ]
  return [
    {
      target: 'projects/pal/manifest.json',
      scope: 'manifest',
      content: '{}\n',
      preconditions,
    },
  ]
}

describe('O01 commitMigrationTransaction：提交侧单轴拒绝合同', () => {
  test('绝对路径目标被 safeRel 拒绝', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(repo, [
        { target: resolve(repo, 'projects/pal/x.json'), scope: 'project', expectedPreviousHash: null, content: 'x' },
      ]),
    ).toThrow('事务目标必须是仓库内相对路径')
  })

  test("'..' 越界段目标被 safeRel 拒绝", () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(repo, [writeOp('projects/pal/../evil.txt', 'x')]),
    ).toThrow('事务目标必须是仓库内相对路径: projects/pal/../evil.txt')
  })

  test("'./' 前缀目标被规范化后接受（同一事务目标等价）", () => {
    const repo = tempRepo()
    commitMigrationTransaction(repo, [writeOp('./projects/pal/content/a.json', 'a\n')])
    expect(readFileSync(resolve(repo, 'projects/pal/content/a.json'), 'utf8')).toBe('a\n')
  })

  test('重复目标在提交侧被拒绝', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(repo, [
        writeOp('projects/pal/content/a.json', '1'),
        writeOp('projects/pal/content/a.json', '2'),
      ]),
    ).toThrow('迁移事务包含重复目标')
  })

  test('project 操作缺 expectedPreviousHash 被拒绝', () => {
    const repo = tempRepo()
    const missing = { target: 'projects/pal/content/a.json', scope: 'project', content: 'x' } as
      unknown as TransactionChange
    expect(() => commitMigrationTransaction(repo, [missing])).toThrow(
      '事务工程操作缺规划 expectedPreviousHash: projects/pal/content/a.json',
    )
  })

  test('project expectedPreviousHash 非十六进制被拒绝', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(repo, [
        { target: 'projects/pal/content/a.json', scope: 'project', expectedPreviousHash: 'nothex', content: 'x' },
      ]),
    ).toThrow('事务 expectedPreviousHash 无效: projects/pal/content/a.json')
  })

  test('非 project 操作携带 expectedPreviousHash 被拒绝', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(repo, [
        {
          target: 'packages/migrate/baselines/pal/a.json',
          scope: 'baseline',
          expectedPreviousHash: null,
          content: 'x',
        },
      ]),
    ).toThrow('只有 project 操作可以携带 expectedPreviousHash')
  })

  test('precondition hash 非法被拒绝', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(repo, [
        {
          target: 'projects/pal/manifest.json',
          scope: 'manifest',
          content: '{}\n',
          preconditions: [{ target: 'projects/pal/assets/a.bin', hash: 'xyz' }],
        },
      ]),
    ).toThrow('事务前置条件 hash 无效: projects/pal/manifest.json')
  })

  test('非 manifest 操作携带 preconditions 被拒绝', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(repo, [
        {
          target: 'projects/pal/content/a.json',
          scope: 'project',
          expectedPreviousHash: null,
          content: 'x',
          preconditions: [{ target: 'projects/pal/assets/a.bin', hash: sha256('a') }],
        },
      ]),
    ).toThrow('只有 manifest 操作可以携带前置条件: projects/pal/content/a.json')
  })

  test('manifest 写入缺前置条件被拒绝', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(repo, [
        { target: 'projects/pal/manifest.json', scope: 'manifest', content: '{}\n' },
      ]),
    ).toThrow('manifest 操作缺资源闭包前置条件')
  })

  test('存在未恢复 journal 时提交被互斥拒绝', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(
        repo,
        [writeOp('projects/pal/content/a.json', 'a\n')],
        { afterOperation: () => { throw new Error('interrupt') } },
      ),
    ).toThrow('interrupt')
    expect(hasPendingMigrationTransaction(repo)).toBe(true)
    expect(() => commitMigrationTransaction(repo, [writeOp('projects/pal/content/b.json', 'b\n')])).toThrow(
      '存在未恢复迁移事务；请先调用 recoverMigrationTransaction',
    )
  })

  test('scope 目标域：project→manifest 被 ordering 门拒绝，baseline 越界前缀被 journal 验证拒绝', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(repo, [
        { target: 'projects/pal/manifest.json', scope: 'project', expectedPreviousHash: null, content: 'x' },
      ]),
    ).toThrow('manifest 操作必须使用 manifest scope 与固定目标')
    expect(() =>
      commitMigrationTransaction(repo, [
        { target: 'projects/pal/content/a.json', scope: 'baseline', content: 'x' },
      ]),
    ).toThrow('baseline scope 目标越界: projects/pal/content/a.json')
    expect(existsSync(resolve(repo, '.type-pal-migrate/pal-journal.json'))).toBe(false)
  })

  test('hasPendingMigrationTransaction 在无 journal 时为 false', () => {
    const repo = tempRepo()
    expect(hasPendingMigrationTransaction(repo)).toBe(false)
  })
})

describe('O03 journal 验证与恢复：恢复路径合同（mkdtemp 隔离）', () => {
  interface JournalOperationFixture {
    kind: 'write' | 'delete'
    target: string
    scope: 'project' | 'baseline' | 'manifest'
    staged?: string
    hash?: string
    previousHash: string | null
    preconditions?: TransactionPrecondition[]
  }

  const writeInterruptedJournal = (
    repo: string,
    mutate: (operations: JournalOperationFixture[], id: string) => void,
  ): void => {
    const id = 'b'.repeat(16)
    const operations: JournalOperationFixture[] = [
      {
        kind: 'write',
        target: 'projects/pal/content/a.json',
        scope: 'project',
        staged: `.type-pal-migrate/transactions/${id}/stage/000000`,
        hash: sha256('a2\n'),
        previousHash: null,
      },
    ]
    mutate(operations, id)
    const control = resolve(repo, '.type-pal-migrate')
    mkdirSync(resolve(repo, '.type-pal-migrate/transactions', id, 'stage'), { recursive: true })
    writeFileSync(
      resolve(repo, '.type-pal-migrate/transactions', id, 'stage', '000000'),
      'a2\n',
    )
    writeFileSync(
      resolve(control, 'pal-journal.json'),
      JSON.stringify({ version: 2, id, operations }),
    )
  }

  test('journal 操作项非对象被拒绝', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      ;(operations as unknown[])[0] = 'not-an-object'
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow('迁移事务 journal 操作 0 无效')
  })

  test('journal target 空串/反斜杠逐轴拒绝（路径无效）', () => {
    const cases = ['', 'projects\\pal\\x.json']
    for (const [index, target] of cases.entries()) {
      const repo = tempRepo()
      writeInterruptedJournal(repo, (operations) => {
        operations[0]!.target = target as string
      })
      expect(() => recoverMigrationTransaction(repo), `case ${index}`).toThrow(
        '迁移事务 journal operations[0].target 路径无效',
      )
    }
  })

  test("journal target 带 './' 前缀被拒绝（须为规范仓库相对路径）", () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      operations[0]!.target = './projects/pal/content/a.json'
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      '迁移事务 journal operations[0].target 必须是规范仓库相对路径',
    )
  })

  test('journal target 含 .. 段被拒绝', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      operations[0]!.target = 'projects/pal/../x.json'
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      '迁移事务 journal operations[0].target 不得越界: projects/pal/../x.json',
    )
  })

  test('journal 重复目标被拒绝', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations, id) => {
      operations.push({ ...operations[0]! })
      operations[1]!.staged = `.type-pal-migrate/transactions/${id}/stage/000001`
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      '迁移事务 journal 包含重复目标: projects/pal/content/a.json',
    )
  })

  test('journal previousHash 非法被拒绝', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      operations[0]!.previousHash = 'zzzz'
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      '迁移事务 journal previousHash 无效: projects/pal/content/a.json',
    )
  })

  test('journal delete 操作携带 staged/hash 被拒绝', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      operations[0]!.kind = 'delete'
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      '迁移事务 journal delete 不得携带 staging/hash: projects/pal/content/a.json',
    )
  })

  test('journal preconditions 非数组被拒绝', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      operations[0]!.scope = 'manifest'
      operations[0]!.target = 'projects/pal/manifest.json'
      operations[0]!.preconditions = 'nope' as unknown as TransactionPrecondition[]
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      '迁移事务 journal preconditions 无效: projects/pal/manifest.json',
    )
  })

  test('非 manifest journal 操作携带 preconditions 被拒绝', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      operations[0]!.preconditions = [{ target: 'projects/pal/assets/a.bin', hash: sha256('a') }]
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      '只有 manifest 操作可以携带前置条件: projects/pal/content/a.json',
    )
  })

  test('manifest precondition 目标越出 projects/pal 被拒绝', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      operations[0]!.scope = 'manifest'
      operations[0]!.target = 'projects/pal/manifest.json'
      operations[0]!.preconditions = [{ target: 'baselines/evil.json', hash: sha256('a') }]
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow('manifest 前置条件目标越界')
  })

  test('manifest precondition hash 非法被拒绝', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      operations[0]!.scope = 'manifest'
      operations[0]!.target = 'projects/pal/manifest.json'
      operations[0]!.preconditions = [{ target: 'projects/pal/assets/a.bin', hash: 'short' }]
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      'manifest 前置条件 hash 无效: projects/pal/assets/a.bin',
    )
  })

  test('manifest scope 指向非固定目标被 journal 验证拒绝', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      operations[0]!.scope = 'manifest'
      operations[0]!.target = 'projects/pal/content/a.json'
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      'manifest scope 目标必须是固定 manifest: projects/pal/content/a.json',
    )
  })

  test('manifest journal 操作缺前置条件被拒绝', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      operations[0]!.scope = 'manifest'
      operations[0]!.target = 'projects/pal/manifest.json'
    })
    expect(() => recoverMigrationTransaction(repo)).toThrow('manifest 操作缺资源闭包前置条件')
  })

  test('恢复期窗口篡改：目标与 journal previousHash 不符时拒绝且不落盘', () => {
    const repo = tempRepo()
    writeInterruptedJournal(repo, (operations) => {
      operations[0]!.target = 'projects/pal/content/changed.json'
      operations[0]!.previousHash = sha256('original')
    })
    const target = resolve(repo, 'projects/pal/content/changed.json')
    mkdirSync(resolve(repo, 'projects/pal/content'), { recursive: true })
    writeFileSync(target, 'tampered-by-user')
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      '事务目标在提交窗口被修改: projects/pal/content/changed.json',
    )
    expect(readFileSync(target, 'utf8')).toBe('tampered-by-user')
  })

  test('目标与 journal hash 一致时恢复跳过重复落盘并清理 staging', () => {
    const repo = tempRepo()
    const id = 'c'.repeat(16)
    const targetRel = 'projects/pal/content/a.json'
    mkdirSync(resolve(repo, 'projects/pal/content'), { recursive: true })
    writeFileSync(resolve(repo, targetRel), 'a2\n')
    mkdirSync(resolve(repo, '.type-pal-migrate/transactions', id, 'stage'), { recursive: true })
    writeFileSync(resolve(repo, '.type-pal-migrate/transactions', id, 'stage', '000000'), 'a2\n')
    writeFileSync(
      resolve(repo, '.type-pal-migrate/pal-journal.json'),
      JSON.stringify({
        version: 2,
        id,
        operations: [
          {
            kind: 'write',
            target: targetRel,
            scope: 'project',
            staged: `.type-pal-migrate/transactions/${id}/stage/000000`,
            hash: sha256('a2\n'),
            previousHash: null,
          },
        ],
      }),
    )
    expect(recoverMigrationTransaction(repo)).toBe(true)
    expect(readFileSync(resolve(repo, targetRel), 'utf8')).toBe('a2\n')
    expect(existsSync(resolve(repo, '.type-pal-migrate/transactions', id))).toBe(false)
    expect(hasPendingMigrationTransaction(repo)).toBe(false)
  })

  test('提交后目标被再次改动触发提交后哈希复核失败', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(repo, [writeOp('projects/pal/content/a.json', 'a2\n')], {
        afterOperation: (_operation, index) => {
          if (index === 0) writeFileSync(resolve(repo, 'projects/pal/content/a.json'), 'mutated')
        },
      }),
    ).toThrow('事务提交后哈希不符: projects/pal/content/a.json')
  })

  test('合法坏数据只进 IO 校验：journal 根非 JSON 时恢复失败且工程无写入', () => {
    const repo = tempRepo()
    mkdirSync(resolve(repo, '.type-pal-migrate'), { recursive: true })
    writeFileSync(resolve(repo, '.type-pal-migrate/pal-journal.json'), 'not-json{')
    expect(() => recoverMigrationTransaction(repo)).toThrow()
    expect(existsSync(resolve(repo, 'projects/pal'))).toBe(false)
  })

  test('提交期前置闭包失败留下 pending journal；修复闭包后恢复完成同一事务', () => {
    const repo = tempRepo()
    const manifestPath = resolve(repo, 'projects/pal/manifest.json')
    mkdirSync(resolve(repo, 'projects/pal'), { recursive: true })
    writeFileSync(manifestPath, 'old-manifest\n')
    const [manifestChange] = manifestWithPrecondition(repo)
    writeFileSync(resolve(repo, 'projects/pal/assets/ready.bin'), 'broken-before-commit')
    expect(() => commitMigrationTransaction(repo, [manifestChange!])).toThrow(
      'manifest 发布前资源闭包不符: projects/pal/assets/ready.bin',
    )
    expect(readFileSync(manifestPath, 'utf8')).toBe('old-manifest\n')
    expect(hasPendingMigrationTransaction(repo)).toBe(true)
    writeFileSync(resolve(repo, 'projects/pal/assets/ready.bin'), 'ready')
    expect(recoverMigrationTransaction(repo)).toBe(true)
    expect(readFileSync(manifestPath, 'utf8')).toBe('{}\n')
    expect(hasPendingMigrationTransaction(repo)).toBe(false)
  })
})
