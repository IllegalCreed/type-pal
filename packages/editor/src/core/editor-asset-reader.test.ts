import type { LoadedManifest } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { describe, expect, it, vi } from 'vitest'
import type { EditorState } from './edit-session.js'
import { createEditorAssetReader } from './editor-asset-reader.js'

function fixture(): Pick<EditorState, 'assetCatalog' | 'assetBlobs' | 'manifest'> {
  return {
    assetCatalog: {
      version: 1,
      assets: {
        'video.demo': {
          kind: 'video',
          path: 'assets/authored/video/demo.mp4',
          mediaType: 'video/mp4',
          bytes: 3,
          sha256: '0'.repeat(64),
          origin: { kind: 'authored' },
        },
        'color.demo': {
          kind: 'color-table',
          path: 'assets/authored/color/demo.json',
          mediaType: 'application/json',
          bytes: 2,
          sha256: '1'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    },
    assetBlobs: { 'assets/authored/video/demo.mp4': Uint8Array.from([1, 2, 3]).buffer },
    manifest: {
      assets: {
        catalog: 'assets/index.json',
        roles: { 'visual.standardColorTable': 'color.demo' },
      },
    } as LoadedManifest,
  }
}

describe('editor asset reader', () => {
  it('未保存 blob 覆盖文件源，并对 kind/role fail-loud', async () => {
    const readBytes = vi.fn(async () => Uint8Array.from([9, 9]).buffer)
    const source = {
      readBytes,
      readText: vi.fn(),
      readJson: vi.fn(),
      urlFor: vi.fn(async (path: string) => `/project/${path}`),
    } as unknown as FileSource
    const reader = createEditorAssetReader(source, fixture())
    await expect(reader.readBytes('video.demo', 'video')).resolves.toEqual(
      Uint8Array.from([1, 2, 3]).buffer,
    )
    expect(readBytes).not.toHaveBeenCalled()
    await expect(reader.readRoleBytes('visual.standardColorTable')).resolves.toEqual(
      Uint8Array.from([9, 9]).buffer,
    )
    await expect(reader.readBytes('video.demo', 'music')).rejects.toThrow(/期望 music/)
    await expect(reader.readBytes('missing')).rejects.toThrow(/不在 catalog/)
  })
})
