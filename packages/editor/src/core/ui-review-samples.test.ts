import type { SceneDefV14, SharedScriptLibraryV14, StampTemplate } from '@type-pal/content'
import {
  validateScenesV14,
  validateSharedScriptsV14,
  validateStampTemplates,
  validateWorldVariableRegistryV1,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildRefIndex } from './ref-index.js'
import { withUiReviewSamples } from './ui-review-samples.js'

function scene(): SceneDefV14 {
  return {
    id: 'scene-a',
    mapId: 'map-a',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    hooks: {
      onEnter: {
        initial: 'default',
        variants: {
          default: {
            label: '默认进场',
            order: 0,
            flow: { kind: 'stages', initial: 'start', stages: [{ id: 'start', body: [] }] },
          },
        },
      },
    },
    entities: [],
  }
}

describe('withUiReviewSamples', () => {
  test('adds valid review data without mutating the loaded project and feeds the real variable index', () => {
    const scenes = [scene()]
    const sharedScripts: SharedScriptLibraryV14 = {}
    const stamps: StampTemplate[] = []
    const worldVariables = {}
    const result = withUiReviewSamples({
      scenes,
      sharedScripts,
      stamps,
      worldVariables,
      tilesetId: 'tiles-a',
    })

    expect(scenes[0]?.hooks?.onEnter?.variants).not.toHaveProperty('ui-review-samples')
    expect(sharedScripts).toEqual({})
    expect(stamps).toEqual([])
    expect(worldVariables).toEqual({})
    expect(Object.keys(result.sharedScripts)).toHaveLength(3)
    expect(result.stamps).toHaveLength(6)
    expect(result.scenes[0]?.hooks?.onEnter?.initial).toBe('default')
    expect(result.scenes[0]?.hooks?.onEnter?.variants).toHaveProperty('ui-review-samples')

    const refs = buildRefIndex(result.scenes)
    expect([...refs.flags.keys()]).toEqual(['review.chapter.opened', 'review.quest.rewarded'])
    expect([...refs.vars.keys()]).toEqual(['review.chapter.progress', 'review.reputation'])
    expect(validateScenesV14(result.scenes)).toHaveLength(1)
    expect(validateSharedScriptsV14(result.sharedScripts)).toEqual(result.sharedScripts)
    expect(validateStampTemplates(result.stamps)).toEqual(result.stamps)
    expect(validateWorldVariableRegistryV1(result.worldVariables)).toEqual(result.worldVariables)
    expect(Object.keys(result.worldVariables)).toHaveLength(7)
  })

  test('preserves existing namespaced records and stays idempotent', () => {
    const existingScript: SharedScriptLibraryV14[string] = {
      name: '真实作者脚本',
      self: 'none',
      body: [],
    }
    const existingStamp: StampTemplate = {
      id: 'ui-review-stone-path',
      name: '真实作者组合',
      origin: 'authored',
      width: 1,
      height: 1,
      anchor: { row: 0, col: 0 },
      tilesetRefs: ['tiles-a'],
      layers: [{ id: 'surface', name: '主体', tiles: [[0], [null]], sources: [[0], [null]] }],
      collision: [[null], [null]],
    }
    const input = {
      scenes: [scene()],
      sharedScripts: { 'shared/ui-review/quest-start': existingScript },
      stamps: [existingStamp],
      worldVariables: {
        'review.quest.started': {
          kind: 'flag' as const,
          name: '真实作者变量',
          description: '',
          initial: true,
        },
      },
      tilesetId: 'tiles-a',
    }
    const once = withUiReviewSamples(input)
    const twice = withUiReviewSamples(once)

    expect(once.sharedScripts['shared/ui-review/quest-start']).toEqual(existingScript)
    expect(once.stamps.find((stamp) => stamp.id === existingStamp.id)).toEqual(existingStamp)
    expect(once.worldVariables['review.quest.started']?.name).toBe('真实作者变量')
    expect(twice).toEqual(once)
  })

  test('leaves stamp samples empty when the project has no tileset', () => {
    const result = withUiReviewSamples({
      scenes: [],
      sharedScripts: {},
      stamps: [],
      worldVariables: {},
    })
    expect(result.stamps).toEqual([])
    expect(Object.keys(result.sharedScripts)).toHaveLength(3)
  })
})
