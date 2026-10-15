// @vitest-environment jsdom

import type { SkillData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { LevelingEditor } from './LevelingEditor.js'

let host: HTMLDivElement
let root: Root

async function editorState(): Promise<EditorState> {
  const { state: base } = await loadLegalUiProject('leveling-field-commit')
  const hero = base.actors.find((candidate) => candidate.id === 'hero')
  if (!hero?.battler) throw new Error('blank project battler hero missing')
  const skill: SkillData = {
    id: 'skill-a',
    name: '技能 A',
    desc: '',
    cost: { mp: 0 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [],
    animation: { effectSprite: 0xffff },
  }
  const state: EditorState = {
    ...base,
    actors: [...base.actors, { ...hero, id: 'a' }, { ...hero, id: 'b' }],
    skills: [...base.skills, skill],
    levelUp: {
      ...base.levelUp,
      a: [{ level: 2, skillId: skill.id }],
      b: [{ level: 7, skillId: skill.id }],
    },
  }
  assertProjectSaveValid(state)
  return state
}

function Harness(props: { session: EditSession; actorId: string }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const state = props.session.getState()
  const current = state.actors.find((candidate) => candidate.id === props.actorId)
  if (!current?.battler) throw new Error(`battler ${props.actorId} missing`)
  return (
    <LevelingEditor
      actor={{ ...current, battler: current.battler }}
      levelUpRows={state.levelUp[props.actorId] ?? []}
      skills={Object.fromEntries(state.skills.map((skill) => [skill.id, skill]))}
      session={props.session}
      onEditCurve={() => undefined}
    />
  )
}

function setInput(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  installBrowserHardwarePorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})

describe('LevelingEditor field commit boundary', () => {
  test('升级学技能使用与同排默认控件等高的危险删除图标按钮', async () => {
    const session = new EditSession(await editorState())
    await act(async () => root.render(<Harness session={session} actorId="a" />))

    const remove = host.querySelector<HTMLButtonElement>(
      'button[aria-label="删除等级 2 的学技能行"]',
    )!
    expect(remove.classList).toContain('ds-icon-button')
    expect(remove.classList).toContain('ds-icon-button--danger')
    expect(remove.classList).not.toContain('ds-icon-button--compact')
    expect(remove.textContent).not.toContain('✕')

    await act(async () => remove.click())
    expect(session.getState().levelUp.a ?? []).toEqual([])
    expect(session.getHistoryVersion()).toBe(1)
  })

  test('连续输入只保留草稿，blur/Enter 各至多一条命令，Escape 不提交', async () => {
    const session = new EditSession(await editorState())
    await act(async () => root.render(<Harness session={session} actorId="a" />))
    let input = host.querySelector<HTMLInputElement>('.entry-n input')!
    const initialHistory = session.getHistoryVersion()
    await act(async () => {
      input.focus()
      for (const value of ['4', '9', '12']) setInput(input, value)
    })
    expect(session.getHistoryVersion()).toBe(initialHistory)
    expect(session.getState().levelUp.a![0]!.level).toBe(2)
    await act(async () => input.blur())
    expect(session.getHistoryVersion()).toBe(initialHistory + 1)
    expect(session.getState().levelUp.a![0]!.level).toBe(12)

    input = host.querySelector<HTMLInputElement>('.entry-n input')!
    const enterHistory = session.getHistoryVersion()
    await act(async () => {
      input.focus()
      setInput(input, '13')
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(enterHistory + 1)
    await act(async () => input.blur())
    expect(session.getHistoryVersion()).toBe(enterHistory + 1)

    input = host.querySelector<HTMLInputElement>('.entry-n input')!
    const escapeHistory = session.getHistoryVersion()
    await act(async () => {
      input.focus()
      setInput(input, '999')
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(escapeHistory)
    expect(session.getState().levelUp.a![0]!.level).toBe(13)
    expect(input.value).toBe('13')
  })

  test('切换角色会丢弃旧对象草稿，不串到新对象或切回后的旧对象', async () => {
    const session = new EditSession(await editorState())
    await act(async () => root.render(<Harness session={session} actorId="a" />))
    const input = host.querySelector<HTMLInputElement>('.entry-n input')!
    await act(async () => {
      input.focus()
      setInput(input, '88')
    })
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => root.render(<Harness session={session} actorId="b" />))
    expect(host.querySelector<HTMLInputElement>('.entry-n input')!.value).toBe('7')
    await act(async () => root.render(<Harness session={session} actorId="a" />))
    expect(host.querySelector<HTMLInputElement>('.entry-n input')!.value).toBe('2')
    expect(session.getHistoryVersion()).toBe(0)
  })
})
