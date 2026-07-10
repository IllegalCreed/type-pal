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

/**
 * 音乐库条目(编辑器数据:BGM 下拉/试听/起别名)。
 * 引擎播放只按编号(scene.musicId / playMusic op),不读此表;缺 music.json 的工程照常运行。
 */
export interface MusicDef {
  /** 音乐号(assetBase.music 下 <NNN>.mid,3 位零填充)。 */
  id: number
  /** 创作者起的别名(选择器/音乐库显示;缺省显示编号)。 */
  name?: string
}

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

/** 场景实体 = 公共字段 & (actor ⊕ sprite)。判别用 isActorEntity / resolveEntitySpriteId(actor.ts)。 */
export type EntityDef = EntityBase & EntityRef

/**
 * 复用原版地图(demo/迁移):运行时按 mapNum 从 assets 加载 tilemap+tileset。
 * ⚠ 原版一张图里塞了**多间**民居(定长 64×128 省资源);只取其中**完整一间**的格子矩形
 * (cell 坐标)。reforge 只渲染/碰撞这个窗口,场景有效尺寸 = 这一间(验证 D3 变尺寸)。
 */
export interface ReuseMap {
  reuseOriginalMap: number
  /** 可选视窗:房间在原图里的格子矩形(旧 cell 坐标)。**缺省 = 整张图**(原版无房间概念,
   *  相机夹全图包围盒;room 是 demo 单间切片的发明,迁移场景一律不填)。M2 设计 §1。 */
  room?: { col: number; row: number; cols: number; rows: number }
}

/** 自有地图(W7D):工程内 `content/maps/<id>.json`(OwnMap v1),作者绘制,脱离原版。 */
export interface OwnMapRef {
  /** 工程内相对路径,如 `content/maps/<id>.json`。 */
  ownMap: string
}

/** 场景地图 = 复用原版 ⊕ 自有地图。判别用 isReuseMap。 */
export type SceneMap = ReuseMap | OwnMapRef

/** 判别:复用原版地图(含 reuseOriginalMap 键)vs 自有地图(ownMap)。 */
export function isReuseMap(m: SceneMap): m is ReuseMap {
  return 'reuseOriginalMap' in m
}

/** 复用原版地图号;自有地图返回 undefined(渲染分流由调用方按 isReuseMap 处理)。 */
export function reuseMapNum(m: SceneMap): number | undefined {
  return isReuseMap(m) ? m.reuseOriginalMap : undefined
}

/** 房间视窗(仅复用原版地图有;自有地图 undefined = 整图)。 */
export function mapRoom(m: SceneMap): ReuseMap['room'] {
  return isReuseMap(m) ? m.room : undefined
}

/** 稳定缓存键:复用→`r:<原版号>`,自有→`o:<工程内路径>`。引擎地图 LRU / 编辑器资产重载比较共用。 */
export function sceneMapKey(m: SceneMap): string {
  return isReuseMap(m) ? `r:${m.reuseOriginalMap}` : `o:${m.ownMap}`
}

export interface SceneDef {
  id: string
  /** 场景地图:复用原版(reuseOriginalMap)或自有(ownMap)。W7 起为联合。 */
  map: SceneMap
  /** BGM 槽(原版音乐号;窄扫描自 onEnter 链头 playMusic)。缺省 = 延续上一曲(忠实原版)。 */
  musicId?: number
  /**
   * 本场景战斗的默认战场(battle-fields id:背景图+五灵加成+屏波)。
   * 解析优先级(无任何持久态):startBattle.fieldId(剧情战一次性显式)> hostile.battleFieldId
   * (明雷怪专属)> 此场景默认 > 项目默认。原版 0x4A 持久全局已退役:特殊战场绑一次性
   * startBattle,打完自然回落本字段;不再有「剧情点覆写 + 随存档」这一档(铁律 4)。
   */
  battleFieldId?: number
  /** 本场景战斗的默认 BGM(0 = 战斗静音,忠实原版);解析优先级同 battleFieldId。缺省 = boss?2:3。 */
  battleMusicId?: number
  /** 命名入口(M3 传送引用;迁移自 setPartyPos→loadScene 对:from-scene-<src>[-k] / start)。 */
  entries?: Record<string, { pos: GridPos; facing?: Facing }>
  // 调色板字段已退役(W7a-3):清洁重写只留盘 0,无「调色板」概念(见 no-palette-concept 方针)。
  /** 玩家（李逍遥）进场点 */
  entry: { pos: GridPos; facing: Facing }
  /** 场上 NPC / 物件（不含玩家） */
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
export * from './battle-formulas.js'
export * from './own-map.js'
export * from './tileset.js'
export * from './character.js'
export * from './enemy.js'
export * from './enemy-ai.js'
export * from './grid.js'
export * from './item.js'
export * from './locale.js'
export * from './poison.js'
export * from './rewards.js'
export * from './rich-text.js'
export * from './script.js'
export * from './skill.js'
export * from './sprite.js'
export * from './validate.js'
export * from './validate-refs.js'
