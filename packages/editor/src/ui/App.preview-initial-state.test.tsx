// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { previewAuthorScene, previewLibrary } from '../core/__tests__/script-preview-fixture.js'
import { EditSession } from '../core/edit-session.js'
import { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import { openLocalProject } from '../core/open-local.js'
import { toEditorState } from '../core/project-io.js'
import { ScriptEditSession, UpdateEntityBehaviorCommand } from '../core/script-editor.js'
import { buildBlankProject } from '../core/seed.js'
import { createLocalWorkspaceContext } from '../core/workspace-context.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import {
  buttonByLabel,
  chooseComboboxOption,
  comboboxByAriaLabel,
  setInputValue,
} from './__tests__/glm-ui-wave-kit.js'
import { App } from './App.js'
import type { SceneCanvas } from './SceneCanvas.js'

const probes = vi.hoisted(() => ({ canvas: vi.fn() }))
// App, workspace, real command history and Inspector portal stay mounted. Only asset rasterization
// is omitted; viewport-region inputs are observed, not treated as visual acceptance.
vi.mock('./SceneCanvas.js', () => ({
  SceneCanvas: (props: Parameters<typeof SceneCanvas>[0]) => {
    probes.canvas(props)
    return <div />
  },
}))
vi.mock('./PreviewCanvas.js', () => ({ PreviewCanvas: () => <div /> }))

let host: HTMLDivElement
let root: Root
beforeEach(async () => {
  await stubNodeTestHost()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  localStorage.clear()
  window.history.replaceState({}, '', '/?module=scene&page=workspace')
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  probes.canvas.mockClear()
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  vi.unstubAllGlobals()
})

async function click(label: string) {
  await act(async () => buttonByLabel(document.body, label).click())
}
const canvas = () => probes.canvas.mock.lastCall![0] as Parameters<typeof SceneCanvas>[0]

async function mountApp(unavailableScenes = false) {
  const files = await buildBlankProject('preview-inspector')
  const scene = previewAuthorScene()
  scene.entities[0]!.label = '客栈掌柜'
  scene.entities[1]!.label = '来访客人'
  scene.entities[0]!.behaviors!.trigger!.later = {
    label: '夜间交谈',
    order: 1,
    flow: {
      kind: 'stages',
      initial: 'night',
      stages: [{ id: 'night', label: '关门后', body: [] }],
    },
  }
  scene.hooks = {
    onEnter: {
      initial: 'welcome',
      variants: {
        welcome: {
          label: '客人进店',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'enter',
            stages: [{ id: 'enter', label: '进门前', body: [] }],
          },
        },
        night: {
          label: '夜间进店',
          order: 1,
          flow: {
            kind: 'stages',
            initial: 'night',
            stages: [{ id: 'night', label: '关门后', body: [] }],
          },
        },
      },
    },
  }
  const outside = structuredClone(scene)
  outside.id = 'outside'
  outside.entities[0]!.label = '院外守卫'
  outside.entities[0]!.behaviors!.auto = {
    later: structuredClone(outside.entities[0]!.behaviors!.trigger!.later!),
  }
  files['content/scenes/index.json'] = {
    version: 1,
    scenes: [
      { id: 'start', name: '客栈', path: 'content/scenes/start.json' },
      { id: 'outside', name: '院外', path: 'content/scenes/outside.json' },
    ],
  }
  const library = previewLibrary()
  library.states[1]!.scenes[0]!.sceneId = 'outside'
  library.states[0]!.scenes.push({
    sceneId: 'outside',
    entities: [{ entityId: 'host', pos: { col: 16, row: 17, height: 0 }, hidden: true }],
  })
  library.schemeDefaults.push({
    entry: { sceneId: 'outside', entityId: 'host', channel: 'trigger', schemeId: 'later' },
    stateId: 'door',
  })
  library.schemeDefaults.push({
    entry: { sceneId: 'outside', entityId: 'host', channel: 'auto', schemeId: 'later' },
    stateId: 'door',
  })
  files['content/scenes/start.json'] = scene
  files['content/scenes/outside.json'] = outside
  files['editor/script-preview.json'] = library
  const opened = await openLocalProject(memoryAuthorDirectory(files).dir)
  const scenes = unavailableScenes ? [] : opened.scenes
  const main = new EditSession(
    toEditorState(opened.project, scenes, {}, {}, [], undefined, opened.scriptPreview),
  )
  const script = new ScriptEditSession({ scenes, items: [], sharedScripts: {} })
  const before = structuredClone(main.getState().scenes)
  const authorBefore = structuredClone(script.getState())
  const history = new EditorHistoryCoordinator(main, script)
  await act(async () =>
    root.render(
      <App
        session={main}
        history={history}
        script={{ session: script }}
        project={opened.project}
        workspace={createLocalWorkspaceContext(opened.project.manifest.id, 'blank-project')}
        authorBaseline={opened.authorBaseline}
      />,
    ),
  )
  return { main, script, history, before, authorBefore }
}
const inspector = () => host.querySelector<HTMLElement>('.inspector')!
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!
async function openHostScripts() {
  const actor = [
    ...host.querySelectorAll<HTMLButtonElement>('.scene-entity-group button.node'),
  ].find((button) => button.textContent?.includes('客栈掌柜'))!
  await act(async () => actor.click())
  if (!host.querySelector('.canonical-script-drawer')) await click('📜 脚本')
}
async function openStep(index: number) {
  await act(async () =>
    host.querySelector<HTMLButtonElement>(`[aria-label^="打开“步骤 ${index} ·"]`)!.click(),
  )
}
async function usage(kind: string) {
  await act(async () =>
    inspector()
      .querySelector<HTMLButtonElement>('#initial-state-inspector-tab-references')!
      .click(),
  )
  const button = [
    ...host.querySelectorAll<HTMLButtonElement>('.ds-reference-row[data-actionable]'),
  ].find(
    (button) => button.textContent?.includes('院外守卫') && button.textContent?.includes(kind),
  )!
  await act(async () => button.click())
}

test('independent workspace edits the selected scene only and project usages reopen exact scheme or inherited step', async () => {
  const rig = await mountApp()
  await openHostScripts()
  expect(inspector().textContent).toContain('初始隐藏（待剧情出场）')
  await openStep(1)
  await click('在初态编排中查看 / 编辑')
  expect(host.querySelector('[aria-label="初态编排工作区"]')).not.toBeNull()
  expect(inspector().textContent).not.toContain('初始隐藏（待剧情出场）')
  expect(canvas().scene.id).toBe('start')
  expect(canvas().focusRegion?.positions).toEqual([{ col: 6, row: 7, height: 1 }])
  await setInputValue(
    inspector().querySelector<HTMLInputElement>('[aria-label="初始列坐标"]')!,
    '9.5',
  )
  const outsideTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
    (tab) => tab.textContent === '院外',
  )!
  await act(async () => outsideTab.click())
  expect(canvas().scene.id).toBe('outside')
  expect(inspector().querySelector<HTMLInputElement>('[aria-label="初始列坐标"]')!.value).toBe('16')
  expect(comboboxByAriaLabel(inspector(), '初始显隐').textContent).toContain('隐藏')
  await setInputValue(
    inspector().querySelector<HTMLInputElement>('[aria-label="初始列坐标"]')!,
    '18',
  )
  expect(
    rig.main
      .getState()
      .scriptPreview!.states[0]!.scenes.map((slice) => slice.entities[0]!.pos?.col),
  ).toEqual([9.5, 18])
  await click('返回脚本详情')
  expect(comboboxByAriaLabel(dialog(), '此步骤的预览初始状态').textContent).toContain('迎客前')
  expect(inspector().textContent).toContain('初始隐藏（待剧情出场）')
  await click('关闭')
  await openStep(1)
  await click('在初态编排中查看 / 编辑')
  await usage('方案默认')
  expect(dialog().querySelector<HTMLInputElement>('[aria-label="方案名称"]')!.value).toBe(
    '夜间交谈',
  )
  expect(comboboxByAriaLabel(dialog(), '此方案的默认预览初始状态').textContent).toContain('迎客前')
  await click('在初态编排中查看 / 编辑')
  expect(canvas().scene.id).toBe('outside')
  expect(canvas().selectedEntityId).toBe('host')
  await act(async () =>
    inspector()
      .querySelector<HTMLButtonElement>('#initial-state-inspector-tab-references')!
      .click(),
  )
  const referenceTab = inspector().querySelector<HTMLButtonElement>(
    '#initial-state-inspector-tab-references',
  )!
  expect(referenceTab.textContent).toBe('引用 5')
  const referenceRows = () => [...inspector().querySelectorAll('.ds-reference-row')]
  expect(
    referenceRows().map((row) => row.querySelector('.ds-reference-row__title')?.textContent),
  ).toContain('关门后')
  expect(
    referenceRows()
      .find((row) => row.querySelector('.ds-reference-row__title')?.textContent === '关门后')
      ?.querySelector('.ds-reference-row__detail')?.textContent,
  ).toBe('夜间交谈')
  await act(async () => canvas().onSelectEntity('guest'))
  expect(referenceTab.textContent).toBe('引用 5')
  expect(referenceRows()).toHaveLength(5)
  const sourceLabels = [...host.querySelectorAll('.ds-reference-row[data-actionable]')].map(
    (button) => button.textContent,
  )
  expect(
    sourceLabels.some(
      (label) =>
        label?.includes('院外守卫 / 交互脚本') &&
        label.includes('夜间交谈') &&
        label.includes('方案默认'),
    ),
  ).toBe(true)
  expect(
    sourceLabels.some(
      (label) =>
        label?.includes('院外守卫 / 自动行为') &&
        label.includes('夜间交谈') &&
        label.includes('方案默认'),
    ),
  ).toBe(true)
  await usage('自动行为')
  expect(
    [...host.querySelectorAll('[role="tab"]')]
      .find((tab) => tab.textContent === '自动行为')
      ?.getAttribute('aria-selected'),
  ).toBe('true')
  expect(dialog().querySelector<HTMLInputElement>('[aria-label="方案名称"]')!.value).toBe(
    '夜间交谈',
  )
  await click('在初态编排中查看 / 编辑')
  await usage('继承步骤')
  expect(dialog().textContent).toContain('关门后')
  expect(comboboxByAriaLabel(dialog(), '此步骤的预览初始状态').textContent).toContain(
    '继承方案默认',
  )
  expect(host.querySelector('.scene-entity-group button.node.sel')?.textContent).toContain(
    '院外守卫',
  )
  expect(rig.main.getState().scenes).toEqual(rig.before)
  expect(rig.script.getState()).toEqual(rig.authorBefore)
})

test('non-current scheme draft survives workspace navigation; cancel and paired save retain atomic history and closed details stay closed', async () => {
  const rig = await mountApp()
  await openHostScripts()
  await click('打开“夜间交谈”的方案详情')
  await setInputValue(
    dialog().querySelector<HTMLInputElement>('[aria-label="方案名称"]')!,
    '晚间问候',
  )
  await chooseComboboxOption(comboboxByAriaLabel(dialog(), '此方案的默认预览初始状态'), '返回后')
  expect(dialog().textContent).toContain('这份初态未配置当前场景，当前场景沿用默认摆放。')
  await click('在初态编排中查看 / 编辑')
  await click('新建初始状态')
  expect(rig.main.getState().scriptPreview!.bindings).toEqual(previewLibrary().bindings)
  expect(rig.main.getState().scriptPreview!.schemeDefaults).toHaveLength(2)
  await click('返回脚本详情')
  expect(dialog().querySelector<HTMLInputElement>('[aria-label="方案名称"]')!.value).toBe(
    '晚间问候',
  )
  expect(comboboxByAriaLabel(dialog(), '此方案的默认预览初始状态').textContent).toContain('返回后')
  await click('取消')
  await click('打开“夜间交谈”的方案详情')
  expect(dialog().querySelector<HTMLInputElement>('[aria-label="方案名称"]')!.value).toBe(
    '夜间交谈',
  )
  expect(comboboxByAriaLabel(dialog(), '此方案的默认预览初始状态').textContent).toContain(
    '场景默认',
  )
  const beforePair = structuredClone(rig.main.getState().scriptPreview)
  await setInputValue(
    dialog().querySelector<HTMLInputElement>('[aria-label="方案名称"]')!,
    '晚间问候',
  )
  await chooseComboboxOption(comboboxByAriaLabel(dialog(), '此方案的默认预览初始状态'), '返回后')
  await act(async () => buttonByLabel(dialog(), '保存').click())
  expect(rig.script.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.later!.label).toBe(
    '晚间问候',
  )
  expect(rig.main.getState().scriptPreview!.schemeDefaults.at(-1)).toMatchObject({
    entry: { sceneId: 'start', schemeId: 'later' },
    stateId: 'room',
  })
  await act(async () => rig.history.undo())
  expect(rig.script.getState()).toEqual(rig.authorBefore)
  expect(rig.main.getState().scriptPreview).toEqual(beforePair)
  await openStep(2)
  await chooseComboboxOption(
    comboboxByAriaLabel(dialog(), '此步骤的预览初始状态'),
    '场景默认（此步骤不继承）',
  )
  await click('打开初态编排')
  await click('返回脚本详情')
  expect(comboboxByAriaLabel(dialog(), '此步骤的预览初始状态').textContent).toContain(
    '场景默认（此步骤不继承）',
  )
  await click('关闭')
  // Closing/reopening the drawer remounts the workspace; consumed navigation cannot reopen a dialog.
  await click('脚本面板')
  await click('📜 脚本')
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  await click('场景')
  const link = [...document.querySelectorAll<HTMLAnchorElement>('[role="menuitem"][href]')].find(
    (link) => link.textContent?.includes('初态编排'),
  )!
  await act(async () => link.click())
  expect(host.querySelector('[aria-label="初态编排工作区"]')).not.toBeNull()
  expect(host.textContent).not.toContain('返回脚本详情')
  await click('新建初始状态')
  await act(async () => rig.history.undo())
  expect(host.textContent).toContain('目标不存在')
  expect(host.querySelector('[aria-label="初始状态名称"]')).toBeNull()
})

test('scene-hook drafts retain runtime default and preview-only saves; deleted return targets stay invalid after undo', async () => {
  const rig = await mountApp()
  await click('📜 脚本')
  await click('打开“夜间进店”的方案详情')
  await setInputValue(
    dialog().querySelector<HTMLInputElement>('[aria-label="方案名称"]')!,
    '夜间问候',
  )
  await click('设为默认方案')
  await chooseComboboxOption(comboboxByAriaLabel(dialog(), '此方案的默认预览初始状态'), '迎客前')
  await click('在初态编排中查看 / 编辑')
  await click('返回脚本详情')
  expect(dialog().querySelector<HTMLInputElement>('[aria-label="方案名称"]')!.value).toBe(
    '夜间问候',
  )
  expect(buttonByLabel(dialog(), '取消默认').getAttribute('aria-pressed')).toBe('true')
  expect(comboboxByAriaLabel(dialog(), '此方案的默认预览初始状态').textContent).toContain('迎客前')
  await click('取消')
  expect(rig.script.getState()).toEqual(rig.authorBefore)
  await click('打开“夜间进店”的方案详情')
  await chooseComboboxOption(comboboxByAriaLabel(dialog(), '此方案的默认预览初始状态'), '迎客前')
  const beforePreview = structuredClone(rig.main.getState().scriptPreview)
  await act(async () => buttonByLabel(dialog(), '保存').click())
  expect(rig.main.getState().scriptPreview!.schemeDefaults.at(-1)).toEqual({
    entry: { sceneId: 'start', channel: 'onEnter', schemeId: 'night' },
    stateId: 'door',
  })
  expect(rig.script.getState()).toEqual(rig.authorBefore)
  await act(async () => rig.history.undo())
  expect(rig.main.getState().scriptPreview).toEqual(beforePreview)
  expect(host.querySelector('.script-scheme-card.active')?.textContent).toContain('客人进店')
  await openHostScripts()
  await openStep(2)
  await click('打开初态编排')
  const flow = rig.script.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.greet!.flow
  await act(async () =>
    rig.script.dispatch(
      new UpdateEntityBehaviorCommand({ scene: 'start', entity: 'host' }, 'trigger', 'greet', {
        flow: { ...flow, stages: [flow.stages[0]!] },
      }),
    ),
  )
  expect(host.textContent).not.toContain('返回脚本详情')
  await act(async () => rig.history.undo())
  expect(host.textContent).not.toContain('返回脚本详情')
  expect(document.querySelector('[role="dialog"]')).toBeNull()
})

test('initial-state workspace remains reachable when no author scene is available', async () => {
  // The editor may expose an unavailable scene with repairable sidecar references; no save is attempted.
  window.history.replaceState({}, '', '/?module=scene&page=initial-states')
  const mounted = mountApp(true)
  await expect(mounted).resolves.toBeDefined()
  const rig = await mounted
  await act(async () => host.querySelector<HTMLButtonElement>('.initial-state-row')!.click())
  await act(async () =>
    inspector()
      .querySelector<HTMLButtonElement>('#initial-state-inspector-tab-references')!
      .click(),
  )
  const references = inspector().querySelector<HTMLElement>(
    '#initial-state-inspector-panel-references',
  )!
  expect(references.textContent).toContain('整份初态的引用')
  expect(references.querySelectorAll('article.ds-reference-row').length).toBeGreaterThan(0)
  expect(references.querySelector('button.ds-reference-row')).toBeNull()
  expect(references.textContent).toContain('来源场景、角色、脚本方案或步骤已不存在')
  expect(buttonByLabel(host, '删除').disabled).toBe(true)
  expect(host.querySelector('[aria-label="初态编排工作区"]')).not.toBeNull()
  await click('新建初始状态')
  expect(rig.main.getState().scriptPreview!.states.at(-1)!.scenes).toEqual([])
  expect(host.querySelector('[aria-label="初始状态名称"]')).not.toBeNull()
})
