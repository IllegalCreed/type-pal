import { isDeepStrictEqual } from 'node:util'
import {
  SCRIPT_V4_V5_SIDECAR_PATH,
  SCRIPT_V4_V5_TRANSITION_ID,
  validateProjectMigrationSidecarV1,
} from '@type-pal/content'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import { createMigrationPlan, type MigrationPlan } from '../../migration-plan.js'
import type { MigrationJson } from '../../pal-migration.js'
import { stableJsonSha256 } from './stable-json.js'

export const P7_FULL_LEDGER_PATH = '_transitions/script-v4-v5.json' as const

export interface P7V5MigrationPlan {
  plan: MigrationPlan
  target: MigrationSnapshot
  nextBaseline: MigrationSnapshot
}

function cloneFiles(source: ReadonlyMap<string, MigrationJson>): Map<string, MigrationJson> {
  return new Map([...source].map(([path, value]) => [path, structuredClone(value)] as const))
}

function verifyDigestRecord(value: MigrationJson | undefined, path: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`P7 v5 MG2: ${path} 无效`)
  const { digest, ...withoutDigest } = value
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
    throw new Error(`P7 v5 MG2: ${path}.digest 无效`)
  if (stableJsonSha256(withoutDigest) !== digest) throw new Error(`P7 v5 MG2: ${path} 自摘要不符`)
  return digest
}

function assertPublishedTransition(base: MigrationSnapshot): {
  ledger: MigrationJson
  sidecar: MigrationJson
} {
  const metadata = base.baselineMetadata
  if (!metadata) throw new Error('P7 v5 MG2: baseline 必须是带 transition metadata 的 v2')
  const ledger = base.files.get(P7_FULL_LEDGER_PATH)
  if (ledger === undefined) throw new Error(`P7 v5 MG2: 缺 ${P7_FULL_LEDGER_PATH}`)
  const ledgerDigest = verifyDigestRecord(ledger, P7_FULL_LEDGER_PATH)
  if (metadata.transitions[SCRIPT_V4_V5_TRANSITION_ID] !== ledgerDigest)
    throw new Error('P7 v5 MG2: baseline transition digest 与 full ledger 不符')
  const sidecarValue = base.files.get(SCRIPT_V4_V5_SIDECAR_PATH)
  const sidecar = validateProjectMigrationSidecarV1(sidecarValue, 'pal')
  const sidecarDigest = verifyDigestRecord(sidecarValue, SCRIPT_V4_V5_SIDECAR_PATH)
  if (sidecar.digest !== sidecarDigest)
    throw new Error('P7 v5 MG2: compatibility sidecar digest 漂移')
  if (
    sidecar.provenance.kind !== 'pal-baseline' ||
    sidecar.provenance.fullLedgerDigest !== ledgerDigest
  )
    throw new Error('P7 v5 MG2: compatibility sidecar 未绑定当前 full ledger')
  const ledgerRecord = ledger as Record<string, MigrationJson>
  const sourceAudit = ledgerRecord.sourceAudit
  if (!sourceAudit || typeof sourceAudit !== 'object' || Array.isArray(sourceAudit))
    throw new Error('P7 v5 MG2: full ledger 缺 sourceAudit')
  if (sidecar.sourceAuditDigest !== sourceAudit.digest)
    throw new Error('P7 v5 MG2: compatibility sidecar 未绑定 source audit')
  const compatibility = ledgerRecord.compatibility
  const compatibilityDigest = verifyDigestRecord(
    compatibility,
    `${P7_FULL_LEDGER_PATH}.compatibility`,
  )
  const compatibilityCore = {
    legacyBindings: structuredClone(sidecar.legacyBindings),
    legacyCursors: structuredClone(sidecar.legacyCursors),
    legacyEntities: structuredClone(sidecar.legacyEntities),
    lineagePlans: structuredClone(sidecar.lineagePlans),
    localAllocations: structuredClone(sidecar.localAllocations),
    targetClosures: structuredClone(sidecar.targetClosures),
  }
  if (stableJsonSha256(compatibilityCore) !== compatibilityDigest)
    throw new Error('P7 v5 MG2: compatibility sidecar 内容未绑定 full ledger')
  return {
    ledger: structuredClone(ledger),
    sidecar: structuredClone(sidecarValue as MigrationJson),
  }
}

/**
 * canonical v5 发布后的普通 PAL MG2。
 * full ledger 与历史 sidecar 是 immutable 控制输入，不参与递归三方合并；作者内容与新提取结果
 * 只在 canonical v5 身份上合并，纯 theirs baseline 继续保留同一 transition metadata。
 */
export function createP7V5MigrationPlan(args: {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  generated: MigrationSnapshot
}): P7V5MigrationPlan {
  const control = assertPublishedTransition(args.base)
  if (
    args.generated.files.has(P7_FULL_LEDGER_PATH) ||
    args.generated.files.has(SCRIPT_V4_V5_SIDECAR_PATH) ||
    [...args.generated.files.keys()].some((path) => path.startsWith('content/scripts/'))
  )
    throw new Error('P7 v5 MG2: generated 必须是无历史控制账、无 legacy scripts 的纯 v5')
  if (args.ours.files.has(P7_FULL_LEDGER_PATH) || args.ours.hashes?.has(P7_FULL_LEDGER_PATH))
    throw new Error('P7 v5 MG2: project 不得携带 baseline-only full ledger')
  const oursSidecar = args.ours.files.get(SCRIPT_V4_V5_SIDECAR_PATH)
  if (!isDeepStrictEqual(oursSidecar, control.sidecar))
    throw new Error('P7 v5 MG2: project compatibility sidecar 被修改或缺失，拒绝普通合并')

  // createMigrationPlan canonicalizes every input into owned JSON before merge,
  // so deep-cloning these temporary maps here would duplicate the full PAL tree
  // without adding an isolation boundary.
  const baseFiles = new Map(args.base.files)
  baseFiles.delete(P7_FULL_LEDGER_PATH)
  const baseManaged = new Set(args.base.managedFiles)
  baseManaged.delete(P7_FULL_LEDGER_PATH)
  const base: MigrationSnapshot = { files: baseFiles, managedFiles: baseManaged }

  const generatedFiles = new Map(args.generated.files)
  generatedFiles.set(SCRIPT_V4_V5_SIDECAR_PATH, structuredClone(control.sidecar))
  const generatedManaged = new Set(args.generated.managedFiles)
  generatedManaged.add(SCRIPT_V4_V5_SIDECAR_PATH)
  const generated: MigrationSnapshot = {
    files: generatedFiles,
    managedFiles: generatedManaged,
  }
  const plan = createMigrationPlan(base, args.ours, generated)
  const target: MigrationSnapshot = {
    files: new Map(plan.target),
    managedFiles: new Set([...baseManaged, ...args.ours.managedFiles, ...generatedManaged]),
  }
  target.files.delete(P7_FULL_LEDGER_PATH)
  target.managedFiles.delete(P7_FULL_LEDGER_PATH)

  const baselineFiles = cloneFiles(args.generated.files)
  baselineFiles.set(SCRIPT_V4_V5_SIDECAR_PATH, structuredClone(control.sidecar))
  baselineFiles.set(P7_FULL_LEDGER_PATH, structuredClone(control.ledger))
  const nextBaseline: MigrationSnapshot = {
    files: baselineFiles,
    managedFiles: new Set([
      ...args.generated.managedFiles,
      SCRIPT_V4_V5_SIDECAR_PATH,
      P7_FULL_LEDGER_PATH,
    ]),
    baselineMetadata: structuredClone(args.base.baselineMetadata),
  }
  return { plan, target, nextBaseline }
}
