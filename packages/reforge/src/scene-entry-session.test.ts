import { describe, expect, test } from 'vitest'
import { SceneEntrySession } from './scene-entry-session.js'

const dither = {
  kind: 'dither' as const,
  ms: 2160,
  source: 'previousPresentedFrame' as const,
}

describe('SceneEntrySession', () => {
  test('prepare 保持旧帧，reveal 后由 token 精确收口', () => {
    const session = new SceneEntrySession<string>()
    const token = session.begin('s000', 's001', 's000-final', dither)
    expect(session.heldFrame).toBe('s000-final')
    const handle = session.startReveal('s001', dither)
    expect(handle).toMatchObject({ token, phase: 'revealing', sourceFrame: 's000-final' })
    expect(session.heldFrame).toBeNull()
    session.complete(token)
    expect(session.active).toBeNull()
  })

  test('fade prepare 仍冻结 source，compositor 可在其上叠加黑幕', () => {
    const session = new SceneEntrySession<string>()
    session.begin('s001', 's003', 'source', { kind: 'fade', outMs: 260, inMs: 260 })
    expect(session.heldFrame).toBe('source')
  })

  test('reveal 中二次 loadScene 替换旧事务，旧 token 不能清掉新事务', () => {
    const session = new SceneEntrySession<string>()
    const first = session.begin('s000', 's001', 'first', dither)
    session.startReveal('s001', dither)
    const second = session.begin('s001', 's018', 'second', dither)
    session.complete(first)
    expect(session.active?.token).toBe(second)
    expect(session.heldFrame).toBe('second')
  })

  test.each([
    'prepare 中 abort',
    'prepare 命令抛错',
    '读档或 quitToTitle',
    '目标资产加载失败',
  ])('%s 均由宿主 cancel 收口冻结帧', () => {
    const session = new SceneEntrySession<string>()
    session.begin('s000', 's001', 'source', dither)
    session.cancel()
    expect(session.active).toBeNull()
    expect(session.heldFrame).toBeNull()
  })

  test('boot 无旧帧时 reveal 安全跳过', () => {
    const session = new SceneEntrySession<string>()
    expect(session.startReveal('s001', dither)).toBeNull()
  })

  test('目标场景或 reveal 契约失配 fail-loud', () => {
    const session = new SceneEntrySession<string>()
    session.begin('s000', 's001', 'source', dither)
    expect(() => session.startReveal('s002', dither)).toThrow(/场景不匹配/)
    expect(() => session.startReveal('s001', { kind: 'cut' })).toThrow(/契约不一致/)
  })
})
