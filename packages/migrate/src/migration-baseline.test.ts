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
} from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const currentMap = (): Record<string, MigrationJson> => ({
  version: 4,
  width: 1,
  height: 1,
  tilesetRefs: ['tileset-001'],
  layers: [{ id: 'floor', name: '地板', tiles: [[1], [null]], sources: [[0], [null]] }],
  collision: [[0], [0]],
})

describe('current PAL baseline', () => {
  test('地图与 stamps 使用共享确定性 formatter', () => {
    const map = serializeMigrationJson(currentMap(), 'content/maps/map-001.json')
    expect(serializeMigrationJson(JSON.parse(map), 'content/maps/map-001.json')).toBe(map)
    const stamps: MigrationJson = [
      {
        id: 'tree',
        name: '树',
        origin: 'migrated',
        anchor: { row: 0, col: 0 },
        width: 1,
        height: 1,
        tilesetRefs: ['tileset-001'],
        layers: [{ id: 'ground', name: '地面', tiles: [[1], [null]], sources: [[0], [null]] }],
        collision: [[0], [null]],
      },
    ]
    const first = serializeMigrationJson(stamps, 'content/stamps.json')
    expect(serializeMigrationJson(JSON.parse(first), 'content/stamps.json')).toBe(first)
  })

  test('唯一 state v1 可加载、可重写且不含发布历史', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-baseline-current-'))
    roots.push(root)
    const baselineRoot = resolve(root, PAL_BASELINE_REL)
    mkdirSync(resolve(baselineRoot, 'content'), { recursive: true })
    const body = serializeMigrationJson({ value: 1 }, 'content/value.json')
    writeFileSync(resolve(baselineRoot, 'content/value.json'), body)
    writeFileSync(
      resolve(baselineRoot, '_state.json'),
      `${JSON.stringify({ version: 1, managedFiles: ['content/value.json'], files: { 'content/value.json': sha256(body) } }, null, 2)}\n`,
    )

    const loaded = loadPalBaseline(root)!
    expect(baselineState(loaded)).toEqual({
      version: 1,
      managedFiles: ['content/value.json'],
      files: { 'content/value.json': sha256(body) },
    })
    expect(baselineWrites(loaded).has(`${PAL_BASELINE_REL}/_state.json`)).toBe(true)
    expect(() => assertPalBaselineSnapshotCurrent(root, loaded)).not.toThrow()

    writeFileSync(resolve(baselineRoot, 'content/value.json'), '{"value":2}\n')
    expect(() => assertPalBaselineSnapshotCurrent(root, loaded)).toThrow(/baseline 已变更/)
  })

  test('拒绝历史 state 版本', () => {
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

  test('新 snapshot 只产生 v1', () => {
    const snapshot: MigrationSnapshot = {
      files: new Map([['content/value.json', { value: 1 }]]),
      managedFiles: new Set(['content/value.json']),
    }
    expect(baselineState(snapshot).version).toBe(1)
  })
})
