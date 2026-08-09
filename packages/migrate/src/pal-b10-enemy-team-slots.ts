import { isDeepStrictEqual } from 'node:util'
import {
  type AppendOnlyTransitionState,
  appendOnlyTransitionState,
} from './experimental/script-v5/append-only-transition-state.js'
import {
  R13_Z_SEAL_PATH,
  R13_Z_TRANSITION_ID,
} from './experimental/script-v5/r13-z-transition-mg2.js'
import { stableJsonSha256 } from './experimental/script-v5/stable-json.js'
import {
  isAtomicProjectMapPath,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'
import { R13_SIX_C_SEAL_PATH, R13_SIX_C_TRANSITION_ID } from './pal-r13-six-c.js'

/** B10 content successor authority.  v11 remains an immutable parent surface. */
export const B10_ENEMY_TEAM_SLOTS_TRANSITION_ID = 'b10-enemy-team-slots-v1' as const
export const B10_ENEMY_TEAM_SLOTS_SEAL_PATH = '_transitions/b10-enemy-team-slots-v1.json' as const
export const B10_ENEMY_TEAM_SLOTS_METHOD_VERSION = 'b10-enemy-team-slots-v1' as const
export const B10_ENEMY_TEAMS_PATH = 'content/enemy-teams.json' as const

/**
 * The B10 transaction owns both the v11 initialization edge and the v12 replay edge.
 * Keep the entry predicate beside the authority implementation so the CLI cannot silently
 * fall back to the legacy-members generator when a published v12 project is replayed.
 */
export interface B10EnemyTeamSlotsEntryArgs {
  contentVersion: unknown
  bootstrap: boolean
  hasExpectedTransition: boolean
  writeOnce: boolean
  verifyIdempotence: boolean
  repairR13ConfirmSeal: boolean
}

export function shouldRunB10EnemyTeamSlotsTransition(args: B10EnemyTeamSlotsEntryArgs): boolean {
  return (
    (args.contentVersion === 11 || args.contentVersion === 12) &&
    !args.bootstrap &&
    !args.hasExpectedTransition &&
    !args.writeOnce &&
    !args.verifyIdempotence &&
    !args.repairR13ConfirmSeal
  )
}

export interface B10EnemyTeamCensusV1 {
  sourceTeams: 380
  sourceEntries: 1900
  skippedEmptySlots: 1039
  semanticSlots: 861
  nullSlots: 104
  validSlots: 757
  teamsWithNullSlots: 68
  teamsWithNullAndMultipleValid: 56
}

export interface B10EnemyTeamControlRefV1 {
  transitionId: string
  metadataDigest: string
  sealDigest: string
}

export interface B10EnemyTeamSlotsSealV1 {
  kind: 'b10-enemy-team-slots-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof B10_ENEMY_TEAM_SLOTS_TRANSITION_ID
  methodVersion: typeof B10_ENEMY_TEAM_SLOTS_METHOD_VERSION
  parent: B10EnemyTeamControlRefV1 & {
    transitionId: typeof R13_SIX_C_TRANSITION_ID
    contentDigest: string
  }
  requiredControls: [B10EnemyTeamControlRefV1 & { transitionId: typeof R13_Z_TRANSITION_ID }]
  content: {
    path: typeof B10_ENEMY_TEAMS_PATH
    sourceDigest: string
    parentDigest: string
    successorDigest: string
    publishTimeSurfaceDigest: string
    census: B10EnemyTeamCensusV1
  }
  digest: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function fileDigest(value: unknown): string {
  return stableJsonSha256(value)
}

function fileHash(value: MigrationJson, path: string): string {
  return sha256(serializeMigrationJson(value, path))
}

function assertHexDigest(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
    throw new Error(`${path}: 期望 sha256 digest`)
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  path: string,
): void {
  const allowed = new Set(keys)
  for (const key of Object.keys(value))
    if (!allowed.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

function assertV11Teams(value: unknown, path: string = B10_ENEMY_TEAMS_PATH): void {
  if (!Array.isArray(value)) throw new Error(`${path}: v11 期望数组`)
  const seen = new Set<string>()
  value.forEach((entry, index) => {
    const at = `${path}[${index}]`
    if (!isRecord(entry)) throw new Error(`${at}: 期望对象`)
    assertOnlyKeys(entry, ['id', 'members'], at)
    if (typeof entry.id !== 'string' || entry.id.length === 0)
      throw new Error(`${at}.id: 期望非空 string`)
    if (seen.has(entry.id)) throw new Error(`${at}.id: 重复敌队 id`)
    seen.add(entry.id)
    if (!Array.isArray(entry.members)) throw new Error(`${at}.members: 期望数组`)
    if (entry.members.length > 5) throw new Error(`${at}.members: 超过 5`)
    for (const [slot, member] of entry.members.entries())
      if (typeof member !== 'string' || member.length === 0)
        throw new Error(`${at}.members[${slot}]: 期望非空 string`)
  })
}

function assertV12Teams(value: unknown, path: string = B10_ENEMY_TEAMS_PATH): void {
  if (!Array.isArray(value)) throw new Error(`${path}: v12 期望数组`)
  const seen = new Set<string>()
  value.forEach((entry, index) => {
    const at = `${path}[${index}]`
    if (!isRecord(entry)) throw new Error(`${at}: 期望对象`)
    assertOnlyKeys(entry, ['id', 'slots'], at)
    if (typeof entry.id !== 'string' || entry.id.length === 0)
      throw new Error(`${at}.id: 期望非空 string`)
    if (seen.has(entry.id)) throw new Error(`${at}.id: 重复敌队 id`)
    seen.add(entry.id)
    if (!Array.isArray(entry.slots)) throw new Error(`${at}.slots: 期望数组`)
    if (entry.slots.length > 5) throw new Error(`${at}.slots: 超过 5`)
    for (const [slot, member] of entry.slots.entries())
      if (member !== null && (typeof member !== 'string' || member.length === 0))
        throw new Error(`${at}.slots[${slot}]: 期望 string|null`)
  })
}

function sourceToSuccessor(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('B10 source enemy-teams: 期望数组')
  return value.map((raw, teamIndex) => {
    const path = `B10 source enemy-teams[${teamIndex}]`
    if (!isRecord(raw)) throw new Error(`${path}: 期望对象`)
    if (!Number.isSafeInteger(raw.id) || Number(raw.id) < 0)
      throw new Error(`${path}.id: 期望非负安全整数`)
    if (!Array.isArray(raw.enemyObjectIndexes) || raw.enemyObjectIndexes.length !== 5)
      throw new Error(`${path}.enemyObjectIndexes: 期望 5 槽数组`)
    const slots = raw.enemyObjectIndexes.flatMap((entry, slotIndex) => {
      if (!Number.isSafeInteger(entry) || Number(entry) < 0 || Number(entry) > 65535)
        throw new Error(`${path}.enemyObjectIndexes[${slotIndex}]: 期望 0..65535 安全整数`)
      if (entry === 65535) return []
      return [entry === 0 ? null : `enemy-${entry}`]
    })
    return { id: `team-${raw.id}`, slots }
  })
}

function successorToParent(value: unknown): unknown[] {
  assertV12Teams(value)
  return (value as Array<{ id: string; slots: Array<string | null> }>).map((team) => ({
    id: team.id,
    members: team.slots.filter((slot): slot is string => slot !== null),
  }))
}

function transitionControl(
  baseline: MigrationSnapshot,
  transitionId: string,
  sealPath: string,
  label: string,
): B10EnemyTeamControlRefV1 {
  const metadataDigest = baseline.baselineMetadata?.transitions[transitionId]
  if (!metadataDigest) throw new Error(`${label}: 缺 ${transitionId} metadata`)
  const raw = baseline.files.get(sealPath)
  if (!isRecord(raw) || typeof raw.digest !== 'string')
    throw new Error(`${label}: 缺已发布 ${sealPath}`)
  assertHexDigest(raw.digest, `${label}.seal.digest`)
  if (metadataDigest !== raw.digest)
    throw new Error(`${label}: metadata 与 published seal digest 不符`)
  const hash = baseline.hashes?.get(sealPath)
  if (!hash || hash !== fileHash(asJson(raw), sealPath))
    throw new Error(`${label}: published seal 文件 hash 不符`)
  return { transitionId, metadataDigest, sealDigest: raw.digest }
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

/** Digest of the published surface with the B10 four-tuple removed. */
export function b10PublishTimeSurfaceDigest(source: MigrationSnapshot): string {
  const files = new Map(source.files)
  files.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  const managedFiles = new Set(source.managedFiles)
  managedFiles.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  const hashes = new Map(source.hashes ?? [])
  hashes.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  const transitions = { ...(source.baselineMetadata?.transitions ?? {}) }
  delete transitions[B10_ENEMY_TEAM_SLOTS_TRANSITION_ID]
  // Baselines intentionally omit atomic map bodies and may carry producer-only files in memory.
  // The authority surface must therefore be represented by the managed non-atomic JSON bodies
  // plus managed hashes, so initialize and a freshly loaded replay see the same bytes.
  const managed = new Set(managedFiles)
  for (const path of [...files.keys()])
    if (!managed.has(path) || isAtomicProjectMapPath(path)) files.delete(path)
  for (const path of [...hashes.keys()]) if (!managed.has(path)) hashes.delete(path)
  return stableJsonSha256({
    files: Object.fromEntries([...files.entries()].sort(([a], [b]) => a.localeCompare(b))),
    managedFiles: [...managedFiles].sort(),
    hashes: Object.fromEntries([...hashes.entries()].sort(([a], [b]) => a.localeCompare(b))),
    ...(source.baselineMetadata
      ? { generatorEpoch: source.baselineMetadata.generatorEpoch, transitions }
      : {}),
  })
}

function sealBody(value: B10EnemyTeamSlotsSealV1): Omit<B10EnemyTeamSlotsSealV1, 'digest'> {
  const { digest: _digest, ...body } = value
  return body
}

function assertSealIdentity(seal: B10EnemyTeamSlotsSealV1, label: string): void {
  const raw = seal as unknown
  if (!isRecord(raw)) throw new Error(`${label}: 期望对象`)
  assertOnlyKeys(
    raw,
    [
      'kind',
      'version',
      'projectId',
      'transitionId',
      'methodVersion',
      'parent',
      'requiredControls',
      'content',
      'digest',
    ],
    label,
  )
  if (
    raw.kind !== 'b10-enemy-team-slots-transition' ||
    raw.version !== 1 ||
    raw.projectId !== 'pal' ||
    raw.transitionId !== B10_ENEMY_TEAM_SLOTS_TRANSITION_ID ||
    raw.methodVersion !== B10_ENEMY_TEAM_SLOTS_METHOD_VERSION
  )
    throw new Error(`${label}: seal identity 漂移`)
  if (!isRecord(raw.parent)) throw new Error(`${label}.parent: 期望对象`)
  assertOnlyKeys(
    raw.parent,
    ['transitionId', 'metadataDigest', 'sealDigest', 'contentDigest'],
    `${label}.parent`,
  )
  if (raw.parent.transitionId !== R13_SIX_C_TRANSITION_ID)
    throw new Error(`${label}.parent.transitionId: 期望 R13-6C`)
  for (const key of ['metadataDigest', 'sealDigest', 'contentDigest'] as const)
    assertHexDigest(raw.parent[key], `${label}.parent.${key}`)
  if (!Array.isArray(raw.requiredControls) || raw.requiredControls.length !== 1)
    throw new Error(`${label}.requiredControls: 期望恰好一个 R13-Z control`)
  const required = raw.requiredControls[0]
  if (!isRecord(required)) throw new Error(`${label}.requiredControls[0]: 期望对象`)
  assertOnlyKeys(
    required,
    ['transitionId', 'metadataDigest', 'sealDigest'],
    `${label}.requiredControls[0]`,
  )
  if (required.transitionId !== R13_Z_TRANSITION_ID)
    throw new Error(`${label}.requiredControls[0].transitionId: 期望 R13-Z`)
  assertHexDigest(required.metadataDigest, `${label}.requiredControls[0].metadataDigest`)
  assertHexDigest(required.sealDigest, `${label}.requiredControls[0].sealDigest`)
  if (!isRecord(raw.content)) throw new Error(`${label}.content: 期望对象`)
  assertOnlyKeys(
    raw.content,
    [
      'path',
      'sourceDigest',
      'parentDigest',
      'successorDigest',
      'publishTimeSurfaceDigest',
      'census',
    ],
    `${label}.content`,
  )
  if (raw.content.path !== B10_ENEMY_TEAMS_PATH)
    throw new Error(`${label}.content.path: 期望 ${B10_ENEMY_TEAMS_PATH}`)
  for (const key of [
    'sourceDigest',
    'parentDigest',
    'successorDigest',
    'publishTimeSurfaceDigest',
  ] as const)
    assertHexDigest(raw.content[key], `${label}.content.${key}`)
  if (!isRecord(raw.content.census)) throw new Error(`${label}.content.census: 期望对象`)
  const expectedCensus: B10EnemyTeamCensusV1 = {
    sourceTeams: 380,
    sourceEntries: 1900,
    skippedEmptySlots: 1039,
    semanticSlots: 861,
    nullSlots: 104,
    validSlots: 757,
    teamsWithNullSlots: 68,
    teamsWithNullAndMultipleValid: 56,
  }
  assertOnlyKeys(raw.content.census, Object.keys(expectedCensus), `${label}.content.census`)
  if (!isDeepStrictEqual(raw.content.census, expectedCensus))
    throw new Error(`${label}.content.census: PAL census 漂移`)
  assertHexDigest(raw.digest, `${label}.digest`)
}

function assertSealSelfConsistent(seal: B10EnemyTeamSlotsSealV1, label: string): void {
  assertSealIdentity(seal, label)
  if (stableJsonSha256(sealBody(seal)) !== seal.digest)
    throw new Error(`${label}: seal body 重算 digest 与自摘要不符`)
}

export interface BuildB10EnemyTeamSlotsSealArgs {
  baseline: MigrationSnapshot
  sourceTeams: unknown
  successorTeams: unknown
  census?: B10EnemyTeamCensusV1
}

function defaultCensus(sourceTeams: unknown, successorTeams: unknown): B10EnemyTeamCensusV1 {
  if (!Array.isArray(sourceTeams)) throw new Error('B10 source enemy-teams: 期望数组')
  if (!Array.isArray(successorTeams)) throw new Error('B10 successor enemy-teams: 期望数组')
  let sourceEntries = 0
  let skippedEmptySlots = 0
  let nullSlots = 0
  let validSlots = 0
  let teamsWithNullSlots = 0
  let teamsWithNullAndMultipleValid = 0
  for (const team of sourceTeams as Array<Record<string, unknown>>) {
    const slots = Array.isArray(team.enemyObjectIndexes) ? team.enemyObjectIndexes : []
    sourceEntries += slots.length
    let hasNull = false
    let valid = 0
    for (const id of slots) {
      if (id === 65535) {
        skippedEmptySlots++
      } else if (id === 0) {
        nullSlots++
        hasNull = true
      } else {
        validSlots++
        valid++
      }
    }
    if (hasNull) teamsWithNullSlots++
    if (hasNull && valid >= 2) teamsWithNullAndMultipleValid++
  }
  const census = {
    sourceTeams: sourceTeams.length,
    sourceEntries,
    skippedEmptySlots,
    semanticSlots: nullSlots + validSlots,
    nullSlots,
    validSlots,
    teamsWithNullSlots,
    teamsWithNullAndMultipleValid,
  }
  if (
    sourceTeams.length !== 380 ||
    sourceEntries !== 1900 ||
    skippedEmptySlots !== 1039 ||
    census.semanticSlots !== 861 ||
    nullSlots !== 104 ||
    validSlots !== 757 ||
    teamsWithNullSlots !== 68 ||
    teamsWithNullAndMultipleValid !== 56
  )
    throw new Error(`B10 source census 漂移: ${JSON.stringify(census)}`)
  const successorCount = (successorTeams as Array<{ slots?: unknown }>).reduce(
    (sum, team) => sum + (Array.isArray(team.slots) ? team.slots.length : 0),
    0,
  )
  if (successorCount !== census.semanticSlots)
    throw new Error(`B10 槽位守恒失败: source=${census.semanticSlots} successor=${successorCount}`)
  return census as B10EnemyTeamCensusV1
}

/** Build authority from v11 baseline, extracted source and v12 successor content. */
export function buildB10EnemyTeamSlotsSeal(
  args: BuildB10EnemyTeamSlotsSealArgs,
): B10EnemyTeamSlotsSealV1 {
  const { baseline } = args
  const parent = baseline.files.get(B10_ENEMY_TEAMS_PATH)
  if (parent === undefined) throw new Error('B10 seal: baseline 缺 content/enemy-teams.json')
  assertV11Teams(parent)
  assertV12Teams(args.successorTeams)
  const expectedSuccessor = sourceToSuccessor(args.sourceTeams)
  if (!isDeepStrictEqual(args.successorTeams, expectedSuccessor))
    throw new Error('B10 seal: successor slots 与 extracted source 精确投影不符')
  if (!isDeepStrictEqual(successorToParent(args.successorTeams), parent))
    throw new Error('B10 seal: successor 过滤 null 后不能逐字还原 v11 parent')
  const parentControl = transitionControl(
    baseline,
    R13_SIX_C_TRANSITION_ID,
    R13_SIX_C_SEAL_PATH,
    'B10 seal parent',
  )
  const requiredControl = transitionControl(
    baseline,
    R13_Z_TRANSITION_ID,
    R13_Z_SEAL_PATH,
    'B10 seal required control',
  )
  const census = args.census ?? defaultCensus(args.sourceTeams, args.successorTeams)
  const parentDigest = fileDigest(parent)
  const successorDigest = fileDigest(args.successorTeams)
  const body: Omit<B10EnemyTeamSlotsSealV1, 'digest'> = {
    kind: 'b10-enemy-team-slots-transition',
    version: 1,
    projectId: 'pal',
    transitionId: B10_ENEMY_TEAM_SLOTS_TRANSITION_ID,
    methodVersion: B10_ENEMY_TEAM_SLOTS_METHOD_VERSION,
    parent: {
      ...parentControl,
      transitionId: R13_SIX_C_TRANSITION_ID,
      contentDigest: parentDigest,
    },
    requiredControls: [
      {
        ...requiredControl,
        transitionId: R13_Z_TRANSITION_ID,
      },
    ],
    content: {
      path: B10_ENEMY_TEAMS_PATH,
      sourceDigest: fileDigest(args.sourceTeams),
      parentDigest,
      successorDigest,
      // The caller supplies a successor snapshot when installing; this placeholder is
      // replaced by `finalizeB10EnemyTeamSlotsSeal` below.
      publishTimeSurfaceDigest: '0'.repeat(64),
      census,
    },
  }
  return { ...body, digest: stableJsonSha256(body) }
}

/** Replace the surface digest after the successor snapshot has been assembled. */
export function finalizeB10EnemyTeamSlotsSeal(
  seal: B10EnemyTeamSlotsSealV1,
  successor: MigrationSnapshot,
): B10EnemyTeamSlotsSealV1 {
  const body = structuredClone(sealBody(seal))
  body.content.publishTimeSurfaceDigest = b10PublishTimeSurfaceDigest(successor)
  return { ...body, digest: stableJsonSha256(body) }
}

function assertControlMatches(
  baseline: MigrationSnapshot,
  ref: B10EnemyTeamControlRefV1,
  label: string,
): void {
  const actual = transitionControl(
    baseline,
    ref.transitionId,
    ref.transitionId === R13_SIX_C_TRANSITION_ID ? R13_SIX_C_SEAL_PATH : R13_Z_SEAL_PATH,
    label,
  )
  // B10 parent refs carry one additional contentDigest field; compare the pinned control
  // quartet explicitly rather than treating that envelope annotation as part of the control.
  if (
    actual.transitionId !== ref.transitionId ||
    actual.metadataDigest !== ref.metadataDigest ||
    actual.sealDigest !== ref.sealDigest
  )
    throw new Error(`${label}: control 漂移`)
}

/** Install/replay the B10 seal. Content and seal are checked as one authority tuple. */
export function installB10EnemyTeamSlotsSeal(
  baseline: MigrationSnapshot,
  seal: B10EnemyTeamSlotsSealV1,
  options: { parentContent?: unknown; successorContent?: unknown } = {},
): AppendOnlyTransitionState {
  if (!baseline.baselineMetadata) throw new Error('B10 seal: baseline 缺 metadata')
  if (!baseline.hashes) throw new Error('B10 seal: baseline 缺 hashes')
  assertSealSelfConsistent(seal, 'B10 seal authority')
  const mode = appendOnlyTransitionState(baseline, {
    transitionId: B10_ENEMY_TEAM_SLOTS_TRANSITION_ID,
    sealPath: B10_ENEMY_TEAM_SLOTS_SEAL_PATH,
    errorPrefix: 'B10 seal',
  })
  if (mode === 'replay') {
    assertControlMatches(baseline, seal.parent, 'B10 seal parent')
    const required = seal.requiredControls[0]
    if (!required) throw new Error('B10 seal: requiredControls 缺 R13-Z')
    assertControlMatches(baseline, required, 'B10 seal required control')
    const publishedRaw = baseline.files.get(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
    if (!isRecord(publishedRaw)) throw new Error('B10 seal: published seal 不是对象')
    const published = structuredClone(publishedRaw) as unknown as B10EnemyTeamSlotsSealV1
    assertSealSelfConsistent(published, 'B10 seal published')
    if (
      published.digest !== baseline.baselineMetadata.transitions[B10_ENEMY_TEAM_SLOTS_TRANSITION_ID]
    )
      throw new Error('B10 seal: published seal 与 transition metadata 不符')
    if (
      baseline.hashes.get(B10_ENEMY_TEAM_SLOTS_SEAL_PATH) !==
      fileHash(asJson(published), B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
    )
      throw new Error('B10 seal: published seal 与文件 hash 不符')
    if (!isDeepStrictEqual(published, seal))
      throw new Error('B10 seal: published seal 与重建 authority 不符')
    const content = options.successorContent ?? baseline.files.get(B10_ENEMY_TEAMS_PATH)
    assertV12Teams(content)
    if (fileDigest(content) !== published.content.successorDigest)
      throw new Error('B10 seal: published successor enemy-teams digest 不符')
    if (b10PublishTimeSurfaceDigest(baseline) !== published.content.publishTimeSurfaceDigest)
      throw new Error('B10 seal: publish-time-surface digest 不符')
    return mode
  }

  assertControlMatches(baseline, seal.parent, 'B10 seal initialize parent')
  const required = seal.requiredControls[0]
  if (!required) throw new Error('B10 seal initialize: requiredControls 缺 R13-Z')
  assertControlMatches(baseline, required, 'B10 seal initialize required control')
  const parentContent = options.parentContent
  if (parentContent === undefined) throw new Error('B10 seal initialize: 缺显式冻结 parent content')
  assertV11Teams(parentContent)
  if (fileDigest(parentContent) !== seal.content.parentDigest)
    throw new Error('B10 seal initialize: parent content digest 漂移')
  const successorContent = options.successorContent ?? baseline.files.get(B10_ENEMY_TEAMS_PATH)
  assertV12Teams(successorContent)
  if (fileDigest(successorContent) !== seal.content.successorDigest)
    throw new Error('B10 seal initialize: successor content digest 漂移')
  if (fileDigest(successorToParent(successorContent)) !== seal.content.parentDigest)
    throw new Error('B10 seal initialize: successor 无法还原冻结 parent')
  const existing = baseline.files.get(B10_ENEMY_TEAMS_PATH)
  assertV12Teams(existing)
  if (fileDigest(existing) !== seal.content.successorDigest)
    throw new Error('B10 seal initialize: baseline 正文不是 expected successor')
  if (b10PublishTimeSurfaceDigest(baseline) !== seal.content.publishTimeSurfaceDigest)
    throw new Error('B10 seal initialize: publish-time-surface digest 不符')
  baseline.files.set(B10_ENEMY_TEAM_SLOTS_SEAL_PATH, asJson(seal))
  baseline.managedFiles.add(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  baseline.hashes.set(
    B10_ENEMY_TEAM_SLOTS_SEAL_PATH,
    fileHash(asJson(seal), B10_ENEMY_TEAM_SLOTS_SEAL_PATH),
  )
  baseline.baselineMetadata.transitions[B10_ENEMY_TEAM_SLOTS_TRANSITION_ID] = seal.digest
  return mode
}

function hasB10Marker(source: MigrationSnapshot): boolean {
  return (
    source.baselineMetadata?.transitions[B10_ENEMY_TEAM_SLOTS_TRANSITION_ID] !== undefined ||
    source.files.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH) ||
    source.managedFiles.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH) ||
    source.hashes?.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH) === true
  )
}

/** Validate the published B10 tuple without changing the v12 successor content. */
export function assertB10PublishedAuthority(
  source: MigrationSnapshot,
): B10EnemyTeamSlotsSealV1 | undefined {
  if (!hasB10Marker(source)) return undefined
  const metadataPresent =
    source.baselineMetadata?.transitions[B10_ENEMY_TEAM_SLOTS_TRANSITION_ID] !== undefined
  const filePresent = source.files.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  const managedPresent = source.managedFiles.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  const hashPresent = source.hashes?.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH) === true
  if (!metadataPresent || !filePresent || !managedPresent || !hashPresent)
    throw new Error('B10 authority: transition 半状态 metadata/file/managed/hash 不齐')
  const raw = source.files.get(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  if (!isRecord(raw)) throw new Error('B10 authority: published seal 不是对象')
  const seal = structuredClone(raw) as unknown as B10EnemyTeamSlotsSealV1
  assertSealSelfConsistent(seal, 'B10 authority seal')
  if (seal.transitionId !== B10_ENEMY_TEAM_SLOTS_TRANSITION_ID)
    throw new Error('B10 authority: transitionId 漂移')
  if (seal.methodVersion !== B10_ENEMY_TEAM_SLOTS_METHOD_VERSION)
    throw new Error('B10 authority: methodVersion 漂移')
  if (seal.parent.transitionId !== R13_SIX_C_TRANSITION_ID)
    throw new Error('B10 authority: parent control 必须是 R13-6C')
  const required = seal.requiredControls[0]
  if (
    !required ||
    seal.requiredControls.length !== 1 ||
    required.transitionId !== R13_Z_TRANSITION_ID
  )
    throw new Error('B10 authority: required control 必须恰为 R13-Z')
  assertControlMatches(source, seal.parent, 'B10 authority parent')
  assertControlMatches(source, required, 'B10 authority required control')
  if (source.baselineMetadata!.transitions[B10_ENEMY_TEAM_SLOTS_TRANSITION_ID] !== seal.digest)
    throw new Error('B10 authority: seal 自摘要与 metadata 不符')
  if (
    source.hashes!.get(B10_ENEMY_TEAM_SLOTS_SEAL_PATH) !==
    fileHash(asJson(seal), B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  )
    throw new Error('B10 authority: seal 文件 hash 不符')
  const successor = source.files.get(B10_ENEMY_TEAMS_PATH)
  assertV12Teams(successor)
  if (fileDigest(successor) !== seal.content.successorDigest)
    throw new Error('B10 authority: successor content digest 不符')
  if (b10PublishTimeSurfaceDigest(source) !== seal.content.publishTimeSurfaceDigest)
    throw new Error('B10 authority: publish-time-surface digest 不符')
  return seal
}

/**
 * A published content12 replay may verify the B10 authority but must never replace it.
 * Compare both the sealed tuple and its successor body so source drift that preserves the
 * compressed v11 parent (for example moving a semantic null slot) still fails closed.
 */
export function assertB10PublishedReplayUnchanged(
  published: MigrationSnapshot,
  rebuilt: MigrationSnapshot,
): void {
  const expected = assertB10PublishedAuthority(published)
  if (!expected) throw new Error('B10 replay: published authority 缺失')
  const actual = assertB10PublishedAuthority(rebuilt)
  if (!actual) throw new Error('B10 replay: rebuilt authority 缺失')
  if (!isDeepStrictEqual(actual, expected))
    throw new Error('B10 replay: 重建 authority 与 published authority 不符')
  if (
    !isDeepStrictEqual(
      rebuilt.files.get(B10_ENEMY_TEAMS_PATH),
      published.files.get(B10_ENEMY_TEAMS_PATH),
    )
  )
    throw new Error('B10 replay: 重建 successor content 与 published content 不符')
}

/** Remove only the B10 seal tuple, preserving the published v12 content surface. */
export function stripB10SealIfPresent(source: MigrationSnapshot): MigrationSnapshot {
  if (!hasB10Marker(source)) return source
  assertB10PublishedAuthority(source)
  const snapshot = cloneSnapshot(source)
  snapshot.files.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  snapshot.managedFiles.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  snapshot.hashes?.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  delete snapshot.baselineMetadata?.transitions[B10_ENEMY_TEAM_SLOTS_TRANSITION_ID]
  return snapshot
}

/**
 * Project snapshots do not carry transition seals, but their managed-path discovery may retain
 * a seal placeholder.  Project historical replay is allowed only when its v12 team file is byte-
 * equivalent to the published successor pinned by the baseline authority.
 */
export function rewindB10ProjectAgainstPublishedBaseline(
  project: MigrationSnapshot,
  publishedBaseline: MigrationSnapshot,
): MigrationSnapshot {
  const seal = assertB10PublishedAuthority(publishedBaseline)
  if (!seal) return project
  // A published project may carry the seal as a managed transition artifact (the writer copies
  // the baseline allowlist into the project).  It is not project authority, so accept it only
  // when its bytes/hash are exactly the published seal; any forged or half-state artifact still
  // fails closed.  Project snapshots must never carry baseline transition metadata.
  const projectSeal = project.files.get(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  if (
    projectSeal !== undefined &&
    !isDeepStrictEqual(projectSeal, publishedBaseline.files.get(B10_ENEMY_TEAM_SLOTS_SEAL_PATH))
  )
    throw new Error('B10 project rewind: 工程 seal 与 published authority 不符')
  const projectSealHash = project.hashes?.get(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  if (projectSealHash !== undefined) {
    if (
      projectSeal === undefined ||
      projectSealHash !== fileHash(asJson(projectSeal), B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
    )
      throw new Error('B10 project rewind: 工程 seal hash 不符')
  }
  if (project.baselineMetadata?.transitions[B10_ENEMY_TEAM_SLOTS_TRANSITION_ID] !== undefined)
    throw new Error('B10 project rewind: 工程不得携带 baseline transition metadata')
  const successor = project.files.get(B10_ENEMY_TEAMS_PATH)
  assertV12Teams(successor, 'B10 project rewind enemy-teams')
  if (fileDigest(successor) !== seal.content.successorDigest)
    throw new Error('B10 project rewind: 工程 successor content 与 published authority 不符')
  const parent = successorToParent(successor)
  if (fileDigest(parent) !== seal.content.parentDigest)
    throw new Error('B10 project rewind: 还原 parent content digest 不符')
  const snapshot = cloneSnapshot(project)
  snapshot.files.set(B10_ENEMY_TEAMS_PATH, asJson(parent))
  snapshot.hashes?.set(B10_ENEMY_TEAMS_PATH, fileHash(asJson(parent), B10_ENEMY_TEAMS_PATH))
  snapshot.files.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  snapshot.hashes?.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  snapshot.managedFiles.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  return snapshot
}

/** Rewind B10 outer successor to the exact v11 `{id,members}` content surface. */
export function rewindB10PublicationIfPresent(source: MigrationSnapshot): MigrationSnapshot {
  if (!hasB10Marker(source)) return source
  const seal = assertB10PublishedAuthority(source)
  if (!seal) throw new Error('B10 rewind: authority 缺失')
  const successor = source.files.get(B10_ENEMY_TEAMS_PATH)
  const parent = successorToParent(successor)
  if (fileDigest(parent) !== seal.content.parentDigest)
    throw new Error('B10 rewind: 还原 v11 parent digest 不符')
  const snapshot = cloneSnapshot(source)
  snapshot.files.set(B10_ENEMY_TEAMS_PATH, asJson(parent))
  snapshot.hashes?.set(B10_ENEMY_TEAMS_PATH, fileHash(asJson(parent), B10_ENEMY_TEAMS_PATH))
  snapshot.files.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  snapshot.managedFiles.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  snapshot.hashes?.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
  delete snapshot.baselineMetadata?.transitions[B10_ENEMY_TEAM_SLOTS_TRANSITION_ID]
  return snapshot
}

/** Alias used by historical replay callers. */
export const rewindPalB10EnemyTeamSlotsPublicationIfPresent = rewindB10PublicationIfPresent
