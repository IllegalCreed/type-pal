import type * as Store from '../author-save-store.js'

/** Origin storage boundary only; the journal, policy, parser and loader remain production code. */
export const authorSaveStorage = {
  receipts: new Map<string, Store.AuthorSaveReceipt>(),
}

export function memoryAuthorSaveStore(actual: typeof Store): typeof Store {
  const copy = (value: Store.AuthorSaveReceipt) =>
    actual.parseAuthorSaveReceipt({
      ...structuredClone({ ...value, handle: undefined }),
      handle: value.handle,
    })
  return {
    ...actual,
    async findAuthorSaveReceipt(handle) {
      let found: Store.AuthorSaveReceipt | null = null
      for (const receipt of authorSaveStorage.receipts.values()) {
        if (await receipt.handle.isSameEntry(handle)) {
          if (found) throw new Error('同一目录有多个保存恢复身份')
          found = copy(receipt)
        }
      }
      return found
    },
    async loadAuthorSaveReceipt(id) {
      const receipt = authorSaveStorage.receipts.get(id)
      return receipt ? copy(receipt) : null
    },
    async storeAuthorSaveReceipt(receipt) {
      authorSaveStorage.receipts.set(receipt.workspaceId, copy(receipt))
    },
    async deleteStagingAuthorSaveReceipt(receipt) {
      const current = authorSaveStorage.receipts.get(receipt.workspaceId)
      if (
        !current ||
        current.phase !== 'staging' ||
        current.operationId !== receipt.operationId ||
        current.ownerNonce !== receipt.ownerNonce ||
        !(await current.handle.isSameEntry(receipt.handle))
      )
        throw new Error('恢复准备记录已变化')
      authorSaveStorage.receipts.delete(receipt.workspaceId)
    },
  }
}
