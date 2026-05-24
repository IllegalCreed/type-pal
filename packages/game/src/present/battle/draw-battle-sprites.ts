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
import type { EnemyPosTable, PlayerRoles } from '@type-pal/shared'
import type { BattleState } from '../../core/battle/battle-state.js'
import type { Framebuffer } from '../framebuffer.js'

/**
 * 队员战斗位置(M3.5 fix:对照 sdlpal battle.c::g_rgPlayerPos[3][3][2])。
 *
 * sdlpal 真值(idx 取 maxPartyMemberIndex,即 partyCount-1):
 *   1 player : (240, 170)
 *   2 players: (200, 176), (256, 152)
 *   3 players: (180, 180), (234, 170), (270, 146)
 *
 * M2/M3 simple version 误用 hardcoded 中心 layout,L2 sdlpal baseline 揭穿。
 */
const PLAYER_POSITIONS_BY_COUNT: ReadonlyArray<ReadonlyArray<{ x: number, y: number }>> = [
  // 1 player
  [{ x: 240, y: 170 }],
  // 2 players
  [{ x: 200, y: 176 }, { x: 256, y: 152 }],
  // 3 players
  [{ x: 180, y: 180 }, { x: 234, y: 170 }, { x: 270, y: 146 }],
  // 4+ players:sdlpal 表只到 3 人,M3.5 4 人 用 3 人 layout + 加一格
  [{ x: 180, y: 180 }, { x: 234, y: 170 }, { x: 270, y: 146 }, { x: 280, y: 130 }],
  // 5 players(罕见)
  [{ x: 180, y: 180 }, { x: 234, y: 170 }, { x: 270, y: 146 }, { x: 280, y: 130 }, { x: 290, y: 110 }],
]

/**
 * 敌方位置 fallback(EnemyPosTable 缺时 / 兜底)。M3.5 起优先 EnemyPosTable
 * (DATA.MKF chunk 13 真值,见 sdlpal global.h ENEMYPOS)。
 */
const ENEMY_POSITIONS_FALLBACK: ReadonlyArray<{ x: number, y: number }> = [
  { x: 160, y: 80 },
  { x: 100, y: 60 }, { x: 220, y: 60 },
  { x: 70, y: 90 }, { x: 250, y: 90 },
]

export interface SpriteFrame {
  width: number
  height: number
  indices: Uint8Array
  /** opaque mask(M3.5 fix):1 = 写入,0 = RLE-skip 透明跳过(同 draw-sprite 约定)。 */
  opaque: Uint8Array
}

export interface SpriteAsset {
  /** 帧列表(M3 静态先画 frame[0]);M4 / 后续按 phase 切帧。 */
  frames: SpriteFrame[]
}

/**
 * 把单帧以 (anchorX, anchorY) 为底部中心 anchor 画到 framebuffer。
 * 透明判定走 opaque mask(M3.5 fix,同 draw-sprite / draw-tilemap)。
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
      const srcOff = y * frame.width + x
      if (frame.opaque[srcOff] === 0) continue
      fb.writePixel(baseX + x, baseY + y, frame.indices[srcOff]!)
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
  enemyPos?: EnemyPosTable,
): void {
  // 敌方先画(在背景之上、队员之下)
  // M3.5 fix:优先 EnemyPosTable.layouts[count-1] 真表(DATA.MKF chunk 13 真值);
  // 缺时 fallback hardcoded(向后兼容 test 没传 enemyPos 的)。
  const enemyCount = state.enemies.length
  const enemyLayout
    = enemyPos?.layouts[enemyCount - 1] ?? ENEMY_POSITIONS_FALLBACK
  state.enemies.forEach((enemy, i) => {
    if (enemy.e.health <= 0) return
    const pos = enemyLayout[i]
    if (!pos) return
    const sprite = battleSprites.get(`enemy-${enemy.e.id}`)
    if (!sprite || !sprite.frames[0]) return
    blitFrame(fb, sprite.frames[0], pos.x, pos.y)
  })

  // 队员画在敌方之上(屏幕下方靠近玩家视角)
  // M3.5 fix:position 选 PLAYER_POSITIONS_BY_COUNT[partyCount-1][i],对照 sdlpal
  // g_rgPlayerPos 真表(1/2/3 队员各自 layout)。
  const partyCount = state.players.length
  const positions
    = PLAYER_POSITIONS_BY_COUNT[Math.min(partyCount - 1, PLAYER_POSITIONS_BY_COUNT.length - 1)]
  if (!positions) return
  state.players.forEach((p, i) => {
    const role = playerRoles.roles[p.roleId]
    if (!role || role.hp <= 0) return
    const pos = positions[i]
    if (!pos) return
    const sprite = battleSprites.get(`player-${role.spriteNumInBattle}`)
    if (!sprite || !sprite.frames[0]) return
    blitFrame(fb, sprite.frames[0], pos.x, pos.y)
  })
}
