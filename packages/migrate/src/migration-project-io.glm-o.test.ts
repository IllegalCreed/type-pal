/** TEST-GLM-WAVE-O-1 O02：工程托管文件发现/快照/不变性审计的残余合同。
 *  existing-proof 扣除（O-R12-02 按报告六条裁决 + 同法复核四条，删重 10 行，不计净新）：
 *  - scene index 正文并入/坏 JSON 拒绝：boundaries:34-49 同条件同答案（seed+scene 集合、
 *    精确错误串）；
 *  - scripts chunks 发现/拒绝：boundaries:65-67 注释明确 chunks 属 E05 历史退役域——
 *    无当前 canonical caller 证明，不复活退役域；
 *  - maps 非数组拒绝：boundaries:72-79 精确同错误串（本文件仅保留未证的 map path
 *    非字符串臂）；
 *  - 托管正文坏 JSON fail-loud：glm-next-wave:40-51 更强（消息+cause 断言）；
 *  - 托管值+hash 加载与缺失跳过/托管登记：旧:30-38 + next-wave:53-64（managedFiles
 *    toEqual 全集已覆盖登记臂）；
 *  - 快照后改动精确路径/未改动默认通过：boundaries:93-99 同条件同答案；
 *  - 非托管过滤 managed/excluded：boundaries:101-111 真实两类排除+精确剩余 keys；
 *  - Set 复制不别名：boundaries:86-89（事后改入参集合快照不变）；toEqual(Set) 亦不
 *    证明插入顺序，原「原序语义」标题撤回；
 *  - actual 多出键报告：旧:63「报告新增、删除或改动」+ 产品单守卫 :125-132 同一比较。
 *  保留臂（旧证未覆盖的真实残余）：maps path 类型/合法 maps 发现、绝对路径、
 *  快照外目标集容忍、目录缺失、等值通过+排序消息、空工程种子集、递归 posix。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
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

describe('O02 discoverProjectManagedFiles：maps 残余臂', () => {
  test('maps index map path 非字符串 fail-loud（maps 非数组臂由旧 boundaries:72-79 证）', () => {
    const repo = tempRepo()
    writeProject(repo, 'content/maps/index.json', JSON.stringify({ maps: [{ path: 7 }] }))
    expect(() => discoverProjectManagedFiles(repo, new Set())).toThrow(
      'content/maps/index.json: map path 无效',
    )
  })

  test('合法 maps index 并入地图正文路径（旧 :86 仅证场景与 chunk 发现）', () => {
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

  test('无任何索引时空工程仅返回种子托管集', () => {
    const repo = tempRepo()
    mkdirSync(resolve(repo, PAL_PROJECT_REL), { recursive: true })
    expect(discoverProjectManagedFiles(repo, new Set(['seed.json']))).toEqual(
      new Set(['seed.json']),
    )
  })
})

describe('O02 loadProjectMigrationSnapshot / assertProjectSnapshotCurrent：残余臂', () => {
  test('绝对路径被 safeProjectPath 拒绝（../escape 臂由旧 boundaries:90-92 证）', () => {
    const repo = tempRepo()
    expect(() => loadProjectMigrationSnapshot(repo, new Set([resolve(repo, 'x.json')]))).toThrow(
      '工程路径必须是安全相对路径',
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

describe('O02 hashUnmanagedProjectFiles / assertHashMapsEqual：残余臂', () => {
  test('工程目录不存在 → 空 hash 表', () => {
    const repo = tempRepo()
    expect(hashUnmanagedProjectFiles(repo, new Set())).toEqual(new Map())
  })

  test('assertHashMapsEqual：等值映射通过；多键差异按排序报告（旧 :63 仅单键 changed 臂）', () => {
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

  test('非托管文件递归遍历子目录且 rel 路径为 posix', () => {
    const repo = tempRepo()
    writeProject(repo, 'nested/dir/file.json', 'x')
    const hashes = hashUnmanagedProjectFiles(repo, new Set())
    expect([...hashes.keys()]).toEqual(['nested/dir/file.json'])
  })
})
