import { describe, expect, test } from 'vitest'
import {
  AddAmbienceCommand as AddAmbienceMoved,
  AmbienceInUseError as AmbienceInUseErrorMoved,
  DeleteAmbienceCommand as DeleteAmbienceMoved,
  UpdateAmbienceCommand as UpdateAmbienceMoved,
} from './ambience-commands.js'
import * as oldEntry from './commands.js'
import { AddAmbienceCommand, AmbienceInUseError, DeleteAmbienceCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

function state(): EditorState {
  return {
    ambiences: [{ id: 'day', name: '白天', tint: [255, 255, 255] }],
    items: [],
    skills: [],
    scenes: [],
    actors: [],
    levelUp: {},
    manifest: {
      id: 'test',
      name: 'Test',
      contentVersion: 20,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [],
    },
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

describe('C07 ambience command family', () => {
  test('keeps ambience constructors on the old commands barrel and blocks in-use delete', () => {
    expect(oldEntry.AddAmbienceCommand).toBe(AddAmbienceMoved)
    expect(oldEntry.UpdateAmbienceCommand).toBe(UpdateAmbienceMoved)
    expect(oldEntry.DeleteAmbienceCommand).toBe(DeleteAmbienceMoved)
    expect(oldEntry.AmbienceInUseError).toBe(AmbienceInUseErrorMoved)
    const add = new AddAmbienceCommand('night', '夜晚')
    const next = add.apply(state())
    expect(next.ambiences?.map((entry) => entry.id)).toEqual(['day', 'night'])
    expect(add.invert(next).ambiences?.map((entry) => entry.id)).toEqual(['day'])
    expect(new AmbienceInUseError('day', []).message).toContain('不能删除')
    expect(
      new DeleteAmbienceCommand('day', collectCurrentProjectReferenceIndex).apply(state())
        .ambiences,
    ).toEqual([])
  })
})
