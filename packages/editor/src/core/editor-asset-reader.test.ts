import { type AssetRecordV1, validateAssetCatalog } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { originalPortrait, pngBytes, replacementPortrait } from './__tests__/portrait-bytes.js'
import { UpsertAssetCommand } from './asset-commands.js'
import { sha256Hex } from './binary-signature.js'
import { EditSession } from './edit-session.js'
import { createEditorAssetReader } from './editor-asset-reader.js'
import { openLocalProject } from './open-local.js'
import { toEditorState } from './project-io.js'
import { buildBlankProject } from './seed.js'

const portraitId = 'portrait.reader-test'
const portraitPath = 'assets/authored/portraits/reader-test.png'

async function portraitReader() {
  const files = await buildBlankProject('Asset reader')
  const original = pngBytes(originalPortrait)
  const record: AssetRecordV1 = {
    kind: 'portrait',
    path: portraitPath,
    mediaType: 'image/png',
    bytes: original.byteLength,
    sha256: await sha256Hex(original),
    origin: { kind: 'authored' },
  }
  const catalog = validateAssetCatalog(files['assets/index.json'])
  files['assets/index.json'] = { ...catalog, assets: { ...catalog.assets, [portraitId]: record } }
  files[portraitPath] = original
  const disk = memoryAuthorDirectory(files)
  const { project, scenes, scriptChunks, stamps } = await openLocalProject(disk.dir)
  const source = project.source
  const session = new EditSession(toEditorState(project, scenes, {}, scriptChunks, stamps))
  return { original, record, source, session, disk }
}

test('one reader follows replacement and undo without exposing unsaved image bytes to mutation', async () => {
  const { original, record, source, session } = await portraitReader()
  const reader = createEditorAssetReader(source, () => session.getState())
  const read = vi.spyOn(source, 'readBytes')
  try {
    expect(reader.projectId).toBe('asset-reader')
    expect(new Uint8Array(await reader.readBytes(portraitId, 'portrait'))).toEqual(
      new Uint8Array(original),
    )
    expect(read).toHaveBeenCalledExactlyOnceWith(portraitPath)
    read.mockClear()

    const replacement = pngBytes(replacementPortrait)
    const updated = {
      ...record,
      bytes: replacement.byteLength,
      sha256: await sha256Hex(replacement),
    }
    session.dispatch(new UpsertAssetCommand(portraitId, updated, replacement))
    const readback = await reader.readBytes(portraitId, 'portrait')
    expect(new Uint8Array(readback)).toEqual(new Uint8Array(replacement))
    expect(reader.record(portraitId, 'portrait')).toEqual(updated)
    new Uint8Array(readback)[0] = 0
    expect(new Uint8Array(await reader.readBytes(portraitId, 'portrait'))).toEqual(
      new Uint8Array(replacement),
    )
    expect(read).not.toHaveBeenCalled()

    expect(session.undo()).toBe(true)
    expect(new Uint8Array(await reader.readBytes(portraitId, 'portrait'))).toEqual(
      new Uint8Array(original),
    )
    expect(read).toHaveBeenCalledExactlyOnceWith(portraitPath)
  } finally {
    read.mockRestore()
    source.dispose?.()
  }
})

test('unregistered and mismatched assets fail before any source read', async () => {
  const { source, session } = await portraitReader()
  const reader = createEditorAssetReader(source, session.getState())
  const read = vi.spyOn(source, 'readBytes')
  try {
    await expect(reader.readBytes('portrait.missing', 'portrait')).rejects.toThrow(
      'AssetId "portrait.missing" 不在 catalog',
    )
    await expect(reader.readBytes(portraitId, 'music')).rejects.toThrow(
      'AssetId "portrait.reader-test" 期望 music，实际 portrait',
    )
    expect(read).not.toHaveBeenCalled()
  } finally {
    read.mockRestore()
    source.dispose?.()
  }
})

test('roles select their registered resource and reject an absent role', async () => {
  const { disk, source, session } = await portraitReader()
  const reader = createEditorAssetReader(source, session.getState())
  try {
    const path = 'assets/generated/colors/project-standard.json'
    const expected = disk.files.get(path)
    if (!expected) throw new Error(`Missing color table ${path}`)
    expect(new Uint8Array(await reader.readRoleBytes('visual.standardColorTable'))).toEqual(
      new Uint8Array(expected),
    )
    await expect(reader.readRoleBytes('audio.midiSoundfont')).rejects.toThrow(
      '项目缺资源角色 "audio.midiSoundfont"',
    )
  } finally {
    source.dispose?.()
  }
})

test('asset IDs resolve to authored records even when their names overlap object keys', async () => {
  const { source, session, original, record } = await portraitReader()
  const reader = createEditorAssetReader(source, () => session.getState())
  const read = vi.spyOn(source, 'readBytes')
  try {
    expect(() => reader.record('constructor')).toThrow('AssetId "constructor" 不在 catalog')
    expect(read).not.toHaveBeenCalled()

    const authored = { ...record, path: 'assets/authored/portraits/signed.png' }
    session.dispatch(new UpsertAssetCommand('constructor', authored, original))
    expect(reader.record('constructor', 'portrait')).toEqual(authored)
    expect(await reader.readBytes('constructor', 'portrait')).toEqual(original)
    expect(read).not.toHaveBeenCalled()
  } finally {
    read.mockRestore()
    source.dispose?.()
  }
})
