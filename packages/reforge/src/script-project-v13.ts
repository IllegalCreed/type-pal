import {
  emptyWorldScriptStateV5,
  type EntityLifecycleReferenceIndexV13,
  type LifecycleCommandV13,
  type SceneDefV5,
  type SceneDefV13,
  type WorldStateV13,
} from '@type-pal/content'
import type { BattleResult } from './battle/battle-result.js'
import {
  commitEntityLifecycleCommandV13,
  type EntityLifecycleCommandCommitV13,
} from './entity-lifecycle-command.js'
import type { RuntimeLeafCommandV13 } from './script-compiler-v13.js'
import type { RuntimeLeafCommandV5 } from './script-compiler-v5.js'
import {
  ProjectScriptRuntimeHostV5,
  type ProjectScriptHostOptionsV5,
} from './script-project-v5.js'
import type { ScriptRuntimeContextV5 } from './script-runner-v5.js'
import type { ScriptRuntimeHostV13 } from './script-runner-v13.js'
import { FlowRuntimeCoordinatorV5 } from './script-world-v5.js'

export interface ProjectScriptHostOptionsV13
  extends Omit<ProjectScriptHostOptionsV5, 'executeEffect' | 'worldChanged' | 'scene'> {
  lifecycleReferences: EntityLifecycleReferenceIndexV13
  executeEffect(
    command: RuntimeLeafCommandV13,
    context: Readonly<ScriptRuntimeContextV5>,
    signal: AbortSignal,
  ): void | Promise<void>
  worldChanged?(
    command: RuntimeLeafCommandV13,
    context: Readonly<ScriptRuntimeContextV5>,
    lifecycleCommit?: Readonly<EntityLifecycleCommandCommitV13>,
  ): void | Promise<void>
  scene(sceneId: string): SceneDefV13 | Promise<SceneDefV13>
}

function isLifecycleCommand(command: RuntimeLeafCommandV13): command is LifecycleCommandV13 {
  return (
    command.kind === 'suspendEntity' ||
    command.kind === 'hideEntity' ||
    command.kind === 'restoreEntity' ||
    command.kind === 'removeEntity'
  )
}

/** v13 loader 已验证 retained v5 scene shape；旧 host 只读取行为选择，不执行 author command。 */
function validatedSceneAsV5(scene: SceneDefV13): SceneDefV5 {
  return scene as unknown as SceneDefV5
}

/** v13 public 方言已删除 vanishEntity；其余 retained leaf 与 v5 runtime 结构完全相同。 */
function retainedCommandAsV5(command: RuntimeLeafCommandV13): RuntimeLeafCommandV5 {
  if (isLifecycleCommand(command))
    throw new Error(`script v13 lifecycle command ${command.kind} 不得进入 v5 host`)
  return command as unknown as RuntimeLeafCommandV5
}

function retainedCommandAsV13(command: RuntimeLeafCommandV5): RuntimeLeafCommandV13 {
  if (command.kind === 'vanishEntity')
    throw new Error('script v13 runtime 禁止 legacy vanishEntity')
  return command as unknown as RuntimeLeafCommandV13
}

/**
 * content13 canonical world authority。旧 script 字段仍由成熟 v5 host 维护；四个 lifecycle leaf
 * 在同一 execute commit point 原子替换 world.entityLifecycles，再通知画面投影刷新。
 */
export class ProjectScriptRuntimeHostV13 implements ScriptRuntimeHostV13 {
  private readonly retainedHost: ProjectScriptRuntimeHostV5

  constructor(
    private readonly world: WorldStateV13,
    coordinator: FlowRuntimeCoordinatorV5,
    private readonly options: ProjectScriptHostOptionsV13,
  ) {
    const script = (world.script ??= emptyWorldScriptStateV5())
    const {
      lifecycleReferences: _lifecycleReferences,
      executeEffect: _executeEffect,
      worldChanged,
      scene,
      ...retainedOptions
    } = options
    this.retainedHost = new ProjectScriptRuntimeHostV5(script, coordinator, {
      ...retainedOptions,
      scene: async (sceneId) => validatedSceneAsV5(await scene(sceneId)),
      executeEffect: (command, context, signal) =>
        options.executeEffect(retainedCommandAsV13(command), context, signal),
      ...(worldChanged
        ? {
            worldChanged: (command, context) =>
              worldChanged(retainedCommandAsV13(command), context),
          }
        : {}),
    })
  }

  currentSceneId(): string {
    return this.retainedHost.currentSceneId()
  }

  currentSceneSessionId(): string | number {
    return this.retainedHost.currentSceneSessionId()
  }

  gate(signal: AbortSignal): void | Promise<void> {
    return this.retainedHost.gate(signal)
  }

  async execute(
    command: RuntimeLeafCommandV13,
    context: Readonly<ScriptRuntimeContextV5>,
    signal: AbortSignal,
  ): Promise<void> {
    signal.throwIfAborted()
    if (!isLifecycleCommand(command)) {
      await this.retainedHost.execute(retainedCommandAsV5(command), context, signal)
      return
    }
    const committed = commitEntityLifecycleCommandV13(
      this.world.entityLifecycles,
      command,
      this.options.lifecycleReferences,
    )
    this.world.entityLifecycles = committed.table
    await this.options.executeEffect(command, context, signal)
    signal.throwIfAborted()
    await this.options.worldChanged?.(command, context, committed)
  }

  evalCondition(
    condition: Parameters<ScriptRuntimeHostV13['evalCondition']>[0],
    context: Readonly<ScriptRuntimeContextV5>,
  ): boolean {
    return this.retainedHost.evalCondition(condition, context)
  }

  confirm(signal: AbortSignal): Promise<boolean> {
    return this.retainedHost.confirm(signal)
  }

  async startBattle(
    request: Parameters<ScriptRuntimeHostV13['startBattle']>[0],
    signal: AbortSignal,
  ): Promise<BattleResult> {
    return await this.retainedHost.startBattle(request, signal)
  }

  teleportOut(signal: AbortSignal): Promise<boolean> {
    return this.retainedHost.teleportOut(signal)
  }

  revealSceneEntry(
    reveal: Parameters<NonNullable<ScriptRuntimeHostV13['revealSceneEntry']>>[0],
    signal: AbortSignal,
  ): Promise<void> {
    return this.retainedHost.revealSceneEntry(reveal, signal)
  }

  wait(ms: number, signal: AbortSignal): Promise<void> {
    return this.retainedHost.wait(ms, signal)
  }

  waitWorldTick(signal: AbortSignal): Promise<void> {
    return this.retainedHost.waitWorldTick(signal)
  }

  yieldMacroTask(signal: AbortSignal): Promise<void> {
    return this.retainedHost.yieldMacroTask(signal)
  }
}
