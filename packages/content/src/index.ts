/**
 * @type-pal/content — 第二阶段内容数据（切片 1：鬼界民居 demo）
 *
 * 纯数据 + 类型。reforge 引擎**消费**这层；编辑器（将来）**生产**这层。
 * demo 阶段：场景复用原版地图（运行时按 mapNum 从 /extracted 加载 tilemap+tileset+palette），
 * 实体 / 对话手写。坐标与精灵引用待渲染时校准（见 TODO）。
 *
 * 见 docs/phase2/slice1-indoor/guijie-minju.md。稳定 id，不用下标。
 */

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

export interface DialogueLine {
  /** 说话人名的 textId;省略 = 旁白 / 心理活动。原版「末尾冒号」判定 → 此显式字段。 */
  speaker?: TextId
  /** 正文 textId,指向 locale 富文本(单色纯文本 / 多色带 <color> 标记)。 */
  text: TextId
  /** 打字速度(ms/字);省略 = 默认。原版 $NN。 */
  speed?: number
  /** 尾停顿 + 自动推进(ms);存在 = 打完停 N ms 自动进下一页、不等键。原版 ~NN。 */
  autoAdvance?: number
  /** 画到哪个面板;默认 bottom。异 slot 推进 = 共存,同 slot = 覆盖。narration = 中央叙述窗(原版 0x3E)。 */
  slot?: 'top' | 'bottom' | 'narration'
  /** 头像 RGM chunk + 左/右;省略 = 无头像。 */
  portrait?: { icon: number; side: 'left' | 'right' }
  /** 等键光标形态(0 默认箭头 / 1 / 2);省略 = 0。原版 `(`/`)` 控制符 → 此显式字段。 */
  cursorFrame?: 0 | 1 | 2
}

export interface Dialogue {
  id: string
  /** 每行 = 一页 */
  lines: DialogueLine[]
}

/**
 * 实体引用(C0/M3a):角色实例(actor → actors 表)⊕ 纯静物 prop(sprite → sprites 表)
 * ⊕ 隐形触发区(zone:true,门/脚本锚 —— 有位置有触发无视觉),三选一。
 * 花瓶/装饰直接引精灵,不逼着建假角色;NPC/角色经 ActorDef 共享 名字/精灵/battler 定义。
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
  interact?: string
  /** 初始隐藏(原版 sState=0;脚本届时显形 = M3/B2 状态页)。隐藏 = 不渲染不碰撞。 */
  hidden?: boolean
  /** 画序偏置(原版 sLayer 人工覆盖;叠加进 Y-sort 基线,防遮挡漂移)。 */
  zBias?: number
  /** 行为页(M3:触发脚本/自动脚本;扁平字段是默认外观,页只加行为)。见 script.ts。 */
  pages?: EntityPage[]
}

/** 场景实体 = 公共字段 & (actor ⊕ sprite)。判别用 isActorEntity / resolveEntitySpriteId(actor.ts)。 */
export type EntityDef = EntityBase & EntityRef

export interface SceneDef {
  id: string
  /**
   * demo：复用一张原版地图（运行时按 mapNum 从 /extracted 加载）。
   * ⚠ 原版一张图里塞了**多间**民居（定长 64×128 省资源）；只取其中**完整一间**的
   * 格子矩形（cell 坐标）。reforge 只渲染 / 碰撞这个窗口，场景有效尺寸 = 这一间
   * （验证 D3 变尺寸）。将来编辑器产出的场景会换成自有地图数据。
   */
  map: {
    reuseOriginalMap: number
    /** 可选视窗:房间在原图里的格子矩形(旧 cell 坐标)。**缺省 = 整张图**(原版无房间概念,
     *  相机夹全图包围盒;room 是 demo 单间切片的发明,迁移场景一律不填)。M2 设计 §1。 */
    room?: { col: number; row: number; cols: number; rows: number }
  }
  /** BGM 槽(原版音乐号;窄扫描自 onEnter 链头 playMusic)。缺省 = 延续上一曲(忠实原版)。 */
  musicId?: number
  /** 命名入口(M3 传送引用;迁移自 setPartyPos→loadScene 对:from-scene-<src>[-k] / start)。 */
  entries?: Record<string, { pos: GridPos; facing?: Facing }>
  /**
   * 调色板号(原版调色板下标);缺省 0 向后兼容。引擎据此 loadPalette,去 URL `?pal=` 兜底。
   * (demo 未跑 setPalette 脚本,此前靠 URL 手动指定;现在场景自带。)
   */
  paletteId?: number
  /** 玩家（李逍遥）进场点 */
  entry: { pos: GridPos; facing: Facing }
  /** 场上 NPC / 物件（不含玩家） */
  entities: EntityDef[]
  dialogues: Dialogue[]
  /** 进场脚本(M3;stages:原版首访 cutscene 演完 advance,之后只跑纯 setup 段)。 */
  onEnter?: ScriptStage[]
}

export * from './actor.js'
export * from './battle-formulas.js'
export * from './character.js'
export * from './script.js'
export * from './grid.js'
export * from './item.js'
export * from './locale.js'
export * from './rich-text.js'
export * from './skill.js'
export * from './sprite.js'
export * from './validate.js'
export * from './validate-refs.js'
