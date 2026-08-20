import { isDeepStrictEqual } from 'node:util'
import {
  isAtomicProjectMapPath,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
  snapshotFileHash,
  snapshotFilePresent,
} from './migration-baseline.js'
import type { MergeConflict } from './migration-merge.js'
import { jsonAbsent, jsonPresent, mergeManagedFile } from './migration-merge.js'
import type { MigrationFileSet, MigrationJson } from './pal-migration.js'

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
    hashes: new Map(
      [...fileSet.files].map(([path, value]) => [
        path,
        sha256(serializeMigrationJson(value, path)),
      ]),
    ),
  }
}

function canonicalSnapshot(
  snapshot: Pick<MigrationSnapshot, 'files' | 'managedFiles' | 'hashes'>,
): MigrationSnapshot {
  return {
    files: new Map(snapshot.files),
    managedFiles: new Set(snapshot.managedFiles),
    ...(snapshot.hashes ? { hashes: new Map(snapshot.hashes) } : {}),
  }
}

interface AtomicFileState {
  present: boolean
  hash?: string
  value?: MigrationJson
}

function atomicFileState(snapshot: MigrationSnapshot, file: string): AtomicFileState {
  return {
    present: snapshotFilePresent(snapshot, file),
    hash: snapshotFileHash(snapshot, file),
    value: snapshot.files.get(file),
  }
}

function sameAtomic(left: AtomicFileState, right: AtomicFileState): boolean {
  return left.present === right.present && (!left.present || left.hash === right.hash)
}

function hashVersion(state: AtomicFileState) {
  return state.present
    ? ({ present: true, value: { sha256: state.hash ?? 'missing' } } as const)
    : ({ present: false } as const)
}

function mergeAtomicMapFile(
  file: string,
  base: MigrationSnapshot,
  ours: MigrationSnapshot,
  theirs: MigrationSnapshot,
): {
  value?: MigrationJson
  conflict?: MergeConflict
  oursSameBase: boolean
  theirsSameBase: boolean
} {
  const b = atomicFileState(base, file)
  const o = atomicFileState(ours, file)
  const t = atomicFileState(theirs, file)
  const oursSameBase = sameAtomic(o, b)
  const theirsSameBase = sameAtomic(t, b)
  let selected: AtomicFileState | undefined
  if (oursSameBase) selected = t
  else if (theirsSameBase || sameAtomic(o, t)) selected = o
  if (!selected) {
    const type =
      !o.present || !t.present
        ? b.present
          ? 'delete-modify'
          : 'add-add'
        : b.present
          ? 'value'
          : 'add-add'
    return {
      conflict: {
        file,
        path: '/',
        type,
        base: hashVersion(b),
        ours: hashVersion(o),
        theirs: hashVersion(t),
      },
      oursSameBase,
      theirsSameBase,
    }
  }
  if (selected.present && selected.value === undefined) {
    // 原子地图可能以 hash-only 存于基线(如 R13-Z 发布场景):选中版本缺正文时,
    // 从同 hash 的带正文版本取 body —— hash 相同 ⟹ 字节相同,不改变合并结果。
    const bodySource = [b, o, t].find(
      (candidate) =>
        candidate.present && candidate.value !== undefined && candidate.hash === selected!.hash,
    )
    if (bodySource) selected = bodySource
  }
  if (selected.present && selected.value === undefined)
    throw new Error(`原子地图 ${file} 选中版本只有 hash、缺正文`)
  return { value: selected.value, oursSameBase, theirsSameBase }
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
    if (isAtomicProjectMapPath(file)) {
      const result = mergeAtomicMapFile(file, baseView, oursView, theirsView)
      if (result.conflict) conflicts.push(result.conflict)
      else if (result.value !== undefined) target.set(file, result.value)
      if (result.oursSameBase && !result.theirsSameBase) generated++
      else if (result.theirsSameBase && !result.oursSameBase) kept++
      else if (!result.oursSameBase || !result.theirsSameBase) mergedCount++
      continue
    }
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
  const normalized = target
  const writes = new Map<string, MigrationJson>()
  const deletes: string[] = []
  if (!conflicts.length) {
    for (const [file, value] of normalized) {
      if (
        isAtomicProjectMapPath(file)
          ? snapshotFileHash(oursView, file) !== sha256(serializeMigrationJson(value, file))
          : !ours.files.has(file) || !isDeepStrictEqual(ours.files.get(file), value)
      )
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
