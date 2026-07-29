import { isDeepStrictEqual } from 'node:util'
import type {
  ItemDataV5,
  PoisonDef,
  SkillAnimation,
  StatusId,
  ThrowEffect,
  ThrowElement,
  ThrowSpec,
} from '@type-pal/content'
import { checkThrowSpec } from '@type-pal/content'
import {
  mapSourceMagicAnimation,
  type SourceItem,
  type SourceMagic,
  type SourceObjectMagic,
} from '../../migrate-content.js'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import type { SoundAssetForNum } from '../../sound-migration.js'
import type { SourceCmd } from '../../source-facts.js'
import { digestRecord, stableJsonSha256 } from './stable-json.js'

export const R13_ITEM_THROW_TRANSITION_IDS = [
  66, 67, 68, 69, 70, 71, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 130,
  133, 134, 135, 137, 138, 139, 140, 142, 143, 144, 146, 147, 153, 154, 155, 156, 157, 158, 159,
  160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178,
  179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 255,
] as const

export const R13_ITEM_THROW_ALL_TARGET_IDS = [
  67, 68, 69, 70, 71, 115, 133, 134, 142, 157, 162,
] as const

export const R13_ITEM_THROW_SENTINEL_IDS = [
  116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 130, 135, 137, 138, 139, 140,
  144, 147, 153, 154, 155, 158, 159, 160, 161, 255,
] as const

export type R13ItemThrowFamily =
  | '0x42'
  | '0x42-0x28'
  | '0x42-0x28-0x5e-0x60'
  | '0x42-0x2e-0x21'
  | '0x64-0x60'
  | '0x42-0x5b'
  | '0x42-0x21'
  | '0x42-0x28-0x21'
  | '0x42-0x39'
  | '0x66'

const EXPECTED_FAMILY_COUNTS = {
  '0x42': 10,
  '0x42-0x28': 11,
  '0x42-0x28-0x5e-0x60': 6,
  '0x42-0x2e-0x21': 6,
  '0x64-0x60': 1,
  '0x42-0x5b': 1,
  '0x42-0x21': 7,
  '0x42-0x28-0x21': 1,
  '0x42-0x39': 1,
  '0x66': 32,
} as const satisfies Record<R13ItemThrowFamily, number>

const ELEMENT_BY_SOURCE: Readonly<Record<number, ThrowElement>> = {
  0: 'none',
  1: 'wind',
  2: 'thunder',
  3: 'water',
  4: 'fire',
  5: 'earth',
  6: 'poison',
}

const STATUS_BY_SOURCE: Readonly<Record<number, StatusId>> = {
  0: 'confused',
  1: 'paralyzed',
  2: 'sleep',
  3: 'silence',
  4: 'puppet',
  5: 'bravery',
  6: 'protect',
  7: 'haste',
  8: 'dualAttack',
}

export interface R13ItemThrowRootEvidenceV1 {
  itemId: string
  sourceAddress: number
  family: R13ItemThrowFamily
  target: ThrowSpec['target']
  parentDisposition: 'absent' | 'present-lossy' | 'present-exact'
  sentinelPresentationOnly: boolean
  sourceClosureDigest: string
  targetDigest: string
}

export type R13ItemThrowObservationKind =
  | 'pending-throw'
  | 'silent-empty-throw'
  | 'present-lossy-throw'

export interface R13ItemThrowDispositionObservationV1 {
  id: string
  itemId: string
  sourceRootId: string
  sourceAddress: number
  kind: R13ItemThrowObservationKind
  sourceClosureDigest: string
  rawTargetDigest: string | null
  normalizedParentTargetDigest: string | null
  successorTargetDigest: string
  layers: {
    raw: 'open'
    augmented: 'accounted'
    final: 'accounted'
  }
}

interface R13ItemThrowAugmentationEvidenceBodyV1 {
  kind: 'r13-item-throw-augmentation-evidence'
  version: 1
  projectId: 'pal'
  generator: {
    id: 'r13-item-throw-augmentation'
    version: 1
  }
  summary: {
    sourceRoots: 76
    finalRunnableThrows: 76
    missing: 0
    restoredAbsent: 58
    correctedLossy: 1
    existingExact: 17
    allTargets: 11
    oneTargets: 65
    sentinelPresentationOnly: 29
    rootObservations: 59
    pendingObservations: 48
    silentEmptyObservations: 10
    lossyObservations: 1
    openRootObservations: 0
    familyCounts: Record<R13ItemThrowFamily, number>
  }
  diagnostics: {
    pendingIds: string[]
    silentEmptyIds: string[]
    correctedIds: ['133']
    openItemIds: []
  }
  sourceDigest: string
  targetDigest: string
  roots: R13ItemThrowRootEvidenceV1[]
  observations: R13ItemThrowDispositionObservationV1[]
}

export interface R13ItemThrowAugmentationEvidenceV1 extends R13ItemThrowAugmentationEvidenceBodyV1 {
  digest: string
}

export interface R13ItemThrowAugmentation {
  snapshot: MigrationSnapshot
  evidence: R13ItemThrowAugmentationEvidenceV1
}

interface ResolvedMagic {
  object: SourceObjectMagic
  magic: SourceMagic
}

function signedI16(value: number): number {
  return value > 0x7fff ? value - 0x10000 : value
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
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

function sourceRows(
  commands: readonly SourceCmd[],
  root: number,
): Array<{ address: number; command: SourceCmd }> {
  if (!Number.isSafeInteger(root) || root <= 0 || root >= commands.length)
    throw new Error(`R13 item throw: 非法源根 ${root}`)
  const rows: Array<{ address: number; command: SourceCmd }> = []
  for (let address = root; address < commands.length; address++) {
    const command = commands[address]!
    rows.push({ address, command: structuredClone(command) })
    if (command.op === 'end') return rows
    if (command.op !== 'raw')
      throw new Error(`R13 item throw: root ${root} 含非 raw 指令 ${String(command.op)}`)
    if (rows.length > 16) throw new Error(`R13 item throw: root ${root} 超过 16 条仍未终止`)
  }
  throw new Error(`R13 item throw: root ${root} 未终止`)
}

function familyOf(rows: readonly { command: SourceCmd }[]): R13ItemThrowFamily {
  const key = rows
    .filter(({ command }) => command.op === 'raw')
    .map(({ command }) => `0x${command.opcode!.toString(16)}`)
    .join('-')
  if (Object.hasOwn(EXPECTED_FAMILY_COUNTS, key)) return key as R13ItemThrowFamily
  throw new Error(`R13 item throw: 未知投掷根链 ${key}`)
}

function requireOperands(command: SourceCmd, address: number): [number, number, number] {
  if (
    command.op !== 'raw' ||
    !Number.isSafeInteger(command.opcode) ||
    !Array.isArray(command.operands) ||
    command.operands.some((value) => !Number.isSafeInteger(value))
  )
    throw new Error(`R13 item throw: ${address} 指令形状无效`)
  return [command.operands[0] ?? 0, command.operands[1] ?? 0, command.operands[2] ?? 0]
}

interface R13ItemThrowFailureExitEvidence {
  fromAddress: number
  targetAddress: number
  feedback: '攻击无效' | '无任何效果'
  rows: Array<{ address: number; command: SourceCmd }>
}

function readFailureExit(
  commands: readonly SourceCmd[],
  target: number,
  context: string,
  feedback: R13ItemThrowFailureExitEvidence['feedback'],
): Array<{ address: number; command: SourceCmd }> {
  if (!Number.isSafeInteger(target) || target <= 0 || target >= commands.length)
    throw new Error(`R13 item throw: ${context} 失败跳转 ${target} 不是有效终止分支`)
  const rows: Array<{ address: number; command: SourceCmd }> = []
  for (let address = target; address < Math.min(commands.length, target + 4); address++) {
    const command = commands[address]!
    rows.push({ address, command: structuredClone(command) })
    if (command.op === 'end') {
      const [style, dialog, end] = rows.map((row) => row.command)
      if (
        rows.length !== 3 ||
        style?.op !== 'setDialogStyleNarration' ||
        dialog?.op !== 'showDialog' ||
        dialog.text !== feedback ||
        end?.op !== 'end'
      )
        throw new Error(
          `R13 item throw: ${context} 失败提示漂移，期望 narration + "${feedback}" + end`,
        )
      return rows
    }
    if (command.op === 'setDialogStyleNarration' || command.op === 'showDialog') continue
    throw new Error(
      `R13 item throw: ${context} 失败跳转 ${target} 含非终止表现指令 ${String(command.op)}`,
    )
  }
  throw new Error(`R13 item throw: ${context} 失败跳转 ${target} 未在限定窗口终止`)
}

function targetOf(item: SourceItem): ThrowSpec['target'] {
  return item.flags.applyToAll ? 'allEnemies' : 'oneEnemy'
}

function assertTargetBit(value: number, item: SourceItem, address: number, source: string): void {
  if ((value !== 0 && value !== 1) || Boolean(value) !== item.flags.applyToAll)
    throw new Error(
      `R13 item throw: ${item.id}@${address} ${source} 目标位与 item.flags.applyToAll 不一致`,
    )
}

function resolveMagic(
  objectId: number,
  item: SourceItem,
  address: number,
  objectById: ReadonlyMap<number, SourceObjectMagic>,
  magicById: ReadonlyMap<number, SourceMagic>,
): ResolvedMagic {
  const object = objectById.get(objectId)
  if (!object) throw new Error(`R13 item throw: ${item.id}@${address} 缺 magic object ${objectId}`)
  const magic = magicById.get(object.magicNumber)
  if (!magic)
    throw new Error(
      `R13 item throw: ${item.id}@${address} object ${objectId} 缺 magic ${object.magicNumber}`,
    )
  if (!object.flags)
    throw new Error(`R13 item throw: ${item.id}@${address} object ${objectId} 缺 flags`)
  if (object.flags.applyToAll !== item.flags.applyToAll)
    throw new Error(
      `R13 item throw: ${item.id}@${address} magic object 目标与 item.flags.applyToAll 不一致`,
    )
  if (!ELEMENT_BY_SOURCE[magic.elemental])
    throw new Error(
      `R13 item throw: ${item.id}@${address} magic ${magic.id} 元素 ${magic.elemental} 无映射`,
    )
  return { object, magic }
}

function presentationOf(
  magic: SourceMagic,
  soundAssetForNum?: SoundAssetForNum,
): ThrowSpec['presentation'] {
  const special = signedI16(magic.special ?? 0)
  const animation: SkillAnimation = {
    ...mapSourceMagicAnimation(magic, soundAssetForNum),
    ...(magic.type !== 'summon' && special !== 0 ? { layerOffset: special } : {}),
  }
  return { kind: 'magic', animation }
}

function buildThrow(args: {
  item: SourceItem
  rows: readonly { address: number; command: SourceCmd }[]
  sourceCommands: readonly SourceCmd[]
  poisonById: ReadonlyMap<number, PoisonDef>
  objectById: ReadonlyMap<number, SourceObjectMagic>
  magicById: ReadonlyMap<number, SourceMagic>
  soundAssetForNum?: SoundAssetForNum
}): {
  spec: ThrowSpec
  family: R13ItemThrowFamily
  sentinelPresentationOnly: boolean
  resolvedMagics: ResolvedMagic[]
  failureExits: R13ItemThrowFailureExitEvidence[]
} {
  const effects: ThrowEffect[] = []
  let presentation: ThrowSpec['presentation']
  let sound: ThrowSpec['sound']
  let sentinelPresentationOnly = false
  const resolvedMagics: ResolvedMagic[] = []
  const failureExits: R13ItemThrowFailureExitEvidence[] = []
  const rawRows = args.rows.filter(({ command }) => command.op === 'raw')
  const family = familyOf(args.rows)

  for (const [index, row] of rawRows.entries()) {
    const [a, b, c] = requireOperands(row.command, row.address)
    switch (row.command.opcode) {
      case 0x42:
      case 0x66: {
        if (row.command.opcode === 0x42 && c !== 0)
          throw new Error(`R13 item throw: ${args.item.id}@${row.address} 0x42 含显式目标覆盖 ${c}`)
        if (row.command.opcode === 0x66 && c !== 0)
          throw new Error(`R13 item throw: ${args.item.id}@${row.address} 0x66 未用参数 c=${c}`)
        const resolved = resolveMagic(a, args.item, row.address, args.objectById, args.magicById)
        resolvedMagics.push(structuredClone(resolved))
        const nextPresentation = presentationOf(resolved.magic, args.soundAssetForNum)
        if (presentation && !isDeepStrictEqual(presentation, nextPresentation))
          throw new Error(`R13 item throw: ${args.item.id} 含多个不同 magic presentation`)
        presentation = nextPresentation
        const baseDamage = signedI16(resolved.magic.baseDamage)
        if (row.command.opcode === 0x42) {
          const sentinel =
            baseDamage < 0 &&
            b === 0 &&
            c === 0 &&
            resolved.magic.elemental === 0 &&
            resolved.magic.type !== 'summon'
          if (baseDamage < 0 && !sentinel)
            throw new Error(
              `R13 item throw: ${args.item.id}@${row.address} 未证明的负 baseDamage ${baseDamage}`,
            )
          if (sentinel) sentinelPresentationOnly = true
          else
            effects.push({
              kind: 'magicDamage',
              baseDamage,
              element: ELEMENT_BY_SOURCE[resolved.magic.elemental]!,
              strength: { kind: 'fixed', value: b },
            })
        } else {
          if (baseDamage < 0)
            throw new Error(
              `R13 item throw: ${args.item.id}@${row.address} 0x66 baseDamage 不得为负`,
            )
          effects.push({
            kind: 'magicDamage',
            baseDamage,
            element: ELEMENT_BY_SOURCE[resolved.magic.elemental]!,
            strength: {
              kind: 'casterAttack',
              bonus: b * 5,
              multiplier: { kind: 'uniformInt', min: 0, max: 3 },
            },
          })
        }
        break
      }
      case 0x21:
        assertTargetBit(a, args.item, row.address, '0x21')
        effects.push({ kind: 'fixedDamage', amount: b })
        break
      case 0x28:
        assertTargetBit(a, args.item, row.address, '0x28')
        effects.push({ kind: 'applyPoison', poisonId: String(b) })
        break
      case 0x2e: {
        const status = STATUS_BY_SOURCE[a]
        if (!status) throw new Error(`R13 item throw: ${args.item.id}@${row.address} 未知状态 ${a}`)
        if (c <= 0)
          throw new Error(`R13 item throw: ${args.item.id}@${row.address} 0x2e 缺失败跳转`)
        failureExits.push({
          fromAddress: row.address,
          targetAddress: c,
          feedback: '攻击无效',
          rows: readFailureExit(
            args.sourceCommands,
            c,
            `${args.item.id}@${row.address} 0x2e`,
            '攻击无效',
          ),
        })
        effects.push({ kind: 'applyStatus', status, turns: b, onResist: 'stopTarget' })
        break
      }
      case 0x5b:
        effects.push({
          kind: 'currentHpDamage',
          numerator: 1,
          denominator: 2,
          bonus: 1,
          cap: a,
        })
        break
      case 0x64:
        if (rawRows[index + 1]?.command.opcode !== 0x60)
          throw new Error(`R13 item throw: ${args.item.id}@${row.address} 0x64 未接 0x60`)
        if (c !== 0)
          throw new Error(`R13 item throw: ${args.item.id}@${row.address} 0x64 未用参数 c=${c}`)
        failureExits.push({
          fromAddress: row.address,
          targetAddress: b,
          feedback: '无任何效果',
          rows: readFailureExit(
            args.sourceCommands,
            b,
            `${args.item.id}@${row.address} 0x64`,
            '无任何效果',
          ),
        })
        effects.push({ kind: 'killIfHpAtMost', percent: a })
        break
      case 0x39:
        effects.push({ kind: 'damageAndHealCaster', damage: a, heal: a })
        break
      case 0x5e: {
        const previous = rawRows[index - 1]
        if (previous?.command.opcode !== 0x28 || rawRows[index + 1]?.command.opcode !== 0x60)
          throw new Error(`R13 item throw: ${args.item.id}@${row.address} 0x5e 配对链无效`)
        const [, appliedPoisonId] = requireOperands(previous.command, previous.address)
        const poison = args.poisonById.get(appliedPoisonId)
        if (!poison)
          throw new Error(
            `R13 item throw: ${args.item.id}@${row.address} 缺 poison ${appliedPoisonId}`,
          )
        if (poison.lethalWith !== a)
          throw new Error(
            `R13 item throw: ${args.item.id}@${row.address} 0x5e 配对毒 ${a} 与 poison ${appliedPoisonId}.lethalWith ${String(poison.lethalWith)} 不一致`,
          )
        if (b !== 0 || c !== 0)
          throw new Error(`R13 item throw: ${args.item.id}@${row.address} 0x5e 失败臂必须直接终止`)
        break
      }
      case 0x60:
        if (
          rawRows[index - 1]?.command.opcode !== 0x5e &&
          rawRows[index - 1]?.command.opcode !== 0x64
        )
          throw new Error(`R13 item throw: ${args.item.id}@${row.address} 孤立 0x60`)
        break
      case 0x47: {
        const next = args.soundAssetForNum?.(a)
        if (next) {
          if (sound && sound !== next)
            throw new Error(`R13 item throw: ${args.item.id} 含多个不同 0x47 sound`)
          sound = next
        }
        break
      }
      case 0x05:
      case 167:
        break
      default:
        throw new Error(
          `R13 item throw: ${args.item.id}@${row.address} 未支持 opcode 0x${(
            row.command.opcode ?? 0
          ).toString(16)}`,
        )
    }
  }

  const spec: ThrowSpec = {
    target: targetOf(args.item),
    effects,
    ...(sound ? { sound } : {}),
    ...(presentation ? { presentation } : {}),
  }
  checkThrowSpec(spec, `R13 item throw ${args.item.id}`)
  return { spec, family, sentinelPresentationOnly, resolvedMagics, failureExits }
}

function normalizedParentThrow(value: ItemDataV5['throw']): ThrowSpec | undefined {
  if (!value) return undefined
  return {
    ...structuredClone(value),
    // content 7 的作者/runtime 路径始终先选单敌；v7→v8 的兼容缺省只能是
    // oneEnemy。PAL 的全体目标由本层 source-backed successor 重建，不能反向
    // 用源目标美化 parent，否则会掩盖 item 133 的目标语义损失。
    target: value.target ?? 'oneEnemy',
  }
}

function observationKind(
  root: Pick<R13ItemThrowRootEvidenceV1, 'family' | 'parentDisposition'>,
): R13ItemThrowObservationKind | undefined {
  if (root.parentDisposition === 'present-lossy') return 'present-lossy-throw'
  if (root.parentDisposition === 'present-exact') return undefined
  return root.family === '0x42' ? 'silent-empty-throw' : 'pending-throw'
}

function observationId(itemId: string, kind: R13ItemThrowObservationKind): string {
  return `item:${itemId}:${kind}`
}

function assertExactIds(
  actual: readonly number[],
  expected: readonly number[],
  context: string,
): void {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index]))
    throw new Error(`${context}: ${actual.join(',')}，期望 ${expected.join(',')}`)
}

export function assertR13ItemThrowAugmentationEvidence(
  evidence: R13ItemThrowAugmentationEvidenceV1,
): void {
  const { digest, ...body } = evidence
  if (stableJsonSha256(body) !== digest)
    throw new Error('R13 item throw: augmentation evidence 自摘要不符')
  const expectedSummary = {
    sourceRoots: 76,
    finalRunnableThrows: 76,
    missing: 0,
    restoredAbsent: 58,
    correctedLossy: 1,
    existingExact: 17,
    allTargets: 11,
    oneTargets: 65,
    sentinelPresentationOnly: 29,
    rootObservations: 59,
    pendingObservations: 48,
    silentEmptyObservations: 10,
    lossyObservations: 1,
    openRootObservations: 0,
    familyCounts: EXPECTED_FAMILY_COUNTS,
  }
  if (!isDeepStrictEqual(evidence.summary, expectedSummary))
    throw new Error('R13 item throw: augmentation evidence summary 漂移')
  assertExactIds(
    evidence.roots.map((root) => Number(root.itemId)),
    R13_ITEM_THROW_TRANSITION_IDS,
    'R13 item throw evidence ids',
  )
  if (
    evidence.roots.some(
      (root) =>
        !Number.isSafeInteger(root.sourceAddress) ||
        root.sourceAddress <= 0 ||
        !/^[a-f0-9]{64}$/.test(root.sourceClosureDigest) ||
        !/^[a-f0-9]{64}$/.test(root.targetDigest),
    )
  )
    throw new Error('R13 item throw: augmentation evidence root 无效')
  const rootById = new Map(evidence.roots.map((root) => [root.itemId, root]))
  if (rootById.size !== evidence.roots.length)
    throw new Error('R13 item throw: augmentation evidence root id 重复')
  const expectedObservationIds = evidence.roots.flatMap((root) => {
    const kind = observationKind(root)
    return kind ? [observationId(root.itemId, kind)] : []
  })
  if (
    evidence.observations.length !== 59 ||
    evidence.observations.some(
      (observation, index) => observation.id !== expectedObservationIds[index],
    ) ||
    new Set(evidence.observations.map((observation) => observation.id)).size !== 59
  )
    throw new Error('R13 item throw: disposition observation 集合漂移')
  for (const observation of evidence.observations) {
    const root = rootById.get(observation.itemId)
    const expectedKind = root ? observationKind(root) : undefined
    if (
      !root ||
      !expectedKind ||
      observation.id !== observationId(root.itemId, expectedKind) ||
      observation.kind !== expectedKind ||
      observation.sourceRootId !== `global/items/${root.itemId}/scriptOnThrow` ||
      observation.sourceAddress !== root.sourceAddress ||
      observation.sourceClosureDigest !== root.sourceClosureDigest ||
      observation.successorTargetDigest !== root.targetDigest ||
      !isDeepStrictEqual(observation.layers, {
        raw: 'open',
        augmented: 'accounted',
        final: 'accounted',
      })
    )
      throw new Error(`R13 item throw: disposition observation ${observation.id} 与 root 漂移`)
    if (expectedKind === 'present-lossy-throw') {
      if (
        root.itemId !== '133' ||
        !/^[a-f0-9]{64}$/.test(observation.rawTargetDigest ?? '') ||
        !/^[a-f0-9]{64}$/.test(observation.normalizedParentTargetDigest ?? '') ||
        observation.normalizedParentTargetDigest === observation.successorTargetDigest
      )
        throw new Error('R13 item throw: 133 present-lossy observation 无效')
    } else if (
      observation.rawTargetDigest !== null ||
      observation.normalizedParentTargetDigest !== null
    )
      throw new Error(`R13 item throw: absent observation ${observation.id} 携带 parent digest`)
  }
  const observationItemIds = (kind: R13ItemThrowObservationKind): string[] =>
    evidence.observations
      .filter((observation) => observation.kind === kind)
      .map((observation) => observation.itemId)
  if (
    !isDeepStrictEqual(observationItemIds('pending-throw'), evidence.diagnostics.pendingIds) ||
    !isDeepStrictEqual(
      observationItemIds('silent-empty-throw'),
      evidence.diagnostics.silentEmptyIds,
    ) ||
    !isDeepStrictEqual(observationItemIds('present-lossy-throw'), evidence.diagnostics.correctedIds)
  )
    throw new Error('R13 item throw: disposition observation 与 diagnostics 漂移')
}

export function assertR13ItemThrowDispositionBacked(
  parentSnapshot: MigrationSnapshot,
  successorSnapshot: MigrationSnapshot,
  evidence: R13ItemThrowAugmentationEvidenceV1,
): void {
  assertR13ItemThrowAugmentationEvidence(evidence)
  const parentItems = parentSnapshot.files.get('content/items.json')
  const successorItems = successorSnapshot.files.get('content/items.json')
  if (!Array.isArray(parentItems) || !Array.isArray(successorItems))
    throw new Error('R13 item throw: disposition snapshot 缺 items')
  const parentById = new Map(
    (parentItems as unknown as ItemDataV5[]).map((item) => [item.id, item]),
  )
  const successorById = new Map(
    (successorItems as unknown as ItemDataV5[]).map((item) => [item.id, item]),
  )
  const rebuilt = evidence.roots.flatMap((root): R13ItemThrowDispositionObservationV1[] => {
    const rawParent = parentById.get(root.itemId)?.throw
    const normalizedParent = normalizedParentThrow(rawParent)
    const successor = successorById.get(root.itemId)?.throw
    if (!successor) throw new Error(`R13 item throw: disposition successor 缺 ${root.itemId}`)
    const rawTargetDigest = rawParent ? stableJsonSha256(rawParent) : null
    const normalizedParentTargetDigest = normalizedParent
      ? stableJsonSha256(normalizedParent)
      : null
    const successorTargetDigest = stableJsonSha256(successor)
    const kind =
      rawParent === undefined
        ? root.family === '0x42'
          ? 'silent-empty-throw'
          : 'pending-throw'
        : normalizedParentTargetDigest !== successorTargetDigest
          ? 'present-lossy-throw'
          : undefined
    if (!kind) return []
    return [
      {
        id: observationId(root.itemId, kind),
        itemId: root.itemId,
        sourceRootId: `global/items/${root.itemId}/scriptOnThrow`,
        sourceAddress: root.sourceAddress,
        kind,
        sourceClosureDigest: root.sourceClosureDigest,
        rawTargetDigest,
        normalizedParentTargetDigest,
        successorTargetDigest,
        layers: { raw: 'open', augmented: 'accounted', final: 'accounted' },
      },
    ]
  })
  if (!isDeepStrictEqual(rebuilt, evidence.observations))
    throw new Error('R13 item throw: snapshot-backed disposition 漂移')
}

export function assertR13ItemThrowFinalTargetClosure(
  snapshot: MigrationSnapshot,
  evidence: R13ItemThrowAugmentationEvidenceV1,
): void {
  assertR13ItemThrowAugmentationEvidence(evidence)
  const rawItems = snapshot.files.get('content/items.json')
  if (!Array.isArray(rawItems)) throw new Error('R13 item throw: final content/items.json 无效')
  const items = rawItems as unknown as ItemDataV5[]
  const byId = new Map(items.map((item) => [item.id, item]))
  const finalIds = items
    .filter((item) => item.throw !== undefined)
    .map((item) => Number(item.id))
    .sort((left, right) => left - right)
  assertExactIds(finalIds, R13_ITEM_THROW_TRANSITION_IDS, 'R13 item throw final ids')
  for (const root of evidence.roots) {
    const thrown = byId.get(root.itemId)?.throw
    if (!thrown) throw new Error(`R13 item throw: final 缺 ${root.itemId}.throw`)
    checkThrowSpec(thrown, `R13 item throw final ${root.itemId}`)
    if (stableJsonSha256(thrown) !== root.targetDigest)
      throw new Error(`R13 item throw: final ${root.itemId}.throw digest 漂移`)
  }
  for (const observation of evidence.observations) {
    const thrown = byId.get(observation.itemId)?.throw
    if (!thrown || stableJsonSha256(thrown) !== observation.successorTargetDigest)
      throw new Error(`R13 item throw: final observation ${observation.id} 漂移`)
  }
  if (
    stableJsonSha256(
      evidence.roots.map(({ itemId, targetDigest }) => ({ itemId, targetDigest })),
    ) !== evidence.targetDigest
  )
    throw new Error('R13 item throw: final target 总摘要漂移')
}

export function augmentR13ItemThrows(args: {
  snapshot: MigrationSnapshot
  itemSources: readonly SourceItem[]
  magicSources: readonly SourceMagic[]
  objectMagicSources: readonly SourceObjectMagic[]
  sourceCommands: readonly SourceCmd[]
  soundAssetForNum?: SoundAssetForNum
}): R13ItemThrowAugmentation {
  const sourceItems = args.itemSources
    .filter((item) => item.flags.throwable && item.scriptOnThrow > 0)
    .sort((left, right) => left.id - right.id)
  assertExactIds(
    sourceItems.map((item) => item.id),
    R13_ITEM_THROW_TRANSITION_IDS,
    'R13 item throw source ids',
  )
  const objectById = new Map(args.objectMagicSources.map((object) => [object.id, object]))
  const magicById = new Map(args.magicSources.map((magic) => [magic.id, magic]))
  const snapshot = cloneSnapshot(args.snapshot)
  const rawPoisons = snapshot.files.get('content/poisons.json')
  if (!Array.isArray(rawPoisons)) throw new Error('R13 item throw: content/poisons.json 无效')
  const poisonById = new Map<number, PoisonDef>()
  for (const value of rawPoisons) {
    const poison = value as unknown as PoisonDef
    if (!Number.isSafeInteger(poison.id) || poisonById.has(poison.id))
      throw new Error(`R13 item throw: poison id 无效或重复 ${String(poison.id)}`)
    poisonById.set(poison.id, poison)
  }
  const rawItems = snapshot.files.get('content/items.json')
  if (!Array.isArray(rawItems)) throw new Error('R13 item throw: content/items.json 无效')
  const items = structuredClone(rawItems) as unknown as ItemDataV5[]
  const byId = new Map(items.map((item) => [item.id, item]))
  const roots: R13ItemThrowRootEvidenceV1[] = []
  const familyCounts = Object.fromEntries(
    Object.keys(EXPECTED_FAMILY_COUNTS).map((family) => [family, 0]),
  ) as Record<R13ItemThrowFamily, number>
  const pendingIds: string[] = []
  const silentEmptyIds: string[] = []
  const observations: R13ItemThrowDispositionObservationV1[] = []

  for (const sourceItem of sourceItems) {
    const targetItem = byId.get(String(sourceItem.id))
    if (!targetItem) throw new Error(`R13 item throw: target 缺物品 ${sourceItem.id}`)
    const rows = sourceRows(args.sourceCommands, sourceItem.scriptOnThrow)
    const built = buildThrow({
      item: sourceItem,
      rows,
      sourceCommands: args.sourceCommands,
      poisonById,
      objectById,
      magicById,
      ...(args.soundAssetForNum ? { soundAssetForNum: args.soundAssetForNum } : {}),
    })
    familyCounts[built.family]++
    const rawParent = targetItem.throw ? structuredClone(targetItem.throw) : undefined
    const parent = normalizedParentThrow(rawParent)
    let parentDisposition: R13ItemThrowRootEvidenceV1['parentDisposition']
    if (!parent) {
      parentDisposition = 'absent'
      if (built.family === '0x42') silentEmptyIds.push(String(sourceItem.id))
      else pendingIds.push(String(sourceItem.id))
    } else if (isDeepStrictEqual(parent, built.spec)) {
      parentDisposition = 'present-exact'
    } else if (sourceItem.id === 133) {
      parentDisposition = 'present-lossy'
    } else {
      throw new Error(`R13 item throw: 物品 ${sourceItem.id} parent 出现未登记语义漂移`)
    }
    const sourceClosure = {
      item: {
        id: sourceItem.id,
        scriptOnThrow: sourceItem.scriptOnThrow,
        flags: {
          throwable: sourceItem.flags.throwable,
          applyToAll: sourceItem.flags.applyToAll,
        },
      },
      rows,
      resolvedMagics: built.resolvedMagics,
      failureExits: built.failureExits,
    }
    const root: R13ItemThrowRootEvidenceV1 = {
      itemId: String(sourceItem.id),
      sourceAddress: sourceItem.scriptOnThrow,
      family: built.family,
      target: built.spec.target,
      parentDisposition,
      sentinelPresentationOnly: built.sentinelPresentationOnly,
      sourceClosureDigest: stableJsonSha256(sourceClosure),
      targetDigest: stableJsonSha256(built.spec),
    }
    roots.push(root)
    const kind = observationKind(root)
    if (kind)
      observations.push({
        id: observationId(root.itemId, kind),
        itemId: root.itemId,
        sourceRootId: `global/items/${root.itemId}/scriptOnThrow`,
        sourceAddress: root.sourceAddress,
        kind,
        sourceClosureDigest: root.sourceClosureDigest,
        rawTargetDigest: rawParent ? stableJsonSha256(rawParent) : null,
        normalizedParentTargetDigest: parent ? stableJsonSha256(parent) : null,
        successorTargetDigest: root.targetDigest,
        layers: { raw: 'open', augmented: 'accounted', final: 'accounted' },
      })
    targetItem.throw = structuredClone(built.spec)
  }

  if (!isDeepStrictEqual(familyCounts, EXPECTED_FAMILY_COUNTS))
    throw new Error(`R13 item throw: family counts 漂移 ${JSON.stringify(familyCounts)}`)
  const dispositionCounts = {
    absent: roots.filter((root) => root.parentDisposition === 'absent').length,
    lossy: roots.filter((root) => root.parentDisposition === 'present-lossy').length,
    exact: roots.filter((root) => root.parentDisposition === 'present-exact').length,
  }
  if (
    dispositionCounts.absent !== 58 ||
    dispositionCounts.lossy !== 1 ||
    dispositionCounts.exact !== 17 ||
    pendingIds.length !== 48 ||
    silentEmptyIds.length !== 10
  )
    throw new Error(`R13 item throw: parent 总账漂移 ${JSON.stringify(dispositionCounts)}`)
  assertExactIds(
    roots.filter((root) => root.target === 'allEnemies').map((root) => Number(root.itemId)),
    R13_ITEM_THROW_ALL_TARGET_IDS,
    'R13 item throw all-target ids',
  )
  assertExactIds(
    roots.filter((root) => root.sentinelPresentationOnly).map((root) => Number(root.itemId)),
    R13_ITEM_THROW_SENTINEL_IDS,
    'R13 item throw sentinel ids',
  )

  snapshot.files.set('content/items.json', asJson(items))
  snapshot.managedFiles.add('content/items.json')
  const evidence = digestRecord<R13ItemThrowAugmentationEvidenceV1>({
    kind: 'r13-item-throw-augmentation-evidence',
    version: 1,
    projectId: 'pal',
    generator: { id: 'r13-item-throw-augmentation', version: 1 },
    summary: {
      sourceRoots: 76,
      finalRunnableThrows: 76,
      missing: 0,
      restoredAbsent: 58,
      correctedLossy: 1,
      existingExact: 17,
      allTargets: 11,
      oneTargets: 65,
      sentinelPresentationOnly: 29,
      rootObservations: 59,
      pendingObservations: 48,
      silentEmptyObservations: 10,
      lossyObservations: 1,
      openRootObservations: 0,
      familyCounts,
    },
    diagnostics: {
      pendingIds,
      silentEmptyIds,
      correctedIds: ['133'],
      openItemIds: [],
    },
    sourceDigest: stableJsonSha256(
      roots.map(({ itemId, sourceAddress, sourceClosureDigest }) => ({
        itemId,
        sourceAddress,
        sourceClosureDigest,
      })),
    ),
    targetDigest: stableJsonSha256(
      roots.map(({ itemId, targetDigest }) => ({ itemId, targetDigest })),
    ),
    roots,
    observations,
  })
  assertR13ItemThrowDispositionBacked(args.snapshot, snapshot, evidence)
  assertR13ItemThrowFinalTargetClosure(snapshot, evidence)
  return { snapshot, evidence }
}
