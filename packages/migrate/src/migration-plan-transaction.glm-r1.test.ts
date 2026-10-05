/** TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 r1：plan/transaction/write-plan 边界残余合同。
 *  7 文件逐轴排重账（source:line × caller × input × oracle × fullName）见
 *  docs/ops/evidence/TEST-GLM-MIGRATE-PLAN-TRANSACTION-1/dedup-ledger.md。
 *  本文件只承载两条净新合同，全部 mkdtemp 隔离，不写任何真实工程路径：
 *  1) commitMigrationTransaction 对「两个 manifest scope 变更（不同目标）」的排序门
 *     （migration-transaction.ts:198）——kimi-r1 ledger 的 unreachable 判断仅对恢复路径成立
 *     （该路径 validateJournal 的 assertScopeTarget 先把 manifest scope 钉死固定目标）；
 *     提交预检在 scope 域校验之前运行，不同目标的两个 manifest 变更可合法到达该门，本测试修正该账。
 *  2) buildMigrationTransactionChanges 对退役 baseline 文件的磁盘真值门
 *     （migration-write-plan.ts:91 false 臂）——不在磁盘的退役文件不产生幻影 delete；
 *     在场→删除臂由 migration-write-plan.boundaries.test.ts:127-135 旧证，此处作同 fixture 正控。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'
import {
  commitMigrationTransaction,
  hasPendingMigrationTransaction,
} from './migration-transaction.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'mpt1-plan-tx-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('MP1 迁移事务 manifest 排序门', () => {
  test('两个 manifest scope 变更（不同目标）在提交排序门被拒绝且零写盘', () => {
    const repo = tempRepo()
    mkdirSync(resolve(repo, 'projects/pal/assets'), { recursive: true })
    writeFileSync(resolve(repo, 'projects/pal/assets/ready.bin'), 'ready')
    expect(() =>
      commitMigrationTransaction(repo, [
        {
          target: 'projects/pal/manifest.json',
          scope: 'manifest',
          content: '{}\n',
          preconditions: [{ target: 'projects/pal/assets/ready.bin', hash: sha256('ready') }],
        },
        // 重复目标检查放行（目标不同）；排序预检先于 scope 域校验（validateJournal）与
        // staging/journal 创建，故该门必须在预检阶段独立拒绝双 manifest。
        { target: 'projects/pal/other.json', scope: 'manifest', content: 'x\n' },
      ]),
    ).toThrow('迁移事务只能包含一个 manifest 操作')
    // 排序预检先于一切写盘：零控制目录、零目标写入、无 pending 事务、前置资产原样。
    expect(existsSync(resolve(repo, '.type-pal-migrate'))).toBe(false)
    expect(existsSync(resolve(repo, 'projects/pal/other.json'))).toBe(false)
    expect(existsSync(resolve(repo, 'projects/pal/manifest.json'))).toBe(false)
    expect(hasPendingMigrationTransaction(repo)).toBe(false)
    expect(readFileSync(resolve(repo, 'projects/pal/assets/ready.bin'), 'utf8')).toBe('ready')
  })
})

describe('MP1 buildMigrationTransactionChanges baseline 磁盘真值', () => {
  test('退役 baseline 文件不在磁盘时不产生幻影 delete，在场时仍产生真值删除', () => {
    const repo = tempRepo()
    const args = () => ({
      repo,
      plan: { writes: new Map<string, MigrationJson>(), deletes: [] as string[] },
      projectSnapshot: {
        files: new Map<string, MigrationJson>(),
        managedFiles: new Set<string>(),
        hashes: new Map<string, string>(),
      },
      previousBaseline: {
        files: new Map<string, MigrationJson>(),
        managedFiles: new Set(['content/old.json']),
      },
      nextBaseline: {
        files: new Map<string, MigrationJson>(),
        managedFiles: new Set<string>(),
      },
    })
    // 磁盘真值缺席：不产生 content/old.json 的 delete。幻影 delete 会让后续 commit 对
    // 不存在目标执行 unlinkSync 抛错，把陈旧 baseline 条目放大成整次迁移失败。
    const phantom = buildMigrationTransactionChanges(args()).filter(
      ({ target }) => target === 'packages/migrate/baselines/pal/content/old.json',
    )
    expect(phantom, '退役 baseline 文件不在磁盘时不得产生幻影 delete').toEqual([])
    expect(buildMigrationTransactionChanges(args()).map(({ target }) => target)).toEqual([
      'packages/migrate/baselines/pal/_state.json',
    ])
    // 同 fixture 正控（在场→删除臂旧证 write-plan.boundaries:127-135）：文件落盘后按真值删除。
    mkdirSync(resolve(repo, 'packages/migrate/baselines/pal/content'), { recursive: true })
    writeFileSync(resolve(repo, 'packages/migrate/baselines/pal/content/old.json'), 'stale')
    expect(buildMigrationTransactionChanges(args())).toContainEqual({
      target: 'packages/migrate/baselines/pal/content/old.json',
      scope: 'baseline',
    })
  })
})
