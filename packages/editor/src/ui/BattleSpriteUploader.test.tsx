// @vitest-environment jsdom
/** Source image read, frame cutting, and the upload handoff. */
import { decompressGzip, loadStandardPalette, parseSpriteChunkStrict } from '@type-pal/reforge'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type MountedUploader, mountUploader } from '../__tests__/battle-sprite-import-test-host.js'
import {
  atlasColors,
  installBrowserHardwarePorts,
  pngFileOf,
  solidAtlasPng,
} from '../__tests__/cursor-asset-r1/image-ports.js'
import {
  type LegalProject,
  loadFilesIntoInput,
  loadLegalProject,
  typeDraft,
} from '../__tests__/cursor-asset-r1/kit.js'
import { atlasFile, gridAtlasPng } from '../__tests__/png-fixtures.js'
import { unmountHost } from '../__tests__/react-host-cleanup.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import {
  failingPalette,
  gatePalette,
  installGatedBitmapPort,
  installGatedCompressPort,
} from '../__tests__/sprite-import-test-ports.js'

function bsuPicker(host: ParentNode): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>('input[aria-label="选择战斗精灵图片"]')
  expect(input, 'bsu picker').not.toBeNull()
  return input!
}

async function bsuPick(host: ParentNode, file: File): Promise<void> {
  await loadFilesIntoInput(bsuPicker(host), [file])
}

function bsuSummary(host: ParentNode): string {
  return host.querySelector('.bsu-frame-summary')?.textContent ?? ''
}

function bsuNumber(host: ParentNode, label: '战斗精灵帧宽' | '战斗精灵帧高'): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  expect(input, label).not.toBeNull()
  return input!
}

function bsuButton(host: ParentNode, text: string): HTMLButtonElement | undefined {
  return [...host.querySelectorAll<HTMLButtonElement>('.bsu-actions button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
}

function bsuThumbs(host: ParentNode): number {
  return host.querySelectorAll('.bsu-frame-grid .tile-cell').length
}

let project: LegalProject
let mounted: MountedUploader | undefined
let restoreAct: () => void

beforeEach(async () => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  project = await loadLegalProject('battle-sprite-uploader')
})

afterEach(async () => {
  try {
    if (mounted) await unmountHost(mounted)
  } finally {
    mounted = undefined
    restoreAct()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})

describe('战斗精灵上传', () => {
  function m(): MountedUploader {
    if (!mounted) throw new Error('uploader not mounted')
    return mounted
  }

  test('横排 3 帧：缺省帧尺寸猜测、预览数与应用 gzip 帧带', async () => {
    mounted = await mountUploader(project.assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(3))
    await bsuPick(m().host, pngFileOf('row.png', atlas.bytes))
    await waitForReact(() => expect(bsuSummary(m().host)).toBe('共 3 帧（横排逐行切）'))
    expect(bsuNumber(m().host, '战斗精灵帧宽').value).toBe('16')
    expect(bsuThumbs(m().host)).toBe(3)
    await act(async () => bsuButton(m().host, '应用外观')!.click())
    await waitForReact(() => expect(m().applies).toHaveLength(1))
    const applied = m().applies[0]
    if (!applied) throw new Error('The decoded frames were not handed off')
    const frames = parseSpriteChunkStrict(await decompressGzip(new Blob([applied.blob])))
    const { colors } = await loadStandardPalette(project.assetBase)
    expect(applied.frameCount).toBe(3)
    expect(frames.map(({ width, height }) => [width, height])).toEqual([
      [16, 16],
      [16, 16],
      [16, 16],
    ])
    expect(frames.map((frame) => colors[frame.pixels[0] ?? 0])).toEqual([
      [200, 84, 68],
      [104, 158, 74],
      [74, 108, 176],
    ])
    for (const frame of frames) expect(frame.opaque.every((alpha) => alpha === 1)).toBe(true)
  })

  test('2×2 网格图：16×16 帧切 4 帧', async () => {
    mounted = await mountUploader(project.assetBase)
    const atlas = gridAtlasPng(2, 2, 16, 16, atlasColors(4))
    await bsuPick(m().host, atlasFile('grid.png', atlas))
    await typeDraft(bsuNumber(m().host, '战斗精灵帧宽'), '16')
    await typeDraft(bsuNumber(m().host, '战斗精灵帧高'), '16')
    await waitForReact(() => expect(bsuSummary(m().host)).toBe('共 4 帧（横排逐行切）'))
    expect(bsuThumbs(m().host)).toBe(4)
  })

  test('整除破坏：精确文案、预览消失且应用禁用', async () => {
    mounted = await mountUploader(project.assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(3))
    await bsuPick(m().host, pngFileOf('row.png', atlas.bytes))
    await waitForReact(() => expect(bsuSummary(m().host)).toBe('共 3 帧（横排逐行切）'))
    await typeDraft(bsuNumber(m().host, '战斗精灵帧宽'), '10')
    expect(bsuSummary(m().host)).toBe('图 48×16 切不开（宽高须整除）')
    expect(bsuButton(m().host, '应用外观')!.disabled).toBe(true)
    expect(bsuThumbs(m().host)).toBe(0)
  })

  test('取消零提交；有预览时也不触发 onApply', async () => {
    mounted = await mountUploader(project.assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(2))
    await bsuPick(m().host, pngFileOf('pair.png', atlas.bytes))
    await waitForReact(() => expect(bsuThumbs(m().host)).toBe(2))
    await act(async () => bsuButton(m().host, '取消')!.click())
    expect(mounted.cancels).toHaveLength(1)
    expect(m().applies).toEqual([])
  })

  test('色盘迟到：预览空白，放行后出现缩略图并可应用', async () => {
    const { assetBase, hold } = gatePalette(project.assetBase)
    mounted = await mountUploader(assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(1))
    await bsuPick(m().host, pngFileOf('late.png', atlas.bytes))
    expect(bsuThumbs(m().host)).toBe(0)
    await act(async () => {
      hold.resolve()
      await Promise.resolve()
    })
    await waitForReact(() => expect(bsuThumbs(m().host)).toBe(1))
    await act(async () => bsuButton(m().host, '应用外观')!.click())
    await waitForReact(() => expect(m().applies).toHaveLength(1))
  })

  test('色盘失败回显 err；换合法 assetBase 并重选后可应用', async () => {
    const broken = failingPalette(project.assetBase, 'bsu-palette-down')
    mounted = await mountUploader(broken)
    await waitForReact(() => {
      expect(mounted!.host.querySelector('.bsu .err')?.textContent).toBe('bsu-palette-down')
    })
    await mounted.setAssetBase(project.assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(1))
    await bsuPick(m().host, pngFileOf('ok.png', atlas.bytes))
    await waitForReact(() => expect(mounted!.host.querySelector('.bsu .err')).toBeNull())
    await waitForReact(() => expect(bsuThumbs(m().host)).toBe(1))
    await act(async () => bsuButton(m().host, '应用外观')!.click())
    await waitForReact(() => expect(m().applies).toHaveLength(1))
  })

  test('应用在途：compress 扣留期间按钮禁用且最终只 apply 一次', async () => {
    const gate = installGatedCompressPort()
    mounted = await mountUploader(project.assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(1))
    await bsuPick(m().host, pngFileOf('one.png', atlas.bytes))
    await waitForReact(() => expect(bsuThumbs(m().host)).toBe(1))
    const apply = bsuButton(m().host, '应用外观')!
    try {
      await act(async () => apply.click())
      await waitForReact(() => expect(apply.disabled).toBe(true))
      expect(bsuButton(m().host, '取消')!.disabled).toBe(true)
      expect(m().applies).toHaveLength(0)
      gate.hold.resolve()
      await waitForReact(() => expect(m().applies).toHaveLength(1))
    } finally {
      gate.hold.resolve()
      gate.restore()
    }
  })

  test('坏文件字节：err 回显且无预览网格', async () => {
    mounted = await mountUploader(project.assetBase)
    await bsuPick(m().host, pngFileOf('bad.png', new Uint8Array([1, 2, 3])))
    await waitForReact(() => expect(m().host.querySelector('.bsu .err')).not.toBeNull())
    expect(bsuThumbs(m().host)).toBe(0)
  })

  test('最后选择的图片解码失败时，不能应用前一次预览', async () => {
    mounted = await mountUploader(project.assetBase)
    const good = solidAtlasPng(16, 16, atlasColors(1))
    await bsuPick(m().host, pngFileOf('good.png', good.bytes))
    await waitForReact(() => expect(bsuThumbs(m().host)).toBe(1))
    await bsuPick(m().host, pngFileOf('bad.png', new Uint8Array([0])))
    await waitForReact(() => expect(m().host.querySelector('.bsu .err')).not.toBeNull())
    expect(bsuThumbs(m().host)).toBe(0)
    expect(bsuButton(m().host, '应用外观')).toBeUndefined()
    await act(async () => bsuButton(m().host, '取消')!.click())
    expect(m().applies).toEqual([])
  })

  test('先选的图片迟到时，应用仍交付最后选择的帧带', async () => {
    const bitmaps = installGatedBitmapPort()
    const hold = bitmaps.gate('first.png')
    mounted = await mountUploader(project.assetBase)
    const first = solidAtlasPng(8, 8, atlasColors(1))
    const latest = solidAtlasPng(12, 12, atlasColors(2))
    try {
      await bsuPick(m().host, pngFileOf('first.png', first.bytes))
      expect(bitmaps.started).toContain('first.png')
      expect(bitmaps.decoded).not.toContain('first.png')
      await bsuPick(m().host, pngFileOf('latest.png', latest.bytes))
      await waitForReact(() => expect(bsuThumbs(m().host)).toBe(2))

      await act(async () => {
        hold.resolve()
        await vi.waitFor(() => expect(bitmaps.closes('first.png')).toBe(1))
      })
      await act(async () => bsuButton(m().host, '应用外观')!.click())
      await waitForReact(() => expect(m().applies).toHaveLength(1))
      const [applied] = m().applies
      if (!applied) throw new Error('No frame source was handed off')
      const frames = parseSpriteChunkStrict(await decompressGzip(new Blob([applied.blob])))
      expect(frames.map(({ width, height }) => [width, height])).toEqual([
        [12, 12],
        [12, 12],
      ])
    } finally {
      hold.resolve()
    }
  })

  test('onApply 拒绝：err 回显且提交门复位可再点', async () => {
    mounted = await mountUploader(project.assetBase, async () => {
      throw new Error('apply-rejected')
    })
    const atlas = solidAtlasPng(16, 16, atlasColors(1))
    await bsuPick(m().host, pngFileOf('one.png', atlas.bytes))
    await waitForReact(() => expect(bsuThumbs(m().host)).toBe(1))
    await act(async () => bsuButton(m().host, '应用外观')!.click())
    await waitForReact(() => {
      expect(m().host.querySelector('.bsu .err')?.textContent).toBe('apply-rejected')
    })
    expect(bsuButton(m().host, '应用外观')!.disabled).toBe(false)
    expect(m().applies).toHaveLength(1)
  })
})
