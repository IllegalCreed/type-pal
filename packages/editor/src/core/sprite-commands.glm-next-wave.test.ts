/**
 * TEST-GLM-NEW-F-1 F06b：sprite-commands 输入保真与最小 undo/redo。
 * 去重：residual（durationMs=0/帧数非法/构造后 mutate 快照/引用索引门/在用资产）、
 * glm-boundaries C02（缺席三向、label 补丁、layout 证明门、AddSprite 冲突族、共享资产
 * createdAsset=false、AddSpriteDefinition 证明族、Remove/DeleteUnused、Replace 守卫与
 * 原子替换）、commands-wave2（barrel 同证 + SpriteInUseError 子类）已大量钉死；
 * 本文件只补其间空隙：真实 EditSession 上 UpdateSprite 的 apply 期深克隆——
 * 调用方 patch 事后篡改不污染会话与 redo、apply 不改写传入 state、undo/redo 逐值还原；
 * AddSpriteDefinitionCommand 作为已入库资源的第二语义用途在真实 session 的
 * 入库/撤销对称（帧数证明取自 decodeWorldSpriteAssetBytes 真实解码）。
 */
import type { SpriteDef } from '@type-pal/content'
import { decodeWorldSpriteAssetBytes } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { EditSession } from './edit-session.js'
import { AddSpriteDefinitionCommand, UpdateSpriteCommand } from './sprite-commands.js'

describe('F06 sprite-commands 输入保真与最小 undo/redo', () => {
  test('UpdateSprite apply 后篡改调用方 patch 不污染会话与 redo；undo/redo 逐值还原', async () => {
    const { source, state } = await loadBoundaryProject('sprite-glm-next-fidelity')
    const hero = state.sprites.find((sprite) => sprite.id === 'hero')!
    const record = state.assetCatalog.assets[hero.asset]!
    const bytes = await source.readBytes(record.path)
    const proof = {
      asset: hero.asset,
      sha256: record.sha256,
      actualFrameCount: (await decodeWorldSpriteAssetBytes(record, bytes)).frames.length,
    }
    const session = new EditSession(state)
    const beforeState = structuredClone(session.getState())
    const mutatedLayout: { kind: 'directional'; framesPerDir: number } = {
      kind: 'directional',
      framesPerDir: 2,
    }
    const patch = { label: '主角 · 改名', layout: mutatedLayout }
    const command = new UpdateSpriteCommand('hero', patch, proof)
    expect(session.dispatch(command)).toBe(true)
    // apply 不改写传入 state。
    expect(structuredClone(state)).toEqual(beforeState)
    // apply 期已深克隆 patch：事后篡改调用方对象不影响会话与 redo。
    patch.label = '事后篡改'
    mutatedLayout.framesPerDir = 99
    expect(session.getState().sprites.find((sprite) => sprite.id === 'hero')?.label).toBe(
      '主角 · 改名',
    )
    expect(session.getState().sprites.find((sprite) => sprite.id === 'hero')?.layout).toEqual({
      kind: 'directional',
      framesPerDir: 2,
    })
    // undo 精确还原首次 apply 捕获的旧值；redo 仍用 apply 期克隆值。
    expect(session.undo()).toBe(true)
    const rolled = session.getState().sprites.find((sprite) => sprite.id === 'hero')!
    expect(rolled.label).toBe(hero.label)
    expect(rolled.layout).toEqual(hero.layout)
    expect(session.redo()).toBe(true)
    const replayed = session.getState().sprites.find((sprite) => sprite.id === 'hero')!
    expect(replayed.label).toBe('主角 · 改名')
    expect(replayed.layout).toEqual({ kind: 'directional', framesPerDir: 2 })
  })

  test('AddSpriteDefinitionCommand 第二语义入库/撤销对称，事后篡改定义不影响 redo', async () => {
    const { source, state } = await loadBoundaryProject('sprite-glm-next-second-use')
    const hero = state.sprites.find((sprite) => sprite.id === 'hero')!
    const record = state.assetCatalog.assets[hero.asset]!
    const bytes = await source.readBytes(record.path)
    const decoded = await decodeWorldSpriteAssetBytes(record, bytes)
    const definition: SpriteDef = {
      id: 'hero-static-cut',
      asset: hero.asset,
      label: '静态立绘切图',
      layout: { kind: 'static' },
    }
    const session = new EditSession(state)
    const command = new AddSpriteDefinitionCommand(definition, {
      asset: hero.asset,
      sha256: record.sha256,
      actualFrameCount: decoded.frames.length,
    })
    expect(session.dispatch(command)).toBe(true)
    expect(session.getState().sprites.some((sprite) => sprite.id === 'hero-static-cut')).toBe(true)
    // 事后篡改调用方定义：会话与 redo 用 apply 期克隆。
    definition.label = '事后篡改'
    definition.id = 'hero-hacked'
    expect(
      session.getState().sprites.find((sprite) => sprite.id === 'hero-static-cut')?.label,
    ).toBe('静态立绘切图')
    expect(session.undo()).toBe(true)
    expect(session.getState().sprites.some((sprite) => sprite.id === 'hero-static-cut')).toBe(false)
    // 不触碰 catalog/blob：第二语义不新增物理资产。
    expect(session.getState().assetCatalog.assets[hero.asset]?.sha256).toBe(record.sha256)
    expect(session.redo()).toBe(true)
    expect(
      session.getState().sprites.find((sprite) => sprite.id === 'hero-static-cut')?.label,
    ).toBe('静态立绘切图')
  })
})
