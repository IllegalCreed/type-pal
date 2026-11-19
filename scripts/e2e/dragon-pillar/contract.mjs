import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { openWorkflow, root } from '../../workflow/open.mjs'

export const fragment = 'dragon-pillar'
export const card = 'docs/tasks/cards/E2E-PILLAR-CINEMATIC-1.md'
export const party = ['zhao-linger', 'li-xiaoyao', 'lin-yueru']
export const gallery = Array.from({ length: 8 }, (_, i) => `e${2456 + i}`)
export const turns = [24820, 24822, 24825, 24827, 24829, 24832, 24834, 24836]
export const scope =
  '原生 s144/e2390 六柱已毁的起战前存档，到 s150 剑圣首句实绘；不接正式前驱或终档'

const scene = async (id) =>
  JSON.parse(await readFile(resolve(root, 'projects/pal/content/scenes', `${id}.json`), 'utf8'))

/** Only this bounded fragment uses a native fixed situation. Its timing and cast obligations
 * are named before the browser starts and are independently demanded by the offline oracle. */
export async function admitPillarCapture() {
  const { receipt } = await openWorkflow(['task', 'e2e', 'test', 'reforge'], card)
  const [gate, corridor, cliff] = await Promise.all(['s144', 's149', 's150'].map(scene))
  assert(gate.entities.find(({ id }) => id === 'e2390')?.behaviors.trigger)
  assert(gallery.every((id) => corridor.entities.some((actor) => actor.id === id)))
  const cliffActors = ['e2464', 'e2465', 'e2466']
  assert(
    cliffActors.every((id) => cliff.entities.some((actor) => actor.id === id)),
    '缺雪崖主要角色或待藏替身',
  )
  return {
    workflow: receipt,
    scope,
    fragment,
    party,
    gallery,
    films: [5, 2],
    cliff: cliffActors,
  }
}
