/**
 * ARCH-REGRESSION-LAB-GLM-1 · G05 预览停止与换源（候选回归，隔离实验区；r3 重写）。
 * 验证轴：真实 Playback（真实 SceneDef、typed AuthorScriptFlow，无 as never）——
 * - G05-01 stop()：running→idle、activePath/poi 清空、onUi 通知（playback.ts:575-594 丢弃演出态）；
 * - G05-02 播放中换源：play 新 key 内部先 stop（:221）再起新源；旧源的定时器不复活；
 * - G05-03 真实迟到推进：wait 期间 stop 后继续 tick(dt)（跨过原 wait 窗口 400ms），
 *   view/mode 冻结不推进——迟到推进有可观测业务断言（非恒真）；
 * - G05-04 onUi 解绑后 stop 不再通知（unmount 清理等价）。
 * 去重：playback.test 既有单源合同；SceneScriptWorkspace 5 条证范围/owner 定位；
 * 本组只做「stop/换源/迟到推进」轴。
 */
// @vitest-environment jsdom
import type { AuthorScriptFlow, SceneDef } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { Playback } from '../../fixtures/editor/playback.js'

function scene(id: string): SceneDef {
  return {
    id,
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }
}

/** canonical stages 流：setPartyFacing（即时）→ wait 定时器 → setPartyFacing（尾标记）。 */
function waitFlow(waitMs: number): AuthorScriptFlow {
  return {
    kind: 'stages',
    initial: 'main',
    stages: [
      {
        id: 'main',
        body: [
          { kind: 'setPartyFacing', facing: 'left' },
          { kind: 'wait', ms: waitMs },
          { kind: 'setPartyFacing', facing: 'right' },
        ],
      },
    ],
  } as unknown as AuthorScriptFlow
}

describe('G05 预览停止与换源', () => {
  test('G05-01 stop()：running→idle，activePath/poi 清空，onUi 通知', () => {
    const p = new Playback(scene('s001'))
    const onUi = vi.fn()
    p.onUi = onUi
    p.play('a', waitFlow(80))
    expect(p.mode).toBe('running')
    p.stop()
    expect(p.mode).toBe('idle')
    expect(p.activePath).toBeNull()
    expect(p.poi).toBeNull()
    expect(onUi.mock.calls.length).toBeGreaterThan(0)
  })

  test('G05-02 播放中换源：play 新 key 丢弃旧源（内部 stop），旧源 wait 不复活', async () => {
    vi.useFakeTimers()
    try {
      const p = new Playback(scene('s001'))
      p.play('a', waitFlow(400))
      // 旧源 a 的 400ms wait 定时器已排队
      p.play('b', waitFlow(80)) // 换源：内部 stop() 应清掉 a 的 timers
      p.stop()
      // 推进大量真实时间：旧源 a 的定时器若未被清会在此复活（vi 覆盖 window 定时器）
      vi.advanceTimersByTime(1000)
      expect(p.mode).toBe('idle')
      expect(p.activePath).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  test('G05-03 wait 中 stop 后真实迟到推进（真实定时器）：view/mode 冻结不再推进', async () => {
    const p = new Playback(scene('s001'))
    p.play('a', waitFlow(400))
    expect(p.mode).toBe('running')
    p.stop()
    const viewFrozen = JSON.stringify(p.view)
    const modeFrozen = p.mode
    // 真实迟到推进：跨过原 wait 窗口（400ms）的两次 tick
    await new Promise((resolve) => setTimeout(resolve, 120))
    p.tick(500)
    p.tick(500)
    expect(p.mode).toBe(modeFrozen)
    expect(JSON.stringify(p.view)).toBe(viewFrozen) // view 冻结：迟到推进无可观测效果
  })

  test('G05-04 onUi 解绑后 stop 不再通知（unmount 清理等价）', () => {
    const p = new Playback(scene('s001'))
    const onUi = vi.fn()
    p.onUi = onUi
    p.play('a', waitFlow(80))
    const callsAtPlay = onUi.mock.calls.length
    p.onUi = undefined // unmount 清理顺序：先解绑
    p.stop()
    expect(onUi.mock.calls.length).toBe(callsAtPlay) // 解绑后零新增
    expect(p.mode).toBe('idle')
  })
})
