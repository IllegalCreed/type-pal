// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { catalogControlsEditorState } from './catalog-controls-test-utils.js'
import { MediaAssetNameField } from './MediaAssetLifecycle.js'

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
})

function renderNameField(session: EditSession, label = '主要立绘'): void {
  root.render(<MediaAssetNameField assetId="portrait.primary" label={label} session={session} />)
}

function nameInput(): HTMLInputElement {
  const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent === '名称',
  )
  const input = label?.htmlFor
    ? (document.getElementById(label.htmlFor) as HTMLInputElement | null)
    : null
  if (!input) throw new Error('名称字段没有正确关联输入控件')
  return input
}

async function edit(input: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    input.focus()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('MediaAssetNameField', () => {
  test('commits one history command on Enter', async () => {
    const session = new EditSession(catalogControlsEditorState())
    await act(async () => renderNameField(session))
    const historyBefore = session.getHistoryVersion()
    const input = nameInput()

    await edit(input, '新的立绘名称')
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(session.getHistoryVersion()).toBe(historyBefore + 1)
    expect(session.getState().assetCatalog.assets['portrait.primary']?.label).toBe('新的立绘名称')
  })

  test('commits on blur but creates no command for an unchanged value', async () => {
    const session = new EditSession(catalogControlsEditorState())
    await act(async () => renderNameField(session))
    const historyBefore = session.getHistoryVersion()
    const input = nameInput()

    await edit(input, '失焦提交')
    await act(async () => input.blur())
    expect(session.getHistoryVersion()).toBe(historyBefore + 1)
    expect(session.getState().assetCatalog.assets['portrait.primary']?.label).toBe('失焦提交')

    await act(async () => renderNameField(session, '失焦提交'))
    const unchangedHistory = session.getHistoryVersion()
    const unchanged = nameInput()
    await edit(unchanged, '失焦提交')
    await act(async () => unchanged.blur())
    expect(session.getHistoryVersion()).toBe(unchangedHistory)
  })

  test('restores the committed value on Escape without dispatching', async () => {
    const session = new EditSession(catalogControlsEditorState())
    await act(async () => renderNameField(session))
    const historyBefore = session.getHistoryVersion()
    const input = nameInput()

    await edit(input, '不应保存')
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(nameInput().value).toBe('主要立绘')
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(session.getState().assetCatalog.assets['portrait.primary']?.label).toBe('主要立绘')
  })
})
