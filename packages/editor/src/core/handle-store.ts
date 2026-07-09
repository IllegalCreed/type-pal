/**
 * handle-store —— FSA 目录句柄持久化(IndexedDB)+ 权限手势约束(design §4.5)。
 * 句柄可结构化克隆存 IndexedDB;刷新取回后 queryPermission='prompt' 时**不能自动** requestPermission
 * (须用户手势内,同 audio warmup)→ 载入只 query,用户点「重新连接」再 request。
 * IndexedDB 存取走浏览器(节点无 indexedDB);ensurePermission 是纯状态机(可单测)。
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

/** 存句柄(id = 工程标识;name = 显示名,如文件夹名)。 */
export async function saveHandle(
  id: string,
  name: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await tx('readwrite', (s) => s.put({ id, name, handle } satisfies HandleRec))
}

export async function loadHandle(id: string): Promise<FileSystemDirectoryHandle | null> {
  const rec = (await tx<HandleRec | undefined>('readonly', (s) => s.get(id))) as HandleRec | undefined
  return rec?.handle ?? null
}

/** 最近工程(名 + id;启动屏列表用)。 */
export async function listRecent(): Promise<{ id: string; name: string }[]> {
  const all = (await tx<HandleRec[]>('readonly', (s) => s.getAll())) as HandleRec[]
  return all.map(({ id, name }) => ({ id, name }))
}

/**
 * 权限确保:withRequest=false 只 query(载入,无手势,'prompt' 原样返回);
 * true 才 request(用户点=手势内)。已 granted 一律不 request。
 */
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
