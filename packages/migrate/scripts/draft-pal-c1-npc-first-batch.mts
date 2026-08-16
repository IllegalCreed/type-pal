import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ManifestV14 } from '@type-pal/content'
import { loadPalBaseline, sha256 } from '../src/migration-baseline.js'
import { buildPalC1NpcFirstBatchAuthority } from '../src/pal-c1-npc-first-batch.js'
import { rewindCurrentC1PublicationToDialogueParent } from '../src/pal-current-c1-rewind.js'
import type { SourceCmd } from '../src/source-facts.js'

const repo = resolve(import.meta.dirname, '../../..')
const current = loadPalBaseline(repo)
if (!current) throw new Error('C1-3 first batch: 缺 PAL published baseline')
const manifestRawText = readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')
const parentC1 = rewindCurrentC1PublicationToDialogueParent({
  source: current,
  manifest: JSON.parse(manifestRawText) as ManifestV14,
  manifestRawText,
})
const sourceText = readFileSync(resolve(repo, 'data/extracted/events/all.json'), 'utf8')
const sourceJson = JSON.parse(sourceText) as { segments: { commands: SourceCmd[] }[] }
const result = buildPalC1NpcFirstBatchAuthority({
  parentC1,
  sourceCommands: sourceJson.segments.flatMap((segment) => segment.commands),
  sourceFileSha256: sha256(sourceText),
})

if (process.argv.includes('--json')) console.log(JSON.stringify(result.ledger, null, 2))
else {
  console.log('# C1-3 first batch approved decision authority')
  console.log('')
  console.log(`- candidate report: \`${result.report.digest}\``)
  console.log(`- source evidence: \`${result.evidence.digest}\``)
  console.log(`- decision content digest: \`${result.draft.contentDigest}\``)
  console.log(`- decision ledger digest: \`${result.ledger.digest}\``)
  console.log(
    `- approval: ${result.ledger.approval.approver} @ ${result.ledger.approval.approvedAt}`,
  )
  console.log(
    `- closure: accepted ${result.draft.candidateClosure.accepted.count} / ` +
      `deferred ${result.draft.candidateClosure.deferred.count} / ` +
      `rejected ${result.draft.candidateClosure.rejected.count}`,
  )
  console.log('')
  console.log('| Actor | name | default sprite | default portrait | entity sites | dialogue sites |')
  console.log('|---|---|---|---|---:|---:|')
  for (const actor of result.actors)
    console.log(
      `| ${actor.actor.id} | ${actor.locale[0]?.successor ?? '—'} | ` +
        `${actor.actor.spriteId} | ${actor.actor.portraits.default} | ` +
        `${actor.entitySites.length} | ${actor.dialogueSites.length} |`,
    )
  console.log('')
  console.log('The projector may consume only this revalidated, module-private prepared authority.')
}
