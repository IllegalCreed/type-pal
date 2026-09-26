/**
 * C4：地图资产命令族迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器。
 */
import { describe, expect, test } from 'vitest'
import * as commands from './commands.js'
import {
  BindSceneMapCommand,
  CreateMapAssetCommand,
  CreateProjectMapCommand,
  DeleteMapAssetCommand,
  DuplicateMapAssetCommand,
  MapAssetInUseError,
  RenameMapAssetCommand,
} from './map-asset-commands.js'

describe('C4 map asset command family', () => {
  test('keeps map asset constructors on the old commands barrel', () => {
    expect(commands.CreateMapAssetCommand).toBe(CreateMapAssetCommand)
    expect(commands.DuplicateMapAssetCommand).toBe(DuplicateMapAssetCommand)
    expect(commands.RenameMapAssetCommand).toBe(RenameMapAssetCommand)
    expect(commands.BindSceneMapCommand).toBe(BindSceneMapCommand)
    expect(commands.DeleteMapAssetCommand).toBe(DeleteMapAssetCommand)
    expect(commands.CreateProjectMapCommand).toBe(CreateProjectMapCommand)
    expect(commands.MapAssetInUseError).toBe(MapAssetInUseError)
  })
})
