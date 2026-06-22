// snapshot.ts —— 每帧从 GameState 抽取速通检测所需的轻量快照。检测器只读快照,不碰引擎内部。
import type { GameState } from '../../core/game-state.js'

export interface BattleSnap {
  /** 本场全部敌人 e.id(阵亡后仍留在 enemies 数组,故含已阵亡)。 */
  enemyIds: ReadonlySet<number>
  /** Σ e.health;≤0 ≈ 战斗已胜(镜像 PalTimer BattleTotalBlood)。 */
  totalEnemyHp: number
}

export interface ProgressSnapshot {
  scene: number // gs.wNumScene(== PalTimer area)
  /**
   * 李逍遥此帧是否可移动 —— 镜像引擎移动门 `tickSceneInput`(scene-system.ts:447/461/483):
   * explore 模式 + 非场景加载 + 非淡入(paletteFadeState)。**计时起表门**:PalTimer 起表 = Area!=0
   * (原版菜单 Area=0),但本移植在 boot 期就预载场景(wNumScene 早早 >0),纯 scene>0 会在标题/开场
   * 演出就提前起表。改用「可移动」对齐 PalTimer「第一次能控制李逍遥」语义(README:465)。
   */
  canMove: boolean
  partyX: number // gs.party.x(绝对像素)
  partyY: number // gs.party.y
  music: number // gs.wNumMusic
  inventory: ReadonlySet<number> // count>0 的物品 id
  battle: BattleSnap | null // 无战斗 → null
}

export function buildSnapshot(gs: GameState): ProgressSnapshot {
  const inventory = new Set<number>()
  for (const e of gs.inventory) if (e.count > 0) inventory.add(e.itemId)

  let battle: BattleSnap | null = null
  const bs = gs.battleState
  if (bs) {
    const enemyIds = new Set<number>()
    let totalEnemyHp = 0
    for (const be of bs.enemies) {
      enemyIds.add(be.e.id)
      totalEnemyHp += be.e.health
    }
    battle = { enemyIds, totalEnemyHp }
  }

  return {
    scene: gs.wNumScene,
    // 与 scene-system.tickSceneInput 放行条件一致(explore + 非加载 + 非淡入)。
    canMove: gs.mode === 'explore' && !gs.sceneLoading && !gs.paletteFadeState,
    partyX: gs.party.x,
    partyY: gs.party.y,
    music: gs.wNumMusic,
    inventory,
    battle,
  }
}
