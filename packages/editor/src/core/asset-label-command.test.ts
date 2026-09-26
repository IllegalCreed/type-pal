import { validateAssetCatalog } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { UpdateAssetLabelCommand as UpdateAssetLabelMoved } from './asset-label-command.js'
import * as oldEntry from './commands.js'
import { UpdateAssetLabelCommand } from './commands.js'
import type { EditorState } from './edit-session.js'

function state(): EditorState {
  return {
    assetCatalog: {
      version: 1,
      assets: {
        'sprite.hero': {
          kind: 'sprite',
          path: 'assets/authored/sprites/hero.png',
          mediaType: 'image/png',
          bytes: 1,
          sha256: 'a'.repeat(64),
          label: '主角精灵',
          origin: { kind: 'authored', ref: 'hero.png' },
        },
      },
    },
    assetBlobs: {},
    locale: {},
    items: [],
    skills: [],
    scenes: [],
    actors: [],
    levelUp: {},
    manifest: {
      id: 'test',
      name: 'Test',
      contentVersion: 20,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [],
    },
    sprites: [],
    battleSprites: [],
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    scriptChunks: {},
  } as unknown as EditorState
}

describe('C10 asset label command family', () => {
  test('keeps asset-label constructor on the old commands barrel and clears empty labels', () => {
    expect(oldEntry.UpdateAssetLabelCommand).toBe(UpdateAssetLabelMoved)
    const current = state()
    validateAssetCatalog(current.assetCatalog)
    const command = new UpdateAssetLabelCommand('sprite.hero', '')
    expect(command.label).toBe('修改资源名称')
    const next = command.apply(current)
    expect('label' in next.assetCatalog.assets['sprite.hero']!).toBe(false)
    expect(current.assetCatalog.assets['sprite.hero']!.label).toBe('主角精灵')
    expect(command.invert(next).assetCatalog.assets['sprite.hero']!.label).toBe('主角精灵')
  })
})
