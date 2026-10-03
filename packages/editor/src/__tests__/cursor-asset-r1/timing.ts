/**
 * C06 计时助手：只假 setInterval/clearInterval（组件内帧轮转），保留真实 setTimeout 与微任务，
 * 使 gzip 解压/资源读取等真实异步仍可完成。`pollUntil` 用真实 setTimeout 轮询，不依赖假时钟。
 */
import { act } from 'react'
import { expect, vi } from 'vitest'

export function useIntervalClock(): void {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
}

export function releaseIntervalClock(): void {
  vi.useRealTimers()
}

export async function pollUntil(
  predicate: () => boolean,
  what: string,
  attempts = 400,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let ok = false
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 5))
      ok = predicate()
    })
    if (ok) return
  }
  expect.fail(`等待超时：${what}`)
}

/** 推进假 interval 时钟并冲刷 React 提交。 */
export async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

/** 真实时间让出若干毫秒（rAF 驱动的画布用）。 */
export async function realDelay(ms: number): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, ms))
  })
}
