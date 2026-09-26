/**
 * C2：实体命令族迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器。
 */
import { describe, expect, test } from 'vitest'
import * as commands from './commands.js'
import {
  AddEntityCommand,
  DeleteEntityCommand,
  MoveEntityCommand,
  SetEntitySpriteCommand,
  UpdateEntityCommand,
} from './entity-commands.js'

describe('C2 entity command family', () => {
  test('keeps entity constructors on the old commands barrel', () => {
    expect(commands.MoveEntityCommand).toBe(MoveEntityCommand)
    expect(commands.AddEntityCommand).toBe(AddEntityCommand)
    expect(commands.DeleteEntityCommand).toBe(DeleteEntityCommand)
    expect(commands.UpdateEntityCommand).toBe(UpdateEntityCommand)
    expect(commands.SetEntitySpriteCommand).toBe(SetEntitySpriteCommand)
  })
})
