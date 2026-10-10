/** Failed full exports are not retried by best-effort failure diagnostics. The
 * caller still owns mandatory final validation/persistence on the success path. */
export function guardedEvidenceReader({ page, read, diagnostics }) {
  const failed = new WeakSet()
  const diagnose = async (operation, statusOnly) => {
    const source = page()
    if (!source || source.isClosed() || (!statusOnly && failed.has(source))) {
      diagnostics.push({
        label: statusOnly ? 'failure status' : 'failure evidence',
        skipped: !source ? 'no page' : source.isClosed() ? 'page closed' : 'export already failed',
      })
      return
    }
    try {
      await operation()
    } catch (error) {
      diagnostics.push({
        label: statusOnly ? 'failure status' : 'failure evidence',
        error: error.stack ?? String(error),
      })
    }
  }
  return {
    async read() {
      const source = page()
      try {
        return await read(source)
      } catch (error) {
        if (source) failed.add(source)
        throw error
      }
    },
    diagnose: (operation) => diagnose(operation, false),
    diagnoseStatus: (operation) => diagnose(operation, true),
  }
}
