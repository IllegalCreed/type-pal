/**
 * TEST-GLM-REFORGE-RUNTIME-SESSION-1 — 输入仲裁残项。
 * runtime-input-router.test.ts 已覆盖 128 层组合链、确认/探索优先级、同帧菜单/对话阻断
 * 调试导航、商店/奖励吞没 Enter/Escape/]、对话层忽略非确认键;本文件只补菜单层对完整
 * 按键集合的原样送达(路由器不预滤、不二次派发任何键)。
 */
import { expect, test } from 'vitest'
import { inputFixture } from './__tests__/runtime-frame-fixture.js'
import { routeRuntimeInput } from './runtime-input-router.js'

test('菜单层原样接收完整按键集合,路由器不预滤也不旁路派发任何键', () => {
  const f = inputFixture()
  f.state.menu = true
  const keys = ['ArrowUp', 'Escape', 'F5', 'x']
  routeRuntimeInput(new Set(keys), 77, f.ports)
  // 方向/取消/快速存档键在菜单帧内归菜单自己解释;路由器不得过滤集合或触发 save/open。
  expect(f.events).toEqual([['menu', keys]])

  const single = inputFixture()
  single.state.menu = true
  routeRuntimeInput(new Set(['[']), 78, single.ports)
  // 调试导航键在菜单帧同样只进菜单,不再触发 changeDebugScene。
  expect(single.events).toEqual([['menu', ['[']]])
})
