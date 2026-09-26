/**
 * C5：地图编辑命令族迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器。
 */
import { describe, expect, test } from 'vitest'
import * as commands from './commands.js'
import {
  AddProjectMapLayerCommand,
  ApplyProjectMapPatchCommand,
  MoveProjectMapLayerCommand,
  PaintCollisionCommand,
  PaintTilesCommand,
  RemoveProjectMapLayerCommand,
  ResizeProjectMapCommand,
  UpdateProjectMapLayerCommand,
} from './map-edit-commands.js'

describe('C5 map edit command family', () => {
  test('keeps map edit constructors on the old commands barrel', () => {
    expect(commands.PaintTilesCommand).toBe(PaintTilesCommand)
    expect(commands.PaintCollisionCommand).toBe(PaintCollisionCommand)
    expect(commands.ApplyProjectMapPatchCommand).toBe(ApplyProjectMapPatchCommand)
    expect(commands.AddProjectMapLayerCommand).toBe(AddProjectMapLayerCommand)
    expect(commands.RemoveProjectMapLayerCommand).toBe(RemoveProjectMapLayerCommand)
    expect(commands.MoveProjectMapLayerCommand).toBe(MoveProjectMapLayerCommand)
    expect(commands.UpdateProjectMapLayerCommand).toBe(UpdateProjectMapLayerCommand)
    expect(commands.ResizeProjectMapCommand).toBe(ResizeProjectMapCommand)
  })
})
