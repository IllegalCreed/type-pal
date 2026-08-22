import type {
  ActorDef,
  AuthorCommand,
  Command,
  EntityDef,
  AuthorSceneDef,
  ScriptChunkV1,
  ScriptCondition,
  AuthorScriptFlow,
  ScriptRef,
  ScriptStage,
  AuthorScriptLibrary,
  SpriteDef,
  SpriteDefinitionReference,
} from '@type-pal/content'
import { resolveEntitySpriteId } from '@type-pal/content'
import { actualFrameIndex } from '@type-pal/reforge'
import type { EditorState } from './edit-session.js'

type AuthorSceneEntityDef = AuthorSceneDef['entities'][number]

export interface SpriteTimedFrame {
  frame: number
  /** 编辑器预览的停留时间；显式 wait 原样保留，无 wait 时使用可读的预览默认值。 */
  holdMs: number
}

export interface SpriteAutomaticScriptPreviewVariant {
  id: string
  label: string
  steps: readonly SpriteTimedFrame[]
  note?: string
}

export type SpriteAutomaticScriptPreview =
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

export interface SpriteReferenceBehavior {
  label: string
  detail: string
  kind: 'default' | 'directional' | 'layout-loop' | 'script' | 'reference'
  /** 只在能安全解释实例 auto 脚本时提供；随机路径不会伪装成唯一循环。 */
  preview?: SpriteAutomaticScriptPreview
}

export interface SpriteAutomaticScriptBehaviorSummary {
  id: string
  label: string
  detail: string
  preview: SpriteAutomaticScriptPreview
  instanceCount: number
  sceneCount: number
}

/** 编辑器 UI 的实例行为位置；不是内容删除保护/保存门使用的持久引用边。 */
export interface SpriteAutomaticScriptInstanceSite {
  spriteId: string
  sceneId: string
  entityId: string
  site: string
  where: string
  via: 'direct' | 'actor'
}

function referencedSceneEntity(state: EditorState, reference: SpriteDefinitionReference) {
  const [, sceneId, entityKind, entityId] = reference.site.split(':')
  if (!sceneId || entityKind !== 'entity' || !entityId) return undefined
  const entity = state.scenes
    .find((scene) => scene.id === sceneId)
    ?.entities.find((candidate) => candidate.id === entityId)
  return entity ? { entity, entityId } : undefined
}

function actorsById(state: Pick<EditorState, 'actors'>): Record<string, ActorDef> {
  return Object.fromEntries(state.actors.map((actor) => [actor.id, actor])) as Record<
    string,
    ActorDef
  >
}

export interface CanonicalSpritePreviewState {
  scenes: readonly AuthorSceneDef[]
  sharedScripts: AuthorScriptLibrary
}

export const SCRIPT_PREVIEW_SHARED_CHUNK = '__author-script-preview/shared'

function projectPreviewCondition(
  condition: Extract<AuthorCommand, { kind: 'branch' | 'loop' }>['cond'],
): ScriptCondition {
  switch (condition.kind) {
    case 'entityState':
    case 'entityInScene':
    case 'facingEntity': {
      const { target, ...rest } = condition
      return { ...rest, entity: target.entity } as ScriptCondition
    }
    case 'all':
    case 'any':
      return {
        ...condition,
        of: condition.of.map((child) => projectPreviewCondition(child)),
      }
    case 'not':
      return { ...condition, cond: projectPreviewCondition(condition.cond) }
    default:
      return structuredClone(condition)
  }
}

function projectPreviewCommands(
  commands: readonly AuthorCommand[],
  self: { scene: string; entity: string },
  sharedScripts: AuthorScriptLibrary,
  depth = 0,
): Command[] {
  if (depth > MAX_VISUAL_CALL_DEPTH)
    return commands.map((command) => structuredClone(command) as Command)
  const projected: Command[] = []
  for (const command of commands) {
    switch (command.kind) {
      case 'setEntityFrame':
        projected.push({
          kind: 'setEntityFrame',
          entity: command.target.entity,
          frame: command.frame,
        })
        break
      case 'setEntityState':
        projected.push({
          kind: 'setEntityState',
          entity: command.target.entity,
          state: command.state,
        })
        break
      case 'setMultiEntityState':
        projected.push({
          kind: 'setMultiEntityState',
          entities: command.targets.map((target) => target.entity),
          state: command.state,
        })
        break
      case 'setEntityPos':
        projected.push({
          kind: 'setEntityPos',
          entity: command.target.entity,
          pos: structuredClone(command.pos),
        })
        break
      case 'setEntityPosRelParty':
        projected.push({
          kind: 'setEntityPosRelParty',
          entity: command.target.entity,
          dcol: command.dcol,
          drow: command.drow,
        })
        break
      case 'setEntityLayer':
        projected.push({
          kind: 'setEntityLayer',
          entity: command.target.entity,
          layer: command.layer,
        })
        break
      case 'setEntityFacing':
        projected.push({
          kind: 'setEntityFacing',
          entity: command.target.entity,
          facing: command.facing,
        })
        break
      case 'playEntityAction':
        projected.push({
          kind: 'playEntityAction',
          entity: command.target.entity,
          sprite: command.sprite,
          action: command.action,
          loop: command.loop,
          ...(command.startAtMs === undefined ? {} : { startAtMs: command.startAtMs }),
          ...(command.wait === undefined ? {} : { wait: command.wait }),
        })
        break
      case 'stopEntityAction':
        projected.push({
          kind: 'stopEntityAction',
          entity: command.target.entity,
          reset: command.reset,
        })
        break
      case 'moveEntity':
        projected.push({
          kind: 'moveEntity',
          entity: command.target.entity,
          to: structuredClone(command.to),
          speed: command.speed,
        })
        break
      case 'stepEntity':
        projected.push({
          kind: 'stepEntity',
          entity: command.target.entity,
          dir: command.dir,
        })
        break
      case 'animEntity':
        projected.push({ kind: 'animEntity', entity: command.target.entity })
        break
      case 'nudgeEntity':
        projected.push({
          kind: 'nudgeEntity',
          entity: command.target.entity,
          dx: command.dx,
          dy: command.dy,
        })
        break
      case 'takeEntity':
        projected.push({ kind: 'takeEntity', entity: command.target.entity })
        break
      case 'releaseEntity':
        projected.push({
          kind: 'releaseEntity',
          ...(command.target ? { entity: command.target.entity } : {}),
        })
        break
      case 'mountParty':
        projected.push({
          kind: 'mountParty',
          entity: command.target.entity,
          ...(command.dx === undefined ? {} : { dx: command.dx }),
          ...(command.dy === undefined ? {} : { dy: command.dy }),
        })
        break
      case 'ride':
        projected.push({
          kind: 'ride',
          entity: command.target.entity,
          to: structuredClone(command.to),
          speed: command.speed,
        })
        break
      case 'wait':
      case 'stopScript':
        projected.push(structuredClone(command))
        break
      case 'branch': {
        projected.push({
          kind: 'branch',
          cond: projectPreviewCondition(command.cond),
          then: projectPreviewCommands(command.then, self, sharedScripts, depth + 1),
          ...(command.else
            ? {
                else: projectPreviewCommands(command.else, self, sharedScripts, depth + 1),
              }
            : {}),
        })
        break
      }
      case 'loop': {
        const body = projectPreviewCommands(command.body, self, sharedScripts, depth + 1)
        if (command.mode === 'until') {
          // until 至少执行一次；视觉投影只展开这条必然合法的首轮路径。
          projected.push(...body)
          break
        }
        // while 的 0/1 次代表路径足以给帧预览，且不会伪称完整概率分布。
        projected.push({
          kind: 'branch',
          cond: projectPreviewCondition(command.cond),
          then: body,
        })
        break
      }
      case 'confirm':
        projected.push({
          ...structuredClone(command),
          onNo: projectPreviewCommands(command.onNo, self, sharedScripts, depth + 1),
        })
        break
      case 'startBattle':
        {
          const { onLose, onFlee, ...battle } = command
          projected.push({
            ...structuredClone(battle),
            ...(onLose
              ? {
                  onLose: projectPreviewCommands(onLose, self, sharedScripts, depth + 1),
                }
              : {}),
            ...(onFlee
              ? {
                  onFlee: projectPreviewCommands(onFlee, self, sharedScripts, depth + 1),
                }
              : {}),
          })
        }
        break
      case 'teleportOut':
        projected.push({
          kind: 'teleportOut',
          ...(command.onFail
            ? {
                onFail: projectPreviewCommands(command.onFail, self, sharedScripts, depth + 1),
              }
            : {}),
        })
        break
      case 'setEntityTriggerActivation':
        if (command.selection.kind === 'inherit') break
        projected.push({
          kind: 'setEntityTriggerMode',
          entity: command.target.entity,
          ...(command.selection.kind === 'use'
            ? {
                on: command.selection.value.on,
                ...(command.selection.value.range === undefined
                  ? {}
                  : { range: command.selection.value.range }),
              }
            : {}),
        })
        break
      case 'selectEntityBehavior':
      case 'selectEntityPage':
      case 'selectSceneHooks':
        // 只改变后续脚本选择，不影响当前这次可视演出。
        break
      case 'callScript': {
        const shared = sharedScripts[command.script]
        if (
          !shared ||
          (command.self !== undefined &&
            (command.self.scene !== self.scene || command.self.entity !== self.entity))
        ) {
          projected.push(structuredClone(command) as unknown as Command)
          break
        }
        projected.push({
          kind: 'callScript',
          ref: { chunk: SCRIPT_PREVIEW_SHARED_CHUNK, id: command.script },
          ...(command.self ? { self: command.self.entity } : {}),
        })
        break
      }
      default:
        // 保留未知/有副作用命令的 kind，让既有安全图验证明确返回 unavailable。
        projected.push(structuredClone(command) as Command)
    }
  }
  return projected
}

function orderedIds(initial: string, ids: readonly string[]): string[] {
  return [initial, ...ids.filter((id) => id !== initial)]
}

function projectPreviewFlow(
  flow: AuthorScriptFlow,
  self: { scene: string; entity: string },
  sharedScripts: AuthorScriptLibrary,
): ScriptStage[] {
  if (flow.kind === 'stages') {
    const byId = new Map(flow.stages.map((stage) => [stage.id, stage]))
    const ids = orderedIds(
      flow.initial,
      flow.stages.map((stage) => stage.id),
    )
    return ids.flatMap((id, index) => {
      const stage = byId.get(id)
      if (!stage) return []
      const target = stage.next === undefined ? index : ids.indexOf(stage.next)
      return [
        {
          ...(stage.entry
            ? {
                entry: {
                  prepare: projectPreviewCommands(stage.entry.prepare, self, sharedScripts),
                  reveal: structuredClone(stage.entry.reveal),
                },
              }
            : {}),
          body: projectPreviewCommands(stage.body, self, sharedScripts),
          ...(target >= 0 && target !== index ? { next: target } : {}),
        },
      ]
    })
  }
  const machine = flow.machine
  const ids = orderedIds(machine.initial, Object.keys(machine.states))
  return ids.flatMap((id, index) => {
    const state = machine.states[id]
    if (!state) return []
    const next = state.next
    const targetId =
      next.kind === 'continue' || next.kind === 'advance' || next.kind === 'to'
        ? next.state
        : next.kind === 'restart'
          ? machine.initial
          : id
    const target = ids.indexOf(targetId)
    return [
      {
        ...(state.entry
          ? {
              entry: {
                prepare: projectPreviewCommands(state.entry.prepare, self, sharedScripts),
                reveal: structuredClone(state.entry.reveal),
              },
            }
          : {}),
        body: projectPreviewCommands(state.body, self, sharedScripts),
        ...(target >= 0 && target !== index ? { next: target } : {}),
      },
    ]
  })
}

/** 场景脚本工作台使用的只读预览 lowering；不进入保存或作者态。 */
export function projectCanonicalScriptFlowPreview(
  flow: AuthorScriptFlow,
  self: { scene: string; entity: string },
  sharedScripts: AuthorScriptLibrary,
): ScriptStage[] {
  return projectPreviewFlow(flow, self, sharedScripts)
}

/** 为旧 PreviewCanvas 的内存解析器生成 canonical 共享脚本只读投影。 */
export function projectCanonicalSharedScriptPreviewChunk(
  sharedScripts: AuthorScriptLibrary,
): ScriptChunkV1 {
  return {
    version: 1,
    id: SCRIPT_PREVIEW_SHARED_CHUNK,
    scripts: Object.fromEntries(
      Object.entries(sharedScripts).map(([id, script]) => [
        id,
        projectPreviewCommands(
          script.body,
          { scene: '__shared', entity: '__shared' },
          sharedScripts,
        ),
      ]),
    ),
  }
}

function projectPreviewEntity(
  sceneId: string,
  shell: EntityDef,
  canonical: AuthorSceneEntityDef,
  sharedScripts: AuthorScriptLibrary,
): EntityDef {
  const page =
    canonical.pages?.find((candidate) => candidate.id === canonical.initialPage) ??
    canonical.pages?.[0]
  const auto = page?.auto ? canonical.behaviors?.auto?.[page.auto] : undefined
  if (!auto) return shell
  const currentPage = shell.pages?.[0]
  return {
    ...shell,
    pages: [
      {
        ...(currentPage ?? {}),
        auto: {
          stages: projectPreviewFlow(
            auto.flow,
            { scene: sceneId, entity: canonical.id },
            sharedScripts,
          ),
        },
      },
    ],
  }
}

/**
 * 当前脚本的只读视觉投影。它只为精灵实例行为预览恢复安全的帧/朝向/等待控制流，
 * 不进入保存、运行时或编辑命令；有副作用或无法证明的分支仍由既有验证保守标为 unavailable。
 */
export function projectCanonicalSpritePreviewState(
  shell: EditorState,
  canonical: CanonicalSpritePreviewState,
): EditorState {
  const scenes = new Map(canonical.scenes.map((scene) => [scene.id, scene]))
  const scriptChunks = structuredClone(shell.scriptChunks)
  scriptChunks[SCRIPT_PREVIEW_SHARED_CHUNK] = projectCanonicalSharedScriptPreviewChunk(
    canonical.sharedScripts,
  )
  return {
    ...shell,
    scenes: shell.scenes.map((scene) => {
      const source = scenes.get(scene.id)
      if (!source) return scene
      const entities = new Map(source.entities.map((entity) => [entity.id, entity]))
      return {
        ...scene,
        entities: scene.entities.map((entity) => {
          const canonicalEntity = entities.get(entity.id)
          return canonicalEntity
            ? projectPreviewEntity(scene.id, entity, canonicalEntity, canonical.sharedScripts)
            : entity
        }),
      }
    }),
    scriptChunks,
  }
}

/** 运行时实际读取的第 0 页 auto 实例；actor 实体也生成 UI 可定位的场景引用。 */
export function collectAutomaticScriptSpriteInstanceSites(
  state: Pick<EditorState, 'actors' | 'scenes'>,
): SpriteAutomaticScriptInstanceSite[] {
  const actors = actorsById(state)
  const sites: SpriteAutomaticScriptInstanceSite[] = []
  state.scenes.forEach((scene, sceneIndex) => {
    scene.entities.forEach((entity, entityIndex) => {
      // EditorState 的壳层场景在当前投影前后可能短暂保留
      // `page.auto = behaviorId`。只有旧壳层 `{ stages }` 才能作为预览脚本读取。
      if ((entity.pages?.[0]?.auto?.stages?.length ?? 0) === 0) return
      const sprite = resolveEntitySpriteId(entity, actors)
      if (!sprite) return
      sites.push({
        spriteId: sprite,
        sceneId: scene.id,
        entityId: entity.id,
        where:
          'actor' in entity
            ? `scenes[${sceneIndex}].entities[${entityIndex}].actor(${entity.actor}) → actors.spriteId`
            : `scenes[${sceneIndex}].entities[${entityIndex}].sprite`,
        site: `scene:${scene.id}:entity:${entity.id}`,
        via: 'actor' in entity ? 'actor' : 'direct',
      })
    })
  })
  return sites
}

/** 资源筛选只派生实例行为，不把 auto 脚本写回用途布局。 */
export function collectAutomaticScriptSpriteDefinitionIds(
  state: Pick<EditorState, 'actors' | 'scenes'>,
): Set<string> {
  const ids = new Set<string>()
  for (const site of collectAutomaticScriptSpriteInstanceSites(state)) ids.add(site.spriteId)
  return ids
}

function scriptCommands(state: EditorState, ref: ScriptRef): readonly Command[] | undefined {
  return state.scriptChunks[ref.chunk]?.scripts[ref.id]
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

const DEFAULT_PREVIEW_HOLD_MS = 200
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
  state: EditorState,
  commands: readonly Command[],
  entityId: string,
  context: FrameScanContext,
  actualFrameCount: number,
  depth = 0,
): FrameScanResult {
  if (depth > 16) return 'uncertain'
  for (let index = 0; index < commands.length; index++) {
    if (context.remainingCommands <= 0) return 'uncertain'
    context.remainingCommands--
    const command = commands[index]!
    if (command.kind === 'setEntityFrame' && command.entity === entityId) {
      if (context.frameMode === 'implicit') return 'uncertain'
      context.frameMode = 'explicit'
      pushFrame(context, actualFrameIndex(command.frame, actualFrameCount))
      continue
    }
    if (command.kind === 'animEntity' && command.entity === entityId) {
      if (!context.allowImplicitAnimation || context.frameMode === 'explicit') return 'uncertain'
      context.frameMode = 'implicit'
      context.implicitAnimationStep++
      pushFrame(context, actualFrameIndex(context.implicitAnimationStep, actualFrameCount))
      continue
    }
    if (command.kind === 'setEntityFacing' && command.entity === entityId) continue
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
      entityId,
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
  const raw = next === undefined ? current : next === 'advance' ? current + 1 : next
  return Math.max(0, Math.min(raw, count - 1))
}

function collectDeterministicStagePreview(
  state: EditorState,
  entity: EntityDef,
  definition: SpriteDef,
  actualFrameCount: number,
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
  for (let transitions = 0; transitions <= stages.length; transitions++) {
    const repeatedAt = stageStarts.get(currentStage)
    if (repeatedAt !== undefined) {
      context.loopStartStep = repeatedAt
      break
    }
    stageStarts.set(currentStage, context.steps.length)
    const stage = stages[currentStage]
    if (!stage) return undefined
    const result = collectDeterministicAutoFrames(
      state,
      stage.body,
      entity.id,
      context,
      actualFrameCount,
    )
    if (result === 'uncertain') return undefined
    if (result === 'loop') break
    currentStage = stageTarget(stage, currentStage, stages.length)
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
  state: EditorState
  entityId: string
  actualFrameCount: number
  strategy: VisualBranchStrategy
  branchIndex: number
  remainingCommands: number
  frameOverride?: number
  implicitAnimationStep: number
  steps: Array<{ frame: number; holdMs: number }>
  chancePercents: Set<number>
}

class VisualScriptStopped {}

class VisualScriptJump {
  constructor(readonly ref: ScriptRef) {}
}

class VisualScriptBudgetExhausted {}

const MAX_VISUAL_SAMPLE_COMMANDS = 4096
const MAX_VISUAL_SAMPLE_TICKS = 48
const MAX_VISUAL_CALL_DEPTH = 16

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
  state: EditorState,
  commands: readonly Command[],
  entityId: string,
  context: { visited: Set<string>; remainingCommands: number },
): boolean {
  for (const command of commands) {
    if (context.remainingCommands-- <= 0) return false
    if (
      command.kind === 'setEntityFrame' ||
      command.kind === 'setEntityFacing' ||
      command.kind === 'animEntity'
    ) {
      if (command.entity !== entityId) return false
      continue
    }
    if (command.kind === 'wait' || command.kind === 'stopScript') continue
    if (command.kind === 'branch') {
      if (!command.cond || command.cond.kind !== 'chance' || !Array.isArray(command.then))
        return false
      if (!validateVisualCommandGraph(state, command.then, entityId, context)) return false
      if (command.else && !validateVisualCommandGraph(state, command.else, entityId, context))
        return false
      continue
    }
    if (command.kind !== 'callScript' && command.kind !== 'jumpScript') return false
    if (command.self !== undefined && command.self !== entityId) return false
    const key = `${command.ref.chunk}:${command.ref.id}`
    if (context.visited.has(key)) continue
    const body = scriptCommands(state, command.ref)
    if (!body) return false
    context.visited.add(key)
    if (!validateVisualCommandGraph(state, body, entityId, context)) return false
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
    if (command.kind === 'stopScript') throw new VisualScriptStopped()
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
  state: EditorState,
  entity: EntityDef,
  actualFrameCount: number,
  strategy: VisualBranchStrategy,
): SpriteAutomaticScriptPreviewVariant | undefined {
  const stages = entity.pages?.[0]?.auto?.stages
  if (!stages?.length) return undefined
  const context: VisualSampleContext = {
    state,
    entityId: entity.id,
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
  if (!context.steps.length) pushVisibleSampleFrame(context)
  const stableSteps = context.steps.slice(cycleStart)
  const steps = finalizeSteps(
    collapseRepeatedSteps(stableSteps.length ? stableSteps : context.steps),
  )
  if (!steps.length) return undefined
  const chanceNote = [...context.chancePercents]
    .sort((left, right) => left - right)
    .map((percent) => `${percent}%`)
    .join('、')
  return {
    id: strategy.id,
    label: strategy.label,
    steps,
    note: `${chanceNote ? `${chanceNote} 为各判断的局部命中率` : '确定性控制流'}${bounded ? '；此示例在安全预算处截断' : ''}`,
  }
}

/**
 * 有界视觉投影：只接受当前实体的帧/朝向/等待与 chance/call/jump/stop 控制流。
 * 每条固定分支模式都是合法执行示例；它们不冒充完整概率分布或唯一循环。
 */
function collectSafeScriptProjection(
  state: EditorState,
  entity: EntityDef,
  actualFrameCount: number,
): SpriteAutomaticScriptPreview | undefined {
  const stages = entity.pages?.[0]?.auto?.stages
  if (!stages?.length) return undefined
  if (
    !validateVisualCommandGraph(
      state,
      stages.flatMap((stage) => stage.body),
      entity.id,
      {
        visited: new Set(),
        remainingCommands: MAX_PREVIEW_COMMANDS,
      },
    )
  )
    return undefined
  const variantsBySteps = new Map<string, SpriteAutomaticScriptPreviewVariant>()
  for (const strategy of VISUAL_BRANCH_STRATEGIES) {
    const variant = sampleChanceStageGraph(state, entity, actualFrameCount, strategy)
    if (!variant) continue
    const key = JSON.stringify(variant.steps)
    if (!variantsBySteps.has(key)) variantsBySteps.set(key, variant)
  }
  const variants = [...variantsBySteps.values()]
  if (!variants.length) return undefined
  if (variants.length === 1)
    return {
      kind: 'cycle',
      mode: 'explicit',
      intro: [],
      cycle: variants[0]!.steps,
    }
  return {
    kind: 'variants',
    variants,
    note: '下列是脚本的代表性合法分支示例，不是完整概率分布，也不是唯一循环。',
  }
}

function describeAutomaticEntityBehavior(
  state: EditorState,
  entity: EntityDef,
  definition: SpriteDef,
  actualFrameCount?: number,
): SpriteReferenceBehavior | undefined {
  const auto = entity.pages?.[0]?.auto
  if (!auto?.stages?.length) return undefined
  const canResolvePhysicalFrames =
    definition.layout.kind !== 'directional' &&
    actualFrameCount !== undefined &&
    Number.isInteger(actualFrameCount) &&
    actualFrameCount > 0
  const preview = canResolvePhysicalFrames
    ? (collectDeterministicStagePreview(state, entity, definition, actualFrameCount) ??
      collectSafeScriptProjection(state, entity, actualFrameCount))
    : undefined
  if (preview?.kind === 'cycle') {
    const cycle = preview.cycle.map((step) => step.frame)
    const intro = preview.intro.map((step) => step.frame)
    const implicit = preview.mode === 'implicit'
    const timed = preview.cycle.some((step) => step.holdMs !== DEFAULT_PREVIEW_HOLD_MS)
    return {
      kind: 'script',
      label: implicit ? '自动脚本逐帧循环' : timed ? '自动脚本定时循环' : '自动脚本切帧',
      detail: implicit
        ? `animEntity 每次推进一帧，循环 ${cycle.map((frame) => `#${frame}`).join(' → ')}；实际速度以实例脚本为准`
        : intro.length
          ? `启动 ${intro.map((frame) => `#${frame}`).join(' → ')} 后循环 ${cycle.map((frame) => `#${frame}`).join(' → ')}；速度与分支以脚本为准`
          : `检测到 ${cycle.map((frame) => `#${frame}`).join(' → ')}；速度与分支以脚本为准`,
      preview,
    }
  }
  if (preview?.kind === 'variants')
    return {
      kind: 'script',
      label: '自动脚本随机切帧',
      detail: `${preview.variants.length} 条可能路径；${preview.note}`,
      preview,
    }
  return {
    kind: 'script',
    label: '自动行为脚本',
    detail: '移动、显隐或帧切换由这个场景实例的脚本决定',
    preview: {
      kind: 'unavailable',
      reason: '脚本含无法安全展开的控制流或副作用',
    },
  }
}

/**
 * 按用途汇总场景实例 auto 行为，只生成编辑器视图模型。
 * 相同稳定帧序合并计数；不确定脚本保守归为“自动行为脚本”。
 */
export function collectSpriteAutomaticScriptBehaviorsForResource(
  state: EditorState,
  definitions: readonly SpriteDef[],
  actualFrameCount?: number,
): ReadonlyMap<string, readonly SpriteAutomaticScriptBehaviorSummary[]> {
  if (new Set(definitions.map((definition) => definition.asset)).size > 1)
    throw new Error('实例自动行为汇总只接受共享同一源资源的用途定义')
  const actors = actorsById(state)
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]))
  const groupsByDefinition = new Map<
    string,
    Map<
      string,
      {
        behavior: SpriteReferenceBehavior
        instanceCount: number
        scenes: Set<string>
      }
    >
  >()
  for (const scene of state.scenes) {
    for (const entity of scene.entities) {
      const spriteId = resolveEntitySpriteId(entity, actors)
      const definition = spriteId ? definitionsById.get(spriteId) : undefined
      if (!definition) continue
      const behavior = describeAutomaticEntityBehavior(state, entity, definition, actualFrameCount)
      if (!behavior) continue
      const preview = behavior.preview ?? {
        kind: 'unavailable',
        reason: behavior.detail,
      }
      const key = JSON.stringify(preview)
      let groups = groupsByDefinition.get(definition.id)
      if (!groups) {
        groups = new Map()
        groupsByDefinition.set(definition.id, groups)
      }
      const group = groups.get(key)
      if (group) {
        group.instanceCount++
        group.scenes.add(scene.id)
      } else
        groups.set(key, {
          behavior,
          instanceCount: 1,
          scenes: new Set([scene.id]),
        })
    }
  }
  return new Map(
    definitions.map((definition) => [
      definition.id,
      [...(groupsByDefinition.get(definition.id)?.entries() ?? [])].map(([id, group]) => ({
        id,
        label: group.behavior.label,
        detail: group.behavior.detail,
        preview:
          group.behavior.preview ??
          ({ kind: 'unavailable', reason: group.behavior.detail } as const),
        instanceCount: group.instanceCount,
        sceneCount: group.scenes.size,
      })),
    ]),
  )
}

export function collectSpriteAutomaticScriptBehaviors(
  state: EditorState,
  definition: SpriteDef,
  actualFrameCount?: number,
): readonly SpriteAutomaticScriptBehaviorSummary[] {
  return (
    collectSpriteAutomaticScriptBehaviorsForResource(state, [definition], actualFrameCount).get(
      definition.id,
    ) ?? []
  )
}

/**
 * 引用面板的实例行为摘要。这里只读取既有布局/场景脚本，不写入新的分类数据。
 * 无法证明具体帧序时保守显示“自动行为脚本”，不把源帧容器臆断成循环动画。
 */
export function describeSpriteReferenceBehavior(
  state: EditorState,
  reference: SpriteDefinitionReference,
  definition: SpriteDef,
  actualFrameCount?: number,
): SpriteReferenceBehavior {
  const sceneReference = referencedSceneEntity(state, reference)
  if (sceneReference) {
    const { entity } = sceneReference
    const automatic = describeAutomaticEntityBehavior(state, entity, definition, actualFrameCount)
    if (automatic) return automatic
    if (definition.layout.kind === 'loop')
      return {
        kind: 'layout-loop',
        label: '用途自动循环',
        detail: `默认循环 #0–#${Math.max(0, definition.layout.frameCount - 1)}`,
      }
    if (definition.layout.kind === 'directional')
      return {
        kind: 'directional',
        label: '四向场景实例',
        detail: `初始朝向 ${entity?.facing ?? 'down'}；移动时按四向帧带播放`,
      }
    return {
      kind: 'default',
      label: '默认定格',
      detail: '默认显示 #0；剧情脚本仍可临时切换同容器中的其它帧',
    }
  }
  if (reference.site.startsWith('actor:'))
    return { kind: 'reference', label: '角色基础外观', detail: '角色实例通过此用途取得大世界外观' }
  if (reference.site.startsWith('script:'))
    return { kind: 'script', label: '剧情脚本引用', detail: '脚本可在运行时切换到此用途定义' }
  if (reference.site.startsWith('world:')) {
    const [, , role, subjectId] = reference.site.split(':')
    if (role === 'character' && subjectId)
      return {
        kind: 'reference',
        label: '角色运行态外观',
        detail: `世界状态中的角色 ${subjectId} 以此用途定义覆盖基础外观`,
      }
    if (role === 'followers')
      return {
        kind: 'reference',
        label: '跟随队列外观',
        detail: '世界状态的编外跟随者队列直接引用此用途定义',
      }
    return { kind: 'reference', label: '世界状态引用', detail: '世界状态正在引用此用途定义' }
  }
  return { kind: 'reference', label: '内容引用', detail: '由对应内容对象使用此用途定义' }
}
