import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { prepareR13SourceExecutionCensus } from './experimental/script-v5/source-execution-census.js'
import { loadPalBaseline } from './migration-baseline.js'
import { buildPalHistoricalR13_4V9Migration } from './pal-migration.js'
import { loadPalMigrationSources } from './pal-migration-io.js'
import {
  buildPalW9LifecyclePublicationLedger,
  foldedHostileTargetsFromPublishedB10,
  PAL_W9_EXPECTED_BATTLE_PRESERVATION_FACTS_DIGEST,
  PAL_W9_EXPECTED_PROOF_LEDGER_DIGEST,
} from './pal-w9-lifecycle-source-ledger.js'
import {
  assertScriptControlFlowAudit,
  auditPalScriptControlFlow,
} from './script-control-flow-audit.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const extracted = resolve(repo, 'data/extracted/events/all.json')
const baseline = resolve(repo, 'packages/migrate/baselines/script-control-flow/pal-v1.json')

describe.skipIf(!existsSync(extracted))('PAL script control flow audit golden', () => {
  test('冻结完整入口、引用、可达性、循环、折叠来源和关键异常', () => {
    const sources = loadPalMigrationSources(repo)
    const migration = buildPalHistoricalR13_4V9Migration(sources)
    const report = auditPalScriptControlFlow(sources, migration)
    assertScriptControlFlowAudit(report)
    const publishedBaseline = loadPalBaseline(repo)
    if (!publishedBaseline) throw new Error('W9 source ledger live test 缺 published PAL baseline')
    const publishedFoldedHostiles = foldedHostileTargetsFromPublishedB10(publishedBaseline)
    expect(
      new Set(migration.report.foldedHostileRoots.map(({ sceneId, entityId }) => `${sceneId}/${entityId}`)),
    ).toEqual(new Set(publishedFoldedHostiles.map(({ sceneId, entityId }) => `${sceneId}/${entityId}`)))
    const w9LifecycleLedger = buildPalW9LifecyclePublicationLedger({
      sources,
      preparedSourceCensus: prepareR13SourceExecutionCensus(sources),
      foldedHostileTargets: publishedFoldedHostiles,
    })

    expect(report.summary).toEqual({
      sourceCommands: 43_503,
      sourceEntrySites: 6_767,
      sourceGraphSeeds: 6_747,
      legacyRawEdges: 42_680,
      legacyRawComponents: 40_205,
      legacyRawCyclicComponents: 326,
      productBodies: 11_447,
      productReferenceSites: 3_857,
      productEntrySites: 5_942,
      runtimeReachableBodies: 8_102,
      unreachableBodies: 3_345,
      productCyclicComponents: 676,
      productCyclicBodies: 778,
      sharedTails: 532,
    })
    expect(report.product.categories).toEqual({
      'scene-internal': 4_975,
      'scene-root': 6_453,
      'shared-author': 6,
      'shared-scc': 13,
    })
    expect(report.source.entries.byKind).toEqual({
      actor: 4,
      enemy: 67,
      'entity-auto': 2_165,
      'entity-trigger': 3_681,
      item: 517,
      'scene-on-enter': 160,
      'scene-on-teleport': 67,
      skill: 106,
    })
    const enemyRootIds = report.source.entries.sites
      .filter((site) => site.kind === 'enemy')
      .map((site) => site.sourceId)
    expect(enemyRootIds).toContain('global/enemies/400/scriptOnBattleEnd')
    expect(enemyRootIds).not.toContain('global/enemies/2/scriptOnBattleEnd')
    expect(
      enemyRootIds.every((sourceId) => {
        const identity = Number(sourceId.split('/')[2])
        return Number.isInteger(identity) && identity >= 398
      }),
    ).toBe(true)
    expect(report.source.entries.duplicateGlobalSites).toBe(20)
    expect(report.source.legacyRawGraph).toMatchObject({
      edges: { execution: 39_669, binding: 763, recovery: 2_248 },
      components: 40_205,
      cyclicComponents: 326,
      cyclicNodes: 3_624,
    })
    expect(report.source.semanticGraph).toMatchObject({
      nodes: 42_028,
      nodesByChannel: { auto: 4_394, trigger: 37_634 },
      edges: { execution: 38_127, binding: 622, recovery: 2_024 },
      components: 38_802,
      cyclicComponents: 302,
      cyclicNodes: 3_528,
    })
    expect(report.source.addressZero.unknown).toBe(0)
    expect(report.product.references.byKind).toEqual({
      callScript: { sites: 675, distinctTargets: 628, distinctCallers: 580 },
      jumpScript: { sites: 2_642, distinctTargets: 1_422, distinctCallers: 1_713 },
      setEntityAuto: { sites: 342, distinctTargets: 307, distinctCallers: 183 },
      setEntityTrigger: { sites: 198, distinctTargets: 171, distinctCallers: 93 },
    })
    expect(report.product.references.byFlow).toMatchObject({
      execution: { sites: 3_222 },
      'deferred-binding': { sites: 635 },
    })
    expect(report.product.entries.byKind).toEqual({
      'scene-stage-root': { sites: 5_935, distinctTargets: 5_935 },
      'scene-direct-binding': { sites: 1, distinctTargets: 1 },
      'item-run-script': { sites: 6, distinctTargets: 6 },
      'content-command': { sites: 0, distinctTargets: 0 },
    })
    expect(report.product.entries.seedCoverage).toEqual({
      finalContent: [
        { domain: 'scenes', sites: 5_936, distinctTargets: 5_936 },
        { domain: 'items', sites: 6, distinctTargets: 6 },
        { domain: 'skills', sites: 0, distinctTargets: 0 },
        { domain: 'enemies', sites: 0, distinctTargets: 0 },
        { domain: 'actors', sites: 0, distinctTargets: 0 },
      ],
      libraryDeclarations: { sites: 6, distinctTargets: 6 },
      allSeedSites: 5_948,
      allDistinctTargets: 5_942,
    })
    expect(report.product.components).toEqual({
      count: 11_345,
      cyclic: 676,
      cyclicBodies: 778,
      size1: 620,
      size2: 10,
      size3Plus: 46,
      reachableCyclic: 331,
      reachableCyclicBodies: 433,
      unreachableCyclic: 345,
      unreachableCyclicBodies: 345,
      mixedCyclic: 0,
    })
    expect({
      spriteEntities: report.product.folded.spriteAction.entities,
      spriteBodies: report.product.folded.spriteAction.bodies.length,
      hostileEntities: report.product.folded.hostileBehavior.entities,
      hostileBodies: report.product.folded.hostileBehavior.bodies.length,
      overlap: report.product.folded.overlap.length,
      unknown: report.product.folded.unclassifiedUnreachable.length,
    }).toEqual({
      spriteEntities: 387,
      spriteBodies: 863,
      hostileEntities: 828,
      hostileBodies: 2_482,
      overlap: 0,
      unknown: 0,
    })
    expect(w9LifecycleLedger.summary).toEqual({
      sourceInstructions: 4,
      sourceSites: 1849,
      executionContexts: 928,
      opcode4bSites: 928,
      opcode52Sites: 921,
      pairedContexts: 921,
      opcode4bOnlyContexts: 7,
      opcode52OnlyContexts: 0,
      foldedHostileContexts: 828,
      residualPairedContexts: 93,
      residualOpcode4bOnlyContexts: 7,
      landings: {
        hostilePolicies: 828,
        suspendCommands: 100,
        hideCommands: 93,
        total: 1021,
      },
    })
    const w9RuntimeProofByContext = new Map(
      w9LifecycleLedger.entries.map((entry) => [entry.contextId, entry.preStateProof]),
    )
    const countProofBy = (field: 'triggerMode' | 'sourceInitialState') =>
      Object.fromEntries(
        [...w9RuntimeProofByContext.values()]
          .reduce((counts, proof) => {
            const value = proof[field]
            const key = String(value)
            counts.set(key, (counts.get(key) ?? 0) + 1)
            return counts
          }, new Map<string, number>())
          .entries(),
      )
    expect(countProofBy('triggerMode')).toEqual({ 2: 7, 5: 882, 6: 39 })
    expect(countProofBy('sourceInitialState')).toEqual({ 0: 4, 1: 253, 2: 671 })
    expect(w9LifecycleLedger.entries.every((entry) => entry.preState.kind === 'positive')).toBe(
      true,
    )
    expect(w9LifecycleLedger.generator.battleStartPreservationProof).toMatchObject({
      targetEntityCount: 928,
      targetEntityIdsSha256: '336a3977135f8de9cc552842219604ec2ece43877e939aa8673912dc71ce3e27',
      battleContextCount: 743,
      writerSiteCount: 86,
      writerHitSiteCount: 0,
      factsSha256: PAL_W9_EXPECTED_BATTLE_PRESERVATION_FACTS_DIGEST,
    })
    expect(w9LifecycleLedger.digest).toBe(PAL_W9_EXPECTED_PROOF_LEDGER_DIGEST)
    expect(report.product.dialogueStates).toMatchObject({
      bodies: 4_901,
      distinctHashes: 59,
      baseIdentities: 4_889,
      defaultHashBodies: 4_827,
    })
    expect(report.product.dialogueStates.multiEntryStateIdentities).toHaveLength(11)
    expect(report.product.sceneHookBindings).toMatchObject({
      onEnter: 60,
      onTeleport: 1,
      clearCommands: 1,
      stageTargets: 96,
    })
    expect(
      report.product.sceneHookBindings.sites.every(
        (binding) => binding.sourceAddress !== undefined,
      ),
    ).toBe(true)
    expect(report.canaries.s018).toEqual([
      {
        kind: 'scene-direct-binding',
        source: 'content/scenes/s018.json',
        path: 'content/scenes/s018.json/onEnter/0/entry/prepare/0',
        commandKind: 'setEntityTrigger',
        targetId: 'scene/s015/L-4211/e204/d-0a386828',
        targetChunk: 'scene/s015',
      },
    ])
    expect(report.canaries.e2493).toEqual({
      triggerRootTargets: [
        'scene/s154/root/entity-e2493/page-0/trigger/stage-0',
        'scene/s154/root/entity-e2493/page-0/trigger/stage-1',
        'scene/s154/root/entity-e2493/page-0/trigger/stage-2',
      ],
      autoRootTargets: [],
      dynamicTriggerTargets: ['scene/s154/L-23827/e2493/d-0a386828'],
    })
    expect(report.canaries.e2495).toEqual({
      triggerRootTargets: [
        'scene/s154/root/entity-e2495/page-0/trigger/stage-0',
        'scene/s154/root/entity-e2495/page-0/trigger/stage-1',
      ],
      autoRootTargets: ['scene/s154/root/entity-e2495/page-0/auto/stage-0'],
      dynamicTriggerTargets: ['scene/s154/L-23786/e2495/d-0a386828'],
    })
    expect(report.canaries.authorRoots).toHaveLength(6)
    expect(report.canaries.authorRoots.every((root) => root.bridgeOnly)).toBe(true)
    const authorAliasBodies = report.product.bodies.filter(
      (body) => body.derivation?.kind === 'legacy-alias',
    )
    expect(
      authorAliasBodies.map((body) => [body.id, body.source.entryAddress, body.source.addresses]),
    ).toEqual([
      ['shared/user/pal-item-use/265', 39_793, []],
      ['shared/user/pal-item-use/266', 39_799, []],
      ['shared/user/pal-item-use/267', 39_805, []],
      ['shared/user/pal-item-use/280', 39_613, []],
      ['shared/user/pal-item-use/290', 39_753, []],
      ['shared/user/pal-item-use/293', 39_835, []],
    ])
    const translatedTargetBodies = report.product.bodies.filter(
      (body) => body.derivation?.kind === 'translated-target',
    )
    expect(translatedTargetBodies).toHaveLength(4_901)
    expect(
      translatedTargetBodies.every(
        (body) =>
          body.source.entryAddress !== undefined &&
          body.source.addresses.includes(body.source.entryAddress),
      ),
    ).toBe(true)
    expect(report.canaries.misleadingSccBodies).toHaveLength(13)
    expect(
      report.canaries.misleadingSccBodies.every(
        (body) => !body.productCyclic && body.sourceCyclic === false,
      ),
    ).toBe(true)
    expect(report.canaries.sharedSccTails).toEqual([
      'shared/scc-L-38780/L-38780/global/items/d-0a386828',
      'shared/scc-L-39811/L-39811/global/items/d-0a386828',
    ])
    expect(report.product.bodies).toHaveLength(11_447)
    expect(report.product.bodies.every((body) => body.category)).toBe(true)
    expect(report.product.bodies.every((body) => body.derivation)).toBe(true)
    expect(report.product.bodies.every((body) => Array.isArray(body.source.addresses))).toBe(true)
    expect(
      report.product.bodies
        .filter((body) => body.derivation?.kind === 'content-entry')
        .every((body) => body.source.addresses.length > 0),
    ).toBe(true)
    expect(
      report.product.bodies
        .flatMap((body) => body.source.addressZeroSites)
        .every((site) => site.address !== undefined),
    ).toBe(true)
    const overrideBodies = report.product.bodies.filter((body) => body.id.includes('/override/'))
    expect(overrideBodies).toHaveLength(87)
    expect(
      overrideBodies.every(
        (body) =>
          body.derivation?.kind === 'scene-hook-override' &&
          body.source.addresses.length > 0 &&
          body.sceneHookContexts.length > 0 &&
          body.sceneHookContexts.every(
            (context) =>
              context.installerPath.length > 0 && context.installerSourceAddress !== undefined,
          ),
      ),
    ).toBe(true)
    expect(report.issues).toEqual([])

    const expected = readFileSync(baseline, 'utf8')
    const serialized = `${JSON.stringify(report)}\n`
    expect(serialized === expected, `基线字节不一致；当前 digest=${report.digest}`).toBe(true)
  }, 60_000)

  test('迁移文件 Map 逆序后仍得到字节一致审计', () => {
    const sources = loadPalMigrationSources(repo)
    const migration = buildPalHistoricalR13_4V9Migration(sources)
    const first = auditPalScriptControlFlow(sources, migration)
    const second = auditPalScriptControlFlow(sources, {
      ...migration,
      files: new Map([...migration.files].reverse()),
    })
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  }, 60_000)
})
