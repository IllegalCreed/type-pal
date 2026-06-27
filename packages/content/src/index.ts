/**
 * @type-pal/content — 第二阶段内容数据（切片 1：鬼界民居 demo）
 *
 * 纯数据 + 类型。reforge 引擎**消费**这层；编辑器（将来）**生产**这层。
 * demo 阶段：场景复用原版地图（运行时按 mapNum 从 /extracted 加载 tilemap+tileset+palette），
 * 实体 / 对话手写。坐标与精灵引用待渲染时校准（见 TODO）。
 *
 * 见 docs/phase2/slice1-indoor/guijie-minju.md。稳定 id，不用下标。
 */

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
  /** 画到哪个面板;默认 bottom。异 slot 推进 = 共存,同 slot = 覆盖。 */
  slot?: 'top' | 'bottom'
  /** 头像 RGM chunk + 左/右;省略 = 无头像。 */
  portrait?: { icon: number; side: 'left' | 'right' }
}

export interface Dialogue {
  id: string
  /** 每行 = 一页 */
  lines: DialogueLine[]
}

export interface EntityDef {
  id: string
  /** 世界像素坐标（脚下锚点） */
  pos: Vec2
  /** 精灵引用 id；reforge 解析到具体原版精灵 */
  sprite: string
  /** 是否挡路（碰撞） */
  collide?: boolean
  /** 交互触发的对话 id */
  interact?: string
}

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
    /** 取哪一间：该房间在原图里的格子矩形（左上角 col/row + 宽高格数） */
    room: { col: number; row: number; cols: number; rows: number }
  }
  /** 玩家（李逍遥）进场点 */
  entry: { pos: Vec2; facing: Facing }
  /** 场上 NPC / 物件（不含玩家） */
  entities: EntityDef[]
  dialogues: Dialogue[]
}

/** 切片 1 demo 场景：鬼界民居（借原版 map 56 = 黑水镇民居）。 */
export const guijieMinjuScene: SceneDef = {
  id: 'guijie-minju',
  map: {
    reuseOriginalMap: 56, // 56 = 黑水镇民居（原版 scene 62 加载它）；图里有**多间**民居
    // room#0：右上那间（脚本勘出的内容簇之一）。reforge 只渲染 / 碰撞这个窗口。
    room: { col: 26, row: 34, cols: 22, rows: 25 },
  },
  // 绝对世界像素坐标（同瓦片坐标系）。必须落在等距格点上：x/16 + y/8 为偶
  // （每步同改 x±16/y±8，该奇偶是不变量 → 起点错位则永远站两格之间）。1216/16=76、832/8=104，偶 ✓。
  entry: { pos: { x: 1216, y: 832 }, facing: 'down' },
  entities: [
    {
      id: 'wandering-ghost',
      pos: { x: 1280, y: 832 }, // col40/row52：脚本核出的开阔地板，四邻无家具、不被遮挡
      sprite: 'ghost', // demo 占位 = 原版 sprite 16（老者）；回头换鬼气精灵 + 半透明化
      collide: true,
      interact: 'ghost-hearsay',
    },
  ],
  dialogues: [
    {
      id: 'ghost-hearsay',
      // text/speaker = textId;实际文本在 zhLocale(locale.ts)。slot 验证双框共存(design §5):
      // 段0/1/3 游魂 bottom,段2 远处鬼 top(与 bottom 留显共存)。
      lines: [
        { speaker: 'name.youhun', text: 'dlg.ghost-hearsay.0', slot: 'bottom' },
        { speaker: 'name.youhun', text: 'dlg.ghost-hearsay.1', slot: 'bottom' },
        { speaker: 'name.distant-ghost', text: 'dlg.ghost-hearsay.2', slot: 'top' },
        { speaker: 'name.youhun', text: 'dlg.ghost-hearsay.3', slot: 'bottom' },
        { text: 'dlg.ghost-hearsay.4', slot: 'bottom' }, // 旁白,无 speaker
      ],
    },
  ],
}

export * from './locale.js'
export * from './rich-text.js'
