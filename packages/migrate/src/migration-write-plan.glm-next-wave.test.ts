/** TEST-GLM-NEW-J-1 J06：migration-write-plan 规划快照 hash 锚与两类缺快照臂。
 * 旧证：migration-write-plan(.boundaries).test.ts 盖排序/去重/manifest-last/退役/
 * baseline 跳写；工程 write 的 `expectedPreviousHash` TOCTOU 锚（含新文件 null 臂）
 * 与「未纳入规划快照」「缺原始字节 hash」两条 fail-loud 在旧测试零断言。
 * 纯计划函数 + 自有 mkdtemp，不写任何真实工程路径。
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { serializeMigrationJson, sha256 } from './migration-baseline.js'
import type { ProjectMigrationSnapshot } from './migration-project-io.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'
import type { MigrationJson } from './pal-migration.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'type-pal-glm-j-write-plan-'))
  roots.push(root)
  return root
}

const snapshotWith = (
  entries: Array<{ path: string; raw?: string; value?: MigrationJson }>,
): ProjectMigrationSnapshot => ({
  files: new Map(
    entries.filter((entry) => entry.value !== undefined).map((entry) => [entry.path, entry.value!]),
  ),
  managedFiles: new Set(entries.map((entry) => entry.path)),
  hashes: new Map(
    entries
      .filter((entry) => entry.raw !== undefined)
      .map((entry) => [entry.path, sha256(entry.raw!)]),
  ),
})

const run = (snapshot: ProjectMigrationSnapshot) => {
  const plan = {
    writes: new Map([['content/items.json', [{ id: 'generated' }] as MigrationJson]]),
    deletes: [],
  }
  const nextBaseline = { files: new Map<string, MigrationJson>(), managedFiles: new Set<string>() }
  const before = structuredClone({
    plan: [...plan.writes],
    snapshot: {
      files: [...snapshot.files],
      hashes: [...snapshot.hashes],
      managedFiles: [...snapshot.managedFiles],
    },
  })
  const changes = buildMigrationTransactionChanges({
    repo: tempRepo(),
    plan,
    projectSnapshot: snapshot,
    nextBaseline,
  })
  expect({
    plan: [...plan.writes],
    snapshot: {
      files: [...snapshot.files],
      hashes: [...snapshot.hashes],
      managedFiles: [...snapshot.managedFiles],
    },
  }).toEqual(before)
  return changes
}

describe('buildMigrationTransactionChanges：工程写入的规划快照锚', () => {
  test('write 目标不在规划快照 → 未纳入规划快照 fail-loud', () => {
    const snapshot = snapshotWith([])
    expect(() => run(snapshot)).toThrow('工程目标未纳入规划快照: content/items.json')
  })

  test('write 目标受管但缺原始字节 hash → 缺原始字节 hash fail-loud', () => {
    const snapshot = snapshotWith([{ path: 'content/items.json', value: [{ id: 'old' }] }])
    expect(() => run(snapshot)).toThrow('工程规划快照缺原始字节 hash: content/items.json')
  })

  test('规划时已有正文：write 携带原始字节 hash 与确定性序列化正文', () => {
    const raw = '{"id":"old"}\n'
    const snapshot = snapshotWith([
      { path: 'content/items.json', raw, value: [{ id: 'old' }] as MigrationJson },
    ])
    const projectChanges = run(snapshot).filter((change) => change.scope === 'project')
    expect(projectChanges).toEqual([
      {
        target: 'projects/pal/content/items.json',
        scope: 'project',
        content: serializeMigrationJson([{ id: 'generated' }], 'content/items.json'),
        expectedPreviousHash: sha256(raw),
      },
    ])
  })

  test('规划时受管但正文缺席：expectedPreviousHash 为 null（TOCTOU 锚期待不存在）', () => {
    const snapshot = snapshotWith([{ path: 'content/items.json' }])
    const projectChanges = run(snapshot).filter((change) => change.scope === 'project')
    expect(projectChanges).toEqual([
      {
        target: 'projects/pal/content/items.json',
        scope: 'project',
        content: serializeMigrationJson([{ id: 'generated' }], 'content/items.json'),
        expectedPreviousHash: null,
      },
    ])
  })
})
