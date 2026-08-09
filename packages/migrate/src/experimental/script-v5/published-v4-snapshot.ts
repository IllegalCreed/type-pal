import { isDeepStrictEqual } from 'node:util'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import { snapshotOf } from '../../migration-plan.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../../migration-project-io.js'
import {
  rewindB10ProjectAgainstPublishedBaseline,
  rewindB10PublicationIfPresent,
} from '../../pal-b10-enemy-team-slots.js'
import type { MigrationFileSet } from '../../pal-migration.js'
import { rewindPalR13SixBPublicationIfPresent } from '../../pal-r13-six-b-rewind.js'
import { rewindPublishedR13SourceSemanticsTransition } from './published-r13-source-semantics-test-fixture.js'
import { R13_SOURCE_SEMANTICS_SEAL_PATH } from './r13-source-semantics-mg2.js'
import { stableJsonSha256 } from './stable-json.js'

const C8_ITEM_USE_SEAL_PATH = '_transitions/c8-item-use-v5-v1.json'
const R13_CONFIRM_SEAL_PATH = '_transitions/r13-confirm-v1.json'
const R13_ENEMY_SCRIPT_SEAL_PATH = '_transitions/r13-enemy-script-v1.json'

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

function stripR13ConfirmGeneratedAdditions(
  publishedBaseline: MigrationSnapshot,
  project: MigrationSnapshot,
): void {
  const seal = publishedBaseline.files.get(R13_CONFIRM_SEAL_PATH)
  if (seal === undefined) return
  if (
    !seal ||
    typeof seal !== 'object' ||
    Array.isArray(seal) ||
    seal.kind !== 'r13-confirm-transition' ||
    !seal.evidence ||
    typeof seal.evidence !== 'object' ||
    Array.isArray(seal.evidence) ||
    !Array.isArray(seal.evidence.materializedLocaleIds) ||
    !Array.isArray(seal.evidence.materializedSpriteIds)
  )
    throw new Error('published v4 reconstruction: R13 confirm seal 无效')

  const localeIds = new Set(
    seal.evidence.materializedLocaleIds.filter(
      (value): value is string => typeof value === 'string',
    ),
  )
  if (localeIds.size !== seal.evidence.materializedLocaleIds.length)
    throw new Error('published v4 reconstruction: R13 confirm locale ids 无效')
  const locale = project.files.get('content/locale.json')
  if (locale && typeof locale === 'object' && !Array.isArray(locale)) {
    const stripped = structuredClone(locale)
    for (const id of localeIds) delete stripped[id]
    project.files.set('content/locale.json', stripped)
  }

  const spriteIds = new Set(
    seal.evidence.materializedSpriteIds.filter(
      (value): value is string => typeof value === 'string',
    ),
  )
  if (spriteIds.size !== seal.evidence.materializedSpriteIds.length)
    throw new Error('published v4 reconstruction: R13 confirm sprite ids 无效')
  const sprites = project.files.get('content/sprites.json')
  if (Array.isArray(sprites) && spriteIds.size)
    project.files.set(
      'content/sprites.json',
      sprites.filter(
        (entry) =>
          !(
            entry &&
            typeof entry === 'object' &&
            !Array.isArray(entry) &&
            typeof entry.id === 'string' &&
            spriteIds.has(entry.id)
          ),
      ),
    )
}

function stripR13EnemyGeneratedAdditions(
  migration: MigrationFileSet,
  publishedBaseline: MigrationSnapshot,
  project: MigrationSnapshot,
): void {
  const seal = publishedBaseline.files.get(R13_ENEMY_SCRIPT_SEAL_PATH)
  if (seal === undefined) return
  if (
    !seal ||
    typeof seal !== 'object' ||
    Array.isArray(seal) ||
    seal.kind !== 'r13-enemy-script-transition' ||
    !seal.augmentation ||
    typeof seal.augmentation !== 'object' ||
    Array.isArray(seal.augmentation) ||
    !seal.augmentation.files ||
    typeof seal.augmentation.files !== 'object' ||
    Array.isArray(seal.augmentation.files) ||
    typeof seal.augmentation.files.parentEnemiesDigest !== 'string' ||
    typeof seal.augmentation.files.successorEnemiesDigest !== 'string' ||
    !seal.augmentation.localeDelta ||
    typeof seal.augmentation.localeDelta !== 'object' ||
    Array.isArray(seal.augmentation.localeDelta)
  )
    throw new Error('published v4 reconstruction: R13 enemy seal 无效')

  const parentEnemies = migration.files.get('content/enemies.json')
  const publishedEnemies = publishedBaseline.files.get('content/enemies.json')
  const projectEnemies = project.files.get('content/enemies.json')
  if (
    parentEnemies === undefined ||
    publishedEnemies === undefined ||
    projectEnemies === undefined ||
    stableJsonSha256(parentEnemies) !== seal.augmentation.files.parentEnemiesDigest ||
    stableJsonSha256(publishedEnemies) !== seal.augmentation.files.successorEnemiesDigest ||
    !isDeepStrictEqual(projectEnemies, publishedEnemies)
  )
    throw new Error('published v4 reconstruction: R13 enemy parent/author 边界漂移')
  project.files.set('content/enemies.json', structuredClone(parentEnemies))

  const baselineLocale = publishedBaseline.files.get('content/locale.json')
  const projectLocale = project.files.get('content/locale.json')
  if (
    !baselineLocale ||
    typeof baselineLocale !== 'object' ||
    Array.isArray(baselineLocale) ||
    !projectLocale ||
    typeof projectLocale !== 'object' ||
    Array.isArray(projectLocale)
  )
    throw new Error('published v4 reconstruction: R13 enemy locale 无效')
  const stripped = structuredClone(projectLocale)
  for (const [id, value] of Object.entries(seal.augmentation.localeDelta)) {
    if (baselineLocale[id] !== value || stripped[id] !== value)
      throw new Error(`published v4 reconstruction: R13 enemy locale 漂移 ${id}`)
    delete stripped[id]
  }
  project.files.set('content/locale.json', stripped)
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
  // P2-P4 author merge is defined against the historical v4 content surface. Strip the exact
  // append-only R13-6B leaves first so its skill/schema additions cannot masquerade as author
  // edits and perturb frozen shadow bundle digests.
  const loadedProject = loadProjectMigrationSnapshot(repo, managed)
  const sourceSemantics = publishedBaseline.files.has(R13_SOURCE_SEMANTICS_SEAL_PATH)
    ? rewindPublishedR13SourceSemanticsTransition({
        publishedBaseline,
        publishedProject: loadedProject,
      })
    : {
        baseline: rewindPalR13SixBPublicationIfPresent(
          rewindB10PublicationIfPresent(publishedBaseline),
        ),
        project: rewindPalR13SixBPublicationIfPresent(
          rewindB10ProjectAgainstPublishedBaseline(loadedProject, publishedBaseline),
        ),
      }
  const project = sourceSemantics.project
  stripC8GeneratedAdditions(migration, sourceSemantics.baseline, project)
  stripR13ConfirmGeneratedAdditions(sourceSemantics.baseline, project)
  stripR13EnemyGeneratedAdditions(migration, sourceSemantics.baseline, project)
  for (const [path, value] of project.files)
    if (ours.files.has(path) && v4CompatibleAuthorPath(path))
      ours.files.set(path, structuredClone(value))
  return { base, ours }
}
