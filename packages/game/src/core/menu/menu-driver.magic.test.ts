/** Input-to-cast wiring: caster/target navigation, MP cost, disabled choices and return phase. No rendered UI claim. */
import type { Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setGlobalEvents } from '../event-system.js'
import { type GameState, projectRuntimeToBattleRoles } from '../game-state.js'
import { magicWithCost } from './__tests__/magic-cost-fixture.js'
import { createInGameMagicMenu } from './in-game-magic-menu.js'
import { createInGameMenu } from './in-game-menu.js'
import { dispatchMenuInput, setMenuCatalogs } from './menu-driver.js'
import {
  createMenuGameState,
  defaultMenuCatalogs,
  installNoopMenuScripts,
  menuInput,
  menuRoleRecords,
} from './menu-driver.test-fixtures.js'
import { openMenu } from './menu-stack.js'

function menuSpell(id: number, magicNumber: number, over: Partial<Spell> = {}): Spell {
  return {
    id,
    magicNumber,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
    ...over,
  }
}

function menuMagic(id: number, costMP = 0): Magic {
  return { ...magicWithCost(id, costMP), effect: 1, speed: 5, effectTimes: 1 }
}
beforeEach(() => setMenuCatalogs(defaultMenuCatalogs()))
afterEach(() => {
  setGlobalEvents([])
})
describe('大世界法术菜单(in-game-magic)', () => {
  const spells = [
    menuSpell(349, 1, { scriptOnUse: 8, scriptOnSuccess: 9 }), // single target
    menuSpell(350, 2, {
      scriptOnUse: 8,
      scriptOnSuccess: 9,
      flags: {
        usableOutsideBattle: true,
        usableInBattle: true,
        usableToEnemy: true,
        applyToAll: true,
      },
    }),
  ]

  const magics = [menuMagic(1, 5), menuMagic(2, 5)]

  function projected(gs: GameState): PlayerRoles {
    return projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, menuRoleRecords())
  }

  function openMagic(gs: GameState): ReturnType<typeof createInGameMagicMenu> {
    const s = createInGameMagicMenu(projected(gs), gs.partyMembers, spells, magics)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'in-game-magic', state: s })
    return s
  }

  function seedSolo(gs: GameState): void {
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 349
    gs.PlayerRolesRuntime.rgwMagic[1]![0] = 350
    gs.PlayerRolesRuntime.rgwMP[0] = 40
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 40
    gs.PlayerRolesRuntime.rgwHP[0] = 50
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
  }

  it('单人队:直接 pick-spell;8 键导航;Menu 关整栈', () => {
    const gs = createMenuGameState([0])
    seedSolo(gs)
    const s = openMagic(gs)
    setMenuCatalogs({ items: [], spells, magics, playerRoles: menuRoleRecords() })
    expect(s.phase).toBe('pick-spell')
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(s.spellMenu!.cursor).toBe(1)
    dispatchMenuInput(gs, menuInput(['Up']))
    expect(s.spellMenu!.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['Right']))
    dispatchMenuInput(gs, menuInput(['Left']))
    dispatchMenuInput(gs, menuInput(['PgDn']))
    expect(s.spellMenu!.cursor).toBe(1) // 2 法术,翻页钳到末条
    dispatchMenuInput(gs, menuInput(['PgUp']))
    expect(s.spellMenu!.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['End']))
    expect(s.spellMenu!.cursor).toBe(1)
    dispatchMenuInput(gs, menuInput(['Home']))
    expect(s.spellMenu!.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(gs.menuStack).toHaveLength(0)
  })

  it('Confirm single-target spell → pick-target;左右换人;Confirm → 扣 MP、留菜单', () => {
    const gs = createMenuGameState([0, 1])
    seedSolo(gs)
    gs.partyMembers = [0, 1]
    gs.PlayerRolesRuntime.rgwHP[1] = 50
    const s = openMagic(gs)
    setMenuCatalogs({ items: [], spells, magics, playerRoles: menuRoleRecords() })
    installNoopMenuScripts()
    // pick-caster:Down/Up 位移后停在 role 0(有已学法术)Confirm 进 pick-spell
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(s.casterMenu.cursor).toBe(1)
    dispatchMenuInput(gs, menuInput(['Up']))
    expect(s.casterMenu.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('pick-spell')
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('pick-target')
    dispatchMenuInput(gs, menuInput(['Left']))
    expect(s.targetCursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['Right']))
    expect(s.targetCursor).toBe(1)
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(35)
    expect(s.phase).toBe('pick-target') // MP 仍够,留 picker
    // Menu:pick-target → pick-spell
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(s.phase).toBe('pick-spell')
  })

  it('Confirm applyToAll spell → 扣 MP 留 pick-spell;MP 剩余不足时 pick-target 确认后退回', () => {
    const gs = createMenuGameState([0])
    seedSolo(gs)
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 350 // applyToAll 在首位
    gs.PlayerRolesRuntime.rgwMagic[1]![0] = 349
    const s = openMagic(gs)
    setMenuCatalogs({ items: [], spells, magics, playerRoles: menuRoleRecords() })
    installNoopMenuScripts()
    dispatchMenuInput(gs, menuInput(['Down'])) // 到群体法术 350（菜单按 id 排序）
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(35)
    expect(s.phase).toBe('pick-spell')
    // MP 压到 5:单体法术 349成功后 newMP(0) < costMP(5) → 退 picker
    gs.PlayerRolesRuntime.rgwMP[0] = 5
    dispatchMenuInput(gs, menuInput(['Up'])) // 回到单体法术 349
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('pick-target')
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(0)
    expect(s.phase).toBe('pick-spell') // 不够 → cancelInGameMagic 退回
  })
})
describe('法术禁用项', () => {
  it('法术菜单 MP 不足禁用项 Confirm → no-op 留 pick-spell(禁用项)', () => {
    const spells = [
      menuSpell(349, 1, {
        scriptOnUse: 8,
        scriptOnSuccess: 9,
        _name: '耗蓝术',
      }),
    ]
    const magics = [menuMagic(1, 99)] // costMP 99 > 全部 MP
    const gs = createMenuGameState([0])
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 349
    gs.PlayerRolesRuntime.rgwMP[0] = 10
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 40
    gs.PlayerRolesRuntime.rgwHP[0] = 50
    setMenuCatalogs({ items: [], spells, magics, playerRoles: menuRoleRecords() })
    installNoopMenuScripts()
    const s = createInGameMagicMenu(
      projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, menuRoleRecords()),
      [0],
      spells,
      magics,
    )
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'in-game-magic', state: s })
    expect(s.spellMenu?.items[0]?.disabled).toBe(true) // MP 不足 → 灰
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('pick-spell') // 禁用项 no-op
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(10) // 未扣
  })
})
