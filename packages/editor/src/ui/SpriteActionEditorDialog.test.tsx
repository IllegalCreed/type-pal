// @vitest-environment jsdom

import type { SpriteDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { SpriteLayoutEditProof } from '../core/commands.js'
import { UpdateSpriteCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { ProjectReferenceEdge } from '../core/project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectReferenceIndex,
} from '../core/project-reference-adapters.js'
import { catalogControlsEditorState } from './catalog-controls-test-utils.js'
import { SpriteActionEditorDialog } from './SpriteActionEditorDialog.js'
import { SPRITE_FRAME_DRAG_MIME } from './SpriteFrameWorkbench.js'

const sha256 = 'a'.repeat(64)
const frames = Array.from({ length: 4 }, () => ({
  canvas: undefined,
  width: 32,
  height: 48,
}))

function definition(actionCount = 1): SpriteDef {
  return {
    id: 'sprite.dialog',
    asset: 'sprite.test',
    label: '弹窗精灵',
    layout: { kind: 'static' },
    poses: Object.fromEntries(
      Array.from({ length: actionCount }, (_, index) => [
        index === 0 ? 'idle' : `action-${index + 1}`,
        {
          label: index === 0 ? '待机' : `动作 ${index + 1}`,
          order: index,
          steps: [{ frame: index % frames.length, durationMs: 250 }],
        },
      ]),
    ),
  }
}

function sessionFor(sprite: SpriteDef): EditSession {
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
  state.sprites = [sprite]
  return new EditSession(state)
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(function scrollTo(this: HTMLElement, options: ScrollToOptions) {
      if (typeof options.top === 'number') this.scrollTop = options.top
    }),
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function renderDialog(options: {
  sprite?: SpriteDef
  session?: EditSession
  mode: 'create' | 'edit'
  selectedActionId?: string
  onClose?: () => void
  onSelectedActionChange?: (actionId: string | undefined) => void
  onRequestSave?: () => void
  onRequestCreate?: () => void
  onOpenReferences?: (actionId: string) => void
  liveDefinition?: SpriteDef | null
  liveProof?: SpriteLayoutEditProof | null
  references?: readonly ProjectReferenceEdge[]
  referenceStatus?: EditorDerivedStatus
  getCurrentReferenceIndex?: CurrentProjectReferenceIndexProvider
}) {
  const sprite = options.sprite ?? definition()
  const session = options.session ?? sessionFor(sprite)
  const onClose = options.onClose ?? vi.fn()
  const onSelectedActionChange = options.onSelectedActionChange ?? vi.fn()
  const proof = { asset: 'sprite.test', sha256, actualFrameCount: frames.length }
  return {
    sprite,
    session,
    onClose,
    onSelectedActionChange,
    node: (
      <SpriteActionEditorDialog
        definition={sprite}
        liveDefinition={
          options.liveDefinition === null ? undefined : (options.liveDefinition ?? sprite)
        }
        catalog={session.getState().assetCatalog}
        proof={proof}
        liveProof={options.liveProof === null ? undefined : (options.liveProof ?? proof)}
        frames={frames}
        selectedSourceFrame={2}
        references={options.references ?? []}
        referenceStatus={options.referenceStatus ?? 'current'}
        getCurrentReferenceIndex={
          options.getCurrentReferenceIndex ?? collectCurrentProjectReferenceIndex
        }
        session={session}
        initialMode={options.mode}
        selectedActionId={options.selectedActionId}
        onSelectedActionChange={onSelectedActionChange}
        onSelectedSourceFrameChange={() => undefined}
        onRequestCreate={options.onRequestCreate ?? (() => undefined)}
        onOpenReferences={options.onOpenReferences ?? (() => undefined)}
        onRequestSave={options.onRequestSave}
        onClose={onClose}
      />
    ),
  }
}

describe('SpriteActionEditorDialog', () => {
  test.each([
    ['checking', '正在检查'],
    ['stale', '待刷新'],
    ['failed', '检查失败'],
  ] as const)('%s 引用状态不会把未知冒充成零并开放动作删除', async (status, message) => {
    const current = definition()
    const view = renderDialog({
      sprite: current,
      mode: 'edit',
      selectedActionId: 'idle',
      referenceStatus: status,
    })
    await act(async () => root.render(view.node))

    expect(
      host.querySelector<HTMLButtonElement>('[aria-label="删除预制动作：待机"]')!.disabled,
    ).toBe(true)
    expect(host.textContent).toContain(message)
  })

  test.each([
    {
      name: 'provider failure',
      provider: (() => {
        throw new Error('oracle unavailable')
      }) as CurrentProjectReferenceIndexProvider,
      message: 'oracle unavailable',
    },
    {
      name: 'live canonical reference',
      provider: ((state) =>
        collectCurrentProjectReferenceIndex(state, {
          scenes: [],
          items: [],
          sharedScripts: {
            live: {
              name: '实时引用',
              self: 'none',
              body: [
                {
                  kind: 'playEntityAction',
                  target: { scene: 'scene', entity: 'entity' },
                  sprite: 'sprite.dialog',
                  action: 'idle',
                  loop: false,
                },
              ],
            },
          },
        })) as CurrentProjectReferenceIndexProvider,
      message: '仍被 1 处引用',
    },
  ])('动作删除 $name 会显示真实原因并保持项目不变', async ({ provider, message }) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const current = definition()
    const session = sessionFor(current)
    const view = renderDialog({
      sprite: current,
      session,
      mode: 'edit',
      selectedActionId: 'idle',
      getCurrentReferenceIndex: provider,
    })
    await act(async () => root.render(view.node))
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="删除预制动作：待机"]')!.click(),
    )

    expect(host.querySelector('[role="alert"]')?.textContent).toContain(message)
    expect(session.getState().sprites[0]?.poses?.idle).toBeDefined()
    expect(session.getHistoryVersion()).toBe(0)
  })

  test('pristine create closes with zero commands while dirty create requires explicit discard', async () => {
    const clean = renderDialog({ mode: 'create' })
    await act(async () => root.render(clean.node))
    await act(async () => host.querySelector<HTMLButtonElement>('button')?.focus())
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '取消')!
        .click(),
    )
    expect(clean.onClose).toHaveBeenCalledOnce()
    expect(clean.session.getHistoryVersion()).toBe(0)

    await act(async () => root.unmount())
    root = createRoot(host)
    const dirty = renderDialog({ mode: 'create' })
    await act(async () => root.render(dirty.node))
    const name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    await act(async () => name.focus())
    await input(name, '新的动作名称')
    await act(async () => name.blur())
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '取消')!
        .click(),
    )
    expect(host.querySelector('[role="alertdialog"]')).not.toBeNull()
    expect(dirty.onClose).not.toHaveBeenCalled()
    expect(dirty.session.getHistoryVersion()).toBe(0)
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '放弃新动作')!
        .click(),
    )
    expect(dirty.onClose).toHaveBeenCalledOnce()
    expect(dirty.session.getHistoryVersion()).toBe(0)
  })

  test('create confirms exactly one UpdateSpriteCommand and transitions to edit', async () => {
    const current = definition()
    const session = sessionFor(current)
    const dispatch = vi.spyOn(session, 'dispatch')
    const selected = vi.fn()
    const view = renderDialog({
      sprite: current,
      session,
      mode: 'create',
      onSelectedActionChange: selected,
    })
    await act(async () => root.render(view.node))
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '创建动作')!
        .click(),
    )
    expect(dispatch).toHaveBeenCalledOnce()
    expect(dispatch.mock.calls[0]?.[0]).toBeInstanceOf(UpdateSpriteCommand)
    expect(session.getState().sprites[0]?.poses?.action?.steps[0]?.frame).toBe(2)
    expect(selected).toHaveBeenCalledWith('action')
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('button')].some(
        (button) => button.textContent?.trim() === '完成',
      ),
    ).toBe(true)
  })

  test('create-to-edit keeps the latest action snapshot across consecutive edits', async () => {
    const current = definition()
    const session = sessionFor(current)
    const view = renderDialog({ sprite: current, session, mode: 'create' })
    await act(async () => root.render(view.node))
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '创建动作')!
        .click(),
    )

    const name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    await act(async () => name.focus())
    await input(name, '创建后改名')
    await act(async () => name.blur())
    expect(session.getState().sprites[0]?.poses?.action?.label).toBe('创建后改名')
    expect(host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')?.value).toBe(
      '创建后改名',
    )

    const duration = host.querySelector<HTMLInputElement>('input[id*="-duration"]')!
    await act(async () => duration.focus())
    await input(duration, '500')
    await act(async () => duration.blur())
    expect(session.getState().sprites[0]?.poses?.action?.steps[0]?.durationMs).toBe(500)
    expect(session.getState().sprites[0]?.poses?.action?.label).toBe('创建后改名')
  })

  test('external history drift keeps create input and performs zero create commands', async () => {
    const current = definition()
    const session = sessionFor(current)
    const view = renderDialog({ sprite: current, session, mode: 'create' })
    await act(async () => root.render(view.node))
    const name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    await act(async () => name.focus())
    await input(name, '保留这个名称')
    await act(async () => name.blur())
    session.dispatch({
      label: '外部变化',
      apply: (state) => ({ ...state, externalMarker: true }) as never,
      invert: (state) => state,
    })
    const history = session.getHistoryVersion()
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '创建动作')!
        .click(),
    )
    expect(session.getHistoryVersion()).toBe(history)
    expect(session.getState().sprites[0]?.poses?.action).toBeUndefined()
    expect(host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')?.value).toBe(
      '保留这个名称',
    )
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('项目已变化')
  })

  test('proof loss keeps a dirty create draft mounted with a visible conflict', async () => {
    const current = definition()
    const session = sessionFor(current)
    const initial = renderDialog({ sprite: current, session, mode: 'create' })
    await act(async () => root.render(initial.node))
    const name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    await act(async () => name.focus())
    await input(name, '资源变化也要保留')
    await act(async () => name.blur())

    const drifted = renderDialog({
      sprite: current,
      session,
      mode: 'create',
      liveProof: null,
      onClose: initial.onClose,
    })
    await act(async () => root.render(drifted.node))
    expect(host.querySelector('[role="dialog"]')).not.toBeNull()
    expect(host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')?.value).toBe(
      '资源变化也要保留',
    )
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('源资源已变化')
    expect(initial.onClose).not.toHaveBeenCalled()
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '创建动作')!
        .click(),
    )
    expect(session.getHistoryVersion()).toBe(0)
    expect(session.getState().sprites[0]?.poses?.action).toBeUndefined()
    expect(host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')?.value).toBe(
      '资源变化也要保留',
    )
  })

  test('edit completion flushes a focused field before closing and create consumes save', async () => {
    const current = definition()
    const session = sessionFor(current)
    const onClose = vi.fn()
    const edit = renderDialog({
      sprite: current,
      session,
      mode: 'edit',
      selectedActionId: 'idle',
      onClose,
    })
    await act(async () => root.render(edit.node))
    const name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    await act(async () => name.focus())
    await input(name, '完成前提交')
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '完成')!
        .click(),
    )
    expect(session.getState().sprites[0]?.poses?.idle?.label).toBe('完成前提交')
    expect(session.getHistoryVersion()).toBe(1)
    expect(onClose).toHaveBeenCalledOnce()

    await act(async () => root.unmount())
    root = createRoot(host)
    const save = vi.fn()
    const create = renderDialog({ mode: 'create', onRequestSave: save })
    await act(async () => root.render(create.node))
    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })
    await act(async () => window.dispatchEvent(event))
    expect(event.defaultPrevented).toBe(true)
    expect(save).not.toHaveBeenCalled()
    expect(create.session.getHistoryVersion()).toBe(0)
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('先创建动作')
  })

  test('failed focused commits block completion, reference navigation, and save', async () => {
    const current = definition()
    const session = sessionFor(current)
    const onClose = vi.fn()
    const onOpenReferences = vi.fn()
    const onRequestSave = vi.fn()
    const view = renderDialog({
      sprite: current,
      session,
      mode: 'edit',
      selectedActionId: 'idle',
      onClose,
      onOpenReferences,
      onRequestSave,
      references: [
        {
          id: 0,
          target: { kind: 'world-sprite-action', spriteId: current.id, actionId: 'idle' },
          source: {
            key: 'test',
            owner: { kind: 'project-part', id: 'test' },
            label: '测试来源',
            deletedWith: [],
          },
          relation: { kind: 'world-sprite-action-use', actionId: 'idle' },
          where: '测试引用',
          locator: { kind: 'unavailable', reason: '测试只读' },
          deletePolicy: 'block',
        },
      ],
    })
    await act(async () => root.render(view.node))
    const name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    await act(async () => name.focus())
    await input(name, '不会被静默丢弃')
    session.getState().sprites.splice(0)

    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '完成')!
        .click(),
    )
    expect(onClose).not.toHaveBeenCalled()
    expect(host.querySelector('[role="dialog"]')).not.toBeNull()

    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '查看引用')!
        .click(),
    )
    expect(onOpenReferences).not.toHaveBeenCalled()

    const save = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })
    await act(async () => window.dispatchEvent(save))
    expect(save.defaultPrevented).toBe(true)
    expect(onRequestSave).not.toHaveBeenCalled()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('未能提交')
  })

  test('invalid frame drops stay zero-command and surface the error inside the dialog', async () => {
    const current = definition()
    const session = sessionFor(current)
    const view = renderDialog({
      sprite: current,
      session,
      mode: 'edit',
      selectedActionId: 'idle',
    })
    await act(async () => root.render(view.node))
    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop, 'dataTransfer', {
      value: {
        getData: (mime: string) =>
          mime === SPRITE_FRAME_DRAG_MIME
            ? JSON.stringify({ asset: 'sprite.other', frame: 1 })
            : '',
      },
    })
    await act(async () =>
      host.querySelector<HTMLElement>('.sprite-action-drop-end')!.dispatchEvent(drop),
    )
    expect(session.getHistoryVersion()).toBe(0)
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('有效帧')
  })

  test('invalid drafts block action switching and entering create mode', async () => {
    const current = definition(2)
    const onRequestCreate = vi.fn()
    const view = renderDialog({
      sprite: current,
      mode: 'edit',
      selectedActionId: 'idle',
      onRequestCreate,
    })
    await act(async () => root.render(view.node))
    const name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    await act(async () => name.focus())
    await input(name, '')
    const other = [...host.querySelectorAll<HTMLElement>('[role="option"]')].find((option) =>
      option.textContent?.includes('动作 2'),
    )!
    await act(async () => other.click())
    expect(host.querySelector('h3')?.textContent).toBe('待机')
    expect(document.activeElement).toBe(name)

    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '新建预制动作')!
        .click(),
    )
    expect(onRequestCreate).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(name)
  })

  test('controlled action changes update the mounted edit dialog without remounting', async () => {
    const current = definition(3)
    const session = sessionFor(current)
    const first = renderDialog({
      sprite: current,
      session,
      mode: 'edit',
      selectedActionId: 'idle',
    })
    await act(async () => root.render(first.node))
    expect(host.querySelector('h3')?.textContent).toBe('待机')
    const second = renderDialog({
      sprite: current,
      session,
      mode: 'edit',
      selectedActionId: 'action-2',
    })
    await act(async () => root.render(second.node))
    expect(host.querySelector('h3')?.textContent).toBe('动作 2')
  })

  test('52 actions use a virtual single-focus directory without reorder rows', async () => {
    const current = definition(52)
    const view = renderDialog({ sprite: current, mode: 'edit', selectedActionId: 'action-52' })
    await act(async () => root.render(view.node))
    const listbox = host.querySelector<HTMLElement>('[role="listbox"]')!
    const search = host.querySelector<HTMLInputElement>('[aria-label="搜索预制动作"]')!
    expect(listbox.dataset.virtual).toBe('true')
    expect(listbox.tabIndex).toBe(-1)
    expect(search).not.toBeNull()
    expect(host.querySelectorAll('[role="option"]').length).toBeLessThanOrEqual(20)
    const selected = host.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
    expect(selected?.textContent).toContain('动作 52')
    expect(search.getAttribute('aria-activedescendant')).toBe(selected?.id)
    expect(document.getElementById(search.getAttribute('aria-activedescendant')!)).toBe(selected)
    expect(
      host.querySelector('[data-ds-reorder-adoption="asset/sprite-action-definitions"]'),
    ).toBeNull()
    expect(host.querySelector('.sprite-action-catalog-actions')).toBeNull()
  })

  test('filtered header movement keeps every stable ActionId and dispatches one command', async () => {
    const current = definition(3)
    const session = sessionFor(current)
    const dispatch = vi.spyOn(session, 'dispatch')
    const view = renderDialog({
      sprite: current,
      session,
      mode: 'edit',
      selectedActionId: 'idle',
    })
    await act(async () => root.render(view.node))
    const search = host.querySelector<HTMLInputElement>('[aria-label="搜索预制动作"]')!
    await input(search, '待机')
    expect(host.querySelectorAll('[role="option"]')).toHaveLength(1)
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="后移预制动作：待机"]')!.click(),
    )
    expect(dispatch).toHaveBeenCalledOnce()
    expect(dispatch.mock.calls[0]?.[0]).toBeInstanceOf(UpdateSpriteCommand)
    expect(Object.keys(session.getState().sprites[0]?.poses ?? {}).sort()).toEqual([
      'action-2',
      'action-3',
      'idle',
    ])
    expect(
      Object.entries(session.getState().sprites[0]?.poses ?? {})
        .sort(([, left], [, right]) => (left.order ?? 0) - (right.order ?? 0))
        .map(([id]) => id),
    ).toEqual(['action-2', 'idle', 'action-3'])
    await act(async () => expect(session.undo()).toBe(true))
    expect(
      Object.entries(session.getState().sprites[0]?.poses ?? {})
        .sort(([, left], [, right]) => (left.order ?? 0) - (right.order ?? 0))
        .map(([id]) => id),
    ).toEqual(['idle', 'action-2', 'action-3'])
  })

  test('delete focus falls forward, backward, then to the empty-state create action', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const cases = [
      { count: 3, selected: 'action-2', expectedHeading: '动作 3' },
      { count: 2, selected: 'action-2', expectedHeading: '待机' },
      { count: 1, selected: 'idle', expectedHeading: undefined },
    ] as const

    for (const [index, currentCase] of cases.entries()) {
      if (index) {
        await act(async () => root.unmount())
        root = createRoot(host)
      }
      const current = definition(currentCase.count)
      const view = renderDialog({
        sprite: current,
        mode: 'edit',
        selectedActionId: currentCase.selected,
      })
      await act(async () => root.render(view.node))
      const label = current.poses?.[currentCase.selected]?.label
      await act(async () =>
        host.querySelector<HTMLButtonElement>(`[aria-label="删除预制动作：${label}"]`)!.click(),
      )
      if (currentCase.expectedHeading) {
        const heading = host.querySelector<HTMLHeadingElement>('h3')!
        expect(heading.textContent).toBe(currentCase.expectedHeading)
        expect(document.activeElement).toBe(heading)
      } else {
        const create = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
          (button) => button.textContent?.trim() === '新建预制动作',
        )!
        expect(host.querySelector('.sprite-action-detail-pane')).toBeNull()
        expect(document.activeElement).toBe(create)
      }
    }
  })

  test('entering narrow mode preserves the focused detail draft instead of mounting the list', async () => {
    let matches = false
    let listener: (() => void) | undefined
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return matches
      },
      addEventListener: (_type: string, next: () => void) => {
        listener = next
      },
      removeEventListener: vi.fn(),
    }))
    const current = definition(2)
    const session = sessionFor(current)
    const view = renderDialog({
      sprite: current,
      session,
      mode: 'edit',
      selectedActionId: 'idle',
    })
    await act(async () => root.render(view.node))
    const name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    await act(async () => name.focus())
    await input(name, '切窄前的草稿')
    matches = true
    await act(async () => listener?.())
    expect(host.querySelector('.sprite-action-directory')).toBeNull()
    expect(host.querySelector('.sprite-action-detail-pane')).not.toBeNull()
    expect(session.getState().sprites[0]?.poses?.idle?.label).toBe('切窄前的草稿')
  })

  test('narrow return clears a filter that no longer contains the selected action', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const current = definition(2)
    const view = renderDialog({ sprite: current, mode: 'edit', selectedActionId: 'idle' })
    await act(async () => root.render(view.node))
    const search = host.querySelector<HTMLInputElement>('[aria-label="搜索预制动作"]')!
    await input(search, '待机')
    expect(search.getAttribute('aria-expanded')).toBe('true')
    await act(async () => host.querySelector<HTMLElement>('[role="option"]')!.click())
    const name = host.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
    await act(async () => name.focus())
    await input(name, '已经不匹配')
    await act(async () => name.blur())
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '返回动作列表')!
        .click(),
    )
    const restored = host.querySelector<HTMLInputElement>('[aria-label="搜索预制动作"]')!
    expect(restored.value).toBe('')
    expect(host.querySelector('[role="option"][aria-selected="true"]')).not.toBeNull()
    await input(restored, '不存在')
    expect(restored.getAttribute('aria-expanded')).toBe('false')
    expect(host.querySelector('[role="listbox"]')).toBeNull()
  })

  test('narrow mode mounts one page and moves focus list to detail and back', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const current = definition(3)
    const view = renderDialog({ sprite: current, mode: 'edit', selectedActionId: 'idle' })
    await act(async () => root.render(view.node))
    expect(host.querySelector('.sprite-action-directory')).not.toBeNull()
    expect(host.querySelector('.sprite-action-detail-pane')).toBeNull()
    await act(async () => host.querySelector<HTMLElement>('[role="option"]')!.click())
    expect(host.querySelector('.sprite-action-directory')).toBeNull()
    const detail = host.querySelector<HTMLElement>('.sprite-action-detail-pane')!
    expect(detail).not.toBeNull()
    expect(document.activeElement).toBe(detail.querySelector('h3'))
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '返回动作列表')!
        .click(),
    )
    expect(host.querySelector('.sprite-action-directory')).not.toBeNull()
    expect(host.querySelector('.sprite-action-detail-pane')).toBeNull()
    expect(document.activeElement).toBe(
      host.querySelector<HTMLInputElement>('[aria-label="搜索预制动作"]'),
    )
  })
})
