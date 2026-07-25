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
  test('uses author-facing scene script language and the shared visual body editor', () => {
    const html = renderToStaticMarkup(
      <ScriptV5SceneHookInspector
        state={state}
        sceneId="s001"
        slot="onEnter"
        onDispatch={() => {}}
      />,
    )

    expect(html).toContain('默认进场')
    expect(html).toContain('进入场景时自动运行这个版本')
    expect(html).toContain('脚本正文')
    expect(html).toContain('canonical-script-editor')
    expect(html).toContain('剧情版本管理')
    expect(html).not.toContain('高级管理')
    expect(html).not.toContain('内部识别名')
    expect(html).not.toContain('场景 Hook')
    expect(html).not.toContain('阶段流')
    expect(html).not.toContain('Canonical ScriptFlow JSON')
  })
})
