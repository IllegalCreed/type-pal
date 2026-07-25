import type { AssetCatalogV1, SceneDef } from '@type-pal/content'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { type ScriptEditorStateV5, ScriptV5EditSession } from '../core/script-v5-editor.js'
import type { CanonicalScriptEditorContextV5 } from './CanonicalScriptEditorV5.js'
import { CanonicalSharedScriptTabV5 } from './CanonicalSharedScriptTabV5.js'

const state: ScriptEditorStateV5 = {
  scenes: [],
  items: [],
  sharedScripts: {
    'shared/user/book': {
      name: '读天书',
      self: 'none',
      body: [{ kind: 'dialog', cue: { rows: [{ text: '天书正文' }] } }],
    },
  },
  migrationSidecars: [],
}

const catalog: AssetCatalogV1 = { version: 1, assets: {} }
const context: CanonicalScriptEditorContextV5 = {
  state,
  shellScenes: [] as SceneDef[],
  locale: {},
  assetCatalog: catalog,
  audioResolver: {} as CanonicalScriptEditorContextV5['audioResolver'],
  assetReader: {} as CanonicalScriptEditorContextV5['assetReader'],
  references: {
    choices: () => [],
    has: () => false,
    label: (_kind, id) => id,
  },
  battleSprites: [],
}

describe('CanonicalSharedScriptTabV5', () => {
  test('reads the canonical library and mounts the shared body editor', () => {
    const html = renderToStaticMarkup(
      <CanonicalSharedScriptTabV5
        tabBar={null}
        state={state}
        session={new ScriptV5EditSession(state)}
        context={context}
      />,
    )
    expect(html).toContain('读天书')
    expect(html).toContain('shared/user/book')
    expect(html).toContain('天书正文')
    expect(html).toContain('canonical-script-editor')
    expect(html).not.toContain('迁移内部实现')
    expect(html).not.toContain('Canonical ScriptFlow JSON')
  })
})
