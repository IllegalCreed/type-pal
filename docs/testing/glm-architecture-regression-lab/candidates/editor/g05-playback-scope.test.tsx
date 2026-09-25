/**
 * ARCH-REGRESSION-LAB-GLM-1 · G05 预览停止与换源（候选回归，隔离实验区；r7 重写）。
 * 验证轴：
 * - G05-01 stop()：running→idle、activePath/poi 清空、onUi 通知（playback.ts:575-594）；
 * - G05-02 播放中换源：play 新 key 内部先 stop（:221）再起新源——旧 wait 进入有见证
 *   （tick(100) 后 facing=up 且 mode=running），固定推进 1200ms 越过旧源剩余窗口（300ms）
 *   后终值 = 新源 left、mode=done：旧源余量若复活即红；
 * - G05-03 真实迟到推进：wait 期间 stop 后继续 tick(dt)（跨过原 wait 窗口 400ms），
 *   view/mode 冻结不推进——迟到推进有可观测业务断言（非恒真）；
 * - G05-04 **真实工作区卸载**：挂载 CanonicalSceneScriptWorkspace（真实 PreviewCanvas 面板），
 *   点真实「播放」按钮（entered 见证 playCanonical 真被调用），卸载前后比较**同实例 stop 调用增量**
 *   （生产启动即 stop、挂载/换源 effect 也 stop，仅"曾调用"无法鉴别清理缺失）；
 *   配套单点反控见 tools/red-control.mjs g05-unmount-cleanup 针。
 * 去重：playback.test 既有单源合同；SceneScriptWorkspace.test 5 条证范围/owner 定位（预览渲染探针）；
 * 本组只做「stop/换源/迟到推进/卸载清理」轴。
 */
// @vitest-environment jsdom
import { CanonicalSceneScriptWorkspace } from '@lab/editor/scene-script-workspace'
import type { AuthorSceneDef, SceneDef, ScriptStage } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Playback } from '../../fixtures/editor/playback.js'

function scene(id: string): SceneDef {
  return {
    id,
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }
}

/** 真实 ScriptStage 流：setPartyFacing（即时）→ wait 计时 → setPartyFacing（尾标记，朝向可区分）。 */
function waitStages(waitMs: number, tailFacing: 'left' | 'right'): ScriptStage[] {
  return [
    {
      body: [
        { kind: 'setPartyFacing', facing: 'up' },
        { kind: 'wait', ms: waitMs },
        { kind: 'setPartyFacing', facing: tailFacing },
      ],
    },
  ]
}

describe('G05 预览停止与换源', () => {
  test('G05-01 stop()：running→idle，activePath/poi 清空，onUi 通知', () => {
    const p = new Playback(scene('s001'))
    const onUi = vi.fn()
    p.onUi = onUi
    p.play('a', waitStages(80, 'right'))
    expect(p.mode).toBe('running')
    p.stop()
    expect(p.mode).toBe('idle')
    expect(p.activePath).toBeNull()
    expect(p.poi).toBeNull()
    expect(onUi.mock.calls.length).toBeGreaterThan(0)
  })

  test('G05-02 播放中换源：宿主 wait 真实挂起（全量冲刷后流仍停在 wait），越过旧源剩余窗口后尾命令不复活', async () => {
    const p = new Playback(scene('s001'))
    p.play('a', waitStages(400, 'right')) // 旧源 a：400ms 后尾命令置 right
    // 旧 wait「已挂起」判别：全量冲刷宏任务边界（runner 微任务续体全部落定，零 tick）
    // 后，setPartyFacing up 已执行（facing=up）而流仍未完成（mode=running）——
    // 若宿主 wait 立即完成（timers.push 改立即 resolve 的反控变异），流会在冲刷内直冲
    // 尾命令 → mode=done/facing=right，以下两条即红（Codex r8 CODEX_G05_NO_WAIT_HIT 场景）
    for (let i = 0; i < 4; i++) await new Promise((resolve) => setTimeout(resolve, 0))
    expect(p.view.player.facing).toBe('up')
    expect(p.mode).toBe('running')
    p.tick(100) // 消耗旧 wait 100ms（余 300ms 未决）——wait 真实挂起才会停在这
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(p.mode).toBe('running')
    p.play('b', waitStages(80, 'left')) // 换源 b：内部 stop 必须丢弃 a 的未决等待
    // 不以新源 done 即停：固定推进 1200ms，越过 b 窗口（80ms）**和** a 的剩余窗口（300ms）+ 余量；
    // 每 tick 后冲刷微任务让 runner 续体落盘
    for (let i = 0; i < 120; i++) {
      p.tick(10)
      await Promise.resolve()
    }
    expect(p.mode).toBe('done') // 新源真实跑到流末（非"新源立刻 stop"）
    expect(p.view.player.facing).toBe('left') // 终值 = b 的尾命令；a 的余量若复活会覆盖成 right
  })

  test('G05-03 wait 中 stop 后真实迟到推进（真实定时器）：view/mode 冻结不再推进', async () => {
    const p = new Playback(scene('s001'))
    p.play('a', waitStages(400, 'right'))
    expect(p.mode).toBe('running')
    p.stop()
    const viewFrozen = JSON.stringify(p.view)
    const modeFrozen = p.mode
    // 真实迟到推进：跨过原 wait 窗口（400ms）的两次 tick
    await new Promise((resolve) => setTimeout(resolve, 120))
    p.tick(500)
    p.tick(500)
    expect(p.mode).toBe(modeFrozen)
    expect(JSON.stringify(p.view)).toBe(viewFrozen) // view 冻结：迟到推进无可观测效果
  })
})

// ── G05-04 真实工作区卸载（CanonicalSceneScriptWorkspace + 真实 PreviewCanvas 面板）────────

function canonicalScene(id: string): AuthorSceneDef {
  return {
    id,
    mapId: `map-${id}`,
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    hooks: {
      onEnter: {
        initial: 'default',
        variants: {
          default: {
            label: '进场方案',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [
                {
                  id: 'start',
                  body: [{ kind: 'setPartyFacing', facing: 'left' }],
                },
              ],
            },
          },
        },
      },
    },
  }
}

describe('G05-04 真实工作区卸载清理', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal('localStorage', window.localStorage)
    window.localStorage.clear()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 320,
        bottom: 240,
        width: 320,
        height: 240,
        toJSON: () => ({}),
      }),
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value(this: HTMLCanvasElement) {
        return {
          canvas: this,
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
        }
      },
    })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('真实播放按钮启动 playCanonical，卸载后同实例 stop 调用**增量**>0（生产启动即 stop 不再掩蔽清理缺失）', async () => {
    // 生产 playCanonical 启动即内部 stop、挂载/换源 effect 也会 stop（playback.ts:299、
    // SceneScriptWorkspace.tsx:188-194）——"stop 曾被调用"无法鉴别卸载清理。
    // 本例钉：同一 Playback 实例上，卸载前记录 stop 调用数（含启动期），卸载后必须出现
    // **新增** stop 调用；且单点反控（删卸载 cleanup）下此增量断言转红（见 tools/red-control.mjs g05 针）。
    const canonical = canonicalScene('sL')
    const playSpy = vi.spyOn(Playback.prototype, 'playCanonical')
    const stopSpy = vi.spyOn(Playback.prototype, 'stop')
    await act(async () =>
      root.render(
        <CanonicalSceneScriptWorkspace
          scene={scene('sL')}
          state={{ scenes: [canonical], items: [], sharedScripts: {} }}
          selectedEntityId={null}
          locale={{}}
          sprites={[]}
          actorsById={{}}
          leaderSpriteId={undefined}
          assetBase={{} as never}
          projectMaps={{}}
          mapIndex={{ version: 1, maps: [] }}
          tilesets={[]}
          assetCatalog={{ version: 1, assets: {} }}
          assetReader={{} as never}
          playIdentity={{
            projectId: 'lab',
            workspaceId: '11111111-1111-4111-8111-111111111111',
            source: 'http',
          }}
          referenceStatus="current"
          onDispatch={() => {}}
        />,
      ),
    )
    // entered：真实「播放」控件存在（PreviewCanvas 演出预览控制 toolbar，idle 态 aria-label=播放）
    const play = host.querySelector<HTMLButtonElement>('button[aria-label="播放"]')
    expect(play).not.toBeNull()
    await act(async () => play!.click())
    expect(playSpy).toHaveBeenCalled() // entered-proof：播放真的启动（而非点击被吞）
    // 以 playCanonical 的 this 锁定工作区创建的同一 Playback 实例
    const instance = playSpy.mock.contexts[0] as Playback | undefined
    expect(instance).toBeDefined()
    const stopCallsBeforeUnmount = stopSpy.mock.calls.filter(
      (_call, index) => stopSpy.mock.contexts[index] === instance,
    ).length
    await act(async () => root.unmount())
    const stopCallsAfterUnmount = stopSpy.mock.calls.filter(
      (_call, index) => stopSpy.mock.contexts[index] === instance,
    ).length
    expect(stopCallsAfterUnmount).toBeGreaterThan(stopCallsBeforeUnmount) // 卸载清理的真实增量
  })
})
