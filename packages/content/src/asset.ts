import type { EnemyDef } from './enemy.js'
import type { SceneDef } from './index.js'
import type { ScriptChunkV1 } from './script-library.js'

export type AssetId = string

export const ASSET_KINDS = [
  'music',
  'sound',
  'soundfont',
  'tileset',
  'sprite',
  'battle-sprite',
  'effect-sprite',
  'portrait',
  'face',
  'item-icon',
  'battle-background',
  'rng',
  'video',
  'glyph-table',
  'ui-image',
  'color-table',
] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

export const ASSET_ROLES = [
  'audio.midiSoundfont',
  'audio.defaultBattleMusic',
  'audio.bossVictoryMusic',
  'audio.normalVictoryMusic',
  'audio.openingMenuMusic',
] as const
export type AssetRole = (typeof ASSET_ROLES)[number]

export const AUDIO_ASSET_ROLES: Readonly<Record<AssetRole, AssetKind>> = {
  'audio.midiSoundfont': 'soundfont',
  'audio.defaultBattleMusic': 'music',
  'audio.bossVictoryMusic': 'music',
  'audio.normalVictoryMusic': 'music',
  'audio.openingMenuMusic': 'music',
}

export type AssetOriginKind = 'legacy-migrated' | 'authored' | 'generated' | 'licensed'

export interface AssetRecordV1 {
  kind: AssetKind
  /** 当前工程根下的规范相对路径；AssetId 不得用来推导此路径。 */
  path: string
  mediaType: string
  bytes: number
  sha256: string
  label?: string
  origin: { kind: AssetOriginKind; ref?: string }
}

export interface AssetCatalogV1 {
  version: 1
  assets: Record<AssetId, AssetRecordV1>
}

export const LEGACY_ASSET_FAMILIES = [
  'music',
  'soundfont',
  'sound',
  'tileset',
  'sprite',
  'battle-sprite',
  'effect-sprite',
  'portrait',
  'face',
  'item-icon',
  'battle-background',
  'rng',
  'video',
  'glyph-table',
  'ui-image',
  'color-table',
  'image',
] as const
export type LegacyAssetFamily = (typeof LEGACY_ASSET_FAMILIES)[number]

/** contentVersion 3 的迁移债务区；只有 LegacyAssetAdapter 可以解释这些旧目录。 */
export interface LegacyAssetConfigV3 {
  families: LegacyAssetFamily[]
  root?: string
  tilesets?: string
  sprites?: string
  palettes?: string
  sounds?: string
  portraits?: string
  faces?: string
  itemIcons?: string
  ui?: string
  images?: string
  rng?: string
  videos?: string
}

export interface ManifestAssetConfigV3 {
  catalog: string
  roles: Partial<Record<AssetRole, AssetId>>
  legacy?: LegacyAssetConfigV3
}

const kindSet = new Set<string>(ASSET_KINDS)
const roleSet = new Set<string>(ASSET_ROLES)
const legacyFamilySet = new Set<string>(LEGACY_ASSET_FAMILIES)
const originSet = new Set<string>(['legacy-migrated', 'authored', 'generated', 'licensed'])

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

/**
 * 返回原值或 fail-loud。注册表和 FileSource 共用这一条路径边界，禁止隐式规范化。
 */
export function validateProjectRelativePath(path: string, where = '资源路径'): string {
  if (typeof path !== 'string' || path.length === 0) throw new Error(`${where}: 路径不能为空`)
  if (path.includes('\0')) throw new Error(`${where}: 路径包含 NUL`)
  if (path.startsWith('/')) throw new Error(`${where}: 禁止绝对路径 "${path}"`)
  if (/^[A-Za-z]:/.test(path)) throw new Error(`${where}: 禁止盘符路径 "${path}"`)
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(path)) throw new Error(`${where}: 禁止 URL scheme "${path}"`)
  if (path.includes('\\')) throw new Error(`${where}: 禁止反斜杠 "${path}"`)
  if (path.includes('?') || path.includes('#'))
    throw new Error(`${where}: 禁止 query/fragment "${path}"`)
  const segments = path.split('/')
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..'))
    throw new Error(`${where}: 禁止空段、. 或 .. "${path}"`)
  return path
}

export function validateAssetCatalog(value: unknown, where = 'assets/index.json'): AssetCatalogV1 {
  const root = objectAt(value, where)
  if (root.version !== 1) throw new Error(`${where}.version: 期望 1`)
  const assets = objectAt(root.assets, `${where}.assets`)
  for (const [id, raw] of Object.entries(assets)) {
    if (id.trim().length === 0) throw new Error(`${where}.assets: AssetId 不能为空`)
    const record = objectAt(raw, `${where}.assets[${JSON.stringify(id)}]`)
    if (typeof record.kind !== 'string' || !kindSet.has(record.kind))
      throw new Error(`${where}.assets[${JSON.stringify(id)}].kind: 非法 AssetKind`)
    validateProjectRelativePath(
      record.path as string,
      `${where}.assets[${JSON.stringify(id)}].path`,
    )
    if (typeof record.mediaType !== 'string' || record.mediaType.trim().length === 0)
      throw new Error(`${where}.assets[${JSON.stringify(id)}].mediaType: 期望非空字符串`)
    if (!Number.isInteger(record.bytes) || (record.bytes as number) < 0)
      throw new Error(`${where}.assets[${JSON.stringify(id)}].bytes: 期望非负整数`)
    if (typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256))
      throw new Error(`${where}.assets[${JSON.stringify(id)}].sha256: 期望 64 位小写十六进制`)
    if (record.label !== undefined && typeof record.label !== 'string')
      throw new Error(`${where}.assets[${JSON.stringify(id)}].label: 期望字符串`)
    const origin = objectAt(record.origin, `${where}.assets[${JSON.stringify(id)}].origin`)
    if (typeof origin.kind !== 'string' || !originSet.has(origin.kind))
      throw new Error(`${where}.assets[${JSON.stringify(id)}].origin.kind: 非法来源`)
    if (origin.ref !== undefined && typeof origin.ref !== 'string')
      throw new Error(`${where}.assets[${JSON.stringify(id)}].origin.ref: 期望字符串`)
    const ownedPrefix: Partial<Record<AssetOriginKind, string>> = {
      'legacy-migrated': 'assets/migrated/',
      authored: 'assets/authored/',
      generated: 'assets/generated/',
      licensed: 'assets/runtime/',
    }
    const expectedPrefix = ownedPrefix[origin.kind as AssetOriginKind]
    if (expectedPrefix && !(record.path as string).startsWith(expectedPrefix))
      throw new Error(
        `${where}.assets[${JSON.stringify(id)}].path: ${String(origin.kind)} 资源必须位于 ${expectedPrefix}`,
      )
  }
  return value as AssetCatalogV1
}

function familyForKind(kind: AssetKind): LegacyAssetFamily {
  return kind
}

export function validateManifestAssetConfigV3(
  value: unknown,
  catalog?: AssetCatalogV1,
  where = 'manifest.assets',
): ManifestAssetConfigV3 {
  const assets = objectAt(value, where)
  validateProjectRelativePath(assets.catalog as string, `${where}.catalog`)
  const roles = objectAt(assets.roles, `${where}.roles`)
  for (const [role, id] of Object.entries(roles)) {
    if (!roleSet.has(role)) throw new Error(`${where}.roles.${role}: 未知资源角色`)
    if (typeof id !== 'string' || id.length === 0)
      throw new Error(`${where}.roles.${role}: 期望非空 AssetId`)
  }

  let families: LegacyAssetFamily[] = []
  if (assets.legacy !== undefined) {
    const legacy = objectAt(assets.legacy, `${where}.legacy`)
    if (!Array.isArray(legacy.families)) throw new Error(`${where}.legacy.families: 期望数组`)
    families = legacy.families.map((family, index) => {
      if (typeof family !== 'string' || !legacyFamilySet.has(family))
        throw new Error(`${where}.legacy.families[${index}]: 未知 legacy family`)
      return family as LegacyAssetFamily
    })
    if (new Set(families).size !== families.length)
      throw new Error(`${where}.legacy.families: 不允许重复 family`)
  }

  if (catalog) {
    const entries = Object.entries(catalog.assets)
    const catalogFamilies = new Set(entries.map(([, record]) => familyForKind(record.kind)))
    for (const family of families) {
      if (catalogFamilies.has(family))
        throw new Error(`${where}: 资源族 "${family}" 同时出现在 catalog 与 legacy`)
    }

    const hasAudio = entries.some(
      ([, record]) => record.kind === 'music' || record.kind === 'soundfont',
    )
    if (hasAudio) {
      for (const role of ASSET_ROLES) {
        if (!(role in roles)) throw new Error(`${where}.roles: 音乐切片缺角色 "${role}"`)
      }
    }
    for (const role of ASSET_ROLES) {
      const id = roles[role]
      if (id === undefined) continue
      const record = catalog.assets[id as string]
      if (!record) throw new Error(`${where}.roles.${role}: AssetId "${String(id)}" 不存在`)
      const expected = AUDIO_ASSET_ROLES[role]
      if (record.kind !== expected)
        throw new Error(`${where}.roles.${role}: 期望 ${expected}，实际 ${record.kind}`)
    }
  }
  return value as ManifestAssetConfigV3
}

export function palMusicAssetId(track: number): AssetId {
  if (!Number.isInteger(track) || track <= 0)
    throw new Error(`PAL 音乐号必须是正整数，收到 ${String(track)}`)
  return `music.pal.${String(track).padStart(3, '0')}`
}

export interface AssetReference {
  asset: AssetId
  expectedKind: AssetKind
  where: string
}

export interface AssetReferenceSource {
  assets?: ManifestAssetConfigV3
  scenes?: readonly SceneDef[]
  scriptChunks?: Readonly<Record<string, ScriptChunkV1>> | readonly ScriptChunkV1[]
  enemies?: readonly EnemyDef[]
}

function collectCommandMusic(node: unknown, where: string, out: AssetReference[]): void {
  if (Array.isArray(node)) {
    node.forEach((value, index) => {
      collectCommandMusic(value, `${where}[${index}]`, out)
    })
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (record.kind === 'playMusic' && typeof record.asset === 'string')
    out.push({ asset: record.asset, expectedKind: 'music', where: `${where}.asset` })
  if (record.kind === 'startBattle' && typeof record.music === 'string')
    out.push({ asset: record.music, expectedKind: 'music', where: `${where}.music` })
  for (const [key, value] of Object.entries(record))
    collectCommandMusic(value, `${where}.${key}`, out)
}

/** 音乐首切片的 typed 引用边；后续 A7 切片按资源族扩充本函数。 */
export function collectAssetReferences(source: AssetReferenceSource): AssetReference[] {
  const references: AssetReference[] = []
  if (source.assets) {
    for (const role of ASSET_ROLES) {
      const asset = source.assets.roles[role]
      if (asset)
        references.push({
          asset,
          expectedKind: AUDIO_ASSET_ROLES[role],
          where: `manifest.assets.roles.${role}`,
        })
    }
  }
  source.scenes?.forEach((scene, index) => {
    if (typeof scene.music === 'string')
      references.push({
        asset: scene.music,
        expectedKind: 'music',
        where: `scenes[${index}].music`,
      })
    if (typeof scene.battleMusic === 'string')
      references.push({
        asset: scene.battleMusic,
        expectedKind: 'music',
        where: `scenes[${index}].battleMusic`,
      })
    collectCommandMusic(scene.onEnter, `scenes[${index}].onEnter`, references)
    collectCommandMusic(scene.onTeleport, `scenes[${index}].onTeleport`, references)
    collectCommandMusic(scene.entities, `scenes[${index}].entities`, references)
  })
  const chunks = Array.isArray(source.scriptChunks)
    ? source.scriptChunks
    : Object.values(source.scriptChunks ?? {})
  chunks.forEach((chunk, index) => {
    collectCommandMusic(chunk.scripts, `scriptChunks[${index}].scripts`, references)
  })
  source.enemies?.forEach((enemy, index) => {
    collectCommandMusic(enemy.choreography, `enemies[${index}].choreography`, references)
    collectCommandMusic(enemy.onDefeated, `enemies[${index}].onDefeated`, references)
  })
  return references
}

export interface AssetClosureIssue {
  severity: 'error' | 'warn'
  code:
    | 'missing-asset'
    | 'kind-mismatch'
    | 'missing-file'
    | 'bytes-mismatch'
    | 'hash-mismatch'
    | 'unused-asset'
  where: string
  message: string
}

export function validateAssetReferenceClosure(
  catalog: AssetCatalogV1,
  references: readonly AssetReference[],
): AssetClosureIssue[] {
  const issues: AssetClosureIssue[] = []
  const used = new Set<AssetId>()
  for (const reference of references) {
    used.add(reference.asset)
    const record = catalog.assets[reference.asset]
    if (!record) {
      issues.push({
        severity: 'error',
        code: 'missing-asset',
        where: reference.where,
        message: `AssetId "${reference.asset}" 不在 catalog`,
      })
    } else if (record.kind !== reference.expectedKind) {
      issues.push({
        severity: 'error',
        code: 'kind-mismatch',
        where: reference.where,
        message: `AssetId "${reference.asset}" 期望 ${reference.expectedKind}，实际 ${record.kind}`,
      })
    }
  }
  for (const id of Object.keys(catalog.assets)) {
    if (!used.has(id))
      issues.push({
        severity: 'warn',
        code: 'unused-asset',
        where: `assets[${JSON.stringify(id)}]`,
        message: `AssetId "${id}" 当前未被引用`,
      })
  }
  return issues
}

export interface AssetFileClosureOptions {
  readBytes(path: string): Promise<Uint8Array>
  sha256(bytes: Uint8Array): Promise<string> | string
}

export async function validateAssetFileClosure(
  catalog: AssetCatalogV1,
  references: readonly AssetReference[],
  options: AssetFileClosureOptions,
): Promise<AssetClosureIssue[]> {
  const issues = validateAssetReferenceClosure(catalog, references)
  const referencedIds = new Set(references.map((reference) => reference.asset))
  for (const id of [...referencedIds].sort()) {
    const record = catalog.assets[id]
    if (!record) continue
    let bytes: Uint8Array
    try {
      bytes = await options.readBytes(record.path)
    } catch (error) {
      issues.push({
        severity: 'error',
        code: 'missing-file',
        where: `assets[${JSON.stringify(id)}].path`,
        message: `无法读取 "${record.path}": ${error instanceof Error ? error.message : String(error)}`,
      })
      continue
    }
    if (bytes.byteLength !== record.bytes)
      issues.push({
        severity: 'error',
        code: 'bytes-mismatch',
        where: `assets[${JSON.stringify(id)}].bytes`,
        message: `登记 ${record.bytes}，实际 ${bytes.byteLength}`,
      })
    const hash = await options.sha256(bytes)
    if (hash !== record.sha256)
      issues.push({
        severity: 'error',
        code: 'hash-mismatch',
        where: `assets[${JSON.stringify(id)}].sha256`,
        message: `登记 ${record.sha256}，实际 ${hash}`,
      })
  }
  return issues
}
