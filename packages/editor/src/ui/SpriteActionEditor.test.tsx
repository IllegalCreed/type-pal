// @vitest-environment jsdom

import type { SpriteDef } from '@type-pal/content'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { catalogControlsEditorState } from './catalog-controls-test-utils.js'
import { DsInspectorHost } from './design-system/index.js'
import { SpriteActionEditor as SpriteActionEditorContent } from './SpriteActionEditor.js'
import { SPRITE_FRAME_DRAG_MIME } from './SpriteResourceViewer.js'

function SpriteActionEditor(props: ComponentProps<typeof SpriteActionEditorContent>) {
  return (
    <DsInspectorHost>
      <SpriteActionEditorContent {...props} />
    </DsInspectorHost>
  )
}

const sha256 = 'a'.repeat(64)

function sprite(id: string): SpriteDef {
  return {
    id,
    asset: 'sprite.test',
    label: id,
    layout: { kind: 'static' },
    poses: {
      idle: {
        label: '待机',
        steps: [{ frame: 0, durationMs: 250 }],
      },
    },
  }
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function keyDown(element: HTMLInputElement, key: string): Promise<void> {
  await act(async () =>
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
  )
}

describe('SpriteActionEditor field commit boundary', () => {
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

  test('disables continuous action fields until the layout proof is ready', async () => {
    const definition = sprite('pending')
    const state = catalogControlsEditorState()
    state.sprites = [definition]
    const session = new EditSession(state)
    await act(async () =>
      root.render(
        <SpriteActionEditor
          definition={definition}
          catalog={state.assetCatalog}
          proof={undefined}
          frames={[]}
          selectedSourceFrame={-1}
          references={[]}
          session={session}
          selectedActionId="idle"
        />,
      ),
    )
    expect(host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!.disabled).toBe(true)
    expect(host.querySelector<HTMLInputElement>('[id$="-duration"]')!.disabled).toBe(true)
    const actionId = host.querySelector<HTMLElement>('.ds-overflow-text.ds-inspector-readonly')
    expect(actionId?.tagName).toBe('CODE')
    expect(actionId?.textContent).toBe('idle')
  })

  test('dispatch noop resyncs the field and a later valid definition commits once', async () => {
    const definition = sprite('late')
    const state = catalogControlsEditorState({
      version: 1,
      assets: {
        'sprite.test': {
          kind: 'sprite',
          path: 'assets/authored/sprites/test.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 8,
          sha256,
          origin: { kind: 'authored' },
        },
      },
    })
    state.sprites = []
    const session = new EditSession(state)
    const notice = vi.fn()
    await act(async () =>
      root.render(
        <SpriteActionEditor
          definition={definition}
          catalog={state.assetCatalog}
          proof={{ asset: 'sprite.test', sha256, actualFrameCount: 1 }}
          frames={[]}
          selectedSourceFrame={-1}
          references={[]}
          session={session}
          selectedActionId="idle"
          onStatusNotice={notice}
        />,
      ),
    )
    const name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    await act(async () => name.focus())
    await input(name, '不会落盘')
    await act(async () => name.blur())
    expect(session.getHistoryVersion()).toBe(0)
    expect(name.value).toBe('待机')
    expect(notice).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'error', message: expect.stringContaining('已变化') }),
    )

    const beforeAdd = session.getState()
    session.dispatch({
      label: '补入精灵定义',
      apply: (current) => ({ ...current, sprites: [...current.sprites, definition] }),
      invert: () => beforeAdd,
    })
    const beforeCommit = session.getHistoryVersion()
    await act(async () => name.focus())
    await input(name, '现在落盘')
    await act(async () => name.blur())
    expect(session.getHistoryVersion()).toBe(beforeCommit + 1)
    expect(session.getState().sprites[0]?.poses?.idle?.label).toBe('现在落盘')
  })

  test('cancels same-valued object drafts and commits name or duration once', async () => {
    const first = sprite('first')
    const second = sprite('second')
    const state = catalogControlsEditorState({
      version: 1,
      assets: {
        'sprite.test': {
          kind: 'sprite',
          path: 'assets/authored/sprites/test.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 8,
          sha256,
          origin: { kind: 'authored' },
        },
      },
    })
    state.sprites = [first, second]
    const session = new EditSession(state)
    const proof = { asset: 'sprite.test', sha256, actualFrameCount: 1 } as const

    const renderEditor = async (definitionId: string): Promise<void> => {
      const definition = session.getState().sprites.find(({ id }) => id === definitionId)!
      await act(async () =>
        root.render(
          <SpriteActionEditor
            definition={definition}
            catalog={session.getState().assetCatalog}
            proof={proof}
            frames={[]}
            selectedSourceFrame={-1}
            references={[]}
            session={session}
            selectedActionId="idle"
            onSelectedActionChange={() => {}}
          />,
        ),
      )
    }

    await renderEditor('first')
    let name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    await act(async () => name.focus())
    await input(name, '前对象未提交草稿')
    expect(session.getHistoryVersion()).toBe(0)

    await renderEditor('second')
    name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    expect(name.value).toBe('待机')
    await act(async () => name.blur())
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => name.focus())
    for (let index = 0; index < 100; index++) await input(name, `动作 ${index}`)
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => name.blur())
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().sprites[0]!.poses?.idle?.label).toBe('待机')
    expect(session.getState().sprites[1]!.poses?.idle?.label).toBe('动作 99')

    session.undo()
    await renderEditor('second')
    expect(host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!.value).toBe('待机')
    session.redo()
    await renderEditor('second')
    expect(host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!.value).toBe(
      '动作 99',
    )

    const beforeDuration = session.getHistoryVersion()
    const duration = host.querySelector<HTMLInputElement>('[id$="-duration"]')!
    await act(async () => duration.focus())
    for (let index = 0; index < 100; index++) await input(duration, String(300 + index))
    expect(session.getHistoryVersion()).toBe(beforeDuration)
    await keyDown(duration, 'Enter')
    await act(async () => duration.blur())
    expect(session.getHistoryVersion()).toBe(beforeDuration + 1)
    expect(session.getState().sprites[1]!.poses?.idle?.steps[0]?.durationMs).toBe(399)

    await renderEditor('second')
    const afterDuration = session.getHistoryVersion()
    const currentDuration = host.querySelector<HTMLInputElement>('[id$="-duration"]')!
    await act(async () => currentDuration.focus())
    await input(currentDuration, '777')
    await keyDown(currentDuration, 'Escape')
    expect(currentDuration.value).toBe('399')
    expect(session.getHistoryVersion()).toBe(afterDuration)
  })

  test('[reorder-family:sprite-actions] step reorder keeps loopFrom on the logical step and preserves source-frame transfer', async () => {
    const definition = sprite('timeline')
    definition.poses!.idle = {
      label: '待机',
      loopFrom: 0,
      steps: [
        { frame: 0, durationMs: 100 },
        { frame: 1, durationMs: 200 },
        { frame: 2, durationMs: 300 },
      ],
    }
    const state = catalogControlsEditorState({
      version: 1,
      assets: {
        'sprite.test': {
          kind: 'sprite',
          path: 'assets/authored/sprites/test.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 8,
          sha256,
          origin: { kind: 'authored' },
        },
      },
    })
    state.sprites = [definition]
    const session = new EditSession(state)
    const dispatch = vi.spyOn(session, 'dispatch')
    const frames = Array.from({ length: 3 }, () => ({
      canvas: undefined,
      width: 1,
      height: 1,
    }))
    const renderCurrent = async (): Promise<void> => {
      await act(async () =>
        root.render(
          <SpriteActionEditor
            definition={session.getState().sprites[0]!}
            catalog={session.getState().assetCatalog}
            proof={{ asset: 'sprite.test', sha256, actualFrameCount: 3 }}
            frames={frames}
            selectedSourceFrame={2}
            references={[]}
            session={session}
            selectedActionId="idle"
            onSelectedActionChange={() => {}}
          />,
        ),
      )
    }

    await renderCurrent()
    const stepTokens = (): string[] =>
      [...host.querySelectorAll<HTMLElement>('.sprite-action-timeline [data-ds-reorder-item]')].map(
        (item) => item.dataset.itemKey!,
      )
    const initialTokens = stepTokens()
    const firstHandle = host.querySelector<HTMLButtonElement>(
      '.sprite-action-timeline [data-ds-reorder-handle]',
    )!
    await act(async () => {
      firstHandle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      firstHandle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      firstHandle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(1)
    expect(dispatch).toHaveBeenCalledOnce()
    expect(session.getState().sprites[0]!.poses!.idle!.steps.map((step) => step.frame)).toEqual([
      1, 2, 0,
    ])
    expect(session.getState().sprites[0]!.poses!.idle!.loopFrom).toBe(2)

    await renderCurrent()
    const movedTokens = stepTokens()
    expect(movedTokens[2]).toBe(initialTokens[0])
    expect(session.undo()).toBe(true)
    await renderCurrent()
    const undoTokens = stepTokens()
    expect(undoTokens.some((token) => movedTokens.includes(token))).toBe(false)
    expect(session.getState().sprites[0]!.poses!.idle!.loopFrom).toBe(0)
    expect(session.redo()).toBe(true)
    await renderCurrent()
    const redoTokens = stepTokens()
    expect(redoTokens.some((token) => [...movedTokens, ...undoTokens].includes(token))).toBe(false)
    expect(session.getState().sprites[0]!.poses!.idle!.loopFrom).toBe(2)

    const beforeTransfer = session.getHistoryVersion()
    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop, 'dataTransfer', {
      value: {
        getData: (mime: string) =>
          mime === SPRITE_FRAME_DRAG_MIME ? JSON.stringify({ asset: 'sprite.test', frame: 2 }) : '',
      },
    })
    await act(async () =>
      host.querySelector<HTMLElement>('.sprite-action-drop-end')!.dispatchEvent(drop),
    )
    expect(session.getHistoryVersion()).toBe(beforeTransfer + 1)
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(session.getState().sprites[0]!.poses!.idle!.steps.map((step) => step.frame)).toEqual([
      1, 2, 0, 2,
    ])
  })
})
