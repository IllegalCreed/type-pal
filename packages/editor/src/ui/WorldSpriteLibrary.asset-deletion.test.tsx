// @vitest-environment jsdom
/** Delete definitions and frame sources according to their separate lifecycles. */
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { applyHistoryAction, clickButtonByText } from '../__tests__/cursor-asset-r1/kit.js'
import {
  buttonByLoose,
  multiAssetProject,
  setupWorldSpriteLibrarySuite,
  waitMeta,
} from '../__tests__/world-sprite-library-gestures.js'
import {
  type MountedWorldSpriteLibrary,
  waitForWorldSpriteResource,
} from '../__tests__/world-sprite-library-test-host.js'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'
import { sha256Hex } from '../core/binary-signature.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { clickButton } from './__tests__/dom-gestures.js'

const suite = setupWorldSpriteLibrarySuite()
let mounted: MountedWorldSpriteLibrary | undefined

describe('删除用途确认取消/成功与引用门控', () => {
  test('confirm 拒绝时不删除用途且零 notice 成功文案', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const project = await multiAssetProject('c01-g06-01')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    const before = mounted.session
      .getState()
      .sprites.map((s) => s.id)
      .sort()
    await clickButtonByText(mounted.host, '删除用途')
    expect(
      mounted.session
        .getState()
        .sprites.map((s) => s.id)
        .sort(),
    ).toEqual(before)
    expect(mounted.notices.some((n) => n?.message === '用途已删除；源资源仍保留。')).toBe(false)
  })

  test('confirm 接受删除唯一用途后 meta 消费者归零并保留资源', async () => {
    const project = await multiAssetProject('c01-g06-02')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await clickButtonByText(mounted.host, '删除用途')
    await vi.waitFor(() => {
      expect(mounted!.session.getState().sprites.some((s) => s.id === 'c01-beta-static')).toBe(
        false,
      )
    })
    await waitMeta(mounted.host, 4, 0)
    expect(mounted.session.getState().assetCatalog.assets['sprite.authored.c01beta']).toBeDefined()
    expect(mounted.notices.at(-1)).toEqual({
      kind: 'info',
      message: '用途已删除；源资源仍保留。',
    })
  })

  test('删除 alpha 多用途中的 walk 后仍保留 idle', async () => {
    const project = await multiAssetProject('c01-g06-03')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await clickButtonByText(mounted.host, '删除用途')
    await vi.waitFor(() => {
      const ids = mounted!.session.getState().sprites.map((s) => s.id)
      expect(ids).not.toContain('c01-alpha-walk')
      expect(ids).toContain('c01-alpha-idle')
    })
    await waitMeta(mounted.host, 8, 1)
    expect(mounted.host.querySelector('.insp-head .who')?.textContent).toBe('AlphaIdle')
  })

  test('删除用途后 undo 恢复被删定义', async () => {
    const project = await multiAssetProject('c01-g06-04')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await clickButtonByText(mounted.host, '删除用途')
    await vi.waitFor(() =>
      expect(mounted!.session.getState().sprites.some((s) => s.id === 'c01-beta-static')).toBe(
        false,
      ),
    )
    expect(await applyHistoryAction(mounted.session, 'undo')).toBe(true)
    expect(mounted.session.getState().sprites.some((s) => s.id === 'c01-beta-static')).toBe(true)
  })

  test('无用途资源显示删除源资源按钮且用途删除按钮缺席', async () => {
    const project = await multiAssetProject('c01-g06-05')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    expect(buttonByLoose(mounted.host, '删除源资源')).toBeDefined()
    expect(buttonByLoose(mounted.host, '删除用途')).toBeUndefined()
  })

  test('删除源资源 confirm 拒绝时 catalog 不变', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const project = await multiAssetProject('c01-g06-07')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '删除源资源')
    expect(mounted.session.getState().assetCatalog.assets['sprite.authored.c01gamma']).toBeDefined()
  })

  test('有用途时不显示删除源资源按钮', async () => {
    const project = await multiAssetProject('c01-g06-08')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    expect(buttonByLoose(mounted.host, '删除源资源')).toBeUndefined()
  })

  test('删除未使用源资源：磁盘端口捕获 undo 字节，撤销后 catalog 与 blob 完整还原', async () => {
    const project = await loadWorldSpriteProject('disk-frame-source-deletion', [
      {
        asset: 'sprite.authored.free',
        label: '无用途精灵',
        frameCount: 3,
        definitions: [],
      },
    ])
    const seeded = project.seeded.get('sprite.authored.free')!
    const mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.free',
    })
    await waitMeta(mounted.host, 3, 0)
    // 无 pending blob：删除前的字节捕获必须走真实磁盘端口。
    expect(mounted.session.getState().assetBlobs[seeded.path]).toBeUndefined()

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await act(async () => {
      await clickButton(mounted.host, '删除源资源')
      await vi.waitFor(() => {
        expect(confirm).toHaveBeenCalledWith('永久移除未使用源资源“无用途精灵”？此操作可撤销。')
      })
      await vi.waitFor(() => {
        expect(
          mounted.session.getState().assetCatalog.assets['sprite.authored.free'],
        ).toBeUndefined()
      })
    })
    await waitForWorldSpriteResource(mounted, 'sprite.generated.starter')
    expect(mounted.session.getState().assetBlobs[seeded.path]).toBeUndefined()
    expect(mounted.notices.at(-1)).toEqual({
      kind: 'info',
      message: '未使用源资源已移除。',
    })

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    const restored = mounted.session.getState().assetCatalog.assets['sprite.authored.free']
    expect(restored).toBeDefined()
    expect(restored).toEqual(
      expect.objectContaining({
        kind: 'sprite',
        path: seeded.path,
        bytes: seeded.bytes.byteLength,
        sha256: seeded.sha256,
        origin: { kind: 'authored' },
      }),
    )
    const blob = mounted.session.getState().assetBlobs[seeded.path]
    expect(blob).toBeDefined()
    expect(await sha256Hex(blob!.slice(0))).toBe(seeded.sha256)
    assertProjectSaveValid(mounted.session.getState())
  })

  test('有未保存帧源时删除登记和待写字节，撤销恢复原帧而非损坏磁盘数据', async () => {
    const project = await loadWorldSpriteProject('pending-frame-source-deletion', [
      { asset: 'sprite.raw', label: '未配置精灵帧', frameCount: 3, definitions: [] },
    ])
    const raw = project.seeded.get('sprite.raw')!
    project.disk.set(raw.path, new ArrayBuffer(1))
    // The valid pending image must win over the corrupt disk image during load and undo capture.
    project.state = {
      ...project.state,
      assetBlobs: { ...project.state.assetBlobs, [raw.path]: raw.bytes.slice(0) },
    }
    const library = await suite.mount(project, { focus: 'sprite.raw', view: 'asset' })
    await waitMeta(library.host, 3, 0)
    expect(new Uint8Array(library.session.getState().assetBlobs[raw.path]!)).toEqual(
      new Uint8Array(raw.bytes),
    )
    await act(async () => {
      await clickButton(library.host, '删除源资源')
      await vi.waitFor(() => {
        expect(library.notices.at(-1)).toEqual({
          kind: 'info',
          message: '未使用源资源已移除。',
        })
      })
    })
    await waitForWorldSpriteResource(library, 'sprite.generated.starter')
    expect(library.session.getState().assetCatalog.assets['sprite.raw']).toBeUndefined()
    expect(library.session.getState().assetBlobs[raw.path]).toBeUndefined()
    await act(async () => {
      expect(library.session.undo()).toBe(true)
    })
    expect(library.session.getState().assetCatalog.assets['sprite.raw']).toEqual(
      library.project.state.assetCatalog.assets['sprite.raw'],
    )
    expect(new Uint8Array(library.session.getState().assetBlobs[raw.path]!)).toEqual(
      new Uint8Array(raw.bytes),
    )
    assertProjectSaveValid(library.session.getState())
  })

  test('confirm 文案对删除用途包含用途 label 与 id', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const project = await multiAssetProject('c01-g06-10')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await clickButtonByText(mounted.host, '删除用途')
    expect(confirm.mock.calls[0]?.[0]).toContain('BetaStatic')
    expect(confirm.mock.calls[0]?.[0]).toContain('c01-beta-static')
  })
})
