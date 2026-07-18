import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  formatProjectMap,
  formatStampTemplates,
  type ProjectMap,
  type StampTemplateV1,
} from '@type-pal/content'
import type { MigrationJson } from './pal-migration.js'

export const PAL_BASELINE_REL = 'packages/migrate/baselines/pal'

export interface MigrationSnapshot {
  files: Map<string, MigrationJson>
  managedFiles: Set<string>
  /** 可在不保留正文时代表原子大文件；PAL 地图 baseline 只存此 hash。 */
  hashes?: Map<string, string>
}

export interface BaselineStateV1 {
  version: 1
  managedFiles: string[]
  files: Record<string, string>
}

export function isAtomicProjectMapPath(path: string): boolean {
  return /^content\/maps\/(?!index\.json$)[^/]+\.json$/.test(path)
}

export function serializeMigrationJson(value: MigrationJson, path?: string): string {
  if (path && isAtomicProjectMapPath(path)) return formatProjectMap(value as unknown as ProjectMap)
  if (path === 'content/stamps.json')
    return formatStampTemplates(value as unknown as StampTemplateV1[])
  return `${JSON.stringify(value, null, 2)}\n`
}

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

export function snapshotFilePresent(snapshot: MigrationSnapshot, path: string): boolean {
  return snapshot.files.has(path) || snapshot.hashes?.has(path) === true
}

export function snapshotFileHash(snapshot: MigrationSnapshot, path: string): string | undefined {
  const recorded = snapshot.hashes?.get(path)
  if (recorded) return recorded
  const value = snapshot.files.get(path)
  return value === undefined ? undefined : sha256(serializeMigrationJson(value, path))
}

export function baselineState(snapshot: MigrationSnapshot): BaselineStateV1 {
  const managedFiles = [...snapshot.managedFiles].sort()
  const files: Record<string, string> = {}
  for (const path of managedFiles) {
    const hash = snapshotFileHash(snapshot, path)
    if (!hash) throw new Error(`baseline 托管清单缺文件或 hash ${path}`)
    files[path] = hash
  }
  return { version: 1, managedFiles, files }
}

export function baselineWrites(snapshot: MigrationSnapshot): Map<string, string> {
  const writes = new Map<string, string>()
  const state = baselineState(snapshot)
  for (const path of state.managedFiles) {
    if (isAtomicProjectMapPath(path)) continue
    writes.set(
      `${PAL_BASELINE_REL}/${path}`,
      serializeMigrationJson(snapshot.files.get(path)!, path),
    )
  }
  writes.set(
    `${PAL_BASELINE_REL}/_state.json`,
    serializeMigrationJson(state as unknown as MigrationJson),
  )
  return writes
}

export function loadPalBaseline(repo: string): MigrationSnapshot | undefined {
  const root = resolve(repo, PAL_BASELINE_REL)
  const statePath = resolve(root, '_state.json')
  if (!existsSync(statePath)) return undefined
  const state = JSON.parse(readFileSync(statePath, 'utf8')) as BaselineStateV1
  if (state.version !== 1 || !Array.isArray(state.managedFiles) || !state.files)
    throw new Error('PAL baseline _state.json 格式无效')
  const files = new Map<string, MigrationJson>()
  const hashes = new Map<string, string>()
  for (const path of state.managedFiles) {
    const expectedHash = state.files[path]
    if (typeof expectedHash !== 'string') throw new Error(`PAL baseline 缺 hash ${path}`)
    hashes.set(path, expectedHash)
    if (isAtomicProjectMapPath(path)) continue
    const full = resolve(root, path)
    if (!existsSync(full)) throw new Error(`PAL baseline 缺文件 ${path}`)
    const text = readFileSync(full, 'utf8')
    if (sha256(text) !== expectedHash) throw new Error(`PAL baseline 哈希不符 ${path}`)
    files.set(path, JSON.parse(text) as MigrationJson)
  }
  return { files, managedFiles: new Set(state.managedFiles), hashes }
}
