export interface TileCell {
  /** 下层 tile bitmap 索引 + 属性位(从 u32 低 16 bit 切)*/
  lower: number
  /** 上层 tile bitmap 索引 + 属性位(从 u32 低 16 bit 切)*/
  upper: number
}

export interface Tilemap {
  /** 单位:逻辑格子。仙剑固定 64 列 × 128 行(实际渲染会做菱形错排)*/
  width: number
  height: number
  /** [row][col] = TileCell;长度 = height × width 行 × width 列 */
  cells: TileCell[][]
  /** 对应 tileset PNG 的文件名(由 CLI 总装时填)*/
  tilesetImage: string
}

export interface PaletteCycle {
  start: number          // 起始下标(参与循环的色块在调色板中的位置)
  length: number         // 段长
  step: number           // 每帧前进步数
  frameInterval: number  // 多少帧推进一次
}

export interface Palette {
  /** 256 个 RGB(0–255)三元组 */
  colors: [number, number, number][]
  /** 调色板循环动画段(水 / 火 …) */
  cycles: PaletteCycle[]
}

export interface SpriteFrame {
  width: number
  height: number
  anchorX: number   // 原版精灵的"脚下中心点"
  anchorY: number
  image: string     // 对应 PNG 文件名
}

export interface SpriteSet {
  frames: SpriteFrame[]
}
