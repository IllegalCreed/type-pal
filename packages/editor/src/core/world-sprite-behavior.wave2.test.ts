/** C01/C02: canonical-only input, exact lowering, independent instance sites and actual-input isolation. */
import { type AuthorCommand, type AuthorScriptFlow, checkAuthorScriptFlow } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  currentFlow,
  guardedLibrary,
  spriteFixture,
} from '../__tests__/coverage-wave2/c-sprite-canonical.js'
import {
  collectAutomaticScriptSpriteDefinitionIds,
  collectAutomaticScriptSpriteInstanceSites,
  projectCanonicalScriptFlowPreview,
  projectCanonicalSharedScriptPreviewChunk,
  projectCanonicalSpritePreviewState,
  SCRIPT_PREVIEW_SHARED_CHUNK,
} from './world-sprite-behavior.js'

const target = { scene: 's1', entity: 'a' }
test('canonical projection lowers retained entity leaves with full arguments and detaches the real author input', () => {
  const commands: AuthorCommand[] = [
    { kind: 'setEntityState', target, state: 0 },
    { kind: 'setMultiEntityState', targets: [target, { scene: 's1', entity: 'b' }], state: 2 },
    { kind: 'setEntityPos', target, pos: { col: 1, row: 2, height: 3 } },
    { kind: 'setEntityPosRelParty', target, dcol: 1, drow: -2 },
    { kind: 'setEntityLayer', target, layer: 4 },
    { kind: 'setEntityFacing', target, facing: 'left' },
    {
      kind: 'playEntityAction',
      target,
      sprite: 'sprite.same',
      action: 'idle',
      loop: false,
      startAtMs: 0,
      wait: false,
    },
    { kind: 'stopEntityAction', target, reset: false },
    { kind: 'stepEntity', target, dir: 'up' },
    { kind: 'animEntity', target },
    { kind: 'nudgeEntity', target, dx: 1, dy: -1 },
    { kind: 'takeEntity', target },
    { kind: 'releaseEntity', target },
    { kind: 'releaseEntity' },
    { kind: 'mountParty', target, dx: 0, dy: 1 },
    { kind: 'ride', target, to: { col: 3, row: 4, height: 0 }, speed: 'fast' },
  ]
  const input = currentFlow(commands),
    before = structuredClone(input)
  const output = projectCanonicalScriptFlowPreview(input, target, {})
  expect(output).toEqual([
    {
      body: [
        { kind: 'setEntityState', entity: 'a', state: 0 },
        { kind: 'setMultiEntityState', entities: ['a', 'b'], state: 2 },
        { kind: 'setEntityPos', entity: 'a', pos: { col: 1, row: 2, height: 3 } },
        { kind: 'setEntityPosRelParty', entity: 'a', dcol: 1, drow: -2 },
        { kind: 'setEntityLayer', entity: 'a', layer: 4 },
        { kind: 'setEntityFacing', entity: 'a', facing: 'left' },
        {
          kind: 'playEntityAction',
          entity: 'a',
          sprite: 'sprite.same',
          action: 'idle',
          loop: false,
          startAtMs: 0,
          wait: false,
        },
        { kind: 'stopEntityAction', entity: 'a', reset: false },
        { kind: 'stepEntity', entity: 'a', dir: 'up' },
        { kind: 'animEntity', entity: 'a' },
        { kind: 'nudgeEntity', entity: 'a', dx: 1, dy: -1 },
        { kind: 'takeEntity', entity: 'a' },
        { kind: 'releaseEntity', entity: 'a' },
        { kind: 'releaseEntity' },
        { kind: 'mountParty', entity: 'a', dx: 0, dy: 1 },
        { kind: 'ride', entity: 'a', to: { col: 3, row: 4, height: 0 }, speed: 'fast' },
      ],
    },
  ])
  const position = output[0]!.body[2]!
  if (position.kind !== 'setEntityPos') throw new Error('expected position output')
  position.pos.col = 999
  expect(input).toEqual(before)
})
test('nested conditions and until/while previews retain conditionality rather than inventing an unconditional loop', () => {
  const input = currentFlow([
    {
      kind: 'loop',
      mode: 'until',
      yield: 'worldTick',
      maxIterations: 3,
      cond: { kind: 'flag', flag: 'stop', is: true },
      body: [{ kind: 'wait', ms: 5 }],
    },
    {
      kind: 'loop',
      mode: 'while',
      yield: 'worldTick',
      maxIterations: 3,
      cond: {
        kind: 'not',
        cond: {
          kind: 'any',
          of: [
            { kind: 'entityInScene', target },
            { kind: 'facingEntity', target, range: 0 },
          ],
        },
      },
      body: [{ kind: 'setEntityFrame', target, frame: 1 }],
    },
  ])
  const before = structuredClone(input)
  expect(projectCanonicalScriptFlowPreview(input, target, {})).toEqual([
    {
      body: [
        { kind: 'wait', ms: 5 },
        {
          kind: 'branch',
          cond: {
            kind: 'not',
            cond: {
              kind: 'any',
              of: [
                { kind: 'entityInScene', entity: 'a' },
                { kind: 'facingEntity', entity: 'a', range: 0 },
              ],
            },
          },
          then: [{ kind: 'setEntityFrame', entity: 'a', frame: 1 }],
        },
      ],
    },
  ])
  expect(input).toEqual(before)
})
test('shared calls lower only when self is compatible; missing or foreign-self calls remain explicit unsupported input', () => {
  const shared = guardedLibrary({
    sub: { name: 'Sub', self: 'optional', body: [{ kind: 'wait', ms: 1 }] },
  })
  const input = currentFlow([
    { kind: 'callScript', script: 'sub' },
    { kind: 'callScript', script: 'sub', self: target },
    { kind: 'callScript', script: 'sub', self: { scene: 'other', entity: 'a' } },
    { kind: 'callScript', script: 'missing' },
  ])
  const before = structuredClone({ input, shared })
  expect(projectCanonicalScriptFlowPreview(input, target, shared)).toEqual([
    {
      body: [
        { kind: 'callScript', ref: { chunk: SCRIPT_PREVIEW_SHARED_CHUNK, id: 'sub' } },
        { kind: 'callScript', ref: { chunk: SCRIPT_PREVIEW_SHARED_CHUNK, id: 'sub' }, self: 'a' },
        { kind: 'callScript', script: 'sub', self: { scene: 'other', entity: 'a' } },
        { kind: 'callScript', script: 'missing' },
      ],
    },
  ])
  expect(projectCanonicalSharedScriptPreviewChunk(shared)).toEqual({
    version: 1,
    id: SCRIPT_PREVIEW_SHARED_CHUNK,
    scripts: { sub: [{ kind: 'wait', ms: 1 }] },
  })
  expect({ input, shared }).toEqual(before)
})
test('state machine preview starts at the named initial state and maps restart/to to explicit indices', () => {
  const flow: AuthorScriptFlow = {
    kind: 'stateMachine',
    machine: {
      id: 'machine',
      label: 'Machine',
      initial: 'second',
      states: {
        first: { label: 'First', body: [{ kind: 'wait', ms: 1 }], next: { kind: 'restart' } },
        second: {
          label: 'Second',
          body: [{ kind: 'wait', ms: 2 }],
          next: { kind: 'to', state: 'first', yield: 'worldTick' },
        },
      },
    },
  }
  checkAuthorScriptFlow(flow, 'fixture.flow')
  const before = structuredClone(flow)
  expect(projectCanonicalScriptFlowPreview(flow, target, {})).toEqual([
    { body: [{ kind: 'wait', ms: 2 }], next: 1 },
    { body: [{ kind: 'wait', ms: 1 }], next: 0 },
  ])
  expect(flow).toEqual(before)
})
test('same sprite used by two auto instances yields two exact sites after canonical projection', async () => {
  const { shell, canonical } = await spriteFixture(),
    before = structuredClone({ shell, canonical })
  const output = projectCanonicalSpritePreviewState(shell, canonical)
  expect(collectAutomaticScriptSpriteInstanceSites(output)).toEqual([
    {
      spriteId: 'sprite.same',
      sceneId: 's1',
      entityId: 'a',
      site: 'scene:s1:entity:a',
      where: 'scenes[0].entities[0].sprite',
      via: 'direct',
    },
    {
      spriteId: 'sprite.same',
      sceneId: 's1',
      entityId: 'b',
      site: 'scene:s1:entity:b',
      where: 'scenes[0].entities[1].sprite',
      via: 'direct',
    },
  ])
  expect([...collectAutomaticScriptSpriteDefinitionIds(output)]).toEqual(['sprite.same'])
  expect(output.scenes[0]!.entities.map((entity) => entity.pages?.[0]?.auto?.stages)).toEqual([
    [{ body: [{ kind: 'setEntityFrame', entity: 'a', frame: 1 }] }],
    [{ body: [{ kind: 'setEntityFrame', entity: 'b', frame: 2 }] }],
  ])
  expect(output.scenes[0]!.entities[0]!.pages).not.toBe(output.scenes[0]!.entities[1]!.pages)
  expect({ shell, canonical }).toEqual(before)
})
