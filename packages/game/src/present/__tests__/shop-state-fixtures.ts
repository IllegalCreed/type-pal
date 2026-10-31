/** Fresh shop state with party and non-party equipment copies; callers own each returned state. */
import type { GameState } from '../../core/game-state.js'
import { makeItem, makeLiveScene } from './menu-state-fixtures.js'
export const shopSword = makeItem(400, '甲', {
  price: 50,
  flags: {
    sellable: true,
    equipable: true,
    equipableBy: [false, true, true, false, true, false],
  },
})
export function shopSceneWithEquippedCopies(): GameState {
  const { gs } = makeLiveScene([4, 1])
  gs.dwCash = 7
  gs.inventory = [{ itemId: 400, count: 2 }]
  gs.PlayerRolesRuntime.rgwEquipment[3]![4] = shopSword.id // 队员4手部
  gs.PlayerRolesRuntime.rgwEquipment[3]![1] = shopSword.id // 队员1手部
  gs.PlayerRolesRuntime.rgwEquipment[3]![2] = shopSword.id // 非队员2:不得计入
  return gs
}
