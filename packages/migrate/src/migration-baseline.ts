import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  formatProjectMap,
  formatStampTemplates,
  type ProjectMap,
  type StampTemplate,
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

export type BaselineState = BaselineStateV1

export function isAtomicProjectMapPath(path: string): boolean {
  return /^content\/maps\/(?!index\.json$)[^/]+\.json$/.test(path)
}

export function serializeMigrationJson(value: MigrationJson, path?: string): string {
  if (path && isAtomicProjectMapPath(path)) return formatProjectMap(value as unknown as ProjectMap)
  if (path === 'content/stamps.json')
    return formatStampTemplates(value as unknown as StampTemplate[])
  return `${JSON.stringify(value, null, 2)}\n`
}

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

export function snapshotFilePresent(snapshot: MigrationSnapshot, path: string): boolean {
  return snapshot.files.has(path) || snapshot.hashes?.has(path) === true
}

export function snapshotFileHash(snapshot: MigrationSnapshot, path: string): string | undefined {
  const value = snapshot.files.get(path)
  if (value !== undefined) return sha256(serializeMigrationJson(value, path))
  return snapshot.hashes?.get(path)
}

export function baselineState(snapshot: MigrationSnapshot): BaselineState {
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

function loadPalBaselineInternal(repo: string): MigrationSnapshot | undefined {
  const root = resolve(repo, PAL_BASELINE_REL)
  const statePath = resolve(root, '_state.json')
  if (!existsSync(statePath)) return undefined
  const state = JSON.parse(readFileSync(statePath, 'utf8')) as BaselineState
  if (
    state.version !== 1 ||
    !Array.isArray(state.managedFiles) ||
    !state.files
  )
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
  return {
    files,
    managedFiles: new Set(state.managedFiles),
    hashes,
  }
}

export function loadPalBaseline(repo: string): MigrationSnapshot | undefined {
  return loadPalBaselineInternal(repo)
}

function assertPalBaselineSnapshotCurrentInternal(
  repo: string,
  snapshot: MigrationSnapshot,
): void {
  const root = resolve(repo, PAL_BASELINE_REL)
  const expectedState = serializeMigrationJson(baselineState(snapshot) as unknown as MigrationJson)
  const statePath = resolve(root, '_state.json')
  if (!existsSync(statePath) || readFileSync(statePath, 'utf8') !== expectedState)
    throw new Error('迁移计划后 PAL baseline _state.json 已变更')
  for (const path of snapshot.managedFiles) {
    if (isAtomicProjectMapPath(path)) continue
    const full = resolve(root, path)
    const expected = snapshotFileHash(snapshot, path)
    const actual = existsSync(full) ? sha256(readFileSync(full)) : undefined
    if (actual !== expected) throw new Error(`迁移计划后 PAL baseline 已变更: ${path}`)
  }
}

/**
 * 长耗时生成/审计结束后的 TOCTOU 复核。
 *
 * baseline 的非原子文件和 `_state.json` 必须仍与最初加载的 snapshot 完全一致；
 * 原子 map 正文不落 baseline，只由 `_state.json` 中的 hash 代表。
 */
export function assertPalBaselineSnapshotCurrent(repo: string, snapshot: MigrationSnapshot): void {
  assertPalBaselineSnapshotCurrentInternal(repo, snapshot)
}
