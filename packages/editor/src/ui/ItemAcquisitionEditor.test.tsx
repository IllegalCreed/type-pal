// @vitest-environment jsdom
import type {
  AuthorAcquisitionFlow,
  AuthorCommand,
  AuthorScriptFlow,
  FlowCursor,
} from '@type-pal/content'
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
  type CanonicalScriptFlowEditorProps,
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
function context(
  state: ScriptEditorState,
  assetCatalog: CanonicalScriptEditorContext['assetCatalog'] = { version: 1, assets: {} },
): CanonicalScriptEditorContext {
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
    assetCatalog,
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
  const listbox = document.getElementById(control!.getAttribute('aria-controls')!)
  expect(listbox?.getAttribute('role'), label).toBe('listbox')
  const options = [...listbox!.querySelectorAll<HTMLElement>('[role="option"]')]
  const choice =
    options.find(
      (entry) => entry.querySelector('.ds-select-option__label')?.textContent === option,
    ) ?? options.find((entry) => entry.textContent?.includes(option))
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
type FlowHarnessProps = {
  session: ScriptEditSession
  assetCatalog?: CanonicalScriptEditorContext['assetCatalog']
  ownerContext?: Pick<CanonicalScriptEditorContext, 'currentSceneId' | 'currentEntityId'>
} & Pick<
  CanonicalScriptFlowEditorProps,
  'previewCursor' | 'onSelectPreviewCursor' | 'renderStepPreview' | 'detailsRequest' | 'onError'
>
function FlowHarness({ session, assetCatalog, ownerContext, ...preview }: FlowHarnessProps) {
  const state = useSyncExternalStore(
    session.subscribe.bind(session),
    session.getStateSnapshot.bind(session),
  )
  return (
    <CanonicalScriptFlowEditor
      {...preview}
      flow={currentFlow(session)}
      context={{ ...context(state, assetCatalog), ...ownerContext }}
      ownerLabel="room/box/collect"
      onChange={(flow) =>
        session.dispatch(new UpdateEntityBehaviorCommand(target, 'trigger', 'collect', { flow }))
      }
    />
  )
}

test('edits mixed rewards after reopening and keeps the last reward when removing an item', async () => {
  const original = createAcquisitionFlow('builtin/item/chest', 'potion')
  const session = new ScriptEditSession(JSON.parse(JSON.stringify(scriptState(original))))
  await act(async () => root.render(<FlowHarness session={session} />))
  await click('添加金钱')
  expect(currentFlow(session)).toEqual({
    ...original,
    rewards: [
      { kind: 'item', itemId: 'potion', count: 1 },
      { kind: 'money', amount: 1 },
    ],
  })
  expect(session.getHistoryVersion()).toBe(1)
  await input('奖励 2 文钱', '57')
  await choose('奖励 1 物品', '雪莲子')
  const mixed: AuthorAcquisitionFlow = {
    ...original,
    rewards: [
      { kind: 'item', itemId: 'seed', count: 1 },
      { kind: 'money', amount: 57 },
    ],
  }
  expect(currentFlow(session)).toEqual(mixed)
  expect(host.textContent).toContain('雪莲子 × 1、57 文钱')
  expect(session.getHistoryVersion()).toBe(3)
  await click('删除奖励 1')
  expect(currentFlow(session)).toEqual({ ...original, rewards: [{ kind: 'money', amount: 57 }] })
  expect(host.querySelector<HTMLInputElement>('[aria-label="奖励 1 文钱"]')?.value).toBe('57')
  expect(host.querySelector<HTMLButtonElement>('[aria-label="删除奖励 1"]')?.disabled).toBe(true)
  expect(session.getHistoryVersion()).toBe(4)
  await act(async () => {
    expect(session.undo()).toBe(true)
  })
  expect(currentFlow(session)).toEqual(mixed)
  expect(host.querySelector<HTMLInputElement>('[aria-label="奖励 2 文钱"]')?.value).toBe('57')
})

test('switches notice modes with exact compatible fields and preserves an explicit timing', async () => {
  const original = createAcquisitionFlow('builtin/item/pickup', 'potion')
  const session = new ScriptEditSession(scriptState(original))
  await act(async () => root.render(<FlowHarness session={session} />))
  await choose('提示方式', '自定文字')
  await choose('提示时机', '领取后显示提示')
  expect(currentFlow(session)).toHaveProperty('notice', {
    kind: 'custom',
    timing: 'after',
    cue: { identity: { kind: 'narration' }, rows: [{ text: '获得了物品。' }] },
  })
  await choose('提示方式', '按领取内容显示')
  expect(currentFlow(session)).toEqual({
    ...original,
    notice: { kind: 'standard', timing: 'after' },
  })
  expect(host.textContent).not.toContain('编辑领取文字')
  await choose('提示方式', '不显示提示')
  expect(currentFlow(session)).toEqual({ ...original, notice: { kind: 'silent' } })
  expect(host.textContent).not.toContain('提示时机')
  await choose('提示方式', '自定文字')
  expect(currentFlow(session)).toHaveProperty('notice', {
    kind: 'custom',
    timing: 'before',
    cue: { identity: { kind: 'narration' }, rows: [{ text: '获得了物品。' }] },
  })
  await choose('提示方式', '按领取内容显示')
  expect(currentFlow(session)).toEqual(original)
  expect(session.getHistoryVersion()).toBe(6)
  await act(async () => {
    expect(session.undo()).toBe(true)
  })
  expect(currentFlow(session)).toHaveProperty('notice.kind', 'custom')
})

test('custom notice text stays a local draft until apply and remains editable after save/reopen', async () => {
  const original: AuthorAcquisitionFlow = {
    ...createAcquisitionFlow('builtin/item/pickup', 'potion'),
    notice: {
      kind: 'custom',
      timing: 'after',
      cue: { identity: { kind: 'narration' }, slot: 'narration', rows: [{ text: '原有文字。' }] },
    },
  }
  const session = new ScriptEditSession(scriptState(original))
  await act(async () => root.render(<FlowHarness session={session} />))
  const typeText = async (value: string) => {
    const field = document.querySelector<HTMLTextAreaElement>('dialog[open] textarea')
    expect(field).not.toBeNull()
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        field,
        value,
      )
      field!.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  await click('编辑领取文字')
  await typeText('取消的草稿。')
  expect(currentFlow(session)).toEqual(original)
  expect(session.getHistoryVersion()).toBe(0)
  await click('取消')
  await click('编辑领取文字')
  expect(document.querySelector<HTMLTextAreaElement>('dialog[open] textarea')?.value).toBe(
    '原有文字。',
  )
  await typeText('这株草药可以止血。')
  await click('应用文字')
  const edited: AuthorAcquisitionFlow = {
    ...original,
    notice: {
      kind: 'custom',
      timing: 'after',
      cue: {
        identity: { kind: 'narration' },
        slot: 'narration',
        rows: [{ text: '这株草药可以止血。' }],
      },
    },
  }
  expect(currentFlow(session)).toEqual(edited)
  expect(document.querySelector('dialog[open]')).toBeNull()
  expect(session.getHistoryVersion()).toBe(1)
  await act(async () => {
    expect(session.undo()).toBe(true)
  })
  expect(currentFlow(session)).toEqual(original)
  expect(session.canUndo()).toBe(false)
  await act(async () => {
    expect(session.redo()).toBe(true)
  })
  expect(currentFlow(session)).toEqual(edited)
  const reopened = new ScriptEditSession(JSON.parse(JSON.stringify(session.getState())))
  await act(async () => root.render(<FlowHarness session={reopened} />))
  await click('编辑领取文字')
  expect(document.querySelector<HTMLTextAreaElement>('dialog[open] textarea')?.value).toBe(
    '这株草药可以止血。',
  )
  await typeText('保存后继续修改的文字。')
  await click('应用文字')
  expect(currentFlow(reopened)).toHaveProperty('notice', {
    kind: 'custom',
    timing: 'after',
    cue: {
      identity: { kind: 'narration' },
      slot: 'narration',
      rows: [{ text: '保存后继续修改的文字。' }],
    },
  })
  expect(reopened.getHistoryVersion()).toBe(1)
  await act(async () => {
    expect(reopened.undo()).toBe(true)
  })
  expect(currentFlow(reopened)).toEqual(edited)
})

test('authored chest opening parameters detach into the correct owner and ordered leaves', async () => {
  const session = new ScriptEditSession(scriptState())
  const assetCatalog: CanonicalScriptEditorContext['assetCatalog'] = {
    version: 1,
    assets: {
      'sound.pal.001': {
        kind: 'sound',
        path: 'assets/migrated/sounds/001.wav',
        mediaType: 'audio/wav',
        bytes: 9782,
        sha256: 'ee9d7e88e858c66ebed3300fe274cb20779843437aa915cc0a4cd62c360d7948',
        label: 'PAL 音效 001',
        origin: { kind: 'legacy-migrated', ref: 'sounds/1.wav' },
      },
    },
  }
  await act(async () => root.render(<FlowHarness session={session} assetCatalog={assetCatalog} />))
  await choose('开盖朝向', '右')
  await input('开盖帧', '0')
  await choose('开盖音效', 'PAL 音效 001')
  expect(currentFlow(session)).toHaveProperty('opening', {
    facing: 'right',
    frame: 0,
    sound: 'sound.pal.001',
  })
  expect(session.getHistoryVersion()).toBe(3)
  await click('展开为普通脚本')
  await click('确认展开')
  expect(currentFlow(session)).toEqual({
    kind: 'stages',
    initial: 'available',
    stages: [
      {
        id: 'available',
        label: '首次领取',
        next: 'collected',
        body: [
          { kind: 'setEntityFacing', target, facing: 'right' },
          { kind: 'setEntityFrame', target, frame: 0 },
          { kind: 'clearDialog' },
          { kind: 'playSound', asset: 'sound.pal.001' },
          {
            kind: 'dialog',
            cue: {
              identity: { kind: 'narration' },
              slot: 'narration',
              rows: [{ reward: { kind: 'item', itemName: '止血草', count: 1 } }],
            },
          },
          { kind: 'giveItem', itemId: 'potion', count: 1 },
        ],
      },
      { id: 'collected', label: '已经取走', body: [] },
    ],
  })
  expect(session.getHistoryVersion()).toBe(4)
})

test('detach confirmation reports a lost owner and cancellation preserves the recipe and history', async () => {
  const original = scriptState(createAcquisitionFlow('builtin/item/chest', 'potion'))
  const session = new ScriptEditSession(original)
  const errors: string[] = []
  const onError = (message: string) => errors.push(message)
  await act(async () => root.render(<FlowHarness session={session} onError={onError} />))
  await click('展开为普通脚本')
  const confirmation = document.querySelector('dialog[open]')
  expect(confirmation).not.toBeNull()
  await act(async () =>
    root.render(
      <FlowHarness
        session={session}
        onError={onError}
        ownerContext={{ currentSceneId: undefined, currentEntityId: undefined }}
      />,
    ),
  )
  await click('确认展开')
  expect(errors).toEqual(['无法确定当前取物实体，请重新打开交互脚本。'])
  expect(session.getState()).toEqual(original)
  expect(session.getHistoryVersion()).toBe(0)
  expect(document.querySelector('dialog[open]')).toBe(confirmation)
  await click('取消')
  expect(document.querySelector('dialog[open]')).toBeNull()
  expect(session.getState()).toEqual(original)
  expect(session.getHistoryVersion()).toBe(0)
  expect(session.canUndo()).toBe(false)
  expect(session.isDirty()).toBe(false)
})

test('preview selection and detail requests retain saved stage ids without author history', async () => {
  const original: AuthorAcquisitionFlow = {
    kind: 'acquisition',
    recipe: 'builtin/item/chest',
    rewards: [{ kind: 'money', amount: 35 }],
    notice: { kind: 'silent' },
    opening: { facing: 'down', frame: 1 },
    empty: { kind: 'silent' },
    stages: {
      available: { id: 'chest-unopened', label: '箱盖未开' },
      collected: { id: 'chest-empty', label: '箱中已空' },
    },
  }
  const session = new ScriptEditSession(JSON.parse(JSON.stringify(scriptState(original))))
  const selected: FlowCursor[] = []
  const select = (cursor: FlowCursor) => selected.push(cursor)
  const preview: CanonicalScriptFlowEditorProps['renderStepPreview'] = (id, close) => (
    <button type="button" onClick={close}>
      关闭预览 {id}
    </button>
  )
  const render = async (detailsRequest?: FlowHarnessProps['detailsRequest']) =>
    act(async () =>
      root.render(
        <FlowHarness
          session={session}
          onSelectPreviewCursor={select}
          renderStepPreview={preview}
          detailsRequest={detailsRequest}
        />,
      ),
    )
  await render()
  await choose('预览轮次', '已经取走后再次调查')
  expect(selected).toEqual([{ kind: 'stage', stage: 'chest-empty' }])
  await click('此步骤的预览初始状态')
  expect(document.querySelector('dialog[open]')?.textContent).toContain('箱中已空 · 预览初始状态')
  await click('关闭预览 chest-empty')
  await render({ stageId: 'chest-unopened', revision: 1 })
  expect(selected).toEqual([
    { kind: 'stage', stage: 'chest-empty' },
    { kind: 'stage', stage: 'chest-unopened' },
  ])
  expect(document.querySelector('dialog[open]')?.textContent).toContain('箱盖未开 · 预览初始状态')
  await click('关闭预览 chest-unopened')
  await render({ stageId: 'chest-unopened', revision: 1 })
  expect(document.querySelector('dialog[open]')).toBeNull()
  expect(selected).toHaveLength(2)
  expect(currentFlow(session)).toEqual(original)
  expect(session.getHistoryVersion()).toBe(0)
  expect(session.canUndo()).toBe(false)
  expect(session.isDirty()).toBe(false)
})

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
