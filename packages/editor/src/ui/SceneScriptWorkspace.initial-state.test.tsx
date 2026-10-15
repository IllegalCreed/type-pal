// @vitest-environment jsdom
import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
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
import {
  buttonByLabel,
  chooseComboboxOption,
  clickCheckboxByLabel,
  comboboxByAriaLabel,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { DsInspectorHost } from './design-system/index.js'
import type { PreviewCanvas } from './PreviewCanvas.js'
import type { SceneCanvas } from './SceneCanvas.js'
import { CanonicalSceneScriptWorkspace } from './SceneScriptWorkspace.js'

const probes = vi.hoisted(() => ({ preview: vi.fn(), canvas: vi.fn() }))
// Replace asset rendering only; the actual selector, state list and Inspector remain mounted.
vi.mock('./PreviewCanvas.js', () => ({
  PreviewCanvas: (props: Parameters<typeof PreviewCanvas>[0]) => {
    probes.preview(props)
    return <div data-testid="preview">{props.initialStateControl}</div>
  },
}))
vi.mock('./SceneCanvas.js', () => ({
  SceneCanvas: (props: Parameters<typeof SceneCanvas>[0]) => {
    probes.canvas(props)
    return <div />
  },
}))

let root: Root
let host: HTMLDivElement
let inspector: HTMLDivElement
let history: EditorHistoryCoordinator
beforeEach(async () => {
  useActEnvironment()
  // The jsdom host needs Node's streaming Blob and Web Crypto for the real project loader.
  const [buffer, { webcrypto }] = await Promise.all([
    vi.importActual<{ Blob: typeof Blob }>('node:buffer'),
    vi.importActual<{ webcrypto: Crypto }>('node:crypto'),
  ])
  vi.stubGlobal('Blob', buffer.Blob)
  vi.stubGlobal('crypto', webcrypto)
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
  probes.preview.mockClear()
  probes.canvas.mockClear()
})
afterEach(async () => {
  await act(async () => root.unmount())
  history?.dispose()
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function workspace(library = previewLibrary()) {
  const files = await buildBlankProject('preview-ui')
  files['content/scenes/start.json'] = previewAuthorScene()
  const project = await loadCurrentProjectFrom(fsaSource(memoryAuthorDirectory(files).dir))
  const scenes = await loadAllAuthorScenes(project)
  const main = new EditSession(toEditorState(project, scenes, {}, {}, [], undefined, library))
  const script = new ScriptEditSession({ scenes, items: [], sharedScripts: {} })
  assertProjectSaveValid(main.getState())
  history = new EditorHistoryCoordinator(main, script)
  const before = structuredClone(main.getState().scenes)
  let selectedEntityId: string | null = null
  const reader = createEditorAssetReader(project.source, () => main.getState())
  function Harness() {
    useSyncExternalStore(history.subscribe, history.getVersion)
    const [inspectorHost, setInspectorHost] = useState<HTMLDivElement | null>(null)
    const current = main.getState()
    return (
      <>
        <DsInspectorHost>
          <div ref={setInspectorHost} />
        </DsInspectorHost>
        <CanonicalSceneScriptWorkspace
          scene={current.scenes[0]!}
          state={script.getState()}
          selectedEntityId={selectedEntityId}
          sceneSelected={!selectedEntityId}
          initialStates={current.scriptPreview}
          onInitialStatesChange={(next) => main.dispatch(new SetScriptPreviewLibraryCommand(next))}
          initialStatePropertiesHost={inspectorHost}
          locale={current.locale}
          sprites={current.sprites}
          actorsById={project.actorsById}
          leaderSpriteId="hero"
          assetBase={project.assetBase}
          projectMaps={current.maps}
          mapIndex={current.mapIndex}
          tilesets={current.tilesets ?? []}
          assetCatalog={current.assetCatalog}
          assetReader={reader}
          playIdentity={{
            projectId: 'preview-ui',
            workspaceId: '11111111-1111-4111-8111-111111111111',
            source: 'http',
          }}
          referenceStatus="current"
          onDispatch={(command) => script.dispatch(command)}
        />
      </>
    )
  }
  const focus = async (id: string | null) => {
    selectedEntityId = id
    await act(async () => root.render(<Harness />))
  }
  await focus(null)
  inspector = host.querySelector<HTMLDivElement>('[data-ds-inspector-host]')!
  return { main, script, focus, before }
}
async function click(label: string, scope: ParentNode = host) {
  await act(async () => buttonByLabel(scope, label).click())
}
const preview = () => probes.preview.mock.lastCall![0] as Parameters<typeof PreviewCanvas>[0]
const canvas = () => probes.canvas.mock.lastCall![0] as Parameters<typeof SceneCanvas>[0]

test('toolbar selection writes the exact step binding, restores it on return, and participates in undo', async () => {
  const library = previewLibrary()
  library.bindings = []
  const rig = await workspace(library)
  await rig.focus('host')
  const select = () => comboboxByAriaLabel<HTMLElement>(host, '预览初始状态')
  await chooseComboboxOption(select(), '初始状态：迎客前')
  expect(rig.main.getState().scriptPreview!.bindings).toEqual(previewLibrary().bindings)
  expect(preview().scene.entities[0]!.pos).toEqual({ col: 6, row: 7, height: 1 })
  await act(async () => {
    history.undo()
  })
  expect(rig.main.getState().scriptPreview!.bindings).toEqual([])
  expect(preview().scene.entities[0]!.pos).toEqual({ col: 2, row: 3, height: 0 })
  await act(async () => {
    history.redo()
  })
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label^="步骤 2 · 返回后，"]')!.click(),
  )
  await chooseComboboxOption(select(), '初始状态：返回后')
  expect(rig.main.getState().scriptPreview!.bindings.at(-1)).toMatchObject({
    entry: { stageId: 'return' },
    stateId: 'room',
  })
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label^="步骤 1 · 迎客前，"]')!.click(),
  )
  expect(select().textContent).toContain('迎客前')
  await chooseComboboxOption(select(), '初始状态：场景默认')
  expect(rig.main.getState().scriptPreview!.bindings).toEqual([
    { entry: { ...previewLibrary().bindings[0]!.entry, stageId: 'return' }, stateId: 'room' },
  ])
  expect(rig.main.getState().scenes).toEqual(rig.before)
})

test('Inspector commits sparse false/zero values, restores inherited defaults, and undo preserves the author scene', async () => {
  const rig = await workspace()
  await click('初始状态')
  const field = (label: string) =>
    inspector.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!
  const chosen = () => rig.main.getState().scriptPreview!.states[0]!
  await setInputValue(field('初始列坐标'), '9.5')
  expect(chosen().entities[0]!.pos).toEqual({ col: 9.5, row: 7, height: 1 })
  await act(async () => {
    history.undo()
  })
  expect(field('初始列坐标').value).toBe('6')
  await chooseComboboxOption(comboboxByAriaLabel(inspector, '初始朝向'), '场景默认')
  await chooseComboboxOption(comboboxByAriaLabel(inspector, '初始显隐'), '隐藏')
  expect(chosen().entities[0]!.hidden).toBe(true)
  await chooseComboboxOption(comboboxByAriaLabel(inspector, '初始显隐'), '显示')
  await chooseComboboxOption(comboboxByAriaLabel(inspector, '初始碰撞'), '挡路')
  expect(chosen().entities[0]!.collide).toBe(true)
  await chooseComboboxOption(comboboxByAriaLabel(inspector, '初始碰撞'), '不挡路')
  await setInputValue(field('初始画序偏置'), '2')
  expect(chosen().entities[0]!.zBias).toBe(2)
  await setInputValue(field('初始画序偏置'), '0')
  expect(chosen().entities[0]).toEqual({
    entityId: 'host',
    pos: { col: 6, row: 7, height: 1 },
    hidden: false,
    collide: false,
    zBias: 0,
  })
  expect(canvas().scene.entities[0]).toMatchObject({
    facing: 'left',
    hidden: false,
    collide: false,
    zBias: 0,
  })
  await setInputValue(field('初始画序偏置'), '')
  expect(chosen().entities[0]).not.toHaveProperty('zBias')
  expect(canvas().scene.entities[0]!.zBias).toBe(4)
  await click('恢复场景默认', inspector)
  expect(chosen().entities[0]).toEqual({ entityId: 'host' })
  expect(canvas().scene.entities[0]).toEqual(rig.before[0]!.entities[0])
  await click('移出方案', inspector)
  expect(chosen().entities.map((entry) => entry.entityId)).toEqual(['guest'])
  await act(async () => canvas().onSelectEntity('host'))
  await click('加入此方案', inspector)
  expect(chosen().entities.at(-1)).toEqual({ entityId: 'host' })
  expect(rig.main.getState().scenes).toEqual(rig.before)
})

test('copy and rename keep existing consumers on the original and deletion is reversible', async () => {
  const rig = await workspace()
  await click('初始状态')
  expect(buttonByLabel(host, '删除方案').disabled).toBe(true)
  await click('复制方案')
  const input = host.querySelector<HTMLInputElement>('[aria-label="初始状态方案名称"]')!
  await act(async () => {
    input.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      '另一个入口',
    )
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(rig.main.getState().scriptPreview!.states.at(-1)!.name).not.toBe('另一个入口')
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  )
  const copy = rig.main.getState().scriptPreview!.states.at(-1)!
  expect(copy).toMatchObject({ name: '另一个入口', entities: previewLibrary().states[0]!.entities })
  expect(copy.id).not.toBe('door')
  expect(rig.main.getState().scriptPreview!.bindings).toEqual(previewLibrary().bindings)
  await click('删除方案')
  expect(rig.main.getState().scriptPreview!.states.map((state) => state.id)).toEqual([
    'door',
    'room',
  ])
  await act(async () => {
    history.undo()
  })
  expect(rig.main.getState().scriptPreview!.states.at(-1)).toEqual(copy)
  await click('新建状态方案')
  expect(rig.main.getState().scriptPreview!.states.at(-1)!.entities).toEqual([])
})

test('an invalid binding blocks playback until the user explicitly selects a valid default', async () => {
  const library = previewLibrary()
  library.bindings[0]!.stateId = 'deleted'
  const rig = await workspace(library)
  await rig.focus('host')
  expect(host.querySelector('[role="alert"]')!.textContent).toContain('deleted')
  expect(host.querySelector('[data-testid="preview"]')).toBeNull()
  await chooseComboboxOption(comboboxByAriaLabel(host, '预览初始状态'), '初始状态：场景默认')
  expect(host.querySelector('[role="alert"]')).toBeNull()
  expect(rig.main.getState().scriptPreview!.bindings).toEqual([])
  expect(preview().scene.entities[0]!.pos).toEqual({ col: 2, row: 3, height: 0 })
})

test('participant picker preserves existing overrides and adds new entities with scene defaults', async () => {
  const library = previewLibrary()
  library.states[0]!.entities = library.states[0]!.entities.slice(0, 1)
  const originalHost = structuredClone(library.states[0]!.entities[0]!)
  const rig = await workspace(library)
  await click('初始状态')
  const chosen = () => rig.main.getState().scriptPreview!.states[0]!
  const picker = () =>
    document.querySelector<HTMLElement>('[role="dialog"][aria-label="选择管理方案实体"]')!
  await click('管理方案实体')
  await clickCheckboxByLabel(picker(), 'guest')
  expect(chosen().entities).toEqual([originalHost, { entityId: 'guest' }])
  expect(canvas().scene.entities[0]!.pos).toEqual(originalHost.pos)
  expect(canvas().scene.entities[1]).toEqual(rig.before[0]!.entities[1])
  await click('管理方案实体')
  const guest = [
    ...host.querySelectorAll<HTMLButtonElement>('[aria-label="方案实体列表"] button'),
  ].find((button) => button.querySelector('strong')?.textContent === 'guest')!
  await act(async () => guest.click())
  expect(inspector.querySelector<HTMLInputElement>('[aria-label="初始列坐标"]')!.value).toBe('4')
  expect(buttonByLabel(host, '初始状态').getAttribute('aria-selected')).toBe('true')
  await click('管理方案实体')
  await clickCheckboxByLabel(picker(), 'guest')
  expect(chosen().entities).toEqual([originalHost])
  expect(rig.main.getState().scriptPreview!.bindings).toEqual(library.bindings)
  expect(rig.main.getState().scenes).toEqual(rig.before)
})
