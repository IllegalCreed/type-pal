/**
 * 精灵注册表(D-B0 schema 缺口之一)。
 *
 * 背景:`EntityDef.sprite`("ghost")是**语义 id**,reforge 需据此解析到具体原版精灵号。
 * 之前没有这张表 → 引擎写死 `loadSprite(...,16)`(main.ts 硬编码)。此注册表去掉实体精灵硬编码,
 * 给编辑器精灵选择器人读 label,并保住语义 id(非裸数字)。
 *
 * 范围:只管**实体精灵**;玩家(队长)精灵是角色概念(待 CharacterTemplate.sprite,非 B0)。
 *
 * 见 docs/phase2/editor/editor-design.md §7。
 */

/** 精灵注册表项:语义 id → 原版精灵号 + 人读标签。 */
export interface SpriteDef {
  /** 语义 id;EntityDef.sprite 引用它(如 "ghost")。稳定身份,非裸数字。 */
  id: string
  /** 原版大世界精灵号(对应 {root}/sprites/{spriteNum}.rle)。 */
  spriteNum: number
  /** 人读标签(编辑器精灵选择器显示用)。 */
  label: string
}
