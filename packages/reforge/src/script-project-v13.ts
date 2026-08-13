import {
  type AuthorCommandV13,
  type EntityBaseV5,
  type EntityDefV13,
  type EntityLifecycleReferenceIndexV13,
  emptyWorldScriptStateV5,
  type ItemDataMapV5,
  type LifecycleCommandV13,
  type NamedEntityBehaviorV13,
  type NamedSceneHookV13,
  type SceneDefV5,
  type SceneDefV13,
  type WorldScriptStateV5,
  type WorldStateV13,
} from '@type-pal/content'
import type { BattleResult } from './battle/battle-result.js'
import {
  commitEntityLifecycleCommandV13,
  type EntityLifecycleCommandCommitV13,
} from './entity-lifecycle-command.js'
import type { LoadedProjectV13Core } from './loader-v13.js'
import {
  withRegisteredScriptActivityLineageV5,
  withScriptActivityLineageV5,
} from './script-activity-lineage-v5.js'
import type { RuntimeLeafCommandV5 } from './script-compiler-v5.js'
import type { RuntimeLeafCommandV13 } from './script-compiler-v13.js'
import { compileScriptFlowV13, MemorySharedScriptResolverV13 } from './script-compiler-v13.js'
import {
  type ProjectScriptHostOptionsV5,
  ProjectScriptRuntimeHostV5,
  type ScriptEffectCommitControlV5,
} from './script-project-v5.js'
import type { ScriptRuntimeContextV5 } from './script-runner-v5.js'
import { ScriptRunnerV13, type ScriptRuntimeHostV13 } from './script-runner-v13.js'
import {
  FlowRuntimeCoordinatorV5,
  resolveEntityBehaviorV5,
  resolveSceneHookV5,
} from './script-world-v5.js'

export interface ProjectScriptHostOptionsV13
  extends Omit<ProjectScriptHostOptionsV5, 'executeEffect' | 'worldChanged' | 'scene'> {
  lifecycleReferences: EntityLifecycleReferenceIndexV13
  executeEffect(
    command: RuntimeLeafCommandV13,
    context: Readonly<ScriptRuntimeContextV5>,
    signal: AbortSignal,
    commitControl?: ScriptEffectCommitControlV5,
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
    if (!world.script) world.script = emptyWorldScriptStateV5()
    const script = world.script
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
      executeEffect: (command, context, signal, commitControl) =>
        options.executeEffect(retainedCommandAsV13(command), context, signal, commitControl),
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
    // Canonical lifecycle state is already durable. Its live projection is the other half of the
    // same commit and must run even when executeEffect observes a post-commit abort/rejection.
    try {
      await this.options.executeEffect(command, context, signal)
    } finally {
      await this.options.worldChanged?.(command, context, committed)
    }
    signal.throwIfAborted()
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

function entityAtV13(scene: SceneDefV13, target: { scene: string; entity: string }): EntityDefV13 {
  if (scene.id !== target.scene)
    throw new Error(`script v13 target scene 不匹配: ${target.scene} / ${scene.id}`)
  const entity = scene.entities.find((candidate) => candidate.id === target.entity)
  if (!entity) throw new Error(`script v13 entity 不存在: ${target.scene}/${target.entity}`)
  return entity
}

interface ResolvedEntityBehaviorV13 {
  behaviorId: string
  behavior: NamedEntityBehaviorV13
  cursor: import('@type-pal/content').FlowCursor
}

interface ResolvedSceneHookV13 {
  hookId: string
  hook: NamedSceneHookV13
  cursor: import('@type-pal/content').FlowCursor
}

/** v13 validator 已闭合递归 command 结构；行为选择/游标 coordinator 继续复用 v5 逻辑。 */
function resolveEntityBehaviorV13(
  entity: EntityDefV13,
  world: WorldScriptStateV5,
  target: { scene: string; entity: string },
  channel: 'trigger' | 'auto',
): ResolvedEntityBehaviorV13 | undefined {
  return resolveEntityBehaviorV5(
    entity as unknown as EntityBaseV5,
    world,
    target,
    channel,
  ) as unknown as ResolvedEntityBehaviorV13 | undefined
}

function resolveSceneHookV13(
  scene: SceneDefV13,
  world: WorldScriptStateV5,
  slot: 'onEnter' | 'onTeleport',
): ResolvedSceneHookV13 | undefined {
  return resolveSceneHookV5(
    scene as unknown as import('@type-pal/content').SceneDefV5,
    world,
    slot,
  ) as unknown as ResolvedSceneHookV13 | undefined
}

export interface RunProjectFlowV13Options {
  signal: AbortSignal
  runSceneEntry?: boolean
}

export interface RunProjectCommandsV13Options {
  signal: AbortSignal
  self?: { scene: string; entity: string }
  timing?: 'auto' | 'interactive'
}

type SynchronousSnapshot<T> = T extends PromiseLike<unknown> ? never : T

/** content13 project runtime；只在 v13 validator/loader 已通过后可构造。 */
export class ScriptProjectRuntimeV13 {
  readonly coordinator = new FlowRuntimeCoordinatorV5()
  readonly host: ProjectScriptRuntimeHostV13
  private readonly shared: MemorySharedScriptResolverV13
  private readonly script: WorldScriptStateV5

  constructor(
    readonly project: LoadedProjectV13Core,
    readonly world: WorldStateV13,
    readonly canonicalContentDigest: string,
    host: ProjectScriptHostOptionsV13,
  ) {
    if (!/^[a-f0-9]{64}$/.test(canonicalContentDigest))
      throw new Error('ScriptProjectRuntimeV13: canonicalContentDigest 非法')
    if (!world.script) world.script = emptyWorldScriptStateV5()
    this.script = world.script
    this.host = new ProjectScriptRuntimeHostV13(world, this.coordinator, host)
    this.shared = new MemorySharedScriptResolverV13(project.sharedScripts, canonicalContentDigest)
  }

  async runEntityBehavior(
    scene: SceneDefV13,
    entityId: string,
    channel: 'trigger' | 'auto',
    options: RunProjectFlowV13Options,
  ): Promise<boolean> {
    const target = { scene: scene.id, entity: entityId }
    const entity = entityAtV13(scene, target)
    const sceneSessionId = this.host.currentSceneSessionId()
    if (this.host.currentSceneId() !== scene.id) return false
    if (!resolveEntityBehaviorV13(entity, this.script, target, channel)) return false
    let active = this.coordinator.beginEntityBehavior(
      this.script,
      entity as unknown as EntityBaseV5,
      target,
      channel,
    )
    while (!active && this.coordinator.gateClosed()) {
      await this.coordinator.waitForActivationGate(options.signal)
      options.signal.throwIfAborted()
      if (
        this.host.currentSceneId() !== scene.id ||
        this.host.currentSceneSessionId() !== sceneSessionId
      )
        return false
      active = this.coordinator.beginEntityBehavior(
        this.script,
        entity as unknown as EntityBaseV5,
        target,
        channel,
      )
    }
    if (!active) return false
    const resolved = resolveEntityBehaviorV13(entity, this.script, target, channel)
    if (!resolved) {
      active.lease.close()
      throw new Error(`script v13 behavior 在激活后消失: ${scene.id}/${entityId}/${channel}`)
    }
    const runner = new ScriptRunnerV13(this.host, options.signal, this.shared)
    try {
      await withRegisteredScriptActivityLineageV5(this.host, options.signal, () =>
        runner.runFlow(
          compileScriptFlowV13(resolved.behavior.flow, {
            canonicalContentDigest: this.canonicalContentDigest,
            timing: channel === 'auto' ? 'auto' : 'interactive',
          }),
          {
            cursor: active.cursor,
            cursorController: active.lease,
            self: target,
          },
        ),
      )
      return true
    } finally {
      active.lease.close()
    }
  }

  async runSceneHook(
    scene: SceneDefV13,
    slot: 'onEnter' | 'onTeleport',
    options: RunProjectFlowV13Options,
  ): Promise<boolean> {
    const sceneSessionId = this.host.currentSceneSessionId()
    if (this.host.currentSceneId() !== scene.id) return false
    if (!resolveSceneHookV13(scene, this.script, slot)) return false
    let active = this.coordinator.beginSceneHook(
      this.script,
      scene as unknown as import('@type-pal/content').SceneDefV5,
      slot,
    )
    while (!active && this.coordinator.gateClosed()) {
      await this.coordinator.waitForActivationGate(options.signal)
      options.signal.throwIfAborted()
      if (
        this.host.currentSceneId() !== scene.id ||
        this.host.currentSceneSessionId() !== sceneSessionId
      )
        return false
      active = this.coordinator.beginSceneHook(
        this.script,
        scene as unknown as import('@type-pal/content').SceneDefV5,
        slot,
      )
    }
    if (!active) return false
    const resolved = resolveSceneHookV13(scene, this.script, slot)
    if (!resolved) {
      active.lease.close()
      throw new Error(`script v13 scene hook 在激活后消失: ${scene.id}/${slot}`)
    }
    const runner = new ScriptRunnerV13(this.host, options.signal, this.shared)
    try {
      await withRegisteredScriptActivityLineageV5(this.host, options.signal, () =>
        runner.runFlow(
          compileScriptFlowV13(resolved.hook.flow, {
            canonicalContentDigest: this.canonicalContentDigest,
            timing: 'interactive',
            allowSceneEntry: slot === 'onEnter',
          }),
          {
            cursor: active.cursor,
            cursorController: active.lease,
            allowSceneEntry: slot === 'onEnter',
            runSceneEntry: options.runSceneEntry ?? slot === 'onEnter',
          },
        ),
      )
      return true
    } finally {
      active.lease.close()
    }
  }

  async runCommands(
    commands: readonly AuthorCommandV13[],
    options: RunProjectCommandsV13Options,
  ): Promise<void> {
    await withScriptActivityLineageV5(this.host, this.coordinator, options.signal, async () => {
      const runner = new ScriptRunnerV13(this.host, options.signal, this.shared)
      await runner.runFlow(
        compileScriptFlowV13(
          {
            kind: 'stages',
            initial: '__transient',
            stages: [{ id: '__transient', body: [...structuredClone(commands)] }],
          },
          {
            canonicalContentDigest: this.canonicalContentDigest,
            timing: options.timing ?? 'interactive',
          },
        ),
        {
          cursor: { kind: 'stage', stage: '__transient' },
          cursorController: { reachSafePoint: () => 'continue' },
          ...(options.self ? { self: structuredClone(options.self) } : {}),
        },
      )
    })
  }

  async runSharedScript(script: string, options: RunProjectCommandsV13Options): Promise<void> {
    await this.runCommands(
      [
        {
          kind: 'callScript',
          script,
          ...(options.self ? { self: structuredClone(options.self) } : {}),
        },
      ],
      options,
    )
  }

  async runItemPrivateScript(
    items: ItemDataMapV5,
    itemId: string,
    scriptId: 'use',
    options: RunProjectCommandsV13Options,
  ): Promise<void> {
    const script = items[itemId]?.use?.effects
      .filter((effect) => effect.kind === 'itemPrivateScript')
      .find((effect) => effect.script.id === scriptId)?.script
    if (!script) throw new Error(`item private script 不存在: ${itemId}/${scriptId}`)
    await this.runCommands(script.body as unknown as readonly AuthorCommandV13[], options)
  }

  async withSaveBarrier<T>(snapshot: () => SynchronousSnapshot<T>, timeoutMs = 10_000): Promise<T> {
    const barrier = this.coordinator.requestSaveBarrier()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        barrier.ready,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`script v13 save barrier 超时 ${timeoutMs}ms`)),
            timeoutMs,
          )
        }),
      ])
      const value = snapshot()
      if (
        typeof value === 'object' &&
        value !== null &&
        'then' in value &&
        typeof value.then === 'function'
      )
        throw new Error('script v13 save barrier 只允许同步快照')
      return value as T
    } catch (error) {
      barrier.cancel(error)
      throw error
    } finally {
      if (timer !== undefined) clearTimeout(timer)
      try {
        barrier.release()
      } catch {
        // cancel/timeout 后 handle 已失效。
      }
    }
  }
}
