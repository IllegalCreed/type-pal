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
import { ScriptEditSession } from '../core/script-editor.js'
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

test('App uses only the preview Inspector for NPC initial-state editing and restores formal properties on return', async () => {
  const files = await buildBlankProject('preview-inspector')
  const scene = previewAuthorScene()
  scene.entities[0]!.label = '客栈掌柜'
  scene.entities[1]!.label = '来访客人'
  const library = previewLibrary()
  for (let i = 1; i <= 5; i++) {
    const entity = {
      id: `distant-${i}`,
      label: `远处角色${i}`,
      sprite: 'hero',
      pos: { col: 20 + i, row: 5, height: 0 },
    }
    scene.entities.push(entity)
    library.states[0]!.entities.push({ entityId: entity.id, hidden: true })
  }
  files['content/scenes/start.json'] = scene
  files['editor/script-preview.json'] = library
  const opened = await openLocalProject(memoryAuthorDirectory(files).dir)
  const main = new EditSession(
    toEditorState(opened.project, opened.scenes, {}, {}, [], undefined, opened.scriptPreview),
  )
  const script = new ScriptEditSession({ scenes: opened.scenes, items: [], sharedScripts: {} })
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
  const actor = [
    ...host.querySelectorAll<HTMLButtonElement>('.scene-entity-group button.node'),
  ].find((button) => button.textContent?.includes('客栈掌柜'))!
  await act(async () => actor.click())
  const inspector = () => host.querySelector<HTMLElement>('.inspector')!
  expect(inspector().textContent).toContain('初始隐藏（待剧情出场）')
  await click('📜 脚本')
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label^="打开“步骤 1 ·"]')!.click(),
  )
  await click('在初始状态中查看 / 编辑')
  const initialColumn = inspector().querySelector<HTMLInputElement>('[aria-label="初始列坐标"]')
  expect(initialColumn).not.toBeNull()
  expect(inspector().textContent).not.toContain('初始隐藏（待剧情出场）')
  expect(inspector().classList.contains('inspector--tabbed')).toBe(false)
  expect(comboboxByAriaLabel(inspector(), '初始显隐').textContent).toContain('显示')
  expect(canvas().focusRegion?.positions).toEqual([{ col: 6, row: 7, height: 1 }])
  const firstFocusKey = canvas().focusRegion!.key
  expect(host.querySelector('[aria-label="初始状态列表"]')).not.toBeNull()
  expect(host.querySelector('[aria-label="开场时的角色与物件"]')?.textContent).toContain(
    '远处角色1',
  )
  await setInputValue(initialColumn!, '9.5')
  expect(main.getState().scriptPreview!.states[0]!.entities[0]!.pos).toEqual({
    col: 9.5,
    row: 7,
    height: 1,
  })
  expect(main.getState().scenes).toEqual(before)
  expect(script.getState()).toEqual(authorBefore)
  const guest = [
    ...host.querySelectorAll<HTMLButtonElement>('[aria-label="开场时的角色与物件"] button'),
  ].find((button) => button.textContent?.includes('来访客人'))!
  await act(async () => guest.click())
  expect(canvas().focusRegion?.positions).toEqual([{ col: 8, row: 9, height: 0 }])
  expect(canvas().focusRegion?.key).not.toBe(firstFocusKey)
  expect(inspector().querySelector<HTMLInputElement>('[aria-label="初始列坐标"]')?.value).toBe('8')
  expect(actor.classList.contains('sel')).toBe(true)
  await click('返回脚本详情')
  expect(inspector().querySelector('[aria-label="初始列坐标"]')).toBeNull()
  expect(inspector().textContent).toContain('初始隐藏（待剧情出场）')
  expect(inspector().classList.contains('inspector--tabbed')).toBe(true)
  expect(main.getState().scenes).toEqual(before)
  expect(script.getState()).toEqual(authorBefore)
  await click('关闭')
  await click('打开“迎客”的方案详情')
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
  const beforePair = structuredClone(main.getState().scriptPreview)
  await setInputValue(
    dialog.querySelector<HTMLInputElement>('[aria-label="方案名称"]')!,
    '迎客新名称',
  )
  await chooseComboboxOption(comboboxByAriaLabel(dialog, '此方案的默认预览初始状态'), '返回后')
  await act(async () => buttonByLabel(dialog, '保存').click())
  expect(script.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.greet!.label).toBe(
    '迎客新名称',
  )
  expect(main.getState().scriptPreview!.schemeDefaults[0]?.stateId).toBe('room')
  await act(async () => history.undo())
  expect(script.getState()).toEqual(authorBefore)
  expect(main.getState().scriptPreview).toEqual(beforePair)
})
