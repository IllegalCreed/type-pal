// @vitest-environment jsdom

import type { AuthorSceneDef } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  type ScriptEditorCommand,
  type ScriptEditorState,
  ScriptEditSession,
} from '../core/script-editor.js'
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
            stages: [
              {
                id: 'start',
                body: [{ kind: 'setFlag', flag: 'entered', value: true }],
              },
            ],
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

describe('ScriptSceneHookInspector', () => {
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

  test('uses author-facing scene script language and the shared visual body editor', () => {
    const html = renderToStaticMarkup(
      <ScriptSceneHookInspector
        state={state}
        sceneId="s001"
        slot="onEnter"
        onDispatch={() => {}}
      />,
    )

    expect(html).toContain('默认进场')
    expect(html).toContain('默认方案')
    expect(html).toContain('脚本正文')
    expect(html).toContain('canonical-script-editor')
    expect(html).toContain('方案详情')
    expect(html).toContain('脚本方案')
    expect(html).toMatch(/class="[^"]*ds-pressable[^"]*script-scheme-card-select/)
    expect(html).not.toMatch(/class="[^"]*ds-button[^"]*script-scheme-card-select/)
    expect(html).toContain('分次执行')
    expect(html).not.toContain('进场脚本 · 脚本方案')
    expect(html).not.toContain('当前方案')
    expect(html).not.toContain('触发阶段')
    expect(html).not.toContain('阶段')
    expect(html).not.toContain('<select')
    expect(html).not.toContain('高级管理')
    expect(html).not.toContain('内部识别名')
    expect(html).not.toContain('场景 Hook')
    expect(html).not.toContain('Canonical ScriptFlow JSON')
    expect(html).not.toContain('剧情版本')
    expect(html).not.toContain('分段剧情')
  })

  test('stages the name and default setting, then saves them from one modal footer', async () => {
    const session = new ScriptEditSession(structuredClone(state))

    function Harness() {
      const [editorState, setEditorState] = useState(session.getState())
      const dispatch = (command: ScriptEditorCommand): void => {
        session.dispatch(command)
        setEditorState(session.getState())
      }
      return (
        <ScriptSceneHookInspector
          state={editorState}
          sceneId="s001"
          slot="onEnter"
          onDispatch={dispatch}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="打开“默认进场”的方案详情"]')!.click(),
    )

    const footer = host.querySelector<HTMLElement>('.canonical-script-modal-footer')!
    expect(footer.textContent).toContain('删除方案')
    expect(footer.textContent).toContain('取消')
    expect(footer.textContent).toContain('保存')
    expect(host.textContent).not.toContain('保存名称')
    expect(host.textContent).not.toContain('所属入口')
    expect(host.querySelector('.script-scheme-name-field > header')?.textContent).toContain(
      '方案名称',
    )
    expect(
      host.querySelector('.script-scheme-default-control .script-scheme-default-action button'),
    ).not.toBeNull()
    expect(host.querySelector('.script-scheme-details-section > .script-scheme-delete')).toBeNull()

    const defaultButton = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.includes('取消默认'),
    )!
    await act(async () => defaultButton.click())
    expect(session.getState().scenes[0]!.hooks?.onEnter?.initial).toBe('default')

    const name = host.querySelector<HTMLInputElement>('[aria-label="方案名称"]')!
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
      name,
      '改名后的进场',
    )
    await act(async () => name.dispatchEvent(new Event('input', { bubbles: true })))
    await act(async () =>
      [...footer.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent === '保存')!
        .click(),
    )

    expect(session.getState().scenes[0]!.hooks?.onEnter?.initial).toBeUndefined()
    expect(session.getState().scenes[0]!.hooks?.onEnter?.variants.default?.label).toBe(
      '改名后的进场',
    )
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(session.undo()).toBe(true)
    expect(session.canUndo()).toBe(false)
    expect(session.getState().scenes[0]!.hooks?.onEnter?.initial).toBe('default')
    expect(session.getState().scenes[0]!.hooks?.onEnter?.variants.default?.label).toBe('默认进场')
  })

  test('[reorder-family:scene-hook-variants] 场景方案 handle 横向重排单命令并可 undo/redo', async () => {
    const initial = structuredClone(state)
    initial.scenes[0]!.hooks!.onEnter!.variants.alternate = {
      label: '备用进场',
      order: 1,
      flow: { kind: 'stages', initial: 'start', stages: [{ id: 'start', body: [] }] },
    }
    const session = new ScriptEditSession(initial)
    const dispatched = vi.fn()
    function Harness() {
      const [current, setCurrent] = useState(session.getState())
      return (
        <ScriptSceneHookInspector
          state={current}
          sceneId="s001"
          slot="onEnter"
          onDispatch={(command) => {
            dispatched(command)
            session.dispatch(command)
            setCurrent(session.getState())
          }}
        />
      )
    }
    await act(async () => root.render(<Harness />))
    const schemeCards = host.querySelectorAll(
      '.script-scheme-card-list > .ds-reorder-item > .ds-reorder-item__content > .script-scheme-card',
    )
    expect(schemeCards).toHaveLength(2)
    expect(
      [...schemeCards].every((card) => card.querySelector('.script-scheme-card-details')),
    ).toBe(true)
    expect(
      [...schemeCards].every((card) =>
        card
          .querySelector('.script-scheme-card-actions')
          ?.firstElementChild?.classList.contains('script-scheme-card-details'),
      ),
    ).toBe(true)
    const handle = host.querySelector<HTMLButtonElement>(
      '[data-ds-reorder-adoption="story/scene-hook-variants"] [data-ds-reorder-handle]',
    )!
    await act(async () => {
      for (let index = 0; index < 20; index += 1)
        handle.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(dispatched).not.toHaveBeenCalled()
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(dispatched).toHaveBeenCalledOnce()
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().scenes[0]!.hooks!.onEnter!.variants).toMatchObject({
      alternate: { order: 0 },
      default: { order: 1 },
    })
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().scenes[0]!.hooks!.onEnter!.variants.default!.order).toBe(0)
    await act(async () => expect(session.redo()).toBe(true))
    expect(session.getState().scenes[0]!.hooks!.onEnter!.variants.default!.order).toBe(1)
  })
})
