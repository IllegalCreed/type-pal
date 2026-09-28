// @vitest-environment jsdom
import type { AuthorSceneDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ScriptEditorCommand, ScriptEditorState } from '../core/script-editor.js'
import { ScriptSceneHookInspector } from './ScriptSceneHookInspector.js'

const scene: AuthorSceneDef = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
  hooks: {
    onEnter: {
      initial: 'default',
      variants: {
        default: {
          label: '默认进场',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'start',
            stages: [{ id: 'start', body: [{ kind: 'setFlag', flag: 'entered', value: true }] }],
          },
        },
      },
    },
  },
}

const state: ScriptEditorState = {
  scenes: [scene],
  items: [],
  sharedScripts: {},
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

describe('ScriptSceneHookInspector 剩余合同', () => {
  test('empty slot renders its author copy and creation dispatches a real hook command', async () => {
    const dispatched: ScriptEditorCommand[] = []
    await act(async () =>
      root.render(
        <ScriptSceneHookInspector
          state={{ scenes: [{ ...scene, hooks: {} }], items: [], sharedScripts: {} }}
          sceneId="s001"
          slot="onEnter"
          onDispatch={(command) => {
            dispatched.push(command)
          }}
          referenceStatus="current"
        />,
      ),
    )
    expect(host.textContent).toContain('进场脚本')

    const create = [...host.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('新建第一个方案'),
    )
    expect(create).not.toBeNull()
    await act(async () => create!.click())
    const nameInput = document.querySelector<HTMLInputElement>('input[aria-label="新方案名称"]')
    expect(nameInput).not.toBeNull()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(nameInput!, '夜战')
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
      sceneId: 's001',
      slot: 'onEnter',
      value: { label: '夜战' },
    })
  })

  test('enabled/disabled scheme state exposes the current scheme and selection callbacks', async () => {
    const onSelectHook = vi.fn()
    await act(async () =>
      root.render(
        <ScriptSceneHookInspector
          state={state}
          sceneId="s001"
          slot="onEnter"
          selectedHookId="default"
          onSelectHook={onSelectHook}
          onDispatch={() => undefined}
          referenceStatus="current"
        />,
      ),
    )
    expect(host.textContent).toContain('默认进场')
    const card = host.querySelector('[class*="script-scheme-card-select"]')
    expect(card).not.toBeNull()
    await act(async () => (card as HTMLElement).click())
    expect(onSelectHook).toHaveBeenCalledWith('default')
  })
})
