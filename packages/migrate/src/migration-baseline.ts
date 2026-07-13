import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { MigrationJson } from './pal-migration.js'

export const PAL_BASELINE_REL = 'packages/migrate/baselines/pal'

export interface MigrationSnapshot {
  files: Map<string, MigrationJson>
  managedFiles: Set<string>
}

export interface BaselineStateV1 {
  version: 1
  managedFiles: string[]
  files: Record<string, string>
}

export function serializeMigrationJson(value: MigrationJson): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

export function baselineState(snapshot: MigrationSnapshot): BaselineStateV1 {
  const managedFiles = [...snapshot.managedFiles].sort()
  const files: Record<string, string> = {}
  for (const path of managedFiles) {
    const value = snapshot.files.get(path)
    if (value === undefined) throw new Error(`baseline 托管清单缺文件 ${path}`)
    files[path] = sha256(serializeMigrationJson(value))
  }
  return { version: 1, managedFiles, files }
}

export function baselineWrites(snapshot: MigrationSnapshot): Map<string, string> {
  const writes = new Map<string, string>()
  const state = baselineState(snapshot)
  for (const path of state.managedFiles) {
    writes.set(`${PAL_BASELINE_REL}/${path}`, serializeMigrationJson(snapshot.files.get(path)!))
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
  for (const path of state.managedFiles) {
    const full = resolve(root, path)
    if (!existsSync(full)) throw new Error(`PAL baseline 缺文件 ${path}`)
    const text = readFileSync(full, 'utf8')
    if (sha256(text) !== state.files[path]) throw new Error(`PAL baseline 哈希不符 ${path}`)
    files.set(path, JSON.parse(text) as MigrationJson)
  }
  return { files, managedFiles: new Set(state.managedFiles) }
}
