import { isDeepStrictEqual } from 'node:util'
import type { MigrationFileSet } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import { buildP4ScriptMigrationIR } from './p4-owner-allocation.js'
import { stableJsonSha256, stableStringCompare } from './stable-json.js'
import type {
  P3LegacyScriptCellIdentity,
  P4AuthorOwnerIdentity,
  P4CommandRewrite,
  P4ValidationReport,
  ScriptMigrationIRP3,
  ScriptMigrationIRP4,
  ScriptTransitionLedgerDraftP3,
  ScriptTransitionLedgerDraftP4,
} from './types.js'

const LEGACY_SELECTION_COMMANDS = new Set([
  'setEntityAuto',
  'setEntityTrigger',
  'setEntityTriggerMode',
  'setSceneOnEnter',
  'setSceneOnTeleport',
  'clearSceneScripts',
])

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`P4 validation: ${message}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function pointerToken(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function ownerKey(identity: P4AuthorOwnerIdentity): string {
  return identity.kind === 'entity-behavior'
    ? `entity:${identity.sceneId}:${identity.entityId}:${identity.channel}:${identity.behaviorId}`
    : `hook:${identity.sceneId}:${identity.slot}:${identity.hookId}`
}

function commandCellKey(identity: P3LegacyScriptCellIdentity): string {
  return `${identity.scriptId}#${identity.pointer}`
}

function reverseBody(
  body: readonly unknown[],
  legacyScriptId: string,
  rewrites: ReadonlyMap<string, P4CommandRewrite>,
): unknown[] {
  const visit = (value: unknown, pointer: string): unknown => {
    const rewrite = rewrites.get(`${legacyScriptId}#${pointer}`)
    if (rewrite) {
      assert(
        isDeepStrictEqual(value, rewrite.after),
        `rewritten command drift ${legacyScriptId}#${pointer}`,
      )
      return clone(rewrite.before)
    }
    if (Array.isArray(value))
      return value.map((child, index) => visit(child, `${pointer}/${index}`))
    if (!isRecord(value)) return value
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        visit(child, `${pointer}/${pointerToken(key)}`),
      ]),
    )
  }
  return visit(body, '') as unknown[]
}

function legacySelectionCount(value: unknown): number {
  if (Array.isArray(value))
    return value.reduce((total, child) => total + legacySelectionCount(child), 0)
  if (!isRecord(value)) return 0
  return (
    (typeof value.kind === 'string' && LEGACY_SELECTION_COMMANDS.has(value.kind) ? 1 : 0) +
    Object.values(value).reduce<number>((total, child) => total + legacySelectionCount(child), 0)
  )
}

function digestWithoutSelf<T extends object>(value: T & { digest: string }): string {
  const { digest: _digest, ...withoutDigest } = value
  return stableJsonSha256(withoutDigest)
}

export function validateP4ScriptMigrationIR(args: {
  migration: MigrationFileSet
  frozenAudit: ScriptControlFlowAuditV1
  p3: ScriptMigrationIRP3
  p3Ledger: ScriptTransitionLedgerDraftP3
  ir: ScriptMigrationIRP4
  ledger: ScriptTransitionLedgerDraftP4
  throughPhase: 'P4'
}): P4ValidationReport {
  assert(args.throughPhase === 'P4', 'phase mismatch')
  assert(args.ir.throughPhase === 'P4', 'IR phase mismatch')
  assert(args.ledger.throughPhase === 'P4', 'ledger phase mismatch')
  assert(args.ir.canonical === false, 'IR must remain non-canonical')
  assert(args.ir.runtimeConsumable === false, 'IR must remain non-runtime-consumable')
  assert(args.ir.digest === digestWithoutSelf(args.ir), 'IR self digest mismatch')
  assert(args.ledger.digest === digestWithoutSelf(args.ledger), 'ledger self digest mismatch')
  assert(
    args.ir.previousPhase.irDigest === args.p3.digest &&
      args.ir.previousPhase.ledgerDigest === args.p3Ledger.digest,
    'IR previous phase mismatch',
  )
  assert(
    args.ledger.previousPhase.irDigest === args.p3.digest &&
      args.ledger.previousPhase.ledgerDigest === args.p3Ledger.digest,
    'ledger previous phase mismatch',
  )
  assert(
    args.ir.sourceAudit.digest === args.frozenAudit.digest &&
      args.ledger.sourceAudit.digest === args.frozenAudit.digest,
    'source audit drift',
  )

  const expected = buildP4ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    p3: args.p3,
    p3Ledger: args.p3Ledger,
  })
  assert(isDeepStrictEqual(args.ir, expected.ir), 'IR differs from corpus recomputation')
  assert(
    isDeepStrictEqual(args.ledger, expected.ledger),
    'ledger differs from corpus recomputation',
  )

  assert(args.ir.pages.length === 3_616, 'page allocation count mismatch')
  assert(args.ir.owners.length === 4_584, 'author owner count mismatch')
  assert(
    args.ir.owners.reduce((total, owner) => total + owner.stages.length, 0) === 6_502,
    'stage allocation count mismatch',
  )
  assert(args.ir.commandRewrites.length === 844, 'command rewrite count mismatch')
  assert(
    args.ir.commandRewrites.filter((rewrite) => rewrite.transitionedIn === 'P2').length === 1 &&
      args.ir.commandRewrites.filter((rewrite) => rewrite.transitionedIn === 'P4').length === 843,
    'command rewrite phase conservation mismatch',
  )
  assert(args.ir.ownerFragments.length === 7_039, 'owner fragment count mismatch')
  assert(args.ir.retainedBodies.length === 464, 'retained body count mismatch')
  assert(args.ledger.entries.length === 16_325, 'ledger entry count mismatch')
  assert(args.ledger.groups.length === 5_220, 'ledger group count mismatch')
  assert(args.ledger.evidence.length === 8_565, 'ledger evidence count mismatch')
  assert(args.ledger.pending.length === 464, 'ledger pending count mismatch')
  assert(
    isDeepStrictEqual(args.ir.pendingByPhase, { P4: 0, P5: 433, P6: 31 }),
    'pending phase conservation mismatch',
  )

  const pageKeys = args.ir.pages.map(
    (page) => `${page.identity.sceneId}:${page.identity.entityId}:${page.identity.pageId}`,
  )
  const ownerKeys = args.ir.owners.map((owner) => ownerKey(owner.identity))
  const duplicateStableIds =
    pageKeys.length -
    new Set(pageKeys).size +
    ownerKeys.length -
    new Set(ownerKeys).size +
    args.ir.owners.reduce((total, owner) => {
      const stageIds = owner.stages.map((stage) => stage.stageId)
      return total + stageIds.length - new Set(stageIds).size
    }, 0)
  assert(duplicateStableIds === 0, 'duplicate stable author id')
  for (const page of args.ir.pages)
    assert(page.identity.pageId === 'default', `non-explicit PAL page id ${page.identity.pageId}`)
  for (const owner of args.ir.owners) {
    const id =
      owner.identity.kind === 'entity-behavior' ? owner.identity.behaviorId : owner.identity.hookId
    assert(/^(?:default|enter-s018|legacy-\d{3})$/.test(id), `unsafe stable owner id ${id}`)
    assert(!/[Ll]-\d|d-[0-9a-f]|scene\//.test(id), `legacy identity leaked ${id}`)
  }

  const availableBodies = new Set([
    ...args.ir.ownerFragments.map((fragment) => fragment.legacyScriptId),
    ...args.ir.retainedBodies.map((body) => body.legacyScriptId),
    ...args.ir.flowStructures.map((structure) => structure.target.legacyScriptId),
  ])
  const danglingOwnerEntries = args.ir.owners.reduce(
    (total, owner) =>
      total +
      owner.stages.filter((stage) => !availableBodies.has(stage.entryLegacyScriptId)).length,
    0,
  )
  assert(danglingOwnerEntries === 0, 'dangling owner entry')

  const rewriteByCell = new Map<string, P4CommandRewrite>()
  for (const rewrite of args.ir.commandRewrites) {
    if (rewrite.source.identity.kind !== 'legacy-script-cell') continue
    const key = commandCellKey(rewrite.source.identity)
    assert(!rewriteByCell.has(key), `duplicate rewrite source ${key}`)
    rewriteByCell.set(key, rewrite)
  }
  assert(rewriteByCell.size === 843, 'P4 body rewrite inventory mismatch')

  const reconstructed = new Map<string, unknown[]>()
  for (const fragment of args.ir.ownerFragments)
    reconstructed.set(
      fragment.legacyScriptId,
      reverseBody(fragment.body, fragment.legacyScriptId, rewriteByCell),
    )
  for (const body of args.ir.retainedBodies)
    reconstructed.set(
      body.legacyScriptId,
      reverseBody(body.body, body.legacyScriptId, rewriteByCell),
    )
  assert(reconstructed.size === args.p3.retainedBodies.length, 'reconstructed body count mismatch')
  for (const body of args.p3.retainedBodies)
    assert(
      isDeepStrictEqual(reconstructed.get(body.legacyScriptId), body.body),
      `retained body is not reversible ${body.legacyScriptId}`,
    )
  const p3Structures = new Map(
    args.p3.flowStructures.map((structure) => [structure.target.legacyScriptId, structure]),
  )
  for (const structure of args.ir.flowStructures) {
    const previous = p3Structures.get(structure.target.legacyScriptId)
    assert(previous, `previous flow structure missing ${structure.target.legacyScriptId}`)
    assert(
      isDeepStrictEqual(
        reverseBody(structure.target.body, structure.target.legacyScriptId, rewriteByCell),
        previous.target.body,
      ),
      `flow structure is not reversible ${structure.target.legacyScriptId}`,
    )
  }
  const reversibleBodies = reconstructed.size + args.ir.flowStructures.length
  assert(reversibleBodies === 8_102, 'reversible body conservation mismatch')

  const legacySelectionCommands =
    args.ir.ownerFragments.reduce(
      (total, fragment) => total + legacySelectionCount(fragment.body),
      0,
    ) +
    args.ir.retainedBodies.reduce((total, body) => total + legacySelectionCount(body.body), 0) +
    args.ir.flowStructures.reduce(
      (total, structure) => total + legacySelectionCount(structure.target.body),
      0,
    )
  assert(legacySelectionCommands === 0, 'legacy selection command survived P4')

  const crossOwnerIds = args.ir.pendingOwnerLinks
    .filter(
      (link) =>
        link.phase === 'P6' &&
        args.ir.retainedBodies.find((body) => body.legacyScriptId === link.legacyScriptId)?.status
          .work.reason === 'p4-cross-owner-reuse',
    )
    .map((link) => link.legacyScriptId)
    .sort(stableStringCompare)
  assert(crossOwnerIds.length === 17, 'cross-owner deferral count mismatch')
  assert(
    crossOwnerIds.every(
      (id) =>
        !args.ir.ownerFragments.some((fragment) => fragment.legacyScriptId === id) &&
        (args.ir.pendingOwnerLinks.find((link) => link.legacyScriptId === id)?.owners.length ?? 0) >
          1,
    ),
    'cross-owner body was copied or lost',
  )
  const pendingUnknown = args.ir.retainedBodies.filter(
    (body) => body.status.work.phase !== 'P5' && body.status.work.phase !== 'P6',
  ).length
  assert(pendingUnknown === 0, 'unknown pending phase')

  return {
    kind: 'script-migration-phase-validation',
    version: 1,
    throughPhase: 'P4',
    sourceAuditDigest: args.frozenAudit.digest,
    checks: {
      sourceAuditFrozen: true,
      previousPhaseFrozen: true,
      pages: args.ir.pages.length,
      owners: args.ir.owners.length,
      stages: args.ir.owners.reduce((total, owner) => total + owner.stages.length, 0),
      commandRewrites: args.ir.commandRewrites.length,
      resolvedFragments: args.ir.ownerFragments.length,
      retainedBodies: args.ir.retainedBodies.length,
      reversibleBodies,
      danglingOwnerEntries,
      duplicateStableIds,
      legacySelectionCommands,
      crossOwnerCopies: 0,
      deferredCrossOwner: crossOwnerIds.length,
      pendingP4: args.ir.pendingByPhase.P4,
      pendingUnknown,
    },
    digest: stableJsonSha256({
      sourceAuditDigest: args.frozenAudit.digest,
      irDigest: args.ir.digest,
      ledgerDigest: args.ledger.digest,
      ownerCensus: args.ir.ownerCensus,
      pendingByPhase: args.ir.pendingByPhase,
    }),
  }
}
