/**
 * C05 SpriteActionEditor / Dialog / FrameWorkbench 驱动助手（只经公开 DOM）。
 */

import type { SpriteActionDef } from '@type-pal/content'
import { act } from 'react'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { UpdateSpriteCommand } from '../../core/commands.js'
import { collectCurrentProjectReferenceIndex } from '../../core/project-reference-adapters.js'
import { actionOf, C05_SPRITE, type C05Open, heroOf, openC05 } from './c05-action-fixtures.js'
import {
  type MountedDialog,
  type MountedEditor,
  mountActionDialog,
  mountActionEditor,
  unmountActionDialog,
  unmountActionEditor,
} from './c05-action-harness.js'
import { installBrowserHardwarePorts } from './frame-editor-ports.js'
import { buttonByText, clickButtonByText, controlByLabel, fillAndBlur, typeDraft } from './kit.js'

export { actionOf, C05_SPRITE, type C05Open, openC05 }

export function setupC05Ui(): void {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  installBrowserHardwarePorts()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  })
}

export function teardownC05Ui(): void {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
}

/** Vitest lifecycle registration（非 React Hook）。 */
export function registerC05UiLifecycle(): void {
  beforeEach(() => setupC05Ui())
  afterEach(() => teardownC05Ui())
}

export function heroPoses(
  mounted: MountedEditor | MountedDialog,
): Record<string, SpriteActionDef> | undefined {
  return heroOf(mounted.open.session).poses
}

export async function seedPoses(
  mounted: MountedEditor,
  poses: Record<string, SpriteActionDef>,
): Promise<void> {
  await act(async () => {
    expect(
      mounted.open.session.dispatch(
        new UpdateSpriteCommand(
          C05_SPRITE,
          { poses },
          mounted.open.proof,
          collectCurrentProjectReferenceIndex,
        ),
      ),
    ).toBe(true)
  })
  await mounted.setOptions({ selectedActionId: Object.keys(poses)[0] })
}

export function editorHost(mounted: MountedEditor | MountedDialog): HTMLElement {
  return mounted.host
}

export function searchInput(host: ParentNode): HTMLInputElement {
  const hit = host.querySelector<HTMLInputElement>('input[aria-label="搜索预制动作"]')
  expect(hit, '搜索预制动作 input').not.toBeNull()
  return hit!
}

export async function searchActions(host: ParentNode, query: string): Promise<void> {
  await typeDraft(searchInput(host), query)
}

export async function clearSearchEscape(host: ParentNode): Promise<void> {
  const input = searchInput(host)
  await act(async () => {
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
}

export function listOptions(host: ParentNode): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>('[role="option"]')]
}

export async function pickActionOption(host: ParentNode, needle: string): Promise<void> {
  const option = listOptions(host).find((candidate) => candidate.textContent?.includes(needle))
  expect(option, `动作选项 ${needle}`).toBeDefined()
  await act(async () => {
    option!.click()
  })
}

export async function renameAction(host: ParentNode, name: string): Promise<void> {
  await fillAndBlur(controlByLabel(host, '名称'), name)
}

export async function openC05Editor(
  name: string,
  poses?: Record<string, SpriteActionDef>,
): Promise<MountedEditor> {
  const open = await openC05(name, poses ? { poses } : {})
  return mountActionEditor(open, { selectedActionId: poses ? Object.keys(poses)[0] : undefined })
}

export async function openC05Dialog(
  name: string,
  options: Parameters<typeof mountActionDialog>[1] = {},
): Promise<MountedDialog> {
  const open = await openC05(name, {})
  return mountActionDialog(open, options)
}

export async function cleanupEditor(mounted: MountedEditor | undefined): Promise<void> {
  if (mounted) await unmountActionEditor(mounted)
}

export async function cleanupDialog(mounted: MountedDialog | undefined): Promise<void> {
  if (mounted) await unmountActionDialog(mounted)
}

export async function undo(mounted: MountedEditor): Promise<void> {
  await act(async () => {
    expect(mounted.open.session.undo()).toBe(true)
  })
}

export function dialogPrimary(host: ParentNode, label: string): HTMLButtonElement {
  return buttonByText(host, label)
}

export async function clickDialogButton(host: ParentNode, label: string): Promise<void> {
  await clickButtonByText(host, label)
}

export function sourceFrameButton(host: ParentNode, index: number): HTMLButtonElement {
  const hit = host.querySelector<HTMLButtonElement>(`[data-source-frame-index="${index}"]`)
  expect(hit, `源帧 ${index}`).not.toBeNull()
  return hit!
}

export async function pressOnFrame(host: ParentNode, index: number, key: string): Promise<void> {
  const button = sourceFrameButton(host, index)
  await act(async () => {
    button.focus()
    button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}
