// Tools tabs share localized DOM primitives; each caller owns the resulting nodes.
import { uiText } from '../localization/ui-text.js'

export function sectionTitle(parent: HTMLElement, text: string): void {
  const d = document.createElement('div')
  d.className = 'tp-section-title'
  d.textContent = uiText(text)
  parent.appendChild(d)
}

export function muted(parent: HTMLElement, text: string): void {
  const d = document.createElement('div')
  d.className = 'tp-muted'
  d.textContent = uiText(text)
  parent.appendChild(d)
}

export function button(parent: HTMLElement, text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.className = 'tp-btn'
  b.textContent = uiText(text)
  b.addEventListener('click', onClick)
  parent.appendChild(b)
  return b
}
