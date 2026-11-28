// @vitest-environment jsdom
/** Commit locking, author IDs, and reuse of registered frame containers. */
import { act } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { atlasColors } from '../__tests__/cursor-asset-r1/image-ports.js'
import { type LegalProject, loadLegalProject } from '../__tests__/cursor-asset-r1/kit.js'
import { atlasFile, gridAtlasPng } from '../__tests__/png-fixtures.js'
import { unmountHost } from '../__tests__/react-host-cleanup.js'
import {
  installGatedBitmapPort,
  installGatedCompressPort,
} from '../__tests__/sprite-import-test-ports.js'
import {
  waitDone,
  wizardBusy,
  wizardCancel,
  wizardChooseKind,
  wizardClickSubmit,
  wizardError,
  wizardField,
  wizardPick,
  wizardSetNumber,
  wizardSetText,
  wizardSubmit,
  wizardWaitDecoded,
  wizardWaitReady,
} from '../__tests__/world-sprite-import-gestures.js'
import { type MountedWizard, mountWizard } from '../__tests__/world-sprite-import-test-host.js'
import {
  decodePendingWorldSprite,
  loadWorldSpriteProject,
} from '../__tests__/world-sprite-project.js'

const walkAtlas = () => gridAtlasPng(3, 4, 4, 4, atlasColors(12))

let project: LegalProject
let mounted: MountedWizard | undefined

beforeAll(async () => {
  installGatedBitmapPort()
  project = await loadLegalProject('world-sprite-import-registration')
  vi.unstubAllGlobals()
})

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  installGatedBitmapPort()
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

describe('大世界精灵导入登记与撤销边界', () => {
  function m(): MountedWizard {
    if (!mounted) throw new Error('not mounted')
    return mounted
  }

  test('compress 在途：双点提交仅一次 gzip，取消禁用', async () => {
    const gate = installGatedCompressPort()
    try {
      const atlas = gridAtlasPng(3, 4, 4, 4, atlasColors(12))
      mounted = await mountWizard(project)
      await wizardPick(m().host, atlasFile('lock.png', atlas))
      await wizardWaitReady(m().host)
      await act(async () => {
        wizardSubmit(m().host).click()
        wizardSubmit(m().host).click()
      })
      expect(gate.calls).toBe(1)
      expect(wizardSubmit(m().host).disabled).toBe(true)
      const cancel = wizardCancel(m().host)
      expect(cancel.disabled).toBe(true)
      expect(
        [...m().host.querySelectorAll<HTMLButtonElement>('.sprite-upload-kind-options button')].map(
          (button) => button.disabled,
        ),
      ).toEqual([true, true])
      await act(async () => cancel.click())
      expect(m().done).toEqual([])
      expect(m().scope.session.getHistoryVersion()).toBe(0)
      expect(m().host.querySelector('.sprite-upload-wizard')?.getAttribute('aria-busy')).toBe(
        'true',
      )
      gate.hold.resolve()
      await waitDone(m().done)
      expect(m().done).toEqual(['lock'])
      expect(m().scope.session.getHistoryVersion()).toBe(1)
    } finally {
      try {
        await act(async () => gate.drain())
      } finally {
        gate.restore()
      }
    }
  })

  test('首次入库成功后同挂载再选：第二 id 入库且历史 +1', async () => {
    const atlas = gridAtlasPng(2, 1, 8, 8, atlasColors(2))
    mounted = await mountWizard(project)
    await wizardChooseKind(m().host, '默认定格')
    await wizardPick(m().host, atlasFile('first.png', atlas))
    await wizardSetNumber(m().host, 'sprite-source-cols', 2)
    await wizardWaitReady(m().host)
    await wizardClickSubmit(m().host)
    await waitDone(m().done)
    expect(wizardBusy(m().host)).toBe('false')
    expect(wizardSubmit(m().host).disabled).toBe(false)
    const afterFirst = m().scope.session.getState()
    await wizardPick(m().host, atlasFile('second.png', atlas))
    await wizardSetNumber(m().host, 'sprite-source-cols', 2)
    await wizardWaitReady(m().host)
    await wizardSetText(m().host, 'sprite-upload-id', 'second-def')
    await wizardClickSubmit(m().host)
    await waitDone(m().done, 2)
    expect(m().done).toEqual(['first', 'second-def'])
    expect(m().scope.session.getHistoryVersion()).toBe(2)
    const afterSecond = m().scope.session.getState()
    expect(afterSecond.assetCatalog).toEqual(afterFirst.assetCatalog)
    expect(afterSecond.assetBlobs).toEqual(afterFirst.assetBlobs)
    expect(afterSecond.sprites.find((entry) => entry.id === 'second-def')?.asset).toBe(
      afterFirst.sprites.find((entry) => entry.id === 'first')?.asset,
    )
  })

  test('首次入库前自定义 id/label：定义保存这两个值', async () => {
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
      .sprites.find((entry) => entry.id === 'author-a')
    expect(def).toMatchObject({ id: 'author-a', label: '作者标签' })
  })

  test('第二次入库 id 撞车：精确报错且历史不增', async () => {
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

  test('sprite.<id> 与 sprite.<id>.2 已被不同内容占用：新资源取下一个空闲后缀 .3', async () => {
    const seeded = await loadWorldSpriteProject('frame-source-id-collision', [
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
    expect(await decodePendingWorldSprite(mounted.scope.session, def.asset)).toHaveLength(1)
  })

  test('内容与既有 catalog 精灵完全一致：新定义复用该资产，不新增 catalog/blob', async () => {
    const seeded = await loadWorldSpriteProject('frame-source-reuse', [
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

  test('宿主传入过期 sprites 列表：命令级撞 id 报错、历史不增、入库按钮复位，改 id 后可成功', async () => {
    mounted = await mountWizard(project)
    await wizardPick(mounted.host, atlasFile('once.png', walkAtlas()))
    await wizardWaitReady(mounted.host)
    await wizardClickSubmit(mounted.host)
    await waitDone(mounted.done)
    expect(mounted.done).toEqual(['once'])
    expect(mounted.scope.session.getHistoryVersion()).toBe(1)

    await mounted.setSpritesOverride('empty')
    await wizardClickSubmit(mounted.host, { waitForCommitDigest: true })
    expect(wizardError(mounted.host)).toContain('精灵定义 id 已存在: once')
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
