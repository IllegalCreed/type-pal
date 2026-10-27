/**
 * 从 parsed 场景/EO 和全局脚本入口，保守收集潜在执行路径，再按来源分文件。
 * 单场景独占命令留在该场景；多场景共享或全局入口可达命令归 shared。
 * 跳转边只来自具名控制字段和 raw opcode 操作数，人读文本与名称不参与。
 *
 * 返回值借用原命令；仅跨文件 goto 改写时复制命令对象。原始指令下标保持为标签，
 * raw 数字操作数不改写。objects 仍是现有空占位；本函数不负责运行态脚本选择或 IO。
 */

import type { Command, EventFile } from '@type-pal/shared'
import type { EventObject, Scene } from '../io/sss.js'
import { JUMP_TARGET_OPERAND, RANDOM_JUMP_OPCODE } from './opcodes.js'

/**
 * 条件跳转 opcode(raw,数字 operand)的目标 → 入队；这些数值字段由 opcode 表定义，不靠人读字符串猜测。
 * 0xA2 随机跳目标 = i+1..i+op0(相对)。见 opcodes.ts JUMP_TARGET_OPERAND 注释。
 */
function pushRawJumpTargets(c: Command, i: number, queue: number[]): void {
  if (c.op !== 'raw') return
  // PAL_RunTriggerScript 的战斗返回有两条非零地址边；0 表示继续胜利续行。
  if (c.opcode === 0x0007) {
    const [, onLost, onFled] = c.operands
    if (onLost !== 0) queue.push(onLost)
    if (onFled !== 0) queue.push(onFled)
    return
  }
  const tgtIdx = JUMP_TARGET_OPERAND[c.opcode]
  if (tgtIdx !== undefined) {
    queue.push(c.operands[tgtIdx]!)
  } else if (c.opcode === RANDOM_JUMP_OPCODE) {
    for (let k = 1; k <= (c.operands[0] ?? 0); k++) queue.push(i + k)
  }
}

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
  /** Resource-authored additions retain explicit scene ownership outside native EO ranges. */
  sceneExtraRoots: Readonly<Record<number, readonly number[]>> = {},
): SliceResult {
  // 1. 收集每个场景的入口指令下标
  const sceneEntries: number[][] = scenes.map((sc, si) => {
    const entries: number[] = []
    if (sc.scriptOnEnter > 0) entries.push(sc.scriptOnEnter)
    if (sc.scriptOnTeleport > 0) entries.push(sc.scriptOnTeleport)

    // 属于本场景的事件对象:下标范围 [eventObjectIndex, next.eventObjectIndex)
    const fromIdx = sc.eventObjectIndex
    const toIdx = si + 1 < scenes.length ? scenes[si + 1]!.eventObjectIndex : eventObjects.length
    for (let eoi = fromIdx; eoi < toIdx; eoi++) {
      const eo = eventObjects[eoi]
      if (!eo) continue
      if (eo.triggerScript > 0) entries.push(eo.triggerScript)
      if (eo.autoScript > 0) entries.push(eo.autoScript)
    }
    entries.push(...(sceneExtraRoots[si] ?? []).filter((entry) => entry > 0))
    return entries
  })

  // 场景与全局脚本使用同一控制流规则；来源归属在遍历之后决定。
  const reachableByScene = sceneEntries.map((entries) => collectReachable(commands, entries))
  const globalReachable = collectReachable(
    commands,
    globalEntries.filter((entry) => entry > 0),
  )

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

/** 只借用 parsed 命令和入口，局部 queue/visited 不跨一次遍历共享。 */
function collectReachable(commands: readonly Command[], entries: readonly number[]): Set<number> {
  const queue = [...entries]
  const visited = new Set<number>()
  while (queue.length > 0) {
    const i = queue.shift()!
    if (i < 0 || i >= commands.length || visited.has(i)) continue
    visited.add(i)

    const c = commands[i]!

    // end 系列 fall-through(sdlpal 真值):
    //  - 0x0000 (plain end):真终止,不收续行(PAL_RunTriggerScript script.c:3204 fEnded;
    //    PAL_RunAutoScript script.c:3520 原地 park)
    //  - 0x0001 (advance):下次执行推进至下一行 i+1(trigger script.c:3216 wNextScriptEntry=+1;
    //    auto script.c:3530 wScriptEntry++)— 必须收 i+1,否则运行时 ip++ 落进邻接脚本
    //  - 0x0002 (reset):跳 resetTo(operand[0])或 idleFrames 满后推进 i+1
    //    (script.c:3223-3236 / 3537-3546)— 两者都收
    if (c.op === 'end') {
      if (c.advance) queue.push(i + 1)
      if (c.reset) {
        if (typeof c.resetTo === 'number') queue.push(c.resetTo)
        queue.push(i + 1)
      }
      continue
    }

    // goto:收目标；仅有计数时也收计数结束的续行
    if (c.op === 'goto') {
      const t = parseLabel(c.to)
      if (t !== null) queue.push(t)
      // 0x0003 的非零计数耗尽后推进 i+1（SDLPal trigger/auto 两入口同义）。
      if ((c.frameDelay ?? 0) > 0) queue.push(i + 1)
      continue
    }

    // 其它具名命令仅顺序推进；text/人读名称/label 声明都不制造跳转。
    pushRawJumpTargets(c, i, queue) // 条件跳转 opcode 的数字 operand 目标
    queue.push(i + 1)
  }
  return visited
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
