import { isDeepStrictEqual } from 'node:util'
import {
  type AppendOnlyTransitionState,
  appendOnlyTransitionState,
} from './experimental/script-v5/append-only-transition-state.js'
import type {
  R13DispositionEvidence,
  R13SourceInstructionDispositionV3,
} from './experimental/script-v5/source-instruction-disposition.js'
import { stableJsonSha256 } from './experimental/script-v5/stable-json.js'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'

/**
 * R13-6C:352/372/373 敌方 0x68 分支 lossy 观察的 successor authority seal。
 *
 * 6C 是 append-only successor:只记录证据层账务(三条 lossy → r13-6c-lossy-closure
 * 证据),**零内容叶**(execution.enemy 已在 R13-6B 发布内容内)。6A/6B surface 保持
 * 冻结;canary/6A 回放前必须 fail-closed rewind 6C→6B(逐字节还原)。
 * 见 N3-1 卡 R13-Z 节「R13-6C 设计草案」与 Kimi C1-C4 / GLM S2 验收钉。
 */

export const R13_SIX_C_TRANSITION_ID = 'r13-6c-lossy-closure-v1' as const
export const R13_SIX_C_SEAL_PATH = '_transitions/r13-6c-lossy-closure-v1.json' as const

export interface R13SixCClosureControlV1 {
  version: 1
  methodVersion: 'n3-p7-r13-6c-lossy-closure-v1'
  /** 技能 id → r13-6c-lossy-closure 证据 digest + sourceClosureDigest + final 整技能 target digest。 */
  closures: {
    skillId: '352' | '372' | '373'
    evidenceDigest: string
    sourceClosureDigest: string
    finalTargetDigest: string
  }[]
  /** 发布时 final content 全快照 digest(零内容叶断言:与 6B 内容一致)。 */
  finalContentDigest: string
  summary: { lossyClosed: 3; openObservations: number }
}

export interface R13SixCTransitionSealV1 {
  kind: 'r13-6c-lossy-closure-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof R13_SIX_C_TRANSITION_ID
  parent: {
    transitionId: 'r13-source-semantics-v1'
    digest: string
  }
  closure: R13SixCClosureControlV1
  digest: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asJson(value: R13SixCTransitionSealV1): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function sealBodyDigest(value: R13SixCTransitionSealV1): string {
  const { digest: _digest, ...body } = value
  return stableJsonSha256(body)
}

function assertSealSelfConsistent(value: R13SixCTransitionSealV1, label: string): void {
  const recomputed = sealBodyDigest(value)
  if (value.digest !== recomputed) throw new Error(`${label}: seal body 重算 digest 与自摘要不符`)
}

/**
 * 从 R13-6C authority 报告中提取三条 lossy closure 证据并构建 6C seal。
 * 发布时报告必须已关闭 352/372/373 三条 lossy(否则证据缺失 fail-loud),
 * 零内容叶由 finalContentDigest 与 R13-6B 已发布内容一致性在复审时核对。
 */
export function buildR13SixCSeal(
  parentDigest: string,
  report: R13SourceInstructionDispositionV3,
): R13SixCTransitionSealV1 {
  const closures: R13SixCClosureControlV1['closures'] = []
  for (const skillId of ['352', '372', '373'] as const) {
    const matches = report.evidence.filter(
      (entry): entry is Extract<R13DispositionEvidence, { kind: 'r13-6c-lossy-closure' }> =>
        entry.kind === 'r13-6c-lossy-closure' && entry.skillId === skillId,
    )
    if (matches.length !== 1)
      throw new Error(`R13-6C seal: skill ${skillId} r13-6c-lossy-closure 证据数=${matches.length}`)
    const proof = matches[0]!
    closures.push({
      skillId,
      evidenceDigest: stableJsonSha256(proof),
      sourceClosureDigest: proof.sourceClosureDigest,
      finalTargetDigest: proof.layerTargets.final.digests[0] ?? '',
    })
  }
  if (report.summary.openDebtSites !== 0)
    throw new Error(`R13-6C seal: open sites=${report.summary.openDebtSites} 非零`)
  const body: Omit<R13SixCTransitionSealV1, 'digest'> = {
    kind: 'r13-6c-lossy-closure-transition' as const,
    version: 1 as const,
    projectId: 'pal' as const,
    transitionId: R13_SIX_C_TRANSITION_ID,
    parent: {
      transitionId: 'r13-source-semantics-v1' as const,
      digest: parentDigest,
    },
    closure: {
      version: 1 as const,
      methodVersion: 'n3-p7-r13-6c-lossy-closure-v1' as const,
      closures,
      finalContentDigest: report.generator.finalDigest,
      summary: { lossyClosed: 3, openObservations: report.summary.openObservations },
    },
  }
  return { ...body, digest: stableJsonSha256(body) }
}

/** 6C seal 以四元组(metadata.transitions / seal 文件 / managedFiles / hashes)原子落盘。 */
export function installR13SixCSeal(
  baseline: MigrationSnapshot,
  seal: R13SixCTransitionSealV1,
): AppendOnlyTransitionState {
  if (!baseline.baselineMetadata) throw new Error('R13-6C seal: baseline 缺 metadata')
  if (!baseline.hashes) throw new Error('R13-6C seal: baseline 缺 hashes 四元组')
  assertSealSelfConsistent(seal, 'R13-6C seal authority')
  const mode = appendOnlyTransitionState(baseline, {
    transitionId: R13_SIX_C_TRANSITION_ID,
    sealPath: R13_SIX_C_SEAL_PATH,
    errorPrefix: 'R13-6C seal',
  })
  if (mode === 'replay') {
    const published = baseline.files.get(R13_SIX_C_SEAL_PATH)
    if (!isRecord(published)) throw new Error('R13-6C seal: published seal 不是对象')
    const publishedSeal = structuredClone(published) as unknown as R13SixCTransitionSealV1
    assertSealSelfConsistent(publishedSeal, 'R13-6C seal published')
    if (baseline.baselineMetadata.transitions[R13_SIX_C_TRANSITION_ID] !== publishedSeal.digest)
      throw new Error('R13-6C seal: published seal 与 transition metadata 不符')
    const publishedJson = asJson(publishedSeal)
    const publishedHash = sha256(serializeMigrationJson(publishedJson, R13_SIX_C_SEAL_PATH))
    if (baseline.hashes.get(R13_SIX_C_SEAL_PATH) !== publishedHash)
      throw new Error('R13-6C seal: published seal 与文件 hash 不符')
    if (!isDeepStrictEqual(publishedSeal, seal))
      throw new Error('R13-6C seal: published seal 与重建 authority 不符')
    return mode
  }
  baseline.files.set(R13_SIX_C_SEAL_PATH, asJson(seal))
  baseline.managedFiles.add(R13_SIX_C_SEAL_PATH)
  baseline.hashes.set(
    R13_SIX_C_SEAL_PATH,
    sha256(serializeMigrationJson(asJson(seal), R13_SIX_C_SEAL_PATH)),
  )
  baseline.baselineMetadata.transitions[R13_SIX_C_TRANSITION_ID] = seal.digest
  return mode
}

function hasR13SixCMarker(source: MigrationSnapshot): boolean {
  if (source.baselineMetadata?.transitions?.[R13_SIX_C_TRANSITION_ID] !== undefined) return true
  if (source.files.has(R13_SIX_C_SEAL_PATH)) return true
  if (source.managedFiles.has(R13_SIX_C_SEAL_PATH)) return true
  return source.hashes?.has(R13_SIX_C_SEAL_PATH) === true
}

/**
 * 6C rewind:剥离 6C transition 四元组(零内容叶),其余文件逐字节不动。
 * 缺 marker 时 no-op(合成/历史 fixture 兼容);部分 marker 即 fail-closed。
 */
export function rewindPalR13SixCPublicationIfPresent(source: MigrationSnapshot): MigrationSnapshot {
  if (!hasR13SixCMarker(source)) return source
  const metadataPresent =
    source.baselineMetadata?.transitions?.[R13_SIX_C_TRANSITION_ID] !== undefined
  const filePresent = source.files.has(R13_SIX_C_SEAL_PATH)
  const managedPresent = source.managedFiles.has(R13_SIX_C_SEAL_PATH)
  const hashPresent = source.hashes?.has(R13_SIX_C_SEAL_PATH) === true
  if (!metadataPresent || !filePresent || !managedPresent || !hashPresent)
    throw new Error('R13-6C rewind: transition 半状态 metadata/file/managed/hash 不齐')
  const seal = source.files.get(R13_SIX_C_SEAL_PATH)
  const digest = isRecord(seal) && typeof seal.digest === 'string' ? seal.digest : undefined
  if (!digest || source.baselineMetadata!.transitions[R13_SIX_C_TRANSITION_ID] !== digest)
    throw new Error('R13-6C rewind: seal 自摘要与 metadata 不符')
  const snapshot = {
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? {
          baselineMetadata: {
            ...source.baselineMetadata,
            transitions: { ...source.baselineMetadata.transitions },
          },
        }
      : {}),
  }
  snapshot.files.delete(R13_SIX_C_SEAL_PATH)
  snapshot.managedFiles.delete(R13_SIX_C_SEAL_PATH)
  snapshot.hashes?.delete(R13_SIX_C_SEAL_PATH)
  delete snapshot.baselineMetadata?.transitions[R13_SIX_C_TRANSITION_ID]
  // 零内容叶:本 rewind 只删 seal 文件,其余文件 Map/哈希逐字节不动。
  return snapshot
}
