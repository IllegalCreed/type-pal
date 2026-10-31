import type { Spell } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGlobalLabelMap, setGlobalEvents } from '../script-catalog.js'
import {
  magicGameState,
  magicProgram,
  magicProgramLabels,
} from './__tests__/magic-script-fixture.js'
import { castOverworldMagic } from './magic-script.js'

describe('Overworld magic program and phase composition', () => {
  beforeEach(() => setGlobalEvents(magicProgram))
  afterEach(() => {
    setGlobalEvents([])
    vi.restoreAllMocks()
  })
  describe('setGlobalEvents - 由 label 字段 derive 全局 labelMap(P2#5)', () => {
    it('Program labels map to declared instruction positions', () => {
      const map = getGlobalLabelMap()
      for (const [label, idx] of Object.entries(magicProgramLabels)) {
        expect(map[label]).toBe(idx)
      }
    })
  })
  describe('castOverworldMagic - 双层 script', () => {
    function phaseSpell(scriptOnUse: number, scriptOnSuccess: number): Spell {
      return {
        id: 296,
        magicNumber: 33,
        scriptOnUse,
        scriptOnSuccess,
        scriptDesc: 43275,
        flags: {
          usableOutsideBattle: true,
          usableInBattle: true,
          usableToEnemy: false,
          applyToAll: false,
        },
        _name: 'test',
      }
    }
    it('scriptOnUse=0 → skip,scriptOnSuccess 跑(气疗术真值场景)', () => {
      const gs = magicGameState()
      const spell = phaseSpell(0, 43016)
      const ok = castOverworldMagic(gs, spell, 0) // target role0; menu-driver owns MP payment
      expect(ok).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(125) // 50+75
    })
    it('非零 scriptOnUse 先执行再跑 success，runner 不代扣施法者 MP', () => {
      const gs = magicGameState()
      // Use 扣尽 HP 后复活到20，Success 再恢复75；漏跑或颠倒均不等于95。
      const spell = phaseSpell(502, 43016)
      expect(castOverworldMagic(gs, spell, 0)).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(95)
      expect(gs.PlayerRolesRuntime.rgwMP).toEqual([80, 50, 30, 0, 0, 0])
    })
    it('scriptOnUse 失败 → 不跑 scriptOnSuccess', () => {
      const gs = magicGameState()
      const spell = phaseSpell(65000, 43016) // scriptOnUse label 不存在 → 失败
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const ok = castOverworldMagic(gs, spell, 0)
      expect(ok).toBe(false)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(50)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith('runMagicScriptSync: L_65000 不在全局 labelMap')
    })
  })
})
