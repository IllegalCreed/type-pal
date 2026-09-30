/** TEST-GLM-WAVE-O-1 O03：写入计划（buildMigrationTransactionChanges）与 journal
 *  恢复的剩余合同。旧证：migration-write-plan.test.ts / transaction.test.ts 覆盖常规
 *  顺序与中断；本卡补齐规划快照 hash 门、退役资源校验、baseline 差异化写、
 *  manifest 最后提交条件、symlink/绝对路径拒绝与多操作恢复次序。全部 mkdtemp 隔离。
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256, serializeMigrationJson, type MigrationSnapshot } from './migration-baseline.js'
import {
  commitMigrationTransaction,
  recoverMigrationTransaction,
  type TransactionChange,
} from './migration-transaction.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'
import { convertSourceTilemap } from './project-map-converter.js'

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'type-pal-glm-o-wp-'))
  roots.push(root)
  return root
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const MAP = 'content/maps/map-001.json'
const REAL_MAP = (() => {
  const map = convertSourceTilemap(1, {
    width: 1,
    height: 1,
    tileset: 'tileset/1.rle',
    cells: [[{ lower: 0, upper: 0 }]],
  })
  return map as unknown as Record<string, unknown>
})()

function projectSnapshot(files: Record<string, unknown>): {
  files: Map<string, unknown>
  managedFiles: Set<string>
  hashes: Map<string, string>
} {
  const entries = new Map(Object.entries(files))
  const hashes = new Map<string, string>()
  for (const [path, value] of entries)
    hashes.set(path, sha256(serializeMigrationJson(value, path)))
  return { files: entries, managedFiles: new Set(entries.keys()), hashes }
}

const baseArgs = (repo: string) => ({
  repo,
  plan: { writes: new Map<string, unknown>(), deletes: [] as string[] },
  projectSnapshot: projectSnapshot({}),
  nextBaseline: { files: new Map(), managedFiles: new Set() },
})

describe('O03 buildMigrationTransactionChanges：工程写入与规划快照门', () => {
  test('工程写按 scenes/index 最后排序；map 内容走专用序列化', () => {
    const repo = tempRepo()
    const plan = {
      writes: new Map<string, unknown>([
        ['content/actors.json', [{ id: 'a' }]],
        ['content/scenes/index.json', { version: 1, scenes: [] }],
        [MAP, REAL_MAP],
        // 字母序在 scenes/index 之后：排序必须由显式 order 权重而非字典序决定。
        ['content/zz-sidecar.json', { z: 1 }],
      ]),
      deletes: [],
    }
    const args = {
      ...baseArgs(repo),
      plan,
      projectSnapshot: projectSnapshot({
        'content/actors.json': [{ id: 'a' }],
        'content/scenes/index.json': { version: 1, scenes: [] },
        [MAP]: REAL_MAP,
        'content/zz-sidecar.json': { z: 1 },
      }),
    }
    const changes = buildMigrationTransactionChanges(args)
    const projectPaths = changes
      .filter(({ scope }) => scope === 'project')
      .map(({ target }) => target)
    expect(projectPaths.at(-1)).toBe('projects/pal/content/scenes/index.json')
    expect(projectPaths.at(-2)).toBe('projects/pal/content/zz-sidecar.json')
    const mapChange = changes.find(({ target }) => target === `projects/pal/${MAP}`)!
    expect(mapChange.content).toBe(serializeMigrationJson(REAL_MAP, MAP))
  })

  test('写入目标未纳入规划快照 → fail-loud', () => {
    const repo = tempRepo()
    const plan = { writes: new Map([['content/ghost.json', {}] as const]), deletes: [] as string[] }
    expect(() => buildMigrationTransactionChanges({ ...baseArgs(repo), plan })).toThrow(
      '工程目标未纳入规划快照: content/ghost.json',
    )
  })

  test('托管文件缺原始字节 hash（hash/files 不一致）→ fail-loud', () => {
    const repo = tempRepo()
    const plan = { writes: new Map([['content/a.json', {}] as const]), deletes: [] as string[] }
    const projectSnapshot = {
      files: new Map([['content/a.json', {}]]),
      managedFiles: new Set(['content/a.json']),
      hashes: new Map(),
    }
    expect(() =>
      buildMigrationTransactionChanges({ ...baseArgs(repo), plan, projectSnapshot }),
    ).toThrow('工程规划快照缺原始字节 hash: content/a.json')
  })

  test('删除计划带规划 hash；删除目标不存在于快照正文 → expectedPreviousHash=null', () => {
    const repo = tempRepo()
    const plan = { writes: new Map(), deletes: ['content/gone.json'] }
    const projectSnapshot = {
      files: new Map(),
      managedFiles: new Set(['content/gone.json']),
      hashes: new Map(),
    }
    const changes = buildMigrationTransactionChanges({ ...baseArgs(repo), plan, projectSnapshot })
    expect(changes.filter(({ scope }) => scope === 'project')).toMatchObject([
      { target: 'projects/pal/content/gone.json', scope: 'project', expectedPreviousHash: null },
    ])
    expect(changes.find(({ scope }) => scope === 'project')).not.toHaveProperty('content')
  })
})

describe('O03 buildMigrationTransactionChanges：退役资源与重复目标', () => {
  const retirement = (path: string, sha = 'a'.repeat(64)) => ({ id: 'ret-1', path, expectedSha256: sha })

  test('退役迁移资源按 path 排序生成删除改动并带 expectedSha256', () => {
    const repo = tempRepo()
    const changes = buildMigrationTransactionChanges({
      ...baseArgs(repo),
      retiredAssets: [
        retirement('assets/migrated/b.png', 'b'.repeat(64)),
        retirement('assets/migrated/a.png', 'a'.repeat(64)),
      ],
    })
    expect(
      changes
        .filter(({ scope }) => scope === 'project')
        .map(({ target, expectedPreviousHash }) => ({ target, expectedPreviousHash })),
    ).toEqual([
      { target: 'projects/pal/assets/migrated/a.png', expectedPreviousHash: 'a'.repeat(64) },
      { target: 'projects/pal/assets/migrated/b.png', expectedPreviousHash: 'b'.repeat(64) },
    ])
  })

  test('退役资源路径越界或 sha 非法 → fail-loud', () => {
    const repo = tempRepo()
    expect(() =>
      buildMigrationTransactionChanges({
        ...baseArgs(repo),
        retiredAssets: [retirement('assets/other/x.png')],
      }),
    ).toThrow('退役迁移资源计划无效: ret-1 -> assets/other/x.png')
    expect(() =>
      buildMigrationTransactionChanges({
        ...baseArgs(repo),
        retiredAssets: [retirement('assets/migrated/../x.png')],
      }),
    ).toThrow('退役迁移资源计划无效')
    expect(() =>
      buildMigrationTransactionChanges({
        ...baseArgs(repo),
        retiredAssets: [retirement('assets/migrated/x.png', 'nothex')],
      }),
    ).toThrow('退役迁移资源计划无效')
  })

  test('工程写与退役删除同目标 → 重复工程目标 fail-loud', () => {
    const repo = tempRepo()
    const path = 'assets/migrated/dup.png'
    const plan = {
      writes: new Map([[path, {}] as const]),
      deletes: [] as string[],
    }
    expect(() =>
      buildMigrationTransactionChanges({
        ...baseArgs(repo),
        plan,
        projectSnapshot: projectSnapshot({ [path]: {} }),
        retiredAssets: [retirement(path)],
      }),
    ).toThrow('迁移写入计划包含重复工程目标')
  })
})

describe('O03 buildMigrationTransactionChanges：baseline 差异化与 manifest 最后提交', () => {
  test('baseline 文件与磁盘一致时不产生改动；漂移时产生 baseline 写', () => {
    const repo = tempRepo()
    const baseline: MigrationSnapshot = {
      files: new Map([['content/shops.json', [{ id: 1 }]]]),
      managedFiles: new Set(['content/shops.json']),
    }
    const changed = {
      files: new Map([['content/shops.json', [{ id: 1 }, { id: 2 }]]]),
      managedFiles: new Set(['content/shops.json']),
    }
    mkdirSync(resolve(repo, 'packages/migrate/baselines/pal/content'), { recursive: true })
    writeFileSync(
      resolve(repo, 'packages/migrate/baselines/pal/content/shops.json'),
      `${JSON.stringify([{ id: 1 }, { id: 2 }], null, 2)}\n`,
    )
    const unchanged = buildMigrationTransactionChanges({
      ...baseArgs(repo),
      nextBaseline: changed,
    })
    // 磁盘已是目标内容 → 无 baseline 写。
    expect(unchanged.filter(({ scope }) => scope === 'baseline')).toHaveLength(1) // 仅 _state.json
    const drifting = buildMigrationTransactionChanges({
      ...baseArgs(repo),
      nextBaseline: baseline,
    })
    expect(drifting.some(({ scope, target }) => scope === 'baseline' && target === 'packages/migrate/baselines/pal/content/shops.json')).toBe(true)
  })

  test('previousBaseline 独有且磁盘仍存在的 baseline 文件产生删除改动', () => {
    const repo = tempRepo()
    const stale = 'packages/migrate/baselines/pal/content/old.json'
    mkdirSync(resolve(repo, stale, '..'), { recursive: true })
    writeFileSync(resolve(repo, stale), 'stale\n')
    const changes = buildMigrationTransactionChanges({
      ...baseArgs(repo),
      previousBaseline: { files: new Map([['content/old.json', 'stale']]), managedFiles: new Set(['content/old.json']) },
      nextBaseline: { files: new Map(), managedFiles: new Set() },
    })
    expect(changes).toContainEqual({ target: stale, scope: 'baseline' })
  })

  test('nextManifest 无前置条件 → fail-loud；磁盘一致 → 无 manifest 改动', () => {
    const repo = tempRepo()
    expect(() =>
      buildMigrationTransactionChanges({
        ...baseArgs(repo),
        nextManifest: { id: 'pal' } as never,
      }),
    ).toThrow('manifest 变更缺资源闭包前置条件')
    const manifest = { id: 'pal' } as never
    mkdirSync(resolve(repo, 'projects/pal'), { recursive: true })
    writeFileSync(resolve(repo, 'projects/pal/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    const changes = buildMigrationTransactionChanges({
      ...baseArgs(repo),
      nextManifest: manifest,
      manifestPreconditions: [{ target: 'projects/pal/assets/a.bin', hash: sha256('a') }],
    })
    expect(changes.some(({ scope }) => scope === 'manifest')).toBe(false)
  })

  test('manifest 变更排在全部改动最后（含 baseline 之后）', () => {
    const repo = tempRepo()
    mkdirSync(resolve(repo, 'projects/pal'), { recursive: true })
    writeFileSync(resolve(repo, 'projects/pal/manifest.json'), 'old')
    const changes = buildMigrationTransactionChanges({
      ...baseArgs(repo),
      plan: { writes: new Map([['content/a.json', {}] as const]), deletes: [] },
      projectSnapshot: projectSnapshot({ 'content/a.json': {} }),
      nextBaseline: {
        files: new Map([['content/b.json', 'b']]),
        managedFiles: new Set(['content/b.json']),
      },
      nextManifest: { id: 'pal' } as never,
      manifestPreconditions: [{ target: 'projects/pal/assets/a.bin', hash: sha256('a') }],
    })
    expect(changes.at(-1)).toMatchObject({ scope: 'manifest', target: 'projects/pal/manifest.json' })
  })
})

describe('O03 事务与 journal：symlink/绝对路径/恢复次序（mkdtemp）', () => {
  const writeOp = (target: string, content: string): TransactionChange => ({
    target,
    scope: 'project',
    expectedPreviousHash: null,
    content,
  })

  test('目标为 symlink 时提交被拒绝（assertMigrationFilePath）', () => {
    const repo = tempRepo()
    mkdirSync(resolve(repo, 'projects/pal/content'), { recursive: true })
    const outside = resolve(repo, 'outside.txt')
    writeFileSync(outside, 'victim')
    symlinkSync(outside, resolve(repo, 'projects/pal/content/link.json'))
    expect(() =>
      commitMigrationTransaction(repo, [writeOp('projects/pal/content/link.json', 'x')]),
    ).toThrow('不得经过符号链接: projects/pal/content/link.json')
    expect(readFileSync(outside, 'utf8')).toBe('victim')
  })

  test('journal 绝对路径目标被 strictRepoRel 拒绝', () => {
    const repo = tempRepo()
    const id = 'd'.repeat(16)
    mkdirSync(resolve(repo, '.type-pal-migrate'), { recursive: true })
    writeFileSync(
      resolve(repo, '.type-pal-migrate/pal-journal.json'),
      JSON.stringify({
        version: 2,
        id,
        operations: [
          {
            kind: 'write',
            target: '/etc/passwd',
            scope: 'project',
            staged: `.type-pal-migrate/transactions/${id}/stage/000000`,
            hash: sha256('x'),
            previousHash: null,
          },
        ],
      }),
    )
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      '迁移事务 journal operations[0].target 必须是规范仓库相对路径',
    )
  })

  test('journal write 操作缺 staged → strictRepoRel 拒绝', () => {
    const repo = tempRepo()
    const id = 'e'.repeat(16)
    mkdirSync(resolve(repo, '.type-pal-migrate'), { recursive: true })
    writeFileSync(
      resolve(repo, '.type-pal-migrate/pal-journal.json'),
      JSON.stringify({
        version: 2,
        id,
        operations: [
          {
            kind: 'write',
            target: 'projects/pal/content/a.json',
            scope: 'project',
            hash: sha256('x'),
            previousHash: null,
          },
        ],
      }),
    )
    expect(() => recoverMigrationTransaction(repo)).toThrow(
      '迁移事务 journal operations[0].staged 路径无效',
    )
  })

  test('journal 根非对象 / scope 未知 / project scope 越界 / precondition 非对象 逐轴拒绝', () => {
    const journal = (operations: unknown, version = 2, id = 'a'.repeat(16)): string =>
      JSON.stringify({ version, id, operations })
    const setup = (payload: string): string => {
      const repo = tempRepo()
      mkdirSync(resolve(repo, '.type-pal-migrate'), { recursive: true })
      writeFileSync(resolve(repo, '.type-pal-migrate/pal-journal.json'), payload)
      return repo
    }
    expect(() => recoverMigrationTransaction(setup('null'))).toThrow('迁移事务 journal 格式无效')
    expect(() =>
      recoverMigrationTransaction(setup(journal([{ kind: 'write', target: 'projects/pal/a', scope: 'weird', previousHash: null }]))),
    ).toThrow('迁移事务 journal scope 无效: weird')
    expect(() =>
      recoverMigrationTransaction(
        setup(journal([{ kind: 'delete', target: 'baselines/x.json', scope: 'project', previousHash: null }])),
      ),
    ).toThrow('project scope 目标越界: baselines/x.json')
    expect(() =>
      recoverMigrationTransaction(
        setup(
          journal([
            {
              kind: 'write',
              target: 'projects/pal/manifest.json',
              scope: 'manifest',
              staged: `.type-pal-migrate/transactions/${'a'.repeat(16)}/stage/000000`,
              hash: sha256('x'),
              previousHash: null,
              preconditions: ['not-an-object'],
            },
          ]),
        ),
      ),
    ).toThrow('迁移事务 journal precondition 无效: projects/pal/manifest.json')
  })

  test('manifest 前置条件指向 symlink 时恢复拒绝（不读取链外文件）', () => {
    const repo = tempRepo()
    const id = 'f'.repeat(16)
    mkdirSync(resolve(repo, 'projects/pal/assets'), { recursive: true })
    const outside = resolve(repo, 'real.bin')
    writeFileSync(outside, 'data')
    symlinkSync(outside, resolve(repo, 'projects/pal/assets/link.bin'))
    mkdirSync(resolve(repo, '.type-pal-migrate'), { recursive: true })
    writeFileSync(
      resolve(repo, '.type-pal-migrate/pal-journal.json'),
      JSON.stringify({
        version: 2,
        id,
        operations: [
          {
            kind: 'write',
            target: 'projects/pal/manifest.json',
            scope: 'manifest',
            previousHash: null,
            preconditions: [{ target: 'projects/pal/assets/link.bin', hash: sha256('data') }],
          },
        ],
      }),
    )
    expect(() => recoverMigrationTransaction(repo)).toThrow()
    expect(existsSync(resolve(repo, 'projects/pal/manifest.json'))).toBe(false)
  })

  test('多操作事务按序恢复且 afterOperation 收到 journal 操作与下标；完成后 staging 目录清理', () => {
    const repo = tempRepo()
    mkdirSync(resolve(repo, 'projects/pal/content/deep'), { recursive: true })
    writeFileSync(resolve(repo, 'projects/pal/content/deep/old.json'), 'old')
    const seen: Array<[string, number]> = []
    commitMigrationTransaction(
      repo,
      [
        writeOp('projects/pal/content/deep/new.json', 'new\n'),
        {
          target: 'projects/pal/content/deep/old.json',
          scope: 'project',
          expectedPreviousHash: sha256('old'),
        },
        {
          target: 'projects/pal/manifest.json',
          scope: 'manifest',
          content: 'manifest\n',
          preconditions: [{ target: 'projects/pal/content/deep/new.json', hash: sha256('new\n') }],
        },
      ],
      {
        afterOperation: (operation, index) => {
          seen.push([operation.target, index])
        },
      },
    )
    expect(seen.map(([target, index]) => [target, index])).toEqual([
      ['projects/pal/content/deep/new.json', 0],
      ['projects/pal/content/deep/old.json', 1],
      ['projects/pal/manifest.json', 2],
    ])
    expect(readFileSync(resolve(repo, 'projects/pal/content/deep/new.json'), 'utf8')).toBe('new\n')
    expect(existsSync(resolve(repo, 'projects/pal/content/deep/old.json'))).toBe(false)
    expect(readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')).toBe('manifest\n')
    const control = resolve(repo, '.type-pal-migrate')
    expect(existsSync(resolve(control, 'pal-journal.json'))).toBe(false)
    // 事务目录按 id 清理；空的 transactions/ 父目录允许保留。
    expect(readdirSync(resolve(control, 'transactions'))).toEqual([])
  })

  test('中断后留下的 staging 在恢复中被消费并清理整个事务目录', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(
        repo,
        [writeOp('projects/pal/content/a.json', 'a\n'), writeOp('projects/pal/content/b.json', 'b\n')],
        {
          afterOperation: (_operation, index) => {
            if (index === 0) throw new Error('halt')
          },
        },
      ),
    ).toThrow('halt')
    const journal = JSON.parse(
      readFileSync(resolve(repo, '.type-pal-migrate/pal-journal.json'), 'utf8'),
    ) as { id: string; operations: Array<{ staged?: string }> }
    const staged = resolve(repo, journal.operations[1]!.staged!)
    expect(existsSync(staged)).toBe(true)
    expect(recoverMigrationTransaction(repo)).toBe(true)
    expect(readFileSync(resolve(repo, 'projects/pal/content/b.json'), 'utf8')).toBe('b\n')
    expect(existsSync(resolve(repo, '.type-pal-migrate/transactions', journal.id))).toBe(false)
  })

  test('baseline 目标在提交窗口被改 → 提交窗口守卫拒绝（双操作触发 assertPreviousTarget）', () => {
    const repo = tempRepo()
    const baselineFirst = 'packages/migrate/baselines/pal/content/a.json'
    const baselineSecond = 'packages/migrate/baselines/pal/content/b.json'
    mkdirSync(resolve(repo, baselineSecond, '..'), { recursive: true })
    writeFileSync(resolve(repo, baselineSecond), 'v1')
    expect(() =>
      commitMigrationTransaction(
        repo,
        [
          { target: baselineFirst, scope: 'baseline', content: 'a2' },
          { target: baselineSecond, scope: 'baseline', content: 'v2' },
        ],
        {
          afterOperation: (_operation, index) => {
            if (index === 0) writeFileSync(resolve(repo, baselineSecond), 'user-edit')
          },
        },
      ),
    ).toThrow(`事务目标在提交窗口被修改: ${baselineSecond}`)
    expect(readFileSync(resolve(repo, baselineSecond), 'utf8')).toBe('user-edit')
  })

  test('删除已不存在的托管目标（规划 hash=null）为合法 no-op', () => {
    const repo = tempRepo()
    commitMigrationTransaction(repo, [
      {
        target: 'projects/pal/content/already-gone.json',
        scope: 'project',
        expectedPreviousHash: null,
      },
    ])
    expect(existsSync(resolve(repo, 'projects/pal/content/already-gone.json'))).toBe(false)
  })

  test('相同改动集合产出相同事务 id（staging 目录可复算）；不同内容 id 不同', () => {
    const repoA = tempRepo()
    const repoB = tempRepo()
    const changesOf = (content: string): TransactionChange[] => [writeOp('projects/pal/content/a.json', content)]
    const commit = (repo: string, changes: TransactionChange[]): void => {
      let id: string | undefined
      commitMigrationTransaction(repo, changes, {
        afterOperation: (operation) => {
          id ??= (operation as { staged?: string }).staged?.split('/')[2]
          throw new Error('capture-and-halt')
        },
      })
      void id
    }
    // 通过 journal 的 staging 路径观察 id（中断保留 journal）。
    const journalId = (repo: string): string =>
      (JSON.parse(readFileSync(resolve(repo, '.type-pal-migrate/pal-journal.json'), 'utf8')) as { id: string }).id
    try {
      commit(repoA, changesOf('same'))
    } catch {
      // 预期中断
    }
    try {
      commit(repoB, changesOf('same'))
    } catch {
      // 预期中断
    }
    expect(journalId(repoA)).toBe(journalId(repoB))
    const repoC = tempRepo()
    try {
      commit(repoC, changesOf('different'))
    } catch {
      // 预期中断
    }
    expect(journalId(repoC)).not.toBe(journalId(repoA))
  })
})
