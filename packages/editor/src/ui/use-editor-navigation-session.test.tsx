// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorNavigationSession } from './use-editor-navigation-session.js'
import {
  editorNavigationStorageKey,
  initialEditorLocation,
  readStoredEditorNavigation,
  useEditorNavigationSession,
} from './use-editor-navigation-session.js'

let root: Root | undefined
let host: HTMLDivElement | undefined
let current: EditorNavigationSession | undefined
const frames = new Map<number, FrameRequestCallback>()
let nextFrame = 1

function Harness(props: { workspaceId: string; onPageChanged(): void }) {
  const session = useEditorNavigationSession(props)
  current = session
  return (
    <div ref={session.bodyRef}>
      <aside className="outliner" />
      <main className="center" />
      <aside className="inspector" />
      <output>{`${session.location.module}:${session.location.subpage}:${session.location.objectId ?? ''}`}</output>
    </div>
  )
}

function columns() {
  const body = host?.firstElementChild as HTMLDivElement
  return {
    outliner: body.querySelector<HTMLElement>(':scope > .outliner')!,
    center: body.querySelector<HTMLElement>(':scope > .center')!,
    inspector: body.querySelector<HTMLElement>(':scope > .inspector')!,
  }
}

async function render(workspaceId = 'workspace-a', onPageChanged = vi.fn()) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root!.render(<Harness workspaceId={workspaceId} onPageChanged={onPageChanged} />),
  )
  return onPageChanged
}

function flushFrames(): void {
  for (const [id, callback] of [...frames]) {
    frames.delete(id)
    callback(performance.now())
  }
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  current = undefined
  frames.clear()
  nextFrame = 1
  localStorage.clear()
  window.history.replaceState({}, '', '/editor')
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = nextFrame++
    frames.set(id, callback)
    return id
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id)
  })
})

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  host?.remove()
  root = undefined
  host = undefined
  vi.restoreAllMocks()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false
})

describe('editor navigation session ownership', () => {
  test('stored state is workspace-scoped and normalized while an explicit URL wins initial selection', () => {
    localStorage.setItem(
      editorNavigationStorageKey('workspace-a'),
      JSON.stringify({
        last: { module: 'battle', subpage: 'skill', objectId: 'skill-a' },
        modules: { scene: { module: 'unknown', subpage: 'bad', objectId: 's1' } },
      }),
    )
    const stored = readStoredEditorNavigation('workspace-a')
    expect(stored).toEqual({
      last: { module: 'battle', subpage: 'skill', objectId: 'skill-a' },
      modules: { scene: { module: 'scene', subpage: 'workspace', objectId: 's1' } },
      scroll: {},
    })
    window.history.replaceState({}, '', '/editor?module=actor&page=workspace&object=hero')
    expect(initialEditorLocation(stored)).toEqual({
      module: 'actor',
      subpage: 'workspace',
      objectId: 'hero',
    })
  })

  test('page navigation captures old columns, persists the new location and restores on replace', async () => {
    const changed = vi.fn()
    await render('workspace-a', changed)
    flushFrames()
    const first = columns()
    first.outliner.scrollTop = 11
    first.center.scrollTop = 22
    first.inspector.scrollTop = 33

    await act(async () =>
      current!.apply({ module: 'actor', subpage: 'workspace', objectId: 'hero' }, 'push'),
    )
    expect(changed).toHaveBeenCalledOnce()
    expect(window.location.search).toBe('?module=actor&page=workspace&object=hero')
    expect(JSON.parse(localStorage.getItem(editorNavigationStorageKey('workspace-a'))!)).toEqual(
      expect.objectContaining({
        last: {
          module: 'actor',
          subpage: 'workspace',
          objectId: 'hero',
        },
        scroll: { 'scene:workspace': { outliner: 11, center: 22, inspector: 33 } },
      }),
    )

    const second = columns()
    second.outliner.scrollTop = 4
    second.center.scrollTop = 5
    second.inspector.scrollTop = 6
    await act(async () => current!.apply({ module: 'scene', subpage: 'workspace' }, 'replace'))
    expect(changed).toHaveBeenCalledTimes(2)
    flushFrames()
    expect(columns()).toMatchObject({
      outliner: expect.objectContaining({ scrollTop: 11 }),
      center: expect.objectContaining({ scrollTop: 22 }),
      inspector: expect.objectContaining({ scrollTop: 33 }),
    })
  })

  test('popstate consumes the URL without writing a new history entry', async () => {
    const changed = vi.fn()
    await render('workspace-a', changed)
    const push = vi.spyOn(window.history, 'pushState')
    const replace = vi.spyOn(window.history, 'replaceState')
    window.history.replaceState({}, '', '/editor?module=battle&page=enemy&object=enemy-a')
    push.mockClear()
    replace.mockClear()
    await act(async () => window.dispatchEvent(new PopStateEvent('popstate')))
    expect(current!.locationRef.current).toEqual({
      module: 'battle',
      subpage: 'enemy',
      objectId: 'enemy-a',
    })
    expect(changed).toHaveBeenCalledOnce()
    expect(push).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  test('unmount cancels the owned restore frame and detaches popstate', async () => {
    await render()
    expect(frames.size).toBe(1)
    const remove = vi.spyOn(window, 'removeEventListener')
    await act(async () => root!.unmount())
    root = undefined
    expect(frames.size).toBe(0)
    expect(remove).toHaveBeenCalledWith('popstate', expect.any(Function))
  })

  test('storage failure degrades to URL and in-memory navigation', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    await render()
    await act(async () => current!.apply({ module: 'map', subpage: 'workspace', objectId: 'm1' }))
    expect(current!.locationRef.current).toEqual({
      module: 'map',
      subpage: 'workspace',
      objectId: 'm1',
    })
    expect(window.location.search).toBe('?module=map&page=workspace&object=m1')
  })
})
