import type { Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeRole } from '../../../__tests__/coverage85-glm-game/harness.js'

import { createMagicSelectMenu } from '../magic-select.js'
import { getSelected } from '../primitives.js'
import { magicWithCost as makeMagic } from './magic-cost-fixture.js'

describe('M-w0.2 MagicSelectionMenu', () => {
  const makeSpell = (id: number, magicNumber: number, name: string): Spell => ({
    id,
    magicNumber,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
    _name: name,
  })

  const magics: Magic[] = [makeMagic(1, 5), makeMagic(2, 30)]
  const spells: Spell[] = [makeSpell(300, 1, '小火球'), makeSpell(301, 2, '大火球')]
  const playerRoles: PlayerRoles = {
    roles: [
      makeRole(0, {
        _name: 'leader',
        maxHP: 100,
        maxMP: 100,
        hp: 100,
        mp: 100,
        attackStrength: 0,
        magicStrength: 0,
        defense: 0,
        dexterity: 0,
        fleeRate: 0,
        walkFrames: 3,
        magic: [300, 301, ...Array<number>(30).fill(0)],
      }),
    ],
  }

  it('MP 足够 → 列出全部 + 显 MP cost,光标在第一个', () => {
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 100,
    })
    expect(s.items.map((i) => i.label)).toEqual(['小火球', '大火球'])
    expect(s.items[0]?.rightText).toBe('MP 5')
    expect(s.items[1]?.rightText).toBe('MP 30')
    expect(getSelected(s)?.id).toBe(300)
  })

  it('MP 不够 → disabled(灰色),初始 cursor 仍按默认项', () => {
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 10, // 大火球 30 不够
    })
    expect(s.items[0]?.disabled).toBe(false)
    expect(s.items[1]?.disabled).toBe(true)
    expect(s.cursor).toBe(0)
  })

  it('L38:第一个法术 MP 不足时 cursor 仍可落在灰项', () => {
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 3,
    })
    expect(s.items[0]?.disabled).toBe(true)
    expect(s.cursor).toBe(0)
  })

  it('L36:法术按 ObjectID 升序排列(无论习得顺序),对齐 magicmenu.c:377-397', () => {
    const rolesShuffled: PlayerRoles = {
      roles: [
        {
          ...playerRoles.roles[0]!,
          // 习得顺序 [2,1]:先学大火球(id2)后学小火球(id1) —— rgwMagic 按习得追加,乱序
          magic: [301, 300, ...Array<number>(30).fill(0)],
        },
      ],
    }
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles: rolesShuffled,
      spells,
      magics,
      currentMp: 100,
    })
    // C 冒泡按 wMagic(spell ObjectID)升序 → 菜单恒 [小火球(300), 大火球(301)],不随习得序
    expect(s.items.map((i) => i.id)).toEqual([300, 301])
    expect(s.items.map((i) => i.label)).toEqual(['小火球', '大火球'])
  })
})
