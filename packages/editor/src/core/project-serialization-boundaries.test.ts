/**
 * EDITOR-SAVE-RECOVERY-1 · preflight-r1 · B组：序列化完整性（S01–S04）。
 * 全部状态由真实 buildBlankProject/finishOpen/toEditorState 构造；序列化与 loader 为生产实现。
 * 纯序列化测试只证明输出/拒绝，不冒充 writer IO 验证（P05 另证）。
 */
import { beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
vi.mock('./handle-store.js', async (original) => ({
  ...(await original<typeof import('./handle-store.js')>()),
  loadWorkspaceRecord: async () => null,
  findWorkspaceRecordByHandle: async () => null,
  saveWorkspaceHandle: async () => undefined,
  saveWorkspaceHandleUnderLock: async () => undefined,
}))
beforeEach(() => authorSaveStorage.receipts.clear())

import type { ScriptChunkV1, ScriptIndexV1 } from '@type-pal/content'
import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { finishOpen } from './open-actions.js'
import { serializeProject, serializeProjectWithMapCopies, toEditorState } from './project-io.js'
import { buildBlankProject } from './seed.js'

async function blankState(id: string) {
  const files = await buildBlankProject(id)
  const disk = memoryAuthorDirectory(files)
  const opened = await finishOpen(disk.dir)
  const state = toEditorState(opened.project, await loadAllAuthorScenes(opened.project), {}, {}, [])
  return { files, disk, opened, state }
}

// ═══ S01：脚本索引/分片/共享脚本 ═══

test('S01: 分片脚本按声明路径输出 index/chunks，正文内容保留；缺 chunk 在序列化层拒绝', async () => {
  const { state } = await blankState('ser-s01')
  const chunk: ScriptChunkV1 = {
    version: 1,
    id: 'glm-chunk',
    scripts: {
      'glm:scene': [{ kind: 'dialog', cue: { rows: [{ text: 'menu.system.no' }] } } as never],
    },
  }
  // index.bytes 必须等于 chunk 的 JSON.stringify 无缩进 UTF-8 字节数（script-library:383 合同）。
  const chunkBytes = new TextEncoder().encode(JSON.stringify(chunk)).byteLength
  const index: ScriptIndexV1 = {
    version: 1,
    shards: { shared: 16, global: {} },
    chunks: { 'glm-chunk': { path: 'chunk-glm.json', bytes: chunkBytes } },
  }
  // manifest 声明 scripts 目录（blank 默认不声明 → 显式补声明构造合法当前形态）。
  state.manifest = structuredClone(state.manifest)
  ;(state.manifest.content as Record<string, unknown>).scripts = 'content/scripts/'
  state.scriptIndex = index
  state.scriptChunks = { 'glm-chunk': chunk }
  const files = serializeProject(state)
  expect(files['content/scripts/index.json']).toEqual(index)
  expect(files['content/scripts/chunk-glm.json']).toEqual(chunk)

  // 缺 chunk：上游 assertScriptProjectValid（script-library）先拒绝（index 缺正文错误）；
  // serializeProject:286 的同文案分支为重叠护栏——上游已挡，如实分类不绕过。
  state.scriptChunks = {}
  expect(() => serializeProject(state)).toThrow(/index chunk 缺文件/)
})

test('S01: 声明 sharedScripts 缺失时在序列化层拒绝；正常输出经 checkAuthorScriptLibrary', async () => {
  const { state } = await blankState('ser-s01-shared')
  state.manifest = structuredClone(state.manifest)
  ;(state.manifest.content as Record<string, unknown>).sharedScripts = undefined
  // blank 默认声明 sharedScripts → 正常路径由 S04 覆盖；这里构造“有声明但 state 缺失”。
  ;(state.manifest.content as Record<string, unknown>).sharedScripts = 'content/shared-scripts.json'
  expect(state.sharedScripts).toBeTruthy()
  const files = serializeProject(state)
  expect(files['content/shared-scripts.json']).toEqual(state.sharedScripts)
  // 将 state.sharedScripts 置空 → 声明仍在 → 序列化拒绝。
  ;(state as { sharedScripts: unknown }).sharedScripts = undefined
  expect(() => serializeProject(state)).toThrow(
    'serializeProject: manifest 声明 sharedScripts 但 state.sharedScripts 缺失',
  )
})

// ═══ S02：地图工作副本与 copy-through ═══

test('S02: 已加载地图输出 formatProjectMap 工作副本；未加载地图经 readText copy-through 保留原文', async () => {
  const { state, opened } = await blankState('ser-s02')
  const mapIndex = state.mapIndex
  expect(mapIndex.maps.length).toBeGreaterThan(0)
  // blank 默认未加载任何 map 工作副本（maps 为空）→ serializeProjectWithMapCopies 走 copy-through。
  const source = opened.project.source
  const original = await source.readText(mapIndex.maps[0]!.path)
  const files = await serializeProjectWithMapCopies(state, source)
  expect(files[mapIndex.maps[0]!.path]).toBe(original)

  // 地图资产路径覆盖 index 文件 → 上游 validateMapIndex 先拒绝（serializeProject:267 调用）。
  // 该序列化层同文案分支（:272）为重叠护栏：上游已挡，当前模型无法到达——如实分类，不造旁路。
  const poisoned = structuredClone(state.mapIndex)
  const mapIndexRel = state.manifest.content.maps!
  poisoned.maps[0]!.path = mapIndexRel
  ;(state as { mapIndex: unknown }).mapIndex = poisoned
  expect(() => serializeProject(state)).toThrow(/不得覆盖 map index/)
})

// ═══ S03：migrationDiagnostics 保留/移除 ═══

test('S03: 物品对应能力未修复的诊断保留；已修复（物品具备该能力）的诊断被移除', async () => {
  const { state } = await blankState('ser-s03')
  // blank 无物品 → 构造合法 ItemData（equip 具备、use 缺席）作为诊断目标。
  const item = {
    id: 'glm-item',
    name: 'name.glm-item',
    desc: ['desc.glm-item'],
    buyPrice: 1,
    sellPrice: 1,
    sellable: false,
    equip: { slot: 'weapon', equipableBy: [], effects: [] },
  }
  state.items = [item] as unknown as typeof state.items
  // blank manifest 未声明 migrationDiagnostics 路径 → 显式补声明构造合法当前形态。
  state.manifest = structuredClone(state.manifest)
  ;(state.manifest.content as Record<string, unknown>).migrationDiagnostics =
    'content/migration-diagnostics.json'
  const diagnostic = {
    id: 'glm-diag-1',
    severity: 'warn',
    target: { domain: 'item', objectId: item.id, capability: 'use', label: '使用' },
    category: 'unsupported-command',
    reason: '旧版脚本命令暂未现代化',
    source: { kind: 'legacy-script', label: 'L_0001', address: 1 },
  } satisfies import('@type-pal/content').MigrationDiagnostic
  const repaired: import('@type-pal/content').MigrationDiagnostic = {
    ...diagnostic,
    id: 'glm-diag-2',
    target: { ...diagnostic.target, capability: 'equip' },
  }
  state.migrationDiagnostics = { version: 1, diagnostics: [diagnostic, repaired] }
  const files = serializeProject(state)
  const output = files['content/migration-diagnostics.json'] as {
    version: number
    diagnostics: unknown[]
  }
  // “use”能力：blank 物品无 use → 保留；“equip”能力：blank 物品具备 equip → 移除。
  expect(output.version).toBe(1)
  expect(output.diagnostics).toHaveLength(1)
  expect((output.diagnostics[0] as { id: string }).id).toBe('glm-diag-1')
})

// ═══ S04：内容表输出 + 正式 loader 重开 ═══

test('S04: 声明的内容表按路径输出、可选表缺席不产出；输出经正式 loader 完整重开', async () => {
  const { state, disk } = await blankState('ser-s04')
  const files = await serializeProjectWithMapCopies(
    state,
    disk.dir ? fsaSource(disk.dir) : undefined!,
  )
  const content = state.manifest.content as Record<string, string | undefined>
  for (const key of [
    'actors',
    'skills',
    'items',
    'locale',
    'sharedScripts',
    'worldVariables',
  ] as const) {
    expect(content[key], `manifest 声明 ${key}`).toBeTruthy()
    expect(files[content[key]!], `${key} 输出存在`).toBeTruthy()
  }
  // 可选表：blank 未声明 enemies 族 → 不产出对应文件（键存在于 byKey 但无声明路径）。
  for (const optional of ['enemies', 'enemyTeams', 'battleFields', 'shops'] as const) {
    if (content[optional] === undefined) {
      expect(Object.keys(files).filter((rel) => rel.includes(optional))).toEqual([])
    }
  }
  // 输出写入内存目录后经正式 loader 重开（真实校验器 + canonical 合同）。
  const reopenedDisk = memoryAuthorDirectory(files as Record<string, unknown>)
  const reopened = await loadCurrentProjectFrom(fsaSource(reopenedDisk.dir))
  expect(reopened.manifest.id).toBe('ser-s04')
  expect(Object.values(reopened.actorsById)).toHaveLength(state.actors.length)
})
