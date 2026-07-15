/**
 * 剧情脚本 schema(M3a)—— 设计:docs/phase2/foundation/script-model-m3-design.md §2。
 *
 * 结构化嵌套 AST(无 IP 跳转);可执行内容只允许本联合中的语义命令。
 * 旧 opcode 的翻译缺口属于迁移期诊断,不得进入工程内容或运行时。
 */

import type { GridPos } from './grid.js'
import type { DialogueCue, Facing } from './index.js'
import type { ScriptRef } from './script-library.js'

type ScriptBinding =
  | { stages: ScriptStage[]; script?: never }
  | { script: ScriptRef; stages?: never }

/** 场景脚本的运行时绑定;可内联 stages,也可引用分片脚本。 */
export type RuntimeScriptBinding = ScriptStage[] | ScriptRef

/**
 * 场景脚本覆写三态:
 * - 字段缺席:继承 SceneDef 静态脚本;
 * - 绑定:使用运行时覆写;
 * - null:显式禁用,不得回退静态脚本。
 */
export interface SceneScriptOverride {
  onEnter?: RuntimeScriptBinding | null
  onTeleport?: RuntimeScriptBinding | null
}

// ── 条件(M3b 引擎实现;M3a 只定形供 branch 占位)──
export type ScriptCondition =
  | { kind: 'flag'; flag: string; is: boolean }
  | { kind: 'var'; var: string; op: '==' | '!=' | '>=' | '<=' | '>' | '<'; value: number }
  | { kind: 'entityState'; entity: string; is: number }
  | { kind: 'entityInScene'; entity: string } // 原版 0x83:对象是否属于当前场景(取代下标区间判定)
  | { kind: 'chance'; percent: number } // 原版 0x06 jumpByRate
  | { kind: 'hasItem'; itemId: string; atLeast?: number }
  | { kind: 'itemEquipped'; itemId: string; atLeast?: number } // 原版 0x86:全队装备该物件数 ≥ atLeast(默认1)
  | { kind: 'allFullHp' } // 原版 0x74:全队 HP 均满(洪大夫治伤门)
  | { kind: 'hasMoney'; atLeast: number }
  | { kind: 'inParty'; actorId: string }
  | { kind: 'all'; of: ScriptCondition[] }
  | { kind: 'any'; of: ScriptCondition[] }
  | { kind: 'not'; cond: ScriptCondition }

// ── 命令(M3a 集;增量见设计 §2.3 表)──
/**
 * 跨场景落位的三种互斥模式：缺省=场景默认落点，entryId=命名落点，pos=一次性坐标。
 * facing 是命令级覆盖，不属于目标身份。
 */
export type SceneSpawn =
  | { entryId: string; pos?: never; facing?: Facing }
  | { pos: GridPos; entryId?: never; facing?: Facing }
  | { entryId?: never; pos?: never; facing?: Facing }

export type LoadSceneCommand = { kind: 'loadScene'; scene: string } & SceneSpawn

export type Command =
  // 演出 / 对话
  | { kind: 'dialog'; cue: DialogueCue }
  | { kind: 'clearDialog' } // 原版 0x05 redrawScreen 的语义核(清对话箱)
  | { kind: 'fade'; dir: 'in' | 'out'; ms?: number; color?: 'black' | 'red' }
  /** 原版 0x73:把上一帧按 6 相位 × 12 级逐像素渐变为当前世界帧。 */
  | { kind: 'ditherScreen'; ms?: number }
  // 过场编排(P2):播 mp4 视频(开场 videos/1.mp4 / 结局过场 4-6.mp4)。阻塞至播完 or 跳过键。
  // 「一指令引用一段过场」的 mp4 侧;RNG 序列图(原版 0x36/0x37)另属编排模块序列帧,待落地。
  | { kind: 'playVideo'; videoId: number }
  // 过场编排(P2):播 RNG.MKF 序列图(开场梦境 / 剧情过场 / 结局)。**无调色盘参数** —— 每个 RNG 的
  // 正确调色盘是固定素材属性(引擎内 RNG_PALETTE 定死,不暴露给使用者;清洁重写不带索引色概念)。
  // speed = 原版 iSpeed(帧率,缺省 25);frame 段缺省全播。
  | { kind: 'playRng'; chunkIdx: number; speed?: number; startFrame?: number; endFrame?: number }
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
  | LoadSceneCommand // 门传送模式折叠(0x59[+0x46+0x50])
  // 0x15:原版同时写 wPartyDirection 和 rgParty[member].wFrame = dir*3 + gesture。
  // gesture 缺省 = 0(站立帧,清脚本姿势);>0 = 脚本姿势帧(配合 setActorSprite 演出,
  // 如开场李逍遥练武 gesture 9)。member 缺省 = 0(队长;跟随者渲染落地后生效)。
  | { kind: 'setPartyFacing'; facing: Facing; gesture?: number; member?: number }
  // 实体
  | { kind: 'setEntityState'; entity: string; state: number } // 0x49;≤0 隐,≥2 挡路
  // 0x9A:批量设实体状态(原版全局对象号区间 [op0,op1] 全设 sState=op2;迁移器展开成实体 id 数组,
  // 杜绝下标式身份)。≤0 隐 / 1 显 / ≥2 显+挡路,语义同 setEntityState。跨场景写 world 持久、进场重放。
  | { kind: 'setMultiEntityState'; entities: string[]; state: number }
  // ── 原版高频 op 的 clean 语义命令 ──
  | { kind: 'setEntityPos'; entity: string; pos: GridPos } // 0x13 实体绝对定位(持久+活体双写)
  | { kind: 'setEntityPosRelParty'; entity: string; dcol: number; drow: number } // 0x12 相对队伍格偏移摆位
  | { kind: 'shakeScreen'; frames: number; level: number } // 0x35 震屏(time 帧/level;time=0 关)
  | { kind: 'setScreenWave'; level: number; progression: number } // 0x71 屏幕水波(状态入 vars 随存档)
  | { kind: 'setEntityLayer'; entity: string; layer: number } // 0x7E 实体图层(只进深度键 +8px/层)
  | { kind: 'increaseHpMp'; delta: number; pools?: 'hp' | 'mp' | 'both' } // 0x1B-1D 全队资源变化;缺省 both
  | { kind: 'revivePartyAll'; tenths: number } // 0x22 全队复活(HP=max×tenths/10 + 解重毒)
  | { kind: 'learnSkill'; role: number; skill: string } // 0x55 角色学仙术(role 0-based)
  | { kind: 'unequip'; role: number; slot: number | 'all' } // 0x23 卸装(退回背包)
  | { kind: 'toggleDayNight'; ms: number } // 0x80 昼夜切换(op0==0 → 3200ms 否则 800ms)
  | { kind: 'setFollowers'; sprites: number[] } // 0x98 编外跟随者精灵号(空=清)
  | { kind: 'setSceneMapOverride'; scene?: string; mapId: string } // 0x99 换图(scene 缺=当前即时重载)
  | { kind: 'halveMoney' } // 0x8F 金钱减半(酒剑仙赌局;运行时算 delta)
  | { kind: 'setEntityFacing'; entity: string; facing: Facing } // 0x0F/0x16
  | { kind: 'setEntityFrame'; entity: string; frame: number } // 0x14/0x0F op1
  // 0x65:换角色大世界精灵(id 引用,非下标)。原版写 PlayerRoles.rgwSpriteNum[role],
  // 持续到下一次显式切换(开场练武 627/疯跑 193 后脚本自行切回)。
  | { kind: 'setActorSprite'; actor: string; sprite: string }
  // 0x1A:持久改角色形象(原版 PlayerRoles SoA 字段:成年灵儿换头像/精灵/战斗精灵,随存档)。
  // 一条命令改一个维度(migrate 按 SoA 字段号分流);spriteId 已解析成 id,portrait/battleSprite 是号。
  | {
      kind: 'setActorAppearance'
      actor: string
      spriteId?: string
      portrait?: number
      battleSprite?: number
    }
  // 0x69:敌人逃离战场(战斗演出 choreography 专用;终止战斗无奖励)。大世界 host 打日志跳过。
  | { kind: 'fleeBattle' }
  // 0x89:脚本终止战斗(choreography 专用)。result:terminate 无奖励干净退(林天南撑 7 回合)/
  //   won 判胜 / lost 判负。原版 BattleResult=op0(0 终止 /3 胜 /1 负)。
  | { kind: 'endBattle'; result: 'terminate' | 'won' | 'lost' }
  // 跳转臂终止:原版跳转族(0x06/0x0A/0x1E/0x20/0x79…)命中即改 wScriptEntry,链一路跑到
  // END(op 目标 0 = 全局 0 号 END,当场退)。翻译把跳转内联成臂后,臂跑完必须终止本次脚本
  // 运行(否则落穿回父体 = 概率门/确认门全废)——翻译器在每个跳走臂尾发射本命令;
  // runner 收到即结束 runStages 本次运行且**阶段不转移**(auto 下拍重跑 = 原版"原地不动")。
  | { kind: 'stopScript' }
  | { kind: 'quitToTitle' } // 0xA0 游戏通关退出(拜月最终决战后 → 回标题屏;仙剑单一结局)
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
  // 氛围(W6 昼夜;原版 0x53 昼/0x54 夜全局调色板 flag 的 clean 表达 —— 全帧乘法滤镜)
  | { kind: 'setAmbience'; ambience: string }
  // 走位 / 演出(M3b;速度=原版 2/3/4/8 → slow/normal/fast/run)
  | { kind: 'moveEntity'; entity: string; to: GridPos; speed: WalkSpeed } // 阻塞:直线走到(原版 walkTo)
  | { kind: 'stepEntity'; entity: string; dir: Facing } // 单步(0x0B-0E:设向+走一步)
  | { kind: 'animEntity'; entity: string } // 0x87:仅推动画帧(不位移)
  | { kind: 'nudgeEntity'; entity: string; dx: number; dy: number } // 0x7D/0x6C:像素位移(瞬时)
  | { kind: 'moveParty'; to: GridPos; speed: WalkSpeed } // 阻塞:队伍走到
  | { kind: 'nudgeParty'; dx: number; dy: number } // 0x6E:队伍相对单步(带走姿)
  // 战斗 / 商店 / 确认(M3b 翻译;战斗引擎 M4,先桩)
  // auto(0x8A):整场自动战斗(玩家侧 AI 代打、不出指令菜单 —— 石长老 vs 盖罗娇过场战)。
  // boss:原版 0x07 fIsBoss = !op2(script.c:3318,无逃跑臂 = 首领战:不可逃 + 胜利曲 2)。
  | {
      kind: 'startBattle'
      team: number
      onLose?: Command[]
      onFlee?: Command[]
      auto?: boolean
      boss?: boolean
      /** 本场专属战场/战斗乐(剧情/boss 战显式指定;缺省走 场景覆写→场景默认→项目默认)。 */
      fieldId?: number
      musicId?: number
      /** 遭遇专属战斗演出(开场白/逐回合台词/结束条件;二阶段 clean 架构:对话绑**这一场遭遇**
       *  而非敌种 —— 消掉原版敌种绑定 + 0x79 队伍门 + 0x90 说一次那套 hack。boss 战由此携带,
       *  杂兵遭遇不带;同敌种在不同遭遇的对话天然独立)。见 enemy.ts BattleChoreography。 */
      choreography?: import('./enemy.js').BattleChoreography[]
    }
  // 传送出口(原版 0x38;引路蜂/土灵珠道具用):跑当前场景 onTeleport 脚本;场景无此槽 →
  // 走 onFail(「引路蜂不灵」提示)。战斗中禁用(原版 !fInBattle,道具菜单本就战外,冗余守卫)。
  | { kind: 'teleportOut'; onFail?: Command[] }
  | { kind: 'openShop'; shop: number; mode: 'buy' | 'sell' }
  | { kind: 'confirm'; onNo: Command[] } // 0x0A 是/否框:选"否"走 onNo,"是"继续
  // 相机(M3c;0x7F 三形态。⚠ 一阶段彩依飞走案:走位期间偏移必须保持,不许绝对回正)
  | { kind: 'cameraPan'; dx: number; dy: number; frames: number } // 相对:每帧位移 ×frames,阻塞
  | { kind: 'cameraSnap'; to?: GridPos } // 绝对跳到格(to)/回正跟随(缺省)
  // 页切换(M3c;原版 0x24/25/40 改脚本入口指针。运行时覆盖,暂不持久 —— 原版存档存指针,
  // clean 版的持久化留给页注册表设计(M4 期);过场局部行为切换不受影响)
  | ({ kind: 'setEntityAuto'; entity: string } & ScriptBinding) // 0x24;inline 手写或迁移 ScriptRef
  | ({ kind: 'setSceneOnEnter'; scene: string } & ScriptBinding) // 0x6D op1:覆写进场脚本
  | ({ kind: 'setSceneOnTeleport'; scene: string } & ScriptBinding) // 0x6D op2:覆写传送出口
  | { kind: 'clearSceneScripts'; scene: string } // 0x6D both-zero:显式禁用双槽
  | ({ kind: 'setEntityTrigger'; entity: string } & ScriptBinding) // 0x25;触发方式沿用当前
  | { kind: 'setEntityTriggerMode'; entity: string; on?: 'interact' | 'touch'; range?: number } // 0x40;on 缺省=关
  // 定位权威(E6b:显式接管/归还 —— 隐式接管见位移指令;手工演出精细控制用)
  | { kind: 'takeEntity'; entity: string }
  | { kind: 'releaseEntity'; entity?: string } // 缺省 = 归还全部
  // 载具/挂载(E7,D20「父动子随」契约。原版 0xA1 聚拢+0x3F/0x44/0x97 骑乘的 clean 表达:
  // mountParty 挂上(dx/dy 缺省 0=重叠) → ride 骑行走位(可连发) → unmountParty 下(位置留当下))
  | { kind: 'mountParty'; entity: string; dx?: number; dy?: number }
  | { kind: 'unmountParty' }
  | { kind: 'ride'; entity: string; to: GridPos; speed: WalkSpeed }
  // 队伍管理(C7,D22 reserve 暂存区。原版 0x75 setParty 的 clean 表达:
  // members = 角色模板 id 有序表(站位序;杜绝下标式身份),离队进 reserve 状态不丢)
  | { kind: 'setParty'; members: string[] }
  // 控制流(M3b 引擎;schema 先行防返工)
  | { kind: 'branch'; cond: ScriptCondition; then: Command[]; else?: Command[] }
  /** 受控调用：目标正常结束后返回当前命令体。 */
  | { kind: 'callScript'; ref: ScriptRef; self?: string }
  /** 尾转移：目标结束后不返回当前命令体。 */
  | { kind: 'jumpScript'; ref: ScriptRef; self?: string }

export type WalkSpeed = 'slow' | 'normal' | 'fast' | 'run'

/** 场景入场把目标世界交给呈现层的唯一提交边界。 */
export type SceneReveal =
  | { kind: 'dither'; ms: number; source: 'previousPresentedFrame' }
  | { kind: 'fade'; outMs: number; inMs: number }
  | { kind: 'cut' }

/** 仅 scene onEnter stage 可声明；prepare 在目标画面尚未呈现时执行。 */
export interface SceneEntryPresentation {
  prepare: Command[]
  reveal: SceneReveal
}

export type SceneEntryPrepareSafety = 'safe' | 'blocked'

/**
 * 入场 prepare 的命令能力目录。validator 与迁移 lifting 共用这一份穷尽表；新增 Command kind
 * 未分类会在 typecheck 失败，不允许再出现运行时靠前缀白名单猜语义的第二决策源。
 */
export const SCENE_ENTRY_PREPARE_SAFETY = {
  addVar: 'safe',
  animEntity: 'safe',
  branch: 'blocked',
  callScript: 'blocked',
  cameraPan: 'blocked',
  cameraSnap: 'safe',
  chasePlayer: 'blocked',
  clearDialog: 'safe',
  clearSceneScripts: 'safe',
  confirm: 'blocked',
  dialog: 'blocked',
  ditherScreen: 'blocked',
  endBattle: 'safe',
  fade: 'blocked',
  fleeBattle: 'safe',
  gameOver: 'blocked',
  giveItem: 'safe',
  giveMoney: 'safe',
  halveMoney: 'safe',
  increaseHpMp: 'safe',
  jumpScript: 'blocked',
  learnSkill: 'safe',
  loadLastSave: 'blocked',
  loadScene: 'blocked',
  loseItem: 'safe',
  mountParty: 'safe',
  moveEntity: 'blocked',
  moveParty: 'blocked',
  nudgeEntity: 'safe',
  nudgeParty: 'safe',
  openShop: 'blocked',
  playMusic: 'safe',
  playRng: 'blocked',
  playSound: 'safe',
  playVideo: 'blocked',
  quitToTitle: 'blocked',
  releaseEntity: 'safe',
  revivePartyAll: 'safe',
  ride: 'blocked',
  setActorAppearance: 'blocked',
  setActorSprite: 'blocked',
  setAmbience: 'safe',
  setEntityAuto: 'safe',
  setEntityFacing: 'safe',
  setEntityFrame: 'safe',
  setEntityLayer: 'safe',
  setEntityPos: 'safe',
  setEntityPosRelParty: 'safe',
  setEntityState: 'safe',
  setEntityTrigger: 'safe',
  setEntityTriggerMode: 'safe',
  setFlag: 'safe',
  setFollowers: 'safe',
  setMultiEntityState: 'safe',
  setParty: 'safe',
  setPartyFacing: 'safe',
  setSceneMapOverride: 'blocked',
  setSceneOnEnter: 'safe',
  setSceneOnTeleport: 'safe',
  setScreenWave: 'safe',
  setVar: 'safe',
  shakeScreen: 'safe',
  startBattle: 'blocked',
  stepEntity: 'safe',
  stopScript: 'blocked',
  takeEntity: 'safe',
  teleportOut: 'blocked',
  teleportParty: 'safe',
  toggleDayNight: 'safe',
  unequip: 'safe',
  unmountParty: 'safe',
  vanishEntity: 'safe',
  wait: 'blocked',
} as const satisfies Record<Command['kind'], SceneEntryPrepareSafety>

export function sceneEntryPrepareSafety(command: Command): SceneEntryPrepareSafety {
  return SCENE_ENTRY_PREPARE_SAFETY[command.kind]
}

/**
 * 触发段(stage):原版 end.advance/end.reset(合计 1,699 次)的 clean 版。
 * 实体/场景的触发脚本 = stages 数组;world.entityStage 记当前第几段。
 * 段跑完按 next 转移:缺省 = stay(下次重跑同段);'advance' = 推进下一段;数字 = 重置到该段。
 */
export interface ScriptStage {
  /** 仅场景 onEnter 使用：先准备隐藏目标世界，再显式 reveal，最后执行 body。 */
  entry?: SceneEntryPresentation
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
  /** 实体位置覆写(原版 0x13 绝对定位的持久层:跨场景定位常见(pal 数据 36/54 处),
   *  进场重放到实体;本场景实体活体同步生效)。缺省/旧档 → 无覆写。 */
  entityPos?: Record<string, GridPos>
  /** 实体图层覆写(原版 0x7E sLayer:**只进深度排序键**(+8px/层)不进落笔位,
   *  一阶段 present.ts:540 真值;立交/上下层遮挡)。render 每帧直读,天然跨场景。 */
  entityLayer?: Record<string, number>
  /** 编外跟随者精灵号(原版 0x98 nFollower:operand **直接当精灵 chunk**,非角色表;
   *  ≤2 个,队尾按 trail 跟走恒 3 帧步 —— s102 书生 82/83)。空/缺省 = 无。 */
  followers?: number[]
  /** 场景底图覆写(原版 0x99 wMapNum 改写:键 = sceneId;0xFFFF 当前场景即时重载,
   *  其余场景下次进场生效;随存档持久 —— 麒麟洞 s230/s243 岩浆变化)。 */
  mapOverride?: Record<string, string>
  /** 场景 onEnter/onTeleport 运行时覆写;与 mapOverride 保持独立。 */
  sceneScriptOverrides?: Record<string, SceneScriptOverride>
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
function checkRef(value: unknown, path: string): void {
  const ref = value as { chunk?: unknown; id?: unknown } | null
  if (
    typeof ref !== 'object' ||
    ref === null ||
    typeof ref.chunk !== 'string' ||
    ref.chunk.length === 0 ||
    typeof ref.id !== 'string' ||
    ref.id.length === 0
  )
    throw new Error(`${path}: 期望 {chunk,id} ScriptRef`)
}

export function checkCommands(cmds: unknown, path: string): void {
  if (!Array.isArray(cmds)) throw new Error(`${path}: 期望 Command[]`)
  cmds.forEach((c, i) => {
    if (typeof c !== 'object' || c === null || typeof (c as { kind?: unknown }).kind !== 'string')
      throw new Error(`${path}[${i}]: 缺 kind`)
    const k = (c as { kind: string }).kind
    if (k === 'unmigrated') throw new Error(`${path}[${i}]: 旧工程产物,请用迁移器重新生成`)
    if (k === 'dialog') {
      const dialog = c as { cue?: unknown; line?: unknown }
      if (dialog.line !== undefined)
        throw new Error(`${path}[${i}]: dialog.line 已退役，请在加载边界升级为 cue.rows`)
      const cue = dialog.cue as Partial<DialogueCue> | null | undefined
      if (!cue || !Array.isArray(cue.rows) || cue.rows.length === 0)
        throw new Error(`${path}[${i}]: dialog 缺非空 cue.rows`)
      cue.rows.forEach((row, rowIdx) => {
        if (!row || typeof row.text !== 'string')
          throw new Error(`${path}[${i}].cue.rows[${rowIdx}]: 缺 text`)
        if (row.speed !== undefined && (!Number.isFinite(row.speed) || row.speed < 0))
          throw new Error(`${path}[${i}].cue.rows[${rowIdx}].speed: 期望非负有限数`)
      })
      if (
        cue.autoAdvance !== undefined &&
        (!Number.isFinite(cue.autoAdvance) || cue.autoAdvance < 0)
      )
        throw new Error(`${path}[${i}].cue.autoAdvance: 期望非负有限数`)
    }
    if (k === 'loadScene') {
      const load = c as { scene?: unknown; entryId?: unknown; pos?: unknown; facing?: unknown }
      if (typeof load.scene !== 'string' || load.scene.length === 0)
        throw new Error(`${path}[${i}].scene: 期望非空场景 id`)
      if (load.entryId !== undefined && (typeof load.entryId !== 'string' || !load.entryId))
        throw new Error(`${path}[${i}].entryId: 期望非空命名落点 id`)
      if (load.entryId !== undefined && load.pos !== undefined)
        throw new Error(`${path}[${i}]: entryId 与 pos 不能同时存在`)
      if (load.pos !== undefined) checkGridPos(load.pos, `${path}[${i}].pos`)
      if (load.facing !== undefined) checkFacing(load.facing, `${path}[${i}].facing`)
    }
    if (k === 'branch') {
      checkCommands((c as { then?: unknown }).then, `${path}[${i}].then`)
      const el = (c as { else?: unknown }).else
      if (el !== undefined) checkCommands(el, `${path}[${i}].else`)
    }
    if (k === 'startBattle') {
      const battle = c as { onLose?: unknown; onFlee?: unknown }
      if (battle.onLose !== undefined) checkCommands(battle.onLose, `${path}[${i}].onLose`)
      if (battle.onFlee !== undefined) checkCommands(battle.onFlee, `${path}[${i}].onFlee`)
    }
    if (k === 'teleportOut') {
      const onFail = (c as { onFail?: unknown }).onFail
      if (onFail !== undefined) checkCommands(onFail, `${path}[${i}].onFail`)
    }
    if (k === 'confirm') checkCommands((c as { onNo?: unknown }).onNo, `${path}[${i}].onNo`)
    if (k === 'callScript' || k === 'jumpScript')
      checkRef((c as { ref?: unknown }).ref, `${path}[${i}].ref`)
    if (
      k === 'setEntityAuto' ||
      k === 'setEntityTrigger' ||
      k === 'setSceneOnEnter' ||
      k === 'setSceneOnTeleport'
    ) {
      const binding = c as { stages?: unknown; script?: unknown }
      if (binding.script !== undefined) {
        if (binding.stages !== undefined)
          throw new Error(`${path}[${i}]: stages 与 script 不能同时存在`)
        checkRef(binding.script, `${path}[${i}].script`)
      } else {
        // 动态换页的 [] 是既有“停用”语义；普通 stage 根仍要求非空。
        if (!(Array.isArray(binding.stages) && binding.stages.length === 0))
          checkStages(binding.stages, `${path}[${i}].stages`, {
            allowSceneEntry: k === 'setSceneOnEnter',
          })
      }
    }
  })
}

function checkGridPos(value: unknown, path: string): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${path}: 期望 GridPos`)
  const pos = value as { col?: unknown; row?: unknown; height?: unknown }
  for (const key of ['col', 'row', 'height'] as const) {
    if (typeof pos[key] !== 'number' || !Number.isFinite(pos[key]))
      throw new Error(`${path}.${key}: 期望有限数`)
  }
}

function checkFacing(value: unknown, path: string): void {
  if (value !== 'up' && value !== 'down' && value !== 'left' && value !== 'right')
    throw new Error(`${path}: 期望 up/down/left/right`)
}

export interface CheckStagesOptions {
  /** 只有 SceneDef.onEnter 与 setSceneOnEnter 的 stage 能声明 entry。 */
  allowSceneEntry?: boolean
}

function checkNonNegativeFinite(value: unknown, path: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error(`${path}: 期望非负有限数`)
}

function checkSceneEntry(value: unknown, path: string): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${path}: 期望 SceneEntryPresentation`)
  const entry = value as { prepare?: unknown; reveal?: unknown }
  checkCommands(entry.prepare, `${path}.prepare`)
  for (const [index, raw] of (entry.prepare as unknown[]).entries()) {
    const kind = (raw as { kind?: unknown } | null)?.kind
    const safety =
      typeof kind === 'string' ? SCENE_ENTRY_PREPARE_SAFETY[kind as Command['kind']] : undefined
    if (safety !== 'safe')
      throw new Error(`${path}.prepare[${index}]: 命令 ${String(kind)} 不允许在隐藏目标画面时执行`)
  }
  if (typeof entry.reveal !== 'object' || entry.reveal === null || Array.isArray(entry.reveal))
    throw new Error(`${path}.reveal: 期望对象`)
  const reveal = entry.reveal as Record<string, unknown>
  switch (reveal.kind) {
    case 'dither':
      checkNonNegativeFinite(reveal.ms, `${path}.reveal.ms`)
      if (reveal.source !== 'previousPresentedFrame')
        throw new Error(`${path}.reveal.source: 期望 previousPresentedFrame`)
      break
    case 'fade':
      checkNonNegativeFinite(reveal.outMs, `${path}.reveal.outMs`)
      checkNonNegativeFinite(reveal.inMs, `${path}.reveal.inMs`)
      break
    case 'cut':
      break
    default:
      throw new Error(`${path}.reveal.kind: 期望 dither|fade|cut`)
  }
}

export function checkStages(stages: unknown, path: string, options: CheckStagesOptions = {}): void {
  if (!Array.isArray(stages) || stages.length === 0)
    throw new Error(`${path}: 期望非空 ScriptStage[]`)
  stages.forEach((st, i) => {
    const entry = (st as { entry?: unknown } | null)?.entry
    if (entry !== undefined) {
      if (!options.allowSceneEntry)
        throw new Error(`${path}[${i}].entry: 只允许出现在场景 onEnter stage`)
      checkSceneEntry(entry, `${path}[${i}].entry`)
    }
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
