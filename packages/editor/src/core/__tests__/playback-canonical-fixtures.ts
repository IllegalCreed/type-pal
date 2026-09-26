import {
  type AuthorCommand,
  type AuthorSceneDef,
  type AuthorScriptFlow,
  type AuthorScriptLibrary,
  checkAuthorScriptFlow,
  checkAuthorScriptLibrary,
  validateAuthorScenes,
  validateScenes,
} from '@type-pal/content'
import { afterEach, expect } from 'vitest'
import { Playback } from '../playback.js'

const live: Playback[] = []
/** A task checkpoint drains finite runner microtasks without advancing playback time. */
export async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}
afterEach(async () => {
  for (const p of live.splice(0)) p.stop()
  await settle()
})

export const target = { scene: 'preview-room', entity: 'npc' }
export function flowOf(body: AuthorCommand[]): AuthorScriptFlow {
  return { kind: 'stages', initial: 'main', stages: [{ id: 'main', body }] }
}
export function dialogue(text = 'preview.question'): AuthorCommand {
  return { kind: 'dialog', cue: { identity: { kind: 'narration' }, rows: [{ text }] } }
}

export function preview() {
  // Same minimal current scene shape consumed by SceneScriptWorkspace; no old stages/pages.
  const scene = {
    id: 'preview-room',
    mapId: 'map.preview',
    entry: { pos: { col: 0, row: 0, height: 2 }, facing: 'down' as const },
    entities: [
      { id: 'npc', sprite: 'hero', pos: { col: 2, row: 3, height: 4 }, facing: 'left' as const },
      { id: 'other', sprite: 'hero', pos: { col: 7, row: 8, height: 1 }, facing: 'up' as const },
    ],
  }
  const authorScene: AuthorSceneDef = structuredClone(scene)
  validateAuthorScenes([authorScene])
  validateScenes([scene])
  const p = new Playback(scene, undefined, new Map([['potion', '药草']]))
  live.push(p)
  const originals: Array<() => void> = []
  const sceneBefore = structuredClone(scene),
    authorBefore = structuredClone(authorScene)
  function unchanged() {
    expect(scene).toEqual(sceneBefore)
    expect(authorScene).toEqual(authorBefore)
    for (const check of originals) check()
  }
  async function start(
    flow: AuthorScriptFlow,
    options: Partial<Parameters<Playback['playCanonical']>[2]> = {},
  ) {
    const shared: AuthorScriptLibrary = options.sharedScripts ?? {}
    checkAuthorScriptFlow(flow, 'test.flow', { allowSceneEntry: options.allowSceneEntry })
    checkAuthorScriptLibrary(shared)
    const flowBefore = structuredClone(flow),
      sharedBefore = structuredClone(shared)
    originals.push(() => {
      expect(flow).toEqual(flowBefore)
      expect(shared).toEqual(sharedBefore)
    })
    p.playCanonical('canonical:coverage', flow, {
      scene: authorScene,
      sharedScripts: shared,
      actorsById: {},
      ...options,
    })
    await settle()
    unchanged()
  }
  async function run(body: AuthorCommand[]) {
    await start(flowOf(body))
    expect(p.mode).toBe('done')
    expect(p.activePath).toBeNull()
    expect(p.view.logs.filter((line) => line.startsWith('⚠'))).toEqual([])
    unchanged()
  }
  return { p, scene, authorScene, start, run, unchanged }
}
