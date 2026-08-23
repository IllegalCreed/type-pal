import { describe, expect, test } from 'vitest'
import { blockingAmbienceReferences, collectAmbienceReferenceIndex } from './ambience-references.js'
import type { EditorState } from './edit-session.js'
import type { ScriptEditorState } from './script-editor.js'

function shell(): EditorState {
  return {
    scenes: [],
    items: [],
    sharedScripts: {},
    scriptChunks: {},
  } as unknown as EditorState
}

describe('blockingAmbienceReferences', () => {
  test('builds one index for explicit, implicit, chunk and world references', () => {
    const state = shell()
    state.sharedScripts = {
      explicit: {
        name: '显式切换',
        self: 'none',
        body: [{ kind: 'setAmbience', ambience: 'dusk' }],
      },
      toggle: {
        name: '昼夜切换',
        self: 'none',
        body: [{ kind: 'toggleDayNight', ms: 300 }],
      },
    }
    state.scriptChunks = {
      legacy: {
        version: 1,
        id: 'legacy',
        scripts: { nested: [{ kind: 'setAmbience', ambience: 'warm' }] },
      },
    }
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

    const index = collectAmbienceReferenceIndex(state)
    expect(index.get('dusk')).toHaveLength(1)
    expect(index.get('day')).toEqual([expect.objectContaining({ kind: 'toggle-day-night' })])
    expect(index.get('night')).toEqual([expect.objectContaining({ kind: 'toggle-day-night' })])
    expect(index.get('warm')).toEqual([
      expect.objectContaining({ kind: 'set-ambience' }),
      expect.objectContaining({ kind: 'world-state' }),
    ])
  })

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

  test('keeps chunk references when a live canonical author-script state is supplied', () => {
    const state = shell()
    state.scriptChunks = {
      review: {
        version: 1,
        id: 'review',
        scripts: {
          nested: [{ kind: 'setAmbience', ambience: 'warm' }],
        },
      },
    }
    const canonicalState: ScriptEditorState = {
      scenes: [],
      items: [],
      sharedScripts: {},
    }

    expect(blockingAmbienceReferences(state, 'warm', canonicalState)).toEqual([
      expect.objectContaining({
        kind: 'set-ambience',
        where: 'scriptChunks["review"].scripts["nested"][0].ambience',
      }),
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
