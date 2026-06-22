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
  /**
   * 对应 tileset 资源的相对路径(由 CLI 总装时填)。
   *
   * tileset 资源管线优化(2026-06-22):指向 `tileset/{mapNum}.rle.gz`
   * (gzip 原始 GOP chunk 字节,runtime 用 DecompressionStream + parseSpriteChunk 解)。
   * 旧字段 `tilesetImage`(per-tile RGBA PNG glob)已移除。
   */
  tileset: string
}

export interface PaletteCycle {
  start: number          // 起始下标(参与循环的色块在调色板中的位置)
  length: number         // 段长
  step: number           // 每帧前进步数
  frameInterval: number  // 多少帧推进一次
}

export interface Palette {
  /** 256 个 RGB(0–255)三元组(白天调色板) */
  colors: [number, number, number][]
  /** 调色板循环动画段(水 / 火 …) */
  cycles: PaletteCycle[]
  /**
   * 夜间调色板(sdlpal `PAL_GetPalette(n, fNight=TRUE)`,PAT.MKF chunk 后半 256 色)。
   * 仅含夜间半的 chunk(实测 PAT.MKF 仅 #0/#5 是 1536 字节)才有;纯白天 chunk(768B)为 undefined。
   * 消费方:0x54/0x80 night flag 置时取 nightColors 否则 colors(见 resolvePaletteColors)。
   */
  nightColors?: [number, number, number][]
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

/**
 * 一个场景里的事件对象 —— pal-extract 切片场景时 dump 出来。
 *
 * 对应 sdlpal `global.h tagEVENTOBJECT` 16 个字段全字段透出(M4 约定 raw dump)。
 * 字段名沿用 sdlpal 命名(去掉 w/n/s 匈牙利前缀)。
 */
export interface SceneEventObject {
  /** 在原 SSS.MKF EventObject 数组里的下标。 */
  id: number
  /** [1] x —— sdlpal world 像素坐标(M5 P0.0:pixel,非 tile)。 */
  x: number
  /** [2] y —— sdlpal world 像素坐标。 */
  y: number
  /** [8] wSpriteNum —— 对应 sprite-NNN.json。 */
  spriteNum: number
  /** [4] wTriggerScript → label name(`L_<offset>`);0 → undefined。 */
  triggerLabel?: string
  /** [5] wAutoScript → label name;0 → undefined。 */
  autoLabel?: string
  /** [7] wTriggerMode —— 触发模式(sdlpal `play.c::PAL_PartyWalk` 真值)。 */
  triggerMode: number
  /** [6] sState (signed i16) —— sdlpal global.h:77-79
   *      Hidden=0 / Normal=1 / Blocker=2 / Message=3 / Script=4 / Contact 4+;负数也算 hidden。 */
  sState?: number
  /** [3] sLayer (signed i16) —— 渲染 z 层(scene.c:302 sort + scene.c:316 iLayer)。 */
  sLayer?: number
  /** [0] sVanishTime (signed i16) —— 倒计时后 hide(scene.c:247)。 */
  vanishTime?: number
  /** [9] nSpriteFrames —— 单方向走路帧数(scene.c:263 决定 3/4 帧重映射)。 */
  nSpriteFrames?: number
  /** [10] wDirection —— 初始朝向(0=South / 1=West / 2=North / 3=East,palcommon.h)。 */
  direction?: number
  /** [11] wCurrentFrameNum —— 初始姿势帧。 */
  currentFrameNum?: number
  /** [12] nScriptIdleFrame —— 待机帧计数,等待 N 帧后跑下一 op(script.c:3593)。 */
  scriptIdleFrame?: number
  /** [13] wSpritePtrOffset —— runtime sprite 数据偏移指针(sdlpal 内部,raw 透出仅供 diff)。 */
  spritePtrOffset?: number
  /** [14] nSpriteFramesAuto —— autoScript 帧数(scene.c:898-901)。 */
  nSpriteFramesAuto?: number
  /** [15] wScriptIdleFrameCountAuto —— autoScript idle 计数。 */
  scriptIdleFrameCountAuto?: number
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

/**
 * 全局 event object 表 —— 忠实 sdlpal `lprgEventObject[MAX_EVENT_OBJECTS]`。
 * 一个文件含全部 scene 的 event object(下标 = 全局 0-based id)+ 各 scene 的区间。
 * 运行时一次性加载成持久全局数组,gs.npcs = 当前 scene 切片(引用全局元素 → 脚本改动持久)。
 */
export interface EventObjectsFile {
  /** 全部 event object,下标 = 全局 0-based id(= SSS.MKF EventObject 数组下标)。 */
  eventObjects: SceneEventObject[]
  /** 各 scene 的 [start, end) event object 区间(键 = scene 0-based index = wNumScene-1)。 */
  sceneRanges: Record<number, [number, number]>
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
