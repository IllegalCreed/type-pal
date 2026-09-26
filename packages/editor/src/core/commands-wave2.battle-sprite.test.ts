/**
 * C9：战斗精灵命令族迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器。
 */
import { describe, expect, test } from 'vitest'
import {
  AddBattleSpriteCommand,
  DeleteUnusedBattleSpriteAssetCommand,
  RemoveBattleSpriteDefinitionCommand,
  ReplaceBattleSpriteAssetCommand,
  SetEnemyBattleSpriteCommand,
  UpdateBattleSpriteDefinitionCommand,
} from './battle-sprite-commands.js'
import * as commands from './commands.js'

describe('C9 battle-sprite command family', () => {
  test('keeps battle-sprite constructors on the old commands barrel', () => {
    expect(commands.AddBattleSpriteCommand).toBe(AddBattleSpriteCommand)
    expect(commands.UpdateBattleSpriteDefinitionCommand).toBe(UpdateBattleSpriteDefinitionCommand)
    expect(commands.ReplaceBattleSpriteAssetCommand).toBe(ReplaceBattleSpriteAssetCommand)
    expect(commands.RemoveBattleSpriteDefinitionCommand).toBe(RemoveBattleSpriteDefinitionCommand)
    expect(commands.DeleteUnusedBattleSpriteAssetCommand).toBe(DeleteUnusedBattleSpriteAssetCommand)
    expect(commands.SetEnemyBattleSpriteCommand).toBe(SetEnemyBattleSpriteCommand)
  })
})
