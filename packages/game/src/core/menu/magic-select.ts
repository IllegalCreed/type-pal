/**
 * M5.M-w0.2:MagicSelectionMenu — 法术列表(sdlpal `magicmenu.c:413`)。
 *
 * 显示 player 已学的全部 magic + MP cost,**MP 不够灰色 + 不可选**。
 * 数据层只生成 SelectionMenuItem 列表;渲染层后续接入。
 */

import type { Magic, PlayerRoles, Spell } from '@type-pal/shared'
import type { SelectionMenuState } from './primitives.js'
import { createSelectionMenu } from './primitives.js'

export interface MagicSelectMenuConfig {
  /** 当前选择施法 player 的 roleId。 */
  roleId: number
  /** player roles(读 rgwMagic 已学法术槽位 + 当前 MP)。 */
  playerRoles: PlayerRoles
  /** 全部 spells.json — spell.magicNumber 反查 magic.json。 */
  spells: Spell[]
  /** 全部 magic.json — 取 baseMpCost / name。 */
  magics: Magic[]
  /** 当前 player MP(运行时用,SAVEDGAME PlayerRoles.rgwMP[roleId] 等价)。 */
  currentMp: number
  pageSize?: number
}

export function createMagicSelectMenu(cfg: MagicSelectMenuConfig): SelectionMenuState {
  const role = cfg.playerRoles.roles[cfg.roleId]
  if (!role) return createSelectionMenu([], cfg.pageSize ?? 8)

  // sdlpal `rgwMagic[32][6]` SoA 已 dump(player-roles.ts B-w0 阶段补)— role.magic
  // 是该 player 32 个已学法术槽位(0 = 空,非 0 = spell id)。
  const learnedSpellIds = (role.magic ?? []).filter((sid) => sid !== 0)

  const items = learnedSpellIds
    .map((spellId) => {
      const spell = cfg.spells.find((s) => s.magicNumber === spellId)
      if (!spell) return null
      const magic = cfg.magics.find((m) => m.id === spell.magicNumber)
      if (!magic) return null
      const mpCost = magic.costMP ?? 0
      const insufficient = cfg.currentMp < mpCost
      return {
        id: spell.id,
        label: spell._name ?? `magic#${magic.id}`,
        rightText: `MP ${mpCost}`,
        disabled: insufficient,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return createSelectionMenu(items, cfg.pageSize ?? 8)
}
