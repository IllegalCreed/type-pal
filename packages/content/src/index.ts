/**
 * @type-pal/content — 第二阶段内容数据（切片 1：鬼界民居 demo）
 *
 * 纯数据 + 类型。reforge 引擎**消费**这层；编辑器（将来）**生产**这层。
 * demo 阶段：场景复用原版地图（运行时按 mapNum 从 /extracted 加载 tilemap+tileset+palette），
 * 实体 / 对话手写。坐标与精灵引用待渲染时校准（见 TODO）。
 *
 * 见 docs/phase2/p1-slice1-guijie-minju.md。稳定 id，不用下标。
 */

export type Facing = 'up' | 'down' | 'left' | 'right'

export interface Vec2 {
  x: number
  y: number
}

export interface DialogueLine {
  /** 说话人名；省略 = 旁白 / 心理活动 */
  speaker?: string
  text: string
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
  // 绝对世界像素坐标（同瓦片坐标系）；room#0 内的可走点，截图校准。
  entry: { pos: { x: 1216, y: 824 }, facing: 'down' },
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
      lines: [
        { speaker: '游魂', text: '……活人气味……这地方，可不该有活人啊……' },
        { speaker: '游魂', text: '南边……来过个使刀的侠客……听说，是个仗义的……' },
        { speaker: '游魂', text: '咳，名字？谁还记得名字。鬼啊，只记得自己怎么死的。' },
        { speaker: '游魂', text: '你问那侠客？……我也是听旁的鬼念叨来的……做不得准……' },
        { text: '（李逍遥心头一动：南边……使刀的侠客……）' },
      ],
    },
  ],
}
