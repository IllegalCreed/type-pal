/**
 * 战斗精灵渲染 —— 我方 + 敌方(M3 T25)。
 *
 * 数据源:
 *   - 我方:F.MKF chunk[role.spriteNumInBattle](sdlpal `battle.c:856`)
 *   - 敌方:ABC.MKF chunk[enemy.id](sdlpal 同函数 `wEnemyID` 真值)
 *
 * M3 简版:位置硬编码(5 个槽位)。M5 时按 sdlpal ENEMYPOS / 队列位置真值。
 * blit 规则同 draw-sprite:anchor 在底部中心,索引 0 透明,屏外 clip。
 */
import type { PlayerRoles } from '@type-pal/shared'
import type { BattleState } from '../../core/battle/battle-state.js'
import type { Framebuffer } from '../framebuffer.js'

/**
 * 队员战斗位置(M3 简版,5 个槽位)。
 * 队长(idx 0)居中靠后,其余按 sdlpal team 顺序左右展开。
 */
const PLAYER_POSITIONS: ReadonlyArray<{ x: number, y: number }> = [
  { x: 160, y: 150 },
  { x: 80, y: 145 }, { x: 240, y: 145 },
  { x: 50, y: 160 }, { x: 270, y: 160 },
]

/**
 * 敌方位置(M3 简版,5 个槽位)。M5 时改读 enemy.json ENEMYPOS。
 */
const ENEMY_POSITIONS: ReadonlyArray<{ x: number, y: number }> = [
  { x: 160, y: 80 },
  { x: 100, y: 60 }, { x: 220, y: 60 },
  { x: 70, y: 90 }, { x: 250, y: 90 },
]

export interface SpriteFrame {
  width: number
  height: number
  indices: Uint8Array
}

export interface SpriteAsset {
  /** 帧列表(M3 静态先画 frame[0]);M4 / 后续按 phase 切帧。 */
  frames: SpriteFrame[]
}

/**
 * 把单帧以 (anchorX, anchorY) 为底部中心 anchor 画到 framebuffer。
 * 索引 0 透明(同 draw-sprite RLE 约定)。
 */
function blitFrame(
  fb: Framebuffer,
  frame: SpriteFrame,
  anchorX: number,
  anchorY: number,
): void {
  const baseX = anchorX - (frame.width >> 1)
  const baseY = anchorY - frame.height
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const idx = frame.indices[y * frame.width + x]!
      if (idx === 0) continue
      fb.writePixel(baseX + x, baseY + y, idx)
    }
  }
}

/**
 * 画双方战斗精灵。
 *
 * - 死亡(hp ≤ 0)的敌方 / 队员不画。
 * - sprite 找不到(loader 缺资源)时跳过(已 warn,渲染层不再重复)。
 *
 * sprite key 规约:
 *   - 我方:`player-${spriteNumInBattle}`
 *   - 敌方:`enemy-${enemy.e.id}`
 */
export function drawBattleSprites(
  fb: Framebuffer,
  state: BattleState,
  battleSprites: Map<string, SpriteAsset>,
  playerRoles: PlayerRoles,
): void {
  // 敌方先画(在背景之上、队员之下)
  state.enemies.forEach((enemy, i) => {
    if (enemy.e.health <= 0) return
    const pos = ENEMY_POSITIONS[i]
    if (!pos) return
    const sprite = battleSprites.get(`enemy-${enemy.e.id}`)
    if (!sprite || !sprite.frames[0]) return
    blitFrame(fb, sprite.frames[0], pos.x, pos.y)
  })

  // 队员画在敌方之上(屏幕下方靠近玩家视角)
  state.players.forEach((p, i) => {
    const role = playerRoles.roles[p.roleId]
    if (!role || role.hp <= 0) return
    const pos = PLAYER_POSITIONS[i]
    if (!pos) return
    const sprite = battleSprites.get(`player-${role.spriteNumInBattle}`)
    if (!sprite || !sprite.frames[0]) return
    blitFrame(fb, sprite.frames[0], pos.x, pos.y)
  })
}
