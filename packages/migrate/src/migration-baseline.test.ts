import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  assertPalBaselineRepairCandidateCurrent,
  assertPalBaselineSnapshotCurrent,
  baselineState,
  baselineWrites,
  loadPalBaseline,
  loadPalBaselineRepairCandidate,
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

const v2 = (): MigrationJson => ({
  version: 2,
  width: 1,
  height: 1,
  tilesetId: 'tileset-001',
  layers: [{ id: 'floor', name: '地板', depthMode: 'flat', tiles: [[1], [null]] }],
  collision: [[0], [0]],
})

describe('serializeMigrationJson W7G', () => {
  test('v2 继续使用原有逐行矩阵字节格式', () => {
    expect(serializeMigrationJson(v2(), 'content/maps/map-001.json')).toBe(`{
  "version": 2,
  "width": 1,
  "height": 1,
  "tilesetId": "tileset-001",
  "layers": [
    {
      "id": "floor",
      "name": "地板",
      "depthMode": "flat",
      "tiles": [
        [1],
        [null]
      ]
    }
  ],
  "collision": [
    [0],
    [0]
  ]
}
`)
  })

  test('G1：v3 authoring 不丢失且与二次 formatter 字节幂等', () => {
    const map = {
      ...(v2() as Record<string, MigrationJson>),
      version: 3,
      authoring: {
        version: 1,
        stampPlacements: [
          {
            id: 'placement-1',
            anchor: { row: 0, col: 0 },
            visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
            gridPoints: [{ row: 0, col: 0 }],
          },
        ],
      },
    } as MigrationJson
    const first = serializeMigrationJson(map, 'content/maps/map-001.json')
    expect(first).toContain('"authoring"')
    expect(
      serializeMigrationJson(JSON.parse(first) as MigrationJson, 'content/maps/map-001.json'),
    ).toBe(first)
  })

  test('stamps 表使用共享确定性 formatter', () => {
    const stamps: MigrationJson = [
      {
        id: 'tree',
        name: '树',
        tilesetId: 'tileset-001',
        origin: 'migrated',
        layerSlots: [{ id: 'ground', name: '地面', depthMode: 'flat' }],
        visual: [{ layerSlotId: 'ground', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 }],
        collision: [{ offset: { dRow: 0, du: 0 }, value: 0 }],
      },
    ]
    const first = serializeMigrationJson(stamps, 'content/stamps.json')
    expect(serializeMigrationJson(JSON.parse(first) as MigrationJson, 'content/stamps.json')).toBe(
      first,
    )
  })
})

describe('PAL baseline transition metadata', () => {
  test('v2 metadata survives load and the next ordinary baseline write', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-baseline-v2-'))
    roots.push(root)
    const baselineRoot = resolve(root, PAL_BASELINE_REL)
    mkdirSync(resolve(baselineRoot, 'content'), { recursive: true })
    const body = '{"value":1}\n'
    writeFileSync(resolve(baselineRoot, 'content/value.json'), body)
    const transitionDigest = 'a'.repeat(64)
    writeFileSync(
      resolve(baselineRoot, '_state.json'),
      `${JSON.stringify(
        {
          version: 2,
          generatorEpoch: 'n3-script-v5-p7-v1',
          transitions: { 'script-v4-v5': transitionDigest },
          managedFiles: ['content/value.json'],
          files: { 'content/value.json': sha256(body) },
        },
        null,
        2,
      )}\n`,
    )

    const loaded = loadPalBaseline(root)
    expect(loaded?.baselineMetadata).toEqual({
      generatorEpoch: 'n3-script-v5-p7-v1',
      transitions: { 'script-v4-v5': transitionDigest },
    })
    loaded!.files.set('content/value.json', { value: 2 })
    loaded!.hashes?.delete('content/value.json')
    const nextState = baselineState(loaded!)
    expect(nextState).toMatchObject({
      version: 2,
      generatorEpoch: 'n3-script-v5-p7-v1',
      transitions: { 'script-v4-v5': transitionDigest },
    })
    const writes = baselineWrites(loaded!)
    const stateBody = writes.get(`${PAL_BASELINE_REL}/_state.json`)
    expect(JSON.parse(stateBody!)).toMatchObject({
      version: 2,
      transitions: { 'script-v4-v5': transitionDigest },
    })
  })

  test('rejects malformed v2 transition digests before reading managed bodies', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-baseline-v2-invalid-'))
    roots.push(root)
    const baselineRoot = resolve(root, PAL_BASELINE_REL)
    mkdirSync(baselineRoot, { recursive: true })
    writeFileSync(
      resolve(baselineRoot, '_state.json'),
      `${JSON.stringify({
        version: 2,
        generatorEpoch: 'n3-script-v5-p7-v1',
        transitions: { 'script-v4-v5': 'bad' },
        managedFiles: [],
        files: {},
      })}\n`,
    )
    expect(() => loadPalBaseline(root)).toThrow(/transition metadata/)
  })

  test('new snapshots remain v1 until a release explicitly attaches transition metadata', () => {
    const snapshot: MigrationSnapshot = {
      files: new Map([['content/value.json', { value: 1 }]]),
      managedFiles: new Set(['content/value.json']),
    }
    expect(baselineState(snapshot).version).toBe(1)
  })

  test('long-running plans fail when a loaded baseline body or state changes', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-baseline-current-'))
    roots.push(root)
    const baselineRoot = resolve(root, PAL_BASELINE_REL)
    mkdirSync(resolve(baselineRoot, 'content'), { recursive: true })
    const body = '{"value":1}\n'
    writeFileSync(resolve(baselineRoot, 'content/value.json'), body)
    const state = {
      version: 2,
      generatorEpoch: 'n3-script-v5-p7-v1',
      transitions: { 'script-v4-v5': 'a'.repeat(64) },
      managedFiles: ['content/value.json'],
      files: { 'content/value.json': sha256(body) },
    }
    writeFileSync(resolve(baselineRoot, '_state.json'), `${JSON.stringify(state, null, 2)}\n`)

    const loaded = loadPalBaseline(root)!
    expect(() => assertPalBaselineSnapshotCurrent(root, loaded)).not.toThrow()

    writeFileSync(resolve(baselineRoot, 'content/value.json'), '{"value":2}\n')
    expect(() => assertPalBaselineSnapshotCurrent(root, loaded)).toThrow(
      /baseline 已变更: content\/value\.json/,
    )

    writeFileSync(resolve(baselineRoot, 'content/value.json'), body)
    writeFileSync(
      resolve(baselineRoot, '_state.json'),
      `${JSON.stringify({ ...state, transitions: {} }, null, 2)}\n`,
    )
    expect(() => assertPalBaselineSnapshotCurrent(root, loaded)).toThrow(
      /baseline _state\.json 已变更/,
    )
  })

  test('single-file repair loader accepts only the declared missing managed body', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-baseline-repair-'))
    roots.push(root)
    const baselineRoot = resolve(root, PAL_BASELINE_REL)
    const sealPath = '_transitions/r13-confirm-v1.json'
    mkdirSync(resolve(baselineRoot, '_transitions'), { recursive: true })
    const body = '{"digest":"placeholder"}\n'
    const state = {
      version: 2,
      generatorEpoch: 'n3-script-v5-p7-v1',
      transitions: { 'r13-confirm-v1': 'a'.repeat(64) },
      managedFiles: [sealPath],
      files: { [sealPath]: sha256(body) },
    }
    writeFileSync(resolve(baselineRoot, '_state.json'), `${JSON.stringify(state, null, 2)}\n`)

    expect(() => loadPalBaseline(root)).toThrow(/baseline 缺文件/)
    const candidate = loadPalBaselineRepairCandidate(root, sealPath)!
    expect(candidate.files.has(sealPath)).toBe(false)
    expect(() => assertPalBaselineRepairCandidateCurrent(root, candidate, sealPath)).not.toThrow()

    writeFileSync(resolve(baselineRoot, sealPath), body)
    expect(() => assertPalBaselineRepairCandidateCurrent(root, candidate, sealPath)).toThrow(
      /修复目标已被并发写入/,
    )
    expect(() => loadPalBaselineRepairCandidate(root, sealPath)).toThrow(/当前并未缺失/)
    expect(loadPalBaseline(root)?.files.get(sealPath)).toEqual({ digest: 'placeholder' })
  })
})
