/**
 * 精灵注册表(B0 起) + 帧布局模型(C0,见 docs/phase2/foundation/actor-model-design.md §3)。
 *
 * `SpriteDef` = 一张大世界精灵图(sheet)的领域登记:语义 id → AssetId + 人读标签 + **帧布局**。
 * 布局挂在精灵表(描述"那张图的结构"),不挂角色——原版把 nSpriteFrames 放 per-object
 * 是「没有精灵元数据概念」的历史包袱(设计 §2)。
 * 逃生口:id 是语义 id、asset 可重复——同一二进制需两种布局时建两条 SpriteDef 即可。
 */

import type { AssetId } from './asset.js'

/**
 * 帧布局 = 这张精灵图的结构(开放联合;战斗类 kind 留待战斗系统落地时加)。
 * - directional:4 向固定序 down/left/up/right;站立 = dir*framesPerDir(原版通式 dir*nSpriteFrames+frame)。
 * - static:无方向的默认定格布局；缺少实例覆写时画 frame 0，同一 asset 仍可包含并由脚本使用其它帧。
 * `loop` 仅描述资源本身的循环帧布局；可复用作者动作统一记录在 `poses`。
 */
export type SpriteLayout =
  | { kind: 'directional'; framesPerDir: number }
  | { kind: 'static' }
  /** 循环帧资源布局。 */
  | { kind: 'loop'; frameCount: number; ticksPerFrame?: number }

/**
 * ActionId 只在一个 SpriteDef 内稳定；持久引用必须同时保存 sprite + action，不能保存显示序号。
 */
export type SpriteActionId = string

/** 受限关键帧事件；动作不是第二套剧情脚本语言。 */
export type SpriteActionCue = { kind: 'sound'; asset: AssetId }

/** 动作时间线中的一个绝对源帧。 */
export interface SpriteActionStep {
  frame: number
  durationMs: number
  cues?: SpriteActionCue[]
}

/** 精灵库中可复用的预制动作。缺少 loopFrom 表示单次动作。 */
export interface SpriteActionDef {
  /** 作者可改的人读名；Record key 才是稳定 ActionId。 */
  label: string
  /** 只决定编辑器排序和显示编号，不参与引用。 */
  order?: number
  steps: SpriteActionStep[]
  /** 循环回到的 step 下标；允许保留一次性启动段。 */
  loopFrom?: number
}

/** 场景页的声明式默认动作绑定。 */
export interface SpriteActionBinding {
  sprite: string
  action: SpriteActionId
  loop: boolean
  /**
   * 循环相位（毫秒）。动作有 loopFrom>0 时，一次性启动段仍从 step 0 完整播放，随后才按此相位
   * 进入循环段；单次动作或 loopFrom=0 时则是整条时间线的起始偏移。
   */
  startAtMs?: number
}

/** 精灵注册表项:语义 id → 二进制 AssetId + 人读标签 + 帧布局 + 预制动作。 */
export interface SpriteDef {
  /** 语义 id;实体(prop)与 ActorDef.spriteId 引用它。稳定身份,非裸数字。 */
  id: string
  /** 唯一二进制引用；可与其它定义共享，物理路径只存在 assets/index.json。 */
  asset: AssetId
  /** 人读标签(编辑器精灵选择器显示用)。 */
  label: string
  /** 帧布局(编辑器帧标注的产物;引擎据此算帧下标,去 WALK_FRAMES 硬编码)。 */
  layout: SpriteLayout
  /** 唯一动作容器。字段名为旧 schema 的稳定容器名，UI 与新代码统一称“动作”。 */
  poses?: Record<SpriteActionId, SpriteActionDef>
}

/**
 * 一个定义按其布局与命名姿势声明会访问到的最小帧数。
 *
 * 这是“声明覆盖量”，不是资源实际帧数。历史 PAL 数据允许声明量大于实际帧数，
 * 运行时会按 actual-frame fallback 显示；编辑器用本函数判断一次修改是在缩小旧债，
 * 还是新增/扩大越界债务。
 */
export function spriteDefinitionFrameDemand(sprite: Pick<SpriteDef, 'layout' | 'poses'>): number {
  const layoutDemand =
    sprite.layout.kind === 'directional'
      ? sprite.layout.framesPerDir * 4
      : sprite.layout.kind === 'loop'
        ? sprite.layout.frameCount
        : 1
  let poseDemand = 0
  for (const action of Object.values(sprite.poses ?? {})) {
    for (const step of action.steps) poseDemand = Math.max(poseDemand, step.frame + 1)
  }
  return Math.max(layoutDemand, poseDemand)
}

/** 定义会直接索引的帧集合；编辑器用它逐槽比较历史越界债是否扩大。 */
export function spriteDefinitionFrameIndices(
  sprite: Pick<SpriteDef, 'layout' | 'poses'>,
): Set<number> {
  const indices = new Set<number>()
  const layoutCount =
    sprite.layout.kind === 'directional'
      ? sprite.layout.framesPerDir * 4
      : sprite.layout.kind === 'loop'
        ? sprite.layout.frameCount
        : 1
  for (let index = 0; index < layoutCount; index++) indices.add(index)
  for (const action of Object.values(sprite.poses ?? {}))
    for (const step of action.steps) indices.add(step.frame)
  return indices
}
