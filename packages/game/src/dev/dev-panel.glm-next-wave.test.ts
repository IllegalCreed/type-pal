/** GLM Wave I / I01 — `setupDevPanel` 显式控制与释放(dev-panel.ts,生产冻结 ced193f4)。
 *
 * 旧证去重(本文件不重复):
 *  - dev-panel.pure.test.ts:togglePartyMembership / buildCustomEnemyTeam /
 *    computeMagicGrantsByRole / roleMagicsAtLevel / applyFixture / applyCustomBattle /
 *    applyBossBattle / applyAutoBattleT37。
 *  - dev-panel.test.ts:BOSS_ROSTER story-grounded 数据自检。
 * 本文件只证此前未证公开合同:
 *  1. `B`(探索模式)开 picker → 再按 B toggle 关闭,且对按键 preventDefault。
 *  2. 非 explore/battle 模式(如 event)B 不拦截、不开面板。
 *  3. `F1`(全局)console dump = gs 的深拷贝(后改 gs 不影响 dump,且非同引用)。
 * 未证登记:`!import.meta.env.DEV → 直接 return` 的 DEV 假分支在 vitest 下不可构造 ——
 * vitest 把 `import.meta.env.DEV` 编译期替换为 true,运行时翻转(stubEnv / env 对象赋值)
 * 均改变不了被测模块视角;生产侧由 dead-code-elimination 兜底。见 wave-I 回执。
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SceneAssetsCache } from '../assets/loader.js'
import { createInitialGameState } from '../core/game-state.js'
import type { DevPanelDeps } from './dev-panel.js'
import { setupDevPanel } from './dev-panel.js'

function makeDeps(): DevPanelDeps {
  return {
    gs: createInitialGameState({ x: 0, y: 0, facing: 'down' }),
    fixtures: { fixtures: [] },
    sceneJumps: { jumps: [] },
    sceneAssetsCache: new SceneAssetsCache(() =>
      Promise.reject(new Error('scene assets 未加载:本测试不开场景跳转')),
    ),
    resources: {
      enemies: [],
      enemyObjects: [],
      enemyTeams: [],
      battleFields: [],
      playerRoles: { roles: [] },
      levelUpExp: [],
      levelUpMagic: [],
      items: [],
      spells: [],
      magics: [],
      objectMagics: [],
      objectPoisons: [],
      objectPlayers: [],
      commands: [],
      enemyPos: { layouts: [] },
      battleEffectIndex: [],
      magicSpriteFrameCounts: new Map(),
    },
  }
}

describe('setupDevPanel 显式控制与释放(DEV-only debug overlay)', () => {
  const deps = makeDeps()

  // vitest(vite)下 import.meta.env.DEV=true → 装配一次;后续用例共用同一批 keydown 监听。
  beforeAll(() => {
    setupDevPanel(deps)
  })

  afterEach(() => {
    // 释放残留 picker DOM(若断言失败留下);openPicker 自身会摘除旧 currentPicker,指针泄漏无副作用。
    document.querySelector('.tp-dev-panel')?.remove()
    vi.restoreAllMocks()
  })

  it('B(explore)开 picker;再按 B toggle 关闭;两次都对按键 preventDefault', () => {
    deps.gs.mode = 'explore'
    const open = new KeyboardEvent('keydown', { code: 'KeyB', cancelable: true })
    window.dispatchEvent(open)
    expect(open.defaultPrevented).toBe(true)
    expect(document.querySelector('.tp-dev-panel')).not.toBeNull()

    const close = new KeyboardEvent('keydown', { code: 'KeyB', cancelable: true })
    window.dispatchEvent(close)
    expect(document.querySelector('.tp-dev-panel')).toBeNull()
  })

  it('非 explore/battle 模式(event)按 B:不拦截、不开面板', () => {
    deps.gs.mode = 'event'
    const evt = new KeyboardEvent('keydown', { code: 'KeyB', cancelable: true })
    window.dispatchEvent(evt)
    expect(evt.defaultPrevented).toBe(false)
    expect(document.querySelector('.tp-dev-panel')).toBeNull()
    deps.gs.mode = 'explore'
  })

  it('F1(全局)dump gs 深拷贝:内容等于当时快照,后改 gs 不影响 dump,且非同引用', () => {
    deps.gs.mode = 'explore'
    deps.gs.wNumMusic = 42
    const snapshot = JSON.parse(JSON.stringify(deps.gs))
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const f1 = new KeyboardEvent('keydown', { code: 'F1', cancelable: true })
    window.dispatchEvent(f1)
    expect(f1.defaultPrevented).toBe(true)

    const dumpCall = logSpy.mock.calls.find((c) => c[0] === '[dev] GameState dump:')
    expect(dumpCall).toBeDefined()
    const dump = dumpCall?.[1]
    expect(dump).toEqual(snapshot)
    expect(dump).not.toBe(deps.gs)

    // dump 是深拷贝:此后 mutate 原 gs,dump 保持快照值。
    deps.gs.wNumMusic = 0
    expect(dump).toEqual(snapshot)
  })
})
