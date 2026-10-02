// @vitest-environment jsdom
// Q01 · battle-preview 参数解析残差（排重：N01 已证合法 field+enemies 渲染与缺定义精确拒绝；
// 本文件只补 field 非正/非数回退 24 与 enemies 缺省/空列表臂）。
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { scenarioProject } from './__tests__/runtime-shell/scenarios.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

async function preview(query: string) {
  host = await installShellHost(query)
  const fixture = await scenarioProject()
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  return { log }
}

test.each([
  '?battle-preview=0&enemies=foe',
  '?battle-preview=abc&enemies=foe',
  '?battle-preview=-5&enemies=foe',
] as const)('Q01 非正/非数 field %s 回退默认战场 24', async (query) => {
  const { log } = await preview(query)
  expect(log.mock.calls.map((args) => String(args[0]))).toEqual([
    '[reforge] battle preview: field 24, 1 敌 / 1 队员',
  ])
  expect(host!.frames.size).toBe(0)
})

test('Q01 缺 enemies 参数：默认取工程敌表前 3 项', async () => {
  const { log } = await preview('?battle-preview=24')
  expect(log.mock.calls.map((args) => String(args[0]))).toEqual([
    '[reforge] battle preview: field 24, 1 敌 / 1 队员',
  ])
})

test('Q01 空 enemies 参数：零敌人仍渲染摆位一帧即返回', async () => {
  const { log } = await preview('?battle-preview=24&enemies=')
  expect(log.mock.calls.map((args) => String(args[0]))).toEqual([
    '[reforge] battle preview: field 24, 0 敌 / 1 队员',
  ])
  expect(host!.frames.size).toBe(0)
})
