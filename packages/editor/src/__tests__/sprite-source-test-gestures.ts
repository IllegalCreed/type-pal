import { act } from 'react'
import { expect, vi } from 'vitest'
import { waitForSpriteViewerResources } from './world-sprite-viewer-test-host.js'

export async function waitMeta(
  host: HTMLElement,
  frames: number,
  consumers: number,
): Promise<void> {
  await waitForSpriteViewerResources(host)
  expect(host.textContent).toContain(`${frames} 帧 · ${consumers} 个用途定义`)
}

function hiddenImageInputs(host: ParentNode): HTMLInputElement[] {
  return [...host.querySelectorAll<HTMLInputElement>('input[type="file"].sprite-hidden-file-input')]
}

/** 追加输入框 = 第 2 个隐藏文件输入；替换 = 第 1 个（与 viewer 渲染顺序一致）。 */
export function replaceInput(host: ParentNode): HTMLInputElement {
  const inputs = hiddenImageInputs(host)
  expect(inputs.length, '隐藏文件输入').toBe(2)
  return inputs[0]!
}

export function appendInput(host: ParentNode): HTMLInputElement {
  const inputs = hiddenImageInputs(host)
  expect(inputs.length, '隐藏文件输入').toBe(2)
  return inputs[1]!
}

export function frameCell(host: ParentNode, index: number): HTMLElement {
  const cell = host.querySelector<HTMLElement>(`[data-source-frame-index="${index}"]`)
  expect(cell, `源帧格 ${index}`).not.toBeNull()
  return cell!
}

export async function selectFrame(host: ParentNode, index: number): Promise<void> {
  await act(async () => frameCell(host, index).click())
}

export function currentFrameLabel(host: ParentNode): string {
  return host.querySelector('.sprite-raw-toolbar b')?.textContent ?? ''
}

export function frameCounter(host: ParentNode): string {
  return host.querySelector('.sprite-resource-frame-nav output')?.textContent ?? ''
}

export function toolbarButton(host: ParentNode, text: string): HTMLButtonElement {
  const scope = host as ParentNode
  const button = [
    ...scope.querySelectorAll<HTMLButtonElement>(
      '.sprite-raw-toolbar button, .sprite-resource-frame-nav button, button',
    ),
  ].find(
    (candidate) =>
      candidate.textContent?.trim() === text ||
      candidate.getAttribute('aria-label') === text ||
      candidate.title === text,
  )
  expect(button, `toolbar ${text}`).toBeDefined()
  return button!
}

export function editorMessage(host: ParentNode): HTMLElement | null {
  return host.querySelector<HTMLElement>('.sprite-raw-editor-message')
}

export async function waitEditorMessage(host: ParentNode): Promise<HTMLElement> {
  await vi.waitFor(() => {
    expect(editorMessage(host)).not.toBeNull()
  })
  return editorMessage(host)!
}

function appendPanel(host: ParentNode): HTMLElement | null {
  return host.querySelector<HTMLElement>('.sprite-raw-append-panel')
}

export function panelButton(host: ParentNode, text: string): HTMLButtonElement {
  const panel = appendPanel(host)
  expect(panel, 'append panel').not.toBeNull()
  const button = [...panel!.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(button, `append panel ${text}`).toBeDefined()
  return button!
}

export function panelNumber(host: ParentNode, label: '列' | '行'): HTMLInputElement {
  const panel = appendPanel(host)
  expect(panel, 'append panel').not.toBeNull()
  const field = [...panel!.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  expect(field, `panel label ${label}`).toBeDefined()
  const control = field!.htmlFor
    ? document.getElementById(field!.htmlFor)
    : field!.parentElement?.querySelector('input')
  expect(control, `panel input ${label}`).not.toBeNull()
  return control as HTMLInputElement
}
