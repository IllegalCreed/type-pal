import { validateAssetCatalog } from '@type-pal/content'
import {
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadStampTemplates,
} from '@type-pal/reforge/author-io'
import { expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { originalPortrait, pngBytes, replacementPortrait } from './__tests__/portrait-bytes.js'
import { sha256Hex } from './binary-signature.js'
import {
  AssetInUseError,
  DeleteAssetCommand,
  UpdateAssetLabelCommand,
  UpsertAssetCommand,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { toEditorState } from './project-io.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import type { ScriptEditorState } from './script-editor.js'
import { buildBlankProject } from './seed.js'

const assetId = 'portrait.test'
const path = 'assets/authored/portraits/test.png'

async function portraitProject() {
  const files = await buildBlankProject('Catalog commands')
  const bytes = pngBytes(originalPortrait)
  const record = {
    kind: 'portrait' as const,
    path,
    mediaType: 'image/png',
    bytes: bytes.byteLength,
    sha256: await sha256Hex(bytes),
    label: '原头像名',
    origin: { kind: 'authored' as const },
  }
  const catalog = validateAssetCatalog(files['assets/index.json'])
  files['assets/index.json'] = { ...catalog, assets: { ...catalog.assets, [assetId]: record } }
  files[path] = bytes
  const source = fsaSource(memoryAuthorDirectory(files).dir)
  try {
    const project = await loadCurrentProjectFrom(source)
    const state = toEditorState(
      project,
      await loadAllAuthorScenes(project),
      {},
      {},
      await loadStampTemplates(project),
    )
    return { state, record, bytes }
  } finally {
    source.dispose?.()
  }
}

function scriptUsingPortrait(): ScriptEditorState {
  return {
    scenes: [],
    items: [],
    sharedScripts: {
      shared: {
        name: '共享脚本',
        self: 'none',
        body: [
          {
            kind: 'dialog',
            cue: {
              identity: { kind: 'unbound', portrait: { asset: assetId, side: 'left' } },
              rows: [{ text: 'name.hero' }],
            },
          },
        ],
      },
    },
  }
}

test('clearing a displayed name removes the field, keeps the resource, and is undoable', async () => {
  const { state, record } = await portraitProject()
  const session = new EditSession(state)
  const command = new UpdateAssetLabelCommand(assetId, '')
  expect(command.label).toBe('修改资源名称')
  expect(session.dispatch(command)).toBe(true)
  const current = session.getState().assetCatalog.assets[assetId]
  expect(current).toMatchObject({ path: record.path, sha256: record.sha256 })
  expect(current).not.toHaveProperty('label')
  expect(state.assetCatalog.assets[assetId]).toEqual(record)
  expect(session.undo()).toBe(true)
  expect(session.getState().assetCatalog.assets[assetId]).toEqual(record)
  expect(session.redo()).toBe(true)
  expect(session.getState().assetCatalog.assets[assetId]).not.toHaveProperty('label')
})

test('missing deletion targets skip the oracle; oracle failure leaves state and history unchanged', async () => {
  const { state } = await portraitProject()
  const before = structuredClone(state)
  const unavailable = new Error('oracle unavailable')
  const provider = vi.fn(() => {
    throw unavailable
  })
  expect(new DeleteAssetCommand('portrait.missing', provider).apply(state)).toBe(state)
  expect(provider).not.toHaveBeenCalled()
  expect(state).toStrictEqual(before)
  const session = new EditSession(state)
  expect(() => session.dispatch(new DeleteAssetCommand(assetId, provider))).toThrow(unavailable)
  expect(session.getHistoryVersion()).toBe(0)
  expect(session.getState()).toBe(state)
  expect(session.getState()).toStrictEqual(before)
  expect(session.canRedo()).toBe(false)
})

test('live canonical references block deletion before it enters history', async () => {
  const { state } = await portraitProject()
  const before = structuredClone(state)
  const session = new EditSession(state)
  const scripts = scriptUsingPortrait()
  const provider = (current: EditorState) => collectCurrentProjectReferenceIndex(current, scripts)
  const deleteReferenced = () => session.dispatch(new DeleteAssetCommand(assetId, provider))
  expect(deleteReferenced).toThrow(
    expect.objectContaining({
      name: AssetInUseError.name,
      assetId,
      message: `资源 ${assetId} 仍被 1 处引用，不能删除`,
      references: [expect.objectContaining({ target: { kind: 'asset', id: assetId } })],
    }),
  )
  expect(session.getHistoryVersion()).toBe(0)
  expect(session.getState()).toBe(state)
  expect(session.getState()).toStrictEqual(before)
})

test('redo rechecks newly added author references and preserves the redo future when blocked', async () => {
  const { state, record } = await portraitProject()
  let scripts: ScriptEditorState = { scenes: [], items: [], sharedScripts: {} }
  const provider = (current: EditorState) => collectCurrentProjectReferenceIndex(current, scripts)
  const session = new EditSession(state)
  expect(session.dispatch(new DeleteAssetCommand(assetId, provider))).toBe(true)
  expect(Object.hasOwn(session.getState().assetCatalog.assets, assetId)).toBe(false)
  expect(session.undo()).toBe(true)
  const version = session.getHistoryVersion()
  scripts = scriptUsingPortrait()
  expect(() => session.redo()).toThrow(AssetInUseError)
  expect(session.getState().assetCatalog.assets[assetId]).toEqual(record)
  expect(session.getHistoryVersion()).toBe(version)
  expect(session.canRedo()).toBe(true)
})

test('undo of a replacement restores the old bytes that originally lived only on disk', async () => {
  const { state, record, bytes } = await portraitProject()
  const replacement = pngBytes(replacementPortrait)
  const updated = {
    ...record,
    path: 'assets/authored/portraits/replacement.png',
    sha256: await sha256Hex(replacement),
  }
  const session = new EditSession(state)
  expect(session.dispatch(new UpsertAssetCommand(assetId, updated, replacement, bytes))).toBe(true)
  expect(session.getState().assetCatalog.assets[assetId]).toEqual(updated)
  const pending = session.getState().assetBlobs[updated.path]
  expect(pending && new Uint8Array(pending)).toEqual(new Uint8Array(replacement))
  expect(session.getState().assetBlobs[path]).toBeUndefined()
  expect(session.undo()).toBe(true)
  expect(session.getState().assetCatalog.assets[assetId]).toEqual(record)
  expect(session.getState().assetBlobs[updated.path]).toBeUndefined()
  const restored = session.getState().assetBlobs[path]
  expect(restored && new Uint8Array(restored)).toEqual(new Uint8Array(bytes))
})
