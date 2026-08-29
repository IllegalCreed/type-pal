import { describe, expect, test } from 'vitest'
import {
  getPalAuthoredMapName,
  hasPalAuthoredMapName,
  PAL_AUTHORED_MAP_NAMES,
} from './pal-authored-map-names.js'

function stableFixtureHash(text: string): string {
  let hash = 0xcbf29ce484222325n
  for (let index = 0; index < text.length; index++) {
    hash ^= BigInt(text.charCodeAt(index))
    hash = BigInt.asUintN(64, hash * 0x100000001b3n)
  }
  return hash.toString(16).padStart(16, '0')
}

describe('PAL authored map names', () => {
  test('keeps the complete phase1-authored mapNum truth as one immutable fixture', () => {
    const entries = Object.entries(PAL_AUTHORED_MAP_NAMES)
    expect(Object.isFrozen(PAL_AUTHORED_MAP_NAMES)).toBe(true)
    expect(entries).toHaveLength(222)
    expect(new Set(entries.map(([mapNum]) => Number(mapNum))).size).toBe(222)
    expect(entries.every(([mapNum, name]) => Number.isInteger(Number(mapNum)) && name.length > 0)).toBe(
      true,
    )
    expect(getPalAuthoredMapName(0)).toBe('梦境')
    expect(getPalAuthoredMapName(1)).toBe('盛渔村')
    expect(getPalAuthoredMapName(23)).toBe('苏州城')
    expect(getPalAuthoredMapName(174)).toBe('女娲神庙外雨季')
    expect(getPalAuthoredMapName(225)).toBe('试炼窟遗迹')
    expect(getPalAuthoredMapName(104)).toBeUndefined()
    expect(getPalAuthoredMapName(164)).toBeUndefined()
    expect(hasPalAuthoredMapName(1)).toBe(true)
    expect(hasPalAuthoredMapName(104)).toBe(false)
    const numericEntries = entries.map(([mapNum, name]) => [Number(mapNum), name] as const)
    expect(stableFixtureHash(JSON.stringify(numericEntries))).toBe('a17a4fe3c5e4f85c')
  })

  test('keeps duplicate human labels as distinct stable mapNum identities', () => {
    expect(getPalAuthoredMapName(11)).toBe('盛渔村民居')
    expect(getPalAuthoredMapName(13)).toBe('盛渔村民居')
    expect(getPalAuthoredMapName(178)).toBe('南诏皇宫外')
    expect(getPalAuthoredMapName(211)).toBe('南诏皇宫外')
  })
})
