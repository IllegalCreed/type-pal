/**
 * 演出预览控制器(v0:播放 / 单步 / 高亮 / 日志桩,从头播)。
 *
 * 复用不重写:直接实例化 @type-pal/reforge 的 ScriptRunner,注入**画布 host**——
 * 走位/显隐/朝向/定帧/换装/对话/淡幕做真可视化,音乐/战斗/商店/切场景等落日志桩。
 * 演出态全部写进 overlay(PlaybackView),**不触碰编辑器场景数据**;重置即丢弃。
 * 走位步进逻辑与引擎同源语义(半格步 + 像素轴朝向,见 reforge main.ts)。
 */
import type { DialogueLine, Facing, GridPos, SceneDef, ScriptStage } from '@type-pal/content'
import { emptyWorldScriptState, pixelDeltaToGridDelta } from '@type-pal/content'
import type { ScriptHost, StepEvent } from '@type-pal/reforge'
import { ScriptRunner } from '@type-pal/reforge'

export interface EntityOverlay {
  pos?: GridPos
  facing?: Facing
  hidden?: boolean
  /** 演出定帧(setEntityFrame;有值即优先 站立帧+frame)。 */
  frame?: number
  /** 走帧计数(移动/animEntity 推进)。 */
  anim?: number
}

export interface PlaybackView {
  entity: Map<string, EntityOverlay>
  player: { pos: GridPos; facing: Facing; gesture: number | null; spriteId: string | null }
  dialog: { line: DialogueLine; resolve: () => void } | null
  /** 0 透明 → 1 全黑(fade 命令补间)。 */
  fadeBlack: number
  logs: string[]
}

type Mode = 'idle' | 'running' | 'paused' | 'done'

const SPEED_MS: Record<string, number> = { slow: 200, normal: 130, fast: 100, run: 50 }

interface MoveJob {
  to: GridPos
  stepMs: number
  acc: number
  resolve: () => void
  /** 'player' 或实体 id。 */
  who: string
}

/** 每步半格 + 像素轴朝向(与引擎同语义)。返回是否到达。 */
function stepToward(
  pos: GridPos,
  to: GridPos,
): { pos: GridPos; facing?: Facing; arrived: boolean } {
  const dcol = to.col - pos.col
  const drow = to.row - pos.row
  if (Math.abs(dcol) < 0.26 && Math.abs(drow) < 0.26) return { pos: { ...to }, arrived: true }
  const dc = Math.abs(dcol) >= 0.26 ? Math.sign(dcol) * 0.5 : 0
  const dr = Math.abs(drow) >= 0.26 ? Math.sign(drow) * 0.5 : 0
  const dpx = dcol - drow
  const dpy = dcol + drow
  const facing: Facing = dpy < 0 ? (dpx < 0 ? 'left' : 'up') : dpx < 0 ? 'down' : 'right'
  const next = { col: pos.col + dc, row: pos.row + dr, height: pos.height }
  const arrived = Math.abs(to.col - next.col) < 0.26 && Math.abs(to.row - next.row) < 0.26
  return { pos: arrived ? { ...to } : next, facing, arrived }
}

/** 相机兴趣点:预览镜头该看谁。 */
export type Poi = { kind: 'player' } | { kind: 'entity'; id: string }

export class Playback {
  view: PlaybackView
  mode: Mode = 'idle'
  speed = 1
  /** 低频 UI 事件(mode/对话/日志/高亮变化)→ React setState。 */
  onUi?: () => void
  /** 当前命令路径(如 "0/12/then/3";null = 未在播)。 */
  activePath: string | null = null
  /**
   * 相机兴趣点(「命令即导演」):播放时初始 = 触发 owner 实体(onEnter = 玩家),
   * 之后跟随最后被命令作用的对象 —— 实体走位/转向/显隐 → 该实体;队伍走位/瞬移 →
   * 玩家;对话/音乐等不动镜头。null = 未播(画布按选中源 focus 定)。
   */
  poi: Poi | null = null

  private scene: SceneDef
  private abort: AbortController | null = null
  private moves: MoveJob[] = []
  private fadeJob: { dir: 'in' | 'out'; ms: number; done: number; resolve: () => void } | null =
    null
  private gateQueue: (() => void)[] = []
  private timers: { left: number; resolve: () => void }[] = []

  constructor(scene: SceneDef) {
    this.scene = scene
    this.view = this.freshView()
  }

  private freshView(): PlaybackView {
    return {
      entity: new Map(),
      player: {
        pos: { ...this.scene.entry.pos },
        facing: this.scene.entry.facing,
        gesture: null,
        spriteId: null,
      },
      dialog: null,
      fadeBlack: 0,
      logs: [],
    }
  }

  /** 实体当前位(overlay 优先,基准 = 场景数据)。 */
  entityPos(id: string): GridPos | undefined {
    const ov = this.view.entity.get(id)
    if (ov?.pos) return ov.pos
    const e = this.scene.entities.find((x) => x.id === id)
    return e ? e.pos : undefined
  }

  private ov(id: string): EntityOverlay {
    let o = this.view.entity.get(id)
    if (!o) {
      o = {}
      this.view.entity.set(id, o)
    }
    return o
  }

  private log(msg: string): void {
    this.view.logs.push(msg)
    this.onUi?.()
  }

  /** cmd → 镜头兴趣点(不涉及位置的命令返回 undefined = 镜头不动)。 */
  private poiOf(cmd: { kind: string; entity?: string; state?: number }): Poi | undefined {
    switch (cmd.kind) {
      case 'moveEntity':
      case 'stepEntity':
      case 'nudgeEntity':
      case 'animEntity':
      case 'setEntityFacing':
      case 'setEntityFrame':
      case 'setEntityState':
        return cmd.entity ? { kind: 'entity', id: cmd.entity } : undefined
      case 'moveParty':
      case 'nudgeParty':
      case 'teleportParty':
      case 'setPartyFacing':
      case 'loadScene':
        return { kind: 'player' }
      default:
        return undefined
    }
  }

  /** 兴趣点世界格(entity 含演出 overlay;解析不到回退玩家)。 */
  poiPos(): GridPos {
    if (this.poi?.kind === 'entity') {
      const p = this.entityPos(this.poi.id)
      if (p) return this.view.entity.get(this.poi.id)?.pos ?? p
    }
    return this.view.player.pos
  }

  /** 从头播一个脚本源。paused=true 起手即暂停;ownerId = 触发实体(初始镜头对准它)。 */
  play(
    key: string,
    stages: readonly ScriptStage[],
    opts?: { paused?: boolean; ownerId?: string },
  ): void {
    this.stop()
    this.mode = opts?.paused ? 'paused' : 'running'
    this.view = this.freshView()
    this.activePath = null
    this.poi = opts?.ownerId ? { kind: 'entity', id: opts.ownerId } : { kind: 'player' }
    const ac = new AbortController()
    this.abort = ac
    const runner = new ScriptRunner(this.host, emptyWorldScriptState(), ac.signal)
    runner.onStep = (ev: StepEvent) => {
      this.activePath = ev.path.join('/')
      const p = this.poiOf(ev.cmd as { kind: string; entity?: string })
      if (p) this.poi = p
      this.onUi?.()
    }
    runner.gate = () =>
      new Promise<void>((resolve) => {
        if (ac.signal.aborted) return resolve()
        if (this.mode === 'running') return resolve()
        this.gateQueue.push(resolve)
      })
    void runner
      .runStages(key, stages)
      .then(() => {
        if (this.abort === ac) {
          this.mode = 'done'
          this.activePath = null
          this.onUi?.()
        }
      })
      .catch(() => {
        /* AbortError = 用户重置,静默 */
      })
    this.onUi?.()
  }

  /** 暂停(命令间生效;命令内阻塞项播完当前命令)。 */
  pause(): void {
    if (this.mode === 'running') {
      this.mode = 'paused'
      this.onUi?.()
    }
  }

  /** 继续连播:放行所有排队门。 */
  resume(): void {
    if (this.mode !== 'paused') return
    this.mode = 'running'
    for (const r of this.gateQueue.splice(0)) r()
    // 悬挂对话不自动确认——继续播放仍等用户点「继续」(对话本身是阻塞语义)
    this.onUi?.()
  }

  /** 单步:放行一条命令(若正停在对话上,先确认对话)。 */
  step(): void {
    if (this.view.dialog) {
      this.confirmDialog()
      return
    }
    this.gateQueue.shift()?.()
    this.onUi?.()
  }

  /** 对话「继续」。 */
  confirmDialog(): void {
    const d = this.view.dialog
    if (!d) return
    this.view.dialog = null
    d.resolve()
    this.onUi?.()
  }

  /** 停止并丢弃演出态(overlay 清空 → 画布回编辑器静态)。 */
  stop(): void {
    this.abort?.abort()
    this.abort = null
    for (const r of this.gateQueue.splice(0)) r()
    for (const m of this.moves.splice(0)) m.resolve()
    for (const t of this.timers.splice(0)) t.resolve()
    this.fadeJob?.resolve()
    this.fadeJob = null
    const d = this.view.dialog
    this.view.dialog = null
    d?.resolve()
    this.view = this.freshView()
    this.mode = 'idle'
    this.activePath = null
    this.poi = null
    this.onUi?.()
  }

  /** rAF 驱动:推进走位/淡幕/计时。返回是否有活动(需要重绘)。 */
  tick(dt: number): boolean {
    const d = dt * this.speed
    const active = this.moves.length > 0 || this.fadeJob !== null || this.timers.length > 0
    // 走位
    for (const mv of [...this.moves]) {
      mv.acc += d
      while (mv.acc >= mv.stepMs) {
        mv.acc -= mv.stepMs
        if (mv.who === 'player') {
          const r = stepToward(this.view.player.pos, mv.to)
          this.view.player.pos = r.pos
          if (r.facing) this.view.player.facing = r.facing
          this.view.player.gesture = null
          if (r.arrived) {
            this.moves.splice(this.moves.indexOf(mv), 1)
            mv.resolve()
            break
          }
        } else {
          const o = this.ov(mv.who)
          const base = this.entityPos(mv.who)
          if (!base) {
            this.moves.splice(this.moves.indexOf(mv), 1)
            mv.resolve()
            break
          }
          const r = stepToward(o.pos ?? base, mv.to)
          o.pos = r.pos
          if (r.facing) o.facing = r.facing
          o.frame = undefined // 走位重算帧(引擎同语义:覆盖演出定帧)
          o.anim = (o.anim ?? 0) + 1
          if (r.arrived) {
            this.moves.splice(this.moves.indexOf(mv), 1)
            mv.resolve()
            break
          }
        }
      }
    }
    // 淡幕
    if (this.fadeJob) {
      const f = this.fadeJob
      f.done += d
      const t = Math.min(1, f.done / f.ms)
      this.view.fadeBlack = f.dir === 'out' ? t : 1 - t
      if (t >= 1) {
        this.fadeJob = null
        f.resolve()
      }
    }
    // 计时(wait)
    for (const t of [...this.timers]) {
      t.left -= d
      if (t.left <= 0) {
        this.timers.splice(this.timers.indexOf(t), 1)
        t.resolve()
      }
    }
    return active
  }

  // ── 画布 host(可视化 + 日志桩)──
  private host: ScriptHost = {
    dialog: (line) =>
      new Promise<void>((resolve) => {
        this.view.dialog = { line, resolve }
        this.onUi?.()
      }),
    clearDialog: () => {
      const d = this.view.dialog
      this.view.dialog = null
      d?.resolve()
      this.onUi?.()
    },
    fade: (dir, ms) =>
      new Promise<void>((resolve) => {
        this.fadeJob?.resolve()
        this.fadeJob = { dir, ms, done: 0, resolve }
      }),
    wait: (ms) =>
      new Promise<void>((resolve) => {
        this.timers.push({ left: ms, resolve })
      }),
    teleportParty: (pos, fc) => {
      this.view.player.pos = { ...pos }
      if (fc) this.view.player.facing = fc
    },
    loadScene: async (sceneId) => {
      this.log(`🚪 切场景 ${sceneId}(预览到此为止)`)
      this.abort?.abort() // 预览不跨场景:当作演出结束
    },
    setPartyFacing: (fc, gesture, member) => {
      this.view.player.facing = fc
      if (!member) this.view.player.gesture = gesture ?? null
    },
    fleeBattle: () => {
      this.log('🏃 敌人逃离战场(战斗演出命令,预览记日志)')
    },
    setActorSprite: async (actorId, spriteId) => {
      this.view.player.spriteId = spriteId
      this.log(`🎭 ${actorId} 换精灵 ${spriteId}`)
    },
    setEntityState: (id, state) => {
      const o = this.ov(id)
      o.hidden = state <= 0
    },
    setEntityFacing: (id, fc) => {
      this.ov(id).facing = fc
    },
    setEntityFrame: (id, frame) => {
      this.ov(id).frame = frame
    },
    giveItem: (itemId, count) => this.log(`🎁 得 ${itemId} ×${count}`),
    loseItem: (itemId, count) => this.log(`📤 失 ${itemId} ×${count}`),
    giveMoney: (delta) => this.log(`💰 ${delta >= 0 ? '+' : ''}${delta} 钱`),
    playSound: (id) => this.log(`🔊 音效 ${id}`),
    playMusic: (id) => this.log(`🎵 音乐 ${id}`),
    setAmbience: (id) => this.log(`🌗 切氛围 ${id}`), // 预览画布不染(创作视图恒白天);要看夜色走引擎试玩
    takeEntity: (id) => this.log(`🔒 接管 ${id}`),
    setParty: (members) => this.log(`👥 队伍变更 → ${members.join(', ')}`),
    mountParty: (id) => this.log(`🛶 挂载队伍 → ${id}`),
    unmountParty: () => this.log('🚶 下载具'),
    ride: async (id, to) => this.log(`🛶 骑行 ${id} → (${to.col},${to.row})`),
    releaseEntity: (id) => this.log(`🔓 归还 ${id ?? '(全部)'}`),
    moveEntity: (id, to, speed) =>
      new Promise<void>((resolve) => {
        this.moves.push({ who: id, to, stepMs: SPEED_MS[speed] ?? 130, acc: 0, resolve })
      }),
    stepEntity: (id, dir) => {
      const o = this.ov(id)
      const base = this.entityPos(id)
      if (!base) return
      const cur = o.pos ?? base
      const D: Record<Facing, [number, number]> = {
        down: [0, 1],
        left: [-1, 0],
        up: [0, -1],
        right: [1, 0],
      }
      const [dc, dr] = D[dir]
      o.facing = dir
      o.pos = { col: cur.col + dc * 0.5, row: cur.row + dr * 0.5, height: cur.height }
      o.anim = (o.anim ?? 0) + 1
    },
    animEntity: (id) => {
      const o = this.ov(id)
      o.anim = (o.anim ?? 0) + 1
    },
    nudgeEntity: (id, dx, dy) => {
      const o = this.ov(id)
      const base = this.entityPos(id)
      if (!base) return
      const cur = o.pos ?? base
      const d = pixelDeltaToGridDelta(dx, dy)
      o.pos = { col: cur.col + d.dcol, row: cur.row + d.drow, height: cur.height }
    },
    moveParty: (to, speed) =>
      new Promise<void>((resolve) => {
        this.moves.push({ who: 'player', to, stepMs: SPEED_MS[speed] ?? 130, acc: 0, resolve })
      }),
    nudgeParty: (dx, dy) => {
      const p = this.view.player
      const d = pixelDeltaToGridDelta(dx, dy)
      p.pos = { col: p.pos.col + d.dcol, row: p.pos.row + d.drow, height: p.pos.height }
      p.gesture = null
    },
    cameraPan: async (dx, dy, frames) => {
      this.log(`🎥 镜头平移 (${dx},${dy})×${frames}`)
    },
    cameraSnap: (to) => this.log(to ? `🎥 镜头定位 (${to.col},${to.row})` : '🎥 镜头回正'),
    setEntityAuto: (id, stages) => this.log(`🔁 ${id} 换巡逻脚本(${stages.length} 段)`),
    setEntityTrigger: (id, stages) => this.log(`🔗 ${id} 换触发脚本(${stages.length} 段)`),
    setEntityTriggerMode: (id, on, range) =>
      this.log(`🔗 ${id} 触发方式 ${on ?? '关'}${range ?? ''}`),
    startBattle: async (team) => {
      this.log(`⚔ 战斗 敌队 ${team} → 按胜利继续`)
      return 'win'
    },
    teleportOut: async () => {
      this.log('🌀 传送出口(引路蜂)→ 编辑器预览按「不灵」')
      return false
    },
    playVideo: async (videoId) => this.log(`🎬 过场视频 videos/${videoId}.mp4(编辑器预览桩)`),
    playRng: async (chunkIdx) => this.log(`🎞 过场 RNG chunk ${chunkIdx}(编辑器预览桩)`),
    openShop: async (shop, mode) => this.log(`🏪 商店 #${shop}(${mode === 'buy' ? '买' : '卖'})`),
    confirm: async () => {
      this.log('❓ 是/否 → 按「是」继续(v0 桩)')
      return true
    },
    query: {
      hasItem: () => false,
      money: () => 0,
      inParty: () => false,
    },
    report: (msg) => this.log(`⚠ ${msg}`),
    // B8 遇敌(预览语义:追逐记日志;消失走 overlay;读档/战败不真执行)
    chaseStep: async (entityId) => {
      this.log(`👣 ${entityId} 追逐玩家一步`)
      await this.host.wait(160)
    },
    vanishEntity: (entityId, seconds) => {
      this.ov(entityId).hidden = true
      this.log(`⊘ ${entityId} 消失 ${seconds}s(重生)`)
    },
    loadLastSave: async () => this.log('📂 读最近存档(预览不执行)'),
    gameOver: async () => this.log('💀 战败流程:渐红 + 文案 + 读档(预览不执行)'),
  }
}
