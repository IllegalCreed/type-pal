// 第一阶段运行态与战斗角色快照边界；不拥有场景、脚本或IO生命周期。
import type { EquipmentEffectRoles, PlayerRolesRuntime } from './game-state.js'

/**
 * PlayerRolesRuntime(SoA)→ PlayerRoles 对象快照,供战斗和菜单消费,不是 hydrate 的严格逆操作。
 * 角色全集和未覆盖字段(如音效)取 staticRoles;属性、装备、法术与造型从 runtime 投影,
 * 具体缺值/零值回退见各字段。返回新角色对象,不与静态角色表共用可变 HP/MP。
 *
 * bootstrap 开战时传 equipmentEffect:攻/防/魔/速/逃/抗性合入 0..6 槽(含 Extra),
 * 战斗精灵/合击取末个非零覆盖、群攻取任一非零效果。参考 SDLPal global.c 的
 * PAL_GetPlayer* / PAL_PlayerCanAttackAll;这里的数值是快照,不是 C 每次读取全局表。
 * 战内 0x30 写 Extra 后重新算受影响属性,0x19/0x1A 通过 resyncBattleRoleStatsFromRuntime 刷新。
 * 不传 equipmentEffect 的 caller(如 menuRoles)只读 runtime 基础值;不得假定所有调用都含装备。
 * maxHP/maxMP/level 直接取 runtime 基础值,不累加装备效果;抗性在本投影钳到 [0,100]。
 *
 * @param runtime gs.PlayerRolesRuntime —— 可变属性源
 * @param staticRoles assets.playerRoles —— 静态回退值与未覆盖字段 + 角色全集
 * @param equipmentEffect gs.rgEquipmentEffect —— 装备 + Extra effect 槽(0..6);省略 → 纯 base 投影
 */
export function projectRuntimeToBattleRoles(
  runtime: PlayerRolesRuntime,
  staticRoles: import('@type-pal/shared').PlayerRoles,
  equipmentEffect?: EquipmentEffectRoles[],
): import('@type-pal/shared').PlayerRoles {
  // sdlpal getter:base + Σ_{slot=0..MAX_PLAYER_EQUIPMENTS(=6,含 Extra)} rgEquipmentEffect[slot].field[role]
  const sumEff = (
    field: keyof Omit<EquipmentEffectRoles, 'rgwElementalResistance'>,
    i: number,
  ): number => {
    if (!equipmentEffect) return 0
    let s = 0
    for (let slot = 0; slot <= 6; slot++) {
      s += equipmentEffect[slot]?.[field][i] ?? 0
    }
    return s
  }
  const sumElemEff = (elem: number, i: number): number => {
    if (!equipmentEffect) return 0
    let s = 0
    for (let slot = 0; slot <= 6; slot++) {
      s += equipmentEffect[slot]?.rgwElementalResistance[elem]?.[i] ?? 0
    }
    return s
  }
  const clamp100 = (v: number): number => Math.max(0, Math.min(100, v)) // 本投影的抗性上下界
  // sdlpal override 类 getter:某槽非 0 即覆盖(非累加)。
  //   PAL_PlayerCanAttackAll:任一槽 rgwAttackAll!=0 → 群攻。
  //   PAL_GetPlayerBattleSprite / PAL_GetPlayerCooperativeMagic:末个非 0 槽 override base。
  const anyEquip = (field: 'rgwAttackAll', i: number): boolean => {
    if (!equipmentEffect) return false
    for (let slot = 0; slot <= 6; slot++)
      if ((equipmentEffect[slot]?.[field][i] ?? 0) !== 0) return true
    return false
  }
  const lastNonzeroEquip = (
    field: 'rgwSpriteNumInBattle' | 'rgwCooperativeMagic',
    i: number,
  ): number => {
    if (!equipmentEffect) return 0
    let w = 0
    for (let slot = 0; slot <= 6; slot++) {
      const v = equipmentEffect[slot]?.[field][i] ?? 0
      if (v !== 0) w = v
    }
    return w
  }
  const roles = staticRoles.roles.map((base) => {
    const i = base.id
    const baseElem = {
      wind: runtime.rgwElementalResistance[0]?.[i] ?? base.elemResistance.wind,
      thunder: runtime.rgwElementalResistance[1]?.[i] ?? base.elemResistance.thunder,
      water: runtime.rgwElementalResistance[2]?.[i] ?? base.elemResistance.water,
      fire: runtime.rgwElementalResistance[3]?.[i] ?? base.elemResistance.fire,
      earth: runtime.rgwElementalResistance[4]?.[i] ?? base.elemResistance.earth,
    }
    return {
      ...base, // 先取静态角色;下方覆盖 runtime/effect 字段,音效等未覆盖字段保留
      spriteNum: runtime.rgwSpriteNum[i] || base.spriteNum,
      name: runtime.rgwName[i] ?? base.name,
      level: runtime.rgwLevel[i] ?? base.level,
      maxHP: runtime.rgwMaxHP[i] ?? base.maxHP,
      maxMP: runtime.rgwMaxMP[i] ?? base.maxMP,
      hp: runtime.rgwHP[i] ?? base.hp,
      mp: runtime.rgwMP[i] ?? base.mp,
      // M2(2026-06-07 sdlpal 审查):造型 row 读 runtime base(0x1A 剧情变身写入,如灵儿变镇狱明王)。
      avatar: runtime.rgwAvatar[i] || base.avatar,
      walkFrames: runtime.rgwWalkFrames[i] || base.walkFrames,
      // 装备 override(sdlpal getter):长鞭 attackAll/sprite、圣灵珠 coopMagic。装备授群攻 → role.attackAll=1
      //   (battle-system 读此判全体攻);sprite/coopMagic 末非 0 槽 override base,合击交 performCoopMagic。
      attackAll: anyEquip('rgwAttackAll', i) ? 1 : runtime.rgwAttackAll[i] || base.attackAll,
      spriteNumInBattle:
        lastNonzeroEquip('rgwSpriteNumInBattle', i) ||
        runtime.rgwSpriteNumInBattle[i] ||
        base.spriteNumInBattle,
      cooperativeMagic:
        lastNonzeroEquip('rgwCooperativeMagic', i) ||
        (runtime.rgwCooperativeMagic[i] ?? base.cooperativeMagic ?? 0),
      // effective = base + Σ 装备 effect(含 Extra),mirror sdlpal PAL_GetPlayerXxx getter
      attackStrength:
        (runtime.rgwAttackStrength[i] ?? base.attackStrength) + sumEff('rgwAttackStrength', i),
      magicStrength:
        (runtime.rgwMagicStrength[i] ?? base.magicStrength) + sumEff('rgwMagicStrength', i),
      defense: (runtime.rgwDefense[i] ?? base.defense) + sumEff('rgwDefense', i),
      dexterity: (runtime.rgwDexterity[i] ?? base.dexterity) + sumEff('rgwDexterity', i),
      fleeRate: (runtime.rgwFleeRate[i] ?? base.fleeRate) + sumEff('rgwFleeRate', i),
      poisonResistance: clamp100(
        (runtime.rgwPoisonResistance[i] ?? base.poisonResistance) +
          sumEff('rgwPoisonResistance', i),
      ),
      coveredBy: runtime.rgwCoveredBy[i] ?? base.coveredBy,
      // 装备 6 槽 / 法术 32 槽:runtime[slot][i] → role 数组(完整 hydrate 逆;battle magic 菜单已接此 role.magic 真值,见 buildBattleMagicSelect)
      equipment: runtime.rgwEquipment.map((slot) => slot[i] ?? 0),
      magic: runtime.rgwMagic.map((slot) => slot[i] ?? 0),
      // 元素抗 5 维(0 风/1 雷/2 水/3 火/4 土,同 hydrate)+ 装备 effect,clamp [0,100]
      elemResistance: {
        wind: clamp100(baseElem.wind + sumElemEff(0, i)),
        thunder: clamp100(baseElem.thunder + sumElemEff(1, i)),
        water: clamp100(baseElem.water + sumElemEff(2, i)),
        fire: clamp100(baseElem.fire + sumElemEff(3, i)),
        earth: clamp100(baseElem.earth + sumElemEff(4, i)),
      },
    }
  })
  return { roles }
}

/**
 * 战斗边界仅将 roles 的 HP/MP 回写 PlayerRolesRuntime,不是完整逆投影,使伤害/治疗**持久化**
 * 进大世界 + 存档对齐(原 finalizeBattle 只回写 exp/cash,hp/mp 战果丢失,打完血量复原)。
 *
 * 本函数仅回写 HP/MP;脚本与升级各有 runtime 写入路径,升级 loop 在回写后直接更新等级/属性。
 * 临时增益(0x30 Extra slot)不回写(sdlpal 战末清 Extra)。仅回写在场 party 成员。
 *
 * @param battleRoles res.playerRoles —— 战斗结束态(hp/mp 已被伤害/治疗改)
 * @param runtime gs.PlayerRolesRuntime —— 回写目标
 * @param partyMembers 在场 party 的 roleId 列表(只回写这些)
 */
export function writeBackBattleRolesToRuntime(
  battleRoles: import('@type-pal/shared').PlayerRoles,
  runtime: PlayerRolesRuntime,
  partyMembers: number[],
): void {
  for (const roleId of partyMembers) {
    const role = battleRoles.roles[roleId]
    if (!role) continue
    runtime.rgwHP[roleId] = role.hp
    runtime.rgwMP[roleId] = role.mp
  }
}
