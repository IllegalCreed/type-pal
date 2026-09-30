// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { observation } from './__tests__/runtime-shell/driver.js'
import { projectData, shellProject } from './__tests__/runtime-shell/project.js'
import { scenarioProject } from './__tests__/runtime-shell/scenarios.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

test('N01 ?gallery 渲染精灵速查表后直接返回，不进主循环、不发帧', async () => {
  host = await installShellHost('?gallery')
  const fixture = await shellProject()
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  expect(log.mock.calls.map((args) => String(args[0]))).toEqual([
    '[reforge] sprite gallery 1 catalog assets rendered',
  ])
  expect(Reflect.has(window, '__reforge')).toBe(false)
  expect(host.frames.size).toBe(0)
  // 主循环未启动：再无排入帧。
  host.frame()
  expect(host.frames.size).toBe(0)
})

test('N01 ?battle-preview 静态摆位渲染一帧即返回，不进战斗与主循环', async () => {
  host = await installShellHost('?battle-preview=24&enemies=foe')
  const fixture = await scenarioProject({ party: ['hero'] })
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const input = structuredClone(projectData(fixture.project))
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  expect(log.mock.calls.map((args) => String(args[0]))).toEqual([
    '[reforge] battle preview: field 24, 1 敌 / 1 队员',
  ])
  expect(Reflect.has(window, '__reforge')).toBe(false)
  expect(host.frames.size).toBe(0)
  expect(projectData(fixture.project)).toEqual(input)
})

test('N01 ?battle-preview 引用缺失战斗精灵定义时精确拒绝且零帧', async () => {
  host = await installShellHost('?battle-preview=24&enemies=ghost')
  const fixture = await scenarioProject({ party: ['hero'] })
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const failure = await (await import('./main.js'))
    .bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
    .then(
      () => 'resolved' as const,
      (error: Error) => error.message,
    )
  expect(failure).toBe('battle preview 敌人/战斗精灵定义 "ghost" 不存在')
  expect(log).not.toHaveBeenCalled()
  expect(host.frames.size).toBe(0)
})

test('N01 ?party 覆写开局队伍并满血满蓝，不改变工程输入', async () => {
  host = await installShellHost('?party=hero,friend')
  const fixture = await scenarioProject()
  const input = structuredClone(projectData(fixture.project))
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  host.frame()
  const state = observation()
  expect(state.world.party.map((member) => member.template)).toEqual(['hero', 'friend'])
  for (const member of state.world.party) {
    expect(member.hp).toBe(member.maxHP)
    expect(member.mp).toBe(member.maxMP)
  }
  expect(projectData(fixture.project)).toEqual(input)
})

test('N01 空开局队伍在进入世界前精确拒绝，无帧、无 debug 面', async () => {
  host = await installShellHost()
  const fixture = await shellProject({ party: [] })
  const failure = await (await import('./main.js'))
    .bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
    .then(
      () => 'resolved' as const,
      (error: Error) => error.message,
    )
  expect(failure).toBe('reforge: 开局队伍不能为空')
  expect(host.frames.size).toBe(0)
  expect(Reflect.has(window, '__reforge')).toBe(false)
})
