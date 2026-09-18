/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 D1-D3：当前工程批读与模板读取（project-loader.ts）。
 * project-loader.test.ts:272/287 已有 indexed path/缺文件/id mismatch、:305+ 有多入口；
 * 本文件补 loadAllAuthorScenes/loadAllScenes 的 author/runtime 双身份与顺序、批读失败传播、
 * stamps 路径读取。fixture 先过 loadCurrentProjectFrom 守卫；坏值只坏目标轴。
 */
import { describe, expect, test } from 'vitest'
import {
  dProjectFiles,
  dStampFile,
  memoryFileSource,
} from './__tests__/glm-runtime-contract-fixtures.js'
import {
  loadAllAuthorScenes,
  loadAllScenes,
  loadCurrentProjectFrom,
  loadStampTemplates,
} from './project-loader.js'

describe('D1 多场景批读：author 身份与 runtime 投影', () => {
  test('三个 indexed 场景：loadAllAuthorScenes 保 author 形态；loadAllScenes 产 runtime 对话树', async () => {
    const source = memoryFileSource(
      dProjectFiles({ sceneIds: ['s001', 's002', 's003'], dialogScene: true }),
    )
    const project = await loadCurrentProjectFrom(source)
    const authors = await loadAllAuthorScenes(project)
    expect(authors.map((s) => s.id)).toEqual(['s001', 's002', 's003'])
    // author 形态：进场脚本仍在 hooks.onEnter.variants（作者域树未投影）
    const hookFlow = authors[0]?.hooks?.onEnter?.variants?.main?.flow
    expect(hookFlow && 'kind' in hookFlow ? hookFlow.kind : undefined).toBe('stages')
    // runtime 投影：dialog cue 的 identity 被解析（author→runtime 差异真实发生）
    const runtimes = await loadAllScenes(project)
    expect(runtimes.map((s) => s.id)).toEqual(['s001', 's002', 's003'])
    expect(runtimes).not.toBe(authors) // 两条读取链各自完整成树
  })
  test('完整树与原输入不变：批读不污染工程文件表', async () => {
    const files = dProjectFiles({ sceneIds: ['s001', 's002'] })
    const filesSnapshot = structuredClone(files)
    const project = await loadCurrentProjectFrom(memoryFileSource(files))
    await loadAllScenes(project)
    expect(files).toEqual(filesSnapshot)
  })
})

describe('D2 批读顺序与失败传播', () => {
  test('返回顺序 = sceneIds 顺序（与文件表写入顺序无关）', async () => {
    const files = dProjectFiles({ sceneIds: ['s003', 's001', 's002'] })
    const source = memoryFileSource(files)
    const project = await loadCurrentProjectFrom(source)
    const authors = await loadAllAuthorScenes(project)
    expect(authors.map((s) => s.id)).toEqual(['s003', 's001', 's002'])
  })
  test('中间场景读取失败：整批拒绝（不返回部分数组）；IO 轨迹证明确实读过前序场景', async () => {
    const files = dProjectFiles({ sceneIds: ['s001', 's002', 's003'] })
    const source = memoryFileSource(files, 'content/scenes/s002.json')
    const project = await loadCurrentProjectFrom(source)
    source.reads.length = 0
    await expect(loadAllAuthorScenes(project)).rejects.toThrow('boom-json:content/scenes/s002.json')
    // 实际 IO 轨迹：s001 先被读过、s002 失败即停（s003 未读）
    const sceneReads = source.reads.filter((entry) => entry.startsWith('json:content/scenes/s'))
    expect(sceneReads).toEqual(['json:content/scenes/s001.json', 'json:content/scenes/s002.json'])
    // 同输入全成功对照
    const okProject = await loadCurrentProjectFrom(memoryFileSource(dProjectFiles()))
    await expect(loadAllAuthorScenes(okProject)).resolves.toHaveLength(3)
  })
})

describe('D3 stamps 路径读取', () => {
  test('合法非空内容 → loadStampTemplates 过守卫返回模板；缺席 → []（对照）', async () => {
    const files = dProjectFiles({ withStamps: true })
    files['content/stamps.json'] = dStampFile()
    const project = await loadCurrentProjectFrom(memoryFileSource(files))
    const templates = await loadStampTemplates(project)
    expect(templates.map((t) => t.id)).toEqual(['sign-1'])
    // 缺席（manifest 无 stamps 路径）→ 合法空数组，不冒称新政策
    const bare = await loadCurrentProjectFrom(memoryFileSource(dProjectFiles()))
    expect(await loadStampTemplates(bare)).toEqual([])
  })
  test('坏内容只坏一轴：origin 非法即拒；读失败传播底层错误', async () => {
    const files = dProjectFiles({ withStamps: true })
    const broken = dStampFile() as Array<Record<string, unknown>>
    broken[0]!.origin = 'mystery' // 只坏 origin 轴
    files['content/stamps.json'] = broken
    const project = await loadCurrentProjectFrom(memoryFileSource(files))
    await expect(loadStampTemplates(project)).rejects.toThrow(/origin/)
    const files2 = dProjectFiles({ withStamps: true })
    files2['content/stamps.json'] = dStampFile()
    const project2 = await loadCurrentProjectFrom(memoryFileSource(files2, 'content/stamps.json'))
    await expect(loadStampTemplates(project2)).rejects.toThrow('boom-json:content/stamps.json')
  })
})
