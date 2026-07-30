import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AssetCatalogV1, LoadedManifest } from '@type-pal/content'
import { validateAssetCatalog } from '@type-pal/content'
import { projectMigrationV9ToLegacyV8 } from '../src/experimental/script-v5/equip-battle-sprite-v8-authority.js'
import { buildP7GeneratedCanonical } from '../src/experimental/script-v5/p7-generated.js'
import { buildR13SourceExecutionCensus } from '../src/experimental/script-v5/source-execution-census.js'
import { closePalSoundManifest } from '../src/pal-manifest.js'
import {
  buildPalHistoricalR13_4V9Migration,
  buildPalMigration,
  palSoundAssetForSources,
} from '../src/pal-migration.js'
import { loadPalMigrationSources } from '../src/pal-migration-io.js'
import {
  assertScriptControlFlowAudit,
  auditPalScriptControlFlow,
  type ScriptControlFlowAuditV1,
} from '../src/script-control-flow-audit.js'
import {
  assertPalSoundReferenceBaseline,
  auditPalSoundReferences,
} from '../src/sound-reference-audit.js'

const repo = resolve(import.meta.dirname, '../../..')
const historicalSources = loadPalMigrationSources(repo)
const historicalMigration = buildPalHistoricalR13_4V9Migration(historicalSources)
const authorityMigration = projectMigrationV9ToLegacyV8(historicalMigration)
const historicalAudit = auditPalScriptControlFlow(historicalSources, authorityMigration)
assertScriptControlFlowAudit(historicalAudit)
const frozenAudit = JSON.parse(
  readFileSync(resolve(repo, 'packages/migrate/baselines/script-control-flow/pal-v1.json'), 'utf8'),
) as ScriptControlFlowAuditV1
const generated = buildP7GeneratedCanonical({
  migration: authorityMigration,
  currentAudit: historicalAudit,
  frozenAudit,
  sourceCommands: historicalSources.allJson.segments.flatMap((segment) => segment.commands),
  itemSources: historicalSources.migrate.items,
  magicSources: historicalSources.migrate.magic,
  objectMagicSources: historicalSources.migrate.objectMagics ?? [],
  sourceCensus: buildR13SourceExecutionCensus(historicalSources),
  soundAssetForNum: palSoundAssetForSources(historicalSources),
})
const currentSources = structuredClone(historicalSources)
const currentMigration = buildPalMigration(currentSources)
const manifest = JSON.parse(
  readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8'),
) as LoadedManifest
const catalog = validateAssetCatalog(
  currentMigration.files.get('assets/index.json') as AssetCatalogV1,
  'PAL sound audit assets/index.json',
)
const nextManifest = closePalSoundManifest(manifest, catalog)
const report = auditPalSoundReferences({
  sources: currentSources,
  files: currentMigration.files,
  items: generated.snapshot.files.get('content/items.json'),
  itemContentVersion: 9,
  assets: nextManifest.assets,
  entryPoints: nextManifest.entryPoints,
  translationReport: currentMigration.report.scripts,
})
assertPalSoundReferenceBaseline(report)
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
