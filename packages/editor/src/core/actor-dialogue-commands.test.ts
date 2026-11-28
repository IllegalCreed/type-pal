import {
  type AuthorCommand,
  validateAuthorEnemies,
  validateAuthorItems,
  validateAuthorScenes,
  validateAuthorSharedScripts,
} from '@type-pal/content'
import { loadCurrentProjectFrom } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import {
  loadBoundaryProject,
  withSharedEnemyBattleSprite,
} from './__tests__/cursor-command-boundary-fixtures.js'
import { mkEnemy } from './__tests__/glm-state-commands-b.js'
import { originalPortrait, pngBytes } from './__tests__/portrait-bytes.js'
import { AddActorCommand, UpdateActorCommand } from './actor-commands.js'
import {
  RemoveActorPortraitExpressionCommand,
  RemoveActorPortraitSetCommand,
  RenameActorPortraitExpressionCommand,
} from './actor-dialogue-commands.js'
import { collectEditorDialoguePortraitReferences } from './actor-references.js'
import { UpsertAssetCommand } from './asset-commands.js'
import { sha256Hex } from './binary-signature.js'
import { EditSession } from './edit-session.js'
import { UpdateLocaleCommand } from './locale-commands.js'
import { assertProjectSaveValid } from './project-diagnostics.js'
import { toEditorState } from './project-io.js'

const portraitId = 'portrait.park'

function expressionCue(actor: string, expression: string) {
  return {
    kind: 'dialog' as const,
    cue: {
      identity: {
        kind: 'actor' as const,
        actor,
        portrait: { kind: 'expression' as const, expression, side: 'left' as const },
      },
      rows: [{ text: 'portrait.line' }],
    },
  } satisfies AuthorCommand
}

async function portraitSession(withCues = false): Promise<EditSession> {
  const { source, state } = await loadBoundaryProject()
  const session = new EditSession(state)
  const bytes = pngBytes(originalPortrait)
  session.dispatch(
    new UpsertAssetCommand(
      portraitId,
      {
        kind: 'portrait',
        path: 'assets/authored/portraits/park.png',
        mediaType: 'image/png',
        bytes: bytes.byteLength,
        sha256: await sha256Hex(bytes),
        label: '青色立绘',
        origin: { kind: 'authored' },
      },
      bytes,
    ),
  )
  session.dispatch(
    new UpdateActorCommand('hero', {
      portraits: { default: portraitId, expressions: { tired: portraitId } },
    }),
  )
  if (!withCues) {
    assertProjectSaveValid(session.getState())
    return session
  }

  session.dispatch(new UpdateLocaleCommand('name.friend', '旅伴'))
  session.dispatch(
    new AddActorCommand({
      id: 'friend',
      name: 'name.friend',
      spriteId: 'hero',
      portraits: { default: portraitId, expressions: { tired: portraitId } },
    }),
  )
  const authored = await loadCurrentProjectFrom(source)
  const cue = expressionCue('hero', 'tired')
  const scenes = validateAuthorScenes(
    state.scenes.map((scene) => ({
      ...scene,
      hooks: {
        onEnter: {
          variants: {
            arrival: {
              label: '开场',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'start',
                stages: [{ id: 'start', body: [cue] }],
              },
            },
          },
        },
      },
    })),
  )
  const items = validateAuthorItems([
    {
      id: 'memory',
      name: 'item.memory',
      desc: '',
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: false,
        effects: [{ kind: 'itemPrivateScript', script: { id: 'use', body: [cue] } }],
      },
    },
  ])
  const enemies = validateAuthorEnemies([{ ...mkEnemy('watcher'), onDefeated: [cue] }])
  const sharedScripts = validateAuthorSharedScripts({
    morning: {
      name: '清晨',
      self: 'none',
      body: [cue, expressionCue('friend', 'tired')],
    },
  })
  const projected = toEditorState(
    {
      ...authored,
      authorContent: { ...authored.authorContent, items, enemies, sharedScripts },
    },
    scenes,
    {},
    {},
    [],
  )
  const withPorts = await withSharedEnemyBattleSprite(source, session.getState(), 'enemy-shape')
  const current = {
    ...withPorts,
    scenes: projected.scenes,
    items: projected.items,
    enemies: projected.enemies,
    sharedScripts: projected.sharedScripts,
  }
  assertProjectSaveValid(current)
  return new EditSession(current)
}

test('renaming to an absent legal name registers the same portrait through undo and redo', async () => {
  const session = await portraitSession()

  expect(() =>
    session.dispatch(new RenameActorPortraitExpressionCommand('hero', 'tired', 'constructor')),
  ).not.toThrow()
  expect(Object.entries(session.getState().actors[0]?.portraits?.expressions ?? {})).toEqual([
    ['constructor', portraitId],
  ])
  assertProjectSaveValid(session.getState())
  expect(session.undo()).toBe(true)
  expect(session.getState().actors[0]?.portraits?.expressions).toEqual({ tired: portraitId })
  expect(session.redo()).toBe(true)
  expect(
    Object.hasOwn(session.getState().actors[0]?.portraits?.expressions ?? {}, 'constructor'),
  ).toBe(true)
})

test('a missing inherited name is rejected as a rename source', async () => {
  const session = await portraitSession()
  const original = session.getState()
  const version = session.getHistoryVersion()

  expect(() =>
    session.dispatch(new RenameActorPortraitExpressionCommand('hero', 'constructor', 'tired2')),
  ).toThrow('人物 hero 不存在表情“constructor”')
  expect(session.getState()).toBe(original)
  expect(session.getHistoryVersion()).toBe(version)
})

test('deleting an unregistered expression adds no history', async () => {
  const session = await portraitSession()
  const original = session.getState()
  const version = session.getHistoryVersion()

  expect(session.dispatch(new RemoveActorPortraitExpressionCommand('hero', 'constructor'))).toBe(
    false,
  )
  expect(session.getState()).toBe(original)
  expect(session.getHistoryVersion()).toBe(version)
})

test('deleting an unused expression keeps its default portrait and undo restores the name', async () => {
  const session = await portraitSession()
  const expressions = { tired: portraitId, calm: portraitId }
  session.dispatch(
    new UpdateActorCommand('hero', { portraits: { default: portraitId, expressions } }),
  )

  expect(session.dispatch(new RemoveActorPortraitExpressionCommand('hero', 'tired'))).toBe(true)
  expect(session.getState().actors[0]?.portraits).toEqual({
    default: portraitId,
    expressions: { calm: portraitId },
  })
  expect(session.dispatch(new RemoveActorPortraitExpressionCommand('hero', 'calm'))).toBe(true)
  expect(session.getState().actors[0]?.portraits).toEqual({ default: portraitId })
  expect(session.undo()).toBe(true)
  expect(session.getState().actors[0]?.portraits?.expressions).toEqual({ calm: portraitId })
  expect(session.undo()).toBe(true)
  expect(session.getState().actors[0]?.portraits?.expressions).toEqual(expressions)
  expect(session.dispatch(new RemoveActorPortraitSetCommand('hero'))).toBe(true)
  expect(session.getState().actors[0]?.portraits).toBeUndefined()
  expect(session.undo()).toBe(true)
  expect(session.getState().actors[0]?.portraits).toEqual({ default: portraitId, expressions })
})

test('rename rewrites all four authored cue roots and preserves another actor with the same expression', async () => {
  const session = await portraitSession(true)
  const before = session.getState()
  const references = () => collectEditorDialoguePortraitReferences(session.getState())
  expect(references().map(({ actorId, expression }) => [actorId, expression])).toEqual([
    ['hero', 'tired'],
    ['hero', 'tired'],
    ['hero', 'tired'],
    ['friend', 'tired'],
    ['hero', 'tired'],
  ])

  expect(session.dispatch(new RenameActorPortraitExpressionCommand('hero', 'tired', 'calm'))).toBe(
    true,
  )
  expect(references().map(({ actorId, expression }) => [actorId, expression])).toEqual([
    ['hero', 'calm'],
    ['hero', 'calm'],
    ['hero', 'calm'],
    ['friend', 'tired'],
    ['hero', 'calm'],
  ])
  expect(session.getState().actors[0]?.portraits?.expressions).toEqual({ calm: portraitId })
  expect(session.getState().actors[1]?.portraits?.expressions).toEqual({ tired: portraitId })
  assertProjectSaveValid(session.getState())
  expect(session.undo()).toBe(true)
  expect(session.getState()).toEqual(before)
})

test('referenced expression and portrait set fail before entering history', async () => {
  const session = await portraitSession(true)
  const before = session.getState()

  expect(() => session.dispatch(new RemoveActorPortraitExpressionCommand('hero', 'tired'))).toThrow(
    /仍被 4 处对话引用/,
  )
  expect(() => session.dispatch(new RemoveActorPortraitSetCommand('hero'))).toThrow(
    /仍被 4 处对话引用/,
  )
  expect(session.getState()).toBe(before)
  expect(session.canUndo()).toBe(false)
})

test('rename rejects an undefined source or invalid destination and skips an unchanged name', async () => {
  const session = await portraitSession()
  const version = session.getHistoryVersion()
  expect(() =>
    session.dispatch(new RenameActorPortraitExpressionCommand('hero', 'tired', ' calm ')),
  ).toThrow(/表情名不能为空或包含首尾空格/)
  expect(() =>
    session.dispatch(new RenameActorPortraitExpressionCommand('hero', 'calm', 'tired')),
  ).toThrow(/不存在表情“calm”/)
  expect(session.dispatch(new RenameActorPortraitExpressionCommand('hero', 'tired', 'tired'))).toBe(
    false,
  )
  expect(session.getHistoryVersion()).toBe(version)
})
