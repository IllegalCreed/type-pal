/**
 * PAL_CLASSIC ActionQueue —— from `reference/sdlpal/fight.c:1900-1985`(`#ifdef PAL_CLASSIC` 分支)。
 *
 * 每轮重排:敌人 + 队员 按 dexterity 降序;dualMove enemy 进队列两次(第二次 fIsSecond=true,
 * 实际效果是排在第一次之后,等所有人都行动完再轮到它)。
 *
 * 对照 sdlpal `battle.h:158-167` `tagACTIONQUEUE`:{ fIsEnemy, wDexterity, wIndex, fIsSecond }。
 *
 * 注:sdlpal 用 RandomFloat(0.9, 1.1) 给 enemy dex 加抖动,dualMove 第二个 entry 也独立摇一次,
 * 然后比较两个 dex 选小者标 fIsSecond(`fight.c:1486-1489`)。本函数为纯函数,不持 RNG,
 * 把抖动职责留给调用方(传 dex 时已 modulated),并用 dex-1 模拟「第二次必排在第一次之后」。
 * SDLPal 先填敌人、再填队员,排序只在 `<` 时交换,故同 dex 保持敌人在前。
 */

export interface PlayerSlot {
  idx: number
  /** getPlayerActualDexterity 算出的值。 */
  dex: number
}

export interface EnemySlot {
  idx: number
  /** getEnemyDexterity 算出的值(第一抽,含 jitter)。 */
  dex: number
  dualMove: boolean
  /**
   * D7(W1):dualMove 第二行动的**独立**dex 二抽(sdlpal fight.c:1483-1489 第二 entry 也
   *   GetEnemyDexterity*RandomFloat 再摇一次)。提供时用 dex/dex2 比较定 fIsSecond(小者当第二动);
   *   省略时回退旧 `dex-1` 近似(兼容未传 dex2 的调用方)。
   */
  dex2?: number
}

export interface ActionQueueItem {
  isEnemy: boolean
  /** rgPlayer[idx] 或 rgEnemy[idx] 的索引。 */
  idx: number
  dex: number
  /** 仅 dualMove enemy 的第二次行动 = true。 */
  fIsSecond: boolean
  /**
   * 敌人 wScriptOnReady 已跑过(本 turn 项一次性)。tickPerformAction 跑 scriptOnReady 后置真,
   * 防对话 hold 暂停期间重入 tickPerformAction 时重复跑脚本。actionQueue 每轮重建 → 自动新鲜。
   */
  scriptReadyRan?: boolean
  /**
   * 本 action 收尾是否按 `PAL_BattlePostActionCheck(TRUE)` 检查队员死亡 / 濒死脚本。
   * 仅敌方攻击队员时为 true；玩家动作、敌人混乱打敌人、毒 tick 等均为 false。
   */
  checkPlayerCasualties?: boolean
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
 *   1. 把所有敌人塞队列;dualMove enemy 进队列两次,第二次 dex-1 + fIsSecond=true
 *   2. 把所有队员塞队列(fIsSecond=false)
 *   3. dex 降序稳定排序;同 dex 保持填充顺序,即敌人先于队员
 */
export function buildActionQueue(input: BuildActionQueueInput): ActionQueueItem[] {
  const items: ActionQueueItem[] = []

  for (const e of input.enemies) {
    const first: ActionQueueItem = { isEnemy: true, idx: e.idx, dex: e.dex, fIsSecond: false }
    items.push(first)
    if (e.dualMove) {
      // D7(W1):dualMove 第二行动 — sdlpal fight.c:1483-1489 第二 entry 独立二抽 dex(GetEnemyDexterity*RandomFloat),
      //   然后 `if (second.dex <= first.dex) second.fIsSecond=TRUE; else first.fIsSecond=TRUE`(小 dex 者当第二动)。
      //   dex2 提供则真值比较;省略回退旧 `dex-1`(第二条恒 fIsSecond,排第一条之后)。
      if (e.dex2 !== undefined) {
        const second: ActionQueueItem = { isEnemy: true, idx: e.idx, dex: e.dex2, fIsSecond: false }
        if (e.dex2 <= e.dex) second.fIsSecond = true
        else first.fIsSecond = true
        items.push(second)
      }
      else {
        items.push({ isEnemy: true, idx: e.idx, dex: e.dex - 1, fIsSecond: true })
      }
    }
  }

  for (const p of input.players) {
    items.push({ isEnemy: false, idx: p.idx, dex: p.dex, fIsSecond: false })
  }

  // SDLPal 用双循环仅在 `(SHORT)a.dex < (SHORT)b.dex` 时交换(fight.c:1574-1584)。
  // JS stable sort + 只比较 dex 等价:同 dex 保留「敌人先填、队员后填」的顺序。
  items.sort((a, b) => b.dex - a.dex)

  return items
}
