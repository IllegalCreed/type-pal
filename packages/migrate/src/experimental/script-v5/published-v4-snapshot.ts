import type { MigrationSnapshot } from '../../migration-baseline.js'
import { snapshotOf } from '../../migration-plan.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../../migration-project-io.js'
import type { MigrationFileSet } from '../../pal-migration.js'

function v4CompatibleAuthorPath(path: string): boolean {
  return (
    !path.startsWith('content/scripts/') &&
    !path.startsWith('content/scenes/') &&
    path !== 'content/items.json'
  )
}

/**
 * P7 发布前，历史 shadow 测试以 v4 baseline + 当前 v4 工程验证作者三方合并。
 * 发布后 baseline/工程都已是 v5；此时从权威纯生成恢复同一 v4 base，并只叠加两版 schema
 * 兼容的作者文件。不得把 canonical scene/item 倒灌给 v4 transition planner。
 */
export function reconstructPublishedV4TransitionSnapshots(
  repo: string,
  migration: MigrationFileSet,
  publishedBaseline: MigrationSnapshot,
): { base: MigrationSnapshot; ours: MigrationSnapshot } {
  if (!publishedBaseline.baselineMetadata) {
    const managed = discoverProjectManagedFiles(
      repo,
      new Set([...publishedBaseline.managedFiles, ...migration.managedFiles]),
    )
    return {
      base: publishedBaseline,
      ours: loadProjectMigrationSnapshot(repo, managed),
    }
  }

  const base = snapshotOf(migration)
  const ours = snapshotOf(migration)
  const managed = discoverProjectManagedFiles(
    repo,
    new Set([...publishedBaseline.managedFiles, ...migration.managedFiles]),
  )
  const project = loadProjectMigrationSnapshot(repo, managed)
  for (const [path, value] of project.files)
    if (ours.files.has(path) && v4CompatibleAuthorPath(path))
      ours.files.set(path, structuredClone(value))
  return { base, ours }
}
