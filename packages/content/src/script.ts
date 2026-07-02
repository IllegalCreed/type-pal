/**
 * 剧情脚本 schema(M3a)—— 设计:docs/phase2/foundation/script-model-m3-design.md §2。
 *
 * 结构化嵌套 AST(无 IP 跳转);命令集按普查份额分期落地:本文件是 M3a 起步集 +
 * M3b 占位(branch/Condition 只定形,引擎后续实现)。翻不动的原版 op 走 `unmigrated`
 * 逃生口 —— 结构上保留、语义标未译,dev 日志 + 编辑器人工修,**不是**兼容执行器。
 */
import type { DialogueLine, Facing } from './index.js'
import type { GridPos } from './grid.js'

// ── 条件(M3b 引擎实现;M3a 只定形供 branch 占位)──
export type ScriptCondition =
  | { kind: 'flag'; flag: string; is: boolean }
  | { kind: 'var'; var: string; op: '==' | '!=' | '>=' | '<=' | '>' | '<'; value: number }
  | { kind: 'entityState'; entity: string; is: number }
  | { kind: 'chance'; percent: number } // 原版 0x06 jumpByRate
  | { kind: 'hasItem'; itemId: string; atLeast?: number }
  | { kind: 'hasMoney'; atLeast: number }
  | { kind: 'inParty'; actorId: string }
  | { kind: 'all'; of: ScriptCondition[] }
  | { kind: 'any'; of: ScriptCondition[] }
  | { kind: 'not'; cond: ScriptCondition }

// ── 命令(M3a 集;增量见设计 §2.3 表)──
export type Command =
  // 演出 / 对话
  | { kind: 'dialog'; line: DialogueLine }
  | { kind: 'clearDialog' } // 原版 0x05 redrawScreen 的语义核(清对话箱)
  | { kind: 'fade'; dir: 'in' | 'out'; ms?: number }
  | { kind: 'wait'; ms: number }
  // 队伍 / 场景
  | { kind: 'teleportParty'; pos: GridPos; facing?: Facing } // 场景内瞬移(0x46)
  | { kind: 'loadScene'; scene: string; pos?: GridPos; facing?: Facing } // 门传送模式折叠(0x59[+0x46+0x50])
  | { kind: 'setPartyFacing'; facing: Facing } // 0x15
  // 实体
  | { kind: 'setEntityState'; entity: string; state: number } // 0x49;≤0 隐,≥2 挡路
  | { kind: 'setEntityFacing'; entity: string; facing: Facing } // 0x0F/0x16
  | { kind: 'setEntityFrame'; entity: string; frame: number } // 0x14/0x0F op1
  // 世界状态
  | { kind: 'giveItem'; itemId: string; count?: number }
  | { kind: 'loseItem'; itemId: string; count?: number }
  | { kind: 'giveMoney'; delta: number }
  | { kind: 'setFlag'; flag: string; value: boolean }
  | { kind: 'setVar'; var: string; value: number }
  | { kind: 'addVar'; var: string; delta: number }
  // 声音 / 战斗配置
  | { kind: 'playSound'; soundId: number }
  | { kind: 'playMusic'; musicId: number }
  | { kind: 'setBattleMusic'; musicId: number }
  | { kind: 'setBattleField'; fieldId: number }
  // 控制流(M3b 引擎;schema 先行防返工)
  | { kind: 'branch'; cond: ScriptCondition; then: Command[]; else?: Command[] }
  // 逃生口
  | { kind: 'unmigrated'; opcode: number; operands: number[]; note?: string }

/**
 * 触发段(stage):原版 end.advance/end.reset(合计 1,699 次)的 clean 版。
 * 实体/场景的触发脚本 = stages 数组;world.entityStage 记当前第几段。
 * 段跑完按 next 转移:缺省 = stay(下次重跑同段);'advance' = 推进下一段;数字 = 重置到该段。
 */
export interface ScriptStage {
  body: Command[]
  next?: 'advance' | number
}

/** 触发口:原版 triggerMode 1-3=按键交互(search),4-8=走近自动(touch)。 */
export interface TriggerSpec {
  on: 'interact' | 'touch'
  /** 触发距离(格);interact 缺省 1,touch 缺省 0。 */
  range?: number
  stages: ScriptStage[]
}

/**
 * 实体页(M3a 最小形:仅触发口;M3b 扩 when/state 条件选页 + 造型/位置覆盖)。
 * EntityDef 的扁平字段(sprite/pos/facing/hidden/collide)= 默认外观;页只加行为。
 */
export interface EntityPage {
  /** 匹配 world.entityState(迁移内容);M3b 增 when?: ScriptCondition(手工内容)。 */
  state?: number
  trigger?: TriggerSpec
  /** autoScript(每帧环境行为,M3b):巡逻/动画循环。 */
  auto?: { body: Command[]; loop: boolean }
}

/** 脚本世界状态(跟存档;flags/vars 手工内容用,entityState/entityStage 迁移内容用)。 */
export interface WorldScriptState {
  flags: Record<string, boolean>
  vars: Record<string, number>
  /** 实体可见性/形态档(原版 sState 的 clean 版):≤0 隐藏,1 可见,≥2 可见+挡路。 */
  entityState: Record<string, number>
  /** 实体触发阶段(原版 end.advance 推进的"第几段");场景 onEnter 用 `s:<sceneId>` 键。 */
  entityStage: Record<string, number>
}

export function emptyWorldScriptState(): WorldScriptState {
  return { flags: {}, vars: {}, entityState: {}, entityStage: {} }
}

/** stages 选段(stage 越界钳到末段 —— 原版语义:推进过头停在最后一段重复)。 */
export function stageIndexFor(world: WorldScriptState, key: string, stages: ScriptStage[]): number {
  const raw = world.entityStage[key] ?? 0
  return Math.max(0, Math.min(raw, stages.length - 1))
}

/** 段跑完的阶段转移(纯函数;runner 调)。 */
export function applyStageNext(world: WorldScriptState, key: string, current: number, next: ScriptStage['next']): void {
  if (next === undefined) return
  world.entityStage[key] = next === 'advance' ? current + 1 : next
}

// ── 形状守卫(loader/编辑器入口用;递归浅检 kind + 关键字段)──
function checkCommands(cmds: unknown, path: string): void {
  if (!Array.isArray(cmds)) throw new Error(`${path}: 期望 Command[]`)
  cmds.forEach((c, i) => {
    if (typeof c !== 'object' || c === null || typeof (c as { kind?: unknown }).kind !== 'string')
      throw new Error(`${path}[${i}]: 缺 kind`)
    const k = (c as { kind: string }).kind
    if (k === 'dialog' && typeof (c as { line?: { text?: unknown } }).line?.text !== 'string')
      throw new Error(`${path}[${i}]: dialog 缺 line.text`)
    if (k === 'branch') {
      checkCommands((c as { then?: unknown }).then, `${path}[${i}].then`)
      const el = (c as { else?: unknown }).else
      if (el !== undefined) checkCommands(el, `${path}[${i}].else`)
    }
  })
}

export function checkStages(stages: unknown, path: string): void {
  if (!Array.isArray(stages) || stages.length === 0) throw new Error(`${path}: 期望非空 ScriptStage[]`)
  stages.forEach((st, i) => {
    checkCommands((st as { body?: unknown })?.body, `${path}[${i}].body`)
    const nx = (st as { next?: unknown }).next
    if (nx !== undefined && nx !== 'advance' && typeof nx !== 'number')
      throw new Error(`${path}[${i}].next: 期望 'advance'|number`)
  })
}

export function checkEntityPages(pages: unknown, path: string): void {
  if (!Array.isArray(pages)) throw new Error(`${path}: 期望 EntityPage[]`)
  pages.forEach((p, i) => {
    const t = (p as { trigger?: { on?: unknown; stages?: unknown } })?.trigger
    if (t) {
      if (t.on !== 'interact' && t.on !== 'touch') throw new Error(`${path}[${i}].trigger.on: 期望 interact|touch`)
      checkStages(t.stages, `${path}[${i}].trigger.stages`)
    }
  })
}
