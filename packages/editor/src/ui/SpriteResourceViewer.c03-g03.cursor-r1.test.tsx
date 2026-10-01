// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C03-G03：SpriteResourceViewer 真实解码、切帧与切资源。
 * 排重：SpriteResourceViewer.test 在 mock loadEditorSprite 下已证 DOM/onLoaded 形状与
 * 「一次解码后切帧」；本组经真实 reader/cache/色盘链补：帧元数据、共享用途计数、
 * 工具栏/网格切帧、受控 selectedFrame、onFramesLoaded 与 definition 选择回调。
 */
import type { AssetId } from '@type-pal/content'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { installBrowserHardwarePorts } from '../__tests__/cursor-asset-r1/image-ports.js'
import { useActEnvironment } from '../__tests__/cursor-asset-r1/kit.js'
import { loadCursorSpriteProject } from '../__tests__/cursor-asset-r1/sprite-fixtures.js'
import {
  type MountedViewer,
  mountViewer,
  unmountHost,
} from '../__tests__/cursor-asset-r1/upload-harness.js'
import {
  currentFrameLabel,
  frameCell,
  frameCounter,
  selectFrame,
  toolbarButton,
  waitMeta,
} from '../__tests__/cursor-asset-r1/upload-ui.js'

const VIEW_SPECS = [
  {
    asset: 'sprite.view.alpha' as AssetId,
    label: 'AlphaSrc',
    frameCount: 4,
    definitions: [
      { id: 'use-alpha', label: 'Alpha 用途', layout: { kind: 'static' as const } },
      { id: 'use-alpha-b', label: 'Alpha 副用途', layout: { kind: 'static' as const } },
    ],
  },
  {
    asset: 'sprite.view.beta' as AssetId,
    label: 'BetaSrc',
    frameCount: 2,
    definitions: [{ id: 'use-beta', label: 'Beta 用途', layout: { kind: 'static' as const } }],
  },
] as const

let mounted: MountedViewer | undefined

beforeEach(async () => {
  useActEnvironment()
  await installBrowserHardwarePorts()
})

afterEach(async () => {
  if (mounted) await unmountHost(mounted)
  mounted = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C03-G03 真实解码与切帧', () => {
  function m(): MountedViewer {
    if (!mounted) throw new Error('not mounted')
    return mounted
  }

  test('C03-G03-01 真实解码：帧数/用途元数据、onLoaded proof 与 onFramesLoaded 长度一致', async () => {
    const project = await loadCursorSpriteProject('c03-g03-01', VIEW_SPECS)
    mounted = await mountViewer(project, {
      asset: 'sprite.view.alpha',
      label: 'Alpha 显示',
    })
    await waitMeta(m().host, 4, 2)
    expect(m().proofs.at(-1)).toEqual({
      asset: 'sprite.view.alpha',
      revision: project.seeded.get('sprite.view.alpha')!.sha256,
      actualFrameCount: 4,
    })
    expect(m().framesLog.at(-1)).toHaveLength(4)
    expect(m().host.textContent).toContain('由 2 个用途共享')
  })

  test('C03-G03-02 工具栏「下一帧」循环读数与 canvas aria-label 同步', async () => {
    const project = await loadCursorSpriteProject('c03-g03-02', VIEW_SPECS)
    mounted = await mountViewer(project, {
      asset: 'sprite.view.alpha',
      label: 'Alpha 显示',
    })
    await waitMeta(m().host, 4, 2)
    expect(m().host.textContent).toContain('8 × 8 px')
    expect(currentFrameLabel(m().host)).toBe('#0')
    await act(async () => toolbarButton(m().host, '下一帧').click())
    await vi.waitFor(() => {
      expect(mounted!.host.querySelector('canvas[aria-label="Alpha 显示 第 1 帧"]')).not.toBeNull()
    })
    expect(frameCounter(m().host)).toMatch(/2\s*\/\s*4/)
  })

  test('C03-G03-03 源帧网格点选：selectedLog 记录且大图切到对应帧', async () => {
    const project = await loadCursorSpriteProject('c03-g03-03', VIEW_SPECS)
    mounted = await mountViewer(project, {
      asset: 'sprite.view.alpha',
      label: 'Alpha 显示',
    })
    await waitMeta(m().host, 4, 2)
    await selectFrame(m().host, 3)
    expect(m().selectedLog.at(-1)).toBe(3)
    expect(m().host.querySelector('canvas[aria-label="Alpha 显示 第 3 帧"]')).not.toBeNull()
    expect(frameCell(m().host, 3).classList.contains('selected')).toBe(true)
  })

  test('C03-G03-04 受控 selectedFrame：外部 setFrame 驱动 viewer 与回调', async () => {
    const project = await loadCursorSpriteProject('c03-g03-04', VIEW_SPECS)
    mounted = await mountViewer(project, {
      asset: 'sprite.view.alpha',
      label: 'Alpha 显示',
      controlledFrame: true,
      initialFrame: 0,
    })
    await waitMeta(m().host, 4, 2)
    await m().setFrame(2)
    expect(m().selectedLog.at(-1)).toBe(2)
    await vi.waitFor(() => {
      expect(mounted!.host.querySelector('canvas[aria-label="Alpha 显示 第 2 帧"]')).not.toBeNull()
    })
  })

  test('C03-G03-05 切到第二资源：标题/帧数/用途计数整体换为 beta', async () => {
    const project = await loadCursorSpriteProject('c03-g03-05', VIEW_SPECS)
    mounted = await mountViewer(project, {
      asset: 'sprite.view.alpha',
      label: 'Alpha 显示',
    })
    await waitMeta(m().host, 4, 2)
    await m().setAsset('sprite.view.beta', 'Beta 显示')
    await waitMeta(m().host, 2, 1)
    expect(m().host.textContent).toContain('Beta 显示')
    expect(m().host.textContent).toContain('2 帧 · 1 个用途定义')
    expect(m().proofs.at(-1)?.asset).toBe('sprite.view.beta')
  })

  test('C03-G03-06 切资源时帧选择归零（beta 仅 2 帧，大图回到 #0）', async () => {
    const project = await loadCursorSpriteProject('c03-g03-06', VIEW_SPECS)
    mounted = await mountViewer(project, {
      asset: 'sprite.view.alpha',
      label: 'Alpha 显示',
    })
    await waitMeta(m().host, 4, 2)
    await selectFrame(m().host, 3)
    await m().setAsset('sprite.view.beta', 'Beta 显示')
    await waitMeta(m().host, 2, 1)
    expect(m().host.querySelector('canvas[aria-label="Beta 显示 第 0 帧"]')).not.toBeNull()
    expect(m().selectedLog.at(-1)).toBe(0)
  })

  test('C03-G03-07 语义 shelf 展示两用途默认定格行与默认 #0 提示', async () => {
    const project = await loadCursorSpriteProject('c03-g03-07', [
      {
        asset: 'sprite.view.alpha' as AssetId,
        label: 'AlphaSrc',
        frameCount: 3,
        definitions: [
          { id: 'use-alpha', label: 'Alpha 用途', layout: { kind: 'static' } },
          { id: 'use-alpha-b', label: 'Alpha 副用途', layout: { kind: 'static' } },
        ],
      },
    ])
    mounted = await mountViewer(project, {
      asset: 'sprite.view.alpha',
      label: 'Alpha 显示',
      activeDefinitionId: 'use-alpha',
    })
    await waitMeta(m().host, 3, 2)
    const shelf = m().host.querySelector('.semantic-frame-shelf')
    expect(shelf?.textContent).toContain('默认使用 #0')
    expect(shelf?.textContent).toContain('Alpha 用途')
    expect(shelf?.textContent).toContain('Alpha 副用途')
    expect(m().host.querySelectorAll('.semantic-frame-row')).toHaveLength(2)
  })

  test('C03-G03-08 双资源往返：第二次回到 alpha 仍 4 帧且 proof revision 不变', async () => {
    const project = await loadCursorSpriteProject('c03-g03-08', VIEW_SPECS)
    const revision = project.seeded.get('sprite.view.alpha')!.sha256
    mounted = await mountViewer(project, {
      asset: 'sprite.view.alpha',
      label: 'Alpha 显示',
    })
    await waitMeta(m().host, 4, 2)
    await m().setAsset('sprite.view.beta', 'Beta 显示')
    await waitMeta(m().host, 2, 1)
    await m().setAsset('sprite.view.alpha', 'Alpha 再开')
    await waitMeta(m().host, 4, 2)
    expect(m().proofs.at(-1)).toEqual({
      asset: 'sprite.view.alpha',
      revision,
      actualFrameCount: 4,
    })
  })

  test('C03-G03-09 「下一帧」从 #0 进入 #1', async () => {
    const project = await loadCursorSpriteProject('c03-g03-09', VIEW_SPECS)
    mounted = await mountViewer(project, {
      asset: 'sprite.view.beta',
      label: 'Beta 显示',
    })
    await waitMeta(m().host, 2, 1)
    await act(async () => toolbarButton(m().host, '下一帧').click())
    await vi.waitFor(() => {
      expect(mounted!.host.querySelector('canvas[aria-label="Beta 显示 第 1 帧"]')).not.toBeNull()
    })
  })

  test('C03-G03-10 catalog 无记录时 harness 显示占位且不触发 proof', async () => {
    const project = await loadCursorSpriteProject('c03-g03-10', VIEW_SPECS)
    mounted = await mountViewer(project, {
      asset: 'sprite.missing.asset' as AssetId,
      label: '缺失',
    })
    await vi.waitFor(() => {
      expect(mounted!.host.querySelector('[data-testid="viewer-no-record"]')).not.toBeNull()
    })
    expect(m().proofs).toEqual([])
  })
})
