import { type Command, type SceneDef, validateScenes } from '@type-pal/content'
import { expect } from 'vitest'
import {
  mapScenesStatic,
  type SceneMigrationOptions,
  type SourceEventObject,
  type SourceScene,
} from '../migrate-content.js'
import type { SourceCmd } from '../source-facts.js'

export { raw, unchanged } from './pure-migration-fixtures.js'

export function sourceScene(overrides: Partial<SourceScene> = {}): SourceScene {
  return { sceneId: 500, mapNum: 1, eventObjects: [], ...overrides }
}
export function eventObject(overrides: Partial<SourceEventObject> = {}): SourceEventObject {
  return { id: 1, x: 32, y: 16, spriteNum: 42, nSpriteFrames: 3, ...overrides }
}
export function load(sceneId: number): SourceCmd & { sceneId: number } {
  return { op: 'loadScene', sceneId }
}
export function migrate(
  scenes: SourceScene[],
  events = new Map<number, SourceCmd[]>(),
  options: SceneMigrationOptions = {},
) {
  const input = { scenes, events, options }
  const before = structuredClone(input)
  const result = mapScenesStatic(scenes, events, new Map(), [], undefined, {
    ...options,
    palSemanticProfile: 'current-r13-6b',
    palReferenceSchema: 'stable-id',
  })
  expect(input).toEqual(before)
  // This is the migration-stage SceneDef guard, not the author/runtime loader.
  expect(validateScenes(result.scenes)).toEqual(result.scenes)
  return result
}
export function scene(id = 's500', overrides: Partial<SceneDef> = {}): SceneDef {
  const value: SceneDef = {
    id,
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    ...overrides,
  }
  validateScenes([value])
  return value
}
/** Fail loud on absent bodies; follow actual public chunk references, not mirrored translation. */
export function body(result: ReturnType<typeof migrate>, commands: readonly Command[]): Command[] {
  return commands.flatMap((command) => {
    if (command.kind !== 'callScript' && command.kind !== 'jumpScript') return [command]
    const next = result.scriptChunks[command.ref.chunk]?.scripts[command.ref.id]
    expect(next, command.ref.id).toBeDefined()
    return body(result, next!)
  })
}
