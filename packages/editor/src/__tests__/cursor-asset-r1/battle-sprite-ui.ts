/**
 * C02 BattleSpriteLibrary 驱动助手：只经公开 DOM（aria/文本/类名）操作，等价真实用户。
 * 不读私有 state，不改产品代码。
 */
import { act } from 'react'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import {
  type CursorBattleProject,
  type CursorBattleSpec,
  enemyProfile,
  loadCursorBattleProject,
  playerProfile,
} from './battle-sprite-fixtures.js'
import {
  type MountedBattleSpriteLibrary,
  mountBattleSpriteLibrary,
  unmountBattleSpriteLibrary,
} from './battle-sprite-harness.js'
import { installBrowserHardwarePorts } from './image-ports.js'
import {
  buttonByText,
  clickButtonByText,
  loadFilesIntoInput,
  typeDraft,
  useActEnvironment,
} from './kit.js'

export const A_SHARED = 'battle-sprite.authored.c02-shared'
export const A_ENEMY = 'battle-sprite.authored.c02-enemy'
export const A_IDLE = 'battle-sprite.authored.c02-idle'
export const A_SPARE = 'battle-sprite.authored.c02-spare'
export const A_SUMMON = 'battle-sprite.authored.c02-summon'
export const A_STARTER = 'battle-sprite.generated.starter'

/** 标准多资产项目：共享双用途 / 敌人 / 两个未使用 / 召唤；加 blank 自带 starter。 */
export const STANDARD_SPECS: readonly CursorBattleSpec[] = [
  {
    asset: A_SHARED,
    label: 'C02共享',
    frameCount: 12,
    colorOffset: 0,
    definitions: [
      { id: 'shared-fighter-a', label: '甲战士', profile: playerProfile() },
      { id: 'shared-fighter-b', label: '乙战士', profile: playerProfile({ hurt: 3 }) },
    ],
  },
  {
    asset: A_ENEMY,
    label: 'C02敌人',
    frameCount: 6,
    colorOffset: 3,
    definitions: [{ id: 'enemy-red', label: '赤鬼', profile: enemyProfile(2, 1, 3) }],
  },
  { asset: A_IDLE, label: 'C02闲置', frameCount: 4, colorOffset: 6, definitions: [] },
  { asset: A_SPARE, label: 'C02备用', frameCount: 3, colorOffset: 9, definitions: [] },
  {
    asset: A_SUMMON,
    label: 'C02召唤',
    frameCount: 5,
    colorOffset: 11,
    definitions: [{ id: 'summon-fox', label: '狐火', profile: { kind: 'summon' } }],
  },
]

export function catalogMetas(host: HTMLElement): string[] {
  return [...host.querySelectorAll('.sprite-resource-row .ds-catalog-row__meta')].map(
    (node) => node.textContent ?? '',
  )
}

export function catalogRow(host: HTMLElement, asset: string): HTMLElement | undefined {
  return [...host.querySelectorAll<HTMLElement>('.sprite-resource-row')].find(
    (candidate) => candidate.querySelector('.ds-catalog-row__meta')?.textContent === asset,
  )
}

export function selectedCatalogAsset(host: HTMLElement): string | undefined {
  return host
    .querySelector('.sprite-resource-row[aria-pressed="true"] .ds-catalog-row__meta')
    ?.textContent?.trim()
}

export async function waitProof(host: HTMLElement, frames: number, consumers: number) {
  await vi.waitFor(() => {
    expect(host.textContent).toContain(`${frames} 帧 · ${consumers} 个用途定义`)
  })
}

export async function selectAssetRow(host: HTMLElement, asset: string): Promise<void> {
  await vi.waitFor(() => {
    const row = catalogRow(host, asset)
    expect(row, `目录行 ${asset}`).toBeDefined()
    row!.click()
  })
  await act(async () => Promise.resolve())
}

export function usageNameInput(host: HTMLElement): HTMLInputElement | null {
  return host.querySelector<HTMLInputElement>('#battle-sprite-usage-name')
}

export async function renameUsage(host: HTMLElement, label: string): Promise<void> {
  const input = usageNameInput(host)
  expect(input, 'usage name input').not.toBeNull()
  await typeDraft(input!, label)
}

export function applyButton(host: HTMLElement): HTMLButtonElement {
  return buttonByText(host, '应用修改')
}

export function deleteUsageButton(host: HTMLElement): HTMLButtonElement | undefined {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === '删除用途',
  )
}

export function deleteAssetButton(host: HTMLElement): HTMLButtonElement | undefined {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === '删除源文件',
  )
}

export async function openTab(host: HTMLElement, name: string | RegExp): Promise<void> {
  const tab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((candidate) =>
    typeof name === 'string'
      ? candidate.textContent?.trim() === name
      : name.test(candidate.textContent?.trim() ?? ''),
  )
  expect(tab, `tab ${String(name)}`).toBeDefined()
  await act(async () => tab!.click())
}

export async function chooseActionRow(host: HTMLElement, label: string): Promise<void> {
  const row = [
    ...host.querySelectorAll<HTMLElement>('[aria-label="动作列表"] .ds-catalog-row'),
  ].find((candidate) => candidate.textContent?.includes(label))
  expect(row, `动作行 ${label}`).toBeDefined()
  await act(async () => row!.click())
}

export function stageItems(host: HTMLElement): HTMLLIElement[] {
  return [...host.querySelectorAll<HTMLLIElement>('.battle-action-stage-list > li')]
}

export function stageByLabel(host: HTMLElement, label: string): HTMLLIElement {
  const hit = stageItems(host).find((item) => item.textContent?.includes(label))
  expect(hit, `阶段 ${label}`).toBeDefined()
  return hit!
}

export function noticeErrors(
  notices: ReadonlyArray<{ kind: string; message: string } | undefined>,
) {
  return notices.filter((notice) => notice?.kind === 'error').map((notice) => notice!.message)
}

export { buttonByText, clickButtonByText }

/** 每个测试文件一次调用：注册 act 环境/硬件端口/清理，返回受管挂载入口。 */
export function setupBattleSuite() {
  let mounted: MountedBattleSpriteLibrary | undefined
  beforeEach(() => {
    useActEnvironment()
    installBrowserHardwarePorts()
  })
  afterEach(async () => {
    if (mounted) await unmountBattleSpriteLibrary(mounted)
    mounted = undefined
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
  return {
    async mount(
      name: string,
      input: Parameters<typeof mountBattleSpriteLibrary>[1] = {},
      specs: readonly CursorBattleSpec[] = STANDARD_SPECS,
    ): Promise<MountedBattleSpriteLibrary> {
      const project = await loadCursorBattleProject(name, specs)
      mounted = await mountBattleSpriteLibrary(project, input)
      return mounted
    },
    async mountProject(
      project: CursorBattleProject,
      input: Parameters<typeof mountBattleSpriteLibrary>[1] = {},
    ): Promise<MountedBattleSpriteLibrary> {
      mounted = await mountBattleSpriteLibrary(project, input)
      return mounted
    },
  }
}

export function sourceFrameButton(host: HTMLElement, index: number): HTMLButtonElement {
  const hit = host.querySelector<HTMLButtonElement>(`[data-source-frame-index="${index}"]`)
  expect(hit, `源帧 #${index}`).not.toBeNull()
  return hit!
}

export async function selectSourceFrame(host: HTMLElement, index: number): Promise<void> {
  await vi.waitFor(() => {
    expect(host.querySelector(`[data-source-frame-index="${index}"]`)).not.toBeNull()
  })
  await act(async () => sourceFrameButton(host, index).click())
}

export function rawEditorMessage(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>('.sprite-raw-editor-message')
}

export async function waitRawMessage(host: HTMLElement): Promise<HTMLElement> {
  await vi.waitFor(() => {
    expect(rawEditorMessage(host)).not.toBeNull()
  })
  return rawEditorMessage(host)!
}

export function uploaderPicker(host: HTMLElement): HTMLInputElement {
  const picker = host.querySelector<HTMLInputElement>('input[aria-label="选择战斗精灵图片"]')
  expect(picker, '战斗精灵图片选择器').not.toBeNull()
  return picker!
}

export async function openImportPanel(host: HTMLElement): Promise<void> {
  await clickButtonByText(host, '导入战斗精灵')
  await vi.waitFor(() => {
    expect(host.querySelector('.battle-sprite-upload-panel')).not.toBeNull()
  })
}

export async function pickImportFile(host: HTMLElement, file: File): Promise<void> {
  await loadFilesIntoInput(uploaderPicker(host), [file])
}

export async function pressKey(target: Element, key: string): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  await act(async () => {
    target.dispatchEvent(event)
  })
  return event
}

export function catalogList(host: HTMLElement): HTMLElement {
  const list = host.querySelector<HTMLElement>('[role="list"][aria-label="战斗精灵目录"]')
  expect(list, '战斗精灵目录').not.toBeNull()
  return list!
}

export function heroTitle(host: HTMLElement): string {
  return host.querySelector('.ds-object-hero__title')?.textContent ?? ''
}
