// TEST-COVERAGE85-GLM-REFORGE-1 — main.ts 启动合同区间残留分支臂测试。
// 每条测试都走公开 bootGame 入口;jsdom 壳 harness 只模拟浏览器 IO,不 mock 产品业务。
// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { observation } from './__tests__/runtime-shell/driver.js'
import { shellProject, shellScene } from './__tests__/runtime-shell/project.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

const readWorld = (): unknown => Reflect.get(window, '__rfWorld')
const readScene = (): { id: string } => Reflect.get(window, '__rfScene')

test('C85 gallery 臂:?gallery 渲染精灵速查图后安静退出,不发布运行时', async () => {
  host = await installShellHost('?gallery')
  const fixture = await shellProject()
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  const canvas = document.querySelector<HTMLCanvasElement>('canvas#screen')
  expect(canvas?.width).toBe(8 * 80) // 1 个 sprite 资产 → 单行速查图
  expect(Reflect.has(window, '__reforge')).toBe(false)
  expect(host.frames.size).toBe(0) // 未进主循环
})

test('C85 battle-preview 臂:无敌人表的工程按空摆位渲染静态预览', async () => {
  host = await installShellHost('?battle-preview')
  const fixture = await shellProject()
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  const canvas = document.querySelector<HTMLCanvasElement>('canvas#screen')
  expect(canvas?.width).toBe(320 * 4)
  expect(canvas?.height).toBe(200 * 4)
  expect(Reflect.has(window, '__reforge')).toBe(false)
})

test('C85 battle-preview 拒绝臂:未注册的敌人定义 fail-loud 且不进主循环', async () => {
  host = await installShellHost('?battle-preview&enemies=ghost')
  const fixture = await shellProject()
  const { bootGame } = await import('./main.js')
  await expect(
    bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' }),
  ).rejects.toThrow('battle preview 敌人/战斗精灵定义 "ghost" 不存在')
  expect(Reflect.has(window, '__reforge')).toBe(false)
})

test('C85 dev 队伍覆写臂:?party 重排开局队伍并拉满血蓝', async () => {
  host = await installShellHost('?party=friend')
  const fixture = await shellProject({
    seedStats: { friend: { hp: 5, mp: 5 } },
  })
  const { bootGame } = await import('./main.js')
  await bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
  host.frame()
  const world = readWorld() as {
    party: Array<{ template: string; hp: number; mp: number; maxHP: number; maxMP: number }>
  }
  expect(world.party.map((p) => p.template)).toEqual(['friend'])
  expect(world.party[0]?.hp).toBe(world.party[0]?.maxHP)
  expect(world.party[0]?.mp).toBe(world.party[0]?.maxMP)
})

test('C85 运动探针臂:?motion-entity 报告在场实体的坐标与步态', async () => {
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
  expect(readScene().id).toBe('a')
  const canvas = document.querySelector<HTMLCanvasElement>('canvas#screen')
  const probeJson = canvas?.dataset.rfMotionEntity
  expect(probeJson).toBeDefined()
  const probe = JSON.parse(probeJson ?? '{}') as {
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
