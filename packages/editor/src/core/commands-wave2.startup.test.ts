/**
 * C9：启动入口命令族迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器。
 */
import { describe, expect, test } from 'vitest'
import * as commands from './commands.js'
import { SetStartupEntriesCommand, UpdateManifestAssetRolesCommand } from './startup-commands.js'

describe('C9 startup command family', () => {
  test('keeps startup constructors on the old commands barrel', () => {
    expect(commands.UpdateManifestAssetRolesCommand).toBe(UpdateManifestAssetRolesCommand)
    expect(commands.SetStartupEntriesCommand).toBe(SetStartupEntriesCommand)
  })
})
