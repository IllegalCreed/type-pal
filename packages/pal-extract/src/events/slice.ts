/**
 * 按场景可达性切分事件命令列表。
 *
 * BFS 从每个场景的入口指令出发,收集可达的指令下标。
 * - 只有一个场景能 reach 的指令 → 归入该场景文件
 * - ≥2 个场景能 reach 的指令 → 归入 shared
 * - 任何场景都 reach 不到的指令 → 丢弃
 *
 * M1 限制:跨文件标签改写仅对具名 goto 生效;raw 命令的数字操作数不改写。
 */

import type { Command, EventFile } from '@type-pal/shared'
import type { EventObject, Scene } from '../io/sss.js'

export interface SliceResult {
  scenes: EventFile[] // 长度 = scenes.length
  shared: EventFile
  objects: EventFile // M1: 空占位
}

export function sliceByScene(
  commands: Command[],
  scenes: Scene[],
  eventObjects: EventObject[],
): SliceResult {
  // 1. 收集每个场景的入口指令下标
  const sceneEntries: number[][] = scenes.map((sc, si) => {
    const entries: number[] = []
    if (sc.scriptOnEnter > 0) entries.push(sc.scriptOnEnter)
    if (sc.scriptOnTeleport > 0) entries.push(sc.scriptOnTeleport)

    // 属于本场景的事件对象:下标范围 [eventObjectIndex, next.eventObjectIndex)
    const fromIdx = sc.eventObjectIndex
    const toIdx =
      si + 1 < scenes.length ? scenes[si + 1]!.eventObjectIndex : eventObjects.length
    for (let eoi = fromIdx; eoi < toIdx; eoi++) {
      const eo = eventObjects[eoi]
      if (!eo) continue
      if (eo.triggerScript > 0) entries.push(eo.triggerScript)
      if (eo.autoScript > 0) entries.push(eo.autoScript)
    }
    return entries
  })

  // 2. BFS:为每个场景计算可达指令集合
  const reachableByScene: Set<number>[] = scenes.map(() => new Set<number>())

  for (let si = 0; si < scenes.length; si++) {
    const queue = [...sceneEntries[si]!]
    const visited = reachableByScene[si]!

    while (queue.length > 0) {
      const i = queue.shift()!
      if (i < 0 || i >= commands.length || visited.has(i)) continue
      visited.add(i)

      const c = commands[i]!

      // end 系列:终止此路径
      if (c.op === 'end') continue

      // goto:跳到 to,不 fall-through
      if (c.op === 'goto') {
        const t = parseLabel(c.to)
        if (t !== null) queue.push(t)
        continue
      }

      // 其他命令:扫描所有字符串字段寻找 L_N 模式,再 fall-through
      for (const v of Object.values(c as unknown as Record<string, unknown>)) {
        if (typeof v === 'string') {
          const t = parseLabel(v)
          if (t !== null) queue.push(t)
        }
      }
      queue.push(i + 1)
    }
  }

  // 3. 统计每条指令被几个场景 reach
  const sceneCount: number[] = commands.map((_c, i) => {
    let n = 0
    for (const s of reachableByScene) {
      if (s.has(i)) n++
    }
    return n
  })

  // 4. 生成每个场景文件(只含该场景独占的指令)
  const sceneFiles: EventFile[] = scenes.map((_sc, si) => ({
    scene: si,
    segments: [
      {
        name: `scene-${si}.entries`,
        commands: collectAndRewrite(
          commands,
          (i) => reachableByScene[si]!.has(i) && sceneCount[i] === 1,
          sceneCount,
        ),
      },
    ],
  }))

  // 5. shared 文件(被 ≥2 个场景 reach 的指令)
  const shared: EventFile = {
    segments: [
      {
        name: 'shared',
        commands: collectAndRewrite(commands, (i) => (sceneCount[i] ?? 0) > 1, sceneCount),
      },
    ],
  }

  // M1: objects 占位
  const objects: EventFile = { segments: [] }

  return { scenes: sceneFiles, shared, objects }
}

/** 按 predicate 过滤指令并改写跨文件跳转 */
function collectAndRewrite(
  commands: Command[],
  predicate: (i: number) => boolean,
  sceneCount: number[],
): Command[] {
  const out: Command[] = []
  for (let i = 0; i < commands.length; i++) {
    if (!predicate(i)) continue
    out.push(rewriteJumps(commands[i]!, sceneCount))
  }
  return out
}

/**
 * 对 goto 命令检查目标是否在 shared;若是,改写为 "shared#L_X"。
 * M1 仅处理具名 goto;raw 命令的数字操作数不改写。
 */
function rewriteJumps(c: Command, sceneCount: number[]): Command {
  if (c.op !== 'goto') return c
  const target = parseLabel(c.to)
  if (target === null) return c
  if ((sceneCount[target] ?? 0) > 1) {
    return { ...c, to: `shared#L_${target}` }
  }
  return c
}

/**
 * 解析本地标签 "L_N" → N。
 * 跨文件标签 "shared#L_N" / "objects#L_N" 返回 null(不追踪外部目标)。
 */
function parseLabel(label: string): number | null {
  const m = /^L_(\d+)$/.exec(label)
  return m ? parseInt(m[1]!, 10) : null
}
