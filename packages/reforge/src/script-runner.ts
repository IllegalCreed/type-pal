/**
 * 剧情脚本解释器(M3a)—— 设计:script-model-m3-design.md §4。
 *
 * 原生 async 单解释器:每命令 `await`;等待 = host driver 的 Promise(对话确认/淡入淡出/
 * 计时),AbortSignal 贯穿 —— 切场景/读档 abort 即全树取消,无孤儿态、无 waiting 枚举
 * (一阶段三类坑的架构性消解)。host 由 main.ts 注入(渲染/输入/存档的具体实现),
 * 本文件零 DOM 依赖,可用 fake host 单测。
 */

import type {
  AssetId,
  Command,
  DialogueCue,
  Facing,
  GridPos,
  RuntimeScriptBinding,
  SceneReveal,
  SceneSpawn,
  SceneTransitionProfile,
  ScriptCondition,
  ScriptRef,
  ScriptStage,
  SpriteActionBinding,
  WalkSpeed,
  WorldScriptState,
} from '@type-pal/content'
import { applyStageNext, stageIndexFor } from '@type-pal/content'
import { expectDefined } from './defined.js'
import type { ResolvedScript, ScriptResolver } from './script-chunk-store.js'

export type ScriptBinding = RuntimeScriptBinding

/** 命令的副作用出口 —— main.ts(或测试 fake)实现。所有异步项须响应 signal 取消。 */
export interface ScriptHost {
  dialog(cue: DialogueCue, signal?: AbortSignal): Promise<void>
  clearDialog(): void
  /** 0x99 当前场景即时换底图；host 原子提交运行时 map 与当前场景 mapOverride。 */
  reloadMap?(mapId: string, signal?: AbortSignal): Promise<void>
  /** 0xA0 游戏通关退出:回标题屏(?menu;未存进度弃,同系统菜单 quit)。 */
  quitToTitle?(videos?: readonly AssetId[], signal?: AbortSignal): void | Promise<void>
  fade(dir: 'in' | 'out', ms: number, color?: 'black' | 'red', signal?: AbortSignal): Promise<void>
  holdScreen?(color: 'black', token: string, signal?: AbortSignal): Promise<void>
  revealScreen?(token: string, signal?: AbortSignal): Promise<void>
  /** 0x73 RGBA 逐像素渐变；host 持有帧快照与生命周期。 */
  ditherScreen(ms: number, signal?: AbortSignal): Promise<void>
  /** scene onEnter entry 的显式提交边界；普通脚本不得调用。 */
  revealSceneEntry?(reveal: SceneReveal, signal?: AbortSignal): Promise<void>
  /** B8:实体向玩家追一步(auto 循环内 = 持续追逐;撞上玩家由 host 触发 touch)。 */
  chaseStep(
    entityId: string,
    range: number,
    speed: number,
    floating: boolean,
    signal?: AbortSignal,
  ): Promise<void>
  /** B8:实体消失 seconds 秒后重现(临时态)。 */
  vanishEntity(entityId: string, seconds: number): void
  /** B8:读最近存档(无档 = 重开)。 */
  loadLastSave(signal?: AbortSignal): Promise<void>
  /** B8:战败流程(渐红 + 文案 + 读最近档)。 */
  gameOver(signal?: AbortSignal): Promise<void>
  wait(ms: number, signal?: AbortSignal): Promise<void>
  teleportParty(pos: GridPos, facing?: Facing): void
  loadScene(
    scene: string,
    spawn: SceneSpawn,
    signal?: AbortSignal,
    transition?: SceneTransitionProfile,
  ): Promise<void>
  /**
   * 0x15:朝向 + 脚本姿势帧。gesture 缺省 = 清姿势(站立);>0 = 姿势帧
   * (渲染 = dir*framesPerDir + gesture,走路/传送时清)。member 0 = 队长。
   */
  setPartyFacing(facing: Facing, gesture?: number, member?: number): void
  /** 0x65:换角色大世界精灵(异步:精灵可能需加载)。持续到下一次显式切换。 */
  setActorSprite(actor: string, sprite: string, signal?: AbortSignal): Promise<void>
  /** 0x1A:持久改角色形象(写 CharacterInstance.appearance,随存档;成年灵儿)。缺 = 该 host 不支持。 */
  setActorAppearance?(
    actor: string,
    patch: { spriteId?: string; portrait?: AssetId; battleSprite?: string },
    signal?: AbortSignal,
  ): Promise<void>
  /** 战斗演出:敌逃离战场(choreography 专用;大世界 host 打日志跳过)。 */
  fleeBattle(): void
  setEntityState(entity: string, state: number): void
  setEntityFacing(entity: string, facing: Facing): void
  setEntityFrame(entity: string, frame: number): void
  /** 播放实体当前精灵的预制动作；单次 Promise 在动作完成/被替换/停止时兑现。 */
  playEntityAction(
    entity: string,
    binding: SpriteActionBinding,
    signal?: AbortSignal,
  ): Promise<void>
  /** 清除剧情覆盖动作；reset=true 令页默认动作从自己的 startAtMs 重启。 */
  stopEntityAction(entity: string, reset: boolean): void
  giveItem(itemId: string, count: number, signal?: AbortSignal): void | Promise<void>
  loseItem(itemId: string, count: number): void
  giveMoney(delta: number): void
  playSound(asset: AssetId): void
  playMusic(asset: AssetId): void
  stopMusic(): void
  /** W6 氛围(昼夜):切全局氛围(全帧乘法滤镜;原版 0x53/0x54 全局调色板 flag)。 */
  setAmbience(ambience: string): void
  /** E6b 显式定位权威:接管/归还(缺省全部)。 */
  takeEntity(entityId: string): void
  releaseEntity(entityId?: string): void
  /** E7 载具:party 挂上/下载具;ride = 骑行走位(阻塞)。 */
  mountParty(entityId: string, dx: number, dy: number): void
  unmountParty(): void
  ride(entityId: string, to: GridPos, speed: WalkSpeed, signal?: AbortSignal): Promise<void>
  /** C7 队伍变更(D22 reserve):members = 角色模板 id 有序表。 */
  setParty(members: readonly string[], signal?: AbortSignal): Promise<void>
  /** 0x98:全部 SpriteDef/资产预载成功后 runner 才原子提交 followers。 */
  setFollowers(sprites: readonly string[], signal?: AbortSignal): Promise<void>
  // ── M3b 走位 / 演出(阻塞项返回 Promise,须响应 signal)──
  moveEntity(entity: string, to: GridPos, speed: WalkSpeed, signal?: AbortSignal): Promise<void>
  stepEntity(entity: string, dir: Facing): void
  animEntity(entity: string): void
  nudgeEntity(entity: string, dx: number, dy: number): void
  moveParty(to: GridPos, speed: WalkSpeed, signal?: AbortSignal): Promise<void>
  nudgeParty(dx: number, dy: number, layer: number): void
  // ── M3c 相机 / 页切换 ──
  cameraPan(dx: number, dy: number, frames: number, signal?: AbortSignal): Promise<void>
  cameraSnap(to?: GridPos): void
  setEntityAuto(entity: string, script: ScriptBinding): void
  setEntityTrigger(entity: string, script: ScriptBinding): void
  setEntityTriggerMode(
    entity: string,
    on: 'interact' | 'touch' | undefined,
    range: number | undefined,
  ): void
  // ── M3b 战斗桩 / 商店 / 确认 ──
  startBattle(
    team: number,
    opts?: {
      auto?: boolean
      boss?: boolean
      fieldId?: number
      music?: AssetId | null
      /** 遭遇专属战斗演出(startBattle.choreography;对话绑遭遇而非敌种)。 */
      choreography?: import('@type-pal/content').BattleChoreography[]
    },
    signal?: AbortSignal,
  ): Promise<'win' | 'lose' | 'flee'>
  /** 传送出口(0x38):跑当前场景 onTeleport;成功返回 true,场景无此槽返回 false(调用方走 onFail)。 */
  teleportOut(signal?: AbortSignal): Promise<boolean>
  /** 过场编排:按稳定 AssetId 播视频，阻塞至播完或跳过。 */
  playVideo(asset: AssetId, signal?: AbortSignal): Promise<void>
  /** 过场编排:按稳定 AssetId 播真彩帧动画，阻塞至播完或跳过。 */
  playFrameAnimation(
    asset: AssetId,
    opts?: { frameRate?: number; startFrame?: number; endFrame?: number },
    signal?: AbortSignal,
  ): Promise<void>
  /** 商店/当铺(阻塞脚本至关店;店不存在须立即 resolve 防卡死)。 */
  openShop(shop: number, mode: 'buy' | 'sell', signal?: AbortSignal): Promise<void>
  confirm(signal?: AbortSignal): Promise<boolean>
  // ── 条件查询(hasItem/hasMoney/inParty 的数据源)──
  query: {
    hasItem(itemId: string, atLeast: number): boolean
    ownsItem(itemId: string, atLeast: number): boolean
    money(): number
    inParty(actorId: string): boolean
    /** 0x74 洪大夫治伤门:全队活人 HP 均满(满则不触发治疗对白/加血)。 */
    allFullHp(): boolean
    /** 0x86 将军冢玉佛珠门:全队装备该物(itemId)件数 ≥ atLeast。 */
    itemEquipped(itemId: string, atLeast: number): boolean
    /** 0x83:实体 id 是否属于当前场景(取代原版 EventObject 下标区间判定)。 */
    entityInScene(id: string): boolean
    facingEntity(id: string, range: number): boolean
    /** 当前场景 id(0x99 当前场景换图的 override 键;缺省实现可返回空串 = 不落 override)。 */
    sceneId?(): string
  }
  /** 宿主能力或内容异常上报(dev toast + console;生产静默日志)。 */
  report(msg: string): void
  // ── clean 命令的可选宿主能力;部分 host(choreo/测试)不需要 ──
  /** 0x35 震屏(script.c:1521):timeFrames 帧(40ms/帧)内画面上下 ±level;0 = 立即关。 */
  shakeScreen?(timeFrames: number, level: number): void
  /** 0x80 昼夜切换(script.c:2381):world.ambience day↔night 翻转 + fadeMs 渐变
   *  (原版 PaletteFade 真值:更新场景 3200ms / 立即模式 800ms,一阶段 OP_PALETTE_FADE)。 */
  toggleDayNight?(fadeMs: number): void
  /** 0x1D 全队增血蓝(script.c:923 PAL_IncreaseHPMP(role, op1, op1)):HP/MP **同加** amount
   *  (op2 忽略,sdlpal/一阶段同);仅活人、clamp [0,max]。负数 = 扣(温泉/陷阱两用)。 */
  increaseHpMp?(amount: number, pools: 'hp' | 'mp' | 'both'): void
  /** 0x22 全队复活(script.c:1052):仅死者;HP = maxHP×tenths/10 + 解重毒(CurePoisonByLevel(3)
   *  ≙ severe)+ 清临时状态(遍历 RemovePlayerStatus ≙ extraStatuses 清空)。 */
  revivePartyAll?(tenths: number): void
  /** 0x55 学仙术(script.c:1816 PAL_AddMagic):roleIdx = 原版角色号(0李逍遥/1赵灵儿/2林月如/
   *  3巫后/4阿奴/5盖罗娇);已会不重复。 */
  learnSkill?(roleIdx: number, skillId: string): void
  /** 0x13 实体绝对定位(script.c:716):持久写 world.script.entityPos + 本场景实体活体生效
   *  (跨场景定位常见,进场时由 applyWorldToScene 重放)。 */
  setEntityPos?(id: string, pos: { col: number; row: number }): void
  /** 0x12 相对队伍摆位:运行时把实体摆到队伍格坐标 + (dcol,drow)偏移处。 */
  setEntityPosRelParty?(id: string, dcol: number, drow: number): void
  /** 0x6F 条件同步的源状态读取:脚本覆写优先,否则活体实体推导(隐 0 / 可见 1 / 挡路 2);
   *  不在本场景且无覆写 → undefined。 */
  getEntityState?(id: string): number | undefined
  /** 0x23 卸装(script.c:1104):roleIdx = 原版角色号;slot = 槽序(0头/1披/2身/3武/4脚/5佩)
   *  或 'all' 全卸;卸下物退回背包。 */
  unequipRole?(roleIdx: number, slot: number | 'all'): void
}

/** 条件求值(chance 用注入的 random,可测)。 */
export function evalCondition(
  cond: ScriptCondition,
  world: WorldScriptState,
  query: ScriptHost['query'],
  random: () => number = Math.random,
): boolean {
  switch (cond.kind) {
    case 'flag':
      return (world.flags[cond.flag] ?? false) === cond.is
    case 'var': {
      const v = world.vars[cond.var] ?? 0
      switch (cond.op) {
        case '==':
          return v === cond.value
        case '!=':
          return v !== cond.value
        case '>=':
          return v >= cond.value
        case '<=':
          return v <= cond.value
        case '>':
          return v > cond.value
        case '<':
          return v < cond.value
      }
      return false
    }
    case 'currentScene': {
      const scene = query.sceneId?.()
      if (!scene) throw new Error('currentScene 条件缺当前场景查询')
      return scene === cond.scene
    }
    case 'entityState':
      return (world.entityState[cond.entity] ?? Number.NaN) === cond.is
    case 'entityInScene':
      return query.entityInScene(cond.entity)
    case 'facingEntity':
      return query.facingEntity(cond.entity, cond.range ?? 0)
    case 'chance':
      return random() * 100 < cond.percent
    case 'hasItem':
      return query.hasItem(cond.itemId, cond.atLeast ?? 1)
    case 'ownsItem':
      return query.ownsItem(cond.itemId, cond.atLeast ?? 1)
    case 'itemEquipped':
      return query.itemEquipped(cond.itemId, cond.atLeast ?? 1)
    case 'allFullHp':
      return query.allFullHp()
    case 'hasMoney':
      return query.money() >= cond.atLeast
    case 'inParty':
      return query.inParty(cond.actorId)
    case 'all':
      return cond.of.every((c) => evalCondition(c, world, query, random))
    case 'any':
      return cond.of.some((c) => evalCondition(c, world, query, random))
    case 'not':
      return !evalCondition(cond.cond, world, query, random)
  }
}

/** 取消检查:abort 后立刻停(await 间隙内)。 */
function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('script aborted', 'AbortError')
}

/** stopScript 哨兵:跳转臂终止整个脚本本次运行(从任意嵌套臂穿透到 runStages 收口)。 */
class ScriptStopped extends Error {
  constructor() {
    super('script stopped by stopScript')
  }
}

class ScriptJump extends Error {
  constructor(
    readonly ref: ScriptRef,
    readonly selfId: string | undefined,
  ) {
    super(`jumpScript -> ${ref.chunk}:${ref.id}`)
  }
}

/** onStep 上报:path = 嵌套下标链(段/命令下标 + 分支臂段名),编辑器预览高亮用。 */
export interface StepEvent {
  path: readonly (number | string)[]
  cmd: Command
}

export interface RunStagesOptions {
  /** 仅 scene onEnter 入口为 true；其他上下文遇到 entry 立即拒绝。 */
  allowSceneEntry?: boolean
}

export class ScriptRunner {
  private static readonly MAX_CALL_DEPTH = 128
  private callDepth = 0
  /** 当前是否有脚本在跑(main.ts 用于冻结探索输入 + 触发防重入)。 */
  running = false
  /**
   * 步调(ms):>0 时每条命令后 wait 一拍 —— 原版 autoScript 一帧执行一条 op 的节拍还原
   * (一阶段 tickAutoScripts 同语义;不设则触发/onEnter 脚本全速直跑,阻塞点自带节奏)。
   */
  paceMs = 0
  /** 触发者/auto 宿主实体 id(chasePlayer/vanishEntity 的 self 语义;onEnter 等无宿主 = undefined)。 */
  selfId?: string
  /** 演出预览(编辑器):每条命令执行前上报路径。游戏侧不设,零开销。 */
  onStep?: (ev: StepEvent) => void
  /** 演出预览(编辑器):单步门 —— 设置后每条命令执行前 await(实现方自行响应 abort)。 */
  gate?: () => Promise<void>

  constructor(
    private readonly host: ScriptHost,
    private readonly world: WorldScriptState,
    private readonly signal: AbortSignal,
    private readonly random: () => number = Math.random,
    private readonly resolver?: ScriptResolver,
  ) {}

  private async runBody(
    body: readonly Command[],
    path: readonly (number | string)[],
  ): Promise<void> {
    for (let i = 0; i < body.length; i++) {
      const cmd = expectDefined(body[i])
      throwIfAborted(this.signal)
      if (this.gate) {
        await this.gate()
        throwIfAborted(this.signal)
      }
      const cur = [...path, i]
      this.onStep?.({ path: cur, cmd })
      await this.exec(cmd, cur)
      throwIfAborted(this.signal)
      if (this.paceMs > 0) {
        await this.host.wait(this.paceMs, this.signal)
        throwIfAborted(this.signal)
      }
    }
  }

  /** 每次尾转移至少让出一个宏任务，纯同步 jump 环也不能占满主线程。 */
  private async yieldForJump(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const done = (): void => {
        this.signal.removeEventListener('abort', abort)
        resolve()
      }
      const abort = (): void => {
        clearTimeout(timer)
        reject(new DOMException('script aborted', 'AbortError'))
      }
      const timer = setTimeout(done, 0)
      this.signal.addEventListener('abort', abort, { once: true })
      if (this.signal.aborted) abort()
    })
  }

  private requireResolver(ref: ScriptRef): ScriptResolver {
    if (!this.resolver)
      throw new Error(`ScriptRunner: 无 resolver，无法解析 ${ref.chunk}:${ref.id}`)
    return this.resolver
  }

  private async runLoop(
    body: readonly Command[],
    path: readonly (number | string)[],
    initialLease?: ResolvedScript,
  ): Promise<void> {
    let currentBody = body
    let currentPath = path
    let lease = initialLease
    try {
      while (true) {
        try {
          await this.runBody(currentBody, currentPath)
          return
        } catch (err) {
          if (!(err instanceof ScriptJump)) throw err
          lease?.release()
          lease = undefined
          await this.yieldForJump()
          throwIfAborted(this.signal)
          this.selfId = err.selfId
          lease = await this.requireResolver(err.ref).resolve(err.ref, this.signal)
          currentBody = lease.body
          currentPath = [...path, `jump:${lease.ref.id}`]
        }
      }
    } finally {
      lease?.release()
    }
  }

  /** 顺序执行一段命令体。path = 本段在脚本树中的位置前缀(预览高亮;缺省根)。 */
  async run(body: readonly Command[], path: readonly (number | string)[] = []): Promise<void> {
    const previousSelf = this.selfId
    try {
      await this.runLoop(body, path)
    } finally {
      this.selfId = previousSelf
    }
  }

  private async callScript(
    ref: ScriptRef,
    selfId: string | undefined,
    path: readonly (number | string)[],
  ): Promise<void> {
    if (this.callDepth >= ScriptRunner.MAX_CALL_DEPTH)
      throw new Error(
        `ScriptRunner: callScript 调用深度超过 ${ScriptRunner.MAX_CALL_DEPTH}(目标 ${ref.chunk}:${ref.id})`,
      )
    const previousSelf = this.selfId
    const lease = await this.requireResolver(ref).resolve(ref, this.signal)
    this.callDepth++
    this.selfId = selfId
    try {
      await this.runLoop(lease.body, path, lease)
    } catch (err) {
      // 0 号 END 在真实 call 边内只结束 callee；caller 从调用点继续。
      if (!(err instanceof ScriptStopped)) throw err
    } finally {
      this.callDepth--
      this.selfId = previousSelf
    }
  }

  /**
   * 跑触发脚本:按 world.entityStage 选段 → 跑段体 → 按 next 转移阶段。
   * key = 实体 id(触发)或 `s:<sceneId>`(onEnter)。
   */
  async runStages(
    key: string,
    stages: readonly ScriptStage[],
    options: RunStagesOptions = {},
  ): Promise<void> {
    const idx = stageIndexFor(this.world, key, stages as ScriptStage[])
    const stage = stages[idx]
    if (!stage) return
    this.running = true
    try {
      if (stage.entry) {
        if (!options.allowSceneEntry)
          throw new Error(`ScriptRunner: ${key} 非 scene onEnter，禁止执行 stage.entry`)
        if (!this.host.revealSceneEntry)
          throw new Error(`ScriptRunner: ${key} 的宿主未实现 revealSceneEntry`)
        await this.run(stage.entry.prepare, [idx, 'entry', 'prepare'])
        throwIfAborted(this.signal)
        await this.host.revealSceneEntry(stage.entry.reveal, this.signal)
        throwIfAborted(this.signal)
      }
      await this.run(stage.body, [idx])
      throwIfAborted(this.signal)
      applyStageNext(this.world, key, idx, stage.next)
    } catch (err) {
      // 跳转臂终止(stopScript):本次运行干净结束,**阶段不转移**(原版命中跳 0 号 END 退出,
      // 下次触发重掷;auto 循环下拍重跑 = 原版 auto 侧"原地不动")。其余异常原样上抛。
      if (!(err instanceof ScriptStopped)) throw err
    } finally {
      this.running = false
    }
  }

  private async exec(cmd: Command, path: readonly (number | string)[] = []): Promise<void> {
    const h = this.host
    switch (cmd.kind) {
      case 'dialog':
        return h.dialog(cmd.cue, this.signal)
      case 'clearDialog':
        return h.clearDialog()
      case 'fade':
        return h.fade(cmd.dir, cmd.ms ?? 300, cmd.color, this.signal)
      case 'holdScreen':
        if (!h.holdScreen) throw new Error('ScriptRunner: 宿主未实现 holdScreen')
        return h.holdScreen(cmd.color, cmd.token, this.signal)
      case 'revealScreen':
        if (!h.revealScreen) throw new Error('ScriptRunner: 宿主未实现 revealScreen')
        return h.revealScreen(cmd.token, this.signal)
      case 'ditherScreen':
        return h.ditherScreen(cmd.ms ?? 720, this.signal)
      case 'chasePlayer':
        return h.chaseStep(
          this.selfId ?? '',
          cmd.range ?? 8,
          cmd.speed ?? 4,
          cmd.floating ?? false,
          this.signal,
        )
      case 'vanishEntity':
        return h.vanishEntity(cmd.entity ?? this.selfId ?? '', cmd.seconds ?? 2)
      case 'loadLastSave':
        return h.loadLastSave(this.signal)
      case 'gameOver':
        return h.gameOver(this.signal)
      case 'wait':
        return h.wait(cmd.ms, this.signal)
      case 'teleportParty':
        return h.teleportParty(cmd.pos, cmd.facing)
      case 'loadScene':
        {
          const spawn = {
            ...(cmd.entryId !== undefined ? { entryId: cmd.entryId } : {}),
            ...(cmd.pos !== undefined ? { pos: cmd.pos } : {}),
            ...(cmd.facing !== undefined ? { facing: cmd.facing } : {}),
          } as SceneSpawn
          return cmd.transition === undefined
            ? h.loadScene(cmd.scene, spawn, this.signal)
            : h.loadScene(cmd.scene, spawn, this.signal, cmd.transition)
        }
      case 'setPartyFacing':
        return h.setPartyFacing(cmd.facing, cmd.gesture, cmd.member)
      case 'setActorSprite':
        return h.setActorSprite(cmd.actor, cmd.sprite, this.signal)
      case 'setActorAppearance':
        return h.setActorAppearance?.(
          cmd.actor,
          {
            ...(cmd.spriteId !== undefined ? { spriteId: cmd.spriteId } : {}),
            ...(cmd.portrait !== undefined ? { portrait: cmd.portrait } : {}),
            ...(cmd.battleSprite !== undefined ? { battleSprite: cmd.battleSprite } : {}),
          },
          this.signal,
        )
      case 'fleeBattle':
        return h.fleeBattle()
      case 'setEntityState':
        this.world.entityState[cmd.entity] = cmd.state
        return h.setEntityState(cmd.entity, cmd.state)
      case 'setMultiEntityState': {
        // 0x9A 批量:区间实体全设同 state;写 world 持久 + 通知宿主重放一次(main 整场 applyWorldToScene)
        for (const e of cmd.entities) this.world.entityState[e] = cmd.state
        if (cmd.entities[0]) return h.setEntityState(cmd.entities[0], cmd.state)
        return
      }
      // ── 原版高频 op 的 clean 语义命令 ──
      case 'setEntityPos': {
        // 0x13 实体绝对定位:持久写 entityPos + 活体生效(host)
        this.world.entityPos ??= {}
        this.world.entityPos[cmd.entity] = {
          col: cmd.pos.col,
          row: cmd.pos.row,
          height: cmd.pos.height ?? 0,
        }
        return h.setEntityPos?.(cmd.entity, cmd.pos)
      }
      case 'setEntityPosRelParty':
        // 0x12:绝对格 = 运行时队伍格 + 偏移,由 host 计算(runner 无队伍坐标)
        return h.setEntityPosRelParty?.(cmd.entity, cmd.dcol, cmd.drow)
      case 'shakeScreen':
        h.shakeScreen?.(cmd.frames, cmd.level)
        return
      case 'setScreenWave':
        this.world.vars['sys:screenWave'] = cmd.level
        this.world.vars['sys:waveProgression'] = cmd.progression
        return
      case 'setEntityLayer':
        this.world.entityLayer ??= {}
        this.world.entityLayer[cmd.entity] = cmd.layer
        return
      case 'increaseHpMp':
        h.increaseHpMp?.(cmd.delta, cmd.pools ?? 'both')
        return
      case 'revivePartyAll':
        h.revivePartyAll?.(cmd.tenths)
        return
      case 'learnSkill':
        h.learnSkill?.(cmd.role, cmd.skill)
        return
      case 'unequip':
        h.unequipRole?.(cmd.role, cmd.slot)
        return
      case 'toggleDayNight':
        h.toggleDayNight?.(cmd.ms)
        return
      case 'setFollowers': {
        const sprites = [...cmd.sprites]
        await h.setFollowers(sprites, this.signal)
        throwIfAborted(this.signal)
        this.world.followers = sprites.length ? sprites : undefined
        return
      }
      case 'setSceneMapOverride':
        if (cmd.scene === undefined) {
          const cur = h.query.sceneId?.()
          if (cur) {
            if (h.reloadMap) {
              await h.reloadMap(cmd.mapId, this.signal)
              throwIfAborted(this.signal)
            } else {
              this.world.mapOverride ??= {}
              this.world.mapOverride[cur] = cmd.mapId
            }
          }
          return
        }
        this.world.mapOverride ??= {}
        this.world.mapOverride[cmd.scene] = cmd.mapId
        return
      case 'halveMoney': {
        const money = h.query.money()
        h.giveMoney(-(money - Math.floor(money / 2)))
        return
      }
      case 'setEntityFacing':
        return h.setEntityFacing(cmd.entity, cmd.facing)
      case 'setEntityFrame':
        return h.setEntityFrame(cmd.entity, cmd.frame)
      case 'playEntityAction': {
        const pending = h.playEntityAction(
          cmd.entity,
          {
            sprite: cmd.sprite,
            action: cmd.action,
            loop: cmd.loop,
            ...(cmd.startAtMs !== undefined ? { startAtMs: cmd.startAtMs } : {}),
          },
          this.signal,
        )
        if (cmd.wait ?? !cmd.loop) return pending
        void pending.catch((error: unknown) => {
          if (this.signal.aborted || (error instanceof DOMException && error.name === 'AbortError'))
            return
          h.report(
            `playEntityAction(${cmd.entity},${cmd.sprite},${cmd.action}) 后台播放失败: ${error instanceof Error ? error.message : String(error)}`,
          )
        })
        return
      }
      case 'stopEntityAction':
        return h.stopEntityAction(cmd.entity, cmd.reset)
      case 'giveItem':
        return h.giveItem(cmd.itemId, cmd.count ?? 1, this.signal)
      case 'loseItem':
        return h.loseItem(cmd.itemId, cmd.count ?? 1)
      case 'giveMoney':
        return h.giveMoney(cmd.delta)
      case 'setFlag':
        this.world.flags[cmd.flag] = cmd.value
        return
      case 'setVar':
        this.world.vars[cmd.var] = cmd.value
        return
      case 'addVar':
        this.world.vars[cmd.var] = (this.world.vars[cmd.var] ?? 0) + cmd.delta
        return
      case 'playSound':
        return h.playSound(cmd.asset)
      case 'playMusic':
        return h.playMusic(cmd.asset)
      case 'stopMusic':
        return h.stopMusic()
      case 'setAmbience':
        return h.setAmbience(cmd.ambience)
      case 'takeEntity':
        return h.takeEntity(cmd.entity)
      case 'releaseEntity':
        return h.releaseEntity(cmd.entity)
      case 'mountParty':
        return h.mountParty(cmd.entity, cmd.dx ?? 0, cmd.dy ?? 0)
      case 'unmountParty':
        return h.unmountParty()
      case 'ride':
        return h.ride(cmd.entity, cmd.to, cmd.speed, this.signal)
      case 'setParty':
        await h.setParty([...cmd.members], this.signal)
        throwIfAborted(this.signal)
        return
      case 'stopScript':
        throw new ScriptStopped() // 跳转臂终止(见类注;runStages 收口)
      case 'quitToTitle':
        return h.quitToTitle?.(cmd.videos, this.signal) // 0xA0 通关退出 → 回标题屏

      case 'branch':
        return evalCondition(cmd.cond, this.world, h.query, this.random)
          ? this.runBody(cmd.then, [...path, 'then'])
          : cmd.else
            ? this.runBody(cmd.else, [...path, 'else'])
            : undefined
      case 'moveEntity':
        return h.moveEntity(cmd.entity, cmd.to, cmd.speed, this.signal)
      case 'stepEntity':
        return h.stepEntity(cmd.entity, cmd.dir)
      case 'animEntity':
        return h.animEntity(cmd.entity)
      case 'nudgeEntity':
        return h.nudgeEntity(cmd.entity, cmd.dx, cmd.dy)
      case 'moveParty':
        return h.moveParty(cmd.to, cmd.speed, this.signal)
      case 'nudgeParty':
        return h.nudgeParty(cmd.dx, cmd.dy, cmd.layer ?? 0)
      case 'startBattle': {
        const r = await h.startBattle(
          cmd.team,
          {
            auto: cmd.auto,
            boss: cmd.boss,
            fieldId: cmd.fieldId,
            ...(cmd.music !== undefined ? { music: cmd.music } : {}),
            ...(cmd.choreography ? { choreography: cmd.choreography } : {}),
          },
          this.signal,
        )
        throwIfAborted(this.signal)
        if (r === 'lose' && cmd.onLose) return this.runBody(cmd.onLose, [...path, 'onLose'])
        if (r === 'flee' && cmd.onFlee) return this.runBody(cmd.onFlee, [...path, 'onFlee'])
        return
      }
      case 'teleportOut': {
        const ok = await h.teleportOut(this.signal)
        throwIfAborted(this.signal)
        if (!ok && cmd.onFail) return this.runBody(cmd.onFail, [...path, 'onFail'])
        return
      }
      case 'playVideo':
        return h.playVideo(cmd.asset, this.signal)
      case 'playFrameAnimation':
        return h.playFrameAnimation(
          cmd.asset,
          {
            frameRate: cmd.frameRate,
            startFrame: cmd.startFrame,
            endFrame: cmd.endFrame,
          },
          this.signal,
        )
      case 'openShop':
        return h.openShop(cmd.shop, cmd.mode, this.signal)
      case 'confirm':
        if (await h.confirm(this.signal)) return
        throwIfAborted(this.signal)
        return this.runBody(cmd.onNo, [...path, 'onNo'])
      case 'cameraPan':
        return h.cameraPan(cmd.dx, cmd.dy, cmd.frames, this.signal)
      case 'cameraSnap':
        return h.cameraSnap(cmd.to)
      case 'setEntityAuto':
        return h.setEntityAuto(cmd.entity, cmd.script ?? cmd.stages)
      case 'setSceneOnEnter': {
        this.world.sceneScriptOverrides ??= {}
        let override = this.world.sceneScriptOverrides[cmd.scene]
        if (!override) {
          override = {}
          this.world.sceneScriptOverrides[cmd.scene] = override
        }
        override.onEnter = cmd.script ?? cmd.stages
        return
      }
      case 'setSceneOnTeleport': {
        this.world.sceneScriptOverrides ??= {}
        let override = this.world.sceneScriptOverrides[cmd.scene]
        if (!override) {
          override = {}
          this.world.sceneScriptOverrides[cmd.scene] = override
        }
        override.onTeleport = cmd.script ?? cmd.stages
        return
      }
      case 'clearSceneScripts': {
        this.world.sceneScriptOverrides ??= {}
        let override = this.world.sceneScriptOverrides[cmd.scene]
        if (!override) {
          override = {}
          this.world.sceneScriptOverrides[cmd.scene] = override
        }
        override.onEnter = null
        override.onTeleport = null
        return
      }
      case 'setEntityTrigger':
        return h.setEntityTrigger(cmd.entity, cmd.script ?? cmd.stages)
      case 'setEntityTriggerMode':
        return h.setEntityTriggerMode(cmd.entity, cmd.on, cmd.range)
      case 'callScript':
        return this.callScript(cmd.ref, cmd.self ?? this.selfId, [...path, `call:${cmd.ref.id}`])
      case 'jumpScript':
        throw new ScriptJump(cmd.ref, cmd.self ?? this.selfId)
      case 'endBattle':
        throw new Error('ScriptRunner: endBattle 只能用于战斗演出脚本')
      default: {
        const unhandled: never = cmd
        throw new Error(`ScriptRunner: 未实现命令 ${(unhandled as Command).kind}`)
      }
    }
  }
}
