export interface TileCell {
  /** 下层 tile bitmap 索引 + 属性位(从 u32 低 16 bit 切)*/
  lower: number
  /** 上层 tile bitmap 索引 + 属性位(从 u32 低 16 bit 切)*/
  upper: number
}

export interface Tilemap {
  /** 单位:逻辑格子。目标游戏固定 64 列 × 128 行(实际渲染会做菱形错排)*/
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

/** 一个场景里的事件对象(NPC 或交互点) —— pal-extract 切片场景时 dump 出来。 */
export interface SceneEventObject {
  /** 在原 SSS.MKF EventObject 数组里的下标。 */
  id: number
  /** 瓦片坐标(原 EventObject.x / .y,以 tile 为单位)。 */
  x: number
  /** 同 x,以 tile 为单位。 */
  y: number
  /** 精灵编号(原 EventObject.wSpriteNum) —— 对应 sprite-NNN.json。 */
  spriteNum: number
  /** 玩家触发对话的入口标签;在 scene-001.json commands 里找该 label 的 index 即可入口。 */
  triggerLabel?: string
  /** NPC 待机行为(M2 不消费,留给 M5+)。 */
  autoLabel?: string
  /** 触发模式:对照 sdlpal `EventObject.wTriggerMode`(M1 parse,M3.5 真消费)。
   *
   * Raw u16,运行时 scene-system 解读:可能值含义(实施 T11 时按 sdlpal `play.c::PAL_PartyWalk` 真值定):
   * - 0 = 不触发
   * - N = 明雷接触触发 / Confirm 触发 / 传送 / 等
   */
  triggerMode: number
}

export interface SceneObjects {
  sceneId: number
  /** mapNum = MAP.MKF / GOP.MKF 的 chunk index(同 tilemap-N.json 的 N 不必相同;见 SSS.MKF chunk 1 SCENE 数组)。 */
  mapNum: number
  /** scene 进入即跑的脚本入口,作为 label 名;对应 SSS.MKF SCENE.scriptOnEnter ip。 */
  onEnterLabel?: string
  /** scriptOnTeleport(若存在);M2 不消费。 */
  onTeleportLabel?: string
  eventObjects: SceneEventObject[]
}

/** 像素坐标(M5 P0.0 起:party / npcs / camera 统一用像素,不再用 cell)。 */
export interface PixelPos { x: number; y: number }

/** ENEMYPOS table(M3.5,DATA.MKF chunk 13)
 *
 * sdlpal global.h ENEMYPOS:5×5 PALPOS table。用法 pos[enemyIdx][maxIdx](battle.c:936)
 * 即 第一维 = 当前 enemy index,第二维 = 总数-1。
 *
 * pal-extract dump 时翻转成 `layouts[count-1]` 数组(每条长度 = enemy count):
 *   layouts[0] = [pos_for_1_enemy]
 *   layouts[1] = [pos_for_2_enemies_e0, pos_for_2_enemies_e1]
 *   ...
 *   layouts[4] = [...5 个]
 * 运行时 `layouts[state.enemies.length - 1][i]` 取第 i 个 enemy 位置。
 */
export interface EnemyPosTable {
  layouts: ReadonlyArray<ReadonlyArray<{ x: number, y: number }>>
}
