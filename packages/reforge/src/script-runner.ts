/**
 * 剧情脚本解释器(M3a)—— 设计:script-model-m3-design.md §4。
 *
 * 原生 async 单解释器:每命令 `await`;等待 = host driver 的 Promise(对话确认/淡入淡出/
 * 计时),AbortSignal 贯穿 —— 切场景/读档 abort 即全树取消,无孤儿态、无 waiting 枚举
 * (一阶段三类坑的架构性消解)。host 由 main.ts 注入(渲染/输入/存档的具体实现),
 * 本文件零 DOM 依赖,可用 fake host 单测。
 */
import type { Command, DialogueLine, Facing, GridPos, ScriptStage, WorldScriptState } from '@type-pal/content'
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
  /** unmigrated / 未实现命令上报(dev toast + console;生产静默日志)。 */
  report(msg: string): void
}

/** 取消检查:abort 后立刻停(await 间隙内)。 */
function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('script aborted', 'AbortError')
}

export class ScriptRunner {
  /** 当前是否有脚本在跑(main.ts 用于冻结探索输入 + 触发防重入)。 */
  running = false

  constructor(
    private readonly host: ScriptHost,
    private readonly world: WorldScriptState,
    private readonly signal: AbortSignal,
  ) {}

  /** 顺序执行一段命令体。 */
  async run(body: readonly Command[]): Promise<void> {
    for (const cmd of body) {
      throwIfAborted(this.signal)
      await this.exec(cmd)
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
        // M3b:条件求值。M3a 数据里不产 branch;手工数据误入 → 上报走 then 臂(保守可见)。
        h.report(`branch 未实现(M3b),先走 then 臂`)
        return this.run(cmd.then)
      case 'unmigrated':
        h.report(`unmigrated op 0x${cmd.opcode.toString(16)} ${cmd.note ?? ''}`)
        return
    }
  }
}
