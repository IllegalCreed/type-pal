import { expect, test, vi } from 'vitest'
import {
  lbMemorySource,
  lbPoison,
  lbProjectFiles,
} from './__tests__/project-loading-boundaries/fixture.js'
import { files, manifest } from './__tests__/project-loading-boundaries/startup-fixture.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import { PROJECT_SAVE_STATE_PATH } from './project-save-state.js'

type Rejection = { kind: 'resolved' | 'rejected'; message: string }
async function rejectOf(promise: Promise<unknown>): Promise<Rejection> {
  return promise.then(
    () => ({ kind: 'resolved' as const, message: '' }),
    (error: unknown) => ({
      kind: 'rejected' as const,
      message: error instanceof Error ? error.message : String(error),
    }),
  )
}

test('rejects an interrupted author save before reading any manifest or author table', async () => {
  const data = files()
  data[PROJECT_SAVE_STATE_PATH] = {
    kind: 'type-pal-author-save',
    version: 1,
    operationId: 'cf448da8-601d-4c9c-bbdc-235b7d61d483',
    phase: 'pending',
    planHash: 'a'.repeat(64),
  }
  const source = lbMemorySource(data)
  const contentRead = vi.spyOn(source, 'readJson')
  await expect(loadCurrentProjectFrom(source)).rejects.toThrow('未完成的保存')
  expect(contentRead).not.toHaveBeenCalled()
})

test('rejects a complete generation change during actual project assembly', async () => {
  const data = files()
  const state = {
    kind: 'type-pal-author-save',
    version: 1,
    operationId: 'cf448da8-601d-4c9c-bbdc-235b7d61d483',
    phase: 'committed',
    planHash: 'a'.repeat(64),
  }
  data[PROJECT_SAVE_STATE_PATH] = state
  const source = lbMemorySource(data)
  const read = source.readJson
  source.readJson = async <T>(path: string) => {
    const result = await read<T>(path)
    if (path === 'content/actors.json')
      data[PROJECT_SAVE_STATE_PATH] = {
        ...state,
        operationId: 'b174d84c-6e57-4479-a5b6-84b1c25e6c71',
      }
    return result
  }
  await expect(loadCurrentProjectFrom(source)).rejects.toThrow('读取期间')
})

test('loads only current content without reading a migration sidecar', async () => {
  const source = lbMemorySource(files())
  const readBytes = vi.spyOn(source, 'readBytes')
  const readJson = vi.spyOn(source, 'readJson')
  const readText = vi.spyOn(source, 'readText')
  const loaded = await loadCurrentProjectFrom(source)
  expect(readBytes).not.toHaveBeenCalled()
  expect(readJson.mock.calls.map(([path]) => path)).not.toContain('content/scripts/index.json')
  expect(readText.mock.calls).toEqual([
    ['.type-pal/save-state.json'],
    ['.type-pal/save-state.json'],
  ])
  expect(loaded.manifest.contentVersion).toBe(23)
  expect(loaded.sharedScripts.hello?.body[0]).toHaveProperty('cue.speaker', 'name.li')
})

test('rejects pre-current content at the only product boundary', async () => {
  const inherited = files()
  inherited['manifest.json'] = { ...manifest(), contentVersion: 19 }
  await expect(loadCurrentProjectFrom(lbMemorySource(inherited))).rejects.toThrow(
    'manifest.contentVersion: 期望 23',
  )
})

test('可缺表缺席时公开字段为空默认', async () => {
  const bare = await loadCurrentProjectFrom(lbMemorySource(lbProjectFiles()))
  expect(bare.enemiesById).toEqual({})
  expect(bare.enemyTeamsById).toEqual({})
  expect(bare.battleFields).toEqual([])
  expect(bare.poisons).toEqual([])
  expect(bare.poisonsById).toEqual({})
  expect(bare.ambiences).toEqual([])
  expect(bare.shops).toEqual([])
  expect(bare.migrationDiagnostics).toEqual({ version: 1, diagnostics: [] })
})

test.each([
  {
    name: '非数组',
    input: {},
    diagnostic: 'content/ambiences.json: 期望数组',
  },
  {
    name: '空记录',
    input: [null],
    diagnostic: 'content/ambiences.json[0]: 期望对象',
  },
  {
    name: '缺少稳定 ID',
    input: [{ name: '夜晚', tint: [117, 229, 255] }],
    diagnostic: 'content/ambiences.json[0].id: 期望非空字符串',
  },
  {
    name: '名称非字符串',
    input: [{ id: 'night', name: 42, tint: [117, 229, 255] }],
    diagnostic: 'content/ambiences.json[0].name: 期望字符串',
  },
  {
    name: '不是三色通道',
    input: [{ id: 'night', name: '夜晚', tint: [117, 229] }],
    diagnostic: 'content/ambiences.json[0].tint: 期望三个颜色通道',
  },
  {
    name: '颜色超出范围',
    input: [{ id: 'night', name: '夜晚', tint: [117, 256, 255] }],
    diagnostic: 'content/ambiences.json[0].tint[1]: 期望 0 到 255 之间的有限数值',
  },
])('已登记的氛围表拒绝$name，并指出具体路径', async ({ input, diagnostic }) => {
  const files = lbProjectFiles({ optionalTables: { ambiences: [] } })
  files['content/ambiences.json'] = input
  const outcome = await rejectOf(loadCurrentProjectFrom(lbMemorySource(files)))
  expect(outcome).toEqual({ kind: 'rejected', message: diagnostic })
})

test('合法非空当前表逐表保真到工程公开字段', async () => {
  // 非空当前表（全部合法形状）保真：按稳定键/原序落到工程公开字段
  const full = await loadCurrentProjectFrom(
    lbMemorySource(
      lbProjectFiles({
        poisons: [lbPoison(7), lbPoison(8)],
        optionalTables: {
          enemyTeams: [{ id: 'team-1', slots: [null, null] }],
          battleFields: [
            {
              id: 1,
              screenWave: 0,
              magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
            },
          ],
          shops: [{ id: 3, items: [] }],
          ambiences: [{ id: 'night', name: '夜晚', tint: [120, 140, 200] }],
          migrationDiagnostics: { version: 1, diagnostics: [] },
        },
      }),
    ),
  )
  expect(full.poisons.map((poison) => poison.id)).toEqual([7, 8])
  expect(full.poisonsById[8]).toBeDefined()
  expect(full.enemyTeamsById['team-1']?.slots).toEqual([null, null])
  expect(full.battleFields[0]?.id).toBe(1)
  expect(full.shops[0]).toEqual({ id: 3, items: [] })
  expect(full.ambiences).toEqual([{ id: 'night', name: '夜晚', tint: [120, 140, 200] }])
  expect(full.migrationDiagnostics).toEqual({ version: 1, diagnostics: [] })
})
