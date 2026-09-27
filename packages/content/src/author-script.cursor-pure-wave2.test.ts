/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C1：嵌套 dialog 先过作者命令门再投影。
 * 顶层 dialog 往返已由 author-dialogue.test / current-characterization 证明。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap, wave2Actor } from './__tests__/cursor-pure-wave2-fixtures.js'
import {
  assertAuthorDialogueReferences,
  checkAuthorCommands,
  resolveAuthorDialogueTree,
} from './author-script.js'

const actor = wave2Actor('actor.li', 'name.li')

describe('C1 author-script 剩余合同', () => {
  test('branch.then 内 dialog 过作者门后投影 slot，sibling wait 保持', () => {
    const commands = [
      {
        kind: 'branch' as const,
        cond: { kind: 'flag' as const, flag: 'quest.open', is: true },
        then: [
          {
            kind: 'dialog' as const,
            cue: {
              identity: {
                kind: 'actor' as const,
                actor: actor.id,
                portrait: { kind: 'default' as const, side: 'right' as const },
              },
              rows: [{ text: 'line.nested' }],
              slot: 'bottom' as const,
            },
          },
          { kind: 'wait' as const, ms: 4 },
        ],
      },
    ]
    const actors = { [actor.id]: actor }
    const commandSnap = inputSnap(commands)
    const actorsSnap = inputSnap(actors)
    checkAuthorCommands(commands, 'commands')
    assertAuthorDialogueReferences(commands, actors, 'commands')
    expect(commands).toEqual(commandSnap)
    expect(resolveAuthorDialogueTree(commands, actors, 'commands')).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'quest.open', is: true },
        then: [
          {
            kind: 'dialog',
            cue: {
              speaker: 'name.li',
              portrait: { asset: 'portrait.actor.li.default', side: 'right' },
              rows: [{ text: 'line.nested' }],
              slot: 'bottom',
            },
          },
          { kind: 'wait', ms: 4 },
        ],
      },
    ])
    expect(commands).toEqual(commandSnap)
    expect(actors).toEqual(actorsSnap)
    expect(commands[0]?.then[1]).toEqual({ kind: 'wait', ms: 4 })
  })
})
