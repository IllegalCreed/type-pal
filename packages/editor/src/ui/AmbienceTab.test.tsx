// @vitest-environment jsdom

import type { AmbienceDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  AddAmbienceCommand,
  DeleteAmbienceCommand,
  UpdateAmbienceCommand,
} from '../core/commands.js'
import { type EditorState, EditSession } from '../core/edit-session.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  createProjectReferenceSource,
  type ProjectReferenceEdgeInput,
} from '../core/project-reference.js'
import { AmbienceTab } from './AmbienceTab.js'
import { verifyCatalogWorkspace } from './catalog-workspace-test-utils.js'

const day: AmbienceDef = { id: 'day', name: '白天', tint: [255, 255, 255] }
const review: AmbienceDef = { id: '123', name: '123', tint: [255, 255, 255] }

function referenceIndex(edges: readonly ProjectReferenceEdgeInput[] = []) {
  return createProjectReferenceIndex(buildProjectReferenceSnapshot(edges))
}

const emptyReferenceIndex = referenceIndex()
const defaultReferenceProps = {
  referenceIndex: emptyReferenceIndex,
  referenceStatus: 'current' as const,
  getCurrentReferenceIndex: () => emptyReferenceIndex,
}

function editorState(overrides: Partial<EditorState> = {}): EditorState {
  return {
    manifest: {
      id: 'test',
      name: 'Test',
      contentVersion: 19,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [],
    },
    scenes: [],
    items: [],
    sharedScripts: {},
    scriptChunks: {},
    ambiences: [day, review],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    ...overrides,
  } as unknown as EditorState
}

function sessionFor(state: EditorState, dispatch = vi.fn()): EditSession {
  return { dispatch, getState: () => state } as unknown as EditSession
}

function setInputValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function catalogRow(host: HTMLElement, title: string): HTMLButtonElement {
  return [...host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find((row) =>
    row.textContent?.includes(title),
  )!
}

describe('AmbienceTab creation dialog', () => {
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

  test('uses the shared dialog and validates before dispatching one trimmed ambience command', async () => {
    const dispatch = vi.fn()
    const prompt = vi.spyOn(window, 'prompt')
    const alert = vi.spyOn(window, 'alert')

    await act(async () => {
      root.render(
        <AmbienceTab
          {...defaultReferenceProps}
          ambiences={[day]}
          session={sessionFor(editorState({ ambiences: [day] }), dispatch)}
        />,
      )
    })

    verifyCatalogWorkspace(host, '氛围目录')

    const open = host.querySelector<HTMLButtonElement>('button[aria-label="新建氛围"]')!
    await act(async () => open.click())

    const dialog = host.querySelector<HTMLDialogElement>('dialog[open][aria-label="新建氛围"]')!
    expect(dialog).not.toBeNull()
    expect(dialog.classList.contains('ds-dialog')).toBe(true)
    expect(dialog.querySelectorAll('.ds-field')).toHaveLength(2)
    expect(dialog.querySelectorAll('.ds-input')).toHaveLength(2)
    expect(dialog.textContent).toContain('稳定 ID')
    expect(dialog.textContent).toContain('显示名称')

    const form = dialog.querySelector<HTMLFormElement>('form')!
    await act(async () => {
      form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    })
    expect(dialog.querySelector('[role="alert"]')?.textContent).toBe('请输入稳定 ID。')
    expect(dispatch).not.toHaveBeenCalled()

    const id = dialog.querySelector<HTMLInputElement>('input[name="ambience-id"]')!
    await act(async () => setInputValue(id, 'day'))
    await act(async () => {
      form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    })
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('已存在')
    expect(dispatch).not.toHaveBeenCalled()

    const name = dialog.querySelector<HTMLInputElement>('input[name="ambience-name"]')!
    await act(async () => {
      setInputValue(id, '  dusk  ')
      setInputValue(name, '  黄昏  ')
    })
    await act(async () => {
      form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    })

    expect(dispatch).toHaveBeenCalledTimes(1)
    const command = dispatch.mock.calls[0]?.[0]
    expect(command).toBeInstanceOf(AddAmbienceCommand)
    const next = (command as AddAmbienceCommand).apply({ ambiences: [] } as unknown as EditorState)
    expect(next.ambiences).toEqual([{ id: 'dusk', name: '黄昏', tint: [255, 255, 255] }])
    expect(dialog.hasAttribute('open')).toBe(false)
    expect(prompt).not.toHaveBeenCalled()
    expect(alert).not.toHaveBeenCalled()

    await act(async () => open.click())
    expect(host.querySelector<HTMLInputElement>('input[name="ambience-id"]')?.value).toBe('')
    expect(host.querySelector<HTMLInputElement>('input[name="ambience-name"]')?.value).toBe('')
    expect(host.querySelector('[role="alert"]')).toBeNull()

    await act(async () => {
      host.querySelector<HTMLButtonElement>('dialog[open] button:not([aria-label])')?.click()
    })
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  test('deletes an unreferenced ambience only after the shared confirmation dialog', async () => {
    const dispatch = vi.fn()
    const confirm = vi.spyOn(window, 'confirm')
    const session = sessionFor(editorState(), dispatch)
    await act(async () => {
      root.render(
        <AmbienceTab {...defaultReferenceProps} ambiences={[day, review]} session={session} />,
      )
    })

    await act(async () => catalogRow(host, '123').click())
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="删除氛围 123"]')!
    await act(async () => trigger.click())

    const dialog = host.querySelector<HTMLDialogElement>(
      'dialog[open][aria-label="删除氛围“123”？"]',
    )!
    expect(dialog).not.toBeNull()
    expect(dialog.classList.contains('ds-dialog')).toBe(true)
    expect(dialog.textContent).toContain('当前作者快照未发现脚本、昼夜切换或运行态引用')
    expect(dispatch).not.toHaveBeenCalled()

    const deleteButton = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '确认删除',
    )!
    await act(async () => deleteButton.click())
    await act(
      async () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve())
        }),
    )

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch.mock.calls[0]?.[0]).toBeInstanceOf(DeleteAmbienceCommand)
    expect(dialog.hasAttribute('open')).toBe(false)
    expect(document.activeElement).toBe(host.querySelector<HTMLButtonElement>('.ds-catalog-row'))
    expect(document.activeElement?.textContent).toContain('白天')
    expect(confirm).not.toHaveBeenCalled()
  })

  test('lists blocking references and keeps deletion disabled', async () => {
    const dispatch = vi.fn()
    const openReference = vi.fn()
    const state = editorState()
    const usedReferenceIndex = referenceIndex([
      {
        target: { kind: 'ambience', id: '123' },
        source: createProjectReferenceSource(
          { kind: 'shared-script', id: 'shared/review' },
          '共享脚本 评审脚本',
        ),
        relation: { kind: 'ambience-use', use: 'set-ambience' },
        where: 'sharedScripts["shared/review"].body[0].ambience',
        locator: { kind: 'object', object: { kind: 'shared-script', id: 'shared/review' } },
        deletePolicy: 'replace-suggest',
      },
    ])
    await act(async () => {
      root.render(
        <AmbienceTab
          ambiences={[day, review]}
          session={sessionFor(state, dispatch)}
          referenceIndex={usedReferenceIndex}
          referenceStatus="current"
          getCurrentReferenceIndex={() => usedReferenceIndex}
          onOpenReference={openReference}
        />,
      )
    })

    await act(async () => catalogRow(host, '123').click())
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="删除氛围 123"]')?.click()
    })

    const dialog = host.querySelector<HTMLDialogElement>(
      'dialog[open][aria-label="删除氛围“123”？"]',
    )!
    expect(dialog.textContent).toContain('仍有 1 处引用')
    expect(dialog.textContent).toContain('评审脚本')
    expect(dialog.querySelector('.ds-reference-panel')).not.toBeNull()
    const deleteButton = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '确认删除',
    )!
    expect(deleteButton.disabled).toBe(true)
    expect(dispatch).not.toHaveBeenCalled()

    await act(async () => {
      dialog.querySelector<HTMLButtonElement>('button[aria-label^="打开引用："]')?.click()
    })
    expect(openReference).toHaveBeenCalledTimes(1)
    expect(dialog.hasAttribute('open')).toBe(false)
  })

  test('opens an exact deep link and reports a missing target without falling back', async () => {
    const session = sessionFor(editorState())
    await act(async () => {
      root.render(
        <AmbienceTab
          {...defaultReferenceProps}
          ambiences={[day, review]}
          session={session}
          focusObjectId="123"
        />,
      )
    })

    expect(host.querySelector('.ds-object-hero')?.textContent).toContain('123')
    expect(
      host.querySelector<HTMLButtonElement>('.ds-catalog-row[data-selected="true"]')?.textContent,
    ).toContain('123')

    await act(async () => {
      root.render(
        <AmbienceTab
          {...defaultReferenceProps}
          ambiences={[day, review]}
          session={session}
          focusObjectId="missing"
        />,
      )
    })

    expect(host.querySelector('.ds-object-hero')).toBeNull()
    expect(host.textContent).toContain('引用目标氛围“missing”不在当前项目')
    expect(host.querySelector('.ds-catalog-row[data-selected="true"]')).toBeNull()
  })

  test('name equality is a no-op and one committed change creates one command', async () => {
    const dispatch = vi.fn()
    await act(async () => {
      root.render(
        <AmbienceTab
          {...defaultReferenceProps}
          ambiences={[day]}
          session={sessionFor(editorState({ ambiences: [day] }), dispatch)}
        />,
      )
    })

    const name = host.querySelector<HTMLInputElement>('input[value="白天"]')!
    await act(async () => {
      name.focus()
      name.blur()
    })
    expect(dispatch).not.toHaveBeenCalled()

    await act(async () => {
      name.focus()
      setInputValue(name, '晴昼')
    })
    await act(async () => name.blur())
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch.mock.calls[0]?.[0]).toBeInstanceOf(UpdateAmbienceCommand)
  })

  test('native color input previews continuously but commits only once when the field loses focus', async () => {
    const dispatch = vi.fn()
    await act(async () => {
      root.render(
        <AmbienceTab
          {...defaultReferenceProps}
          ambiences={[day]}
          session={sessionFor(editorState({ ambiences: [day] }), dispatch)}
        />,
      )
    })

    const color = host.querySelector<HTMLInputElement>('input[type="color"]')!
    await act(async () => {
      color.focus()
      setInputValue(color, '#102030')
      setInputValue(color, '#203040')
    })
    expect(dispatch).not.toHaveBeenCalled()

    await act(async () => color.blur())
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch.mock.calls[0]?.[0]).toBeInstanceOf(UpdateAmbienceCommand)
  })

  test('颜色行的恢复动作与默认输入控件等高', async () => {
    const tinted = { ...day, tint: [255, 230, 102] as [number, number, number] }
    await act(async () => {
      root.render(
        <AmbienceTab
          {...defaultReferenceProps}
          ambiences={[tinted]}
          session={sessionFor(editorState({ ambiences: [tinted] }))}
        />,
      )
    })

    const reset = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '恢复不染色',
    )!
    expect(reset.classList.contains('ds-button--compact')).toBe(false)
  })

  test('Escape restores every editable field without dispatching the stale draft on blur', async () => {
    const dispatch = vi.fn()
    await act(async () => {
      root.render(
        <AmbienceTab
          {...defaultReferenceProps}
          ambiences={[day]}
          session={sessionFor(editorState({ ambiences: [day] }), dispatch)}
        />,
      )
    })

    const cancel = async (input: HTMLInputElement, value: string): Promise<void> => {
      await act(async () => {
        input.focus()
        setInputValue(input, value)
      })
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      })
    }

    const name = host.querySelector<HTMLInputElement>('input[value="白天"]')!
    await cancel(name, '不会保存的名称')
    expect(name.value).toBe('白天')

    const hex = host.querySelector<HTMLInputElement>('input[aria-label="氛围颜色 HEX"]')!
    await cancel(hex, '#102030')
    expect(hex.value).toBe('#ffffff')

    await cancel(hex, '#12')
    expect(hex.value).toBe('#ffffff')
    await act(async () => {
      hex.focus()
      setInputValue(hex, '#102030')
    })
    await act(async () => hex.blur())
    expect(dispatch).toHaveBeenCalledTimes(1)
    dispatch.mockClear()

    const red = host.querySelector<HTMLInputElement>('input[aria-label="R 通道"]')!
    await cancel(red, '96')
    expect(red.value).toBe('255')

    const color = host.querySelector<HTMLInputElement>('input[type="color"]')!
    await cancel(color, '#405060')
    expect(color.value).toBe('#ffffff')
    expect(dispatch).not.toHaveBeenCalled()
  })

  test.each([
    ['checking', 'loading'],
    ['stale', 'partial'],
    ['failed', 'error'],
  ] as const)('%s 引用快照不冒充零引用并禁用删除', async (status, panelState) => {
    await act(async () =>
      root.render(
        <AmbienceTab
          {...defaultReferenceProps}
          referenceStatus={status}
          ambiences={[day]}
          session={sessionFor(editorState({ ambiences: [day] }))}
        />,
      ),
    )
    expect(host.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe(panelState)
    expect(host.textContent).toContain('引用数量未知')
    expect(
      host.querySelector<HTMLButtonElement>('button[aria-label="删除氛围 白天"]')?.disabled,
    ).toBe(true)
  })

  test('current 但索引缺失时仍按失败态关闭删除', async () => {
    await act(async () =>
      root.render(
        <AmbienceTab
          {...defaultReferenceProps}
          referenceIndex={undefined}
          ambiences={[day]}
          session={sessionFor(editorState({ ambiences: [day] }))}
        />,
      ),
    )
    expect(host.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe('error')
    expect(host.textContent).toContain('引用数量未知')
    expect(
      host.querySelector<HTMLButtonElement>('button[aria-label="删除氛围 白天"]')?.disabled,
    ).toBe(true)
  })

  test('展示为零后确认删除仍按 live oracle 更新阻断引用', async () => {
    const liveReferenceIndex = referenceIndex([
      {
        target: { kind: 'ambience', id: '123' },
        source: createProjectReferenceSource(
          { kind: 'shared-script', id: 'shared/live' },
          '共享脚本 实时引用',
        ),
        relation: { kind: 'ambience-use', use: 'set-ambience' },
        where: 'sharedScripts["shared/live"].body[0].ambience',
        locator: { kind: 'object', object: { kind: 'shared-script', id: 'shared/live' } },
        deletePolicy: 'replace-suggest',
      },
    ])
    const session = new EditSession(editorState())
    await act(async () =>
      root.render(
        <AmbienceTab
          ambiences={session.getState().ambiences ?? []}
          session={session}
          referenceIndex={emptyReferenceIndex}
          referenceStatus="current"
          getCurrentReferenceIndex={() => liveReferenceIndex}
        />,
      ),
    )
    await act(async () => catalogRow(host, '123').click())
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除氛围 123"]')?.click(),
    )
    const dialog = host.querySelector<HTMLDialogElement>(
      'dialog[open][aria-label="删除氛围“123”？"]',
    )!
    const confirm = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent === '确认删除',
    )!
    await act(async () => confirm.click())
    expect(session.getState().ambiences?.some((ambience) => ambience.id === '123')).toBe(true)
    expect(dialog.textContent).toContain('仍有 1 处引用')
    expect(dialog.textContent).toContain('共享脚本 实时引用')
    expect(confirm.disabled).toBe(true)
  })

  test('live oracle 失败时保留氛围并在确认框内 fail-closed', async () => {
    const session = new EditSession(editorState())
    await act(async () =>
      root.render(
        <AmbienceTab
          ambiences={session.getState().ambiences ?? []}
          session={session}
          referenceIndex={emptyReferenceIndex}
          referenceStatus="current"
          getCurrentReferenceIndex={() => {
            throw new Error('oracle down')
          }}
        />,
      ),
    )
    await act(async () => catalogRow(host, '123').click())
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除氛围 123"]')?.click(),
    )
    const dialog = host.querySelector<HTMLDialogElement>(
      'dialog[open][aria-label="删除氛围“123”？"]',
    )!
    const confirm = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent === '确认删除',
    )!
    await act(async () => confirm.click())
    expect(session.getState().ambiences?.some((ambience) => ambience.id === '123')).toBe(true)
    expect(dialog.textContent).toContain('oracle down')
    expect(confirm.disabled).toBe(true)
  })

  test('引用状态或索引变化会关闭旧删除确认', async () => {
    const session = sessionFor(editorState())
    await act(async () =>
      root.render(
        <AmbienceTab {...defaultReferenceProps} ambiences={[day, review]} session={session} />,
      ),
    )
    await act(async () => catalogRow(host, '123').click())
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除氛围 123"]')?.click(),
    )
    expect(host.querySelector('dialog[open][aria-label="删除氛围“123”？"]')).not.toBeNull()

    await act(async () =>
      root.render(
        <AmbienceTab
          {...defaultReferenceProps}
          referenceStatus="stale"
          ambiences={[day, review]}
          session={session}
        />,
      ),
    )
    expect(host.querySelector('dialog[open][aria-label="删除氛围“123”？"]')).toBeNull()
  })
})
