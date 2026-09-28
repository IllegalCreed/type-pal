// @vitest-environment jsdom
import type { AuthorSceneDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ScriptEditorCommand, ScriptEditorState } from '../core/script-editor.js'
import { BehaviorSelectionEditor, ScriptBehaviorInspector } from './ScriptBehaviorInspector.js'

const scene: AuthorSceneDef = {
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
              stages: [{ id: 'start', body: [{ kind: 'setFlag', flag: 'talked', value: true }] }],
            },
          },
        },
      },
    },
  ],
}

const _state: ScriptEditorState = {
  scenes: [scene],
  items: [],
  sharedScripts: {
    'shared/user/route': {
      name: '路线',
      self: 'none',
      body: [
        {
          kind: 'selectEntityBehavior',
          target: { scene: 's001', entity: 'e1' },
          channel: 'trigger',
          selection: { kind: 'use', value: 'talk' },
        },
      ],
    },
  },
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

describe('BehaviorSelectionEditor 剩余合同', () => {
  test('dangling selection shows the失效 option and change reports the raw value', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <BehaviorSelectionEditor
          selection={{ kind: 'use', value: 'gone' }}
          behaviors={{
            talk: {
              label: '初次交谈',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'start',
                stages: [{ id: 'start', body: [] }],
              },
            },
          }}
          onChange={onChange}
        />,
      ),
    )
    const trigger = host.querySelector<HTMLButtonElement>('button.ds-select')!
    expect(trigger.textContent).toContain('gone（引用失效）')
    await act(async () => trigger.click())
    const option = [...document.querySelectorAll<HTMLElement>('.ds-select-option')].find((o) =>
      o.textContent?.includes('初次交谈'),
    )!
    await act(async () => option.click())
    expect(onChange).toHaveBeenCalledWith({ kind: 'use', value: 'talk' })
  })

  test('inherit and disabled sentinels map through the shared select', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <BehaviorSelectionEditor
          selection={{ kind: 'inherit' }}
          behaviors={{}}
          onChange={onChange}
        />,
      ),
    )
    const trigger = host.querySelector<HTMLButtonElement>('button.ds-select')!
    expect(trigger.textContent).toContain('使用实体页面原本的脚本')
    await act(async () => trigger.click())
    const option = [...document.querySelectorAll<HTMLElement>('.ds-select-option')].find((o) =>
      o.textContent?.includes('不运行脚本'),
    )!
    await act(async () => option.click())
    expect(onChange).toHaveBeenCalledWith({ kind: 'disabled' })
  })
})

describe('ScriptBehaviorInspector 剩余合同', () => {
  test('empty channel renders author copy and creation dispatches a real behavior command', async () => {
    const dispatched: ScriptEditorCommand[] = []
    const emptyState: ScriptEditorState = {
      scenes: [
        {
          ...scene,
          entities: [
            {
              id: 'e1',
              sprite: 'npc',
              pos: { col: 1, row: 1, height: 0 },
              initialPage: 'default',
              pages: [{ id: 'default', label: '默认', trigger: 'talk' }],
            },
          ],
        },
      ],
      items: [],
      sharedScripts: {},
    }
    await act(async () =>
      root.render(
        <ScriptBehaviorInspector
          state={emptyState}
          target={{ scene: 's001', entity: 'e1' }}
          channel="trigger"
          onDispatch={(command) => {
            dispatched.push(command)
          }}
          referenceStatus="current"
        />,
      ),
    )
    const create = [...host.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('新建第一个方案'),
    )
    expect(create).not.toBeNull()
    await act(async () => create!.click())
    const nameInput = document.querySelector<HTMLInputElement>('input[aria-label="新方案名称"]')
    expect(nameInput).not.toBeNull()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(nameInput!, '守卫')
      nameInput!.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      const confirm = [...document.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('创建空白方案'),
      )
      confirm?.click()
    })
    expect(dispatched).toHaveLength(1)
    expect(dispatched[0]).toMatchObject({
      target: { scene: 's001', entity: 'e1' },
      channel: 'trigger',
      value: { label: '守卫' },
    })
  })
})
