import type { ActorDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyPalCasualtyOverlays,
  translateCasualtyScript,
} from './pal-casualty-scripts.js'
import type { SourceCmd } from './source-facts.js'

const actor = (id: string): ActorDef => ({
  id,
  name: `name.${id}`,
  spriteId: id,
  battler: {
    baseStats: {
      level: 1,
      hp: 100,
      maxHP: 100,
      mp: 50,
      maxMP: 50,
      attack: 10,
      defense: 10,
      magicAttack: 10,
      speed: 10,
      luck: 10,
    },
    initialEquipment: {},
    initialMagic: [],
    battleSprite: `battle-sprite.${id}`,
  },
})

const cmd = (op: string, over: Partial<SourceCmd> = {}): SourceCmd => ({ op, ...over })

describe('B11-1 伤亡脚本翻译', () => {
  test('顺序概率门 + 分支台词/回满/临时 buff 结构化翻译并落 locale', () => {
    // 仿李逍遥 friendDeath:三道门 75/66/50,门1 = 台词 + MP 满 + magic+10%,兜底 = HP 满 + attack+5%。
    const commands: SourceCmd[] = [
      cmd('raw', { opcode: 6, operands: [75, 10, 0] }),
      cmd('raw', { opcode: 6, operands: [66, 15, 0] }),
      cmd('raw', { opcode: 6, operands: [50, 17, 0] }),
      // 兜底 @3
      cmd('setDialogStyleBottom'),
      cmd('showDialog', { messageIndex: 13470, text: '　啊～！' }),
      cmd('setDialogStyleNarration'),
      cmd('showDialog', { messageIndex: 13471, text: '斗志燃烧，体力恢复' }),
      cmd('raw', { opcode: 0x1b, operands: [0, 9999, 0] }),
      cmd('raw', { opcode: 0x30, operands: [17, 5, 0] }),
      cmd('end'),
      // 门1 @10
      cmd('setDialogStyleBottom'),
      cmd('showDialog', { messageIndex: 13472, text: '　可恶的家伙！' }),
      cmd('raw', { opcode: 0x1c, operands: [0, 9999, 0] }),
      cmd('raw', { opcode: 0x30, operands: [18, 10, 0] }),
      cmd('end'),
      // 门2 @20
      cmd('raw', { opcode: 0x30, operands: [20, 90, 0] }),
      cmd('end'),
      // 门3 @30
      cmd('raw', { opcode: 0x30, operands: [21, 90, 0] }),
      cmd('end'),
    ]
    const locale: Record<string, string> = {}
    const script = translateCasualtyScript(commands, 0, locale)
    expect(script).toEqual({
      gates: [
        {
          chance: 75,
          branch: {
            lines: [
              { text: 'dlg.13472', style: 'bottom' },
            ],
            effects: [
              { kind: 'heal', resource: 'mp' },
              { kind: 'tempStatBuff', stat: 'magic', percent: 10 },
            ],
          },
        },
        {
          chance: 66,
          branch: {
            lines: [],
            effects: [{ kind: 'tempStatBuff', stat: 'speed', percent: 90 }],
          },
        },
        {
          chance: 50,
          branch: {
            lines: [],
            effects: [{ kind: 'tempStatBuff', stat: 'luck', percent: 90 }],
          },
        },
      ],
      fallback: {
        lines: [
          { text: 'dlg.13470', style: 'bottom' },
          { text: 'dlg.13471', style: 'narration' },
        ],
        effects: [
          { kind: 'heal', resource: 'hp' },
          { kind: 'tempStatBuff', stat: 'attack', percent: 5 },
        ],
      },
    })
    expect(locale).toEqual({
      'dlg.13470': '　啊～！',
      'dlg.13471': '斗志燃烧，体力恢复',
      'dlg.13472': '　可恶的家伙！',
    })
  })

  test('未知 opcode fail-closed', () => {
    const commands: SourceCmd[] = [
      cmd('raw', { opcode: 6, operands: [75, 1, 0] }),
      cmd('raw', { opcode: 0x99, operands: [0, 0, 0] }),
      cmd('end'),
    ]
    expect(() => translateCasualtyScript(commands, 0, {})).toThrow('不支持的 opcode 0x99')
  })

  test('入口缺失 fail-closed', () => {
    expect(() =>
      applyPalCasualtyOverlays([actor('a')], [], [
        { scriptOnFriendDeath: 0, scriptOnDying: 0 },
      ]),
    ).toThrow('期望角色 0 friendDeath 入口缺失')
  })
})
