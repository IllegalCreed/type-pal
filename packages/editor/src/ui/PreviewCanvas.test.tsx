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
          projectId="demo"
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
