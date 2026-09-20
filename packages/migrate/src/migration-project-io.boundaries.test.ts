/**
 * TEST-MIGRATION-BOUNDARIES-1 T01：migration-project-io 单轴（migration-project-io.ts）。
 * 既有 migration-project-io.test 已覆盖托管 JSON/TOCTOU/非托管/索引/identity 主干——不重复。
 * 本文件：合法 scene index 正控后的坏 JSON/坏 path 类型精确错误、snapshot 新增目标检查、
 * managed 集合不别名、hashUnmanaged 排序与排除、assertHashMapsEqual 20 路径上限。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  assertHashMapsEqual,
  assertProjectSnapshotCurrent,
  discoverProjectManagedFiles,
  hashUnmanagedProjectFiles,
  loadProjectMigrationSnapshot,
} from './migration-project-io.js'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), 'tb10-io-'))
  roots.push(root)
  mkdirSync(join(root, 'projects/pal/content/scenes'), { recursive: true })
  // scripts index 目录不再需要（chunks 发现轴已撤回）
  mkdirSync(join(root, 'projects/pal/content/maps'), { recursive: true })
  return root
}

describe('T01 discoverProjectManagedFiles 单轴', () => {
  test('合法 scene index 正控；坏 JSON/坏 path 类型/坏 maps 类型精确错误', () => {
    const root = repo()
    writeFileSync(
      join(root, 'projects/pal/content/scenes/index.json'),
      JSON.stringify({
        version: 1,
        scenes: [{ id: 's1', name: '一', path: 'content/scenes/s1.json' }],
      }),
      'utf8',
    )
    expect(discoverProjectManagedFiles(root, new Set(['seed.json']))).toEqual(
      new Set(['seed.json', 'content/scenes/s1.json']),
    )
    // 坏 JSON
    writeFileSync(join(root, 'projects/pal/content/scenes/index.json'), '{bad', 'utf8')
    expect(() => discoverProjectManagedFiles(root, new Set())).toThrow(
      '托管索引 JSON 解析失败 content/scenes/index.json',
    )
    // scene id 非法 → validateSceneIndex 精确错误
    writeFileSync(
      join(root, 'projects/pal/content/scenes/index.json'),
      JSON.stringify({
        version: 1,
        scenes: [{ id: '', name: 'n', path: 'content/scenes/x.json' }],
      }),
      'utf8',
    )
    expect(() => discoverProjectManagedFiles(root, new Set())).toThrow(
      'sceneIndex.scenes[0].id: 非法稳定 id ""',
    )
    // 恢复合法 scenes index 后再测 scripts index
    writeFileSync(
      join(root, 'projects/pal/content/scenes/index.json'),
      JSON.stringify({ version: 1, scenes: [] }),
      'utf8',
    )
    // 注：content/scripts/index 的 chunks 发现属 E05 历史输出退役域（已签排除），
    // 本批不为其新增发现/拒绝合同；scene/map 当前发现与 TOCTOU 继续保留。
    // maps index maps 非数组
    writeFileSync(
      join(root, 'projects/pal/content/maps/index.json'),
      JSON.stringify({ maps: 'nope' }),
      'utf8',
    )
    expect(() => discoverProjectManagedFiles(root, new Set())).toThrow(
      'content/maps/index.json: maps 期望数组',
    )
  })
  test('loadProjectMigrationSnapshot：越界路径拒绝；managed 集合不别名；snapshot 新增目标检查', () => {
    const root = repo()
    writeFileSync(join(root, 'projects/pal/a.json'), '{"k":1}', 'utf8')
    const managed = new Set(['a.json'])
    const snapshot = loadProjectMigrationSnapshot(root, managed)
    expect(snapshot.files.get('a.json')).toEqual({ k: 1 })
    managed.add('late.json') // 事后改入参集合不影响快照
    expect(snapshot.managedFiles.has('late.json')).toBe(false)
    expect(() => loadProjectMigrationSnapshot(root, new Set(['../escape.json']))).toThrow(
      '工程路径必须是安全相对路径: ../escape.json',
    )
    // 磁盘字节被改动 → TOCTOU 复核报错；一致时通过
    writeFileSync(join(root, 'projects/pal/a.json'), '{"k":2}', 'utf8')
    expect(() => assertProjectSnapshotCurrent(root, snapshot)).toThrow(
      '迁移计划后工程已变更: a.json',
    )
    writeFileSync(join(root, 'projects/pal/a.json'), '{"k":1}', 'utf8')
    expect(() => assertProjectSnapshotCurrent(root, snapshot)).not.toThrow()
  })
  test('hashUnmanaged 排序与排除；assertHashMapsEqual 20 路径上限截断', () => {
    const root = repo()
    for (const name of ['b.json', 'a.json', 'managed.json', 'skip.json']) {
      writeFileSync(join(root, `projects/pal/${name}`), name, 'utf8')
    }
    const hashes = hashUnmanagedProjectFiles(
      root,
      new Set(['managed.json']),
      new Set(['skip.json']),
    )
    expect([...hashes.keys()]).toEqual(['a.json', 'b.json'])
    // 上限：25 个变化路径只报前 20
    const expected = new Map(Array.from({ length: 25 }, (_, i) => [`p${i}`, 'x']))
    const actual = new Map(Array.from({ length: 25 }, (_, i) => [`p${i}`, 'y']))
    try {
      assertHashMapsEqual(expected, actual, '测试.')
      throw new Error('unreachable')
    } catch (error) {
      const message = (error as Error).message
      expect(message).toContain('测试.字节发生变化: ')
      expect(message.split(', ')).toHaveLength(20) // 截断到 20
    }
  })
})
