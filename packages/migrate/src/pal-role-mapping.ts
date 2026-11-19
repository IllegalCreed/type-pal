import type { ActorDef, SpriteDef } from '@type-pal/content'
import { palFaceAssetId, palPortraitAssetId, palSpriteAssetId } from '@type-pal/content'
import { palPlayerBattleSpriteDefinitionId } from './pal-battle-sprites.js'
import type { SourceRole } from './pal-source-types.js'
import { resolveSoundAsset, type SoundAssetForNum } from './sound-migration.js'
import { PAL_PLAYER_FACE_FRAME_BY_ROLE_ID, ROLE_SLUGS } from './source-facts.js'

/**
 * 旧装备表按 Head、Body、Shoulder、Hand、Feet、Wear 排列（sdlpal global.h）。
 * Body 对应披风。李逍遥原始第 4 项 166 是木剑，手部栏映射到 weapon。
 */
export const EQUIP_INDEX_TO_SLOT = ['head', 'cloak', 'body', 'weapon', 'feet', 'accessory'] as const

export function mapActor(
  role: SourceRole,
  expTable: readonly number[],
  soundAssetForNum?: SoundAssetForNum,
): ActorDef {
  const slug = ROLE_SLUGS[role.id]
  if (!slug) throw new Error(`mapActor: 未知 roleId ${role.id}`)
  const initialEquipment: Record<string, string> = {}
  role.equipment.forEach((itemId, i) => {
    const slot = EQUIP_INDEX_TO_SLOT[i]
    if (slot && itemId > 0) initialEquipment[slot] = String(itemId)
  })
  return {
    id: slug,
    name: `name.${slug}`,
    spriteId: slug,
    // 原始数据只提供默认立绘。命名表情归作者目录。
    ...(role.avatar ? { portraits: { default: palPortraitAssetId(role.avatar) } } : {}),
    ...(PAL_PLAYER_FACE_FRAME_BY_ROLE_ID[role.id] !== undefined
      ? { face: palFaceAssetId(slug) }
      : {}),
    battler: {
      baseStats: {
        level: role.level,
        hp: role.hp,
        maxHP: role.maxHP,
        mp: role.mp,
        maxMP: role.maxMP,
        attack: role.attackStrength,
        defense: role.defense,
        magicAttack: role.magicStrength,
        speed: role.dexterity,
        luck: role.fleeRate,
      },
      initialEquipment,
      initialMagic: role.magic.filter((m) => m > 0).map(String),
      // 原始物件号同时是技能 id，0 表示没有合体技。
      ...((role.cooperativeMagic ?? 0) > 0
        ? { cooperativeMagicSkillId: String(role.cooperativeMagic) }
        : {}),
      // rgwCoveredBy 记录角色下标，0 也是实际角色。
      coveredBy: ROLE_SLUGS[role.coveredBy],
      leveling: { expTable: [...expTable] },
      battleSprite: palPlayerBattleSpriteDefinitionId(role.spriteNumInBattle),
      sounds: Object.fromEntries(
        Object.entries({
          attack: role.attackSound,
          critical: role.criticalSound,
          weapon: role.weaponSound,
          magic: role.magicSound,
          cover: role.coverSound,
          dying: role.dyingSound,
          death: role.deathSound,
        }).flatMap(([field, soundNumber]) => {
          const asset = resolveSoundAsset(soundNumber, soundAssetForNum)
          return asset ? [[field, asset]] : []
        }),
      ),
    },
  }
}

/** 6 角色的大世界精灵表登记(walkFrames 0 = 默认 3;非字面拷贝)。 */
export function mapSprites(roles: readonly SourceRole[]): SpriteDef[] {
  return roles.map((role) => {
    const slug = ROLE_SLUGS[role.id]
    if (!slug) throw new Error(`mapSprites: 未知 roleId ${role.id}`)
    return {
      id: slug,
      asset: palSpriteAssetId(role.spriteNum),
      label: `${role._name}(大世界)`,
      layout: { kind: 'directional' as const, framesPerDir: role.walkFrames || 3 },
    }
  })
}

/**
 * 旧角色表中的 spriteNum 只允许在迁移边界解析一次。映射由 source role 与语义
 * SpriteDef.id 显式建立，不能从 AssetId/path 反推；同一旧编号若落到多个语义定义则
 * 无法替脚本猜测意图，必须 fail-loud。
 */
export function mapRoleSpritesByNumber(
  roles: readonly SourceRole[],
  sprites: readonly SpriteDef[],
): ReadonlyMap<number, SpriteDef> {
  const spritesById = new Map(sprites.map((sprite) => [sprite.id, sprite]))
  const result = new Map<number, SpriteDef>()
  for (const role of roles) {
    const id = ROLE_SLUGS[role.id]
    if (!id) throw new Error(`mapRoleSpritesByNumber: 未知 roleId ${role.id}`)
    const sprite = spritesById.get(id)
    if (!sprite) throw new Error(`mapRoleSpritesByNumber: 角色 ${id} 缺少语义 SpriteDef`)
    const expectedAsset = palSpriteAssetId(role.spriteNum)
    if (sprite.asset !== expectedAsset)
      throw new Error(
        `mapRoleSpritesByNumber: 角色 ${id} 的资源应为 ${expectedAsset}，实际 ${sprite.asset}`,
      )
    const existing = result.get(role.spriteNum)
    if (existing !== undefined && existing.id !== id)
      throw new Error(
        `mapRoleSpritesByNumber: 旧精灵号 ${role.spriteNum} 同时对应 ${existing.id} 与 ${id}`,
      )
    result.set(role.spriteNum, sprite)
  }
  return result
}
