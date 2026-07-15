import type { AssetId, AssetKind, AssetRole } from '@type-pal/content'
import type { AudioAssetReader, FileSource } from '@type-pal/reforge'
import type { EditorState } from './edit-session.js'

/** 预览读取器：未保存 blob 覆盖磁盘，同一 catalog/roles 契约与正式运行时一致。 */
export function createEditorAudioReader(
  source: FileSource,
  state: Pick<EditorState, 'assetCatalog' | 'assetBlobs' | 'manifest'>,
): AudioAssetReader {
  const readBytes = async (asset: AssetId, expectedKind?: AssetKind): Promise<ArrayBuffer> => {
    const record = state.assetCatalog.assets[asset]
    if (!record) throw new Error(`AssetId "${asset}" 不在 catalog`)
    if (expectedKind && record.kind !== expectedKind)
      throw new Error(`AssetId "${asset}" 期望 ${expectedKind}，实际 ${record.kind}`)
    const pending = state.assetBlobs[record.path]
    return pending ? pending.slice(0) : source.readBytes(record.path)
  }
  return {
    readBytes,
    async readRoleBytes(role: AssetRole) {
      const asset = state.manifest.assets.roles[role]
      if (!asset) throw new Error(`工程缺资源角色 "${role}"`)
      return readBytes(asset, role === 'audio.midiSoundfont' ? 'soundfont' : 'music')
    },
  }
}
