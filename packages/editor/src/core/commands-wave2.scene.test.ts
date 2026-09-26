/**
 * C3：场景命令族迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器。
 */
import { describe, expect, test } from 'vitest'
import * as commands from './commands.js'
import {
  AddSceneCommand,
  DeleteSceneCommand,
  DeleteSceneEntryCommand,
  DuplicateSceneCommand,
  SceneEntryInUseError,
  SceneInUseError,
  UpdateSceneCommand,
  UpdateSceneNameCommand,
  UpsertSceneEntryCommand,
} from './scene-commands.js'

describe('C3 scene command family', () => {
  test('keeps scene constructors on the old commands barrel', () => {
    expect(commands.UpdateSceneCommand).toBe(UpdateSceneCommand)
    expect(commands.UpsertSceneEntryCommand).toBe(UpsertSceneEntryCommand)
    expect(commands.DeleteSceneEntryCommand).toBe(DeleteSceneEntryCommand)
    expect(commands.AddSceneCommand).toBe(AddSceneCommand)
    expect(commands.DuplicateSceneCommand).toBe(DuplicateSceneCommand)
    expect(commands.UpdateSceneNameCommand).toBe(UpdateSceneNameCommand)
    expect(commands.DeleteSceneCommand).toBe(DeleteSceneCommand)
    expect(commands.SceneEntryInUseError).toBe(SceneEntryInUseError)
    expect(commands.SceneInUseError).toBe(SceneInUseError)
  })

  test('keeps scene in-use errors as Error subclasses', () => {
    expect(new SceneInUseError('scene-a', [])).toBeInstanceOf(Error)
    expect(new SceneEntryInUseError('scene-a', 'entry-a', [])).toBeInstanceOf(Error)
  })
})
