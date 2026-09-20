import type { AuthorItemData, AuthorSceneDef, ItemData } from '@type-pal/content'
import { fsaSource, loadCurrentProjectFrom } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import type { EditorState } from './edit-session.js'
import type { ScriptEditorState } from './script-editor.js'
import {
  mergeEditorProjectionWithCurrentAuthorState,
  projectActiveScriptEditorState,
  projectCurrentAuthorReferenceSlices,
  projectEditorItemShells,
} from './script-editor-projection.js'
import { buildBlankProject } from './seed.js'

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
  test('UI-only item shells retain author order while canonical private/shared bodies round-trip', async () => {
    const author = item('canonical')
    author.id = '20'
    author.name = 'name.hero'
    const privateEffect = author.use!.effects[0]!
    if (privateEffect.kind !== 'itemPrivateScript') throw new Error('fixture has no private script')
    privateEffect.script.body = [{ kind: 'wait', ms: 20 }]
    author.use!.target = 'oneAlly'
    author.use!.effects.push({ kind: 'healHp', amount: 10 })
    const shared = item('unused')
    shared.id = '3'
    shared.name = 'name.hero'
    shared.use!.effects = [{ kind: 'runScript', script: 'shared/current' }]
    const original = structuredClone(author)
    const withoutUse = { ...author, id: 'plain' }
    delete withoutUse.use
    const files = await buildBlankProject('item-shell-projection')
    files['content/items.json'] = [author, shared, withoutUse]
    files['content/shared-scripts.json'] = {
      'shared/current': { name: '共享', self: 'none', body: [] },
    }
    const loaded = await loadCurrentProjectFrom(fsaSource(memoryAuthorDirectory(files).dir))
    const projected = projectEditorItemShells(loaded)
    expect(projected.map((value) => value.id)).toEqual(['20', '3', 'plain'])
    expect(projected[0]!.use!.effects).toMatchObject([
      { kind: 'runScript', script: { chunk: '__author-item-private-runtime', id: '20' } },
      { kind: 'healHp', amount: 10 },
    ])
    expect(projected[1]!.use!.effects).toMatchObject([
      { kind: 'runScript', script: { id: 'shared/current' } },
    ])
    expect(author).toEqual(original)
    expect(
      projectActiveScriptEditorState(
        { ...canonical, items: [author, shared, withoutUse] },
        projected,
      ).items,
    ).toEqual([author, shared, withoutUse])
  })
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

  test('shell removal does not revive a detached canonical item script', () => {
    const shellItem = {
      ...(item('stale') as unknown as ItemData),
      use: { target: 'scene' as const, consuming: true, effects: [] },
    }
    const projected = projectActiveScriptEditorState(canonical, [shellItem])
    expect(projected.items[0]!.use!.effects).toEqual([])

    const merged = mergeEditorProjectionWithCurrentAuthorState(canonical, {
      scenes: [],
      items: [shellItem],
      sharedScripts: {},
    } as unknown as EditorState)
    expect(merged.items[0]!.use!.effects).toEqual([])

    const shellWithoutUse = { ...shellItem } as ItemData
    delete shellWithoutUse.use
    expect(
      projectActiveScriptEditorState(canonical, [shellWithoutUse]).items[0]!.use,
    ).toBeUndefined()
    const mergedWithoutUse = mergeEditorProjectionWithCurrentAuthorState(canonical, {
      scenes: [],
      items: [shellWithoutUse],
      sharedScripts: {},
    } as unknown as EditorState)
    expect(mergedWithoutUse.items[0]!.use).toBeUndefined()
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
