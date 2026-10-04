// TEST-GLM-REFORGE-HOST-LIFECYCLE-1 — main.ts 宿主生命周期合同(bootGame 级)。
// 只走公开 bootGame 入口与公开观测(runtime-shell observation/DOM 面);存档经真实
// IndexedDbSaveStore 预置;视频层为 jsdom 外部媒体 IO 原型替身(仅补齐外部 IO,
// 不替代任何产品业务模块)。覆盖轴:标题读档入口、启动/入口视频、播放中取消窗口、
// 战败读最近档/无档重开、场景 BGM 三态。
// @vitest-environment jsdom
import type { AssetCatalogV1, AuthorSceneDef } from '@type-pal/content'
import { buildWorld } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { chromePng, installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key, observation, until } from './__tests__/runtime-shell/driver.js'
import {
  projectData,
  sceneWithCommands,
  shellProject,
  shellScene,
} from './__tests__/runtime-shell/project.js'
import { sha256Bytes } from './hash.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import { buildCurrentSavePayload } from './save/ops.js'
import { IndexedDbSaveStore } from './save/store.js'
import type { SaveMeta } from './save/types.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

interface VideoFixtureOptions {
  first?: AuthorSceneDef
  introVideoId?: string
  startupRoles?: { trademark: string; splash: string }
}

/** 在合法 fixture 上补登视频资产后走正式装载器重载(经守卫,不绕过校验)。 */
async function projectWithVideos(options: VideoFixtureOptions = {}) {
  const fixture = await shellProject({ first: options.first })
  const catalog = fixture.files['assets/index.json'] as AssetCatalogV1
  const videos = new Map<string, string>()
  const register = async (assetId: string): Promise<void> => {
    const bytes = new TextEncoder().encode(`fixture-video:${assetId}`)
    const path = `assets/generated/${assetId}.mp4`
    catalog.assets[assetId] = {
      kind: 'video',
      path,
      mediaType: 'video/mp4',
      bytes: bytes.length,
      sha256: await sha256Bytes(bytes),
      origin: { kind: 'generated' },
    }
    fixture.binaries.set(path, bytes)
    videos.set(assetId, path)
  }
  if (options.introVideoId) await register(options.introVideoId)
  if (options.startupRoles) {
    await register(options.startupRoles.trademark)
    await register(options.startupRoles.splash)
    const manifest = structuredClone(fixture.project.manifest)
    manifest.assets.roles['video.startupTrademark'] = options.startupRoles.trademark
    manifest.assets.roles['video.startupSplash'] = options.startupRoles.splash
    fixture.files['manifest.json'] = manifest
  }
  if (options.introVideoId) {
    const manifest = structuredClone(fixture.project.manifest)
    const entry = manifest.entryPoints[0]
    if (!entry) throw new Error('fixture entry missing')
    entry.introVideo = options.introVideoId
    fixture.files['manifest.json'] = manifest
  }
  const project = await loadCurrentProjectFrom(fixture.source)
  return { ...fixture, project, videos }
}

function seedMeta(slotId: string, savedAt: number): SaveMeta {
  return {
    slotId,
    kind: slotId === 'quick' ? 'quick' : 'manual',
    party: [{ name: 'Hero', level: 1 }],
    mapName: 'a',
    savedAt,
  }
}

/** 经真实 SaveStore 预置存档(installShellHost 已 stub 全新 indexedDB)。 */
async function seedSlot(
  sceneId: string,
  money: number,
  meta: SaveMeta,
): Promise<IndexedDbSaveStore> {
  const fixture = await shellProject({ money })
  const world = buildWorld(
    fixture.project.manifest.entryPoints[0]!.startWorld,
    fixture.project.actorsById,
  )
  const payload = buildCurrentSavePayload(
    world,
    {
      sceneId,
      pos: sceneId === 'b' ? { col: 4, row: 3, height: 0 } : { col: 2, row: 2, height: 0 },
      facing: sceneId === 'b' ? 'left' : 'down',
    },
    'shell-project',
  )
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await store.putSlot(meta, payload, new Blob([chromePng().slice().buffer], { type: 'image/png' }))
  return store
}

function installVideoIo(): string[] {
  const plays: string[] = []
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
    this: HTMLVideoElement,
  ) {
    plays.push(this.src)
    return Promise.resolve()
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  return plays
}

/** 放映实体:开机自动走一遍 [playVideo, giveMoney] 的 auto 行为(不占全局 runner 槽)。 */
function cinemaScene(): AuthorSceneDef {
  const scene = shellScene('a')
  scene.entities = [
    {
      id: 'cinema',
      sprite: 'walker',
      pos: { col: 4, row: 4, height: 0 },
      facing: 'down',
      pages: [{ id: 'normal', label: 'Normal', auto: 'show' }],
      initialPage: 'normal',
      behaviors: {
        auto: {
          show: {
            label: 'Show',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 's0',
              stages: [
                {
                  id: 's0',
                  body: [
                    { kind: 'playVideo', asset: 'video.intro' },
                    { kind: 'giveMoney', delta: 5 },
                  ],
                  next: { kind: 'complete' },
                },
              ],
            },
          },
        },
      },
    },
  ]
  return scene
}

const liveVideo = (): HTMLVideoElement | null => document.querySelector('video')

/** 含真实异步 IO(IDB/位图解码)的有界推进。 */
async function advance(predicate: () => boolean, frames = 120): Promise<void> {
  for (let i = 0; i < frames && !predicate(); i++) {
    host?.frame(100)
    await drain()
    await host?.settleIO()
  }
  expect(predicate()).toBe(true)
}

async function endLiveVideo(): Promise<void> {
  const video = liveVideo()
  if (!video) throw new Error('no live video to end')
  video.dispatchEvent(new Event('ended'))
  await drain()
}

async function bootAndAwait(fixture: {
  project: Parameters<typeof import('./main.js').bootGame>[0]
}) {
  const { bootGame } = await import('./main.js')
  const pending = bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
  // 全程等待 boot 收口(输入口在 __reforge 注册之后才接线),再进一帧。
  await pending
  host?.frame()
}

test('标题读档入口:标题菜单选读档后从真实存档完成开局', async () => {
  host = await installShellHost('?menu&skip-startup=1')
  await seedSlot('b', 77, seedMeta('quick', Date.now()))
  const fixture = await shellProject()
  const input = structuredClone(projectData(fixture.project))
  const { bootGame } = await import('./main.js')
  const pending = bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
  await vi.waitFor(() => expect(host!.frames.size).toBe(1))
  // 菜单项 = [start, second, 读取进度];两次下移选中读取进度。
  await key(host, 'ArrowDown')
  await key(host, 'ArrowDown')
  await key(host, 'Enter')
  // 读档相位异步载 metas + 缩略图后打开存档浏览(load 模式):以槽位文案出现为确定性信号。
  await vi.waitFor(() => {
    host?.frame()
    expect(host!.text.mock.calls.some((call) => call[1].some((span) => span.text === '快速'))).toBe(
      true,
    )
  })
  // cursor 0=auto(空,确认无效)→ 下移到 quick 后确认读取。
  await key(host, 'ArrowDown')
  await key(host, 'Enter')
  await pending
  host.frame()
  expect(observation().sceneId).toBe('b')
  expect(observation().world.money).toBe(77)
  expect(projectData(fixture.project)).toEqual(input)
})

test('标题入口视频:选中入口先播 intro 视频再进世界', async () => {
  host = await installShellHost('?menu&skip-startup=1')
  const plays = installVideoIo()
  const fixture = await projectWithVideos({ introVideoId: 'video.intro' })
  const { bootGame } = await import('./main.js')
  const pending = bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
  await vi.waitFor(() => expect(host!.frames.size).toBe(1))
  await key(host, 'Enter') // 选中 start(带 introVideo)
  await vi.waitFor(() => expect(liveVideo()).toBeTruthy())
  expect(plays).toEqual([`https://fixture.invalid/${fixture.videos.get('video.intro')}`])
  await endLiveVideo()
  await pending
  host.frame()
  expect(liveVideo()).toBe(null)
  expect(observation().sceneId).toBe('a')
})

test('启动视频序列:无 skip-startup 时按 manifest 角色顺序播完两段再进标题菜单', async () => {
  host = await installShellHost('?menu')
  const plays = installVideoIo()
  const fixture = await projectWithVideos({
    startupRoles: { trademark: 'video.trademark', splash: 'video.splash' },
  })
  const { bootGame } = await import('./main.js')
  const pending = bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
  await vi.waitFor(() => expect(liveVideo()).toBeTruthy())
  await endLiveVideo()
  await vi.waitFor(() => expect(liveVideo()).toBeTruthy())
  await endLiveVideo()
  expect(plays).toEqual([
    `https://fixture.invalid/${fixture.videos.get('video.trademark')}`,
    `https://fixture.invalid/${fixture.videos.get('video.splash')}`,
  ])
  // 两段播完后标题菜单接管帧循环。
  await vi.waitFor(() => expect(host!.frames.size).toBe(1))
  expect(Reflect.has(window, '__reforge')).toBe(false)
  await key(host, 'Escape')
  await key(host, 'Enter')
  await pending
  expect(observation().sceneId).toBe('a')
})

test('播放中快速读档:中止在途视频并按存档游标重放,奖励只结算一次', async () => {
  host = await installShellHost()
  await seedSlot('a', 50, seedMeta('quick', Date.now()))
  const plays = installVideoIo()
  const scene = cinemaScene()
  const fixture = await projectWithVideos({ first: scene, introVideoId: 'video.intro' })
  await bootAndAwait(fixture)
  await vi.waitFor(() => expect(liveVideo()).toBeTruthy())
  expect(plays).toHaveLength(1)
  await key(host, 'F9')
  // auto 行为不占 runner 槽;完成信号 = 快速读档落定 + 行为按存档游标重放一次。
  await advance(() => plays.length === 2)
  await host.settleIO()
  expect(observation().world.money).toBe(50)
  expect(observation().sceneId).toBe('a')
  // 重放的视频播完后,后续奖励恰好结算一次(中止的那次不得结算)。
  await endLiveVideo()
  await advance(() => observation().world.money === 55)
})

test('资源解析中取消:视频 urlFor 返回后不再创建视频层,重放才首次开播', async () => {
  host = await installShellHost()
  await seedSlot('a', 50, seedMeta('quick', Date.now()))
  const plays = installVideoIo()
  const scene = cinemaScene()
  const fixture = await projectWithVideos({ first: scene, introVideoId: 'video.intro' })
  const videoPath = fixture.videos.get('video.intro') ?? ''
  let releaseRead!: () => void
  const gate = new Promise<void>((resolve) => {
    releaseRead = resolve
  })
  fixture.hooks.read = (path) => {
    if (path === videoPath) return gate
  }
  await bootAndAwait(fixture)
  await key(host, 'F9')
  await advance(() => observation().world.money === 50)
  releaseRead()
  // 原请求在 urlFor 返回后不得开播;只有恢复后的重放开播一次。
  await advance(() => plays.length === 1)
  expect(plays).toEqual([`https://fixture.invalid/${fixture.videos.get('video.intro')}`])
  await endLiveVideo()
  await advance(() => observation().world.money === 55)
})

test('战败读最近档:多槽按 savedAt 恢复最新,战败流程不再重开', async () => {
  host = await installShellHost()
  // m02 更旧、m01 更新:证明按 savedAt 而非槽序选择。
  await seedSlot('b', 66, seedMeta('m01', Date.now() + 5000))
  await seedSlot('a', 40, seedMeta('m02', Date.now()))
  const scene = sceneWithCommands('a', [{ kind: 'gameOver' }])
  const fixture = await shellProject({ first: scene })
  await bootAndAwait(fixture)
  // 战败流程:渐红(900ms)→ 经典文案 → 读最近档。
  await until(host, () => observation().dialogue)
  for (let i = 0; i < 6 && observation().dialogue; i++) await key(host, 'Enter', 200)
  await advance(() => !observation().script.running && observation().sceneId === 'b')
  expect(observation().world.money).toBe(66)
})

test('战败无档重开:读档入口在零存档下安静收口,世界不被任何槽替换', async () => {
  host = await installShellHost()
  // jsdom 的 location.reload 为静默 no-op 且不可 spy;jsdom 可观测合同 =
  // 零档下战败链不误读空档、不替换世界、流程干净收口(重开行由覆盖账证明执行)。
  const scene = sceneWithCommands('a', [{ kind: 'gameOver' }])
  const fixture = await shellProject({ first: scene })
  await bootAndAwait(fixture)
  await until(host, () => observation().dialogue)
  for (let i = 0; i < 6 && observation().dialogue; i++) await key(host, 'Enter', 200)
  await advance(() => !observation().script.running)
  expect(observation().world.money).toBe(50)
  expect(observation().sceneId).toBe('a')
})

test('场景 BGM 缺席曲臂:显式 null 停曲并落 world.audio.currentMusic=null,缺省场景延续不写键', async () => {
  host = await installShellHost()
  // a 显式 null(停曲并写 null);b 缺省(延续,不触碰键)。有声资产臂已由既有读档/换景测试覆盖。
  const quietScene: AuthorSceneDef = { ...shellScene('a'), music: null }
  const fixture = await shellProject({ first: quietScene })
  await bootAndAwait(fixture)
  expect(observation().world.audio).toEqual({ currentMusic: null })
  await key(host, ']')
  await advance(() => observation().sceneId === 'b')
  // b 无 music 字段 = 延续:显式 null 不被缺省场景改写。
  expect(observation().world.audio).toEqual({ currentMusic: null })
})
