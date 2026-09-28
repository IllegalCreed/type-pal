// @vitest-environment jsdom
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { AddPoisonCommand } from '../core/poison-commands.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { loadLegalUiProject } from './__tests__/glm-leaf-workflows/legal-session.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { PoisonTab } from './PoisonTab.js'

/** 合法项目 + 真实 AddPoisonCommand 建毒（走当前命令构造 guard）。 */
async function poisonedSession() {
  const legal = await loadLegalUiProject('glm-leaf-poison-tab')
  const session = new EditSession(legal.state)
  session.dispatch(new AddPoisonCommand(1, '赤蝎粉'))
  return session
}

function Harness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const referenceIndex = collectCurrentProjectReferenceIndex(current)
  return (
    <PoisonTab
      poisons={current.poisons ?? []}
      items={current.items}
      session={props.session}
      referenceIndex={referenceIndex}
      referenceStatus="current"
      getCurrentReferenceIndex={(next) => collectCurrentProjectReferenceIndex(next)}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  await stubNodeTestHost()
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

function fieldInput(label: string): HTMLInputElement {
  const labelElement = [...host.querySelectorAll<HTMLLabelElement>('label')].find((candidate) =>
    candidate.textContent?.trim().startsWith(label),
  )
  const input = labelElement
    ? ((labelElement.htmlFor &&
        document.getElementById(labelElement.htmlFor)) as HTMLInputElement) ||
      labelElement.querySelector<HTMLInputElement>('input') ||
      labelElement.closest('.ds-field')?.querySelector<HTMLInputElement>('input')
    : host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  expect(input).not.toBeNull()
  return input!
}

async function typeAndBlur(input: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

async function chooseCombobox(label: string, optionText: string): Promise<void> {
  const labelElement = [...host.querySelectorAll<HTMLLabelElement>('label')].find((candidate) =>
    candidate.textContent?.includes(label),
  )
  const trigger = labelElement
    ? (document.getElementById(labelElement.htmlFor) as HTMLButtonElement)
    : null
  expect(trigger).not.toBeNull()
  await act(async () => trigger!.click())
  const option = [...document.querySelectorAll<HTMLElement>('.ds-select-option')].find(
    (candidate) => candidate.textContent?.includes(optionText),
  )
  expect(option).not.toBeNull()
  await act(async () => option!.click())
}

describe('PoisonTab 剩余合同', () => {
  test('curability switch commits through the real session and undoes exactly', async () => {
    const session = await poisonedSession()
    await act(async () => root.render(<Harness session={session} />))
    const historyBefore = session.getHistoryVersion()

    await chooseCombobox('可解度', '剧毒')
    expect(session.getState().poisons?.[0]?.curability).toBe('severe')
    expect(session.getHistoryVersion()).toBe(historyBefore + 1)

    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().poisons?.[0]?.curability).toBe('common')
    expect(session.getHistoryVersion()).toBeGreaterThan(historyBefore)
  })

  test('color stepper commits the palette number and undo restores it', async () => {
    const session = await poisonedSession()
    await act(async () => root.render(<Harness session={session} />))
    const color = fieldInput('染色#')
    const historyBefore = session.getHistoryVersion()
    await typeAndBlur(color, '7')
    expect(session.getState().poisons?.[0]?.color).toBe(7)
    expect(session.getHistoryVersion()).toBe(historyBefore + 1)

    await typeAndBlur(color, '')
    expect(session.getState().poisons?.[0]?.color).toBe(0)

    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().poisons?.[0]?.color).toBe(7)
    expect(session.getHistoryVersion()).toBeGreaterThan(historyBefore + 1)
  })

  test('unknown ids fall back to the first poison hero', async () => {
    const session = await poisonedSession()
    await act(async () => root.render(<Harness session={session} />))
    expect(host.querySelector('h1')?.textContent).toBe('赤蝎粉')
  })
})
