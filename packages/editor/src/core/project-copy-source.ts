/** Optimistic source evidence for staging a copy. Retains hashes, never the whole asset set. */

import { validateAssetCatalog } from '@type-pal/content'
import { assertProjectSaveReadable, type FileSource } from '@type-pal/reforge'
import { AuthorSaveConflictError } from './author-disk-baseline.js'
import { binarySnapshotSignature } from './binary-signature.js'
import type { ProjectCopyInput } from './project-io.js'

/** Only missing source assets are streamed; in-memory upload overrides remain authoritative. */
export function assetCopyInputs(
  files: Record<string, unknown>,
  source: FileSource,
): ProjectCopyInput[] {
  const manifest = files['manifest.json'] as { assets: { catalog: string } }
  const catalog = validateAssetCatalog(files[manifest.assets.catalog])
  return [...new Set(Object.values(catalog.assets).map((record) => record.path))]
    .filter((path) => !(path in files))
    .map((path) => ({ path, read: async () => new Blob([await source.readBytes(path)]) }))
}

export async function observeProjectCopySource(original: FileSource) {
  const state = await assertProjectSaveReadable(original)
  const signatures = new Map<string, string>()
  const readBytes: FileSource['readBytes'] = async (path, signal) => {
    const bytes = await original.readBytes(path, signal)
    const digest = await binarySnapshotSignature(bytes)
    const previous = signatures.get(path)
    if (previous !== undefined && previous !== digest) throw new AuthorSaveConflictError(path)
    signatures.set(path, digest)
    return bytes
  }
  const source: FileSource = {
    readBytes,
    readText: async (path, signal) => new TextDecoder().decode(await readBytes(path, signal)),
    readJson: async <T>(path: string, signal?: AbortSignal) =>
      JSON.parse(new TextDecoder().decode(await readBytes(path, signal))) as T,
    urlFor: async () => {
      throw new Error('复制源只提供被核验的文件字节，不能用于渲染')
    },
  }
  const verifyState = async () => {
    if ((await assertProjectSaveReadable(original)) !== state)
      throw new Error('项目在复制期间完成了新的保存，请重新打开后再复制')
  }
  return {
    source,
    async verify() {
      await verifyState()
      for (const [path, expected] of signatures)
        if ((await binarySnapshotSignature(await original.readBytes(path))) !== expected)
          throw new AuthorSaveConflictError(path)
      await verifyState()
    },
  }
}
