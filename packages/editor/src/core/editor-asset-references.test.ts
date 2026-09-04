import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import {
  collectEditorAssetReferences,
  tryCollectEditorAssetReferenceSnapshot,
} from './editor-asset-references.js'
import { collectProjectIssues } from './project-diagnostics.js'
import type { ScriptEditorState } from './script-editor.js'

describe('editor asset reference source', () => {
  test('共享脚本中的资源引用进入项目闭包，不会被误报为未引用', () => {
    const soundId = 'sound.shared-script'
    const startWorld = {
      party: [],
      money: 0,
      inventory: [],
    }
    const state = {
      manifest: {
        id: 'shared-script-reference',
        name: '共享脚本资源引用',
        contentVersion: 19,
        minimumSaveVersion: 8,
        defaultEntryId: 'main',
        content: {
          sharedScripts: 'content/shared-scripts.json',
          worldVariables: 'content/world-variables.json',
        },
        assets: { catalog: 'assets/index.json', roles: {} },
        entryPoints: [{ id: 'main', label: '主要入口', scene: 'scene.test', startWorld }],
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
        'shared/other': {
          name: '另一共享音效脚本',
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
      where: 'sharedScripts["shared/test"].body[0].asset',
      site: 'sharedScript:shared/test',
      origin: { kind: 'shared-script', id: 'shared/test' },
    })
    expect(
      collectEditorAssetReferences(state)
        .filter((reference) => reference.asset === soundId)
        .map((reference) => reference.site),
    ).toEqual(['sharedScript:shared/test', 'sharedScript:shared/other'])
    expect(
      collectProjectIssues(state).some(
        (issue) => issue.code === 'unused-asset' && issue.message.includes(soundId),
      ),
    ).toBe(false)
  })

  test('资源页与项目诊断共用当前场景、实体、物品和共享脚本作者态', () => {
    const startWorld = {
      party: [],
      money: 0,
      inventory: [],
    }
    const records = Object.fromEntries(
      [
        ['video.hook-live', 'video'],
        ['sound.entity-live', 'sound'],
        ['frame-animation.item-live', 'frame-animation'],
        ['sound.shared-live', 'sound'],
      ].map(([id, kind]) => [
        id,
        {
          kind,
          path: `assets/authored/${id}`,
          mediaType: 'application/octet-stream',
          bytes: 1,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
      ]),
    )
    const shell = {
      manifest: {
        id: 'live-reference-state',
        name: '实时引用作者态',
        contentVersion: 19,
        minimumSaveVersion: 8,
        defaultEntryId: 'main',
        content: {
          sharedScripts: 'content/shared-scripts.json',
          worldVariables: 'content/world-variables.json',
        },
        assets: { catalog: 'assets/index.json', roles: {} },
        entryPoints: [{ id: 'main', label: '主要入口', scene: 'scene.live', startWorld }],
      },
      scenes: [
        {
          id: 'scene.live',
          mapId: 'map.live',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'entity.live',
              sprite: 'sprite.live',
              pos: { col: 1, row: 1, height: 0 },
              pages: [{ id: 'default', label: '默认', trigger: 'talk' }],
              initialPage: 'default',
            },
          ],
        },
      ],
      actors: [],
      skills: [],
      levelUp: {},
      items: [
        {
          id: 'item.live',
          name: '当前物品',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: false,
            effects: [
              {
                kind: 'runScript',
                script: {
                  id: 'item:item.live:use',
                  chunk: '__author-script-runtime',
                },
              },
            ],
          },
        },
      ],
      locale: {},
      sprites: [],
      battleSprites: [],
      maps: {},
      mapIndex: {
        version: 1,
        maps: [{ id: 'map.live', name: '测试地图', path: 'content/maps/map.live.json' }],
      },
      tilesetBlobs: {},
      stamps: [],
      scriptChunks: {},
      sharedScripts: {},
      worldVariables: {},
      assetCatalog: { version: 1, assets: records },
      assetBlobs: {},
    } as unknown as EditorState
    const flow = (body: unknown[]) => ({
      kind: 'stages' as const,
      initial: 'start',
      stages: [{ id: 'start', body }],
    })
    const canonical = {
      scenes: [
        {
          id: 'scene.live',
          mapId: 'map.live',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'entity.live',
              sprite: 'sprite.live',
              pos: { col: 1, row: 1, height: 0 },
              behaviors: {
                trigger: {
                  talk: {
                    label: '交谈',
                    order: 0,
                    flow: flow([{ kind: 'playSound', asset: 'sound.entity-live' }]),
                  },
                },
              },
            },
          ],
          hooks: {
            onEnter: {
              initial: 'intro',
              variants: {
                intro: {
                  label: '入场',
                  order: 0,
                  flow: flow([{ kind: 'playVideo', asset: 'video.hook-live' }]),
                },
              },
            },
          },
        },
      ],
      items: [
        {
          ...shell.items[0]!,
          use: {
            target: 'scene',
            consuming: false,
            effects: [
              {
                kind: 'itemPrivateScript',
                script: {
                  id: 'use',
                  label: '使用',
                  body: [
                    {
                      kind: 'playFrameAnimation',
                      asset: 'frame-animation.item-live',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
      sharedScripts: {
        'shared/live': {
          name: '当前共享脚本',
          self: 'none',
          body: [{ kind: 'playSound', asset: 'sound.shared-live' }],
        },
      },
    } as unknown as ScriptEditorState

    const references = collectEditorAssetReferences(shell, canonical)
    expect(references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          asset: 'video.hook-live',
          site: 'scene:scene.live:hook:onEnter:intro',
        }),
        expect.objectContaining({ asset: 'sound.entity-live', site: 'scene:scene.live:entities' }),
        expect.objectContaining({ asset: 'frame-animation.item-live', site: 'item:item.live' }),
        expect.objectContaining({
          asset: 'sound.shared-live',
          site: 'sharedScript:shared/live',
        }),
      ]),
    )
    expect(
      collectProjectIssues(shell).filter((issue) => issue.code === 'unused-asset'),
    ).toHaveLength(4)
    expect(
      collectProjectIssues(shell, canonical).filter((issue) => issue.code === 'unused-asset'),
    ).toHaveLength(0)
  })

  test('作者态扫描异常时 fail closed，不伪装成零引用', () => {
    const shell = {
      scenes: [],
      items: [],
      sharedScripts: {},
      manifest: { assets: { roles: {} }, entryPoints: [] },
    } as unknown as EditorState
    const canonical = {
      scenes: [],
      items: [],
      sharedScripts: new Proxy(
        {},
        {
          ownKeys: () => {
            throw new Error('scan exploded')
          },
        },
      ),
    } as unknown as ScriptEditorState

    expect(tryCollectEditorAssetReferenceSnapshot(shell, canonical)).toEqual({
      status: 'error',
      message: expect.any(String),
    })
  })
})
