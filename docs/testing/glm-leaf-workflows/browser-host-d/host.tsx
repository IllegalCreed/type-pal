import type { WorldVariableRegistryV1 } from '@type-pal/content'
import { useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import type { EditorState } from '../../../../packages/editor/src/core/edit-session.js'
import { EditSession } from '../../../../packages/editor/src/core/edit-session.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
} from '../../../../packages/editor/src/core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../../../../packages/editor/src/core/project-reference-adapters.js'
import '../../../../packages/editor/src/ui/design-system/index.css'
import '../../../../packages/editor/src/ui/editor.css'
import { VarsTab } from '../../../../packages/editor/src/ui/VarsTab.js'

// 直挂组件宿主（非完整 App）：真实 VarsTab + 真实 EditSession + 合法 registry fixture。

const registry: WorldVariableRegistryV1 = {
  'quest.started': {
    kind: 'flag',
    name: '任务已开始',
    description: '主线任务开关',
    initial: false,
  },
}

function minimalState(): EditorState {
  return {
    manifest: {
      id: 'leaf-host',
      name: 'leaf-host',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: { worldVariables: 'content/world-variables.json' },
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
    sceneIndex: { version: 1, scenes: [{ id: 's', name: '场景', path: 'content/scenes/s.json' }] },
    worldVariables: registry,
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    stamps: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

const session = new EditSession(minimalState())
const referenceIndex = createProjectReferenceIndex(buildProjectReferenceSnapshot([]))

function Harness() {
  useSyncExternalStore(
    (callback) => session.subscribe(callback),
    () => session.getVersion(),
  )
  const current = session.getState()
  return (
    <VarsTab
      variables={current.worldVariables ?? {}}
      referenceIndex={referenceIndex}
      referenceStatus="current"
      getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
      session={session}
    />
  )
}

function StatusBar() {
  const [snap, setSnap] = useState('')
  useState(() => {
    session.subscribe(() => {
      setSnap(
        JSON.stringify({
          version: session.getHistoryVersion(),
          vars: session.getState().worldVariables,
        }),
      )
    })
  })
  return (
    <p>
      <button type="button" data-undo onClick={() => session.undo()}>
        撤销（真实 session.undo）
      </button>
      <output data-session>{snap}</output>
    </p>
  )
}

createRoot(document.getElementById('root')!).render(
  <main>
    <Harness />
    <StatusBar />
  </main>,
)
