/** TEST-GLM-WAVE-O-1 O02：工程托管文件发现/快照/不变性审计的边界合同。
 *  旧证：migration-project-io.test.ts / glm-next-wave 覆盖常规发现与加载；
 *  本卡补齐 gap-map 缺口：索引 JSON 解析失败、scripts/maps 索引路径校验、
 *  safeProjectPath 越界、非托管文件 hash 与断言消息。全部 mkdtemp 隔离。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from './migration-baseline.js'
import {
  assertHashMapsEqual,
  assertProjectSnapshotCurrent,
  discoverProjectManagedFiles,
  hashUnmanagedProjectFiles,
  loadProjectMigrationSnapshot,
  PAL_PROJECT_REL,
} from './migration-project-io.js'

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'type-pal-glm-o-pio-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const writeProject = (repo: string, rel: string, content: string): void => {
  const full = resolve(repo, PAL_PROJECT_REL, rel)
  mkdirSync(resolve(full, '..'), { recursive: true })
  writeFileSync(full, content)
}

describe('O02 discoverProjectManagedFiles：索引发现与坏索引拒绝', () => {
  test('scene index 登记的正文路径并入托管集', () => {
    const repo = tempRepo()
    writeProject(
      repo,
      'content/scenes/index.json',
      JSON.stringify({
        version: 1,
        scenes: [{ id: 's000', name: 'x', path: 'content/scenes/s000.json' }],
      }),
    )
    const managed = discoverProjectManagedFiles(repo, new Set(['content/actors.json']))
    expect(managed.has('content/actors.json')).toBe(true)
    expect(managed.has('content/scenes/s000.json')).toBe(true)
  })

  test('scene index 非法 JSON → 托管索引解析失败（带 cause）', () => {
    const repo = tempRepo()
    writeProject(repo, 'content/scenes/index.json', '{broken')
    expect(() => discoverProjectManagedFiles(repo, new Set())).toThrow(
      '托管索引 JSON 解析失败 content/scenes/index.json',
    )
  })

  test('scripts index chunks 路径并入托管集；path 非字符串 fail-loud', () => {
    const repo = tempRepo()
    writeProject(
      repo,
      'content/scripts/index.json',
      JSON.stringify({
        chunks: { a: { path: 'chunk-a.json' } },
      }),
    )
    const managed = discoverProjectManagedFiles(repo, new Set())
    expect(managed.has('content/scripts/chunk-a.json')).toBe(true)

    writeProject(
      repo,
      'content/scripts/index.json',
      JSON.stringify({
        chunks: { a: { path: 42 } },
      }),
    )
    expect(() => discoverProjectManagedFiles(repo, new Set())).toThrow(
      'content/scripts/index.json: chunk path 无效',
    )
  })

  test('maps index path 非字符串 / maps 非数组分别 fail-loud', () => {
    const repo = tempRepo()
    writeProject(repo, 'content/maps/index.json', JSON.stringify({ maps: [{ path: 7 }] }))
    expect(() => discoverProjectManagedFiles(repo, new Set())).toThrow(
      'content/maps/index.json: map path 无效',
    )
    writeProject(repo, 'content/maps/index.json', JSON.stringify({ maps: 'nope' }))
    expect(() => discoverProjectManagedFiles(repo, new Set())).toThrow(
      'content/maps/index.json: maps 期望数组',
    )
  })

  test('合法 maps index 并入地图正文路径', () => {
    const repo = tempRepo()
    writeProject(
      repo,
      'content/maps/index.json',
      JSON.stringify({
        maps: [{ id: 'map-001', name: 'm', path: 'content/maps/map-001.json' }],
      }),
    )
    expect(discoverProjectManagedFiles(repo, new Set()).has('content/maps/map-001.json')).toBe(true)
  })
})

describe('O02 loadProjectMigrationSnapshot / assertProjectSnapshotCurrent', () => {
  test('加载托管文件值与 hash；缺失文件跳过但保留托管登记', () => {
    const repo = tempRepo()
    writeProject(repo, 'content/actors.json', JSON.stringify([{ id: 'a' }]))
    const managed = new Set(['content/actors.json', 'content/missing.json'])
    const snapshot = loadProjectMigrationSnapshot(repo, managed)
    expect(snapshot.files.get('content/actors.json')).toEqual([{ id: 'a' }])
    expect(snapshot.hashes.get('content/actors.json')).toBe(
      sha256(readFileSync(resolve(repo, PAL_PROJECT_REL, 'content/actors.json'))),
    )
    expect(snapshot.hashes.has('content/missing.json')).toBe(false)
    expect(snapshot.managedFiles.has('content/missing.json')).toBe(true)
  })

  test('托管 JSON 坏字节 → 托管 JSON 解析失败', () => {
    const repo = tempRepo()
    writeProject(repo, 'content/actors.json', '{nope')
    expect(() => loadProjectMigrationSnapshot(repo, new Set(['content/actors.json']))).toThrow(
      '托管 JSON 解析失败 content/actors.json',
    )
  })

  test('绝对路径与 .. 越界路径被 safeProjectPath 拒绝', () => {
    const repo = tempRepo()
    expect(() => loadProjectMigrationSnapshot(repo, new Set([resolve(repo, 'x.json')]))).toThrow(
      '工程路径必须是安全相对路径',
    )
    expect(() => loadProjectMigrationSnapshot(repo, new Set(['../escape.json']))).toThrow(
      '工程路径必须是安全相对路径: ../escape.json',
    )
  })

  test('快照后文件被改动 → assertProjectSnapshotCurrent 报精确路径', () => {
    const repo = tempRepo()
    writeProject(repo, 'content/actors.json', '[]')
    const snapshot = loadProjectMigrationSnapshot(repo, new Set(['content/actors.json']))
    writeProject(repo, 'content/actors.json', '[{"id":"a"}]')
    expect(() => assertProjectSnapshotCurrent(repo, snapshot)).toThrow(
      '迁移计划后工程已变更: content/actors.json',
    )
  })

  test('目标托管集包含快照外文件（缺失视为未变更）时断言通过', () => {
    const repo = tempRepo()
    writeProject(repo, 'content/actors.json', '[]')
    const snapshot = loadProjectMigrationSnapshot(repo, new Set(['content/actors.json']))
    expect(() =>
      assertProjectSnapshotCurrent(
        repo,
        snapshot,
        new Set(['content/actors.json', 'content/new.json']),
      ),
    ).not.toThrow()
  })
})

describe('O02 hashUnmanagedProjectFiles / assertHashMapsEqual', () => {
  test('非托管文件逐个入账；托管与排除文件不入账', () => {
    const repo = tempRepo()
    writeProject(repo, 'managed.json', 'm')
    writeProject(repo, 'unmanaged.json', 'u')
    writeProject(repo, 'excluded.json', 'e')
    const hashes = hashUnmanagedProjectFiles(
      repo,
      new Set(['managed.json']),
      new Set(['excluded.json']),
    )
    expect([...hashes.keys()]).toEqual(['unmanaged.json'])
    expect(hashes.get('unmanaged.json')).toBe(sha256('u'))
  })

  test('工程目录不存在 → 空 hash 表', () => {
    const repo = tempRepo()
    expect(hashUnmanagedProjectFiles(repo, new Set())).toEqual(new Map())
  })

  test('assertHashMapsEqual：一致通过；差异报排序后的精确路径', () => {
    assertHashMapsEqual(new Map([['a', '1']]), new Map([['a', '1']]), 'X')
    expect(() =>
      assertHashMapsEqual(
        new Map([
          ['b.txt', '2'],
          ['a.txt', '1'],
        ]),
        new Map([['a.txt', '9']]),
        '迁移前后',
      ),
    ).toThrow('迁移前后字节发生变化: a.txt, b.txt')
  })
})

describe('O02 project-io 补充：递归遍历与断言容忍', () => {
  test('无任何索引时空工程仅返回种子托管集', () => {
    const repo = tempRepo()
    mkdirSync(resolve(repo, PAL_PROJECT_REL), { recursive: true })
    expect(discoverProjectManagedFiles(repo, new Set(['seed.json']))).toEqual(
      new Set(['seed.json']),
    )
  })

  test('非托管文件递归遍历子目录且 rel 路径为 posix', () => {
    const repo = tempRepo()
    writeProject(repo, 'nested/dir/file.json', 'x')
    const hashes = hashUnmanagedProjectFiles(repo, new Set())
    expect([...hashes.keys()]).toEqual(['nested/dir/file.json'])
  })

  test('assertProjectSnapshotCurrent：未改动时默认目标集通过', () => {
    const repo = tempRepo()
    writeProject(repo, 'content/actors.json', '[]')
    const snapshot = loadProjectMigrationSnapshot(repo, new Set(['content/actors.json']))
    expect(() => assertProjectSnapshotCurrent(repo, snapshot)).not.toThrow()
  })

  test('assertHashMapsEqual：actual 多出的键也被报告', () => {
    expect(() => assertHashMapsEqual(new Map(), new Map([['surprise.txt', 'zz']]), '审计')).toThrow(
      '审计字节发生变化: surprise.txt',
    )
  })

  test('loadProjectMigrationSnapshot 保留传入托管集原序语义（Set 复制）', () => {
    const repo = tempRepo()
    writeProject(repo, 'a.json', '1')
    const managed = new Set(['a.json', 'ghost.json'])
    const snapshot = loadProjectMigrationSnapshot(repo, managed)
    expect(snapshot.managedFiles).toEqual(managed)
    expect(snapshot.managedFiles).not.toBe(managed)
  })
})
