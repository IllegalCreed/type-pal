/**
 * 按场景可达性切分事件命令列表。
 *
 * BFS 从每个场景的入口指令出发,收集可达的指令下标。
 * - 只有一个场景能 reach 的指令 → 归入该场景文件
 * - ≥2 个场景能 reach 的指令 → 归入 shared
 * - 任何场景都 reach 不到的指令 → 丢弃
 *
 * **M5.6 修(2026-05-27 audit 第 3 真漏洞)**:
 *   `globalEntries` 参数 — items/spells/enemyObjects 的 scriptOn{Use,Equip,...} 入口
 *   单列。这些 script 入口**不属于任何 scene**(物品 / 法术 / 敌人 AI 跨 scene 复用),
 *   原 sliceByScene 漏收 → 整批 script bytecode 被切片丢弃 → 用户用物品没反应根因。
 *   修法:globalEntries BFS 单独 reachable 集合,**强制归 shared**(不属任何 scene 文件)。
 *   sdlpal 真值依据:`script.c:3140` `PAL_RunTriggerScript(wScriptEntry, ...)` —
 *   `gpGlobals->g.lprgScriptEntry[wScriptEntry]` 全局 SCRIPTENTRY 数组,wScriptEntry
 *   就是 items.scriptOnUse / spells.scriptOnUse / enemyObjects.scriptOnXxx 的值。
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
  /**
   * 全局 script 入口 — items / spells / enemyObjects 的 scriptOn{Use,Equip,Throw,Desc,
   * Success,TurnStart,BattleEnd,Ready} 等。BFS 收集后强制 shared(不属任何 scene)。
   * 默认空数组(向后兼容)。
   */
  globalEntries: number[] = [],
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

  // 2.5. BFS:globalEntries(items/spells/enemyObjects scripts)— M5.6 audit 第 3 漏洞修
  //
  // 这些 script 入口不属任何 scene(物品法术跨 scene 复用),BFS 单独 reachable 集合,
  // 后续强制归 shared。sdlpal `script.c:3196 lprgScriptEntry[wScriptEntry]` 真值即此。
  const globalReachable = new Set<number>()
  {
    const queue = globalEntries.filter((e) => e > 0)
    while (queue.length > 0) {
      const i = queue.shift()!
      if (i < 0 || i >= commands.length || globalReachable.has(i)) continue
      globalReachable.add(i)

      const c = commands[i]!
      if (c.op === 'end') continue
      if (c.op === 'goto') {
        const t = parseLabel(c.to)
        if (t !== null) queue.push(t)
        continue
      }
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
  //   globalReachable 命中的指令强制归 shared(等价 sceneCount ≥ 2)。
  const sceneCount: number[] = commands.map((_c, i) => {
    let n = 0
    for (const s of reachableByScene) {
      if (s.has(i)) n++
    }
    // 强制 shared:globalReachable 命中,即使 n=0/1 也走 shared 路径(>= 2 判定)
    if (globalReachable.has(i)) n = Math.max(n, 2)
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
