/**
 * C7：精灵命令族迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器。
 */
import { describe, expect, test } from 'vitest'
import * as commands from './commands.js'
import {
  AddSpriteCommand,
  AddSpriteDefinitionCommand,
  DeleteUnusedSpriteAssetCommand,
  RemoveSpriteDefinitionCommand,
  ReplaceSpriteAssetCommand,
  SpriteInUseError,
  UpdateSpriteCommand,
} from './sprite-commands.js'

describe('C7 sprite command family', () => {
  test('keeps sprite constructors on the old commands barrel', () => {
    expect(commands.UpdateSpriteCommand).toBe(UpdateSpriteCommand)
    expect(commands.AddSpriteCommand).toBe(AddSpriteCommand)
    expect(commands.ReplaceSpriteAssetCommand).toBe(ReplaceSpriteAssetCommand)
    expect(commands.AddSpriteDefinitionCommand).toBe(AddSpriteDefinitionCommand)
    expect(commands.RemoveSpriteDefinitionCommand).toBe(RemoveSpriteDefinitionCommand)
    expect(commands.DeleteUnusedSpriteAssetCommand).toBe(DeleteUnusedSpriteAssetCommand)
    expect(commands.SpriteInUseError).toBe(SpriteInUseError)
  })

  test('keeps SpriteInUseError as an Error subclass', () => {
    expect(new SpriteInUseError('sprite-a', [])).toBeInstanceOf(Error)
  })
})
