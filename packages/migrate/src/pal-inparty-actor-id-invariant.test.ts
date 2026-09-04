import type { ActorDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { assertPalInPartyActorIdInvariant } from './pal-inparty-actor-id-invariant.js'

const actors = [{ id: 'zhao-linger' }, { id: 'anu' }] as ActorDef[]

describe('PAL inParty stable ActorId invariant', () => {
  test('复用 typed walker 覆盖 stages/stateMachine transition/loop 与 all-any-not', () => {
    const report = assertPalInPartyActorIdInvariant({
      actors,
      commandRoots: [
        {
          stages: [
            {
              body: [
                {
                  kind: 'branch',
                  cond: {
                    kind: 'all',
                    of: [
                      { kind: 'inParty', actorId: 'zhao-linger' },
                      { kind: 'not', cond: { kind: 'inParty', actorId: 'anu' } },
                    ],
                  },
                  then: [
                    {
                      kind: 'loop',
                      cond: {
                        kind: 'any',
                        of: [{ kind: 'inParty', actorId: 'anu' }],
                      },
                      body: [],
                    },
                  ],
                },
              ],
            },
          ],
          machine: {
            states: {
              initial: {
                body: [],
                next: {
                  kind: 'branch',
                  cond: { kind: 'inParty', actorId: 'zhao-linger' },
                },
              },
            },
          },
        },
      ],
    })

    expect(report.references.map(({ actorId }) => actorId)).toEqual([
      'zhao-linger',
      'anu',
      'anu',
      'zhao-linger',
    ])
  })

  test('数字 ActorId fail-loud 并保留递归位置', () => {
    expect(() =>
      assertPalInPartyActorIdInvariant({
        actors,
        commandRoots: [
          {
            kind: 'branch',
            cond: { kind: 'not', cond: { kind: 'inParty', actorId: '37' } },
          },
        ],
      }),
    ).toThrow(/commandRoots\[0\]\.cond\.cond\.actorId="37"/)
  })

  test('非数字悬空 ActorId 同样 fail-loud', () => {
    expect(() =>
      assertPalInPartyActorIdInvariant({
        actors,
        commandRoots: [{ kind: 'inParty', actorId: 'missing-actor' }],
      }),
    ).toThrow(/未知 ActorId.*missing-actor/)
  })
})
