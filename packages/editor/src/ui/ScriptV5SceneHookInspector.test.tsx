import type { SceneDefV5 } from '@type-pal/content'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import type { ScriptEditorStateV5 } from '../core/script-v5-editor.js'
import { ScriptV5SceneHookInspector } from './ScriptV5SceneHookInspector.js'

const scene: SceneDefV5 = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
  hooks: {
    onEnter: {
      initial: 'default',
      variants: {
        default: {
          label: '默认进场',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'start',
            stages: [
              {
                id: 'start',
                body: [{ kind: 'setFlag', flag: 'entered', value: true }],
              },
            ],
          },
        },
      },
    },
  },
}

const state: ScriptEditorStateV5 = {
  scenes: [scene],
  items: [],
  sharedScripts: {},
  migrationSidecars: [],
}

describe('ScriptV5SceneHookInspector', () => {
  test('edits named Hook variants through the same canonical flow editor', () => {
    const html = renderToStaticMarkup(
      <ScriptV5SceneHookInspector
        state={state}
        sceneId="s001"
        slot="onEnter"
        onDispatch={() => {}}
      />,
    )

    expect(html).toContain('默认进场')
    expect(html).toContain('默认 Hook')
    expect(html).toContain('start · 正文')
    expect(html).toContain('canonical-script-editor')
    expect(html).not.toContain('Canonical ScriptFlow JSON')
  })
})
