// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  InstanceBehaviorShelf,
  SemanticFrameShelf,
  type SpriteFrameView,
} from './SpriteFrameWorkbench.js'

describe('SemanticFrameShelf', () => {
  let host: HTMLDivElement
  let root: Root
  let contextSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    contextSpy.mockRestore()
    host.remove()
  })

  test('单帧行只有具体帧，多帧行首格动画后跟完整帧序', async () => {
    const frames: SpriteFrameView[] = Array.from({ length: 4 }, () => {
      const canvas = document.createElement('canvas')
      canvas.width = 20
      canvas.height = 30
      return { canvas, width: 20, height: 30 }
    })
    const onFrameSelect = vi.fn()
    await act(async () => {
      root.render(
        <SemanticFrameShelf
          frames={frames}
          groups={[
            {
              id: 'fighter',
              label: '战士',
              typeLabel: '玩家战斗',
              active: true,
              rows: [
                { id: 'defend', label: '防御', frames: [3] },
                {
                  id: 'attack',
                  label: '普通攻击',
                  frames: [1, 2, 0],
                  playbackFrames: [1, 2, 0],
                },
              ],
            },
          ]}
          onFrameSelect={onFrameSelect}
        />,
      )
    })
    const rows = host.querySelectorAll('.semantic-frame-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.querySelector('.animated')).toBeNull()
    expect(rows[0]?.querySelectorAll('.sprite-frame-cell')).toHaveLength(1)
    expect(rows[1]?.querySelector('.sprite-frame-cell:first-child')?.classList).toContain(
      'animated',
    )
    expect(rows[1]?.querySelectorAll('.sprite-frame-cell')).toHaveLength(4)
    expect(rows[1]?.textContent).toContain('#1')
    expect(rows[1]?.textContent).toContain('#2')
    expect(rows[1]?.textContent).toContain('#0')

    await act(async () =>
      rows[1]?.querySelector<HTMLButtonElement>('[aria-label^="选择源帧 2"]')?.click(),
    )
    expect(onFrameSelect).toHaveBeenCalledWith(2)
  })

  test('单用途嵌入式动作架不重复外层标题和用途身份头', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 20
    canvas.height = 30
    await act(async () => {
      root.render(
        <SemanticFrameShelf
          presentation="embedded"
          ariaLabel="自定义动作预览"
          frames={[{ canvas, width: 20, height: 30 }]}
          groups={[
            {
              id: 'fighter',
              label: '战士',
              typeLabel: '玩家战斗',
              active: true,
              rows: [{ id: 'idle', label: '待机', frames: [0] }],
            },
          ]}
        />,
      )
    })

    expect(host.querySelector('.semantic-frame-shelf--embedded')).not.toBeNull()
    expect(host.querySelector('.semantic-frame-shelf')?.getAttribute('aria-label')).toBe(
      '自定义动作预览',
    )
    expect(host.querySelector('.semantic-frame-shelf > header')).toBeNull()
    expect(host.querySelector('.semantic-frame-group-head')).toBeNull()
    expect(host.querySelector('.semantic-frame-row-label')?.textContent).toBe('待机')
  })

  test('实例自动行为单独成区，可预览稳定帧序并跳转使用位置', async () => {
    const frames: SpriteFrameView[] = Array.from({ length: 4 }, () => {
      const canvas = document.createElement('canvas')
      canvas.width = 14
      canvas.height = 21
      return { canvas, width: 14, height: 21 }
    })
    const onOpenLocations = vi.fn()
    await act(async () => {
      root.render(
        <InstanceBehaviorShelf
          frames={frames}
          groups={[
            {
              id: 'sprite-8',
              label: '原精灵 8',
              rows: [
                {
                  id: 'loop',
                  label: '自动脚本切帧',
                  frames: [1, 2, 3],
                  playbackFrames: [1, 2, 3],
                  instanceCount: 53,
                  sceneCount: 8,
                  note: '动态仅作帧序示意',
                },
              ],
            },
          ]}
          onOpenLocations={onOpenLocations}
        />,
      )
    })

    const shelf = host.querySelector('.instance-behavior-shelf')!
    expect(shelf.textContent).toContain('场景实例自动行为')
    expect(shelf.textContent).toContain('53 个实例')
    expect(shelf.querySelector('.sprite-frame-cell.animated')).not.toBeNull()
    expect(shelf.querySelectorAll('.semantic-frame-track .sprite-frame-cell')).toHaveLength(4)

    await act(async () =>
      shelf.querySelector<HTMLButtonElement>('.instance-behavior-location-link')?.click(),
    )
    expect(onOpenLocations).toHaveBeenCalledWith('sprite-8')
  })

  test('随机脚本按可能路径分行预览，实例总数不按路径重复累计', async () => {
    const frames: SpriteFrameView[] = Array.from({ length: 4 }, () => {
      const canvas = document.createElement('canvas')
      canvas.width = 44
      canvas.height = 30
      return { canvas, width: 44, height: 30 }
    })
    await act(async () => {
      root.render(
        <InstanceBehaviorShelf
          frames={frames}
          groups={[
            {
              id: 'sprite-72',
              label: '原精灵 72',
              instanceCount: 3,
              rows: [
                {
                  id: 'special',
                  label: '自动脚本随机切帧 · 条件分支（51%）',
                  frames: [0, 2, 3, 2, 0],
                  playbackSteps: [
                    { frame: 0, holdMs: 200 },
                    { frame: 2, holdMs: 280 },
                    { frame: 3, holdMs: 640 },
                    { frame: 2, holdMs: 240 },
                    { frame: 0, holdMs: 160 },
                  ],
                  instanceCount: 3,
                  sceneCount: 3,
                },
                {
                  id: 'ordinary',
                  label: '自动脚本随机切帧 · 未命中分支',
                  frames: [0, 1],
                  playbackSteps: [
                    { frame: 0, holdMs: 200 },
                    { frame: 1, holdMs: 360 },
                  ],
                  instanceCount: 3,
                  sceneCount: 3,
                },
              ],
            },
          ]}
        />,
      )
    })

    const shelf = host.querySelector('.instance-behavior-shelf')!
    expect(shelf.textContent).toContain('3 个实例')
    expect(shelf.textContent).not.toContain('6 个实例')
    expect(shelf.querySelectorAll('.semantic-frame-row')).toHaveLength(2)
    expect(shelf.querySelectorAll('.sprite-frame-cell.animated')).toHaveLength(2)
  })
})
