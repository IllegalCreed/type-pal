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
}: {
  session: EditSession
  start: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
}) {
  const state = useSyncExternalStore(
    (cb) => session.subscribe(cb),
    () => session.getState(),
  )
  const [directory, setDirectory] = useState<SimulatorDirectory>('plans'),
    [id, setId] = useState<string>(),
    [draft, setDraft] = useState<BattleSimulatorDraft>()
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
    (b) => (b.textContent?.trim() || b.getAttribute('aria-label')) === text,
  )
  expect(matches.length, `button ${text}`).toBeGreaterThan(0)
  return matches.at(-1)!
}
async function click(text: string) {
  await act(async () => button(text).click())
}
function field(label: string): HTMLInputElement | HTMLButtonElement {
  const labelNode = [...document.querySelectorAll('label')].find(
    (node) => node.textContent === label,
  )
  const element = document.getElementById(labelNode?.htmlFor ?? '')
  expect(element, `field ${label}`).not.toBeNull()
  return element as HTMLInputElement | HTMLButtonElement
}
async function choose(label: string, text: string) {
  await act(async () => field(label).click())
  const option = [...document.querySelectorAll<HTMLElement>('[role=option]')].find(
    (node) => node.textContent === text,
  )
  expect(option, `option ${text}`).toBeDefined()
  await act(async () => option!.click())
}
async function input(label: string, value: string) {
  const element = field(label)
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
  await click('保存工程')
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
  await input('武术', '11')
  await choose('武器', '练习剑')
  await choose('习得技能', '指定本预设技能')
  await choose('加入技能', '试炼术')
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
