import {
  assertProjectSaveReadable,
  type BattleTrialConfig,
  battleTrialRevision,
  type FileSource,
  loadCurrentProjectFrom,
  parseBattleTrialConfig,
} from '@type-pal/reforge'
import { type EditorPlayIdentity, parsePlayProjectLocation, playProjectQuery } from './play-url.js'
import { isWorkspaceId } from './workspace-context.js'

const PROTOCOL = 'type-pal-battle-trial'
const HANDSHAKE_MS = 30_000
export interface BattleTrialPacket {
  launchId: string
  identity: EditorPlayIdentity
  config: BattleTrialConfig
  sourceToken: string
  revision: string
}
export function parseBattleTrialLocation(
  params: URLSearchParams,
): { launchId: string; identity: EditorPlayIdentity } | undefined {
  if (!params.has('battle-trial')) return undefined
  for (const key of params.keys()) {
    if (
      !['project', 'workspace', 'save-workspace', 'battle-trial'].includes(key) ||
      params.getAll(key).length !== 1
    )
      throw new Error(`独立试打参数无效或重复：${key}`)
  }
  const launchId = params.get('battle-trial')
  if (!isWorkspaceId(launchId)) throw new Error('独立试打启动标识无效，请从编辑器重新打开')
  const target = parsePlayProjectLocation(params)
  const workspaceId = target.source === 'local' ? target.workspaceId : target.saveWorkspaceId
  if (!workspaceId) throw new Error('独立试打缺少编辑器工作区身份')
  return { launchId, identity: { projectId: target.projectId, workspaceId, source: target.source } }
}
function sameIdentity(a: EditorPlayIdentity, b: EditorPlayIdentity): boolean {
  return a?.projectId === b.projectId && a?.workspaceId === b.workspaceId && a?.source === b.source
}
function message(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/** Synchronous popup creation preserves the user's gesture. Full configuration never enters a URL/storage. */
export function launchBattleTrial(options: {
  identity: EditorPlayIdentity
  config: BattleTrialConfig
  source: FileSource
  assertCanLaunch: () => void | Promise<void>
  onResult?: (result: string) => void
  onClosed?: () => void
}) {
  const identity = { ...options.identity },
    config = parseBattleTrialConfig(options.config)
  const query = playProjectQuery(identity)
  let launchId = crypto.randomUUID(),
    sent = false,
    acknowledged = false,
    closed = false,
    port: MessagePort | undefined
  let resolve!: () => void, reject!: (error: unknown) => void
  const ready = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  const child = window.open(`play.html?${query}&battle-trial=${launchId}`, '_blank')
  if (!child) throw new Error('浏览器阻止了试玩窗口，请允许弹窗后重试')
  let timeout = window.setTimeout(
    () => fail(new Error('试打启动超时，请关闭试打页后重试')),
    HANDSHAKE_MS,
  )
  const cleanup = () => {
    if (closed) return
    closed = true
    clearTimeout(timeout)
    clearInterval(poll)
    port?.close()
    window.removeEventListener('message', receive)
    window.removeEventListener('pagehide', close)
    options.onClosed?.()
  }
  const fail = (error: unknown) => {
    if (closed) return
    child.postMessage(
      {
        protocol: PROTOCOL,
        kind: 'error',
        launchId,
        message: error instanceof Error ? error.message : String(error),
      },
      window.location.origin,
    )
    reject(error)
    cleanup()
  }
  const close = () => {
    if (closed) return
    port?.postMessage({ kind: 'abort' })
    child.close()
    reject(new DOMException('试打已关闭', 'AbortError'))
    cleanup()
  }
  const check = async () => {
    const active = () => {
      if (closed || child.closed) throw new DOMException('试打已关闭', 'AbortError')
    }
    active()
    await options.assertCanLaunch()
    active()
    const sourceToken = await assertProjectSaveReadable(options.source)
    active()
    const project = await loadCurrentProjectFrom(options.source)
    active()
    if (project.manifest.id !== identity.projectId) throw new Error('试玩工程身份已变化')
    const revision = await battleTrialRevision(project)
    active()
    await options.assertCanLaunch()
    active()
    if ((await assertProjectSaveReadable(options.source)) !== sourceToken)
      throw new Error('工程保存状态已变化，请重新开始')
    return { sourceToken, revision }
  }
  let admitted: { sourceToken: string; revision: string } | undefined
  const receive = (event: MessageEvent) => {
    const data = message(event.data)
    if (
      closed ||
      event.origin !== window.location.origin ||
      event.source !== child ||
      data?.protocol !== PROTOCOL ||
      data.kind !== 'ready' ||
      data.launchId !== launchId
    )
      return
    if (sent) {
      if (acknowledged) fail(new Error('试打启动请求已使用；请从编辑器重新开始，不要刷新试打页'))
      return
    }
    sent = true
    const id = launchId
    void check()
      .then((current) => {
        if (closed || id !== launchId || child.closed) return
        if (
          admitted &&
          (admitted.revision !== current.revision || admitted.sourceToken !== current.sourceToken)
        )
          throw new Error('工程已变化，请返回编辑器按新配置开始试打')
        admitted = current
        const channel = new MessageChannel()
        port = channel.port1
        port.onmessage = (event) => {
          const value = message(event.data)
          if (closed || id !== launchId) return
          if (value?.kind === 'ack') {
            acknowledged = true
            clearTimeout(timeout)
            resolve()
          } else if (value?.kind === 'result' && typeof value.result === 'string')
            options.onResult?.(value.result)
          else if (value?.kind === 'restart') {
            port?.close()
            launchId = crypto.randomUUID()
            sent = false
            acknowledged = false
            timeout = window.setTimeout(() => fail(new Error('重新试打启动超时')), HANDSHAKE_MS)
            child.location.href = `play.html?${query}&battle-trial=${launchId}`
          }
        }
        port.start()
        const packet: BattleTrialPacket = {
          launchId,
          identity,
          config: parseBattleTrialConfig(config),
          ...current,
        }
        child.postMessage({ protocol: PROTOCOL, kind: 'config', packet }, window.location.origin, [
          channel.port2,
        ])
      })
      .catch((error) => {
        if (!closed && id === launchId) fail(error)
      })
  }
  const poll = window.setInterval(() => {
    if (child.closed) {
      reject(new DOMException('试打窗口已关闭', 'AbortError'))
      cleanup()
    }
  }, 500)
  window.addEventListener('message', receive)
  window.addEventListener('pagehide', close, { once: true })
  return { ready, close }
}

/** One-time, same-origin/source handshake; invalid or missing requests never call normal boot. */
export function receiveBattleTrial(
  target: NonNullable<ReturnType<typeof parseBattleTrialLocation>>,
) {
  const controller = new AbortController()
  let port: MessagePort | undefined,
    settled = false
  const opener = window.opener as Window | null
  if (!opener || opener.closed) throw new Error('请从编辑器发起独立试打；刷新后的请求不能重用')
  const ready = new Promise<BattleTrialPacket>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout)
      window.removeEventListener('message', receive)
      controller.signal.removeEventListener('abort', cancelled)
    }
    const cancelled = () => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new DOMException('试打已取消', 'AbortError'))
      }
    }
    const receive = (event: MessageEvent) => {
      if (settled || event.origin !== window.location.origin || event.source !== opener) return
      const data = message(event.data)
      if (data?.protocol !== PROTOCOL) return
      if (data.kind === 'error' && data.launchId === target.launchId) {
        settled = true
        cleanup()
        reject(new Error(String(data.message)))
        return
      }
      const packet = message(data.packet)
      if (data.kind !== 'config' || packet?.launchId !== target.launchId) return
      try {
        if (
          !sameIdentity(packet.identity as EditorPlayIdentity, target.identity) ||
          event.ports.length !== 1 ||
          typeof packet.sourceToken !== 'string' ||
          typeof packet.revision !== 'string' ||
          !/^[a-f0-9]{64}$/.test(packet.revision)
        )
          throw new Error('试打请求身份或版本无效')
        const config = parseBattleTrialConfig(packet.config)
        port = event.ports[0]
        if (!port) throw new Error('试打请求缺通道')
        port.onmessage = (event) => {
          if (message(event.data)?.kind === 'abort') controller.abort()
        }
        port.start()
        port.postMessage({ kind: 'ack' })
        settled = true
        cleanup()
        resolve({
          launchId: target.launchId,
          identity: target.identity,
          config,
          sourceToken: packet.sourceToken,
          revision: packet.revision,
        })
      } catch (error) {
        for (const port of event.ports) port.close()
        settled = true
        cleanup()
        reject(error)
      }
    }
    const timeout = window.setTimeout(() => {
      settled = true
      cleanup()
      reject(new Error('未收到一次性试打请求，请从编辑器重新打开'))
    }, HANDSHAKE_MS)
    window.addEventListener('message', receive)
    controller.signal.addEventListener('abort', cancelled, { once: true })
    opener.postMessage(
      { protocol: PROTOCOL, kind: 'ready', launchId: target.launchId },
      window.location.origin,
    )
  })
  const poll = window.setInterval(() => {
    if (opener.closed) controller.abort()
  }, 500)
  const dispose = () => {
    controller.abort()
    clearInterval(poll)
    port?.close()
    window.removeEventListener('pagehide', dispose)
  }
  window.addEventListener('pagehide', dispose, { once: true })
  return {
    ready,
    signal: controller.signal,
    restart() {
      if (controller.signal.aborted || !port || opener.closed)
        throw new Error('编辑器已关闭，请重新打开工程')
      port.postMessage({ kind: 'restart' })
    },
    result(result: string) {
      port?.postMessage({ kind: 'result', result })
    },
    dispose,
  }
}
