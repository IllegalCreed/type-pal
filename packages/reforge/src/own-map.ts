/**
 * 自有地图(W7)—— 作者绘制的地图,复用引擎 Tilemap 形(width/height/cells{lower,upper}/tileset),
 * 存工程内 content/maps/<id>.json,引擎渲染/碰撞与复用原版地图一套代码。
 * 本文件:地图构造/编辑纯逻辑(TDD);tileset 引用解析(蹭原版号 / 自有)= W7a-4 加载分流。
 */
import type { Tilemap } from '@type-pal/shared'

/** 空白自有地图:cols×rows 全空格(lower/upper=0),引用给定 tileset。 */
export function buildBlankOwnMap(cols: number, rows: number, tileset: string): Tilemap {
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: cols, height: rows, cells, tileset }
}
