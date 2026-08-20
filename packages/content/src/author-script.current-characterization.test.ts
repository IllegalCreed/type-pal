import type { ActorDef } from './actor.js'
import { describe, expect, test } from 'vitest'
import {
  checkRuntimeCommands as checkAuthorCommands,
  checkRuntimeEntityBehaviors as checkEntityBehaviors,
  checkRuntimeEntityPages as checkEntityPages,
  checkRuntimeSceneHooks as checkSceneHooks,
  checkRuntimeScriptFlow as checkScriptFlow,
  checkRuntimeScriptLibrary as checkSharedScriptLibrary,
} from './runtime-script.js'
import {
  checkAuthorCommands as checkCurrentAuthorCommands,
  resolveAuthorDialogueTree as resolveDialogueTree,
} from './author-script.js'

const target = { scene: 's001', entity: 'e001' }

const actor: ActorDef = {
  id: 'actor.li',
  name: 'name.li',
  spriteId: 'sprite.li',
  portraits: {
    default: 'portrait.li.default',
    expressions: { angry: 'portrait.li.angry' },
  },
}

describe('current author-script contract before version-layer removal', () => {
  test('lifecycle vocabulary is recursive and vanishEntity is rejected everywhere', () => {
    const nested = [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'quest.open', is: true },
        then: [
          { kind: 'suspendEntity', target, ticks: 4 },
          { kind: 'hideEntity', target, ticks: 8 },
          { kind: 'restoreEntity', target },
          { kind: 'removeEntity', target },
        ],
      },
    ]
    expect(() => checkAuthorCommands(nested, 'commands')).not.toThrow()
    expect(() =>
      checkAuthorCommands(
        [
          {
            kind: 'startBattle',
            enemyTeamId: 'team-1',
            onFlee: [{ kind: 'vanishEntity' }],
          },
        ],
        'commands',
      ),
    ).toThrow(/禁止 vanishEntity/)
  })

  test('the same current command boundary covers flows, pages, hooks and shared scripts', () => {
    const flow = {
      kind: 'stages' as const,
      initial: 'start',
      stages: [{ id: 'start', body: [{ kind: 'hideEntity' as const, target, ticks: 8 }] }],
    }
    const behaviors = { trigger: { talk: { label: 'talk', order: 0, flow } } }
    expect(() => checkScriptFlow(flow, 'flow')).not.toThrow()
    expect(() => checkEntityBehaviors(behaviors, 'behaviors')).not.toThrow()
    expect(() =>
      checkEntityPages(
        [{ id: 'default', label: 'default', trigger: 'talk' }],
        behaviors,
        'default',
        'entity',
      ),
    ).not.toThrow()
    expect(() =>
      checkSceneHooks(
        { onEnter: { initial: 'intro', variants: { intro: { label: 'intro', order: 0, flow } } } },
        'hooks',
      ),
    ).not.toThrow()
    expect(() =>
      checkSharedScriptLibrary({ shared: { name: 'shared', self: 'none', body: flow.stages[0]!.body } }),
    ).not.toThrow()
  })

  test('author dialogue identity validates once and resolves to the runtime cue once', () => {
    const commands = [
      {
        kind: 'dialog' as const,
        cue: {
          identity: {
            kind: 'actor' as const,
            actor: actor.id,
            speakerOverride: 'title.hero',
            portrait: { kind: 'expression' as const, expression: 'angry', side: 'left' as const },
          },
          rows: [{ text: 'line.hello', speed: 24 }],
        },
      },
      {
        kind: 'dialog' as const,
        cue: {
          identity: {
            kind: 'unbound' as const,
            speaker: 'speaker.shopkeeper',
            portrait: { asset: 'portrait.shopkeeper', side: 'right' as const },
          },
          rows: [{ text: 'line.shopkeeper' }],
        },
      },
    ]
    expect(() => checkCurrentAuthorCommands(commands, 'commands')).not.toThrow()
    expect(resolveDialogueTree(commands, { [actor.id]: actor })).toEqual([
      {
        kind: 'dialog',
        cue: {
          speaker: 'title.hero',
          portrait: { asset: 'portrait.li.angry', side: 'left' },
          rows: [{ text: 'line.hello', speed: 24 }],
        },
      },
      {
        kind: 'dialog',
        cue: {
          speaker: 'speaker.shopkeeper',
          portrait: { asset: 'portrait.shopkeeper', side: 'right' },
          rows: [{ text: 'line.shopkeeper' }],
        },
      },
    ])
  })

  test('dialogue identity fails closed instead of falling back to global assets', () => {
    expect(() =>
      resolveDialogueTree(
        [
          {
            kind: 'dialog',
            cue: {
              identity: {
                kind: 'actor',
                actor: actor.id,
                portrait: { kind: 'expression', expression: 'missing', side: 'left' },
              },
              rows: [{ text: 'line' }],
            },
          },
        ],
        { [actor.id]: actor },
      ),
    ).toThrow(/缺表情 "missing"/)
  })
})
