// @vitest-environment jsdom
/** Imported pixels and layout contracts for source frames and their initial uses. */
import type { Palette } from '@type-pal/reforge'
import { loadStandardPalette, quantizeToRleFrame } from '@type-pal/reforge'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { atlasColors } from '../__tests__/cursor-asset-r1/image-ports.js'
import { type LegalProject, loadLegalProject } from '../__tests__/cursor-asset-r1/kit.js'
import { atlasFile, gridAtlasPng, solidRgba } from '../__tests__/png-fixtures.js'
import { unmountHost } from '../__tests__/react-host-cleanup.js'
import { installReactActEnvironment } from '../__tests__/react-io-wait.js'
import { installGatedBitmapPort } from '../__tests__/sprite-import-test-ports.js'
import {
  waitDone,
  wizardChooseKind,
  wizardClickSubmit,
  wizardError,
  wizardField,
  wizardPick,
  wizardReadout,
  wizardSetNumber,
  wizardSetText,
  wizardSubmit,
  wizardThumbCount,
  wizardWaitDecoded,
  wizardWaitReady,
} from '../__tests__/world-sprite-import-gestures.js'
import { type MountedWizard, mountWizard } from '../__tests__/world-sprite-import-test-host.js'
import { decodePendingWorldSprite } from '../__tests__/world-sprite-project.js'

let project: LegalProject
let palette: Palette
let mounted: MountedWizard | undefined
let restoreAct: () => void

beforeAll(async () => {
  installGatedBitmapPort()
  project = await loadLegalProject('world-sprite-import-layouts')
  palette = await loadStandardPalette(project.assetBase)
  vi.unstubAllGlobals()
})

beforeEach(async () => {
  restoreAct = installReactActEnvironment()
  installGatedBitmapPort()
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

describe('大世界精灵导入和初始用途', () => {
  test('四向 3×4：切帧读数 12 帧、入库帧按行优先逐格等于独立量化期望', async () => {
    const colors = atlasColors(12)
    const atlas = gridAtlasPng(3, 4, 8, 8, colors)
    mounted = await mountWizard(project)
    await wizardPick(mounted.host, atlasFile('walk-sheet.png', atlas))
    await wizardWaitReady(mounted.host)
    expect(wizardReadout(mounted.host)).toContain('3×4 帧 · 每帧 8×8')
    expect(wizardThumbCount(mounted.host)).toBe(12)
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    expect(mounted.done).toEqual(['walk-sheet'])
    const state = mounted.scope.session.getState()
    const def = state.sprites.find((entry) => entry.id === 'walk-sheet')!
    expect(def.layout).toEqual({ kind: 'directional', framesPerDir: 3 })
    const frames = await decodePendingWorldSprite(mounted.scope.session, def.asset)
    expect(frames).toHaveLength(12)
    for (const [index, color] of colors.entries()) {
      const want = quantizeToRleFrame(solidRgba(8, 8, color), 8, 8, palette)
      expect([...frames[index]!.pixels], `帧 ${index} 像素`).toEqual([...want.pixels])
      expect([...frames[index]!.opaque], `帧 ${index} 不透明`).toEqual([...want.opaque])
    }
  })

  test('文件名派生 id/标签：大写、空格、下划线折叠为小写连字符，扩展名剥除', async () => {
    const atlas = gridAtlasPng(3, 4, 4, 4, atlasColors(12))
    mounted = await mountWizard(project)
    await wizardPick(mounted.host, atlasFile('Hero Sheet_01.PNG', atlas))
    await wizardWaitReady(mounted.host)
    expect(wizardField(mounted.host, 'sprite-upload-id').value).toBe('hero-sheet-01')
    expect(wizardField(mounted.host, 'sprite-upload-label').value).toBe('hero-sheet-01')
  })

  test('仅扩展名文件：id 回落 sprite、标签回落「新精灵」，入库标签落到定义', async () => {
    const atlas = gridAtlasPng(3, 4, 4, 4, atlasColors(12))
    mounted = await mountWizard(project)
    await wizardPick(mounted.host, atlasFile('.png', atlas))
    await wizardWaitReady(mounted.host)
    expect(wizardField(mounted.host, 'sprite-upload-id').value).toBe('sprite')
    expect(wizardField(mounted.host, 'sprite-upload-label').value).toBe('新精灵')
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    const def = mounted.scope.session.getState().sprites.find((entry) => entry.id === 'sprite')!
    expect(def.label).toBe('新精灵')
    expect(mounted.scope.session.getState().assetCatalog.assets[def.asset]?.label).toBe(
      '精灵资源 新精灵',
    )
  })

  test('默认定格 2×2 源帧：4 帧按行优先入库，布局为 static', async () => {
    const colors = atlasColors(4)
    const atlas = gridAtlasPng(2, 2, 8, 8, colors)
    mounted = await mountWizard(project)
    await wizardChooseKind(mounted.host, '默认定格')
    await wizardPick(mounted.host, atlasFile('lamp.png', atlas))
    await wizardWaitReady(mounted.host)
    await wizardSetNumber(mounted.host, 'sprite-source-cols', 2)
    await wizardSetNumber(mounted.host, 'sprite-source-rows', 2)
    expect(wizardReadout(mounted.host)).toContain('2×2 帧 · 每帧 8×8')
    expect(wizardThumbCount(mounted.host)).toBe(4)
    expect(mounted.host.textContent).toContain('初始用途仍默认显示 #0')
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    const def = mounted.scope.session.getState().sprites.find((entry) => entry.id === 'lamp')!
    expect(def.layout).toEqual({ kind: 'static' })
    const frames = await decodePendingWorldSprite(mounted.scope.session, def.asset)
    expect(frames).toHaveLength(4)
    for (const [index, color] of colors.entries())
      expect([...frames[index]!.pixels]).toEqual([
        ...quantizeToRleFrame(solidRgba(8, 8, color), 8, 8, palette).pixels,
      ])
  })

  test('四向 + 1 动作帧行：5 行 10 帧入库，布局只记 framesPerDir', async () => {
    const colors = atlasColors(10)
    const atlas = gridAtlasPng(2, 5, 8, 8, colors)
    mounted = await mountWizard(project)
    await wizardPick(mounted.host, atlasFile('mage.png', atlas))
    await wizardWaitDecoded(mounted.host)
    await wizardSetNumber(mounted.host, 'sprite-upload-frames-per-direction', 2)
    expect(wizardReadout(mounted.host)).toContain('2×4 帧 · 每帧 8×10')
    expect(wizardThumbCount(mounted.host)).toBe(8)
    await wizardSetNumber(mounted.host, 'sprite-upload-action-rows', 2)
    expect(wizardError(mounted.host)).toContain('图片尺寸无法按当前行列切分')
    expect(wizardThumbCount(mounted.host)).toBe(0)
    expect(wizardSubmit(mounted.host).disabled).toBe(true)
    await wizardSetNumber(mounted.host, 'sprite-upload-action-rows', 1)
    expect(wizardError(mounted.host)).toBeNull()
    expect(wizardReadout(mounted.host)).toContain('2×5 帧 · 每帧 8×8')
    expect(wizardThumbCount(mounted.host)).toBe(10)
    expect(mounted.host.textContent).toContain('动作1')
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    const def = mounted.scope.session.getState().sprites.find((entry) => entry.id === 'mage')!
    expect(def.layout).toEqual({ kind: 'directional', framesPerDir: 2 })
    expect(await decodePendingWorldSprite(mounted.scope.session, def.asset)).toHaveLength(10)
  })

  test('四向方向标签按行序下/左/上/右，动作行续号为动作1..K', async () => {
    const atlas = gridAtlasPng(1, 6, 8, 8, atlasColors(6))
    mounted = await mountWizard(project)
    await wizardPick(mounted.host, atlasFile('rows.png', atlas))
    await wizardWaitDecoded(mounted.host)
    await wizardSetNumber(mounted.host, 'sprite-upload-frames-per-direction', 1)
    await wizardSetNumber(mounted.host, 'sprite-upload-action-rows', 2)
    const labels = [...mounted.host.querySelectorAll('.sprite-dir-label')].map(
      (node) => node.textContent,
    )
    expect(labels).toEqual(['下', '左', '上', '右', '动作1', '动作2'])
  })

  test('透明格量化后整帧不透明位全 0；不透明格全 1', async () => {
    const colors: Array<[number, number, number, number]> = atlasColors(12)
    colors[5] = [0, 0, 0, 0]
    const atlas = gridAtlasPng(3, 4, 8, 8, colors)
    mounted = await mountWizard(project)
    await wizardPick(mounted.host, atlasFile('holes.png', atlas))
    await wizardWaitReady(mounted.host)
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    const def = mounted.scope.session.getState().sprites.find((entry) => entry.id === 'holes')!
    const frames = await decodePendingWorldSprite(mounted.scope.session, def.asset)
    expect(new Set(frames[5]!.opaque)).toEqual(new Set([0]))
    expect(new Set(frames[4]!.opaque)).toEqual(new Set([1]))
  })

  test('解码后切换用途：网格按新用途重算，缩略图数量随之变化，原图读数保留', async () => {
    const atlas = gridAtlasPng(4, 3, 8, 8, atlasColors(12))
    mounted = await mountWizard(project)
    await wizardPick(mounted.host, atlasFile('multi.png', atlas))
    await wizardWaitDecoded(mounted.host)
    await wizardSetNumber(mounted.host, 'sprite-upload-frames-per-direction', 4)
    expect(wizardReadout(mounted.host)).toContain('4×4 帧 · 每帧 8×6')
    expect(wizardThumbCount(mounted.host)).toBe(16)
    // 高 24 不被 5 行整除 → 网格无效
    await wizardSetNumber(mounted.host, 'sprite-upload-action-rows', 1)
    expect(wizardError(mounted.host)).toContain('图片尺寸无法按当前行列切分')
    expect(wizardThumbCount(mounted.host)).toBe(0)
    await wizardChooseKind(mounted.host, '默认定格')
    expect(wizardReadout(mounted.host)).toContain('1×1 帧 · 每帧 32×24')
    expect(wizardThumbCount(mounted.host)).toBe(1)
    expect(wizardError(mounted.host)).toBeNull()
    await wizardSetNumber(mounted.host, 'sprite-source-cols', 4)
    expect(wizardReadout(mounted.host)).toContain('4×1 帧 · 每帧 8×24')
    expect(wizardReadout(mounted.host)).toContain('multi.png · 32×24')
  })

  test('id 含斜杠：精确报错、零历史、未 onDone；改正后同一草稿可入库', async () => {
    const atlas = gridAtlasPng(3, 4, 4, 4, atlasColors(12))
    mounted = await mountWizard(project)
    await wizardPick(mounted.host, atlasFile('good.png', atlas))
    await wizardWaitReady(mounted.host)
    await wizardSetText(mounted.host, 'sprite-upload-id', 'a/b')
    await wizardClickSubmit(mounted.host)
    expect(wizardError(mounted.host)).toBe("id 不能为空且不得含 '/'")
    expect(mounted.done).toEqual([])
    expect(mounted.scope.session.getHistoryVersion()).toBe(0)
    await wizardSetText(mounted.host, 'sprite-upload-id', 'a-b')
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    expect(mounted.done).toEqual(['a-b'])
    expect(mounted.scope.session.getHistoryVersion()).toBe(1)
  })

  test('id 清空与撞已有定义：各自精确报错且零提交；入库按钮仍可再点', async () => {
    const atlas = gridAtlasPng(3, 4, 4, 4, atlasColors(12))
    mounted = await mountWizard(project)
    const existing = mounted.scope.session.getState().sprites[0]!.id
    await wizardPick(mounted.host, atlasFile('fresh.png', atlas))
    await wizardWaitReady(mounted.host)
    await wizardSetText(mounted.host, 'sprite-upload-id', '   ')
    await wizardClickSubmit(mounted.host)
    expect(wizardError(mounted.host)).toBe("id 不能为空且不得含 '/'")
    await wizardSetText(mounted.host, 'sprite-upload-id', existing)
    await wizardClickSubmit(mounted.host)
    expect(wizardError(mounted.host)).toBe(`id "${existing}" 已存在`)
    expect(mounted.scope.session.getHistoryVersion()).toBe(0)
    expect(wizardSubmit(mounted.host).disabled).toBe(false)
  })
})
