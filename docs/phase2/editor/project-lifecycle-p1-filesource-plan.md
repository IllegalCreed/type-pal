> **历史文档（2026-09-06 标注）**：本文写作于方案设计/计划阶段，正文中的执行指令、
> Agent 分工、版本号与“当前状态”均为**当时快照**，不是现行契约或待办；已被后续
> current-only / canonical 实现取代的方案不恢复。现行真值见 docs/phase2/READ-FIRST.md
> 与 capability-map.md。

# P1 · FileSource 地基 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 抽出 `FileSource`「从哪读文件」的抽象 + `httpSource` 实现,把工程内容加载(`loadProject`/`loadSceneDef`)改经它读——**零行为变化**,dev 跑得和现在一模一样。

**Architecture:** 现状 `loader.ts` 内容读硬编码 `fetch(projects/<id>/...)`。引入 `FileSource` 接口(`readText/readJson/readBytes/urlFor`,rel = 相对工程根;`/` 开头 = 应用绝对路径,兼容当前 pal 的 `/extracted`),先只落 `httpSource(baseUrl)`。`loadProjectFrom(source)` 成为真加载核,`loadProject(projectId)=loadProjectFrom(httpSource('projects/<id>'))`。`LoadedProject` 带上 `source`,`loadSceneDef` 改经它。`assembleProject`(纯核)不动,只把返回类型标成 `LoadedProjectCore`。

**Tech Stack:** TypeScript,vitest,pnpm workspace(`@type-pal/reforge`)。

## Global Constraints

- **零行为变化**:P1 结束,reforge 游戏(dev 6051/6005)与编辑器(dev 6010)加载 pal 的表现必须和现在完全一致。只换"从哪读",不换读到什么。
- **最小 diff**:除 FileSource 抽象必需的签名改动,不顺手重构无关代码、不动素材加载(assets.ts P1 不碰,留 P2)、不改公式/数值/交互。
- **`fetch` 绝对/相对规则**:`FileSource` 的 rel 以 `/` 开头 = 应用绝对路径(原样,兼容 `/extracted`);否则 = base 拼 rel。
- 每个检查点结束跑 `pnpm --filter @type-pal/reforge run check` 必须全绿,再进下一个。
- 提交信息用中文,结尾带 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。

---

## Task 1: FileSource 接口 + httpSource

**Files:**
- Create: `packages/reforge/src/file-source.ts`
- Test: `packages/reforge/src/file-source.test.ts`

**Interfaces:**
- Produces:
  - `interface FileSource { readText(rel: string): Promise<string>; readJson<T>(rel: string): Promise<T>; readBytes(rel: string): Promise<ArrayBuffer>; urlFor(rel: string): Promise<string> }`
  - `function httpSource(baseUrl: string): FileSource`

- [ ] **Step 1: 写失败测试**

`packages/reforge/src/file-source.test.ts`:

```ts
import { afterEach, describe, expect, test, vi } from 'vitest'
import { httpSource } from './file-source.js'

describe('httpSource', () => {
  afterEach(() => vi.restoreAllMocks())

  test('readJson / readText:base 拼 rel 后 fetch,返回解析结果', async () => {
    const fetchMock = vi.fn(
      async (url: string) => new Response(JSON.stringify({ at: url }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const s = httpSource('projects/pal')
    expect(await s.readJson('manifest.json')).toEqual({ at: 'projects/pal/manifest.json' })
    expect(await s.readText('content/a.json')).toContain('projects/pal/content/a.json')
  })

  test("rel 以 '/' 开头 = 应用绝对路径,忽略 base", async () => {
    const fetchMock = vi.fn(async () => new Response('x', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const s = httpSource('projects/pal')
    await s.readText('/extracted/data/maps/1.json')
    expect(fetchMock).toHaveBeenCalledWith('/extracted/data/maps/1.json')
  })

  test('readBytes 返回 ArrayBuffer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })))
    const s = httpSource('projects/pal')
    const buf = await s.readBytes('assets/x.rle')
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 2, 3]))
  })

  test('非 200 抛错带 url + 状态码', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const s = httpSource('projects/pal')
    await expect(s.readJson('nope.json')).rejects.toThrow('404')
  })

  test('urlFor:相对拼 base,绝对原样', async () => {
    const s = httpSource('projects/pal')
    expect(await s.urlFor('content/a.json')).toBe('projects/pal/content/a.json')
    expect(await s.urlFor('/extracted/x.png')).toBe('/extracted/x.png')
  })
})
```

- [ ] **Step 2: 跑测试验证失败**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/file-source.test.ts`
Expected: FAIL(`Cannot find module './file-source.js'`)

- [ ] **Step 3: 写最小实现**

`packages/reforge/src/file-source.ts`:

```ts
/**
 * FileSource —— 工程「从哪读文件」的抽象(自包含工程地基,project-lifecycle-design §3)。
 * 内容 JSON 与素材二进制统一走它:httpSource(种子/dev)/ fsaSource(本地工程,P3 落)。
 * rel = 相对工程根(如 'manifest.json'、'content/actors.json');以 '/' 开头 = 应用绝对
 * 路径(原样,兼容当前 pal 的 /extracted;P2 自包含后此情形消失)。
 */
export interface FileSource {
  readText(rel: string): Promise<string>
  readJson<T>(rel: string): Promise<T>
  readBytes(rel: string): Promise<ArrayBuffer>
  /** 给 <img>/createImageBitmap 用的可加载 URL(http = 直接 URL;fsa = blob URL,P3)。 */
  urlFor(rel: string): Promise<string>
}

/** 拼接 base 与 rel;rel 以 '/' 开头 = 应用绝对路径,原样返回(忽略 base)。 */
function joinUrl(base: string, rel: string): string {
  if (rel.startsWith('/')) return rel
  return `${base.replace(/\/$/, '')}/${rel}`
}

/** HTTP 文件源(fetch);baseUrl 如 'projects/pal'。用于 dev 与种子下载。 */
export function httpSource(baseUrl: string): FileSource {
  const get = async (rel: string): Promise<Response> => {
    const url = joinUrl(baseUrl, rel)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`httpSource ${url} -> ${res.status}`)
    return res
  }
  return {
    async readText(rel) {
      return (await get(rel)).text()
    },
    async readJson<T>(rel: string) {
      return (await get(rel)).json() as Promise<T>
    },
    async readBytes(rel) {
      return (await get(rel)).arrayBuffer()
    },
    async urlFor(rel) {
      return joinUrl(baseUrl, rel)
    },
  }
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/file-source.test.ts`
Expected: PASS(5 passed)

- [ ] **Step 5: 从包入口导出(供 loader / 编辑器用)**

在 `packages/reforge/src/index.ts` 加导出(与既有 `export ... from './loader.js'` 同组放置):

```ts
export { type FileSource, httpSource } from './file-source.js'
```

- [ ] **Step 6: 提交**

```bash
git add packages/reforge/src/file-source.ts packages/reforge/src/file-source.test.ts packages/reforge/src/index.ts
git commit -m "feat(reforge): FileSource 抽象 + httpSource(自包含工程地基 P1)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 2: loader 内容加载改经 FileSource

**Files:**
- Modify: `packages/reforge/src/loader.ts`(LoadedProject 拆分、loadProjectFrom、loadProject 壳、loadSceneDef 经 source、删 fetchJson)
- Test: `packages/reforge/src/loader.test.ts`(加 loadProjectFrom 内存 source 测)

**Interfaces:**
- Consumes: `FileSource`, `httpSource`(Task 1)
- Produces:
  - `interface LoadedProjectCore { … }`(= 现 LoadedProject 全部字段)
  - `interface LoadedProject extends LoadedProjectCore { source: FileSource }`
  - `function assembleProject(manifest, jsons): LoadedProjectCore`(返回类型变,体不动)
  - `function loadProjectFrom(source: FileSource): Promise<LoadedProject>`
  - `function loadProject(projectId: string): Promise<LoadedProject>`(壳,不变签名)
  - `loadSceneDef(project, id)` / `loadAllScenes(project)` 经 `project.source`

- [ ] **Step 1: 写失败测试(loadProjectFrom 经内存 source)**

在 `packages/reforge/src/loader.test.ts` 顶部 import 补 `loadProjectFrom` 与类型:

```ts
import { assembleProject, loadProjectFrom } from './loader.js'
import type { FileSource } from './file-source.js'
```

文件末尾追加(复用文件已有的 `manifest`/`actorsJson`/`scenesJson` 等常量;若某常量未定义,用文件内同名既有 fixture):

```ts
/** 内存 FileSource:按 rel → 预置 JSON 值;缺则抛 404(素材二进制本测不涉)。 */
function memSource(files: Record<string, unknown>): FileSource {
  return {
    async readText(rel) {
      return JSON.stringify(files[rel])
    },
    async readJson<T>(rel: string) {
      if (!(rel in files)) throw new Error(`memSource 404 ${rel}`)
      return files[rel] as T
    },
    async readBytes() {
      throw new Error('memSource.readBytes 不涉本测')
    },
    async urlFor(rel) {
      return rel
    },
  }
}

describe('loadProjectFrom(经 FileSource)', () => {
  const files: Record<string, unknown> = {
    'manifest.json': {
      ...manifest,
      content: {
        actors: 'content/actors.json',
        skills: 'content/skills.json',
        items: 'content/items.json',
        locale: 'content/locale.json',
      },
    },
    'content/actors.json': actorsJson,
    'content/skills.json': skillsJson,
    'content/items.json': itemsJson,
    'content/locale.json': localeJson,
    'content/scenes/index.json': ['guijie-minju'],
    'content/scenes/guijie-minju.json': scenesJson[0],
  }

  test('读 manifest + 内容 + 入口场景 → LoadedProject(带 source)', async () => {
    const p = await loadProjectFrom(memSource(files))
    expect(p.entryScene.id).toBe('guijie-minju')
    expect(p.sceneIds).toEqual(['guijie-minju'])
    expect(p.actorsById['li-xiaoyao']).toBeDefined()
    expect(p.source).toBeDefined()
  })

  test('loadSceneDef 经 project.source 读单场景', async () => {
    const p = await loadProjectFrom(memSource(files))
    const scene = await loadSceneDef(p, 'guijie-minju')
    expect(scene.id).toBe('guijie-minju')
  })
})
```

> 注(已核实):`actorsJson`/`skillsJson`/`itemsJson`/`localeJson`/`scenesJson` 已是 loader.test.ts 的文件级常量(第 27/69/84/87/51 行),直接引用即可,无需提取。`loadSceneDef` 与 `loadProjectFrom` 同源 `./loader.js`,在文件顶部 import 里一并补上。

- [ ] **Step 2: 跑测试验证失败**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/loader.test.ts`
Expected: FAIL(`loadProjectFrom is not exported` / `is not a function`)

- [ ] **Step 3: 重构 loader.ts**

改 `packages/reforge/src/loader.ts`:

3a. 顶部 import 补:

```ts
import { type FileSource, httpSource } from './file-source.js'
```

3b. `LoadedProject` 拆成 Core + 带 source(把现 `export interface LoadedProject {` 改名为 `LoadedProjectCore`,并在其后加派生接口):

```ts
/** 加载完成的工程数据(纯组装产物,不含 IO 源)。 */
export interface LoadedProjectCore {
  // …（原 LoadedProject 的全部字段，原样保留）…
}

/** 运行期工程对象:数据核 + 读取源(loadSceneDef/素材加载经它)。 */
export interface LoadedProject extends LoadedProjectCore {
  source: FileSource
}
```

3c. `assembleProject` 返回类型 `LoadedProject` → `LoadedProjectCore`(函数体一字不改):

```ts
export function assembleProject(manifest: LoadedManifest, jsons: ContentJsons): LoadedProjectCore {
```

3d. 用 `loadProjectFrom` 替换现 `loadProject` 体(逐个 `fetchJson(\`${root}/…\`)` → `source.readJson(rel)`;`root` 前缀去掉,rel 相对工程根):

```ts
/** 真加载核:经 FileSource 读 manifest + 表域 + 场景 index + 入口场景 → assembleProject + 挂 source。 */
export async function loadProjectFrom(source: FileSource): Promise<LoadedProject> {
  const manifest = (await source.readJson('manifest.json')) as LoadedManifest
  const content = manifest.content
  const dir = scenesDir(manifest)
  const [actors, sceneIds, entryScene, skills, items, locale, sprites, enemies, enemyTeams, battleFields, poisons] =
    await Promise.all([
      source.readJson(content.actors as string),
      source.readJson(`${dir}index.json`),
      source.readJson(`${dir}${manifest.entryScene}.json`),
      source.readJson(content.skills as string),
      source.readJson(content.items as string),
      source.readJson(content.locale as string),
      content.sprites ? source.readJson(content.sprites) : Promise.resolve(undefined),
      content.enemies ? source.readJson(content.enemies) : Promise.resolve(undefined),
      content.enemyTeams ? source.readJson(content.enemyTeams) : Promise.resolve(undefined),
      content.battleFields ? source.readJson(content.battleFields) : Promise.resolve(undefined),
      content.poisons ? source.readJson(content.poisons) : Promise.resolve(undefined),
    ])
  return {
    ...assembleProject(manifest, {
      actors,
      sceneIds,
      entryScene,
      skills,
      items,
      locale,
      sprites,
      enemies,
      enemyTeams,
      battleFields,
      poisons,
    }),
    source,
  }
}

/** IO 壳:projectId → httpSource('projects/<id>') → loadProjectFrom。签名不变。 */
export async function loadProject(projectId: string): Promise<LoadedProject> {
  return loadProjectFrom(httpSource(`projects/${projectId}`))
}
```

3e. `loadSceneDef` 改经 `project.source`(去掉 `projectRoot` + fetchJson):

```ts
export async function loadSceneDef(project: LoadedProject, sceneId: string): Promise<SceneDef> {
  const json = await project.source.readJson(`${scenesDir(project.manifest)}${sceneId}.json`)
  const [scene] = validateScenes([json])
  if (!scene || scene.id !== sceneId)
    throw new Error(`loadSceneDef: 场景文件 id 不符(期望 "${sceneId}",得 "${scene?.id ?? '(空)'}")`)
  return scene
}
```

3f. 删掉文件底部现在没人用的 `async function fetchJson(...)`(已被 source.readJson 取代)。`loadAllScenes` 不用改(它只调 `loadSceneDef(project, id)`)。

- [ ] **Step 4: 跑测试验证通过**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/loader.test.ts`
Expected: PASS(原有 assembleProject 测全绿 + 新增 2 条 loadProjectFrom 测通过)

- [ ] **Step 5: 全包 check**

Run: `pnpm --filter @type-pal/reforge run check`
Expected: typecheck 通过 + 全部测试通过。若 tsc 报 `content.actors` 可能 undefined,保留 `as string`(与旧 `fetchJson(\`${root}/${content.actors}\`)` 同等假设:pal manifest 必有这些键)。

- [ ] **Step 6: 提交**

```bash
git add packages/reforge/src/loader.ts packages/reforge/src/loader.test.ts
git commit -m "refactor(reforge): loader 内容加载改经 FileSource(loadProjectFrom;零行为变化 P1)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 3: 零行为变化验收(浏览器实测)

**Files:** 无代码改动(纯验证);如发现回归,回到 Task 2 修。

**分工:** 本任务 = Claude(浏览器实测),非 GLM。

- [ ] **Step 1: 全仓 check**

Run: `pnpm check`
Expected: 全绿(所有包 typecheck + test)。

- [ ] **Step 2: 编辑器 dev 实测(6010,先探活复用)**

起/复用 `pnpm --filter @type-pal/editor run dev`(6010),浏览器开 `http://localhost:6010/`:
- pal 工程正常载入(guijie-minju,和现在一样)。
- 布置模式看得到地图 + 实体;切场景(如 s040)地图/精灵正常渲染(证素材加载未受影响——P1 没碰 assets.ts,应零变化)。
Expected: 表现与 P1 前完全一致。

- [ ] **Step 3: reforge 引擎 dev 实测(6051,先探活复用)**

起/复用 `pnpm --filter @type-pal/reforge run dev:pal`(6051),浏览器开 `http://localhost:6051/`:
- 游戏正常启动进 guijie-minju,可走动、切场景、素材正常。
Expected: 与 P1 前完全一致。

- [ ] **Step 4: 记录验收**

在 PR/提交说明记「P1 零行为变化验收:编辑器 6010 + 引擎 6051 载 pal 表现一致」。无回归则 P1 收尾。

---

## 后续计划(P1 落地后各自展开)

P1 只铺地基(FileSource + 内容加载),故意**不碰素材、不做本地 IO**。后续三份计划(每份自己一份 `*-plan.md`):

- **P2 · 自包含 pal + 素材经 FileSource**:把 pal 素材归入工程相对路径(manifest.assets 改相对)+ `assets.ts` 所有 `fetch` 改经 `source.readBytes/urlFor`(blob URL 解码后回收);`loadBattleBgFull` 的 `/data→/images` 硬编码一并归正。dev 仍零行为变化,但 pal 变自包含。
- **P3 · 本地工程 IO**:`fsaSource(dirHandle)`;`writeProject` 扩二进制 + 增量(快照-diff);`handle-store.ts`(IndexedDB 句柄 + 权限手势重连);打开本地流程。
- **P4 · 新建 + 启动屏**:pal 自包含种子打包;克隆(整套下载)+ 空白骨架;`ProjectPicker` 启动屏 + 克隆进度条。

## Self-Review(已过)

- **Spec 覆盖**:P1 对应 design §3(FileSource 接口)+ §9(loader 落点的内容部分)。素材(§3 素材经 source)明确划入 P2。✓
- **占位符**:无 TBD;每步含实际代码/命令/期望。✓
- **类型一致**:`FileSource`/`httpSource`/`LoadedProjectCore`/`LoadedProject`/`loadProjectFrom` 跨 Task 1↔2 命名一致;`assembleProject` 返回 `LoadedProjectCore`,`loadProjectFrom` 补 `source` 成 `LoadedProject`。✓
- **风险点(已核实消解)**:loader.test.ts 的 `actorsJson/skillsJson/itemsJson/localeJson/scenesJson` 已是文件级常量(第 27/69/84/87/51 行),新增测试直接引用,无需提取。
- **index 导出位置**:Task 1 Step 5 的 file-source 导出紧接 index.ts 第 32–35 行的 loader 导出组之后;`loadProjectFrom`/`LoadedProjectCore` P1 无外部消费者,暂不从 index 再导出(P3 用到再加),守最小 diff。
