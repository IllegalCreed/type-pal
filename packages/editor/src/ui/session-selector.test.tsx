// @vitest-environment jsdom

import type { ItemData } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { RenameProjectCommand, UpdateItemCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import {
  ScriptEditSession,
  UpdateSharedScriptMetadataCommand,
} from '../core/script-editor.js'
import { catalogControlsEditorState } from './catalog-controls-test-utils.js'
import {
  shallowSelectorArrayEqual,
  useEditSessionSelector,
  useScriptEditSessionSelector,
} from './session-selector.js'

function item(name: string): ItemData {
  return {
    id: 'item-a',
    name,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  }
}

function mainSession(name = '甲'): EditSession {
  const state = catalogControlsEditorState()
  state.items = [item(name)]
  return new EditSession(state)
}

describe('session selector hooks', () => {
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
    vi.restoreAllMocks()
  })

  test('preserves an equal main selection across unrelated revisions', async () => {
    const session = mainSession()
    let renders = 0
    function Probe() {
      const items = useEditSessionSelector(session, (snapshot) => snapshot.state.items)
      renders += 1
      return <span>{items[0]?.name}</span>
    }

    await act(async () => root.render(<Probe />))
    expect(renders).toBe(1)
    await act(async () => session.dispatch(new RenameProjectCommand('只改项目名')))
    expect(renders).toBe(1)
    await act(async () => session.dispatch(new UpdateItemCommand('item-a', { name: '乙' })))
    expect(renders).toBe(2)
    expect(host.textContent).toBe('乙')
  })

  test('observes dirty/markSaved notifications without inventing a content revision', async () => {
    const session = mainSession()
    const history = session.getHistoryVersion()
    let renders = 0
    function Probe() {
      const dirty = useEditSessionSelector(session, (snapshot) => snapshot.dirty)
      renders += 1
      return <span>{dirty ? 'dirty' : 'saved'}</span>
    }

    await act(async () => root.render(<Probe />))
    await act(async () => session.dispatch(new RenameProjectCommand('已修改')))
    expect(host.textContent).toBe('dirty')
    expect(session.getHistoryVersion()).toBe(history + 1)
    await act(async () => session.markSaved())
    expect(host.textContent).toBe('saved')
    expect(session.getHistoryVersion()).toBe(history + 1)
    expect(renders).toBe(3)
  })

  test('switches session ownership and unsubscribes the previous session', async () => {
    const first = mainSession('甲')
    const second = mainSession('乙')
    let renders = 0
    function Probe(props: { session: EditSession }) {
      const name = useEditSessionSelector(
        props.session,
        (snapshot) => snapshot.state.items[0]?.name,
      )
      renders += 1
      return <span>{name}</span>
    }

    await act(async () => root.render(<Probe session={first} />))
    await act(async () => root.render(<Probe session={second} />))
    expect(host.textContent).toBe('乙')
    const rendersAfterSwap = renders
    await act(async () => first.dispatch(new UpdateItemCommand('item-a', { name: '旧会话' })))
    expect(renders).toBe(rendersAfterSwap)
    expect(host.textContent).toBe('乙')
  })

  test('script render selectors use the immutable snapshot instead of cloning getState', async () => {
    const session = new ScriptEditSession({
      scenes: [],
      items: [],
      sharedScripts: {
        script: { name: '原名', self: 'none', body: [] },
      },
    })
    const cloneRead = vi.spyOn(session, 'getState')
    function Probe() {
      const name = useScriptEditSessionSelector(
        session,
        (snapshot) => snapshot.state.sharedScripts.script?.name,
      )
      return <span>{name}</span>
    }

    await act(async () => root.render(<Probe />))
    await act(async () =>
      session.dispatch(new UpdateSharedScriptMetadataCommand('script', { name: '新名' })),
    )
    expect(host.textContent).toBe('新名')
    expect(cloneRead).not.toHaveBeenCalled()
  })

  test('shallow array equality compares selector slots by identity', () => {
    const shared = {}
    expect(shallowSelectorArrayEqual([shared, 1], [shared, 1])).toBe(true)
    expect(shallowSelectorArrayEqual([{}], [{}])).toBe(false)
  })
})
