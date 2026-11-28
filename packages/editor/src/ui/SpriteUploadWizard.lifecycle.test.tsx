// @vitest-environment jsdom
/** File decode, cancellation and palette ownership in the sprite import wizard. */
import { act } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { atlasColors, pngFileOf } from '../__tests__/cursor-asset-r1/image-ports.js'
import { type LegalProject, loadLegalProject } from '../__tests__/cursor-asset-r1/kit.js'
import { atlasFile, gridAtlasPng } from '../__tests__/png-fixtures.js'
import { unmountHost } from '../__tests__/react-host-cleanup.js'
import {
  failingPalette,
  type GatedBitmapPort,
  gatePalette,
  installGatedBitmapPort,
} from '../__tests__/sprite-import-test-ports.js'
import {
  waitDone,
  wizardBusy,
  wizardCancel,
  wizardClickSubmit,
  wizardError,
  wizardPick,
  wizardReadout,
  wizardSetText,
  wizardSubmit,
  wizardThumbCount,
  wizardWaitDecoded,
  wizardWaitReady,
} from '../__tests__/world-sprite-import-gestures.js'
import {
  type MountedWizard,
  mountWizard,
  waitForWizardPalette,
} from '../__tests__/world-sprite-import-test-host.js'
import { EditSession } from '../core/edit-session.js'

let project: LegalProject
let port: GatedBitmapPort
let mounted: MountedWizard | undefined

beforeAll(async () => {
  installGatedBitmapPort()
  project = await loadLegalProject('world-sprite-import-lifecycle')
  vi.unstubAllGlobals()
})

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  port = installGatedBitmapPort()
})

afterEach(async () => {
  try {
    if (mounted) await unmountHost(mounted)
  } finally {
    mounted = undefined
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})

const walkAtlas = () => gridAtlasPng(3, 4, 4, 4, atlasColors(12))

describe('大世界精灵导入资源生命周期', () => {
  test('未选文件直接取消：onDone(null) 恰好一次，会话零历史', async () => {
    mounted = await mountWizard(project)
    expect(wizardCancel(mounted.host).disabled).toBe(false)
    await act(async () => wizardCancel(mounted!.host).click())
    expect(mounted.done).toEqual([null])
    expect(mounted.scope.session.getHistoryVersion()).toBe(0)
    expect(mounted.scope.session.getState().sprites).toEqual(project.state.sprites)
  })

  test('解码在途取消：onDone(null)；放行后位图恰好 close 一次，不出现草稿也不入库', async () => {
    mounted = await mountWizard(project)
    const hold = port.gate('slow.png')
    const image = await wizardPick(mounted.host, atlasFile('slow.png', walkAtlas()), {
      waitForDecode: false,
    })
    expect(port.started).toEqual(['slow.png'])
    expect(wizardBusy(mounted.host)).toBe('true')
    expect(wizardCancel(mounted.host).disabled).toBe(false)
    await act(async () => wizardCancel(mounted!.host).click())
    expect(mounted.done).toEqual([null])
    await act(async () => {
      hold.resolve()
      await image.finished
    })
    expect(port.closes('slow.png')).toBe(1)
    expect(port.decoded).toEqual(['slow.png'])
    expect(mounted.host.querySelector('.sprite-upload-submit')).toBeNull()
    expect(wizardReadout(mounted.host)).toBe('')
    expect(mounted.scope.session.getHistoryVersion()).toBe(0)
  })

  test('解码在途卸载：放行后位图恰好 close 一次，宿主 session 不被写入', async () => {
    const wizard = await mountWizard(project)
    mounted = wizard
    const hold = port.gate('gone.png')
    const image = await wizardPick(wizard.host, atlasFile('gone.png', walkAtlas()), {
      waitForDecode: false,
    })
    await unmountHost(wizard)
    mounted = undefined
    await act(async () => {
      hold.resolve()
      await image.finished
    })
    expect(port.closes('gone.png')).toBe(1)
    expect(wizard.scope.session.getHistoryVersion()).toBe(0)
    expect(wizard.done).toEqual([])
  })

  test('色盘迟到：草稿已显示但无缩略图且入库不可点，色盘放行后补全并可入库', async () => {
    const { assetBase, hold } = gatePalette(project.assetBase)
    mounted = await mountWizard(project, { assetBase, waitForPalette: false })
    await wizardPick(mounted.host, atlasFile('late-palette.png', walkAtlas()))
    await wizardWaitDecoded(mounted.host)
    expect(wizardReadout(mounted.host)).toContain('late-palette.png')
    expect(wizardReadout(mounted.host)).toContain('3×4 帧')
    expect(wizardThumbCount(mounted.host)).toBe(0)
    expect(wizardSubmit(mounted.host).disabled).toBe(true)
    await wizardClickSubmit(mounted.host)
    expect(mounted.done).toEqual([])
    await act(async () => {
      hold.resolve()
      await waitForWizardPalette(mounted!.host)
    })
    await wizardWaitReady(mounted.host)
    expect(wizardThumbCount(mounted.host)).toBe(12)
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    expect(mounted.done).toEqual(['late-palette'])
  })

  test('色盘加载失败：错误回显、草稿永不可入库；换回合法 scope 后清错并可重选入库', async () => {
    const broken = failingPalette(project.assetBase, 'palette-io-down')
    mounted = await mountWizard(project, { assetBase: broken })
    await vi.waitFor(() => {
      expect(wizardError(mounted!.host)).toBe('palette-io-down')
    })
    await wizardPick(mounted.host, atlasFile('x.png', walkAtlas()))
    await wizardWaitDecoded(mounted.host)
    expect(wizardThumbCount(mounted.host)).toBe(0)
    expect(wizardSubmit(mounted.host).disabled).toBe(true)
    await wizardClickSubmit(mounted.host)
    expect(mounted.scope.session.getHistoryVersion()).toBe(0)

    await mounted.setScope({ session: mounted.scope.session, assetBase: project.assetBase })
    await vi.waitFor(() => {
      expect(wizardError(mounted!.host)).toBeNull()
    })
    expect(mounted.host.querySelector('.sprite-upload-submit')).toBeNull()
    await wizardPick(mounted.host, atlasFile('x.png', walkAtlas()))
    await wizardWaitReady(mounted.host)
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    expect(mounted.done).toEqual(['x'])
  })

  test('换 session scope：旧草稿被撤下；入库只写新 session，旧 session 零历史', async () => {
    mounted = await mountWizard(project)
    const oldSession = mounted.scope.session
    await wizardPick(mounted.host, atlasFile('first.png', walkAtlas()))
    await wizardWaitReady(mounted.host)
    const nextSession = new EditSession(project.state)
    await mounted.setScope({ session: nextSession, assetBase: project.assetBase })
    expect(mounted.host.querySelector('.sprite-upload-submit')).toBeNull()
    expect(wizardReadout(mounted.host)).toBe('')
    await wizardPick(mounted.host, atlasFile('second.png', walkAtlas()))
    await wizardWaitReady(mounted.host)
    await wizardSetText(mounted.host, 'sprite-upload-id', 'second')
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    expect(mounted.done).toEqual(['second'])
    expect(nextSession.getState().sprites.some((entry) => entry.id === 'second')).toBe(true)
    expect(oldSession.getHistoryVersion()).toBe(0)
    expect(oldSession.getState().sprites.some((entry) => entry.id === 'second')).toBe(false)
  })

  test('非图片字节：错误回显且无表单；随后合法 PNG 清错并可入库', async () => {
    mounted = await mountWizard(project)
    await wizardPick(mounted.host, pngFileOf('broken.png', new Uint8Array([1, 2, 3, 4, 5])))
    await vi.waitFor(() => {
      expect(wizardError(mounted!.host)).not.toBeNull()
    })
    expect(wizardError(mounted.host)!.length).toBeGreaterThan(0)
    expect(mounted.host.querySelector('.sprite-upload-submit')).toBeNull()
    expect(wizardBusy(mounted.host)).toBe('false')
    await wizardPick(mounted.host, atlasFile('ok.png', walkAtlas()))
    await wizardWaitReady(mounted.host)
    expect(wizardError(mounted.host)).toBeNull()
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    expect(mounted.done).toEqual(['ok'])
  })
})
