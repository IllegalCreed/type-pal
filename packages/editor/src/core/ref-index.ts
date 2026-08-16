/**
 * flag / var / item 引用反向索引。
 *
 * 编辑器仍可打开历史内联 SceneDef，也可打开 content13 的具名 Behavior / Hook。索引器必须
 * 同时理解两种结构，不能把 v13 page 上的 behavior id 当成旧 `page.trigger.stages`。
 */
import type {
  AuthorCommandV13,
  AuthorConditionV5,
  Command,
  SceneDef,
  SceneDefV13,
  ScriptCondition,
  ScriptFlowV13,
  ScriptStage,
  StateTransitionV13,
} from '@type-pal/content'

export interface RefEntry {
  sceneId: string
  /** EventMode 源 key；hostile 例外（非事件源，UI 不提供跳转）。 */
  srcKey: string
  /** 展示名。content13 的具名行为 / Hook 会包含其 label。 */
  srcLabel: string
  access: 'read' | 'write'
  /** 一句话形态，如 `setFlag=true` / `branch is false` / `+1` / `≥2`。 */
  detail: string
}

export interface RefIndex {
  flags: Map<string, RefEntry[]>
  vars: Map<string, RefEntry[]>
  items: Map<string, RefEntry[]>
}

type RefSource = Omit<RefEntry, 'access' | 'detail'>
type IndexedCommand = Command | AuthorCommandV13
type IndexedCondition = ScriptCondition | AuthorConditionV5

function push(m: Map<string, RefEntry[]>, key: string, e: RefEntry): void {
  const list = m.get(key)
  if (list) list.push(e)
  else m.set(key, [e])
}

/** 条件树递归（all / any / not 嵌套；读访问）。 */
function walkCond(cond: IndexedCondition, idx: RefIndex, at: RefSource): void {
  switch (cond.kind) {
    case 'flag':
      push(idx.flags, cond.flag, { ...at, access: 'read', detail: `is ${cond.is}` })
      return
    case 'var':
      push(idx.vars, cond.var, { ...at, access: 'read', detail: `${cond.op} ${cond.value}` })
      return
    case 'hasItem':
    case 'ownsItem':
    case 'itemEquipped':
      push(idx.items, cond.itemId, { ...at, access: 'read', detail: `≥${cond.atLeast ?? 1}` })
      return
    case 'all':
    case 'any':
      for (const child of cond.of) walkCond(child, idx, at)
      return
    case 'not':
      walkCond(cond.cond, idx, at)
      return
    default:
      return
  }
}

/** 命令树递归；覆盖 v4 内联绑定和 v13 的全部递归 command arm。 */
function walkCmds(cmds: readonly IndexedCommand[], idx: RefIndex, at: RefSource): void {
  for (const command of cmds) {
    switch (command.kind) {
      case 'setFlag':
        push(idx.flags, command.flag, { ...at, access: 'write', detail: `= ${command.value}` })
        break
      case 'setVar':
        push(idx.vars, command.var, { ...at, access: 'write', detail: `= ${command.value}` })
        break
      case 'addVar':
        push(idx.vars, command.var, { ...at, access: 'write', detail: `+= ${command.delta}` })
        break
      case 'giveItem':
        push(idx.items, command.itemId, {
          ...at,
          access: 'write',
          detail: `+${command.count ?? 1}`,
        })
        break
      case 'loseItem':
        push(idx.items, command.itemId, {
          ...at,
          access: 'write',
          detail: `-${command.count ?? 1}`,
        })
        break
      case 'branch':
        walkCond(command.cond, idx, at)
        walkCmds(command.then, idx, at)
        if (command.else) walkCmds(command.else, idx, at)
        break
      case 'loop':
        walkCond(command.cond, idx, at)
        walkCmds(command.body, idx, at)
        break
      case 'confirm':
        walkCmds(command.onNo, idx, at)
        break
      case 'startBattle':
        if (command.onLose) walkCmds(command.onLose, idx, at)
        if (command.onFlee) walkCmds(command.onFlee, idx, at)
        break
      case 'teleportOut':
        if (command.onFail) walkCmds(command.onFail, idx, at)
        break
      case 'setEntityAuto':
      case 'setEntityTrigger': {
        // 历史 v4 inline binding；v13 已禁止这两种命令。必须先验数组，避免把 ScriptRef
        // 或 content13 behavior id 当成 stages 迭代。
        const stages = (command as { stages?: unknown }).stages
        if (Array.isArray(stages)) walkLegacyStages(stages as ScriptStage[], idx, at)
        break
      }
      default:
        break
    }
  }
}

function walkLegacyStages(stages: readonly ScriptStage[], idx: RefIndex, at: RefSource): void {
  for (const stage of stages) walkCmds(stage.body, idx, at)
}

function walkTransition(transition: StateTransitionV13, idx: RefIndex, at: RefSource): void {
  if (transition.kind === 'branch') {
    walkCond(transition.cond, idx, at)
    walkTransition(transition.then, idx, at)
    walkTransition(transition.else, idx, at)
  } else if (transition.kind === 'commandOutcome') {
    walkTransition(transition.then, idx, at)
    walkTransition(transition.else, idx, at)
  }
}

function walkCanonicalFlow(flow: ScriptFlowV13, idx: RefIndex, at: RefSource): void {
  if (flow.kind === 'stages') {
    for (const stage of flow.stages) {
      if (stage.entry) walkCmds(stage.entry.prepare, idx, at)
      walkCmds(stage.body, idx, at)
    }
    return
  }
  for (const state of Object.values(flow.machine.states)) {
    if (state.entry) walkCmds(state.entry.prepare, idx, at)
    walkCmds(state.body, idx, at)
    walkTransition(state.next, idx, at)
  }
}

function walkLegacyScene(scene: SceneDef, idx: RefIndex): void {
  if (Array.isArray(scene.onEnter))
    walkLegacyStages(scene.onEnter, idx, {
      sceneId: scene.id,
      srcKey: '__onEnter__',
      srcLabel: '进场脚本',
    })
  if (Array.isArray(scene.onTeleport))
    walkLegacyStages(scene.onTeleport, idx, {
      sceneId: scene.id,
      srcKey: '__onTeleport__',
      srcLabel: '传送出口',
    })
  for (const entity of scene.entities) {
    entity.pages?.forEach((page, pageIndex) => {
      const suffix = pageIndex === 0 ? '' : `@${pageIndex}`
      if (page.trigger && typeof page.trigger !== 'string' && Array.isArray(page.trigger.stages))
        walkLegacyStages(page.trigger.stages, idx, {
          sceneId: scene.id,
          srcKey: `${entity.id}:trigger${suffix}`,
          srcLabel: `${entity.id} 触发 · 第 ${pageIndex + 1} 页`,
        })
      if (page.auto && typeof page.auto !== 'string' && Array.isArray(page.auto.stages))
        walkLegacyStages(page.auto.stages, idx, {
          sceneId: scene.id,
          srcKey: `${entity.id}:auto${suffix}`,
          srcLabel: `${entity.id} 巡逻 · 第 ${pageIndex + 1} 页`,
        })
    })
    if (Array.isArray(entity.hostile?.onLose))
      walkCmds(entity.hostile.onLose, idx, {
        sceneId: scene.id,
        srcKey: `${entity.id}:hostile`,
        srcLabel: `${entity.id} 战败命令`,
      })
  }
}

function walkCanonicalScene(scene: SceneDefV13, idx: RefIndex): void {
  for (const slot of ['onEnter', 'onTeleport'] as const) {
    const channel = scene.hooks?.[slot]
    for (const [hookId, hook] of Object.entries(channel?.variants ?? {}))
      walkCanonicalFlow(hook.flow, idx, {
        sceneId: scene.id,
        srcKey: slot === 'onEnter' ? '__onEnter__' : '__onTeleport__',
        srcLabel: `${slot === 'onEnter' ? '进场脚本' : '传送出口'}「${hook.label || hookId}」`,
      })
  }
  for (const entity of scene.entities) {
    for (const channel of ['trigger', 'auto'] as const)
      for (const [behaviorId, behavior] of Object.entries(entity.behaviors?.[channel] ?? {}))
        walkCanonicalFlow(behavior.flow, idx, {
          sceneId: scene.id,
          srcKey: `${entity.id}:${channel}`,
          srcLabel: `${entity.id} ${channel === 'trigger' ? '触发' : '巡逻'}「${behavior.label || behaviorId}」`,
        })
    if (Array.isArray(entity.hostile?.onLose))
      walkCmds(entity.hostile.onLose, idx, {
        sceneId: scene.id,
        srcKey: `${entity.id}:hostile`,
        srcLabel: `${entity.id} 战败命令`,
      })
  }
}

function isCanonicalScene(scene: SceneDef | SceneDefV13): scene is SceneDefV13 {
  if ('hooks' in scene) return true
  return scene.entities.some((entity) => {
    if ('behaviors' in entity || 'initialPage' in entity) return true
    return entity.pages?.some((page) => 'id' in page) ?? false
  })
}

/** 全工程扫描。O(命令总数)，由 DataMode 对 scenes identity 做 useMemo。 */
export function buildRefIndex(scenes: readonly (SceneDef | SceneDefV13)[]): RefIndex {
  const idx: RefIndex = { flags: new Map(), vars: new Map(), items: new Map() }
  for (const scene of scenes) {
    if (isCanonicalScene(scene)) walkCanonicalScene(scene, idx)
    else walkLegacyScene(scene, idx)
  }
  return idx
}
