/**
 * 主循环 wrapper(02 架构 + D13 + M3 T28)。
 *  - tickN(n, ctx):headless,跑 n 个逻辑 tick,供 e2e / record-replay 用。
 *  - startRafLoop(ctx):浏览器,rAF + accumulator 节流;按 gs.mode 切 fps
 *    (explore/event 10fps,battle 25fps),返回 cancel。
 *
 * setSceneContext 在 loop 启动前调用一次:ctx_singleton 在 loop 生命期内有效。
 * 不在每 tick 重设,避免和 EventSystem 装载的 cursor.commands 错位。
 *
 * T28 帧率切换设计:
 *   - 每个 raf 都按当前 gs.mode 决定 interval(累积 dt → accumulator)。
 *   - mode 中途切(explore → battle 或反向)时 accumulator 不清零;若累积过多
 *     (> 3 × interval)clamp 到 1 × interval,避免一下子 catch-up N tick。
 *   - tickN 仍是固定 step(不参与帧率),只跑逻辑用。
 */

import type { Command, InputSource, Tilemap } from '@type-pal/shared'
import { FRAME_MS_BATTLE, FRAME_MS_EXPLORE } from '@type-pal/shared'
import type { BusEntry, CommandBus } from '../core/command-bus.js'
import type { GameState } from '../core/game-state.js'
import { tickByMode } from '../core/mode.js'
import { setSceneContext } from '../core/scene-system.js'
import { initStateDump } from '../dev/state-dump.js'

export interface LoopContext {
  gs: GameState
  bus: CommandBus
  input: InputSource
  tilemap: Tilemap
  eventCommands: Command[]
  labelMap: Record<string, number>
  /** DM32:ticked=false 表示 fade-only present(palette/dither fade 进行中的补帧)——
   *  特效计数器(wave 累加/相位 index/shakeTime 自减)**不推进**,只用当前值扭曲。 */
  onPresent: (drained: BusEntry[], ticked: boolean) => void
  /** sdlpal `PlayerRoles.rgwWalkFrames[leaderRoleId]`(3 或 4),dump 计算 wFrame 用 */
  partyWalkFrames?: number
}

/**
 * **逻辑** tick interval —— battle 40ms / 其他 100ms。**fade 不再提速逻辑**。
 *
 * 旧设计:fade 进行中把 tick 提到 16ms(60fps)让 present 多采样平滑 fade。副作用:fade 期间
 * 走步 / 打字 / frame-wait(都是每 tick 推进的逻辑)被一起加速 6×(香兰报信 cutscene 瞬移+一口气根因)。
 * 现解耦(2026-05-30):逻辑固定 100/40ms;fade 的平滑由 startRafLoop 在 fade 进行中**每 raf 帧** present
 * 实现(present.ts 内按 wall-clock 步进 fade,duration time-based 不变)。
 */
export function logicIntervalMs(gs: GameState): number {
  return gs.mode === 'battle' ? FRAME_MS_BATTLE : FRAME_MS_EXPLORE
}

/** rAF 累积器状态(startRafLoop 持有,advanceRafFrame mutate)。 */
export interface RafLoopState {
  lastTickTime: number
  accumulator: number
}

/**
 * 单 raf 帧推进(从 startRafLoop 抽出便于单测,无需 mock rAF)。三不变量:
 *  ① 逻辑 interval = logicIntervalMs(battle 40 / 否则 100,fade 不提速)
 *  ② mode 切换 clamp:accumulator > 3×interval → 设为 interval(避免 explore→battle 一下 catch-up 多 tick)
 *  ③ present 门控:逻辑 tick 时 / fade(dither/palette)进行中才 present(否则跳过,避免空转重画)
 * 返回 {ticked, presented}。
 */
export function advanceRafFrame(
  state: RafLoopState,
  now: number,
  ctx: LoopContext,
  dump?: ReturnType<typeof initStateDump>,
): { ticked: boolean, presented: boolean } {
  const dt = now - state.lastTickTime
  state.lastTickTime = now
  state.accumulator += dt

  const interval = logicIntervalMs(ctx.gs)
  // DM30 修正(2026-06-12 user 报"战后 fadeout 卡键"):渐变清键的 C 真值边界是**函数级**的——
  //   清键(每步 ClearKeyState + dir=Unknown):PAL_SceneFade(0x93,palette.c:314-316)、
  //     PAL_PaletteFade 的 fUpdateScene 变体(0x80,palette.c:441-446)= 我们 waiting='scene-fade' 集合;
  //   不清键(纯色表 ramp,按键累积、按住的方向 fade 一结束立即生效,原版按住方向连穿门即此):
  //     PAL_FadeOut/FadeIn/ColorFade/FadeToRed(0x50/0x51/0x8C/0x4F/0x4E/战后&进场自动渐入)。
  //   旧条件 `paletteFadeState != null` 把清键泛化到全部渐变 → 战后 ~1.2s 吞键、按住方向须松开重按。
  //   世界冻结由 scene-system tickSceneInput/PreInput 的 paletteFadeState 门负责(忠实 PAL_FadeIn 阻塞);
  //   按住的方向键在 fade 完成的下一 tick 立即续走 = C 时序。已知近似:fade 窗口内的"点按"被逐 tick
  //   drain 丢弃(C 的 dwKeyPress 会缓存到 fade 后首帧消费;改输入消费模型收益不值,先记录)。
  if (ctx.gs.eventCursor?.waiting === 'scene-fade') ctx.input.suppressHeldForFade?.()
  let drained: BusEntry[] = []
  let ticked = false
  // DM31:C 真值(game.c:75-78 / battle.c:782-787)`PAL_DelayUntil(dwTime); dwTime = now + FRAME_TIME`
  //   —— 下一截止从**当前时刻**起算:慢帧只顺延、**永不补帧**,一次渲染恰一帧逻辑。旧 while 连跑
  //   (滞后 1~3×interval 时单 rAF 跑 2-3 tick 只 present 末态)→ 卡顿后走路瞬移/演出跳帧;
  //   accumulator 跨 mode 残留还会在 explore(100ms)→battle(40ms) 切换瞬间多跑 2 tick。
  //   改:每 rAF 至多 1 tick,tick 后清零滞后量(= C 顺延);<interval 的余量正常累积(高刷屏不变快)。
  if (state.accumulator >= interval) {
    const snap = ctx.input.nextSnapshot(ctx.gs.frameNum)
    tickByMode(ctx.gs, snap, ctx.bus)
    const d = ctx.bus.drain()
    if (d.length) drained = d
    if (dump?.enabled) dump.push(ctx.gs, ctx.partyWalkFrames ?? 3)
    ticked = true
    // DM31 修正(2026-06-13 user 报"死亡淡出比原版长"):旧版 `accumulator = 0` 把 tick 时
    //   [interval, interval+rafDt) 的**溢出量也清掉**,与本函数注释"<interval 的余量正常累积"自相矛盾。
    //   battle interval=40ms 不是 60Hz 帧时(16.667ms)整数倍 → 每 tick 实际等 3 帧=50ms → 全战斗动画
    //   (含 PAL_BattleFadeScene 死亡淡出)在 60Hz 慢 25%(30Hz 慢 68%)。改:结转溢出余量 → 节奏回到
    //   忠实 25fps(各刷新率均 ~40ms/tick avg)。DM31 的"永不补帧"由下一行 clamp 保留:残留 > 1 个
    //   interval 的**真积压**(lag spike,如卡顿后 dt≫interval)才丢弃 → 仍至多 1 tick/rAF、不连追。
    state.accumulator -= interval
    if (state.accumulator > interval) state.accumulator = 0
  }

  let presented = false
  // ③ 门控:逻辑 tick 时 / 各类 fade 进行中才 present。battleFade(D17 死亡淡出)同 palette/scene fade ——
  //   present 每 rAF 走 stepDeathFadeRender 按 wall-clock 细分渲染步(62.5fps),非 tick 帧也需放行,
  //   否则淡出只在 25fps 逻辑 tick 刷新 → 顿挫。
  if (
    ticked ||
    ctx.gs.fadeState != null ||
    ctx.gs.paletteFadeState != null ||
    ctx.gs.battleState?.battleFade != null
  ) {
    ctx.onPresent(drained, ticked)
    presented = true
  }
  return { ticked, presented }
}

function singleTick(ctx: LoopContext, dump?: ReturnType<typeof initStateDump>): void {
  const snap = ctx.input.nextSnapshot(ctx.gs.frameNum)
  tickByMode(ctx.gs, snap, ctx.bus)
  const drained = ctx.bus.drain()
  ctx.onPresent(drained, true)
  // 对照 sdlpal dump-frames.patch hook 位置:tickByMode 后(等同 PAL_StartFrame 末尾)
  if (dump?.enabled) dump.push(ctx.gs, ctx.partyWalkFrames ?? 3)
}

function applySceneContext(ctx: LoopContext): void {
  setSceneContext({
    tilemap: ctx.tilemap,
    eventCommands: ctx.eventCommands,
    labelMap: ctx.labelMap,
  })
}

export function tickN(n: number, ctx: LoopContext): void {
  applySceneContext(ctx)
  for (let i = 0; i < n; i++) singleTick(ctx)
}

export function startRafLoop(ctx: LoopContext): () => void {
  applySceneContext(ctx)
  // state-dump 仅 DEV:生产构建 `import.meta.env.DEV`=false → initStateDump 不被引用,
  // 整个 dev/state-dump.js 模块被 tree-shake 掉(与 bootstrap 守卫 setupDevPanel 同模式;
  // 那里注释说明用 cast 避免依赖 vite/client triple-slash 类型)。dump 为 undefined 时
  // 下游 advanceRafFrame/singleTick 的 `dump?.enabled` 已空安全。e2e 走 vite dev(DEV=true)不受影响。
  const dump = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV
    ? initStateDump()
    : undefined
  const state: RafLoopState = { lastTickTime: performance.now(), accumulator: 0 }
  let raf = 0
  const loop = (now: number): void => {
    advanceRafFrame(state, now, ctx, dump) // 累积/tick/clamp/present 见 advanceRafFrame 三不变量
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}
