import { stableScriptHash } from '@type-pal/content'
import { isDeepStrictEqual } from 'node:util'
import { stableJsonSha256, stableStringCompare } from './experimental/script-v5/stable-json.js'
import {
  assertC1NpcCandidateReport,
  type C1NpcCandidateReportV1,
} from './pal-c1-npc-candidate-report.js'
import type { SourceCmd } from './source-facts.js'

export const C1_NPC_SOURCE_EVIDENCE_METHOD = 'pal-c1-npc-dialogue-source-rows-v1' as const

export interface C1NpcDialogueSourceRowV1 {
  textId: string
  localeTextSha256: string
  messageIndex: number
  sourceAddress: number
  sourceCommandSha256: string
}

export interface C1NpcDialogueSourceSequenceV1 {
  kind: 'pal-dialogue-message-sequence'
  rows: C1NpcDialogueSourceRowV1[]
  rowsDigest: string
}

export interface C1NpcDialogueSourceEvidenceEntryV1 {
  candidateId: string
  file: string
  pointer: string
  source: C1NpcDialogueSourceSequenceV1
}

export interface C1NpcSourceEvidenceV1 {
  kind: 'pal-c1-npc-source-evidence'
  version: 1
  projectId: 'pal'
  methodVersion: typeof C1_NPC_SOURCE_EVIDENCE_METHOD
  candidateReportDigest: string
  sourceFileSha256: string
  sourceCommandsDigest: string
  entries: C1NpcDialogueSourceEvidenceEntryV1[]
  summary: {
    sourceCommands: number
    showDialogCommands: number
    uniqueMessages: number
    dialogueCandidates: number
    rowOccurrences: number
  }
  digest: string
}

export interface PreparedC1NpcSourceEvidence {
  readonly evidence: C1NpcSourceEvidenceV1
}

const preparedEvidence = new WeakMap<object, { digest: string; reportDigest: string }>()

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`C1-3 source evidence: ${path} 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const keys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!keys.has(key)) throw new Error(`C1-3 source evidence: ${path}.${key} 未知字段`)
}

function body(value: C1NpcSourceEvidenceV1): Omit<C1NpcSourceEvidenceV1, 'digest'> {
  const { digest: _digest, ...result } = value
  return result
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  return Object.freeze(value)
}

function sourceSequence(rows: C1NpcDialogueSourceRowV1[]): C1NpcDialogueSourceSequenceV1 {
  return {
    kind: 'pal-dialogue-message-sequence',
    rows,
    rowsDigest: stableJsonSha256(rows),
  }
}

export function buildC1NpcSourceEvidence(args: {
  report: C1NpcCandidateReportV1
  sourceCommands: readonly SourceCmd[]
  locale: Readonly<Record<string, string>>
  sourceFileSha256: string
  expectedDialogueCandidates: number
}): C1NpcSourceEvidenceV1 {
  assertC1NpcCandidateReport(args.report)
  if (!/^[a-f0-9]{64}$/.test(args.sourceFileSha256))
    throw new Error('C1-3 source evidence: sourceFileSha256 非 sha256')
  const byMessageIndex = new Map<
    number,
    { sourceAddress: number; command: SourceCmd & { messageIndex: number } }
  >()
  let showDialogCommands = 0
  args.sourceCommands.forEach((raw, sourceAddress) => {
    if (raw.op !== 'showDialog') return
    showDialogCommands += 1
    const command = raw as SourceCmd & { messageIndex?: unknown }
    if (!Number.isSafeInteger(command.messageIndex) || (command.messageIndex as number) < 0)
      throw new Error(`C1-3 source evidence: showDialog@${sourceAddress} 缺合法 messageIndex`)
    const messageIndex = command.messageIndex as number
    if (byMessageIndex.has(messageIndex))
      throw new Error(`C1-3 source evidence: messageIndex 重复 ${messageIndex}`)
    byMessageIndex.set(messageIndex, {
      sourceAddress,
      command: command as SourceCmd & { messageIndex: number },
    })
  })
  const dialogueSites = args.report.sites.filter((site) => site.kind === 'dialogue')
  if (dialogueSites.length !== args.expectedDialogueCandidates)
    throw new Error(
      `C1-3 source evidence: dialogue candidate 数漂移 expected=${args.expectedDialogueCandidates} actual=${dialogueSites.length}`,
    )
  let rowOccurrences = 0
  const entries = dialogueSites
    .map((site): C1NpcDialogueSourceEvidenceEntryV1 => {
      if (!site.rowTextIds.length)
        throw new Error(`C1-3 source evidence: cue 无 rows ${site.file}#${site.pointer}`)
      const rows = site.rowTextIds.map((textId, index): C1NpcDialogueSourceRowV1 => {
        const match = /^dlg\.(0|[1-9]\d*)(?:\.v-([a-f0-9]{8}))?$/.exec(textId)
        if (!match) {
          throw new Error(
            `C1-3 source evidence: 非 PAL dialogue TextId ${site.file}#${site.pointer}/rows/${index} ${textId}`,
          )
        }
        const messageIndex = Number(match[1])
        const localeText = args.locale[textId]
        if (localeText === undefined)
          throw new Error(`C1-3 source evidence: locale 缺 ${textId}`)
        const variantHash = match[2]
        if (
          variantHash !== undefined &&
          stableScriptHash(localeText).toString(16).padStart(8, '0') !== variantHash
        )
          throw new Error(`C1-3 source evidence: dialogue variant hash 漂移 ${textId}`)
        const source = byMessageIndex.get(messageIndex)
        if (!source)
          throw new Error(`C1-3 source evidence: source message 缺失 dlg.${messageIndex}`)
        rowOccurrences += 1
        return {
          textId,
          localeTextSha256: stableJsonSha256(localeText),
          messageIndex,
          sourceAddress: source.sourceAddress,
          sourceCommandSha256: stableJsonSha256(source.command),
        }
      })
      return {
        candidateId: site.id,
        file: site.file,
        pointer: site.pointer,
        source: sourceSequence(rows),
      }
    })
    .sort((left, right) => stableStringCompare(left.candidateId, right.candidateId))
  const entryIds = entries.map((entry) => entry.candidateId)
  if (new Set(entryIds).size !== entryIds.length)
    throw new Error('C1-3 source evidence: candidate evidence 重复')
  const reportDialogueIds = dialogueSites.map((site) => site.id).sort(stableStringCompare)
  if (!isDeepStrictEqual(entryIds, reportDialogueIds))
    throw new Error('C1-3 source evidence: dialogue candidate coverage 不闭合')
  const evidenceBody = {
    kind: 'pal-c1-npc-source-evidence' as const,
    version: 1 as const,
    projectId: 'pal' as const,
    methodVersion: C1_NPC_SOURCE_EVIDENCE_METHOD,
    candidateReportDigest: args.report.digest,
    sourceFileSha256: args.sourceFileSha256,
    sourceCommandsDigest: stableJsonSha256(args.sourceCommands),
    entries,
    summary: {
      sourceCommands: args.sourceCommands.length,
      showDialogCommands,
      uniqueMessages: byMessageIndex.size,
      dialogueCandidates: dialogueSites.length,
      rowOccurrences,
    },
  }
  return { ...evidenceBody, digest: stableJsonSha256(evidenceBody) }
}

export function assertC1NpcSourceEvidence(value: C1NpcSourceEvidenceV1): void {
  const top = record(value, 'evidence')
  exactKeys(
    top,
    [
      'kind',
      'version',
      'projectId',
      'methodVersion',
      'candidateReportDigest',
      'sourceFileSha256',
      'sourceCommandsDigest',
      'entries',
      'summary',
      'digest',
    ],
    'evidence',
  )
  if (
    value.kind !== 'pal-c1-npc-source-evidence' ||
    value.version !== 1 ||
    value.projectId !== 'pal' ||
    value.methodVersion !== C1_NPC_SOURCE_EVIDENCE_METHOD
  )
    throw new Error('C1-3 source evidence: identity 漂移')
  for (const digest of [
    value.candidateReportDigest,
    value.sourceFileSha256,
    value.sourceCommandsDigest,
    value.digest,
  ])
    if (!/^[a-f0-9]{64}$/.test(digest))
      throw new Error('C1-3 source evidence: digest 非 sha256')
  const ids = value.entries.map((entry) => entry.candidateId)
  if (
    new Set(ids).size !== ids.length ||
    !isDeepStrictEqual(ids, [...ids].sort(stableStringCompare))
  )
    throw new Error('C1-3 source evidence: entries 未规范排序或重复')
  let rows = 0
  for (const entry of value.entries) {
    const entryRecord = record(entry, `entries.${entry.candidateId}`)
    exactKeys(entryRecord, ['candidateId', 'file', 'pointer', 'source'], 'entry')
    if (!/^[a-f0-9]{64}$/.test(entry.candidateId))
      throw new Error('C1-3 source evidence: candidateId 非 sha256')
    if (!entry.file || !entry.pointer.startsWith('/'))
      throw new Error(`C1-3 source evidence: locator 非法 ${entry.candidateId}`)
    const sourceRecord = record(entry.source, `entries.${entry.candidateId}.source`)
    exactKeys(sourceRecord, ['kind', 'rows', 'rowsDigest'], 'source')
    if (entry.source.kind !== 'pal-dialogue-message-sequence' || !entry.source.rows.length)
      throw new Error(`C1-3 source evidence: source sequence 非法 ${entry.candidateId}`)
    if (stableJsonSha256(entry.source.rows) !== entry.source.rowsDigest)
      throw new Error(`C1-3 source evidence: rows digest 不符 ${entry.candidateId}`)
    for (const row of entry.source.rows) {
      const rowRecord = record(row, `entries.${entry.candidateId}.row`)
      exactKeys(
        rowRecord,
        ['textId', 'localeTextSha256', 'messageIndex', 'sourceAddress', 'sourceCommandSha256'],
        'row',
      )
      const textIdMatch = /^dlg\.(0|[1-9]\d*)(?:\.v-[a-f0-9]{8})?$/.exec(row.textId)
      if (
        typeof row.textId !== 'string' ||
        !textIdMatch ||
        Number(textIdMatch[1]) !== row.messageIndex ||
        !/^[a-f0-9]{64}$/.test(row.localeTextSha256) ||
        !Number.isSafeInteger(row.messageIndex) ||
        row.messageIndex < 0 ||
        !Number.isSafeInteger(row.sourceAddress) ||
        row.sourceAddress < 0 ||
        !/^[a-f0-9]{64}$/.test(row.sourceCommandSha256)
      )
        throw new Error(`C1-3 source evidence: row 非法 ${entry.candidateId}`)
      rows += 1
    }
  }
  if (
    value.summary.dialogueCandidates !== value.entries.length ||
    value.summary.rowOccurrences !== rows ||
    value.summary.showDialogCommands !== value.summary.uniqueMessages
  )
    throw new Error('C1-3 source evidence: summary 不符')
  const summary = record(value.summary, 'summary')
  exactKeys(
    summary,
    [
      'sourceCommands',
      'showDialogCommands',
      'uniqueMessages',
      'dialogueCandidates',
      'rowOccurrences',
    ],
    'summary',
  )
  for (const [key, count] of Object.entries(summary))
    if (!Number.isSafeInteger(count) || (count as number) < 0)
      throw new Error(`C1-3 source evidence: summary.${key} 非非负整数`)
  if (stableJsonSha256(body(value)) !== value.digest)
    throw new Error('C1-3 source evidence: self digest 不符')
}

export function prepareC1NpcSourceEvidence(args: {
  report: C1NpcCandidateReportV1
  evidence: C1NpcSourceEvidenceV1
}): PreparedC1NpcSourceEvidence {
  assertC1NpcCandidateReport(args.report)
  assertC1NpcSourceEvidence(args.evidence)
  if (args.evidence.candidateReportDigest !== args.report.digest)
    throw new Error('C1-3 source evidence: candidate report digest 不符')
  const prepared = deepFreeze({ evidence: cloneJson(args.evidence) })
  preparedEvidence.set(prepared, {
    digest: args.evidence.digest,
    reportDigest: args.report.digest,
  })
  return prepared
}

export function assertPreparedC1NpcSourceEvidence(
  value: PreparedC1NpcSourceEvidence,
  reportDigest: string,
): void {
  const expected = preparedEvidence.get(value)
  if (!expected) throw new Error('C1-3 source evidence: 未经 prepare')
  assertC1NpcSourceEvidence(value.evidence)
  if (
    expected.digest !== value.evidence.digest ||
    expected.reportDigest !== reportDigest ||
    value.evidence.candidateReportDigest !== reportDigest
  )
    throw new Error('C1-3 source evidence: prepared authority 漂移')
}
