import { describe, expect, test } from 'vitest'
import { collectBattleFieldTaggedReferences } from './battle-field-reference.js'

describe('collectBattleFieldTaggedReferences', () => {
  test('覆盖 canonical 根、entry.prepare 与全部递归命令臂', () => {
    const roots = {
      stages: [
        {
          entry: { prepare: [{ kind: 'startBattle', teamId: 'a', fieldId: 1 }] },
          body: [
            {
              kind: 'branch',
              then: [{ kind: 'startBattle', teamId: 'b', fieldId: 2 }],
              else: [{ kind: 'startBattle', teamId: 'c', fieldId: 3 }],
            },
            { kind: 'loop', body: [{ kind: 'startBattle', teamId: 'd', fieldId: 4 }] },
            { kind: 'confirm', onNo: [{ kind: 'startBattle', teamId: 'e', fieldId: 5 }] },
            {
              kind: 'startBattle',
              teamId: 'f',
              fieldId: 6,
              onLose: [{ kind: 'startBattle', teamId: 'g', fieldId: 7 }],
              onFlee: [{ kind: 'startBattle', teamId: 'h', fieldId: 8 }],
            },
            {
              kind: 'teleportOut',
              onFail: [{ kind: 'startBattle', teamId: 'i', fieldId: 9 }],
            },
          ],
        },
      ],
      machine: {
        states: {
          ready: { body: [{ kind: 'startBattle', teamId: 'j', fieldId: 10 }] },
        },
      },
    }

    const references = collectBattleFieldTaggedReferences(roots, 'root')
    expect(references.map((reference) => reference.fieldId)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
    expect(references.every((reference) => reference.where.endsWith('.fieldId'))).toBe(true)
  })

  test('只识别 startBattle.fieldId，且相同命令的不同物理位置不会去重', () => {
    const references = collectBattleFieldTaggedReferences(
      [
        { kind: 'metadata', fieldId: 24 },
        { kind: 'startBattle', teamId: 'a', fieldId: 24 },
        { kind: 'startBattle', teamId: 'a', fieldId: 24 },
      ],
      'body',
    )
    expect(references).toEqual([
      { fieldId: 24, kind: 'start-battle', where: 'body[1].fieldId' },
      { fieldId: 24, kind: 'start-battle', where: 'body[2].fieldId' },
    ])
  })
})
