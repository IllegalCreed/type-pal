/**
 * 剧情脚本解释器(M3a)—— 设计:script-model-m3-design.md §4。
 *
 * 原生 async 单解释器:每命令 `await`;等待 = host driver 的 Promise(对话确认/淡入淡出/
 * 计时),AbortSignal 贯穿 —— 切场景/读档 abort 即全树取消,无孤儿态、无 waiting 枚举
 * (一阶段三类坑的架构性消解)。host 由 main.ts 注入(渲染/输入/存档的具体实现),
 * 本文件零 DOM 依赖,可用 fake host 单测。
 */
import type {
  Command,
  DialogueLine,
  Facing,
  GridPos,
  ScriptCondition,
  ScriptStage,
  WalkSpeed,
  WorldScriptState,
} from '@type-pal/content'
import { applyStageNext, stageIndexFor } from '@type-pal/content'

/** 命令的副作用出口 —— main.ts(或测试 fake)实现。所有异步项须响应 signal 取消。 */
export interface ScriptHost {
  dialog(line: DialogueLine): Promise<void>
  clearDialog(): void
  fade(dir: 'in' | 'out', ms: number, color?: 'black' | 'red'): Promise<void>
  /** B8:实体向玩家追一步(auto 循环内 = 持续追逐;撞上玩家由 host 触发 touch)。 */
  chaseStep(entityId: string, range: number, speed: number, floating: boolean): Promise<void>
  /** B8:实体消失 seconds 秒后重现(临时态)。 */
  vanishEntity(entityId: string, seconds: number): void
  /** B8:读最近存档(无档 = 重开)。 */
  loadLastSave(): Promise<void>
  /** B8:战败流程(渐红 + 文案 + 读最近档)。 */
  gameOver(): Promise<void>
  wait(ms: number): Promise<void>
  teleportParty(pos: GridPos, facing?: Facing): void
  loadScene(scene: string, pos?: GridPos, facing?: Facing): Promise<void>
  /**
   * 0x15:朝向 + 脚本姿势帧。gesture 缺省 = 清姿势(站立);>0 = 姿势帧
   * (渲染 = dir*framesPerDir + gesture,走路/传送时清)。member 0 = 队长。
   */
  setPartyFacing(facing: Facing, gesture?: number, member?: number): void
  /** 0x65:换角色大世界精灵(异步:精灵可能需加载)。持续到下一次显式切换。 */
  setActorSprite(actor: string, sprite: string): Promise<void>
  /** 战斗演出:敌逃离战场(choreography 专用;大世界 host 打日志跳过)。 */
  fleeBattle(): void
  setEntityState(entity: string, state: number): void
  setEntityFacing(entity: string, facing: Facing): void
  setEntityFrame(entity: string, frame: number): void
  giveItem(itemId: string, count: number): void
  loseItem(itemId: string, count: number): void
  giveMoney(delta: number): void
  playSound(soundId: number): void
  playMusic(musicId: number): void
  /** 场景战斗配置覆写(scene 缺省 = 当前场景;写 world.sceneBattleOverrides,随存档)。 */
  overrideSceneBattle(scene: string | undefined, fieldId?: number, musicId?: number): void
  /** E6b 显式定位权威:接管/归还(缺省全部)。 */
  takeEntity(entityId: string): void
  releaseEntity(entityId?: string): void
  /** E7 载具:party 挂上/下载具;ride = 骑行走位(阻塞)。 */
  mountParty(entityId: string, dx: number, dy: number): void
  unmountParty(): void
  ride(entityId: string, to: GridPos, speed: WalkSpeed): Promise<void>
  // ── M3b 走位 / 演出(阻塞项返回 Promise,须响应 signal)──
  moveEntity(entity: string, to: GridPos, speed: WalkSpeed): Promise<void>
  stepEntity(entity: string, dir: Facing): void
  animEntity(entity: string): void
  nudgeEntity(entity: string, dx: number, dy: number): void
  moveParty(to: GridPos, speed: WalkSpeed): Promise<void>
  nudgeParty(dx: number, dy: number): void
  // ── M3c 相机 / 页切换 ──
  cameraPan(dx: number, dy: number, frames: number): Promise<void>
  cameraSnap(to?: GridPos): void
  setEntityAuto(entity: string, stages: ScriptStage[]): void
  setEntityTrigger(entity: string, stages: ScriptStage[]): void
  setEntityTriggerMode(
    entity: string,
    on: 'interact' | 'touch' | undefined,
    range: number | undefined,
  ): void
  // ── M3b 战斗桩 / 商店 / 确认 ──
  startBattle(
    team: number,
    opts?: { auto?: boolean; boss?: boolean; fieldId?: number; musicId?: number },
  ): Promise<'win' | 'lose' | 'flee'>
  /** 传送出口(0x38):跑当前场景 onTeleport;成功返回 true,场景无此槽返回 false(调用方走 onFail)。 */
  teleportOut(): Promise<boolean>
  /** 过场编排:播 mp4 视频(videos/{videoId}.mp4),阻塞至播完 or 跳过。加载失败静默不卡流程。 */
  playVideo(videoId: number): Promise<void>
  /** 过场编排:播 RNG 序列图(chunkIdx;palette 按剧情 paletteId 上色),阻塞至播完 or 跳过。 */
  playRng(
    chunkIdx: number,
    paletteId: number,
    opts?: { speed?: number; startFrame?: number; endFrame?: number },
  ): Promise<void>
  openShop(shop: number, mode: 'buy' | 'sell'): void
  confirm(): Promise<boolean>
  // ── 条件查询(hasItem/hasMoney/inParty 的数据源)──
  query: {
    hasItem(itemId: string, atLeast: number): boolean
    money(): number
    inParty(actorId: string): boolean
  }
  /** unmigrated / 未实现命令上报(dev toast + console;生产静默日志)。 */
  report(msg: string): void
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
    case 'entityState':
      return (world.entityState[cond.entity] ?? Number.NaN) === cond.is
    case 'chance':
      return random() * 100 < cond.percent
    case 'hasItem':
      return query.hasItem(cond.itemId, cond.atLeast ?? 1)
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

/** onStep 上报:path = 嵌套下标链(段/命令下标 + 分支臂段名),编辑器预览高亮用。 */
export interface StepEvent {
  path: readonly (number | string)[]
  cmd: Command
}

export class ScriptRunner {
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
  ) {}

  /** 顺序执行一段命令体。path = 本段在脚本树中的位置前缀(预览高亮;缺省根)。 */
  async run(body: readonly Command[], path: readonly (number | string)[] = []): Promise<void> {
    for (let i = 0; i < body.length; i++) {
      const cmd = body[i]!
      throwIfAborted(this.signal)
      if (this.gate) {
        await this.gate()
        throwIfAborted(this.signal)
      }
      const cur = [...path, i]
      this.onStep?.({ path: cur, cmd })
      await this.exec(cmd, cur)
      if (this.paceMs > 0) await this.host.wait(this.paceMs)
    }
  }

  /**
   * 跑触发脚本:按 world.entityStage 选段 → 跑段体 → 按 next 转移阶段。
   * key = 实体 id(触发)或 `s:<sceneId>`(onEnter)。
   */
  async runStages(key: string, stages: readonly ScriptStage[]): Promise<void> {
    const idx = stageIndexFor(this.world, key, stages as ScriptStage[])
    const stage = stages[idx]
    if (!stage) return
    this.running = true
    try {
      await this.run(stage.body, [idx])
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
        return h.dialog(cmd.line)
      case 'clearDialog':
        return h.clearDialog()
      case 'fade':
        return h.fade(cmd.dir, cmd.ms ?? 300, cmd.color)
      case 'chasePlayer':
        return h.chaseStep(this.selfId ?? '', cmd.range ?? 8, cmd.speed ?? 4, cmd.floating ?? false)
      case 'vanishEntity':
        return h.vanishEntity(cmd.entity ?? this.selfId ?? '', cmd.seconds ?? 2)
      case 'loadLastSave':
        return h.loadLastSave()
      case 'gameOver':
        return h.gameOver()
      case 'wait':
        return h.wait(cmd.ms)
      case 'teleportParty':
        return h.teleportParty(cmd.pos, cmd.facing)
      case 'loadScene':
        return h.loadScene(cmd.scene, cmd.pos, cmd.facing)
      case 'setPartyFacing':
        return h.setPartyFacing(cmd.facing, cmd.gesture, cmd.member)
      case 'setActorSprite':
        return h.setActorSprite(cmd.actor, cmd.sprite)
      case 'fleeBattle':
        return h.fleeBattle()
      case 'setEntityState':
        this.world.entityState[cmd.entity] = cmd.state
        return h.setEntityState(cmd.entity, cmd.state)
      case 'setEntityFacing':
        return h.setEntityFacing(cmd.entity, cmd.facing)
      case 'setEntityFrame':
        return h.setEntityFrame(cmd.entity, cmd.frame)
      case 'giveItem':
        return h.giveItem(cmd.itemId, cmd.count ?? 1)
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
        return h.playSound(cmd.soundId)
      case 'playMusic':
        return h.playMusic(cmd.musicId)
      case 'overrideSceneBattle':
        return h.overrideSceneBattle(cmd.scene, cmd.fieldId, cmd.musicId)
      case 'takeEntity':
        return h.takeEntity(cmd.entity)
      case 'releaseEntity':
        return h.releaseEntity(cmd.entity)
      case 'mountParty':
        return h.mountParty(cmd.entity, cmd.dx ?? 0, cmd.dy ?? 0)
      case 'unmountParty':
        return h.unmountParty()
      case 'ride':
        return h.ride(cmd.entity, cmd.to, cmd.speed)
      case 'stopScript':
        throw new ScriptStopped() // 跳转臂终止(见类注;runStages 收口)
      case 'branch':
        return evalCondition(cmd.cond, this.world, h.query, this.random)
          ? this.run(cmd.then, [...path, 'then'])
          : cmd.else
            ? this.run(cmd.else, [...path, 'else'])
            : undefined
      case 'moveEntity':
        return h.moveEntity(cmd.entity, cmd.to, cmd.speed)
      case 'stepEntity':
        return h.stepEntity(cmd.entity, cmd.dir)
      case 'animEntity':
        return h.animEntity(cmd.entity)
      case 'nudgeEntity':
        return h.nudgeEntity(cmd.entity, cmd.dx, cmd.dy)
      case 'moveParty':
        return h.moveParty(cmd.to, cmd.speed)
      case 'nudgeParty':
        return h.nudgeParty(cmd.dx, cmd.dy)
      case 'startBattle': {
        const r = await h.startBattle(cmd.team, {
          auto: cmd.auto,
          boss: cmd.boss,
          fieldId: cmd.fieldId,
          musicId: cmd.musicId,
        })
        if (r === 'lose' && cmd.onLose) return this.run(cmd.onLose, [...path, 'onLose'])
        if (r === 'flee' && cmd.onFlee) return this.run(cmd.onFlee, [...path, 'onFlee'])
        return
      }
      case 'teleportOut': {
        const ok = await h.teleportOut()
        if (!ok && cmd.onFail) return this.run(cmd.onFail, [...path, 'onFail'])
        return
      }
      case 'playVideo':
        return h.playVideo(cmd.videoId)
      case 'playRng':
        return h.playRng(cmd.chunkIdx, cmd.paletteId, {
          speed: cmd.speed,
          startFrame: cmd.startFrame,
          endFrame: cmd.endFrame,
        })
      case 'openShop':
        return h.openShop(cmd.shop, cmd.mode)
      case 'confirm':
        return (await h.confirm()) ? undefined : this.run(cmd.onNo, [...path, 'onNo'])
      case 'cameraPan':
        return h.cameraPan(cmd.dx, cmd.dy, cmd.frames)
      case 'cameraSnap':
        return h.cameraSnap(cmd.to)
      case 'setEntityAuto':
        return h.setEntityAuto(cmd.entity, cmd.stages)
      case 'setEntityTrigger':
        return h.setEntityTrigger(cmd.entity, cmd.stages)
      case 'setEntityTriggerMode':
        return h.setEntityTriggerMode(cmd.entity, cmd.on, cmd.range)
      case 'unmigrated':
        h.report(`unmigrated op 0x${cmd.opcode.toString(16)} ${cmd.note ?? ''}`)
        return
    }
  }
}
