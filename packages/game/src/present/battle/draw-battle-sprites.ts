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

/**
 * 敌人战斗精灵底锚屏幕坐标(present 层唯一真值,sprite + 伤害数字共用,杜绝漂移)。
 *
 * 对照 sdlpal `battle.c:936-942`:
 *   x = EnemyPos.pos[i][maxEnemyIndex].x;
 *   y = EnemyPos.pos[i][maxEnemyIndex].y + wYPosOffset;
 * ts:layouts[count-1][i] 是已翻转的 `pos[i][maxEnemyIndex]`,再加 enemy.e.yPosOffset。
 *
 * @returns 该敌人 idx 的底锚 {x,y};idx 越界 / 无 layout → undefined。
 */
export function computeEnemyAnchor(
  state: BattleState,
  idx: number,
  enemyPos: EnemyPosTable | undefined,
): { x: number, y: number } | undefined {
  const enemyCount = state.enemies.length
  const layout = enemyPos?.layouts[enemyCount - 1] ?? ENEMY_POSITIONS_FALLBACK
  const pos = layout[idx]
  const enemy = state.enemies[idx]
  if (!pos || !enemy)
    return undefined
  return { x: pos.x, y: pos.y + (enemy.e.yPosOffset ?? 0) }
}

/**
 * 队员战斗精灵底锚屏幕坐标(sprite + HP/MP 数字共用)。
 * 对照 sdlpal `battle.c g_rgPlayerPos[3][3][2]`(ts PLAYER_POSITIONS_BY_COUNT)。
 *
 * @returns 该队员 idx 的底锚 {x,y};idx 越界 / 无 layout → undefined。
 */
export function computePlayerAnchor(
  state: BattleState,
  idx: number,
): { x: number, y: number } | undefined {
  const partyCount = state.players.length
  const positions
    = PLAYER_POSITIONS_BY_COUNT[Math.min(partyCount - 1, PLAYER_POSITIONS_BY_COUNT.length - 1)]
  const pos = positions?.[idx]
  return pos ? { x: pos.x, y: pos.y } : undefined
}

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
 * 敌人 idle 帧轮播的闭式索引(D17c)。
 *
 * 对照 sdlpal `fight.c:991-1019 PAL_BattleUpdateFighters` 敌方段(25fps,
 * `BATTLE_FRAME_TIME = 1000/25 = 40ms`,`battle.h:28-29`)。sdlpal 逐 video 帧
 * 跑一个倒计时器:`--wIdleAnimSpeed == 0 → wCurrentFrame++` 并把周期重置回
 * `lprgEnemy[id].wIdleAnimSpeed`(即每 idleAnimSpeed 帧推进 1 格);随后
 * `wCurrentFrame >= wIdleFrames → wCurrentFrame = 0` 环绕。我们用与该倒计时器
 * 同相的闭式 `floor(frameNum / idleAnimSpeed) % idleFrames` 复现整段序列
 * 0,1,…,idleFrames-1,0,…,无须跨帧保存 wCurrentFrame 状态。
 *
 * 门控:
 *   - 睡眠 / 麻痹(`fight.c:1001-1006`):`wCurrentFrame = 0` 定格,不轮播。
 *   - `idleFrames <= 1`(`fight.c:1015-1018`,77 条 enemies idleFrames=1)或
 *     `idleAnimSpeed <= 0`(id0 占位 idleAnimSpeed=0,防除 0)→ 恒定 frame 0。
 *
 * @param frameNum           当前 25fps tick 帧号(= gs.frameNum)
 * @param idleFrames         敌人 idle 序列总帧数(enemies.json[id].idleFrames)
 * @param idleAnimSpeed      每推进 1 格需经过的帧数(enemies.json[id].idleAnimSpeed)
 * @param isSleepOrParalyzed sleep>0 || paralyzed>0
 */
export function computeIdleFrameIndex(
  frameNum: number,
  idleFrames: number,
  idleAnimSpeed: number,
  isSleepOrParalyzed: boolean,
): number {
  if (isSleepOrParalyzed) return 0 // fight.c:1001-1006 定格 wCurrentFrame=0
  if (idleFrames <= 1 || idleAnimSpeed <= 0) return 0 // 退化 / 防除 0
  return Math.floor(frameNum / idleAnimSpeed) % idleFrames
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
  enemyPos: EnemyPosTable | undefined,
  currentFrame: number,
): void {
  // 敌方先画(在背景之上、队员之下)
  // M3.5 fix:优先 EnemyPosTable.layouts[count-1] 真表(DATA.MKF chunk 13 真值);
  // 缺时 fallback hardcoded(向后兼容 test 没传 enemyPos 的)。
  state.enemies.forEach((enemy, i) => {
    if (enemy.e.health <= 0) return
    // D17b:走共享 computeEnemyAnchor(含 wYPosOffset,sdlpal battle.c:939),
    // 与伤害数字锚点同源杜绝漂移。
    const pos = computeEnemyAnchor(state, i, enemyPos)
    if (!pos) return
    const sprite = battleSprites.get(`enemy-${enemy.e.id}`)
    if (!sprite || !sprite.frames[0]) return
    // D17c:敌人 idle 帧轮播(sdlpal fight.c:991-1019)。睡眠 / 麻痹定格 frame 0,
    // 否则按 idle 时钟选帧;资源不全(frames[idx] 缺)兜底 frames[0]。
    const isSleepOrParalyzed
      = enemy.status.sleep > 0 || enemy.status.paralyzed > 0
    const idx = computeIdleFrameIndex(
      currentFrame,
      enemy.e.idleFrames,
      enemy.e.idleAnimSpeed,
      isSleepOrParalyzed,
    )
    const frame = sprite.frames[idx] ?? sprite.frames[0]
    blitFrame(fb, frame, pos.x, pos.y)
  })

  // 队员画在敌方之上(屏幕下方靠近玩家视角)
  // M3.5 fix:position 选 PLAYER_POSITIONS_BY_COUNT[partyCount-1][i],对照 sdlpal
  // g_rgPlayerPos 真表(1/2/3 队员各自 layout)。
  state.players.forEach((p, i) => {
    const role = playerRoles.roles[p.roleId]
    if (!role || role.hp <= 0) return
    const pos = computePlayerAnchor(state, i)
    if (!pos) return
    const sprite = battleSprites.get(`player-${role.spriteNumInBattle}`)
    if (!sprite || !sprite.frames[0]) return
    blitFrame(fb, sprite.frames[0], pos.x, pos.y)
  })
}
