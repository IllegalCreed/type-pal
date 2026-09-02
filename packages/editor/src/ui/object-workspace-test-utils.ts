import { expect } from 'vitest'

/** 跨页面冻结真实对象工作区与唯一中央纵向 owner。 */
export function verifyCanonicalObjectWorkspace(
  host: ParentNode,
  label: string,
  options: { hero?: boolean; noticeSelector?: string; tagName?: 'DIV' | 'MAIN' | 'SECTION' } = {},
): { workspace: HTMLElement; content: HTMLElement } {
  const workspace = host.querySelector<HTMLElement>(
    `[data-ds-scroll-scope="main"][aria-label="${label}"]`,
  )
  expect(workspace).not.toBeNull()
  expect(workspace?.tagName).toBe(options.tagName ?? 'MAIN')

  const directOwners = workspace?.querySelectorAll<HTMLElement>(
    ':scope > [data-ds-scroll-owner="main"][data-ds-scroll-axis="y"]',
  )
  expect(directOwners).toHaveLength(1)
  expect(workspace?.querySelectorAll('[data-ds-scroll-owner="main"]')).toHaveLength(1)
  const content = directOwners?.[0]
  expect(content).toBeDefined()

  const hero = workspace?.querySelector<HTMLElement>(':scope > .ds-object-hero')
  expect(Boolean(hero)).toBe(options.hero ?? true)
  if (hero) expect(content?.contains(hero)).toBe(false)

  if (options.noticeSelector) {
    const notice = workspace?.querySelector<HTMLElement>(`:scope > ${options.noticeSelector}`)
    expect(notice).not.toBeNull()
    expect(content?.contains(notice!)).toBe(false)
  }

  return { workspace: workspace!, content: content! }
}
