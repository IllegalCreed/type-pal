/** Origin-private author-save receipts; separate from recent projects and player saves. */
import { CONTENT_VERSION } from '@type-pal/content'
import { parseProjectSaveState } from '@type-pal/reforge'
import {
  assertSaveOperationId,
  parseSaveIdentity,
  parseSaveSignature,
  type SaveIdentity,
  type SaveSignature,
  savePayloadHash,
} from './author-save-plan.js'
import {
  PAL_DEVELOPMENT_SENTINEL_PATH,
  SANDBOX_WORKSPACE_MARKER_PATH,
} from './workspace-context.js'

export const AUTHOR_SAVE_RECEIPT_DB = 'type-pal-editor-save-recovery'
const STORE = 'operations'
export type SaveReceiptPhase = 'staging' | 'ready' | 'applying' | 'data-complete' | 'committed'
export interface AuthorSaveReceipt {
  version: 1
  contentVersion: typeof CONTENT_VERSION
  workspaceId: string
  identity: SaveIdentity
  operationId: string
  ownerNonce: string
  handle: FileSystemDirectoryHandle
  phase: SaveReceiptPhase
  planHash: string | null
  previousState: string
  completed: number
  issued: boolean
  /** Exact raw identity bytes, frozen after restrictive sandbox bootstrap. */
  metadata: Record<string, SaveSignature>
  /** Paths owned by this operation inside its private directory; recorded BEFORE creation. */
  staged: Record<string, SaveSignature>
  registrationName: string | null
}

export function parseAuthorSaveReceipt(value: unknown): AuthorSaveReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('保存恢复凭据损坏')
  const r = value as Record<string, unknown>
  const fields = [
    'version',
    'contentVersion',
    'workspaceId',
    'identity',
    'operationId',
    'ownerNonce',
    'handle',
    'phase',
    'planHash',
    'previousState',
    'completed',
    'issued',
    'metadata',
    'staged',
    'registrationName',
  ]
  if (Object.keys(r).sort().join(',') !== fields.sort().join(','))
    throw new Error('保存恢复凭据字段不符')
  const identity = parseSaveIdentity(r.identity)
  assertSaveOperationId(r.operationId)
  assertSaveOperationId(r.ownerNonce)
  if (
    r.version !== 1 ||
    r.contentVersion !== CONTENT_VERSION ||
    r.workspaceId !== identity.workspaceId ||
    !r.handle ||
    typeof r.handle !== 'object' ||
    (r.handle as FileSystemDirectoryHandle).kind !== 'directory' ||
    typeof (r.handle as FileSystemDirectoryHandle).isSameEntry !== 'function' ||
    typeof r.phase !== 'string' ||
    !['staging', 'ready', 'applying', 'data-complete', 'committed'].includes(r.phase) ||
    (r.planHash !== null &&
      (typeof r.planHash !== 'string' || !/^[0-9a-f]{64}$/.test(r.planHash))) ||
    (r.phase !== 'staging' && r.planHash === null) ||
    typeof r.previousState !== 'string' ||
    !Number.isSafeInteger(r.completed) ||
    (r.completed as number) < 0 ||
    typeof r.issued !== 'boolean' ||
    ((r.phase === 'staging' || r.phase === 'ready') && (r.completed !== 0 || r.issued)) ||
    ((r.phase === 'data-complete' || r.phase === 'committed') && r.issued) ||
    (r.registrationName !== null && typeof r.registrationName !== 'string')
  )
    throw new Error('保存恢复凭据无效，已停止恢复并保留目录')
  const parseTable = (input: unknown, metadata: boolean): Record<string, SaveSignature> => {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new Error('恢复凭据文件表无效')
    const table: Record<string, SaveSignature> = Object.create(null)
    for (const [path, value] of Object.entries(input)) {
      if (
        metadata
          ? ![PAL_DEVELOPMENT_SENTINEL_PATH, SANDBOX_WORKSPACE_MARKER_PATH].includes(path)
          : path !== 'plan.json' && !/^blobs\/[0-9a-f]{64}$/.test(path)
      )
        throw new Error('恢复凭据含越界路径')
      table[path] = parseSaveSignature(value)
    }
    if (
      metadata &&
      (!Object.hasOwn(table, PAL_DEVELOPMENT_SENTINEL_PATH) ||
        !Object.hasOwn(table, SANDBOX_WORKSPACE_MARKER_PATH))
    )
      throw new Error('恢复凭据缺少身份文件证据')
    return table
  }
  const previous = JSON.parse(r.previousState) as unknown
  if (previous !== null) {
    const state = parseProjectSaveState(previous)
    if (state.phase !== 'committed' || state.operationId === r.operationId)
      throw new Error('恢复凭据的前一提交状态无效')
  }
  const metadata = parseTable(r.metadata, true)
  if (
    (identity.mode === 'local-project' &&
      Object.values(metadata).some((value) => value !== null)) ||
    (identity.mode === 'sandbox' &&
      (!metadata[SANDBOX_WORKSPACE_MARKER_PATH] ||
        metadata[PAL_DEVELOPMENT_SENTINEL_PATH] !== null)) ||
    (identity.mode === 'pal-development' &&
      (!metadata[PAL_DEVELOPMENT_SENTINEL_PATH] ||
        metadata[SANDBOX_WORKSPACE_MARKER_PATH] !== null))
  )
    throw new Error('恢复凭据的身份文件与工作区模式不符')
  const staged = parseTable(r.staged, false)
  for (const [path, signature] of Object.entries(staged)) {
    if (
      signature &&
      path.startsWith('blobs/') &&
      savePayloadHash(signature) !== path.slice('blobs/'.length)
    )
      throw new Error('恢复 payload 路径与签名不符')
    if (r.phase !== 'staging' && signature === null) throw new Error('恢复计划尚未完整封存')
  }
  if (r.phase !== 'staging' && r.phase !== 'committed') {
    const signature = staged['plan.json']
    if (!signature || savePayloadHash(signature) !== r.planHash)
      throw new Error('恢复凭据缺少匹配的封存计划')
  }
  return {
    version: 1,
    contentVersion: CONTENT_VERSION,
    workspaceId: identity.workspaceId,
    identity,
    operationId: r.operationId,
    ownerNonce: r.ownerNonce,
    handle: r.handle as FileSystemDirectoryHandle,
    phase: r.phase as SaveReceiptPhase,
    planHash: r.planHash as string | null,
    previousState: r.previousState,
    completed: r.completed as number,
    issued: r.issued,
    metadata,
    staged,
    registrationName: r.registrationName as string | null,
  }
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false
    const request = indexedDB.open(AUTHOR_SAVE_RECEIPT_DB, 1)
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: 'workspaceId' })
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      blocked = true
      reject(new Error('恢复凭据数据库被其他页面阻塞，请关闭该页面后重试'))
    }
    request.onsuccess = () => {
      if (blocked) request.result.close()
      else resolve(request.result)
    }
  })
}

/** Promise resolves only on transaction COMPLETE. FSA awaits never run inside an IDB transaction. */
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction
    try {
      tx = db.transaction(STORE, mode, { durability: 'strict' })
    } catch (error) {
      db.close()
      reject(error)
      return
    }
    let result: T
    tx.oncomplete = () => {
      db.close()
      resolve(result)
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error ?? new Error('保存恢复凭据事务已中止'))
    }
    tx.onerror = () => {
      /* Abort/complete is the transaction boundary, not a request event. */
    }
    try {
      const request = action(tx.objectStore(STORE))
      request.onsuccess = () => {
        result = request.result
      }
      // Default request error handling aborts the transaction; do not preventDefault it.
    } catch (error) {
      tx.abort()
      db.close()
      reject(error)
    }
  })
}

export async function loadAuthorSaveReceipt(
  workspaceId: string,
): Promise<AuthorSaveReceipt | null> {
  const value = await transaction('readonly', (store) => store.get(workspaceId))
  return value === undefined ? null : parseAuthorSaveReceipt(value)
}
export async function findAuthorSaveReceipt(
  handle: FileSystemDirectoryHandle,
): Promise<AuthorSaveReceipt | null> {
  const values: unknown[] = await transaction('readonly', (store) => store.getAll())
  let found: AuthorSaveReceipt | null = null
  for (const value of values) {
    const receipt = parseAuthorSaveReceipt(value)
    if (await receipt.handle.isSameEntry(handle)) {
      if (found) throw new Error('同一目录有多个保存恢复身份，拒绝重放')
      found = receipt
    }
  }
  return found
}
/** Internal persistence storage; caller must already hold the corresponding workspace lock. */
export async function storeAuthorSaveReceipt(receipt: AuthorSaveReceipt): Promise<void> {
  await transaction('readwrite', (store) => store.put(parseAuthorSaveReceipt(receipt)))
}

/** Remove only the same unsealed attempt, while its workspace lock is held. */
export async function deleteStagingAuthorSaveReceipt(receipt: AuthorSaveReceipt): Promise<void> {
  const current = await loadAuthorSaveReceipt(receipt.workspaceId)
  if (
    !current ||
    current.phase !== 'staging' ||
    current.operationId !== receipt.operationId ||
    current.ownerNonce !== receipt.ownerNonce ||
    !(await current.handle.isSameEntry(receipt.handle))
  )
    throw new Error('恢复准备记录已变化，拒绝删除')
  await transaction('readwrite', (store) => store.delete(receipt.workspaceId))
}
