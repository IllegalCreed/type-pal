/** Deterministic transaction ordering for project, retirement and baseline changes. */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { plannedChanges } from './__tests__/planned-changes-fixture.js'
import type { MigrationSnapshot } from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'
import type { MigrationPlan } from './migration-plan.js'

describe('transaction change order', () => {
  const roots: string[] = []

  const snap = (paths: string[]): MigrationSnapshot => ({
    files: new Map(paths.map((path) => [path, { kind: 'stub', path }])),
    managedFiles: new Set(paths),
  })

  const emptyPlan = (): Pick<MigrationPlan, 'writes' | 'deletes'> => ({
    writes: new Map(),
    deletes: [],
  })

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('多 write/delete：scene 先于 index、其余 localeCompare、delete 排序、源 plan/baseline 不变', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb10-wp-'))
    roots.push(root)
    const plan = {
      ...emptyPlan(),
      writes: new Map<string, MigrationJson>([
        ['content/scenes/index.json', { version: 1, scenes: [] }],
        ['content/scenes/z.json', { kind: 'scene-z' }],
        ['content/scenes/a.json', { kind: 'scene-a' }],
        ['content/items/index.json', { kind: 'items' }],
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
    const changes = plannedChanges({ repo: root, plan, nextBaseline })
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

  test('retirement 按路径排序并携带 expectedPreviousHash', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb10-wp-'))
    roots.push(root)
    const changes = plannedChanges({
      repo: root,
      plan: emptyPlan(),
      nextBaseline: snap([]),
      retiredAssets: [
        { id: 'asset-b', path: 'assets/migrated/b.rle', expectedSha256: 'b'.repeat(64) },
        { id: 'asset-a', path: 'assets/migrated/a.rle', expectedSha256: 'a'.repeat(64) },
      ],
    })
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
  })
})
