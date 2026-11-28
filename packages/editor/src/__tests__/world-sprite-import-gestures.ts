import { act } from 'react'
import { expect, vi } from 'vitest'
import { loadFilesIntoInput, typeDraft } from './cursor-asset-r1/kit.js'
import { waitForWizardPalette } from './world-sprite-import-test-host.js'

function wizardFileInput(host: ParentNode): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>('#sprite-upload-file, input[type="file"]')
  expect(input, 'wizard file input').not.toBeNull()
  return input!
}

interface WizardImageRead {
  /** The actual hardware call settles even if the wizard has since unmounted. */
  finished: Promise<void>
}

export async function wizardPick(
  host: ParentNode,
  file: File,
  options: { waitForDecode?: boolean } = {},
): Promise<WizardImageRead> {
  const bitmap = vi.spyOn(globalThis, 'createImageBitmap')
  const reads: Promise<ImageBitmap>[] = []
  try {
    await act(async () => {
      await loadFilesIntoInput(wizardFileInput(host), [file])
      expect(bitmap).toHaveBeenCalledExactlyOnceWith(file)
      const result = bitmap.mock.results[0]
      if (!result || result.type !== 'return') throw new Error('Wizard image decode did not start')
      reads.push(result.value)
      // The component reports failures; negative tests must assert that error UI.
      if (options.waitForDecode !== false) await Promise.allSettled(reads)
    })
  } finally {
    bitmap.mockRestore()
  }
  return { finished: Promise.allSettled(reads).then(() => undefined) }
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
export async function wizardWaitReady(host: HTMLElement): Promise<void> {
  await waitForWizardPalette(host)
  const button = host.querySelector<HTMLButtonElement>('.sprite-upload-submit')
  expect(button, 'submit 出现').not.toBeNull()
  expect(button!.disabled).toBe(false)
}

/** 等到原图已解码、表单出现（不要求网格有效/入库可点）。 */
export function wizardWaitDecoded(host: ParentNode): void {
  expect(host.querySelector('.sprite-upload-submit'), 'submit 出现').not.toBeNull()
  expect(host.querySelector('.sprite-upload-wizard')?.getAttribute('aria-busy')).toBe('false')
}

export async function wizardClickSubmit(
  host: ParentNode,
  options: { waitForCommitDigest?: boolean } = {},
): Promise<void> {
  // Command failures have no onDone callback. Observe the real final hardware task,
  // then let act apply catch/finally updates before the caller inspects the DOM.
  const digest = options.waitForCommitDigest ? vi.spyOn(crypto.subtle, 'digest') : undefined
  try {
    await act(async () => {
      wizardSubmit(host).click()
      if (digest) {
        await vi.waitFor(() => expect(digest).toHaveBeenCalledTimes(1))
        const pending = digest.mock.results[0]
        if (!pending || pending.type !== 'return')
          throw new Error('Wizard commit digest did not return its hardware promise')
        await pending.value
      }
    })
  } finally {
    digest?.mockRestore()
  }
}

/** 等入库完成：onDone 被调用过至少 count 次。 */
export async function waitDone(done: readonly unknown[], count = 1): Promise<void> {
  await act(async () => {
    await vi.waitFor(() => expect(done.length).toBeGreaterThanOrEqual(count))
  })
}
