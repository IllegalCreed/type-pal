import {
  type Command,
  getScriptBody,
  type ScriptChunkV1,
  type ScriptCondition,
  type ScriptIndexV1,
} from '@type-pal/content'

const SCENE_COMMAND_KINDS = new Set<Command['kind']>([
  'teleportParty',
  'loadScene',
  'setPartyFacing',
  'setEntityState',
  'setMultiEntityState',
  'setEntityPos',
  'setEntityPosRelParty',
  'setEntityLayer',
  'setEntityFacing',
  'setEntityFrame',
  'playEntityAction',
  'stopEntityAction',
  'moveEntity',
  'stepEntity',
  'animEntity',
  'nudgeEntity',
  'moveParty',
  'nudgeParty',
  'teleportOut',
  'cameraPan',
  'cameraSnap',
  'setEntityAuto',
  'setSceneOnEnter',
  'setSceneOnTeleport',
  'clearSceneScripts',
  'setEntityTrigger',
  'setEntityTriggerMode',
  'takeEntity',
  'releaseEntity',
  'mountParty',
  'unmountParty',
  'ride',
])

function conditionNeedsScene(condition: ScriptCondition): boolean {
  if (
    condition.kind === 'currentScene' ||
    condition.kind === 'entityState' ||
    condition.kind === 'entityInScene' ||
    condition.kind === 'facingEntity'
  )
    return true
  if (condition.kind === 'all' || condition.kind === 'any')
    return condition.of.some(conditionNeedsScene)
  return condition.kind === 'not' ? conditionNeedsScene(condition.cond) : false
}

export interface ScriptContextAnalysis {
  needsScene: boolean
  reasons: string[]
}

/**
 * 共享脚本的场景上下文是由完整调用闭包决定的，不由 shared/* 存储命名空间决定。
 * 对话、物品和变量脚本无需地图；实体、坐标、传送或面向实体条件才需要真实场景。
 */
export function analyzeScriptContext(
  scriptIndex: ScriptIndexV1 | undefined,
  scriptChunks: Readonly<Record<string, ScriptChunkV1>>,
  rootId: string,
): ScriptContextAnalysis {
  if (!scriptIndex || !rootId) return { needsScene: false, reasons: [] }
  const reasons = new Set<string>()
  const visited = new Set<string>()

  const visitCommands = (commands: readonly Command[]): void => {
    for (const command of commands) {
      if (SCENE_COMMAND_KINDS.has(command.kind)) reasons.add(command.kind)
      if (command.kind === 'branch' && conditionNeedsScene(command.cond))
        reasons.add(`condition:${command.cond.kind}`)
      if (command.kind === 'callScript' || command.kind === 'jumpScript')
        visitScript(command.ref.id)

      if (command.kind === 'branch') {
        visitCommands(command.then)
        if (command.else) visitCommands(command.else)
      } else if (command.kind === 'confirm') visitCommands(command.onNo)
      else if (command.kind === 'teleportOut' && command.onFail) visitCommands(command.onFail)
      else if (command.kind === 'startBattle') {
        if (command.onLose) visitCommands(command.onLose)
        if (command.onFlee) visitCommands(command.onFlee)
        for (const hook of command.choreography ?? []) visitCommands(hook.body)
      } else if (
        command.kind === 'setEntityAuto' ||
        command.kind === 'setEntityTrigger' ||
        command.kind === 'setSceneOnEnter' ||
        command.kind === 'setSceneOnTeleport'
      ) {
        if (command.stages) for (const stage of command.stages) visitCommands(stage.body)
        if (command.script) visitScript(command.script.id)
      }
    }
  }

  const visitScript = (id: string): void => {
    if (visited.has(id)) return
    visited.add(id)
    visitCommands(getScriptBody(scriptIndex, scriptChunks, id) ?? [])
  }

  visitScript(rootId)
  return { needsScene: reasons.size > 0, reasons: [...reasons].sort() }
}
