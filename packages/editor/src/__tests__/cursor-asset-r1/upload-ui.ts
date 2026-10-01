/**
 * C03 上传类组件 DOM 驱动助手：只经公开 DOM（id/aria/文本/类名）操作，等价真实用户。
 * 不读私有 state，不改产品代码。
 */
import { act } from 'react'
import { expect, vi } from 'vitest'
import { loadFilesIntoInput, typeDraft } from './kit.js'

// ───────── SpriteUploadWizard ─────────

export function wizardFileInput(host: ParentNode): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>('#sprite-upload-file, input[type="file"]')
  expect(input, 'wizard file input').not.toBeNull()
  return input!
}

export async function wizardPick(host: ParentNode, file: File): Promise<void> {
  await loadFilesIntoInput(wizardFileInput(host), [file])
}

export function wizardField(host: ParentNode, id: string): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(`#${id}`)
  expect(input, `field #${id}`).not.toBeNull()
  return input!
}

export async function wizardSetNumber(host: ParentNode, id: string, value: number): Promise<void> {
  await typeDraft(wizardField(host, id), String(value))
}

export async function wizardSetText(host: ParentNode, id: string, value: string): Promise<void> {
  await typeDraft(wizardField(host, id), value)
}

export async function wizardChooseKind(host: ParentNode, textPart: string): Promise<void> {
  const button = [
    ...host.querySelectorAll<HTMLButtonElement>('.sprite-upload-kind-options button'),
  ].find((candidate) => candidate.textContent?.includes(textPart))
  expect(button, `kind ${textPart}`).toBeDefined()
  await act(async () => button!.click())
}

export function wizardSubmit(host: ParentNode): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>('.sprite-upload-submit')
  expect(button, 'submit').not.toBeNull()
  return button!
}

export function wizardCancel(host: ParentNode): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>('.sprite-upload-cancel')
  expect(button, 'cancel').not.toBeNull()
  return button!
}

export function wizardReadout(host: ParentNode): string {
  return [...host.querySelectorAll('.sprite-upload-readout')]
    .map((node) => node.textContent ?? '')
    .join(' | ')
}

export function wizardThumbCount(host: ParentNode): number {
  return host.querySelectorAll('.tile-cell').length
}

export function wizardError(host: ParentNode): string | null {
  return host.querySelector('.err')?.textContent ?? null
}

export function wizardBusy(host: ParentNode): string | null {
  return host.querySelector('.sprite-upload-wizard')?.getAttribute('aria-busy') ?? null
}

/** 等到「已解码 + 色盘就绪 + 网格有效」：入库按钮出现且可点。 */
export async function wizardWaitReady(host: ParentNode): Promise<void> {
  await vi.waitFor(() => {
    const button = host.querySelector<HTMLButtonElement>('.sprite-upload-submit')
    expect(button, 'submit 出现').not.toBeNull()
    expect(button!.disabled).toBe(false)
  })
}

/** 等到原图已解码、表单出现（不要求网格有效/入库可点）。 */
export async function wizardWaitDecoded(host: ParentNode): Promise<void> {
  await vi.waitFor(() => {
    expect(host.querySelector('.sprite-upload-submit'), 'submit 出现').not.toBeNull()
    expect(host.querySelector('.sprite-upload-wizard')?.getAttribute('aria-busy')).toBe('false')
  })
}

export async function wizardClickSubmit(host: ParentNode): Promise<void> {
  await act(async () => {
    wizardSubmit(host).click()
  })
}

export async function flush(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) await act(async () => Promise.resolve())
}

/** 等入库完成：onDone 被调用过至少 count 次。 */
export async function waitDone(done: readonly unknown[], count = 1): Promise<void> {
  await vi.waitFor(() => {
    expect(done.length).toBeGreaterThanOrEqual(count)
  })
  await flush()
}

// ───────── SpriteResourceViewer ─────────

export async function waitMeta(host: ParentNode, frames: number, consumers: number): Promise<void> {
  await vi.waitFor(() => {
    expect((host as HTMLElement).textContent).toContain(`${frames} 帧 · ${consumers} 个用途定义`)
  })
  await flush(1)
}

export function hiddenImageInputs(host: ParentNode): HTMLInputElement[] {
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

export function appendPanel(host: ParentNode): HTMLElement | null {
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

// ───────── BattleSpriteUploader ─────────

export function bsuPicker(host: ParentNode): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>('input[aria-label="选择战斗精灵图片"]')
  expect(input, 'bsu picker').not.toBeNull()
  return input!
}

export async function bsuPick(host: ParentNode, file: File): Promise<void> {
  await loadFilesIntoInput(bsuPicker(host), [file])
}

export function bsuSummary(host: ParentNode): string {
  return host.querySelector('.bsu-frame-summary')?.textContent ?? ''
}

export function bsuNumber(
  host: ParentNode,
  label: '战斗精灵帧宽' | '战斗精灵帧高',
): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  expect(input, label).not.toBeNull()
  return input!
}

export function bsuButton(host: ParentNode, text: string): HTMLButtonElement | undefined {
  return [...host.querySelectorAll<HTMLButtonElement>('.bsu-actions button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
}

export function bsuThumbs(host: ParentNode): number {
  return host.querySelectorAll('.bsu-frame-grid .tile-cell').length
}

export function bsuError(host: ParentNode): string | null {
  return host.querySelector('.bsu .err')?.textContent ?? null
}
