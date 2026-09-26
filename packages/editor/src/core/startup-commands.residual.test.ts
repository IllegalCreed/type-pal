/**
 * TEST-CURSOR-COMMAND-BOUNDARIES-3：启动入口命令残项。
 */
import type { AssetId, EntryPoint } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { EditSession } from './edit-session.js'
import { SetStartupEntriesCommand, UpdateManifestAssetRolesCommand } from './startup-commands.js'

function legalEntry(overrides: Partial<EntryPoint> = {}): EntryPoint {
  return {
    id: 'new-game',
    label: '新的故事',
    scene: 'start',
    startWorld: { party: ['hero'], money: 0, inventory: [] },
    ...overrides,
  }
}

describe('启动入口命令残项', () => {
  test('UpdateManifestAssetRoles 清除 visual.standardColorTable，undo/redo 恢复原 AssetId', async () => {
    const { state } = await loadBoundaryProject('startup-residual-role')
    const session = new EditSession(state)
    const previous = state.manifest.assets.roles['visual.standardColorTable']
    expect(previous).toBe('color.project-standard')
    const neighborActor = state.actors[0]
    const patch: Partial<Record<'visual.standardColorTable', AssetId | undefined>> = {
      'visual.standardColorTable': undefined,
    }
    const command = new UpdateManifestAssetRolesCommand(patch)
    patch['visual.standardColorTable'] = 'color.mutated-after-construct'
    expect(session.dispatch(command)).toBe(true)
    expect(session.getState().manifest.assets.roles['visual.standardColorTable']).toBeUndefined()
    expect(session.getState().actors[0]).toBe(neighborActor)
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.assets.roles['visual.standardColorTable']).toBe(previous)
    expect(session.redo()).toBe(true)
    expect(session.getState().manifest.assets.roles['visual.standardColorTable']).toBeUndefined()
  })

  test('SetStartupEntries 空/空白 defaultEntryId → 直接启动入口 id 必须是无首尾空格的非空字符串', () => {
    expect(
      () => new SetStartupEntriesCommand({ defaultEntryId: '', entryPoints: [legalEntry()] }),
    ).toThrow(/直接启动入口 id 必须是无首尾空格的非空字符串/)
    expect(
      () => new SetStartupEntriesCommand({ defaultEntryId: '   ', entryPoints: [legalEntry()] }),
    ).toThrow(/直接启动入口 id 必须是无首尾空格的非空字符串/)
    expect(
      () =>
        new SetStartupEntriesCommand({ defaultEntryId: ' new-game ', entryPoints: [legalEntry()] }),
    ).toThrow(/直接启动入口 id 必须是无首尾空格的非空字符串/)
  })

  test('SetStartupEntries 空入口名称 → 名称不能为空', () => {
    expect(
      () =>
        new SetStartupEntriesCommand({
          defaultEntryId: 'new-game',
          entryPoints: [legalEntry({ label: '' })],
        }),
    ).toThrow(/名称不能为空/)
    expect(
      () =>
        new SetStartupEntriesCommand({
          defaultEntryId: 'new-game',
          entryPoints: [legalEntry({ label: '   ' })],
        }),
    ).toThrow(/名称不能为空/)
  })

  test('SetStartupEntries 空入口场景 → 场景不能为空', () => {
    expect(
      () =>
        new SetStartupEntriesCommand({
          defaultEntryId: 'new-game',
          entryPoints: [legalEntry({ scene: '' })],
        }),
    ).toThrow(/场景不能为空/)
    expect(
      () =>
        new SetStartupEntriesCommand({
          defaultEntryId: 'new-game',
          entryPoints: [legalEntry({ scene: '   ' })],
        }),
    ).toThrow(/场景不能为空/)
  })
})
