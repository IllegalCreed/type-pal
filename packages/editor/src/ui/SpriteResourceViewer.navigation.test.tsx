// @vitest-environment jsdom
/** Navigation and semantics of real indexed-RLE source frames. */
import type { AssetId } from '@type-pal/content'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { installBrowserHardwarePorts } from '../__tests__/cursor-asset-r1/image-ports.js'
import { unmountHost } from '../__tests__/react-host-cleanup.js'
import {
  currentFrameLabel,
  frameCell,
  frameCounter,
  selectFrame,
  toolbarButton,
  waitMeta,
} from '../__tests__/sprite-source-test-gestures.js'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'
import { type MountedViewer, mountViewer } from '../__tests__/world-sprite-viewer-test-host.js'
import { verifyCanonicalObjectWorkspace } from './object-workspace-test-utils.js'

const VIEW_SPECS = [
  {
    asset: 'sprite.view.alpha' as AssetId,
    label: 'AlphaSrc',
    frameCount: 4,
    frameSizes: [
      [8, 8],
      [16, 10],
      [8, 8],
      [10, 12],
    ],
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
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  await installBrowserHardwarePorts()
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

describe('大世界源帧检查器', () => {
  function m(): MountedViewer {
    if (!mounted) throw new Error('not mounted')
    return mounted
  }

  test('真实解码：帧数/用途元数据、onLoaded proof 与 onFramesLoaded 长度一致', async () => {
    const project = await loadWorldSpriteProject('c03-g03-01', VIEW_SPECS)
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
    const { workspace, content } = verifyCanonicalObjectWorkspace(
      m().host,
      '大世界精灵资源工作区',
      {
        tagName: 'DIV',
      },
    )
    const hero = workspace.querySelector(':scope > .ds-object-hero')
    expect(hero).not.toBeNull()
    expect(content.classList.contains('sprite-resource-viewer-scroll')).toBe(true)
    expect(content.querySelector('.sprite-raw-inspector .ds-object-hero')).toBeNull()
    const raw = content.querySelector('.sprite-raw-inspector')
    const semantic = content.querySelector('.semantic-frame-shelf')
    if (!raw || !semantic) throw new Error('Loaded frame panels are missing')
    expect(Boolean(raw.compareDocumentPosition(semantic) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(
      true,
    )
    expect(raw.querySelectorAll('.sprite-resource-frame-grid button')).toHaveLength(4)
    expect(raw.textContent).toContain('追加帧')
    expect(raw.textContent).toContain('替换当前帧')
    expect(raw.textContent).toContain('删除当前帧')
  })

  test('真实帧切换同步首末边界、读数、尺寸及画布标签', async () => {
    const project = await loadWorldSpriteProject('world-frame-navigation', VIEW_SPECS)
    mounted = await mountViewer(project, {
      asset: 'sprite.view.alpha',
      label: 'Alpha 显示',
    })
    await waitMeta(m().host, 4, 2)
    const previous = toolbarButton(m().host, '上一帧')
    const next = toolbarButton(m().host, '下一帧')
    expect(previous.disabled).toBe(true)
    expect(next.disabled).toBe(false)
    expect(frameCounter(m().host)).toMatch(/1\s*\/\s*4/)
    expect(m().host.textContent).toContain('8 × 8 px')
    expect(currentFrameLabel(m().host)).toBe('#0')
    await act(async () => next.click())
    await vi.waitFor(() => {
      expect(mounted!.host.querySelector('canvas[aria-label="Alpha 显示 第 1 帧"]')).not.toBeNull()
    })
    expect(frameCounter(m().host)).toMatch(/2\s*\/\s*4/)
    expect(m().host.textContent).toContain('16 × 10 px')
    await selectFrame(m().host, 3)
    expect(frameCounter(m().host)).toMatch(/4\s*\/\s*4/)
    expect(m().host.textContent).toContain('10 × 12 px')
    expect(m().host.querySelector('canvas[aria-label="Alpha 显示 第 3 帧"]')).not.toBeNull()
    expect(next.disabled).toBe(true)
    expect(previous.disabled).toBe(false)
    await act(async () => {
      expect(toolbarButton(m().host, '删除当前帧').disabled).toBe(false)
      next.click()
      expect(currentFrameLabel(m().host)).toBe('#3')
      previous.click()
    })
    expect(currentFrameLabel(m().host)).toBe('#2')
    expect(m().session.getHistoryVersion()).toBe(0)
  })

  test('未设置用途的帧源仍显示编辑入口和当前帧', async () => {
    const asset = 'sprite.view.unassigned'
    const project = await loadWorldSpriteProject('unassigned-frame-source', [
      { asset, label: '备用帧源', frameCount: 2, definitions: [] },
    ])
    mounted = await mountViewer(project, { asset, label: '备用帧源' })
    await waitMeta(m().host, 2, 0)
    const inspector = m().host.querySelector('[aria-label="源帧检查器"]')!
    expect(inspector.textContent).toContain('这 2 帧尚未设置用途，仍可直接编辑、保留或删除源资源。')
    expect(inspector.querySelector('canvas[aria-label="备用帧源 第 0 帧"]')).not.toBeNull()
    expect(toolbarButton(inspector, '删除当前帧').disabled).toBe(false)
    expect(m().session.getHistoryVersion()).toBe(0)
  })

  test('源帧网格点选：selectedLog 记录且大图切到对应帧', async () => {
    const project = await loadWorldSpriteProject('c03-g03-03', VIEW_SPECS)
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

  test('受控 selectedFrame：外部 setFrame 只更新回显，不伪造选择回调或重载', async () => {
    const project = await loadWorldSpriteProject('c03-g03-04', VIEW_SPECS)
    const paletteRead = vi.spyOn(project.assetBase.assetResolver, 'readRoleText')
    mounted = await mountViewer(project, {
      asset: 'sprite.view.alpha',
      label: 'Alpha 显示',
      controlledFrame: true,
      initialFrame: 0,
    })
    await waitMeta(m().host, 4, 2)
    const previousReads = paletteRead.mock.calls.length
    const previousSelected = [...m().selectedLog]
    const priorProofs = [...m().proofs]
    await m().setFrame(2)
    expect(paletteRead).toHaveBeenCalledTimes(previousReads)
    expect(m().selectedLog).toEqual(previousSelected)
    expect(m().proofs).toEqual(priorProofs)
    expect(m().host.querySelector('canvas[aria-label="Alpha 显示 第 2 帧"]')).not.toBeNull()
  })

  test('换源资源更新帧数与用途，选中帧回到第 0 帧', async () => {
    const project = await loadWorldSpriteProject('c03-g03-06', VIEW_SPECS)
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
    expect(m().host.querySelector('.ds-object-hero__meta')?.textContent).toBe('2 帧 · 1 个用途定义')
    expect(m().proofs.at(-1)?.asset).toBe('sprite.view.beta')
  })

  test('默认定格和命名动作使用不同的帧，动作选择回传定义和动作 ID', async () => {
    const project = await loadWorldSpriteProject('c03-g03-07', [
      {
        asset: 'sprite.view.alpha' as AssetId,
        label: 'AlphaSrc',
        frameCount: 3,
        definitions: [
          {
            id: 'use-alpha',
            label: 'Alpha 用途',
            layout: { kind: 'static' },
            poses: {
              flame: {
                label: '火焰',
                steps: [
                  { frame: 1, durationMs: 120 },
                  { frame: 2, durationMs: 240 },
                ],
                loopFrom: 0,
              },
            },
          },
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
    expect(shelf?.getAttribute('data-presentation')).toBe('full')
    const rows = shelf?.querySelectorAll('.semantic-frame-row')
    expect(rows).toHaveLength(3)
    const action = [...(rows ?? [])].find(
      (row) => row.querySelector('button')?.textContent === '火焰',
    )
    if (!action) throw new Error('The named flame row is missing')
    expect(action.querySelector('.animated canvas')).not.toBeNull()
    expect(
      [...action.querySelectorAll('.sprite-frame-cell:not(.animated) b')].map(
        (node) => node.textContent,
      ),
    ).toEqual(['#1', '#2'])
    expect(shelf?.querySelector('.instance-behavior-shelf')).toBeNull()
    const choose = action.querySelector<HTMLButtonElement>('button')
    await act(async () => choose?.click())
    expect(m().actionSelects).toEqual([['use-alpha', 'flame']])
  })

  test('双资源往返：第二次回到 alpha 仍 4 帧且 proof revision 不变', async () => {
    const project = await loadWorldSpriteProject('c03-g03-08', VIEW_SPECS)
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
})
