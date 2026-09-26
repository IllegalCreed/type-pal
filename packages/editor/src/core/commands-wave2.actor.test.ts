/**
 * C8：人物命令族迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器。
 */
import { describe, expect, test } from 'vitest'
import {
  ActorInUseError,
  AddActorCommand,
  CopyActorCommand,
  DeleteActorCommand,
  DetachActorEntityCommand,
  SetActorBattleSpriteCommand,
  UpdateActorCommand,
} from './actor-commands.js'
import * as commands from './commands.js'

describe('C8 actor command family', () => {
  test('keeps actor constructors on the old commands barrel', () => {
    expect(commands.AddActorCommand).toBe(AddActorCommand)
    expect(commands.CopyActorCommand).toBe(CopyActorCommand)
    expect(commands.ActorInUseError).toBe(ActorInUseError)
    expect(commands.DeleteActorCommand).toBe(DeleteActorCommand)
    expect(commands.DetachActorEntityCommand).toBe(DetachActorEntityCommand)
    expect(commands.UpdateActorCommand).toBe(UpdateActorCommand)
    expect(commands.SetActorBattleSpriteCommand).toBe(SetActorBattleSpriteCommand)
  })

  test('keeps ActorInUseError as an Error subclass', () => {
    expect(new ActorInUseError('actor-a', [])).toBeInstanceOf(Error)
  })
})
