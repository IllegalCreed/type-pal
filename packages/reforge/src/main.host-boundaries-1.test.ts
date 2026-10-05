// TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — main.ts 宿主编排残余合同（bootGame 级）。
// 只走公开 bootGame 入口与公开观测面（runtime-shell observation / renderDebug / 文本渲染
// 旁证 / 真实 IndexedDbSaveStore）；失败注入仅限外部 IO 边界（fixture 文件读取、浏览器
// canvas toBlob），不替换任何产品业务模块。覆盖轴：脚本切场景入场呈现事务、触发脚本
// 运行期错误恢复、?battle= 试打公开终局/错误回执、?battle-scene= 遭遇演出接线、
// F5 存档写失败的单调计数与写队列合同。
// @vitest-environment jsdom
import type { AuthorCommand, AuthorSceneDef } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { chromePng, installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key, observation, type ShellObservation } from './__tests__/runtime-shell/driver.js'
import { sceneWithCommands, shellProject, shellScene } from './__tests__/runtime-shell/project.js'
import { advance, bootScenario, session, state } from './__tests__/runtime-shell/scenarios.js'
import { IndexedDbSaveStore } from './save/store.js'

/** __reforge.renderDebug 的完整公开面（fadeBlack 属产品调试口现有字段，driver 类型未收全）。 */
interface FadeObservation extends ShellObservation {
  readonly renderDebug: { menuActive: boolean; inBattle: boolean; fadeBlack: number }
}
const fadeState = (): FadeObservation => observation() as FadeObservation

let host: ShellHost | undefined
afterEach(async () => {
  // 断言提前失败时也收口真实战斗会话，不悬挂 runner。
  try {
    if (host && state().renderDebug.inBattle) {
      const active = session()
      active.cancel()
      await active.done.catch(() => undefined)
      await drain()
    }
  } catch {
    // boot 未完成时无观测面可收口。
  }
  host?.close()
  host = undefined
})

const spanText = (predicate: (text: string) => boolean): boolean =>
  (host?.text.mock.calls ?? []).some((call) => call[1].some((span) => predicate(span.text)))

/** 帧推进 + 微任务/宏任务双冲刷：切场景与战斗准备链都跨真实 IO 任务边界。 */
async function pumpFrames(frames: number, eachFrame?: () => void): Promise<void> {
  for (let i = 0; i < frames; i++) {
    host?.frame(100)
    eachFrame?.()
    await drain()
    await host?.settleIO()
  }
}

async function waitForHost(predicate: () => boolean): Promise<void> {
  await vi.waitFor(async () => {
    host!.frame()
    await host!.settleIO()
    expect(predicate()).toBe(true)
  })
}

/** 目标场景 onEnter 段显式入场契约：prepare 后按 reveal 呈现，再执行 body。 */
function sceneWithEntry(
  id: string,
  reveal: { kind: 'fade'; outMs: number; inMs: number },
  body: AuthorCommand[],
): AuthorSceneDef {
  const scene = shellScene(id)
  scene.hooks = {
    onEnter: {
      initial: 'main',
      variants: {
        main: {
          label: 'Entry',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 's0',
            stages: [{ id: 's0', entry: { prepare: [], reveal }, body }],
          },
        },
      },
    },
  }
  return scene
}

test('MHB-ENTRY-REVEAL-1 脚本切场景进入带 fade 入场契约的目标：入场事务显式 fade 揭幕后才执行 onEnter 正文', async () => {
  host = await installShellHost()
  const first = sceneWithCommands('a', [{ kind: 'loadScene', scene: 'b' }])
  const second = sceneWithEntry('b', { kind: 'fade', outMs: 260, inMs: 260 }, [
    { kind: 'giveMoney', delta: 9 },
  ])
  const h = await bootScenario(host, { first, second })
  // 入场事务先 fade-out 持有旧帧（峰值到达全黑）再提交；正文入账即证明 reveal 已按契约先行收口。
  let peakFade = 0
  await pumpFrames(80, () => {
    peakFade = Math.max(peakFade, fadeState().renderDebug.fadeBlack)
  })
  expect(state().sceneId).toBe('b')
  expect(state().world.money).toBe(59)
  expect(state().script.running).toBe(false)
  expect(fadeState().renderDebug.fadeBlack).toBe(0)
  expect(peakFade).toBeGreaterThanOrEqual(0.999)
  h.assertInputUnchanged()
})

test('MHB-SCRIPT-ERR-1 触发脚本运行期资源失败：公开脚本错误回执、runner 槽释放、世界保持原状，修复后同一公开入口重试成功', async () => {
  host = await installShellHost()
  const first = sceneWithCommands('a', [])
  first.entities = [
    {
      id: 'gate',
      sprite: 'walker',
      pos: { col: 2, row: 3, height: 0 },
      facing: 'down',
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          trigger: 'go',
          triggerActivation: { on: 'interact', range: 1 },
        },
      ],
      initialPage: 'normal',
      behaviors: {
        trigger: {
          go: {
            label: 'Go',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 's0',
              stages: [{ id: 's0', body: [{ kind: 'loadScene', scene: 'b' }] }],
            },
          },
        },
      },
    },
  ]
  const h = await bootScenario(host, { first })
  // 先等 boot 入口脚本收尾再注入失败；空 onEnter 立即完成。
  await advance(host, () => !state().script.running)
  const before = structuredClone(state().world)
  let failures = 0
  h.fixture.hooks.read = (path) => {
    if (path === 'content/maps/b.json') {
      failures++
      throw new Error('source offline')
    }
  }
  await key(host, ' ')
  await waitForHost(
    // 外部读取错误经装载器携带资产路径上下文；回执前缀钉住错误来源。
    () => spanText((text) => text.startsWith('脚本错误: Error: content/maps/b.json')),
  )
  expect(failures).toBe(1)
  expect(state().script.running).toBe(false)
  expect(state().sceneId).toBe('a')
  expect(state().world).toEqual(before)
  expect(fadeState().renderDebug.fadeBlack).toBe(0)
  // 修复外部源后，同一公开交互入口重试成功，证明错误收口未留下悬挂状态。
  h.fixture.hooks.read = undefined
  await key(host, ' ')
  await pumpFrames(80)
  expect(state().sceneId).toBe('b')
  h.assertInputUnchanged()
})

test('MHB-TRIAL-DONE-1 ?battle= 试打开场：跳过入口 onEnter 演出，真实战斗经公开宿主启动，终局试打结束回执且战果入账', async () => {
  host = await installShellHost('?battle=encounter')
  const first = sceneWithCommands('a', [{ kind: 'giveMoney', delta: 5 }])
  const h = await bootScenario(host, { first })
  await advance(host, () => state().renderDebug.inBattle)
  // 试打入口不得重放入口 onEnter（否则 money=55）。
  expect(state().world.money).toBe(50)
  for (let i = 0; i < 100 && state().renderDebug.inBattle; i++) {
    await key(host, 'Enter', 100)
    await host.settleIO()
  }
  expect(state().renderDebug.inBattle).toBe(false)
  await waitForHost(() => spanText((text) => text === '试打结束:victory'))
  // 真实结算入账：敌 cash 7 恰好一次写入世界。
  expect(state().world.money).toBe(57)
  expect(state().script.running).toBe(false)
  h.assertInputUnchanged()
})

test('MHB-TRIAL-ERROR-1 ?battle= 非法敌队：试打失败公开回执、零战斗会话、宿主保持可操作', async () => {
  host = await installShellHost('?battle=missing-team')
  const h = await bootScenario(host, {})
  await waitForHost(() =>
    spanText((text) => text.startsWith('试打失败:') && text.includes('敌队没有有效敌人')),
  )
  expect(state().renderDebug.inBattle).toBe(false)
  const before = structuredClone(state().world)
  await key(host, 'Escape')
  expect(state().renderDebug.menuActive).toBe(true)
  expect(state().world).toEqual(before)
  h.assertInputUnchanged()
})

test('MHB-SAVE-FAIL-1 F5 缩略图外部 IO 失败：存档失败公开回执、savedTimes 不消费、写队列不毒化，重试成功得首号', async () => {
  host = await installShellHost()
  const fixture = await shellProject()
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  host.frame()
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  // 缩略图走浏览器 canvas toBlob 外部 IO；失败形状（null 回调）是同一外部边界的合法结果。
  const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob')
  toBlob.mockImplementation((callback: BlobCallback) => {
    callback(null)
  })
  await key(host, 'F5')
  await waitForHost(() => spanText((text) => text === '存档失败'))
  expect(await store.getPayload('quick')).toBeNull()
  toBlob.mockImplementation((callback: BlobCallback) => {
    callback(new Blob([chromePng().slice().buffer], { type: 'image/png' }))
  })
  await key(host, 'F5')
  await pumpFrames(40)
  expect(await store.getPayload('quick')).not.toBeNull()
  const metas = await store.listMeta()
  expect(metas.map((meta) => [meta.slotId, meta.savedTimes])).toEqual([['quick', 1]])
  expect(observation().renderDebug.inBattle).toBe(false)
})
