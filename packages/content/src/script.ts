/**
 * 剧情脚本 schema(M3a)—— 设计:docs/phase2/foundation/script-model-m3-design.md §2。
 *
 * 结构化嵌套 AST(无 IP 跳转);命令集按普查份额分期落地:本文件是 M3a 起步集 +
 * M3b 占位(branch/Condition 只定形,引擎后续实现)。翻不动的原版 op 走 `unmigrated`
 * 逃生口 —— 结构上保留、语义标未译,dev 日志 + 编辑器人工修,**不是**兼容执行器。
 */

import type { GridPos } from './grid.js'
import type { DialogueLine, Facing } from './index.js'

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
  | { kind: 'fade'; dir: 'in' | 'out'; ms?: number; color?: 'black' | 'red' }
  // ── B8 野外遇敌(原版 0x4C/0x4B/0x4E + GameOver 枢纽的干净表达)──
  /** 向玩家追一步(auto 脚本里即持续追逐——auto runner 天然循环)。range 格内才追(切比雪夫);floating 无视碰撞。 */
  | { kind: 'chasePlayer'; range?: number; speed?: number; floating?: boolean }
  /** 实体消失 seconds 秒后重现(野怪被打败的重生窗;临时态不进存档)。缺 entity = 触发者自身。 */
  | { kind: 'vanishEntity'; entity?: string; seconds?: number }
  /** 读最近存档(auto/quick/manual 时间最新;无档 = 重开)。原版 0x4E。 */
  | { kind: 'loadLastSave' }
  /** 战败流程:渐红 + 「胜败乃兵家常事也」文案 + 读最近档(原版 GameOver 枢纽段一等化)。 */
  | { kind: 'gameOver' }
  | { kind: 'wait'; ms: number }
  // 队伍 / 场景
  | { kind: 'teleportParty'; pos: GridPos; facing?: Facing } // 场景内瞬移(0x46)
  | { kind: 'loadScene'; scene: string; pos?: GridPos; facing?: Facing } // 门传送模式折叠(0x59[+0x46+0x50])
  // 0x15:原版同时写 wPartyDirection 和 rgParty[member].wFrame = dir*3 + gesture。
  // gesture 缺省 = 0(站立帧,清脚本姿势);>0 = 脚本姿势帧(配合 setActorSprite 演出,
  // 如开场李逍遥练武 gesture 9)。member 缺省 = 0(队长;跟随者渲染落地后生效)。
  | { kind: 'setPartyFacing'; facing: Facing; gesture?: number; member?: number }
  // 实体
  | { kind: 'setEntityState'; entity: string; state: number } // 0x49;≤0 隐,≥2 挡路
  | { kind: 'setEntityFacing'; entity: string; facing: Facing } // 0x0F/0x16
  | { kind: 'setEntityFrame'; entity: string; frame: number } // 0x14/0x0F op1
  // 0x65:换角色大世界精灵(id 引用,非下标)。原版写 PlayerRoles.rgwSpriteNum[role],
  // 持续到下一次显式切换(开场练武 627/疯跑 193 后脚本自行切回)。
  | { kind: 'setActorSprite'; actor: string; sprite: string }
  // 0x69:敌人逃离战场(战斗演出 choreography 专用;终止战斗无奖励)。大世界 host 打日志跳过。
  | { kind: 'fleeBattle' }
  // 0x89:脚本终止战斗(choreography 专用)。result:terminate 无奖励干净退(林天南撑 7 回合)/
  //   won 判胜 / lost 判负。原版 BattleResult=op0(0 终止 /3 胜 /1 负)。
  | { kind: 'endBattle'; result: 'terminate' | 'won' | 'lost' }
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
  // 走位 / 演出(M3b;速度=原版 2/3/4/8 → slow/normal/fast/run)
  | { kind: 'moveEntity'; entity: string; to: GridPos; speed: WalkSpeed } // 阻塞:直线走到(原版 walkTo)
  | { kind: 'stepEntity'; entity: string; dir: Facing } // 单步(0x0B-0E:设向+走一步)
  | { kind: 'animEntity'; entity: string } // 0x87:仅推动画帧(不位移)
  | { kind: 'nudgeEntity'; entity: string; dx: number; dy: number } // 0x7D/0x6C:像素位移(瞬时)
  | { kind: 'moveParty'; to: GridPos; speed: WalkSpeed } // 阻塞:队伍走到
  | { kind: 'nudgeParty'; dx: number; dy: number } // 0x6E:队伍相对单步(带走姿)
  // 战斗 / 商店 / 确认(M3b 翻译;战斗引擎 M4,先桩)
  // auto(0x8A):整场自动战斗(玩家侧 AI 代打、不出指令菜单 —— 石长老 vs 盖罗娇过场战)。
  | { kind: 'startBattle'; team: number; onLose?: Command[]; onFlee?: Command[]; auto?: boolean }
  | { kind: 'openShop'; shop: number; mode: 'buy' | 'sell' }
  | { kind: 'confirm'; onNo: Command[] } // 0x0A 是/否框:选"否"走 onNo,"是"继续
  // 相机(M3c;0x7F 三形态。⚠ 一阶段彩依飞走案:走位期间偏移必须保持,不许绝对回正)
  | { kind: 'cameraPan'; dx: number; dy: number; frames: number } // 相对:每帧位移 ×frames,阻塞
  | { kind: 'cameraSnap'; to?: GridPos } // 绝对跳到格(to)/回正跟随(缺省)
  // 页切换(M3c;原版 0x24/25/40 改脚本入口指针。运行时覆盖,暂不持久 —— 原版存档存指针,
  // clean 版的持久化留给页注册表设计(M4 期);过场局部行为切换不受影响)
  | { kind: 'setEntityAuto'; entity: string; stages: ScriptStage[] } // 0x24;空 stages = 停用
  | { kind: 'setEntityTrigger'; entity: string; stages: ScriptStage[] } // 0x25;触发方式沿用当前
  | { kind: 'setEntityTriggerMode'; entity: string; on?: 'interact' | 'touch'; range?: number } // 0x40;on 缺省=关
  // 定位权威(E6b:显式接管/归还 —— 隐式接管见位移指令;手工演出精细控制用)
  | { kind: 'takeEntity'; entity: string }
  | { kind: 'releaseEntity'; entity?: string } // 缺省 = 归还全部
  // 载具/挂载(E7,D20「父动子随」契约。原版 0xA1 聚拢+0x3F/0x44/0x97 骑乘的 clean 表达:
  // mountParty 挂上(dx/dy 缺省 0=重叠) → ride 骑行走位(可连发) → unmountParty 下(位置留当下))
  | { kind: 'mountParty'; entity: string; dx?: number; dy?: number }
  | { kind: 'unmountParty' }
  | { kind: 'ride'; entity: string; to: GridPos; speed: WalkSpeed }
  // 控制流(M3b 引擎;schema 先行防返工)
  | { kind: 'branch'; cond: ScriptCondition; then: Command[]; else?: Command[] }
  // 逃生口
  | { kind: 'unmigrated'; opcode: number; operands: number[]; note?: string }

export type WalkSpeed = 'slow' | 'normal' | 'fast' | 'run'

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
  /** autoScript(M3b):巡逻/环境动画;循环跑 stages(段间 1 tick 让步,主脚本期间暂停)。 */
  auto?: { stages: ScriptStage[] }
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
export function applyStageNext(
  world: WorldScriptState,
  key: string,
  current: number,
  next: ScriptStage['next'],
): void {
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
  if (!Array.isArray(stages) || stages.length === 0)
    throw new Error(`${path}: 期望非空 ScriptStage[]`)
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
      if (t.on !== 'interact' && t.on !== 'touch')
        throw new Error(`${path}[${i}].trigger.on: 期望 interact|touch`)
      checkStages(t.stages, `${path}[${i}].trigger.stages`)
    }
  })
}
