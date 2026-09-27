/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C4：startBattle.music / 缺 fieldId 不是命令目标。
 * 旧测 startBattle 总是带 fieldId，从不带 music。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import { checkAuthorCommands } from './author-script.js'
import {
  collectCanonicalCommandTargetReferences,
  collectCommandTargetReferences,
} from './command-target-reference.js'

describe('C4 command-target-reference 剩余合同', () => {
  test('合法 startBattle.music 只出敌队边，不发明战场 0', () => {
    const commands = [
      { kind: 'startBattle' as const, enemyTeamId: 'team-a', music: 'music.battle' },
    ]
    const snap = inputSnap(commands)
    checkAuthorCommands(commands, 'commands')
    expect(commands).toEqual(snap)
    const expected = [
      {
        target: { kind: 'enemy-team', id: 'team-a' },
        relation: 'start-battle',
        where: 'commands[0].enemyTeamId',
      },
    ]
    expect(collectCommandTargetReferences(commands, 'commands')).toEqual(expected)
    expect(collectCanonicalCommandTargetReferences(commands[0], 'commands[0]')).toEqual(expected)
    expect(commands).toEqual(snap)
  })
})
