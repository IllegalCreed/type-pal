/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C1：stages 流里嵌套 dialog 先过作者流门再投影。
 * 扁平 Command[] 往返已由 author-dialogue.test / current-characterization 证明。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap, wave2Actor } from './__tests__/cursor-pure-wave2-fixtures.js'
import { checkAuthorScriptFlow, resolveAuthorDialogueTree } from './author-script.js'

const actor = wave2Actor('actor.li', 'name.li')

describe('C1 author-script 剩余合同', () => {
  test('stages 流 branch.then dialog 过作者流门后投影，cond 保持', () => {
    const flow = {
      kind: 'stages' as const,
      initial: 'start',
      stages: [
        {
          id: 'start',
          body: [
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
          ],
        },
      ],
    }
    const actors = { [actor.id]: actor }
    const flowSnap = inputSnap(flow)
    const actorsSnap = inputSnap(actors)
    checkAuthorScriptFlow(flow, 'flow')
    const resolved = resolveAuthorDialogueTree(flow, actors, 'flow')
    expect(flow).toEqual(flowSnap)
    expect(resolved.stages[0]?.body[0]?.then[0]?.cue).toEqual({
      speaker: 'name.li',
      portrait: { asset: 'portrait.actor.li.default', side: 'right' },
      rows: [{ text: 'line.nested' }],
      slot: 'bottom',
    })
    expect(resolved.stages[0]?.body[0]?.cond).toEqual({
      kind: 'flag',
      flag: 'quest.open',
      is: true,
    })
    expect(resolved.stages[0]?.body[0]?.then[1]).toEqual({ kind: 'wait', ms: 4 })
    expect(actors).toEqual(actorsSnap)
  })
})
