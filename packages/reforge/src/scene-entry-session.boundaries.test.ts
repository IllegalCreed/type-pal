/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 F1-F2：场景入场会话（scene-entry-session.ts）。
 * scene-entry-session.test.ts:11-56 已覆盖 prepare/reveal 精确配对与失配 fail-loud——不重复；
 * 本文件补 fade/dither 各维度失配、错误后 session 保持、二次 begin 隔离 token 与旧 complete 不清新事务。
 */
import { describe, expect, test } from 'vitest'
import { SceneEntrySession } from './scene-entry-session.js'

const fade = { kind: 'fade', outMs: 200, inMs: 150 } as const
const dither = { kind: 'dither', ms: 300, source: 'previousPresentedFrame' } as const

describe('F1 reveal 失配分维度与错误后保持', () => {
  test('fade out/in 与 dither ms/source 分别失配即拒；cut 正控；错误后当前 session 保持', () => {
    const session = new SceneEntrySession<string>()
    session.begin('s0', 's1', 'frame-old', fade)
    expect(() => session.startReveal('s1', { kind: 'fade', outMs: 999, inMs: 150 })).toThrow(
      'reveal 与 preflight 契约不一致',
    )
    expect(() => session.startReveal('s1', { kind: 'fade', outMs: 200, inMs: 999 })).toThrow(
      'reveal 与 preflight 契约不一致',
    )
    // 失败不吞 session：正确契约仍可 reveal
    const handle = session.startReveal('s1', fade)
    expect(handle?.phase).toBe('revealing')
    expect(handle?.sourceFrame).toBe('frame-old')
    // dither 维度
    const session2 = new SceneEntrySession<string>()
    session2.begin('s0', 's1', 'f', dither)
    expect(() =>
      session2.startReveal('s1', { kind: 'dither', ms: 300, source: 'held' as never }),
    ).toThrow()
    expect(() =>
      session2.startReveal('s1', { kind: 'dither', ms: 999, source: 'previousPresentedFrame' }),
    ).toThrow()
    expect(session2.startReveal('s1', dither)?.phase).toBe('revealing')
    // cut 正控：任意 cut 契约等价
    const session3 = new SceneEntrySession<string>()
    session3.begin('s0', 's1', 'f', { kind: 'cut' })
    expect(session3.startReveal('s1', { kind: 'cut' })).not.toBeNull()
  })
})

describe('F2 token 隔离与旧 complete', () => {
  test('同场景同配置二次 begin 产生新 token；旧 token complete 不能清新事务', () => {
    const session = new SceneEntrySession<string>()
    const token1 = session.begin('s0', 's1', 'f1', { kind: 'cut' })
    expect(token1).toBe(1)
    const token2 = session.begin('s0', 's1', 'f2', { kind: 'cut' }) // 同配置二次 begin
    expect(token2).toBe(2)
    expect(token2).not.toBe(token1)
    expect(session.heldFrame).toBe('f2') // active 已是第二事务
    session.complete(token1) // 旧 token complete：不得清新事务
    expect(session.active?.sourceFrame).toBe('f2')
    expect(session.heldFrame).toBe('f2')
    session.complete(token2)
    expect(session.active).toBeNull()
    // revealing 后 heldFrame 归 null（旧帧只在 preparing 冻结）
    session.begin('s0', 's1', 'f3', { kind: 'cut' })
    expect(session.heldFrame).toBe('f3')
    session.startReveal('s1', { kind: 'cut' })
    expect(session.heldFrame).toBeNull()
  })
})
