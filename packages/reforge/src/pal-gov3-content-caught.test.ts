import {
  buildEntityLifecycleReferenceIndex,
  validateCurrentManifestStartup,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import manifestJson from '../../../projects/pal/manifest.json' with { type: 'json' }
import { deriveEntityLifecycleGates } from './entity-lifecycle.js'
import caughtReceipt from './pal-gov3-content-caught-receipt.json' with { type: 'json' }
import { gov3Runtime, gov3Scene } from './pal-gov3-content-harness.js'
import { normalizeCurrentSave, preflightCurrentSave } from './save/current-codec.js'
import { buildCurrentSavePayload, buildMeta } from './save/ops.js'
import { MemorySaveStore } from './save/store.js'

test('捕获鹿茸后页16跨SAVE11保留，领取触发时只奖励一次并回到显式frame0', async () => {
  const run = gov3Runtime('s048', { near: true })
  await run.auto('e797')
  const capturedScript = run.world.script
  if (!capturedScript) throw new Error('missing script world')
  expect(capturedScript.behaviors.entities?.s048?.e796?.page).toBe('caught')
  const manifest = validateCurrentManifestStartup(manifestJson).manifest
  const store = new MemorySaveStore({ kind: 'project', projectId: manifest.id })
  await store.putSlot(
    buildMeta('m01', run.world, 's048', (c) => c.id, 1),
    buildCurrentSavePayload(
      run.world,
      { sceneId: 's048', pos: gov3Scene('s048').entry.pos, facing: 'down' },
      manifest.id,
    ),
    new Blob(),
  )
  const saved = await store.getPayload('m01')
  if (!saved) throw new Error('missing')
  const restored = normalizeCurrentSave(
    saved,
    await preflightCurrentSave({ manifest, payload: saved }),
    buildEntityLifecycleReferenceIndex((await import('./pal-gov3-content-harness.js')).gov3Scenes),
  ).world
  expect(restored.script?.behaviors.entities?.s048?.e796?.page).toBe('caught')
  const reward = gov3Runtime('s048', { eligible: true })
  if (!reward.world.script || !restored.script) throw new Error('missing restored script')
  Object.assign(reward.world.script, restored.script)
  await reward.activate('e796')
  expect(reward.world.inventory.find((item) => item.itemId === '283')?.count).toBe(1)
  expect(
    reward.effects.some(
      (effect) => effect.command.kind === 'setEntityFrame' && effect.command.frame === 0,
    ),
  ).toBe(true)
  expect(reward.world.script.entityState.s048?.e796).toBe(0)
  const deer = gov3Scene('s048').entities.find((entity) => entity.id === 'e796')
  if (!deer) throw new Error('missing deer')
  expect(
    deriveEntityLifecycleGates({
      staticHidden: deer.hidden,
      staticCollide: deer.collide,
      entityState: reward.world.script.entityState.s048?.e796,
      hasTrigger: true,
      triggerKind: 'manual',
    }).manualInteractable,
  ).toBe(false)
  expect(reward.world.inventory.find((item) => item.itemId === '283')?.count).toBe(1)
  expect(caughtReceipt.oldFrame16Hash).toHaveLength(64)
})
