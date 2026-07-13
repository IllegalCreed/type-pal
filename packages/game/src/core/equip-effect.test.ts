/**
 * C5(2026-05-28):equip-effect.ts 单测 — sdlpal global.c:1333-1900+ 真值校验。
 *
 * 覆盖:
 *  - writeEquipmentEffectField(opcode 0x17 真值)
 *  - removeEquipmentEffect(sdlpal global.c:1372 清零)
 *  - 6 effective stat getter(base + Σ rgEquipmentEffect)
 *
 * updateAllEquipments 依赖 shared.json runtime,留 e2e。
 */

import type { Command } from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  getPlayerAttackStrength,
  getPlayerDefense,
  getPlayerDexterity,
  getPlayerFleeRate,
  getPlayerMagicStrength,
  getPlayerPoisonResistance,
  PLAYERROLES_ROW,
  removeEquipmentEffect,
  runEquipScript,
  setPlayerStatRow,
  writeEquipmentEffectField,
} from './equip-effect.js'
import { addPoisonForPlayer, setGlobalEvents, setObjectPoisons } from './event-system.js'
import { createInitialGameState } from './game-state.js'

function freshGs() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  // 给 role 0 base attack 50
  gs.PlayerRolesRuntime.rgwAttackStrength[0] = 50
  gs.PlayerRolesRuntime.rgwMagicStrength[0] = 30
  gs.PlayerRolesRuntime.rgwDefense[0] = 20
  gs.PlayerRolesRuntime.rgwDexterity[0] = 40
  gs.PlayerRolesRuntime.rgwFleeRate[0] = 10
  gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 5
  return gs
}

describe('equip-effect', () => {
  describe('writeEquipmentEffectField', () => {
    it('writes ATTACK_STRENGTH row to specified part/role(sdlpal opcode 0x17 真值)', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 3 /* Hand */, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5)
      expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(5)
    })

    it('writes DEXTERITY row(木剑 scriptOnEquip 真值:rgwOperand=[14,20,3] → part=3, row=20, value=3)', () => {
      const gs = freshGs()
      // sdlpal L_39011 chain 真值
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 2)
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.DEXTERITY, 0, 3)
      expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(2)
      expect(gs.rgEquipmentEffect[3]!.rgwDexterity[0]).toBe(3)
    })

    it('writes elemental resistance row 23-27', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.ELEM_RESIST_0, 0, 10) // wind +10
      expect(gs.rgEquipmentEffect[5]!.rgwElementalResistance[0]![0]).toBe(10)
    })

    it('ignores partIdx out of range', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, -1, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5)
      writeEquipmentEffectField(gs, 10, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5)
      for (let i = 0; i < 7; i++) {
        expect(gs.rgEquipmentEffect[i]!.rgwAttackStrength[0]).toBe(0)
      }
    })

    // 装备 override 类 effect(sdlpal flat WORD 数组 row,此前 struct 无字段 → 丢弃 + warn):
    //   row 1 spriteNumInBattle(长鞭 0x1A[1,6,0])/ row 4 attackAll(长鞭 0x1A[4,1,0])/
    //   row 65 cooperativeMagic(圣灵珠 0x1A[65,351,0])。global.h tagPLAYERROLES 行偏移。
    it('writes SPRITE_NUM_IN_BATTLE row 1(长鞭 0x1A[1,6,0])→ rgwSpriteNumInBattle', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 3 /* Hand */, PLAYERROLES_ROW.SPRITE_NUM_IN_BATTLE, 2, 6)
      expect(gs.rgEquipmentEffect[3]!.rgwSpriteNumInBattle[2]).toBe(6)
    })

    it('writes ATTACK_ALL row 4(长鞭 0x1A[4,1,0])→ rgwAttackAll', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_ALL, 2, 1)
      expect(gs.rgEquipmentEffect[3]!.rgwAttackAll[2]).toBe(1)
    })

    it('writes COOPERATIVE_MAGIC row 65(圣灵珠 0x1A[65,351,0])→ rgwCooperativeMagic', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 5 /* Wear */, PLAYERROLES_ROW.COOPERATIVE_MAGIC, 3, 351)
      expect(gs.rgEquipmentEffect[5]!.rgwCooperativeMagic[3]).toBe(351)
    })

    it('rows 1/4/65 不再 console.warn(此前未支持 → updateAllEquipments 启动刷 3 条警告)', () => {
      const gs = freshGs()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.SPRITE_NUM_IN_BATTLE, 0, 6)
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_ALL, 0, 1)
      writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.COOPERATIVE_MAGIC, 0, 351)
      expect(warn).not.toHaveBeenCalled()
      warn.mockRestore()
    })
  })

  describe('removeEquipmentEffect(sdlpal global.c:1372)', () => {
    it('clears all stat rows for given role in given part', () => {
      const gs = freshGs()
      // 装一身 stat
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5)
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.DEXTERITY, 0, 3)
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.DEFENSE, 0, 2)
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ELEM_RESIST_2, 0, 8) // 水抗

      removeEquipmentEffect(gs, 0, 3)

      expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0)
      expect(gs.rgEquipmentEffect[3]!.rgwDexterity[0]).toBe(0)
      expect(gs.rgEquipmentEffect[3]!.rgwDefense[0]).toBe(0)
      expect(gs.rgEquipmentEffect[3]!.rgwElementalResistance[2]![0]).toBe(0)
    })

    it('清 override 类字段 sprite/attackAll/coopMagic(sdlpal 清整 PLAYERROLES 行)', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.SPRITE_NUM_IN_BATTLE, 0, 6)
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_ALL, 0, 1)
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.COOPERATIVE_MAGIC, 0, 351)
      removeEquipmentEffect(gs, 0, 3)
      expect(gs.rgEquipmentEffect[3]!.rgwSpriteNumInBattle[0]).toBe(0)
      expect(gs.rgEquipmentEffect[3]!.rgwAttackAll[0]).toBe(0)
      expect(gs.rgEquipmentEffect[3]!.rgwCooperativeMagic[0]).toBe(0)
    })

    it('only clears given role(其他 role 不受影响)', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5)
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 1, 7) // role 1 装备
      removeEquipmentEffect(gs, 0, 3)
      expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0)
      expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[1]).toBe(7) // 保留
    })

    it('only clears given part(其他 part 不受影响)', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5) // Hand
      writeEquipmentEffectField(gs, 0, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 3) // Head
      removeEquipmentEffect(gs, 0, 3)
      expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0)
      expect(gs.rgEquipmentEffect[0]!.rgwAttackStrength[0]).toBe(3) // 保留
    })
  })

  describe('6 effective stat getter(sdlpal global.c:1736-1899)', () => {
    it('effective Atk = base + Σ rgEquipmentEffect.rgwAttackStrength', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 2) // 木剑
      writeEquipmentEffectField(gs, 0, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5) // 头盔
      expect(getPlayerAttackStrength(gs, 0)).toBe(50 + 2 + 5)
    })

    it('effective Mag', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.MAGIC_STRENGTH, 0, 8)
      expect(getPlayerMagicStrength(gs, 0)).toBe(30 + 8)
    })

    it('effective Def', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.DEFENSE, 0, 6) // 衣甲
      writeEquipmentEffectField(gs, 4, PLAYERROLES_ROW.DEFENSE, 0, 3) // 鞋
      expect(getPlayerDefense(gs, 0)).toBe(20 + 6 + 3)
    })

    it('effective Dex(no haste — battle layer 加)', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.DEXTERITY, 0, 3)
      expect(getPlayerDexterity(gs, 0)).toBe(40 + 3)
    })

    it('effective Flee', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 4, PLAYERROLES_ROW.FLEE_RATE, 0, 7) // 灵巧鞋
      expect(getPlayerFleeRate(gs, 0)).toBe(10 + 7)
    })

    it('effective PoisonResist clamped to [0, 100]', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.POISON_RESISTANCE, 0, 200)
      expect(getPlayerPoisonResistance(gs, 0)).toBe(100)
      writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.POISON_RESISTANCE, 0, -50)
      expect(getPlayerPoisonResistance(gs, 0)).toBe(0)
    })
  })

  describe('完整 swap 模拟(sdlpal 木剑 39011 真值 chain)', () => {
    it('装备木剑 → AttackStrength +2 / Dexterity +3;卸下后清零', () => {
      const gs = freshGs()
      // 装备:opcode 0x18 入口 removeEquipmentEffect + opcode 0x17 写
      removeEquipmentEffect(gs, 0, 3) // 入口 reset Hand part
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 2)
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.DEXTERITY, 0, 3)
      expect(getPlayerAttackStrength(gs, 0)).toBe(50 + 2)
      expect(getPlayerDexterity(gs, 0)).toBe(40 + 3)

      // 卸下:sdlpal RemoveEquipmentEffect 清零(opcode 0x18 入口 + EquipItemMenu 不再装)
      removeEquipmentEffect(gs, 0, 3)
      expect(getPlayerAttackStrength(gs, 0)).toBe(50)
      expect(getPlayerDexterity(gs, 0)).toBe(40)
    })
  })

  // ── opcode 0x18 真换装(2026-05-28 "换不了装备"回归)─────────────────────────
  // sdlpal script.c:768-811:若该槽当前装备 != op1 → rgwEquipment[part][role]=op1 +
  // inventory swap(移除新装备、旧装备入包)+ wLastUnequippedItem=旧。之前 ts 无条件跳 swap。
  describe('runEquipScript 0x18 真换装(script.c:768-811)', () => {
    // scriptOnEquip = L_500: 0x18 [14,163,0](part 14-0xB=3 Hand,装备 item 163)
    function setupEquipScript(): void {
      // P2#5:单一全局脚本数组 — label 由 command 的 label 字段建(L_500 落在 index 0)。
      const cmds: Command[] = [
        { op: 'raw', opcode: 0x18, operands: [14, 163, 0], label: 'L_500' },
        { op: 'end' },
      ]
      setGlobalEvents(cmds)
    }

    it('空槽装新装备:rgwEquipment 写入 + 背包移除新装备 + wLastUnequippedItem=0', () => {
      setupEquipScript()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.PlayerRolesRuntime.rgwEquipment[3]![2] = 0 // role 2 林月如 手持槽空
      gs.inventory = [{ itemId: 163, count: 1 }] // 背包有长鞭
      runEquipScript(gs, 500, 2)
      expect(gs.PlayerRolesRuntime.rgwEquipment[3]![2]).toBe(163) // 装上了
      expect(gs.inventory.find((e) => e.itemId === 163)).toBeUndefined() // 背包移除
      expect(gs.wLastUnequippedItem).toBe(0)
    })

    it('换下旧装备:新装上 + 旧装备入包 + wLastUnequippedItem=旧', () => {
      setupEquipScript()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.PlayerRolesRuntime.rgwEquipment[3]![2] = 100 // 已装旧武器 100
      gs.inventory = [{ itemId: 163, count: 1 }]
      runEquipScript(gs, 500, 2)
      expect(gs.PlayerRolesRuntime.rgwEquipment[3]![2]).toBe(163) // 换成新的
      expect(gs.inventory.find((e) => e.itemId === 163)).toBeUndefined() // 新装备出包
      expect(gs.inventory.find((e) => e.itemId === 100)?.count).toBe(1) // 旧装备入包
      expect(gs.wLastUnequippedItem).toBe(100)
    })

    it('已装着自己(update 上下文):条件相等 → 不 swap,背包不动', () => {
      setupEquipScript()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.PlayerRolesRuntime.rgwEquipment[3]![2] = 163 // 已装 163(=op1)
      gs.inventory = [{ itemId: 163, count: 1 }]
      runEquipScript(gs, 500, 2)
      expect(gs.PlayerRolesRuntime.rgwEquipment[3]![2]).toBe(163)
      expect(gs.inventory.find((e) => e.itemId === 163)?.count).toBe(1) // 背包不变(没 swap)
    })
  })

  // D14(2026-05-31):0x2D scriptOnEquip → PAL_SetPlayerStatus(script.c:1367 / global.c:2173)
  describe('0x2D scriptOnEquip → setPlayerStatus(gs.rgPlayerStatus)', () => {
    it('0x2D DualAttack(仙女剑 真值)→ gs.rgPlayerStatus[role][8]=32760', () => {
      const cmds: Command[] = [
        { op: 'raw', opcode: 0x2d, operands: [8, 32760, 0], label: 'L_510' }, // status=DualAttack rounds=32760
        { op: 'end' },
      ]
      setGlobalEvents(cmds)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.PlayerRolesRuntime.rgwHP[1] = 100 // good 状态需 HP!=0(global.c:2264)
      runEquipScript(gs, 510, 1)
      expect(gs.rgPlayerStatus[1]![8]).toBe(32760)
    })

    it('0x2D good 状态 set-if-longer:已有更久 → 不覆盖(global.c:2264-2268)', () => {
      const cmds: Command[] = [
        { op: 'raw', opcode: 0x2d, operands: [8, 50, 0], label: 'L_511' },
        { op: 'end' },
      ]
      setGlobalEvents(cmds)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.PlayerRolesRuntime.rgwHP[1] = 100
      gs.rgPlayerStatus[1]![8] = 100 // 已有 100 回合
      runEquipScript(gs, 511, 1)
      expect(gs.rgPlayerStatus[1]![8]).toBe(100) // 50 < 100 → 不覆盖
    })

    it('0x2D good 状态 HP==0 → 不施加(global.c:2264)', () => {
      const cmds: Command[] = [
        { op: 'raw', opcode: 0x2d, operands: [8, 32760, 0], label: 'L_512' },
        { op: 'end' },
      ]
      setGlobalEvents(cmds)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.PlayerRolesRuntime.rgwHP[1] = 0 // 死
      runEquipScript(gs, 512, 1)
      expect(gs.rgPlayerStatus[1]![8]).toBe(0)
    })
  })

  // M2(2026-06-07 sdlpal 审查):0x1A 非装备上下文写造型 row,原先落 default no-op → 变身造型不更新
  describe('M2:setPlayerStatRow 造型 row 路由(script.c:862)', () => {
    it('SPRITE_NUM/SPRITE_NUM_IN_BATTLE/AVATAR/WALK_FRAMES/ATTACK_ALL/COOP → runtime 字段', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.iCurEquipPart = -1 // 非装备上下文(剧情脚本)
      setPlayerStatRow(gs, PLAYERROLES_ROW.SPRITE_NUM, 1, 512) // 赵灵儿变镇狱明王 大世界精灵
      setPlayerStatRow(gs, PLAYERROLES_ROW.SPRITE_NUM_IN_BATTLE, 1, 5)
      setPlayerStatRow(gs, PLAYERROLES_ROW.AVATAR, 1, 91)
      setPlayerStatRow(gs, PLAYERROLES_ROW.WALK_FRAMES, 1, 4)
      setPlayerStatRow(gs, PLAYERROLES_ROW.ATTACK_ALL, 1, 1)
      setPlayerStatRow(gs, PLAYERROLES_ROW.COOPERATIVE_MAGIC, 1, 7)
      const r = gs.PlayerRolesRuntime
      expect(r.rgwSpriteNum[1]).toBe(512)
      expect(r.rgwSpriteNumInBattle[1]).toBe(5)
      expect(r.rgwAvatar[1]).toBe(91)
      expect(r.rgwWalkFrames[1]).toBe(4)
      expect(r.rgwAttackAll[1]).toBe(1)
      expect(r.rgwCooperativeMagic[1]).toBe(7)
    })
  })

  // D14(2026-05-31):0x29 scriptOnEquip → 装备授毒(寿葫芦每回合回血回蓝,正面"毒")
  describe('0x29 scriptOnEquip → addPoisonForPlayer(script.c:1257)', () => {
    it('0x29 寿葫芦 → 给 role 加 level-99 正面"毒"(resist 0 必中)', () => {
      const cmds: Command[] = [
        { op: 'raw', opcode: 0x29, operands: [0, 563, 0], label: 'L_520' }, // applyAll=0,毒 563
        { op: 'end' },
      ]
      setGlobalEvents(cmds)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [1]
      // poisonResistance 默认 0 → RandomLong(1,100) > 0 必 true → 中
      runEquipScript(gs, 520, 1)
      const has563 = Object.values(gs.rgPoisonStatus).some((p) => p.wPoisonID === 563)
      expect(has563).toBe(true)
    })

    it('M12:落槽时跑一次入口 playerScript,存返回 next(C global.c:1515)', () => {
      setObjectPoisons([{ id: 100, level: 2, color: 0, playerScript: 555, enemyScript: 0 }])
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      let ranIp = -1
      addPoisonForPlayer(gs, 0, 100, (ip) => {
        ranIp = ip
        return 600
      })
      expect(ranIp).toBe(555) // 施毒当下跑了入口 playerScript
      expect(gs.rgPoisonStatus['0_0']?.wPoisonScript).toBe(600) // 存返回的 next entry
      expect(gs.rgPoisonStatus['0_0']?.wPoisonID).toBe(100)
      setObjectPoisons([])
    })

    it('M12:runEquipScript 0x29 落槽当下跑 playerScript,存返回 next entry', () => {
      setObjectPoisons([{ id: 100, level: 2, color: 0, playerScript: 555, enemyScript: 0 }])
      const cmds: Command[] = [
        { op: 'raw', opcode: 0x29, operands: [0, 100, 0], label: 'L_520' },
        { op: 'end' },
        { op: 'raw', opcode: 0x1b, operands: [0, 20, 0], label: 'L_555' },
        { op: 'end', advance: true },
      ]
      setGlobalEvents(cmds)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [1]
      gs.PlayerRolesRuntime.rgwPoisonResistance[1] = 0
      gs.PlayerRolesRuntime.rgwMaxHP[1] = 100
      gs.PlayerRolesRuntime.rgwHP[1] = 50
      runEquipScript(gs, 520, 1)
      expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(70)
      expect(gs.rgPoisonStatus['0_1']).toEqual({ wPoisonID: 100, wPoisonScript: 4 })
      setObjectPoisons([])
    })

    it('M12:无 runner(旧 caller)→ fallback 存入口 ip(差一拍但不崩)', () => {
      setObjectPoisons([{ id: 100, level: 2, color: 0, playerScript: 555, enemyScript: 0 }])
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      addPoisonForPlayer(gs, 0, 100) // 不传 runner
      expect(gs.rgPoisonStatus['0_0']?.wPoisonScript).toBe(555) // 存入口 ip(向后兼容)
      setObjectPoisons([])
    })
  })

  describe('D14:removeEquipmentEffect 卸装副作用(global.c:1406-1454)', () => {
    it('卸 Hand(part3)→ reset DualAttack(global.c:1411)', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.rgPlayerStatus[1]![8] = 32760
      removeEquipmentEffect(gs, 1, 3) // Hand
      expect(gs.rgPlayerStatus[1]![8]).toBe(0)
    })

    it('卸非 Hand(part0 Head)→ DualAttack 不动', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.rgPlayerStatus[1]![8] = 32760
      removeEquipmentEffect(gs, 1, 0) // Head
      expect(gs.rgPlayerStatus[1]![8]).toBe(32760)
    })

    it('卸 Wear(part5)→ 清 level≥99 毒(寿葫芦),低级毒保留(global.c:1413-1454)', () => {
      setObjectPoisons([
        { id: 563, level: 99, color: 0, playerScript: 40860, enemyScript: 0 }, // 寿葫芦正面毒
        { id: 552, level: 1, color: 64, playerScript: 40866, enemyScript: 40868 }, // 低级伤害毒
      ])
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.rgPoisonStatus['0_1'] = { wPoisonID: 563, wPoisonScript: 40860 }
      gs.rgPoisonStatus['1_1'] = { wPoisonID: 552, wPoisonScript: 40866 }
      removeEquipmentEffect(gs, 1, 5) // Wear
      expect(gs.rgPoisonStatus['0_1']!.wPoisonID).toBe(0) // level99 清
      expect(gs.rgPoisonStatus['1_1']!.wPoisonID).toBe(552) // 低级保留
    })
  })

  // P1#4(2026-05-29):sdlpal 0x1A iCurEquipPart redirect(script.c:838-847)+ 脚本末 reset(3476)
  describe('setPlayerStatRow iCurEquipPart redirect + reset', () => {
    it('iCurEquipPart=-1 → 写 base PlayerRolesRuntime', () => {
      const gs = freshGs()
      gs.iCurEquipPart = -1
      setPlayerStatRow(gs, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 99)
      expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(99)
      expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0)
    })

    it('iCurEquipPart=3(装备进行中)→ 写 rgEquipmentEffect[3] 覆盖层,base 不变', () => {
      const gs = freshGs()
      gs.iCurEquipPart = 3
      setPlayerStatRow(gs, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 7)
      expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(7)
      expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(50) // base 不变
    })

    it('runEquipScript:0x18 设 part 后 0x1A redirect 到覆盖层;脚本结束 iCurEquipPart reset=-1', () => {
      // P2#5:单一全局脚本数组 — L_501 落在 index 0(0x18 那条带 label)。
      const cmds: Command[] = [
        { op: 'raw', opcode: 0x18, operands: [14, 163, 0], label: 'L_501' }, // part 14-0xB=3,装 163
        { op: 'raw', opcode: 0x1a, operands: [PLAYERROLES_ROW.ATTACK_STRENGTH, 7, 0] }, // 加 Atk 到覆盖层
        { op: 'end' },
      ]
      setGlobalEvents(cmds)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.PlayerRolesRuntime.rgwAttackStrength[2] = 50
      gs.PlayerRolesRuntime.rgwEquipment[3]![2] = 163
      gs.inventory = [{ itemId: 163, count: 1 }]
      runEquipScript(gs, 501, 2)
      // 0x1A 经 iCurEquipPart=3 redirect → 写 rgEquipmentEffect[3],base 不动
      expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[2]).toBe(7)
      expect(gs.PlayerRolesRuntime.rgwAttackStrength[2]).toBe(50)
      // 脚本结束必须 reset,否则后续无关 0x1A 误写覆盖层
      expect(gs.iCurEquipPart).toBe(-1)
    })
  })
})
