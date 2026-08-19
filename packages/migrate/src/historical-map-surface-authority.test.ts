import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  PUBLISHED_PRE_V4_MAP_HASH_COUNT,
  projectCurrentMapHashesToPublishedPreV4Surface,
} from './historical-map-surface-authority.js'
import {
  isAtomicProjectMapPath,
  loadPalBaseline,
  type MigrationSnapshot,
} from './migration-baseline.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function currentBaseline(): MigrationSnapshot {
  const baseline = loadPalBaseline(repoRoot)
  if (!baseline) throw new Error('historical map surface test: PAL baseline 缺失')
  return baseline
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    ...source,
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

describe('historical project-map publication surface authority', () => {
  test('projects every current atomic-map hash to the exact pre-v4 published surface', () => {
    const baseline = currentBaseline()
    const before = new Map(baseline.hashes)
    const projected = projectCurrentMapHashesToPublishedPreV4Surface(baseline)
    const paths = [...baseline.managedFiles].filter(isAtomicProjectMapPath)

    expect(paths).toHaveLength(PUBLISHED_PRE_V4_MAP_HASH_COUNT)
    expect(PUBLISHED_PRE_V4_MAP_HASH_COUNT).toBe(223)
    expect(projected).not.toBe(baseline)
    expect(projected.hashes).not.toBe(baseline.hashes)
    expect(paths.every((path) => projected.hashes?.get(path) !== before.get(path))).toBe(true)
    expect(baseline.hashes).toEqual(before)
  })

  test('fails closed on a current hash or atomic-map list drift', () => {
    const hashDrift = cloneSnapshot(currentBaseline())
    hashDrift.hashes?.set('content/maps/map-001.json', '0'.repeat(64))
    expect(() => projectCurrentMapHashesToPublishedPreV4Surface(hashDrift)).toThrow(
      'current canonical hash 漂移 content/maps/map-001.json',
    )

    const listDrift = cloneSnapshot(currentBaseline())
    listDrift.managedFiles.delete('content/maps/map-225.json')
    listDrift.hashes?.delete('content/maps/map-225.json')
    expect(() => projectCurrentMapHashesToPublishedPreV4Surface(listDrift)).toThrow(
      'atomic map 清单漂移',
    )
  })

  test('does not rewrite authored project snapshots without baseline transition authority', () => {
    const project = cloneSnapshot(currentBaseline())
    delete project.baselineMetadata
    expect(projectCurrentMapHashesToPublishedPreV4Surface(project)).toBe(project)
  })
})
