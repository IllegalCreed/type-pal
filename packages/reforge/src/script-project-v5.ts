import type {
  AuthorCommandV5,
  EntityAddress,
  EntityBaseV5,
  GridPos,
  ItemDataMapV5,
  SceneDefV5,
  WorldScriptStateV5,
} from '@type-pal/content'
import type { LoadedProjectV5Core } from './loader-v5.js'
import {
  withRegisteredScriptActivityLineageV5,
  withScriptActivityLineageV5,
} from './script-activity-lineage-v5.js'
import type { RuntimeLeafCommandV5 } from './script-compiler-v5.js'
import { compileScriptFlowV5, MemorySharedScriptResolverV5 } from './script-compiler-v5.js'
import type { ScriptRuntimeContextV5, ScriptRuntimeHostV5 } from './script-runner-v5.js'
import { ScriptRunnerV5 } from './script-runner-v5.js'
import type { BattleResult } from './battle/battle-result.js'
import {
  evalAuthorConditionV5,
  FlowRuntimeCoordinatorV5,
  resolveEntityBehaviorV5,
  resolveSceneHookV5,
  selectEntityBehaviorV5,
  selectEntityPageV5,
  selectSceneHooksV5,
  setEntityTriggerActivationV5,
} from './script-world-v5.js'

type RuntimeHostServicesV5 = Omit<ScriptRuntimeHostV5, 'execute' | 'evalCondition'>

export interface ProjectScriptHostOptionsV5 extends RuntimeHostServicesV5 {
  /** 画面/音频/战斗等宿主副作用；world script 真值由本层先行维护。 */
  executeEffect(
    command: RuntimeLeafCommandV5,
    context: Readonly<ScriptRuntimeContextV5>,
    signal: AbortSignal,
  ): void | Promise<void>
  /** canonical 写入和宿主 effect 均成功后的投影刷新点。 */
  worldChanged?(
    command: RuntimeLeafCommandV5,
    context: Readonly<ScriptRuntimeContextV5>,
  ): void | Promise<void>
  scene(sceneId: string): SceneDefV5 | Promise<SceneDefV5>
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

function entityAt(scene: SceneDefV5, target: EntityAddress): EntityBaseV5 {
  if (scene.id !== target.scene)
    throw new Error(`script v5 target scene 不匹配: ${target.scene} / ${scene.id}`)
  const entity = scene.entities.find((candidate) => candidate.id === target.entity)
  if (!entity) throw new Error(`script v5 entity 不存在: ${target.scene}/${target.entity}`)
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
 * Canonical world-state authority. ScriptRunnerV5 only负责控制流；所有持久 script 字段都在这里写，
 * 宿主 effect 只负责把已提交状态反映到画面/音频/战斗系统。
 */
export class ProjectScriptRuntimeHostV5 implements ScriptRuntimeHostV5 {
  constructor(
    private readonly world: WorldScriptStateV5,
    private readonly coordinator: FlowRuntimeCoordinatorV5,
    private readonly options: ProjectScriptHostOptionsV5,
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
    command: RuntimeLeafCommandV5,
    context: Readonly<ScriptRuntimeContextV5>,
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
        await this.options.executeEffect(command, context, signal)
        signal.throwIfAborted()
        if (
          this.options.currentSceneId() !== command.target.scene ||
          this.currentSceneSessionId() !== sceneSessionId
        )
          throw new DOMException('moveEntity scene session changed', 'AbortError')
        this.world.entityPos ??= {}
        writeEntityValue(this.world.entityPos, command.target, command.to)
        await this.options.worldChanged?.(command, context)
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
        selectEntityBehaviorV5(
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
        selectEntityPageV5(
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
        setEntityTriggerActivationV5(
          this.world,
          entityAt(scene, command.target),
          command.target,
          command.selection,
        )
        break
      }
      case 'selectSceneHooks':
        selectSceneHooksV5(
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
    condition: Parameters<ScriptRuntimeHostV5['evalCondition']>[0],
    _context: Readonly<ScriptRuntimeContextV5>,
  ): boolean {
    return evalAuthorConditionV5(condition, {
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
    request: Parameters<ScriptRuntimeHostV5['startBattle']>[0],
    signal: AbortSignal,
  ): Promise<BattleResult> {
    return await withScriptActivityLineageV5(this, this.coordinator, signal, () =>
      this.options.startBattle(request, signal),
    )
  }

  teleportOut(signal: AbortSignal): Promise<boolean> {
    return this.options.teleportOut(signal)
  }

  revealSceneEntry(
    reveal: Parameters<NonNullable<ScriptRuntimeHostV5['revealSceneEntry']>>[0],
    signal: AbortSignal,
  ): Promise<void> {
    if (!this.options.revealSceneEntry)
      return Promise.reject(new Error('script v5 host 未实现 revealSceneEntry'))
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

export interface RunProjectFlowV5Options {
  signal: AbortSignal
  runSceneEntry?: boolean
}

export interface RunProjectCommandsV5Options {
  signal: AbortSignal
  self?: EntityAddress
  timing?: 'auto' | 'interactive'
}

type SynchronousSnapshot<T> = T extends PromiseLike<unknown> ? never : T

export class ScriptProjectRuntimeV5 {
  readonly coordinator = new FlowRuntimeCoordinatorV5()
  readonly host: ProjectScriptRuntimeHostV5
  private readonly shared: MemorySharedScriptResolverV5

  constructor(
    readonly project: LoadedProjectV5Core,
    readonly world: WorldScriptStateV5,
    readonly canonicalContentDigest: string,
    host: ProjectScriptHostOptionsV5,
  ) {
    if (!/^[a-f0-9]{64}$/.test(canonicalContentDigest))
      throw new Error('ScriptProjectRuntimeV5: canonicalContentDigest 非法')
    this.host = new ProjectScriptRuntimeHostV5(world, this.coordinator, host)
    this.shared = new MemorySharedScriptResolverV5(project.sharedScripts, canonicalContentDigest)
  }

  async runEntityBehavior(
    scene: SceneDefV5,
    entityId: string,
    channel: 'trigger' | 'auto',
    options: RunProjectFlowV5Options,
  ): Promise<boolean> {
    const target = { scene: scene.id, entity: entityId }
    const entity = entityAt(scene, target)
    const sceneSessionId = this.host.currentSceneSessionId()
    if (this.host.currentSceneId() !== scene.id) return false
    if (!resolveEntityBehaviorV5(entity, this.world, target, channel)) return false
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
    const runner = new ScriptRunnerV5(this.host, options.signal, this.shared)
    try {
      await withRegisteredScriptActivityLineageV5(this.host, options.signal, () =>
        runner.runFlow(
          compileScriptFlowV5(active.behavior.flow, {
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
    scene: SceneDefV5,
    slot: 'onEnter' | 'onTeleport',
    options: RunProjectFlowV5Options,
  ): Promise<boolean> {
    const sceneSessionId = this.host.currentSceneSessionId()
    if (this.host.currentSceneId() !== scene.id) return false
    if (!resolveSceneHookV5(scene, this.world, slot)) return false
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
    const runner = new ScriptRunnerV5(this.host, options.signal, this.shared)
    try {
      await withRegisteredScriptActivityLineageV5(this.host, options.signal, () =>
        runner.runFlow(
          compileScriptFlowV5(active.hook.flow, {
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
    commands: readonly AuthorCommandV5[],
    options: RunProjectCommandsV5Options,
  ): Promise<void> {
    await withScriptActivityLineageV5(this.host, this.coordinator, options.signal, async () => {
      const runner = new ScriptRunnerV5(this.host, options.signal, this.shared)
      await runner.runFlow(
        compileScriptFlowV5(
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

  async runSharedScript(script: string, options: RunProjectCommandsV5Options): Promise<void> {
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
    options: RunProjectCommandsV5Options,
  ): Promise<void> {
    const script = items[itemId]?.use?.effects
      .filter((effect) => effect.kind === 'itemPrivateScript')
      .find((effect) => effect.script.id === scriptId)?.script
    if (!script) throw new Error(`item private script 不存在: ${itemId}/${scriptId}`)
    await this.runCommands(script.body, options)
  }

  async withSaveBarrier<T>(snapshot: () => SynchronousSnapshot<T>, timeoutMs = 10_000): Promise<T> {
    const barrier = this.coordinator.requestSaveBarrier()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        barrier.ready,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`script v5 save barrier 超时 ${timeoutMs}ms`)),
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
        throw new Error('script v5 save barrier 只允许同步快照，异步持久化必须在 release 后执行')
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
