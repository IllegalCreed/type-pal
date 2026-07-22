import { createHash } from 'node:crypto'
import type {
  ActorDef,
  AssetId,
  Command,
  EntityDef,
  SceneDef,
  ScriptChunkV1,
  ScriptIndexV1,
  SpriteDef,
} from '@type-pal/content'
import { checkScriptIndex, resolveEntitySpriteId } from '@type-pal/content'

/**
 * C2-ACT 的只读迁移普查。
 *
 * 这里故意不复用编辑器的“可视化预览”投影。预览可以忽略副作用并采用可读速度；迁移准入必须按
 * ScriptRunner 的真实控制流和节拍证明等价：每条正常命令后 100ms、显式 wait 额外计时、stage 返回后
 * 40ms 让步。该模块同时是后续动作重写和差分 oracle 的唯一分类真源。
 */

export const PAL_AUTO_COMMAND_PACE_MS = 100
export const PAL_AUTO_STAGE_YIELD_MS = 40
const MAX_MACHINE_STEPS = 100_000

export type PalSpriteActionRejectReason =
  | 'no-visual-source'
  | 'actor-source'
  | 'missing-sprite-definition'
  | 'non-static-layout'
  | 'missing-frame-count'
  | 'missing-script'
  | 'call-cycle'
  | 'zero-time-cycle'
  | 'machine-budget'
  | 'random-branch'
  | 'conditional-branch'
  | 'movement'
  | 'state-or-visibility'
  | 'position-or-layer'
  | 'set-auto-or-trigger'
  | 'cross-entity'
  | 'facing-change'
  | 'mixed-frame-mode'
  | 'invalid-frame'
  | 'stop-script'
  | 'unsupported-command'
  | 'finite-intro'
  | 'no-visible-action'
  | 'external-write'

export interface PalSpriteActionSoundCue {
  kind: 'sound'
  asset: AssetId
}

/** 与待落地 SpriteActionStep 同构；重复相邻 frame 是合法的 cue 时间边界，不得合并。 */
export interface PalSpriteActionTimelineStep {
  frame: number
  durationMs: number
  cues?: PalSpriteActionSoundCue[]
}

export interface NormalizedPalActionTimeline {
  steps: PalSpriteActionTimelineStep[]
  loopFrom: number
  durationMs: number
  cycleDurationMs: number
  /** 精确身份包含启动段、逐步时长、cue 与 loopFrom。 */
  exactTimelineKey: string
  /** 仅稳态循环；循环旋转后取字典序最小值，用于报告潜在共享族，不作为首批重写依据。 */
  steadyCycleKey: string
  phaseMs: number
  /** 稳态本身可见，或只在首次进入时有可见变化、随后稳定定格。 */
  behavior: 'loop' | 'finite-intro'
}

export type PalEntityWriteCategory =
  | 'frame'
  | 'facing'
  | 'motion'
  | 'position'
  | 'state'
  | 'layer'
  | 'auto-binding'
  | 'trigger-binding'

export interface PalSpriteIncomingWriteSite {
  rootId: string
  ownerSceneId?: string
  ownerEntityId?: string
  commandPath: string
  kind: Command['kind']
  category: PalEntityWriteCategory
  target: string
  rootKind?: NamedCommandRoot['kind']
  /** 从显式内容根到本命令的调用/动态绑定链；用于审计“为何此脚本会执行”。 */
  activatedBy: PalScriptActivationEvidence[]
}

export interface PalScriptActivationEvidence {
  installerRootId: string
  commandPath: string
  kind:
    | 'callScript'
    | 'jumpScript'
    | 'setEntityAuto'
    | 'setEntityTrigger'
    | 'setSceneOnEnter'
    | 'setSceneOnTeleport'
  scriptId?: string
  self?: string
}

export interface NamedCommandRoot {
  id: string
  body: readonly Command[]
  ownerSceneId?: string
  ownerEntityId?: string
  kind?: 'auto' | 'trigger' | 'scene' | 'extra' | 'dynamic'
  /** 显式执行上下文；缺省时实体根回退 ownerEntityId，场景/全局根为 undefined。 */
  self?: string
  /** 动态根可能被多个安装点激活；数组在 fixed point 中聚合并进入摘要。 */
  activatedBy?: PalScriptActivationEvidence[]
}

export interface PalSpriteActionCensusInput {
  scenes: readonly SceneDef[]
  actors?: readonly ActorDef[]
  sprites: readonly SpriteDef[]
  scriptIndex: ScriptIndexV1
  scriptChunks: Readonly<Record<string, ScriptChunkV1>>
  frameCountByAsset: ReadonlyMap<AssetId, number>
  extraRoots?: readonly NamedCommandRoot[]
}

export interface PalSpriteAutoAnalysis {
  sceneId: string
  entityId: string
  spriteId?: string
  asset?: AssetId
  source: 'direct' | 'actor' | 'zone'
  ownAutoRootIds: string[]
  reasons: PalSpriteActionRejectReason[]
  primaryReason?: PalSpriteActionRejectReason
  timeline?: NormalizedPalActionTimeline
  referencedScriptIds: string[]
  scriptInvocations: Array<{ scriptId: string; self?: string; commandPath: string }>
  internalWrites: PalSpriteIncomingWriteSite[]
  externalWrites: PalSpriteIncomingWriteSite[]
}

export interface PalSpriteActionCensusReport {
  version: 2
  timing: { commandPaceMs: number; stageYieldMs: number }
  summary: {
    page0Auto: number
    directSprite: number
    actorSource: number
    noVisualSource: number
    provenBeforeIncomingWrites: number
    rejectedByExternalWrites: number
    acceptedInstances: number
    acceptedSpriteDefinitions: number
    exactActions: number
    steadyCycleFamilies: number
    finiteIntroInstances: number
  }
  reasonCounts: Partial<Record<PalSpriteActionRejectReason, number>>
  primaryReasonCounts: Partial<Record<PalSpriteActionRejectReason, number>>
  /**
   * 因 incoming write 被拒的实例数；同一实例同一类别只计一次，不同类别可重叠。
   * 这里统计实例而不是命令条数，避免共享脚本或重复调用把风险规模放大成误导数字。
   */
  externalWriteCategoryCounts: Partial<Record<PalEntityWriteCategory, number>>
  digests: {
    acceptedSites: string
    rejections: string
    actions: string
  }
  instances: PalSpriteAutoAnalysis[]
  actions: Array<{
    spriteId: string
    exactTimelineKey: string
    steadyCycleKey: string
    timeline: NormalizedPalActionTimeline
    sites: Array<{ sceneId: string; entityId: string }>
  }>
}

interface ScriptLookup {
  byId: Map<string, readonly Command[]>
}

function stableDigest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function createScriptLookup(
  index: ScriptIndexV1,
  chunks: Readonly<Record<string, ScriptChunkV1>>,
): ScriptLookup {
  checkScriptIndex(index)
  const byId = new Map<string, readonly Command[]>()
  for (const [chunkId, chunk] of Object.entries(chunks)) {
    if (chunk.id !== chunkId)
      throw new Error(`sprite-action census: chunk id 不匹配 ${chunkId} != ${chunk.id}`)
    for (const [id, body] of Object.entries(chunk.scripts)) {
      if (byId.has(id)) throw new Error(`sprite-action census: 重复脚本 id ${id}`)
      byId.set(id, body)
    }
  }
  return { byId }
}

function scriptBody(lookup: ScriptLookup, id: string): readonly Command[] | undefined {
  // ref.chunk 只是加载提示；稳定身份是 id。重分桶或旧 hint 不得改变普查结果。
  return lookup.byId.get(id)
}

const REASON_PRIORITY: readonly PalSpriteActionRejectReason[] = [
  'no-visual-source',
  'actor-source',
  'missing-sprite-definition',
  'non-static-layout',
  'missing-frame-count',
  'missing-script',
  'call-cycle',
  'zero-time-cycle',
  'machine-budget',
  'random-branch',
  'conditional-branch',
  'movement',
  'state-or-visibility',
  'position-or-layer',
  'set-auto-or-trigger',
  'cross-entity',
  'facing-change',
  'mixed-frame-mode',
  'invalid-frame',
  'stop-script',
  'unsupported-command',
  'finite-intro',
  'no-visible-action',
  'external-write',
]

function sortReasons(
  reasons: ReadonlySet<PalSpriteActionRejectReason>,
): PalSpriteActionRejectReason[] {
  return REASON_PRIORITY.filter((reason) => reasons.has(reason))
}

function firstReason(reasons: readonly PalSpriteActionRejectReason[]) {
  return reasons[0]
}

interface SafetyScan {
  reasons: Set<PalSpriteActionRejectReason>
  referencedScriptIds: Set<string>
  sawExplicitFrame: boolean
  sawImplicitFrame: boolean
  sawSound: boolean
  visibleFrames: Set<number>
  scriptInvocations: Map<string, { scriptId: string; self?: string; commandPath: string }>
}

function nestedBodies(command: Command): readonly (readonly Command[])[] {
  switch (command.kind) {
    case 'branch':
      return command.else ? [command.then, command.else] : [command.then]
    case 'startBattle':
      return [command.onLose ?? [], command.onFlee ?? []]
    case 'teleportOut':
      return [command.onFail ?? []]
    case 'confirm':
      return [command.onNo]
    default:
      return []
  }
}

function unsafeReason(command: Command): PalSpriteActionRejectReason {
  switch (command.kind) {
    case 'moveEntity':
    case 'stepEntity':
    case 'nudgeEntity':
    case 'chasePlayer':
    case 'ride':
      return 'movement'
    case 'setEntityState':
    case 'setMultiEntityState':
    case 'vanishEntity':
      return 'state-or-visibility'
    case 'setEntityPos':
    case 'setEntityPosRelParty':
    case 'setEntityLayer':
      return 'position-or-layer'
    case 'setEntityAuto':
    case 'setEntityTrigger':
    case 'setEntityTriggerMode':
      return 'set-auto-or-trigger'
    default:
      return 'unsupported-command'
  }
}

function scanSafetyBody(args: {
  body: readonly Command[]
  path: string
  self: string | undefined
  entity: EntityDef
  frameCount: number
  lookup: ScriptLookup
  scan: SafetyScan
  visitedScripts: Set<string>
  activeCalls: Set<string>
}): void {
  const { entity, frameCount, lookup, scan } = args
  for (let commandIndex = 0; commandIndex < args.body.length; commandIndex++) {
    const command = args.body[commandIndex]!
    const commandPath = `${args.path}/${commandIndex}`
    switch (command.kind) {
      case 'setEntityFrame':
        if (command.entity !== entity.id) scan.reasons.add('cross-entity')
        else {
          scan.sawExplicitFrame = true
          scan.visibleFrames.add(command.frame)
          if (!Number.isInteger(command.frame) || command.frame < 0 || command.frame >= frameCount)
            scan.reasons.add('invalid-frame')
        }
        break
      case 'animEntity':
        if (command.entity !== entity.id) scan.reasons.add('cross-entity')
        else scan.sawImplicitFrame = true
        break
      case 'setEntityFacing':
        if (command.entity !== entity.id) scan.reasons.add('cross-entity')
        else if (command.facing !== (entity.facing ?? 'down')) scan.reasons.add('facing-change')
        break
      case 'wait':
        break
      case 'playSound':
        scan.sawSound = true
        break
      case 'stopScript':
        scan.reasons.add('stop-script')
        break
      case 'branch':
        scan.reasons.add(command.cond.kind === 'chance' ? 'random-branch' : 'conditional-branch')
        nestedBodies(command).forEach((body, nestedIndex) => {
          scanSafetyBody({
            ...args,
            body,
            path: `${commandPath}/nested:${nestedIndex}`,
            visitedScripts: new Set(args.visitedScripts),
          })
        })
        break
      case 'callScript':
      case 'jumpScript': {
        const nextSelf = command.self ?? args.self
        if (nextSelf !== entity.id) scan.reasons.add('cross-entity')
        const id = command.ref.id
        scan.referencedScriptIds.add(id)
        const invocationKey = JSON.stringify([id, nextSelf ?? null, commandPath])
        scan.scriptInvocations.set(invocationKey, {
          scriptId: id,
          ...(nextSelf ? { self: nextSelf } : {}),
          commandPath,
        })
        const body = scriptBody(lookup, id)
        if (!body) {
          scan.reasons.add('missing-script')
          break
        }
        const key = JSON.stringify([id, nextSelf ?? null])
        if (command.kind === 'callScript' && args.activeCalls.has(key)) {
          scan.reasons.add('call-cycle')
          break
        }
        if (args.visitedScripts.has(key)) break
        const visitedScripts = new Set(args.visitedScripts).add(key)
        const activeCalls = new Set(args.activeCalls)
        if (command.kind === 'callScript') activeCalls.add(key)
        scanSafetyBody({
          ...args,
          body,
          path: `${commandPath}/${command.kind}:${id}`,
          self: nextSelf,
          visitedScripts,
          activeCalls,
        })
        if (command.kind === 'jumpScript') return // 尾转移后的当前 body 命令不可达。
        break
      }
      default:
        scan.reasons.add(unsafeReason(command))
        nestedBodies(command).forEach((body, nestedIndex) => {
          scanSafetyBody({
            ...args,
            body,
            path: `${commandPath}/nested:${nestedIndex}`,
            visitedScripts: new Set(args.visitedScripts),
          })
        })
        break
    }
  }
}

interface TimedEvent {
  atMs: number
  frame: number
  cues: PalSpriteActionSoundCue[]
}

interface Cursor {
  key: string
  body: readonly Command[]
  index: number
}

interface ReturnCursor extends Cursor {
  /** callScript 正常/stop 返回后，caller 的 call 命令本身还要 pace。 */
  paceOnReturn: boolean
}

interface Machine {
  stage: number
  cursor: Cursor
  stack: ReturnCursor[]
  timeMs: number
  frame: number
  frameMode: 'none' | 'explicit' | 'implicit'
  implicitFrame: number
  events: TimedEvent[]
}

function addFrameEvent(machine: Machine, frame: number): void {
  machine.frame = frame
  const last = machine.events.at(-1)
  if (last?.atMs === machine.timeMs) {
    last.frame = frame
    return
  }
  // 即使像素帧相同也保留显式“进入帧”边界。它可能是循环起点，或承载下一条中途 cue 的相位；
  // 自动合并会把 sprite-96 的 sound 提前。
  machine.events.push({ atMs: machine.timeMs, frame, cues: [] })
}

function addSoundEvent(machine: Machine, asset: AssetId): void {
  const cue: PalSpriteActionSoundCue = { kind: 'sound', asset }
  const last = machine.events.at(-1)
  if (last?.atMs === machine.timeMs && last.frame === machine.frame) {
    last.cues.push(cue)
    return
  }
  machine.events.push({ atMs: machine.timeMs, frame: machine.frame, cues: [cue] })
}

function cursorKey(cursor: Cursor): string {
  return `${cursor.key}@${cursor.index}`
}

function machineKey(machine: Machine, frameCount: number): string {
  return [
    machine.stage,
    cursorKey(machine.cursor),
    machine.stack.map(cursorKey).join('>'),
    machine.frameMode,
    machine.frame,
    machine.implicitFrame % frameCount,
  ].join('|')
}

function sameTimedEvent(left: TimedEvent, right: TimedEvent, offsetMs: number): boolean {
  return (
    left.atMs + offsetMs === right.atMs &&
    left.frame === right.frame &&
    JSON.stringify(left.cues) === JSON.stringify(right.cues)
  )
}

/**
 * VM 状态循环点可能落在 frame 命令后的 pace 边界。若循环前缀的可见事件与稳态尾段完全相同，
 * 把可见循环起点向前收缩；只改变动作表达，不改变 frame/cue trace。
 */
function earliestObservableCycle(args: {
  events: readonly TimedEvent[]
  cycleStartMs: number
  cycleEndMs: number
}): { cycleStartMs: number; cycleEndMs: number } {
  const period = args.cycleEndMs - args.cycleStartMs
  const candidates = [
    ...new Set(
      args.events.filter((event) => event.atMs < args.cycleStartMs).map((event) => event.atMs),
    ),
  ].sort((left, right) => left - right)
  let best = args.cycleStartMs
  for (const candidate of candidates) {
    const prefix = args.events.filter(
      (event) => event.atMs >= candidate && event.atMs < args.cycleStartMs,
    )
    const suffix = args.events.filter(
      (event) => event.atMs >= candidate + period && event.atMs < args.cycleEndMs,
    )
    if (
      prefix.length > 0 &&
      prefix.length === suffix.length &&
      prefix.every((event, index) => sameTimedEvent(event, suffix[index]!, period))
    ) {
      best = candidate
      break
    }
  }
  return { cycleStartMs: best, cycleEndMs: best + period }
}

function targetStage(current: number, stages: readonly { next?: 'advance' | number }[]): number {
  const next = stages[current]?.next
  const raw = next === undefined ? current : next === 'advance' ? current + 1 : next
  return Math.max(0, Math.min(raw, stages.length - 1))
}

function mergeBoundaryEvents(
  events: readonly TimedEvent[],
  frameAtBoundary: (atMs: number) => number,
  boundaries: readonly number[],
): TimedEvent[] {
  const all = [
    ...events.map((event) => ({ ...event, cues: [...event.cues] })),
    ...boundaries.map((atMs) => ({ atMs, frame: frameAtBoundary(atMs), cues: [] })),
  ].sort((left, right) => left.atMs - right.atMs)
  const merged: TimedEvent[] = []
  for (const event of all) {
    const last = merged.at(-1)
    if (last?.atMs === event.atMs) {
      // 边界哨兵无 cue；真实事件的 frame/cue 始终保留。
      if (event.cues.length) {
        last.frame = event.frame
        last.cues.push(...event.cues)
      }
    } else merged.push(event)
  }
  return merged
}

function canonicalCycleRotation(steps: readonly PalSpriteActionTimelineStep[]): {
  key: string
  phaseMs: number
} {
  if (!steps.length) return { key: '[]', phaseMs: 0 }
  const rotations = steps.map((_, offset) => ({
    offset,
    key: JSON.stringify([...steps.slice(offset), ...steps.slice(0, offset)]),
  }))
  const best = rotations.sort((left, right) => left.key.localeCompare(right.key))[0]!
  // canonical = current.rotate(best.offset)。反推 current 在 canonical 中的起始下标，作为实例相位。
  const currentStartInCanonical = (steps.length - best.offset) % steps.length
  const canonical = [...steps.slice(best.offset), ...steps.slice(0, best.offset)]
  return {
    key: best.key,
    phaseMs: canonical
      .slice(0, currentStartInCanonical)
      .reduce((total, step) => total + step.durationMs, 0),
  }
}

/** 把有时标的 frame/cue 事件按循环边界切成不可丢 cue 偏移的 action steps。 */
export function normalizePalActionTrace(args: {
  events: readonly TimedEvent[]
  cycleStartMs: number
  cycleEndMs: number
}): NormalizedPalActionTimeline {
  const { cycleStartMs, cycleEndMs } = args
  if (!(cycleEndMs > cycleStartMs) || cycleStartMs < 0)
    throw new Error('sprite-action census: 非法循环时间边界')
  const sorted = [...args.events].sort((left, right) => left.atMs - right.atMs)
  if (!sorted.length || sorted[0]!.atMs > 0)
    throw new Error('sprite-action census: trace 缺 t=0 可见帧')
  const frameAtBoundary = (atMs: number): number => {
    let frame = sorted[0]!.frame
    for (const event of sorted) {
      if (event.atMs > atMs) break
      frame = event.frame
    }
    return frame
  }
  const events = mergeBoundaryEvents(sorted, frameAtBoundary, [0, cycleStartMs, cycleEndMs]).filter(
    (event) => event.atMs >= 0 && event.atMs <= cycleEndMs,
  )
  const steps: PalSpriteActionTimelineStep[] = []
  let loopFrom = -1
  for (let index = 0; index < events.length - 1; index++) {
    const event = events[index]!
    const next = events[index + 1]!
    const durationMs = next.atMs - event.atMs
    if (durationMs <= 0) continue
    if (event.atMs === cycleStartMs) loopFrom = steps.length
    steps.push({
      frame: event.frame,
      durationMs,
      ...(event.cues.length ? { cues: [...event.cues] } : {}),
    })
  }
  if (!steps.length || loopFrom < 0)
    throw new Error('sprite-action census: trace 未形成非空循环 steps')
  const cycle = steps.slice(loopFrom)
  const exactTimelineKey = JSON.stringify({ steps, loopFrom })
  const steady = canonicalCycleRotation(cycle)
  return {
    steps,
    loopFrom,
    durationMs: cycleEndMs,
    cycleDurationMs: cycleEndMs - cycleStartMs,
    exactTimelineKey,
    steadyCycleKey: steady.key,
    phaseMs: steady.phaseMs,
    behavior: 'loop',
  }
}

function traceDeterministicAuto(args: {
  stages: readonly { body: readonly Command[]; next?: 'advance' | number }[]
  entity: EntityDef
  frameCount: number
  lookup: ScriptLookup
}): NormalizedPalActionTimeline {
  const { stages, frameCount, lookup } = args
  const rootCursor = (stage: number): Cursor => ({
    key: `stage:${stage}`,
    body: stages[stage]?.body ?? [],
    index: 0,
  })
  const machine: Machine = {
    stage: 0,
    cursor: rootCursor(0),
    stack: [],
    timeMs: 0,
    frame: 0,
    frameMode: 'none',
    implicitFrame: 0,
    events: [{ atMs: 0, frame: 0, cues: [] }],
  }
  const seen = new Map<string, number>()
  for (let machineSteps = 0; machineSteps < MAX_MACHINE_STEPS; machineSteps++) {
    const key = machineKey(machine, frameCount)
    const previous = seen.get(key)
    if (previous !== undefined) {
      if (machine.timeMs <= previous) throw new Error('zero-time-cycle')
      const cycle = earliestObservableCycle({
        events: machine.events,
        cycleStartMs: previous,
        cycleEndMs: machine.timeMs,
      })
      return normalizePalActionTrace({
        events: machine.events,
        ...cycle,
      })
    }
    seen.set(key, machine.timeMs)

    if (machine.cursor.index >= machine.cursor.body.length) {
      const caller = machine.stack.pop()
      if (caller) {
        machine.cursor = caller
        if (caller.paceOnReturn) machine.timeMs += PAL_AUTO_COMMAND_PACE_MS
        continue
      }
      machine.stage = targetStage(machine.stage, stages)
      machine.timeMs += PAL_AUTO_STAGE_YIELD_MS
      machine.cursor = rootCursor(machine.stage)
      continue
    }

    const command = machine.cursor.body[machine.cursor.index]!
    machine.cursor.index++
    switch (command.kind) {
      case 'setEntityFrame':
        machine.frameMode = 'explicit'
        addFrameEvent(machine, command.frame)
        machine.timeMs += PAL_AUTO_COMMAND_PACE_MS
        break
      case 'animEntity':
        machine.frameMode = 'implicit'
        machine.implicitFrame = (machine.implicitFrame + 1) % frameCount
        addFrameEvent(machine, machine.implicitFrame)
        machine.timeMs += PAL_AUTO_COMMAND_PACE_MS
        break
      case 'setEntityFacing':
        machine.timeMs += PAL_AUTO_COMMAND_PACE_MS
        break
      case 'wait':
        machine.timeMs += command.ms + PAL_AUTO_COMMAND_PACE_MS
        break
      case 'playSound':
        addSoundEvent(machine, command.asset)
        machine.timeMs += PAL_AUTO_COMMAND_PACE_MS
        break
      case 'callScript': {
        const body = scriptBody(lookup, command.ref.id)
        if (!body) throw new Error('missing-script')
        const targetKey = `script:${command.ref.id}`
        if (
          machine.cursor.key === targetKey ||
          machine.stack.some((cursor) => cursor.key === targetKey)
        )
          throw new Error('call-cycle')
        machine.stack.push({ ...machine.cursor, paceOnReturn: true })
        machine.cursor = { key: targetKey, body, index: 0 }
        break
      }
      case 'jumpScript': {
        const body = scriptBody(lookup, command.ref.id)
        if (!body) throw new Error('missing-script')
        machine.cursor = { key: `script:${command.ref.id}`, body, index: 0 }
        break
      }
      case 'stopScript': {
        const caller = machine.stack.pop()
        if (caller) {
          machine.cursor = caller
          machine.timeMs += PAL_AUTO_COMMAND_PACE_MS
        } else {
          machine.timeMs += PAL_AUTO_STAGE_YIELD_MS
          machine.cursor = rootCursor(machine.stage)
        }
        break
      }
      default:
        throw new Error(`unsupported-command:${command.kind}`)
    }
  }
  throw new Error('machine-budget')
}

function rootId(sceneId: string, entityId: string, page: number, kind: string, stage: number) {
  return `scene:${sceneId}:entity:${entityId}:page:${page}:${kind}:stage:${stage}`
}

function collectSceneRoots(scenes: readonly SceneDef[]): NamedCommandRoot[] {
  const roots: NamedCommandRoot[] = []
  for (const scene of scenes) {
    scene.onEnter?.forEach((stage, stageIndex) => {
      if (stage.entry?.prepare.length)
        roots.push({
          id: `scene:${scene.id}:on-enter:stage:${stageIndex}:entry:prepare`,
          body: stage.entry.prepare,
          ownerSceneId: scene.id,
          kind: 'scene',
        })
      roots.push({
        id: `scene:${scene.id}:on-enter:stage:${stageIndex}:body`,
        body: stage.body,
        ownerSceneId: scene.id,
        kind: 'scene',
      })
    })
    scene.onTeleport?.forEach((stage, stageIndex) => {
      roots.push({
        id: `scene:${scene.id}:on-teleport:stage:${stageIndex}`,
        body: stage.body,
        ownerSceneId: scene.id,
        kind: 'scene',
      })
    })
    scene.entities.forEach((entity) => {
      entity.pages?.forEach((page, pageIndex) => {
        page.trigger?.stages.forEach((stage, stageIndex) => {
          roots.push({
            id: rootId(scene.id, entity.id, pageIndex, 'trigger', stageIndex),
            body: stage.body,
            ownerSceneId: scene.id,
            ownerEntityId: entity.id,
            kind: 'trigger',
          })
        })
        page.auto?.stages.forEach((stage, stageIndex) => {
          roots.push({
            id: rootId(scene.id, entity.id, pageIndex, 'auto', stageIndex),
            body: stage.body,
            ownerSceneId: scene.id,
            ownerEntityId: entity.id,
            kind: 'auto',
          })
        })
      })
      if (Array.isArray(entity.hostile?.onLose))
        roots.push({
          id: `scene:${scene.id}:entity:${entity.id}:hostile:on-lose`,
          body: entity.hostile.onLose,
          ownerSceneId: scene.id,
          ownerEntityId: entity.id,
          kind: 'trigger',
        })
    })
  }
  return roots
}

function writeTargets(
  command: Command,
  self: string | undefined,
): Array<{ target: string; category: PalEntityWriteCategory }> {
  switch (command.kind) {
    case 'setEntityFrame':
    case 'animEntity':
      return [{ target: command.entity, category: 'frame' }]
    case 'setEntityFacing':
      return [{ target: command.entity, category: 'facing' }]
    case 'moveEntity':
    case 'stepEntity':
    case 'nudgeEntity':
    case 'ride':
      return [{ target: command.entity, category: 'motion' }]
    case 'chasePlayer':
      return self ? [{ target: self, category: 'motion' }] : []
    case 'setEntityPos':
    case 'setEntityPosRelParty':
      return [{ target: command.entity, category: 'position' }]
    case 'setEntityState':
      return [{ target: command.entity, category: 'state' }]
    case 'setMultiEntityState':
      return command.entities.map((target) => ({ target, category: 'state' as const }))
    case 'vanishEntity':
      return command.entity || self ? [{ target: command.entity ?? self!, category: 'state' }] : []
    case 'setEntityLayer':
      return [{ target: command.entity, category: 'layer' }]
    case 'setEntityAuto':
      return [{ target: command.entity, category: 'auto-binding' }]
    case 'setEntityTrigger':
    case 'setEntityTriggerMode':
      return [{ target: command.entity, category: 'trigger-binding' }]
    default:
      return []
  }
}

function collectRootWrites(args: {
  root: NamedCommandRoot
  lookup: ScriptLookup
  writes: Map<string, PalSpriteIncomingWriteSite[]>
  enqueueBindingRoot: (
    command: Extract<
      Command,
      {
        kind: 'setEntityAuto' | 'setEntityTrigger' | 'setSceneOnEnter' | 'setSceneOnTeleport'
      }
    >,
    evidence: PalScriptActivationEvidence,
  ) => void
}): void {
  const visited = new Set<string>()
  const walk = (body: readonly Command[], path: string, self: string | undefined): void => {
    for (let index = 0; index < body.length; index++) {
      const command = body[index]!
      const commandPath = `${path}/${index}`
      for (const write of writeTargets(command, self)) {
        const list = args.writes.get(write.target) ?? []
        list.push({
          rootId: args.root.id,
          ownerSceneId: args.root.ownerSceneId,
          ownerEntityId: args.root.ownerEntityId,
          commandPath,
          kind: command.kind,
          category: write.category,
          target: write.target,
          rootKind: args.root.kind,
          // 动态根的所有写 site 共享同一数组；fixed point 后发现的其它安装点也会补入证据。
          activatedBy: args.root.activatedBy ?? [],
        })
        args.writes.set(write.target, list)
      }
      if (command.kind === 'callScript' || command.kind === 'jumpScript') {
        const id = command.ref.id
        const nextSelf = command.self ?? self
        const visitKey = JSON.stringify([id, nextSelf ?? null])
        if (!visited.has(visitKey)) {
          visited.add(visitKey)
          const target = scriptBody(args.lookup, id)
          if (target) walk(target, `${commandPath}/${command.kind}:${id}`, nextSelf)
        }
        if (command.kind === 'jumpScript') return
        continue
      }
      if (command.kind === 'branch') {
        walk(command.then, `${commandPath}/then`, self)
        if (command.else) walk(command.else, `${commandPath}/else`, self)
        continue
      }
      if (
        command.kind === 'setEntityAuto' ||
        command.kind === 'setEntityTrigger' ||
        command.kind === 'setSceneOnEnter' ||
        command.kind === 'setSceneOnTeleport'
      ) {
        const bindingSelf =
          command.kind === 'setEntityAuto' || command.kind === 'setEntityTrigger'
            ? command.entity
            : undefined
        args.enqueueBindingRoot(command, {
          installerRootId: args.root.id,
          commandPath,
          kind: command.kind,
          ...(command.script ? { scriptId: command.script.id } : {}),
          ...(bindingSelf ? { self: bindingSelf } : {}),
        })
        // ScriptBinding 是安装给未来 runner 的执行根，不是当前命令的同步 nested body。
        continue
      }
      for (const [nestedIndex, nested] of nestedBodies(command).entries())
        walk(nested, `${commandPath}/nested:${nestedIndex}`, self)
      if (command.kind === 'stopScript') return
    }
  }
  walk(args.root.body, args.root.id, args.root.self ?? args.root.ownerEntityId)
}

function isExternalWrite(
  site: PalSpriteIncomingWriteSite,
  analysis: Pick<PalSpriteAutoAnalysis, 'sceneId' | 'entityId' | 'ownAutoRootIds'>,
): boolean {
  if (analysis.ownAutoRootIds.includes(site.rootId)) return false
  // provenance 按执行根而非 script id：自身 trigger 也会与默认 action 争夺帧所有权，不能因为
  // “同一个 entity”就从外部写入中豁免；否则 shared body 同时被 auto/trigger 引用会漏判。
  return true
}

export function analyzePalSpriteAutoInstance(args: {
  sceneId: string
  entity: EntityDef
  actorsById: Record<string, ActorDef>
  spritesById: ReadonlyMap<string, SpriteDef>
  frameCountByAsset: ReadonlyMap<AssetId, number>
  lookup: ScriptLookup
}): PalSpriteAutoAnalysis {
  const { sceneId, entity } = args
  const auto = entity.pages?.[0]?.auto
  if (!auto?.stages.length) throw new Error(`${sceneId}/${entity.id}: 缺 page0 auto`)
  const reasons = new Set<PalSpriteActionRejectReason>()
  const direct = 'sprite' in entity
  const actor = 'actor' in entity
  const spriteId = resolveEntitySpriteId(entity, args.actorsById)
  const source: PalSpriteAutoAnalysis['source'] = direct ? 'direct' : actor ? 'actor' : 'zone'
  if (!direct) reasons.add(actor ? 'actor-source' : 'no-visual-source')
  const definition = spriteId ? args.spritesById.get(spriteId) : undefined
  if (spriteId && !definition) reasons.add('missing-sprite-definition')
  if (definition && definition.layout.kind !== 'static') reasons.add('non-static-layout')
  const frameCount = definition ? args.frameCountByAsset.get(definition.asset) : undefined
  if (definition && frameCount === undefined) reasons.add('missing-frame-count')
  const ownAutoRootIds = auto.stages.map((_, stageIndex) =>
    rootId(sceneId, entity.id, 0, 'auto', stageIndex),
  )
  const scan: SafetyScan = {
    reasons,
    referencedScriptIds: new Set(),
    sawExplicitFrame: false,
    sawImplicitFrame: false,
    sawSound: false,
    visibleFrames: new Set([0]),
    scriptInvocations: new Map(),
  }
  if (frameCount !== undefined) {
    for (const [stageIndex, stage] of auto.stages.entries())
      scanSafetyBody({
        body: stage.body,
        path: rootId(sceneId, entity.id, 0, 'auto', stageIndex),
        self: entity.id,
        entity,
        frameCount,
        lookup: args.lookup,
        scan,
        visitedScripts: new Set(),
        activeCalls: new Set(),
      })
    if (scan.sawExplicitFrame && scan.sawImplicitFrame) reasons.add('mixed-frame-mode')
  }
  let timeline: NormalizedPalActionTimeline | undefined
  if (!reasons.size && frameCount !== undefined) {
    try {
      timeline = traceDeterministicAuto({
        stages: auto.stages,
        entity,
        frameCount,
        lookup: args.lookup,
      })
      const cycle = timeline.steps.slice(timeline.loopFrom)
      const distinctFrames = new Set(cycle.map((step) => step.frame))
      const hasSound = cycle.some((step) => step.cues?.some((cue) => cue.kind === 'sound'))
      if (distinctFrames.size < 2 && !hasSound) {
        const intro = timeline.steps.slice(0, timeline.loopFrom)
        const introHasSound = intro.some((step) => step.cues?.some((cue) => cue.kind === 'sound'))
        const introFrames = new Set([
          0,
          ...intro.map((step) => step.frame),
          ...(cycle[0] ? [cycle[0].frame] : []),
        ])
        if (timeline.loopFrom > 0 && (introHasSound || introFrames.size > 1)) {
          // 这类 PAL auto 首次播放后把持久 stage 停在末态；改成页默认动作会在场景重入时
          // 重播启动段，生命周期不等价，首批保留脚本并单独报告。
          timeline = { ...timeline, behavior: 'finite-intro' }
          reasons.add('finite-intro')
        } else reasons.add('no-visible-action')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('zero-time-cycle')) reasons.add('zero-time-cycle')
      else if (message.includes('machine-budget')) reasons.add('machine-budget')
      else if (message.includes('call-cycle')) reasons.add('call-cycle')
      else if (message.includes('missing-script')) reasons.add('missing-script')
      else reasons.add('unsupported-command')
    }
  }
  const ordered = sortReasons(reasons)
  return {
    sceneId,
    entityId: entity.id,
    spriteId,
    asset: definition?.asset,
    source,
    ownAutoRootIds,
    reasons: ordered,
    primaryReason: firstReason(ordered),
    timeline,
    referencedScriptIds: [...scan.referencedScriptIds].sort(),
    scriptInvocations: [...scan.scriptInvocations.values()].sort(
      (left, right) =>
        left.scriptId.localeCompare(right.scriptId) ||
        (left.self ?? '').localeCompare(right.self ?? '') ||
        left.commandPath.localeCompare(right.commandPath),
    ),
    internalWrites: [],
    externalWrites: [],
  }
}

function increment<K extends string>(record: Partial<Record<K, number>>, key: K): void {
  record[key] = (record[key] ?? 0) + 1
}

/** 全工程稳定普查；返回数组和计数均排序，CLI 连续运行应字节一致。 */
export function auditPalSpriteActions(
  input: PalSpriteActionCensusInput,
): PalSpriteActionCensusReport {
  const lookup = createScriptLookup(input.scriptIndex, input.scriptChunks)
  const actorsById = Object.fromEntries((input.actors ?? []).map((actor) => [actor.id, actor]))
  const spritesById = new Map(input.sprites.map((sprite) => [sprite.id, sprite]))
  const instances: PalSpriteAutoAnalysis[] = []
  for (const scene of input.scenes)
    for (const entity of scene.entities)
      if (entity.pages?.[0]?.auto?.stages.length)
        instances.push(
          analyzePalSpriteAutoInstance({
            sceneId: scene.id,
            entity,
            actorsById,
            spritesById,
            frameCountByAsset: input.frameCountByAsset,
            lookup,
          }),
        )
  instances.sort(
    (left, right) =>
      left.sceneId.localeCompare(right.sceneId) || left.entityId.localeCompare(right.entityId),
  )

  const writes = new Map<string, PalSpriteIncomingWriteSite[]>()
  const roots = [...collectSceneRoots(input.scenes), ...(input.extraRoots ?? [])]
  const entitySceneById = new Map(
    input.scenes.flatMap((scene) => scene.entities.map((entity) => [entity.id, scene.id] as const)),
  )
  const dynamicRoots = new Map<string, NamedCommandRoot[]>()
  const enqueueBindingRoot = (
    command: Extract<
      Command,
      {
        kind: 'setEntityAuto' | 'setEntityTrigger' | 'setSceneOnEnter' | 'setSceneOnTeleport'
      }
    >,
    evidence: PalScriptActivationEvidence,
  ): void => {
    const entityBinding = command.kind === 'setEntityAuto' || command.kind === 'setEntityTrigger'
    const target = entityBinding ? command.entity : command.scene
    const self = entityBinding ? command.entity : undefined
    const sourceIdentity = command.script
      ? { script: command.script.id }
      : { stages: stableDigest(command.stages) }
    const stateKey = JSON.stringify([command.kind, target, self ?? null, sourceIdentity])
    const existing = dynamicRoots.get(stateKey)
    if (existing) {
      const activatedBy = existing[0]?.activatedBy
      if (
        activatedBy &&
        !activatedBy.some((candidate) => JSON.stringify(candidate) === JSON.stringify(evidence))
      )
        activatedBy.push(evidence)
      return
    }

    const bodies = command.script
      ? [scriptBody(lookup, command.script.id)].filter(
          (body): body is readonly Command[] => body !== undefined,
        )
      : command.stages.map((stage) => stage.body)
    if (!bodies.length) return
    const activatedBy = [evidence]
    const stateId = stableDigest([command.kind, target, self ?? null, sourceIdentity])
    const nextRoots = bodies.map(
      (body, stageIndex): NamedCommandRoot => ({
        id: `dynamic:${command.kind}:${target}:${stateId}:stage:${stageIndex}`,
        body,
        ownerSceneId: entityBinding ? entitySceneById.get(target) : target,
        ...(entityBinding ? { ownerEntityId: target } : {}),
        kind: 'dynamic',
        self,
        activatedBy,
      }),
    )
    dynamicRoots.set(stateKey, nextRoots)
    roots.push(...nextRoots)
  }
  // roots 会在扫描中因 set*Binding 增长；按稳定 binding state 做 fixed point，既覆盖未来执行根，
  // 也不会被自安装/互装脚本撑成无限 activation path。
  for (let rootIndex = 0; rootIndex < roots.length; rootIndex++)
    collectRootWrites({ root: roots[rootIndex]!, lookup, writes, enqueueBindingRoot })
  for (const rootSet of dynamicRoots.values())
    rootSet[0]?.activatedBy?.sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    )
  const sortedWritesFor = (entityId: string) =>
    [...(writes.get(entityId) ?? [])].sort(
      (left, right) =>
        left.rootId.localeCompare(right.rootId) ||
        left.commandPath.localeCompare(right.commandPath) ||
        left.category.localeCompare(right.category),
    )
  for (const instance of instances)
    instance.internalWrites = sortedWritesFor(instance.entityId).filter((site) =>
      instance.ownAutoRootIds.includes(site.rootId),
    )
  const provenBeforeIncomingWrites = instances.filter(
    (instance) => !instance.reasons.length && instance.timeline,
  )
  for (const instance of provenBeforeIncomingWrites) {
    const externalWrites = sortedWritesFor(instance.entityId).filter((site) =>
      isExternalWrite(site, instance),
    )
    if (!externalWrites.length) continue
    instance.externalWrites = externalWrites
    instance.reasons = sortReasons(new Set([...instance.reasons, 'external-write']))
    instance.primaryReason = firstReason(instance.reasons)
  }

  const accepted = instances.filter((instance) => !instance.reasons.length && instance.timeline)
  const actionGroups = new Map<string, PalSpriteActionCensusReport['actions'][number]>()
  for (const instance of accepted) {
    const timeline = instance.timeline!
    const key = JSON.stringify([instance.spriteId, timeline.exactTimelineKey])
    const group = actionGroups.get(key)
    if (group) group.sites.push({ sceneId: instance.sceneId, entityId: instance.entityId })
    else
      actionGroups.set(key, {
        spriteId: instance.spriteId!,
        exactTimelineKey: timeline.exactTimelineKey,
        steadyCycleKey: timeline.steadyCycleKey,
        timeline,
        sites: [{ sceneId: instance.sceneId, entityId: instance.entityId }],
      })
  }
  const actions = [...actionGroups.values()].sort(
    (left, right) =>
      left.spriteId.localeCompare(right.spriteId) ||
      left.exactTimelineKey.localeCompare(right.exactTimelineKey),
  )
  for (const action of actions)
    action.sites.sort(
      (left, right) =>
        left.sceneId.localeCompare(right.sceneId) || left.entityId.localeCompare(right.entityId),
    )

  const reasonCounts: PalSpriteActionCensusReport['reasonCounts'] = {}
  const primaryReasonCounts: PalSpriteActionCensusReport['primaryReasonCounts'] = {}
  const externalWriteCategoryCounts: PalSpriteActionCensusReport['externalWriteCategoryCounts'] = {}
  for (const instance of instances) {
    for (const reason of instance.reasons) increment(reasonCounts, reason)
    if (instance.primaryReason) increment(primaryReasonCounts, instance.primaryReason)
    for (const category of new Set(instance.externalWrites.map((site) => site.category)))
      increment(externalWriteCategoryCounts, category)
  }
  const acceptedSprites = new Set(accepted.map((instance) => instance.spriteId))
  const steadyFamilies = new Set(
    actions.map((action) => JSON.stringify([action.spriteId, action.steadyCycleKey])),
  )
  const timing = {
    commandPaceMs: PAL_AUTO_COMMAND_PACE_MS,
    stageYieldMs: PAL_AUTO_STAGE_YIELD_MS,
  }
  const writeEvidence = (site: PalSpriteIncomingWriteSite) => ({
    rootId: site.rootId,
    rootKind: site.rootKind ?? null,
    ownerSceneId: site.ownerSceneId ?? null,
    ownerEntityId: site.ownerEntityId ?? null,
    commandPath: site.commandPath,
    kind: site.kind,
    category: site.category,
    target: site.target,
    activatedBy: site.activatedBy,
  })
  const instanceEvidence = (instance: PalSpriteAutoAnalysis) => ({
    sceneId: instance.sceneId,
    entityId: instance.entityId,
    spriteId: instance.spriteId ?? null,
    source: instance.source,
    ownAutoRootIds: instance.ownAutoRootIds,
    reasons: instance.reasons,
    timeline: instance.timeline ?? null,
    scriptInvocations: instance.scriptInvocations,
    internalWrites: instance.internalWrites.map(writeEvidence),
    externalWrites: instance.externalWrites.map(writeEvidence),
  })
  return {
    version: 2,
    timing,
    summary: {
      page0Auto: instances.length,
      directSprite: instances.filter((instance) => instance.source === 'direct').length,
      actorSource: instances.filter((instance) => instance.source === 'actor').length,
      noVisualSource: instances.filter((instance) => instance.source === 'zone').length,
      provenBeforeIncomingWrites: provenBeforeIncomingWrites.length,
      rejectedByExternalWrites: provenBeforeIncomingWrites.filter((instance) =>
        instance.reasons.includes('external-write'),
      ).length,
      acceptedInstances: accepted.length,
      acceptedSpriteDefinitions: acceptedSprites.size,
      exactActions: actions.length,
      steadyCycleFamilies: steadyFamilies.size,
      finiteIntroInstances: instances.filter(
        (instance) => instance.timeline?.behavior === 'finite-intro',
      ).length,
    },
    reasonCounts,
    primaryReasonCounts,
    externalWriteCategoryCounts,
    digests: {
      acceptedSites: stableDigest({
        schema: 'pal-sprite-action-census/accepted-sites@2',
        timing,
        instances: accepted.map(instanceEvidence),
      }),
      rejections: stableDigest({
        schema: 'pal-sprite-action-census/rejections@2',
        timing,
        instances: instances.filter((instance) => instance.reasons.length).map(instanceEvidence),
      }),
      actions: stableDigest({
        schema: 'pal-sprite-action-census/actions@2',
        timing,
        actions: actions.map((action) => ({
          spriteId: action.spriteId,
          exactTimelineKey: action.exactTimelineKey,
          steadyCycleKey: action.steadyCycleKey,
          timeline: action.timeline,
          sites: action.sites,
        })),
      }),
    },
    instances,
    actions,
  }
}
