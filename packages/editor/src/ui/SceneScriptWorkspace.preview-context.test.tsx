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
import { ScriptEditSession, UpdateEntityBehaviorCommand } from '../core/script-editor.js'
import { SetScriptPreviewLibraryCommand } from '../core/script-preview-library.js'
import { buildBlankProject } from '../core/seed.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import {
  buttonByLabel,
  chooseComboboxOption,
  comboboxByAriaLabel,
  setInputValue,
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

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!
const stepChoice = () => comboboxByAriaLabel(dialog(), '此步骤的预览初始状态')
const schemeChoice = () => comboboxByAriaLabel(dialog(), '此方案的默认预览初始状态')
async function openStep(index: number) {
  await act(async () =>
    host.querySelector<HTMLButtonElement>(`[aria-label^="打开“步骤 ${index} ·"]`)!.click(),
  )
}

test('step details edit the requested stage and library copy/undo never changes its reference', async () => {
  const library = previewLibrary()
  const arrival = library.bindings[0]!.entry
  const { stageId: _stageId, ...scheme } = arrival
  library.schemeDefaults = [{ entry: scheme, stateId: 'door' }]
  library.bindings.push({ entry: { ...arrival, stageId: 'return' }, stateId: 'room' })
  const rig = await mountWorkspace(library)
  expect(document.querySelector('[aria-label="此步骤的预览初始状态"]')).toBeNull()
  await openStep(2)
  expect(stepChoice().textContent).toContain('返回后')
  await chooseComboboxOption(stepChoice(), '继承方案默认：迎客前')
  expect(rig.main.getState().scriptPreview!.bindings).toEqual([library.bindings[0]])
  await chooseComboboxOption(stepChoice(), '场景默认（此步骤不继承）')
  expect(rig.main.getState().scriptPreview!.bindings.at(-1)).toEqual({
    entry: { ...arrival, stageId: 'return' },
    stateId: null,
  })
  await chooseComboboxOption(stepChoice(), '迎客前')
  const referenced = structuredClone(rig.main.getState().scriptPreview)
  await click('在初始状态中查看 / 编辑')
  expect(dialog()).toBeNull()
  expect(host.querySelector('[aria-label="初始状态列表"]')).not.toBeNull()
  expect(host.querySelector<HTMLInputElement>('[aria-label="初始状态名称"]')?.value).toBe('迎客前')
  expect(document.activeElement).toBe(host.querySelector('[aria-label="初始状态名称"]'))
  const participants = host.querySelectorAll<HTMLButtonElement>(
    '[aria-label="开场时的角色与物件"] button',
  )
  expect(participants[0]?.textContent).toContain('客栈掌柜')
  await act(async () => participants[1]!.click())
  expect(host.querySelector('.initial-state-context')?.textContent).toContain(
    '客栈掌柜 / 迎客 / 返回后',
  )
  await click('复制')
  expect(rig.main.getState().scriptPreview!.bindings).toEqual(referenced!.bindings)
  expect(rig.main.getState().scriptPreview!.schemeDefaults).toEqual(referenced!.schemeDefaults)
  await act(async () => rig.history.undo())
  expect(rig.main.getState().scriptPreview).toEqual(referenced)
  expect(host.querySelector('[aria-label="初始状态名称"]')).toBeNull()
  await click('返回脚本详情')
  expect(dialog().textContent).toContain('步骤 2 · 返回后')
  expect(stepChoice().textContent).toContain('迎客前')
  expect(rig.main.getState().scenes).toEqual(rig.before)
})

test('a noncurrent scheme preserves its complete draft across the library, cancels cleanly and saves a preview-only edit', async () => {
  const rig = await mountWorkspace()
  await rig.focus(null)
  const before = structuredClone(rig.script.getState())
  const previewBefore = structuredClone(rig.main.getState().scriptPreview)
  await click('打开“夜间进店”的方案详情')
  await setInputValue(
    dialog().querySelector<HTMLInputElement>('[aria-label="方案名称"]')!,
    '夜间迎客',
  )
  await click('设为默认方案')
  await chooseComboboxOption(schemeChoice(), '返回后')
  expect(rig.script.getState()).toEqual(before)
  expect(rig.main.getState().scriptPreview).toEqual(previewBefore)
  await click('在初始状态中查看 / 编辑')
  expect(dialog()).toBeNull()
  expect(host.querySelector<HTMLInputElement>('[aria-label="初始状态名称"]')?.value).toBe('返回后')
  await click('新建初始状态')
  expect(rig.main.getState().scriptPreview!.bindings).toEqual(previewBefore!.bindings)
  expect(rig.main.getState().scriptPreview!.schemeDefaults).toEqual(previewBefore!.schemeDefaults)
  await click('返回脚本详情')
  expect(dialog().querySelector<HTMLInputElement>('[aria-label="方案名称"]')?.value).toBe(
    '夜间迎客',
  )
  expect(buttonByLabel(dialog(), '取消默认').getAttribute('aria-pressed')).toBe('true')
  expect(schemeChoice().textContent).toContain('返回后')
  await click('取消')
  expect(rig.script.getState()).toEqual(before)
  expect(rig.main.getState().scriptPreview!.schemeDefaults).toEqual([])
  await click('打开“夜间进店”的方案详情')
  expect(dialog().querySelector<HTMLInputElement>('[aria-label="方案名称"]')?.value).toBe(
    '夜间进店',
  )
  expect(schemeChoice().textContent).toContain('场景默认')
  await chooseComboboxOption(schemeChoice(), '迎客前')
  await click('保存')
  expect(rig.main.getState().scriptPreview!.schemeDefaults).toEqual([
    { entry: { sceneId: 'start', channel: 'onEnter', schemeId: 'night' }, stateId: 'door' },
  ])
  expect(rig.script.getState()).toEqual(before)
  expect(host.querySelector('.script-scheme-card.active')?.textContent).toContain('客人进店')
  await act(async () => rig.history.undo())
  expect(rig.main.getState().scriptPreview!.schemeDefaults).toEqual([])
})

test('leaving the owner or deleting the return target permanently invalidates library return navigation', async () => {
  const rig = await mountWorkspace()
  await openStep(1)
  await click('在初始状态中查看 / 编辑')
  await rig.focus('guest')
  await rig.focus('host')
  await click('初始状态')
  expect(host.querySelector('.initial-state-context')).toBeNull()
  await click('交互脚本')
  await openStep(2)
  await click('打开初始状态库')
  const flow = rig.script.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.greet!.flow
  await act(async () =>
    rig.script.dispatch(
      new UpdateEntityBehaviorCommand({ scene: 'start', entity: 'host' }, 'trigger', 'greet', {
        flow: { ...flow, stages: [flow.stages[0]!] },
      }),
    ),
  )
  expect(host.querySelector('.initial-state-context')).toBeNull()
  expect(host.querySelector('[aria-label="初始状态名称"]')).toBeNull()
  await act(async () => rig.history.undo())
  expect(host.querySelector('.initial-state-context')).toBeNull()
  expect(dialog()).toBeNull()
})

test('a closed returned step dialog stays closed after switching schemes away and back', async () => {
  const rig = await mountWorkspace()
  await rig.focus(null)
  await openStep(1)
  await click('打开初始状态库')
  await click('返回脚本详情')
  expect(dialog().textContent).toContain('步骤 1 · 进门前')
  await click('关闭')
  const selectScheme = async (name: string) => {
    const button = [...host.querySelectorAll<HTMLButtonElement>('.script-scheme-card-select')].find(
      (item) => item.textContent?.includes(name),
    )!
    await act(async () => button.click())
  }
  await selectScheme('夜间进店')
  expect(dialog()).toBeNull()
  await selectScheme('客人进店')
  expect(dialog()).toBeNull()
})
