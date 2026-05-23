/**
 * PAL_CLASSIC ActionQueue —— from `reference/sdlpal/fight.c:1900-1985`(`#ifdef PAL_CLASSIC` 分支)。
 *
 * 每轮重排:队员 + 敌人 按 dexterity 降序;dualMove enemy 进队列两次(第二次 fIsSecond=true,
 * 实际效果是排在第一次之后,等所有人都行动完再轮到它)。
 *
 * 对照 sdlpal `battle.h:158-167` `tagACTIONQUEUE`:{ fIsEnemy, wDexterity, wIndex, fIsSecond }。
 *
 * 注:sdlpal 用 RandomFloat(0.9, 1.1) 给 enemy dex 加抖动,dualMove 第二个 entry 也独立摇一次,
 * 然后比较两个 dex 选小者标 fIsSecond(`fight.c:1486-1489`)。本函数为纯函数,不持 RNG,
 * 把抖动职责留给调用方(传 dex 时已 modulated),并用 dex-1 模拟「第二次必排在第一次之后」。
 */

export interface PlayerSlot {
  idx: number
  /** getPlayerActualDexterity 算出的值。 */
  dex: number
}

export interface EnemySlot {
  idx: number
  /** getEnemyDexterity 算出的值。 */
  dex: number
  dualMove: boolean
}

export interface ActionQueueItem {
  isEnemy: boolean
  /** rgPlayer[idx] 或 rgEnemy[idx] 的索引。 */
  idx: number
  dex: number
  /** 仅 dualMove enemy 的第二次行动 = true。 */
  fIsSecond: boolean
}

export interface BuildActionQueueInput {
  players: PlayerSlot[]
  enemies: EnemySlot[]
}

/**
 * 构建一轮 ActionQueue。
 *
 * from `reference/sdlpal/fight.c:1451-1571`(`#ifdef PAL_CLASSIC` 分支 enemy + player 填充)。
 *
 * 步骤:
 *   1. 把所有队员塞队列(fIsSecond=false)
 *   2. 把所有敌人塞队列;dualMove enemy 进队列两次,第二次 dex-1 + fIsSecond=true
 *   3. dex 降序稳定排序;同 dex 队员先于敌人
 */
export function buildActionQueue(input: BuildActionQueueInput): ActionQueueItem[] {
  const items: ActionQueueItem[] = []

  for (const p of input.players) {
    items.push({ isEnemy: false, idx: p.idx, dex: p.dex, fIsSecond: false })
  }

  for (const e of input.enemies) {
    items.push({ isEnemy: true, idx: e.idx, dex: e.dex, fIsSecond: false })
    if (e.dualMove) {
      // dualMove enemy 第二次行动:dex 减 1,保证排在第一次之后(sdlpal `fight.c:1486-1489`)
      items.push({ isEnemy: true, idx: e.idx, dex: e.dex - 1, fIsSecond: true })
    }
  }

  // 稳定排序(JS Array.sort 在 modern engine ECMA-2019+ 是 stable):
  //   - dex 降序
  //   - 同 dex 队员先于敌人(sdlpal `fight.c:1498-1571` 在 enemy 循环之后填 player,
  //     但 PAL_CLASSIC 最终按 dex 排;tie-break 此处取队员优先,与 spec test 一致)
  items.sort((a, b) => {
    if (a.dex !== b.dex)
      return b.dex - a.dex
    if (a.isEnemy !== b.isEnemy)
      return a.isEnemy ? 1 : -1
    return 0
  })

  return items
}
