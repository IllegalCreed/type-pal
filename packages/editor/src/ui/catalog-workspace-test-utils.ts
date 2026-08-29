import { expect } from 'vitest'

export function verifyCatalogWorkspace(host: HTMLElement, label: string): HTMLElement {
  const owner = host.querySelector<HTMLElement>(
    `nav.ds-catalog-workspace__content[aria-label="${label}"]`,
  )
  expect(owner, `${label} scroll owner`).not.toBeNull()
  const workspace = owner?.parentElement
  expect(workspace?.classList.contains('ds-catalog-workspace')).toBe(true)
  expect(workspace?.dataset.dsScrollScope).toBe('catalog')
  expect(owner?.dataset.dsScrollOwner).toBe('catalog')
  expect(owner?.dataset.dsScrollAxis).toBe('y')
  expect(owner?.getAttribute('tabindex')).toBeNull()
  expect(workspace?.querySelectorAll(':scope > [data-ds-scroll-owner="catalog"]')).toHaveLength(1)
  expect(workspace?.querySelector(':scope > .ds-catalog-controls')).not.toBeNull()

  let ancestor = workspace?.parentElement
  while (ancestor && ancestor !== host) {
    expect(ancestor.dataset.dsScrollOwner, `${label} ancestor scroll owner`).toBeUndefined()
    ancestor = ancestor.parentElement
  }
  return owner!
}
