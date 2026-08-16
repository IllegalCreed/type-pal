import { isDeepStrictEqual } from 'node:util'
import {
  checkSharedScriptLibraryV13,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type DialogueIdentityProjectV13,
  downgradeDialogueTreeV14ToV13,
  type LegacyManifestV13,
  type ManifestV14,
  upgradeDialogueIdentityProjectV13ToV14,
  upgradeManifestV13ToV14,
  validateActors,
  validateDialogueIdentityReferencesV14,
  validateEnemies,
  validateEnemiesV14,
  validateItemsV5,
  validateItemsV14,
  validateProjectRelativePath,
  validateScenesV13,
  validateScenesV14,
  validateSharedScriptsV14,
} from '@type-pal/content'
import { stableJsonSha256, stableStringCompare } from './experimental/script-v5/stable-json.js'
import {
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
  snapshotFileHash,
} from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'
import { rewindPublishedW9PublicationIfPresent } from './pal-w9-entity-lifecycle.js'

export const C1_DIALOGUE_IDENTITY_TRANSITION_ID = 'c1-dialogue-identity-v1' as const
export const C1_DIALOGUE_IDENTITY_SEAL_PATH = '_transitions/c1-dialogue-identity-v1.json' as const
const W9_TRANSITION_ID = 'w9-entity-lifecycle-v1' as const

interface C1FileSealV1 {
  path: string
  parentSha256: string
  successorSha256: string
  /** Only cues whose legacy speaker/portrait keys were separated need raw-key-order restoration. */
  legacyCueOrders: Array<{ pointer: string; keys: string[] }>
}

export interface C1DialogueIdentityTransitionSealV1 {
  kind: 'c1-dialogue-identity-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof C1_DIALOGUE_IDENTITY_TRANSITION_ID
  methodVersion: 'c1-dialogue-identity-upgrade-v1'
  parent: { transitionId: typeof W9_TRANSITION_ID; sealDigest: string }
  source: {
    files: C1FileSealV1[]
    filesDigest: string
    summary: { scenes: number; items: number; sharedScripts: number; enemies: number; total: number }
  }
  successor: {
    contentVersion: 14
    minimumSaveVersion: 8
    manifestDigest: string
    surfaceDigest: string
  }
  digest: string
}

export interface C1DialogueIdentityBuildResult {
  parentW9: MigrationSnapshot
  successor: MigrationSnapshot
  seal: C1DialogueIdentityTransitionSealV1
  manifest: ManifestV14
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map([...source.files].map(([path, value]) => [path, structuredClone(value)])),
    managedFiles: new Set(source.managedFiles),
    hashes: new Map(source.hashes ?? []),
    ...(source.baselineMetadata ? { baselineMetadata: structuredClone(source.baselineMetadata) } : {}),
  }
}

function fileHash(value: MigrationJson, path: string): string {
  return sha256(serializeMigrationJson(value, path))
}

function requiredFile(snapshot: MigrationSnapshot, path: string): MigrationJson {
  const value = snapshot.files.get(path)
  if (value === undefined) throw new Error(`C1-2: snapshot 缺 ${path}`)
  const actual = fileHash(value, path)
  const recorded = snapshot.hashes?.get(path)
  if (recorded !== undefined && recorded !== actual)
    throw new Error(`C1-2: ${path} 正文与 recorded hash 不符`)
  return value
}

function pointerToken(value: string): string {
  return value.replace(/~/g, '~0').replace(/\//g, '~1')
}

function pointer(tokens: readonly string[]): string {
  return tokens.length ? `/${tokens.map(pointerToken).join('/')}` : ''
}

function decodePointer(value: string): string[] {
  if (!value.startsWith('/')) throw new Error(`C1-2: JSON pointer 非法 ${value}`)
  return value
    .slice(1)
    .split('/')
    .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'))
}

function collectLegacyCueOrders(value: MigrationJson): Array<{ pointer: string; keys: string[] }> {
  const result: Array<{ pointer: string; keys: string[] }> = []
  const visit = (node: unknown, tokens: string[]): void => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, [...tokens, String(index)]))
      return
    }
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (record.kind === 'dialog' && record.cue && typeof record.cue === 'object') {
      const keys = Object.keys(record.cue as Record<string, unknown>)
      const positions = keys
        .map((key, index) => (key === 'speaker' || key === 'portrait' ? index : -1))
        .filter((index) => index >= 0)
      if (positions.length === 2 && positions[1]! !== positions[0]! + 1)
        result.push({ pointer: pointer([...tokens, 'cue']), keys })
    }
    for (const [key, child] of Object.entries(record)) visit(child, [...tokens, key])
  }
  visit(value, [])
  return result.sort((left, right) => stableStringCompare(left.pointer, right.pointer))
}

function restoreLegacyCueOrders(
  value: MigrationJson,
  orders: readonly { pointer: string; keys: readonly string[] }[],
): MigrationJson {
  const root = structuredClone(value) as unknown
  for (const order of orders) {
    const tokens = decodePointer(order.pointer)
    if (!tokens.length) throw new Error('C1-2 rewind: cue pointer 不得指向根')
    let parent: unknown = root
    for (const token of tokens.slice(0, -1)) {
      if (Array.isArray(parent)) {
        const index = Number(token)
        if (!Number.isSafeInteger(index) || index < 0 || index >= parent.length)
          throw new Error(`C1-2 rewind: cue pointer 数组越界 ${order.pointer}`)
        parent = parent[index]
      } else if (parent && typeof parent === 'object') {
        parent = (parent as Record<string, unknown>)[token]
      } else throw new Error(`C1-2 rewind: cue pointer 不可解析 ${order.pointer}`)
    }
    const leaf = tokens.at(-1)!
    const cue = Array.isArray(parent)
      ? parent[Number(leaf)]
      : parent && typeof parent === 'object'
        ? (parent as Record<string, unknown>)[leaf]
        : undefined
    if (!cue || typeof cue !== 'object' || Array.isArray(cue))
      throw new Error(`C1-2 rewind: cue pointer 非对象 ${order.pointer}`)
    const cueRecord = cue as Record<string, unknown>
    if (
      order.keys.length !== Object.keys(cueRecord).length ||
      order.keys.some((key) => !(key in cueRecord))
    )
      throw new Error(`C1-2 rewind: cue 字段集合漂移 ${order.pointer}`)
    const reordered = Object.fromEntries(order.keys.map((key) => [key, cueRecord[key]]))
    if (Array.isArray(parent)) parent[Number(leaf)] = reordered
    else (parent as Record<string, unknown>)[leaf] = reordered
  }
  return root as MigrationJson
}

function firstKeyOrderMismatch(left: unknown, right: unknown, path = ''): string | undefined {
  if (Array.isArray(left) && Array.isArray(right)) {
    for (let index = 0; index < left.length; index++) {
      const mismatch = firstKeyOrderMismatch(left[index], right[index], `${path}/${index}`)
      if (mismatch) return mismatch
    }
    return undefined
  }
  if (
    left &&
    right &&
    typeof left === 'object' &&
    typeof right === 'object' &&
    !Array.isArray(left) &&
    !Array.isArray(right)
  ) {
    const leftRecord = left as Record<string, unknown>
    const rightRecord = right as Record<string, unknown>
    const leftKeys = Object.keys(leftRecord)
    const rightKeys = Object.keys(rightRecord)
    if (!isDeepStrictEqual(leftKeys, rightKeys))
      return `${path || '/'} expected=${leftKeys.join(',')} actual=${rightKeys.join(',')}`
    for (const key of leftKeys) {
      const mismatch = firstKeyOrderMismatch(
        leftRecord[key],
        rightRecord[key],
        `${path}/${pointerToken(key)}`,
      )
      if (mismatch) return mismatch
    }
  }
  return undefined
}

function contentPath(
  manifest: LegacyManifestV13 | ManifestV14,
  key: string,
  required = false,
): string | undefined {
  const value = manifest.content[key]
  if (value === undefined) {
    if (required) throw new Error(`C1-2: manifest.content.${key} 缺失`)
    return undefined
  }
  return validateProjectRelativePath(value, `manifest.content.${key}`)
}

function sceneDirectory(manifest: LegacyManifestV13 | ManifestV14): string {
  const raw = manifest.content.scenes ?? 'content/scenes/'
  const trimmed = raw.endsWith('/') ? raw.slice(0, -1) : raw
  validateProjectRelativePath(trimmed, 'manifest.content.scenes')
  return `${trimmed}/`
}

function sceneIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !id))
    throw new Error('C1-2: scenes/index.json 期望非空 string[]')
  if (new Set(value).size !== value.length) throw new Error('C1-2: scene id 重复')
  return value as string[]
}

function surfaceDigest(snapshot: MigrationSnapshot, files: readonly C1FileSealV1[]): string {
  return stableJsonSha256({
    parentW9: snapshot.baselineMetadata?.transitions[W9_TRANSITION_ID],
    files: files.map(({ path, successorSha256 }) => ({ path, successorSha256 })),
  })
}

function sealBody(
  value: C1DialogueIdentityTransitionSealV1,
): Omit<C1DialogueIdentityTransitionSealV1, 'digest'> {
  const { digest: _digest, ...body } = value
  return body
}

function assertSeal(value: C1DialogueIdentityTransitionSealV1, label: string): void {
  if (
    value.kind !== 'c1-dialogue-identity-transition' ||
    value.version !== 1 ||
    value.projectId !== 'pal' ||
    value.transitionId !== C1_DIALOGUE_IDENTITY_TRANSITION_ID ||
    value.methodVersion !== 'c1-dialogue-identity-upgrade-v1'
  )
    throw new Error(`${label}: identity 漂移`)
  if (!/^[a-f0-9]{64}$/.test(value.parent.sealDigest))
    throw new Error(`${label}.parent.sealDigest: 非 sha256`)
  const paths = value.source.files.map((entry) => entry.path)
  const sorted = [...paths].sort(stableStringCompare)
  if (!isDeepStrictEqual(paths, sorted) || new Set(paths).size !== paths.length)
    throw new Error(`${label}.source.files: 未规范排序或重复`)
  for (const entry of value.source.files)
    if (
      !/^[a-f0-9]{64}$/.test(entry.parentSha256) ||
      !/^[a-f0-9]{64}$/.test(entry.successorSha256)
    )
      throw new Error(`${label}.source.files: hash 非法 ${entry.path}`)
  for (const entry of value.source.files) {
    const pointers = entry.legacyCueOrders.map((order) => order.pointer)
    if (
      !isDeepStrictEqual(pointers, [...pointers].sort(stableStringCompare)) ||
      new Set(pointers).size !== pointers.length
    )
      throw new Error(`${label}.source.files.${entry.path}.legacyCueOrders: 未规范排序或重复`)
    for (const order of entry.legacyCueOrders) {
      const speaker = order.keys.indexOf('speaker')
      const portrait = order.keys.indexOf('portrait')
      if (
        !order.pointer.startsWith('/') ||
        speaker < 0 ||
        portrait < 0 ||
        Math.abs(speaker - portrait) <= 1 ||
        new Set(order.keys).size !== order.keys.length
      )
        throw new Error(`${label}.source.files.${entry.path}.legacyCueOrders: 非必要或非法 order`)
    }
  }
  if (stableJsonSha256(value.source.files) !== value.source.filesDigest)
    throw new Error(`${label}.source.filesDigest: 不符`)
  if (value.source.summary.total !== 6235)
    throw new Error(`${label}.source.summary.total: PAL 冻结值应为 6235`)
  if (value.successor.contentVersion !== 14 || value.successor.minimumSaveVersion !== 8)
    throw new Error(`${label}.successor: 版本对漂移`)
  for (const digest of [
    value.source.filesDigest,
    value.successor.manifestDigest,
    value.successor.surfaceDigest,
    value.digest,
  ])
    if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error(`${label}: digest 非法`)
  if (stableJsonSha256(sealBody(value)) !== value.digest)
    throw new Error(`${label}: seal 自摘要不符`)
}

function hasMarker(snapshot: MigrationSnapshot): boolean {
  return (
    snapshot.baselineMetadata?.transitions[C1_DIALOGUE_IDENTITY_TRANSITION_ID] !== undefined ||
    snapshot.files.has(C1_DIALOGUE_IDENTITY_SEAL_PATH) ||
    snapshot.managedFiles.has(C1_DIALOGUE_IDENTITY_SEAL_PATH) ||
    snapshot.hashes?.has(C1_DIALOGUE_IDENTITY_SEAL_PATH) === true
  )
}

/** Validate the merged project view, not only the generated successor, before publication. */
export function validateC1ProjectV14Target(args: {
  target: MigrationSnapshot
  manifest: ManifestV14
}): void {
  if (args.manifest.contentVersion !== 14)
    throw new Error(`C1-2 target: 只接受 content14，收到 content${args.manifest.contentVersion}`)
  if (args.manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(
      `C1-2 target: minimumSaveVersion 应为 ${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}`,
    )
  const dir = sceneDirectory(args.manifest)
  const ids = sceneIds(requiredFile(args.target, `${dir}index.json`))
  const scenes = validateScenesV14(
    ids.map((id) => requiredFile(args.target, `${dir}${id}.json`)),
  )
  const actors = validateActors(
    requiredFile(args.target, contentPath(args.manifest, 'actors', true)!),
  )
  const items = validateItemsV14(
    requiredFile(args.target, contentPath(args.manifest, 'items', true)!),
  )
  const enemiesPath = contentPath(args.manifest, 'enemies')
  const enemies = enemiesPath ? validateEnemiesV14(requiredFile(args.target, enemiesPath)) : []
  const sharedPath = contentPath(args.manifest, 'sharedScripts')
  const sharedScripts = sharedPath
    ? validateSharedScriptsV14(requiredFile(args.target, sharedPath))
    : {}
  validateDialogueIdentityReferencesV14({ scenes, items, sharedScripts, enemies, actors })
}

export function rewindPublishedC1DialogueIdentityIfPresent(
  source: MigrationSnapshot,
  manifest?: ManifestV14,
): MigrationSnapshot {
  if (!hasMarker(source)) return source
  const metadataDigest = source.baselineMetadata?.transitions[C1_DIALOGUE_IDENTITY_TRANSITION_ID]
  const raw = source.files.get(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  const recorded = source.hashes?.get(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  if (
    metadataDigest === undefined ||
    raw === undefined ||
    recorded === undefined ||
    !source.managedFiles.has(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  )
    throw new Error('C1-2 rewind: transition metadata/file/managed/hash 半状态')
  const seal = raw as unknown as C1DialogueIdentityTransitionSealV1
  assertSeal(seal, 'C1-2 rewind seal')
  if (metadataDigest !== seal.digest) throw new Error('C1-2 rewind: metadata digest 不符')
  if (fileHash(asJson(seal), C1_DIALOGUE_IDENTITY_SEAL_PATH) !== recorded)
    throw new Error('C1-2 rewind: seal 文件 hash 不符')
  if (manifest && stableJsonSha256(manifest) !== seal.successor.manifestDigest)
    throw new Error('C1-2 rewind: manifest digest 不符')

  const parent = cloneSnapshot(source)
  for (const entry of seal.source.files) {
    const successor = requiredFile(parent, entry.path)
    if (fileHash(successor, entry.path) !== entry.successorSha256)
      throw new Error(`C1-2 rewind: successor 漂移 ${entry.path}`)
    const downgraded = restoreLegacyCueOrders(
      asJson(downgradeDialogueTreeV14ToV13(successor)),
      entry.legacyCueOrders,
    )
    if (fileHash(downgraded, entry.path) !== entry.parentSha256)
      throw new Error(`C1-2 rewind: parent 回投 hash 不符 ${entry.path}`)
    parent.files.set(entry.path, downgraded)
    parent.hashes?.set(entry.path, entry.parentSha256)
  }
  parent.files.delete(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  parent.managedFiles.delete(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  parent.hashes?.delete(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  if (parent.baselineMetadata)
    delete parent.baselineMetadata.transitions[C1_DIALOGUE_IDENTITY_TRANSITION_ID]
  // 验 W9 authority；返回值是更老 parent，只用于验证，不替换当前 W9 surface。
  void rewindPublishedW9PublicationIfPresent(parent)
  if (parent.baselineMetadata?.transitions[W9_TRANSITION_ID] !== seal.parent.sealDigest)
    throw new Error('C1-2 rewind: W9 parent seal digest 不符')
  return parent
}

/** Fold only C1-owned dialogue identities in a live project while preserving unrelated edits. */
export function rewindPublishedC1ProjectAgainstPublishedBaseline(
  project: MigrationSnapshot,
  publishedBaseline: MigrationSnapshot,
): MigrationSnapshot {
  if (!hasMarker(publishedBaseline)) {
    if (hasMarker(project)) throw new Error('C1-2 project rewind: baseline 无 C1 但工程存在 orphan marker')
    return project
  }
  // Validate the complete published authority before trusting its per-file order ledger.
  void rewindPublishedC1DialogueIdentityIfPresent(publishedBaseline)
  const baselineRaw = publishedBaseline.files.get(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  const baselineHash = publishedBaseline.hashes?.get(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  if (baselineRaw === undefined || baselineHash === undefined)
    throw new Error('C1-2 project rewind: published seal 四态不完整')
  const seal = baselineRaw as unknown as C1DialogueIdentityTransitionSealV1
  assertSeal(seal, 'C1-2 project rewind authority seal')

  const projectRaw = project.files.get(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  const projectHash = project.hashes?.get(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  if (
    projectRaw === undefined ||
    projectHash === undefined ||
    !project.managedFiles.has(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  )
    throw new Error('C1-2 project rewind: 工程 seal 四态不完整')
  if (!isDeepStrictEqual(projectRaw, baselineRaw) || projectHash !== baselineHash)
    throw new Error('C1-2 project rewind: 工程 seal 与 published authority 不符')
  if (fileHash(asJson(projectRaw), C1_DIALOGUE_IDENTITY_SEAL_PATH) !== projectHash)
    throw new Error('C1-2 project rewind: 工程 seal hash 不符')
  if (project.baselineMetadata?.transitions[C1_DIALOGUE_IDENTITY_TRANSITION_ID] !== undefined)
    throw new Error('C1-2 project rewind: 工程不得携带 baseline transition metadata')

  const parent = cloneSnapshot(project)
  for (const entry of seal.source.files) {
    const successor = requiredFile(parent, entry.path)
    const downgraded = restoreLegacyCueOrders(
      asJson(downgradeDialogueTreeV14ToV13(successor)),
      entry.legacyCueOrders,
    )
    parent.files.set(entry.path, downgraded)
    parent.hashes?.set(entry.path, fileHash(downgraded, entry.path))
  }
  parent.files.delete(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  parent.managedFiles.delete(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  parent.hashes?.delete(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  return parent
}

export function buildPalC1DialogueIdentityMigration(args: {
  baseline: MigrationSnapshot
  manifest: LegacyManifestV13 | ManifestV14
}): C1DialogueIdentityBuildResult {
  const parentW9 = rewindPublishedC1DialogueIdentityIfPresent(
    args.baseline,
    args.manifest.contentVersion === 14 ? args.manifest : undefined,
  )
  const w9Digest = parentW9.baselineMetadata?.transitions[W9_TRANSITION_ID]
  if (!w9Digest) throw new Error('C1-2: parent 缺 W9 published authority')
  void rewindPublishedW9PublicationIfPresent(parentW9)
  const dir = sceneDirectory(args.manifest)
  const ids = sceneIds(requiredFile(parentW9, `${dir}index.json`))
  const scenePaths = ids.map((id) => `${dir}${id}.json`)
  const sceneValues = scenePaths.map((path) => requiredFile(parentW9, path))
  validateScenesV13(sceneValues)
  const scenes = sceneValues as unknown as DialogueIdentityProjectV13['scenes']
  const itemsPath = contentPath(args.manifest, 'items', true)!
  const itemsValue = requiredFile(parentW9, itemsPath)
  validateItemsV5(itemsValue)
  const items = itemsValue as unknown as DialogueIdentityProjectV13['items']
  const enemiesPath = contentPath(args.manifest, 'enemies')
  const enemiesValue = enemiesPath ? requiredFile(parentW9, enemiesPath) : []
  validateEnemies(enemiesValue)
  const enemies = enemiesValue as unknown as DialogueIdentityProjectV13['enemies']
  const sharedPath = contentPath(args.manifest, 'sharedScripts')
  const sharedScriptsValue = sharedPath ? requiredFile(parentW9, sharedPath) : {}
  const sharedScripts =
    sharedScriptsValue as unknown as DialogueIdentityProjectV13['sharedScripts']
  checkSharedScriptLibraryV13(sharedScripts)
  const upgraded = upgradeDialogueIdentityProjectV13ToV14({
    scenes,
    items,
    sharedScripts,
    enemies,
  })
  if (!isDeepStrictEqual(upgraded.summary, {
    scenes: 5995,
    items: 23,
    sharedScripts: 0,
    enemies: 217,
    total: 6235,
  }))
    throw new Error(`C1-2: PAL cue census 漂移 ${JSON.stringify(upgraded.summary)}`)

  const successor = cloneSnapshot(parentW9)
  const replaceSuccessorFile = (path: string, value: unknown): void => {
    successor.files.set(path, asJson(value))
    successor.hashes?.delete(path)
  }
  scenePaths.forEach((path, index) =>
    replaceSuccessorFile(path, upgraded.project.scenes[index]!),
  )
  replaceSuccessorFile(itemsPath, upgraded.project.items)
  if (enemiesPath) replaceSuccessorFile(enemiesPath, upgraded.project.enemies)
  if (sharedPath) replaceSuccessorFile(sharedPath, upgraded.project.sharedScripts)
  const allPaths = [...scenePaths, itemsPath, ...(enemiesPath ? [enemiesPath] : []), ...(sharedPath ? [sharedPath] : [])]
    .sort(stableStringCompare)
  const files = allPaths.map((path) => {
    const parentValue = requiredFile(parentW9, path)
    const parentSha256 = snapshotFileHash(parentW9, path)
    const successorValue = requiredFile(successor, path)
    if (!parentSha256) throw new Error(`C1-2: parent 缺 hash ${path}`)
    const successorSha256 = fileHash(successorValue, path)
    successor.hashes?.set(path, successorSha256)
    const legacyCueOrders = collectLegacyCueOrders(parentValue)
    const restored = restoreLegacyCueOrders(
      asJson(downgradeDialogueTreeV14ToV13(successorValue)),
      legacyCueOrders,
    )
    if (fileHash(restored, path) !== parentSha256)
      throw new Error(
        `C1-2: pre-seal 回投 hash 不符 ${path}; ` +
          `${firstKeyOrderMismatch(parentValue, restored) ?? 'value mismatch'}`,
      )
    return {
      path,
      parentSha256,
      successorSha256,
      legacyCueOrders,
    }
  })
  const manifest =
    args.manifest.contentVersion === 13
      ? upgradeManifestV13ToV14(args.manifest)
      : structuredClone(args.manifest)
  const body: Omit<C1DialogueIdentityTransitionSealV1, 'digest'> = {
    kind: 'c1-dialogue-identity-transition',
    version: 1,
    projectId: 'pal',
    transitionId: C1_DIALOGUE_IDENTITY_TRANSITION_ID,
    methodVersion: 'c1-dialogue-identity-upgrade-v1',
    parent: { transitionId: W9_TRANSITION_ID, sealDigest: w9Digest },
    source: {
      files,
      filesDigest: stableJsonSha256(files),
      summary: upgraded.summary,
    },
    successor: {
      contentVersion: 14,
      minimumSaveVersion: 8,
      manifestDigest: stableJsonSha256(manifest),
      surfaceDigest: surfaceDigest(successor, files),
    },
  }
  const seal = { ...body, digest: stableJsonSha256(body) }
  assertSeal(seal, 'C1-2 build seal')
  successor.files.set(C1_DIALOGUE_IDENTITY_SEAL_PATH, asJson(seal))
  successor.managedFiles.add(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  successor.hashes?.set(
    C1_DIALOGUE_IDENTITY_SEAL_PATH,
    fileHash(asJson(seal), C1_DIALOGUE_IDENTITY_SEAL_PATH),
  )
  if (!successor.baselineMetadata) throw new Error('C1-2: baseline metadata 缺失')
  successor.baselineMetadata.transitions[C1_DIALOGUE_IDENTITY_TRANSITION_ID] = seal.digest
  const rewound = rewindPublishedC1DialogueIdentityIfPresent(successor, manifest)
  for (const entry of files)
    if (snapshotFileHash(rewound, entry.path) !== entry.parentSha256)
      throw new Error(`C1-2: install→rewind 漂移 ${entry.path}`)
  return { parentW9, successor, seal, manifest }
}
