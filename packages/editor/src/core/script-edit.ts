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
  return s.split('/').map((p) => (/^\d+$/.test(p) ? Number(p) : p))
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
