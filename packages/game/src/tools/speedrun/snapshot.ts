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
   * 李逍遥此帧是否可移动 —— 计时起表门。对齐 PalTimer「第一次能控制李逍遥」(README:465);
   * PalTimer 起表 = Area!=0(原版菜单 Area=0),但本移植 boot 期就预载场景(wNumScene 早早 >0),
   * 纯 scene>0 会在标题/开场就提前起表。
   *
   * 条件(2026-06-22 真浏览器实测 window.__tpgs 核实四个 boot 阶段):
   *   - explore 模式(开场菜单是 mode='menu' → 排除)
   *   - 非 suspendRaf(开场视频/CG/RNG/FBP/梦境演出 + **boot 预载窗口**都 suspendRaf=true → 排除;
   *     实测 boot 有一段 mode='explore' 但 suspendRaf=true 的窗口,漏这条会在那里误起表)
   *   - 非场景加载、非 palette 淡入(scene-system.ts:447/461/483 引擎移动门同款)
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
    // explore + 非加载 + 非淡入 + 非 suspendRaf(modal/boot 预载期)。见上方字段注释。
    canMove:
      gs.mode === 'explore' && !gs.sceneLoading && !gs.paletteFadeState && !gs.suspendRaf,
    partyX: gs.party.x,
    partyY: gs.party.y,
    music: gs.wNumMusic,
    inventory,
    battle,
  }
}
