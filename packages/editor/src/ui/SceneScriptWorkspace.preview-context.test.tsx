// @vitest-environment jsdom
import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { previewAuthorScene, previewLibrary } from '../core/__tests__/script-preview-fixture.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
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
  return { main, script, before, focus }
}

async function click(label: string) {
  await act(async () => buttonByLabel(host, label).click())
}

test('step details preserve context and shared copy atomically changes only the current binding', async () => {
  const library = previewLibrary()
  library.states[0]!.entities.reverse()
  library.states[0]!.entities[0]!.hidden = true
  library.bindings.push({
    entry: { ...library.bindings[0]!.entry, stageId: 'return' },
    stateId: 'door',
  })
  const rig = await mountWorkspace(library)
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label^="步骤 2 · 返回后，"]')!.click(),
  )
  host.querySelector<HTMLElement>('.canonical-script-drawer-body')!.scrollTop = 200
  await click('调整人物与物件')
  expect(host.querySelector<HTMLElement>('.canonical-script-drawer-body')!.scrollTop).toBe(0)
  expect(host.querySelector('[aria-label="预览初态列表"]')).toBeNull()
  const context = host.querySelector('.initial-state-context')
  expect(context).not.toBeNull()
  expect(document.activeElement).toBe(buttonByLabel(host, '返回脚本步骤'))
  expect(context?.textContent).toContain('客栈掌柜 / 迎客 / 返回后')
  expect(host.textContent).toContain('这些步骤共用此初态')
  const usage = host.querySelector('.initial-state-usage')!
  expect(usage.textContent).toContain('客栈掌柜 / 迎客 / 迎客前')
  expect(usage.textContent).toContain('客栈掌柜 / 迎客 / 返回后')
  expect(host.querySelector('[aria-label="开场时的角色与物件"]')?.textContent).toContain('来访客人')
  const currentRole = host.querySelector<HTMLButtonElement>(
    '[aria-label="开场时的角色与物件"] button',
  )!
  expect(currentRole.textContent).toContain('客栈掌柜 · 当前脚本角色')
  expect(currentRole.getAttribute('aria-pressed')).toBe('true')
  expect(currentRole.textContent).toContain('显示 · 朝向上')
  expect(host.querySelector('[aria-label="开场时的角色与物件"]')?.textContent).toContain('隐藏')
  const guest = host.querySelectorAll<HTMLButtonElement>(
    '[aria-label="开场时的角色与物件"] button',
  )[1]!
  await act(async () => guest.click())
  expect(guest.getAttribute('aria-pressed')).toBe('true')
  expect(host.querySelector('.initial-state-context')?.textContent).toContain(
    '客栈掌柜 / 迎客 / 返回后',
  )
  expect(host.textContent).toContain('与另外 1 个步骤共用，调整会同步影响它们。')
  await click('复制给此步骤')
  const copy = rig.main.getState().scriptPreview!.states.at(-1)!
  expect(copy.id).not.toBe('door')
  expect(copy.entities).toEqual(library.states[0]!.entities)
  expect(rig.main.getState().scriptPreview!.states.slice(0, -1)).toEqual(library.states)
  expect(rig.main.getState().scriptPreview!.bindings).toEqual([
    library.bindings[0],
    { entry: library.bindings[1]!.entry, stateId: copy.id },
  ])
  expect(host.querySelector<HTMLInputElement>('[aria-label="预览初态名称"]')?.value).toBe(copy.name)
  await act(async () => rig.main.undo())
  expect(rig.main.getState().scriptPreview).toEqual(library)
  expect(host.querySelector('.initial-state-context')).toBeNull()
  expect(host.querySelector('[aria-label="开场时的角色与物件"]')).toBeNull()
  expect(comboboxByAriaLabel(host, '预览初始状态').textContent).toContain('迎客前')
  await act(async () => rig.main.redo())
  expect(host.querySelector('.initial-state-context')).toBeNull()
  expect(comboboxByAriaLabel(host, '预览初始状态').textContent).toContain(copy.name)
  await click('调整人物与物件')
  await click('返回脚本步骤')
  expect(document.activeElement).toBe(host.querySelector('[aria-label="此步骤的预览初始状态"]'))
  expect(host.querySelector('[data-testid="preview"]')).not.toBeNull()
  expect(host.querySelector('[data-testid="prepare"]')).toBeNull()
  expect(host.querySelector('[aria-label="此步骤的预览初始状态"]')?.textContent).toContain(
    '客栈掌柜 / 迎客 / 返回后',
  )
  expect(comboboxByAriaLabel(host, '预览初始状态').textContent).toContain(copy.name)
  expect(rig.main.getState().scenes).toEqual(rig.before)
})

test('an unconfigured NPC can create one-person initial state while scene hooks and unbound states remain reachable', async () => {
  const library = previewLibrary()
  library.bindings = []
  const rig = await mountWorkspace(library)
  const control = host.querySelector('[aria-label="此步骤的预览初始状态"]')!
  expect(control.parentElement?.querySelector('[aria-label="执行步骤"]')).not.toBeNull()
  await click('为此步骤新建初始状态')
  const created = rig.main.getState().scriptPreview!.states.at(-1)!
  expect(created.name).toContain('客栈掌柜 / 迎客 / 迎客前')
  expect(created.entities).toEqual([{ entityId: 'host' }])
  expect(rig.main.getState().scriptPreview!.bindings).toEqual([
    { entry: previewLibrary().bindings[0]!.entry, stateId: created.id },
  ])
  expect(host.querySelector('[aria-label="预览初态列表"]')).toBeNull()
  expect(host.querySelector<HTMLInputElement>('[aria-label="预览初态名称"]')?.value).toBe(
    created.name,
  )
  await act(async () => rig.main.undo())
  expect(rig.main.getState().scriptPreview).toEqual(library)
  expect(host.querySelector('.initial-state-context')).toBeNull()
  expect(host.querySelector('[aria-label="开场时的角色与物件"]')).toBeNull()
  expect(comboboxByAriaLabel(host, '预览初始状态').textContent).toContain('场景默认')
  await act(async () => rig.main.redo())
  await click('调整人物与物件')
  await rig.focus('guest')
  expect(host.querySelector('[data-testid="prepare"]')).toBeNull()
  expect(host.querySelector('.initial-state-context')).toBeNull()
  expect(host.textContent).not.toContain('用于当前步骤')
  expect(rig.main.getState().scriptPreview!.bindings).toEqual([
    { entry: previewLibrary().bindings[0]!.entry, stateId: created.id },
  ])
  await rig.focus(null)
  expect(host.querySelector('[aria-label="此步骤的预览初始状态"]')?.textContent).toContain(
    '场景 / 客人进店 / 进门前',
  )
  await chooseComboboxOption(comboboxByAriaLabel(host, '预览初始状态'), '返回后')
  await click('调整人物与物件')
  expect(host.querySelector('.initial-state-context')?.textContent).toContain(
    '场景 / 客人进店 / 进门前',
  )
  expect(host.querySelector<HTMLInputElement>('[aria-label="预览初态名称"]')?.value).toBe('返回后')
  await click('返回脚本步骤')
  await click('初始状态')
  expect(host.querySelector('[aria-label="预览初态列表"]')?.textContent).toContain(created.name)
  expect(host.querySelector('.initial-state-context')).toBeNull()
  expect(rig.main.getState().scenes).toEqual(rig.before)
})

test('undo and redo of the initial step cannot resurrect a previous initial-state editing context', async () => {
  const library = previewLibrary()
  library.bindings.push({
    entry: { ...library.bindings[0]!.entry, stageId: 'return' },
    stateId: 'room',
  })
  const rig = await mountWorkspace(library)
  const flow = rig.script.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.greet!.flow
  await act(async () => {
    rig.script.dispatch(
      new UpdateEntityBehaviorCommand({ scene: 'start', entity: 'host' }, 'trigger', 'greet', {
        flow: { ...flow, initial: 'return' },
      }),
    )
  })
  await click('调整人物与物件')
  expect(host.querySelector('.initial-state-context')?.textContent).toContain('返回后')
  await act(async () => {
    rig.script.undo()
  })
  expect(host.querySelector('.initial-state-context')).toBeNull()
  await act(async () => {
    rig.script.redo()
  })
  expect(host.querySelector('.initial-state-context')).toBeNull()
  expect(host.textContent).not.toContain('用于当前步骤')
})

test('scheme defaults remain editable beneath step overrides, and inherited copies undo to inheritance', async () => {
  const library = previewLibrary()
  const entry = library.bindings[0]!.entry
  const { stageId: _stageId, ...schemeEntry } = entry
  library.bindings = [{ entry, stateId: 'room' }]
  library.schemeDefaults = []
  const rig = await mountWorkspace(library)
  const select = () => comboboxByAriaLabel(host, '预览初始状态')
  await act(async () => {
    host.querySelector<HTMLDetailsElement>('.initial-state-scheme-default')!.open = true
  })
  await click('为此方案新建初始状态')
  const createdDefault = rig.main.getState().scriptPreview!.states.at(-1)!
  expect(createdDefault.entities).toEqual([{ entityId: 'host' }])
  expect(rig.main.getState().scriptPreview!.schemeDefaults).toEqual([
    { entry: schemeEntry, stateId: createdDefault.id },
  ])
  expect(rig.main.getState().scriptPreview!.bindings).toEqual(library.bindings)
  expect(host.querySelector('.initial-state-context')?.textContent).toContain('方案默认初态')
  await act(async () => rig.main.undo())
  expect(rig.main.getState().scriptPreview).toEqual(library)
  expect(host.querySelector('.initial-state-context')).toBeNull()
  expect(select().textContent).toContain('返回后')
  await chooseComboboxOption(select(), '继承方案默认：场景默认')
  library.bindings = []
  await chooseComboboxOption(comboboxByAriaLabel(host, '本脚本方案的默认初始状态'), '迎客前')
  library.schemeDefaults = [{ entry: schemeEntry, stateId: 'door' }]
  expect(rig.main.getState().scriptPreview).toEqual(library)
  expect(select().textContent).toContain('继承方案默认：迎客前')
  await click('复制给此步骤')
  expect(rig.main.getState().scriptPreview!.bindings[0]?.entry).toEqual(entry)
  expect(rig.main.getState().scriptPreview!.schemeDefaults).toEqual(library.schemeDefaults)
  await act(async () => rig.main.undo())
  expect(rig.main.getState().scriptPreview).toEqual(library)
  expect(host.querySelector('.initial-state-context')).toBeNull()
  expect(select().textContent).toContain('继承方案默认：迎客前')

  await chooseComboboxOption(select(), '返回后')
  const defaultPanel = host.querySelector<HTMLDetailsElement>('.initial-state-scheme-default')!
  await act(async () => {
    defaultPanel.open = true
  })
  await click('调整方案默认的人物与物件')
  expect(host.querySelector('.initial-state-context')?.textContent).toContain(
    '客栈掌柜 / 迎客 / 方案默认初态',
  )
  expect(host.querySelector<HTMLInputElement>('[aria-label="预览初态名称"]')?.value).toBe('迎客前')
  await click('返回脚本步骤')
  expect(document.activeElement).toBe(comboboxByAriaLabel(host, '本脚本方案的默认初始状态'))
  expect(host.querySelector<HTMLDetailsElement>('.initial-state-scheme-default')?.open).toBe(true)
  expect(select().textContent).toContain('返回后')

  await chooseComboboxOption(select(), '场景默认（此步骤不继承）')
  const beforeCreate = structuredClone(rig.main.getState().scriptPreview)
  await click('为此步骤新建初始状态')
  expect(rig.main.getState().scriptPreview!.bindings[0]?.stateId).not.toBeNull()
  await act(async () => rig.main.undo())
  expect(rig.main.getState().scriptPreview).toEqual(beforeCreate)
  expect(host.querySelector('.initial-state-context')).toBeNull()
  expect(select().textContent).toContain('场景默认（此步骤不继承）')

  await chooseComboboxOption(select(), '迎客前')
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label^="步骤 2 · 返回后，"]')!.click(),
  )
  expect(select().textContent).toContain('继承方案默认：迎客前')
  await chooseComboboxOption(select(), '返回后')
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label^="步骤 1 · 迎客前，"]')!.click(),
  )
  expect(select().textContent).toBe('迎客前')
  expect(host.textContent).toContain('也被 1 个脚本方案用作默认')
  expect(buttonByLabel(host, '复制给此步骤')).not.toBeNull()
  await chooseComboboxOption(select(), '返回后')
  await rig.focus(null)
  await click('初始状态')
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label="预览初态列表"] button')!.click(),
  )
  expect(buttonByLabel(host, '删除初态').disabled).toBe(true)
  expect(host.textContent).toContain('作为这些脚本方案的默认初态')
  expect(host.textContent).not.toContain('使用此初态的步骤')
  expect(rig.main.getState().scenes).toEqual(rig.before)
})

test('an invalid inherited default blocks preview until the current step explicitly chooses scene defaults', async () => {
  const library = previewLibrary()
  const { stageId: _stageId, ...entry } = library.bindings[0]!.entry
  library.bindings = []
  library.schemeDefaults = [{ entry, stateId: 'missing' }]
  const rig = await mountWorkspace(library)
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('已失效')
  expect(host.querySelector('[data-testid="preview"]')).toBeNull()
  await chooseComboboxOption(comboboxByAriaLabel(host, '预览初始状态'), '场景默认（此步骤不继承）')
  expect(host.querySelector('[role="alert"]')).toBeNull()
  expect(host.querySelector('[data-testid="preview"]')).not.toBeNull()
  expect(rig.main.getState().scriptPreview!.bindings[0]?.stateId).toBeNull()
  expect(rig.main.getState().scriptPreview!.schemeDefaults).toEqual(library.schemeDefaults)
})
