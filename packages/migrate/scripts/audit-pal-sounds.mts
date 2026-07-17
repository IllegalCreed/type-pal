import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AssetCatalogV1, LoadedManifest } from '@type-pal/content'
import { validateAssetCatalog } from '@type-pal/content'
import { closePalSoundManifest } from '../src/pal-manifest.js'
import { buildPalMigration } from '../src/pal-migration.js'
import { loadPalMigrationSources } from '../src/pal-migration-io.js'
import {
  assertPalSoundReferenceBaseline,
  auditPalSoundReferences,
} from '../src/sound-reference-audit.js'

const repo = resolve(import.meta.dirname, '../../..')
const sources = loadPalMigrationSources(repo)
const generated = buildPalMigration(sources)
const manifest = JSON.parse(
  readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8'),
) as LoadedManifest
const catalog = validateAssetCatalog(
  generated.files.get('assets/index.json') as AssetCatalogV1,
  'PAL sound audit assets/index.json',
)
const nextManifest = closePalSoundManifest(manifest, catalog)
const report = auditPalSoundReferences({
  sources,
  files: generated.files,
  assets: nextManifest.assets,
  entryPoints: nextManifest.entryPoints,
  translationReport: generated.report.scripts,
})
assertPalSoundReferenceBaseline(report)
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
