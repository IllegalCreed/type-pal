/**
 * PAL_CLASSIC ActionQueue —— PAL_BattleStartFrame 的填充/排序(fight.c:1451-1585)。
 *
 * 每轮先填敌人再填队员,按 SHORT 速度双循环交换;此排序不稳定。
 * dualMove 两抽中较小者标 fIsSecond,同速时标第二条;交换可能反转同速条目的先后。
 *
 * 对照 sdlpal `battle.h:158-167` `tagACTIONQUEUE`:{ fIsEnemy, wDexterity, wIndex, fIsSecond }。
 *
 * 注:sdlpal 用 RandomFloat(0.9, 1.1) 给 enemy dex 加抖动,dualMove 第二个 entry 也独立摇一次,
 * 然后比较两个 dex 选小者标 fIsSecond(`fight.c:1486-1489`)。本函数为纯函数,不持 RNG,
 * 把抖动职责留给调用方(生产caller传入两抽)。缺省 dex2 的 dex-1 是既有helper近似,
 * 不作为 SDLPal 二抽真值。排序保留原C的13槽与速度0xffff终止边界,仅返回可执行前缀。
 */

/** MAX_ACTIONQUEUE_ITEMS = MAX_PLAYERS_IN_PARTY + MAX_ENEMIES_IN_TEAM * 2。 */
const ACTION_QUEUE_CAPACITY = 3 + 5 * 2
const UNUSED_DEXTERITY = 0xffff

export interface PlayerSlot {
  idx: number
  /** caller完成状态、行动倍率、濒死和jitter后的速度。 */
  dex: number
}

export interface EnemySlot {
  idx: number
  /** getEnemyDexterity 算出的值(第一抽,含 jitter)。 */
  dex: number
  dualMove: boolean
  /**
   * dualMove第二行动的独立dex二抽(sdlpal fight.c:1483-1489 第二 entry 也
   *   GetEnemyDexterity*RandomFloat 再摇一次)。提供时按两抽比较标记fIsSecond,相等时标第二条;
   *   可省略参数的既有近似为dex-1；生产caller始终提供dualMove二抽。
   */
  dex2?: number
}

export interface ActionQueueItem {
  isEnemy: boolean
  /** rgPlayer[idx] 或 rgEnemy[idx] 的索引。 */
  idx: number
  dex: number
  /** dualMove二抽比较标记的附加行动;同速交换后不保证仍排在另一条之后。 */
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
 * PAL_BattleStartFrame(PAL_CLASSIC):填充、SHORT比较交换,消费遇速度0xffff结束。
 *
 * 步骤:
 *   1. 先填敌人;dualMove进两条,按dex/dex2比较标记fIsSecond(缺省dex2保留既有近似)
 *   2. 把所有队员塞队列(fIsSecond=false)
 *   3. 补齐原C空槽,按SHORT速度双循环交换,截取首个速度0xffff之前的队列
 */
export function buildActionQueue(input: BuildActionQueueInput): ActionQueueItem[] {
  const items: ActionQueueItem[] = []

  for (const e of input.enemies) {
    const first: ActionQueueItem = { isEnemy: true, idx: e.idx, dex: e.dex, fIsSecond: false }
    items.push(first)
    if (e.dualMove) {
      // 第二行动独立抖动后，按两抽比较设置fIsSecond；标记与最终排序位置不同。
      //   dex2提供则按两抽比较;省略保留既有dex-1近似,仅标记第二条,不保证其排序后位置。
      if (e.dex2 !== undefined) {
        const second: ActionQueueItem = { isEnemy: true, idx: e.idx, dex: e.dex2, fIsSecond: false }
        if (e.dex2 <= e.dex) second.fIsSecond = true
        else first.fIsSecond = true
        items.push(second)
      } else {
        items.push({ isEnemy: true, idx: e.idx, dex: e.dex - 1, fIsSecond: true })
      }
    }
  }

  for (const p of input.players) {
    items.push({ isEnemy: false, idx: p.idx, dex: p.dex, fIsSecond: false })
  }

  // 原C空槽速度为WORD0xffff,参与SHORT比较时是-1;不能先删空槽再排序。
  while (items.length < ACTION_QUEUE_CAPACITY) {
    items.push({
      isEnemy: false,
      idx: 0xffff,
      dex: UNUSED_DEXTERITY,
      fIsSecond: false,
    })
  }

  // 严格小于也可能因与较快项交换而反转同速项;稳定sort不能替代此控制流。
  for (let i = 0; i < items.length; i++) {
    for (let j = i; j < items.length; j++) {
      const first = items[i]
      const second = items[j]
      if (!first || !second) continue
      // 这是原C WORD→SHORT数值语义,不修改公开队列项的dex值。
      const firstDex = (first.dex << 16) >> 16
      const secondDex = (second.dex << 16) >> 16
      if (firstDex < secondDex) {
        items[i] = second
        items[j] = first
      }
    }
  }

  // PAL_BattleStartFrame在wDexterity==0xffff时结束本轮(不是检查wIndex)。
  const end = items.findIndex((item) => (item.dex & 0xffff) === UNUSED_DEXTERITY)
  return end < 0 ? items : items.slice(0, end)
}
