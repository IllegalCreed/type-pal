/**
 * TEST-GLM-REFORGE-RUNTIME-SESSION-1 — 帧推进/暂停恢复残项。
 * runtime-frame-session.test.ts 已覆盖相位顺序、战斗采样与帧吞没、模态冻结、暂停不追帧、
 * 长帧上限、单步一次/复位、冻结下的等待、同截止时间等待的逆向结算、取消/预取消/清理族、
 * 错误同步传播与会话独立性;本文件补混合截止时间的渐进子集结算与恢复后淡入的
 * gameplay 时基两轴。
 */
import { expect, test } from 'vitest'
import { frameFixture } from './__tests__/runtime-frame-fixture.js'

test('混合截止时间的等待按到期子集逆向结算,零毫秒等待在下一帧边界先行完成', async () => {
  const f = frameFixture()
  f.tick(100)
  const order: string[] = []
  const a = f.session.wait(50, new AbortController().signal).then(() => order.push('a'))
  const b = f.session.wait(50, new AbortController().signal).then(() => order.push('b'))
  const zero = f.session.wait(0, new AbortController().signal).then(() => order.push('z'))
  const late = f.session.wait(150, new AbortController().signal).then(() => order.push('l'))
  f.tick(150)
  await Promise.all([a, b, zero])
  // 到期子集(z/b/a)按注册逆序结算且含 >= 边界;未到期的 l 保持挂起,不因他人到期被连带结算。
  expect(order).toEqual(['z', 'b', 'a'])
  f.tick(250)
  await late
  expect(order).toEqual(['z', 'b', 'a', 'l'])
})

test('暂停后恢复的淡入从 gameplay 时间推进,不采用墙钟时间', () => {
  const f = frameFixture()
  f.tick(100)
  f.events.length = 0
  f.state.frozen = true
  f.tick(5000)
  // 冻结帧不推淡入。
  expect(f.events.some((event) => event[0] === 'fade')).toBe(false)
  f.events.length = 0
  f.state.frozen = false
  f.tick(5100)
  // 恢复帧的淡入收到 gameplay now(200),绝非 realNow(5100)或冻结前的旧时刻。
  expect(f.events.filter((event) => event[0] === 'fade')).toEqual([['fade', 200]])
})
