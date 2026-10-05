// TEST-GLM-GAME-MENU-SAVE-IO-1 — menu-driver 同帧取消优先 + save-slot dispatcher 跨槽 counter 真链。
//
// MSIO-A3:hub 同帧 Menu+Confirm → 取消优先关整栈,不开子菜单。真实浏览器同一帧窗口可同时
//   报两个键;各 dispatcher 都先查 Menu 再查 Confirm(menu-driver.ts:461-469),本合同把该优先级
//   钉在真实帧 caller tickMenu 上。若顺序翻转(Confirm 先行),状态屏会先 push 再被 Menu pop,
//   终态栈长 1 —— 与当前终态栈长 0 可判别。
// MSIO-C1:system→save-slot Confirm 走 dispatchSaveSlotMenu 真链(uigame.c:589-597 跨槽
//   wSavedTimes = max(已存各槽)+1)。旧测只证空表 max=0+1=1(cov85)或测试内自算模拟
//   (save-slot-menu.test.ts「dispatcher 模拟」);已有他槽更高 savedTimes 的真 dispatcher 聚合未证明。
import type { AbstractKey, InputSnapshot } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCommandBus } from '../command-bus.js'
import { createInitialGameState } from '../game-state.js'
import { Save } from '../save/api.js'
import { createInGameMenu, createSystemMenu } from './in-game-menu.js'
import { dispatchMenuInput, setMenuCatalogs } from './menu-driver.js'
import { openMenu, tickMenu } from './menu-mode.js'
import { createSaveSlotMenu } from './save-slot-menu.js'

function snap(pressed: AbstractKey[]): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

describe('TEST-GLM-GAME-MENU-SAVE-IO-1 menu-driver 同帧优先级与存档真链', () => {
  describe('MSIO-A3 hub 同帧 Menu+Confirm:取消优先', () => {
    it('同帧 Menu+Confirm → 关整栈回 explore,不先开状态屏(终态栈空,非 pop 回 hub)', () => {
      // bootstrap 同构前置:hub Confirm 分支经 requireCatalogs 取表后才入 switch(menu-driver.ts:472)
      setMenuCatalogs({ items: [], spells: [], magics: [], playerRoles: { roles: [] } })
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      openMenu(gs, { kind: 'in-game', state: createInGameMenu() }) // cursor 0 = 状态
      expect(gs.mode).toBe('menu')

      tickMenu(gs, snap(['Menu', 'Confirm']), createCommandBus())

      // 取消优先:Menu 分支 closeTopMenu + return,Confirm 未被处理 → 无 player-status 入栈,
      // 栈空 → tickMenu 同帧 resume explore。若 Confirm 先行:状态屏先入栈再被 pop → 终态栈长 1、
      // mode 仍 menu,可判别。
      expect(gs.menuStack).toHaveLength(0)
      expect(gs.mode).toBe('explore')
    })
  })

  describe('MSIO-C1 save-slot dispatcher 跨槽 max+1 真链', () => {
    beforeEach(async () => {
      await Save._clearAllForTest()
      vi.spyOn(console, 'log').mockImplementation(() => {})
    })
    afterEach(async () => {
      vi.restoreAllMocks()
      await Save._clearAllForTest()
    })

    it('slot3 已存 savedTimes=7 → 存 slot1:gs.wSavedTimes=8,slot1 meta=8 且 slot3 不被改写(uigame.c:589-597)', async () => {
      // 预置他槽:合法公开 API 存 slot3,savedTimes=7(高于 slot1 将写的值,才能判别 max 聚合方向)
      const seeded = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      seeded.wSavedTimes = 7
      await Save.saveSlot(3, seeded)

      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.dwCash = 555
      openMenu(gs, { kind: 'system', state: createSystemMenu() })
      openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('save') })

      dispatchMenuInput(gs, snap(['Confirm']), createCommandBus())

      // 同步相位:DH9 存档确认关整栈 + bCurrentSaveSlot 记槽(uigame.c:718)
      expect(gs.menuStack).toHaveLength(0)
      expect(gs.currentSaveSlot).toBe(1)

      // 异步落盘相位(dispatcher fire-and-forget:listSlots → max+1 → saveSlot)
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0)
      })
      expect(gs.wSavedTimes).toBe(8) // max({slot3:7}) + 1,非空表 0+1=1 亦非 7+0

      const list = await Save.listSlots()
      expect(list).toHaveLength(2)
      const slot1 = list.find((s) => s.id === 1)
      const slot3 = list.find((s) => s.id === 3)
      expect(slot1?.meta.savedTimes).toBe(8) // 新 counter 随 gs 深拷贝入槽
      expect(slot1?.meta.cash).toBe(555) // meta 取自真存档内容
      expect(slot3?.meta.savedTimes).toBe(7) // 他槽不被覆盖/改写
    })
  })
})
