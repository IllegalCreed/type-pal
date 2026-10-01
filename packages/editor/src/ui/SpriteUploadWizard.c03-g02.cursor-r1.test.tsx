// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C03-G02：SpriteUploadWizard 取消 / 迟到释放 / 色盘 / 重复路径 / 恢复。
 * 排重：selection.test 已证换选竞态（A-B/B-A 归属、旧失败/旧色盘不覆盖新 scope、同内容去重）；
 * test.tsx 已证入库期锁重复提交与取消。本组只补：解码在途取消/卸载后位图仍恰好释放一次、
 * 色盘迟到/失败/换 scope 恢复、AssetId 占用时的后缀分配、复用既有 catalog 资源、
 * 过期 sprites 列表下命令级撞 id 的失败恢复、非图片字节后可恢复。
 * 唯一替身：浏览器硬件端口（Node Blob/crypto；createImageBitmap 经 node-canvas 真实 PNG 解码，
 * 仅按文件名闸门并计 close）与色盘 I/O 闸门；业务核心全部真实。
 */
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { atlasColors, pngFileOf } from '../__tests__/cursor-asset-r1/image-ports.js'
import {
  type LegalProject,
  loadLegalProject,
  useActEnvironment,
} from '../__tests__/cursor-asset-r1/kit.js'
import { loadCursorSpriteProject } from '../__tests__/cursor-asset-r1/sprite-fixtures.js'
import {
  type MountedWizard,
  mountWizard,
  unmountHost,
} from '../__tests__/cursor-asset-r1/upload-harness.js'
import {
  atlasFile,
  decodeStoredSprite,
  failingPalette,
  type GatedBitmapPort,
  gatePalette,
  gridAtlasPng,
  installGatedBitmapPort,
} from '../__tests__/cursor-asset-r1/upload-ports.js'
import {
  flush,
  waitDone,
  wizardBusy,
  wizardCancel,
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
} from '../__tests__/cursor-asset-r1/upload-ui.js'
import { EditSession } from '../core/edit-session.js'

let project: LegalProject
let port: GatedBitmapPort
let mounted: MountedWizard | undefined

beforeAll(async () => {
  await installGatedBitmapPort()
  project = await loadLegalProject('c03-g02')
  vi.unstubAllGlobals()
})

beforeEach(async () => {
  useActEnvironment()
  port = await installGatedBitmapPort()
})

afterEach(async () => {
  if (mounted) await unmountHost(mounted)
  mounted = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const walkAtlas = () => gridAtlasPng(3, 4, 4, 4, atlasColors(12))

describe('C03-G02 取消、迟到释放与恢复', () => {
  test('C03-G02-01 未选文件直接取消：onDone(null) 恰好一次，会话零历史', async () => {
    mounted = await mountWizard(project)
    expect(wizardCancel(mounted.host).disabled).toBe(false)
    wizardCancel(mounted.host).click()
    expect(mounted.done).toEqual([null])
    expect(mounted.scope.session.getHistoryVersion()).toBe(0)
    expect(mounted.scope.session.getState().sprites).toEqual(project.state.sprites)
  })

  test('C03-G02-02 解码在途取消：onDone(null)；放行后位图恰好 close 一次，不出现草稿也不入库', async () => {
    mounted = await mountWizard(project)
    const hold = port.gate('slow.png')
    await wizardPick(mounted.host, atlasFile('slow.png', walkAtlas()))
    expect(port.started).toEqual(['slow.png'])
    expect(wizardBusy(mounted.host)).toBe('true')
    expect(wizardCancel(mounted.host).disabled).toBe(false)
    wizardCancel(mounted.host).click()
    expect(mounted.done).toEqual([null])
    hold.resolve()
    await vi.waitFor(() => {
      expect(port.closes('slow.png')).toBe(1)
    })
    await flush()
    expect(port.decoded).toEqual(['slow.png'])
    expect(mounted.host.querySelector('.sprite-upload-submit')).toBeNull()
    expect(wizardReadout(mounted.host)).toBe('')
    expect(mounted.scope.session.getHistoryVersion()).toBe(0)
  })

  test('C03-G02-03 解码在途卸载：放行后位图恰好 close 一次，宿主 session 不被写入', async () => {
    const wizard = await mountWizard(project)
    const hold = port.gate('gone.png')
    await wizardPick(wizard.host, atlasFile('gone.png', walkAtlas()))
    await unmountHost(wizard)
    hold.resolve()
    await vi.waitFor(() => {
      expect(port.closes('gone.png')).toBe(1)
    })
    await flush()
    expect(wizard.scope.session.getHistoryVersion()).toBe(0)
    expect(wizard.done).toEqual([])
    mounted = undefined
  })

  test('C03-G02-04 色盘迟到：草稿已显示但无缩略图且入库不可点，色盘放行后补全并可入库', async () => {
    const { assetBase, hold } = gatePalette(project.assetBase)
    mounted = await mountWizard(project, { assetBase })
    await wizardPick(mounted.host, atlasFile('late-palette.png', walkAtlas()))
    await wizardWaitDecoded(mounted.host)
    expect(wizardReadout(mounted.host)).toContain('late-palette.png')
    expect(wizardReadout(mounted.host)).toContain('3×4 帧')
    expect(wizardThumbCount(mounted.host)).toBe(0)
    expect(wizardSubmit(mounted.host).disabled).toBe(true)
    await wizardClickSubmit(mounted.host)
    expect(mounted.done).toEqual([])
    hold.resolve()
    await wizardWaitReady(mounted.host)
    expect(wizardThumbCount(mounted.host)).toBe(12)
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    expect(mounted.done).toEqual(['late-palette'])
  })

  test('C03-G02-05 色盘加载失败：错误回显、草稿永不可入库；换回合法 scope 后清错并可重选入库', async () => {
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

  test('C03-G02-06 换 session scope：旧草稿被撤下；入库只写新 session，旧 session 零历史', async () => {
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

  test('C03-G02-07 非图片字节：错误回显且无表单；随后合法 PNG 清错并可入库', async () => {
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

  test('C03-G02-08 sprite.<id> 与 sprite.<id>.2 已被不同内容占用：新资源取下一个空闲后缀 .3', async () => {
    const seeded = await loadCursorSpriteProject('c03-g02-08', [
      {
        asset: 'sprite.pick',
        label: 'Pick1',
        frameCount: 2,
        definitions: [{ id: 'taken-one', label: '占一', layout: { kind: 'static' } }],
      },
      {
        asset: 'sprite.pick.2',
        label: 'Pick2',
        frameCount: 3,
        definitions: [{ id: 'taken-two', label: '占二', layout: { kind: 'static' } }],
      },
    ])
    mounted = await mountWizard(seeded)
    await wizardChooseKind(mounted.host, '默认定格')
    await wizardPick(
      mounted.host,
      atlasFile('pick.png', gridAtlasPng(1, 1, 8, 8, atlasColors(16).slice(15))),
    )
    await wizardWaitReady(mounted.host)
    expect(wizardField(mounted.host, 'sprite-upload-id').value).toBe('pick')
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    const state = mounted.scope.session.getState()
    const def = state.sprites.find((entry) => entry.id === 'pick')!
    expect(def.asset).toBe('sprite.pick.3')
    expect(state.assetCatalog.assets['sprite.pick']!.sha256).toBe(
      seeded.seeded.get('sprite.pick')!.sha256,
    )
    expect(state.assetCatalog.assets['sprite.pick.2']!.sha256).toBe(
      seeded.seeded.get('sprite.pick.2')!.sha256,
    )
    expect(await decodeStoredSprite(mounted.scope.session, def.asset)).toHaveLength(1)
  })

  test('C03-G02-09 内容与既有 catalog 精灵完全一致：新定义复用该资产，不新增 catalog/blob', async () => {
    const seeded = await loadCursorSpriteProject('c03-g02-09', [
      {
        asset: 'sprite.authored.shared-src',
        label: 'SharedSrc',
        frameCount: 2,
        definitions: [{ id: 'src-use', label: '源用途', layout: { kind: 'static' } }],
      },
    ])
    mounted = await mountWizard(seeded)
    const before = mounted.scope.session.getState()
    await wizardChooseKind(mounted.host, '默认定格')
    await wizardPick(mounted.host, atlasFile('twin.png', gridAtlasPng(2, 1, 8, 8, atlasColors(2))))
    await wizardWaitDecoded(mounted.host)
    await wizardSetNumber(mounted.host, 'sprite-source-cols', 2)
    await wizardWaitReady(mounted.host)
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    const after = mounted.scope.session.getState()
    const def = after.sprites.find((entry) => entry.id === 'twin')!
    expect(def.asset).toBe('sprite.authored.shared-src')
    expect(Object.keys(after.assetCatalog.assets)).toEqual(Object.keys(before.assetCatalog.assets))
    expect(after.assetCatalog.assets['sprite.authored.shared-src']).toEqual(
      before.assetCatalog.assets['sprite.authored.shared-src'],
    )
    expect(Object.keys(after.assetBlobs)).toEqual(Object.keys(before.assetBlobs))
    expect(mounted.scope.session.getHistoryVersion()).toBe(1)
  })

  test('C03-G02-10 宿主传入过期 sprites 列表：命令级撞 id 报错、历史不增、入库按钮复位，改 id 后可成功', async () => {
    mounted = await mountWizard(project)
    await wizardPick(mounted.host, atlasFile('once.png', walkAtlas()))
    await wizardWaitReady(mounted.host)
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    expect(mounted.done).toEqual(['once'])
    expect(mounted.scope.session.getHistoryVersion()).toBe(1)

    await mounted.setSpritesOverride('empty')
    await wizardClickSubmit(mounted.host)
    await vi.waitFor(() => {
      expect(wizardError(mounted!.host)).toContain('精灵定义 id 已存在: once')
    })
    expect(mounted.done).toEqual(['once'])
    expect(mounted.scope.session.getHistoryVersion()).toBe(1)
    expect(wizardBusy(mounted.host)).toBe('false')
    expect(wizardSubmit(mounted.host).disabled).toBe(false)

    await wizardSetText(mounted.host, 'sprite-upload-id', 'twice')
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done, 2)
    expect(mounted.done).toEqual(['once', 'twice'])
    expect(wizardError(mounted.host)).toBeNull()
    expect(mounted.scope.session.getHistoryVersion()).toBe(2)
    const state = mounted.scope.session.getState()
    expect(state.sprites.find((entry) => entry.id === 'twice')!.asset).toBe(
      state.sprites.find((entry) => entry.id === 'once')!.asset,
    )
  })
})
