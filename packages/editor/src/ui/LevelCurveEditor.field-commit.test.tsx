// @vitest-environment jsdom

import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { LevelCurveEditor } from './LevelCurveEditor.js'

let host: HTMLDivElement
let root: Root

async function editorState(): Promise<EditorState> {
  const { state: base } = await loadLegalUiProject('curve-field-commit')
  const hero = base.actors.find((candidate) => candidate.id === 'hero')
  if (!hero?.battler) throw new Error('blank project battler hero missing')
  const battler = hero.battler
  const state: EditorState = {
    ...base,
    actors: base.actors.map((actor) =>
      actor.id === hero.id
        ? {
            ...hero,
            battler: { ...battler, leveling: { expTable: [0, 15, 55] } },
          }
        : actor,
    ),
  }
  assertProjectSaveValid(state)
  return state
}

function Harness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const state = props.session.getState()
  const actor = state.actors.find((entry) => entry.id === 'hero')
  if (!actor?.battler) throw new Error('battler hero missing')
  return (
    <LevelCurveEditor
      actor={{ ...actor, battler: actor.battler }}
      levelUpRows={[]}
      skills={Object.fromEntries(state.skills.map((skill) => [skill.id, skill]))}
      session={props.session}
      onClose={() => undefined}
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

describe('LevelCurveEditor field commit boundary', () => {
  test('级数连续输入不改 canonical，blur 一次提交，undo/redo 回显 canonical', async () => {
    const session = new EditSession(await editorState())
    await act(async () => root.render(<Harness session={session} />))
    let input = host.querySelector<HTMLInputElement>(
      '[data-field-id="level-curve-count"] input[data-ds-draft-commit="number"]',
    )!
    const history = session.getHistoryVersion()
    await act(async () => {
      input.focus()
      for (const value of ['4', '7', '23']) setInput(input, value)
    })
    expect(session.getHistoryVersion()).toBe(history)
    expect(session.getState().actors[0]!.battler!.leveling!.expTable).toEqual([0, 15, 55])
    await act(async () => input.blur())
    expect(session.getHistoryVersion()).toBe(history + 1)
    expect(session.getState().actors[0]!.battler!.leveling!.expTable).toHaveLength(23)

    await act(async () => session.undo())
    input = host.querySelector<HTMLInputElement>(
      '[data-field-id="level-curve-count"] input[data-ds-draft-commit="number"]',
    )!
    expect(input.value).toBe('3')
    await act(async () => session.redo())
    input = host.querySelector<HTMLInputElement>(
      '[data-field-id="level-curve-count"] input[data-ds-draft-commit="number"]',
    )!
    expect(input.value).toBe('23')
  })
})
