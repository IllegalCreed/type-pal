import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  type BattleSpriteDef,
  type BattleSpriteProfile,
  battleSpriteDefinitionFrameDemand,
  checkScriptLibrary,
  collectBattleSpriteDefinitionReferences,
  type LegacyManifestV3,
  normalizeScriptLibrary,
  palBattleSpriteAssetId,
  type ScriptChunkV1,
  type ScriptIndexV1,
  validateActors,
  validateAssetCatalog,
  validateBattleSprites,
  validateEnemies,
  validateItems,
  validateManifestAssetConfigV3,
  validateProjectRelativePath,
  validateScenes,
  validateSkills,
} from '@type-pal/content'
import { compressGzip, decodeBattleSpriteAssetBytes, type FileSource } from '@type-pal/reforge'
import { sha256Hex } from './binary-signature.js'
import { writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'

const JOURNAL_PATH = '.type-pal/upgrade-local-v3-battle-sprites.json'
const DEFAULT_TABLE_PATH = 'content/battle-sprites.json'
const EMPTY_JSON_FINGERPRINT = '<interrupted-empty-file>'

type Channel = 'player' | 'enemy'

interface BinaryPlan {
  asset: AssetId
  sourcePath: string
  sourceAliases: string[]
  targetPath: string
  record: AssetRecordV1
}

interface UpgradeJournal {
  version: 1
  mode: 'legacy' | 'blank'
  projectId: string
  projectName: string
  legacyRoot?: string
  /** journal 创建前各受管 JSON 的语义摘要；null 表示当时不存在。 */
  sourceJsonSha256: Record<string, string | null>
  /** 会被清理的旧文件原始字节摘要；已按计划删除时恢复可见为缺失。 */
  sourceCleanupSha256: Record<string, string | null>
  /** 除 targetSha256 自身外的完整 journal payload 摘要。 */
  targetSha256: string
  nextJson: Record<string, unknown>
  binaryPlans: BinaryPlan[]
  cleanupPaths: string[]
}

interface PlannedAsset {
  asset: AssetId
  record: AssetRecordV1
  bytes: ArrayBuffer
  sourcePath: string
  frameCount: number
  binaryPlan: BinaryPlan
}

function objectAt(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${where}: 期望对象`)
  return value as Record<string, unknown>
}

function projectPath(value: unknown, where: string): string {
  if (typeof value !== 'string') throw new Error(`${where}: 期望工程相对路径`)
  return validateProjectRelativePath(value, where)
}

function joinPath(...parts: string[]): string {
  return parts
    .flatMap((part) => part.split('/'))
    .filter(Boolean)
    .join('/')
}

function isNotFound(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'NotFoundError'
}

async function readTextIfPresent(source: FileSource, path: string): Promise<string | undefined> {
  try {
    return await source.readText(path)
  } catch (cause) {
    if (isNotFound(cause)) return undefined
    throw cause
  }
}

async function readJsonIfPresent(source: FileSource, path: string): Promise<unknown | undefined> {
  const text = await readTextIfPresent(source, path)
  if (text === undefined) return undefined
  return JSON.parse(text) as unknown
}

async function readBytesIfPresent(
  source: FileSource,
  path: string,
): Promise<ArrayBuffer | undefined> {
  try {
    return await source.readBytes(path)
  } catch (cause) {
    if (isNotFound(cause)) return undefined
    throw cause
  }
}

function encodeJournal(journal: UpgradeJournal): ArrayBuffer {
  const bytes = new TextEncoder().encode(`${JSON.stringify(journal, null, 2)}\n`)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function semanticSha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableJson(value))
  return sha256Hex(bytes)
}

async function jsonSha256IfPresent(
  source: FileSource,
  path: string,
  allowInterruptedEmpty = false,
): Promise<string | null> {
  const text = await readTextIfPresent(source, path)
  if (text === undefined) return null
  if (allowInterruptedEmpty && text.trim() === '') return EMPTY_JSON_FINGERPRINT
  return semanticSha256(JSON.parse(text) as unknown)
}

async function captureJsonHashes(
  source: FileSource,
  paths: readonly string[],
  allowInterruptedEmpty = false,
): Promise<Record<string, string | null>> {
  return Object.fromEntries(
    await Promise.all(
      [...new Set(paths)].map(
        async (path) =>
          [path, await jsonSha256IfPresent(source, path, allowInterruptedEmpty)] as const,
      ),
    ),
  )
}

async function captureCleanupHashes(
  source: FileSource,
  paths: readonly string[],
): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    [...new Set(paths)].map(async (path) => {
      const bytes = await readBytesIfPresent(source, path)
      return [path, bytes ? await sha256Hex(bytes) : null] as const
    }),
  )
  return Object.fromEntries(entries)
}

function journalPayload(journal: Omit<UpgradeJournal, 'targetSha256'>): unknown {
  return journal
}

async function finishJournal(
  journal: Omit<UpgradeJournal, 'targetSha256'>,
): Promise<UpgradeJournal> {
  return { ...journal, targetSha256: await semanticSha256(journalPayload(journal)) }
}

function stableJson(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize)
    if (!input || typeof input !== 'object') return input
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalize(child)]),
    )
  }
  return JSON.stringify(normalize(value))
}

function buffersEqual(left: ArrayBuffer, right: ArrayBuffer): boolean {
  if (left.byteLength !== right.byteLength) return false
  const a = new Uint8Array(left)
  const b = new Uint8Array(right)
  return a.every((value, index) => value === b[index])
}

async function canonicalize(
  sourceBytes: ArrayBuffer,
  origin: 'legacy-migrated' | 'authored',
  where: string,
): Promise<{ bytes: ArrayBuffer; sha256: string; frameCount: number }> {
  const source = new Uint8Array(sourceBytes)
  const gzip = source[0] === 0x1f && source[1] === 0x8b
  const bytes = gzip ? sourceBytes.slice(0) : Uint8Array.from(await compressGzip(source)).buffer
  const sha256 = await sha256Hex(bytes)
  const loaded = await decodeBattleSpriteAssetBytes(
    {
      kind: 'battle-sprite',
      path: where,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256,
      origin: { kind: origin },
    },
    bytes,
    where,
  )
  return { bytes, sha256, frameCount: loaded.frames.length }
}

function exitBattleSpriteLegacy(manifest: LegacyManifestV3, tablePath: string): LegacyManifestV3 {
  const next = structuredClone(manifest)
  next.content.battleSprites = tablePath
  const legacy = next.assets.legacy
  if (!legacy) return next
  const families = legacy.families.filter((family) => family !== 'battle-sprite')
  next.assets = families.length
    ? { ...next.assets, legacy: { ...legacy, families } }
    : { catalog: next.assets.catalog, roles: next.assets.roles }
  return next
}

/**
 * battle 升级早于 v3 标题音乐角色补齐边界执行；只虚拟补上这一个已知可升级缺口，
 * 其余 role/kind/family 错误仍由完整 validator fail-loud。
 */
function validateAssetConfigAtBattleBoundary(
  assets: LegacyManifestV3['assets'],
  catalog: AssetCatalogV1,
): void {
  const openingRole = 'audio.openingMenuMusic'
  const fallback = Object.entries(catalog.assets)
    .filter(([, record]) => record.kind === 'music')
    .map(([id]) => id)
    .sort()[0]
  const candidate =
    !(openingRole in assets.roles) && fallback
      ? { ...assets, roles: { ...assets.roles, [openingRole]: fallback } }
      : assets
  validateManifestAssetConfigV3(candidate, catalog)
}

async function listRleFiles(
  dir: FileSystemDirectoryHandle,
  root: string,
  channel: Channel,
): Promise<Array<{ channel: Channel; number: number; path: string; ref: string }>> {
  const family = joinPath('battle-sprite', channel)
  const directoryPath = validateProjectRelativePath(
    joinPath(root, family),
    `${channel} 战斗精灵目录`,
  )
  let directory = dir
  try {
    for (const segment of directoryPath.split('/'))
      directory = await directory.getDirectoryHandle(segment)
  } catch (cause) {
    if (isNotFound(cause)) return []
    throw cause
  }
  const values = (
    directory as unknown as {
      values(): AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>
    }
  ).values()
  const byNumber = new Map<number, string>()
  for await (const handle of values) {
    if (handle.kind !== 'file' || !handle.name.toLowerCase().endsWith('.rle')) continue
    const match = /^(\d+)\.rle$/i.exec(handle.name)
    if (!match) throw new Error(`${directoryPath}: 非规范 RLE 文件 ${handle.name}`)
    const number = Number(match[1])
    if (!Number.isInteger(number) || number < 0 || (channel === 'enemy' && number === 0))
      throw new Error(`${directoryPath}: 非法 ${channel} 战斗精灵号 ${handle.name}`)
    if (byNumber.has(number)) throw new Error(`${directoryPath}: 战斗精灵号 ${number} 重复`)
    byNumber.set(number, handle.name)
  }
  return [...byNumber.entries()]
    .sort(([left], [right]) => left - right)
    .map(([number, file]) => ({
      channel,
      number,
      ref: joinPath(family, file),
      path: joinPath(root, family, file),
    }))
}

async function readLegacyInventory(
  source: FileSource,
  root: string,
): Promise<Array<{ channel: Channel; number: number }>> {
  const path = joinPath(root, 'battle-sprites.json')
  const raw = objectAt(await source.readJson<unknown>(path), path)
  if (!Array.isArray(raw.sprites)) throw new Error(`${path}.sprites: 期望数组`)
  const seen = new Set<string>()
  return raw.sprites.map((entry, index) => {
    const value = objectAt(entry, `${path}.sprites[${index}]`)
    const channel = value.kind
    const number = value.id
    if (channel !== 'player' && channel !== 'enemy')
      throw new Error(`${path}.sprites[${index}].kind: 期望 player 或 enemy`)
    if (
      !Number.isInteger(number) ||
      (number as number) < 0 ||
      (channel === 'enemy' && number === 0)
    )
      throw new Error(`${path}.sprites[${index}].id: 非法精灵号`)
    const key = `${channel}:${number}`
    if (seen.has(key)) throw new Error(`${path}.sprites[${index}]: 重复 ${key}`)
    seen.add(key)
    return { channel, number: number as number }
  })
}

function playerProfile(
  spriteNum: number,
  frameCount: number,
  effectIndex: readonly number[],
): BattleSpriteProfile {
  if (frameCount < 10)
    throw new Error(`player ${spriteNum}: fighter 至少需要 10 帧，实际 ${frameCount}`)
  const cast = effectIndex[spriteNum * 2]
  const attack = effectIndex[spriteNum * 2 + 1]
  if (!Number.isInteger(cast) || !Number.isInteger(attack) || cast! < 0 || attack! < 0)
    throw new Error(`player ${spriteNum}: battle-effect-index 缺失或非法`)
  return {
    kind: 'player-fighter',
    frames: {
      idle: 0,
      dying: 1,
      dead: 2,
      defend: 3,
      hurt: 4,
      preMagic: 5,
      magic: 6,
      attackWindup: 7,
      attackRush: 8,
      attackStrike: 9,
      ...(frameCount > 10 ? { steal: 10 } : {}),
    },
    castEffectBase: cast! * 10 + 15,
    attackEffectBase: attack! * 3,
  }
}

function enemyProfile(animValue: unknown, where: string): BattleSpriteProfile {
  const anim = objectAt(animValue, `${where}.anim`)
  const idle = anim.idleFrames
  const magic = anim.magicFrames
  const attack = anim.attackFrames
  const idleSpeed = anim.idleAnimSpeed
  const actSpeed = anim.actWaitFrames
  for (const [key, value] of Object.entries({ idle, magic, attack, idleSpeed, actSpeed }))
    if (!Number.isInteger(value) || (value as number) < 0)
      throw new Error(`${where}.anim.${key}: 期望非负整数`)
  if ((idle as number) <= 0) throw new Error(`${where}.anim.idleFrames: 至少为 1`)
  if ((idleSpeed as number) <= 0) throw new Error(`${where}.anim.idleAnimSpeed: 至少为 1`)
  return {
    kind: 'enemy',
    idle: { start: 0, count: idle as number },
    magic: { start: idle as number, count: magic as number },
    attack: { start: (idle as number) + (magic as number), count: attack as number },
    idleTicksPerFrame: idleSpeed as number,
    actTicksPerFrame: actSpeed as number,
  }
}

async function exactOldBlank(
  source: FileSource,
  manifest: LegacyManifestV3,
): Promise<Record<string, unknown> | undefined> {
  const target = await buildBlankProject(manifest.name)
  const targetManifest = structuredClone(target['manifest.json']) as unknown as LegacyManifestV3
  targetManifest.id = manifest.id
  targetManifest.name = manifest.name
  targetManifest.contentVersion = 3
  target['manifest.json'] = targetManifest

  const old = structuredClone(target)
  const battleDefinitions = old['content/battle-sprites.json'] as BattleSpriteDef[]
  const battleAsset = battleDefinitions[0]?.asset
  const battleRecord = battleAsset
    ? (old['assets/index.json'] as AssetCatalogV1).assets[battleAsset]
    : undefined
  delete old['content/battle-sprites.json']
  if (battleRecord) delete old[battleRecord.path]
  if (battleAsset) delete (old['assets/index.json'] as AssetCatalogV1).assets[battleAsset]
  const actors = old['content/actors.json'] as Array<Record<string, unknown>>
  const battler = actors[0]?.battler as Record<string, unknown> | undefined
  if (battler) delete battler.battleSprite
  const oldManifest = old['manifest.json'] as LegacyManifestV3
  delete oldManifest.content.battleSprites

  for (const [path, expected] of Object.entries(old)) {
    if (expected instanceof ArrayBuffer) {
      let actual: ArrayBuffer
      try {
        actual = await source.readBytes(path)
      } catch (cause) {
        if (isNotFound(cause)) return undefined
        throw cause
      }
      if (!buffersEqual(actual, expected)) return undefined
    } else {
      const actual = await readJsonIfPresent(source, path)
      const semanticExpected =
        typeof expected === 'string' ? (JSON.parse(expected) as unknown) : expected
      if (actual === undefined || stableJson(actual) !== stableJson(semanticExpected))
        return undefined
    }
  }
  return target
}

async function buildBlankJournal(
  source: FileSource,
  manifest: LegacyManifestV3,
): Promise<UpgradeJournal | undefined> {
  const target = await exactOldBlank(source, manifest)
  if (!target) return undefined
  const nextJson: Record<string, unknown> = {}
  for (const [path, value] of Object.entries(target))
    if (!(value instanceof ArrayBuffer)) nextJson[path] = value
  return finishJournal({
    version: 1,
    mode: 'blank',
    projectId: manifest.id,
    projectName: manifest.name,
    sourceJsonSha256: await captureJsonHashes(source, Object.keys(nextJson)),
    sourceCleanupSha256: {},
    nextJson,
    binaryPlans: [],
    cleanupPaths: [],
  })
}

async function buildLegacyJournal(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  manifest: LegacyManifestV3,
): Promise<UpgradeJournal> {
  const legacy = manifest.assets.legacy
  if (!legacy) throw new Error('battle-sprite legacy 配置缺失')
  const root = validateProjectRelativePath(
    typeof legacy.root === 'string' ? legacy.root : 'assets',
    'manifest.assets.legacy.root',
  )
  const tablePath =
    typeof manifest.content.battleSprites === 'string'
      ? validateProjectRelativePath(manifest.content.battleSprites, 'content.battleSprites')
      : DEFAULT_TABLE_PATH
  if (
    Object.entries(manifest.content).some(
      ([key, value]) => key !== 'battleSprites' && value === tablePath,
    )
  )
    throw new Error(`battleSprites 目标路径与其他内容表冲突: ${tablePath}`)
  const catalogPath = validateProjectRelativePath(
    manifest.assets.catalog,
    'manifest.assets.catalog',
  )
  const catalog = structuredClone(
    validateAssetCatalog(await source.readJson<unknown>(catalogPath), catalogPath),
  )
  // 无 journal 时只接受严格旧态；legacy family 与任一已登记同族资产并存必须 fail-loud。
  validateAssetConfigAtBattleBoundary(manifest.assets, catalog)
  const rawDefinitions = await readJsonIfPresent(source, tablePath)
  const existingDefinitions =
    rawDefinitions === undefined ? undefined : validateBattleSprites(rawDefinitions, catalog)

  const assetBySource = new Map<string, PlannedAsset>()
  const assetById = new Map<AssetId, PlannedAsset>()
  const binaryPlans: BinaryPlan[] = []
  const cleanup = new Set<string>()
  const frameCounts = new Map<AssetId, number>()

  const ensureAsset = async (
    channel: Channel,
    number: number,
    explicitPath?: string,
  ): Promise<PlannedAsset> => {
    if (!Number.isInteger(number) || number < 0 || (channel === 'enemy' && number === 0))
      throw new Error(`${channel} 战斗精灵号非法: ${number}`)
    const defaultRef = joinPath('battle-sprite', channel, `${number}.rle`)
    const authored = Boolean(explicitPath?.startsWith('assets/'))
    const customLegacy = Boolean(explicitPath) && !authored
    const sourceRef = explicitPath ?? defaultRef
    const sourcePath = authored
      ? validateProjectRelativePath(sourceRef, `${channel} ${number} authored 战斗精灵路径`)
      : validateProjectRelativePath(
          joinPath(root, sourceRef),
          `${channel} ${number} legacy 战斗精灵路径`,
        )
    const sourceKey = `${sourcePath}\0${channel}\0${number}`
    const cached = assetBySource.get(sourceKey)
    if (cached) return cached
    let sourceBytes: ArrayBuffer
    try {
      sourceBytes = await source.readBytes(sourcePath)
    } catch (cause) {
      if (!isNotFound(cause)) throw cause
      const expected = palBattleSpriteAssetId(channel, number)
      const existing = catalog.assets[expected]
      if (!existing) throw new Error(`${channel} ${number}: 缺战斗精灵源 ${sourcePath}`)
      sourceBytes = await source.readBytes(existing.path)
    }
    const canonical = await canonicalize(
      sourceBytes,
      authored ? 'authored' : 'legacy-migrated',
      sourcePath,
    )
    const asset = authored
      ? `battle-sprite.authored.${canonical.sha256}`
      : customLegacy
        ? `battle-sprite.legacy.${canonical.sha256}`
        : palBattleSpriteAssetId(channel, number)
    const previousPlan = assetById.get(asset)
    if (previousPlan) {
      if (previousPlan.record.sha256 !== canonical.sha256)
        throw new Error(`BattleSprite AssetId ${asset} 对应不同字节`)
      assetBySource.set(sourceKey, previousPlan)
      if (
        sourcePath !== previousPlan.record.path &&
        sourcePath !== previousPlan.binaryPlan.sourcePath &&
        !previousPlan.binaryPlan.sourceAliases.includes(sourcePath)
      )
        previousPlan.binaryPlan.sourceAliases.push(sourcePath)
      if (sourcePath !== previousPlan.record.path) cleanup.add(sourcePath)
      return previousPlan
    }
    const targetPath = authored
      ? `assets/authored/battle-sprites/${canonical.sha256}.rle`
      : customLegacy
        ? `assets/migrated/battle-sprites/custom/${canonical.sha256}.rle`
        : `assets/migrated/battle-sprites/${channel}/${String(number).padStart(3, '0')}.rle`
    const expectedRecord: AssetRecordV1 = {
      kind: 'battle-sprite',
      path: targetPath,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: canonical.bytes.byteLength,
      sha256: canonical.sha256,
      label: authored
        ? `导入的${channel === 'player' ? '我方' : '敌方'}战斗精灵`
        : `PAL ${channel === 'player' ? '我方' : '敌方'}战斗精灵 ${number}`,
      origin: authored
        ? { kind: 'authored', ref: sourcePath }
        : { kind: 'legacy-migrated', ref: sourceRef },
    }
    const existing = catalog.assets[asset]
    if (existing && stableJson(existing) !== stableJson(expectedRecord))
      throw new Error(`BattleSprite AssetId ${asset} 已存在且记录不同`)
    const pathOwner = Object.entries(catalog.assets).find(
      ([id, record]) => id !== asset && record.path === targetPath,
    )
    if (pathOwner) throw new Error(`战斗精灵目标路径已由 ${pathOwner[0]} 占用: ${targetPath}`)
    catalog.assets[asset] = existing ?? expectedRecord
    const binaryPlan: BinaryPlan = {
      asset,
      sourcePath,
      sourceAliases: [],
      targetPath,
      record: existing ?? expectedRecord,
    }
    const plan: PlannedAsset = {
      asset,
      record: existing ?? expectedRecord,
      bytes: canonical.bytes,
      sourcePath,
      frameCount: canonical.frameCount,
      binaryPlan,
    }
    assetBySource.set(sourceKey, plan)
    assetById.set(asset, plan)
    frameCounts.set(asset, canonical.frameCount)
    binaryPlans.push(binaryPlan)
    if (sourcePath !== targetPath) cleanup.add(sourcePath)
    return plan
  }

  const familyEntries = [
    ...(await listRleFiles(dir, root, 'player')),
    ...(await listRleFiles(dir, root, 'enemy')),
  ]
  const inventory = await readLegacyInventory(source, root)
  const inventoryKeys = inventory.map(({ channel, number }) => `${channel}:${number}`).sort()
  const directoryKeys = familyEntries.map(({ channel, number }) => `${channel}:${number}`).sort()
  if (inventoryKeys.join('\0') !== directoryKeys.join('\0'))
    throw new Error(
      `${joinPath(root, 'battle-sprites.json')}: 登记集合与 battle-sprite/player|enemy 目录不一致`,
    )
  for (const entry of familyEntries) await ensureAsset(entry.channel, entry.number)

  const definitions: BattleSpriteDef[] = existingDefinitions
    ? structuredClone(existingDefinitions)
    : []
  const definitionBySignature = new Map<string, BattleSpriteDef>()
  for (const definition of definitions) {
    const record = catalog.assets[definition.asset]
    if (!record || record.kind !== 'battle-sprite')
      throw new Error(`既有战斗精灵定义 ${definition.id} 缺 catalog 资产`)
    const bytes = await source.readBytes(record.path)
    const loaded = await decodeBattleSpriteAssetBytes(
      record,
      bytes,
      `既有战斗精灵 ${definition.id}`,
    )
    frameCounts.set(definition.asset, loaded.frames.length)
    if (battleSpriteDefinitionFrameDemand(definition, loaded.frames.length) > loaded.frames.length)
      throw new Error(`既有战斗精灵定义 ${definition.id} 超出实际帧数`)
    definitionBySignature.set(`${definition.asset}\0${stableJson(definition.profile)}`, definition)
  }
  const definitionIds = new Set(definitions.map(({ id }) => id))
  const uniqueDefinitionId = (base: string, suffix: string): string => {
    if (!definitionIds.has(base)) {
      definitionIds.add(base)
      return base
    }
    const safe = suffix.toLowerCase().replace(/[^a-z0-9_.-]+/g, '-') || 'variant'
    for (let index = 1; ; index++) {
      const candidate = `${base}-${safe}${index === 1 ? '' : `-${index}`}`
      if (!definitionIds.has(candidate)) {
        definitionIds.add(candidate)
        return candidate
      }
    }
  }
  const ensureDefinition = (
    assetPlan: PlannedAsset,
    profile: BattleSpriteProfile,
    baseId: string,
    label: string,
    suffix: string,
  ): string => {
    const signature = `${assetPlan.asset}\0${stableJson(profile)}`
    const existing = definitionBySignature.get(signature)
    if (existing) return existing.id
    const definition: BattleSpriteDef = {
      id: uniqueDefinitionId(baseId, suffix),
      label,
      asset: assetPlan.asset,
      profile,
    }
    if (battleSpriteDefinitionFrameDemand(definition, assetPlan.frameCount) > assetPlan.frameCount)
      throw new Error(`${definition.id}: profile 超出实际 ${assetPlan.frameCount} 帧`)
    definitions.push(definition)
    definitionBySignature.set(signature, definition)
    return definition.id
  }

  let effectIndex: number[] | undefined
  const getEffectIndex = async (): Promise<number[]> => {
    if (effectIndex) return effectIndex
    const path = joinPath(root, 'battle-effect-index.json')
    const raw = await source.readJson<unknown>(path)
    if (!Array.isArray(raw) || raw.some((value) => !Number.isInteger(value) || value < 0))
      throw new Error(`${path}: 期望非负整数数组`)
    effectIndex = raw as number[]
    cleanup.add(path)
    return effectIndex
  }
  const ensureFighter = async (
    number: number,
    path: string | undefined,
    hint: string,
  ): Promise<string> => {
    const asset = await ensureAsset('player', number, path)
    return ensureDefinition(
      asset,
      playerProfile(number, asset.frameCount, await getEffectIndex()),
      `player-fighter-${number}`,
      `我方战斗精灵 ${number}`,
      hint,
    )
  }
  const ensureSummon = async (
    number: number,
    path: string | undefined,
    hint: string,
  ): Promise<string> => {
    const asset = await ensureAsset('player', number, path)
    return ensureDefinition(
      asset,
      { kind: 'summon' },
      `player-summon-${number}`,
      `召唤战斗精灵 ${number}`,
      hint,
    )
  }
  const ensureEnemy = async (
    number: number,
    path: string | undefined,
    anim: unknown,
    hint: string,
  ): Promise<string> => {
    const asset = await ensureAsset('enemy', number, path)
    return ensureDefinition(
      asset,
      enemyProfile(anim, hint),
      `enemy-${number}`,
      `敌方战斗精灵 ${number}`,
      hint,
    )
  }

  let sawLegacyReference = false
  let sawCanonicalReference = false

  const transformNode = async (value: unknown, where: string): Promise<unknown> => {
    if (Array.isArray(value))
      return Promise.all(value.map((child, index) => transformNode(child, `${where}[${index}]`)))
    if (!value || typeof value !== 'object') return value
    const input = value as Record<string, unknown>
    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(input))
      output[key] = await transformNode(child, `${where}.${key}`)
    if (input.kind === 'summon' && 'godId' in input && 'battleSprite' in input)
      throw new Error(`${where}: summon 同时含 godId 与 canonical battleSprite`)
    if (input.kind === 'summon' && 'godId' in input) {
      sawLegacyReference = true
      if (!Number.isInteger(input.godId) || (input.godId as number) < 0)
        throw new Error(`${where}.godId: 期望非负整数`)
      const number = (input.godId as number) + 10
      output.battleSprite = await ensureSummon(number, undefined, where)
      delete output.godId
    } else if (input.kind === 'summon' && typeof input.battleSprite === 'string') {
      sawCanonicalReference = true
    }
    if (input.kind === 'trance' && 'sprite' in input && 'battleSprite' in input)
      throw new Error(`${where}: trance 同时含旧 sprite 与 canonical battleSprite`)
    if (input.kind === 'trance' && typeof input.sprite === 'number') {
      sawLegacyReference = true
      if (!Number.isInteger(input.sprite) || input.sprite < 0)
        throw new Error(`${where}.sprite: 期望非负整数`)
      output.battleSprite = await ensureFighter(input.sprite, undefined, where)
      delete output.sprite
    } else if (input.kind === 'trance' && typeof input.battleSprite === 'string') {
      sawCanonicalReference = true
    }
    if (input.kind === 'setActorAppearance' && typeof input.battleSprite === 'number') {
      sawLegacyReference = true
      if (!Number.isInteger(input.battleSprite) || input.battleSprite < 0)
        throw new Error(`${where}.battleSprite: 期望非负整数`)
      output.battleSprite = await ensureFighter(input.battleSprite, undefined, where)
    } else if (input.kind === 'setActorAppearance' && typeof input.battleSprite === 'string') {
      sawCanonicalReference = true
    }
    if (input.kind === 'battleSprite' && typeof input.sprite === 'number') {
      sawLegacyReference = true
      if (!Number.isInteger(input.sprite) || input.sprite < 0)
        throw new Error(`${where}.sprite: 期望非负整数`)
      output.sprite = await ensureFighter(input.sprite, undefined, where)
    } else if (input.kind === 'battleSprite' && typeof input.sprite === 'string') {
      sawCanonicalReference = true
    }
    return output
  }

  const nextJson: Record<string, unknown> = {}
  const actorsPath = manifest.content.actors
  if (typeof actorsPath !== 'string') throw new Error('manifest 缺 content.actors')
  const rawActors = await source.readJson<unknown>(actorsPath)
  if (!Array.isArray(rawActors)) throw new Error(`${actorsPath}: 期望数组`)
  const actors = await Promise.all(
    rawActors.map(async (raw, index) => {
      const actor = objectAt(
        await transformNode(raw, `${actorsPath}[${index}]`),
        `${actorsPath}[${index}]`,
      )
      const battler =
        actor.battler === undefined
          ? undefined
          : objectAt(actor.battler, `${actorsPath}[${index}].battler`)
      if (!battler) return actor
      const hasCanonicalBattleSprite = 'battleSprite' in battler
      const hasLegacyBattleSprite = 'battleSpriteNum' in battler || 'battleSpritePath' in battler
      if (hasCanonicalBattleSprite && hasLegacyBattleSprite)
        throw new Error(
          `${actorsPath}[${index}].battler: 同时含旧 battleSpriteNum/path 与 canonical battleSprite`,
        )
      if (hasCanonicalBattleSprite) {
        if (typeof battler.battleSprite !== 'string' || !battler.battleSprite)
          throw new Error(`${actorsPath}[${index}].battler.battleSprite: 期望非空字符串`)
        sawCanonicalReference = true
        return actor
      }
      sawLegacyReference = true
      const path = battler.battleSpritePath
      if (path !== undefined && (typeof path !== 'string' || !path))
        throw new Error(`${actorsPath}[${index}].battler.battleSpritePath: 期望非空字符串`)
      // 旧 runtime 对仅上传 path 的 Actor 明确使用 player 0；兼容只存在本升级边界。
      const number =
        battler.battleSpriteNum === undefined && typeof path === 'string'
          ? 0
          : battler.battleSpriteNum
      if (!Number.isInteger(number) || (number as number) < 0)
        throw new Error(`${actorsPath}[${index}].battler: 缺合法 battleSpriteNum`)
      battler.battleSprite = await ensureFighter(
        number as number,
        path as string | undefined,
        String(actor.id ?? index),
      )
      delete battler.battleSpriteNum
      delete battler.battleSpritePath
      return actor
    }),
  )
  nextJson[actorsPath] = validateActors(actors)

  const enemiesPath = manifest.content.enemies
  const rawEnemies =
    typeof enemiesPath === 'string' ? await source.readJson<unknown>(enemiesPath) : []
  if (!Array.isArray(rawEnemies)) throw new Error(`${enemiesPath}: 期望数组`)
  const enemies =
    typeof enemiesPath === 'string'
      ? await Promise.all(
          rawEnemies.map(async (raw, index) => {
            const enemy = objectAt(
              await transformNode(raw, `${enemiesPath}[${index}]`),
              `${enemiesPath}[${index}]`,
            )
            const hasCanonicalBattleSprite = 'battleSprite' in enemy
            const hasLegacyBattleSprite =
              'spriteNum' in enemy || 'spritePath' in enemy || 'anim' in enemy
            if (hasCanonicalBattleSprite && hasLegacyBattleSprite)
              throw new Error(
                `${enemiesPath}[${index}]: 同时含旧 spriteNum/path/anim 与 canonical battleSprite`,
              )
            if (hasCanonicalBattleSprite) {
              if (typeof enemy.battleSprite !== 'string' || !enemy.battleSprite)
                throw new Error(`${enemiesPath}[${index}].battleSprite: 期望非空字符串`)
              sawCanonicalReference = true
              return enemy
            }
            sawLegacyReference = true
            const number = enemy.spriteNum
            if (!Number.isInteger(number) || (number as number) <= 0)
              throw new Error(`${enemiesPath}[${index}].spriteNum: 期望正整数`)
            const path = enemy.spritePath
            if (path !== undefined && (typeof path !== 'string' || !path))
              throw new Error(`${enemiesPath}[${index}].spritePath: 期望非空字符串`)
            const anim = enemy.anim
            enemy.battleSprite = await ensureEnemy(
              number as number,
              path as string | undefined,
              anim,
              String(enemy.id ?? index),
            )
            const animRecord = objectAt(anim, `${enemiesPath}[${index}].anim`)
            const offset = animRecord.yPosOffset
            if (!Number.isInteger(offset))
              throw new Error(`${enemiesPath}[${index}].anim.yPosOffset: 期望整数`)
            enemy.yPosOffset = offset
            delete enemy.spriteNum
            delete enemy.spritePath
            delete enemy.anim
            return enemy
          }),
        )
      : []
  if (typeof enemiesPath === 'string') nextJson[enemiesPath] = validateEnemies(enemies)

  const skillsPath = manifest.content.skills
  if (typeof skillsPath !== 'string') throw new Error('manifest 缺 content.skills')
  const transformedSkills = await transformNode(
    await source.readJson<unknown>(skillsPath),
    skillsPath,
  )
  const skillsBundle = validateSkills(transformedSkills)
  nextJson[skillsPath] = transformedSkills

  const itemsPath = manifest.content.items
  if (typeof itemsPath !== 'string') throw new Error('manifest 缺 content.items')
  const transformedItems = await transformNode(await source.readJson<unknown>(itemsPath), itemsPath)
  const items = validateItems(transformedItems)
  nextJson[itemsPath] = transformedItems

  const sceneDir = (manifest.content.scenes ?? 'content/scenes/').replace(/\/?$/, '/')
  const sceneIndexPath = `${sceneDir}index.json`
  const rawSceneIds = await source.readJson<unknown>(sceneIndexPath)
  if (!Array.isArray(rawSceneIds) || rawSceneIds.some((id) => typeof id !== 'string' || !id))
    throw new Error(`${sceneIndexPath}: 期望非空字符串 id 数组`)
  const sceneIds = rawSceneIds as string[]
  nextJson[sceneIndexPath] = sceneIds
  const scenes = await Promise.all(
    sceneIds.map(async (id) => {
      const path = `${sceneDir}${id}.json`
      const scene = await transformNode(await source.readJson<unknown>(path), path)
      nextJson[path] = scene
      return scene
    }),
  )
  const validatedScenes = validateScenes(scenes)

  const scriptChunks: Record<string, ScriptChunkV1> = {}
  const scriptDir = manifest.content.scripts?.replace(/\/?$/, '/')
  if (scriptDir) {
    const indexPath = `${scriptDir}index.json`
    const index = await source.readJson<ScriptIndexV1>(indexPath)
    for (const [id, meta] of Object.entries(index.chunks)) {
      const path = `${scriptDir}${meta.path}`
      scriptChunks[id] = (await transformNode(
        await source.readJson<unknown>(path),
        path,
      )) as ScriptChunkV1
    }
    const normalized = normalizeScriptLibrary(index, scriptChunks)
    checkScriptLibrary(normalized.index, normalized.chunks, scriptDir.slice(0, -1))
    nextJson[indexPath] = normalized.index
    for (const [id, chunk] of Object.entries(normalized.chunks)) {
      const meta = normalized.index.chunks[id]
      if (!meta) throw new Error(`脚本分片 ${id} 缺重算元数据`)
      nextJson[`${scriptDir}${meta.path}`] = chunk
    }
    Object.assign(scriptChunks, normalized.chunks)
  }

  if (
    (sawLegacyReference && sawCanonicalReference) ||
    (existingDefinitions !== undefined && sawLegacyReference) ||
    (existingDefinitions === undefined && sawCanonicalReference)
  )
    throw new Error(
      '工程同时含旧数字/path 与 BattleSpriteDef.id 引用，且没有有效 journal；拒绝猜测恢复',
    )
  validateBattleSprites(definitions, catalog)
  const definitionMap = new Map(definitions.map((definition) => [definition.id, definition]))
  for (const reference of collectBattleSpriteDefinitionReferences({
    actors: nextJson[actorsPath] as ReturnType<typeof validateActors>,
    enemies:
      typeof enemiesPath === 'string'
        ? (nextJson[enemiesPath] as ReturnType<typeof validateEnemies>)
        : [],
    items,
    skills: skillsBundle.skills,
    scenes: validatedScenes,
    scriptChunks,
    worlds: [],
  })) {
    const definition = definitionMap.get(reference.battleSprite)
    if (!definition)
      throw new Error(`${reference.where}: 战斗精灵定义 ${reference.battleSprite} 不存在`)
    if (definition.profile.kind !== reference.expectedProfile)
      throw new Error(
        `${reference.where}: profile 期望 ${reference.expectedProfile}，实际 ${definition.profile.kind}`,
      )
  }

  const legacyMetadataPaths = [
    joinPath(root, 'battle-sprites.json'),
    joinPath(root, 'battle-effect-index.json'),
  ]
  for (const path of legacyMetadataPaths) {
    const owner = Object.entries(catalog.assets).find(([, record]) => record.path === path)
    if (owner)
      throw new Error(
        `battle-sprite 旧元数据 ${path} 同时由 catalog AssetId ${owner[0]} 持有，拒绝双重所有权`,
      )
    cleanup.add(path)
  }
  const nextManifest = exitBattleSpriteLegacy(manifest, tablePath)
  validateAssetConfigAtBattleBoundary(nextManifest.assets, catalog)
  nextJson[catalogPath] = catalog
  nextJson[tablePath] = definitions
  nextJson['manifest.json'] = nextManifest
  for (const path of Object.keys(nextJson)) {
    const owner = Object.entries(catalog.assets).find(([, record]) => record.path === path)
    if (owner)
      throw new Error(
        `battle-sprite 升级目标 JSON ${path} 同时由 catalog AssetId ${owner[0]} 持有；拒绝写出失配摘要`,
      )
  }
  const cleanupPaths = [...cleanup].filter(
    (path) => !Object.values(catalog.assets).some((record) => record.path === path),
  )
  const sourceCleanupSha256 = await captureCleanupHashes(source, cleanupPaths)
  const optionalMetadata = new Set([
    joinPath(root, 'battle-sprites.json'),
    joinPath(root, 'battle-effect-index.json'),
  ])
  for (const [path, hash] of Object.entries(sourceCleanupSha256))
    if (hash === null && !optionalMetadata.has(path))
      throw new Error(`battle-sprite 升级清理源不存在: ${path}`)
  return finishJournal({
    version: 1,
    mode: 'legacy',
    projectId: manifest.id,
    projectName: manifest.name,
    legacyRoot: root,
    sourceJsonSha256: await captureJsonHashes(source, Object.keys(nextJson)),
    sourceCleanupSha256,
    nextJson,
    binaryPlans,
    cleanupPaths,
  })
}

async function validateUpgradeJournal(
  raw: unknown,
  currentManifest: LegacyManifestV3,
): Promise<{ journal: UpgradeJournal; manifest: LegacyManifestV3; catalog: AssetCatalogV1 }> {
  const value = objectAt(raw, 'battle-sprite upgrade journal')
  if (value.version !== 1 || (value.mode !== 'legacy' && value.mode !== 'blank'))
    throw new Error('battle-sprite 升级 journal 版本或模式非法')
  if (typeof value.projectId !== 'string' || value.projectId !== currentManifest.id)
    throw new Error('battle-sprite 升级 journal 与当前工程不匹配')
  if (typeof value.projectName !== 'string' || !value.projectName)
    throw new Error('battle-sprite 升级 journal 缺工程名')
  if (value.projectName !== currentManifest.name)
    throw new Error('battle-sprite 升级 journal 的工程名与当前 manifest 不匹配')
  if (typeof value.targetSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(value.targetSha256))
    throw new Error('battle-sprite 升级 journal 摘要非法')
  const nextJson = objectAt(value.nextJson, 'battle-sprite journal.nextJson')
  const sourceHashes = objectAt(value.sourceJsonSha256, 'battle-sprite journal.sourceJsonSha256')
  const sourceCleanupHashes = objectAt(
    value.sourceCleanupSha256,
    'battle-sprite journal.sourceCleanupSha256',
  )
  const nextPaths = Object.keys(nextJson).sort()
  const sourcePaths = Object.keys(sourceHashes).sort()
  if (nextPaths.join('\0') !== sourcePaths.join('\0'))
    throw new Error('battle-sprite journal 的 source/target JSON 集合不一致')
  for (const path of nextPaths) {
    validateProjectRelativePath(path, 'battle-sprite journal JSON path')
    const hash = sourceHashes[path]
    if (hash !== null && (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)))
      throw new Error(`battle-sprite journal 源摘要非法: ${path}`)
  }
  const targetManifestValue = objectAt(nextJson['manifest.json'], 'journal manifest')
  const targetManifest = targetManifestValue as unknown as LegacyManifestV3
  if (
    targetManifest.id !== value.projectId ||
    targetManifest.name !== value.projectName ||
    targetManifest.contentVersion !== 3
  )
    throw new Error('battle-sprite journal 的目标 manifest 身份非法')
  const catalogPath = projectPath(targetManifest.assets?.catalog, 'journal manifest.assets.catalog')
  const tablePath = projectPath(
    targetManifest.content?.battleSprites,
    'journal manifest.content.battleSprites',
  )
  const catalog = validateAssetCatalog(nextJson[catalogPath], catalogPath)
  if (value.mode === 'legacy')
    for (const path of nextPaths) {
      const owner = Object.entries(catalog.assets).find(([, record]) => record.path === path)
      if (owner)
        throw new Error(
          `battle-sprite journal 目标 JSON ${path} 同时由 catalog AssetId ${owner[0]} 持有`,
        )
    }
  const allowedJson = new Set(['manifest.json', catalogPath, tablePath])
  for (const record of Object.values(catalog.assets))
    if (record.mediaType === 'application/json') allowedJson.add(record.path)
  const allowedPrefixes: string[] = []
  for (const [key, rawPath] of Object.entries(targetManifest.content ?? {})) {
    if (typeof rawPath !== 'string') continue
    const directory = rawPath.endsWith('/')
    const path = projectPath(
      directory ? rawPath.slice(0, -1) : rawPath,
      `journal manifest.content.${key}`,
    )
    if (directory) allowedPrefixes.push(`${path}/`)
    else allowedJson.add(path)
  }
  if (typeof targetManifest.content.maps === 'string') {
    const mapIndexPath = targetManifest.content.maps
    const rawMapIndex = nextJson[mapIndexPath]
    if (rawMapIndex !== undefined) {
      const mapIndex = objectAt(rawMapIndex, `journal ${mapIndexPath}`)
      if (!Array.isArray(mapIndex.maps)) throw new Error(`journal ${mapIndexPath}.maps: 期望数组`)
      for (const [index, rawMap] of mapIndex.maps.entries()) {
        const map = objectAt(rawMap, `journal ${mapIndexPath}.maps[${index}]`)
        allowedJson.add(projectPath(map.path, `journal ${mapIndexPath}.maps[${index}].path`))
      }
    }
  }
  for (const path of nextPaths)
    if (!allowedJson.has(path) && !allowedPrefixes.some((prefix) => path.startsWith(prefix)))
      throw new Error(`battle-sprite journal 含不属于 manifest 的 JSON: ${path}`)
  validateBattleSprites(nextJson[tablePath], catalog)
  validateAssetConfigAtBattleBoundary(targetManifest.assets, catalog)
  if (targetManifest.assets.legacy?.families.includes('battle-sprite'))
    throw new Error('battle-sprite journal 的目标 manifest 仍声明 legacy family')
  if (!Array.isArray(value.binaryPlans) || !Array.isArray(value.cleanupPaths))
    throw new Error('battle-sprite journal 计划结构非法')
  const legacyRoot =
    value.legacyRoot === undefined ? undefined : projectPath(value.legacyRoot, 'journal legacyRoot')
  if ((value.mode === 'legacy') !== Boolean(legacyRoot))
    throw new Error('battle-sprite journal 的 mode/legacyRoot 不一致')
  const binaryPlans: BinaryPlan[] = []
  const assets = new Set<string>()
  const targets = new Set<string>()
  const sources = new Set<string>()
  for (const [index, rawPlan] of value.binaryPlans.entries()) {
    const plan = objectAt(rawPlan, `journal.binaryPlans[${index}]`)
    if (typeof plan.asset !== 'string' || !plan.asset)
      throw new Error(`journal.binaryPlans[${index}].asset 非法`)
    const sourcePath = projectPath(plan.sourcePath, `journal.binaryPlans[${index}].sourcePath`)
    const targetPath = projectPath(plan.targetPath, `journal.binaryPlans[${index}].targetPath`)
    if (!Array.isArray(plan.sourceAliases))
      throw new Error(`journal.binaryPlans[${index}].sourceAliases 非法`)
    const sourceAliases = plan.sourceAliases.map((alias, aliasIndex) =>
      projectPath(alias, `journal.binaryPlans[${index}].sourceAliases[${aliasIndex}]`),
    )
    if (sourceAliases.includes(targetPath))
      throw new Error(`journal.binaryPlans[${index}] alias 不得指向 target`)
    const record = catalog.assets[plan.asset]
    if (
      !record ||
      record.kind !== 'battle-sprite' ||
      record.mediaType !== 'application/vnd.type-pal.rle' ||
      record.path !== targetPath ||
      stableJson(record) !== stableJson(plan.record)
    )
      throw new Error(`journal.binaryPlans[${index}] 与目标 catalog 不一致`)
    if (record.origin.kind === 'legacy-migrated') {
      if (!legacyRoot || typeof record.origin.ref !== 'string')
        throw new Error(`journal.binaryPlans[${index}] legacy 来源非法`)
      const expected = validateProjectRelativePath(
        joinPath(legacyRoot, record.origin.ref),
        `journal.binaryPlans[${index}] legacy 来源`,
      )
      if (sourcePath !== expected)
        throw new Error(`journal.binaryPlans[${index}] legacy source 越界`)
      if (
        sourceAliases.some(
          (alias) => !legacyRoot || !alias.startsWith(`${legacyRoot}/`) || !alias.endsWith('.rle'),
        )
      )
        throw new Error(`journal.binaryPlans[${index}] legacy alias 越界`)
    } else if (record.origin.kind === 'authored') {
      if (
        !sourcePath.startsWith('assets/') ||
        (typeof record.origin.ref === 'string' && record.origin.ref !== sourcePath)
      )
        throw new Error(`journal.binaryPlans[${index}] authored source 越界`)
      if (sourceAliases.some((alias) => !alias.startsWith('assets/') || !alias.endsWith('.rle')))
        throw new Error(`journal.binaryPlans[${index}] authored alias 越界`)
    } else {
      throw new Error(`journal.binaryPlans[${index}] origin 非法`)
    }
    if (assets.has(plan.asset) || targets.has(targetPath))
      throw new Error(`journal.binaryPlans[${index}] 含重复 asset 或 target`)
    for (const source of [sourcePath, ...sourceAliases]) {
      if (sources.has(source)) throw new Error(`journal.binaryPlans[${index}] 含重复 source`)
      if (
        source !== targetPath &&
        Object.values(catalog.assets).some((candidate) => candidate.path === source)
      )
        throw new Error(`journal.binaryPlans[${index}] source 已由 catalog 占用`)
      sources.add(source)
    }
    assets.add(plan.asset)
    targets.add(targetPath)
    binaryPlans.push({ asset: plan.asset, sourcePath, sourceAliases, targetPath, record })
  }
  if (value.mode === 'blank' && binaryPlans.length)
    throw new Error('blank battle-sprite journal 不得含 binaryPlans')
  const allowedCleanup = new Set(
    binaryPlans.flatMap((plan) =>
      [plan.sourcePath, ...plan.sourceAliases].filter((path) => path !== plan.targetPath),
    ),
  )
  if (legacyRoot) {
    allowedCleanup.add(joinPath(legacyRoot, 'battle-sprites.json'))
    allowedCleanup.add(joinPath(legacyRoot, 'battle-effect-index.json'))
  }
  const cleanupPaths = value.cleanupPaths.map((rawPath, index) => {
    const path = validateProjectRelativePath(rawPath, `journal.cleanupPaths[${index}]`)
    if (!allowedCleanup.has(path)) throw new Error(`battle-sprite journal 含越权清理路径: ${path}`)
    if (Object.values(catalog.assets).some((record) => record.path === path))
      throw new Error(`battle-sprite journal 试图删除 catalog 资产: ${path}`)
    return path
  })
  const cleanupHashPaths = Object.keys(sourceCleanupHashes).sort()
  if (cleanupHashPaths.join('\0') !== [...cleanupPaths].sort().join('\0'))
    throw new Error('battle-sprite journal 的 cleanup/hash 集合不一致')
  const nullableCleanup = new Set(
    legacyRoot
      ? [
          joinPath(legacyRoot, 'battle-sprites.json'),
          joinPath(legacyRoot, 'battle-effect-index.json'),
        ]
      : [],
  )
  for (const [path, hash] of Object.entries(sourceCleanupHashes))
    if (hash !== null && (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)))
      throw new Error(`battle-sprite journal 清理摘要非法: ${path}`)
    else if (hash === null && !nullableCleanup.has(path))
      throw new Error(`battle-sprite journal 非元数据清理源不得缺失: ${path}`)
  const journal: UpgradeJournal = {
    version: 1,
    mode: value.mode,
    projectId: value.projectId,
    projectName: value.projectName,
    ...(legacyRoot ? { legacyRoot } : {}),
    sourceJsonSha256: sourceHashes as Record<string, string | null>,
    sourceCleanupSha256: sourceCleanupHashes as Record<string, string | null>,
    targetSha256: value.targetSha256,
    nextJson,
    binaryPlans,
    cleanupPaths,
  }
  const { targetSha256, ...payload } = journal
  if (targetSha256 !== (await semanticSha256(journalPayload(payload))))
    throw new Error('battle-sprite 升级 journal 的完整 payload 摘要不匹配')
  return { journal, manifest: targetManifest, catalog }
}

async function verifyReplayJsonState(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  journal: UpgradeJournal,
): Promise<void> {
  const targetHashes = Object.fromEntries(
    await Promise.all(
      Object.entries(journal.nextJson).map(async ([path, value]) => [
        path,
        await semanticSha256(value),
      ]),
    ),
  )
  const currentHashes = await captureJsonHashes(source, Object.keys(journal.nextJson), true)
  for (const path of Object.keys(journal.nextJson)) {
    const current = currentHashes[path]
    if (current === EMPTY_JSON_FINGERPRINT && journal.sourceJsonSha256[path] === null) continue
    if (current !== journal.sourceJsonSha256[path] && current !== targetHashes[path])
      throw new Error(`battle-sprite 升级恢复发现用户修改或未知中间态: ${path}`)
  }
  const manifestPublished = currentHashes['manifest.json'] === targetHashes['manifest.json']
  if (manifestPublished)
    for (const path of Object.keys(journal.nextJson))
      if (currentHashes[path] !== targetHashes[path])
        throw new Error(`battle-sprite manifest 已发布但受管文件不是目标版本: ${path}`)
  if (journal.mode === 'legacy' && journal.legacyRoot) {
    const plannedSources = journal.binaryPlans.flatMap((plan) => [
      plan.sourcePath,
      ...plan.sourceAliases,
    ])
    for (const channel of ['player', 'enemy'] as const) {
      const prefix = `${joinPath(journal.legacyRoot, 'battle-sprite', channel)}/`
      const expected = new Set(plannedSources.filter((path) => path.startsWith(prefix)))
      const current = new Set(
        (await listRleFiles(dir, journal.legacyRoot, channel)).map((entry) => entry.path),
      )
      const unexpected = [...current].filter((path) => !expected.has(path))
      if (unexpected.length)
        throw new Error(
          `battle-sprite 升级恢复发现 ${channel} 目录新增或未知 RLE: ${unexpected[0]}`,
        )
      if (!manifestPublished) {
        const missing = [...expected].filter((path) => !current.has(path))
        if (missing.length)
          throw new Error(
            `battle-sprite 升级恢复发现 ${channel} 目录在 manifest 发布前缺少 RLE: ${missing[0]}`,
          )
      }
    }
  }
  for (const [path, expected] of Object.entries(journal.sourceCleanupSha256)) {
    const bytes = await readBytesIfPresent(source, path)
    if (!bytes) {
      if (expected !== null && !manifestPublished)
        throw new Error(`battle-sprite 升级恢复发现旧清理源在 manifest 发布前丢失: ${path}`)
      continue
    }
    const current = await sha256Hex(bytes)
    if (current !== expected)
      throw new Error(`battle-sprite 升级恢复发现旧清理源被修改或后来新建: ${path}`)
  }
}

async function materializeJournal(
  source: FileSource,
  journal: UpgradeJournal,
  targetManifest: LegacyManifestV3,
  recovery: boolean,
): Promise<Record<string, unknown>> {
  const binaries: Record<string, ArrayBuffer> = {}
  if (journal.mode === 'blank') {
    const blank = await buildBlankProject(journal.projectName)
    for (const [path, value] of Object.entries(blank)) {
      if (!(value instanceof ArrayBuffer)) continue
      const existing = await readBytesIfPresent(source, path)
      if (existing && !buffersEqual(existing, value) && !(recovery && existing.byteLength === 0))
        throw new Error(`blank battle-sprite 升级目标路径已有不同字节: ${path}`)
      binaries[path] = value
    }
  } else {
    for (const plan of journal.binaryPlans) {
      const raw = await readBytesIfPresent(source, plan.sourcePath)
      let bytes: ArrayBuffer
      if (raw) {
        const canonical = await canonicalize(
          raw,
          plan.record.origin.kind === 'legacy-migrated' ? 'legacy-migrated' : 'authored',
          plan.sourcePath,
        )
        bytes = canonical.bytes
      } else {
        const recovered = await readBytesIfPresent(source, plan.targetPath)
        if (!recovered) throw new Error(`升级恢复同时缺源与目标: ${plan.asset}`)
        bytes = recovered
      }
      await decodeBattleSpriteAssetBytes(plan.record, bytes, `升级恢复 ${plan.asset}`)
      for (const alias of plan.sourceAliases) {
        const aliasBytes = await readBytesIfPresent(source, alias)
        if (!aliasBytes) {
          if (!recovery) throw new Error(`battle-sprite 升级 alias 源不存在: ${alias}`)
          continue
        }
        const canonicalAlias = await canonicalize(
          aliasBytes,
          plan.record.origin.kind === 'legacy-migrated' ? 'legacy-migrated' : 'authored',
          alias,
        )
        await decodeBattleSpriteAssetBytes(
          plan.record,
          canonicalAlias.bytes,
          `升级恢复 alias ${alias}`,
        )
      }
      const existingTarget = await readBytesIfPresent(source, plan.targetPath)
      if (
        existingTarget &&
        plan.sourcePath !== plan.targetPath &&
        !buffersEqual(existingTarget, bytes) &&
        !(recovery && existingTarget.byteLength === 0)
      )
        throw new Error(`战斗精灵目标路径已有未登记或不同字节: ${plan.targetPath}`)
      binaries[plan.targetPath] = bytes
    }
  }
  const catalogPath = targetManifest.assets.catalog
  const tablePath = targetManifest.content.battleSprites!
  const files: Record<string, unknown> = { ...binaries }
  files[catalogPath] = journal.nextJson[catalogPath]
  files[tablePath] = journal.nextJson[tablePath]
  for (const [path, value] of Object.entries(journal.nextJson))
    if (path !== catalogPath && path !== tablePath && path !== 'manifest.json') files[path] = value
  files['manifest.json'] = journal.nextJson['manifest.json']
  return files
}

async function commitJournal(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  candidate: UpgradeJournal,
  writeJournal: boolean,
  currentManifest: LegacyManifestV3,
): Promise<void> {
  const { journal, manifest } = await validateUpgradeJournal(candidate, currentManifest)
  await verifyReplayJsonState(dir, source, journal)
  const files = await materializeJournal(source, journal, manifest, !writeJournal)
  if (writeJournal) await writeProject(dir, { [JOURNAL_PATH]: encodeJournal(journal) })
  await writeProject(dir, files)
  await writeProject(dir, {}, { removePaths: [...journal.cleanupPaths, JOURNAL_PATH] })
}

/**
 * contentVersion 3 battle-sprite 的唯一 local 兼容边界。journal 在任何 canonical
 * 文件之前 close；旧源和 journal 只在 manifest 发布成功后清理，任一点中断都可单调重试。
 */
export async function upgradeLocalProjectV3BattleSprites(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
): Promise<boolean> {
  const manifest = objectAt(rawManifest, 'manifest') as unknown as LegacyManifestV3
  if (manifest.contentVersion !== 3) return false
  const rawJournal = await readTextIfPresent(source, JOURNAL_PATH)
  if (rawJournal !== undefined) {
    let journal: UpgradeJournal
    try {
      journal = JSON.parse(rawJournal) as UpgradeJournal
    } catch (cause) {
      const hasLegacy = manifest.assets.legacy?.families.includes('battle-sprite') ?? false
      const rebuilt = hasLegacy
        ? await buildLegacyJournal(dir, source, manifest)
        : typeof manifest.content.battleSprites !== 'string'
          ? await buildBlankJournal(source, manifest)
          : undefined
      if (!rebuilt)
        throw new Error(
          `battle-sprite 升级 journal 损坏且磁盘不是严格未动的旧态，拒绝猜测恢复: ${String(cause)}`,
        )
      await commitJournal(dir, source, rebuilt, true, manifest)
      return true
    }
    if (
      journal.version !== 1 ||
      journal.projectId !== manifest.id ||
      !['legacy', 'blank'].includes(journal.mode)
    )
      throw new Error('battle-sprite 升级 journal 与当前工程不匹配')
    await commitJournal(dir, source, journal, false, manifest)
    return true
  }

  const hasLegacy = manifest.assets.legacy?.families.includes('battle-sprite') ?? false
  if (hasLegacy) {
    const journal = await buildLegacyJournal(dir, source, manifest)
    await commitJournal(dir, source, journal, true, manifest)
    return true
  }
  if (typeof manifest.content.battleSprites === 'string') return false

  const blankJournal = await buildBlankJournal(source, manifest)
  if (!blankJournal)
    throw new Error(
      'contentVersion 3 工程缺 battleSprites，且不是未修改的旧空白工程；拒绝补空表或借用 player 0',
    )
  await commitJournal(dir, source, blankJournal, true, manifest)
  return true
}
