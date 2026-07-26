import type { MigrationSnapshot } from '../../migration-baseline.js'
import { snapshotOf } from '../../migration-plan.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../../migration-project-io.js'
import type { MigrationFileSet } from '../../pal-migration.js'

const C8_ITEM_USE_SEAL_PATH = '_transitions/c8-item-use-v5-v1.json'

function v4CompatibleAuthorPath(path: string): boolean {
  return (
    !path.startsWith('content/scripts/') &&
    !path.startsWith('content/scenes/') &&
    path !== 'content/items.json' &&
    path !== 'content/migration-diagnostics.json'
  )
}

function stripC8GeneratedAdditions(
  migration: MigrationFileSet,
  publishedBaseline: MigrationSnapshot,
  project: MigrationSnapshot,
): void {
  const seal = publishedBaseline.files.get(C8_ITEM_USE_SEAL_PATH)
  if (seal === undefined) return
  if (
    !seal ||
    typeof seal !== 'object' ||
    Array.isArray(seal) ||
    seal.kind !== 'c8-item-use-transition' ||
    !Array.isArray(seal.ownedTargets)
  )
    throw new Error('published v4 reconstruction: C8 seal 无效')

  const localeKeys = new Set<string>()
  const spriteIds = new Set<string>()
  for (const entry of seal.ownedTargets) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const identity = entry.identity
    if (!identity || typeof identity !== 'object' || Array.isArray(identity)) continue
    if (identity.kind === 'locale' && typeof identity.key === 'string') localeKeys.add(identity.key)
    if (identity.kind === 'sprite' && typeof identity.spriteId === 'string')
      spriteIds.add(identity.spriteId)
  }

  const locale = project.files.get('content/locale.json')
  if (locale && typeof locale === 'object' && !Array.isArray(locale)) {
    const stripped = structuredClone(locale)
    for (const key of localeKeys) delete stripped[key]
    project.files.set('content/locale.json', stripped)
  }

  const generatedSprites = migration.files.get('content/sprites.json')
  const projectSprites = project.files.get('content/sprites.json')
  if (Array.isArray(generatedSprites) && Array.isArray(projectSprites)) {
    const generatedIds = new Set(
      generatedSprites.flatMap((entry) =>
        entry && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.id === 'string'
          ? [entry.id]
          : [],
      ),
    )
    project.files.set(
      'content/sprites.json',
      projectSprites.filter(
        (entry) =>
          !(
            entry &&
            typeof entry === 'object' &&
            !Array.isArray(entry) &&
            typeof entry.id === 'string' &&
            spriteIds.has(entry.id) &&
            !generatedIds.has(entry.id)
          ),
      ),
    )
  }
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
  stripC8GeneratedAdditions(migration, publishedBaseline, project)
  for (const [path, value] of project.files)
    if (ours.files.has(path) && v4CompatibleAuthorPath(path))
      ours.files.set(path, structuredClone(value))
  return { base, ours }
}
