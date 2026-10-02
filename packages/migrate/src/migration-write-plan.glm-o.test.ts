/** TEST-GLM-WAVE-O-1 O03：写入计划（buildMigrationTransactionChanges）与 journal
 *  恢复的剩余合同。全部 mkdtemp 隔离。
 *  existing-proof 扣除（O-R13 + Kimi/Grok 合并裁决，累计删重并分列）：
 *  - 两快照拒收臂（未纳入快照 / files 有 hash 无）：next-wave:76/:81 同守卫同文案
 *    完全旧证，O-R13-01 删除（路径名不同不计新）；
 *  - 排序臂（scenes/index 权重越字典序）：boundaries:57-64（scenes/z 晚于 index）+
 *    旧 test:166-171（s000 晚于 index）已使纯字典序分出次序，排序不计新；本文件仅保留
 *    map 路径向 serializeMigrationJson(value, path) 的委派新轴（Codex 去参变异独证）；
 *  - 删除 null 计算：next-wave:103-109 写臂已证；本文件保留删除环无 content 挂 null
 *    与非 null 挂规划字节 hash 两臂（非 null 臂本轮补合法在场证据）。
 *  - 退役资源排序+expectedSha256：write-plan.boundaries:75-104 逐字节同答案（a/b 序+hash）；
 *  - baseline 一致跳过/漂移产生写：旧:114-131（相同→空计划）+:132-150（nextBaseline
 *    异于磁盘→baseline 正文写）+:174-196（未变跳过）；
 *  - previousBaseline 独有删除：旧:174-196（old.json 删除改动+keep 跳过）同条件同答案；
 *  - manifest 无前置拒绝/磁盘一致无改动：旧:103-111（同错误串）+:114-131；
 *  - manifest 最后提交：旧:132-150（changes.at(-1) manifest）+:151-173（全序断言）；
 *  - 中断 staging 消费恢复：transaction.boundaries:86-101（同条件：二操作中断→恢复补完
 *    +幂等+journal 清理）。
 *  保留臂：scenes/index 显式权重越字典序（boundaries:34 集合无法区分权重与字典序）、
 *  map 专用序列化、规划快照三守卫、退役计划非法、写×退役重复、symlink 两轴、
 *  journal 绝对路径/缺 staged/根坏/坏 scope/坏前置、afterOperation 观测、
 *  baseline 提交窗口、删除 no-op、事务 id 复算。
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { serializeMigrationJson, sha256 } from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'
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
/** 真实合法 ProjectMap（convertSourceTilemap 构造），JSON 往返克隆为 MigrationJson。 */
const REAL_MAP: MigrationJson = (() => {
  const map = convertSourceTilemap(1, {
    width: 1,
    height: 1,
    tileset: 'tileset/1.rle',
    cells: [[{ lower: 0, upper: 0 }]],
  })
  return JSON.parse(JSON.stringify(map)) as MigrationJson
})()

function projectSnapshot(files: Record<string, unknown>): {
  files: Map<string, MigrationJson>
  managedFiles: Set<string>
  hashes: Map<string, string>
} {
  const entries = new Map(Object.entries(files)) as Map<string, MigrationJson>
  const hashes = new Map<string, string>()
  for (const [path, value] of entries) hashes.set(path, sha256(serializeMigrationJson(value, path)))
  return { files: entries, managedFiles: new Set(entries.keys()), hashes }
}

const baseArgs = (repo: string) => ({
  repo,
  plan: { writes: new Map<string, MigrationJson>(), deletes: [] as string[] },
  projectSnapshot: projectSnapshot({}),
  nextBaseline: { files: new Map<string, MigrationJson>(), managedFiles: new Set<string>() },
})

describe('O03 buildMigrationTransactionChanges：工程写入与规划快照门', () => {
  test('map 路径委派专用序列化：write 内容=serializeMigrationJson(value, path)（排序臂由旧 boundaries:57-64/test:166-171 证）', () => {
    const repo = tempRepo()
    const plan = {
      writes: new Map<string, MigrationJson>([[MAP, REAL_MAP as MigrationJson]]),
      deletes: [],
    }
    const args = {
      ...baseArgs(repo),
      plan,
      projectSnapshot: projectSnapshot({ [MAP]: REAL_MAP }),
    }
    const changes = buildMigrationTransactionChanges(args)
    const mapChange = changes.find(({ target }) => target === `projects/pal/${MAP}`)!
    expect(mapChange.content).toBe(serializeMigrationJson(REAL_MAP as MigrationJson, MAP))
  })

  test('删除改动无 content：正文缺席挂 null、正文在场挂规划字节 hash（null 计算臂由旧 next-wave:103-109 证）', () => {
    const repo = tempRepo()
    const plan = { writes: new Map<string, MigrationJson>(), deletes: ['content/gone.json'] }
    const absentSnapshot = {
      files: new Map(),
      managedFiles: new Set(['content/gone.json']),
      hashes: new Map(),
    }
    const changes = buildMigrationTransactionChanges({
      ...baseArgs(repo),
      plan,
      projectSnapshot: absentSnapshot,
    })
    expect(changes.filter(({ scope }) => scope === 'project')).toMatchObject([
      { target: 'projects/pal/content/gone.json', scope: 'project', expectedPreviousHash: null },
    ])
    expect(changes.find(({ scope }) => scope === 'project')).not.toHaveProperty('content')
    // 非 null 臂：删除目标在快照 files+hashes 同时在场 → 携带该规划字节 hash。
    const present = projectSnapshot({
      'content/present.json': [{ id: 'p' }],
    })
    const withPresent = buildMigrationTransactionChanges({
      ...baseArgs(repo),
      plan: { writes: new Map<string, MigrationJson>(), deletes: ['content/present.json'] },
      projectSnapshot: present,
    })
    expect(withPresent.filter(({ scope }) => scope === 'project')).toMatchObject([
      {
        target: 'projects/pal/content/present.json',
        expectedPreviousHash: present.hashes.get('content/present.json'),
      },
    ])
  })
})

describe('O03 buildMigrationTransactionChanges：退役资源与重复目标', () => {
  const retirement = (path: string, sha = 'a'.repeat(64)) => ({
    id: 'ret-1',
    path,
    expectedSha256: sha,
  })

  test('退役计划越界诊断含 id -> path 完整后缀（三守卫臂由旧 test:75-90 拒绝表证）', () => {
    const repo = tempRepo()
    expect(() =>
      buildMigrationTransactionChanges({
        ...baseArgs(repo),
        retiredAssets: [retirement('assets/other/x.png')],
      }),
    ).toThrow('退役迁移资源计划无效: ret-1 -> assets/other/x.png')
  })

  test('工程写与退役删除同目标 → 重复工程目标 fail-loud', () => {
    const repo = tempRepo()
    const path = 'assets/migrated/dup.png'
    const plan = {
      writes: new Map<string, MigrationJson>([[path, {}]]),
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
      recoverMigrationTransaction(
        setup(
          journal([
            { kind: 'write', target: 'projects/pal/a', scope: 'weird', previousHash: null },
          ]),
        ),
      ),
    ).toThrow('迁移事务 journal scope 无效: weird')
    expect(() =>
      recoverMigrationTransaction(
        setup(
          journal([
            { kind: 'delete', target: 'baselines/x.json', scope: 'project', previousHash: null },
          ]),
        ),
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

  test('中断后 recover 清理真实 transactions/<id> 目录（补完/journal 清理/幂等由旧 tx-boundaries:86-101 证，此处只钉目录臂）', () => {
    const repo = tempRepo()
    expect(() =>
      commitMigrationTransaction(
        repo,
        [
          writeOp('projects/pal/content/a.json', 'a\n'),
          writeOp('projects/pal/content/b.json', 'b\n'),
        ],
        {
          afterOperation: (_operation, index) => {
            if (index === 0) throw new Error('halt')
          },
        },
      ),
    ).toThrow('halt')
    const journal = JSON.parse(
      readFileSync(resolve(repo, '.type-pal-migrate/pal-journal.json'), 'utf8'),
    ) as { id: string }
    expect(existsSync(resolve(repo, '.type-pal-migrate/transactions', journal.id))).toBe(true)
    expect(recoverMigrationTransaction(repo)).toBe(true)
    expect(existsSync(resolve(repo, '.type-pal-migrate/transactions', journal.id))).toBe(false)
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
    const changesOf = (content: string): TransactionChange[] => [
      writeOp('projects/pal/content/a.json', content),
    ]
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
      (
        JSON.parse(readFileSync(resolve(repo, '.type-pal-migrate/pal-journal.json'), 'utf8')) as {
          id: string
        }
      ).id
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
