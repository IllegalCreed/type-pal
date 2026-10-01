import {
  type AutoScriptContinuation,
  checkAutoScriptContinuation,
  type FlowCursor,
} from '@type-pal/content'
import type { ExecutableBaseScriptFlowLike, ExecutableCommandLike } from './script-compiler-core.js'
import type { SharedScriptResolverLike } from './script-runner-core.js'

export const SCRIPT_MAX_CALL_DEPTH = 128

/** Validates execution addresses against exact frozen code, without evaluating conditions or effects. */
export async function validateScriptContinuation<T>(
  executable: ExecutableBaseScriptFlowLike<T>,
  cursor: FlowCursor,
  resume: AutoScriptContinuation,
  resolver: SharedScriptResolverLike<T> | undefined,
  signal: AbortSignal,
): Promise<void> {
  checkAutoScriptContinuation(resume)
  if (resume.digest !== executable.canonicalContentDigest)
    throw new Error('auto resume: 内容digest不匹配')
  let commands: readonly ExecutableCommandLike<T>[]
  if (executable.flow.kind === 'stages') {
    if (cursor.kind !== 'stage') throw new Error('auto resume: stages需要stage游标')
    const stage = executable.flow.stages.find((value) => value.id === cursor.stage)
    if (!stage) throw new Error('auto resume: stage不存在')
    commands = stage.body
  } else {
    if (cursor.kind !== 'state' || cursor.machine !== executable.flow.machine.id)
      throw new Error('auto resume: machine游标不匹配')
    const state = executable.flow.machine.states[cursor.state]
    if (!state) throw new Error('auto resume: state不存在')
    commands = state.body
  }
  for (const id of Object.keys(resume.outcomes))
    if (!commands.some((command) => command.kind === 'confirm' && command.id === id))
      throw new Error(`auto resume: confirm结果不存在 ${id}`)
  let callDepth = 0
  for (const [depth, frame] of resume.frames.entries()) {
    signal.throwIfAborted()
    if (frame.index > commands.length) throw new Error(`auto resume: 帧${depth}指令越界`)
    const command = commands[frame.index]
    const hasChild = depth < resume.frames.length - 1
    if (frame.control && (!command || command.kind !== frame.control.kind))
      throw new Error(`auto resume: 帧${depth}控制类型不匹配`)
    if (frame.control?.kind === 'loop' && command?.kind === 'loop') {
      if (frame.control.iteration > command.maxIterations)
        throw new Error('auto resume: loop迭代越界')
      if (frame.control.phase !== 'body' && hasChild)
        throw new Error('auto resume: loop非body不能有子帧')
    }
    if (!hasChild) continue
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
      case 'confirm':
        if (control?.kind !== 'confirm' || !control.no)
          throw new Error('auto resume: confirm子帧不是onNo')
        commands = command.onNo
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
        const script = await resolver.resolve(
          command.script,
          executable.timing,
          executable.boundaryPolicy,
          signal,
        )
        if (script.id !== command.script || script.canonicalContentDigest !== resume.digest)
          throw new Error('auto resume: shared内容不匹配')
        commands = script.body
        break
      }
      default:
        throw new Error('auto resume: 叶指令不能有子帧')
    }
  }
}
