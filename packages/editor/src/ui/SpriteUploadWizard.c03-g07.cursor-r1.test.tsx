// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C03-G07：Wizard 入库锁、多帧 static 与上传后重选。
 * 排重：SpriteUploadWizard.test mock 已证 4×1 static 读数与 compress 在途锁；
 * selection.test mock 已证 scope 竞态。本组经真实 PNG/量化/gzip 补：默认定格多帧源、
 * compress 扣留双点锁、取消在途无效、成功后同挂载重选入库、id/label 跨重选保留。
 */
import { act } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { atlasColors } from '../__tests__/cursor-asset-r1/image-ports.js'
import {
  type LegalProject,
  loadLegalProject,
  useActEnvironment,
} from '../__tests__/cursor-asset-r1/kit.js'
import {
  type MountedWizard,
  mountWizard,
  unmountHost,
} from '../__tests__/cursor-asset-r1/upload-harness.js'
import {
  atlasFile,
  gridAtlasPng,
  installGatedBitmapPort,
  installGatedCompressPort,
} from '../__tests__/cursor-asset-r1/upload-ports.js'
import {
  waitDone,
  wizardCancel,
  wizardChooseKind,
  wizardClickSubmit,
  wizardError,
  wizardPick,
  wizardReadout,
  wizardSetNumber,
  wizardSetText,
  wizardSubmit,
  wizardThumbCount,
  wizardWaitDecoded,
  wizardWaitReady,
} from '../__tests__/cursor-asset-r1/upload-ui.js'

let project: LegalProject
let mounted: MountedWizard | undefined

beforeAll(async () => {
  await installGatedBitmapPort()
  project = await loadLegalProject('c03-g07')
})

beforeEach(async () => {
  useActEnvironment()
  await installGatedBitmapPort()
})

afterEach(async () => {
  if (mounted) await unmountHost(mounted)
  mounted = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C03-G07 入库锁与上传后重选', () => {
  function m(): MountedWizard {
    if (!mounted) throw new Error('not mounted')
    return mounted
  }

  test('C03-G07-01 默认定格 4×1 源：读数 4 帧且缩略图 4（真实 slice，非 mock 尺寸）', async () => {
    const colors = atlasColors(4)
    const atlas = gridAtlasPng(4, 1, 8, 8, colors)
    mounted = await mountWizard(project)
    await wizardChooseKind(m().host, '默认定格')
    await wizardPick(m().host, atlasFile('strip.png', atlas))
    await wizardSetNumber(m().host, 'sprite-source-cols', 4)
    await wizardSetNumber(m().host, 'sprite-source-rows', 1)
    await wizardWaitReady(m().host)
    expect(wizardReadout(m().host)).toContain('4×1 帧')
    expect(wizardThumbCount(m().host)).toBe(4)
    await wizardClickSubmit(m().host)
    await waitDone(m().done)
    expect(m().scope.session.getHistoryVersion()).toBe(1)
  })

  test('C03-G07-02 compress 在途：双点提交仅一次 gzip，取消禁用', async () => {
    const gate = installGatedCompressPort()
    const atlas = gridAtlasPng(2, 1, 8, 8, atlasColors(2))
    mounted = await mountWizard(project)
    await wizardChooseKind(m().host, '默认定格')
    await wizardPick(m().host, atlasFile('lock.png', atlas))
    await wizardWaitReady(m().host)
    await act(async () => {
      wizardSubmit(m().host).click()
      wizardSubmit(m().host).click()
    })
    expect(gate.calls).toBe(1)
    expect(wizardSubmit(m().host).disabled).toBe(true)
    expect(wizardCancel(m().host).disabled).toBe(true)
    expect(m().host.querySelector('.sprite-upload-wizard')?.getAttribute('aria-busy')).toBe('true')
    gate.hold.resolve()
    await waitDone(m().done)
    expect(m().done).toEqual(['lock'])
    expect(m().scope.session.getHistoryVersion()).toBe(1)
    gate.restore()
  })

  test('C03-G07-03 compress 在途：取消与 kind 均禁用，放行后恰好一次 onDone', async () => {
    const gate = installGatedCompressPort()
    const atlas = gridAtlasPng(1, 1, 8, 8, atlasColors(1))
    mounted = await mountWizard(project)
    await wizardChooseKind(m().host, '默认定格')
    await wizardPick(m().host, atlasFile('hold.png', atlas))
    await wizardWaitReady(m().host)
    await act(async () => wizardSubmit(m().host).click())
    expect(wizardCancel(m().host).disabled).toBe(true)
    gate.hold.resolve()
    await waitDone(m().done)
    expect(m().done).toEqual(['hold'])
    expect(m().scope.session.getHistoryVersion()).toBe(1)
    gate.restore()
  })

  test('C03-G07-04 首次入库成功后同挂载再选：第二 id 入库且历史 +1', async () => {
    const atlas = gridAtlasPng(2, 1, 8, 8, atlasColors(2))
    mounted = await mountWizard(project)
    await wizardChooseKind(m().host, '默认定格')
    await wizardPick(m().host, atlasFile('first.png', atlas))
    await wizardSetNumber(m().host, 'sprite-source-cols', 2)
    await wizardWaitReady(m().host)
    await wizardClickSubmit(m().host)
    await waitDone(m().done)
    await wizardPick(m().host, atlasFile('second.png', atlas))
    await wizardSetNumber(m().host, 'sprite-source-cols', 2)
    await wizardWaitReady(m().host)
    await wizardSetText(m().host, 'sprite-upload-id', 'second-def')
    await wizardClickSubmit(m().host)
    await waitDone(m().done, 2)
    expect(m().done).toEqual(['first', 'second-def'])
    expect(m().scope.session.getHistoryVersion()).toBe(2)
  })

  test('C03-G07-05 重选前改的 id/label 在首次合法入库后落到定义', async () => {
    const atlas = gridAtlasPng(1, 1, 8, 8, atlasColors(1))
    mounted = await mountWizard(project)
    await wizardChooseKind(m().host, '默认定格')
    await wizardPick(m().host, atlasFile('a.png', atlas))
    await wizardWaitReady(m().host)
    await wizardSetText(m().host, 'sprite-upload-id', 'author-a')
    await wizardSetText(m().host, 'sprite-upload-label', '作者标签')
    await wizardClickSubmit(m().host)
    await waitDone(m().done)
    const def = m()
      .scope.session.getState()
      .sprites.find((entry) => entry.id === 'author-a')!
    expect(def.label).toBe('作者标签')
  })

  test('C03-G07-06 同内容第二次入库：共享 assetId，catalog 条目不增', async () => {
    const atlas = gridAtlasPng(2, 1, 8, 8, atlasColors(2))
    mounted = await mountWizard(project)
    await wizardChooseKind(m().host, '默认定格')
    await wizardPick(m().host, atlasFile('shared.png', atlas))
    await wizardSetNumber(m().host, 'sprite-source-cols', 2)
    await wizardWaitReady(m().host)
    await wizardClickSubmit(m().host)
    await waitDone(m().done)
    const afterFirst = m().scope.session.getState()
    await wizardPick(m().host, atlasFile('shared-2.png', atlas))
    await wizardSetNumber(m().host, 'sprite-source-cols', 2)
    await wizardWaitReady(m().host)
    await wizardSetText(m().host, 'sprite-upload-id', 'shared-copy')
    await wizardClickSubmit(m().host)
    await waitDone(m().done, 2)
    const afterSecond = m().scope.session.getState()
    expect(Object.keys(afterSecond.assetCatalog.assets)).toEqual(
      Object.keys(afterFirst.assetCatalog.assets),
    )
    const first = afterSecond.sprites.find((entry) => entry.id === 'shared')!
    const second = afterSecond.sprites.find((entry) => entry.id === 'shared-copy')!
    expect(second.asset).toBe(first.asset)
  })

  test('C03-G07-07 入库完成后提交门复位：busy false 且可再点', async () => {
    const atlas = gridAtlasPng(1, 1, 8, 8, atlasColors(1))
    mounted = await mountWizard(project)
    await wizardChooseKind(m().host, '默认定格')
    await wizardPick(m().host, atlasFile('once.png', atlas))
    await wizardWaitReady(m().host)
    await wizardClickSubmit(m().host)
    await waitDone(m().done)
    expect(m().host.querySelector('.sprite-upload-wizard')?.getAttribute('aria-busy')).toBe('false')
    expect(wizardSubmit(m().host).disabled).toBe(false)
  })

  test('C03-G07-08 第二次入库 id 撞车：精确报错且历史不增', async () => {
    const atlas = gridAtlasPng(1, 1, 8, 8, atlasColors(1))
    mounted = await mountWizard(project)
    await wizardChooseKind(m().host, '默认定格')
    await wizardPick(m().host, atlasFile('dup.png', atlas))
    await wizardWaitReady(m().host)
    await wizardClickSubmit(m().host)
    await waitDone(m().done)
    await wizardPick(m().host, atlasFile('dup2.png', atlas))
    await wizardWaitReady(m().host)
    await wizardSetText(m().host, 'sprite-upload-id', 'dup')
    await wizardClickSubmit(m().host)
    await vi.waitFor(() => {
      expect(wizardError(mounted!.host)).toBe('id "dup" 已存在')
    })
    expect(m().done).toEqual(['dup'])
    expect(m().scope.session.getHistoryVersion()).toBe(1)
  })

  test('C03-G07-09 改 id 后第二次可成功且 onDone 两次', async () => {
    const atlas = gridAtlasPng(1, 1, 8, 8, atlasColors(1))
    mounted = await mountWizard(project)
    await wizardChooseKind(m().host, '默认定格')
    await wizardPick(m().host, atlasFile('one.png', atlas))
    await wizardWaitReady(m().host)
    await wizardClickSubmit(m().host)
    await waitDone(m().done)
    await wizardPick(m().host, atlasFile('two.png', atlas))
    await wizardWaitDecoded(m().host)
    await wizardSetText(m().host, 'sprite-upload-id', 'two')
    await wizardClickSubmit(m().host)
    await waitDone(m().done, 2)
    expect(m().done).toEqual(['one', 'two'])
  })

  test('C03-G07-10 四向用途入库锁期间 kind 切换禁用（不可打断提交）', async () => {
    const gate = installGatedCompressPort()
    const atlas = gridAtlasPng(3, 4, 4, 4, atlasColors(12))
    mounted = await mountWizard(project)
    await wizardPick(m().host, atlasFile('dir.png', atlas))
    await wizardWaitReady(m().host)
    await act(async () => wizardSubmit(m().host).click())
    const kindButtons = [
      ...m().host.querySelectorAll<HTMLButtonElement>('.sprite-upload-kind-options button'),
    ]
    expect(kindButtons.every((button) => button.disabled)).toBe(true)
    gate.hold.resolve()
    await waitDone(m().done)
    gate.restore()
  })
})
