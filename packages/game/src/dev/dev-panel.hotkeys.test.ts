// DEV-build hotkey routing only; roster, party edits and asynchronous picker work have separate contracts.
// No runtime credit for the non-DEV compilation branch. Specs close the picker through its owner.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SceneAssetsCache } from '../assets/loader.js'
import { createInitialGameState } from '../core/game-state.js'
import type { DevPanelDeps } from './dev-panel.js'
import { setupDevPanel } from './dev-panel.js'

function makeHotkeyDeps(): DevPanelDeps {
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

describe('DEV hotkey routing and dump snapshots', () => {
  let deps: DevPanelDeps

  // A fresh game state and one owned listener installation per case.
  const listenerCalls: Parameters<typeof window.addEventListener>[] = []
  beforeEach(() => {
    deps = makeHotkeyDeps()
    listenerCalls.length = 0
    const listenerSpy = vi.spyOn(window, 'addEventListener')
    try {
      setupDevPanel(deps)
    } finally {
      listenerCalls.push(...listenerSpy.mock.calls)
      listenerSpy.mockRestore()
    }
  })

  afterEach(() => {
    try {
      document.querySelector<HTMLButtonElement>('.tp-dev-panel button[title="Close"]')?.click()
    } finally {
      for (const [type, listener, options] of listenerCalls)
        window.removeEventListener(type, listener, options)
      listenerCalls.length = 0
      vi.restoreAllMocks()
    }
  })

  it('B(explore)开 picker;再按 B toggle 关闭;两次都对按键 preventDefault', () => {
    deps.gs.mode = 'explore'
    const open = new KeyboardEvent('keydown', { code: 'KeyB', cancelable: true })
    window.dispatchEvent(open)
    expect(open.defaultPrevented).toBe(true)
    expect(document.querySelector('.tp-dev-panel')).not.toBeNull()

    const close = new KeyboardEvent('keydown', { code: 'KeyB', cancelable: true })
    window.dispatchEvent(close)
    expect(close.defaultPrevented).toBe(true)
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

  it('F1 dump keeps independent music, position and inventory snapshots', () => {
    deps.gs.mode = 'explore'
    deps.gs.wNumMusic = 42
    deps.gs.party.x = 32
    deps.gs.inventory = [{ itemId: 63, count: 2 }]
    const expected = {
      wNumMusic: 42,
      party: { x: 32 },
      inventory: [{ itemId: 63, count: 2 }],
    }
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const f1 = new KeyboardEvent('keydown', { code: 'F1', cancelable: true })
    window.dispatchEvent(f1)
    expect(f1.defaultPrevented).toBe(true)

    const dumpCall = logSpy.mock.calls.find((c) => c[0] === '[dev] GameState dump:')
    expect(logSpy).toHaveBeenCalledOnce()
    expect(dumpCall).toBeDefined()
    const dump = dumpCall?.[1]
    expect(dump).toMatchObject(expected)
    expect(dump).not.toBe(deps.gs)

    // dump 是深拷贝:此后 mutate 原 gs,dump 保持快照值。
    deps.gs.wNumMusic = 0
    deps.gs.party.x = 64
    deps.gs.inventory[0]!.count = 1
    expect(dump).toMatchObject(expected)
  })
})
