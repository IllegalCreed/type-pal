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
import { buildBlankProject } from '../core/seed.js'
import {
  buttonByLabel,
  chooseComboboxOption,
  clickCheckboxByLabel,
  comboboxByAriaLabel,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { InitialStateWorkspace } from './InitialStateWorkspace.js'
import type { SceneCanvas } from './SceneCanvas.js'

const probes = vi.hoisted(() => ({ canvas: vi.fn() }))
// Replace asset rendering only; the actual selector, state list and Inspector remain mounted.
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
  Element.prototype.scrollIntoView = vi.fn()
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
  probes.canvas.mockClear()
})
afterEach(async () => {
  await act(async () => root.unmount())
  history?.dispose()
  host.remove()
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function workspace(library = previewLibrary()) {
  const files = await buildBlankProject('preview-ui')
  files['content/scenes/index.json'] = {
    version: 1,
    scenes: [
      { id: 'start', name: '客栈', path: 'content/scenes/start.json' },
      { id: 'outside', name: '院外', path: 'content/scenes/outside.json' },
    ],
  }
  files['content/scenes/start.json'] = previewAuthorScene()
  files['content/scenes/outside.json'] = { ...previewAuthorScene(), id: 'outside' }
  const project = await loadCurrentProjectFrom(fsaSource(memoryAuthorDirectory(files).dir))
  const scenes = await loadAllAuthorScenes(project)
  const main = new EditSession(toEditorState(project, scenes, {}, {}, [], undefined, library))
  const script = new ScriptEditSession({ scenes, items: [], sharedScripts: {} })
  assertProjectSaveValid(main.getState())
  history = new EditorHistoryCoordinator(main, script)
  const before = structuredClone(main.getState().scenes)
  const reader = createEditorAssetReader(project.source, () => main.getState())
  function Harness() {
    useSyncExternalStore(history.subscribe, history.getVersion)
    const [stateId, setStateId] = useState<string | undefined>('door')
    return (
      <InitialStateWorkspace
        state={main.getState()}
        session={main}
        authorScenes={script.getState().scenes}
        actorsById={project.actorsById}
        assetBase={project.assetBase}
        assetReader={reader}
        stateId={stateId}
        onSelectState={setStateId}
        onOpenUsage={() => {}}
      />
    )
  }
  await act(async () => root.render(<Harness />))
  inspector = host.querySelector<HTMLDivElement>('[data-ds-inspector-host]')!
  return { main, script, before }
}
async function click(label: string, scope: ParentNode = document.body) {
  await act(async () => buttonByLabel(scope, label).click())
}
const canvas = () => probes.canvas.mock.lastCall![0] as Parameters<typeof SceneCanvas>[0]

test('Inspector commits sparse false/zero values, restores inherited defaults, and undo preserves the author scene', async () => {
  const rig = await workspace()
  const field = (label: string) =>
    inspector.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!
  const chosen = () => rig.main.getState().scriptPreview!.states[0]!.scenes[0]!
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
  await click('移出状态', inspector)
  expect(chosen().entities.map((entry) => entry.entityId)).toEqual(['guest'])
  await act(async () => canvas().onSelectEntity('host'))
  await click('加入此初始状态', inspector)
  expect(chosen().entities.at(-1)).toEqual({ entityId: 'host' })
  expect(rig.main.getState().scenes).toEqual(rig.before)
})

test('copy and rename keep existing consumers on the original and deletion is reversible', async () => {
  const rig = await workspace()
  expect(buttonByLabel(host, '删除').disabled).toBe(true)
  await click('复制')
  const input = host.querySelector<HTMLInputElement>('[aria-label="初始状态名称"]')!
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
  expect(copy).toMatchObject({ name: '另一个入口', scenes: previewLibrary().states[0]!.scenes })
  expect(copy.id).not.toBe('door')
  expect(rig.main.getState().scriptPreview!.bindings).toEqual(previewLibrary().bindings)
  await click('删除')
  expect(rig.main.getState().scriptPreview!.states.map((state) => state.id)).toEqual([
    'door',
    'room',
  ])
  await act(async () => {
    history.undo()
  })
  expect(rig.main.getState().scriptPreview!.states.at(-1)).toEqual(copy)
  await click('新建初始状态')
  expect(rig.main.getState().scriptPreview!.states.at(-1)!.scenes).toEqual([])
})

test('participant picker preserves existing overrides and adds new entities with scene defaults', async () => {
  const library = previewLibrary()
  library.states[0]!.scenes[0]!.entities = library.states[0]!.scenes[0]!.entities.slice(0, 1)
  const originalHost = structuredClone(library.states[0]!.scenes[0]!.entities[0]!)
  const rig = await workspace(library)
  const chosen = () => rig.main.getState().scriptPreview!.states[0]!.scenes[0]!
  const picker = () =>
    document.querySelector<HTMLElement>('[role="dialog"][aria-label="选择添加或移出角色与物件"]')!
  await click('添加或移出角色与物件')
  await clickCheckboxByLabel(picker(), '未命名角色或物件（列 4，行 5）')
  expect(chosen().entities).toEqual([originalHost, { entityId: 'guest' }])
  expect(canvas().scene.entities[0]!.pos).toEqual(originalHost.pos)
  expect(canvas().scene.entities[1]).toEqual(rig.before[0]!.entities[1])
  await click('添加或移出角色与物件')
  const guest = [
    ...host.querySelectorAll<HTMLButtonElement>('[aria-label="开场时的角色与物件"] button'),
  ].find(
    (button) => button.querySelector('strong')?.textContent === '未命名角色或物件（列 4，行 5）',
  )!
  await act(async () => guest.click())
  expect(inspector.querySelector<HTMLInputElement>('[aria-label="初始列坐标"]')!.value).toBe('4')
  expect(host.querySelector('[aria-label="初始状态名称"]')).not.toBeNull()
  await click('添加或移出角色与物件')
  await clickCheckboxByLabel(picker(), '未命名角色或物件（列 4，行 5）')
  expect(chosen().entities).toEqual([originalHost])
  expect(rig.main.getState().scriptPreview!.bindings).toEqual(library.bindings)
  expect(rig.main.getState().scenes).toEqual(rig.before)
})

test('scene tabs, grouped navigation, drag and reset isolate equal entity IDs and missing selected states never fall back', async () => {
  const rig = await workspace()
  const baseline = structuredClone(rig.main.getState().scriptPreview)
  await chooseComboboxOption(comboboxByAriaLabel(host, '添加场景'), '院外')
  expect(rig.main.getState().scriptPreview!.states).toHaveLength(2)
  expect(canvas().scene.id).toBe('outside')
  await act(async () => canvas().onSelectEntity('host'))
  await click('加入此初始状态', inspector)
  await act(async () => canvas().onMoveEntity('host', { col: 15, row: 16 }))
  await chooseComboboxOption(comboboxByAriaLabel(inspector, '初始显隐'), '隐藏')
  expect(rig.main.getState().scriptPreview!.states[0]!.scenes).toEqual([
    baseline!.states[0]!.scenes[0],
    {
      sceneId: 'outside',
      entities: [{ entityId: 'host', pos: { col: 15, row: 16, height: 0 }, hidden: true }],
    },
  ])
  const groups = [...host.querySelectorAll<HTMLDetailsElement>('.initial-state-groups details')]
  const startGroup = groups.find((group) =>
    group.querySelector('summary')!.textContent?.includes('客栈'),
  )!
  await act(async () => startGroup.querySelector<HTMLButtonElement>('.initial-state-row')!.click())
  expect(canvas().scene.id).toBe('start')
  expect(inspector.querySelector<HTMLInputElement>('[aria-label="初始列坐标"]')!.value).toBe('6')
  const outsideGroup = groups.find((group) =>
    group.querySelector('summary')!.textContent?.includes('院外'),
  )!
  await act(async () =>
    outsideGroup.querySelector<HTMLButtonElement>('.initial-state-row')!.click(),
  )
  expect(canvas().scene.id).toBe('outside')
  expect(inspector.querySelector<HTMLInputElement>('[aria-label="初始列坐标"]')!.value).toBe('15')
  await click('恢复场景默认', inspector)
  expect(rig.main.getState().scriptPreview!.states[0]!.scenes[1]!.entities).toEqual([
    { entityId: 'host' },
  ])
  expect(rig.main.getState().scriptPreview!.states[0]!.scenes[0]).toEqual(
    baseline!.states[0]!.scenes[0],
  )
  await click('移除此场景')
  expect(rig.main.getState().scriptPreview!.states[0]!.scenes).toHaveLength(1)
  await act(async () => history.undo())
  expect(rig.main.getState().scriptPreview!.states[0]!.scenes).toHaveLength(2)
  await setInputValue(
    host.querySelector<HTMLInputElement>('[aria-label="搜索初始状态名称"]')!,
    '迎客',
  )
  expect(host.querySelectorAll('.initial-state-row')).toHaveLength(2)
  expect(host.querySelector('.initial-state-outliner header')!.textContent).toContain(
    '初始状态 · 2',
  )
  await click('新建初始状态')
  const createdId = rig.main.getState().scriptPreview!.states.at(-1)!.id
  await act(async () => history.undo())
  expect(rig.main.getState().scriptPreview!.states.some((state) => state.id === createdId)).toBe(
    false,
  )
  expect(host.textContent).toContain('所选初始状态已不存在')
  expect(host.querySelector('[aria-label="初始状态名称"]')).toBeNull()
  expect(rig.main.getState().scenes).toEqual(rig.before)
})
