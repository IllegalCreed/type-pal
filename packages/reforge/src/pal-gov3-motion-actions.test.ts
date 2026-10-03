import { validateAuthorScenes, validateSceneIndex, validateSprites } from '@type-pal/content'
import { expect, test } from 'vitest'
import indexJson from '../../../projects/pal/content/scenes/index.json' with { type: 'json' }
import spritesJson from '../../../projects/pal/content/sprites.json' with { type: 'json' }
import { EntityActionPlayer, resolveSpriteActionBinding } from './entity-action-player.js'
import evidence from './pal-gov3-motion-actions.json' with { type: 'json' }

const modules = import.meta.glob<unknown>('../../../projects/pal/content/scenes/*.json', {
  eager: true,
  import: 'default',
})
const scenes = validateAuthorScenes(
  validateSceneIndex(indexJson).scenes.map((entry) => {
    const value = modules[`../../../projects/pal/${entry.path}`]
    if (!value) throw new Error(`missing scene ${entry.id}`)
    return value
  }),
)
const sprites = new Map(validateSprites(spritesJson).map((sprite) => [sprite.id, sprite]))

function binding(key: string) {
  const [sceneId, entityId, pageId] = key.split('/')
  const page = scenes
    .find((scene) => scene.id === sceneId)
    ?.entities.find((entity) => entity.id === entityId)
    ?.pages?.find((page) => page.id === pageId)
  if (!page?.animation) throw new Error(`missing animation ${key}`)
  return page.animation
}

const changed = evidence.actions.flatMap((action) =>
  action.bindings.map((binding) => ({ ...binding, spriteId: action.sprite })),
)
test.each(changed)('$key uses complete source frame intervals through two cycles', (row) => {
  const value = binding(row.key)
  const sprite = sprites.get(row.spriteId)
  if (!sprite) throw new Error(`missing sprite ${row.spriteId}`)
  const player = new EntityActionPlayer()
  player.setBase('entity', resolveSpriteActionBinding(sprite, value))
  const expected = (time: number) => {
    let frame: number | undefined
    for (const point of row.expectedFrameChanges) if (point.at <= time) frame = point.frame
    return frame
  }
  for (let time = 0; time <= row.horizon; time += 100) {
    if (time > 0) player.advance(100)
    expect(player.frame('entity'), `${row.key} at ${time}ms`).toBe(expected(time))
  }
})

test('the blacksmith cue remains on its strike frame at the verified 1700ms cycle', () => {
  const sprite = sprites.get('sprite-96')
  const action = evidence.actions.find((action) => action.sprite === 'sprite-96')
  if (!sprite || !action) throw new Error('missing blacksmith action')
  let time = 0
  const cues: { at: number; asset: string }[] = []
  const player = new EntityActionPlayer((_entity, cue) => cues.push({ at: time, asset: cue.asset }))
  player.setBase('blacksmith', resolveSpriteActionBinding(sprite, binding(action.bindings[0]!.key)))
  for (time = 100; time <= 4500; time += 100) player.advance(100)
  expect(cues).toEqual([
    { at: 1000, asset: 'sound.pal.135' },
    { at: 2700, asset: 'sound.pal.135' },
    { at: 4400, asset: 'sound.pal.135' },
  ])
})

test('all 286 period-correct bindings retain their authored phase and loop choice', () => {
  expect(evidence.unchanged).toHaveLength(286)
  for (const row of evidence.unchanged) expect(binding(row.key), row.key).toEqual(row.binding)
})
