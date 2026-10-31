import { describe, expect, it } from 'vitest'
import { menuMagic, menuSpell } from './magic-menu-fixtures.js'
import { makeGs, makeItem, makeRoles } from './menu-state-fixtures.js'
import { makeUiFrames } from './menu-ui-fixtures.js'
import { cloneInputs } from './render-input-snapshots.js'

describe('Input snapshot ownership', () => {
  it('P06 输入快照能发现位图宽度、法术名、背景、毒和升级表变化', () => {
    const frames = makeUiFrames()
    const spells = [menuSpell(300, '雷', 1)]
    const magics = [menuMagic(1, 8)]
    const portraits = new Map([[5, frames[70]!]])
    const bg = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x56) }
    const poisons = new Map([[77, { level: 1, color: 3 }]])
    const levelUpExp = [0, 40]
    const gs = makeGs()
    const roles = makeRoles()
    const menu = { phase: 'pick-spell' as const }
    const shot = () =>
      cloneInputs({
        gs,
        menu,
        items: [],
        roles,
        frames,
        portraits,
        spells,
        magics,
        statusBg: bg,
        poisons,
        levelUpExp,
      })
    const before = shot()
    frames[0]!.width = 99
    expect(shot()).not.toEqual(before)
    frames[0]!.width = 8
    spells[0]!._name = '错'
    expect(shot()).not.toEqual(before)
    spells[0]!._name = '雷'
    bg.height = 9
    expect(shot()).not.toEqual(before)
    bg.height = 4
    poisons.set(77, { level: 9, color: 3 })
    expect(shot()).not.toEqual(before)
    poisons.set(77, { level: 1, color: 3 })
    levelUpExp[1] = 41
    expect(shot()).not.toEqual(before)
    levelUpExp[1] = 40
    expect(shot()).toEqual(before)
  })

  it('物品数组增删和重排均能被已捕获快照识别', () => {
    const gs = makeGs()
    const first = makeItem(1, '甲')
    const second = makeItem(2, '乙')
    const items = [first]
    const before = cloneInputs({ gs, items })
    items.push(second)
    expect(cloneInputs({ gs, items })).not.toEqual(before)
    const grown = cloneInputs({ gs, items })
    items.reverse()
    expect(cloneInputs({ gs, items })).not.toEqual(grown)
    const reversed = cloneInputs({ gs, items })
    items.pop()
    expect(cloneInputs({ gs, items })).not.toEqual(reversed)
    expect(items).toEqual([second])
  })
})
