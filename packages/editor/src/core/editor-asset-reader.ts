import {
  ASSET_ROLE_KINDS,
  type AssetId,
  type AssetKind,
  type AssetRecordV1,
  type AssetRole,
} from '@type-pal/content'
import type { AudioAssetReader, FileSource } from '@type-pal/reforge'
import type { EditorState } from './edit-session.js'

/** 编辑器资源读取器：未保存 blob 覆盖磁盘，同一 catalog/roles 契约与正式运行时一致。 */
export interface EditorAssetReader extends AudioAssetReader {
  readonly projectId: string
  record(asset: AssetId, expectedKind?: AssetKind): AssetRecordV1
  urlFor(asset: AssetId, expectedKind?: AssetKind): Promise<string>
}

export function createEditorAssetReader(
  source: FileSource,
  state:
    | Pick<EditorState, 'assetCatalog' | 'assetBlobs' | 'manifest'>
    | (() => Pick<EditorState, 'assetCatalog' | 'assetBlobs' | 'manifest'>),
): EditorAssetReader {
  const current = (): Pick<EditorState, 'assetCatalog' | 'assetBlobs' | 'manifest'> =>
    typeof state === 'function' ? state() : state
  const record = (asset: AssetId, expectedKind?: AssetKind): AssetRecordV1 => {
    const value = current().assetCatalog.assets[asset]
    if (!value) throw new Error(`AssetId "${asset}" 不在 catalog`)
    if (expectedKind && value.kind !== expectedKind)
      throw new Error(`AssetId "${asset}" 期望 ${expectedKind}，实际 ${value.kind}`)
    return value
  }
  const readBytes = async (asset: AssetId, expectedKind?: AssetKind): Promise<ArrayBuffer> => {
    const value = record(asset, expectedKind)
    const pending = current().assetBlobs[value.path]
    return pending ? pending.slice(0) : source.readBytes(value.path)
  }
  return {
    get projectId() {
      return current().manifest.id
    },
    record,
    readBytes,
    async readRoleBytes(role: AssetRole) {
      const asset = current().manifest.assets.roles[role]
      if (!asset) throw new Error(`工程缺资源角色 "${role}"`)
      return readBytes(asset, ASSET_ROLE_KINDS[role])
    },
    async urlFor(asset: AssetId, expectedKind?: AssetKind) {
      const value = record(asset, expectedKind)
      const pending = current().assetBlobs[value.path]
      if (!pending) return source.urlFor(value.path)
      return URL.createObjectURL(new Blob([pending], { type: value.mediaType }))
    },
  }
}

/** 旧调用名保留在编辑器内部，返回值已经具备通用资源读取能力。 */
export const createEditorAudioReader = createEditorAssetReader
