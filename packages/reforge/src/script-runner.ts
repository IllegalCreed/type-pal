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
import { applyStageNext, pixelToGrid, stageIndexFor } from '@type-pal/content'

/** 命令的副作用出口 —— main.ts(或测试 fake)实现。所有异步项须响应 signal 取消。 */
export interface ScriptHost {
  dialog(line: DialogueLine): Promise<void>
  clearDialog(): void
  /** 0x99 当前场景即时换底图(mapNum 已写入 world.script.mapOverride;host 重载 map 资产,不动实体)。 */
  reloadMap?(mapNum: number): Promise<void>
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
  /** 0x1A:持久改角色形象(写 CharacterInstance.appearance,随存档;成年灵儿)。缺 = 该 host 不支持。 */
  setActorAppearance?(actor: string, patch: { spriteId?: string; portrait?: number; battleSprite?: number }): Promise<void>
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
  /** W6 氛围(昼夜):切全局氛围(全帧乘法滤镜;原版 0x53/0x54 全局调色板 flag)。 */
  setAmbience(ambience: string): void
  /** E6b 显式定位权威:接管/归还(缺省全部)。 */
  takeEntity(entityId: string): void
  releaseEntity(entityId?: string): void
  /** E7 载具:party 挂上/下载具;ride = 骑行走位(阻塞)。 */
  mountParty(entityId: string, dx: number, dy: number): void
  unmountParty(): void
  ride(entityId: string, to: GridPos, speed: WalkSpeed): Promise<void>
  /** C7 队伍变更(D22 reserve):members = 角色模板 id 有序表。 */
  setParty(members: string[]): void
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
    opts?: {
      auto?: boolean
      boss?: boolean
      fieldId?: number
      musicId?: number
      /** 遭遇专属战斗演出(startBattle.choreography;对话绑遭遇而非敌种)。 */
      choreography?: import('@type-pal/content').BattleChoreography[]
    },
  ): Promise<'win' | 'lose' | 'flee'>
  /** 传送出口(0x38):跑当前场景 onTeleport;成功返回 true,场景无此槽返回 false(调用方走 onFail)。 */
  teleportOut(): Promise<boolean>
  /** 过场编排:播 mp4 视频(videos/{videoId}.mp4),阻塞至播完 or 跳过。加载失败静默不卡流程。 */
  playVideo(videoId: number): Promise<void>
  /** 过场编排:播 RNG 序列图(chunkIdx;正确调色盘引擎内定死,不传参),阻塞至播完 or 跳过。 */
  playRng(
    chunkIdx: number,
    opts?: { speed?: number; startFrame?: number; endFrame?: number },
  ): Promise<void>
  /** 商店/当铺(阻塞脚本至关店;店不存在须立即 resolve 防卡死)。 */
  openShop(shop: number, mode: 'buy' | 'sell'): Promise<void>
  confirm(): Promise<boolean>
  // ── 条件查询(hasItem/hasMoney/inParty 的数据源)──
  query: {
    hasItem(itemId: string, atLeast: number): boolean
    money(): number
    inParty(actorId: string): boolean
    /** 当前场景 id(0x99 当前场景换图的 override 键;缺省实现可返回空串 = 不落 override)。 */
    sceneId?(): string
  }
  /** unmigrated / 未实现命令上报(dev toast + console;生产静默日志)。 */
  report(msg: string): void
  // ── 原版 op 运行时兼容层(batch1)的小能力;可选 = 部分 host(choreo/测试)不需要 ──
  /** 0x35 震屏(script.c:1521):timeFrames 帧(40ms/帧)内画面上下 ±level;0 = 立即关。 */
  shakeScreen?(timeFrames: number, level: number): void
  /** 0x80 昼夜切换(script.c:2381):world.ambience day↔night 翻转 + fadeMs 渐变
   *  (原版 PaletteFade 真值:更新场景 3200ms / 立即模式 800ms,一阶段 OP_PALETTE_FADE)。 */
  toggleDayNight?(fadeMs: number): void
  /** 0x1D 全队增血蓝(script.c:923 PAL_IncreaseHPMP(role, op1, op1)):HP/MP **同加** amount
   *  (op2 忽略,sdlpal/一阶段同);仅活人、clamp [0,max]。负数 = 扣(温泉/陷阱两用)。 */
  increaseHpMp?(amount: number): void
  /** 0x22 全队复活(script.c:1052):仅死者;HP = maxHP×tenths/10 + 解重毒(CurePoisonByLevel(3)
   *  ≙ severe)+ 清临时状态(遍历 RemovePlayerStatus ≙ extraStatuses 清空)。 */
  revivePartyAll?(tenths: number): void
  /** 0x55 学仙术(script.c:1816 PAL_AddMagic):roleIdx = 原版角色号(0李逍遥/1赵灵儿/2林月如/
   *  3巫后/4阿奴/5盖罗娇);已会不重复。 */
  learnSkill?(roleIdx: number, skillId: string): void
  /** 0x13 实体绝对定位(script.c:716):持久写 world.script.entityPos + 本场景实体活体生效
   *  (跨场景定位常见,进场时由 applyWorldToScene 重放)。 */
  setEntityPos?(id: string, pos: { col: number; row: number }): void
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
      case 'setActorAppearance':
        return h.setActorAppearance?.(cmd.actor, {
          ...(cmd.spriteId !== undefined ? { spriteId: cmd.spriteId } : {}),
          ...(cmd.portrait !== undefined ? { portrait: cmd.portrait } : {}),
          ...(cmd.battleSprite !== undefined ? { battleSprite: cmd.battleSprite } : {}),
        })
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
      case 'setSceneStage':
        // 0x6D:目标场景进场剧情切到指定段(startScript 键 `s:<sceneId>`,stageIndexFor 选段)
        this.world.entityStage[`s:${cmd.scene}`] = cmd.stage
        return
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
        return h.ride(cmd.entity, cmd.to, cmd.speed)
      case 'setParty':
        return h.setParty(cmd.members)
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
          ...(cmd.choreography ? { choreography: cmd.choreography } : {}),
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
        return h.playRng(cmd.chunkIdx, {
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
        return this.runLegacyOp(cmd, h)
    }
  }

  /** 0x36 设的「当前 RNG 序列」(script.c:1537;0x37 播放时消费)。 */
  private curRngChunk = 0

  /**
   * 迁移器翻不动的原版 op 的**运行时兼容层**(batch1,2026-07-11)——
   * 内容文件不动(round-trip 不变式),执行层按 sdlpal script.c 逐 case 精读语义直映射。
   * jump-family(0x58/0x74/0x83/0x86,带字节码跳转地址,树化后无目标)与状态机类
   * (0x13/0x9A/0x6D/0x78 等)留 batch2;未覆盖的仍上报。
   */
  private async runLegacyOp(
    cmd: { opcode: number; operands: number[]; note?: string },
    h: ScriptHost,
  ): Promise<void> {
    const a = cmd.operands[0] ?? 0
    const b = cmd.operands[1] ?? 0
    const c = cmd.operands[2] ?? 0
    const i16 = (n: number): number => (n & 0x8000 ? n - 0x10000 : n)
    switch (cmd.opcode) {
      case 0x00: // NOP(script.c:3204 default 前的空 op;迁移器留作分支臂占位)
      case 0x08: // 触发入口推进(script.c:3335 wScriptEntry++)—— stage 推进体系已承担该语义
        return
      case 0x35: // 震屏(script.c:1521):time=op0 帧,level=op1||4;time=0 立即关
        h.shakeScreen?.(a, b || 4)
        return
      case 0x36: // 设当前 RNG 序列号(script.c:1537)
        this.curRngChunk = a
        return
      case 0x37: // 播 RNG(script.c:1544 PAL_RNGPlay(cur, op0, op1>0?op1:-1, op2>0?op2:16))
        return h.playRng(this.curRngChunk, {
          startFrame: a,
          endFrame: b > 0 ? b : undefined,
          speed: c > 0 ? c : 16,
        })
      case 0x77: // 停当前音乐(script.c:2215;fade 时长 op0×3s 细节未复刻,直接停)
        h.playMusic(0)
        return
      case 0x80: // 昼夜切换(script.c:2381):toggle + PaletteFade;时长真值 = 一阶段
        // OP_PALETTE_FADE:op0==0(更新场景)3200ms 渐变,否则 800ms
        h.toggleDayNight?.(a === 0 ? 3200 : 800)
        return
      case 0x1d: // 增血蓝(script.c:923):HP/MP 同加 int16(op1),op2 忽略(sdlpal/一阶段裁决)。
        // pal 数据 9 处全 op0=1(全队);op0=0 单人形态(事件对象指角色)全游戏未出现,报缺口
        if (a !== 0) h.increaseHpMp?.(i16(b))
        else h.report(`unmigrated op 0x1d 单人形态(op0=0)未接`)
        return
      case 0x22: // 复活(script.c:1052):仅死者,HP=max×op1/10 + 解重毒 + 清临时状态;数据全 op0=1
        if (a !== 0) h.revivePartyAll?.(b)
        else h.report(`unmigrated op 0x22 单人形态(op0=0)未接`)
        return
      case 0x55: // 学仙术(script.c:1816):op0=magic id,op1>0 → 角色 op1−1;op1=0(事件对象)未出现
        if (b > 0) h.learnSkill?.(b - 1, String(a))
        else h.report(`unmigrated op 0x55 事件对象形态(op1=0)未接`)
        return
      case 0x13: {
        // 实体绝对定位(script.c:716):op0 对象选择器(0/0xFFFF=触发者),op1/op2 = 原版像素
        // 坐标 → pixelToGrid 换算(与迁移器 partyPosToGrid 同源)。持久 + 活体双写在 host。
        const ent = a === 0 || a === 0xffff ? this.selfId : `e${a - 1}`
        if (ent) h.setEntityPos?.(ent, pixelToGrid(b, c))
        return
      }
      case 0x23: // 卸装(script.c:1104):op0=角色号,op1=0 全卸 / op1−1 槽序;卸下退回背包
        h.unequipRole?.(a, b === 0 ? 'all' : b - 1)
        return
      case 0x6f: {
        // 条件同步状态(script.c:2115):源对象(op0)状态 == int16(op1) → 触发者同设该值
        // (仙灵岛/村口双态机关门)。源状态:脚本覆写优先,否则活体推导(host)。
        const src = a === 0 || a === 0xffff ? this.selfId : `e${a - 1}`
        const self = this.selfId
        if (!src || !self) return
        if (h.getEntityState?.(src) === i16(b)) {
          this.world.entityState[self] = i16(b)
          h.setEntityState(self, i16(b))
        }
        return
      }
      case 0x71:
        // 屏幕水波(一阶段 OP_WAVE_SCREEN:wScreenWave=op0 / sWaveProgression=int16(op1),
        // present 层每帧消费:32 相位逐行左卷 + 波幅累加,==0/≥256 自灭)。状态入 vars 随存档
        this.world.vars['sys:screenWave'] = a
        this.world.vars['sys:waveProgression'] = i16(b)
        return
      case 0x98: {
        // 编外跟随者(script.c:2709 nFollower):op0/op1 >0 = 精灵 chunk 直用(非角色表,
        // s102 书生 82/83);全 0 = 清。写 world 持久,渲染层队尾按 trail 跟走
        const fl = [a, b].filter((x) => x > 0)
        this.world.followers = fl.length ? fl : undefined
        return
      }
      case 0x99: {
        // 换场景底图(script.c:2740):op0=0xFFFF 当前场景 mapNum=op1 即时重载(不动实体);
        // else 场景 s<op0>(1-based→id)下次进场生效。override 随存档持久
        const mapNum = b
        if (a === 0xffff) {
          const cur = h.query.sceneId?.()
          if (cur) (this.world.mapOverride ??= {})[cur] = mapNum
          await h.reloadMap?.(mapNum)
        } else {
          ;(this.world.mapOverride ??= {})[`s${String(a - 1).padStart(3, '0')}`] = mapNum
        }
        return
      }
      // 0x24(改实体巡逻脚本)/ 0x90(写全局对象 rgwData 槽):各仅 1 站点的低层脚本指针 poke —
      // 0x24 @s206 把触发实体的 autoScript 重绑成另一实体的躲藏行为(阿奴捉迷藏);0x90 @s138
      // 写全局对象表 rgObject[n].rgwData[2+k](对象类型相关,无 clean 概念映射)。二者均无干净
      // 建模、非主线卡点 → 落 report(dev warn + 生产静默),不为 2 个边缘单点建"运行时重绑实体
      // 脚本"整套机制(content-first:范围错配)。将来若成主线障碍再评估。
      case 0x24:
      case 0x90:
        h.report(`op 0x${cmd.opcode.toString(16)}(单点低层脚本 poke,已知搁置)`)
        return
      case 0x76:
        // ShowFBP(script.c:2199)。全游戏 4 站点(水月宫 s020)全为 op0=0xFFFF「填黑帧缓冲」,
        // 且前面必有 fade out(一阶段 blackScreenHold 防 FadeIn 旧帧回闪)。reforge 每帧重画
        // 无陈旧帧缓冲,黑幕(fadeBlack 保持)下实体重排、fade in 揭新景 → 0xFFFF 即 no-op。
        // 真 FBP 图(op0≠0xFFFF)数据中不存在;若内容工程将来用到再接全屏图演出
        if (a !== 0xffff) console.warn(`[script] 0x76 ShowFBP 图 ${a} 未实现(数据中无此用法)`)
        return
      case 0x7e: {
        // 实体图层(一阶段 OP_SET_OBJECT_LAYER:sLayer=int16(op1),**只进深度排序键** +8px/层)。
        // 写 world.script.entityLayer,render 每帧直读(跨场景/存档天然持久)
        const ent = a === 0 || a === 0xffff ? this.selfId : `e${a - 1}`
        if (ent) (this.world.entityLayer ??= {})[ent] = i16(b)
        return
      }
      case 0x8f: {
        // 金钱减半(一阶段 OP_HALVE_CASH:cash = floor(cash/2);酒剑仙赌局)。
        // ⚠ delta 形式须扣 (cash − floor(cash/2)):扣 trunc(cash/2) 在奇数上余 ceil,差 1
        const money = h.query.money()
        h.giveMoney(-(money - Math.floor(money / 2)))
        return
      }
      case 0x9a: {
        // 批量设实体状态(script.c:2756):全局对象号区间 [op0,op1] 全设 sState=op2。
        // 实体 id = 全局号−1(迁移器 entRef 同源),跨场景写 world 持久、进场重放
        for (let v = a; v <= b && v - a < 512; v++) {
          this.world.entityState[`e${v - 1}`] = i16(c)
        }
        h.setEntityState(`e${a - 1}`, i16(c)) // 通知宿主重放一次(main 侧整场 applyWorldToScene)
        return
      }
      case 0xa3: // CD 音轨播放(script.c:3023):CD 不可用回退 RIX 曲 op1 —— 直接放 op1
        return h.playMusic(b)
      case 0x85: // 延时(script.c:2511 UTIL_Delay(op0 × 80ms))
        return h.wait(a * 80)
      case 0x8c: {
        // 颜色渐变(script.c:2582 PAL_ColorFade(delay=op1, color=op0, fFrom=op2)):
        // 时长 = 64 × (op1×10 || 10)ms(一阶段 OP_COLOR_FADE);fFrom = 从纯色渐回场景。
        // reforge 无调色板,纯色近似黑幕:from → fade in / to → fade out。
        const ms = 64 * (b * 10 || 10)
        return h.fade(c !== 0 ? 'in' : 'out', ms)
      }
      case 0x93: {
        // SceneFade(script.c:2664):step=int16(op0)||1;总时长 ceil(64/|step|)×100ms
        // (一阶段 OP_SCENE_FADE);step<0 = 渐暗(needToFadeIn 语义由后续 fade in 恢复)
        const step = i16(a) || 1
        const ms = Math.ceil(64 / Math.abs(step)) * 100
        return h.fade(step < 0 ? 'out' : 'in', ms)
      }
      case 0x9b: // fade to 当前场景(script.c:2766 VIDEO_FadeScreen(2)≈640ms 渐入)
        return h.fade('in', 640)
      default:
        h.report(`unmigrated op 0x${cmd.opcode.toString(16)} ${cmd.note ?? ''}`)
        return
    }
  }
}
