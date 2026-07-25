import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ItemData, SceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildP7ProjectCompatibility } from './p7-compatibility.js'
import { projectP7CanonicalProject } from './p7-project.js'
import { buildP7TransitionLedger } from './p7-transition-ledger.js'
import { stableJsonSha256 } from './stable-json.js'
import type { ScriptMigrationIRP6, ScriptTransitionLedgerDraftP6 } from './types.js'

const shadowRoot = resolve(process.cwd(), '.shadow/N3-1/v5/p6')

describe.skipIf(!existsSync(resolve(shadowRoot, 'ir/script-migration-ir.json')))(
  'P7 PAL final transition ledger',
  () => {
    test('seals P6 evidence, canonical identities and save compatibility without a digest cycle', () => {
      const ir = JSON.parse(
        readFileSync(resolve(shadowRoot, 'ir/script-migration-ir.json'), 'utf8'),
      ) as ScriptMigrationIRP6
      const p6Ledger = JSON.parse(
        readFileSync(resolve(shadowRoot, 'transitions/script-v4-v5.draft.json'), 'utf8'),
      ) as ScriptTransitionLedgerDraftP6
      const target = resolve(shadowRoot, 'target/project/content')
      const sceneIds = JSON.parse(
        readFileSync(resolve(target, 'scenes/index.json'), 'utf8'),
      ) as string[]
      const sourceScenes = sceneIds.map(
        (sceneId) =>
          JSON.parse(readFileSync(resolve(target, `scenes/${sceneId}.json`), 'utf8')) as SceneDef,
      )
      const items = JSON.parse(readFileSync(resolve(target, 'items.json'), 'utf8')) as ItemData[]
      const project = projectP7CanonicalProject({ ir, scenes: sourceScenes, items })
      const preliminary = buildP7ProjectCompatibility({
        projectId: 'pal',
        ir,
        sourceScenes,
        targetScenes: project.scenes,
        sourceAuditDigest: ir.sourceAudit.digest,
        fullLedgerDigest: p6Ledger.digest,
      }).sidecar

      const { ledger, report } = buildP7TransitionLedger({
        projectId: 'pal',
        baselineSha256: stableJsonSha256({ project: 'pal', contentVersion: 4 }),
        ir,
        p6Ledger,
        project,
        compatibility: preliminary,
      })

      expect(report).toEqual({
        entries: 18_383,
        groups: 5_630,
        evidence: 8_975,
        pages: 3_616,
        owners: 4_584,
        machines: 65,
        simpleStages: 6_396,
        machineStates: 771,
        itemPrivateScripts: 6,
        canonicalTargets: 8_271,
        compatibilityDigest: ledger.compatibility.digest,
      })
      expect(ledger.previousPhase).toEqual({
        throughPhase: 'P6',
        irDigest: ir.digest,
        ledgerDigest: p6Ledger.digest,
      })
      const finalSidecar = buildP7ProjectCompatibility({
        projectId: 'pal',
        ir,
        sourceScenes,
        targetScenes: project.scenes,
        sourceAuditDigest: ir.sourceAudit.digest,
        fullLedgerDigest: ledger.digest,
      }).sidecar
      expect(finalSidecar.provenance).toEqual({
        kind: 'pal-baseline',
        fullLedgerDigest: ledger.digest,
      })
      expect(
        stableJsonSha256({
          legacyBindings: finalSidecar.legacyBindings,
          legacyCursors: finalSidecar.legacyCursors,
          legacyEntities: finalSidecar.legacyEntities,
          lineagePlans: finalSidecar.lineagePlans,
          localAllocations: finalSidecar.localAllocations,
          targetClosures: finalSidecar.targetClosures,
        }),
      ).toBe(ledger.compatibility.digest)
    }, 120_000)
  },
)
