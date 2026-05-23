export interface Tilemap {
  width: number       // 单位:瓦片
  height: number
  tileWidth: number   // 单位:像素
  tileHeight: number
  /** 一维 tile id 数组,长度 = width * height,行优先 */
  tiles: number[]
  /** 对应瓦片集 PNG 的文件名 */
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
