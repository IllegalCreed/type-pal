/**
 * @type-pal/content — 第二阶段内容数据（切片 1：鬼界民居 demo）
 *
 * 纯数据 + 类型。reforge 引擎**消费**这层；编辑器（将来）**生产**这层。
 * 地图、实体和脚本均以工程稳定 id 连接；旧资源编号只允许出现在迁移输入端。
 *
 * 见 docs/phase2/slice1-indoor/guijie-minju.md。稳定 id，不用下标。
 */

import type { AssetId } from './asset.js'
import type { GridPos } from './grid.js'
import type { EntityPage, ScriptStage } from './script.js'

export type Facing = 'up' | 'down' | 'left' | 'right'

/** 稳定文本 id;运行时按当前 locale 查表(D9)。 */
export type TextId = string

/** 对话颜色语义名;palette 映射在渲染层,内容层不出现魔法数。 */
export type DialogColor = 'default' | 'cyan' | 'red' | 'redAlt' | 'yellow'

/** 一段同色文本(parseRichText 产物,渲染中间表示,非内容字段)。 */
export interface TextSpan {
  text: string
  color?: DialogColor
}

export interface Vec2 {
  x: number
  y: number
}

export interface DialogueRow {
  /** 正文 textId,指向 locale 富文本(单色纯文本 / 多色带 <color> 标记)。 */
  text: TextId
  /** 打字速度(ms/字);省略 = 默认。原版 $NN。 */
  speed?: number
}

/** 一次连续显示单元。共享外观/收尾属性放 cue，逐行文本与速度放 rows。 */
export interface DialogueCue {
  /** 说话人名的 textId;省略 = 旁白 / 心理活动。原版「末尾冒号」判定 → 此显式字段。 */
  speaker?: TextId
  /** 原版每条 showDialog 对应一行；不得再用 locale 内换行模拟行边界。 */
  rows: DialogueRow[]
  /** 尾停顿 + 自动推进(ms);存在 = 打完停 N ms 自动进下一页、不等键。原版 ~NN。 */
  autoAdvance?: number
  /** 画到哪个面板;默认 bottom。异 slot 推进 = 共存,同 slot = 覆盖。narration = 中央叙述窗(原版 0x3E)。 */
  slot?: 'top' | 'bottom' | 'narration' | 'center'
  /** 头像资源 + 左/右;省略 = 无头像。 */
  portrait?: { asset: AssetId; side: 'left' | 'right' }
  /** 等键光标形态(0 默认箭头 / 1 / 2);省略 = 0。原版 `(`/`)` 控制符 → 此显式字段。 */
  cursorFrame?: 0 | 1 | 2
}

export interface Dialogue {
  id: string
  cues: DialogueCue[]
}

/**
 * 实体引用(C0/M3a):可见实体的外观来源是 actor 或 sprite；zone 是无外观触发区，三选一。
 * NPC、敌人、物件、宝箱等是独立玩法职责，不能从 SpriteDef id 或外观来源反推。
 */
export type EntityRef = { actor: string } | { sprite: string } | { zone: true }

/** 实体公共字段(实例级:位置/朝向/碰撞/交互)。 */
export interface EntityBase {
  id: string
  /** 世界菱形轴逻辑坐标(D16);height=0 地面站立。 */
  pos: GridPos
  /** 实例朝向(缺省 down;directional 布局才有视觉差)。 */
  facing?: Facing
  /** 是否挡路（碰撞） */
  collide?: boolean
  /** 交互触发的对话 id */
  /** 初始隐藏(原版 sState=0;脚本届时显形 = M3/B2 状态页)。隐藏 = 不渲染不碰撞。 */
  hidden?: boolean
  /** 画序偏置(原版 sLayer 人工覆盖;叠加进 Y-sort 基线,防遮挡漂移)。 */
  zBias?: number
  /** 行为页(M3:触发脚本/自动脚本;扁平字段是默认外观,页只加行为)。见 script.ts。 */
  pages?: EntityPage[]
  /**
   * 敌对行为(B9;引擎内置遇敌,零脚本)。有此字段 = 野怪:引擎自动追逐→贴脸开战→
   * 胜利消失/重生、战败走 onLose。原版靠 event object 挂脚本区分野怪,新引擎用**数据**区分
   * (作者拍板:野怪追逐/胜负是引擎能力,不是脚本);迁移器识别标准遇敌模板折叠进此字段,
   * 特殊编排(剧情怪)仍走 pages 脚本。
   */
  hostile?: HostileBehavior
}

/** 敌对行为数据(B9)。缺 chase = 原地怪;缺 respawn = 永杀(硬核难度杠杆)。 */
export interface HostileBehavior {
  /** 遇敌敌队(startBattle team)。 */
  team: number
  /** 此怪专属战场(优先于场景默认;水怪上岸打水下场地这类)。 */
  battleFieldId?: number
  /** 追逐参数(缺省 = 原地不追)。range = 切比雪夫格内才追;speed 越大越快;floating 穿障。 */
  chase?: { range: number; speed: number; floating?: boolean }
  /** 战败后重生秒数(缺省 = 死了不复活)。 */
  respawnSeconds?: number
  /** 战败处理:'gameOver'(默认渐红读档)或自定义命令(剧情战输了也继续)。 */
  onLose?: 'gameOver' | import('./script.js').Command[]
}

/** 场景实体 = 公共字段 & (actor ⊕ sprite ⊕ zone)。判别与外观解析见 actor.ts。 */
export type EntityDef = EntityBase & EntityRef

/**
 * 场景空间锚点。record key 是脚本引用的稳定 id；label 只供作者阅读和修改。
 * 它不是 EntityDef，不参与精灵、碰撞、触发页或实体生命周期。
 */
export interface SceneEntryPoint {
  label?: string
  pos: GridPos
  facing?: Facing
}

export interface SceneDef {
  id: string
  /** 地图库中的稳定 id；路径只属于 MapAssetDefV1。 */
  mapId: string
  /** BGM 槽。缺省 = 延续上一曲；AssetId = 切曲；null = 停曲。 */
  music?: AssetId | null
  /**
   * 本场景战斗的默认战场(battle-fields id:背景图+五灵加成+屏波)。
   * 解析优先级(无任何持久态):startBattle.fieldId(剧情战一次性显式)> hostile.battleFieldId
   * (明雷怪专属)> 此场景默认 > 项目默认。原版 0x4A 持久全局已退役:特殊战场绑一次性
   * startBattle,打完自然回落本字段;不再有「剧情点覆写 + 随存档」这一档(铁律 4)。
   */
  battleFieldId?: number
  /** 本场景战斗的默认 BGM。缺省 = 项目角色；AssetId = 指定；null = 静音。 */
  battleMusic?: AssetId | null
  /** 额外命名落点；默认落点只存于 entry，脚本以稳定 record key 引用。 */
  entries?: Record<string, SceneEntryPoint>
  // 调色板字段已退役(W7a-3):清洁重写只留盘 0,无「调色板」概念(见 no-palette-concept 方针)。
  /** 玩家（李逍遥）进场点 */
  entry: { pos: GridPos; facing: Facing }
  /** 场内可见实体与无外观触发区（不含玩家） */
  entities: EntityDef[]
  /** 进场脚本(M3;stages:原版首访 cutscene 演完 advance,之后只跑纯 setup 段)。 */
  onEnter?: ScriptStage[]
  /**
   * 传送出口脚本(原版 wScriptOnTeleport):引路蜂/土灵珠(道具 0x38 teleportOut)读它——
   * 有 = 可用,跑此脚本(通常淡出+loadScene 回洞口/城镇);空/无 = 本场景不可传送(「引路蜂不灵」)。
   * 编辑器场景页可配「传到何处」(生成 loadScene 脚本);复杂出口(带对话演出)走完整脚本。
   */
  onTeleport?: ScriptStage[]
}

export * from './actor.js'
export * from './ambience.js'
export * from './asset.js'
export * from './battle-formulas.js'
export * from './battle-sprite.js'
export * from './character.js'
export * from './dialogue-upgrade.js'
export * from './enemy.js'
export * from './enemy-ai.js'
export * from './enemy-script-v10.js'
export * from './enemy-script-v10-upgrade.js'
export * from './equip-battle-sprite-v9-upgrade.js'
export * from './frame-sequence.js'
export * from './grid.js'
export * from './item.js'
export * from './item-throw-v8-upgrade.js'
export * from './item-v5.js'
export * from './locale.js'
export * from './map-index.js'
export * from './migration-diagnostic.js'
export * from './poison.js'
export * from './project-map.js'
export * from './project-script-v5-upgrade.js'
export * from './project-upgrade.js'
export * from './rewards.js'
export * from './rich-text.js'
export * from './scene-v5.js'
export * from './script.js'
export * from './script-library.js'
export * from './script-transition-v5.js'
export * from './script-v5.js'
export * from './shop.js'
export * from './skill.js'
export * from './skill-execution-v11-upgrade.js'
export * from './sprite.js'
export * from './stamp.js'
export * from './tileset.js'
export * from './validate.js'
export * from './validate-refs.js'
