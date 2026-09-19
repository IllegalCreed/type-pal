/**
 * TEST-MIGRATION-BOUNDARIES-1 T03：migration-write-plan 保真与排序。
 * 既有 migration-write-plan.test 已覆盖重复/前置/事务序/manifest-last/退役主干——不重复。
 * 本文件：多 write/delete/不同 baseline 排序的完整 changes（scene 先于 index、localeCompare、
 * baseline 文件按序且 _state 最后）、retirement 带 expectedPreviousHash、
 * 磁盘已一致的 baseline 内容跳过、源 plan/baseline 深快照不变。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { serializeMigrationJson, type MigrationSnapshot } from './migration-baseline.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const snap = (paths: string[]): MigrationSnapshot => ({
  files: new Map(paths.map((path) => [path, { kind: 'stub', path } as never])),
  managedFiles: new Set(paths),
})

const emptyPlan = () => ({
  writes: new Map<string, never>(),
  deletes: [] as string[],
  target: new Map<string, never>(),
  conflicts: [],
  summary: { managed: 0, generated: 0, kept: 0, retired: 0 },
})

describe('T03 buildMigrationTransactionChanges 保真与排序', () => {
  test('多 write/delete：scene 先于 index、其余 localeCompare、delete 排序、源 plan/baseline 不变', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb10-wp-'))
    roots.push(root)
    const plan = {
      ...emptyPlan(),
      writes: new Map([
        ['content/scenes/index.json', { kind: 'index' } as never],
        ['content/scenes/z.json', { kind: 'scene-z' } as never],
        ['content/scenes/a.json', { kind: 'scene-a' } as never],
        ['content/items/index.json', { kind: 'items' } as never],
      ]),
      deletes: ['content/maps/z.json', 'content/maps/a.json'],
    }
    const planSnapshot = structuredClone({
      writes: [...plan.writes],
      deletes: [...plan.deletes],
    })
    const nextBaseline = snap(['b.json', 'a.json'])
    // 深快照：structuredClone 直接持有实际 Map/Set/嵌套 JSON（浅 entries 会与输入共享 value）
    const baselineSnapshot = structuredClone(nextBaseline)
    const changes = buildMigrationTransactionChanges({ repo: root, plan, nextBaseline })
    const targets = changes.map((change) => change.target)
    // SceneIndex 专属提升：只排在 scenes 正文之后；其余按 localeCompare（items 先于 scenes）
    expect(targets.slice(0, 6)).toEqual([
      'projects/pal/content/items/index.json',
      'projects/pal/content/scenes/a.json',
      'projects/pal/content/scenes/z.json',
      'projects/pal/content/scenes/index.json',
      'projects/pal/content/maps/a.json',
      'projects/pal/content/maps/z.json',
    ])
    // baseline 段紧随：a/b 按序（map 原子文件只进 _state 不写正文）、_state 最后
    expect(targets.slice(6)).toEqual([
      'packages/migrate/baselines/pal/a.json',
      'packages/migrate/baselines/pal/b.json',
      'packages/migrate/baselines/pal/_state.json',
    ])
    // 源不变
    expect({ writes: [...plan.writes], deletes: [...plan.deletes] }).toEqual(planSnapshot)
    expect(nextBaseline).toEqual(baselineSnapshot) // 同一实际 baseline 对象深比较（嵌套 JSON 污染即红）
  })
  test('retirement 带 expectedPreviousHash 排序；磁盘一致的 baseline 正文跳过、下轮不再管理则删除', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb10-wp-'))
    roots.push(root)
    const same = snap(['same.json'])
    const sameContent = serializeMigrationJson(same.files.get('same.json')!, 'same.json')
    const baselineDir = join(root, 'packages/migrate/baselines/pal')
    mkdirSync(baselineDir, { recursive: true })
    const samePath = join(baselineDir, 'same.json')
    writeFileSync(samePath, sameContent, 'utf8')
    const previous = { files: new Map(), managedFiles: new Set(['same.json']) }

    // 正文与磁盘一致 → 不产生 same.json 内容写入（只有 _state 与 retirement）
    const changes = buildMigrationTransactionChanges({
      repo: root,
      plan: emptyPlan(),
      previousBaseline: previous,
      nextBaseline: same,
      retiredAssets: [
        { id: 'asset-b', path: 'assets/migrated/b.rle', expectedSha256: 'b'.repeat(64) },
        { id: 'asset-a', path: 'assets/migrated/a.rle', expectedSha256: 'a'.repeat(64) },
      ],
    })
    expect(
      changes.filter((change) => change.scope === 'baseline' && change.target.endsWith('same.json')),
    ).toEqual([]) // 内容一致跳过
    expect(changes.filter((change) => change.scope === 'project' && !change.content)).toEqual([
      {
        target: 'projects/pal/assets/migrated/a.rle',
        scope: 'project',
        expectedPreviousHash: 'a'.repeat(64),
      },
      {
        target: 'projects/pal/assets/migrated/b.rle',
        scope: 'project',
        expectedPreviousHash: 'b'.repeat(64),
      },
    ])
    // 内容改一个字节 → 重新出现该写入（相邻正控）
    writeFileSync(samePath, sameContent + ' ', 'utf8')
    const changed = buildMigrationTransactionChanges({
      repo: root,
      plan: emptyPlan(),
      previousBaseline: previous,
      nextBaseline: same,
    })
    expect(
      changed.some((change) => change.target === 'packages/migrate/baselines/pal/same.json' && change.content),
    ).toBe(true)
    // 下轮不再管理 same.json → baseline delete（磁盘存在才删）
    const dropped = buildMigrationTransactionChanges({
      repo: root,
      plan: emptyPlan(),
      previousBaseline: previous,
      nextBaseline: snap([]),
    })
    const del = dropped.find((change) => change.target.endsWith('same.json'))
    expect(del).toEqual({ target: 'packages/migrate/baselines/pal/same.json', scope: 'baseline' })
  })
})
