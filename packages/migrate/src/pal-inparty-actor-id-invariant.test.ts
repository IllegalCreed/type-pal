import type { AuthorCommand, AuthorScriptFlow } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { assertPalInPartyActorIdInvariant } from './pal-inparty-actor-id-invariant.js'

const actors = [{ id: 'zhao-linger' }, { id: 'anu' }]

describe('PAL inParty stable ActorId invariant', () => {
  test('reports each condition in source order with its complete path', () => {
    const flow = {
      kind: 'stages',
      initial: 'main',
      stages: [
        {
          id: 'main',
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
                  mode: 'while',
                  cond: {
                    kind: 'any',
                    of: [{ kind: 'inParty', actorId: 'anu' }],
                  },
                  body: [{ kind: 'wait', ms: 100 }],
                },
              ],
            },
            {
              kind: 'repeat',
              count: 2,
              body: [
                {
                  kind: 'confirm',
                  onYes: [
                    {
                      kind: 'branch',
                      cond: { kind: 'inParty', actorId: 'zhao-linger' },
                      then: [],
                    },
                  ],
                  onNo: [{ kind: 'branch', cond: { kind: 'inParty', actorId: 'anu' }, then: [] }],
                },
              ],
            },
            { kind: 'setParty', members: ['zhao-linger'] },
          ],
        },
      ],
    } satisfies AuthorScriptFlow
    const report = assertPalInPartyActorIdInvariant({ actors, commandRoots: [flow] })
    const path = 'commandRoots[0].stages[0].body'
    expect(report.references).toEqual([
      { actorId: 'zhao-linger', where: `${path}[0].cond.of[0].actorId` },
      { actorId: 'anu', where: `${path}[0].cond.of[1].cond.actorId` },
      { actorId: 'anu', where: `${path}[0].then[0].cond.of[0].actorId` },
      { actorId: 'zhao-linger', where: `${path}[1].body[0].onYes[0].cond.actorId` },
      { actorId: 'anu', where: `${path}[1].body[0].onNo[0].cond.actorId` },
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
            then: [],
          } satisfies AuthorCommand,
        ],
      }),
    ).toThrow(/commandRoots\[0\]\.cond\.cond\.actorId="37"/)
  })

  test('非数字悬空 ActorId 同样 fail-loud', () => {
    expect(() =>
      assertPalInPartyActorIdInvariant({
        actors,
        commandRoots: [
          [
            { kind: 'branch', cond: { kind: 'inParty', actorId: 'missing-actor' }, then: [] },
          ] satisfies AuthorCommand[],
        ],
      }),
    ).toThrow('PAL inParty 引用未知 ActorId: commandRoots[0][0].cond.actorId="missing-actor"')
  })
})
