/**
 * 浏览器 console / 网络失败分类（Cursor flows 证据包）。
 */

const SAVE_STATE_404 = /\/projects\/[^/]+\/\.type-pal\/save-state\.json$/

export function classifyConsoleEntry(entry) {
  const text = entry.text ?? ''
  if (entry.type === 'pageerror') {
    return { bucket: 'pageerror', attributable: false, note: text.slice(0, 200) }
  }
  if (entry.type !== 'error') {
    return { bucket: entry.type, attributable: true, note: '' }
  }
  if (text.includes('Failed to load resource') && text.includes('save-state.json')) {
    return { bucket: 'error', attributable: true, note: 'expected save-state probe' }
  }
  if (text.includes('404') && text.includes('save-state')) {
    return { bucket: 'error', attributable: true, note: 'expected save-state probe' }
  }
  return { bucket: 'error', attributable: false, note: text.slice(0, 200) }
}

export function classifyFailedRequest(entry) {
  if (entry.status === 404 && SAVE_STATE_404.test(entry.url)) {
    return { attributable: true, note: 'readProjectSaveState NotFound probe' }
  }
  return { attributable: false, note: entry.failure ?? String(entry.status) }
}

export function summarizeConsole(consoleLog, failedRequests) {
  const classified = consoleLog.map((entry) => ({
    ...entry,
    classification: classifyConsoleEntry(entry),
  }))
  const failed = failedRequests.map((entry) => ({
    ...entry,
    classification: classifyFailedRequest(entry),
  }))
  const unattributedConsole = classified.filter(
    (e) => e.classification.bucket === 'error' && !e.classification.attributable,
  )
  const unattributedNetwork = failed.filter((e) => !e.classification.attributable)
  return {
    entries: classified,
    failedRequests: failed,
    counts: {
      total: consoleLog.length,
      error: classified.filter((e) => e.classification.bucket === 'error').length,
      warning: classified.filter((e) => e.type === 'warning').length,
      pageerror: classified.filter((e) => e.classification.bucket === 'pageerror').length,
    },
    unattributedConsoleCount: unattributedConsole.length,
    unattributedNetworkCount: unattributedNetwork.length,
    consoleAttested: unattributedConsole.length === 0 && unattributedNetwork.length === 0,
  }
}
