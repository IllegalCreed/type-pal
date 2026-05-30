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
import { ENEMY_POSITIONS_FALLBACK, getPlayerBasePos } from '../../core/battle/battle-positions.js'
import type { BattleState } from '../../core/battle/battle-state.js'
import type { Framebuffer } from '../framebuffer.js'

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
): { x: number; y: number } | undefined {
  const enemyCount = state.enemies.length
  const layout = enemyPos?.layouts[enemyCount - 1] ?? ENEMY_POSITIONS_FALLBACK
  const pos = layout[idx]
  const enemy = state.enemies[idx]
  if (!pos || !enemy) return undefined
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
): { x: number; y: number } | undefined {
  return getPlayerBasePos(state.players.length, idx)
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
 *
 * D17a iColorShift(sdlpal `palcommon.c:398-411 PAL_RLEBlitWithColorShift`):
 *   受击 / 法术染色时低 nibble 整体偏移 —— 每个 **opaque** 像素
 *   `b = (idx & 0x0F) + shift` clamp[0, 0x0F],`out = b | (idx & 0xF0)`。
 *   透明(opaque mask=0,= RLE-skip run)不参与偏移(sdlpal 同样跳过)。
 *   shift=0 时退化为原值(等价旧 blit)。
 */
function blitFrame(
  fb: Framebuffer,
  frame: SpriteFrame,
  anchorX: number,
  anchorY: number,
  iColorShift = 0,
): void {
  const baseX = anchorX - (frame.width >> 1)
  const baseY = anchorY - frame.height
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const srcOff = y * frame.width + x
      if (frame.opaque[srcOff] === 0) continue
      let idx = frame.indices[srcOff]!
      if (iColorShift !== 0) {
        // palcommon.c:397-411:只偏移低 nibble,clamp[0,0x0F],高 nibble(0xF0)保留。
        let low = (idx & 0x0f) + iColorShift
        if (low > 0x0f) low = 0x0f
        else if (low < 0) low = 0
        idx = (low | (idx & 0xf0)) & 0xff
      }
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
  enemyPos: EnemyPosTable | undefined,
  currentFrame: number,
): void {
  // D17a:把双方收集成一个 draw 列表 → Y 升序(平局 X 降序)排序 → 逐条 blit。
  // 对照 sdlpal `battle.c:434-469 PAL_BattleSortSpritesByY`:Y 小的先画(靠后),
  // Y 相等时 X 大的先画;后画的盖前 → 屏幕下方 / 左侧 sprite 在上。
  interface DrawItem {
    x: number
    y: number
    frame: SpriteFrame
    iColorShift: number
  }
  const items: DrawItem[] = []

  // 敌方
  state.enemies.forEach((enemy, i) => {
    if (enemy.e.health <= 0) return
    // D17a:动画期间用 render-state pos(逐帧 mutate);旧 fixture 无 pos → 共享 anchor
    // (含 wYPosOffset,sdlpal battle.c:939),与伤害数字锚点同源杜绝漂移。
    const pos = enemy.pos ?? computeEnemyAnchor(state, i, enemyPos)
    if (!pos) return
    const sprite = battleSprites.get(`enemy-${enemy.e.id}`)
    if (!sprite || !sprite.frames[0]) return
    // 帧号:render-state currentFrame 优先(攻击 / 受击动画);缺则 idle 时钟
    // (sdlpal fight.c:991-1019,睡眠 / 麻痹定格 frame 0)。资源不全兜底 frames[0]。
    let frameIdx: number
    if (enemy.currentFrame !== undefined) {
      frameIdx = enemy.currentFrame
    } else {
      const isSleepOrParalyzed = enemy.status.sleep > 0 || enemy.status.paralyzed > 0
      frameIdx = computeIdleFrameIndex(
        currentFrame,
        enemy.e.idleFrames,
        enemy.e.idleAnimSpeed,
        isSleepOrParalyzed,
      )
    }
    const frame = sprite.frames[frameIdx] ?? sprite.frames[0]
    items.push({ x: pos.x, y: pos.y, frame, iColorShift: enemy.iColorShift ?? 0 })
  })

  // 队员
  state.players.forEach((p, i) => {
    const role = playerRoles.roles[p.roleId]
    if (!role || role.hp <= 0) return
    const pos = p.pos ?? computePlayerAnchor(state, i)
    if (!pos) return
    const sprite = battleSprites.get(`player-${role.spriteNumInBattle}`)
    if (!sprite || !sprite.frames[0]) return
    // 帧号:render-state currentFrame 优先(站立 0 / 攻击 8,9 / 受击 4 …);缺则 frames[0]。
    const frameIdx = p.currentFrame ?? 0
    const frame = sprite.frames[frameIdx] ?? sprite.frames[0]
    items.push({ x: pos.x, y: pos.y, frame, iColorShift: p.iColorShift ?? 0 })
  })

  // Y 升序;平局 X 降序(battle.c:444-466)
  items.sort((a, b) => (a.y !== b.y ? a.y - b.y : b.x - a.x))

  for (const it of items) blitFrame(fb, it.frame, it.x, it.y, it.iColorShift)
}
