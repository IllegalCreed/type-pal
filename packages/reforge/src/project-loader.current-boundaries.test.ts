/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 D1-D3：当前工程批读与模板读取（project-loader.ts）。
 * project-loader.test.ts:272/287 已有 indexed path/缺文件/id mismatch、:305+ 有多入口；
 * 本文件补 loadAllAuthorScenes/loadAllScenes 的 author/runtime 双身份与顺序、批读失败传播、
 * stamps 路径读取。fixture 先过 loadCurrentProjectFrom 守卫；坏值只坏目标轴。
 */
import { describe, expect, test } from 'vitest'
import {
  deepSnapshot,
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
  test('三个 indexed 场景：loadAllAuthorScenes 保 author 形态；loadAllScenes 解析完整对话投影', async () => {
    const source = memoryFileSource(
      dProjectFiles({ sceneIds: ['s001', 's002', 's003'], dialogScene: true }),
    )
    const project = await loadCurrentProjectFrom(source)
    const authors = await loadAllAuthorScenes(project)
    expect(authors.map((s) => s.id)).toEqual(['s001', 's002', 's003'])
    // author 形态：进场脚本仍在 hooks.onEnter.variants，dialog cue 保持作者 identity
    const authorFlow = authors[0]?.hooks?.onEnter?.variants?.main?.flow
    expect(authorFlow && 'kind' in authorFlow ? authorFlow.kind : undefined).toBe('stages')
    const authorCue = (
      (authorFlow && authorFlow.kind === 'stages' ? authorFlow.stages[0]?.body[0] : undefined) as
        | { kind: string; cue?: { identity?: unknown } }
        | undefined
    )?.cue
    expect(authorCue?.identity).toEqual({
      kind: 'actor',
      actor: 'actor.li',
      portrait: { kind: 'expression', expression: 'angry', side: 'left' },
    })
    // runtime 投影：同一 dialog 命令的 cue 被解析为 speaker/portrait{asset,side}/rows
    const authorsSnapshot = structuredClone(authors)
    const runtimes = await loadAllScenes(project)
    expect(runtimes.map((s) => s.id)).toEqual(['s001', 's002', 's003'])
    const runtimeFlow = runtimes[0]?.hooks?.onEnter?.variants?.main?.flow
    expect(runtimeFlow && 'kind' in runtimeFlow ? runtimeFlow.kind : undefined).toBe('stages')
    const runtimeCommand = (
      runtimeFlow && runtimeFlow.kind === 'stages' ? runtimeFlow.stages[0]?.body[0] : undefined
    ) as { kind: string; cue?: Record<string, unknown> } | undefined
    expect(runtimeCommand?.kind).toBe('dialog')
    expect(runtimeCommand?.cue).toEqual({
      speaker: 'name.li',
      portrait: { asset: 'portrait.li.angry', side: 'left' },
      rows: [{ text: 'line.hello' }],
    })
    // 不相关字段不因投影漂移；author 输入树在投影后逐值不变
    for (const scene of runtimes)
      expect({ id: scene.id, mapId: scene.mapId, entities: scene.entities }).toEqual({
        id: scene.id,
        mapId: 'map-001',
        entities: [],
      })
    expect(authors).toEqual(authorsSnapshot)
    // runtime 树不是 author 树的别名：改 runtime cue 不影响 author 输入
    if (runtimeCommand) runtimeCommand.cue = { rows: [{ text: 'mutated' }] }
    expect(authors).toEqual(authorsSnapshot)
  })
  test('实际输入保真：project 纯数据（含 actorsById）与读取边界捕获的实际 author 对象消费后不变', async () => {
    const files = dProjectFiles({ sceneIds: ['s001', 's002'], dialogScene: true })
    const filesSnapshot = structuredClone(files)
    const source = memoryFileSource(files)
    const project = await loadCurrentProjectFrom(source)
    // 读取边界捕获：loadAllScenes 实际消费的 lazy scene 正文就是本 source 交出的对象；
    // 交付时即快照，消费完成后比较同一对象（不是另一次独立 readJson 的 clone）。
    const rawReadJson = source.readJson.bind(source)
    const actualInputs: Array<{ path: string; value: unknown; snapshot: unknown }> = []
    source.readJson = async <T>(path: string) => {
      const value = await rawReadJson<T>(path)
      if (/^content\/scenes\/s\d+\.json$/.test(path))
        actualInputs.push({ path, value, snapshot: deepSnapshot(value) })
      return value
    }
    // project 纯数据面：manifest/sceneIndex/authorContent/actorsById（投影直接消费的输入；
    // 排除真正持有活动状态的 source/resolver/读取轨迹）
    const dataSnapshot = deepSnapshot({
      manifest: project.manifest,
      sceneIndex: project.sceneIndex,
      authorContent: project.authorContent,
      actorsById: project.actorsById,
    })
    const runtimes = await loadAllScenes(project)
    expect(runtimes.map((scene) => scene.id)).toEqual(['s001', 's002'])
    // 文件表不变；project 纯数据（含 actorsById）消费后逐值不变
    expect(files).toEqual(filesSnapshot)
    expect({
      manifest: project.manifest,
      sceneIndex: project.sceneIndex,
      authorContent: project.authorContent,
      actorsById: project.actorsById,
    }).toEqual(dataSnapshot)
    // 实际交付给 loader 的 author 正文对象（含 dialog cue 的作者 identity）在投影后仍保真
    expect(actualInputs.map((entry) => entry.path)).toEqual([
      'content/scenes/s001.json',
      'content/scenes/s002.json',
    ])
    for (const entry of actualInputs) expect(entry.value).toEqual(entry.snapshot)
    // runtime 不别名实际输入：改 runtime 树的 cue 不影响读取边界捕获的实际对象
    const runtimeCueFlow = runtimes[0]?.hooks?.onEnter?.variants?.main?.flow
    const runtimeCommand =
      runtimeCueFlow && runtimeCueFlow.kind === 'stages'
        ? (runtimeCueFlow.stages[0]?.body[0] as { cue?: unknown } | undefined)
        : undefined
    expect(runtimeCommand?.cue).toMatchObject({ speaker: 'name.li' })
    if (runtimeCommand) runtimeCommand.cue = { rows: [{ text: 'mutated' }] }
    for (const entry of actualInputs) expect(entry.value).toEqual(entry.snapshot)
    // 投影确实消费了实际 actorsById：runtime speaker 即 actorsById['actor.li'].name
    expect(project.actorsById['actor.li']?.name).toBe('name.li')
  })
  test('读取确定性：同一工程二次独立读取得到逐值相等的 author 树', async () => {
    const project = await loadCurrentProjectFrom(
      memoryFileSource(dProjectFiles({ sceneIds: ['s001', 's002'] })),
    )
    const authors = await loadAllAuthorScenes(project)
    expect(await loadAllAuthorScenes(project)).toEqual(authors)
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
