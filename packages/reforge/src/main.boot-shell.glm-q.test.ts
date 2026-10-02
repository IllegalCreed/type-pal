// @vitest-environment jsdom
// Q01 · main.ts boot 级非剧情残差（排重：H1 boot-flows/N01 gallery·preview·party 已证正常
// 管线与缺定义拒绝；本文件只补旧试放参数守卫、音频偏好解析/手势恢复接线、gallery 解码容错）。
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { shellProject } from './__tests__/runtime-shell/project.js'
import { scenarioProject } from './__tests__/runtime-shell/scenarios.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

test.each([
  '?battle-trial=0&money=0',
  '?skill=heal',
] as const)('Q01 旧试放/独立试打参数在 bootGame 入口精确拒绝 %s', async (query) => {
  host = await installShellHost(query)
  const fixture = await shellProject()
  const failure = await (await import('./main.js'))
    .bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
    .then(
      () => 'resolved' as const,
      (error: Error) => error.message,
    )
  expect(failure).toBe('旧试放链接或未授权独立试打请求；请从编辑器的战斗模拟器重新开始')
  expect(host.frames.size).toBe(0)
})

async function bootWithAudioPrefs(raw: string | null) {
  host = await installShellHost()
  if (raw !== null) localStorage.setItem('reforge:audio', raw)
  const bgmModule = await import('./audio/bgm.js')
  const sfxModule = await import('./audio/sfx.js')
  const bgmInstances: { setEnabled: (on: boolean) => void; resume: () => void }[] = []
  const setEnabledCalls: { player: 'bgm' | 'sfx'; on: boolean }[] = []
  const realCreate = bgmModule.createBgmPlayer
  vi.spyOn(bgmModule, 'createBgmPlayer').mockImplementation((resolver) => {
    const player = realCreate(resolver)
    bgmInstances.push(player)
    vi.spyOn(player, 'setEnabled').mockImplementation((on: boolean) => {
      setEnabledCalls.push({ player: 'bgm', on })
    })
    return player
  })
  vi.spyOn(sfxModule.SfxPlayer.prototype, 'setEnabled').mockImplementation(function (
    this: InstanceType<typeof sfxModule.SfxPlayer>,
    on: boolean,
  ) {
    setEnabledCalls.push({ player: 'sfx', on })
  })
  const fixture = await shellProject()
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  return { bgmInstances, setEnabledCalls, fixture }
}

test('Q01 无偏好存储：音乐/音效默认全开，标题带工程名', async () => {
  const { setEnabledCalls } = await bootWithAudioPrefs(null)
  expect(document.title).toBe('Shell Project · reforge')
  expect(setEnabledCalls).toEqual([
    { player: 'bgm', on: true },
    { player: 'sfx', on: true },
  ])
})

test('Q01 显式双关偏好落盘：setEnabled(false) 各一次', async () => {
  const { setEnabledCalls } = await bootWithAudioPrefs('{"music":false,"sound":false}')
  expect(setEnabledCalls).toEqual([
    { player: 'bgm', on: false },
    { player: 'sfx', on: false },
  ])
})

test('Q01 半开关偏好只关音乐：缺省 sound 键按开启解析', async () => {
  const { setEnabledCalls } = await bootWithAudioPrefs('{"music":false}')
  expect(setEnabledCalls).toEqual([
    { player: 'bgm', on: false },
    { player: 'sfx', on: true },
  ])
})

test('Q01 坏偏好 JSON 静默回退全开，不抛出', async () => {
  const { setEnabledCalls } = await bootWithAudioPrefs('{broken json')
  expect(setEnabledCalls).toEqual([
    { player: 'bgm', on: true },
    { player: 'sfx', on: true },
  ])
})

test('Q01 手势解锁接线：pointerdown/keydown 捕获相各自触发 bgm.resume', async () => {
  host = await installShellHost()
  const bgmModule = await import('./audio/bgm.js')
  const resumes: number[] = []
  const realCreate = bgmModule.createBgmPlayer
  vi.spyOn(bgmModule, 'createBgmPlayer').mockImplementation((resolver) => {
    const player = realCreate(resolver)
    vi.spyOn(player, 'resume').mockImplementation(() => {
      resumes.push(resumes.length + 1)
    })
    return player
  })
  const fixture = await shellProject()
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  expect(resumes).toEqual([])
  window.dispatchEvent(new Event('pointerdown'))
  expect(resumes).toHaveLength(1)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }))
  expect(resumes).toHaveLength(2)
  host.close()
  host = undefined
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }))
  expect(resumes).toHaveLength(2) // close 后监听已移除
})

test('Q01 gallery 精灵解码失败静默占位并照常收尾；零 sprite 资产照常返回', async () => {
  host = await installShellHost('?gallery')
  const fixture = await scenarioProject()
  const corrupt = new TextEncoder().encode('not-an-rle-chunk')
  const spriteEntry = fixture.project.assetResolver.catalog.assets.sprite
  const spritePath = spriteEntry?.path
  expect(spritePath).toBeDefined()
  fixture.binaries.set(spritePath!, corrupt)
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  expect(log.mock.calls.map((args) => String(args[0]))).toEqual([
    '[reforge] sprite gallery 1 catalog assets rendered',
  ])
  expect(host.frames.size).toBe(0)
})
