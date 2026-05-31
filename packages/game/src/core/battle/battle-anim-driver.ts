/**
 * 物理战斗动画时间线驱动(D17a)—— 把声明式 `BattleAnimFrame` 应用到 BattleState
 * 的 per-fighter render state,并在动画播完后复位 fighter。
 *
 * - applyAnimFrame:把一帧的 fighters / overlay / damageNum 落到 state(+ emit 数字弹幕)。
 * - startBattleAnim:set state.battleAnim 并立即应用 frame[0](performAttack 用)。
 * - resetFightersAfterAction:port PAL_BattleUpdateFighters 复位段(fight.c:940-1019)。
 *
 * 抽到独立 module(非 battle-system.ts):actions/attack.ts 起时间线 + battle-system.ts
 * 驱动时间线 都要用,避免循环依赖。
 */

import type { PlayerRoles } from '@type-pal/shared'
import type { CommandBus } from '../command-bus.js'
import type { BattleAnimFrame, BattleAnimState, BattleState } from './battle-state.js'

/**
 * 把一帧动画应用到 state:
 *   - fighters:逐条 mutate 对应 player/enemy 的 pos/currentFrame/iColorShift
 *   - overlay:写到 state.battleAnim.overlay(供 present 画 effect sprite)
 *   - damageNum:emit showDamageNum(present 数字弹幕)
 * sound / shake 本切片只存在 frame 上,present 后续消费(此处不处理)。
 */
export function applyAnimFrame(state: BattleState, frame: BattleAnimFrame, bus: CommandBus): void {
  if (frame.fighters) {
    for (const d of frame.fighters) {
      const fighter = d.side === 'player' ? state.players[d.idx] : state.enemies[d.idx]
      if (!fighter) continue
      if (d.pos) fighter.pos = { x: d.pos.x, y: d.pos.y }
      if (d.currentFrame !== undefined) fighter.currentFrame = d.currentFrame
      if (d.iColorShift !== undefined) fighter.iColorShift = d.iColorShift
    }
  }
  // overlay / overlays 落到 battleAnim(present 取当前帧 effect / magic sprite);无则清空。
  //   - overlay(单数):物理攻击命中特效。
  //   - overlays(复数):D17 法术 sprite(AttackAll 三落点 / 单落点一条)。
  if (state.battleAnim) {
    state.battleAnim.overlay = frame.overlay
    state.battleAnim.overlays = frame.overlays
  }

  if (frame.damageNum) {
    bus.emit({
      op: 'showDamageNum',
      target: frame.damageNum.target,
      value: frame.damageNum.value,
      color: frame.damageNum.color,
    })
  }
}

/**
 * 启动一条动画时间线:set state.battleAnim(idx=0, frameElapsedMs=0)并立即应用 frame[0]。
 * frames 为空 → 不建时间线(no-op;调用方据此走即时推进)。
 *
 * @param pendingDamageNums 时间线**播完后**才 emit 的伤害数字(法术:特效落完才出,
 *   对照 sdlpal PAL_BattleDisplayStatChange 在 magic anim 之后;物理走 frame.damageNum 不传此参)。
 */
export function startBattleAnim(
  state: BattleState,
  frames: BattleAnimFrame[],
  bus: CommandBus,
  pendingDamageNums?: BattleAnimState['pendingDamageNums'],
): void {
  if (frames.length === 0) return
  state.battleAnim = { frames, idx: 0, frameElapsedMs: 0, overlay: undefined, pendingDamageNums }
  applyAnimFrame(state, frames[0]!, bus)
}

/**
 * 动画播完后复位双方 fighter —— port PAL_BattleUpdateFighters 复位段(fight.c:940-1019)。
 *
 * player(fight.c:948-985):
 *   - 非 defending → pos = posOriginal;iColorShift = 0
 *   - hp==0:puppet>0 → 0(傀儡死后仍站立);否则 → 2(死)
 *   - hp>0:sleep!=0 || dying(<min(100,maxHP/5))→ 1(濒死/睡倒);defending → 3;否则 → 0
 * enemy(fight.c:991-1019):
 *   - pos = posOriginal;iColorShift = 0;currentFrame = undefined(idle 复位;轮播由渲染层时钟驱动)
 */
export function resetFightersAfterAction(state: BattleState, playerRoles: PlayerRoles): void {
  for (const p of state.players) {
    const role = playerRoles.roles[p.roleId]
    if (!p.defending && p.posOriginal) p.pos = { x: p.posOriginal.x, y: p.posOriginal.y }
    p.iColorShift = 0
    const hp = role?.hp ?? 0
    const maxHp = role?.maxHP ?? 0
    if (hp === 0) {
      // sdlpal fight.c:965-972:puppet(死后傀儡)→ 站立帧 0;否则死帧 2
      p.currentFrame = (p.status.puppet ?? 0) > 0 ? 0 : 2
    } else if ((p.status.sleep ?? 0) > 0 || hp < Math.min(100, Math.floor(maxHp / 5))) {
      p.currentFrame = 1 // 濒死 / 睡倒(PAL_IsPlayerDying fight.c:47-48 + sleep,fight.c:957-960)
    } else if (p.defending) {
      p.currentFrame = 3 // 防御
    } else {
      p.currentFrame = 0 // 站立
    }
  }

  for (const e of state.enemies) {
    if (e.posOriginal) e.pos = { x: e.posOriginal.x, y: e.posOriginal.y }
    e.iColorShift = 0
    // idle 复位 = **undefined**(非 0)→ 轮播由 draw-battle-sprites idle 时钟接管。
    //   置 0 是定义值,draw 的 `currentFrame !== undefined` 分支会冻结 idle(回归,fight.c:1008-1018)。
    e.currentFrame = undefined
  }
}
