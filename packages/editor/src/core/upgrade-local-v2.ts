import {
  type AssetCatalogV1,
  type AssetRecordV1,
  applyV2MusicLabels,
  normalizeScriptLibrary,
  palMusicAssetId,
  type ScriptChunkV1,
  type ScriptIndexV1,
  upgradeManifestV2ToV3,
  upgradeV2MusicReferences,
  validateAssetCatalog,
  validateProjectRelativePath,
} from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { writeProject } from './project-io.js'

interface ManifestV2 {
  contentVersion: 2
  content: Record<string, string>
  assets?: Record<string, unknown>
}

export interface UpgradeLocalV2Options {
  readSoundfont?: () => Promise<ArrayBuffer>
  onSoundUpgradeProgress?: (progress: SoundUpgradeProgress) => void
}

export interface SoundUpgradeProgress {
  phase: 'read' | 'write'
  /** 当前阶段已处理字节；UI 可直接显示真实 MB，而不是把文件个数伪装成进度。 */
  completed: number
  total: number
}

function asObject(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${where}: 期望对象`)
  return value as Record<string, unknown>
}

function joinLegacyPath(root: string, file: string): string {
  try {
    validateProjectRelativePath(root, '旧工程 manifest.assets.music')
  } catch {
    throw new Error(
      `旧工程音乐目录 "${root}" 不是工程内相对路径，无法闭包升级；请先从 PAL 种子克隆为本地工程`,
    )
  }
  return `${root.replace(/\/$/, '')}/${file}`
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function defaultSoundfont(): Promise<ArrayBuffer> {
  const response = await fetch('/soundfont.sf3')
  if (!response.ok) throw new Error(`读取应用音色库失败: ${response.status}`)
  return response.arrayBuffer()
}

async function buildAudioCatalog(
  source: FileSource,
  manifest: ManifestV2,
  files: Record<string, unknown>,
  options: UpgradeLocalV2Options,
): Promise<{
  catalog: AssetCatalogV1
  roles: Record<string, string>
  oldMusicPath?: string
}> {
  const oldMusicPath = manifest.content.music
  if (!oldMusicPath) return { catalog: { version: 1, assets: {} }, roles: {} }

  const musicTable = await source.readJson<unknown>(oldMusicPath)
  if (!Array.isArray(musicTable)) throw new Error(`${oldMusicPath}: 期望音乐数组`)
  const oldAssets = asObject(manifest.assets ?? {}, 'manifest.assets')
  if (typeof oldAssets.music !== 'string')
    throw new Error('旧工程声明 content.music，但缺少 manifest.assets.music')

  const assets: AssetCatalogV1['assets'] = {}
  const musicIds: string[] = []
  for (const [index, raw] of musicTable.entries()) {
    const entry = asObject(raw, `${oldMusicPath}[${index}]`)
    const track = Number(entry.id)
    if (!Number.isInteger(track) || track <= 0)
      throw new Error(`${oldMusicPath}[${index}].id: 期望正整数`)
    const padded = String(track).padStart(3, '0')
    const sourcePath = joinLegacyPath(oldAssets.music, `${padded}.mid`)
    const targetPath = `assets/migrated/music/${padded}.mid`
    const bytes = await source.readBytes(sourcePath)
    const id = palMusicAssetId(track)
    assets[id] = {
      kind: 'music',
      path: targetPath,
      mediaType: 'audio/midi',
      bytes: bytes.byteLength,
      sha256: await sha256Hex(bytes),
      label: `PAL 音乐 ${padded}`,
      origin: { kind: 'legacy-migrated', ref: `music/${padded}.mid` },
    }
    files[targetPath] = bytes
    musicIds.push(id)
  }

  const soundfont = await (options.readSoundfont ?? defaultSoundfont)()
  const soundfontRecord: AssetRecordV1 = {
    kind: 'soundfont',
    path: 'assets/runtime/soundfont.sf3',
    mediaType: 'audio/sf3',
    bytes: soundfont.byteLength,
    sha256: await sha256Hex(soundfont),
    label: 'TimGM6mb',
    origin: { kind: 'licensed', ref: 'packages/reforge/public/soundfont.sf3' },
  }
  assets['soundfont.default'] = soundfontRecord
  files[soundfontRecord.path] = soundfont

  const catalog = applyV2MusicLabels({ version: 1, assets }, musicTable)
  const fallback = musicIds[0]
  if (!fallback) throw new Error(`${oldMusicPath}: 音乐表为空，无法建立运行角色`)
  const roleTrack = (track: number): string => {
    const preferred = palMusicAssetId(track)
    return catalog.assets[preferred] ? preferred : fallback
  }
  return {
    catalog,
    roles: {
      'audio.midiSoundfont': 'soundfont.default',
      'audio.defaultBattleMusic': roleTrack(37),
      'audio.bossVictoryMusic': roleTrack(2),
      'audio.normalVictoryMusic': roleTrack(3),
      'audio.openingMenuMusic': roleTrack(4),
    },
    oldMusicPath,
  }
}

async function upgradeReferencedJson(
  source: FileSource,
  files: Record<string, unknown>,
  path: string,
): Promise<void> {
  files[path] = upgradeV2MusicReferences(await source.readJson<unknown>(path))
}

/**
 * 本地 v2 工程的一次性边界升级。先写内容、catalog 与二进制，最后写 v3 manifest；
 * 因此中途失败不会让运行时把半升级目录误认成 v3。
 */
export async function upgradeLocalProjectV2(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
  options: UpgradeLocalV2Options = {},
): Promise<boolean> {
  const manifest = asObject(rawManifest, 'manifest') as unknown as ManifestV2
  if (manifest.contentVersion !== 2) return false

  const files: Record<string, unknown> = {}
  const audio = await buildAudioCatalog(source, manifest, files, options)
  const sceneDir = (manifest.content.scenes ?? 'content/scenes/').replace(/\/?$/, '/')
  const sceneIds = await source.readJson<string[]>(`${sceneDir}index.json`)
  for (const id of sceneIds) await upgradeReferencedJson(source, files, `${sceneDir}${id}.json`)

  const scriptDir = manifest.content.scripts?.replace(/\/?$/, '/')
  if (scriptDir) {
    const index = await source.readJson<ScriptIndexV1>(`${scriptDir}index.json`)
    const chunks: Record<string, ScriptChunkV1> = {}
    for (const [id, meta] of Object.entries(index.chunks))
      chunks[id] = upgradeV2MusicReferences(
        await source.readJson<unknown>(`${scriptDir}${meta.path}`),
      ) as ScriptChunkV1
    const normalized = normalizeScriptLibrary(index, chunks)
    files[`${scriptDir}index.json`] = normalized.index
    for (const [id, chunk] of Object.entries(normalized.chunks)) {
      const meta = normalized.index.chunks[id]
      if (!meta) throw new Error(`脚本分片 ${id} 缺失重算元数据`)
      files[`${scriptDir}${meta.path}`] = chunk
    }
  }
  if (manifest.content.enemies) await upgradeReferencedJson(source, files, manifest.content.enemies)

  const upgraded = upgradeManifestV2ToV3({
    manifest: rawManifest,
    catalog: audio.catalog,
    roles: audio.roles,
  })
  files[upgraded.assets.catalog] = audio.catalog
  // 必须最后插入，writeProject 按插入序写出；半途失败时旧 v2 清单仍有效。
  files['manifest.json'] = upgraded
  await writeProject(dir, files, {
    removePaths: audio.oldMusicPath ? [audio.oldMusicPath] : [],
  })
  return true
}

/**
 * A7-0A 的 v3 打开边界补全：已有音乐工程缺标题菜单角色时写回清单。
 * 只补缺失键，不修正非法值；非法角色仍交给 content validator fail-loud。
 */
export async function completeLocalProjectV3AudioRoles(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
): Promise<boolean> {
  const manifest = asObject(rawManifest, 'manifest')
  if (manifest.contentVersion !== 3) return false

  const assets = asObject(manifest.assets, 'manifest.assets')
  const roles = asObject(assets.roles, 'manifest.assets.roles')
  const role = 'audio.openingMenuMusic'
  if (role in roles) return false

  const catalogPath = validateProjectRelativePath(
    assets.catalog as string,
    'manifest.assets.catalog',
  )
  const catalog = validateAssetCatalog(await source.readJson<unknown>(catalogPath), catalogPath)
  const musicIds = Object.entries(catalog.assets)
    .filter(([, record]) => record.kind === 'music')
    .map(([id]) => id)
    .sort((left, right) => left.localeCompare(right))
  const fallback = musicIds[0]
  if (!fallback) return false

  const preferred = palMusicAssetId(4)
  const openingMenuMusic = catalog.assets[preferred]?.kind === 'music' ? preferred : fallback
  await writeProject(dir, {
    'manifest.json': {
      ...manifest,
      assets: {
        ...assets,
        roles: { ...roles, [role]: openingMenuMusic },
      },
    },
  })
  return true
}
