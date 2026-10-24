import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import { getLanguage, setLanguage } from '../localization/language.js'
import { setupToolsPanel } from './tools-panel.js'
import { useToolsPanelTestHost } from './tools-panel.test-fixtures.js'

const makeDeps = useToolsPanelTestHost()
let download: MockInstance<() => void>
let downloads: { name: string; href: string }[]
let previousLayout: string | undefined
let previousLanguage: ReturnType<typeof getLanguage>
const createUrl = vi.fn<(blob: Blob) => string>(() => 'blob:owned-save-export')
const revokeUrl = vi.fn<(url: string) => void>()

beforeEach(() => {
  previousLayout = document.documentElement.dataset.tpLayout
  previousLanguage = getLanguage()
  document.documentElement.dataset.tpLayout = 'desktop'
  setLanguage('zh-CN')
  downloads = []
  download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({ name: this.download, href: this.href })
  })
  createUrl.mockClear()
  revokeUrl.mockClear()
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = createUrl
      static override revokeObjectURL = revokeUrl
    },
  )
})
afterEach(() => {
  download.mockRestore()
  vi.unstubAllGlobals()
  setLanguage(previousLanguage)
  if (previousLayout === undefined) delete document.documentElement.dataset.tpLayout
  else document.documentElement.dataset.tpLayout = previousLayout
})

function exportSlot(slot: number): void {
  document.getElementById('tp-tools-launcher')!.click()
  document.querySelector<HTMLButtonElement>('.tp-tab[data-key="system"]')!.click()
  document.querySelectorAll('.tp-save-row')[slot - 1]!.querySelector('button')!.click()
}

describe('tools-panel 导出动作的 IO 失败边界', () => {
  it('读取存档拒绝时显示原因，不创建下载或成功提示', async () => {
    setupToolsPanel(
      makeDeps({
        loadSlot: async () => {
          throw new DOMException('浏览器禁止读取存档', 'SecurityError')
        },
      }),
    )
    exportSlot(1)
    await vi.waitFor(() => {
      expect(document.querySelector('.tp-toast-error')?.textContent).toBe(
        '✗ 导出失败:浏览器禁止读取存档',
      )
    })
    expect(document.querySelector('.tp-toast-success')).toBeNull()
    expect(download).not.toHaveBeenCalled()
    expect(createUrl).not.toHaveBeenCalled()
    expect(revokeUrl).not.toHaveBeenCalled()
  })

  it('空槽保留已有提示，不下载', async () => {
    setLanguage('en')
    setupToolsPanel(makeDeps())
    exportSlot(3)
    await vi.waitFor(() => {
      expect(document.querySelector('.tp-toast-error')?.textContent).toBe('✗ Slot 3 is empty')
    })
    expect(document.querySelector('.tp-toast-success')).toBeNull()
    expect(download).not.toHaveBeenCalled()
    expect(createUrl).not.toHaveBeenCalled()
    expect(revokeUrl).not.toHaveBeenCalled()
  })

  it('下载实际 V1 内容到所选槽位的文件名，释放 URL 后提示成功', async () => {
    const gs = createInitialGameState({ x: 160, y: 80, facing: 'left' })
    gs.wNumScene = 7
    gs.dwCash = 87
    gs.inventory = [{ itemId: 61, count: 3 }]
    const loadSlot = vi.fn(async () => gs)
    setupToolsPanel(makeDeps({ loadSlot }))
    exportSlot(2)
    await vi.waitFor(() => {
      expect(document.querySelector('.tp-toast-success')?.textContent).toBe('✓ 已导出存档位 2')
    })
    expect(loadSlot).toHaveBeenCalledExactlyOnceWith(2)
    expect(download).toHaveBeenCalledTimes(1)
    expect(downloads).toEqual([
      { name: 'type-pal-save-slot2.json', href: 'blob:owned-save-export' },
    ])
    expect(createUrl).toHaveBeenCalledTimes(1)
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:owned-save-export')
    expect(document.querySelector('.tp-toast-error')).toBeNull()
    const blob = createUrl.mock.calls[0]![0]
    expect(blob.type).toBe('application/json')
    const reader = new FileReader()
    reader.readAsText(blob)
    await vi.waitFor(() => expect(reader.readyState).toBe(FileReader.DONE))
    expect(reader.error).toBeNull()
    const text = String(reader.result)
    expect(JSON.parse(text)).toMatchObject({
      format: 'type-pal-save',
      version: 1,
      savedAt: 0,
      gs: {
        wNumScene: 7,
        dwCash: 87,
        party: { x: 160, y: 80, facing: 'left' },
        inventory: [{ itemId: 61, count: 3 }],
      },
    })
  })

  it('下载动作抛错时仍释放已创建的 URL，只提示失败', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    download.mockImplementation(() => {
      throw new Error('下载被阻止')
    })
    setupToolsPanel(makeDeps({ loadSlot: async () => gs }))
    exportSlot(5)
    await vi.waitFor(() => {
      expect(document.querySelector('.tp-toast-error')?.textContent).toBe('✗ 导出失败:下载被阻止')
    })
    expect(download).toHaveBeenCalledTimes(1)
    expect(createUrl).toHaveBeenCalledTimes(1)
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:owned-save-export')
    expect(document.querySelector('.tp-toast-success')).toBeNull()
  })
})
