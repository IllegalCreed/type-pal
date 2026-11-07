// @vitest-environment jsdom
import type { AuthorCommand, AuthorScriptFlow } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test } from 'vitest'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  type ScriptEditorState,
  ScriptEditSession,
  UpdateEntityBehaviorCommand,
  UpdateSharedScriptCommand,
} from '../core/script-editor.js'
import { createAcquisitionFlow } from './ItemAcquisitionEditor.js'
import {
  CanonicalScriptBodyEditor,
  type CanonicalScriptEditorContext,
  CanonicalScriptFlowEditor,
  ScriptSchemeCreateDialog,
} from './ScriptEditor.js'

// The existing ScriptEditor interaction tests own generic modal/focus failure boundaries.
// These cases exercise recipe-specific transactions through the real ScriptEditSession.
const target = { scene: 'room', entity: 'box' }
const items = ['potion', 'seed'].map((id) => ({
  id,
  name: id === 'potion' ? '止血草' : '雪莲子',
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
}))
function scriptState(
  flow: AuthorScriptFlow = createAcquisitionFlow('builtin/item/chest', 'potion'),
): ScriptEditorState {
  return {
    scenes: [
      {
        id: 'room',
        mapId: 'room-map',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'box',
            sprite: 'box-sprite',
            pos: { col: 1, row: 1, height: 0 },
            facing: 'down',
            behaviors: { trigger: { collect: { label: '药箱', order: 0, flow } } },
            pages: [{ id: 'base', label: '普通', trigger: 'collect' }],
            initialPage: 'base',
          },
        ],
      },
    ],
    items,
    sharedScripts: { story: { name: '给药', self: 'none', body: [] } },
  }
}
const reader: EditorAssetReader = {
  projectId: 'acquisition-test',
  record() {
    throw new Error('this form does not load asset bytes')
  },
  async readBytes() {
    throw new Error('this form does not load asset bytes')
  },
  async readRoleBytes() {
    throw new Error('this form does not load asset bytes')
  },
  async urlFor() {
    throw new Error('this form does not load asset bytes')
  },
}
function context(state: ScriptEditorState): CanonicalScriptEditorContext {
  return {
    state,
    currentSceneId: target.scene,
    currentEntityId: target.entity,
    shellScenes: [
      {
        id: target.scene,
        mapId: 'room-map',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
      },
    ],
    locale: {},
    assetCatalog: { version: 1, assets: {} },
    assetReader: reader,
    audioResolver: reader,
    battleSprites: [],
    references: {
      choices: (kind) =>
        kind === 'item' ? items.map((item) => ({ id: item.id, name: item.name })) : [],
      has: (kind, id) => kind === 'item' && items.some((item) => item.id === id),
      label: (kind, id) =>
        kind === 'item' ? (items.find((item) => item.id === id)?.name ?? id) : id,
    },
  }
}
let host: HTMLDivElement
let root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})
async function click(label: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (entry) =>
      (!entry.closest('dialog') || entry.closest('dialog')!.open) &&
      (entry.textContent?.trim() === label || entry.getAttribute('aria-label') === label),
  )
  expect(button, label).toBeDefined()
  await act(async () => button!.click())
}
async function choose(label: string, option: string) {
  const field = [...document.querySelectorAll<HTMLLabelElement>('label')].find(
    (entry) => entry.textContent === label,
  )
  const control =
    document.querySelector<HTMLButtonElement>(`[role="combobox"][aria-label="${label}"]`) ??
    (field ? document.getElementById(field.htmlFor) : null)
  expect(control, label).not.toBeNull()
  await act(async () => control!.click())
  const choice = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((entry) =>
    entry.textContent?.includes(option),
  )
  expect(choice, option).toBeDefined()
  await act(async () => choice!.click())
}
async function input(label: string, value: string, key = 'Enter') {
  const control = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  expect(control, label).not.toBeNull()
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(control, value)
    control!.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () =>
    control!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })),
  )
}
function currentFlow(session: ScriptEditSession) {
  return session.getStateSnapshot().scenes[0]!.entities[0]!.behaviors!.trigger!.collect!.flow
}
function FlowHarness({ session }: { session: ScriptEditSession }) {
  const state = useSyncExternalStore(
    session.subscribe.bind(session),
    session.getStateSnapshot.bind(session),
  )
  return (
    <CanonicalScriptFlowEditor
      flow={currentFlow(session)}
      context={context(state)}
      ownerLabel="room/box/collect"
      onChange={(flow) =>
        session.dispatch(new UpdateEntityBehaviorCommand(target, 'trigger', 'collect', { flow }))
      }
    />
  )
}

test('search post-collection mode removes incompatible repeat feedback in one reversible edit', async () => {
  const session = new ScriptEditSession(
    scriptState(createAcquisitionFlow('builtin/item/search', 'seed')),
  )
  await act(async () => root.render(<FlowHarness session={session} />))
  await choose('空置反馈', '自定文字')
  const repeat = currentFlow(session)
  const version = session.getHistoryVersion()
  expect(host.textContent).toContain('编辑空置文字')
  await choose('领取之后', '停用搜刮点')
  expect(currentFlow(session)).toMatchObject({
    recipe: 'builtin/item/search',
    afterCollect: 'disable',
  })
  expect(currentFlow(session)).not.toHaveProperty('empty')
  expect(host.textContent).not.toContain('编辑空置文字')
  expect(session.getHistoryVersion()).toBe(version + 1)
  await act(async () => {
    session.undo()
  })
  expect(currentFlow(session)).toEqual(repeat)
  expect(host.textContent).toContain('编辑空置文字')
})

test('reselecting custom notices and repeat mode preserves both authored cues without a history entry', async () => {
  const flow = createAcquisitionFlow('builtin/item/search', 'seed')
  if (flow.recipe !== 'builtin/item/search') throw new Error('expected search recipe')
  const session = new ScriptEditSession(
    scriptState({
      ...flow,
      afterCollect: 'repeat',
      notice: {
        kind: 'custom',
        timing: 'after',
        cue: { identity: { kind: 'narration' }, rows: [{ text: '找到一颗雪莲子。' }] },
      },
      empty: {
        kind: 'custom',
        cue: { identity: { kind: 'narration' }, rows: [{ text: '只剩空莲蓬。' }] },
      },
    }),
  )
  await act(async () => root.render(<FlowHarness session={session} />))
  const before = session.getState()
  await choose('提示方式', '自定文字')
  await choose('空置反馈', '自定文字')
  await choose('领取之后', '仍可调查')
  expect(session.getState()).toEqual(before)
  expect(session.getHistoryVersion()).toBe(0)
})

test.each([
  ['宝箱领取', 'builtin/item/chest'],
  ['拾取地面物品', 'builtin/item/pickup'],
  ['搜刮固定地点', 'builtin/item/search'],
] as const)('creates %s as a parameterized scheme only after draft confirmation', async (label, recipe) => {
  const created: AuthorScriptFlow[] = []
  await act(async () =>
    root.render(
      <ScriptSchemeCreateDialog
        title="交互脚本"
        first
        acquisitionContext={context(scriptState())}
        onClose={() => {}}
        onCreate={(_name, flow) => {
          if (flow) created.push(flow)
        }}
      />,
    ),
  )
  await choose('方案内容', label)
  expect(created).toEqual([])
  expect(document.querySelector('dialog[open]')?.textContent).toContain('领取内容')
  await input('奖励 1 数量', '3')
  await click('创建取物方案')
  expect(created).toHaveLength(1)
  expect(created[0]).toMatchObject({
    kind: 'acquisition',
    recipe,
    rewards: [{ kind: 'item', itemId: 'potion', count: 3 }],
  })
})

test('[add-picker:script/item-rewards] [reorder-family:script-item-rewards] configures ordered rewards, detaches once, and restores the saved recipe through undo/reopen', async () => {
  const session = new ScriptEditSession(scriptState())
  await act(async () => root.render(<FlowHarness session={session} />))
  await input('奖励 1 数量', '7', 'Escape')
  expect(session.getHistoryVersion()).toBe(0)
  await input('奖励 1 数量', '2')
  expect(session.getHistoryVersion()).toBe(1)
  await click('添加物品')
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((entry) =>
    entry.textContent?.includes('雪莲子'),
  )
  expect(option).toBeDefined()
  await act(async () => option!.click())
  await click('取消')
  expect(session.getHistoryVersion()).toBe(1)
  await click('添加物品')
  const nextOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((entry) =>
    entry.textContent?.includes('雪莲子'),
  )!
  await act(async () => nextOption.click())
  const confirm = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
    (entry) => entry.textContent?.trim() === '添加物品',
  )!
  await act(async () => confirm.click())
  expect(session.getHistoryVersion()).toBe(2)
  const row = host.querySelectorAll('.acquisition-reward-row')[1]!
  const move =
    row.querySelector<HTMLButtonElement>('[data-reorder-move="backward"]') ??
    [...row.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.getAttribute('aria-label')?.includes('上移'),
    )
  expect(move).toBeDefined()
  await act(async () => move!.click())
  expect(currentFlow(session)).toMatchObject({
    rewards: [{ itemId: 'seed' }, { itemId: 'potion', count: 2 }],
  })
  const beforeDetach = structuredClone(currentFlow(session))
  const version = session.getHistoryVersion()
  await click('展开为普通脚本')
  expect(session.getHistoryVersion()).toBe(version)
  await click('确认展开')
  expect(session.getHistoryVersion()).toBe(version + 1)
  const expanded = currentFlow(session)
  expect(expanded.kind).toBe('stages')
  if (expanded.kind !== 'stages') throw new Error('expected detached script')
  expect(expanded.stages.map((stage) => stage.id)).toEqual(['available', 'collected'])
  expect(expanded.stages[0]!.body.filter((command) => command.kind === 'giveItem')).toEqual([
    { kind: 'giveItem', itemId: 'seed', count: 1 },
    { kind: 'giveItem', itemId: 'potion', count: 2 },
  ])
  await act(async () => {
    session.undo()
  })
  expect(currentFlow(session)).toEqual(beforeDetach)
  expect(host.textContent).toContain('开盖表现')
  const reopened = new ScriptEditSession(JSON.parse(JSON.stringify(session.getState())))
  await act(async () => root.render(<FlowHarness session={reopened} />))
  expect(host.querySelector<HTMLInputElement>('[aria-label="奖励 2 数量"]')?.value).toBe('2')
})

test('story rewards are configured before insertion and detach at their actual nested location', async () => {
  const state = scriptState()
  state.sharedScripts.story!.body = [
    {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'gift', is: true },
      then: [
        {
          kind: 'grantReward',
          rewards: [{ kind: 'item', itemId: 'potion', count: 3 }],
          notice: { kind: 'standard', timing: 'after' },
        },
        { kind: 'wait', ms: 20 },
      ],
    },
  ]
  const session = new ScriptEditSession(state)
  function Harness() {
    const state = useSyncExternalStore(
      session.subscribe.bind(session),
      session.getStateSnapshot.bind(session),
    )
    return (
      <CanonicalScriptBodyEditor
        body={state.sharedScripts.story!.body}
        context={context(state)}
        onChange={(body) => session.dispatch(new UpdateSharedScriptCommand('story', { body }))}
      />
    )
  }
  await act(async () => root.render(<Harness />))
  await click('添加指令')
  await click('🎁 共享取物：剧情发放奖励')
  await input('奖励 1 数量', '4')
  expect(session.getHistoryVersion()).toBe(0)
  await click('取消')
  expect(session.getHistoryVersion()).toBe(0)
  const command = host.querySelector<HTMLElement>('[data-command-path="0/then/0"]')!
  expect(command.textContent).toContain('止血草 × 3')
  await act(async () => command.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
  await click('展开为普通指令')
  await click('确认展开')
  const branch = session.getState().sharedScripts.story!.body[0]!
  if (branch.kind !== 'branch') throw new Error('expected branch')
  expect(branch.then).toEqual([
    { kind: 'giveItem', itemId: 'potion', count: 3 },
    {
      kind: 'dialog',
      cue: {
        identity: { kind: 'narration' },
        slot: 'narration',
        rows: [{ reward: { kind: 'item', itemName: '止血草', count: 3 } }],
      },
    },
    { kind: 'wait', ms: 20 },
  ] satisfies AuthorCommand[])
  expect(session.getHistoryVersion()).toBe(1)
  const dialogue = host.querySelector<HTMLElement>('[data-command-path="0/then/1"]')!
  await act(async () => dialogue.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
  expect(document.querySelector('dialog[open]')?.textContent).toContain('提示数量')
  await input('对话第 1 行提示数量', '5')
  await click('完成')
  const edited = session.getState().sharedScripts.story!.body[0]!
  expect(edited.kind === 'branch' && edited.then[1]).toMatchObject({
    kind: 'dialog',
    cue: { rows: [{ reward: { count: 5 } }] },
  })
})
