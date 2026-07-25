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

  test('shows an author-facing flow with version management outside the main canvas', () => {
    const html = renderToStaticMarkup(
      <ScriptV5BehaviorInspector
        state={editorState()}
        target={target}
        channel="trigger"
        onDispatch={() => {}}
      />,
    )
    expect(html).toContain('初次交谈')
    expect(html).toContain('脚本正文')
    expect(html).toContain('1 条顶层指令')
    expect(html).toContain('剧情版本管理')
    expect(html).not.toContain('高级管理')
    expect(html).not.toContain('内部识别名')
    expect(html).not.toContain('阶段流')
    expect(html).not.toContain('内部脚本')
  })

  test('renames, copies, and creates versions without exposing internal identifiers', async () => {
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

    await act(async () => button(host, '剧情版本管理').click())
    expect(host.textContent).toContain('当前有 2 处正在使用这个版本')
    expect(button(host, '删除当前版本').disabled).toBe(true)
    expect(host.textContent).not.toContain('scenes[0]')

    const rename = host.querySelector<HTMLInputElement>('[aria-label="剧情版本名称"]')!
    await act(async () => setInput(rename, '重新命名的交谈'))
    await act(async () => button(host, '保存名称').click())
    expect(session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.talk).toMatchObject({
      label: '重新命名的交谈',
    })

    await act(async () => button(host, '复制成独立版本').click())
    expect(
      session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!['talk-copy-1'],
    ).toMatchObject({ label: '重新命名的交谈 副本' })

    await act(async () => button(host, '剧情版本管理').click())
    const newLabel = host.querySelector<HTMLInputElement>('[aria-label="新剧情版本名称"]')!
    await act(async () => setInput(newLabel, '交出天书后'))
    await act(async () => button(host, '＋ 新建空白版本').click())
    expect(
      session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!['trigger-1'],
    ).toMatchObject({
      label: '交出天书后',
      flow: { kind: 'stages', initial: 'start' },
    })
  })

  test('keeps migration-protected versions understandable and non-deletable', async () => {
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
    await act(async () =>
      root.render(
        <ScriptV5BehaviorInspector
          state={session.getState()}
          target={target}
          channel="trigger"
          onDispatch={(command) => session.dispatch(command)}
        />,
      ),
    )
    await act(async () => button(host, '剧情版本管理').click())
    expect(host.textContent).toContain('迁移记录保护')
    expect(button(host, '删除当前版本').disabled).toBe(true)
    expect(host.querySelector('[aria-label="实体脚本内部识别名"]')).toBeNull()
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
    expect(host.querySelector('[aria-label="Canonical ScriptFlow JSON"]')).toBeNull()
    expect(host.textContent).toContain('脚本正文')
    await act(async () =>
      host
        .querySelector<HTMLElement>('.cmd-row')!
        .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
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
    expect(inherit).toContain('不运行脚本')
    expect(inherit).toContain('初次交谈')

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
