import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ActorDef } from '@type-pal/content'
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
  it('publishes the current baseline and raw-owned partitions directly as content17/SAVE8', () => {
    const baseline = loadPalBaseline(repo)
    expect(baseline).toBeDefined()
    const sources = loadPalMigrationSources(repo)
    const publication = buildPalCurrentPublication(baseline!, sources)
    const manifest = buildPalCurrentManifest(sources.assetCatalog)
    const report = validatePalCurrentPublication({ publication, manifest, sources })

    expect(report).toMatchObject({ scenes: 294, maps: 223, assets: 1_934 })
    const actors = publication.files.get('content/actors.json') as unknown as ActorDef[]
    expect(actors.map(({ id }) => id)).toEqual([
      'li-xiaoyao',
      'zhao-linger',
      'lin-yueru',
      'wu-hou',
      'anu',
      'gai-luojiao',
      'jiu-jianxian',
      'li-daniang',
    ])
    const gai = actors.find(({ id }) => id === 'gai-luojiao')!
    expect(gai.portraits).toEqual({ default: 'portrait.pal.044' })
    expect(gai).not.toHaveProperty('face')
    const faceRecords = Object.values(sources.assetCatalog.assets).filter(
      (record) => record.kind === 'face',
    )
    expect(faceRecords).toHaveLength(5)
    expect(faceRecords.reduce((total, record) => total + record.bytes, 0)).toBe(10_324)
    expect(actors.filter(({ face }) => face !== undefined)).toHaveLength(5)
    expect(
      actors.every(({ face }) => face === undefined || sources.assetCatalog.assets[face]?.kind === 'face'),
    ).toBe(true)
    expect(sources.assetCatalog.assets).not.toHaveProperty('face.pal.gai-luojiao')
    expect(sources.binaryAssets.some(({ id }) => id === 'face.pal.gai-luojiao')).toBe(false)
    expect(manifest).not.toHaveProperty('migrations')
    expect(manifest).not.toHaveProperty('entryScene')
    expect(manifest).not.toHaveProperty('startWorld')
    expect(manifest.assets).not.toHaveProperty('legacy')
    expect([...publication.managedFiles]).not.toContain(
      'content/migrations/script-v4-v5-save.json',
    )
    expect([...publication.managedFiles].some((path) => path.startsWith('_transitions/'))).toBe(
      false,
    )
  })
})
