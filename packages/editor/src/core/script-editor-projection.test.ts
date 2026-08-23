import type { AuthorItemData, AuthorSceneDef, ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import type { ScriptEditorState } from './script-editor.js'
import {
  mergeEditorProjectionWithCurrentAuthorState,
  projectActiveScriptEditorState,
  projectCurrentAuthorReferenceSlices,
} from './script-editor-projection.js'

function item(bodyFlag: string, name = '物品'): AuthorItemData {
  return {
    id: 'item-1',
    name,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'scene',
      consuming: true,
      effects: [
        {
          kind: 'itemPrivateScript',
          script: {
            id: 'use',
            label: '使用',
            body: [{ kind: 'setFlag', flag: bodyFlag, value: true }],
          },
        },
      ],
    },
  }
}

const canonical: ScriptEditorState = {
  scenes: [],
  items: [item('canonical')],
  sharedScripts: {
    'shared/current': {
      name: '当前脚本',
      self: 'none',
      body: [{ kind: 'setFlag', flag: 'shared', value: true }],
    },
  },
}

describe('current script editor projection', () => {
  test('keeps shell item fields but takes private script bodies from the script session', () => {
    const projected = projectActiveScriptEditorState(canonical, [
      item('stale', '主会话名称') as unknown as ItemData,
    ])

    expect(projected.items[0]!.name).toBe('主会话名称')
    expect(projected.items[0]!.use!.effects[0]).toMatchObject({
      kind: 'itemPrivateScript',
      script: { body: [{ flag: 'canonical' }] },
    })
  })

  test('merges only current author state at the save boundary', () => {
    const shell = {
      scenes: [],
      items: [item('stale', '主会话名称')],
      sharedScripts: {},
    } as unknown as EditorState

    const merged = mergeEditorProjectionWithCurrentAuthorState(canonical, shell)
    expect(merged.items[0]!.name).toBe('主会话名称')
    expect(merged.items[0]!.use!.effects[0]).toMatchObject({
      kind: 'itemPrivateScript',
      script: { body: [{ flag: 'canonical' }] },
    })
    expect(merged.sharedScripts).toEqual(canonical.sharedScripts)
  })

  test('projects only reference-relevant slices without mutating shell metadata', () => {
    const shell = {
      scenes: [
        {
          id: 'scene-1',
          name: '主会话场景名',
          mapId: 'map-1',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'entity-1',
              sprite: 'sprite-1',
              pos: { col: 1, row: 1, height: 0 },
              pages: [{ id: 'default', label: '默认', trigger: 'talk' }],
              initialPage: 'default',
            },
          ],
        },
      ],
      items: [item('stale', '主会话名称')],
      sharedScripts: {},
    } as unknown as EditorState
    const author = {
      scenes: [
        {
          id: 'scene-1',
          mapId: 'map-1',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'entity-1',
              sprite: 'sprite-1',
              pos: { col: 1, row: 1, height: 0 },
              behaviors: {
                trigger: {
                  talk: {
                    label: '交谈',
                    order: 0,
                    flow: {
                      kind: 'stages',
                      initial: 'start',
                      stages: [
                        {
                          id: 'start',
                          body: [{ kind: 'playSound', asset: 'sound.entity-live' }],
                        },
                      ],
                    },
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
                  flow: {
                    kind: 'stages',
                    initial: 'start',
                    stages: [
                      {
                        id: 'start',
                        body: [{ kind: 'playVideo', asset: 'video.hook-live' }],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ],
      items: [item('canonical', '作者态名称')],
      sharedScripts: canonical.sharedScripts,
    } as unknown as ScriptEditorState
    const originalShell = structuredClone(shell)

    const projected = projectCurrentAuthorReferenceSlices(author, shell)
    const projectedScene = projected.scenes[0] as unknown as AuthorSceneDef

    expect(projectedScene).toMatchObject({ name: '主会话场景名' })
    expect(projectedScene.hooks).toEqual(author.scenes[0]!.hooks)
    expect(projectedScene.entities[0]!.behaviors).toEqual(author.scenes[0]!.entities[0]!.behaviors)
    expect(projected.items[0]!.name).toBe('主会话名称')
    expect(projected.items[0]!.use!.effects[0]).toMatchObject({
      kind: 'itemPrivateScript',
      script: { body: [{ flag: 'canonical' }] },
    })
    expect(projected.sharedScripts).toEqual(author.sharedScripts)
    expect(shell).toEqual(originalShell)
  })
})
