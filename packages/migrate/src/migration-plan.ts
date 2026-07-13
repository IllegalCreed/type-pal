import { isDeepStrictEqual } from 'node:util'
import type { MigrationSnapshot } from './migration-baseline.js'
import type { MergeConflict } from './migration-merge.js'
import { jsonAbsent, jsonPresent, mergeManagedFile } from './migration-merge.js'
import type { MigrationFileSet, MigrationJson } from './pal-migration.js'
import {
  canonicalizeMigrationScriptFiles,
  isMigrationScriptChunkFile,
  materializeMigrationScriptFiles,
} from './script-library-normalize.js'

export interface MigrationPlan {
  target: Map<string, MigrationJson>
  writes: Map<string, MigrationJson>
  deletes: string[]
  conflicts: MergeConflict[]
  summary: {
    managed: number
    generated: number
    kept: number
    merged: number
    writes: number
    deletes: number
    conflicts: number
  }
}

export function snapshotOf(
  fileSet: Pick<MigrationFileSet, 'files' | 'managedFiles'>,
): MigrationSnapshot {
  return {
    files: new Map(fileSet.files),
    managedFiles: new Set(fileSet.managedFiles),
  }
}

function canonicalSnapshot(
  snapshot: Pick<MigrationSnapshot, 'files' | 'managedFiles'>,
): MigrationSnapshot {
  const files = canonicalizeMigrationScriptFiles(snapshot.files)
  const managedFiles = new Set(snapshot.managedFiles)
  for (const path of [...managedFiles]) {
    if (isMigrationScriptChunkFile(path) && !files.has(path)) managedFiles.delete(path)
  }
  for (const path of files.keys()) managedFiles.add(path)
  return { files, managedFiles }
}

/** 首次 bootstrap 已有审批 target 后，只计算当前工程到 target 的真实写删。 */
export function createInitialMigrationPlan(
  ours: MigrationSnapshot,
  target: MigrationSnapshot,
): Pick<MigrationPlan, 'writes' | 'deletes'> {
  const writes = new Map<string, MigrationJson>()
  for (const [path, value] of target.files) {
    if (!ours.files.has(path) || !isDeepStrictEqual(ours.files.get(path), value))
      writes.set(path, value)
  }
  const deletes = [...ours.managedFiles]
    .filter((path) => ours.files.has(path) && !target.files.has(path))
    .sort()
  return { writes, deletes }
}

export function createMigrationPlan(
  base: MigrationSnapshot,
  ours: MigrationSnapshot,
  theirs: Pick<MigrationFileSet, 'files' | 'managedFiles'>,
): MigrationPlan {
  const baseView = canonicalSnapshot(base)
  const oursView = canonicalSnapshot(ours)
  const theirsView = canonicalSnapshot(theirs)
  const physicalManaged = new Set([
    ...base.managedFiles,
    ...ours.managedFiles,
    ...theirs.managedFiles,
  ])
  const managed = [
    ...new Set([...baseView.managedFiles, ...oursView.managedFiles, ...theirsView.managedFiles]),
  ].sort()
  const target = new Map<string, MigrationJson>()
  const conflicts: MergeConflict[] = []
  let generated = 0
  let kept = 0
  let mergedCount = 0
  for (const file of managed) {
    const baseHas = baseView.files.has(file)
    const oursHas = oursView.files.has(file)
    const theirsHas = theirsView.files.has(file)
    const result = mergeManagedFile(
      file,
      baseHas ? jsonPresent(baseView.files.get(file)!) : jsonAbsent(),
      oursHas ? jsonPresent(oursView.files.get(file)!) : jsonAbsent(),
      theirsHas ? jsonPresent(theirsView.files.get(file)!) : jsonAbsent(),
    )
    conflicts.push(...result.conflicts)
    if (result.value.present) target.set(file, result.value.value!)
    if (result.conflicts.length) continue
    const oursSameBase =
      oursHas === baseHas &&
      (!oursHas || isDeepStrictEqual(oursView.files.get(file), baseView.files.get(file)))
    const theirsSameBase =
      theirsHas === baseHas &&
      (!theirsHas || isDeepStrictEqual(theirsView.files.get(file), baseView.files.get(file)))
    if (oursSameBase && !theirsSameBase) generated++
    else if (theirsSameBase && !oursSameBase) kept++
    else if (!oursSameBase || !theirsSameBase) mergedCount++
  }
  const normalized = conflicts.length ? target : materializeMigrationScriptFiles(target)
  const writes = new Map<string, MigrationJson>()
  const deletes: string[] = []
  if (!conflicts.length) {
    for (const [file, value] of normalized) {
      if (!ours.files.has(file) || !isDeepStrictEqual(ours.files.get(file), value))
        writes.set(file, value)
    }
    for (const file of physicalManaged)
      if (ours.files.has(file) && !normalized.has(file)) deletes.push(file)
  }
  return {
    target: normalized,
    writes,
    deletes,
    conflicts,
    summary: {
      managed: physicalManaged.size,
      generated,
      kept,
      merged: mergedCount,
      writes: writes.size,
      deletes: deletes.length,
      conflicts: conflicts.length,
    },
  }
}
