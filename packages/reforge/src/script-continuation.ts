import {
  type AutoCommandControl,
  type AutoScriptContinuation,
  checkAutoScriptContinuation,
  type EntityAddress,
  type FlowCursor,
} from '@type-pal/content'
import type { ExecutableBaseScriptFlowLike, ExecutableCommandLike } from './script-compiler-core.js'
import type { SharedScriptResolverLike } from './script-runner-core.js'

export const SCRIPT_MAX_CALL_DEPTH = 128

export interface ScriptContinuationLocation<T> {
  leaf?: T
  self?: EntityAddress
  control?: AutoCommandControl
}

/** Validates execution addresses against exact frozen code, without evaluating conditions or effects. */
export async function validateScriptContinuation<T>(
  executable: ExecutableBaseScriptFlowLike<T>,
  cursor: FlowCursor,
  resume: AutoScriptContinuation,
  resolver: SharedScriptResolverLike<T> | undefined,
  signal: AbortSignal,
  initialSelf?: EntityAddress,
): Promise<ScriptContinuationLocation<T>> {
  checkAutoScriptContinuation(resume)
  if (resume.digest !== executable.canonicalContentDigest)
    throw new Error('auto resume: 内容digest不匹配')
  if (cursor.kind !== 'stage') throw new Error('auto resume: 需要stage游标')
  const stage = executable.flow.stages.find((value) => value.id === cursor.stage)
  if (!stage) throw new Error('auto resume: stage不存在')
  let commands: readonly ExecutableCommandLike<T>[] = stage.body
  let callDepth = 0
  let self = initialSelf
  let location: ScriptContinuationLocation<T> = {}
  for (const [depth, frame] of resume.frames.entries()) {
    signal.throwIfAborted()
    if (frame.index > commands.length) throw new Error(`auto resume: 帧${depth}指令越界`)
    const command = commands[frame.index]
    const hasChild = depth < resume.frames.length - 1
    if (frame.control && (!command || command.kind !== frame.control.kind))
      throw new Error(`auto resume: 帧${depth}控制类型不匹配`)
    if (frame.control?.kind === 'leaf') {
      if (
        command?.kind !== 'leaf' ||
        typeof command.command !== 'object' ||
        command.command === null ||
        !('kind' in command.command) ||
        command.command.kind !== frame.control.command
      )
        throw new Error('auto resume: 单步相位与命令不匹配')
      if (hasChild) throw new Error('auto resume: 单步相位不能有子帧')
    }
    if (frame.control?.kind === 'loop' && command?.kind === 'loop') {
      if (frame.control.phase !== 'body' && hasChild)
        throw new Error('auto resume: loop非body不能有子帧')
      if (frame.control.phase === 'test' && command.mode === 'forever')
        throw new Error('auto resume: forever没有条件测试相位')
    }
    if (
      frame.control?.kind === 'repeat' &&
      command?.kind === 'repeat' &&
      frame.control.iteration > command.count
    )
      throw new Error('auto resume: repeat迭代越界')
    if (!hasChild) {
      location = {
        ...(command?.kind === 'leaf' ? { leaf: command.command } : {}),
        ...(self ? { self: structuredClone(self) } : {}),
        ...(frame.control ? { control: structuredClone(frame.control) } : {}),
      }
      continue
    }
    if (!command) throw new Error('auto resume: 已结束帧不能有子帧')
    const control = frame.control
    switch (command.kind) {
      case 'branch':
        if (control?.kind !== 'branch') throw new Error('auto resume: 缺少branch选择')
        commands = command[control.arm]
        break
      case 'loop':
        if (control?.kind !== 'loop' || control.phase !== 'body')
          throw new Error('auto resume: 缺少loop body相位')
        commands = command.body
        break
      case 'repeat':
        if (control?.kind !== 'repeat') throw new Error('auto resume: 缺少repeat迭代')
        commands = command.body
        break
      case 'confirm':
        if (control?.kind !== 'confirm') throw new Error('auto resume: 缺少confirm选择')
        commands = command[control.arm]
        break
      case 'startBattle':
        if (control?.kind !== 'startBattle' || control.arm === 'none')
          throw new Error('auto resume: 缺少战斗结果')
        commands = command[control.arm] ?? []
        break
      case 'teleportOut':
        if (control?.kind !== 'teleportOut' || !control.failed)
          throw new Error('auto resume: 缺少teleport失败结果')
        commands = command.onFail ?? []
        break
      case 'callScript': {
        if (++callDepth > SCRIPT_MAX_CALL_DEPTH) throw new Error('auto resume: shared调用深度越界')
        if (!resolver) throw new Error('auto resume: 缺少shared resolver')
        const script = await resolver.resolve(command.script, executable.timing, signal)
        if (script.id !== command.script || script.canonicalContentDigest !== resume.digest)
          throw new Error('auto resume: shared内容不匹配')
        const inherited = command.self ?? self
        if (script.self === 'none' && command.self)
          throw new Error('auto resume: shared self=none禁止显式self')
        if (script.self === 'required' && !inherited) throw new Error('auto resume: shared需要self')
        self = script.self === 'none' ? undefined : inherited
        commands = script.body
        break
      }
      default:
        throw new Error('auto resume: 叶指令不能有子帧')
    }
  }
  return location
}
