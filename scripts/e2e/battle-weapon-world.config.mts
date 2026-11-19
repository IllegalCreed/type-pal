import assert from 'node:assert/strict'
import type { Plugin } from 'vite'
import game from '../../packages/game/vite.config'
import reforge from '../../packages/reforge/vite.config'

function replace(code: string, anchor: string, replacement: string): string {
  assert.equal(code.split(anchor).length, 2, `world equipment witness moved: ${anchor}`)
  return code.replace(anchor, replacement)
}

function after(code: string, anchor: string, addition: string): string {
  return replace(code, anchor, `${anchor}\n${addition}`)
}

function gameRead(code: string): string {
  return after(
    code,
    ';(window as unknown as Record<string, unknown>).__tpgs = gs',
    `
    globalThis.__worldEquipmentRead = () => {
      const top = gs.menuStack.at(-1)
      const state = top?.state
      const roles = projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, playerRoles, gs.rgEquipmentEffect).roles
      const x = gs.party.x, y = gs.party.y
      const menu = !top ? null : top.kind === 'equip'
        ? { kind: 'equip', phase: state.phase, cursor: state.list.cursor,
          entries: state.list.inventory.map(({itemId}) => String(itemId)),
          selected: state.selectedItemId ? String(state.selectedItemId) : null,
          role: state.partyMembers[state.playerCursor] ?? null }
        : { kind: top.kind, cursor: state.selection?.cursor ?? state.cursor ?? null,
          entries: state.selection?.items.map(({id}) => String(id)) ?? [] }
      return {
        ready: globalThis.__routeGameReadiness(gs).routeReady,
        scene: 's' + String(gs.wNumScene - 1).padStart(3, '0'),
        grid: [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2],
        facing: gs.party.facing, music: gs.wNumMusic, menu,
        stock: gs.inventory.map(({ itemId, count }) => [String(itemId), count]),
        party: gs.partyMembers.map((id, position) => {
          const role = roles[id]
          return {
            id, equipment: role.equipment.map((item) => item ? String(item) : ''),
            stats: [role.attackStrength, role.magicStrength, role.defense, role.dexterity, role.fleeRate],
            res: [role.poisonResistance, ...Object.values(role.elemResistance)],
            hp: role.hp, mp: role.mp, attackAll: Boolean(role.attackAll),
            sprite: role.spriteNumInBattle, cooperative: String(role.cooperativeMagic || ''),
            skills: role.magic.filter(Boolean).map(String).sort(),
            dual: gs.rgPlayerStatus[id][8] > 999,
            regen: Object.entries(gs.rgPoisonStatus).filter(([key, poison]) =>
              Number(key.split('_')[1]) === position && [563, 564].includes(poison.wPoisonID)
            ).map(([, poison]) => poison.wPoisonID).sort(),
          }
        }),
      }
    }`,
  )
}

function reforgeRead(code: string): string {
  const result = after(
    code,
    '  if (import.meta.env.DEV) runtimeObservationReady = true',
    `
  globalThis.__worldEquipmentRead = () => {
    const { menu, equipMenu } = menus.view
    const level = menu.stack.at(-1)
    const slots = ['head', 'cloak', 'body', 'weapon', 'feet', 'accessory']
    const derived = worldEquipmentBattlePlayers(world, project)
    const active = !menus.active ? null : menu.openPanel === 'equip'
      ? { kind: 'equip', phase: equipMenu.phase, cursor: equipMenu.cursor,
        entries: equipMenu.items.map(({id}) => id), selected: equipMenu.selectedItemId ?? null,
        role: ORIGINAL_ROLE_TEMPLATES.indexOf(world.party.find(({id}) => id === equipMenu.casterId)?.template) }
      : { kind: 'cascade', cursor: level?.cursor ?? null, entries: level?.nodes.map(({id}) => id) ?? [] }
    return {
      ready: checkpointLoad === 'loaded' && !worldTriggerDeliveryBusy() && !presentation.busy() && fadeDriver.value === 0,
      scene: activeScene.scene.id, grid: [player.pos.col, player.pos.row],
      facing, music: Number(world.audio?.currentMusic?.split('.').at(-1)), menu: active,
      stock: world.inventory.map(({ itemId, count }) => [itemId, count]),
      party: world.party.map((role) => {
        const battle = derived.find((entry) => entry.roleId === role.id)
        const sprite = worldEquipmentSprite(role, project.actorsById[role.template], project.items)
        return {
          id: ORIGINAL_ROLE_TEMPLATES.indexOf(role.template),
          equipment: slots.map((slot) => role.equipment[slot] ?? ''),
          stats: [battle.attackStrength, battle.magicStrength, battle.defense, battle.baseDexterity, battle.fleeRate],
          res: [battle.poisonRes, ...Object.values(battle.elemRes)],
          hp: role.hp, mp: role.mp, attackAll: battle.attackAll,
          sprite: Number(sprite?.split('-').at(-1)), cooperative: battle.cooperativeMagicSkillId ?? '',
          skills: [...battle.skills].sort(), dual: battle.grantedStatuses.includes('dualAttack'),
          regen: [battle.regenHp, battle.regenMp],
        }
      }),
    }
  }`,
  )
  return `import { effectiveBattleSpriteId as worldEquipmentSprite } from '@type-pal/content'
import { createBattlePlayers as worldEquipmentBattlePlayers } from './battle/battle-player-input.js'
${result}`
}

function gameEquipmentDraw(code: string): string {
  let instrumented = after(
    code,
    '  if (!item) return',
    '  const witness = globalThis.__worldEquipmentEvidence\n  witness?.begin()',
  )
  instrumented = replace(
    instrumented,
    '    if (icon) blitSpriteOpaque(fb, icon, EQUIP_IMAGE_BOX.x + 8, EQUIP_IMAGE_BOX.y + 8)',
    `    if (icon) {
      blitSpriteOpaque(fb, icon, EQUIP_IMAGE_BOX.x + 8, EQUIP_IMAGE_BOX.y + 8)
      witness?.icon(String(item.bitmap))
    }`,
  )
  for (const getter of [
    'getPlayerAttackStrength',
    'getPlayerMagicStrength',
    'getPlayerDefense',
    'getPlayerDexterity',
    'getPlayerFleeRate',
  ]) {
    const call = `${getter}(gs, playerRoleId)`
    instrumented = replace(instrumented, call, `(witness?.stat ?? ((value) => value))(${call})`)
  }
  instrumented = after(
    instrumented,
    "      drawNumber(fb, amount, 2, EQUIP_ITEM_AMOUNT, 'cyan', 'right', uiSpriteFrames)",
    `
      if (uiSpriteFrames[56 + amount % 10]) witness?.amount({
        count: amount, x: EQUIP_ITEM_AMOUNT.x, y: EQUIP_ITEM_AMOUNT.y, color: 'cyan', alignment: 'right',
      })`,
  )
  return instrumented
}

function gamePaint(code: string): string {
  const anchor = '    }\n  }\n}\n\nexport function drawEquipMenu'
  const tail = `
  witness?.draw({
    selected: String(wItem),
    role: playerRoleId,
    equipment: gs.PlayerRolesRuntime.rgwEquipment.map((slot) => slot[playerRoleId] ? String(slot[playerRoleId]) : ''),
    source: 'Game:drawEquipPickRole',
  })`
  return replace(
    gameEquipmentDraw(code),
    anchor,
    `    }\n  }${tail}\n}\n\nexport function drawEquipMenu`,
  )
}

function reforgePaint(code: string): string {
  let instrumented = after(
    code,
    '  if (!caster) return',
    '  const witness = globalThis.__worldEquipmentEvidence\n  witness?.begin()',
  )
  instrumented = after(
    instrumented,
    '      ctx.drawImage(icon, PR_IMAGE_BOX.x + 8, PR_IMAGE_BOX.y + 8)',
    '      witness?.icon(sel.icon)',
  )
  const draw =
    '    if (count > 0) drawNumber(ctx, count, PR_ITEM_AMOUNT_RIGHT, PR_ITEM_AMOUNT_Y, assets.numsCyan)'
  instrumented = replace(
    instrumented,
    draw,
    `    if (count > 0) {
      drawNumber(ctx, count, PR_ITEM_AMOUNT_RIGHT, PR_ITEM_AMOUNT_Y, assets.numsCyan)
      if (assets.numsCyan[count % 10]) witness?.amount({
        count, x: PR_ITEM_AMOUNT_RIGHT, y: PR_ITEM_AMOUNT_Y, color: 'cyan', alignment: 'right',
      })
    }`,
  )
  instrumented = replace(
    instrumented,
    '      effectiveStat(caster, stat, items),',
    '      (witness?.stat ?? ((value) => value))(effectiveStat(caster, stat, items)),',
  )
  return replace(
    instrumented,
    '  })\n}\n\n/** 大世界装备面板',
    `  })
  witness?.draw({
    selected: state.selectedItemId,
    role: caster.template,
    equipment: PR_SLOTS.map(({ slot }) => caster.equipment[slot] ?? ''),
    source: 'Reforge:drawEquipPickRole',
  })
  witness?.present(() => ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height))
}

/** 大世界装备面板`,
  )
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
      if (file?.endsWith('/packages/game/src/present/menu/draw-equip.ts')) return gamePaint(code)
      if (file?.endsWith('/packages/game/src/present/present.ts'))
        return after(
          code,
          '  ctx2d.putImageData(img, 0, 0)',
          '  globalThis.__worldEquipmentEvidence?.present(() => img)',
        )
      if (file?.endsWith('/packages/game/src/core/menu/menu-driver.ts'))
        return after(
          code,
          "          setItemScriptEntry(gs, item, 'scriptOnEquip', runEquipScript(gs, sid, picked.roleId))",
          `          globalThis.__worldEquipmentEvidence?.equip({
            role: picked.roleId, item: String(item.id), entry: sid, source: 'Game:runEquipScript',
          })`,
        )
      if (file?.endsWith('/packages/game/src/core/event-opcode-player.ts')) {
        const end = '      return true\n    }\n\n    case OP_POISON_PLAYER: {'
        return replace(
          code,
          end,
          `      globalThis.__worldEquipmentEvidence?.remove({
        role: roleId, slot: slotPlusOne - 1, owner: currentEventObjectId,
        source: 'Game:OP_REMOVE_EQUIPMENT',
      })
${end}`,
        )
      }
      return null
    }
    if (file?.endsWith('/packages/reforge/src/main.ts')) {
      const end =
        '        else world.inventory.push({ itemId, count: 1 })\n      }\n    },\n    setEntityFacing:'
      return replace(
        reforgeRead(code),
        end,
        `        else world.inventory.push({ itemId, count: 1 })
      }
      globalThis.__worldEquipmentEvidence?.remove({
        role: roleIdx, slot, owner: runnerTriggerOwnerId,
        source: 'Reforge:unequipRole',
      })
    },
    setEntityFacing:`,
      )
    }
    if (file?.endsWith('/packages/reforge/src/menu/menu-session.ts'))
      return after(
        code,
        '        const r = equipApply(this.#equipMenu, world, project.items)',
        `        const observed = this.#equipMenu
        const wearer = world.party.find(({ id }) => id === observed.casterId)
        if (wearer && r.world !== world) globalThis.__worldEquipmentEvidence?.equip({
          role: wearer.template, item: observed.selectedItemId, source: 'Reforge:equipApply',
        })`,
      )
    if (file?.endsWith('/packages/reforge/src/menu/equip-box.ts')) return reforgePaint(code)
    return null
  },
}
export default { ...base, plugins: [...base.plugins, observe] }
