/**
 * magic-script.ts 防回归单测 — sdlpal uigame.c:740-861 + script.c:867-1102 真值。
 *
 * 覆盖(防 user 反馈"法术不生效" bug 再发生):
 *  - runMagicScriptSync 单 opcode 真值(0x1B / 0x1C / 0x1D / 0x22)
 *  - castOverworldMagic 双层 scriptOnUse + scriptOnSuccess 顺序
 *  - applyToAll vs single target branch
 *  - 气疗术 / 还魂咒 / 五气朝元 真 chain fixture
 */

import type { Command, Spell } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getGlobalLabelMap, setGlobalEvents } from '../event-system.js'
import { createInitialGameState } from '../game-state.js'
import { castOverworldMagic, runMagicScriptSync } from './magic-script.js'

// ── shared.json fixture(真值 chain)─────────────────────────────────────────
//
// 气疗术 scriptOnSuccess=43016:`raw 0x1B [0, 75, 0]` → HP+75 single
// 五气朝元 scriptOnSuccess=39554:`raw 0x1B [1, 300, 0]` → HP+300 all
// 还魂咒 scriptOnSuccess=43024:`raw 0x22 [0, 1, 0]` → revive ratio 10%
// 赎魂 scriptOnSuccess=43026:`raw 0x22 [0, 3, 0]` → revive ratio 30%
//
// (实测 7 个 outside-battle spell scriptOnUse 全 = 0)

const FIXTURE_COMMANDS: Command[] = [
  // L_43016 气疗术 scriptOnSuccess(idx 0)
  { op: 'raw', opcode: 0x1B, operands: [0, 75, 0], label: 'L_43016' },
  { op: 'end' },
  // L_39554 五气朝元 scriptOnSuccess(idx 2)
  { op: 'raw', opcode: 0x1B, operands: [1, 300, 0], label: 'L_39554' },
  { op: 'end' },
  // L_43024 还魂咒 scriptOnSuccess(idx 4)
  { op: 'raw', opcode: 0x22, operands: [0, 1, 0], label: 'L_43024' },
  { op: 'end' },
  // L_43026 赎魂 scriptOnSuccess(idx 6)
  { op: 'raw', opcode: 0x22, operands: [0, 3, 0], label: 'L_43026' },
  { op: 'end' },
  // L_500 MP-only test(idx 8)— OP_INCREASE_MP +20
  { op: 'raw', opcode: 0x1C, operands: [0, 20, 0], label: 'L_500' },
  { op: 'end' },
  // L_501 HP+MP test(idx 10)— OP_INCREASE_HP_MP +10
  { op: 'raw', opcode: 0x1D, operands: [0, 10, 0], label: 'L_501' },
  { op: 'end' },
  // L_502 multi-op chain(idx 12)— HP-50(0xFFCE = -50 as SHORT)→ revive 10% → end
  // 注:pal-extract dump 真值 operand 是 unsigned WORD(0..65535),signExtendI16
  // 在 runner 内做 (SHORT)cast。fixture 必须用 unsigned 表达 — `-50` 直接传会被
  // JS 32-bit bitwise 误判;65486 = 65536 - 50 = 0xFFCE = -50 的 WORD 表示。
  { op: 'raw', opcode: 0x1B, operands: [0, 65486, 0], label: 'L_502' },
  { op: 'raw', opcode: 0x22, operands: [0, 1, 0] },
  { op: 'end' },
  // L_503 unknown opcode skip(idx 15)
  { op: 'raw', opcode: 0xFE, operands: [0, 0, 0], label: 'L_503' },
  { op: 'raw', opcode: 0x1B, operands: [0, 5, 0] },
  { op: 'end' },
] as Command[]

const FIXTURE_LABELS: Record<string, number> = {
  L_43016: 0, L_39554: 2, L_43024: 4, L_43026: 6,
  L_500: 8, L_501: 10, L_502: 12, L_503: 15,
}

function mkGs() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0, 1, 2]
  gs.PlayerRolesRuntime.rgwMaxHP = [200, 200, 200, 0, 0, 0]
  gs.PlayerRolesRuntime.rgwMaxMP = [100, 100, 100, 0, 0, 0]
  gs.PlayerRolesRuntime.rgwHP = [50, 100, 50, 0, 0, 0]
  gs.PlayerRolesRuntime.rgwMP = [80, 50, 30, 0, 0, 0]
  return gs
}

// ── P2#5:setGlobalEvents 由 command.label 字段建全局 labelMap(L_<n> → index)──
// 取代旧 setSharedEvents(cmds, labelMap) 显式 map。这里断言 derive 出的 map 与
// FIXTURE_LABELS 期望下标一致 —— 即 runMagicScriptSync 经 getGlobalLabelMap 查 L_<scriptId>
// 解析到的 ip 就是 fixture 命令所在的全局下标。

describe('setGlobalEvents - 由 label 字段 derive 全局 labelMap(P2#5)', () => {
  afterEach(() => setGlobalEvents([]))

  it('FIXTURE_COMMANDS 注册后 getGlobalLabelMap 与 FIXTURE_LABELS 期望下标一致', () => {
    setGlobalEvents(FIXTURE_COMMANDS)
    const map = getGlobalLabelMap()
    for (const [label, idx] of Object.entries(FIXTURE_LABELS)) {
      expect(map[label]).toBe(idx)
    }
  })
})

// ── opcode 0x1B OP_INCREASE_HP ────────────────────────────────────────────

describe('runMagicScriptSync - opcode 0x1B OP_INCREASE_HP', () => {
  beforeEach(() => setGlobalEvents(FIXTURE_COMMANDS))
  afterEach(() => setGlobalEvents([]))

  it('气疗术 chain (HP+75 single) → target role HP +75 clamp maxHP', () => {
    const gs = mkGs()
    const ok = runMagicScriptSync(gs, 43016, 0) // target = role 0
    expect(ok).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(125) // 50 + 75
    expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(100) // 其他不变
  })

  it('HP+75 但当前 HP 已接近 maxHP → clamp maxHP', () => {
    const gs = mkGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 180
    const ok = runMagicScriptSync(gs, 43016, 0)
    expect(ok).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(200) // clamp 200,不超
  })

  it('五气朝元 chain (HP+300 applyToAll) → 全队活着的 +300 clamp', () => {
    const gs = mkGs()
    const ok = runMagicScriptSync(gs, 39554, 0xFFFF)
    expect(ok).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(200) // 50+300=350 clamp 200
    expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(200) // 100+300 clamp
    expect(gs.PlayerRolesRuntime.rgwHP[2]).toBe(200)
  })

  it('applyToAll skip dead role(sdlpal applyHPMPDeltaAll 真值)', () => {
    const gs = mkGs()
    gs.PlayerRolesRuntime.rgwHP[1] = 0 // role 1 dead
    runMagicScriptSync(gs, 39554, 0xFFFF)
    expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(0) // 死不复活(0x1B 真值跳过 HP==0)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(200)
    expect(gs.PlayerRolesRuntime.rgwHP[2]).toBe(200)
  })

  it('single target=0xFFFF 但 applyAll=false → skip(防越界)', () => {
    const gs = mkGs()
    runMagicScriptSync(gs, 43016, 0xFFFF) // 真值需要 role id,0xFFFF 跳过
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(50) // unchanged
  })

  it('M10:满血单体治疗 → success=false(无变化,sdlpal Avoid over treatment global.c:1324)', () => {
    const gs = mkGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 200 // 满血(=maxHP)
    const ok = runMagicScriptSync(gs, 43016, 0) // 气疗术 HP+75 single
    expect(ok).toBe(false) // 无变化 → fScriptSuccess=FALSE → 上层不扣 MP
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(200) // 不变
  })

  it('M10:死人单体治疗 → success=false + HP 不抬(仅活人,sdlpal PAL_IncreaseHPMP hp>0 global.c:1287)', () => {
    const gs = mkGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 0 // 阵亡
    const ok = runMagicScriptSync(gs, 43016, 0) // 气疗术对死人
    expect(ok).toBe(false) // 死人不治 → fScriptSuccess=FALSE → 不扣 MP
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(0) // 不抬血(原 bug 会变 75 = 廉价复活)
  })
})

// ── opcode 0x1C OP_INCREASE_MP ────────────────────────────────────────────

describe('runMagicScriptSync - opcode 0x1C OP_INCREASE_MP', () => {
  beforeEach(() => setGlobalEvents(FIXTURE_COMMANDS))
  afterEach(() => setGlobalEvents([]))

  it('MP +20 single target → clamp maxMP', () => {
    const gs = mkGs()
    runMagicScriptSync(gs, 500, 1) // target = role 1, MP 50 + 20 = 70
    expect(gs.PlayerRolesRuntime.rgwMP[1]).toBe(70)
  })

  it('MP +20 当前 MP 接近 maxMP → clamp', () => {
    const gs = mkGs()
    gs.PlayerRolesRuntime.rgwMP[0] = 95
    runMagicScriptSync(gs, 500, 0)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(100) // clamp
  })
})

// ── opcode 0x1D OP_INCREASE_HP_MP ─────────────────────────────────────────

describe('runMagicScriptSync - opcode 0x1D OP_INCREASE_HP_MP', () => {
  beforeEach(() => setGlobalEvents(FIXTURE_COMMANDS))
  afterEach(() => setGlobalEvents([]))

  it('HP+10 + MP+10 同 delta', () => {
    const gs = mkGs()
    runMagicScriptSync(gs, 501, 0)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(60) // 50+10
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(90) // 80+10
  })
})

// ── opcode 0x22 OP_REVIVE_PLAYER ──────────────────────────────────────────

describe('runMagicScriptSync - opcode 0x22 OP_REVIVE_PLAYER', () => {
  beforeEach(() => setGlobalEvents(FIXTURE_COMMANDS))
  afterEach(() => setGlobalEvents([]))

  it('还魂咒 HP==0 → 复活 maxHP * 1/10 = 20', () => {
    const gs = mkGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 0
    runMagicScriptSync(gs, 43024, 0)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(20) // 200 * 1/10
  })

  it('赎魂 HP==0 → 复活 maxHP * 3/10 = 60', () => {
    const gs = mkGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 0
    runMagicScriptSync(gs, 43026, 0)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(60)
  })

  it('HP > 0 时不复活(sdlpal 真值 PAL_RevivePlayer 检 HP==0)', () => {
    const gs = mkGs() // HP 50
    runMagicScriptSync(gs, 43024, 0)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(50) // 未变
  })

  it('复活时清 poison(rgPoisonStatus sparse 清 0)', () => {
    const gs = mkGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 0
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 99, wPoisonScript: 0 }
    runMagicScriptSync(gs, 43024, 0)
    expect(gs.rgPoisonStatus['0_0']?.wPoisonID).toBe(0)
  })

  // ── g_fScriptSuccess 真值(sdlpal script.c:1077/1099)── user 2026-05-29 提醒:
  // BattleWon 已 auto-revive 半 HP,大世界几乎无死人 → 还魂咒选活人应不扣 MP。
  it('revive 选活人 target → runner return false(g_fScriptSuccess=FALSE)', () => {
    const gs = mkGs() // HP[0]=50 活
    const ok = runMagicScriptSync(gs, 43024, 0)
    expect(ok).toBe(false) // dispatcher 据此不扣 MP
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(50) // 未变
  })

  it('revive 选死人 target → runner return true', () => {
    const gs = mkGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 0
    const ok = runMagicScriptSync(gs, 43024, 0)
    expect(ok).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(20)
  })

  it('revive applyToAll 全活 → runner return false', () => {
    const gs = mkGs() // 全活
    const ok = runMagicScriptSync(gs, 39554, 0xFFFF) // 用 39554 fixture? — 是 0x1B,不对
    // 改用 L_500 之外的真 revive applyToAll 测,新加 fixture L_504
    void ok
  })
})

// 补 fixture 测 revive applyToAll(用 inline event setShared)
describe('runMagicScriptSync - revive applyToAll g_fScriptSuccess', () => {
  it('revive applyToAll 全活 → return false', () => {
    // P2#5:label 'L_77777' 在全局数组 idx 0 → setGlobalEvents 由 label 字段建 map(L_77777 → 0)。
    setGlobalEvents(
      [
        { op: 'raw', opcode: 0x22, operands: [1, 1, 0], label: 'L_77777' },
        { op: 'end' },
      ] as Command[],
    )
    const gs = mkGs() // 全活
    const ok = runMagicScriptSync(gs, 77777, 0xFFFF)
    expect(ok).toBe(false) // 全活
    setGlobalEvents([])
  })

  it('revive applyToAll 至少 1 死 → return true', () => {
    setGlobalEvents(
      [
        { op: 'raw', opcode: 0x22, operands: [1, 1, 0], label: 'L_77778' },
        { op: 'end' },
      ] as Command[],
    )
    const gs = mkGs()
    gs.PlayerRolesRuntime.rgwHP[1] = 0 // role 1 dead
    const ok = runMagicScriptSync(gs, 77778, 0xFFFF)
    expect(ok).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(20) // 200 * 1/10
    setGlobalEvents([])
  })
})

// ── multi-op chain + unknown skip ──────────────────────────────────────────

describe('runMagicScriptSync - 流程控制', () => {
  beforeEach(() => setGlobalEvents(FIXTURE_COMMANDS))
  afterEach(() => setGlobalEvents([]))

  it('多 op chain 顺序执行(HP-50 → revive 不触发因 HP>0)', () => {
    const gs = mkGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 200
    runMagicScriptSync(gs, 502, 0)
    // L_502 chain:HP-50 → revive ratio 10%
    // HP=200 → 150;revive 检 HP==0 → skip;final HP=150
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(150)
  })

  it('多 op chain HP-200 后 revive 真触发(HP=0 → maxHP * 1/10)', () => {
    const gs = mkGs()
    // 改 fixture L_502 chain 行为:HP=50 → -50 → 0 → revive 1/10 = 20
    gs.PlayerRolesRuntime.rgwHP[0] = 50
    runMagicScriptSync(gs, 502, 0)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(20) // revive 1/10 of maxHP=200 = 20
  })

  it('未知 opcode log skip 不阻流', () => {
    const gs = mkGs()
    runMagicScriptSync(gs, 503, 0)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(55) // 50+5
  })

  it('scriptId=0 → 返回 true (skip)', () => {
    const gs = mkGs()
    const ok = runMagicScriptSync(gs, 0, 0)
    expect(ok).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(50) // 未变
  })

  it('label 不存在 → 返回 false', () => {
    const gs = mkGs()
    const ok = runMagicScriptSync(gs, 99999, 0)
    expect(ok).toBe(false)
  })
})

// ── castOverworldMagic 双层 scriptOnUse + scriptOnSuccess ─────────────────

describe('castOverworldMagic - 双层 script', () => {
  beforeEach(() => setGlobalEvents(FIXTURE_COMMANDS))
  afterEach(() => setGlobalEvents([]))

  function mkSpell(scriptOnUse: number, scriptOnSuccess: number): Spell {
    return {
      id: 0,
      magicNumber: 33,
      scriptOnUse, scriptOnSuccess, scriptDesc: 0,
      flags: { usableOutsideBattle: true, usableInBattle: false, usableToEnemy: false, applyToAll: false },
      _name: 'test',
    } as unknown as Spell
  }

  it('scriptOnUse=0 → skip,scriptOnSuccess 跑(气疗术真值场景)', () => {
    const gs = mkGs()
    const spell = mkSpell(0, 43016)
    const ok = castOverworldMagic(gs, spell, 6, 0, 0) // costMP=6,caster=0,target=0
    expect(ok).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(125) // 50+75
  })

  it('scriptOnUse 失败 → 不跑 scriptOnSuccess', () => {
    const gs = mkGs()
    const spell = mkSpell(99999, 43016) // scriptOnUse label 不存在 → 失败
    const ok = castOverworldMagic(gs, spell, 6, 0, 0)
    expect(ok).toBe(false)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(50) // 不变(scriptOnSuccess 没跑)
  })
})
