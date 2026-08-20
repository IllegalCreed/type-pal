import type { SourceCmd } from './source-facts.js'

interface GraphCmd extends SourceCmd {
  to?: string
  frameDelay?: number
  advance?: boolean
  reset?: boolean
  resetTo?: number
  idleFrames?: number
}

export type ScriptEdgeKind = 'execution' | 'binding' | 'recovery'

export interface ScriptEdge {
  from: number
  to: number
  kind: ScriptEdgeKind
  reason: string
}

export interface ScriptRoot {
  entry: number
  owner: string
  kind: 'scene' | 'global'
}

export interface ScriptGraphAnalysis {
  edges: ScriptEdge[]
  components: number[][]
  componentOf: number[]
  owners: Array<Set<string>>
  unreachable: number[]
}

/** 把各内容域的原版入口整理成全局根；0 是空指针，不进入可达图。 */
export function makeGlobalScriptRoots(
  domains: Readonly<Record<string, readonly number[]>>,
): ScriptRoot[] {
  const roots: ScriptRoot[] = []
  const seen = new Set<string>()
  for (const [domain, entries] of Object.entries(domains)) {
    for (const entry of entries) {
      if (!Number.isInteger(entry) || entry <= 0) continue
      const key = `${domain}:${entry}`
      if (seen.has(key)) continue
      seen.add(key)
      roots.push({ entry, owner: `global/${domain}`, kind: 'global' })
    }
  }
  return roots
}

const TARGET_OPERAND: Record<number, number> = {
  0x04: 0,
  0x06: 1,
  0x1e: 1,
  0x20: 2,
  0x24: 1,
  0x25: 1,
  0x2e: 2,
  0x33: 0,
  0x34: 0,
  0x38: 0,
  0x3a: 0,
  0x58: 2,
  0x5d: 1,
  0x5e: 1,
  0x61: 0,
  0x64: 1,
  0x68: 0,
  0x74: 0,
  0x79: 1,
  0x81: 2,
  0x83: 2,
  0x84: 2,
  0x86: 2,
  0x91: 0,
  0x94: 2,
  0x95: 1,
  0x9c: 1,
  0x9e: 2,
}

function addressOf(label: string | undefined): number | undefined {
  if (!label) return undefined
  const match = /(?:^|#)L_(\d+)$/.exec(label)
  return match?.[1] === undefined ? undefined : Number(match[1])
}

/** PAL 原始脚本的当前执行边真值。 */
export function extractPalSourceScriptEdges(commands: readonly SourceCmd[]): ScriptEdge[] {
  const edges: ScriptEdge[] = []
  const seen = new Set<string>()
  const add = (
    from: number,
    to: number | undefined,
    kind: ScriptEdgeKind,
    reason: string,
  ): void => {
    if (to === undefined || to < 0 || to >= commands.length) return
    const key = `${from}:${to}:${kind}:${reason}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push({ from, to, kind, reason })
  }
  commands.forEach((command, index) => {
    const cmd = command as GraphCmd
    if (cmd.op === 'end') {
      if (cmd.advance) add(index, index + 1, 'recovery', 'end.advance')
      if (cmd.reset) {
        add(index, cmd.resetTo, 'recovery', 'end.reset')
        if ((cmd.idleFrames ?? 0) > 0)
          add(index, index + 1, 'recovery', 'end.reset-idle-advance')
      }
      return
    }
    if (cmd.op === 'goto') {
      add(index, addressOf(cmd.to), 'execution', 'goto')
      if ((cmd.frameDelay ?? 0) > 0)
        add(index, index + 1, 'execution', 'goto-delay-expiry')
      return
    }
    if (cmd.op !== 'raw' || cmd.opcode === undefined) {
      add(index, index + 1, 'execution', 'fallthrough')
      return
    }
    const opcode = cmd.opcode
    const operands = cmd.operands ?? []
    if (opcode === 0xa2) {
      for (let offset = 1; offset <= (operands[0] ?? 0); offset++)
        add(index, index + offset, 'execution', '0xa2.random')
      return
    }
    if (opcode === 0x07) {
      add(index, operands[1], 'execution', '0x07.lose')
      add(index, operands[2], 'execution', '0x07.flee')
    } else if (opcode === 0x0a) {
      add(index, operands[0], 'execution', '0x0a.no')
    } else if (opcode === 0x6d) {
      add(index, operands[1], 'binding', '0x6d.onEnter')
      add(index, operands[2], 'binding', '0x6d.onTeleport')
    } else if (opcode === 0x08) {
      add(index, index + 1, 'recovery', '0x08.checkpoint')
    } else {
      const operand = TARGET_OPERAND[opcode]
      if (operand !== undefined) {
        const kind: ScriptEdgeKind = opcode === 0x24 || opcode === 0x25 ? 'binding' : 'execution'
        const rawTarget = operands[operand]
        // auto 0x06 的 op1=0 是原地重掷；显式自环，不能误当“无目标”。
        add(
          index,
          opcode === 0x06 && rawTarget === 0 ? index : rawTarget,
          kind,
          `0x${opcode.toString(16)}`,
        )
      }
    }
    add(index, index + 1, 'execution', 'fallthrough')
  })
  return edges
}

function tarjan(
  size: number,
  edges: readonly ScriptEdge[],
): { components: number[][]; componentOf: number[] } {
  const graph = Array.from({ length: size }, () => [] as number[])
  for (const edge of edges) if (edge.kind !== 'binding') graph[edge.from]!.push(edge.to)
  const at = new Array(size).fill(-1)
  const low = new Array(size).fill(0)
  const stack: number[] = []
  const onStack = new Set<number>()
  const components: number[][] = []
  let clock = 0
  const visit = (node: number): void => {
    at[node] = low[node] = clock++
    stack.push(node)
    onStack.add(node)
    for (const next of graph[node]!) {
      if (at[next] === -1) {
        visit(next)
        low[node] = Math.min(low[node], low[next])
      } else if (onStack.has(next)) low[node] = Math.min(low[node], at[next])
    }
    if (low[node] !== at[node]) return
    const component: number[] = []
    while (stack.length) {
      const current = stack.pop()!
      onStack.delete(current)
      component.push(current)
      if (current === node) break
    }
    component.sort((a, b) => a - b)
    components.push(component)
  }
  for (let node = 0; node < size; node++) if (at[node] === -1) visit(node)
  const componentOf = new Array<number>(size)
  components.forEach((component, id) => {
    component.forEach((node) => {
      componentOf[node] = id
    })
  })
  return { components, componentOf }
}

export function analyzeScriptGraph(
  commands: readonly SourceCmd[],
  roots: readonly ScriptRoot[],
): ScriptGraphAnalysis {
  const edges = extractPalSourceScriptEdges(commands)
  const outgoing = Array.from({ length: commands.length }, () => [] as number[])
  for (const edge of edges) if (edge.kind !== 'binding') outgoing[edge.from]!.push(edge.to)
  const owners = Array.from({ length: commands.length }, () => new Set<string>())
  for (const root of roots) {
    const queue = [root.entry]
    const visited = new Set<number>()
    while (queue.length) {
      const node = queue.pop()!
      if (node < 0 || node >= commands.length || visited.has(node)) continue
      visited.add(node)
      owners[node]!.add(root.owner)
      for (const next of outgoing[node]!) queue.push(next)
    }
  }
  const { components, componentOf } = tarjan(commands.length, edges)
  const unreachable = owners.flatMap((set, index) => (set.size ? [] : [index]))
  return { edges, components, componentOf, owners, unreachable }
}
