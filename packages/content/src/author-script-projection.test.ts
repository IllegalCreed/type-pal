import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { ActorDef } from './actor.js'
import {
  checkAuthorCommands,
  checkAuthorScriptFlow,
  resolveAuthorDialogueTree,
} from './author-script.js'

const actor: ActorDef = {
  id: 'actor.li',
  name: 'name.li',
  spriteId: 'sprite.li',
  portraits: {
    default: 'portrait.li.default',
    expressions: { angry: 'portrait.li.angry' },
  },
}

describe('author script dialogue projection', () => {
  test('projects actor and unbound identity through the author validation boundary', () => {
    const commands = [
      {
        kind: 'dialog' as const,
        cue: {
          identity: {
            kind: 'actor' as const,
            actor: actor.id,
            speakerOverride: 'title.hero',
            portrait: { kind: 'expression' as const, expression: 'angry', side: 'left' as const },
          },
          rows: [{ text: 'line.hello', speed: 24 }],
        },
      },
      {
        kind: 'dialog' as const,
        cue: {
          identity: {
            kind: 'unbound' as const,
            speaker: 'speaker.shopkeeper',
            portrait: { asset: 'portrait.shopkeeper', side: 'right' as const },
          },
          rows: [{ text: 'line.shopkeeper' }],
        },
      },
    ]
    expect(() => checkAuthorCommands(commands, 'commands')).not.toThrow()
    expect(resolveAuthorDialogueTree(commands, { [actor.id]: actor })).toEqual([
      {
        kind: 'dialog',
        cue: {
          speaker: 'title.hero',
          portrait: { asset: 'portrait.li.angry', side: 'left' },
          rows: [{ text: 'line.hello', speed: 24 }],
        },
      },
      {
        kind: 'dialog',
        cue: {
          speaker: 'speaker.shopkeeper',
          portrait: { asset: 'portrait.shopkeeper', side: 'right' },
          rows: [{ text: 'line.shopkeeper' }],
        },
      },
    ])
  })

  test('dialogue identity fails closed instead of falling back to global assets', () => {
    expect(() =>
      resolveAuthorDialogueTree(
        [
          {
            kind: 'dialog',
            cue: {
              identity: {
                kind: 'actor',
                actor: actor.id,
                portrait: { kind: 'expression', expression: 'missing', side: 'left' },
              },
              rows: [{ text: 'line' }],
            },
          },
        ],
        { [actor.id]: actor },
      ),
    ).toThrow(
      new Error('content[0].cue.identity.portrait.expression: Actor "actor.li" 缺表情 "missing"'),
    )
  })

  test('projects a nested dialogue without changing its branch, sibling command, or source', () => {
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
    const flowSnap = deepSnapshot(flow)
    const actorsSnap = deepSnapshot(actors)
    checkAuthorScriptFlow(flow, 'flow')
    const resolved = resolveAuthorDialogueTree(flow, actors, 'flow')
    expect(flow).toEqual(flowSnap)
    expect(resolved.stages[0]?.body[0]?.then[0]?.cue).toEqual({
      speaker: 'name.li',
      portrait: { asset: 'portrait.li.default', side: 'right' },
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
