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

/** D17 死亡淡出总步数(PAL_BattleFadeScene 外 12 × 内 6,battle.c:634-636)。 */
export const DEATH_FADE_TOTAL_STEPS = 72

/**
 * D17 死亡淡出 crossfade blit —— port `PAL_BattleFadeScene`(battle.c:608-682)的净效果。
 *
 * sdlpal:fade 是同步 72 步循环,每步把"敌人还在的旧帧"(b)像素低 nibble 朝
 * "敌人没了的新帧 = 其下背景"(a)像素低 nibble ±1 逼近,高 nibble 直接取 a;72 步后
 * 整块拷新帧。净效果:死敌精灵像素逐步 crossfade 成其下方背景 → 渐隐消失。
 *
 * **逐像素忠实复现**(含 sdlpal 的 rgIndex 抖动交错):取落点 fb 当前像素 a(= 背景,
 * 敌精灵未画前 fb 已含 bg + 其它精灵)作目标,sprite 像素 b 作起点。
 *
 * sdlpal(battle.c:634-663)72 步 = 外 i=0..11 × 内 j=0..5,每步 16ms。第 (i,j) 步只处理
 * linear 下标 k ≡ rgIndex[j] (mod 6) 的像素(rgIndex={0,3,1,5,2,4});写 (a&0xF0)|(b&0x0F),
 * 且仅 i>0 时把 b 低 nibble 朝 a ±1。所以**每个像素按其 k%6 决定首次被处理的子步 jr**:
 *   - 显示帧 step < jr:本像素还没被碰过 → 仍显原敌像素 b(抖动交错的起点,不同像素错峰渐隐)。
 *   - step >= jr:高 nibble 立即换背景(a&0xF0);低 nibble 朝 aLow 逼近 floor((step-jr)/6) 格
 *     (每个外层 i>0 推进 1,i=1..11 最多 11 格),clamp |diff|。
 * 透明像素(opaque mask=0,= RLE-skip run)不参与。step>=72 时 draw 层直接不画(等价完全消失)。
 */
// rgIndex={0,3,1,5,2,4} 的逆:像素 residue(k%6)→ 它在 6 步块内被处理的子步 jr。
const RG_INDEX_INV = [0, 2, 4, 1, 5, 3]

export function blitFrameDeathFade(
  fb: Framebuffer,
  frame: SpriteFrame,
  anchorX: number,
  anchorY: number,
  step: number,
): void {
  const baseX = anchorX - (frame.width >> 1)
  const baseY = anchorY - frame.height
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const srcOff = y * frame.width + x
      if (frame.opaque[srcOff] === 0) continue
      const px = baseX + x
      const py = baseY + y
      if (px < 0 || px >= fb.width || py < 0 || py >= fb.height) continue
      const b = frame.indices[srcOff]! // 旧帧:敌精灵像素
      // sdlpal k = py*pitch+px(pitch=fb.width=320);该像素在块内子步 jr = rgIndexInv[k%6]。
      const jr = RG_INDEX_INV[(py * fb.width + px) % 6]!
      if (step < jr) {
        fb.writePixel(px, py, b) // 还没轮到本像素 → 显原敌像素(抖动错峰起点)
        continue
      }
      const a = fb.indices[py * fb.width + px]! // 背景(新帧:敌没了)
      const aLow = a & 0x0f
      const bLow = b & 0x0f
      const diff = aLow - bLow
      // 已处理:block i=0(step=jr)只换高 nibble 不 nudge;之后每外层 i(>0)推进 1 格 →
      //   nudge 次数 = floor((step-jr)/6),clamp |diff|(battle.c:650-662)。
      const nudges = Math.min(Math.floor((step - jr) / 6), Math.abs(diff))
      const low = diff >= 0 ? bLow + nudges : bLow - nudges
      fb.writePixel(px, py, (a & 0xf0) | (low & 0x0f))
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
/** sdlpal `s_iFrame & 1` 等价(同 draw-battle-ui arrowBlinkRed):敌方 target 高亮 / 箭头闪烁 toggle。 */
function battleSelectBlinkOn(): boolean {
  return (Math.floor(Date.now() / 40) & 1) === 1
}

/**
 * 敌方 target 选择时该敌人的 ColorShift 高亮值 —— sdlpal `uibattle.c:1495-1510`(PAL_CLASSIC):
 *   kBattleUISelectTargetEnemy / EnemyAll 在 `s_iFrame & 1`(blinkOn)帧对**选中敌人**(单体:iSelectedIndex;
 *   全体:每个活敌)`PAL_RLEBlitWithColorShift(sprite, pos, 7)` 重 blit 高亮。**无箭头**(箭头是 ts 旧错实现)。
 * 纯函数(blinkOn 作参数 → 可确定性单测)。返回 7 = 高亮,0 = 不高亮。
 */
export function enemyTargetHighlightShift(state: BattleState, enemyIdx: number, blinkOn: boolean): number {
  if (!blinkOn) return 0
  if ((state.enemies[enemyIdx]?.e.health ?? 0) <= 0) return 0
  if (state.uiState === 'selectTargetEnemyAll') return 7
  if (state.uiState === 'selectTargetEnemy') return enemyIdx === state.uiCursor ? 7 : 0
  return 0
}

/** PAL_IsPlayerDying(fight.c:47-48):hp < min(100, maxHP/5)。 */
function isPlayerDyingFrame(hp: number, maxHP: number): boolean {
  return hp < Math.min(100, Math.floor(maxHP / 5))
}

/**
 * 玩家战斗空闲帧 —— sdlpal `PAL_BattleUpdateFighters`(fight.c:961-984,CLASSIC):
 *   sleep != 0 或濒死 → 帧 1(濒死姿)/ 防御 → 帧 3 / else → 帧 0。
 *   (dead 帧 2 / puppet 帧 0 由 draw 上层 hp<=0 skip 处理;**confused 无特殊帧** → 0。)
 * 纯函数,可单测。仅空闲(无 battleAnim/fleeAnim 动画覆盖)时用。
 */
export function computePlayerBattleIdleFrame(
  player: { status: { sleep: number }; defending: boolean },
  role: { hp: number; maxHP: number },
): number {
  if (player.status.sleep > 0 || isPlayerDyingFrame(role.hp, role.maxHP)) return 1
  if (player.defending) return 3
  return 0
}

export function drawBattleSprites(
  fb: Framebuffer,
  state: BattleState,
  battleSprites: Map<string, SpriteAsset>,
  playerRoles: PlayerRoles,
  enemyPos: EnemyPosTable | undefined,
  currentFrame: number,
): void {
  const targetBlinkOn = battleSelectBlinkOn()
  // D17a:把双方收集成一个 draw 列表 → Y 升序(平局 X 降序)排序 → 逐条 blit。
  // 对照 sdlpal `battle.c:434-469 PAL_BattleSortSpritesByY`:Y 小的先画(靠后),
  // Y 相等时 X 大的先画;后画的盖前 → 屏幕下方 / 左侧 sprite 在上。
  interface DrawItem {
    x: number
    y: number
    frame: SpriteFrame
    iColorShift: number
    /** D17:>=0 时走 blitFrameDeathFade(死亡淡出步);<0 = 普通 blit。 */
    fadeStep: number
  }
  const items: DrawItem[] = []

  // 敌方
  state.enemies.forEach((enemy, i) => {
    // D17 死亡淡出(对照 sdlpal:敌人攻击动画期间 wObjectID 仍 !=0 照常画+受击闪白,
    //   **动画收尾** PAL_BattlePostActionCheck 才 wObjectID=0 + FadeScene 渐隐 battle.c:608-682):
    //   - deathFadeStep === undefined → 照常画(活着 **或** 刚被打死但淡出未开始 →
    //     受击帧 / 闪白仍可见,**不**瞬隐。这是修"先消失再淡出"的关键)。
    //   - 0..71 → crossfade blit(渐隐中)。
    //   - >= 72 → 不画(已完全淡出消失)。
    const fadeStep = enemy.deathFadeStep
    if (fadeStep !== undefined && fadeStep >= DEATH_FADE_TOTAL_STEPS) return
    const isFading = fadeStep !== undefined // 0..71(>=72 已 return);undefined = 活/刚死未淡
    // D17a:动画期间用 render-state pos(逐帧 mutate);旧 fixture 无 pos → 共享 anchor
    // (含 wYPosOffset,sdlpal battle.c:939),与伤害数字锚点同源杜绝漂移。
    const pos = enemy.pos ?? computeEnemyAnchor(state, i, enemyPos)
    if (!pos) return
    const sprite = battleSprites.get(`enemy-${enemy.e.id}`)
    if (!sprite || !sprite.frames[0]) return
    // 帧号:render-state currentFrame 优先(攻击 / 受击 / 淡出复位);缺则 idle 时钟
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
    const frame = sprite.frames[frameIdx] ?? sprite.frames[0]!
    // 敌方 target 选择高亮(sdlpal uibattle.c:1495-1510,ColorShift 7,无箭头)优先于受击闪白。
    const highlight = enemyTargetHighlightShift(state, i, targetBlinkOn)
    items.push({
      x: pos.x,
      y: pos.y,
      frame,
      // 淡出中 iColorShift 归 0(crossfade 自带渐隐);target 高亮 7 优先;否则 render-state(受击闪白 6)。
      iColorShift: isFading ? 0 : (highlight !== 0 ? highlight : (enemy.iColorShift ?? 0)),
      fadeStep: isFading ? fadeStep : -1,
    })
  })

  // 队员
  state.players.forEach((p, i) => {
    const role = playerRoles.roles[p.roleId]
    if (!role || role.hp <= 0) return
    const pos = p.pos ?? computePlayerAnchor(state, i)
    if (!pos) return
    const sprite = battleSprites.get(`player-${role.spriteNumInBattle}`)
    if (!sprite || !sprite.frames[0]) return
    // 帧号:动画 / 逃跑期间用 render-state currentFrame(攻击 8,9 / 受击 4 / 逃跑站立 0);
    //   空闲(无 battleAnim/fleeAnim)据 status 算(sdlpal PAL_BattleUpdateFighters fight.c:961-984):
    //   sleep 或濒死 → 1(濒死姿)/ 防御 → 3 / else → 0(confused 无特殊帧)。
    const frameIdx = (state.battleAnim || state.fleeAnim)
      ? (p.currentFrame ?? 0)
      : computePlayerBattleIdleFrame(p, role)
    const frame = sprite.frames[frameIdx] ?? sprite.frames[0]
    items.push({ x: pos.x, y: pos.y, frame, iColorShift: p.iColorShift ?? 0, fadeStep: -1 })
  })

  // Y 升序;平局 X 降序(battle.c:444-466)
  items.sort((a, b) => (a.y !== b.y ? a.y - b.y : b.x - a.x))

  for (const it of items) {
    // D17:死亡淡出像素走 crossfade(读 fb 背景逼近);普通精灵走 iColorShift blit。
    if (it.fadeStep >= 0) blitFrameDeathFade(fb, it.frame, it.x, it.y, it.fadeStep)
    else blitFrame(fb, it.frame, it.x, it.y, it.iColorShift)
  }
}
