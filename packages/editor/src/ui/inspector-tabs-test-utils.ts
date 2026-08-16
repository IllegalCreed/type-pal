import { act } from 'react'
import { expect } from 'vitest'

export async function verifyInspectorTabs(
  host: HTMLElement,
  label: string,
  expectedLabels: readonly (string | RegExp)[],
): Promise<void> {
  const tabList = host.querySelector<HTMLElement>(`[role="tablist"][aria-label="${label}"]`)
  expect(tabList, `${label} tablist`).not.toBeNull()
  const inspector = tabList?.closest<HTMLElement>('.inspector')
  const heading = inspector?.querySelector<HTMLElement>(':scope > .insp-head')
  expect(heading, `${label} fixed heading`).not.toBeNull()
  expect(heading?.nextElementSibling?.contains(tabList ?? null)).toBe(true)

  const tabs = [...(tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])]
  expect(tabs).toHaveLength(expectedLabels.length)
  expectedLabels.forEach((expected, index) => {
    const actual = tabs[index]?.textContent?.trim() ?? ''
    if (expected instanceof RegExp) expect(actual).toMatch(expected)
    else expect(actual).toBe(expected)
    const countedLabel = actual.match(/^(引用|问题|诊断) (\d+)$/)
    if (countedLabel) {
      expect(tabs[index]?.querySelector('.ds-tab__label')?.textContent).toBe(countedLabel[1])
      expect(tabs[index]?.querySelector('.ds-tab__count')?.textContent).toBe(countedLabel[2])
    }
  })
  expect(tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true')).toHaveLength(1)

  for (const tab of tabs) {
    const panelId = tab.getAttribute('aria-controls')
    const panel = panelId ? host.querySelector<HTMLElement>(`#${panelId}`) : null
    expect(panel, `${tab.textContent} panel`).not.toBeNull()
    expect(panel?.getAttribute('role')).toBe('tabpanel')
    expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id)
  }
  expect(inspector?.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1)
  expect(inspector?.querySelectorAll('[role="tabpanel"][hidden]')).toHaveLength(tabs.length - 1)

  if (tabs.length < 2) return
  await act(async () => tabs[1]!.click())
  expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')

  await act(async () => {
    tabs[1]!.focus()
    tabs[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  })
  expect(document.activeElement).toBe(tabs[(1 + 1) % tabs.length])

  await act(async () =>
    (document.activeElement as HTMLButtonElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    ),
  )
  expect(document.activeElement).toBe(tabs[1])

  await act(async () =>
    tabs[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })),
  )
  expect(document.activeElement).toBe(tabs[0])

  await act(async () =>
    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })),
  )
  expect(document.activeElement).toBe(tabs.at(-1))
  expect(inspector?.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1)
}
