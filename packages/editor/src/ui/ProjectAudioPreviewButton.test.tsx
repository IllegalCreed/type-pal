// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { stopEditorAudioPreview } from '../core/audio-preview-session.js'
import {
  ProjectAudioPreviewButton,
  type ProjectAudioPreviewTransport,
} from './ProjectAudioPreviewButton.js'

function transport(
  snapshot: () => { paused: boolean } = () => ({ paused: false }),
): ProjectAudioPreviewTransport {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    snapshot: vi.fn(snapshot),
    dispose: vi.fn(),
  }
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  stopEditorAudioPreview()
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

describe('项目资源原位试听', () => {
  test('React 严格模式的 effect 演练不会提前销毁 transport', async () => {
    const current = transport()
    await act(async () => {
      root.render(
        <StrictMode>
          <ProjectAudioPreviewButton
            asset="music.strict"
            label="严格模式音乐"
            kind="music"
            cacheKey="strict"
            reader={{} as never}
            createTransport={() => current}
          />
        </StrictMode>,
      )
      await Promise.resolve()
    })

    expect(current.dispose).not.toHaveBeenCalled()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="试听 严格模式音乐"]')!.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(current.load).toHaveBeenCalledWith('music.strict', 'strict')
    expect(current.play).toHaveBeenCalledOnce()
  })

  test('开始另一项试听会停止旧 owner，切换不共享 transport', async () => {
    const first = transport()
    const second = transport()
    const createTransport = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second)
    const reader = {} as never

    await act(async () =>
      root.render(
        <>
          <ProjectAudioPreviewButton
            asset="music.first"
            label="第一首"
            kind="music"
            cacheKey="first"
            reader={reader}
            createTransport={createTransport}
          />
          <ProjectAudioPreviewButton
            asset="sound.second"
            label="第二个"
            kind="sound"
            cacheKey="second"
            reader={reader}
            createTransport={createTransport}
          />
        </>,
      ),
    )

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="试听 第一首"]')!.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(first.load).toHaveBeenCalledWith('music.first', 'first')
    expect(first.play).toHaveBeenCalledOnce()

    const firstStops = vi.mocked(first.stop).mock.calls.length
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="试听 第二个"]')!.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(first.stop).toHaveBeenCalledTimes(firstStops + 1)
    expect(second.load).toHaveBeenCalledWith('sound.second', 'second')
    expect(second.play).toHaveBeenCalledOnce()
    expect(createTransport).toHaveBeenNthCalledWith(1, 'music', reader)
    expect(createTransport).toHaveBeenNthCalledWith(2, 'sound', reader)
  })

  test('加载失败就释放 owner，并在按钮旁显示可读错误', async () => {
    const failed = transport()
    vi.mocked(failed.load).mockRejectedValueOnce(new Error('资源读取失败'))

    await act(async () =>
      root.render(
        <ProjectAudioPreviewButton
          asset="music.failed"
          label="损坏音乐"
          kind="music"
          cacheKey="failed"
          reader={{} as never}
          createTransport={() => failed}
        />,
      ),
    )
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="试听 损坏音乐"]')!.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(failed.stop).toHaveBeenCalled()
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('资源读取失败')
    expect(host.querySelector('[aria-label="试听 损坏音乐"]')).not.toBeNull()
  })

  test('真实 transport 自然结束后释放 owner 并恢复为可重播状态', async () => {
    vi.useFakeTimers()
    let paused = false
    const current = transport(() => ({ paused }))

    await act(async () =>
      root.render(
        <ProjectAudioPreviewButton
          asset="music.ending"
          label="会自然结束的音乐"
          kind="music"
          cacheKey="ending"
          reader={{} as never}
          createTransport={() => current}
        />,
      ),
    )
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="试听 会自然结束的音乐"]')!.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(host.querySelector('[aria-label="停止试听 会自然结束的音乐"]')).not.toBeNull()

    paused = true
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(host.querySelector('[aria-label="试听 会自然结束的音乐"]')).not.toBeNull()
  })
})
