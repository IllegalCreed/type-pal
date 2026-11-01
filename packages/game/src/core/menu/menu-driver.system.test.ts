/** Input routing: catalog admission, system/status navigation and save/load asynchronous ownership. Real in-memory Save path. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setGlobalEvents } from '../event-system.js'
import type { GameState } from '../game-state.js'
import { Save } from '../save/api.js'
import { createInGameMenu, createSystemMenu } from './in-game-menu.js'
import {
  _resetLoadGameHandlerForTest,
  _resetSystemQuitHandlerForTest,
  dispatchMenuInput,
  setLoadGameHandler,
  setMenuCatalogs,
  setSystemQuitHandler,
} from './menu-driver.js'
import { createMenuGameState, defaultMenuCatalogs, menuInput } from './menu-driver.test-fixtures.js'
import { openMenu } from './menu-stack.js'
import { createOpeningMenu } from './opening-menu.js'
import { createPlayerStatus } from './player-status.js'
import { createSaveSlotMenu } from './save-slot-menu.js'

beforeEach(() => setMenuCatalogs(defaultMenuCatalogs()))
afterEach(async () => {
  vi.restoreAllMocks()
  _resetSystemQuitHandlerForTest()
  _resetLoadGameHandlerForTest()
  setGlobalEvents([])
  await Save._clearAllForTest()
})
describe('requireCatalogs 未注入守卫', () => {
  it('setMenuCatalogs 未调用 → openOverworldShortcutMenu 经 requireCatalogs 抛错', async () => {
    vi.resetModules() // 拿全新 menu-driver 模块(catalogs singleton 未注入)
    const mod = await import('./menu-driver.js')
    expect(() => mod.openOverworldShortcutMenu(createMenuGameState(), 'magic')).toThrowError(
      /setMenuCatalogs/,
    )
  })
})
describe('dispatchMenuInput 空栈', () => {
  it('空菜单栈输入不改变游戏状态', () => {
    const gs = createMenuGameState()
    const before = structuredClone(gs)
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs).toEqual(before)
  })
})
describe('系统菜单(system)', () => {
  function openSys(gs: GameState): ReturnType<typeof createSystemMenu> {
    const s = createSystemMenu()
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'system', state: s })
    return s
  }

  it('音乐开关切换后确认，更新设置并关闭菜单栈', () => {
    const gs = createMenuGameState()
    const s = openSys(gs)
    s.selection.cursor = 2 // music
    gs.fMusicEnabled = false
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('switch')
    dispatchMenuInput(gs, menuInput(['Right'])) // toggle 到「开」(右)
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.fMusicEnabled).toBe(true)
    expect(gs.menuStack).toHaveLength(0)
  })

  it('sound switch:Up toggle;Menu 取消关整栈(保持当前态)', () => {
    const gs = createMenuGameState()
    const s = openSys(gs)
    s.selection.cursor = 3 // sound
    gs.fSoundEnabled = false
    dispatchMenuInput(gs, menuInput(['Confirm']))
    dispatchMenuInput(gs, menuInput(['Up']))
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(gs.fSoundEnabled).toBe(false)
    expect(gs.menuStack).toHaveLength(0)
  })

  it('退出确认：否关闭菜单栈，是调用退出处理器', () => {
    const gs = createMenuGameState()
    const s = openSys(gs)
    s.selection.cursor = 4 // quit
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('confirm')
    // 左右 toggle 后回「否」再确认 → 关整栈
    dispatchMenuInput(gs, menuInput(['Down']))
    dispatchMenuInput(gs, menuInput(['Up']))
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.menuStack).toHaveLength(0)
    // 是 → handler
    const gs2 = createMenuGameState()
    const s2 = openSys(gs2)
    s2.selection.cursor = 4
    let quitCount = 0
    setSystemQuitHandler(() => {
      quitCount++
    })
    dispatchMenuInput(gs2, menuInput(['Confirm']))
    dispatchMenuInput(gs2, menuInput(['Down'])) // 是
    dispatchMenuInput(gs2, menuInput(['Confirm']))
    expect(quitCount).toBe(1)
  })

  it('系统菜单上下导航；保存和读取打开槽位菜单', () => {
    const gs = createMenuGameState()
    const s = openSys(gs)
    const before = s.selection.cursor
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(s.selection.cursor).toBe(before + 1)
    dispatchMenuInput(gs, menuInput(['Up']))
    expect(s.selection.cursor).toBe(before)
    s.selection.cursor = 0 // save
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.menuStack[gs.menuStack.length - 1]?.kind).toBe('save-slot')
    dispatchMenuInput(gs, menuInput(['Menu'])) // save-slot in-game 取消 → 关整栈
    expect(gs.menuStack).toHaveLength(0)
    const gs2 = createMenuGameState()
    const s2 = openSys(gs2)
    s2.selection.cursor = 1 // load
    dispatchMenuInput(gs2, menuInput(['Confirm']))
    expect(gs2.menuStack[gs2.menuStack.length - 1]?.kind).toBe('save-slot')
  })

  it('系统菜单左右导航与上下导航一致', () => {
    const gs = createMenuGameState()
    const s = openSys(gs)
    const before = s.selection.cursor
    dispatchMenuInput(gs, menuInput(['Right']))
    expect(s.selection.cursor).toBe(before + 1)
    dispatchMenuInput(gs, menuInput(['Left']))
    expect(s.selection.cursor).toBe(before)
  })
})
describe('角色状态屏(player-status)', () => {
  it('状态页左右与确认导航，越界或取消关闭菜单栈', () => {
    const gs = createMenuGameState()
    const s = createPlayerStatus(gs.partyMembers)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'player-status', state: s })
    dispatchMenuInput(gs, menuInput(['Right']))
    expect(s.cursor).toBe(1)
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(gs.menuStack).toHaveLength(0) // 越过后关
    const s2 = createPlayerStatus(gs.partyMembers)
    openMenu(gs, { kind: 'player-status', state: s2 })
    dispatchMenuInput(gs, menuInput(['Left']))
    expect(gs.menuStack).toHaveLength(0) // 前越界关
    const s3 = createPlayerStatus(gs.partyMembers)
    openMenu(gs, { kind: 'player-status', state: s3 })
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s3.cursor).toBe(1)
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(gs.menuStack).toHaveLength(0)
  })
})
describe('存档槽菜单(save-slot)', () => {
  it('in-game 上下文 Menu → 关整栈;opening 上下文 Menu → pop 回 opening', () => {
    const gs = createMenuGameState()
    openMenu(gs, { kind: 'system', state: createSystemMenu() })
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('save') })
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(gs.menuStack).toHaveLength(0)

    const gs2 = createMenuGameState()
    const opening = createOpeningMenu()
    openMenu(gs2, { kind: 'opening', state: opening })
    dispatchMenuInput(gs2, menuInput(['Down']))
    expect(opening.selection.cursor).toBe(1)
    dispatchMenuInput(gs2, menuInput(['Confirm']))
    expect(gs2.menuStack.at(-1)?.kind).toBe('save-slot')
    dispatchMenuInput(gs2, menuInput(['Menu']))
    expect(gs2.menuStack).toHaveLength(1)
    expect(gs2.menuStack[0]?.kind).toBe('opening')
    expect(gs2.menuStack[0]?.state).toBe(opening)
    expect(opening.selection.cursor).toBe(0) // uigame.c:150 cancels back to new game.
  })

  it('load 模式:有 handler → 调用;无 handler → pop 顶 + 警告', () => {
    const gs = createMenuGameState()
    const slots: number[] = []
    setLoadGameHandler((slot) => {
      slots.push(slot)
    })
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('load') })
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(slots).toEqual([1])

    _resetLoadGameHandlerForTest()
    const gs2 = createMenuGameState()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    openMenu(gs2, { kind: 'save-slot', state: createSaveSlotMenu('load') })
    dispatchMenuInput(gs2, menuInput(['Confirm']))
    expect(gs2.menuStack).toHaveLength(0)
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      '[save] loadGameHandler 未注入(bootstrap.ts setLoadGameHandler);load 跳过',
    )
  })
})
describe('存读档与系统开关生命周期', () => {
  it('save-slot load 异步 handler:立即调用，关栈由 handler 负责，异步状态更新完成', async () => {
    const gs = createMenuGameState()
    let started = false
    let completed: Promise<void> | undefined
    setLoadGameHandler((slot) => {
      started = true
      completed = Promise.resolve().then(() => {
        gs.wSavedTimes = slot * 100
      })
      return completed
    })
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('load') })
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(started).toBe(true) // handler 同步启动
    expect(gs.menuStack).toHaveLength(1) // dispatcher 不等 promise;关栈是 handler 职责
    await completed
    expect(gs.wSavedTimes).toBe(100) // 异步段完成
  })

  // Load handler 的同步异常与异步拒绝有不同的传播边界：dispatcher 的
  // fire-and-forget 域（void Promise.resolve(handler).catch(console.error)）：
  // 异步 reject 被捕获不外泄 unhandled；**同步 throw 不在 catch 域内**（Promise.resolve
  // 包装只兜 async 域），会同步穿透 dispatchMenuInput —— 钉住当前真实合同，不擅改接口。
  it('save-slot load handler 异步 reject:记录原错误并收束，栈态不被破坏', async () => {
    const gs = createMenuGameState()
    const errLogged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('load-io-failed')
    const rejected = Promise.reject(failure)
    void rejected.catch(() => {}) // Keep a missing dispatcher catch falsifiable by a business assertion.
    setLoadGameHandler(() => rejected)
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('load') })
    expect(() => dispatchMenuInput(gs, menuInput(['Confirm']))).not.toThrow() // reject 在异步段,dispatcher 不因 handler 失败抛错
    expect(gs.menuStack).toHaveLength(1) // 关栈是 handler 职责,失败后仍由 handler/caller 域处理
    await rejected.catch(() => {})
    expect(errLogged).toHaveBeenCalledExactlyOnceWith('[save] loadSlot failed:', failure)
    expect(gs.menuStack).toHaveLength(1)
  })

  it('save-slot load handler 同步 throw:穿透 dispatchMenuInput(Promise.resolve 不裹同步域)', () => {
    const gs = createMenuGameState()
    setLoadGameHandler(() => {
      throw new Error('sync-handler-boom')
    })
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('load') })
    expect(() => dispatchMenuInput(gs, menuInput(['Confirm']))).toThrowError('sync-handler-boom')
    expect(gs.menuStack).toHaveLength(1) // 关栈未发生(throw 在关栈前)
  })

  it('system save 异步落盘:同步关栈,wSavedTimes 在微任务后更新(异步生命周期)', async () => {
    await Save._clearAllForTest() // 隔离:清内存 fallback 槽位(跨测试残留)
    const gs = createMenuGameState()
    const logged = vi.spyOn(console, 'log').mockImplementation(() => {})
    openMenu(gs, { kind: 'system', state: createSystemMenu() })
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('save') })
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.menuStack).toHaveLength(0)
    expect(gs.currentSaveSlot).toBe(1)
    await vi.waitFor(() =>
      expect(logged).toHaveBeenCalledExactlyOnceWith('[save] saved to slot 1(times=1)'),
    )
    expect(gs.wSavedTimes).toBe(1) // 内存 fallback:listSlots 空 → max 0 + 1
    expect((await Save.loadSlot(1))?.wSavedTimes).toBe(1)
  })

  it('system switch 阶段 Down/Left 也 toggle', () => {
    const gs = createMenuGameState()
    const s = createSystemMenu()
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'system', state: s })
    s.selection.cursor = 2 // music
    gs.fMusicEnabled = false
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('switch')
    expect(s.confirmYes).toBe(false) // 默认高亮当前态(关)
    dispatchMenuInput(gs, menuInput(['Left'])) // switch 方向键 = 纯 toggle
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(s.confirmYes).toBe(false)
    dispatchMenuInput(gs, menuInput(['Up']))
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, menuInput(['Right']))
    expect(s.confirmYes).toBe(false)
  })
})
