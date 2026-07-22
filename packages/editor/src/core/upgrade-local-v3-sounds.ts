import {
  type AssetRecordV1,
  exitLegacySoundFamily,
  type LegacyManifestV3,
  normalizeScriptLibrary,
  palSoundAssetId,
  type ScriptChunkV1,
  type ScriptIndexV1,
  upgradeLegacyActorSounds,
  upgradeLegacyEnemySounds,
  upgradeLegacyItemSounds,
  upgradeLegacySkillSounds,
  upgradeLegacySoundCommands,
  validateAssetCatalog,
  validateManifestAssetConfigV3,
  validateProjectRelativePath,
} from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { writeProject } from './project-io.js'
import type { UpgradeLocalV2Options } from './upgrade-local-v2.js'

function asObject(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${where}: 期望对象`)
  return value as Record<string, unknown>
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function assertWave(bytes: ArrayBuffer, where: string): void {
  const view = new Uint8Array(bytes)
  const tag = (offset: number): string => String.fromCharCode(...view.subarray(offset, offset + 4))
  if (view.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE')
    throw new Error(`${where}: 不是 RIFF/WAVE`)
}

async function soundFiles(
  dir: FileSystemDirectoryHandle,
  root: string,
): Promise<Array<{ legacyId: number; name: string; sourcePath: string; bytes: number }>> {
  try {
    validateProjectRelativePath(root, 'manifest.assets.legacy.sounds')
  } catch {
    throw new Error(
      `旧工程音效目录 "${root}" 不是工程内相对路径，无法原地闭包；请先把 HTTP 种子克隆为本地工程`,
    )
  }
  let soundsDir = dir
  for (const segment of root.split('/')) soundsDir = await soundsDir.getDirectoryHandle(segment)
  const entries: Array<{ legacyId: number; name: string; sourcePath: string; bytes: number }> = []
  const seen = new Set<number>()
  for await (const handle of soundsDir.values()) {
    if (handle.kind !== 'file') throw new Error(`旧音效目录包含子目录: ${handle.name}`)
    const match = /^(\d+)\.wav$/i.exec(handle.name)
    if (!match) throw new Error(`旧音效目录包含非规范文件: ${handle.name}`)
    const legacyId = Number(match[1])
    if (!Number.isInteger(legacyId) || legacyId <= 0)
      throw new Error(`旧音效文件编号非法: ${handle.name}`)
    if (legacyId === 122) throw new Error('旧音效目录不应包含已知空槽 122 的假 WAV')
    if (seen.has(legacyId)) throw new Error(`旧音效目录编号重复: ${legacyId}`)
    seen.add(legacyId)
    const file = await (await soundsDir.getFileHandle(handle.name)).getFile()
    entries.push({
      legacyId,
      name: handle.name,
      sourcePath: `${root}/${handle.name}`,
      bytes: file.size,
    })
  }
  return entries.sort((left, right) => left.legacyId - right.legacyId)
}

const PAL_SOUND_ROLE_IDS = {
  'audio.battleItemUseSound': 28,
  'audio.battleCoopCastSound': 29,
  'audio.battleEscapeSound': 45,
  'audio.battleEnemyTransformSound': 47,
} as const

/**
 * 旧 contentVersion 3 的 sound-family 一次性退出。先完整读取/校验/转换，再写二进制与 JSON，manifest 最后。
 */
export async function upgradeLocalProjectV3Sounds(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
  options: UpgradeLocalV2Options = {},
): Promise<boolean> {
  const manifest = asObject(rawManifest, 'manifest') as unknown as LegacyManifestV3
  if (manifest.contentVersion !== 3 || !manifest.assets.legacy?.families.includes('sound'))
    return false
  const legacyRoot = manifest.assets.legacy.sounds
  if (typeof legacyRoot !== 'string')
    throw new Error('manifest 声明 legacy sound family，但缺 legacy.sounds 目录')

  const catalogPath = validateProjectRelativePath(
    manifest.assets.catalog,
    'manifest.assets.catalog',
  )
  const catalog = structuredClone(
    validateAssetCatalog(await source.readJson<unknown>(catalogPath), catalogPath),
  )
  const entries = await soundFiles(dir, legacyRoot)
  const files: Record<string, unknown> = {}
  const readTotal = entries.reduce((sum, entry) => sum + entry.bytes, 0)
  let completed = 0
  options.onSoundUpgradeProgress?.({ phase: 'read', completed, total: readTotal })
  for (const entry of entries) {
    const id = palSoundAssetId(entry.legacyId)
    const existing = catalog.assets[id]
    if (existing) {
      if (existing.kind !== 'sound') throw new Error(`${id}: 已存在但 kind=${existing.kind}`)
      const existingBytes = await source.readBytes(existing.path)
      assertWave(existingBytes, existing.path)
      const existingHash = await sha256Hex(existingBytes)
      if (existing.bytes !== existingBytes.byteLength || existing.sha256 !== existingHash)
        throw new Error(`${id}: catalog bytes/hash 与工程内文件不符`)
      if (existing.origin.kind !== 'authored') {
        const legacyBytes = await source.readBytes(entry.sourcePath)
        assertWave(legacyBytes, entry.sourcePath)
        if (existingHash !== (await sha256Hex(legacyBytes)))
          throw new Error(`${id}: 非 authored 记录与 legacy 音效源不符`)
      }
    } else {
      const bytes = await source.readBytes(entry.sourcePath)
      assertWave(bytes, entry.sourcePath)
      const padded = String(entry.legacyId).padStart(3, '0')
      const record: AssetRecordV1 = {
        kind: 'sound',
        path: `assets/migrated/sounds/${padded}.wav`,
        mediaType: 'audio/wav',
        bytes: bytes.byteLength,
        sha256: await sha256Hex(bytes),
        label: `PAL 音效 ${padded}`,
        origin: { kind: 'legacy-migrated', ref: `sounds/${entry.name}` },
      }
      catalog.assets[id] = record
      files[record.path] = bytes
    }
    completed += entry.bytes
    options.onSoundUpgradeProgress?.({ phase: 'read', completed, total: readTotal })
  }
  const resolveSound = (legacyId: number) => {
    const id = palSoundAssetId(legacyId)
    return catalog.assets[id]?.kind === 'sound' ? id : undefined
  }

  const content = manifest.content
  if (content.actors)
    files[content.actors] = upgradeLegacyActorSounds(
      await source.readJson<unknown>(content.actors),
      resolveSound,
    )
  if (content.enemies) {
    const upgraded = upgradeLegacyEnemySounds(
      await source.readJson<unknown>(content.enemies),
      resolveSound,
    )
    files[content.enemies] = upgradeLegacySoundCommands(upgraded, resolveSound)
  }
  if (content.skills)
    files[content.skills] = upgradeLegacySkillSounds(
      await source.readJson<unknown>(content.skills),
      resolveSound,
    )
  if (content.items)
    files[content.items] = upgradeLegacyItemSounds(
      await source.readJson<unknown>(content.items),
      resolveSound,
    )

  const sceneDir = (content.scenes ?? 'content/scenes/').replace(/\/?$/, '/')
  const sceneIds = await source.readJson<string[]>(`${sceneDir}index.json`)
  for (const id of sceneIds) {
    const path = `${sceneDir}${id}.json`
    files[path] = upgradeLegacySoundCommands(await source.readJson<unknown>(path), resolveSound)
  }
  const scriptDir = content.scripts?.replace(/\/?$/, '/')
  if (scriptDir) {
    const index = await source.readJson<ScriptIndexV1>(`${scriptDir}index.json`)
    const chunks: Record<string, ScriptChunkV1> = {}
    for (const [id, meta] of Object.entries(index.chunks)) {
      const path = `${scriptDir}${meta.path}`
      chunks[id] = upgradeLegacySoundCommands(
        await source.readJson<unknown>(path),
        resolveSound,
      ) as ScriptChunkV1
    }
    const normalized = normalizeScriptLibrary(index, chunks)
    files[`${scriptDir}index.json`] = normalized.index
    for (const [id, chunk] of Object.entries(normalized.chunks)) {
      const meta = normalized.index.chunks[id]
      if (!meta) throw new Error(`脚本分片 ${id} 缺失重算元数据`)
      files[`${scriptDir}${meta.path}`] = chunk
    }
  }

  const roles = Object.fromEntries(
    Object.entries(PAL_SOUND_ROLE_IDS).flatMap(([role, legacyId]) => {
      const asset = resolveSound(legacyId)
      return asset ? [[role, asset]] : []
    }),
  )
  const nextManifest = exitLegacySoundFamily({ manifest, roles, catalog })
  validateManifestAssetConfigV3(nextManifest.assets, catalog)
  files[catalogPath] = catalog
  // insertion order 是发布顺序；只有全部字节、内容和 catalog 写完，才切换 family 判据。
  files['manifest.json'] = nextManifest
  await writeProject(dir, files, {
    onProgress: (progress) => options.onSoundUpgradeProgress?.({ phase: 'write', ...progress }),
  })
  return true
}
