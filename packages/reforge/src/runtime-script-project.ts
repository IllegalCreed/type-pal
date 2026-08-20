import {
  type RuntimeCommand,
  type BaseSceneEntity,
  type RuntimeEntityDef,
  type EntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type AuthorItemCoreMap,
  type EntityLifecycleCommand,
  type RuntimeEntityBehavior,
  type RuntimeSceneHook,
  type BaseSceneDef,
  type RuntimeSceneDef,
  type WorldScriptState,
  type WorldState,
} from '@type-pal/content'
import type { BattleResult } from './battle/battle-result.js'
import {
  commitEntityEntityLifecycleCommand,
  type EntityLifecycleCommandCommit,
} from './entity-lifecycle-command.js'
import type { LoadedCurrentProjectCore } from './project-loader.js'
import {
  withRegisteredScriptActivityLineage,
  withScriptActivityLineage,
} from './script-activity-lineage.js'
import type { BaseRuntimeLeafCommand } from './script-compiler-core.js'
import type { RuntimeLeafCommand } from './runtime-script-compiler.js'
import { compileRuntimeScriptFlow, RuntimeSharedScriptResolver } from './runtime-script-compiler.js'
import {
  type BaseProjectScriptHostOptions,
  BaseProjectScriptRuntimeHost,
  type ScriptEffectCommitControl,
} from './script-project-core.js'
import type { ScriptRuntimeContext } from './script-runner-core.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'
import {
  FlowRuntimeCoordinator,
  resolveEntityBehavior,
  resolveSceneHook,
} from './script-world.js'

export interface ProjectScriptHostOptions
  extends Omit<BaseProjectScriptHostOptions, 'executeEffect' | 'worldChanged' | 'scene'> {
  lifecycleReferences: EntityLifecycleReferenceIndex
  executeEffect(
    command: RuntimeLeafCommand,
    context: Readonly<ScriptRuntimeContext>,
    signal: AbortSignal,
    commitControl?: ScriptEffectCommitControl,
  ): void | Promise<void>
  worldChanged?(
    command: RuntimeLeafCommand,
    context: Readonly<ScriptRuntimeContext>,
    lifecycleCommit?: Readonly<EntityLifecycleCommandCommit>,
  ): void | Promise<void>
  scene(sceneId: string): RuntimeSceneDef | Promise<RuntimeSceneDef>
}

function isLifecycleCommand(command: RuntimeLeafCommand): command is EntityLifecycleCommand {
  return (
    command.kind === 'suspendEntity' ||
    command.kind === 'hideEntity' ||
    command.kind === 'restoreEntity' ||
    command.kind === 'removeEntity'
  )
}

/** 当前 loader 已验证基础 scene shape；基础 host 只读取行为选择，不执行 author command。 */
function validatedBaseScene(scene: RuntimeSceneDef): BaseSceneDef {
  return scene as unknown as BaseSceneDef
}

/** 生命周期叶由当前 host 单独提交；其余叶可交给共享基础 host。 */
function retainedBaseCommand(command: RuntimeLeafCommand): BaseRuntimeLeafCommand {
  if (isLifecycleCommand(command))
    throw new Error(`lifecycle command ${command.kind} 不得进入基础 host`)
  return command as unknown as BaseRuntimeLeafCommand
}

function runtimeCommand(command: BaseRuntimeLeafCommand): RuntimeLeafCommand {
  if (command.kind === 'vanishEntity')
    throw new Error('当前 runtime 禁止 vanishEntity')
  return command as unknown as RuntimeLeafCommand
}

/**
 * 当前 canonical world authority。基础 script 字段由共享 host 维护；四个 lifecycle leaf
 * 在同一 execute commit point 原子替换 world.entityLifecycles，再通知画面投影刷新。
 */
export class ProjectScriptRuntimeHost implements ScriptRuntimeHost {
  private readonly retainedHost: BaseProjectScriptRuntimeHost

  constructor(
    private readonly world: WorldState,
    coordinator: FlowRuntimeCoordinator,
    private readonly options: ProjectScriptHostOptions,
  ) {
    if (!world.script) world.script = emptyWorldScriptState()
    const script = world.script
    const {
      lifecycleReferences: _lifecycleReferences,
      executeEffect: _executeEffect,
      worldChanged,
      scene,
      ...retainedOptions
    } = options
    this.retainedHost = new BaseProjectScriptRuntimeHost(script, coordinator, {
      ...retainedOptions,
      scene: async (sceneId) => validatedBaseScene(await scene(sceneId)),
      executeEffect: (command, context, signal, commitControl) =>
        options.executeEffect(runtimeCommand(command), context, signal, commitControl),
      ...(worldChanged
        ? {
            worldChanged: (command, context) =>
              worldChanged(runtimeCommand(command), context),
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
    command: RuntimeLeafCommand,
    context: Readonly<ScriptRuntimeContext>,
    signal: AbortSignal,
  ): Promise<void> {
    signal.throwIfAborted()
    if (!isLifecycleCommand(command)) {
      await this.retainedHost.execute(retainedBaseCommand(command), context, signal)
      return
    }
    const committed = commitEntityEntityLifecycleCommand(
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
    condition: Parameters<ScriptRuntimeHost['evalCondition']>[0],
    context: Readonly<ScriptRuntimeContext>,
  ): boolean {
    return this.retainedHost.evalCondition(condition, context)
  }

  confirm(signal: AbortSignal): Promise<boolean> {
    return this.retainedHost.confirm(signal)
  }

  async startBattle(
    request: Parameters<ScriptRuntimeHost['startBattle']>[0],
    signal: AbortSignal,
  ): Promise<BattleResult> {
    return await this.retainedHost.startBattle(request, signal)
  }

  teleportOut(signal: AbortSignal): Promise<boolean> {
    return this.retainedHost.teleportOut(signal)
  }

  revealSceneEntry(
    reveal: Parameters<NonNullable<ScriptRuntimeHost['revealSceneEntry']>>[0],
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

function entityAt(scene: RuntimeSceneDef, target: { scene: string; entity: string }): RuntimeEntityDef {
  if (scene.id !== target.scene)
    throw new Error(`script target scene 不匹配: ${target.scene} / ${scene.id}`)
  const entity = scene.entities.find((candidate) => candidate.id === target.entity)
  if (!entity) throw new Error(`script entity 不存在: ${target.scene}/${target.entity}`)
  return entity
}

interface ResolvedRuntimeEntityBehavior {
  behaviorId: string
  behavior: RuntimeEntityBehavior
  cursor: import('@type-pal/content').FlowCursor
}

interface ResolvedRuntimeSceneHook {
  hookId: string
  hook: RuntimeSceneHook
  cursor: import('@type-pal/content').FlowCursor
}

/** 当前 validator 已闭合递归 command 结构；行为选择/游标复用基础 coordinator。 */
function resolveRuntimeEntityBehavior(
  entity: RuntimeEntityDef,
  world: WorldScriptState,
  target: { scene: string; entity: string },
  channel: 'trigger' | 'auto',
): ResolvedRuntimeEntityBehavior | undefined {
  return resolveEntityBehavior(
    entity as unknown as BaseSceneEntity,
    world,
    target,
    channel,
  ) as unknown as ResolvedRuntimeEntityBehavior | undefined
}

function resolveRuntimeSceneHook(
  scene: RuntimeSceneDef,
  world: WorldScriptState,
  slot: 'onEnter' | 'onTeleport',
): ResolvedRuntimeSceneHook | undefined {
  return resolveSceneHook(
    scene as unknown as import('@type-pal/content').BaseSceneDef,
    world,
    slot,
  ) as unknown as ResolvedRuntimeSceneHook | undefined
}

export interface RunProjectFlowOptions {
  signal: AbortSignal
  runSceneEntry?: boolean
}

export interface RunProjectCommandsOptions {
  signal: AbortSignal
  self?: { scene: string; entity: string }
  timing?: 'auto' | 'interactive'
}

type SynchronousSnapshot<T> = T extends PromiseLike<unknown> ? never : T

/** 当前 project runtime；只在 current validator/loader 已通过后可构造。 */
export class ScriptProjectRuntime {
  readonly coordinator = new FlowRuntimeCoordinator()
  readonly host: ProjectScriptRuntimeHost
  private readonly shared: RuntimeSharedScriptResolver
  private readonly script: WorldScriptState

  constructor(
    readonly project: Pick<LoadedCurrentProjectCore, 'sharedScripts'>,
    readonly world: WorldState,
    readonly canonicalContentDigest: string,
    host: ProjectScriptHostOptions,
  ) {
    if (!/^[a-f0-9]{64}$/.test(canonicalContentDigest))
      throw new Error('ScriptProjectRuntime: canonicalContentDigest 非法')
    if (!world.script) world.script = emptyWorldScriptState()
    this.script = world.script
    this.host = new ProjectScriptRuntimeHost(world, this.coordinator, host)
    this.shared = new RuntimeSharedScriptResolver(project.sharedScripts, canonicalContentDigest)
  }

  async runEntityBehavior(
    scene: RuntimeSceneDef,
    entityId: string,
    channel: 'trigger' | 'auto',
    options: RunProjectFlowOptions,
  ): Promise<boolean> {
    const target = { scene: scene.id, entity: entityId }
    const entity = entityAt(scene, target)
    const sceneSessionId = this.host.currentSceneSessionId()
    if (this.host.currentSceneId() !== scene.id) return false
    if (!resolveRuntimeEntityBehavior(entity, this.script, target, channel)) return false
    let active = this.coordinator.beginEntityBehavior(
      this.script,
      entity as unknown as BaseSceneEntity,
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
        entity as unknown as BaseSceneEntity,
        target,
        channel,
      )
    }
    if (!active) return false
    const resolved = resolveRuntimeEntityBehavior(entity, this.script, target, channel)
    if (!resolved) {
      active.lease.close()
      throw new Error(`script behavior 在激活后消失: ${scene.id}/${entityId}/${channel}`)
    }
    const runner = new RuntimeScriptRunner(this.host, options.signal, this.shared)
    try {
      await withRegisteredScriptActivityLineage(this.host, options.signal, () =>
        runner.runFlow(
          compileRuntimeScriptFlow(resolved.behavior.flow, {
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
    scene: RuntimeSceneDef,
    slot: 'onEnter' | 'onTeleport',
    options: RunProjectFlowOptions,
  ): Promise<boolean> {
    const sceneSessionId = this.host.currentSceneSessionId()
    if (this.host.currentSceneId() !== scene.id) return false
    if (!resolveRuntimeSceneHook(scene, this.script, slot)) return false
    let active = this.coordinator.beginSceneHook(
      this.script,
      scene as unknown as import('@type-pal/content').BaseSceneDef,
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
        scene as unknown as import('@type-pal/content').BaseSceneDef,
        slot,
      )
    }
    if (!active) return false
    const resolved = resolveRuntimeSceneHook(scene, this.script, slot)
    if (!resolved) {
      active.lease.close()
      throw new Error(`script scene hook 在激活后消失: ${scene.id}/${slot}`)
    }
    const runner = new RuntimeScriptRunner(this.host, options.signal, this.shared)
    try {
      await withRegisteredScriptActivityLineage(this.host, options.signal, () =>
        runner.runFlow(
          compileRuntimeScriptFlow(resolved.hook.flow, {
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
    commands: readonly RuntimeCommand[],
    options: RunProjectCommandsOptions,
  ): Promise<void> {
    await withScriptActivityLineage(this.host, this.coordinator, options.signal, async () => {
      const runner = new RuntimeScriptRunner(this.host, options.signal, this.shared)
      await runner.runFlow(
        compileRuntimeScriptFlow(
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

  async runSharedScript(script: string, options: RunProjectCommandsOptions): Promise<void> {
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
    items: AuthorItemCoreMap,
    itemId: string,
    scriptId: 'use',
    options: RunProjectCommandsOptions,
  ): Promise<void> {
    const script = items[itemId]?.use?.effects
      .filter((effect) => effect.kind === 'itemPrivateScript')
      .find((effect) => effect.script.id === scriptId)?.script
    if (!script) throw new Error(`item private script 不存在: ${itemId}/${scriptId}`)
    await this.runCommands(script.body as unknown as readonly RuntimeCommand[], options)
  }

  async withSaveBarrier<T>(snapshot: () => SynchronousSnapshot<T>, timeoutMs = 10_000): Promise<T> {
    const barrier = this.coordinator.requestSaveBarrier()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        barrier.ready,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`script save barrier 超时 ${timeoutMs}ms`)),
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
        throw new Error('script save barrier 只允许同步快照')
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
