// @vitest-environment jsdom
/**
 * TEST-COVERAGE85-GLM-EDITOR-1 批4a：App 实体敌对行为与场景落点检查器合同。
 *
 * fullName 排重（旧文件已证，不复制）：
 * - App.leave-guard：保存/离开/历史顺序族；App.reference-navigation：locator 跳转族；
 *   App.glm-next-wave F01：脚本库路由→命令编辑弹窗。均未触碰本文件的敌对行为/入场点/
 *   命名落点检查器输入。
 * 本文件只补 cov-base 实测缺臂：敌对开战开关的成对默认体/清除、hide ticks 与 suspend
 * ticks 的守卫提交、逃跑策略切换的 ticks 继承、敌队缺数据回显、场景默认入场点
 * col/row/height 部分补丁、命名落点 label/坐标轴编辑。全部真实 App 挂载 + 真实
 * EditSession/ScriptEditSession 状态 oracle；SceneCanvas 以同 leave-guard 策略隔离
 * （本批不涉及画布交互）。
 */

import type { RuntimeHostileBehavior } from '@type-pal/content'
import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { battleTrialProjectFiles } from '../core/__tests__/battle-trial-project.js'
import { EditSession } from '../core/edit-session.js'
import { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import { finishOpen, type Opened } from '../core/open-actions.js'
import { toEditorState } from '../core/project-io.js'
import { ScriptEditSession } from '../core/script-editor.js'
import { projectEditorItemShells } from '../core/script-editor-projection.js'
import { App } from './App.js'

vi.mock('./SceneCanvas.js', () => ({ SceneCanvas: () => <div /> }))
vi.mock('../core/author-save-store.js', async (original) => {
  const { memoryAuthorSaveStore } = await import('../core/__tests__/author-save-store-fixture.js')
  return memoryAuthorSaveStore(await original<typeof import('../core/author-save-store.js')>())
})
const bindings = vi.hoisted(
  () => new Map<string, import('../core/handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('../core/handle-store.js', async (original) => {
  const actual = await original<typeof import('../core/handle-store.js')>()
  const save = async (
    context: import('../core/workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  }
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const record of bindings.values())
        if (await handle.isSameEntry(record.handle)) return record
      return null
    },
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (_lock: unknown, ...args: Parameters<typeof save>) =>
      save(...args),
  }
})

interface AppWorld {
  opened: Opened
  main: EditSession
  script: ScriptEditSession
  host: HTMLDivElement
  mount(url?: string): Promise<void>
}

async function createAppWorld(withHostileEntity: boolean): Promise<AppWorld> {
  const disk = memoryAuthorDirectory(await battleTrialProjectFiles())
  const opened = await finishOpen(disk.dir)
  const base = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
  const hostileEntity = {
    id: 'e-hostile',
    pos: { col: 3, row: 3, height: 0 },
    sprite: 'hero',
    ...(withHostileEntity
      ? {
          hostile: {
            enemyTeamId: 'ghost-team',
            onVictory: { kind: 'hide' as const, ticks: 4 },
            onPlayerFlee: { kind: 'suspend' as const, ticks: 6 },
          },
        }
      : {}),
  }
  const scene = {
    ...structuredClone(base.scenes[0]!),
    entities: [
      hostileEntity,
      { id: 'e-plain', pos: { col: 4, row: 4, height: 0 }, sprite: 'hero' },
    ],
    entries: {
      'entry-cov85': { label: '老家落点', pos: { col: 2, row: 5, height: 1 } },
    },
  }
  const main = new EditSession({
    ...base,
    scenes: [scene],
    items: projectEditorItemShells(opened.project),
  })
  const sharedScripts = structuredClone(opened.project.authorContent.sharedScripts ?? {})
  const script = new ScriptEditSession({
    scenes: opened.scenes,
    items: opened.project.authorContent.items,
    sharedScripts,
  })
  const host = document.createElement('div')
  let root: Root | undefined
  return {
    opened,
    main,
    script,
    host,
    async mount(url = '/?module=scene') {
      window.history.replaceState({}, '', url)
      document.body.append(host)
      root = createRoot(host)
      await act(async () =>
        root!.render(
          <StrictMode>
            <App
              session={main}
              history={new EditorHistoryCoordinator(main, script)}
              script={{ session: script }}
              project={opened.project}
              workspace={opened.workspace}
              initialDir={disk.dir}
              authorBaseline={opened.authorBaseline}
              onOpened={() => undefined}
              onBackToPicker={() => undefined}
            />
          </StrictMode>,
        ),
      )
    },
  }
}

let world: AppWorld | undefined

beforeEach(async () => {
  const { installBrowserHardwarePorts } = await import('./__tests__/kimi-editor-workflows/kit.js')
  installBrowserHardwarePorts()
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open')
    },
  })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  localStorage.clear()
})

afterEach(async () => {
  if (world) {
    const currentWorld = world
    await act(async () => {
      currentWorld.host.remove()
    })
    world = undefined
  }
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function selectEntity(host: HTMLElement, entityId: string): Promise<void> {
  const node = [
    ...host.querySelectorAll<HTMLButtonElement>('.scene-outline-action-row .node'),
  ].find((button) => button.textContent?.includes(entityId))
  expect(node, `entity outline node ${entityId}`).toBeDefined()
  await act(async () => {
    node!.click()
  })
}

async function switchInspectorTab(host: HTMLElement, label: string): Promise<void> {
  const tab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
    (button) => button.textContent?.trim() === label,
  )
  expect(tab, `inspector tab ${label}`).toBeDefined()
  await act(async () => {
    tab!.click()
  })
}

async function fillAndBlur(input: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    input.focus()
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.blur()
  })
}

function _numberInput(host: HTMLElement, id: string): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(`input#${CSS.escape(id)}`)
  expect(input, `number input ${id}`).toBeDefined()
  return input!
}

test('cov85-app 敌对开战开关：成对默认体落账、关闭清空并可撤销', async () => {
  world = await createAppWorld(false)
  await world.mount()
  const current = world
  if (!current) throw new Error('app world missing')
  await selectEntity(current.host, 'e-plain')
  await switchInspectorTab(world.host, '行为')
  const toggle = [...world.host.querySelectorAll<HTMLLabelElement>('label')].find((label) =>
    label.textContent?.includes('遇敌开战'),
  )
  expect(toggle).toBeDefined()
  const checkbox = toggle!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  await act(async () => {
    checkbox.click()
  })
  const enemyTeams = current.main.getState().enemyTeams ?? []
  const firstTeamId = enemyTeams.length > 0 ? enemyTeams[0]!.id : 'missing-enemy-team'
  const expectedHostile = {
    enemyTeamId: firstTeamId,
    onVictory: { kind: 'remove' },
    onPlayerFlee: { kind: 'remain' },
  }
  expect(current.main.getState().scenes[0]!.entities[1]!.hostile).toEqual(expectedHostile)
  await act(async () => {
    checkbox.click()
  })
  expect(current.main.getState().scenes[0]!.entities[1]!.hostile).toBeUndefined()
  expect(current.main.undo()).toBe(true)
  expect(current.main.getState().scenes[0]!.entities[1]!.hostile).toEqual(expectedHostile)
})

test('cov85-app hide/suspend ticks 守卫提交与逃跑策略 ticks 继承', async () => {
  world = await createAppWorld(true)
  await world.mount()
  await selectEntity(world.host, 'e-hostile')
  await switchInspectorTab(world.host, '行为')
  const entity = () => {
    const current = world
    if (!current) throw new Error('app world missing')
    return current.main.getState().scenes[0]!.entities[0]!
  }
  const hostileOf = () => entity().hostile as RuntimeHostileBehavior | undefined
  const inputByRowLabel = (labelText: string): HTMLInputElement => {
    const current = world
    if (!current) throw new Error('app world missing')
    const row = [
      ...current.host.querySelectorAll<HTMLElement>('[class*="property-row"], .row'),
    ].find((element) => element.textContent?.includes(labelText))
    expect(row, `property row ${labelText}`).toBeDefined()
    const input = row!.querySelector<HTMLInputElement>('input')
    expect(input, `input in row ${labelText}`).toBeDefined()
    return input!
  }
  // 战败后 hide ticks：输入框 min=1 已在提交前拒绝 0（守卫 ticks>0 为防御层），合法 9 提交。
  const victoryInput = inputByRowLabel('胜利隐藏 ticks')
  await fillAndBlur(victoryInput, '9')
  expect(hostileOf()?.onVictory).toEqual({ kind: 'hide', ticks: 9 })
  // 逃跑后先切 remain；再切回 suspend —— 当前值已不是 suspend，按缺省 15 落账。
  const fleeSelect = world.host.querySelector<HTMLButtonElement>(
    'button[role="combobox"][id$="flee"]',
  )
  expect(fleeSelect).toBeDefined()
  await act(async () => {
    fleeSelect!.click()
  })
  const remainOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (option) => option.textContent?.trim() === '保持原样',
  )
  expect(remainOption).toBeDefined()
  await act(async () => {
    remainOption!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  expect(hostileOf()?.onPlayerFlee).toEqual({ kind: 'remain' })
  await act(async () => {
    fleeSelect!.click()
  })
  const suspendOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (option) => option.textContent?.trim() === '短暂暂停自动行为',
  )
  await act(async () => {
    suspendOption!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  expect(hostileOf()?.onPlayerFlee).toEqual({ kind: 'suspend', ticks: 15 })
  // 逃跑暂停 ticks：合法 12 提交（0/-3 同样由输入 min=1 先行拒绝）。
  const fleeTicks = inputByRowLabel('逃跑暂停 ticks')
  await fillAndBlur(fleeTicks, '12')
  expect(hostileOf()?.onPlayerFlee).toEqual({ kind: 'suspend', ticks: 12 })
})

test('cov85-app 场景默认入场点 col/height 部分补丁互不覆盖', async () => {
  const currentWorld = await createAppWorld(false)
  world = currentWorld
  await currentWorld.mount()
  const defaultEntryNode = [
    ...currentWorld.host.querySelectorAll<HTMLButtonElement>('button.node'),
  ].find((button) => button.textContent?.includes('默认落点'))
  expect(defaultEntryNode).toBeDefined()
  await act(async () => {
    defaultEntryNode!.click()
  })
  const entryAxisInput = (axis: string): HTMLInputElement => {
    const currentWorld = world
    if (!currentWorld) throw new Error('app world missing')
    const label = [...currentWorld.host.querySelectorAll<HTMLLabelElement>('label.entry-n')].find(
      (candidate) => candidate.querySelector('span')?.textContent === axis,
    )
    expect(label, `entry axis label ${axis}`).toBeDefined()
    return label!.querySelector<HTMLInputElement>('input')!
  }
  const colInput = entryAxisInput('col')
  await fillAndBlur(colInput, '7')
  const scene = currentWorld.main.getState().scenes[0]!
  expect(scene.entry.pos).toMatchObject({ col: 7, row: scene.entry.pos.row })
  const heightInput = entryAxisInput('height')
  await fillAndBlur(heightInput, '2')
  const updated = currentWorld.main.getState().scenes[0]!
  expect(updated.entry.pos).toEqual({ col: 7, row: updated.entry.pos.row, height: 2 })
})

test('cov85-app 命名落点：label 清空删除键、坐标单轴提交', async () => {
  world = await createAppWorld(false)
  await world.mount()
  const entryRow = [...world.host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
    button.textContent?.includes('老家落点'),
  )
  expect(entryRow, 'named entry outline row').toBeDefined()
  await act(async () => {
    entryRow!.click()
  })
  const labelInput = [...world.host.querySelectorAll<HTMLInputElement>('input')].find(
    (input) => input.value === '老家落点',
  )
  expect(labelInput).toBeDefined()
  await fillAndBlur(labelInput!, '新渡口')
  const entries = world.main.getState().scenes[0]!.entries!
  expect(entries['entry-cov85']).toEqual({ label: '新渡口', pos: { col: 2, row: 5, height: 1 } })
  await fillAndBlur(labelInput!, '  ')
  expect(world.main.getState().scenes[0]!.entries!['entry-cov85']!.label).toBeUndefined()
  const rowInput = world.host.querySelector<HTMLInputElement>(
    'input[id^="entry-row-"][id$="entry-cov85"]',
  )
  expect(rowInput).toBeDefined()
  await fillAndBlur(rowInput!, '6')
  expect(world.main.getState().scenes[0]!.entries!['entry-cov85']!.pos).toEqual({
    col: 2,
    row: 6,
    height: 1,
  })
})

test('cov85-app 敌队缺数据回显与真实敌队切换、追逐参数成对默认体', async () => {
  world = await createAppWorld(true)
  await world.mount()
  await selectEntity(world.host, 'e-hostile')
  await switchInspectorTab(world.host, '行为')
  const hostileOf = () => {
    const current = world
    if (!current) throw new Error('app world missing')
    return current.main.getState().scenes[0]!.entities[0]!.hostile as
      | RuntimeHostileBehavior
      | undefined
  }
  // ghost-team 不在敌队表：选项首位是「缺数据」回显。
  const teamRow = [...world.host.querySelectorAll<HTMLElement>('[class*="property-row"]')].find(
    (element) => (element.textContent ?? '').trim().startsWith('敌队'),
  )
  if (!teamRow) throw new Error('敌队 property row missing after tab switch')
  expect(teamRow, '敌队 property row').toBeDefined()
  const teamTrigger = teamRow!.querySelector<HTMLButtonElement>('button[role="combobox"]')
  expect(teamTrigger, '敌队 combobox').toBeDefined()
  await act(async () => {
    teamTrigger!.click()
  })
  const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')].map((option) =>
    option.textContent?.trim(),
  )
  expect(options.some((text) => text?.includes('ghost-team（缺数据）'))).toBe(true)
  // 切到真实敌队 practice。
  const practiceOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (option) => option.textContent?.includes('practice'),
  )
  expect(practiceOption).toBeDefined()
  await act(async () => {
    practiceOption!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  expect(hostileOf()?.enemyTeamId).toBe('practice')

  // 追逐：默认未开；勾选落 {range:6,speed:2}，改 range/speed 精确提交，取消清键。
  const chaseToggle = [...world.host.querySelectorAll<HTMLLabelElement>('label')].find((label) =>
    label.textContent?.includes('见人就追'),
  )
  expect(chaseToggle).toBeDefined()
  const chaseInput = chaseToggle!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  await act(async () => {
    chaseInput.click()
  })
  expect(hostileOf()?.chase).toEqual({ range: 6, speed: 2 })
  const chaseRange = world.host.querySelector<HTMLInputElement>('input[id$="chase-range"]')
  expect(chaseRange).toBeDefined()
  await fillAndBlur(chaseRange!, '9')
  expect(hostileOf()?.chase).toEqual({ range: 9, speed: 2 })
  const chaseSpeed = world.host.querySelector<HTMLInputElement>('input[id$="chase-speed"]')
  expect(chaseSpeed).toBeDefined()
  await fillAndBlur(chaseSpeed!, '3')
  expect(hostileOf()?.chase).toEqual({ range: 9, speed: 3 })
  await act(async () => {
    chaseInput.click()
  })
  expect(hostileOf()?.chase).toBeUndefined()
  await act(async () => {
    expect(world!.main.undo()).toBe(true)
  })
  expect(hostileOf()?.chase).toEqual({ range: 9, speed: 3 })
})
