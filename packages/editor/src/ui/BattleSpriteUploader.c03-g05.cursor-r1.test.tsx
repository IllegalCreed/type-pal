// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C03-G05：BattleSpriteUploader 真实解码/量化/应用。
 * 排重：BattleSpriteUploader.glm-next-wave 已证缺省猜测、整除失败与取消零提交（mock 宿主）；
 * 本组经 cursor-asset-r1 真实 PNG 端口补：多行图集、色盘迟到/失败、应用锁、
 * 重选清错、帧尺寸变更、坏文件与 assetBase 切换。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  atlasColors,
  installBrowserHardwarePorts,
  pngFileOf,
  solidAtlasPng,
} from '../__tests__/cursor-asset-r1/image-ports.js'
import {
  type LegalProject,
  loadLegalProject,
  typeDraft,
  useActEnvironment,
} from '../__tests__/cursor-asset-r1/kit.js'
import {
  type MountedUploader,
  mountUploader,
  unmountHost,
} from '../__tests__/cursor-asset-r1/upload-harness.js'
import {
  atlasFile,
  failingPalette,
  gatePalette,
  gridAtlasPng,
  installGatedCompressPort,
} from '../__tests__/cursor-asset-r1/upload-ports.js'
import {
  bsuButton,
  bsuNumber,
  bsuPick,
  bsuSummary,
  bsuThumbs,
} from '../__tests__/cursor-asset-r1/upload-ui.js'

let project: LegalProject
let mounted: MountedUploader | undefined

beforeEach(async () => {
  useActEnvironment()
  await installBrowserHardwarePorts()
  project = await loadLegalProject('c03-g05')
})

afterEach(async () => {
  if (mounted) await unmountHost(mounted)
  mounted = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C03-G05 战斗精灵上传叶', () => {
  function m(): MountedUploader {
    if (!mounted) throw new Error('uploader not mounted')
    return mounted
  }

  test('C03-G05-01 横排 3 帧：缺省帧尺寸猜测、预览数与应用 gzip 帧带', async () => {
    mounted = await mountUploader(project.assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(3))
    await bsuPick(m().host, pngFileOf('row.png', atlas.bytes))
    await vi.waitFor(() => expect(bsuSummary(m().host)).toBe('共 3 帧（横排逐行切）'))
    expect(bsuNumber(m().host, '战斗精灵帧宽').value).toBe('16')
    expect(bsuThumbs(m().host)).toBe(3)
    await act(async () => bsuButton(m().host, '应用外观')!.click())
    await vi.waitFor(() => expect(m().applies).toHaveLength(1))
    expect(m().applies[0]!.frameCount).toBe(3)
    expect(m().applies[0]!.blob.byteLength).toBeGreaterThan(0)
  })

  test('C03-G05-02 2×2 网格图：16×16 帧切 4 帧', async () => {
    mounted = await mountUploader(project.assetBase)
    const atlas = gridAtlasPng(2, 2, 16, 16, atlasColors(4))
    await bsuPick(m().host, atlasFile('grid.png', atlas))
    await typeDraft(bsuNumber(m().host, '战斗精灵帧宽'), '16')
    await typeDraft(bsuNumber(m().host, '战斗精灵帧高'), '16')
    await vi.waitFor(() => expect(bsuSummary(m().host)).toBe('共 4 帧（横排逐行切）'))
    expect(bsuThumbs(m().host)).toBe(4)
  })

  test('C03-G05-03 整除破坏：精确文案、预览消失且应用禁用', async () => {
    mounted = await mountUploader(project.assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(3))
    await bsuPick(m().host, pngFileOf('row.png', atlas.bytes))
    await vi.waitFor(() => expect(bsuSummary(m().host)).toBe('共 3 帧（横排逐行切）'))
    await typeDraft(bsuNumber(m().host, '战斗精灵帧宽'), '10')
    expect(bsuSummary(m().host)).toBe('图 48×16 切不开（宽高须整除）')
    expect(bsuButton(m().host, '应用外观')!.disabled).toBe(true)
    expect(bsuThumbs(m().host)).toBe(0)
  })

  test('C03-G05-04 取消零提交；有预览时也不触发 onApply', async () => {
    mounted = await mountUploader(project.assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(2))
    await bsuPick(m().host, pngFileOf('pair.png', atlas.bytes))
    await vi.waitFor(() => expect(bsuThumbs(m().host)).toBe(2))
    await act(async () => bsuButton(m().host, '取消')!.click())
    expect(mounted.cancels).toHaveLength(1)
    expect(m().applies).toEqual([])
  })

  test('C03-G05-05 色盘迟到：预览空白，放行后出现缩略图并可应用', async () => {
    const { assetBase, hold } = gatePalette(project.assetBase)
    mounted = await mountUploader(assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(1))
    await bsuPick(m().host, pngFileOf('late.png', atlas.bytes))
    expect(bsuThumbs(m().host)).toBe(0)
    await act(async () => {
      hold.resolve()
      await Promise.resolve()
    })
    await vi.waitFor(() => expect(bsuThumbs(m().host)).toBe(1))
    await act(async () => bsuButton(m().host, '应用外观')!.click())
    await vi.waitFor(() => expect(m().applies).toHaveLength(1))
  })

  test('C03-G05-06 色盘失败回显 err；换合法 assetBase 并重选后可应用', async () => {
    const broken = failingPalette(project.assetBase, 'bsu-palette-down')
    mounted = await mountUploader(broken)
    await vi.waitFor(() => {
      expect(mounted!.host.querySelector('.bsu .err')?.textContent).toBe('bsu-palette-down')
    })
    await mounted.setAssetBase(project.assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(1))
    await bsuPick(m().host, pngFileOf('ok.png', atlas.bytes))
    await vi.waitFor(() => expect(mounted!.host.querySelector('.bsu .err')).toBeNull())
    await vi.waitFor(() => expect(bsuThumbs(m().host)).toBe(1))
    await act(async () => bsuButton(m().host, '应用外观')!.click())
    await vi.waitFor(() => expect(m().applies).toHaveLength(1))
  })

  test('C03-G05-07 应用在途：compress 扣留期间按钮禁用且最终只 apply 一次', async () => {
    const gate = installGatedCompressPort()
    mounted = await mountUploader(project.assetBase)
    const atlas = solidAtlasPng(16, 16, atlasColors(1))
    await bsuPick(m().host, pngFileOf('one.png', atlas.bytes))
    await vi.waitFor(() => expect(bsuThumbs(m().host)).toBe(1))
    const apply = bsuButton(m().host, '应用外观')!
    await act(async () => apply.click())
    await vi.waitFor(() => expect(apply.disabled).toBe(true))
    expect(bsuButton(m().host, '取消')!.disabled).toBe(true)
    expect(m().applies).toHaveLength(0)
    gate.hold.resolve()
    await vi.waitFor(() => expect(m().applies).toHaveLength(1))
    gate.restore()
  })

  test('C03-G05-08 坏文件字节：err 回显且无预览网格', async () => {
    mounted = await mountUploader(project.assetBase)
    await bsuPick(m().host, pngFileOf('bad.png', new Uint8Array([1, 2, 3])))
    await vi.waitFor(() => expect(m().host.querySelector('.bsu .err')).not.toBeNull())
    expect(bsuThumbs(m().host)).toBe(0)
  })

  test('C03-G05-09 合法预览后重选坏文件：err 回显且仍可取消零提交', async () => {
    mounted = await mountUploader(project.assetBase)
    const good = solidAtlasPng(16, 16, atlasColors(1))
    await bsuPick(m().host, pngFileOf('good.png', good.bytes))
    await vi.waitFor(() => expect(bsuThumbs(m().host)).toBe(1))
    await bsuPick(m().host, pngFileOf('bad.png', new Uint8Array([0])))
    await vi.waitFor(() => expect(m().host.querySelector('.bsu .err')).not.toBeNull())
    await act(async () => bsuButton(m().host, '取消')!.click())
    expect(m().applies).toEqual([])
  })

  test('C03-G05-10 onApply 拒绝：err 回显且提交门复位可再点', async () => {
    mounted = await mountUploader(project.assetBase, async () => {
      throw new Error('apply-rejected')
    })
    const atlas = solidAtlasPng(16, 16, atlasColors(1))
    await bsuPick(m().host, pngFileOf('one.png', atlas.bytes))
    await vi.waitFor(() => expect(bsuThumbs(m().host)).toBe(1))
    await act(async () => bsuButton(m().host, '应用外观')!.click())
    await vi.waitFor(() => {
      expect(m().host.querySelector('.bsu .err')?.textContent).toBe('apply-rejected')
    })
    expect(bsuButton(m().host, '应用外观')!.disabled).toBe(false)
    expect(m().applies).toHaveLength(1)
  })
})
