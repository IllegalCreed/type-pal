// @vitest-environment jsdom
import { Blob as StreamBlob } from 'node:buffer'
import { webcrypto } from 'node:crypto'
import { loadCurrentProjectFrom } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  battleTrialProjectFiles,
  fixtureSource,
} from '../src/core/__tests__/battle-trial-project.js'
import type { SimulatorDirectory } from '../src/core/battle-simulator-commands.js'
import { parseBattleSimulatorLibrary } from '../src/core/battle-simulator-library.js'
import type { BattleSimulatorDraft } from '../src/core/battle-simulator-state.js'
import { EditSession } from '../src/core/edit-session.js'
import { toEditorState } from '../src/core/project-io.js'
import { BattleSimulatorWorkbench } from '../src/ui/BattleSimulatorWorkbench.js'
import { BattleTrialDialog } from '../src/ui/BattleTrialDialog.js'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('Blob', StreamBlob)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function fixture() {
  const files = await battleTrialProjectFiles(),
    project = await loadCurrentProjectFrom(fixtureSource(files))
  const library = parseBattleSimulatorLibrary(files['editor/battle-simulator.json'])
  expect(files['content/stamps.json']).toEqual([])
  return new EditSession(toEditorState(project, [], {}, {}, [], library))
}
function Harness({
  session,
  start,
  save,
  initialDraft,
}: {
  session: EditSession
  start: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  initialDraft?: BattleSimulatorDraft
}) {
  const state = useSyncExternalStore(
    (cb) => session.subscribe(cb),
    () => session.getState(),
  )
  const [directory, setDirectory] = useState<SimulatorDirectory>('plans'),
    [id, setId] = useState<string>(),
    [draft, setDraft] = useState<BattleSimulatorDraft>(initialDraft)
  return (
    <>
      {(['plans', 'allies', 'enemies', 'bags'] as const).map((directory) => (
        <button
          type="button"
          key={directory}
          onClick={() => {
            setDirectory(directory)
            setId(undefined)
          }}
        >
          {directory}
        </button>
      ))}
      <BattleSimulatorWorkbench
        directory={directory}
        state={state}
        session={session}
        objectId={id}
        onObjectFocus={setId}
        draft={draft}
        onDraftChange={setDraft}
        onStart={start}
        projectDirty={session.isDirty()}
        onSave={save}
      />
    </>
  )
}
function button(text: string) {
  const matches = [...document.querySelectorAll<HTMLButtonElement>('button')].filter(
    (b) => b.textContent?.trim() === text || b.getAttribute('aria-label') === text,
  )
  expect(matches.length, `button ${text}`).toBeGreaterThan(0)
  return matches.at(-1)!
}
async function click(text: string) {
  await act(async () => button(text).click())
}
function field(label: string, within: ParentNode = document): HTMLInputElement | HTMLButtonElement {
  const labelNode = [...within.querySelectorAll('label')].find((node) => node.textContent === label)
  const element = document.getElementById(labelNode?.htmlFor ?? '')
  expect(element, `field ${label}`).not.toBeNull()
  return element as HTMLInputElement | HTMLButtonElement
}
async function choose(label: string, text: string, within: ParentNode = document) {
  await act(async () => field(label, within).click())
  const option = [...document.querySelectorAll<HTMLElement>('[role=option]')].find(
    (node) => node.textContent === text,
  )
  expect(option, `option ${text}`).toBeDefined()
  await act(async () => option!.click())
}
async function input(label: string, value: string, within: ParentNode = document) {
  const element = field(label, within)
  await act(async () => {
    element.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => element.blur())
}

test('named presets / plan sources / deletion / undo use real author commands; dirty project cannot run', async () => {
  const session = await fixture(),
    start = vi.fn(),
    save = vi.fn()
  await act(async () => root.render(<Harness session={session} start={start} save={save} />))
  await click('allies')
  expect(host.textContent).toContain('尚无我方预设')
  await click('新建')
  await input('名称', '一号队伍')
  await choose('添加队员', '主角')
  await click('加入队伍')
  const preset = session.getState().battleSimulator!.allies[0]!
  expect(preset.name).toBe('一号队伍')
  expect(preset.config.members[0]!.actorId).toBe('hero')
  await choose('武器', '练习剑')
  expect(host.querySelector('[aria-label="主角开战有效值"]')?.textContent).toContain('武术17')
  await click('plans')
  await choose('我方', '一号队伍')
  expect(session.getState().battleSimulator!.plans[0]!.config.party).toEqual({
    kind: 'preset',
    presetId: preset.id,
  })
  expect(button('开始试打').disabled).toBe(true)
  await click('保存项目')
  expect(save).toHaveBeenCalledTimes(1)
  await click('allies')
  await click('删除')
  expect(document.querySelector('[role=alertdialog]')?.textContent).toContain('基础试打')
  await click('确认删除')
  await click('plans')
  expect(host.textContent).toContain('我方预设不存在')
  await act(async () => session.undo())
  expect(host.textContent).not.toContain('我方预设不存在')
  expect(session.getState().battleSimulator!.allies[0]!.id).toBe(preset.id)
  expect(start).not.toHaveBeenCalled()
})

test('temporary party edits, pools, skills and gear produce launch input without mutating named state', async () => {
  const session = await fixture(),
    start = vi.fn().mockResolvedValue(undefined)
  const before = structuredClone(session.getState().battleSimulator)
  await act(async () => root.render(<Harness session={session} start={start} save={vi.fn()} />))
  await click('建立本场临时副本')
  expect(button('加入队伍').closest('.ds-inline-composer__action')).not.toBeNull()
  expect(button('移除物品').closest('.ds-inline-composer__action')).not.toBeNull()
  expect(host.querySelector('.ds-field-group > button')).toBeNull()
  expect(host.querySelectorAll('.trial-config-columns').length).toBeGreaterThan(1)
  await input('武术', '11')
  await choose('武器', '练习剑')
  await choose('习得技能', '指定本预设技能')
  await click('指定技能')
  const skillCheck = document.querySelector<HTMLInputElement>(
    '.ds-multiselect__option input[type="checkbox"]',
  )!
  await act(async () => skillCheck.click())
  expect(button('指定技能').textContent).toBe('已选 1 项')
  await act(async () =>
    document
      .querySelector('[aria-label="搜索指定技能"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  )
  await choose('初始体力', '指定比例')
  await input('比例（%）', '50')
  await input('当前数值', '0') // 原方案 MP 20 → 0，必须保留显式零。
  for (const name of ['队员2', '队员3']) {
    await choose('添加队员', name)
    await click('加入队伍')
  }
  await choose('添加队员', '队员4')
  expect(button('加入队伍').disabled).toBe(true)
  expect(host.textContent).toContain('已达到3人上限')
  expect(session.isDirty()).toBe(false)
  await click('开始试打')
  expect(start).toHaveBeenCalledTimes(1)
  const config = start.mock.calls[0]![0]
  expect(config.party.members).toHaveLength(3)
  expect(config.party.members[0]).toMatchObject({
    stats: { attack: 11 },
    equipment: { weapon: 'trial-sword' },
    skills: { kind: 'replace', ids: ['trial-spark'] },
    hp: { kind: 'percent', value: 50 },
    mp: { kind: 'value', value: 0 },
  })
  expect(session.getState().battleSimulator).toEqual(before)
  await click('另存为方案')
  expect(session.getState().battleSimulator!.plans).toHaveLength(2)
  expect(session.isDirty()).toBe(true)
})

test('enemy and bag editors preserve null slots and zero-removal, copy and undo independently', async () => {
  const session = await fixture()
  await act(async () => root.render(<Harness session={session} start={vi.fn()} save={vi.fn()} />))
  await click('enemies')
  await click('新建')
  await choose('敌方槽位 3', '练习对手')
  expect(session.getState().battleSimulator!.enemies[0]!.config).toEqual({
    kind: 'slots',
    slots: [null, null, 'dummy', null, null],
  })
  await choose('编队来源', '引用已有敌队')
  expect(session.getState().battleSimulator!.enemies[0]!.config).toEqual({
    kind: 'team',
    teamId: 'practice',
  })
  await choose('编队来源', '预设内临时编队')
  expect(session.getState().battleSimulator!.enemies[0]!.config).toEqual({
    kind: 'slots',
    slots: ['dummy', null, null, null, null],
  })
  await click('复制')
  expect(session.getState().battleSimulator!.enemies).toHaveLength(2)
  await click('bags')
  await click('新建')
  await choose('添加物品', '练习药')
  await input('练习药', '4')
  expect(session.getState().battleSimulator!.bags[0]!.config.items).toEqual([
    { itemId: 'trial-herb', quantity: 4 },
  ])
  await input('练习药', '0')
  expect(session.getState().battleSimulator!.bags[0]!.config.items).toEqual([])
  await act(async () => session.undo())
  expect(session.getState().battleSimulator!.bags[0]!.config.items).toEqual([
    { itemId: 'trial-herb', quantity: 4 },
  ])
})

test('quick skill launch adds only the selected skill, preserves MP and original plan, and handles launch failure', async () => {
  const session = await fixture(),
    state = session.getState(),
    before = structuredClone(state)
  const start = vi.fn().mockRejectedValue(new Error('请先关闭现有试打窗口')),
    close = vi.fn()
  await act(async () =>
    root.render(
      <BattleTrialDialog
        subject={{ kind: 'skill', id: 'trial-spark' }}
        state={state}
        projectDirty={false}
        onClose={close}
        onSave={vi.fn()}
        onDetail={vi.fn()}
        onStart={start}
      />,
    ),
  )
  expect(field('施放队员').textContent).toBe('主角')
  await click('开始试打')
  expect(start.mock.calls[0]![0].party.members[0]).toMatchObject({
    skills: { kind: 'replace', ids: ['trial-spark'] },
    mp: { kind: 'value', value: 20 },
  })
  expect(document.querySelector('[role=alert]')?.textContent).toContain('请先关闭')
  expect(close).not.toHaveBeenCalled()
  expect(state).toEqual(before)
})

test('skill multiselect counts, searches, selects and clears; missing references remain removable', async () => {
  const seed = await fixture(),
    state = structuredClone(seed.getState())
  const party = state.battleSimulator!.plans[0]!.config.party
  if (party.kind !== 'inline') throw new Error('fixture must contain an inline party')
  party.config.members[0]!.skills = { kind: 'replace', ids: ['missing-skill', 'trial-spark'] }
  const actorBefore = structuredClone(state.actors)
  const session = new EditSession(state)
  await act(async () => root.render(<Harness session={session} start={vi.fn()} save={vi.fn()} />))
  expect(button('指定技能').textContent).toBe('已选 2 项')
  expect(host.textContent).toContain('技能 missing-skill 不存在')
  await click('指定技能')
  const missing = [...document.querySelectorAll('.ds-multiselect__option')].find((e) =>
    e.textContent?.includes('missing-skill'),
  )!
  const missingBox = missing.querySelector<HTMLInputElement>('input')!
  expect(missingBox.checked).toBe(true)
  await act(async () => missingBox.click())
  expect(button('指定技能').textContent).toBe('已选 1 项')
  expect(host.textContent).not.toContain('技能 missing-skill 不存在')
  const search = document.querySelector<HTMLInputElement>('[aria-label="搜索指定技能"]')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      search,
      'no-match',
    )
    search.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(document.querySelector('.ds-multiselect-popover')?.textContent).toContain('没有匹配的选项')
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      search,
      'trial-spark',
    )
    search.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(document.querySelectorAll('.ds-multiselect__option')).toHaveLength(1)
  await click('清空')
  expect(button('指定技能').textContent).toBe('已选 0 项')
  await click('全选')
  expect(button('指定技能').textContent).toBe('已选 1 项')
  const current = session.getState().battleSimulator!.plans[0]!.config.party
  expect(current.kind === 'inline' && current.config.members[0]!.skills).toEqual({
    kind: 'replace',
    ids: ['trial-spark'],
  })
  expect(session.getState().actors).toEqual(actorBefore)
  await choose('习得技能', '继承角色初始技能')
  expect(document.querySelector('button[aria-label="指定技能"]')).toBeNull()
})

test('temporary overrides change party, enemies, bag and conditions without rewriting their named sources', async () => {
  const session = await fixture(),
    before = structuredClone(session.getState().battleSimulator)
  const start = vi.fn().mockResolvedValue(undefined)
  await act(async () => root.render(<Harness session={session} start={start} save={vi.fn()} />))
  const scope = (label: string) =>
    [...host.querySelectorAll('.trial-override')].find(
      (e) => e.querySelector('strong')?.textContent === `${label}覆写`,
    )!
  await click('调整我方')
  await choose('武器', '练习剑', scope('我方'))
  await click('恢复所选配置')
  expect(host.querySelectorAll('.trial-override')).toHaveLength(0)
  await click('调整敌方')
  await choose('编队来源', '预设内临时编队', scope('敌方'))
  await choose('敌方槽位 2', '练习对手', scope('敌方'))
  await click('调整背包')
  await act(async () =>
    [...scope('背包').querySelectorAll('button')]
      .find((e) => e.textContent?.trim() === '移除物品')!
      .click(),
  )
  await choose('添加物品', '练习药', scope('背包'))
  await input('练习药', '2', scope('背包'))
  await input('测试金钱', '72')
  await choose('战场', '练习场（黑底）')
  await choose('战斗音乐', '使用项目默认')
  await choose('战斗音乐', '静音')
  for (const label of ['自动战斗', '首领战（不能逃跑）']) {
    const box = [...host.querySelectorAll('label')]
      .find((e) => e.textContent === label)!
      .querySelector('input')!
    await act(async () => box.click())
  }
  await click('开始试打')
  expect(start).toHaveBeenCalledTimes(1)
  expect(start.mock.calls[0]![0]).toMatchObject({
    money: 72,
    auto: true,
    boss: true,
    music: { kind: 'silent' },
    fieldId: 0,
    enemies: { kind: 'slots', slots: ['dummy', 'dummy', null, null, null] },
    bag: { items: [{ itemId: 'trial-herb', quantity: 2 }] },
  })
  expect(start.mock.calls[0]![0].party.members[0].equipment).toEqual({})
  expect(session.getState().battleSimulator).toEqual(before)
  expect(session.isDirty()).toBe(false)
  await click('丢弃临时调整')
  expect(host.textContent).not.toContain('背包覆写')
  expect(session.getState().battleSimulator).toEqual(before)
})

test('a skill entry with no named plan opens an actionable draft and requires an explicit caster', async () => {
  const seed = await fixture(),
    state = structuredClone(seed.getState())
  state.battleSimulator!.plans = []
  const session = new EditSession(state),
    detail = vi.fn(),
    close = vi.fn(),
    start = vi.fn().mockResolvedValue(undefined)
  await act(async () =>
    root.render(
      <BattleTrialDialog
        subject={{ kind: 'skill', id: 'trial-spark' }}
        state={state}
        projectDirty={false}
        onClose={close}
        onSave={vi.fn()}
        onStart={start}
        onDetail={detail}
      />,
    ),
  )
  expect(button('开始试打').disabled).toBe(true)
  await click('到模拟器详细配置')
  expect(close).toHaveBeenCalledTimes(1)
  const draft = detail.mock.calls[0]![0] as BattleSimulatorDraft
  expect(draft.subject).toEqual({ kind: 'skill', id: 'trial-spark' })
  await act(async () =>
    root.render(<Harness session={session} start={start} save={vi.fn()} initialDraft={draft} />),
  )
  expect(button('开始试打').disabled).toBe(true)
  await choose('添加队员', '主角')
  await click('加入队伍')
  expect(button('加入当前技能').disabled).toBe(true)
  await choose('施放队员', '主角')
  await click('加入当前技能')
  expect(host.textContent).not.toContain('加入待试技能')
  await choose('敌方槽位 1', '练习对手')
  await choose('添加物品', '练习药')
  await click('开始试打')
  expect(start).toHaveBeenCalledTimes(1)
  expect(start.mock.calls[0]![0].party.members[0].skills).toEqual({
    kind: 'replace',
    ids: ['trial-spark'],
  })
  expect(session.isDirty()).toBe(false)
  expect(session.getState().battleSimulator!.plans).toEqual([])
})
