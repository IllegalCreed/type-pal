/** L23：两路清单同时失败，各自记录完整诊断并返回空 map；单侧与 PNG 合同见 G02-D/G4。 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadDialogAssets } from './dialog-assets.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('L23 loadDialogAssets 全链路（fetch 全隔离）', () => {
  it('两路清单均失败时，返回两个空 map 并分别报告原因', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/extracted/data/portraits.json') return new Response(null, { status: 503 })
      if (url === '/extracted/data/dialog-icons-raw.json')
        return new Response(null, { status: 404 })
      throw new Error(`unmocked ${url}`)
    })
    const assets = await loadDialogAssets()
    expect(assets.portraitFrames.size).toBe(0)
    expect(assets.iconFrames.size).toBe(0)
    expect(
      Array.from(warn.mock.calls).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    ).toStrictEqual([
      [
        '[dialog-assets] icons failed, skip:',
        new Error('dialog-assets: dialog-icons-raw.json fetch failed (404)'),
      ],
      [
        '[dialog-assets] portraits failed, skip:',
        new Error('dialog-assets: portraits.json fetch failed (503)'),
      ],
    ])
  })
})
