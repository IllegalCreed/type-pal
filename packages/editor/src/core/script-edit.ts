/**
 * 脚本路径编辑纯函数(C-track v1)。
 *
 * 路径与 ScriptRunner.onStep 上报同一编码:[stageIdx, cmdIdx, 臂名, cmdIdx, ...],
 * 臂名 ∈ then/else/onNo/onLose/onFlee(v1 不进 setEntityAuto/Trigger 的嵌套 stages,
 * 那两类整命令走 JSON 兜底编辑)。全部不可变:只重建命中路径,旁支同引用。
 */
import type { Command, ScriptStage } from '@type-pal/content'

export type PathSeg = number | string
export type CmdPath = readonly PathSeg[]

/** "0/1/then/1" → [0,1,'then',1]。 */
export function parsePath(s: string): PathSeg[] {
  return s.split('/').map((p) => (/^-?\d+$/.test(p) ? Number(p) : p)) // -1 = 空段段首哨兵
}

/** 臂名 → 该命令上的 Command[](不存在返回 undefined)。 */
function armOf(cmd: Command, seg: string): readonly Command[] | undefined {
  switch (seg) {
    case 'then':
      return cmd.kind === 'branch' ? cmd.then : undefined
    case 'else':
      return cmd.kind === 'branch' ? cmd.else : undefined
    case 'onNo':
      return cmd.kind === 'confirm' ? cmd.onNo : undefined
    case 'onLose':
      return cmd.kind === 'startBattle' ? cmd.onLose : undefined
    case 'onFlee':
      return cmd.kind === 'startBattle' ? cmd.onFlee : undefined
    default:
      return undefined
  }
}

/** 不可变:把命令的 seg 臂替换成 newArm。 */
function withArm(cmd: Command, seg: string, newArm: Command[]): Command {
  return { ...cmd, [seg]: newArm } as Command
}

/** 沿路径取命令(容错:越界/臂缺失 → undefined)。 */
export function getCommandAt(stages: readonly ScriptStage[], path: CmdPath): Command | undefined {
  const [si, ...rest] = path
  if (typeof si !== 'number') return undefined
  let body = stages[si]?.body
  for (let k = 0; k < rest.length; k++) {
    const seg = rest[k]!
    if (typeof seg === 'number') {
      const cmd: Command | undefined = body?.[seg]
      if (k === rest.length - 1) return cmd
      const arm = rest[k + 1]
      if (cmd === undefined || typeof arm !== 'string') return undefined
      body = armOf(cmd, arm) as Command[] | undefined
      k++ // 消费臂名
    } else return undefined
  }
  return undefined
}

/**
 * 不可变地对「path 所指命令所在的 body 数组」应用 fn。
 * path 最后一段必须是数字(命令下标);fn 收到含该命令的数组,返回新数组。
 * 路径无效时原样返回 stages(引用相等,调用方可据此判 no-op)。
 */
function mapContainingBody(
  stages: readonly ScriptStage[],
  path: CmdPath,
  fn: (body: readonly Command[], idx: number) => Command[],
): ScriptStage[] {
  const [si, ...rest] = path
  if (typeof si !== 'number' || stages[si] === undefined || rest.length === 0)
    return stages as ScriptStage[]

  /** 递归:在 body 上按 rest 走;返回新 body(无效路径返回原引用)。 */
  const walk = (body: readonly Command[], segs: readonly PathSeg[]): readonly Command[] => {
    const idx = segs[0]
    if (typeof idx !== 'number' || body[idx] === undefined) return body
    if (segs.length === 1) return fn(body, idx)
    const arm = segs[1]
    if (typeof arm !== 'string') return body
    const cmd = body[idx]!
    const armBody = armOf(cmd, arm)
    if (!armBody) return body
    const newArm = walk(armBody, segs.slice(2))
    if (newArm === armBody) return body
    return body.map((c, i) => (i === idx ? withArm(cmd, arm, newArm as Command[]) : c))
  }

  const st = stages[si]!
  const newBody = walk(st.body, rest)
  if (newBody === st.body) return stages as ScriptStage[]
  return stages.map((s, i) => (i === si ? { ...s, body: newBody as Command[] } : s))
}

/** 替换 path 所指命令。 */
export function updateCommandAt(
  stages: readonly ScriptStage[],
  path: CmdPath,
  cmd: Command,
): ScriptStage[] {
  return mapContainingBody(stages, path, (body, i) => body.map((c, j) => (j === i ? cmd : c)))
}

/** 在 path 所指命令之后插入 cmd。 */
export function insertAfterAt(
  stages: readonly ScriptStage[],
  path: CmdPath,
  cmd: Command,
): ScriptStage[] {
  return mapContainingBody(stages, path, (body, i) => [
    ...body.slice(0, i + 1),
    cmd,
    ...body.slice(i + 1),
  ])
}

/** 空段插入第一条(ScriptTree 空段「＋」入口;path 尾段约定 -1 = 段首)。 */
export function insertAtHead(
  stages: readonly ScriptStage[],
  stageIdx: number,
  cmd: Command,
): ScriptStage[] {
  const st = stages[stageIdx]
  if (!st) return stages as ScriptStage[]
  return stages.map((s, i) => (i === stageIdx ? { ...s, body: [cmd, ...s.body] } : s))
}

/** 删除 path 所指命令。 */
export function removeAt(stages: readonly ScriptStage[], path: CmdPath): ScriptStage[] {
  return mapContainingBody(stages, path, (body, i) => body.filter((_, j) => j !== i))
}

/** 同 body 内上移(-1)/下移(+1);越界原样返回(引用相等)。 */
export function moveAt(stages: readonly ScriptStage[], path: CmdPath, dir: -1 | 1): ScriptStage[] {
  return mapContainingBody(stages, path, (body, i) => {
    const j = i + dir
    if (j < 0 || j >= body.length) return body as Command[]
    const next = [...body]
    const t = next[i]!
    next[i] = next[j]!
    next[j] = t
    return next
  })
}

/** 段管理:在 i 后插入空段。段间 next 按下标引用 —— 插入点之后的数字引用整体 +1(防错乱)。 */
export function addStageAfter(stages: readonly ScriptStage[], i: number): ScriptStage[] {
  const at = Math.min(Math.max(i, -1), stages.length - 1)
  const remap = (n: ScriptStage['next']): ScriptStage['next'] =>
    typeof n === 'number' && n > at ? n + 1 : n
  const out = stages.map((st) => (st.next !== undefined ? { ...st, next: remap(st.next) } : st))
  out.splice(at + 1, 0, { body: [] })
  return out
}

/** 段管理:删除第 i 段(至少保 1 段)。指向它的 next → 清除(停);其后的数字引用 -1。 */
export function removeStage(stages: readonly ScriptStage[], i: number): ScriptStage[] {
  if (stages.length <= 1 || i < 0 || i >= stages.length) return stages as ScriptStage[]
  const out: ScriptStage[] = []
  for (let k = 0; k < stages.length; k++) {
    if (k === i) continue
    const st = stages[k]!
    let next = st.next
    if (typeof next === 'number') {
      if (next === i) next = undefined
      else if (next > i) next = next - 1
    }
    // 'advance' 语义是「推进到相邻下一段」,下标随位置自然重排,无需重映射
    if (next !== st.next) out.push({ ...st, ...(next === undefined ? {} : { next }) })
    else out.push(st)
    if (next === undefined && st.next !== undefined && typeof st.next === 'number') {
      // 显式清除:上面展开会把旧 next 带回,重建对象去掉 next 键
      const clean = { ...st } as ScriptStage & { next?: unknown }
      delete clean.next
      out[out.length - 1] = clean
    }
  }
  return out
}

/** 段管理:设第 i 段的跑完去向(undefined=停 / 'advance'=推进 / 数字=回第 n 段)。 */
export function setStageNext(
  stages: readonly ScriptStage[],
  i: number,
  next: ScriptStage['next'] | undefined,
): ScriptStage[] {
  const st = stages[i]
  if (!st) return stages as ScriptStage[]
  return stages.map((s, k) => {
    if (k !== i) return s
    if (next === undefined) {
      const clean = { ...s } as ScriptStage & { next?: unknown }
      delete clean.next
      return clean as ScriptStage
    }
    return { ...s, next }
  })
}
