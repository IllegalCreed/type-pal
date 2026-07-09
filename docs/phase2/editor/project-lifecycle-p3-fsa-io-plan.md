# P3 · FSA 本地读写原语 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** 落 FSA 本地工程的读写原语:`fsaSource`(经目录句柄读)+ `writeProject` 增量+二进制(快照-diff 只写变的、删已删)+ `handle-store`(IndexedDB 存句柄 + 手势重连)。纯逻辑单测全覆盖;顺带把编辑器现有全量保存换成增量。

**Architecture:** `fsaSource(dirHandle)` 实现 `FileSource`(逐段 getDirectoryHandle → getFileHandle → getFile)。`writeProject` 扩成吃 `string | ArrayBuffer | unknown(JSON)` 的文件集,并加 `diffFiles(prev, next)` 算「写/删」集,只落变化。`handle-store` 把 `FileSystemDirectoryHandle` 存/取 IndexedDB + `queryPermission`/手势内 `requestPermission`。

**Tech Stack:** TypeScript,vitest,`@type-pal/reforge`(fsaSource)+ `@type-pal/editor`(writeProject/handle-store)。

## Global Constraints

- **纯逻辑单测**:`fsaSource`/`diffFiles`/增量 `writeProject` 用**内存 mock**(`FileSystemDirectoryHandle` / `File`)全测,不依赖真实 FSA。
- **`fsaSource` 的 rel 恒为工程内相对**(无 `/extracted` 绝对——本地无服务器)。自包含 pal 的 manifest.assets 相对化 = P4。
- **零回归**:编辑器现有保存换增量后,行为等价(仍写全部**变化**文件;首存/改一处只写该处)。
- **FSA 授权 UI + IndexedDB 真存**:`handle-store`/保存的真实 FSA 授权走**浏览器实测**(P4「打开本地」时连测);P3 只保证逻辑正确 + typecheck。
- 检查点跑对应包 check;末尾全仓 `pnpm check`。提交中文 + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。

---

## Task 1: fsaSource(经目录句柄读)

**Files:**
- Create: `packages/reforge/src/fsa-source.ts`
- Test: `packages/reforge/src/fsa-source.test.ts`
- Modify: `packages/reforge/src/index.ts`(导出 fsaSource)

**Interfaces:**
- Consumes: `FileSource`(P1)
- Produces: `function fsaSource(dir: FileSystemDirectoryHandle): FileSource`

- [ ] **Step 1: 写失败测试**

`packages/reforge/src/fsa-source.test.ts`:

```ts
import { describe, expect, test, vi } from 'vitest'
import { fsaSource } from './fsa-source.js'

/** 内存 mock:files 以 'a/b.json' 全路径为键;值 = 字符串内容。递归造目录/文件句柄。 */
function mockDir(files: Record<string, string>): FileSystemDirectoryHandle {
  const make = (prefix: string): FileSystemDirectoryHandle =>
    ({
      async getDirectoryHandle(name: string) {
        return make(prefix ? `${prefix}/${name}` : name)
      },
      async getFileHandle(name: string) {
        const full = prefix ? `${prefix}/${name}` : name
        if (!(full in files)) throw new DOMException(`NotFound ${full}`, 'NotFoundError')
        return {
          async getFile() {
            const content = files[full] ?? ''
            return {
              text: async () => content,
              arrayBuffer: async () => new TextEncoder().encode(content).buffer,
            }
          },
        }
      },
    }) as unknown as FileSystemDirectoryHandle
  return make('')
}

describe('fsaSource', () => {
  const dir = mockDir({
    'manifest.json': '{"id":"proj"}',
    'content/actors.json': '[{"id":"a"}]',
    'assets/tilemap/1.json': '{"w":2}',
  })

  test('readText / readJson 逐段进目录取文件', async () => {
    const s = fsaSource(dir)
    expect(await s.readText('manifest.json')).toBe('{"id":"proj"}')
    expect(await s.readJson('content/actors.json')).toEqual([{ id: 'a' }])
    expect(await s.readJson('assets/tilemap/1.json')).toEqual({ w: 2 })
  })

  test('readBytes 返回 ArrayBuffer', async () => {
    const buf = await fsaSource(dir).readBytes('manifest.json')
    expect(new TextDecoder().decode(new Uint8Array(buf))).toBe('{"id":"proj"}')
  })

  test('urlFor 经 createObjectURL 产 blob URL', async () => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:xyz') })
    expect(await fsaSource(dir).urlFor('manifest.json')).toBe('blob:xyz')
    vi.restoreAllMocks()
  })

  test('缺文件 → 抛(NotFound 透传)', async () => {
    await expect(fsaSource(dir).readText('nope.json')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: 跑测试验证失败** — `pnpm --filter @type-pal/reforge exec vitest run src/fsa-source.test.ts` → FAIL(模块缺)。

- [ ] **Step 3: 写实现** `packages/reforge/src/fsa-source.ts`:

```ts
/**
 * fsaSource —— FileSource 经 File System Access 目录句柄读(本地工程,离线自包含)。
 * rel 恒为工程内相对(无 /extracted 绝对);逐段 getDirectoryHandle → getFileHandle → getFile。
 * urlFor 产 blob URL —— 一次性解码类调用方须在解码后 revokeObjectURL(见 design §3;缓存层管理)。
 */
import type { FileSource } from './file-source.js'

async function fileOf(dir: FileSystemDirectoryHandle, rel: string): Promise<File> {
  const parts = rel.split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) throw new Error(`fsaSource: 空路径 "${rel}"`)
  let d = dir
  for (const p of parts) d = await d.getDirectoryHandle(p)
  return (await d.getFileHandle(name)).getFile()
}

export function fsaSource(dir: FileSystemDirectoryHandle): FileSource {
  return {
    async readText(rel) {
      return (await fileOf(dir, rel)).text()
    },
    async readJson<T>(rel: string) {
      return JSON.parse(await (await fileOf(dir, rel)).text()) as T
    },
    async readBytes(rel) {
      return (await fileOf(dir, rel)).arrayBuffer()
    },
    async urlFor(rel) {
      return URL.createObjectURL(await fileOf(dir, rel))
    },
  }
}
```

- [ ] **Step 4: 跑测试验证通过**(4 passed)。

- [ ] **Step 5: 导出** — `packages/reforge/src/index.ts` 在 file-source 导出行下加:

```ts
export { fsaSource } from './fsa-source.js'
```

- [ ] **Step 6: 提交**

```bash
git add packages/reforge/src/fsa-source.ts packages/reforge/src/fsa-source.test.ts packages/reforge/src/index.ts
git commit -m "feat(reforge): fsaSource —— FileSource 经 FSA 目录句柄读(本地工程 P3)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 2: writeProject 增量 + 二进制

**Files:**
- Modify: `packages/editor/src/core/project-io.ts`(writeProject 扩;加 diffFiles + serializeProject 二进制透传)
- Test: `packages/editor/src/core/project-io.test.ts`(增量/删除/二进制测)

**Interfaces:**
- Produces:
  - `type ProjectFiles = Record<string, unknown | string | ArrayBuffer>`
  - `function diffFiles(prev: Map<string, string>, next: Record<string, unknown>): { write: string[]; remove: string[] }`
  - `writeProject(dir, files, opts?: { prevSnapshot?: Map<string, string> }): Promise<Map<string, string>>`(返回新快照)

- [ ] **Step 1: 写失败测试**(在 project-io.test.ts 追加):

```ts
import { diffFiles } from './project-io.js'

describe('diffFiles(增量-diff)', () => {
  test('只挑内容变了的写;快照有、现无的删', () => {
    const prev = new Map<string, string>([
      ['a.json', JSON.stringify({ v: 1 }, null, 2)],
      ['b.json', JSON.stringify({ v: 2 }, null, 2)],
      ['old.json', JSON.stringify({ v: 3 }, null, 2)],
    ])
    const next = { 'a.json': { v: 1 }, 'b.json': { v: 99 }, 'c.json': { v: 4 } }
    const { write, remove } = diffFiles(prev, next)
    expect(write.sort()).toEqual(['b.json', 'c.json']) // a 未变跳过;b 变;c 新
    expect(remove).toEqual(['old.json']) // old 消失 → 删
  })

  test('全未变 → 写空、删空(打开未改立即存 = 零写)', () => {
    const files = { 'a.json': { v: 1 } }
    const snap = new Map([['a.json', JSON.stringify({ v: 1 }, null, 2)]])
    expect(diffFiles(snap, files)).toEqual({ write: [], remove: [] })
  })
})
```

- [ ] **Step 2: 跑测试验证失败**(diffFiles 未导出)。

- [ ] **Step 3: 实现 diffFiles + 改 writeProject**

在 `project-io.ts`:序列化用与写盘同一套(`JSON.stringify(value, null, 2)`)。加:

```ts
/** 序列化单文件为落盘字符串(与 writeProject 写盘同规格,便于快照比对)。 */
function serializeOne(value: unknown): string {
  return typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`
}

/** 增量-diff:next 中内容与快照不同 → write;快照有而 next 无 → remove。 */
export function diffFiles(
  prev: Map<string, string>,
  next: Record<string, unknown>,
): { write: string[]; remove: string[] } {
  const write: string[] = []
  for (const [rel, value] of Object.entries(next)) {
    if (prev.get(rel) !== serializeOne(value)) write.push(rel)
  }
  const remove = [...prev.keys()].filter((rel) => !(rel in next))
  return { write, remove }
}
```

改 `writeProject`:只写 diff、删 remove、返回新快照。**二进制**:值为 `ArrayBuffer` → 直接 `w.write(new Blob([value]))`,不序列化。

```ts
export async function writeProject(
  dir: FileSystemDirectoryHandle,
  files: Record<string, unknown>,
  opts?: { prevSnapshot?: Map<string, string> },
): Promise<Map<string, string>> {
  const prev = opts?.prevSnapshot ?? new Map<string, string>()
  const { write, remove } = prev.size ? diffFiles(prev, files) : { write: Object.keys(files), remove: [] }
  for (const rel of write) {
    const value = files[rel]
    const segs = rel.split('/')
    const fileName = segs.pop()!
    let d = dir
    for (const seg of segs) d = await d.getDirectoryHandle(seg, { create: true })
    const fh = await d.getFileHandle(fileName, { create: true })
    const w = await fh.createWritable()
    await w.write(value instanceof ArrayBuffer ? new Blob([value]) : serializeOne(value))
    await w.close()
  }
  for (const rel of remove) {
    const segs = rel.split('/')
    const fileName = segs.pop()!
    let d = dir
    try {
      for (const seg of segs) d = await d.getDirectoryHandle(seg)
      await d.removeEntry(fileName)
    } catch {
      /* 已不在 = 目标态达成,忽略 */
    }
  }
  // 新快照:字符串文件记内容,二进制记占位标记(比对只对 JSON 内容,二进制罕改)
  const snapshot = new Map<string, string>()
  for (const [rel, value] of Object.entries(files)) {
    snapshot.set(rel, value instanceof ArrayBuffer ? ` bin:${value.byteLength}` : serializeOne(value))
  }
  return snapshot
}
```

- [ ] **Step 4: 跑测试验证通过** — `pnpm --filter @type-pal/editor exec vitest run src/core/project-io.test.ts`(原测 + 新 diffFiles 测)。

- [ ] **Step 5: 提交**

```bash
git add packages/editor/src/core/project-io.ts packages/editor/src/core/project-io.test.ts
git commit -m "feat(editor): writeProject 增量(快照-diff)+ 二进制;diffFiles 纯核可测(P3)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 3: handle-store(IndexedDB 句柄 + 手势重连)

**Files:**
- Create: `packages/editor/src/core/handle-store.ts`
- Test: `packages/editor/src/core/handle-store.test.ts`(纯逻辑:permission 状态机;IndexedDB 存取走浏览器)

**Interfaces:**
- Produces:
  - `saveHandle(id: string, handle: FileSystemDirectoryHandle): Promise<void>`(存 IndexedDB)
  - `loadHandle(id: string): Promise<FileSystemDirectoryHandle | null>`
  - `ensurePermission(handle, opts: { withRequest: boolean }): Promise<'granted' | 'prompt' | 'denied'>` —— `withRequest=false`(载入时)只 query;`withRequest=true`(用户点重连=手势内)才 request
  - `listRecent(): Promise<{ id: string; name: string }[]>`

- [ ] **Step 1: 写失败测试(permission 状态机纯逻辑)**

```ts
import { describe, expect, test, vi } from 'vitest'
import { ensurePermission } from './handle-store.js'

const handle = (q: PermissionState, r?: PermissionState) =>
  ({
    queryPermission: vi.fn(async () => q),
    requestPermission: vi.fn(async () => r ?? q),
  }) as unknown as FileSystemDirectoryHandle

describe('ensurePermission', () => {
  test('已 granted → 直接 granted,不 request', async () => {
    const h = handle('granted')
    expect(await ensurePermission(h, { withRequest: false })).toBe('granted')
    expect((h as unknown as { requestPermission: ReturnType<typeof vi.fn> }).requestPermission).not.toHaveBeenCalled()
  })
  test('prompt + withRequest=false(载入)→ 返回 prompt,不 request(须手势)', async () => {
    const h = handle('prompt')
    expect(await ensurePermission(h, { withRequest: false })).toBe('prompt')
    expect((h as unknown as { requestPermission: ReturnType<typeof vi.fn> }).requestPermission).not.toHaveBeenCalled()
  })
  test('prompt + withRequest=true(点重连=手势)→ request,得 granted', async () => {
    const h = handle('prompt', 'granted')
    expect(await ensurePermission(h, { withRequest: true })).toBe('granted')
  })
})
```

- [ ] **Step 2: 跑失败**。

- [ ] **Step 3: 实现** `handle-store.ts`(IndexedDB 薄壳 + permission 状态机):

```ts
/**
 * handle-store —— FSA 目录句柄持久化(IndexedDB)+ 权限手势约束(design §4.5)。
 * 句柄可结构化克隆存 IndexedDB;刷新取回后 queryPermission='prompt' 时**不能自动** requestPermission
 * (须用户手势内,同 audio warmup)→ 载入只 query,用户点「重新连接」再 request。
 */
type PermState = 'granted' | 'prompt' | 'denied'
interface HandleRec {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
}

const DB = 'type-pal-editor'
const STORE = 'project-handles'

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return idb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function saveHandle(id: string, name: string, handle: FileSystemDirectoryHandle): Promise<void> {
  await tx('readwrite', (s) => s.put({ id, name, handle } satisfies HandleRec))
}

export async function loadHandle(id: string): Promise<FileSystemDirectoryHandle | null> {
  const rec = (await tx<HandleRec | undefined>('readonly', (s) => s.get(id))) as HandleRec | undefined
  return rec?.handle ?? null
}

export async function listRecent(): Promise<{ id: string; name: string }[]> {
  const all = (await tx<HandleRec[]>('readonly', (s) => s.getAll())) as HandleRec[]
  return all.map(({ id, name }) => ({ id, name }))
}

/** 权限确保:withRequest=false 只 query(载入,无手势);true 才 request(用户点=手势内)。 */
export async function ensurePermission(
  handle: FileSystemDirectoryHandle,
  opts: { withRequest: boolean },
): Promise<PermState> {
  const h = handle as unknown as {
    queryPermission(o: { mode: 'readwrite' }): Promise<PermState>
    requestPermission(o: { mode: 'readwrite' }): Promise<PermState>
  }
  const q = await h.queryPermission({ mode: 'readwrite' })
  if (q === 'granted' || !opts.withRequest) return q
  return h.requestPermission({ mode: 'readwrite' })
}
```

- [ ] **Step 4: 跑测试通过**(ensurePermission 3 测;IndexedDB 存取部分 = 浏览器实测,P4 连测)。

- [ ] **Step 5: 提交**

```bash
git add packages/editor/src/core/handle-store.ts packages/editor/src/core/handle-store.test.ts
git commit -m "feat(editor): handle-store —— IndexedDB 句柄持久化 + 权限手势约束(P3)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 4: 编辑器保存接增量 + 全仓验收

**Files:**
- Modify: `packages/editor/src/ui/App.tsx`(save() 用增量 writeProject + 存快照 + 存句柄;首存后复用)

**分工:** Claude(接线 + 浏览器实测保存不崩)。

- [ ] **Step 1: 接线** —— App.tsx 的 `save()`:首次 showDirectoryPicker 后 `saveHandle` 入 IndexedDB;`writeProject(dir, serializeProject(state), { prevSnapshot })` 存返回的新快照进 ref;第二次起只写变化。(打开本地/启动屏 = P4;此处仅把现有保存换增量。)
- [ ] **Step 2: 全仓 check** —— `pnpm check` 全绿。
- [ ] **Step 3: 浏览器实测** —— 编辑器改一处(如拖进场点)→ 保存(选夹授权)→ 不崩、只写变化文件;再存(未改)→ 零写。⚠ 选夹是原生弹窗,须手点。
- [ ] **Step 4: 记录验收**。

---

## 后续(P3 落地后)

**P4 · 新建 + 打开本地 + 启动屏 + 种子打包**:pal 自包含种子打包(assets 相对化);ProjectPicker 启动屏;新建(克隆整套 / 空白骨架);打开本地(fsaSource 渲染);克隆进度条。真实 FSA 授权全链**浏览器实测(须用户手点选夹)**。

## Self-Review(已过)

- **Spec 覆盖**:P3 = design §3(fsaSource/urlFor)+ §4.4(增量快照-diff)+ §4.5(句柄 IndexedDB + 手势重连)+ §9(fsa-source/handle-store 落点)。✓
- **占位符**:无;每步确切代码/命令。✓
- **类型一致**:`fsaSource`/`diffFiles`/`writeProject(返回快照)`/`ensurePermission` 跨任务命名一致;`FileSource` 复用 P1。✓
- **可测边界**:纯逻辑(fsaSource/diffFiles/ensurePermission)内存 mock 全测;真实 FSA 授权 + IndexedDB 存取明确标浏览器实测(P4 连测),不诈称已验。
