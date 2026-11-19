import assert from 'node:assert/strict'
import type { Plugin } from 'vite'
import game from '../../packages/game/vite.config'
import reforge from '../../packages/reforge/vite.config'

function after(code: string, anchor: string, addition: string): string {
  assert.equal(code.split(anchor).length, 2, `world equipment witness moved: ${anchor}`)
  return code.replace(anchor, `${anchor}\n${addition}`)
}

function gameRead(code: string): string {
  return after(
    code,
    ';(window as unknown as Record<string, unknown>).__tpgs = gs',
    `
    globalThis.__whipWorldRead = () => {
      const top = gs.menuStack.at(-1)
      const state = top?.state
      const role = projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, playerRoles, gs.rgEquipmentEffect).roles[2]
      const x = gs.party.x, y = gs.party.y
      const npc = gs.npcs.find(({id}) => id === 35)
      const menu = !top ? null : top.kind === 'equip'
        ? { kind: 'equip', phase: state.phase, cursor: state.list.cursor,
          entries: state.list.inventory.map(({itemId}) => String(itemId)),
          selected: state.selectedItemId === undefined ? null : String(state.selectedItemId) }
        : { kind: top.kind, cursor: state.selection?.cursor ?? state.cursor ?? null,
          entries: state.selection?.items.map(({id}) => String(id)) ?? [] }
      return {
        ready: globalThis.__routeGameReadiness(gs).routeReady,
        scene: 's' + String(gs.wNumScene - 1).padStart(3, '0'),
        grid: [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2],
        facing: gs.party.facing, music: gs.wNumMusic, menu,
        target: npc ? [npc.x, npc.y, npc.sState, npc.triggerMode, npc.triggerLabel] : null,
        event: gs.eventCursor?.ip ?? null,
        stock: gs.inventory.map(({ itemId, count }) => [String(itemId), count]),
        role: {
          name: role.id, body: String(role.equipment[2] || ''), weapon: String(role.equipment[3] || ''),
          attack: role.attackStrength, speed: role.dexterity, defense: role.defense,
          attackAll: Boolean(role.attackAll), sprite: role.spriteNumInBattle, hp: role.hp, mp: role.mp,
        },
      }
    }`,
  )
}

function reforgeRead(code: string): string {
  const result = after(
    code,
    '  if (import.meta.env.DEV) runtimeObservationReady = true',
    `
  globalThis.__whipWorldRead = () => {
    const { menu, equipMenu } = menus.view
    const level = menu.stack.at(-1)
    const role = world.party.find((entry) => entry.template === 'lin-yueru')
    if (!role) return null
    const derived = whipBattlePlayers(world, project).find((entry) => entry.roleId === role.id)
    const sprite = whipBattleSprite(role, project.actorsById[role.template], project.items)
    const active = !menus.active ? null : menu.openPanel === 'equip'
      ? { kind: 'equip', phase: equipMenu.phase, cursor: equipMenu.cursor,
        entries: equipMenu.items.map(({id}) => id), selected: equipMenu.selectedItemId ?? null }
      : { kind: 'cascade', cursor: level?.cursor ?? null, entries: level?.nodes.map(({id}) => id) ?? [] }
    return {
      ready: !worldTriggerDeliveryBusy() && !presentation.busy() && fadeDriver.value === 0,
      scene: activeScene.scene.id, grid: [player.pos.col, player.pos.row],
      facing, music: Number(world.audio.currentMusic?.split('.').at(-1)), menu: active,
      stock: world.inventory.map(({ itemId, count }) => [itemId, count]),
      role: {
        name: ORIGINAL_ROLE_TEMPLATES.indexOf(role.template),
        body: role.equipment.body ?? '', weapon: role.equipment.weapon ?? '',
        attack: derived.attackStrength, speed: derived.baseDexterity, defense: derived.defense,
        attackAll: derived.attackAll, sprite: Number(sprite?.split('-').at(-1)), hp: role.hp, mp: role.mp,
      },
    }
  }`,
  )
  return `import { effectiveBattleSpriteId as whipBattleSprite } from '@type-pal/content'
import { createBattlePlayers as whipBattlePlayers } from './battle/battle-player-input.js'
${result}`
}

const engine = process.env.Q2_WHIP_WORLD_ENGINE
assert(engine === 'game' || engine === 'reforge', 'choose the world equipment observer engine')
const base = engine === 'game' ? game : reforge

const observe: Plugin = {
  name: 'q2-world-equip-observe',
  apply: 'serve',
  enforce: 'pre',
  transform(code, id) {
    const file = id.split('?')[0]?.replaceAll('\\', '/')
    if (engine === 'game') {
      if (file?.endsWith('/packages/game/src/shell/bootstrap.ts')) return gameRead(code)
      if (file?.endsWith('/packages/game/src/present/menu/draw-equip.ts')) {
        const amount = after(
          code,
          "      drawNumber(fb, amount, 2, EQUIP_ITEM_AMOUNT, 'cyan', 'right', uiSpriteFrames)",
          `
      if (uiSpriteFrames[56 + amount % 10]) globalThis.__whipWorldEvidence?.amount({
        count: amount, x: EQUIP_ITEM_AMOUNT.x, y: EQUIP_ITEM_AMOUNT.y, color: 'cyan', alignment: 'right',
      })`,
        )
        const list = "  if (input.state.phase === 'list') drawEquipList(input)"
        assert.equal(amount.split(list).length, 2, 'Game equipment list draw moved')
        const fresh = amount.replace(
          list,
          `  if (input.state.phase === 'list') {
    drawEquipList(input)
    globalThis.__whipWorldEvidence?.leave()
  }`,
        )
        const draw = "  else if (input.state.phase === 'pick-role') drawEquipPickRole(input)"
        assert.equal(fresh.split(draw).length, 2, 'Game equipment pick-role draw moved')
        return fresh.replace(
          draw,
          `  else if (input.state.phase === 'pick-role') {
    globalThis.__whipWorldEvidence?.begin()
    drawEquipPickRole(input)
    globalThis.__whipWorldEvidence?.paint({
      selected: String(input.state.selectedItemId),
      role: input.state.partyMembers[input.state.playerCursor],
      weapon: String(input.gs.PlayerRolesRuntime.rgwEquipment[3][2] || ''),
      source: 'Game:drawEquipPickRole',
    })
  }`,
        )
      }
      if (file?.endsWith('/packages/game/src/core/event-opcode-player.ts')) {
        const end = '      return true\n    }\n\n    case OP_POISON_PLAYER: {'
        assert.equal(code.split(end).length, 2, 'Game remove-equipment opcode anchor moved')
        return code.replace(
          end,
          `      globalThis.__whipWorldEvidence?.remove({
        role: roleId, slot: slotPlusOne - 1, owner: currentEventObjectId,
        source: 'Game:OP_REMOVE_EQUIPMENT',
      })
${end}`,
        )
      }
      return null
    }
    if (file?.endsWith('/packages/reforge/src/main.ts')) {
      const read = reforgeRead(code)
      const end =
        '        else world.inventory.push({ itemId, count: 1 })\n      }\n    },\n    setEntityFacing:'
      assert.equal(read.split(end).length, 2, 'Reforge unequipRole anchor moved')
      return read.replace(
        end,
        `        else world.inventory.push({ itemId, count: 1 })
      }
      globalThis.__whipWorldEvidence?.remove({
        role: roleIdx, slot, owner: runnerTriggerOwnerId,
        source: 'Reforge:unequipRole',
      })
    },
    setEntityFacing:`,
      )
    }
    if (file?.endsWith('/packages/reforge/src/menu/equip-box.ts')) {
      const countDraw =
        /^ {4}if \(count > ([01])\) drawNumber\(ctx, count, PR_ITEM_AMOUNT_RIGHT, PR_ITEM_AMOUNT_Y, assets\.numsCyan\)$/gmu
      assert.equal([...code.matchAll(countDraw)].length, 1, 'Reforge equipment number draw moved')
      const amount = code.replace(
        countDraw,
        (_, minimum) => `    if (count > ${minimum}) {
      drawNumber(ctx, count, PR_ITEM_AMOUNT_RIGHT, PR_ITEM_AMOUNT_Y, assets.numsCyan)
      if (assets.numsCyan[count % 10]) globalThis.__whipWorldEvidence?.amount({
        count, x: PR_ITEM_AMOUNT_RIGHT, y: PR_ITEM_AMOUNT_Y, color: 'cyan', alignment: 'right',
      })
    }`,
      )
      const begin = after(
        amount,
        "  if (state.phase === 'pick-role') {",
        '    globalThis.__whipWorldEvidence?.begin()',
      )
      const fresh = after(
        begin,
        '  drawEquipList(ctx, state, world, assets, glyphs, now, describeCtx)',
        '  globalThis.__whipWorldEvidence?.leave()',
      )
      return after(
        fresh,
        '    drawEquipPickRole(ctx, state, world, assets, glyphs, locale, now, items)',
        `
    const member = world.party.find(({id}) => id === state.casterId)
    if (member?.template === 'lin-yueru') globalThis.__whipWorldEvidence?.paint({
      selected: state.selectedItemId, role: 2, weapon: member.equipment.weapon ?? '',
      source: 'Reforge:drawEquipPickRole',
    })`,
      )
    }
    return null
  },
}
export default { ...base, plugins: [...base.plugins, observe] }
