// @vitest-environment jsdom

import type { BaseAuthorCommand, BaseSceneDef } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  type ScriptEditorCommand,
  type ScriptEditorState,
  ScriptEditSession,
} from '../core/script-editor.js'
import { BehaviorSelectionEditor, ScriptBehaviorInspector } from './ScriptBehaviorInspector.js'

const target = { scene: 's001', entity: 'e1' }

function selectTalk(): BaseAuthorCommand {
  return {
    kind: 'selectEntityBehavior',
    target,
    channel: 'trigger',
    selection: { kind: 'use', value: 'talk' },
  }
}

function scene(): BaseSceneDef {
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

function editorState(): ScriptEditorState {
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

describe('ScriptBehaviorInspector', () => {
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

  test('shows an author-facing flow with scheme ownership outside the main canvas', () => {
    const html = renderToStaticMarkup(
      <ScriptBehaviorInspector
        state={editorState()}
        target={target}
        channel="trigger"
        onDispatch={() => {}}
      />,
    )
    expect(html).toContain('初次交谈')
    expect(html).toContain('脚本正文')
    expect(html).toContain('1 条顶层指令')
    expect(html).toContain('方案详情')
    expect(html).toContain('脚本方案')
    expect(html).toContain('初次交谈')
    expect(html).toContain('分次执行')
    expect(html).toContain('新建步骤')
    expect(html).not.toContain('当前方案')
    expect(html).not.toContain('触发阶段')
    expect(html).not.toContain('阶段')
    expect(html).not.toContain('<select')
    expect(html).not.toContain('高级管理')
    expect(html).not.toContain('内部识别名')
    expect(html).not.toContain('内部脚本')
    expect(html).not.toContain('剧情版本')
    expect(html).not.toContain('分段剧情')
  })

  test('separates scheme details from creation and keeps internal identifiers hidden', async () => {
    const session = new ScriptEditSession(editorState())

    function Harness() {
      const [state, setState] = useState(session.getState())
      const [selected, setSelected] = useState('talk')
      const dispatch = (command: ScriptEditorCommand) => {
        session.dispatch(command)
        setState(session.getState())
      }
      return (
        <ScriptBehaviorInspector
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

    await act(async () => button(host, '方案详情').click())
    expect(host.textContent).toContain('当前有 2 处正在使用这个方案')
    expect(button(host, '删除方案').disabled).toBe(true)
    expect(host.textContent).not.toContain('保存名称')
    expect(host.textContent).not.toContain('所属入口')
    expect(host.querySelector('.script-scheme-name-field > header')?.textContent).toContain(
      '方案名称',
    )
    expect(host.querySelector('[aria-label="新方案名称"]')).toBeNull()
    expect(host.textContent).not.toContain('scenes[0]')

    const rename = host.querySelector<HTMLInputElement>('[aria-label="方案名称"]')!
    await act(async () => setInput(rename, '重新命名的交谈'))
    await act(async () => button(host, '保存').click())
    expect(session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.talk).toMatchObject({
      label: '重新命名的交谈',
    })

    await act(async () => button(host, '新建方案').click())
    expect(host.textContent).not.toContain('所属入口')
    expect(host.querySelector('[aria-label="方案名称"]')).toBeNull()
    expect(host.textContent).not.toContain('方案使用位置')
    const newLabel = host.querySelector<HTMLInputElement>('[aria-label="新方案名称"]')!
    await act(async () => setInput(newLabel, '交出天书后'))
    await act(async () => button(host, '创建空白方案').click())
    expect(
      session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!['trigger-1'],
    ).toMatchObject({
      label: '交出天书后',
      flow: { kind: 'stages', initial: 'start' },
    })
  })

  test('shows a useful source location and returns a structured reference when opened', async () => {
    const onOpenReference = vi.fn()
    await act(async () =>
      root.render(
        <ScriptBehaviorInspector
          state={editorState()}
          target={target}
          channel="trigger"
          onDispatch={() => {}}
          onOpenReference={onOpenReference}
        />,
      ),
    )

    await act(async () => button(host, '方案详情').click())
    expect(host.textContent).toContain('场景 s001 / 实体 e1 / 页面“默认” / 使用交互脚本')
    expect(host.textContent).toContain('可复用脚本“路线” / 第 1 条指令「切换实体脚本方案」')
    const sharedReference = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.includes('可复用脚本“路线”'),
    )!
    expect(sharedReference.textContent).toContain('打开 ↗')

    await act(async () => sharedReference.click())
    expect(onOpenReference).toHaveBeenCalledWith({
      kind: 'command',
      path: 'sharedScripts.shared/user/route.body[0]',
      locator: {
        kind: 'command',
        owner: { kind: 'shared-script', scriptId: 'shared/user/route' },
        container: { kind: 'body' },
        commandPath: '0',
      },
    })
    expect(host.querySelector('[role="dialog"]')).toBeNull()
  })

  test('switches the owned trigger stages together with the selected scheme', async () => {
    const initial = editorState()
    const registry = initial.scenes[0]!.entities[0]!.behaviors!.trigger!
    registry.talk!.flow = {
      kind: 'stages',
      initial: 'first',
      stages: [
        {
          id: 'first',
          body: [{ kind: 'setFlag', flag: 'first-stage', value: true }],
          next: 'later',
        },
        {
          id: 'later',
          body: [{ kind: 'setFlag', flag: 'later-stage', value: true }],
        },
      ],
    }
    registry.after = {
      label: '交出天书后',
      order: 1,
      flow: {
        kind: 'stages',
        initial: 'only',
        stages: [
          {
            id: 'only',
            body: [{ kind: 'setFlag', flag: 'after-stage', value: true }],
          },
        ],
      },
    }
    const session = new ScriptEditSession(initial)

    function Harness() {
      const [selected, setSelected] = useState('talk')
      return (
        <ScriptBehaviorInspector
          state={session.getState()}
          target={target}
          channel="trigger"
          selectedBehaviorId={selected}
          onSelectBehavior={setSelected}
          onDispatch={(command) => session.dispatch(command)}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    expect(
      host.querySelector('.canonical-flow-explanation .script-section-title')?.textContent,
    ).toBe('分次执行')
    expect(host.querySelector('.canonical-flow-count')?.textContent).toBe('2 个步骤')
    expect(host.querySelector('.canonical-flow-explanation')?.textContent).not.toContain('当前方案')
    expect(host.querySelector('.canonical-flow-explanation')?.textContent).not.toContain('初次交谈')
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('.canonical-stage-card-select')][1]!.click(),
    )
    expect(host.textContent).toContain('旗标 later-stage = 真')

    const schemeButtons = (): HTMLButtonElement[] => [
      ...host.querySelectorAll<HTMLButtonElement>('.script-scheme-card-select'),
    ]
    expect(schemeButtons().map((candidate) => candidate.textContent)).toEqual([
      expect.stringContaining('初次交谈'),
      expect.stringContaining('交出天书后'),
    ])
    await act(async () =>
      schemeButtons()
        .find((candidate) => candidate.textContent?.includes('交出天书后'))!
        .click(),
    )
    expect(host.querySelector('.canonical-flow-count')?.textContent).toBe('1 个步骤')
    expect(host.querySelector('.canonical-flow-explanation')?.textContent).not.toContain(
      '交出天书后',
    )
    expect(host.textContent).toContain('旗标 after-stage = 真')
    expect(host.textContent).not.toContain('旗标 later-stage = 真')

    await act(async () =>
      schemeButtons()
        .find((candidate) => candidate.textContent?.includes('初次交谈'))!
        .click(),
    )
    expect(host.querySelector('.canonical-flow-count')?.textContent).toBe('2 个步骤')
    expect(
      host.querySelector('.canonical-stage-card.active .canonical-stage-card-select strong')
        ?.textContent,
    ).toBe('步骤 1')
    expect(host.textContent).toContain('旗标 first-stage = 真')
  })

  test('confirms deletion before removing an unreferenced scheme', async () => {
    const initial = editorState()
    initial.scenes[0]!.entities[0]!.behaviors!.trigger!.unused = {
      label: '临时方案',
      order: 1,
      flow: {
        kind: 'stages',
        initial: 'start',
        stages: [{ id: 'start', body: [] }],
      },
    }
    const session = new ScriptEditSession(initial)

    function Harness() {
      const [state, setState] = useState(session.getState())
      const [selected, setSelected] = useState('unused')
      return (
        <ScriptBehaviorInspector
          state={state}
          target={target}
          channel="trigger"
          selectedBehaviorId={selected}
          onSelectBehavior={setSelected}
          onDispatch={(command) => {
            session.dispatch(command)
            setState(session.getState())
          }}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="打开“临时方案”的方案详情"]')!.click(),
    )
    await act(async () => button(host, '删除方案').click())
    expect(session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.unused).toBeDefined()
    expect(host.textContent).toContain('确认删除方案')
    await act(async () => button(host, '取消删除').click())
    expect(session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.unused).toBeDefined()

    await act(async () => button(host, '删除方案').click())
    await act(async () => button(host, '确认删除方案').click())
    expect(session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.unused).toBeUndefined()
  })

  test('uses the canonical visual editor for flow bodies and commits through validation', async () => {
    const session = new ScriptEditSession(editorState())

    function Harness() {
      const [state, setState] = useState(session.getState())
      return (
        <ScriptBehaviorInspector
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

describe('BehaviorSelectionEditor', () => {
  test('presents inherit, disabled, named use, and dangling use as distinct states', () => {
    const behaviors = scene().entities[0]!.behaviors!.trigger!
    const onChange = vi.fn()
    const inherit = renderToStaticMarkup(
      <BehaviorSelectionEditor
        selection={{ kind: 'inherit' }}
        behaviors={behaviors}
        onChange={onChange}
      />,
    )
    expect(inherit).toContain('继承静态定义')
    expect(inherit).toContain('使用实体页面原本的脚本')

    const dangling = renderToStaticMarkup(
      <BehaviorSelectionEditor
        selection={{ kind: 'use', value: 'missing' }}
        behaviors={behaviors}
        onChange={onChange}
      />,
    )
    expect(dangling).toContain('missing（引用失效）')
    expect(dangling).toContain('使用：missing（引用失效）')
  })
})
