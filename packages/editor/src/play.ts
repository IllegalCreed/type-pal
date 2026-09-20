/**
 * 编辑器同源试玩页(X5 落地本地项目)。「引擎试玩/试打/试放」都开本页。
 *
 * 为什么在编辑器里开引擎:本地项目 = FSA 文件夹句柄,**跨不了源** —— 6051 那台独立
 * reforge 永远读不到你的项目(曾写死 6051 → 空白项目试玩开出 pal 的李逍遥,作者报)。
 * 编辑器同源:句柄存 IndexedDB(handle-store),本页取出 → fsaSource → bootGame。
 *
 * 双路:?project=<id> 且没有 workspace = 明确从 HTTP dev 项目启动；
 * ?save-workspace=<id> 为未绑定目录的编辑会话选择存档空间，不授予文件读取权；
 * ?workspace=<workspaceId>&project=<id> = 只从对应本地句柄启动，句柄丢失时 fail loud，
 * 绝不按同名 project id 静默回退到仓库 PAL。
 * 其余 URL 参数(scene/pos/facing/battle/skill…)由 bootGame 自己读 location.search,原样生效。
 */
import { bootGame, runBattleTrial } from '@type-pal/reforge'
import { parseBattleTrialLocation, receiveBattleTrial } from './core/battle-trial-launch.js'
import { ensurePermission, type WorkspaceHandleRecord } from './core/handle-store.js'
import { loadPlayProject } from './core/load-play-project.js'
import { parsePlayProjectLocation } from './core/play-url.js'
import {
  assertLoadedPlayProjectIdentity,
  resolvePlayWorkspaceRecord,
} from './core/play-workspace.js'
import { withProjectDirectoryReadLock } from './core/project-read-lock.js'

const gate = document.getElementById('gate') as HTMLDivElement
const gateBtn = document.getElementById('gate-btn') as HTMLButtonElement
const gateHint = document.getElementById('gate-hint') as HTMLParagraphElement

function fail(msg: string): void {
  gate.hidden = false
  gateBtn.hidden = true
  gateHint.textContent = msg
  gateHint.className = 'err'
  console.error('[play]', msg)
}

async function bootFromRecord(record: WorkspaceHandleRecord): Promise<void> {
  const project = await loadPlayProject('', record.handle)
  assertLoadedPlayProjectIdentity(record.projectId, project.manifest.id)
  await bootGame(project, {
    kind: 'workspace',
    projectId: project.manifest.id,
    workspaceId: record.workspaceId,
  })
}

async function main(): Promise<void> {
  const trial = parseBattleTrialLocation(new URLSearchParams(location.search))
  if (trial) {
    gate.hidden = false
    gateBtn.hidden = true
    gateHint.textContent = '正在接收独立试打请求…不读取或写入正常游戏存档。'
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.textContent = '取消并关闭'
    cancel.onclick = () => window.close()
    gateHint.after(cancel)
    const connection = receiveBattleTrial(trial)
    cancel.onclick = () => {
      connection.dispose()
      gateHint.textContent = '试打已取消，请关闭本页或从编辑器重新开始。'
      window.close()
    }
    const active = () => {
      if (connection.signal.aborted) throw new DOMException('试打已取消', 'AbortError')
    }
    try {
      const packet = await connection.ready
      active()
      let record: WorkspaceHandleRecord | undefined
      if (packet.identity.source === 'local') {
        record = await resolvePlayWorkspaceRecord(
          packet.identity.workspaceId,
          packet.identity.projectId,
        )
        active()
        const permission = await ensurePermission(record.handle, { withRequest: false })
        active()
        if (permission !== 'granted') {
          gate.hidden = false
          gateBtn.hidden = false
          gateHint.textContent = '独立试打需要读取已保存项目；不会读取或写入游戏存档。'
          await new Promise<void>((resolve, reject) => {
            const cleanup = () => {
              gateBtn.onclick = null
              connection.signal.removeEventListener('abort', abort)
            }
            const abort = () => {
              cleanup()
              reject(new DOMException('试打已取消', 'AbortError'))
            }
            gateBtn.onclick = () => {
              if (!record) return
              gateBtn.disabled = true
              void ensurePermission(record.handle, { withRequest: true })
                .then((state) => {
                  active()
                  if (state === 'granted') {
                    cleanup()
                    gateBtn.hidden = true
                    resolve()
                  } else gateHint.textContent = '未授权，请允许读取项目或关闭本页'
                })
                .catch((error) => {
                  cleanup()
                  reject(error)
                })
                .finally(() => {
                  gateBtn.disabled = false
                })
            }
            connection.signal.addEventListener('abort', abort, { once: true })
          })
        }
      }
      active()
      gateHint.textContent = '正在读取已保存项目…'
      const project = await loadPlayProject(packet.identity.projectId, record?.handle)
      active()
      assertLoadedPlayProjectIdentity(packet.identity.projectId, project.manifest.id)
      const handle = record?.handle
      gate.hidden = true
      await runBattleTrial(project, packet.config, {
        signal: connection.signal,
        sourceToken: packet.sourceToken,
        revision: packet.revision,
        withReadLock: handle ? (read) => withProjectDirectoryReadLock(handle, read) : undefined,
        onRestart: () => connection.restart(),
        onResult: (result) => connection.result(result),
      })
    } catch (error) {
      connection.dispose()
      throw error
    }
    return
  }
  const target = parsePlayProjectLocation(new URLSearchParams(location.search))
  const { projectId } = target

  if (target.source === 'http') {
    // Only an explicit HTTP-dev URL may use repository content. A local workspace that lost its
    // handle must fail loudly instead of silently opening another project with the same id.
    const project = await loadPlayProject(projectId)
    await bootGame(
      project,
      target.saveWorkspaceId === undefined
        ? { kind: 'project', projectId: project.manifest.id }
        : {
            kind: 'workspace',
            projectId: project.manifest.id,
            workspaceId: target.saveWorkspaceId,
          },
    )
    return
  }
  let record: WorkspaceHandleRecord
  try {
    record = await resolvePlayWorkspaceRecord(target.workspaceId, projectId)
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error))
  }
  // 本地项目:授权门。已 granted 直接起;否则要用户手势(浏览器安全要求)。
  const state = await ensurePermission(record.handle, { withRequest: false })
  if (state === 'granted') {
    await bootFromRecord(record)
    return
  }
  gate.hidden = false
  gateBtn.onclick = () => {
    void (async () => {
      const s = await ensurePermission(record.handle, { withRequest: true })
      if (s !== 'granted') {
        gateHint.textContent = '未授权,无法读取项目文件夹'
        return
      }
      gate.hidden = true
      await bootFromRecord(record).catch((e: unknown) =>
        fail(e instanceof Error ? e.message : String(e)),
      )
    })()
  }
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)))
