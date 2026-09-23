// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key, observation, until } from './__tests__/runtime-shell/driver.js'
import { projectData, sceneWithCommands, shellProject } from './__tests__/runtime-shell/project.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

test.each([
  'top',
  'bottom',
  'narration',
  'center',
] as const)('H4 %s author dialogue blocks menu, then closes before its next real command', async (slot) => {
  host = await installShellHost()
  const scene = sceneWithCommands('a', [
    {
      kind: 'dialog',
      cue: {
        identity: { kind: 'narration' },
        slot,
        rows: [
          { text: 'line.one', speed: 0 },
          { text: 'line.two', speed: 0 },
        ],
      },
    },
    { kind: 'giveMoney', delta: 7 },
  ])
  const fixture = await shellProject({ first: scene })
  const input = structuredClone(fixture.files)
  const consumedInput = structuredClone(projectData(fixture.project))
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  await until(host, () => observation().dialogue)
  expect(observation().world.money).toBe(50)
  await key(host, 'Escape')
  expect(observation().dialogue).toBe(true)
  expect(observation().renderDebug.menuActive).toBe(false)
  for (let i = 0; i < 6 && observation().dialogue; i++) await key(host, 'Enter', 200)
  await until(host, () => !observation().script.running)
  expect(observation().world.money).toBe(57)
  expect(observation().dialogue).toBe(false)
  expect(observation().renderDebug.menuActive).toBe(false)
  expect(fixture.files).toEqual(input)
  expect(projectData(fixture.project)).toEqual(consumedInput)
  await key(host, 'Escape')
  expect(observation().renderDebug.menuActive).toBe(true)
})

test('H4 wait resumes from gameplay frames and ignored menu input cannot bypass the wait', async () => {
  host = await installShellHost()
  const fixture = await shellProject({
    first: sceneWithCommands('a', [
      { kind: 'wait', ms: 500 },
      { kind: 'giveMoney', delta: 9 },
    ]),
  })
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  await until(host, () => observation().script.running)
  await key(host, 'Escape', 100)
  expect(observation().renderDebug.menuActive).toBe(false)
  expect(observation().world.money).toBe(50)
  await until(host, () => observation().world.money === 59 && !observation().script.running)
  expect(observation().script.running).toBe(false)
})

test('H4 multi-page dialogue retains its real runner until the last displayed page is acknowledged', async () => {
  host = await installShellHost()
  const fixture = await shellProject({
    first: sceneWithCommands('a', [
      {
        kind: 'dialog',
        cue: {
          identity: { kind: 'narration' },
          slot: 'top',
          rows: Array.from({ length: 6 }, () => ({ text: 'line.one', speed: 0 })),
        },
      },
      { kind: 'giveMoney', delta: 11 },
    ]),
  })
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  await until(host, () => observation().dialogue)
  host.frame(1000)
  await key(host, 'Enter')
  expect(observation().dialogue).toBe(true)
  expect(observation().world.money).toBe(50)
  expect(observation().script.running).toBe(true)
  for (let i = 0; i < 4 && observation().dialogue; i++) await key(host, 'Enter', 300)
  await until(host, () => !observation().script.running)
  expect(observation().world.money).toBe(61)
})

test.each([
  'yes',
  'no',
] as const)('H4 confirm %s consumes keyboard and resumes exactly its current branch', async (choice) => {
  host = await installShellHost()
  const fixture = await shellProject({
    first: sceneWithCommands('a', [
      { kind: 'confirm', onNo: [{ kind: 'giveMoney', delta: 3 }] },
      { kind: 'giveMoney', delta: 5 },
    ]),
  })
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  await until(host, () =>
    host!.text.mock.calls.some((call) => call[1].some((span) => span.text === 'menu.system.yes')),
  )
  // Wait for actual presentation, not merely the outer runner being active.
  // The queue requires two presented frames before an answer may settle.
  host.frame()
  if (choice === 'yes') await key(host, 'ArrowRight')
  await key(host, 'Enter')
  await until(host, () => !observation().script.running)
  expect(observation().world.money).toBe(choice === 'yes' ? 55 : 58)
  expect(observation().renderDebug.menuActive).toBe(false)
})
