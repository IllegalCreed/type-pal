// @vitest-environment jsdom

import type { SceneDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Playback } from '../core/playback.js'
import { PreviewCanvas } from './PreviewCanvas.js'

vi.mock('./scene-stage.js', () => ({
  drawGridBlocked: vi.fn(),
  drawTriggerHighlight: vi.fn(),
  useSceneAssets: () => ({
    status: 'loading',
    err: '',
    loadedRef: { current: null },
  }),
  useStageSize: () => ({ w: 640, h: 360 }),
  useViewZoomPan: () => ({
    view: { zoom: 2, panX: 0, panY: 0 },
    viewRef: { current: { zoom: 2, panX: 0, panY: 0 } },
    setView: vi.fn(),
  }),
}))

const scene: SceneDef = {
  id: 'preview-confirm',
  mapId: 'map-preview',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
}

describe('PreviewCanvas confirm controls', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
  })

  test('预览控制使用单行共享工具栏并保持播放、单步与倍速行为', async () => {
    const startPlayback = vi.fn()
    const playback = {
      view: { dialog: null, heldDialog: null, confirm: null },
      mode: 'idle',
      speed: 1,
      pause: vi.fn(),
      resume: vi.fn(),
      play: vi.fn(),
      step: vi.fn(),
      stop: vi.fn(),
      confirmDialog: vi.fn(),
    } as unknown as Playback

    await act(async () => {
      root.render(
        <PreviewCanvas
          scene={scene}
          stages={[]}
          sourceKey="scene:preview-confirm:onEnter:default"
          playIdentity={{
            projectId: 'demo',
            workspaceId: '11111111-1111-4111-8111-111111111111',
            source: 'http',
          }}
          focusEntityId={undefined}
          sprites={[]}
          actorsById={{}}
          leaderSpriteId={undefined}
          assetBase={{} as never}
          assetCatalog={{ version: 1, assets: {} }}
          assetReader={{} as never}
          projectMaps={{}}
          mapIndex={{ version: 1, maps: [] }}
          tilesets={[]}
          locale={{}}
          playback={playback}
          startPlayback={startPlayback}
        />,
      )
      await Promise.resolve()
    })

    const toolbar = host.querySelector<HTMLElement>('[role="toolbar"][aria-label="演出预览控制"]')
    expect(toolbar).not.toBeNull()
    expect(toolbar?.querySelector('.pv-btn, .pv-speed')).toBeNull()
    expect(toolbar?.querySelectorAll('.ds-toolbar__group')).toHaveLength(1)
    expect(toolbar?.querySelector('.preview-toolbar__trailing')).not.toBeNull()

    await act(async () => {
      toolbar?.querySelector<HTMLButtonElement>('button[aria-label="播放"]')?.click()
      toolbar?.querySelector<HTMLButtonElement>('button[aria-label="单步"]')?.click()
    })
    expect(startPlayback).toHaveBeenNthCalledWith(1, false)
    expect(startPlayback).toHaveBeenNthCalledWith(2, true)
    expect(toolbar?.querySelector<HTMLButtonElement>('button[aria-label="重置"]')?.disabled).toBe(
      true,
    )

    const speed = toolbar?.querySelector<HTMLButtonElement>(
      '[role="combobox"][aria-label="预览速度"]',
    )
    expect(speed?.classList.contains('ds-select--compact')).toBe(true)
    await act(async () => speed?.click())
    const twice = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent === '2×',
    )
    await act(async () => twice?.click())
    expect(playback.speed).toBe(2)
    expect(speed?.textContent).toBe('2×')
    await act(async () => speed?.click())
    const selectedTwice = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent === '2×',
    )
    expect(selectedTwice?.getAttribute('aria-selected')).toBe('true')
  })

  test('默认聚焦否，方向/提交/Escape 与按钮都走同一 playback API', async () => {
    const toggleConfirm = vi.fn()
    const submitConfirm = vi.fn()
    const answerConfirm = vi.fn()
    const playback = {
      view: {
        dialog: null,
        heldDialog: { rows: [{ text: '要选择「是」吗？' }] },
        confirm: { selectedYes: false, resolve: vi.fn() },
      },
      mode: 'running',
      speed: 1,
      toggleConfirm,
      submitConfirm,
      answerConfirm,
      pause: vi.fn(),
      resume: vi.fn(),
      play: vi.fn(),
      step: vi.fn(),
      stop: vi.fn(),
      confirmDialog: vi.fn(),
    } as unknown as Playback

    await act(async () => {
      root.render(
        <PreviewCanvas
          scene={scene}
          stages={[]}
          sourceKey="scene:preview-confirm:onEnter:default"
          playIdentity={{
            projectId: 'demo',
            workspaceId: '11111111-1111-4111-8111-111111111111',
            source: 'http',
          }}
          focusEntityId={undefined}
          sprites={[]}
          actorsById={{}}
          leaderSpriteId={undefined}
          assetBase={{} as never}
          assetCatalog={{ version: 1, assets: {} }}
          assetReader={{} as never}
          projectMaps={{}}
          mapIndex={{ version: 1, maps: [] }}
          tilesets={[]}
          locale={{}}
          playback={playback}
        />,
      )
      await Promise.resolve()
    })

    const group = host.querySelector('fieldset.preview-confirm-actions')
    expect(group?.querySelector('legend')?.textContent).toBe('脚本二选一')
    const buttons = [...(group?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    expect(buttons).toHaveLength(2)
    const [noButton, yesButton] = buttons
    expect(noButton?.textContent).toBe('否')
    expect(yesButton?.textContent).toBe('是')
    expect(buttons.every((button) => button.classList.contains('ds-button'))).toBe(true)
    expect(document.activeElement).toBe(noButton)

    await act(async () => {
      noButton?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      )
      noButton?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
      yesButton?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
      yesButton?.click()
    })

    expect(toggleConfirm).toHaveBeenCalledTimes(1)
    expect(submitConfirm).toHaveBeenCalledTimes(1)
    expect(answerConfirm).toHaveBeenNthCalledWith(1, false)
    expect(answerConfirm).toHaveBeenNthCalledWith(2, true)
  })
})
