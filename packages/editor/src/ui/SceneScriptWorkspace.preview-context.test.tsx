// @vitest-environment jsdom
import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { previewAuthorScene, previewLibrary } from '../core/__tests__/script-preview-fixture.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { toEditorState } from '../core/project-io.js'
import { ScriptEditSession } from '../core/script-editor.js'
import { SetScriptPreviewLibraryCommand } from '../core/script-preview-library.js'
import { buildBlankProject } from '../core/seed.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import {
  buttonByLabel,
  chooseComboboxOption,
  comboboxByAriaLabel,
} from './__tests__/glm-ui-wave-kit.js'
import { CanonicalSceneScriptWorkspace } from './SceneScriptWorkspace.js'

// Asset rasterization is outside this navigation contract. The workspace, commands and controls
// stay real, and the source scene must still pass the current project's save validation.
vi.mock('./PreviewCanvas.js', () => ({ PreviewCanvas: () => <div data-testid="preview" /> }))
vi.mock('./SceneCanvas.js', () => ({ SceneCanvas: () => <div data-testid="prepare" /> }))

let host: HTMLDivElement
let root: Root
beforeEach(async () => {
  await stubNodeTestHost()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  window.localStorage.clear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  vi.unstubAllGlobals()
})

async function mountWorkspace(library = previewLibrary()) {
  const files = await buildBlankProject('preview-context')
  const scene = previewAuthorScene()
  scene.entities[0]!.label = '客栈掌柜'
  scene.entities[1]!.label = '来访客人'
  scene.hooks = {
    onEnter: {
      initial: 'welcome',
      variants: {
        night: {
          label: '夜间进店',
          order: 1,
          flow: { kind: 'stages', initial: 'night', stages: [{ id: 'night', body: [] }] },
        },
        welcome: {
          label: '客人进店',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'intro',
            stages: [{ id: 'intro', label: '进门前', body: [] }],
          },
        },
      },
    },
  }
  files['content/scenes/start.json'] = scene
  const project = await loadCurrentProjectFrom(fsaSource(memoryAuthorDirectory(files).dir))
  const scenes = await loadAllAuthorScenes(project)
  const main = new EditSession(toEditorState(project, scenes, {}, {}, [], undefined, library))
  const script = new ScriptEditSession({ scenes, items: [], sharedScripts: {} })
  const history = new EditorHistoryCoordinator(main, script)
  assertProjectSaveValid(main.getState())
  const before = structuredClone(main.getState().scenes)
  const reader = createEditorAssetReader(project.source, () => main.getState())
  let focused: string | null = 'host'
  function Harness() {
    useSyncExternalStore(
      (listener) => main.subscribe(listener),
      () => main.getVersion(),
    )
    useSyncExternalStore(
      (listener) => script.subscribe(listener),
      () => script.getVersion(),
    )
    const state = main.getState()
    return (
      <CanonicalSceneScriptWorkspace
        scene={state.scenes[0]!}
        state={script.getState()}
        selectedEntityId={focused}
        sceneSelected={!focused}
        initialStates={state.scriptPreview}
        onInitialStatesChange={(next) => main.dispatch(new SetScriptPreviewLibraryCommand(next))}
        onDispatchWithInitialStates={(command, next) =>
          history.dispatch(command, new SetScriptPreviewLibraryCommand(next))
        }
        locale={state.locale}
        sprites={state.sprites}
        actorsById={project.actorsById}
        leaderSpriteId="hero"
        assetBase={project.assetBase}
        projectMaps={state.maps}
        mapIndex={state.mapIndex}
        tilesets={state.tilesets ?? []}
        assetCatalog={state.assetCatalog}
        assetReader={reader}
        playIdentity={{
          projectId: 'preview-context',
          workspaceId: '11111111-1111-4111-8111-111111111111',
          source: 'http',
        }}
        referenceStatus="current"
        onDispatch={(command) => script.dispatch(command)}
      />
    )
  }
  const focus = async (id: string | null) => {
    focused = id
    await act(async () => root.render(<Harness />))
  }
  await focus('host')
  return { main, script, before, focus, history }
}

async function click(label: string) {
  await act(async () => buttonByLabel(document.body, label).click())
}

async function openStep(index: number) {
  await act(async () =>
    host.querySelector<HTMLButtonElement>(`[aria-label^="打开“步骤 ${index} ·"]`)!.click(),
  )
}

test('step details selection writes the exact binding, restores it on return, and participates in undo', async () => {
  const library = previewLibrary()
  library.bindings = []
  library.states[1]!.scenes = []
  const rig = await mountWorkspace(library)
  await rig.focus('host')
  await openStep(1)
  const select = () => comboboxByAriaLabel<HTMLElement>(document.body, '此步骤的预览初始状态')
  await chooseComboboxOption(select(), '迎客前')
  expect(rig.main.getState().scriptPreview!.bindings).toEqual(previewLibrary().bindings)
  await act(async () => {
    rig.history.undo()
  })
  expect(rig.main.getState().scriptPreview!.bindings).toEqual([])
  await act(async () => {
    rig.history.redo()
  })
  await click('关闭')
  await openStep(2)
  await chooseComboboxOption(select(), '返回后')
  expect(document.querySelector('[role="dialog"]')!.textContent).toContain(
    '这份初态未配置当前场景，当前场景沿用默认摆放。',
  )
  expect(rig.main.getState().scriptPreview!.bindings.at(-1)).toMatchObject({
    entry: { stageId: 'return' },
    stateId: 'room',
  })
  await click('关闭')
  await openStep(1)
  expect(select().textContent).toContain('迎客前')
  await chooseComboboxOption(select(), '场景默认（此步骤不继承）')
  expect(rig.main.getState().scriptPreview!.bindings).toEqual([
    { entry: { ...previewLibrary().bindings[0]!.entry, stageId: 'return' }, stateId: 'room' },
    { entry: previewLibrary().bindings[0]!.entry, stateId: null },
  ])
  expect(rig.main.getState().scenes).toEqual(rig.before)
})

test('an invalid binding blocks playback until the user explicitly selects a valid default', async () => {
  const library = previewLibrary()
  library.bindings[0]!.stateId = 'deleted'
  const rig = await mountWorkspace(library)
  await rig.focus('host')
  await openStep(1)
  expect(host.querySelector('[role="alert"]')!.textContent).toContain('deleted')
  expect(host.querySelector('[data-testid="preview"]')).toBeNull()
  await chooseComboboxOption(
    comboboxByAriaLabel(document.body, '此步骤的预览初始状态'),
    '场景默认（此步骤不继承）',
  )
  expect(host.querySelector('[role="alert"]')).toBeNull()
  expect(rig.main.getState().scriptPreview!.bindings).toEqual([
    { entry: library.bindings[0]!.entry, stateId: null },
  ])
  expect(host.querySelector('[data-testid="preview"]')).not.toBeNull()
})
