import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadPalBaseline } from './migration-baseline.js'
import {
  buildPalCurrentPublication,
  validatePalCurrentPublication,
} from './pal-current-publication.js'
import { buildPalCurrentManifest } from './pal-manifest.js'
import { loadPalMigrationSources } from './pal-migration-io.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('PAL current-only publication', () => {
  it('publishes the current baseline and raw-owned partitions directly as content16/SAVE8', () => {
    const baseline = loadPalBaseline(repo)
    expect(baseline).toBeDefined()
    const sources = loadPalMigrationSources(repo)
    const publication = buildPalCurrentPublication(baseline!, sources)
    const manifest = buildPalCurrentManifest(sources.assetCatalog)
    const report = validatePalCurrentPublication({ publication, manifest, sources })

    expect(report).toMatchObject({ scenes: 294, maps: 223, assets: 1_935 })
    expect(manifest).not.toHaveProperty('migrations')
    expect(manifest.assets).not.toHaveProperty('legacy')
    expect([...publication.managedFiles]).not.toContain(
      'content/migrations/script-v4-v5-save.json',
    )
    expect([...publication.managedFiles].some((path) => path.startsWith('_transitions/'))).toBe(
      false,
    )
  })
})
