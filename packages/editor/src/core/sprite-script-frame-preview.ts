import type {
  AuthorCommand,
  AuthorScriptLibrary,
  Command,
  EntityAddress,
  EntityDef,
  ScriptRef,
  ScriptStage,
  SpriteDef,
} from '@type-pal/content'
import { actualFrameIndex, resolveEntityPoseTarget } from '@type-pal/reforge'
import type { EditorState } from './edit-session.js'
import {
  framePreviewTargetKey,
  MAX_VISUAL_CALL_DEPTH,
  MAX_VISUAL_SAMPLE_COMMANDS,
  type SpritePreviewEntity,
} from './sprite-script-preview-projection.js'

export interface SpriteTimedFrame {
  frame: number
  /** Preview hold in milliseconds. Positive waits accumulate with a 60 ms floor; absent waits use 200 ms. */
  holdMs: number
}

export interface SpriteAutomaticScriptPreviewVariant {
  id: string
  label: string
  steps: readonly SpriteTimedFrame[]
  note?: string
}

export type SpriteAutomaticScriptPreview =
  | { kind: 'once'; steps: readonly SpriteTimedFrame[] }
  | {
      kind: 'cycle'
      mode: 'explicit' | 'implicit'
      intro: readonly SpriteTimedFrame[]
      cycle: readonly SpriteTimedFrame[]
    }
  | {
      kind: 'variants'
      variants: readonly SpriteAutomaticScriptPreviewVariant[]
      note: string
    }
  | {
      kind: 'unavailable'
      reason: string
    }

function scriptCommands(
  state: Pick<EditorState, 'scriptChunks'>,
  ref: ScriptRef,
): readonly Command[] | undefined {
  if (!Object.hasOwn(state.scriptChunks, ref.chunk)) return undefined
  const scripts = state.scriptChunks[ref.chunk]?.scripts
  return scripts && Object.hasOwn(scripts, ref.id) ? scripts[ref.id] : undefined
}

interface FrameScanContext {
  steps: Array<{ frame: number; holdMs: number }>
  remainingCommands: number
  stack: Map<string, number>
  loopStartStep?: number
  frameMode?: 'explicit' | 'implicit'
  implicitAnimationStep: number
  allowImplicitAnimation: boolean
}

type FrameScanResult = 'complete' | 'loop' | 'uncertain'

export const DEFAULT_PREVIEW_HOLD_MS = 200
const MIN_PREVIEW_HOLD_MS = 60
const MAX_PREVIEW_COMMANDS = 512

function pushFrame(context: FrameScanContext, frame: number): void {
  context.steps.push({ frame, holdMs: 0 })
}

function addWait(context: FrameScanContext, ms: number): void {
  const current = context.steps.at(-1)
  if (current) current.holdMs += Math.max(0, ms)
}

/** 只接受能证明是单一路径的线性命令链；任何不确定控制流都返回 uncertain。 */
function collectDeterministicAutoFrames(
  state: Pick<EditorState, 'scriptChunks'>,
  commands: readonly Command[],
  targetKey: string,
  context: FrameScanContext,
  actualFrameCount: number,
  depth = 0,
): FrameScanResult {
  if (depth > 16) return 'uncertain'
  for (let index = 0; index < commands.length; index++) {
    if (context.remainingCommands <= 0) return 'uncertain'
    context.remainingCommands--
    const command = commands[index]!
    if (command.kind === 'setEntityFrame' && command.entity === targetKey) {
      if (context.frameMode === 'implicit') return 'uncertain'
      context.frameMode = 'explicit'
      pushFrame(context, actualFrameIndex(command.frame, actualFrameCount))
      continue
    }
    if (command.kind === 'animEntity' && command.entity === targetKey) {
      if (!context.allowImplicitAnimation || context.frameMode === 'explicit') return 'uncertain'
      context.frameMode = 'implicit'
      context.implicitAnimationStep++
      pushFrame(context, actualFrameIndex(context.implicitAnimationStep, actualFrameCount))
      continue
    }
    if (command.kind === 'setEntityFacing' && command.entity === targetKey) continue
    if (command.kind === 'wait') {
      addWait(context, command.ms)
      continue
    }
    if (command.kind !== 'callScript' && command.kind !== 'jumpScript') return 'uncertain'
    const key = `${command.ref.chunk}:${command.ref.id}`
    if (context.stack.has(key)) {
      if (command.kind !== 'jumpScript' || index !== commands.length - 1) return 'uncertain'
      context.loopStartStep = context.stack.get(key)!
      return 'loop'
    }
    const body = scriptCommands(state, command.ref)
    if (!body) return 'uncertain'
    context.stack.set(key, context.steps.length)
    const result = collectDeterministicAutoFrames(
      state,
      body,
      targetKey,
      context,
      actualFrameCount,
      depth + 1,
    )
    context.stack.delete(key)
    if (result === 'uncertain') return result
    if (result === 'loop') return 'loop'
    if (command.kind === 'jumpScript')
      return index === commands.length - 1 ? 'complete' : 'uncertain'
  }
  return 'complete'
}

function collapseAdjacentSteps(
  steps: readonly { frame: number; holdMs: number }[],
): Array<{ frame: number; holdMs: number }> {
  const result: Array<{ frame: number; holdMs: number }> = []
  for (const step of steps) {
    const previous = result.at(-1)
    if (previous?.frame === step.frame) previous.holdMs += step.holdMs
    else result.push({ ...step })
  }
  return result
}

function sameStep(
  left: { frame: number; holdMs: number },
  right: { frame: number; holdMs: number },
): boolean {
  return left.frame === right.frame && left.holdMs === right.holdMs
}

function collapseRepeatedSteps(
  steps: readonly { frame: number; holdMs: number }[],
): Array<{ frame: number; holdMs: number }> {
  const compact = collapseAdjacentSteps(steps)
  for (let size = 1; size <= Math.floor(compact.length / 2); size++) {
    if (compact.length % size !== 0) continue
    if (compact.every((step, index) => sameStep(step, compact[index % size]!)))
      return compact.slice(0, size)
  }
  return compact
}

function finalizeSteps(steps: readonly { frame: number; holdMs: number }[]): SpriteTimedFrame[] {
  return steps.map((step) => ({
    frame: step.frame,
    holdMs: step.holdMs > 0 ? Math.max(MIN_PREVIEW_HOLD_MS, step.holdMs) : DEFAULT_PREVIEW_HOLD_MS,
  }))
}

function stageTarget(stage: ScriptStage, current: number, count: number): number {
  const next = stage.next
  if (next === count) return count
  const raw = next === undefined ? current : next === 'advance' ? current + 1 : next
  return Math.max(0, Math.min(raw, count - 1))
}

function collectDeterministicStagePreview(
  state: Pick<EditorState, 'scriptChunks'>,
  entity: EntityDef,
  definition: SpriteDef,
  actualFrameCount: number,
  targetKey: string,
): SpriteAutomaticScriptPreview | undefined {
  const stages = entity.pages?.[0]?.auto?.stages
  if (!stages?.length) return undefined
  const context: FrameScanContext = {
    steps: [],
    remainingCommands: MAX_PREVIEW_COMMANDS,
    stack: new Map<string, number>(),
    implicitAnimationStep: 0,
    allowImplicitAnimation: definition.layout.kind === 'static',
  }
  const stageStarts = new Map<number, number>()
  let currentStage = 0
  let completed = false
  for (let transitions = 0; transitions <= stages.length; transitions++) {
    const repeatedAt = stageStarts.get(currentStage)
    if (repeatedAt !== undefined) {
      context.loopStartStep = repeatedAt
      break
    }
    stageStarts.set(currentStage, context.steps.length)
    const stage = stages[currentStage]
    if (!stage) return undefined
    if ('previewUncertainTransition' in stage && stage.previewUncertainTransition) return undefined
    const result = collectDeterministicAutoFrames(
      state,
      stage.body,
      targetKey,
      context,
      actualFrameCount,
    )
    if (result === 'uncertain') return undefined
    if (result === 'loop') break
    currentStage = stageTarget(stage, currentStage, stages.length)
    if (currentStage === stages.length) {
      completed = true
      break
    }
  }
  if (completed) {
    const steps = finalizeSteps(collapseAdjacentSteps(context.steps))
    return steps.length ? { kind: 'once', steps } : undefined
  }
  if (context.frameMode === 'implicit')
    return {
      kind: 'cycle',
      mode: 'implicit',
      intro: [],
      cycle: Array.from({ length: actualFrameCount }, (_, frame) => ({
        frame,
        holdMs: DEFAULT_PREVIEW_HOLD_MS,
      })),
    }
  const startIndex = context.loopStartStep ?? 0
  const intro = finalizeSteps(collapseAdjacentSteps(context.steps.slice(0, startIndex)))
  const cycle = finalizeSteps(collapseRepeatedSteps(context.steps.slice(startIndex)))
  return cycle.length ? { kind: 'cycle', mode: 'explicit', intro, cycle } : undefined
}

interface VisualBranchStrategy {
  id: string
  label: string
  pattern: readonly boolean[]
}

interface VisualSampleContext {
  state: Pick<EditorState, 'scriptChunks'>
  actualFrameCount: number
  strategy: VisualBranchStrategy
  branchIndex: number
  remainingCommands: number
  frameOverride?: number
  implicitAnimationStep: number
  steps: Array<{ frame: number; holdMs: number }>
  chancePercents: Set<number>
}

type VisualSampleOutcome =
  | { kind: 'empty'; bounded: boolean }
  | { kind: 'sampled'; bounded: boolean; variant: SpriteAutomaticScriptPreviewVariant }

class VisualScriptStopped {}

class VisualScriptJump {
  constructor(readonly ref: ScriptRef) {}
}

class VisualScriptBudgetExhausted {}

const MAX_VISUAL_SAMPLE_TICKS = 48

const VISUAL_BRANCH_STRATEGIES: readonly VisualBranchStrategy[] = [
  { id: 'miss', label: '分支示例：均未命中', pattern: [false] },
  { id: 'hit', label: '分支示例：均命中', pattern: [true] },
  { id: 'alternate-miss', label: '分支示例：交替（先未命中）', pattern: [false, true] },
  { id: 'alternate-hit', label: '分支示例：交替（先命中）', pattern: [true, false] },
  { id: 'sparse-hit', label: '分支示例：间歇命中', pattern: [false, false, true] },
  { id: 'frequent-hit', label: '分支示例：连续命中', pattern: [true, true, false] },
]

function visibleSampleFrame(context: VisualSampleContext): number {
  if (context.frameOverride !== undefined)
    return actualFrameIndex(context.frameOverride, context.actualFrameCount)
  return actualFrameIndex(context.implicitAnimationStep, context.actualFrameCount)
}

function pushVisibleSampleFrame(context: VisualSampleContext): void {
  const frame = visibleSampleFrame(context)
  const previous = context.steps.at(-1)
  if (previous?.frame !== frame) context.steps.push({ frame, holdMs: 0 })
}

function addVisualSampleWait(context: VisualSampleContext, ms: number): void {
  pushVisibleSampleFrame(context)
  const current = context.steps.at(-1)
  if (current) current.holdMs += Math.max(0, ms)
}

function chooseVisualChance(context: VisualSampleContext, percent: number): boolean {
  context.chancePercents.add(percent)
  if (percent <= 0) return false
  if (percent >= 100) return true
  const pattern = context.strategy.pattern
  const chosen = pattern[context.branchIndex % pattern.length] ?? false
  context.branchIndex++
  return chosen
}

function validateVisualCommandGraph(
  state: Pick<EditorState, 'scriptChunks'>,
  commands: readonly Command[],
  targetKey: string,
  context: { visited: Set<string>; remainingCommands: number },
): boolean {
  for (const command of commands) {
    if (context.remainingCommands-- <= 0) return false
    if (
      command.kind === 'setEntityFrame' ||
      command.kind === 'setEntityFacing' ||
      command.kind === 'animEntity'
    ) {
      if (command.entity !== targetKey) return false
      continue
    }
    if (command.kind === 'wait' || command.kind === 'returnScript') continue
    if (command.kind === 'branch') {
      if (!command.cond || command.cond.kind !== 'chance' || !Array.isArray(command.then))
        return false
      if (!validateVisualCommandGraph(state, command.then, targetKey, context)) return false
      if (command.else && !validateVisualCommandGraph(state, command.else, targetKey, context))
        return false
      continue
    }
    if (command.kind !== 'callScript' && command.kind !== 'jumpScript') return false
    if (command.self !== undefined && command.self !== targetKey) return false
    const key = `${command.ref.chunk}:${command.ref.id}`
    if (context.visited.has(key)) continue
    const body = scriptCommands(state, command.ref)
    if (!body) return false
    context.visited.add(key)
    if (!validateVisualCommandGraph(state, body, targetKey, context)) return false
  }
  return true
}

function runVisualSampleBody(
  commands: readonly Command[],
  context: VisualSampleContext,
  callDepth: number,
): void {
  for (const command of commands) {
    if (context.remainingCommands-- <= 0) throw new VisualScriptBudgetExhausted()
    if (command.kind === 'setEntityFrame') {
      context.frameOverride = command.frame
      pushVisibleSampleFrame(context)
      continue
    }
    if (command.kind === 'setEntityFacing') continue
    if (command.kind === 'animEntity') {
      context.implicitAnimationStep++
      if (context.frameOverride === undefined) pushVisibleSampleFrame(context)
      continue
    }
    if (command.kind === 'wait') {
      addVisualSampleWait(context, command.ms)
      continue
    }
    if (command.kind === 'returnScript') throw new VisualScriptStopped()
    if (command.kind === 'branch') {
      if (command.cond.kind !== 'chance') throw new VisualScriptBudgetExhausted()
      const arm = chooseVisualChance(context, command.cond.percent)
        ? command.then
        : (command.else ?? [])
      runVisualSampleBody(arm, context, callDepth)
      continue
    }
    if (command.kind === 'jumpScript') throw new VisualScriptJump(command.ref)
    if (command.kind === 'callScript') {
      if (callDepth >= MAX_VISUAL_CALL_DEPTH) throw new VisualScriptBudgetExhausted()
      const body = scriptCommands(context.state, command.ref)
      if (!body) throw new VisualScriptBudgetExhausted()
      try {
        runVisualSampleBoundary(body, context, callDepth + 1)
      } catch (error) {
        // 与 ScriptRunner.callScript 一致：callee 的 stop 只结束 callee，caller 从调用点继续。
        if (!(error instanceof VisualScriptStopped)) throw error
      }
    }
  }
}

function runVisualSampleBoundary(
  initialBody: readonly Command[],
  context: VisualSampleContext,
  callDepth: number,
): void {
  let body = initialBody
  while (true) {
    try {
      runVisualSampleBody(body, context, callDepth)
      return
    } catch (error) {
      if (!(error instanceof VisualScriptJump)) throw error
      const target = scriptCommands(context.state, error.ref)
      if (!target) throw new VisualScriptBudgetExhausted()
      body = target
    }
  }
}

function visualSampleStateKey(stage: number, context: VisualSampleContext): string {
  return [
    stage,
    context.frameOverride ?? 'none',
    context.implicitAnimationStep % context.actualFrameCount,
    context.branchIndex % context.strategy.pattern.length,
  ].join(':')
}

function sampleChanceStageGraph(
  state: Pick<EditorState, 'scriptChunks'>,
  entity: EntityDef,
  actualFrameCount: number,
  strategy: VisualBranchStrategy,
): VisualSampleOutcome | undefined {
  const stages = entity.pages?.[0]?.auto?.stages
  if (!stages?.length) return undefined
  const context: VisualSampleContext = {
    state,
    actualFrameCount,
    strategy,
    branchIndex: 0,
    remainingCommands: MAX_VISUAL_SAMPLE_COMMANDS,
    implicitAnimationStep: 0,
    steps: [],
    chancePercents: new Set(),
  }
  const seen = new Map<string, number>()
  let stageIndex = 0
  let cycleStart = 0
  let bounded = false
  for (let tick = 0; tick < MAX_VISUAL_SAMPLE_TICKS; tick++) {
    const key = visualSampleStateKey(stageIndex, context)
    const repeatedAt = seen.get(key)
    if (repeatedAt !== undefined) {
      cycleStart = repeatedAt
      break
    }
    seen.set(key, context.steps.length)
    const stage = stages[stageIndex]
    if (!stage) return undefined
    let stopped = false
    try {
      runVisualSampleBoundary(stage.body, context, 0)
    } catch (error) {
      if (error instanceof VisualScriptStopped) stopped = true
      else if (error instanceof VisualScriptBudgetExhausted) {
        bounded = true
        break
      } else throw error
    }
    if (!stopped) stageIndex = stageTarget(stage, stageIndex, stages.length)
    if (tick === MAX_VISUAL_SAMPLE_TICKS - 1) bounded = true
  }
  if (!context.steps.length) return { kind: 'empty', bounded }
  const stableSteps = context.steps.slice(cycleStart)
  const steps = finalizeSteps(
    bounded
      ? collapseAdjacentSteps(context.steps)
      : collapseRepeatedSteps(stableSteps.length ? stableSteps : context.steps),
  )
  const chanceNote = [...context.chancePercents]
    .sort((left, right) => left - right)
    .map((percent) => `${percent}%`)
    .join('、')
  return {
    kind: 'sampled',
    bounded,
    variant: {
      id: strategy.id,
      label: strategy.label,
      steps,
      note: `${chanceNote ? `${chanceNote} 为各判断的局部命中率` : '确定性控制流'}${bounded ? '；仅展示已分析的部分' : ''}`,
    },
  }
}

/**
 * 有界视觉投影：只接受当前实体的帧/朝向/等待与 chance/call/jump/stop 控制流。
 * 每条固定分支模式都是合法执行示例；它们不冒充完整概率分布或唯一循环。
 */
function collectSafeScriptProjection(
  state: Pick<EditorState, 'scriptChunks'>,
  entity: EntityDef,
  actualFrameCount: number,
  targetKey: string,
): SpriteAutomaticScriptPreview | undefined {
  const stages = entity.pages?.[0]?.auto?.stages
  if (!stages?.length) return undefined
  // Branch samples cannot claim a unique loop when any path can finish.
  if (
    stages.some(
      (stage) =>
        stage.next === stages.length ||
        ('previewUncertainTransition' in stage && stage.previewUncertainTransition),
    )
  )
    return undefined
  if (
    !validateVisualCommandGraph(
      state,
      stages.flatMap((stage) => stage.body),
      targetKey,
      {
        visited: new Set(),
        remainingCommands: MAX_PREVIEW_COMMANDS,
      },
    )
  )
    return undefined
  const samplesBySteps = new Map<string, Extract<VisualSampleOutcome, { kind: 'sampled' }>>()
  let bounded = false
  let unsampled = false
  for (const strategy of VISUAL_BRANCH_STRATEGIES) {
    const sample = sampleChanceStageGraph(state, entity, actualFrameCount, strategy)
    bounded ||= sample?.bounded ?? false
    if (!sample || sample.kind === 'empty') {
      unsampled = true
      continue
    }
    const { variant } = sample
    const key = JSON.stringify(variant.steps)
    const existing = samplesBySteps.get(key)
    if (!existing || (sample.bounded && !existing.bounded)) samplesBySteps.set(key, sample)
  }
  const variants = [...samplesBySteps.values()].map((sample) => sample.variant)
  if (!variants.length)
    return bounded
      ? {
          kind: 'unavailable',
          reason: '暂时无法推断这段脚本的帧序，请到场景中播放确认。',
        }
      : undefined
  if (variants.length === 1 && !bounded && !unsampled)
    return {
      kind: 'cycle',
      mode: 'explicit',
      intro: [],
      cycle: variants[0]!.steps,
    }
  return {
    kind: 'variants',
    variants,
    note:
      variants.length === 1
        ? '目前只能推断部分帧序，请到场景中播放确认。'
        : '下列是脚本的代表性合法分支示例，不是完整概率分布，也不是唯一循环。',
  }
}

type AuthorPreviewCondition = Extract<AuthorCommand, { kind: 'branch' }>['cond']

type FrameSampleSignal =
  | { kind: 'return' | 'break' }
  | { kind: 'continue'; loop?: string }
  | { kind: 'finish'; next: Extract<AuthorCommand, { kind: 'finishStep' }>['next'] }

function containsConditionalVisualLoop(
  body: readonly AuthorCommand[],
  sharedScripts: AuthorScriptLibrary,
  calls: ReadonlySet<string> = new Set(),
): boolean {
  return body.some((command) => {
    const contains = (nested: readonly AuthorCommand[]) =>
      containsConditionalVisualLoop(nested, sharedScripts, calls)
    switch (command.kind) {
      case 'loop':
        return command.mode !== 'forever' || contains(command.body)
      case 'repeat':
        return contains(command.body)
      case 'branch':
        return contains(command.then) || contains(command.else ?? [])
      case 'confirm':
        return contains(command.onYes) || contains(command.onNo)
      case 'startBattle':
        return contains(command.onLose ?? []) || contains(command.onFlee ?? [])
      case 'teleportOut':
        return contains(command.onFail ?? [])
      case 'callScript': {
        const script = sharedScripts[command.script]
        return (
          !calls.has(command.script) &&
          Boolean(
            script &&
              containsConditionalVisualLoop(
                script.body,
                sharedScripts,
                new Set([...calls, command.script]),
              ),
          )
        )
      }
      default:
        return false
    }
  })
}

/** Pure, bounded samples only. No world state, asynchronous hosts, or gameplay side effects. */
function collectCanonicalFrameSamples(
  entity: SpritePreviewEntity,
  actualFrameCount: number,
): SpriteAutomaticScriptPreview | undefined {
  const source = entity.spritePreviewScript
  if (!source) return undefined
  let remainingValidation = MAX_VISUAL_SAMPLE_COMMANDS
  const pureCondition = (condition: AuthorPreviewCondition): boolean => {
    if (--remainingValidation <= 0) return false
    if (condition.kind === 'chance') return true
    if (condition.kind === 'not') return pureCondition(condition.cond)
    if (condition.kind === 'all' || condition.kind === 'any')
      return condition.of.every(pureCondition)
    return false
  }
  const pureBody = (
    body: readonly AuthorCommand[],
    calls: ReadonlySet<string>,
    self: EntityAddress | undefined,
    loops: readonly (string | undefined)[] = [],
    root: 'flow' | 'script' = 'flow',
  ): boolean =>
    body.every((command) => {
      if (--remainingValidation <= 0) return false
      switch (command.kind) {
        case 'setEntityFrame':
        case 'setEntityFacing':
        case 'animEntity': {
          const target = resolveEntityPoseTarget(command.target, self)
          return target?.scene === source.self.scene && target.entity === source.self.entity
        }
        case 'wait':
          return true
        case 'breakLoop':
          return loops.length > 0
        case 'continueLoop':
          return loops.length > 0 && (!command.loop || loops.includes(command.loop))
        case 'returnScript':
          return root === 'script'
        case 'finishStep':
          return root === 'flow'
        case 'branch':
          return (
            pureCondition(command.cond) &&
            pureBody(command.then, calls, self, loops, root) &&
            pureBody(command.else ?? [], calls, self, loops, root)
          )
        case 'repeat':
          return pureBody(command.body, calls, self, [...loops, command.id], root)
        case 'loop':
          return (
            (command.mode === 'forever' || pureCondition(command.cond)) &&
            pureBody(command.body, calls, self, [...loops, command.id], root)
          )
        case 'callScript': {
          if (
            calls.has(command.script) ||
            calls.size >= MAX_VISUAL_CALL_DEPTH ||
            (command.self &&
              (command.self.scene !== source.self.scene ||
                command.self.entity !== source.self.entity))
          )
            return false
          const script = source.sharedScripts[command.script]
          if (!script || (script.self === 'none' && command.self)) return false
          const inherited = command.self ?? self
          if (script.self === 'required' && !inherited) return false
          return pureBody(
            script.body,
            new Set([...calls, command.script]),
            script.self === 'none' ? undefined : inherited,
            [],
            'script',
          )
        }
        default:
          return false
      }
    })
  if (
    !source.flow.stages.every(
      (stage) => !stage.entry && pureBody(stage.body, new Set(), source.self),
    )
  )
    return undefined

  const variants = new Map<string, SpriteAutomaticScriptPreviewVariant>()
  for (const strategy of VISUAL_BRANCH_STRATEGIES) {
    let remaining = MAX_VISUAL_SAMPLE_COMMANDS
    let branchIndex = 0
    let frameOverride: number | undefined
    let animationStep = 0
    let bounded = false
    const steps: Array<{ frame: number; holdMs: number }> = []
    const consume = () => {
      if (--remaining <= 0) throw new VisualScriptBudgetExhausted()
    }
    const visibleFrame = () => actualFrameIndex(frameOverride ?? animationStep, actualFrameCount)
    const push = () => {
      const frame = visibleFrame()
      if (steps.at(-1)?.frame !== frame) steps.push({ frame, holdMs: 0 })
    }
    const condition = (value: AuthorPreviewCondition): boolean => {
      consume()
      switch (value.kind) {
        case 'chance':
          if (value.percent <= 0) return false
          if (value.percent >= 100) return true
          return strategy.pattern[branchIndex++ % strategy.pattern.length] ?? false
        case 'not':
          return !condition(value.cond)
        case 'all':
          return value.of.every(condition)
        case 'any':
          return value.of.some(condition)
        default:
          throw new Error('非概率条件不能进入纯帧采样')
      }
    }
    const run = (body: readonly AuthorCommand[]): FrameSampleSignal | undefined => {
      for (const command of body) {
        consume()
        switch (command.kind) {
          case 'setEntityFrame':
            frameOverride = command.frame
            push()
            break
          case 'animEntity':
            animationStep++
            if (frameOverride === undefined) push()
            break
          case 'setEntityFacing':
            break
          case 'wait':
            push()
            steps[steps.length - 1]!.holdMs += command.ms
            break
          case 'branch': {
            const signal = run(condition(command.cond) ? command.then : (command.else ?? []))
            if (signal) return signal
            break
          }
          case 'returnScript':
            return { kind: 'return' }
          case 'finishStep':
            return { kind: 'finish', next: command.next }
          case 'breakLoop':
            return { kind: 'break' }
          case 'continueLoop':
            return { kind: 'continue', loop: command.loop }
          case 'repeat':
          case 'loop': {
            for (let iteration = 0; ; iteration++) {
              consume()
              if (command.kind === 'repeat' && iteration >= command.count) break
              if (command.kind === 'loop' && command.mode === 'while' && !condition(command.cond))
                break
              const signal = run(command.body)
              if (signal?.kind === 'break') break
              if (
                signal &&
                !(signal.kind === 'continue' && (!signal.loop || signal.loop === command.id))
              )
                return signal
              if (command.kind === 'loop' && command.mode === 'until' && condition(command.cond))
                break
            }
            break
          }
          case 'callScript': {
            const script = source.sharedScripts[command.script]
            if (!script) throw new Error('纯帧采样引用已消失')
            const signal = run(script.body)
            if (signal && signal.kind !== 'return') return signal
            break
          }
          default:
            throw new Error('非视觉指令不能进入纯帧采样')
        }
      }
      return undefined
    }
    try {
      let stageId: string | undefined = source.flow.initial
      for (let activation = 0; stageId && activation < MAX_VISUAL_SAMPLE_TICKS; activation++) {
        const stage = source.flow.stages.find((candidate) => candidate.id === stageId)
        if (!stage) break
        const signal = run(stage.body)
        const next = signal?.kind === 'finish' ? signal.next : stage.next
        stageId =
          typeof next === 'string'
            ? next
            : next?.kind === 'stage'
              ? next.stage
              : next?.kind === 'complete'
                ? undefined
                : stageId
        if (stageId && activation === MAX_VISUAL_SAMPLE_TICKS - 1) bounded = true
      }
    } catch (error) {
      if (!(error instanceof VisualScriptBudgetExhausted)) throw error
      bounded = true
    }
    if (!steps.length) continue
    const sampled = finalizeSteps(collapseAdjacentSteps(steps))
    variants.set(JSON.stringify(sampled), {
      id: strategy.id,
      label: strategy.label,
      steps: sampled,
      note: bounded ? '只展示这条路径的前一部分，请到场景中播放完整脚本。' : '代表性合法路径',
    })
  }
  return variants.size
    ? {
        kind: 'variants',
        variants: [...variants.values()],
        note: '下列是脚本的代表性合法分支示例，不是完整概率分布，也不是唯一循环。',
      }
    : undefined
}

export function previewAutomaticSpriteFrames(
  state: Pick<EditorState, 'scriptChunks'>,
  entity: SpritePreviewEntity,
  definition: SpriteDef,
  actualFrameCount: number | undefined,
): SpriteAutomaticScriptPreview | undefined {
  if (
    definition.layout.kind === 'directional' ||
    actualFrameCount === undefined ||
    !Number.isInteger(actualFrameCount) ||
    actualFrameCount <= 0
  )
    return undefined
  const canonical = entity.spritePreviewScript
  const targetKey = canonical ? framePreviewTargetKey(canonical.self) : entity.id
  const hasConditionalLoop = canonical?.flow.stages.some((stage) =>
    containsConditionalVisualLoop(stage.body, canonical.sharedScripts),
  )
  if (hasConditionalLoop) return collectCanonicalFrameSamples(entity, actualFrameCount)
  return (
    collectDeterministicStagePreview(state, entity, definition, actualFrameCount, targetKey) ??
    collectSafeScriptProjection(state, entity, actualFrameCount, targetKey) ??
    collectCanonicalFrameSamples(entity, actualFrameCount)
  )
}
