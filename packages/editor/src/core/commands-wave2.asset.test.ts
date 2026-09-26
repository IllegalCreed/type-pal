/**
 * C9：资源 catalog 命令族迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器；AssetInUseError 保持单一身份。
 */
import { describe, expect, test } from 'vitest'
import { DeleteAssetCommand, UpsertAssetCommand } from './asset-commands.js'
import { AssetInUseError } from './command-asset-record.js'
import * as commands from './commands.js'

describe('C9 asset command family', () => {
  test('keeps asset constructors on the old commands barrel', () => {
    expect(commands.UpsertAssetCommand).toBe(UpsertAssetCommand)
    expect(commands.DeleteAssetCommand).toBe(DeleteAssetCommand)
    expect(commands.AssetInUseError).toBe(AssetInUseError)
  })

  test('keeps AssetInUseError as an Error subclass', () => {
    expect(new AssetInUseError('asset-a', [])).toBeInstanceOf(Error)
  })
})
