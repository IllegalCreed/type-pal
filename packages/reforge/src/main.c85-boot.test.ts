// TEST-COVERAGE85-GLM-REFORGE-1 — main.ts 启动合同区间残留分支臂测试。
// 每条测试都走公开 bootGame 入口;jsdom 壳 harness 只模拟浏览器 IO,不 mock 产品业务。
// 观测面只用公开口:runtime-shell driver 的 observation() 与 canvas DEV dataset(DOM 面);
// gallery/battle-preview/party 合同已由既有 main.glm-n.test.ts 覆盖,本文件不重复。
// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key, observation } from './__tests__/runtime-shell/driver.js'
import { shellProject, shellScene } from './__tests__/runtime-shell/project.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

test('C85 运动探针臂:?motion-entity 报告在场实体的坐标与在场性', async () => {
  host = await installShellHost('?motion-entity=npc-1')
  const first = {
    ...shellScene('a'),
    entities: [
      {
        id: 'npc-1',
        sprite: 'walker',
        pos: { col: 4, row: 4, height: 0 },
        facing: 'down' as const,
        collide: false,
      },
    ],
  }
  const fixture = await shellProject({ first })
  const { bootGame } = await import('./main.js')
  await bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
  host.frame()
  // 公开观测:runtime observation 的场景 + canvas DEV dataset 的探针(DOM 面)
  expect(observation().sceneId).toBe('a')
  const canvas = document.querySelector<HTMLCanvasElement>('canvas#screen')
  const probe = JSON.parse(canvas?.dataset.rfMotionEntity ?? '{}') as {
    id: string
    present: boolean
    pos: { col: number; row: number }
  }
  expect(probe).toMatchObject({ id: 'npc-1', present: true, pos: { col: 4, row: 4 } })
})

test('C85 运动探针缺席臂:探针实体不在场时 present=false 仍可观测', async () => {
  host = await installShellHost('?motion-entity=nobody')
  const fixture = await shellProject()
  const { bootGame } = await import('./main.js')
  await bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
  host.frame()
  expect(observation().sceneId).toBe('a')
  const canvas = document.querySelector<HTMLCanvasElement>('canvas#screen')
  const probe = JSON.parse(canvas?.dataset.rfMotionEntity ?? '{}') as { present: boolean }
  expect(probe.present).toBe(false)
})

test('C85 存储回退臂:indexedDB 缺席时回落 MemorySaveStore 并正常开局', async () => {
  host = await installShellHost()
  vi.stubGlobal('indexedDB', undefined)
  try {
    const fixture = await shellProject()
    await (await import('./main.js')).bootGame(fixture.project, {
      kind: 'project',
      projectId: 'shell-project',
    })
    host.frame()
    expect(observation().sceneId).toBe('a')
  } finally {
    vi.unstubAllGlobals()
  }
})

test('C85 标题启动序列臂:无 startup 视频角色的工程按空序列过场直达菜单', async () => {
  host = await installShellHost('?menu')
  const fixture = await shellProject()
  const { bootGame } = await import('./main.js')
  const pending = bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
  // 无 startupTrademark/startupSplash 角色 → playVideoSequence(undefined) 空臂,直接到标题菜单
  await vi.waitFor(() => expect(host!.frames.size).toBeGreaterThanOrEqual(1))
  await key(host, 'ArrowDown')
  await key(host, 'Enter')
  await pending
  host.frame()
  expect(observation().sceneId).toBe('b') // 选中第二入口(既有 H1 同款选择序)
})
