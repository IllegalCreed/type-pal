/**
 * C6：瓦片集命令族与 asset-record helper 迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器。
 */
import { describe, expect, test } from 'vitest'
import * as commands from './commands.js'
import {
  AddTilesetCommand,
  RemoveTilesetCommand,
  ReplaceTilesetAssetCommand,
  UpdateTilesetMetadataCommand,
} from './tileset-commands.js'

describe('C6 tileset command family', () => {
  test('keeps tileset constructors on the old commands barrel', () => {
    expect(commands.AddTilesetCommand).toBe(AddTilesetCommand)
    expect(commands.RemoveTilesetCommand).toBe(RemoveTilesetCommand)
    expect(commands.UpdateTilesetMetadataCommand).toBe(UpdateTilesetMetadataCommand)
    expect(commands.ReplaceTilesetAssetCommand).toBe(ReplaceTilesetAssetCommand)
  })
})
