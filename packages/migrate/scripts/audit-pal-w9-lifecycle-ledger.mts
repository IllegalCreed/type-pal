import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import type { ManifestV14 } from '@type-pal/content'
import { prepareR13SourceExecutionCensus } from '../src/experimental/script-v5/source-execution-census.js'
import { loadPalBaseline } from '../src/migration-baseline.js'
import { loadPalMigrationSources } from '../src/pal-migration-io.js'
import { rewindCurrentC1PublicationToW9 } from '../src/pal-current-c1-rewind.js'
import {
  buildPalW9LifecyclePublicationLedger,
  foldedHostileTargetsFromPublishedB10,
  PAL_W9_EXPECTED_PROOF_LEDGER_DIGEST,
} from '../src/pal-w9-lifecycle-source-ledger.js'

const args = process.argv.slice(2)
if (args.length)
  throw new Error(
    `W9 lifecycle ledger audit 不接受参数（收到 ${args.join(' ')}）；本入口只读且不会写工程`,
  )

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const sources = loadPalMigrationSources(repo)
const baseline = loadPalBaseline(repo)
if (!baseline) throw new Error('W9 lifecycle ledger audit 缺 published PAL baseline')
const manifestRawText = readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')
const preparedSourceCensus = prepareR13SourceExecutionCensus(sources)
const ledger = buildPalW9LifecyclePublicationLedger({
  sources,
  preparedSourceCensus,
  // Disposition identity comes from immutable B10/content12, never the W9 translator under test.
  foldedHostileTargets: foldedHostileTargetsFromPublishedB10(
    rewindCurrentC1PublicationToW9({
      source: baseline,
      manifest: JSON.parse(manifestRawText) as ManifestV14,
      manifestRawText,
    }),
  ),
})
if (ledger.digest !== PAL_W9_EXPECTED_PROOF_LEDGER_DIGEST)
  throw new Error(
    `W9 lifecycle ledger proof digest 漂移: ${ledger.digest} != ${PAL_W9_EXPECTED_PROOF_LEDGER_DIGEST}`,
  )

console.log(
  JSON.stringify(
    {
      kind: ledger.kind,
      transitionId: ledger.transitionId,
      generator: ledger.generator,
      summary: ledger.summary,
      digest: ledger.digest,
      writes: 0,
    },
    null,
    2,
  ),
)
