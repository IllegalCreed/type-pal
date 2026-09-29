/**
 * TEST-GLM-LARGE-WAVE-4 B 批隔离功能视觉宿主（端口 6087，严格端口）。
 * 直挂范围：真实 ScriptEditSession + CanonicalScriptBodyEditor 的选择→修改→undo 闭环，
 * 不冒充完整 App。会话状态与撤销全部真实。
 */
import { validateWorldVariableRegistryV1 } from '@type-pal/content'
import { useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { createEditorAssetReader } from '../../../../packages/editor/src/core/editor-asset-reader.js'
import {
  ScriptEditSession,
  UpdateSharedScriptCommand,
} from '../../../../packages/editor/src/core/script-editor.js'
import type { CanonicalScriptEditorContext } from '../../../../packages/editor/src/ui/ScriptEditor.js'
import { CanonicalScriptBodyEditor } from '../../../../packages/editor/src/ui/ScriptEditor.js'
import type { FileSource } from '../../../../packages/reforge/src/file-source.js'
import '../../../../packages/editor/src/ui/design-system/index.css'
import '../../../../packages/editor/src/ui/editor.css'

const worldVariables = validateWorldVariableRegistryV1({
  count: { kind: 'number', name: '背包计数', description: '', initial: 2 },
})

const emptySource: FileSource = {
  readBytes: async (rel) => {
    throw new DOMException(rel, 'NotFoundError')
  },
  readText: async (rel) => new TextDecoder().decode(await emptySource.readBytes(rel)),
  readJson: async (rel) => JSON.parse(new TextDecoder().decode(await emptySource.readBytes(rel))),
  urlFor: async (rel) => rel,
}
const reader = createEditorAssetReader(emptySource, {
  manifest: { id: 'glw-host-b' } as Parameters<typeof createEditorAssetReader>[1]['manifest'],
  assetCatalog: { version: 1, assets: {} },
  assetBlobs: {},
})

const scriptState = {
  scenes: [],
  items: [],
  sharedScripts: {
    'shared/user/glw': {
      name: '计步脚本',
      self: 'none' as const,
      body: [{ kind: 'setVar' as const, var: 'count', value: 2 }],
    },
  },
}

const context: CanonicalScriptEditorContext = {
  state: scriptState,
  shellScenes: [],
  locale: {},
  assetCatalog: { version: 1, assets: {} },
  audioResolver: reader,
  assetReader: reader,
  references: { choices: () => [], has: () => false, label: (_kind, id) => id },
  worldVariables,
  actors: {},
  battleSprites: [],
  sprites: [],
}

function SessionSection() {
  const session = useState(() => new ScriptEditSession(scriptState))[0]
  useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.getVersion(),
  )
  const state = session.getState()
  const script = state.sharedScripts['shared/user/glw']!
  return (
    <section data-visual="session-undo" style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
      <h2>脚本会话：选择 → 修改 → undo</h2>
      <p>
        当前正文值：<output data-body-value>{JSON.stringify(script.body[0])}</output> · 历史版本：
        <output data-version>{session.getHistoryVersion()}</output>
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" data-action="undo" onClick={() => session.undo()}>
          撤销
        </button>
        <button type="button" data-action="redo" onClick={() => session.redo()}>
          重做
        </button>
      </div>
      <CanonicalScriptBodyEditor
        presentation="workbench"
        label="正文"
        body={script.body}
        context={context}
        onChange={(next) =>
          session.dispatch(new UpdateSharedScriptCommand('shared/user/glw', { body: next }))
        }
      />
    </section>
  )
}

createRoot(document.getElementById('root')!).render(<SessionSection />)
