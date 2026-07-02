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
  fade(dir: 'in' | 'out', ms: number): Promise<void>
  wait(ms: number): Promise<void>
  teleportParty(pos: GridPos, facing?: Facing): void
  loadScene(scene: string, pos?: GridPos, facing?: Facing): Promise<void>
  setPartyFacing(facing: Facing): void
  setEntityState(entity: string, state: number): void
  setEntityFacing(entity: string, facing: Facing): void
  setEntityFrame(entity: string, frame: number): void
  giveItem(itemId: string, count: number): void
  loseItem(itemId: string, count: number): void
  giveMoney(delta: number): void
  playSound(soundId: number): void
  playMusic(musicId: number): void
  setBattleMusic(musicId: number): void
  setBattleField(fieldId: number): void
  // ── M3b 走位 / 演出(阻塞项返回 Promise,须响应 signal)──
  moveEntity(entity: string, to: GridPos, speed: WalkSpeed): Promise<void>
  stepEntity(entity: string, dir: Facing): void
  animEntity(entity: string): void
  nudgeEntity(entity: string, dx: number, dy: number): void
  moveParty(to: GridPos, speed: WalkSpeed): Promise<void>
  nudgeParty(dx: number, dy: number): void
  // ── M3b 战斗桩 / 商店 / 确认 ──
  startBattle(team: number): Promise<'win' | 'lose' | 'flee'>
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
        case '==': return v === cond.value
        case '!=': return v !== cond.value
        case '>=': return v >= cond.value
        case '<=': return v <= cond.value
        case '>': return v > cond.value
        case '<': return v < cond.value
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

export class ScriptRunner {
  /** 当前是否有脚本在跑(main.ts 用于冻结探索输入 + 触发防重入)。 */
  running = false
  /**
   * 步调(ms):>0 时每条命令后 wait 一拍 —— 原版 autoScript 一帧执行一条 op 的节拍还原
   * (一阶段 tickAutoScripts 同语义;不设则触发/onEnter 脚本全速直跑,阻塞点自带节奏)。
   */
  paceMs = 0

  constructor(
    private readonly host: ScriptHost,
    private readonly world: WorldScriptState,
    private readonly signal: AbortSignal,
    private readonly random: () => number = Math.random,
  ) {}

  /** 顺序执行一段命令体。 */
  async run(body: readonly Command[]): Promise<void> {
    for (const cmd of body) {
      throwIfAborted(this.signal)
      await this.exec(cmd)
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
      await this.run(stage.body)
      applyStageNext(this.world, key, idx, stage.next)
    } finally {
      this.running = false
    }
  }

  private async exec(cmd: Command): Promise<void> {
    const h = this.host
    switch (cmd.kind) {
      case 'dialog':
        return h.dialog(cmd.line)
      case 'clearDialog':
        return h.clearDialog()
      case 'fade':
        return h.fade(cmd.dir, cmd.ms ?? 300)
      case 'wait':
        return h.wait(cmd.ms)
      case 'teleportParty':
        return h.teleportParty(cmd.pos, cmd.facing)
      case 'loadScene':
        return h.loadScene(cmd.scene, cmd.pos, cmd.facing)
      case 'setPartyFacing':
        return h.setPartyFacing(cmd.facing)
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
      case 'setBattleMusic':
        return h.setBattleMusic(cmd.musicId)
      case 'setBattleField':
        return h.setBattleField(cmd.fieldId)
      case 'branch':
        return evalCondition(cmd.cond, this.world, h.query, this.random)
          ? this.run(cmd.then)
          : cmd.else
            ? this.run(cmd.else)
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
        const r = await h.startBattle(cmd.team)
        if (r === 'lose' && cmd.onLose) return this.run(cmd.onLose)
        if (r === 'flee' && cmd.onFlee) return this.run(cmd.onFlee)
        return
      }
      case 'openShop':
        return h.openShop(cmd.shop, cmd.mode)
      case 'confirm':
        return (await h.confirm()) ? undefined : this.run(cmd.onNo)
      case 'unmigrated':
        h.report(`unmigrated op 0x${cmd.opcode.toString(16)} ${cmd.note ?? ''}`)
        return
    }
  }
}
