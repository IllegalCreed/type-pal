import type { SceneDefV14, SharedScriptLibraryV14, StampTemplateV1 } from '@type-pal/content'
import {
  validateScenesV14,
  validateSharedScriptsV14,
  validateStampTemplates,
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
    const stamps: StampTemplateV1[] = []
    const result = withUiReviewSamples({ scenes, sharedScripts, stamps, tilesetId: 'tiles-a' })

    expect(scenes[0]?.hooks?.onEnter?.variants).not.toHaveProperty('ui-review-samples')
    expect(sharedScripts).toEqual({})
    expect(stamps).toEqual([])
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
  })

  test('preserves existing namespaced records and stays idempotent', () => {
    const existingScript: SharedScriptLibraryV14[string] = {
      name: '真实作者脚本',
      self: 'none',
      body: [],
    }
    const existingStamp: StampTemplateV1 = {
      id: 'ui-review-stone-path',
      name: '真实作者组合',
      tilesetId: 'tiles-a',
      origin: 'authored',
      layerSlots: [{ id: 'surface', name: '主体', depthMode: 'flat' }],
      visual: [{ layerSlotId: 'surface', offset: { dRow: 0, du: 0 }, tileId: 0, height: 0 }],
      collision: [],
    }
    const input = {
      scenes: [scene()],
      sharedScripts: { 'shared/ui-review/quest-start': existingScript },
      stamps: [existingStamp],
      tilesetId: 'tiles-a',
    }
    const once = withUiReviewSamples(input)
    const twice = withUiReviewSamples(once)

    expect(once.sharedScripts['shared/ui-review/quest-start']).toEqual(existingScript)
    expect(once.stamps.find((stamp) => stamp.id === existingStamp.id)).toEqual(existingStamp)
    expect(twice).toEqual(once)
  })

  test('leaves stamp samples empty when the project has no tileset', () => {
    const result = withUiReviewSamples({ scenes: [], sharedScripts: {}, stamps: [] })
    expect(result.stamps).toEqual([])
    expect(Object.keys(result.sharedScripts)).toHaveLength(3)
  })
})
