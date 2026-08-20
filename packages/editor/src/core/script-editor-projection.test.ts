import type { AuthorItemCore, ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import {
  mergeEditorProjectionWithCurrentAuthorState,
  projectActiveScriptEditorState,
} from './script-editor-projection.js'
import type { ScriptEditorState } from './script-editor.js'

function item(bodyFlag: string, name = '物品'): AuthorItemCore {
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
})
