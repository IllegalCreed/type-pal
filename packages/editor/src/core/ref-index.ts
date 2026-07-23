/**
 * 引用反向索引(N5,作者 2026-07-04 定调:「剧情道具的真实编辑入口是引用它的事件,
 * 编辑器需『道具/flag 被哪些事件引用』检索」)。
 *
 * 纯函数:全场景脚本(onEnter / 实体 pages 的 trigger·auto / hostile.onLose /
 * 命令内嵌 setEntityAuto·setEntityTrigger·branch·confirm·startBattle 子命令)
 * 递归扫描 → flag / var / item 三张反向表。srcKey 对齐 EventMode 源 key
 * (__onEnter__ / <eid>:trigger / <eid>:auto),变量页/物品页点引用可直跳事件模式;
 * hostile 源(<eid>:hostile)不是事件源,只展示不可跳。
 */
import type { Command, SceneDef, ScriptCondition, ScriptStage } from '@type-pal/content'

export interface RefEntry {
  sceneId: string
  /** EventMode 源 key;'<eid>:hostile' 例外(非事件源,UI 不提供跳转)。 */
  srcKey: string
  /** 展示名:进场脚本 / <eid> 触发 / <eid> 巡逻 / <eid> 战败命令。 */
  srcLabel: string
  access: 'read' | 'write'
  /** 一句话形态,如 `setFlag=true` / `branch is false` / `+1` / `≥2`。 */
  detail: string
}

export interface RefIndex {
  flags: Map<string, RefEntry[]>
  vars: Map<string, RefEntry[]>
  items: Map<string, RefEntry[]>
}

function push(m: Map<string, RefEntry[]>, key: string, e: RefEntry): void {
  const list = m.get(key)
  if (list) list.push(e)
  else m.set(key, [e])
}

/** 条件树递归(all/any/not 嵌套;读访问)。 */
function walkCond(
  cond: ScriptCondition,
  idx: RefIndex,
  at: Omit<RefEntry, 'access' | 'detail'>,
): void {
  switch (cond.kind) {
    case 'flag':
      push(idx.flags, cond.flag, { ...at, access: 'read', detail: `is ${cond.is}` })
      return
    case 'var':
      push(idx.vars, cond.var, { ...at, access: 'read', detail: `${cond.op} ${cond.value}` })
      return
    case 'hasItem':
    case 'ownsItem':
      push(idx.items, cond.itemId, { ...at, access: 'read', detail: `≥${cond.atLeast ?? 1}` })
      return
    case 'all':
    case 'any':
      for (const c of cond.of) walkCond(c, idx, at)
      return
    case 'not':
      walkCond(cond.cond, idx, at)
      return
    default:
      return // entityState/facingEntity/chance/hasMoney/inParty:非 flag/var/item,不进索引
  }
}

/** 命令树递归(branch/confirm/startBattle 子命令 + 页切换内嵌 stages)。 */
function walkCmds(
  cmds: readonly Command[],
  idx: RefIndex,
  at: Omit<RefEntry, 'access' | 'detail'>,
): void {
  for (const c of cmds) {
    switch (c.kind) {
      case 'setFlag':
        push(idx.flags, c.flag, { ...at, access: 'write', detail: `= ${c.value}` })
        break
      case 'setVar':
        push(idx.vars, c.var, { ...at, access: 'write', detail: `= ${c.value}` })
        break
      case 'addVar':
        push(idx.vars, c.var, { ...at, access: 'write', detail: `+= ${c.delta}` })
        break
      case 'giveItem':
        push(idx.items, c.itemId, { ...at, access: 'write', detail: `+${c.count ?? 1}` })
        break
      case 'loseItem':
        push(idx.items, c.itemId, { ...at, access: 'write', detail: `-${c.count ?? 1}` })
        break
      case 'branch':
        walkCond(c.cond, idx, at)
        walkCmds(c.then, idx, at)
        if (c.else) walkCmds(c.else, idx, at)
        break
      case 'confirm':
        walkCmds(c.onNo, idx, at)
        break
      case 'startBattle':
        if (c.onLose) walkCmds(c.onLose, idx, at)
        if (c.onFlee) walkCmds(c.onFlee, idx, at)
        break
      case 'setEntityAuto':
      case 'setEntityTrigger':
        if (c.stages) walkStages(c.stages, idx, at)
        break
      default:
        break
    }
  }
}

function walkStages(
  stages: readonly ScriptStage[],
  idx: RefIndex,
  at: Omit<RefEntry, 'access' | 'detail'>,
): void {
  for (const st of stages) walkCmds(st.body, idx, at)
}

/** 全工程扫描。O(命令总数),useMemo(scenes) 级别重算(pal 全量 ~4k 段脚本,毫秒级)。 */
export function buildRefIndex(scenes: readonly SceneDef[]): RefIndex {
  const idx: RefIndex = { flags: new Map(), vars: new Map(), items: new Map() }
  for (const s of scenes) {
    if (s.onEnter?.length)
      walkStages(s.onEnter, idx, { sceneId: s.id, srcKey: '__onEnter__', srcLabel: '进场脚本' })
    for (const e of s.entities) {
      const page = e.pages?.[0]
      if (page?.trigger)
        walkStages(page.trigger.stages, idx, {
          sceneId: s.id,
          srcKey: `${e.id}:trigger`,
          srcLabel: `${e.id} 触发`,
        })
      if (page?.auto)
        walkStages(page.auto.stages, idx, {
          sceneId: s.id,
          srcKey: `${e.id}:auto`,
          srcLabel: `${e.id} 巡逻`,
        })
      if (Array.isArray(e.hostile?.onLose))
        walkCmds(e.hostile.onLose, idx, {
          sceneId: s.id,
          srcKey: `${e.id}:hostile`,
          srcLabel: `${e.id} 战败命令`,
        })
    }
  }
  return idx
}
