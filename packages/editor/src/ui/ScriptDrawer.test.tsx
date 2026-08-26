// @vitest-environment jsdom

import type { Command, SceneDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { catalogControlsEditorState } from './catalog-controls-test-utils.js'
import { ScriptDrawer } from './ScriptDrawer.js'

vi.mock('./PreviewCanvas.js', () => ({
  PreviewCanvas: () => <div data-testid="preview-canvas" />,
}))

async function input(element: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function button(host: ParentNode, label: string): HTMLButtonElement {
  const found = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  if (!found) throw new Error(`缺少按钮 ${label}`)
  return found
}

describe('ScriptDrawer command aggregate draft', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    class TestResizeObserver {
      observe(): void {}
      disconnect(): void {}
    }
    ;(globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.restoreAllMocks()
  })

  test('keeps 100 changes local, switches commands without leakage, and completes once', async () => {
    const scene: SceneDef = {
      id: 'scene-test',
      mapId: 'map-test',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'entity-test',
          sprite: 'sprite-test',
          pos: { col: 0, row: 0, height: 0 },
          facing: 'down',
          pages: [
            {
              trigger: {
                on: 'interact',
                range: 1,
                stages: [
                  {
                    body: [
                      { kind: 'wait', ms: 40 },
                      { kind: 'wait', ms: 40 },
                      { kind: 'loadScene', scene: 'scene-test' },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    }
    const state = catalogControlsEditorState()
    state.scenes = [scene]
    state.manifest.entryPoints = [
      {
        id: 'main',
        label: '主入口',
        scene: scene.id,
        startWorld: { party: [], money: 0, inventory: [] },
      },
    ]
    const session = new EditSession(state)

    function Harness() {
      useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.getVersion(),
      )
      return (
        <ScriptDrawer
          scene={session.getState().scenes[0]!}
          scenes={session.getState().scenes}
          locale={session.getState().locale}
          selectedEntityId="entity-test"
          sprites={[]}
          actorsById={{}}
          battleSprites={[]}
          leaderSpriteId={undefined}
          assetBase={{} as never}
          projectMaps={{}}
          mapIndex={{ version: 1, maps: [] }}
          tilesets={[]}
          session={session}
          assetCatalog={session.getState().assetCatalog}
          audioResolver={{} as never}
          assetReader={{} as never}
          projectId="test"
        />
      )
    }

    await act(async () => root.render(<Harness />))
    const rows = host.querySelectorAll<HTMLElement>('.cmd-row')
    expect(rows).toHaveLength(3)

    await act(async () => rows[0]!.click())
    let field = host.querySelector<HTMLInputElement>('.drawer-form .cf-row input')!
    await input(field, '99')
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => rows[1]!.click())
    field = host.querySelector<HTMLInputElement>('.drawer-form .cf-row input')!
    expect(field.value).toBe('40')
    expect(button(host.querySelector('.drawer-form')!, '完成').disabled).toBe(true)
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => host.querySelectorAll<HTMLElement>('.cmd-row')[0]!.click())
    field = host.querySelector<HTMLInputElement>('.drawer-form .cf-row input')!
    for (let index = 0; index < 100; index++) await input(field, String(100 + index))
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => button(host.querySelector('.drawer-form')!, '完成').click())
    expect(session.getHistoryVersion()).toBe(1)
    expect(
      session.getState().scenes[0]!.entities[0]!.pages?.[0]?.trigger?.stages[0]?.body[0],
    ).toEqual({ kind: 'wait', ms: 199 })

    const historyAfterCommit = session.getHistoryVersion()
    field = host.querySelector<HTMLInputElement>('.drawer-form .cf-row input')!
    await input(field, '777')
    await act(async () => button(host.querySelector('.drawer-form')!, '取消').click())
    expect(session.getHistoryVersion()).toBe(historyAfterCommit)
    expect(host.querySelector('.drawer-form .cf-row')).toBeNull()

    await act(async () => host.querySelectorAll<HTMLElement>('.cmd-row')[0]!.click())
    field = host.querySelector<HTMLInputElement>('.drawer-form .cf-row input')!
    await input(field, '888')
    await act(async () =>
      field.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 229,
          bubbles: true,
          cancelable: true,
        }),
      ),
    )
    expect(host.querySelector('.drawer-form .cf-row')).not.toBeNull()
    await act(async () =>
      field.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    )
    expect(session.getHistoryVersion()).toBe(historyAfterCommit)
    expect(host.querySelector('.drawer-form .cf-row')).toBeNull()

    await act(async () => host.querySelectorAll<HTMLElement>('.cmd-row')[2]!.click())
    const selectTrigger = host.querySelector<HTMLButtonElement>('.drawer-form [role="combobox"]')!
    await act(async () => selectTrigger.click())
    await act(async () =>
      selectTrigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    )
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    expect(host.querySelector('.drawer-form .cf-row')).not.toBeNull()

    await act(async () =>
      selectTrigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    )
    expect(host.querySelector('.drawer-form .cf-row')).toBeNull()
    expect(session.getHistoryVersion()).toBe(historyAfterCommit)
  })

  test('[reorder-family:script-siblings] nested reorder commits once and undo/redo cancels stale selection', async () => {
    const scene: SceneDef = {
      id: 'scene-reorder',
      mapId: 'map-reorder',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'entity-reorder',
          sprite: 'sprite-test',
          pos: { col: 0, row: 0, height: 0 },
          pages: [
            {
              trigger: {
                on: 'interact',
                range: 1,
                stages: [
                  {
                    body: [
                      {
                        kind: 'branch',
                        cond: { kind: 'chance', percent: 50 },
                        then: [
                          { kind: 'wait', ms: 100 },
                          { kind: 'wait', ms: 200 },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    }
    const editorState = catalogControlsEditorState()
    editorState.scenes = [scene]
    const session = new EditSession(editorState)
    function Harness() {
      useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.getVersion(),
      )
      const current = session.getState()
      return (
        <ScriptDrawer
          scene={current.scenes[0]!}
          scenes={current.scenes}
          locale={current.locale}
          selectedEntityId="entity-reorder"
          sprites={[]}
          actorsById={{}}
          battleSprites={[]}
          leaderSpriteId={undefined}
          assetBase={{} as never}
          projectMaps={{}}
          mapIndex={{ version: 1, maps: [] }}
          tilesets={[]}
          session={session}
          assetCatalog={current.assetCatalog}
          audioResolver={{} as never}
          assetReader={{} as never}
          projectId="test"
        />
      )
    }

    await act(async () => root.render(<Harness />))
    let rows = host.querySelectorAll<HTMLElement>('.cmd-row')
    expect(rows).toHaveLength(3)
    await act(async () => rows[1]!.click())
    await act(async () =>
      rows[1]!.querySelector<HTMLButtonElement>('[aria-label^="下移"]')!.click(),
    )
    expect(session.getHistoryVersion()).toBe(1)
    const moved = (
      session.getState().scenes[0]!.entities[0]!.pages?.[0]?.trigger?.stages[0]?.body[0] as Extract<
        Command,
        { kind: 'branch' }
      >
    ).then
    expect(moved.map((command) => (command.kind === 'wait' ? command.ms : -1))).toEqual([200, 100])
    rows = host.querySelectorAll<HTMLElement>('.cmd-row')
    expect(rows[2]!.classList.contains('sel')).toBe(true)

    await act(async () => expect(session.undo()).toBe(true))
    expect(host.querySelector('.cmd-row.sel')).toBeNull()
    await act(async () => expect(session.redo()).toBe(true))
    expect(host.querySelector('.cmd-row.sel')).toBeNull()
  })

  test('[reorder-family:command-arrays] 对话重复行本地 no-op，有效排序完成后只生成一条历史', async () => {
    const scene: SceneDef = {
      id: 'scene-dialog-reorder',
      mapId: 'map-dialog-reorder',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'speaker',
          pos: { col: 0, row: 0, height: 0 },
          pages: [
            {
              trigger: {
                on: 'interact',
                range: 1,
                stages: [
                  {
                    body: [
                      {
                        kind: 'dialog',
                        cue: {
                          identity: { kind: 'narration' },
                          rows: [
                            { text: 'dlg.same' },
                            { text: 'dlg.same' },
                            { text: 'dlg.unique' },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    } as never
    const editorState = catalogControlsEditorState()
    editorState.scenes = [scene]
    editorState.locale = { 'dlg.same': '相同台词', 'dlg.unique': '唯一台词' }
    const session = new EditSession(editorState)

    function Harness() {
      useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.getVersion(),
      )
      const current = session.getState()
      return (
        <ScriptDrawer
          scene={current.scenes[0]!}
          scenes={current.scenes}
          locale={current.locale}
          selectedEntityId="speaker"
          sprites={[]}
          actorsById={{}}
          battleSprites={[]}
          leaderSpriteId={undefined}
          assetBase={{} as never}
          projectMaps={{}}
          mapIndex={{ version: 1, maps: [] }}
          tilesets={[]}
          session={session}
          assetCatalog={current.assetCatalog}
          audioResolver={{} as never}
          assetReader={{} as never}
          projectId="test"
        />
      )
    }

    await act(async () => root.render(<Harness />))
    await act(async () => host.querySelector<HTMLElement>('.cmd-row')!.click())
    const collection = host.querySelector<HTMLElement>(
      '[data-ds-reorder-adoption="story/dialogue-cue-rows"]',
    )!
    const rows = () => collection.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')
    const values = () =>
      [...collection.querySelectorAll<HTMLTextAreaElement>('textarea')].map((field) => field.value)
    const sourceToken = rows()[0]?.dataset.itemKey
    const handle = rows()[0]!.querySelector<HTMLButtonElement>('[data-ds-reorder-handle]')!
    const complete = button(host.querySelector('.drawer-form')!, '完成')
    const dispatch = vi.spyOn(session, 'dispatch')

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(values()).toEqual(['相同台词', '相同台词', '唯一台词'])
    expect(rows()[0]?.dataset.itemKey).toBe(sourceToken)
    expect(complete.disabled).toBe(true)
    expect(dispatch).not.toHaveBeenCalled()
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(values()).toEqual(['相同台词', '唯一台词', '相同台词'])
    expect(rows()[2]?.dataset.itemKey).toBe(sourceToken)
    expect(dispatch).not.toHaveBeenCalled()
    expect(session.getHistoryVersion()).toBe(0)
    expect(complete.disabled).toBe(false)

    await act(async () => complete.click())
    expect(dispatch).toHaveBeenCalledOnce()
    expect(session.getHistoryVersion()).toBe(1)
    const cueRows = () =>
      (
        session.getState().scenes[0]!.entities[0]!.pages?.[0]?.trigger?.stages[0]
          ?.body[0] as Extract<Command, { kind: 'dialog' }>
      ).cue.rows.map((row) => row.text)
    expect(cueRows()).toEqual(['dlg.same', 'dlg.unique', 'dlg.same'])

    await act(async () => expect(session.undo()).toBe(true))
    expect(cueRows()).toEqual(['dlg.same', 'dlg.same', 'dlg.unique'])
    expect(session.undo()).toBe(false)
    await act(async () => expect(session.redo()).toBe(true))
    expect(cueRows()).toEqual(['dlg.same', 'dlg.unique', 'dlg.same'])
    expect(dispatch).toHaveBeenCalledOnce()
  })

  test('人物对话称谓与指令草稿一次完成、一次撤销和重做保持原子', async () => {
    const scene: SceneDef = {
      id: 'scene-dialog',
      mapId: 'map-dialog',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'speaker',
          actor: 'hero',
          pos: { col: 0, row: 0, height: 0 },
          pages: [
            {
              trigger: {
                on: 'interact',
                range: 1,
                stages: [
                  {
                    body: [
                      {
                        kind: 'dialog',
                        cue: {
                          identity: { kind: 'actor', actor: 'hero' },
                          rows: [{ text: 'dlg.hello' }],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    } as never
    const state = catalogControlsEditorState()
    state.scenes = [scene]
    state.actors = [{ id: 'hero', name: 'name.hero', spriteId: 'sprite.hero' }]
    state.locale = { 'name.hero': '李逍遥', 'dlg.hello': '你好' }
    state.manifest.entryPoints = [
      {
        id: 'main',
        label: '主入口',
        scene: scene.id,
        startWorld: { party: [], money: 0, inventory: [] },
      },
    ]
    const session = new EditSession(state)

    function Harness() {
      useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.getVersion(),
      )
      const current = session.getState()
      return (
        <ScriptDrawer
          scene={current.scenes[0]!}
          scenes={current.scenes}
          locale={current.locale}
          selectedEntityId="speaker"
          sprites={[]}
          actorsById={{ hero: current.actors[0]! }}
          battleSprites={[]}
          leaderSpriteId={undefined}
          assetBase={{} as never}
          projectMaps={{}}
          mapIndex={{ version: 1, maps: [] }}
          tilesets={[]}
          session={session}
          assetCatalog={current.assetCatalog}
          audioResolver={{} as never}
          assetReader={{} as never}
          projectId="test"
        />
      )
    }

    await act(async () => root.render(<Harness />))
    await act(async () => host.querySelector<HTMLElement>('.cmd-row')!.click())
    const speakerRow = [...host.querySelectorAll<HTMLElement>('.drawer-form .cf-row')].find((row) =>
      row.textContent?.includes('显示称谓'),
    )!
    const speakerInput = speakerRow.querySelector<HTMLInputElement>('input')!
    for (let index = 0; index < 100; index++) await input(speakerInput, `少侠 ${index}`)
    const speed = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(
      (control) => control.closest('label')?.textContent?.includes('自定速度'),
    )!
    await act(async () => speed.click())
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => button(host.querySelector('.drawer-form')!, '完成').click())
    expect(session.getHistoryVersion()).toBe(1)
    const committed = session.getState()
    const command = committed.scenes[0]!.entities[0]!.pages?.[0]?.trigger?.stages[0]
      ?.body[0] as unknown as {
      cue: {
        identity: { speakerOverride?: string }
        rows: Array<{ speed?: number }>
      }
    }
    const localeKey = command.cue.identity.speakerOverride
    expect(localeKey).toBeTruthy()
    expect(committed.locale[localeKey!]).toBe('少侠 99')
    expect(command.cue.rows[0]?.speed).toBe(24)

    expect(session.undo()).toBe(true)
    const undone = session.getState()
    const undoneCommand = undone.scenes[0]!.entities[0]!.pages?.[0]?.trigger?.stages[0]
      ?.body[0] as unknown as {
      cue: { identity: { speakerOverride?: string }; rows: Array<{ speed?: number }> }
    }
    expect(undone.locale[localeKey!]).toBeUndefined()
    expect(undoneCommand.cue.identity.speakerOverride).toBeUndefined()
    expect(undoneCommand.cue.rows[0]?.speed).toBeUndefined()
    expect(session.undo()).toBe(false)

    expect(session.redo()).toBe(true)
    const redone = session.getState()
    const redoneCommand = redone.scenes[0]!.entities[0]!.pages?.[0]?.trigger?.stages[0]
      ?.body[0] as unknown as {
      cue: { identity: { speakerOverride?: string }; rows: Array<{ speed?: number }> }
    }
    expect(redone.locale[localeKey!]).toBe('少侠 99')
    expect(redoneCommand.cue.identity.speakerOverride).toBe(localeKey)
    expect(redoneCommand.cue.rows[0]?.speed).toBe(24)
  })
})
