/**
 * 精灵注册表(B0 起) + 帧布局模型(C0,见 docs/phase2/foundation/actor-model-design.md §3)。
 *
 * `SpriteDef` = 一张原版精灵图(sheet)的登记:语义 id → 精灵号 + 人读标签 + **帧布局**。
 * 布局挂在精灵表(描述"那张图的结构"),不挂角色——原版把 nSpriteFrames 放 per-object
 * 是「没有精灵元数据概念」的历史包袱(设计 §2)。
 * 逃生口:id 是语义 id、spriteNum 可重复——同 chunk 需两种布局时建两条 SpriteDef 即可。
 */

/**
 * 帧布局 = 这张精灵图的结构(开放联合;战斗类 kind 留待战斗系统落地时加)。
 * - directional:4 向固定序 down/left/up/right;站立 = dir*framesPerDir(原版通式 dir*nSpriteFrames+frame)。
 * - static:单帧静物(恒画 frame 0)。
 * - loop:无方向环境自循环(血池/火盆;nSpriteFramesAuto 语义)。C0 只定义,自循环播放留后。
 */
export type SpriteLayout =
  | { kind: 'directional'; framesPerDir: number }
  | { kind: 'static' }
  | { kind: 'loop'; frameCount: number; ticksPerFrame?: number }

/**
 * 命名姿势(C1)= 精灵图里一组绝对帧号组成的特殊动作(摔倒/虚弱/坐下/施法…)。
 * 移动帧有共性(directional 布局公式取帧);特殊动作每精灵不同、无共性,故命名 + 绝对帧号。
 * ⚠ 绝对帧号(不分方向)—— 用户确认(2026-07-03)原版无分方向的特殊动作;脚本按名字引用,不记裸帧号。
 */
export interface PoseDef {
  /** 帧号序列(绝对下标)。static 取 frames[0];loop 循环全序列。 */
  frames: number[]
  /** static=定格单帧;loop=循环播放。 */
  mode: 'static' | 'loop'
  /** loop 每帧 tick 数(缺省 1)。 */
  ticksPerFrame?: number
}

/** 精灵注册表项:语义 id → 原版精灵号 + 人读标签 + 帧布局 + 命名姿势。 */
export interface SpriteDef {
  /** 语义 id;实体(prop)与 ActorDef.spriteId 引用它。稳定身份,非裸数字。 */
  id: string
  /** 原版大世界精灵号(对应 {root}/sprites/{spriteNum}.rle)。可与他条重复(布局逃生口)。 */
  spriteNum: number
  /** 人读标签(编辑器精灵选择器显示用)。 */
  label: string
  /** 帧布局(编辑器帧标注的产物;引擎据此算帧下标,去 WALK_FRAMES 硬编码)。 */
  layout: SpriteLayout
  /** 命名姿势(C1;名字 → 帧序列 + 播放方式)。脚本按名字引用(不记裸帧号)。 */
  poses?: Record<string, PoseDef>
  /**
   * 自有上传精灵的 .rle 路径(A4;W7B tileset 同约定:`assets/` 前缀 = 工程根相对)。
   * 缺省 = 原版号约定 `{root}/{sprites}/{spriteNum}.rle`。上传条目 spriteNum 仍分配唯一号
   * (spriteByNum 缓存键不变),仅加载路径改走本字段。
   */
  path?: string
}
