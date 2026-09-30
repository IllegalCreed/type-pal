/** TEST-GLM-NEW-J-1 J03：migration-baseline 磁盘入口与原子图 hash-only 表示。
 * 旧证：migration-baseline.test.ts 盖 state v1 正反读写/正文漂移；
 * boundaries 盖纯函数（isAtomicProjectMapPath/serialize/sha256/D5 null/缺席）。
 * 本文件钉剩余臂：loadPalBaseline 原子地图 hash-only 加载与三类 fail-loud、
 * _state.json 漂移复核臂、baselineWrites 不落原子图正文。全部 IO 限自有 mkdtemp。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  assertPalBaselineSnapshotCurrent,
  baselineState,
  baselineWrites,
  loadPalBaseline,
  type MigrationSnapshot,
  PAL_BASELINE_REL,
  serializeMigrationJson,
  sha256,
  snapshotFilePresent,
} from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const ITEMS_VALUE = { value: 1 }
const ITEMS_BODY = serializeMigrationJson(ITEMS_VALUE, 'content/items.json')
const ATOMIC_MAP = 'content/maps/map-001.json'
const ATOMIC_MAP_SHA = 'b'.repeat(64)

/** baseline 根含 items 正文（可写/可缺），原子地图只登记 hash、从不落盘。 */
function baselineRoot(itemsBody: string | undefined, stateFiles?: Record<string, string>): string {
  const root = mkdtempSync(resolve(tmpdir(), 'type-pal-glm-j-baseline-'))
  roots.push(root)
  const baselineRootDir = resolve(root, PAL_BASELINE_REL)
  mkdirSync(resolve(baselineRootDir, 'content'), { recursive: true })
  if (itemsBody !== undefined)
    writeFileSync(resolve(baselineRootDir, 'content/items.json'), itemsBody)
  const files =
    stateFiles ??
    ({
      'content/items.json': sha256(ITEMS_BODY),
      [ATOMIC_MAP]: ATOMIC_MAP_SHA,
    } as Record<string, string>)
  writeFileSync(
    resolve(baselineRootDir, '_state.json'),
    `${JSON.stringify({ version: 1, managedFiles: Object.keys(files), files }, null, 2)}\n`,
  )
  return root
}

const expectedSnapshot = (): MigrationSnapshot => ({
  files: new Map<string, MigrationJson>([
    ['content/items.json', JSON.parse(ITEMS_BODY) as MigrationJson],
  ]),
  managedFiles: new Set(['content/items.json', ATOMIC_MAP]),
  hashes: new Map([
    ['content/items.json', sha256(ITEMS_BODY)],
    [ATOMIC_MAP, ATOMIC_MAP_SHA],
  ]),
})

describe('loadPalBaseline：原子地图 hash-only 与三类 fail-loud', () => {
  test('原子地图正文缺席仍可加载：files 只含非原子项，hashes 双全，present 走 hashes', () => {
    const root = baselineRoot(ITEMS_BODY)
    const loaded = loadPalBaseline(root)!
    expect([...loaded.files.keys()]).toEqual(['content/items.json'])
    expect(loaded.hashes).toBeDefined()
    expect(loaded.hashes?.get(ATOMIC_MAP)).toBe(ATOMIC_MAP_SHA)
    expect(snapshotFilePresent(loaded, ATOMIC_MAP)).toBe(true)
    expect(loaded.managedFiles).toEqual(expectedSnapshot().managedFiles)
  })

  test('非原子托管正文与 state hash 不符 → 哈希不符 fail-loud', () => {
    const root = baselineRoot('{"value":2}\n')
    expect(() => loadPalBaseline(root)).toThrow('PAL baseline 哈希不符 content/items.json')
  })

  test('非原子托管文件磁盘缺失 → 缺文件 fail-loud', () => {
    const root = baselineRoot(undefined)
    expect(() => loadPalBaseline(root)).toThrow('PAL baseline 缺文件 content/items.json')
  })

  test('state 缺某托管项 hash → 缺 hash fail-loud；无 _state.json → undefined', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-glm-j-baseline-missing-hash-'))
    roots.push(root)
    const baselineRootDir = resolve(root, PAL_BASELINE_REL)
    mkdirSync(resolve(baselineRootDir, 'content'), { recursive: true })
    writeFileSync(resolve(baselineRootDir, 'content/items.json'), ITEMS_BODY)
    writeFileSync(
      resolve(baselineRootDir, '_state.json'),
      `${JSON.stringify(
        {
          version: 1,
          managedFiles: ['content/items.json', ATOMIC_MAP],
          files: { 'content/items.json': sha256(ITEMS_BODY) },
        },
        null,
        2,
      )}\n`,
    )
    expect(() => loadPalBaseline(root)).toThrow(`PAL baseline 缺 hash ${ATOMIC_MAP}`)
    const empty = mkdtempSync(resolve(tmpdir(), 'type-pal-glm-j-baseline-empty-'))
    roots.push(empty)
    expect(loadPalBaseline(empty)).toBeUndefined()
  })
})

describe('TOCTOU 复核与写入投影', () => {
  test('_state.json 漂移单独命中复核臂', () => {
    const root = baselineRoot(ITEMS_BODY)
    const snapshot = loadPalBaseline(root)!
    assertPalBaselineSnapshotCurrent(root, snapshot)
    writeFileSync(
      resolve(root, PAL_BASELINE_REL, '_state.json'),
      `${JSON.stringify({ version: 1, managedFiles: [], files: {} }, null, 2)}\n`,
    )
    expect(() => assertPalBaselineSnapshotCurrent(root, snapshot)).toThrow(
      '迁移计划后 PAL baseline _state.json 已变更',
    )
  })

  test('baselineWrites 只落非原子正文与 _state.json；原子图只进 state hash', () => {
    const snapshot = loadPalBaseline(baselineRoot(ITEMS_BODY))!
    const writes = baselineWrites(snapshot)
    expect([...writes.keys()].sort()).toEqual([
      `${PAL_BASELINE_REL}/_state.json`,
      `${PAL_BASELINE_REL}/content/items.json`,
    ])
    const state = JSON.parse(writes.get(`${PAL_BASELINE_REL}/_state.json`)!) as {
      files: Record<string, string>
    }
    expect(state.files[ATOMIC_MAP]).toBe(ATOMIC_MAP_SHA)
    expect(state.files['content/items.json']).toBe(
      sha256(serializeMigrationJson(JSON.parse(ITEMS_BODY) as MigrationJson, 'content/items.json')),
    )
    expect(baselineState(snapshot).managedFiles).toEqual(['content/items.json', ATOMIC_MAP])
  })
})
