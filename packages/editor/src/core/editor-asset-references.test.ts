import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import { collectEditorAssetReferences } from './editor-asset-references.js'
import { collectProjectIssues } from './project-diagnostics.js'

describe('editor asset reference source', () => {
  test('共享脚本中的资源引用进入项目闭包，不会被误报为未引用', () => {
    const soundId = 'sound.shared-script'
    const startWorld = {
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [],
    }
    const state = {
      manifest: {
        id: 'shared-script-reference',
        name: '共享脚本资源引用',
        contentVersion: 17,
        minimumSaveVersion: 8,
        defaultEntryId: 'main',
        content: {
          sharedScripts: 'content/shared-scripts.json',
          worldVariables: 'content/world-variables.json',
        },
        assets: { catalog: 'assets/index.json', roles: {} },
        entryPoints: [
          { id: 'main', label: '主要入口', scene: 'scene.test', startWorld },
        ],
      },
      scenes: [
        {
          id: 'scene.test',
          mapId: 'map.test',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [],
        },
      ],
      actors: [],
      skills: [],
      levelUp: {},
      items: [],
      locale: {},
      sprites: [],
      battleSprites: [],
      maps: {},
      mapIndex: {
        version: 1,
        maps: [{ id: 'map.test', name: '测试地图', path: 'content/maps/map.test.json' }],
      },
      tilesetBlobs: {},
      stamps: [],
      scriptChunks: {},
      sharedScripts: {
        'shared/test': {
          name: '共享音效脚本',
          self: 'none',
          body: [{ kind: 'playSound', asset: soundId }],
        },
      },
      worldVariables: {},
      assetCatalog: {
        version: 1,
        assets: {
          [soundId]: {
            kind: 'sound',
            path: 'assets/authored/sounds/shared.wav',
            mediaType: 'audio/wav',
            bytes: 1,
            sha256: 'a'.repeat(64),
            origin: { kind: 'authored' },
          },
        },
      },
      assetBlobs: {},
    } as unknown as EditorState

    expect(collectEditorAssetReferences(state)).toContainEqual({
      asset: soundId,
      expectedKind: 'sound',
      where: 'sharedScripts.shared/test.body[0].asset',
      site: 'sharedScripts',
    })
    expect(
      collectProjectIssues(state).some(
        (issue) => issue.code === 'unused-asset' && issue.message.includes(soundId),
      ),
    ).toBe(false)
  })
})
