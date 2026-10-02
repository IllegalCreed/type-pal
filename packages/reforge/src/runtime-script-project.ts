import {
  type AuthorItemCoreMap,
  type BaseSceneDef,
  type BaseSceneEntity,
  type EntityAddress,
  type EntityLifecycleCommand,
  type EntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type FlowCursor,
  type RuntimeCommand,
  type RuntimeEntityBehavior,
  type RuntimeEntityDef,
  type RuntimeSceneDef,
  type RuntimeSceneHook,
  type RuntimeScriptFlow,
  type WorldScriptState,
  type WorldState,
} from '@type-pal/content'
import type { BattleResult } from './battle/battle-result.js'
import {
  commitEntityEntityLifecycleCommand,
  type EntityLifecycleCommandCommit,
} from './entity-lifecycle-command.js'
import type { LoadedCurrentProjectCore } from './project-loader.js'
import type { RuntimeLeafCommand } from './runtime-script-compiler.js'
import { compileRuntimeScriptFlow, RuntimeSharedScriptResolver } from './runtime-script-compiler.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'
import type { StoredAutomaticChaseClaim } from './save/types.js'
import {
  registeredScriptActivityLease,
  withRegisteredScriptActivityLineage,
  withScriptActivityLineage,
} from './script-activity-lineage.js'
import type { BaseRuntimeLeafCommand } from './script-compiler-core.js'
import {
  type BaseProjectScriptHostOptions,
  BaseProjectScriptRuntimeHost,
  type ScriptEffectCommitControl,
} from './script-project-core.js'
import type {
  ScriptGateBoundary,
  ScriptRuntimeContext,
  ScriptStepEventLike,
} from './script-runner-core.js'
import { FlowRuntimeCoordinator, resolveEntityBehavior, resolveSceneHook } from './script-world.js'

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
  /** 当前factory内部调用桥；直接基础/独立host不能把新leaf当日志效果吞掉。 */
  invokeEntityTrigger?(
    target: EntityAddress,
    context: Readonly<ScriptRuntimeContext>,
    signal: AbortSignal,
  ): Promise<void>
  /** 同runtime+exact signal的显式调用域，最终派发前同步复核。 */
  guardExecution?(signal: AbortSignal, kind?: string): void
  beforeStep?(
    event: ScriptStepEventLike<RuntimeLeafCommand>,
    owner?: EntityAddress,
  ): void | Promise<void>
  onStep?(event: ScriptStepEventLike<RuntimeLeafCommand>, owner?: EntityAddress): void
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
  if (command.kind === 'vanishEntity') throw new Error('当前 runtime 禁止 vanishEntity')
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
    private readonly coordinator: FlowRuntimeCoordinator,
    private readonly options: ProjectScriptHostOptions,
  ) {
    if (!world.script) world.script = emptyWorldScriptState()
    const script = world.script
    const {
      lifecycleReferences: _lifecycleReferences,
      executeEffect: _executeEffect,
      worldChanged,
      scene,
      invokeEntityTrigger: _invoke,
      guardExecution: _guard,
      beforeStep: _beforeStep,
      onStep: _onStep,
      ...retainedOptions
    } = options
    this.retainedHost = new BaseProjectScriptRuntimeHost(script, coordinator, {
      ...retainedOptions,
      scene: async (sceneId) => validatedBaseScene(await scene(sceneId)),
      executeEffect: (command, context, signal, commitControl) =>
        options.executeEffect(runtimeCommand(command), context, signal, commitControl),
      ...(worldChanged
        ? {
            worldChanged: (command, context) => worldChanged(runtimeCommand(command), context),
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

  gate(
    signal: AbortSignal,
    boundary?: ScriptGateBoundary,
  ): ReturnType<NonNullable<ScriptRuntimeHost['gate']>> {
    return this.retainedHost.gate(signal, boundary)
  }

  async execute(
    command: RuntimeLeafCommand,
    context: Readonly<ScriptRuntimeContext>,
    signal: AbortSignal,
  ): Promise<void> {
    signal.throwIfAborted()
    this.options.guardExecution?.(signal, command.kind)
    if (command.kind === 'runEntityTrigger') {
      if (context.timing !== 'interactive')
        throw new Error('runEntityTrigger 仅允许 interactive 执行')
      if (!this.options.invokeEntityTrigger)
        throw new Error('runEntityTrigger 缺少当前project runtime调用桥')
      await this.options.invokeEntityTrigger(command.target, context, signal)
      return
    }
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
    this.options.guardExecution?.(signal, 'startBattle')
    return await withScriptActivityLineage(this, this.coordinator, signal, () =>
      this.options.startBattle(request, signal),
    )
  }

  teleportOut(signal: AbortSignal): Promise<boolean> {
    this.options.guardExecution?.(signal, 'teleportOut')
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

function entityAt(
  scene: RuntimeSceneDef,
  target: { scene: string; entity: string },
): RuntimeEntityDef {
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
  readonly coordinator: FlowRuntimeCoordinator
  readonly host: ProjectScriptRuntimeHost
  private readonly shared: RuntimeSharedScriptResolver
  private readonly script: WorldScriptState
  private readonly hostScene: ProjectScriptHostOptions['scene']
  private readonly observers: Pick<ProjectScriptHostOptions, 'beforeStep' | 'onStep'>
  private readonly invocationScopes = new WeakMap<
    AbortSignal,
    { scene: string; session: string | number }
  >()

  constructor(
    readonly project: Pick<LoadedCurrentProjectCore, 'sharedScripts'>,
    readonly world: WorldState,
    readonly canonicalContentDigest: string,
    host: ProjectScriptHostOptions,
  ) {
    if (!/^[a-f0-9]{64}$/.test(canonicalContentDigest))
      throw new Error('ScriptProjectRuntime: canonicalContentDigest 非法')
    this.coordinator = new FlowRuntimeCoordinator(host.flowCompleted)
    if (!world.script) world.script = emptyWorldScriptState()
    this.script = world.script
    this.observers = { beforeStep: host.beforeStep, onStep: host.onStep }
    this.host = new ProjectScriptRuntimeHost(world, this.coordinator, {
      ...host,
      guardExecution: (signal, kind) => this.guardInvocation(signal, kind),
      invokeEntityTrigger: (target, context, signal) =>
        this.invokeEntityTrigger(target, context, signal),
    })
    this.shared = new RuntimeSharedScriptResolver(project.sharedScripts, canonicalContentDigest)
    this.hostScene = (id) => host.scene(id)
  }

  private guardInvocation(signal: AbortSignal, kind?: string): void {
    const scope = this.invocationScopes.get(signal)
    if (!scope) return
    signal.throwIfAborted()
    if (
      this.host.currentSceneId() !== scope.scene ||
      this.host.currentSceneSessionId() !== scope.session
    )
      throw new DOMException('runEntityTrigger 当前场景会话已替换', 'AbortError')
    if (
      kind &&
      [
        'loadScene',
        'loadLastSave',
        'quitToTitle',
        'gameOver',
        'teleportOut',
        'startBattle',
      ].includes(kind)
    )
      throw new Error(`runEntityTrigger 当前场景演出禁止 ${kind}；切场、战斗请在调用返回后编排`)
  }

  private runner(signal: AbortSignal, owner?: EntityAddress): RuntimeScriptRunner {
    const runner = new RuntimeScriptRunner(this.host, signal, this.shared)
    const kind = (event: ScriptStepEventLike<RuntimeLeafCommand>): string =>
      event.command.kind === 'leaf' ? event.command.command.kind : event.command.kind
    if (this.invocationScopes.has(signal) || this.observers.beforeStep)
      runner.beforeStep = async (event) => {
        this.guardInvocation(signal, kind(event))
        await this.observers.beforeStep?.(event, owner)
        this.guardInvocation(signal, kind(event))
      }
    // onStep is synchronous after the runner's gate/checkpoint awaits, including control nodes.
    runner.onStep = (event) => {
      this.guardInvocation(signal, kind(event))
      // Shared calls retain their original entry path; forbid only this new foreground leaf.
      const prepare = [1, 2].some(
        (index) => event.path[index] === 'entry' && event.path[index + 1] === 'prepare',
      )
      if (kind(event) === 'runEntityTrigger' && prepare)
        throw new Error('scene-entry prepare 禁止 runEntityTrigger，仅允许呈现后的 interactive')
      this.observers.onStep?.(event, owner)
      this.guardInvocation(signal, kind(event))
    }
    return runner
  }

  isEntityTriggerActive(target: EntityAddress): boolean {
    return this.coordinator.isOwnerActive({ kind: 'entity-behavior', target, channel: 'trigger' })
  }

  private async invokeEntityTrigger(
    target: EntityAddress,
    context: Readonly<ScriptRuntimeContext>,
    signal: AbortSignal,
  ): Promise<void> {
    signal.throwIfAborted()
    if (context.timing !== 'interactive')
      throw new Error('runEntityTrigger 仅允许 interactive 执行')
    const sceneId = this.host.currentSceneId()
    const session = this.host.currentSceneSessionId()
    if (target.scene !== sceneId)
      throw new Error(`runEntityTrigger 目标不属于当前场景：${target.scene}/${target.entity}`)
    if (this.isEntityTriggerActive(target))
      throw new Error(`runEntityTrigger busy/重入：${target.scene}/${target.entity}`)
    const scene = await this.hostScene(target.scene)
    signal.throwIfAborted()
    if (this.host.currentSceneId() !== sceneId || this.host.currentSceneSessionId() !== session)
      throw new DOMException('runEntityTrigger 解析期间场景会话已替换', 'AbortError')
    const entity = entityAt(scene, target)
    if (this.world.entityLifecycles?.[target.scene]?.[target.entity]?.phase === 'removed')
      throw new Error(`runEntityTrigger 目标已永久removed：${target.scene}/${target.entity}`)
    if (this.isEntityTriggerActive(target))
      throw new Error(`runEntityTrigger busy/重入：${target.scene}/${target.entity}`)
    const resolved = resolveRuntimeEntityBehavior(entity, this.script, target, 'trigger')
    if (!resolved || resolved.cursor.kind === 'completed') return
    if (!registeredScriptActivityLease(this.host, this.coordinator, signal))
      throw new Error('runEntityTrigger 缺少同host/exact signal的父activity lineage')
    const previous = this.invocationScopes.get(signal)
    this.invocationScopes.set(signal, previous ?? { scene: sceneId, session })
    try {
      this.guardInvocation(signal)
      const ran = await this.runEntityBehavior(scene, target.entity, 'trigger', { signal })
      this.guardInvocation(signal)
      if (!ran)
        throw new Error(
          `runEntityTrigger 无法取得目标owner（busy）：${target.scene}/${target.entity}`,
        )
    } finally {
      if (previous) this.invocationScopes.set(signal, previous)
      else this.invocationScopes.delete(signal)
    }
  }

  async runEntityBehavior(
    scene: RuntimeSceneDef,
    entityId: string,
    channel: 'trigger' | 'auto',
    options: RunProjectFlowOptions,
  ): Promise<boolean> {
    options.signal.throwIfAborted()
    const target = { scene: scene.id, entity: entityId }
    const entity = entityAt(scene, target)
    const sceneSessionId = this.host.currentSceneSessionId()
    if (this.host.currentSceneId() !== scene.id) return false
    const beforeActivation = resolveRuntimeEntityBehavior(entity, this.script, target, channel)
    if (!beforeActivation || beforeActivation.cursor.kind === 'completed') return false
    const parent = registeredScriptActivityLease(this.host, this.coordinator, options.signal)
    let active = this.coordinator.beginEntityBehavior(
      this.script,
      entity as unknown as BaseSceneEntity,
      target,
      channel,
      parent,
    )
    while (!active && !parent && this.coordinator.gateClosed()) {
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
    const runner = this.runner(options.signal, target)
    try {
      await withRegisteredScriptActivityLineage(
        this.host,
        this.coordinator,
        options.signal,
        active.lease,
        () =>
          runner.runFlow(
            compileRuntimeScriptFlow(resolved.behavior.flow, {
              canonicalContentDigest: this.canonicalContentDigest,
              timing: channel === 'auto' ? 'auto' : 'interactive',
            }),
            {
              cursor: active.cursor,
              ...(active.resume ? { resume: active.resume } : {}),
              cursorController: active.lease,
              self: target,
            },
          ),
      )
      active.lease.discardContinuation()
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
    options.signal.throwIfAborted()
    const sceneSessionId = this.host.currentSceneSessionId()
    if (this.host.currentSceneId() !== scene.id) return false
    const beforeActivation = resolveRuntimeSceneHook(scene, this.script, slot)
    if (!beforeActivation || beforeActivation.cursor.kind === 'completed') return false
    const parent = registeredScriptActivityLease(this.host, this.coordinator, options.signal)
    let active = this.coordinator.beginSceneHook(
      this.script,
      scene as unknown as import('@type-pal/content').BaseSceneDef,
      slot,
      parent,
    )
    while (!active && !parent && this.coordinator.gateClosed()) {
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
    const runner = this.runner(options.signal)
    try {
      await withRegisteredScriptActivityLineage(
        this.host,
        this.coordinator,
        options.signal,
        active.lease,
        () =>
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
      const runner = this.runner(options.signal, options.self)
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
    await this.runCommands(script.body, options)
  }

  /** 编辑器仅在scratch factory调用；选中flow/cursor不改实际绑定，owner仍参与真实重入保护。 */
  async runPreviewFlow(
    flow: RuntimeScriptFlow,
    options: RunProjectCommandsOptions & {
      cursor?: FlowCursor
      allowSceneEntry?: boolean
      runSceneEntry?: boolean
    },
  ): Promise<void> {
    options.signal.throwIfAborted()
    const lease = options.self
      ? this.coordinator.begin(
          {
            kind: 'entity-behavior',
            target: options.self,
            channel: options.timing === 'auto' ? 'auto' : 'trigger',
          },
          () => {},
        )
      : this.coordinator.beginActivity()
    if (!lease) throw new Error('preview flow owner busy')
    try {
      await withRegisteredScriptActivityLineage(
        this.host,
        this.coordinator,
        options.signal,
        lease,
        () =>
          this.runner(options.signal, options.self).runFlow(
            compileRuntimeScriptFlow(flow, {
              canonicalContentDigest: this.canonicalContentDigest,
              timing: options.timing ?? 'interactive',
              allowSceneEntry: options.allowSceneEntry,
            }),
            {
              cursorController: { reachSafePoint: () => 'continue' },
              ...(options.cursor ? { cursor: structuredClone(options.cursor) } : {}),
              ...(options.self ? { self: structuredClone(options.self) } : {}),
              allowSceneEntry: options.allowSceneEntry,
              runSceneEntry: options.runSceneEntry,
            },
          ),
      )
    } finally {
      lease.close()
    }
  }

  /** Restore preflight: validate every saved auto address before replacing the live world. */
  async validateAutomaticContinuations(
    world: WorldState,
    signal: AbortSignal,
    claims: readonly StoredAutomaticChaseClaim[] = [],
    restoredScene = this.host.currentSceneId(),
  ): Promise<void> {
    const offstage = (target: EntityAddress): boolean => {
      const phase = world.entityLifecycles?.[target.scene]?.[target.entity]?.phase
      return phase === 'despawned' || phase === 'awaitingExit' || phase === 'removed'
    }
    for (const [sceneId, entities] of Object.entries(world.script?.behaviors.entities ?? {})) {
      for (const [entityId, state] of Object.entries(entities)) {
        const saved = state.auto?.cursor
        if (!saved?.resume) continue
        const scene = await this.hostScene(sceneId)
        if (scene.id !== sceneId) throw new Error('auto resume: scene地址不匹配')
        const entity = scene.entities.find((value) => value.id === entityId)
        if (!entity || !world.script)
          throw new Error(`auto resume: 实体不存在 ${sceneId}/${entityId}`)
        // A dormant cursor can belong to a previous page/selection. Validate its owning code,
        // not the currently active page; normal activation only resumes matching behavior IDs.
        const behavior = entity.behaviors?.auto?.[saved.behavior]
        if (!behavior) throw new Error('auto resume: 所属behavior不存在')
        const owner = { scene: sceneId, entity: entityId }
        const location = await new RuntimeScriptRunner(
          this.host,
          signal,
          this.shared,
        ).validateContinuation(
          compileRuntimeScriptFlow(behavior.flow, {
            canonicalContentDigest: this.canonicalContentDigest,
            timing: 'auto',
          }),
          saved.at,
          saved.resume,
          owner,
        )
        const active = resolveRuntimeEntityBehavior(entity, world.script, owner, 'auto')
        if (
          owner.scene === restoredScene &&
          active?.behaviorId === saved.behavior &&
          location.leaf?.kind === 'chasePlayer' &&
          location.self &&
          !offstage(owner) &&
          !offstage(location.self) &&
          location.control?.kind === 'leaf' &&
          location.control.phase === 'continuation' &&
          !claims.some(
            (claim) =>
              claim.owner.scene === owner.scene &&
              claim.owner.entity === owner.entity &&
              claim.behavior === saved.behavior &&
              claim.target.scene === location.self?.scene &&
              claim.target.entity === location.self?.entity,
          )
        )
          throw new Error('auto resume: 缺少已提交追逐认领')
      }
    }
    for (const claim of claims) {
      signal.throwIfAborted()
      if (claim.owner.scene !== restoredScene || claim.target.scene !== restoredScene)
        throw new Error('auto chase claim: 不属于保存场景')
      const scene = await this.hostScene(restoredScene)
      const owner = entityAt(scene, claim.owner)
      entityAt(scene, claim.target)
      const active = world.script
        ? resolveRuntimeEntityBehavior(owner, world.script, claim.owner, 'auto')
        : undefined
      if (active?.behaviorId !== claim.behavior)
        throw new Error('auto chase claim: owner方案未选中')
      if (offstage(claim.owner)) throw new Error('auto chase claim: owner已离场')
    }
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
