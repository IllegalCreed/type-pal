import { describe, expect, test } from 'vitest'
import { blockingAmbienceReferences } from './ambience-references.js'
import type { EditorState } from './edit-session.js'

function shell(): EditorState {
  return {
    scenes: [],
    items: [],
    sharedScripts: {},
    scriptChunks: {},
  } as unknown as EditorState
}

describe('blockingAmbienceReferences', () => {
  test('finds nested canonical setAmbience references with an exact locator', () => {
    const state = shell()
    state.sharedScripts = {
      'shared/review': {
        name: '评审脚本',
        self: 'none',
        body: [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'review.started', is: true },
            then: [{ kind: 'setAmbience', ambience: 'dusk' }],
          },
        ],
      },
    }

    const references = blockingAmbienceReferences(state, 'dusk')
    expect(references).toHaveLength(1)
    expect(references[0]).toMatchObject({
      kind: 'set-ambience',
      where: 'sharedScripts.shared/review.body[0].then[0].ambience',
      locator: { kind: 'command' },
    })
    expect(references[0]?.label).toContain('评审脚本')
  })

  test('treats toggleDayNight as an implicit reference to both day and night', () => {
    const state = shell()
    state.scriptChunks = {
      review: {
        version: 1,
        id: 'review',
        scripts: {
          'shared/day-night': [{ kind: 'toggleDayNight', ms: 800 }],
        },
      },
    }

    expect(blockingAmbienceReferences(state, 'night')).toEqual([
      expect.objectContaining({ kind: 'toggle-day-night' }),
    ])
    expect(blockingAmbienceReferences(state, 'day')).toEqual([
      expect.objectContaining({ kind: 'toggle-day-night' }),
    ])
  })

  test('finds read-only world state references without matching unrelated values', () => {
    const state = shell()
    state.worlds = [
      {
        ambience: 'warm',
        party: [],
        reserve: [],
        money: 0,
        learnedSkills: {},
        inventory: [],
      },
    ]

    expect(blockingAmbienceReferences(state, 'warm')).toEqual([
      expect.objectContaining({
        kind: 'world-state',
        where: 'worlds[0].ambience',
      }),
    ])
    expect(blockingAmbienceReferences(state, 'dusk')).toEqual([])
  })
})
