/** Disk baseline loading, persisted hashes, drift rejection and write projection. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  assertPalBaselineSnapshotCurrent,
  baselineState,
  baselineWrites,
  loadPalBaseline,
  PAL_BASELINE_REL,
  sha256,
  snapshotFilePresent,
} from './migration-baseline.js'

describe('baseline disk snapshot', () => {
  const roots: string[] = []

  const ITEMS_VALUE = { value: 1 }

  const ITEMS_BODY = '{\n  "value": 1\n}\n'

  const ATOMIC_MAP = 'content/maps/map-001.json'

  const ATOMIC_MAP_SHA = 'b'.repeat(64)

  /** baseline 根含 items 正文（可写/可缺），原子地图只登记 hash、从不落盘。 */
  function baselineRoot(itemsBody: string | undefined): string {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-baseline-load-'))
    roots.push(root)
    const baselineRootDir = resolve(root, PAL_BASELINE_REL)
    mkdirSync(resolve(baselineRootDir, 'content'), { recursive: true })
    if (itemsBody !== undefined)
      writeFileSync(resolve(baselineRootDir, 'content/items.json'), itemsBody)
    const files = {
      'content/items.json': sha256(ITEMS_BODY),
      [ATOMIC_MAP]: ATOMIC_MAP_SHA,
    }
    writeFileSync(
      resolve(baselineRootDir, '_state.json'),
      `${JSON.stringify({ version: 1, managedFiles: Object.keys(files), files }, null, 2)}\n`,
    )
    return root
  }

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('原子地图正文缺席仍可加载：普通正文读回，原子图由 hash 表示', () => {
    const root = baselineRoot(ITEMS_BODY)
    const loaded = loadPalBaseline(root)!
    expect(loaded.files).toEqual(new Map([['content/items.json', ITEMS_VALUE]]))
    expect(loaded.managedFiles).toEqual(new Set(['content/items.json', ATOMIC_MAP]))
    expect(loaded.hashes?.get(ATOMIC_MAP)).toBe(ATOMIC_MAP_SHA)
    expect(snapshotFilePresent(loaded, ATOMIC_MAP)).toBe(true)
  })

  test('非原子托管正文与 state hash 不符 → 哈希不符 fail-loud', () => {
    const root = baselineRoot('{"value":2}\n')
    expect(() => loadPalBaseline(root)).toThrow('PAL baseline 哈希不符 content/items.json')
  })

  test('非原子托管文件磁盘缺失 → 缺文件 fail-loud', () => {
    const root = baselineRoot(undefined)
    expect(() => loadPalBaseline(root)).toThrow('PAL baseline 缺文件 content/items.json')
  })

  test('state 缺某托管项 hash → 缺 hash fail-loud', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-baseline-missing-hash-'))
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
  })

  test('无 _state.json → undefined', () => {
    const empty = mkdtempSync(resolve(tmpdir(), 'type-pal-baseline-empty-'))
    roots.push(empty)
    expect(loadPalBaseline(empty)).toBeUndefined()
  })

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
    const state: unknown = JSON.parse(writes.get(`${PAL_BASELINE_REL}/_state.json`)!)
    expect(state).toEqual({
      version: 1,
      managedFiles: ['content/items.json', ATOMIC_MAP],
      files: { 'content/items.json': sha256(ITEMS_BODY), [ATOMIC_MAP]: ATOMIC_MAP_SHA },
    })
  })

  test('唯一 state v1 可加载、可重写且不含发布历史', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-baseline-current-'))
    roots.push(root)
    const baselineRoot = resolve(root, PAL_BASELINE_REL)
    mkdirSync(resolve(baselineRoot, 'content'), { recursive: true })
    const body = '{\n  "value": 1\n}\n'
    writeFileSync(resolve(baselineRoot, 'content/value.json'), body)
    writeFileSync(
      resolve(baselineRoot, '_state.json'),
      `${JSON.stringify({ version: 1, managedFiles: ['content/value.json'], files: { 'content/value.json': sha256(body) } }, null, 2)}\n`,
    )

    const loaded = loadPalBaseline(root)!
    const expectedState = {
      version: 1,
      managedFiles: ['content/value.json'],
      files: { 'content/value.json': sha256(body) },
    }
    expect(baselineState(loaded)).toEqual(expectedState)
    expect(baselineWrites(loaded)).toEqual(
      new Map([
        [`${PAL_BASELINE_REL}/content/value.json`, body],
        [`${PAL_BASELINE_REL}/_state.json`, `${JSON.stringify(expectedState, null, 2)}\n`],
      ]),
    )
    expect(() => assertPalBaselineSnapshotCurrent(root, loaded)).not.toThrow()

    writeFileSync(resolve(baselineRoot, 'content/value.json'), '{"value":2}\n')
    expect(() => assertPalBaselineSnapshotCurrent(root, loaded)).toThrow(/baseline 已变更/)
  })

  test('拒绝非当前 state 版本', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-baseline-old-'))
    roots.push(root)
    const baselineRoot = resolve(root, PAL_BASELINE_REL)
    mkdirSync(baselineRoot, { recursive: true })
    writeFileSync(
      resolve(baselineRoot, '_state.json'),
      `${JSON.stringify({ version: 2, managedFiles: [], files: {}, transitions: {} }, null, 2)}\n`,
    )
    expect(() => loadPalBaseline(root)).toThrow(/格式无效/)
  })
})
