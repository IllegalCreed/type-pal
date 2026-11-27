// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain } from './__tests__/runtime-shell/driver.js'
import { shellProject } from './__tests__/runtime-shell/project.js'

let host: ShellHost | undefined
afterEach(async () => {
  await host?.close()
  host = undefined
})

async function bootWithAudioPreferences(raw: string | null) {
  host = await installShellHost()
  if (raw !== null) localStorage.setItem('reforge:audio', raw)
  const bgmModule = await import('./audio/bgm.js')
  const sfxModule = await import('./audio/sfx.js')
  const musicPreferences: boolean[] = []
  const realCreate = bgmModule.createBgmPlayer
  vi.spyOn(bgmModule, 'createBgmPlayer').mockImplementation((resolver) => {
    const player = realCreate(resolver)
    const setEnabled = player.setEnabled.bind(player)
    vi.spyOn(player, 'setEnabled').mockImplementation((enabled) => {
      musicPreferences.push(enabled)
      setEnabled(enabled)
    })
    return player
  })
  const soundPreferences = vi.spyOn(sfxModule.SfxPlayer.prototype, 'setEnabled')
  const fixture = await shellProject()
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  return { musicPreferences, soundPreferences }
}

test.each([
  ['without stored preferences', null, true, true],
  ['with both channels disabled', '{"music":false,"sound":false}', false, false],
  ['with only music disabled', '{"music":false}', false, true],
  ['with malformed preferences', '{broken json', true, true],
] as const)('startup applies audio preferences %s', async (_title, raw, music, sound) => {
  const { musicPreferences, soundPreferences } = await bootWithAudioPreferences(raw)
  expect(document.title).toBe('Shell Project · reforge')
  expect(musicPreferences).toEqual([music])
  expect(soundPreferences).toHaveBeenCalledExactlyOnceWith(sound)
})

test('pointer and keyboard events wake both real playback adapters', async () => {
  host = await installShellHost()
  const fixture = await shellProject()
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  const contexts = host.audioContexts
  expect(contexts.map(({ state }) => state)).toEqual(['suspended', 'suspended'])

  window.dispatchEvent(new Event('pointerdown'))
  await drain()
  expect(contexts.map(({ state, resumeCalls }) => [state, resumeCalls])).toEqual([
    ['running', 1],
    ['running', 1],
  ])

  // The browser may suspend playback again after navigation or a device change.
  for (const context of contexts) context.state = 'suspended'
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }))
  await drain()
  expect(contexts.map(({ state, resumeCalls }) => [state, resumeCalls])).toEqual([
    ['running', 2],
    ['running', 2],
  ])

  await host.close()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }))
  expect(contexts.map(({ state, resumeCalls }) => [state, resumeCalls])).toEqual([
    ['closed', 2],
    ['closed', 2],
  ])
})
