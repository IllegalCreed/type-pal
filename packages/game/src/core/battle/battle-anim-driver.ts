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
 * sound 在本函数逐帧 emit;shake/screenWave 等视觉字段由 present 读取当前 frame。
 */
/**
 * 把一帧的**视觉字段**(fighters / overlay / overlays / summon)落到 state —— 不含 sound/damage/keepEffect
 * 等逻辑副作用。present 端 wall-clock 细分(`stepBattleAnimRender`)按真实时间选帧后只刷视觉(每 rAF),
 * 逻辑副作用仍由 applyAnimFrame 在 40ms tick 触发(确定性)。applyAnimFrame 复用本函数避免漂移。
 */
export function applyAnimFrameVisual(state: BattleState, frame: BattleAnimFrame): void {
  if (frame.fighters) {
    for (const d of frame.fighters) {
      const fighter = d.side === 'player' ? state.players[d.idx] : state.enemies[d.idx]
      if (!fighter) continue
      if (d.pos) fighter.pos = { x: d.pos.x, y: d.pos.y }
      if (d.currentFrame !== undefined) fighter.currentFrame = d.currentFrame
      if (d.iColorShift !== undefined) fighter.iColorShift = d.iColorShift
      if (d.side === 'player' && 'spriteNumOverride' in d) {
        const player = state.players[d.idx]
        if (player) {
          if (d.spriteNumOverride === null) delete player.spriteNumOverride
          else player.spriteNumOverride = d.spriteNumOverride
        }
      }
    }
  }
  // overlay / overlays 落到 battleAnim(present 取当前帧 effect / magic sprite);无则清空。
  //   - overlay(单数):物理攻击命中特效。
  //   - overlays(复数):D17 法术 sprite(AttackAll 三落点 / 单落点一条)。
  if (state.battleAnim) {
    state.battleAnim.overlay = frame.overlay
    state.battleAnim.overlays = frame.overlays
    state.battleAnim.summon = frame.summon // 召唤神演出帧(set → present 隐队员改画召唤神);无则清
  }
}

export function applyAnimFrame(state: BattleState, frame: BattleAnimFrame, bus: CommandBus): void {
  applyAnimFrameVisual(state, frame)

  // W4 keepEffect:本帧标记烙背景 → 把 overlays 的魔法精灵追加到 persistentBgBlits(跨帧持久,present 画在 bg 上)。
  //   对 sdlpal fight.c:2757-2762 PAL_RLEBlitToSurface(*b, lpBackground)。空 overlays 不烙。
  if (frame.keepEffect && frame.overlays && frame.overlays.length > 0) {
    state.persistentBgBlits ??= []
    for (const ov of frame.overlays) {
      state.persistentBgBlits.push({
        spriteChunk: ov.spriteChunk,
        frameIdx: ov.frameIdx,
        x: ov.x,
        y: ov.y,
      })
    }
  }

  if (frame.damageNum) {
    bus.emit({
      op: 'showDamageNum',
      target: frame.damageNum.target,
      value: frame.damageNum.value,
      color: frame.damageNum.color,
    })
  }

  // 物理群攻挥砍 i==0 帧遍历全敌弹各自数字(sdlpal PAL_BattleDisplayStatChange,fight.c:626-659/2209)。
  if (frame.damageNums) {
    for (const dn of frame.damageNums) {
      bus.emit({ op: 'showDamageNum', target: dn.target, value: dn.value, color: dn.color })
    }
  }

  // M6 帧同步 SFX —— 本帧 frame.sound>0 → 播。敌方物攻的 actionSound(接近,fight.c:5005)/
  //   callSound(命中,fight.c:5084)等散布在动画帧上,对照 sdlpal AUDIO_PlaySound 在各 PAL_BattleDelay
  //   之间逐帧触发(非动作起手一次性)。applyAnimFrame 每帧只调一次(battle-system 推进 idx++ 后),
  //   故每帧一次不重播。经 bus {op:'playSound'} → bootstrap 战斗 drain → audio.playSound。
  if (frame.sound && frame.sound > 0) {
    bus.emit({ op: 'playSound', soundId: frame.sound })
  }

  // 战斗单行文字帧同步 —— 逃跑失败应在 3 步失败动作后、frame=1 的 Delay(8) 期间显示。
  if (frame.battleMessage) {
    bus.emit({
      op: 'showBattleMessage',
      text: frame.battleMessage.text,
      durationMs: frame.battleMessage.durationMs,
      ...(frame.battleMessage.pos ? { pos: frame.battleMessage.pos } : {}),
    })
  }
}

/**
 * 启动一条动画时间线:set state.battleAnim(idx=0, frameElapsedMs=0)并立即应用 frame[0]。
 * frames 为空 → 不建时间线(no-op;调用方据此走即时推进)。
 *
 * @param pendingDamageNums 时间线**播完后**才 emit 的兜底伤害数字。攻击/召唤法术通常应优先
 *   用 frame.damageNums 挂在 PostMagic 第一帧;DefMagic / 投掷等没有 PostMagic 的链可用此参数。
 */
export function startBattleAnim(
  state: BattleState,
  frames: BattleAnimFrame[],
  bus: CommandBus,
  pendingDamageNums?: BattleAnimState['pendingDamageNums'],
  opts?: { afterComplete?: BattleAnimState['afterComplete'] },
): void {
  if (frames.length === 0) return
  state.battleAnim = {
    frames,
    idx: 0,
    frameElapsedMs: 0,
    overlay: undefined,
    pendingDamageNums,
    afterComplete: opts?.afterComplete,
  }
  applyAnimFrame(state, frames[0]!, bus)
}

/**
 * 推进 active 时间线一个 battle tick:elapsed 累加 dtMs,耗尽当前帧时长则逐帧前进 + applyAnimFrame
 * (durationMs 可为 0 → while 一次跨多帧)。tickPerformAction 行动驱动与 tickBattle 回合起手脚本
 * 动画 hold(0x9C 分裂散开等 selectAction 阶段起的时间线)共用,避免两份推进逻辑漂移。
 * @returns true = 时间线已播完(caller 负责 pendingDamageNums / resetFightersAfterAction / 清 battleAnim 等收尾)。
 */
export function advanceBattleAnimFrames(
  state: BattleState,
  bus: CommandBus,
  dtMs: number,
): boolean {
  const a = state.battleAnim
  if (!a) return false
  a.frameElapsedMs += dtMs
  while (a.idx < a.frames.length && a.frameElapsedMs >= (a.frames[a.idx]?.durationMs ?? 0)) {
    a.frameElapsedMs -= a.frames[a.idx]?.durationMs ?? 0
    a.idx++
    if (a.idx < a.frames.length) applyAnimFrame(state, a.frames[a.idx]!, bus)
  }
  return a.idx >= a.frames.length
}

/**
 * present 端 **wall-clock 视觉帧细分**(每 rAF 调,对齐 `stepSummonLoopRender`/`stepDeathFadeRender` 范式)。
 *
 * 战斗动画帧时长是 (speed+5)*10ms(法术效果,45/104 法术 speed=0=50ms)/ Delay(N)×40ms(物理)。40ms
 * 逻辑 tick 离散推进会让非 40ms 整数倍的帧抖成 80/40/40/40 拍频 —— user 反复报"施法慢"的根因(实测施法期
 * present 仅 25fps、rAF 120fps:画面只在 tick 刷)。本函数按真实时间算应显示帧 renderIdx,present 据此画
 * 法术 sprite / 精灵 / 抖屏,平滑到屏幕刷新率。
 *
 * 分工(同 summon-loop):逻辑 `idx`(advanceBattleAnimFrames,40ms tick)独占副作用(sound/damage)与
 * 完成判定 → 确定性不变(headless/单测不经 present → renderIdx 恒 undefined,纯 idx 路径);renderIdx 只领
 * 视觉、**不落后 idx、不回退**。
 *
 * 召唤特例:loop 帧(summon.loop)由 stepSummonLoopRender 驱召唤神逐帧、fade 帧(summon.fadeStep)由
 * applySummonFade 驱 crossfade —— 两者各有 wall-clock 专驱,本函数对其**早退**不双驱;召唤神攻击的二次
 * OffMagic 帧(summon 在场但无 loop/fadeStep)则照常细分(召唤神定格 lastFrame,只平滑特效)。
 *
 * @param nowMs present 调用处传入的 performance.now()(注入时钟,便于测试)。
 */
export function stepBattleAnimRender(state: BattleState, nowMs: number): void {
  const a = state.battleAnim
  // loop/fade 帧交专驱;无动画 / 空帧不处理。清锚点 → 离开特例段后重新对齐。
  if (!a || a.frames.length === 0 || a.summon?.loop != null || a.summon?.fadeStep != null) {
    if (a) {
      a.renderStartMs = undefined
      a.renderIdx = undefined
    }
    return
  }
  // 惰性锚点:now − 已播逻辑时长(Σdur[0..idx) + frameElapsedMs)→ renderIdx 从逻辑当前进度对齐起算。
  if (a.renderStartMs === undefined || a.renderIdx === undefined) {
    let logicElapsed = a.frameElapsedMs
    for (let i = 0; i < a.idx && i < a.frames.length; i++)
      logicElapsed += a.frames[i]!.durationMs ?? 0
    a.renderStartMs = nowMs - logicElapsed
    a.renderIdx = a.idx
  }
  // 从上次 renderIdx 前向扫到 wall-clock elapsed 所在帧(单调,O(前进帧数);末帧前停 → 完成归逻辑)。
  const elapsed = nowMs - a.renderStartMs
  let vIdx = a.renderIdx
  let acc = 0
  for (let i = 0; i < vIdx && i < a.frames.length; i++) acc += a.frames[i]!.durationMs ?? 0
  while (vIdx + 1 < a.frames.length && elapsed >= acc + (a.frames[vIdx]!.durationMs ?? 0)) {
    acc += a.frames[vIdx]!.durationMs ?? 0
    vIdx++
  }
  vIdx = Math.min(a.frames.length - 1, Math.max(vIdx, a.idx)) // 不落后逻辑、不越界
  a.renderIdx = vIdx
  applyAnimFrameVisual(state, a.frames[vIdx]!)
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
/**
 * 玩家复位帧值(PAL_BattleUpdateFighters 玩家分支的 wCurrentFrame 判定,fight.c:957-985)。
 * resetFightersAfterAction 与"链内复位帧"(敌法术收尾 UpdateFighters 等价帧)共用,防判定漂移。
 */
export function playerRestFrame(
  p: BattleState['players'][number],
  role: PlayerRoles['roles'][number] | undefined,
): number {
  const hp = role?.hp ?? 0
  const maxHp = role?.maxHP ?? 0
  if (hp === 0) {
    // sdlpal fight.c:965-972:puppet(死后傀儡)→ 站立帧 0;否则死帧 2
    return (p.status.puppet ?? 0) > 0 ? 0 : 2
  }
  if ((p.status.sleep ?? 0) > 0 || hp < Math.min(100, Math.floor(maxHp / 5))) {
    return 1 // 濒死 / 睡倒(PAL_IsPlayerDying fight.c:47-48 + sleep,fight.c:957-960)
  }
  return p.defending ? 3 : 0
}

export function resetFightersAfterAction(state: BattleState, playerRoles: PlayerRoles): void {
  for (const p of state.players) {
    const role = playerRoles.roles[p.roleId]
    if (!p.defending && p.posOriginal) p.pos = { x: p.posOriginal.x, y: p.posOriginal.y }
    p.iColorShift = 0
    p.currentFrame = playerRestFrame(p, role)
  }

  for (const e of state.enemies) {
    if (e.posOriginal) e.pos = { x: e.posOriginal.x, y: e.posOriginal.y }
    e.iColorShift = 0
    // idle 复位 = **undefined** → 渲染回落 per-enemy idleFrame(DM11)。
    e.currentFrame = undefined
    // DM11:行动/演出收尾后 idle 从 0 重起(C 中动作链直接改 wCurrentFrame,收尾复位;
    //   fight.c:1008-1018 的 idle 推进基于同一字段)——各敌相位随各自行动时点自然漂移。
    e.idleFrame = 0
    e.idleTick = Math.max(1, e.e.idleAnimSpeed)
  }
}
