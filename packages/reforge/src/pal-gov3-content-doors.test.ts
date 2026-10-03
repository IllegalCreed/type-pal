import {
  buildEntityLifecycleReferenceIndex,
  validateCurrentManifestStartup,
  validateSprites,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import spritesJson from '../../../projects/pal/content/sprites.json' with { type: 'json' }
import manifestJson from '../../../projects/pal/manifest.json' with { type: 'json' }
import { EntityActionPlayer, resolveSpriteActionBinding } from './entity-action-player.js'
import { gov3Runtime, gov3Scene, gov3Scenes } from './pal-gov3-content-harness.js'
import { normalizeCurrentSave, preflightCurrentSave } from './save/current-codec.js'
import { buildCurrentSavePayload, buildMeta } from './save/ops.js'
import { MemorySaveStore } from './save/store.js'

const cases = [
  ...['e70', 'e71'].map((entity) => ({ scene: 's003', entity, frame: 1 })),
  ...Array.from({ length: 8 }, (_, i) => ({ scene: 's093', entity: `e${1749 + i}`, frame: 1 })),
  { scene: 's047', entity: 'e757', frame: 3 },
]
const manifest = validateCurrentManifestStartup(manifestJson).manifest
const sprites = new Map(validateSprites(spritesJson).map((sprite) => [sprite.id, sprite]))

for (const entry of cases)
  test(`${entry.scene}/${entry.entity} 打开后SAVE11及重新建立页播放器均保持帧${entry.frame}`, async () => {
    const run = gov3Runtime(entry.scene)
    if (entry.entity === 'e757') await run.install(entry.entity, 'c8-602d89c238c1')
    expect(await run.activate(entry.entity)).toBe(true)
    const entity = gov3Scene(entry.scene).entities.find((e) => e.id === entry.entity)
    if (!entity || !('sprite' in entity)) throw new Error('door missing')
    const doorScript = run.world.script
    if (!doorScript) throw new Error('missing script world')
    expect(doorScript.behaviors.entities?.[entry.scene]?.[entry.entity]?.page).toBe('open')
    expect(doorScript.entityState[entry.scene]?.[entry.entity]).toBe(1)
    const page = entity.pages?.find((p) => p.id === 'open'),
      sprite = sprites.get(entity.sprite)
    if (!page?.animation || !sprite) throw new Error('persistent door action missing')
    const player = new EntityActionPlayer()
    player.setBase(entry.entity, resolveSpriteActionBinding(sprite, page.animation))
    player.advance(6000)
    expect(player.frame(entry.entity)).toBe(entry.frame)
    const store = new MemorySaveStore({ kind: 'project', projectId: manifest.id })
    const payload = buildCurrentSavePayload(
      run.world,
      { sceneId: entry.scene, pos: gov3Scene(entry.scene).entry.pos, facing: 'down' },
      manifest.id,
    )
    await store.putSlot(
      buildMeta('m01', run.world, entry.scene, (c) => c.id, 1),
      payload,
      new Blob(),
    )
    const saved = await store.getPayload('m01')
    if (!saved) throw new Error('missing saved door')
    expect(saved.version).toBe(11)
    const restored = normalizeCurrentSave(
      saved,
      await preflightCurrentSave({ manifest, payload: saved }),
      buildEntityLifecycleReferenceIndex(gov3Scenes),
    ).world
    expect(restored.script?.behaviors.entities?.[entry.scene]?.[entry.entity]?.page).toBe('open')
    const fresh = new EntityActionPlayer()
    fresh.setBase(entry.entity, resolveSpriteActionBinding(sprite, page.animation))
    expect(fresh.frame(entry.entity)).toBe(entry.frame)
    if (entry.entity === 'e757')
      expect(run.effects.filter((e) => e.command.kind === 'wait').map((e) => e.command)).toEqual([
        { kind: 'wait', ms: 200 },
        { kind: 'wait', ms: 200 },
      ])
  })
