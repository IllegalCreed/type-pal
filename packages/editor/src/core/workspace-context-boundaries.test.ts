/**
 * EDITOR-SAVE-RECOVERY-1 · identity-foundation-r1 · F1–F4:身份基础合同
 * (构造器/当前标记解析/公开指纹函数/可信 PAL 证明)。
 *
 * 只测公开 API 与真实构造器;fixture 复用 memoryAuthorDirectory/buildBlankProject,
 * 不伪造私有品牌、不导出私有函数、不用 getter 切换冻结对象。
 * 解析负例只做「当前 schema 拒绝」断言,不把旧版本输入做成成功正控;
 * 区分公开 readJson 回调坏值与真实 JSON 数字溢出:JSON.parse('1e400')可产生 Infinity,
 * undefined/NaN 等另属回调合同。缺必需字段只验证正式 loader 拒绝,不固定 helper 兼容行为。
 */
import { fsaSource, loadCurrentProjectFrom } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { buildBlankProject } from './seed.js'
import {
  createLocalWorkspaceContext,
  createPalDevelopmentWorkspaceContext,
  createSandboxWorkspaceContext,
  fingerprintJsonFiles,
  PAL_DEVELOPMENT_SENTINEL_PATH,
  type PalDevelopmentSentinelV1,
  palFingerprintPaths,
  parsePalDevelopmentSentinel,
  parseSandboxWorkspaceMarker,
  type SandboxWorkspaceMarkerV1,
  sandboxMarkerFor,
  type WorkspaceContext,
  workspaceModeLabel,
} from './workspace-context.js'

const UUID_A = '0f0e0d0c-1b2a-4c3d-8e9f-a0b1c2d3e4f5'
const UUID_B = '1a1b1c1d-2b3c-4d5e-9f0a-b1c2d3e4f5a6'

// ═══ F1:身份构造 ═══

test('F1: local/sandbox 构造器拒绝非法 workspaceId；合法输入保留来源/ID 且对象冻结', () => {
  // 注:UUID 正则带 /i,大小写不敏感;大写合法输入不做非法用例。
  for (const bad of ['', 'not-a-uuid', 42, null, `${UUID_A}-extra`]) {
    expect(() => createLocalWorkspaceContext('p', 'local-directory', bad as string)).toThrow(
      '工作区 identity 无效',
    )
    expect(() => createSandboxWorkspaceContext('p', 'ui-samples', bad as string)).toThrow(
      '工作区 identity 无效',
    )
  }
  const local = createLocalWorkspaceContext('proj-a', 'save-as', UUID_A)
  expect(local).toMatchObject({
    workspaceId: UUID_A,
    projectId: 'proj-a',
    mode: 'local-project',
    source: 'save-as',
    persistencePolicy: 'local-bound',
  })
  const sandbox = createSandboxWorkspaceContext('proj-a', 'review-copy', UUID_B)
  expect(sandbox).toMatchObject({
    workspaceId: UUID_B,
    mode: 'sandbox',
    source: 'review-copy',
    persistencePolicy: 'sandbox-bound',
  })
  // 合法行为合同:上下文与证明结构冻结,严格模式改写在源头上被禁止。
  expect(Object.isFrozen(local)).toBe(true)
  expect(Object.isFrozen(sandbox)).toBe(true)
  expect(() => {
    ;(local as unknown as { projectId: string }).projectId = 'tampered'
  }).toThrow(TypeError)
  // 默认 workspaceId 每次独立生成。
  expect(createLocalWorkspaceContext('p', 'local-directory').workspaceId).not.toBe(
    createLocalWorkspaceContext('p', 'local-directory').workspaceId,
  )
  // 公开标签纯函数三种模式逐一核对(pal 用公开 Pick 形状,无需整份证明)。
  expect(workspaceModeLabel(local)).toBe('本地项目')
  expect(workspaceModeLabel(sandbox)).toBe('评审沙盒')
  expect(workspaceModeLabel({ mode: 'pal-development' })).toBe('PAL 开发基线')
})

test('F1: sandboxMarkerFor 拒绝非沙盒模式与非法来源；合法沙盒上下文产出当前 marker', () => {
  const local = createLocalWorkspaceContext('proj-a', 'local-directory', UUID_A)
  // 非沙盒模式:真实 local 上下文(合法上下文、错误用途)。
  expect(() => sandboxMarkerFor(local)).toThrow('只有评审沙盒可以生成沙盒 marker')
  // 非法来源:公开接口形状校验——sandboxMarkerFor 校验的是入参形状,无私有品牌可伪造。
  const bogusSource = {
    workspaceId: UUID_A,
    projectId: 'proj-a',
    mode: 'sandbox',
    source: 'dev-http',
    persistencePolicy: 'sandbox-bound',
  } as WorkspaceContext
  expect(() => sandboxMarkerFor(bogusSource)).toThrow('沙盒来源无效')
  const sandbox = createSandboxWorkspaceContext('proj-a', 'ui-samples', UUID_A)
  expect(sandboxMarkerFor(sandbox)).toEqual({
    kind: 'type-pal-editor-workspace',
    version: 1,
    mode: 'sandbox',
    workspaceId: UUID_A,
    projectId: 'proj-a',
    source: 'ui-samples',
  })
})

// ═══ F2:当前标记解析 ═══

const legalMarker: SandboxWorkspaceMarkerV1 = {
  kind: 'type-pal-editor-workspace',
  version: 1,
  mode: 'sandbox',
  workspaceId: UUID_A,
  projectId: 'proj-a',
  source: 'ui-samples',
}

test('F2: parseSandboxWorkspaceMarker 非/缺/多/非法字段全部拒绝；合法当前 marker 通过', () => {
  expect(parseSandboxWorkspaceMarker(legalMarker)).toEqual(legalMarker)
  // 真实构造器产物 round-trip(不是手写正控自证)。
  expect(
    parseSandboxWorkspaceMarker(
      sandboxMarkerFor(createSandboxWorkspaceContext('x', 'review-copy')),
    ),
  ).toMatchObject({ mode: 'sandbox', source: 'review-copy' })
  for (const bad of [null, undefined, 42, 'marker', []]) {
    expect(() => parseSandboxWorkspaceMarker(bad)).toThrow('沙盒 workspace marker 不是对象')
  }
  type Mutate = (m: Record<string, unknown>) => void
  for (const [label, mutate] of [
    [
      '缺 version',
      (m) => {
        delete m.version
      },
    ],
    [
      '多余字段',
      (m) => {
        m.legacy = 1
      },
    ],
    [
      'kind 错',
      (m) => {
        m.kind = 'other-kind'
      },
    ],
    [
      'version=2',
      (m) => {
        m.version = 2
      },
    ],
    [
      'mode 错',
      (m) => {
        m.mode = 'local-project'
      },
    ],
    [
      'workspaceId 非 UUID',
      (m) => {
        m.workspaceId = 'no-uuid'
      },
    ],
    [
      'projectId 非字符串',
      (m) => {
        m.projectId = 42
      },
    ],
    [
      'source 非法',
      (m) => {
        m.source = 'dev-http'
      },
    ],
  ] as Array<[string, Mutate]>) {
    const broken = structuredClone(legalMarker) as unknown as Record<string, unknown>
    mutate(broken)
    expect(() => parseSandboxWorkspaceMarker(broken), label).toThrow(
      /字段不符合 current schema|内容无效/,
    )
  }
})

const legalSentinel: PalDevelopmentSentinelV1 = {
  kind: 'type-pal-editor-pal-development',
  version: 1,
  workspaceId: UUID_B,
  projectId: 'pal-f',
}

test('F2: parsePalDevelopmentSentinel 非/缺/多/非法字段全部拒绝；合法 sentinel 通过', () => {
  expect(parsePalDevelopmentSentinel(legalSentinel)).toEqual(legalSentinel)
  for (const bad of [null, undefined, 7, 'sentinel', []]) {
    expect(() => parsePalDevelopmentSentinel(bad)).toThrow('PAL 开发基线 sentinel 不是对象')
  }
  type Mutate = (s: Record<string, unknown>) => void
  for (const [label, mutate] of [
    [
      '缺 workspaceId',
      (s) => {
        delete s.workspaceId
      },
    ],
    [
      '多余字段',
      (s) => {
        s.legacy = 1
      },
    ],
    [
      'kind 错',
      (s) => {
        s.kind = 'other-kind'
      },
    ],
    [
      'version=0',
      (s) => {
        s.version = 0
      },
    ],
    [
      'workspaceId 非 UUID',
      (s) => {
        s.workspaceId = 'nope'
      },
    ],
    [
      'projectId 非字符串',
      (s) => {
        s.projectId = true
      },
    ],
  ] as Array<[string, Mutate]>) {
    const broken = structuredClone(legalSentinel) as unknown as Record<string, unknown>
    mutate(broken)
    expect(() => parsePalDevelopmentSentinel(broken), label).toThrow(
      /字段不符合 current schema|内容无效/,
    )
  }
})

// ═══ F3:公开指纹函数 ═══

test('F3: fingerprintJsonFiles 对象键序不变指纹；数组顺序/内容变化变指纹；输入路径顺序无关', async () => {
  const filesA: Record<string, unknown> = {
    'a.json': { x: 1, y: { b: 2, a: 3 } },
    'b.json': [1, 2, 3],
    'c.json': null,
  }
  const filesB: Record<string, unknown> = {
    'a.json': { y: { a: 3, b: 2 }, x: 1 },
    'b.json': [1, 2, 3],
    'c.json': null,
  }
  const read = (files: Record<string, unknown>) => async (path: string) => {
    if (!(path in files)) throw new Error(`missing ${path}`)
    return files[path]
  }
  const paths = ['a.json', 'b.json', 'c.json']
  const fpA = await fingerprintJsonFiles(paths, read(filesA))
  expect(fpA).toBe(await fingerprintJsonFiles(paths, read(filesB))) // 键序无关
  expect(fpA).toBe(await fingerprintJsonFiles([...paths].reverse(), read(filesA))) // 路径顺序无关
  expect(fpA).toHaveLength(64)
  // 数组顺序变化 → 不同指纹。
  const reordered = { ...filesA, 'b.json': [3, 2, 1] }
  expect(await fingerprintJsonFiles(paths, read(reordered))).not.toBe(fpA)
  // 内容变化 → 不同指纹。
  const mutated = { ...filesA, 'a.json': { x: 2, y: { b: 2, a: 3 } } }
  expect(await fingerprintJsonFiles(paths, read(mutated))).not.toBe(fpA)
})

test('F3: 指纹回调给非有限数/非 JSON 值拒绝——回调合同测试', async () => {
  // 说明(Codex C0 勘误已采纳):JSON 的 Infinity 字面量非法,不代表合法数字文本不能
  // 溢出为 Infinity——真实磁盘 JSON 的溢出行为见下一条用例;本条测公开 readJson 回调合同:
  // 指纹函数必须拒绝这些 JS 值,不得产出可比较的指纹。
  await expect(
    fingerprintJsonFiles(['x.json'], async () => Number.POSITIVE_INFINITY),
  ).rejects.toThrow('PAL 指纹 JSON 含非有限数值')
  await expect(fingerprintJsonFiles(['x.json'], async () => Number.NaN)).rejects.toThrow(
    'PAL 指纹 JSON 含非有限数值',
  )
  await expect(fingerprintJsonFiles(['x.json'], async () => undefined)).rejects.toThrow(
    'PAL 指纹只接受 JSON 值',
  )
  await expect(fingerprintJsonFiles(['x.json'], async () => 10n)).rejects.toThrow(
    'PAL 指纹只接受 JSON 值',
  )
  await expect(
    fingerprintJsonFiles(['x.json'], async () => Symbol('x') as unknown),
  ).rejects.toThrow('PAL 指纹只接受 JSON 值')
})

test('F3: 真实磁盘 JSON 数字文本 1e400 经真实读链得 Infinity → 指纹拒绝;1e308 正控通过', async () => {
  const source = fsaSource(
    memoryAuthorDirectory({ 'overflow.json': '1e400', 'finite.json': '1e308' }).dir,
  )
  // 真实读链见证:合法 JSON 数字文本经 JSON.parse 溢出为 Infinity(非回调伪造)。
  expect(await source.readJson('overflow.json')).toBe(Number.POSITIVE_INFINITY)
  await expect(
    fingerprintJsonFiles(['overflow.json'], (path) => source.readJson(path)),
  ).rejects.toThrow('PAL 指纹 JSON 含非有限数值')
  await expect(
    fingerprintJsonFiles(['finite.json'], (path) => source.readJson(path)),
  ).resolves.toMatch(/^[a-f0-9]{64}$/)
})

// ═══ F4:可信 PAL 证明 ═══

async function palSource(projectId: string, sentinelWorkspaceId = UUID_B) {
  const files = await buildBlankProject(projectId)
  files[PAL_DEVELOPMENT_SENTINEL_PATH] = {
    kind: 'type-pal-editor-pal-development',
    version: 1,
    projectId,
    workspaceId: sentinelWorkspaceId,
  }
  return memoryAuthorDirectory(files)
}

test('F4: 独立可信源两份 proof 同内容一致；assertSame 通过且 proof/context 全部冻结', async () => {
  const left = await palSource('pal-f')
  const right = await palSource('pal-f') // 独立目录、相同内容
  // fixture 先经正式 loader:完整当前清单合法,不靠底层 helper 自证。
  await expect(loadCurrentProjectFrom(fsaSource(left.dir))).resolves.toBeTruthy()
  const before = await createPalDevelopmentWorkspaceContext(fsaSource(left.dir))
  const after = await createPalDevelopmentWorkspaceContext(fsaSource(right.dir))
  expect(before).toMatchObject({
    workspaceId: UUID_B,
    projectId: 'pal-f',
    mode: 'pal-development',
    source: 'dev-http',
    persistencePolicy: 'pal-bound',
    seedStage: 'development-snapshot',
  })
  expect(before.palProof?.expectedFingerprint).toBe(after.palProof?.expectedFingerprint)
  expect(before.palProof?.paths).toEqual(after.palProof?.paths)
  const { assertSamePalDevelopmentProof } = await import('./workspace-context.js')
  expect(() => assertSamePalDevelopmentProof(before, after)).not.toThrow()
  // 冻结合同:不得用 getter 切换或事后修改凑内部末端。
  expect(Object.isFrozen(before)).toBe(true)
  expect(Object.isFrozen(before.palProof)).toBe(true)
  expect(Object.isFrozen(before.palProof?.paths)).toBe(true)
  expect(Object.isFrozen(before.palProof?.sentinel)).toBe(true)
  expect(() => {
    ;(before.palProof as { expectedFingerprint: string }).expectedFingerprint = 'x'
  }).toThrow(TypeError)
})

test('F4: sentinel 与可信 manifest 项目 id 不一致拒绝(合法形状、错误归属)', async () => {
  const disk = await palSource('pal-f', UUID_B)
  const manifest = structuredClone(
    await fsaSource(disk.dir).readJson<import('@type-pal/content').CurrentManifest>(
      'manifest.json',
    ),
  )
  manifest.id = 'other-project' // 合法 manifest、不同项目 id
  await expect(createPalDevelopmentWorkspaceContext(fsaSource(disk.dir), manifest)).rejects.toThrow(
    'PAL 开发基线 sentinel 与可信 manifest 项目 id 不一致',
  )
  // 同条件正控:同 id manifest 通过。
  const ok = await createPalDevelopmentWorkspaceContext(fsaSource(disk.dir), {
    ...manifest,
    id: 'pal-f',
  })
  expect(ok.projectId).toBe('pal-f')
})

test('F4: 身份/快照/路径变化(全部合法输入产生)使 assertSamePalDevelopmentProof 拒绝', async () => {
  const { assertSamePalDevelopmentProof } = await import('./workspace-context.js')
  const base = await createPalDevelopmentWorkspaceContext(fsaSource((await palSource('pal-f')).dir))
  // 身份变化:合法 sentinel 换 workspaceId。
  const otherIdentity = await createPalDevelopmentWorkspaceContext(
    fsaSource((await palSource('pal-f', UUID_A)).dir),
  )
  expect(() => assertSamePalDevelopmentProof(base, otherIdentity)).toThrow(
    'PAL 开发基线 HTTP 快照在载入期间发生变化，请刷新后重试',
  )
  // 快照变化:指纹文件之一内容改变(manifest.json 是 palFingerprintPaths 实际列入的文件)。
  const changed = await palSource('pal-f')
  const raw = changed.json('manifest.json') as { name: string }
  changed.set('manifest.json', { ...raw, name: `${raw.name}-changed` })
  const changedProof = await createPalDevelopmentWorkspaceContext(fsaSource(changed.dir))
  expect(changedProof.palProof?.expectedFingerprint).not.toBe(base.palProof?.expectedFingerprint)
  expect(() => assertSamePalDevelopmentProof(base, changedProof)).toThrow(
    'PAL 开发基线 HTTP 快照在载入期间发生变化，请刷新后重试',
  )
  // 路径变化:合法替代——完整 map index 搬移到新声明路径(正式 loader 通过),proof 路径集合随之不同。
  const relocatedFiles = await buildBlankProject('pal-f')
  relocatedFiles[PAL_DEVELOPMENT_SENTINEL_PATH] = {
    kind: 'type-pal-editor-pal-development',
    version: 1,
    projectId: 'pal-f',
    workspaceId: UUID_B,
  }
  const relocatedManifest = structuredClone(
    relocatedFiles['manifest.json'] as import('@type-pal/content').CurrentManifest,
  )
  const oldMapsPath = relocatedManifest.content.maps!
  relocatedManifest.content.maps = 'content/map-catalog.json'
  const relocatedRecord: Record<string, unknown> = { ...relocatedFiles }
  delete relocatedRecord[oldMapsPath] // 搬移:旧路径不再保留
  relocatedRecord['manifest.json'] = relocatedManifest
  relocatedRecord[relocatedManifest.content.maps] = relocatedFiles[oldMapsPath]
  const relocatedDisk = memoryAuthorDirectory(relocatedRecord)
  await expect(loadCurrentProjectFrom(fsaSource(relocatedDisk.dir))).resolves.toBeTruthy()
  const relocatedProof = await createPalDevelopmentWorkspaceContext(fsaSource(relocatedDisk.dir))
  expect(relocatedProof.palProof?.paths).not.toEqual(base.palProof?.paths)
  expect(relocatedProof.palProof?.paths).toContain('content/map-catalog.json')
  expect(() => assertSamePalDevelopmentProof(base, relocatedProof)).toThrow(
    'PAL 开发基线 HTTP 快照在载入期间发生变化，请刷新后重试',
  )
})

test('F4: 缺 scenes/maps 清单被正式 loader 拒绝;完整清单的合法路径变体可载入', async () => {
  const files = await buildBlankProject('pal-f')
  const baseManifest = structuredClone(
    files['manifest.json'] as import('@type-pal/content').CurrentManifest,
  )
  // 基线:完整清单经正式 loader 成功。
  await expect(
    loadCurrentProjectFrom(fsaSource(memoryAuthorDirectory(files).dir)),
  ).resolves.toBeTruthy()
  for (const key of ['maps', 'scenes'] as const) {
    const broken = structuredClone(baseManifest)
    delete broken.content[key]
    // 残缺清单只走正式拒绝链;不执行/断言 helper 对它的接受行为来提升覆盖率。
    await expect(
      loadCurrentProjectFrom(
        fsaSource(memoryAuthorDirectory({ ...files, 'manifest.json': broken }).dir),
      ),
    ).rejects.toThrow(new RegExp(`缺 ${key}`))
  }
  // 合法替代一:scenes 无尾斜杠 → loader 通过,指纹路径指向同一 index 文件。
  const noSlash = structuredClone(baseManifest)
  noSlash.content.scenes = 'content/scenes'
  await expect(
    loadCurrentProjectFrom(
      fsaSource(memoryAuthorDirectory({ ...files, 'manifest.json': noSlash }).dir),
    ),
  ).resolves.toBeTruthy()
  expect(palFingerprintPaths(noSlash)).toEqual(palFingerprintPaths(baseManifest))
  // 合法替代二:完整 map index 搬移到新声明路径 → loader 通过,指纹路径集合随之变化。
  const moved = structuredClone(baseManifest)
  const oldPath = moved.content.maps!
  moved.content.maps = 'content/map-catalog.json'
  const movedDisk = memoryAuthorDirectory({
    ...files,
    'manifest.json': moved,
    [moved.content.maps]: files[oldPath],
  })
  await expect(loadCurrentProjectFrom(fsaSource(movedDisk.dir))).resolves.toBeTruthy()
  const movedPaths = palFingerprintPaths(moved)
  expect(movedPaths).toContain('content/map-catalog.json')
  expect(movedPaths).not.toContain(oldPath)
})
