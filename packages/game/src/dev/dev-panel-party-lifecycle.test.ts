/** CODE80 — Dev Panel 大世界换队必须清毒后重建仍在队成员的装备派生效果。 */
import type { Command, Item } from '@type-pal/shared'
import { expect, test, vi } from 'vitest'
import { makeEnemy, makeField, makeRole } from '../__tests__/coverage85-glm-game/harness.js'
import { SceneAssetsCache } from '../assets/loader.js'
import { updateAllEquipments } from '../core/equip-effect.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../core/game-state.js'
import { setObjectPoisons } from '../core/player-poison-state.js'
import { setGlobalEvents } from '../core/script-catalog.js'
import { applyFixture, type DevPanelDeps, setupDevPanel } from './dev-panel.js'

const gourd: Item = {
  id: 269,
  bitmap: 8,
  price: 8600,
  scriptOnUse: 0,
  scriptOnEquip: 39163,
  scriptOnThrow: 0,
  scriptDesc: 40275,
  flags: {
    usable: false,
    equipable: true,
    throwable: false,
    consuming: false,
    applyToAll: false,
    sellable: true,
    equipableBy: [true, true, true, false, true, false],
  },
}

const commands: Command[] = [
  { op: 'end' },
  { op: 'raw', opcode: 0x18, operands: [16, 269, 0], label: 'L_39163' },
  { op: 'raw', opcode: 0x29, operands: [0, 563, 0] },
  { op: 'raw', opcode: 0x29, operands: [0, 564, 0] },
  { op: 'end' },
  { op: 'raw', opcode: 0x1b, operands: [0, 20, 0], label: 'L_40860' },
  { op: 'end' },
  { op: 'raw', opcode: 0x1c, operands: [0, 20, 0], label: 'L_40858' },
  { op: 'end' },
]

function makeDeps(): DevPanelDeps {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  return {
    gs,
    fixtures: { fixtures: [] },
    sceneJumps: { jumps: [] },
    sceneAssetsCache: new SceneAssetsCache(() =>
      Promise.reject(new Error('unexpected scene load')),
    ),
    resources: {
      enemies: [makeEnemy()],
      enemyObjects: [],
      enemyTeams: [{ id: 1, enemies: [100, 0xffff, 0xffff, 0xffff, 0xffff] }],
      battleFields: [makeField()],
      playerRoles: {
        roles: Array.from({ length: 6 }, (_, id) =>
          makeRole(id, {
            hp: 100,
            maxHP: 500,
            mp: 10,
            maxMP: 40,
            equipment: [0, 0, 0, 0, 0, id === 2 ? 269 : 0],
          }),
        ),
      },
      levelUpExp: [],
      levelUpMagic: [],
      items: [gourd],
      spells: [],
      magics: [],
      objectMagics: [],
      objectPoisons: [
        { id: 552, level: 1, color: 64, playerScript: 40866, enemyScript: 40868 },
        { id: 563, level: 99, color: 0, playerScript: 40860, enemyScript: 0 },
        { id: 564, level: 99, color: 0, playerScript: 40858, enemyScript: 0 },
      ],
      objectPlayers: [],
      commands,
      enemyPos: { layouts: [] },
      battleEffectIndex: [],
      magicSpriteFrameCounts: new Map(),
    },
  }
}

// Public production setup + external listener cleanup; no business implementation is mocked.
function withPanel(deps: DevPanelDeps, run: () => void): void {
  const listeners = vi.spyOn(window, 'addEventListener')
  setGlobalEvents(commands)
  setObjectPoisons(deps.resources.objectPoisons)
  try {
    setupDevPanel(deps)
    run()
  } finally {
    // Close through the owning handler so module-level currentPicker is cleared too.
    document.querySelector<HTMLButtonElement>('.tp-dev-panel button[title="Close (Esc)"]')?.click()
    for (const [type, listener, options] of listeners.mock.calls)
      window.removeEventListener(type, listener, options)
    listeners.mockRestore()
    setGlobalEvents([])
    setObjectPoisons([])
  }
}

function openParty(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', cancelable: true }))
  const tab = Array.from(document.querySelectorAll<HTMLButtonElement>('.tp-dev-tab')).find(
    (button) => button.textContent === '👥 队伍',
  )
  if (!tab) throw new Error('party tab missing')
  tab.click()
}

function roleCard(id: number): HTMLButtonElement {
  const card = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.tp-dev-panel button'),
  ).find((button) => button.textContent === `Role${id}Role${id}`)
  if (!card) throw new Error(`role card missing: ${id}`)
  return card
}

function startFixture(deps: DevPanelDeps): void {
  applyFixture(
    deps,
    {
      id: 'code80',
      label: 'code80',
      partyMembers: [0, 1],
      enemyTeamId: 1,
      battleFieldId: 0,
    },
    7,
  )
  expect(deps.gs.mode).toBe('battle')
  expect(deps.gs.battleState?.players.map((player) => player.roleId)).toEqual([0, 1])
}

function ownership(deps: DevPanelDeps) {
  return structuredClone({
    party: deps.gs.partyMembers,
    poisons: deps.gs.rgPoisonStatus,
    players: deps.gs.battleState?.players,
    pendingActions: deps.gs.battleState?.pendingActions,
    runtime: deps.gs.PlayerRolesRuntime,
  })
}

test('真实战斗中入队与离队卡均禁用，点击不改变队伍和战斗状态', () => {
  const deps = makeDeps()
  withPanel(deps, () => {
    startFixture(deps)
    openParty()
    const before = ownership(deps)
    for (const roleId of [1, 2]) {
      const card = roleCard(roleId)
      expect(card.disabled).toBe(true)
      expect(card.title).toBe('战斗中不可编辑队伍')
      card.click()
    }
    expect(ownership(deps)).toEqual(before)
  })
})

test('探索面板打开后启战，旧卡片点击也不能改变战斗队伍', () => {
  const deps = makeDeps()
  deps.gs.partyMembers = [0, 1]
  hydratePlayerRolesRuntime(deps.gs.PlayerRolesRuntime, deps.resources.playerRoles)
  withPanel(deps, () => {
    openParty()
    const leave = roleCard(1)
    const join = roleCard(2)
    expect(leave.disabled).toBe(false)
    expect(join.disabled).toBe(false)
    startFixture(deps)
    const before = ownership(deps)
    leave.click()
    join.click()
    expect(ownership(deps)).toEqual(before)
  })
})

test.each([
  { name: '离队', party: [0, 1, 2], clickRole: 1 },
  { name: '入队', party: [0], clickRole: 2 },
])('探索$name后清旧真毒，并在新队伍位置重建寿葫芦效果', ({ party, clickRole }) => {
  const deps = makeDeps()
  deps.gs.partyMembers = [...party]
  hydratePlayerRolesRuntime(deps.gs.PlayerRolesRuntime, deps.resources.playerRoles)
  withPanel(deps, () => {
    updateAllEquipments(deps.gs, deps.resources.items)
    // A real ordinary poison in the old party, at the valid end continuation in this script slice.
    deps.gs.rgPoisonStatus['0_0'] = { wPoisonID: 552, wPoisonScript: 0 }
    const hpBefore = deps.gs.PlayerRolesRuntime.rgwHP[2]!
    openParty()
    const card = roleCard(clickRole)
    expect(card.disabled).toBe(false)
    card.click()
    expect(deps.gs.partyMembers).toEqual([0, 2])
    expect(deps.gs.PlayerRolesRuntime.rgwEquipment[5]?.[2]).toBe(269)
    expect(deps.gs.rgPoisonStatus).toEqual({
      '0_1': { wPoisonID: 563, wPoisonScript: 5 },
      '1_1': { wPoisonID: 564, wPoisonScript: 7 },
    })
    expect(deps.gs.PlayerRolesRuntime.rgwHP[2]).toBe(hpBefore + 20)
    expect(deps.gs.mode).toBe('explore')
  })
})
