import { describe, expect, test, vi } from 'vitest'
import { AssetInUseError, DeleteAssetCommand } from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import type { ScriptEditorState } from './script-editor.js'

const assetId = 'music.test'

function state(): EditorState {
  return {
    manifest: {
      id: 'asset-delete',
      name: 'asset-delete',
      contentVersion: 19,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [],
    },
    scenes: [],
    actors: [],
    items: [],
    skills: [],
    levelUp: {},
    locale: {},
    sprites: [],
    battleSprites: [],
    enemies: [],
    enemyTeams: [],
    battleFields: [],
    shops: [],
    poisons: [],
    ambiences: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    stamps: [],
    scriptChunks: {},
    assetCatalog: {
      version: 1,
      assets: {
        [assetId]: {
          kind: 'music',
          path: 'assets/music/test.mid',
          mediaType: 'audio/midi',
          bytes: 1,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    },
    assetBlobs: {},
  } as unknown as EditorState
}

function canonical(body: ScriptEditorState['sharedScripts'][string]['body']): ScriptEditorState {
  return {
    scenes: [],
    items: [],
    sharedScripts: { shared: { name: '共享脚本', self: 'none', body } },
  }
}

describe('asset deletion uses the unified current-author oracle', () => {
  test('missing targets skip the provider and provider failure preserves history', () => {
    const failed = vi.fn(() => {
      throw new Error('oracle unavailable')
    })
    const current = state()
    expect(new DeleteAssetCommand('missing', failed).apply(current)).toBe(current)
    expect(failed).not.toHaveBeenCalled()

    const session = new EditSession(current)
    expect(() => session.dispatch(new DeleteAssetCommand(assetId, failed))).toThrow(
      /oracle unavailable/,
    )
    expect(session.getHistoryVersion()).toBe(0)
    expect(session.getState().assetCatalog.assets[assetId]).toBeDefined()
  })

  test('live canonical references block apply and redo without losing the redo future', () => {
    const scripts = canonical([{ kind: 'playMusic', asset: assetId }])
    const provider = (current: EditorState) =>
      collectCurrentProjectReferenceIndex(current, scripts)
    expect(() => new DeleteAssetCommand(assetId, provider).apply(state())).toThrow(AssetInUseError)

    scripts.sharedScripts.shared!.body = []
    const session = new EditSession(state())
    expect(session.dispatch(new DeleteAssetCommand(assetId, provider))).toBe(true)
    expect(session.undo()).toBe(true)
    scripts.sharedScripts.shared!.body = [{ kind: 'playMusic', asset: assetId }]
    expect(() => session.redo()).toThrow(AssetInUseError)
    expect(session.getState().assetCatalog.assets[assetId]).toBeDefined()
    expect(session.canRedo()).toBe(true)
  })
})
