import { extractLegacyScriptEdgesV1 } from '../../script-graph.js'
import type { SourceCmd } from '../../source-facts.js'
import { stableJsonSha256 } from './stable-json.js'

export const AUTO_FLOW_LIFECYCLE_METHOD = 'n3-p7-r13-auto-flow-lifecycle-v1' as const

interface AutoSourceCmd extends SourceCmd {
  advance?: boolean
  reset?: boolean
  resetTo?: number
  idleFrames?: number
  to?: string
  frameDelay?: number
}

export type AutoFlowLifecycleKind = 'terminal' | 'repeat' | 'idle-gate' | 'invalid'
export type AutoFlowProjectionShape =
  | 'terminal'
  | 'repeat-root'
  | 'prefix-tail'
  | 'complex-repeat'
  | 'idle-gate'
  | 'invalid'

export interface AutoFlowLifecycleDecision {
  methodVersion: typeof AUTO_FLOW_LIFECYCLE_METHOD
  root: number
  kind: AutoFlowLifecycleKind
  shape: AutoFlowProjectionShape
  reachableAddresses: number[]
  sourceCommandsDigest: string
  bottomComponents: number[][]
  recurrentComponents: number[][]
  idleGateAddresses: number[]
  digest: string
}

export interface AutoFlowLifecycleOwnerEvidence extends AutoFlowLifecycleDecision {
  ownerKey: string
}

export interface AutoFlowLifecycleReport {
  methodVersion: typeof AUTO_FLOW_LIFECYCLE_METHOD
  inputPool: number
  entries: AutoFlowLifecycleOwnerEvidence[]
  summary: {
    terminal: number
    repeat: number
    idleGate: number
    invalid: number
    repeatRoot: number
    prefixTail: number
    complexRepeat: number
  }
  digest: string
}

export function buildAutoFlowLifecycleReport(
  entries: readonly AutoFlowLifecycleOwnerEvidence[],
): AutoFlowLifecycleReport {
  const sorted = [...entries].sort((left, right) => left.ownerKey.localeCompare(right.ownerKey))
  if (new Set(sorted.map((entry) => entry.ownerKey)).size !== sorted.length)
    throw new Error('auto lifecycle: owner evidence 重复')
  const summary = {
    terminal: sorted.filter((entry) => entry.kind === 'terminal').length,
    repeat: sorted.filter((entry) => entry.kind === 'repeat').length,
    idleGate: sorted.filter((entry) => entry.kind === 'idle-gate').length,
    invalid: sorted.filter((entry) => entry.kind === 'invalid').length,
    repeatRoot: sorted.filter((entry) => entry.shape === 'repeat-root').length,
    prefixTail: sorted.filter((entry) => entry.shape === 'prefix-tail').length,
    complexRepeat: sorted.filter((entry) => entry.shape === 'complex-repeat').length,
  }
  const withoutDigest = {
    methodVersion: AUTO_FLOW_LIFECYCLE_METHOD,
    inputPool: sorted.length,
    entries: sorted,
    summary,
  }
  return { ...withoutDigest, digest: stableJsonSha256(withoutDigest) }
}

function labelAddress(label: string | undefined): number | undefined {
  const match = /(?:^|#)L_(\d+)$/.exec(label ?? '')
  return match?.[1] === undefined ? undefined : Number(match[1])
}

function sortedUnique(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right)
}

function decisionDigest(value: Omit<AutoFlowLifecycleDecision, 'digest'>): string {
  return stableJsonSha256(value)
}

/**
 * Auto 生命周期专用 CFG。通用 script graph 会给 reset0 添加错误 fallthrough，且漏掉
 * delayed-goto 计数满后的 fallthrough；这里按 PAL auto runner 的源语义统一修正。
 */
export class AutoFlowLifecycleIndex {
  private readonly genericOutgoing: number[][]

  constructor(private readonly commands: readonly SourceCmd[]) {
    this.genericOutgoing = Array.from({ length: commands.length }, () => [])
    for (const edge of extractLegacyScriptEdgesV1(commands)) {
      if (edge.kind === 'binding' || edge.reason === '0x4') continue
      this.genericOutgoing[edge.from]!.push(edge.to)
    }
    for (const values of this.genericOutgoing)
      values.splice(0, values.length, ...sortedUnique(values))
  }

  successors(address: number): number[] {
    const command = this.commands[address] as AutoSourceCmd | undefined
    if (!command) return []
    if (command.op === 'end') {
      if (command.advance) return this.valid([address + 1])
      if (command.reset) {
        const reset = command.resetTo
        return this.valid([
          ...(reset === undefined ? [] : [reset]),
          ...((command.idleFrames ?? 0) > 0 ? [address + 1] : []),
        ])
      }
      return []
    }
    if (command.op === 'goto') {
      const target = labelAddress(command.to)
      return this.valid([
        ...(target === undefined ? [] : [target]),
        ...((command.frameDelay ?? 0) > 0 ? [address + 1] : []),
      ])
    }
    return this.genericOutgoing[address] ?? []
  }

  classify(root: number): AutoFlowLifecycleDecision {
    if (!Number.isInteger(root) || root <= 0 || root >= this.commands.length)
      throw new Error(`auto lifecycle: 非法 root ${root}`)
    const reachable = new Set<number>()
    const queue = [root]
    while (queue.length) {
      const address = queue.pop()!
      if (reachable.has(address)) continue
      reachable.add(address)
      for (const next of this.successors(address)) queue.push(next)
    }
    const addresses = [...reachable].sort((left, right) => left - right)
    const components = this.stronglyConnected(addresses)
    const componentOf = new Map<number, number>()
    components.forEach((component, index) => {
      for (const address of component) componentOf.set(address, index)
    })
    const bottom = components.filter((component, index) =>
      component.every((address) =>
        this.successors(address).every((next) => componentOf.get(next) === index),
      ),
    )
    const recurrent = components.filter(
      (component) =>
        component.length > 1 ||
        (component.length === 1 && this.successors(component[0]!).includes(component[0]!)),
    )
    const idleGateAddresses = addresses.filter((address) => {
      const command = this.commands[address] as AutoSourceCmd
      return command.op === 'end' && command.reset && (command.idleFrames ?? 0) > 0
    })
    const plainEnd = (component: readonly number[]): boolean =>
      component.every((address) => {
        const command = this.commands[address] as AutoSourceCmd
        return command.op === 'end' && !command.advance && !command.reset
      })
    const recurrentKeys = new Set(recurrent.map((component) => component.join(',')))
    const recurrentBottom = (component: readonly number[]): boolean =>
      recurrentKeys.has(component.join(','))

    let kind: AutoFlowLifecycleKind
    let shape: AutoFlowProjectionShape
    if (idleGateAddresses.length) {
      kind = 'idle-gate'
      shape = 'idle-gate'
    } else if (bottom.length > 0 && bottom.every(plainEnd)) {
      kind = 'terminal'
      shape = 'terminal'
    } else if (bottom.length > 0 && bottom.every(recurrentBottom)) {
      kind = 'repeat'
      const rootComponent = components[componentOf.get(root)!]!
      shape = recurrentKeys.has(rootComponent.join(','))
        ? 'repeat-root'
        : recurrent.length === 1
          ? 'prefix-tail'
          : 'complex-repeat'
    } else {
      kind = 'invalid'
      shape = 'invalid'
    }
    const withoutDigest = {
      methodVersion: AUTO_FLOW_LIFECYCLE_METHOD,
      root,
      kind,
      shape,
      reachableAddresses: addresses,
      sourceCommandsDigest: stableJsonSha256(
        addresses.map((address) => ({ address, command: this.commands[address] })),
      ),
      bottomComponents: bottom,
      recurrentComponents: recurrent,
      idleGateAddresses,
    } satisfies Omit<AutoFlowLifecycleDecision, 'digest'>
    return { ...withoutDigest, digest: decisionDigest(withoutDigest) }
  }

  private valid(addresses: readonly number[]): number[] {
    return sortedUnique(
      addresses.filter((address) => address >= 0 && address < this.commands.length),
    )
  }

  private stronglyConnected(addresses: readonly number[]): number[][] {
    const allowed = new Set(addresses)
    const at = new Map<number, number>()
    const low = new Map<number, number>()
    const stack: number[] = []
    const onStack = new Set<number>()
    const result: number[][] = []
    let clock = 0
    const visit = (address: number): void => {
      at.set(address, clock)
      low.set(address, clock++)
      stack.push(address)
      onStack.add(address)
      for (const next of this.successors(address)) {
        if (!allowed.has(next)) continue
        if (!at.has(next)) {
          visit(next)
          low.set(address, Math.min(low.get(address)!, low.get(next)!))
        } else if (onStack.has(next)) low.set(address, Math.min(low.get(address)!, at.get(next)!))
      }
      if (low.get(address) !== at.get(address)) return
      const component: number[] = []
      while (stack.length) {
        const current = stack.pop()!
        onStack.delete(current)
        component.push(current)
        if (current === address) break
      }
      component.sort((left, right) => left - right)
      result.push(component)
    }
    for (const address of addresses) if (!at.has(address)) visit(address)
    return result.sort((left, right) => left[0]! - right[0]!)
  }
}
