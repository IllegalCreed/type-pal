import { type EntityPage, validateScenes } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { scene, unchanged } from './__tests__/scene-migration-fixtures.js'
import { mergeSceneScriptBindings } from './migrate-content.js'

const stage = (ms: number) => [{ body: [{ kind: 'wait' as const, ms }] }]
function pair(oldPages?: EntityPage[], newPages?: EntityPage[]) {
  const entity = { id: 'e1', zone: true as const, pos: { col: 1, row: 2, height: 0 } }
  return {
    disk: scene('s500', {
      music: null,
      entries: { home: { pos: { col: 3, row: 4, height: 0 } } },
      entities: [{ ...entity, collide: true, ...(oldPages ? { pages: oldPages } : {}) }],
      onEnter: stage(60),
      onTeleport: stage(90),
    }),
    fresh: scene('s500', {
      mapId: 'map-099',
      music: 'music.pal.009',
      entities: [
        { ...entity, pos: { col: 9, row: 9, height: 0 }, ...(newPages ? { pages: newPages } : {}) },
      ],
    }),
  }
}
const apply = (input: ReturnType<typeof pair>) =>
  unchanged(input, ({ disk, fresh }) => {
    const result = mergeSceneScriptBindings(disk, fresh)
    validateScenes([result])
    return result
  })
describe('current scene migration bindings', () => {
  test('script synchronization preserves authored metadata and replaces only the fresh script ports', () => {
    const input = pair(
      [
        {
          state: 7,
          trigger: { on: 'interact', range: 3, stages: stage(60) },
          auto: { stages: stage(90) },
        },
      ],
      [{ trigger: { on: 'touch', range: 0, stages: stage(180) }, auto: { stages: stage(240) } }],
    )
    input.fresh.onEnter = stage(300)
    input.fresh.onTeleport = stage(360)
    const expected = structuredClone(input.disk)
    expected.onEnter = stage(300)
    expected.onTeleport = stage(360)
    expected.entities[0]!.pages![0]!.trigger!.stages = stage(180)
    expected.entities[0]!.pages![0]!.auto = { stages: stage(240) }
    expect(apply(input)).toEqual(expected)
  })
  test('removing all ports drops empty pages but retains non-script page metadata', () => {
    const input = pair([
      { trigger: { on: 'interact', stages: stage(60) } },
      { state: 2, auto: { stages: stage(90) } },
    ])
    const result = apply(input)
    expect(result.entities[0]!.pages).toEqual([{ state: 2 }])
    expect(result.onEnter).toBeUndefined()
    expect(result.onTeleport).toBeUndefined()
    expect(apply(pair([{ auto: { stages: stage(60) } }])).entities[0]).not.toHaveProperty('pages')
  })
  test('new pages append beyond existing ones and newly introduced trigger keeps its fresh mode', () => {
    const pages: EntityPage[] = [
      { trigger: { on: 'touch', range: 2, stages: stage(60) } },
      { state: 3, auto: { stages: stage(90) } },
    ]
    expect(apply(pair([{ state: 1 }], pages)).entities[0]!.pages).toEqual([
      { state: 1, ...pages[0] },
      pages[1],
    ])
    expect(apply(pair(undefined, pages)).entities[0]!.pages).toEqual(pages)
    expect(apply(pair()).entities[0]).not.toHaveProperty('pages')
  })
  test('unmatched authored entities remain intact and migration does not add unrelated fresh entities', () => {
    const input = pair([{ auto: { stages: stage(60) } }])
    input.fresh.entities[0]!.id = 'e99'
    const expected = structuredClone(input.disk.entities)
    expect(apply(input).entities).toEqual(expected)
  })
})
