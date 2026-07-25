// @vitest-environment jsdom

import type { AuthorCommandV5, SceneDefV5 } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  type ScriptEditorCommandV5,
  type ScriptEditorStateV5,
  ScriptV5EditSession,
} from '../core/script-v5-editor.js'
import {
  BehaviorSelectionEditorV5,
  ScriptV5BehaviorInspector,
} from './ScriptV5BehaviorInspector.js'

const target = { scene: 's001', entity: 'e1' }

function selectTalk(): AuthorCommandV5 {
  return {
    kind: 'selectEntityBehavior',
    target,
    channel: 'trigger',
    selection: { kind: 'use', value: 'talk' },
  }
}

function scene(): SceneDefV5 {
  return {
    id: 's001',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e1',
        sprite: 'npc',
        pos: { col: 1, row: 1, height: 0 },
        initialPage: 'default',
        pages: [{ id: 'default', label: '默认', trigger: 'talk' }],
        behaviors: {
          trigger: {
            talk: {
              label: '初次交谈',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'start',
                stages: [
                  {
                    id: 'start',
                    body: [{ kind: 'setFlag', flag: 'talked', value: true }],
                  },
                ],
              },
            },
          },
        },
      },
    ],
  }
}

function editorState(): ScriptEditorStateV5 {
  return {
    scenes: [scene()],
    items: [],
    sharedScripts: {
      'shared/user/route': {
        name: '路线',
        self: 'none',
        body: [selectTalk()],
      },
    },
    migrationSidecars: [],
  }
}

function setInput(input: HTMLInputElement, value: string): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function button(host: HTMLElement, label: string): HTMLButtonElement {
  const match = Array.from(host.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(label),
  )
  if (!match) throw new Error(`button not found: ${label}`)
  return match
}

describe('ScriptV5BehaviorInspector', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
  })

  test('shows stable identities, flow summary, full references, and fail-closed deletion', () => {
    const html = renderToStaticMarkup(
      <ScriptV5BehaviorInspector
        state={editorState()}
        target={target}
        channel="trigger"
        onDispatch={() => {}}
      />,
    )
    expect(html).toContain('初次交谈')
    expect(html).toContain('start')
    expect(html).toContain('1 条指令')
    expect(html).toContain('2 个引用')
    expect(html).toContain('实体页')
    expect(html).toContain('切换指令')
    expect(html).toContain('disabled=""')
    expect(html).not.toContain('内部脚本')
  })

  test('drives add, copy, rename, and reference rewriting through immutable commands', async () => {
    const session = new ScriptV5EditSession(editorState())

    function Harness() {
      const [state, setState] = useState(session.getState())
      const [selected, setSelected] = useState('talk')
      const dispatch = (command: ScriptEditorCommandV5) => {
        session.dispatch(command)
        setState(session.getState())
      }
      return (
        <ScriptV5BehaviorInspector
          state={state}
          target={target}
          channel="trigger"
          selectedBehaviorId={selected}
          onSelectBehavior={setSelected}
          onDispatch={dispatch}
        />
      )
    }
    await act(async () => root.render(<Harness />))

    const rename = host.querySelector<HTMLInputElement>('[aria-label="行为稳定 id"]')!
    await act(async () => setInput(rename, 'greet'))
    await act(async () => button(host, '改名并重写引用').click())
    expect(session.getState().scenes[0]!.entities[0]!.pages![0]!.trigger).toBe('greet')
    expect(session.getState().sharedScripts['shared/user/route']!.body[0]).toMatchObject({
      selection: { kind: 'use', value: 'greet' },
    })

    const copy = host.querySelector<HTMLInputElement>('[aria-label="行为副本稳定 id"]')!
    await act(async () => setInput(copy, 'greet-again'))
    await act(async () => button(host, '复制').click())
    expect(
      session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!['greet-again'],
    ).toMatchObject({ label: '初次交谈 副本' })

    const newId = host.querySelector<HTMLInputElement>('[aria-label="新行为稳定 id"]')!
    const newLabel = host.querySelector<HTMLInputElement>('[aria-label="新行为名称"]')!
    await act(async () => {
      setInput(newId, 'after-book')
      setInput(newLabel, '交出天书后')
    })
    await act(async () => button(host, '＋ 新增').click())
    expect(
      session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!['after-book'],
    ).toMatchObject({
      label: '交出天书后',
      flow: { kind: 'stages', initial: 'start' },
    })
  })

  test('reports protected rename failures without mutating the selected behavior', async () => {
    const state = editorState()
    state.migrationSidecars = [
      {
        version: 1,
        projectId: 'demo',
        transitionId: 'script-v4-v5',
        fromContentVersion: 4,
        toContentVersion: 5,
        sourceAuditDigest: 'a'.repeat(64),
        provenance: {
          kind: 'project-local',
          transformDigest: 'a'.repeat(64),
        },
        legacyBindings: [],
        legacyCursors: [],
        legacyEntities: [],
        lineagePlans: { pages: [], stages: [] },
        localAllocations: [],
        targetClosures: [
          {
            target: {
              kind: 'entity-behavior',
              sceneId: 's001',
              entityId: 'e1',
              channel: 'trigger',
              behaviorId: 'talk',
            },
            identityDigest: 'a'.repeat(64),
          },
        ],
        digest: 'a'.repeat(64),
      },
    ]
    const session = new ScriptV5EditSession(state)
    const onError = vi.fn()
    await act(async () =>
      root.render(
        <ScriptV5BehaviorInspector
          state={session.getState()}
          target={target}
          channel="trigger"
          onDispatch={(command) => session.dispatch(command)}
          onError={onError}
        />,
      ),
    )
    const rename = host.querySelector<HTMLInputElement>('[aria-label="行为稳定 id"]')!
    await act(async () => setInput(rename, 'greet'))
    await act(async () => button(host, '改名并重写引用').click())
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/sidecar 保护/))
    expect(session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.talk).toBeDefined()
  })

  test('uses the canonical visual editor for flow bodies and commits through validation', async () => {
    const session = new ScriptV5EditSession(editorState())

    function Harness() {
      const [state, setState] = useState(session.getState())
      return (
        <ScriptV5BehaviorInspector
          state={state}
          target={target}
          channel="trigger"
          onDispatch={(command) => {
            session.dispatch(command)
            setState(session.getState())
          }}
        />
      )
    }
    await act(async () => root.render(<Harness />))
    await act(async () => button(host, '编辑正文与控制流').click())
    expect(host.querySelector('[aria-label="Canonical ScriptFlow JSON"]')).toBeNull()
    expect(host.textContent).toContain('start · 正文')
    await act(async () => host.querySelector<HTMLButtonElement>('.canonical-command-row')!.click())
    const flagInput = [...host.querySelectorAll<HTMLInputElement>('input')].find(
      (candidate) => candidate.value === 'talked',
    )!
    await act(async () => setInput(flagInput, 'edited-inline'))
    expect(session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.talk!.flow).toMatchObject(
      {
        kind: 'stages',
        stages: [
          {
            id: 'start',
            body: [{ kind: 'setFlag', flag: 'edited-inline', value: true }],
          },
        ],
      },
    )
    expect(session.isDirty()).toBe(true)
  })
})

describe('BehaviorSelectionEditorV5', () => {
  test('presents inherit, disabled, named use, and dangling use as distinct states', () => {
    const behaviors = scene().entities[0]!.behaviors!.trigger!
    const onChange = vi.fn()
    const inherit = renderToStaticMarkup(
      <BehaviorSelectionEditorV5
        selection={{ kind: 'inherit' }}
        behaviors={behaviors}
        onChange={onChange}
      />,
    )
    expect(inherit).toContain('继承静态定义')
    expect(inherit).toContain('显式禁用')
    expect(inherit).toContain('初次交谈 · talk')

    const dangling = renderToStaticMarkup(
      <BehaviorSelectionEditorV5
        selection={{ kind: 'use', value: 'missing' }}
        behaviors={behaviors}
        onChange={onChange}
      />,
    )
    expect(dangling).toContain('missing（引用失效）')
    expect(dangling).toContain('使用：missing（引用失效）')
  })
})
