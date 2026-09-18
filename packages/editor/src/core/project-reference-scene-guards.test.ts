import type { AuthorCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  ownerKinds,
  sceneGuardFixture,
  sceneReferences,
  sourceScene,
  stageFlow,
  targetScene,
  transitionFlow,
} from './__tests__/scene-reference-fixture.js'

describe('scene dependency guard: canonical command owners', () => {
  test.each(
    ownerKinds,
  )('%s retains inherit/disabled scene dependency with exact source', async (kind) => {
    const command: AuthorCommand = {
      kind: 'selectSceneHooks',
      scene: 'target',
      selection: { onEnter: { kind: 'disabled' }, onTeleport: { kind: 'inherit' } },
    }
    const f = await sceneGuardFixture(stageFlow([command]), kind)
    const before = structuredClone({ main: f.main.getState(), script: f.script.getStateSnapshot() })
    const commandPath = `${f.path}${kind === 'shared' || kind === 'item' ? '' : '.stages.initial'}.body[0]`
    const edges = sceneReferences(f.cold())
    expect(
      edges.map(({ target, where, relation, locator, source, deletePolicy }) => ({
        target,
        where,
        relation,
        locator,
        owner: source.owner,
        deletePolicy,
      })),
    ).toEqual([
      {
        target: targetScene,
        where: `${commandPath}.scene`,
        relation: { kind: 'command-target', use: 'select-scene-hooks' },
        locator: {
          kind: 'canonical-script',
          reference: {
            kind: 'command',
            path: commandPath,
            locator: {
              kind: 'command',
              owner: f.owner,
              container:
                kind === 'shared' || kind === 'item'
                  ? { kind: 'body' }
                  : { kind: 'step', stepId: 'initial', section: 'body' },
              commandPath: '0',
            },
          },
        },
        owner: { kind: 'script-owner', owner: f.owner },
        deletePolicy: 'replace-suggest',
      },
    ])
    expect(sceneReferences(f.warm())).toEqual(edges)
    expect({ main: f.main.getState(), script: f.script.getStateSnapshot() }).toEqual(before)
  })

  test.each([
    {
      label: 'one use plus disabled',
      selection: { onEnter: { kind: 'use', value: 'main' }, onTeleport: { kind: 'disabled' } },
      slots: ['onEnter'],
    },
    {
      label: 'two real use hooks',
      selection: {
        onEnter: { kind: 'use', value: 'main' },
        onTeleport: { kind: 'use', value: 'main' },
      },
      slots: ['onEnter', 'onTeleport'],
    },
  ] as const)('$label keeps each existing composite edge once in the parent scene bucket', async ({
    selection,
    slots,
  }) => {
    const f = await sceneGuardFixture(
      stageFlow([{ kind: 'selectSceneHooks', scene: 'target', selection }]),
    )
    const index = f.cold()
    const edges = sceneReferences(index)
    expect(edges.map((edge) => ({ target: edge.target, relation: edge.relation }))).toEqual(
      slots.map((slot) => ({
        target: { kind: 'scene-hook', sceneId: 'target', slot, hookId: 'main' },
        relation: { kind: 'scene-hook-reference', use: 'select-hook' },
      })),
    )
    for (const edge of edges)
      expect(index.referencesTo(edge.target).map((entry) => entry.id)).toContain(edge.id)
    expect(sceneReferences(f.warm())).toEqual(edges)
  })
})

describe('scene dependency guard: state-machine transition roots', () => {
  test.each([
    'onEnter',
    'onTeleport',
    'trigger',
    'auto',
  ] as const)('%s collects all/any/not and nested transitions once, not command bodies', async (kind) => {
    const flow = transitionFlow(true)
    if (flow.kind !== 'stateMachine') throw new Error('fixture flow')
    flow.machine.states.one!.body = [
      { kind: 'branch', cond: { kind: 'currentScene', scene: 'target' }, then: [] },
    ]
    const f = await sceneGuardFixture(flow, kind)
    const edges = sceneReferences(f.cold())
    const transitions = edges.filter((edge) => edge.locator.kind === 'script-owner')
    const root = `${f.path}.machine.states.one.next`
    expect(
      transitions.map(({ target, where, relation, locator, source, deletePolicy }) => ({
        target,
        where,
        relation,
        locator,
        owner: source.owner,
        deletePolicy,
      })),
    ).toEqual(
      [
        `${root}.cond.of[0].scene`,
        `${root}.cond.of[1].of[0].cond.scene`,
        `${root}.then.cond.scene`,
      ].map((where) => ({
        target: targetScene,
        where,
        relation: { kind: 'command-target', use: 'condition-current-scene' },
        locator: { kind: 'script-owner', owner: f.owner },
        owner: { kind: 'script-owner', owner: f.owner },
        deletePolicy: 'replace-suggest',
      })),
    )
    expect(edges).toHaveLength(4)
    expect(
      edges.filter((edge) => edge.locator.kind === 'canonical-script').map((edge) => edge.where),
    ).toEqual([`${f.path}.machine.states.one.body[0].cond.scene`])
    expect(sceneReferences(f.warm())).toEqual(edges)
    expect(
      f.cold().deletionImpact(targetScene, f.cold().deletionScopeFor([sourceScene, targetScene]))
        .blockers,
    ).toEqual([])
    expect(
      f.cold().deletionImpact(targetScene, f.cold().deletionScopeFor([targetScene])).blockers,
    ).toHaveLength(4)
  })
})
