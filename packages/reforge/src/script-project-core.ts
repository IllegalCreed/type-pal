import type {
  BaseAuthorCommand,
  BaseSceneDef,
  BaseSceneEntity,
  BaseScriptLibrary,
  EntityAddress,
  GridPos,
  WorldScriptState,
} from '@type-pal/content'
import type { BattleResult } from './battle/battle-result.js'
import {
  withRegisteredScriptActivityLineage,
  withScriptActivityLineage,
} from './script-activity-lineage.js'
import type { BaseRuntimeLeafCommand } from './script-compiler-core.js'
import { BaseSharedScriptResolver, compileBaseScriptFlow } from './script-compiler-core.js'
import type { BaseScriptRuntimeHost, ScriptRuntimeContext } from './script-runner-core.js'
import { ScriptRunnerCore } from './script-runner-core.js'
import {
  evalAuthorCondition,
  FlowRuntimeCoordinator,
  resolveEntityBehavior,
  resolveSceneHook,
  selectBaseEntityPage,
  selectBaseSceneHooks,
  selectEntityBehavior,
  setEntityTriggerActivation,
} from './script-world.js'

type RuntimeHostServices = Omit<BaseScriptRuntimeHost, 'execute' | 'evalCondition'>

/**
 * Private host/runtime handshake for moveEntity's linearization point. The scene adapter invokes
 * this only after the live endpoint is accepted, before touch/encounter side effects run.
 */
export interface ScriptEffectCommitControl {
  commitMoveEntityEndpoint(): void
  readonly moveEntityEndpointCommitted: boolean
}

export interface BaseProjectScriptHostOptions extends RuntimeHostServices {
  /** 画面/音频/战斗等宿主副作用；world script 真值由本层先行维护。 */
  executeEffect(
    command: BaseRuntimeLeafCommand,
    context: Readonly<ScriptRuntimeContext>,
    signal: AbortSignal,
    commitControl?: ScriptEffectCommitControl,
  ): void | Promise<void>
  /** canonical 写入和宿主 effect 均成功后的投影刷新点。 */
  worldChanged?(
    command: BaseRuntimeLeafCommand,
    context: Readonly<ScriptRuntimeContext>,
  ): void | Promise<void>
  scene(sceneId: string): BaseSceneDef | Promise<BaseSceneDef>
  currentSceneId(): string
  /**
   * 当前场景实例/世界会话的稳定身份；同 ID 重载、离开后返回或 world replacement 必须变化。
   * 未提供时仅回退到 scene id，方便无异步换场景的独立宿主。
   */
  currentSceneSessionId?(): string | number
  /** 0x12 相对队伍摆位在宿主坐标系求值后，返回应持久化的绝对格。 */
  entityPosRelativeToParty?(target: EntityAddress, dcol: number, drow: number): GridPos
  query: {
    hasItem(itemId: string, atLeast: number): boolean
    ownsItem(itemId: string, atLeast: number): boolean
    itemEquipped(itemId: string, atLeast: number): boolean
    allFullHp(): boolean
    money(): number
    inParty(actorId: string): boolean
    entityInScene(target: EntityAddress): boolean
    facingEntity(target: EntityAddress, range: number): boolean
  }
  random?: () => number
}

function entityAt(scene: BaseSceneDef, target: EntityAddress): BaseSceneEntity {
  if (scene.id !== target.scene)
    throw new Error(`script target scene 不匹配: ${target.scene} / ${scene.id}`)
  const entity = scene.entities.find((candidate) => candidate.id === target.entity)
  if (!entity) throw new Error(`script entity 不存在: ${target.scene}/${target.entity}`)
  return entity
}

function writeEntityValue<T>(
  table: Record<string, Record<string, T>>,
  target: EntityAddress,
  value: T,
): void {
  const scene = table[target.scene] ?? {}
  table[target.scene] = scene
  scene[target.entity] = structuredClone(value)
}

/**
 * Canonical world-state authority. ScriptRunnerCore only负责控制流；所有持久 script 字段都在这里写，
 * 宿主 effect 只负责把已提交状态反映到画面/音频/战斗系统。
 */
export class BaseProjectScriptRuntimeHost implements BaseScriptRuntimeHost {
  constructor(
    private readonly world: WorldScriptState,
    private readonly coordinator: FlowRuntimeCoordinator,
    private readonly options: BaseProjectScriptHostOptions,
  ) {}

  currentSceneId(): string {
    return this.options.currentSceneId()
  }

  currentSceneSessionId(): string | number {
    return this.options.currentSceneSessionId?.() ?? this.options.currentSceneId()
  }

  gate(signal: AbortSignal): void | Promise<void> {
    return this.options.gate?.(signal)
  }

  async execute(
    command: BaseRuntimeLeafCommand,
    context: Readonly<ScriptRuntimeContext>,
    signal: AbortSignal,
  ): Promise<void> {
    switch (command.kind) {
      case 'setFlag':
        this.world.flags[command.flag] = command.value
        break
      case 'setVar':
        this.world.vars[command.var] = command.value
        break
      case 'addVar':
        this.world.vars[command.var] = (this.world.vars[command.var] ?? 0) + command.delta
        break
      case 'setScreenWave':
        this.world.vars['sys:screenWave'] = command.level
        this.world.vars['sys:waveProgression'] = command.progression
        break
      case 'setEntityState':
        writeEntityValue(this.world.entityState, command.target, command.state)
        break
      case 'setMultiEntityState':
        for (const target of command.targets)
          writeEntityValue(this.world.entityState, target, command.state)
        break
      case 'setEntityPos':
        this.world.entityPos ??= {}
        writeEntityValue(this.world.entityPos, command.target, command.pos)
        break
      case 'moveEntity': {
        const sceneSessionId = this.currentSceneSessionId()
        let committed = false
        let projection = Promise.resolve()
        const commitControl: ScriptEffectCommitControl = {
          commitMoveEntityEndpoint: (): void => {
            if (committed) return
            signal.throwIfAborted()
            if (
              this.options.currentSceneId() !== command.target.scene ||
              this.currentSceneSessionId() !== sceneSessionId
            )
              throw new DOMException('moveEntity scene session changed', 'AbortError')
            this.world.entityPos ??= {}
            writeEntityValue(this.world.entityPos, command.target, command.to)
            committed = true
            projection = Promise.resolve(this.options.worldChanged?.(command, context))
          },
          get moveEntityEndpointCommitted(): boolean {
            return committed
          },
        }
        await this.options.executeEffect(command, context, signal, commitControl)
        if (!committed) commitControl.commitMoveEntityEndpoint()
        await projection
        // A post-commit abort stops subsequent commands but cannot roll back the accepted endpoint.
        signal.throwIfAborted()
        return
      }
      case 'setEntityPosRelParty': {
        const pos = this.options.entityPosRelativeToParty?.(
          command.target,
          command.dcol,
          command.drow,
        )
        if (!pos)
          throw new Error(
            `setEntityPosRelParty 缺绝对坐标解析器: ${command.target.scene}/${command.target.entity}`,
          )
        this.world.entityPos ??= {}
        writeEntityValue(this.world.entityPos, command.target, pos)
        break
      }
      case 'setEntityLayer':
        this.world.entityLayer ??= {}
        writeEntityValue(this.world.entityLayer, command.target, command.layer)
        break
      case 'setFollowers':
        await this.options.executeEffect(command, context, signal)
        this.world.followers = command.sprites.length ? [...command.sprites] : undefined
        await this.options.worldChanged?.(command, context)
        return
      case 'setSceneMapOverride': {
        const sceneId = command.scene ?? this.options.currentSceneId()
        if (!sceneId) throw new Error('setSceneMapOverride 无当前 scene')
        this.world.mapOverride ??= {}
        this.world.mapOverride[sceneId] = command.mapId
        break
      }
      case 'selectEntityBehavior': {
        const scene = await this.options.scene(command.target.scene)
        selectEntityBehavior(
          this.world,
          entityAt(scene, command.target),
          command.target,
          command.channel,
          command.selection,
          this.coordinator,
          command.cursorHandoff,
        )
        break
      }
      case 'selectEntityPage': {
        const scene = await this.options.scene(command.target.scene)
        selectBaseEntityPage(
          this.world,
          entityAt(scene, command.target),
          command.target,
          command.selection,
          this.coordinator,
        )
        break
      }
      case 'setEntityTriggerActivation': {
        const scene = await this.options.scene(command.target.scene)
        setEntityTriggerActivation(
          this.world,
          entityAt(scene, command.target),
          command.target,
          command.selection,
        )
        break
      }
      case 'selectSceneHooks':
        selectBaseSceneHooks(
          this.world,
          await this.options.scene(command.scene),
          command.selection,
          this.coordinator,
        )
        break
    }
    await this.options.executeEffect(command, context, signal)
    await this.options.worldChanged?.(command, context)
  }

  evalCondition(
    condition: Parameters<BaseScriptRuntimeHost['evalCondition']>[0],
    _context: Readonly<ScriptRuntimeContext>,
  ): boolean {
    return evalAuthorCondition(condition, {
      world: this.world,
      currentSceneId: this.options.currentSceneId,
      query: this.options.query,
      random: this.options.random,
    })
  }

  confirm(signal: AbortSignal): Promise<boolean> {
    return this.options.confirm(signal)
  }

  async startBattle(
    request: Parameters<BaseScriptRuntimeHost['startBattle']>[0],
    signal: AbortSignal,
  ): Promise<BattleResult> {
    return await withScriptActivityLineage(this, this.coordinator, signal, () =>
      this.options.startBattle(request, signal),
    )
  }

  teleportOut(signal: AbortSignal): Promise<boolean> {
    return this.options.teleportOut(signal)
  }

  revealSceneEntry(
    reveal: Parameters<NonNullable<BaseScriptRuntimeHost['revealSceneEntry']>>[0],
    signal: AbortSignal,
  ): Promise<void> {
    if (!this.options.revealSceneEntry)
      return Promise.reject(new Error('script host 未实现 revealSceneEntry'))
    return this.options.revealSceneEntry(reveal, signal)
  }

  wait(ms: number, signal: AbortSignal): Promise<void> {
    return this.options.wait(ms, signal)
  }

  waitWorldTick(signal: AbortSignal): Promise<void> {
    return this.options.waitWorldTick(signal)
  }

  yieldMacroTask(signal: AbortSignal): Promise<void> {
    return this.options.yieldMacroTask(signal)
  }
}

export interface RunBaseProjectFlowOptions {
  signal: AbortSignal
  runSceneEntry?: boolean
}

export interface RunBaseProjectCommandsOptions {
  signal: AbortSignal
  self?: EntityAddress
  timing?: 'auto' | 'interactive'
}

type SynchronousSnapshot<T> = T extends PromiseLike<unknown> ? never : T

export class BaseScriptProjectRuntime {
  readonly coordinator = new FlowRuntimeCoordinator()
  readonly host: BaseProjectScriptRuntimeHost
  private readonly shared: BaseSharedScriptResolver

  constructor(
    readonly project: { sharedScripts: BaseScriptLibrary },
    readonly world: WorldScriptState,
    readonly canonicalContentDigest: string,
    host: BaseProjectScriptHostOptions,
  ) {
    if (!/^[a-f0-9]{64}$/.test(canonicalContentDigest))
      throw new Error('BaseScriptProjectRuntime: canonicalContentDigest 非法')
    this.host = new BaseProjectScriptRuntimeHost(world, this.coordinator, host)
    this.shared = new BaseSharedScriptResolver(project.sharedScripts, canonicalContentDigest)
  }

  async runEntityBehavior(
    scene: BaseSceneDef,
    entityId: string,
    channel: 'trigger' | 'auto',
    options: RunBaseProjectFlowOptions,
  ): Promise<boolean> {
    const target = { scene: scene.id, entity: entityId }
    const entity = entityAt(scene, target)
    const sceneSessionId = this.host.currentSceneSessionId()
    if (this.host.currentSceneId() !== scene.id) return false
    if (!resolveEntityBehavior(entity, this.world, target, channel)) return false
    let active = this.coordinator.beginEntityBehavior(this.world, entity, target, channel)
    while (!active && this.coordinator.gateClosed()) {
      await this.coordinator.waitForActivationGate(options.signal)
      options.signal.throwIfAborted()
      if (
        this.host.currentSceneId() !== scene.id ||
        this.host.currentSceneSessionId() !== sceneSessionId
      )
        return false
      active = this.coordinator.beginEntityBehavior(this.world, entity, target, channel)
    }
    if (!active) return false
    const runner = new ScriptRunnerCore(this.host, options.signal, this.shared)
    try {
      await withRegisteredScriptActivityLineage(this.host, options.signal, () =>
        runner.runFlow(
          compileBaseScriptFlow(active.behavior.flow, {
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
    scene: BaseSceneDef,
    slot: 'onEnter' | 'onTeleport',
    options: RunBaseProjectFlowOptions,
  ): Promise<boolean> {
    const sceneSessionId = this.host.currentSceneSessionId()
    if (this.host.currentSceneId() !== scene.id) return false
    if (!resolveSceneHook(scene, this.world, slot)) return false
    let active = this.coordinator.beginSceneHook(this.world, scene, slot)
    while (!active && this.coordinator.gateClosed()) {
      await this.coordinator.waitForActivationGate(options.signal)
      options.signal.throwIfAborted()
      if (
        this.host.currentSceneId() !== scene.id ||
        this.host.currentSceneSessionId() !== sceneSessionId
      )
        return false
      active = this.coordinator.beginSceneHook(this.world, scene, slot)
    }
    if (!active) return false
    const runner = new ScriptRunnerCore(this.host, options.signal, this.shared)
    try {
      await withRegisteredScriptActivityLineage(this.host, options.signal, () =>
        runner.runFlow(
          compileBaseScriptFlow(active.hook.flow, {
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
    commands: readonly BaseAuthorCommand[],
    options: RunBaseProjectCommandsOptions,
  ): Promise<void> {
    await withScriptActivityLineage(this.host, this.coordinator, options.signal, async () => {
      const runner = new ScriptRunnerCore(this.host, options.signal, this.shared)
      await runner.runFlow(
        compileBaseScriptFlow(
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

  async runSharedScript(script: string, options: RunBaseProjectCommandsOptions): Promise<void> {
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
        throw new Error('script save barrier 只允许同步快照，异步持久化必须在 release 后执行')
      return value as T
    } catch (error) {
      barrier.cancel(error)
      throw error
    } finally {
      if (timer !== undefined) clearTimeout(timer)
      try {
        barrier.release()
      } catch {
        // cancel/timeout 后 handle 已失效；成功路径才需要 release。
      }
    }
  }
}
