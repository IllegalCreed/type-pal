// @vitest-environment jsdom
/** Create and edit sprite definitions using current frame proofs and history. */
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import {
  applyHistoryAction,
  clickButtonByText,
  fillAndBlur,
  gatedFileSource,
  pickCombobox,
} from '../__tests__/cursor-asset-r1/kit.js'
import {
  multiAssetProject,
  setupWorldSpriteLibrarySuite,
  waitMeta,
} from '../__tests__/world-sprite-library-gestures.js'
import type { MountedWorldSpriteLibrary } from '../__tests__/world-sprite-library-test-host.js'
import { loadEditorSprite } from '../core/sprite-assets.js'

const suite = setupWorldSpriteLibrarySuite()
let mounted: MountedWorldSpriteLibrary | undefined

describe('新增用途 begin/cancel/apply 与 ID stem', () => {
  test('新增用途菜单在 proof 就绪后对 8 帧资产启用四向按钮', async () => {
    const project = await multiAssetProject('c01-g04-01')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01alpha',
    })
    await waitMeta(mounted.host, 8, 2)
    await clickButtonByText(mounted.host, '新增用途定义')
    const menu = mounted.host.querySelector('[aria-label="新增用途类型"]')
    expect(menu).not.toBeNull()
    const directional = [...menu!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('四向'),
    )
    expect(directional?.disabled).toBe(false)
  })

  test('3 帧无用途资产禁用四向新增按钮', async () => {
    const project = await multiAssetProject('c01-g04-02')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    const menu = mounted.host.querySelector('[aria-label="新增用途类型"]')
    const directional = [...menu!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('四向'),
    )
    expect(directional?.disabled).toBe(true)
  })

  test('选择默认定格开始创建：草稿区出现且应用前 sprites 数不变', async () => {
    const project = await multiAssetProject('c01-g04-03')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    const before = mounted.session.getState().sprites.length
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    expect(mounted.host.querySelector('#world-sprite-new-usage-label')).not.toBeNull()
    expect(mounted.session.getState().sprites.length).toBe(before)
  })

  test('创建草稿取消：表单消失且零命令写入', async () => {
    const project = await multiAssetProject('c01-g04-04')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    const before = mounted.session
      .getState()
      .sprites.map((s) => s.id)
      .sort()
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    await clickButtonByText(mounted.host, '取消')
    expect(mounted.host.querySelector('#world-sprite-new-usage-label')).toBeNull()
    expect(
      mounted.session
        .getState()
        .sprites.map((s) => s.id)
        .sort(),
    ).toEqual(before)
  })

  test('应用新增 static 用途：session 含新 id 且 meta 消费者+1', async () => {
    const project = await multiAssetProject('c01-g04-05')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    const idInput = mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-id')!
    const labelInput = mounted.host.querySelector<HTMLInputElement>(
      '#world-sprite-new-usage-label',
    )!
    await fillAndBlur(labelInput, 'GammaNew')
    await fillAndBlur(idInput, 'c01-gamma-new')
    await clickButtonByText(mounted.host, '应用')
    await vi.waitFor(() => {
      expect(mounted!.session.getState().sprites.some((s) => s.id === 'c01-gamma-new')).toBe(true)
    })
    await waitMeta(mounted.host, 3, 1)
    expect(
      mounted.session.getState().sprites.find((s) => s.id === 'c01-gamma-new')?.layout,
    ).toEqual({
      kind: 'static',
    })
  })

  test('空名称时应用按钮 disabled', async () => {
    const project = await multiAssetProject('c01-g04-06')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    const labelInput = mounted.host.querySelector<HTMLInputElement>(
      '#world-sprite-new-usage-label',
    )!
    await fillAndBlur(labelInput, '   ')
    const apply = [...mounted.host.querySelectorAll('button')].find((b) => b.textContent === '应用')
    expect(apply?.disabled).toBe(true)
  })

  test('空 ID 时应用按钮 disabled', async () => {
    const project = await multiAssetProject('c01-g04-07')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    const idInput = mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-id')!
    await fillAndBlur(idInput, '')
    const apply = [...mounted.host.querySelectorAll('button')].find((b) => b.textContent === '应用')
    expect(apply?.disabled).toBe(true)
  })

  test('默认草稿 id 从资源 label stem 派生且含 static 后缀', async () => {
    const project = await multiAssetProject('c01-g04-08')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    const idInput = mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-id')!
    expect(idInput.value).toBe('c01gamma-static')
  })

  test('新增用途后 undo 还原 sprites 列表', async () => {
    const project = await multiAssetProject('c01-g04-09')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    const before = mounted.session
      .getState()
      .sprites.map((s) => s.id)
      .sort()
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    await fillAndBlur(
      mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-label')!,
      'UndoMe',
    )
    await fillAndBlur(
      mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-id')!,
      'c01-gamma-undo',
    )
    await clickButtonByText(mounted.host, '应用')
    await vi.waitFor(() =>
      expect(mounted!.session.getState().sprites.some((s) => s.id === 'c01-gamma-undo')).toBe(true),
    )
    expect(await applyHistoryAction(mounted.session, 'undo')).toBe(true)
    expect(
      mounted.session
        .getState()
        .sprites.map((s) => s.id)
        .sort(),
    ).toEqual(before)
  })

  test('新增用途 undo 后再 redo 恢复该定义', async () => {
    const project = await multiAssetProject('c01-g04-10')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    await fillAndBlur(
      mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-label')!,
      'RedoMe',
    )
    await fillAndBlur(
      mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-id')!,
      'c01-gamma-redo',
    )
    await clickButtonByText(mounted.host, '应用')
    await vi.waitFor(() =>
      expect(mounted!.session.getState().sprites.some((s) => s.id === 'c01-gamma-redo')).toBe(true),
    )
    expect(await applyHistoryAction(mounted.session, 'undo')).toBe(true)
    expect(await applyHistoryAction(mounted.session, 'redo')).toBe(true)
    expect(mounted.session.getState().sprites.some((s) => s.id === 'c01-gamma-redo')).toBe(true)
  })
})

describe('布局编辑与 session undo/redo', () => {
  test('四向用途每向帧数草稿提交写回 layout.framesPerDir=1', async () => {
    const project = await multiAssetProject('c01-g05-01')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const field = mounted.host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')
    expect(field).not.toBeNull()
    await fillAndBlur(field!, '1')
    await vi.waitFor(() => {
      const def = mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')
      expect(def?.layout).toEqual({ kind: 'directional', framesPerDir: 1 })
    })
  })

  test('布局改动后 undo 恢复 framesPerDir=2', async () => {
    const project = await multiAssetProject('c01-g05-02')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const field = mounted.host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')!
    await fillAndBlur(field, '1')
    await vi.waitFor(() => {
      expect(
        mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout,
      ).toEqual({ kind: 'directional', framesPerDir: 1 })
    })
    expect(await applyHistoryAction(mounted.session, 'undo')).toBe(true)
    expect(
      mounted.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout,
    ).toEqual({ kind: 'directional', framesPerDir: 2 })
  })

  test('static→directional 布局切换写入四向且 framesPerDir 受帧数约束', async () => {
    const project = await multiAssetProject('c01-g05-03')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    const trigger = mounted.host.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')!
    await pickCombobox(trigger, '四向行走')
    await vi.waitFor(() => {
      const layout = mounted!.session
        .getState()
        .sprites.find((s) => s.id === 'c01-beta-static')?.layout
      expect(layout?.kind).toBe('directional')
      if (layout?.kind === 'directional') expect(layout.framesPerDir).toBe(1)
    })
  })

  test('directional→static 切换清除 framesPerDir 字段', async () => {
    const project = await multiAssetProject('c01-g05-04')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    expect(mounted.host.querySelector('#world-sprite-frames-per-dir')).not.toBeNull()
    const trigger = mounted.host.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')!
    await pickCombobox(trigger, '默认定格（默认 #0，可由脚本切帧）')
    await vi.waitFor(() => {
      expect(
        mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout,
      ).toEqual({
        kind: 'static',
      })
    })
    expect(mounted.host.querySelector('#world-sprite-frames-per-dir')).toBeNull()
  })

  test('布局切换成功后 notices 末项为 undefined 清除错误', async () => {
    const project = await multiAssetProject('c01-g05-05')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    mounted.notices.push({ kind: 'error', message: 'stale' })
    const trigger = mounted.host.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')!
    await pickCombobox(trigger, '四向行走')
    await vi.waitFor(() => {
      expect(mounted!.notices.at(-1)).toBeUndefined()
    })
  })

  test('同源两用途布局互不影响：改 walk 不改 idle', async () => {
    const project = await multiAssetProject('c01-g05-06')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const field = mounted.host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')!
    await fillAndBlur(field, '1')
    await vi.waitFor(() => {
      expect(
        mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout,
      ).toEqual({ kind: 'directional', framesPerDir: 1 })
    })
    expect(
      mounted.session.getState().sprites.find((s) => s.id === 'c01-alpha-idle')?.layout,
    ).toEqual({
      kind: 'static',
    })
  })

  test('布局 undo 栈可连续两次撤回独立提交', async () => {
    const project = await multiAssetProject('c01-g05-07')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const field = mounted.host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')!
    await fillAndBlur(field, '1')
    await vi.waitFor(() =>
      expect(
        mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout,
      ).toEqual({ kind: 'directional', framesPerDir: 1 }),
    )
    await fillAndBlur(
      mounted.host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')!,
      '2',
    )
    await vi.waitFor(() =>
      expect(
        mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout,
      ).toEqual({ kind: 'directional', framesPerDir: 2 }),
    )
    expect(await applyHistoryAction(mounted.session, 'undo')).toBe(true)
    expect(
      mounted.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout,
    ).toEqual({ kind: 'directional', framesPerDir: 1 })
    expect(await applyHistoryAction(mounted.session, 'undo')).toBe(true)
    expect(
      mounted.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout,
    ).toEqual({ kind: 'directional', framesPerDir: 2 })
  })

  test('用途页空白文案：有消费者未选时提示选择上方用途', async () => {
    const project = await multiAssetProject('c01-g05-08')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01alpha',
    })
    await waitMeta(mounted.host, 8, 2)
    expect(mounted.host.textContent).toContain('选择上方某个用途定义进行编辑')
  })

  test('无用途资源空白文案提示尚未创建用途定义', async () => {
    const project = await multiAssetProject('c01-g05-09')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    expect(mounted.host.textContent).toContain('尚未创建用途定义')
  })

  test('布局类型 select 在 proof 未就绪前保持 disabled 然后启用', async () => {
    const project = await multiAssetProject('c01-g05-10')
    const asset = 'sprite.authored.c01alpha'
    const path = project.seeded.get(asset)!.path
    const gated = gatedFileSource(project.source)
    const read = gated.gate(path)
    mounted = await suite.mount(project, {
      focus: 'c01-alpha-walk',
      source: gated.source,
      waitForResource: false,
    })
    try {
      const pending = mounted.host.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')
      expect(pending).not.toBeNull()
      expect(pending!.disabled).toBe(true)
      expect(gated.calls).toContain(path)
      expect(gated.completed).not.toContain(path)
    } finally {
      // Release even after a failed assertion, so teardown owns no abandoned read.
      await act(async () => {
        read.resolve()
        await loadEditorSprite(mounted!.reader, asset)
      })
    }
    await waitMeta(mounted.host, 8, 2)
    const trigger = mounted.host.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')
    expect(trigger?.disabled).toBe(false)
  })
})
