/**
 * 编辑器同源试玩页(X5 落地本地工程)。「引擎试玩/试打/试放」都开本页。
 *
 * 为什么在编辑器里开引擎:本地工程 = FSA 文件夹句柄,**跨不了源** —— 6051 那台独立
 * reforge 永远读不到你的工程(曾写死 6051 → 空白工程试玩开出 pal 的李逍遥,作者报)。
 * 编辑器同源:句柄存 IndexedDB(handle-store),本页取出 → fsaSource → bootGame。
 *
 * 双路:?project=<id> 且没有 workspace = 明确从 HTTP dev 工程启动；
 * ?workspace=<workspaceId>&project=<id> = 只从对应本地句柄启动，句柄丢失时 fail loud，
 * 绝不按同名 project id 静默回退到仓库 PAL。
 * 其余 URL 参数(scene/pos/facing/battle/skill…)由 bootGame 自己读 location.search,原样生效。
 */
import { bootGame } from '@type-pal/reforge'
import { ensurePermission, type WorkspaceHandleRecord } from './core/handle-store.js'
import { loadPlayProject } from './core/load-play-project.js'
import {
  assertLoadedPlayProjectIdentity,
  resolvePlayWorkspaceRecord,
} from './core/play-workspace.js'

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
  await bootGame(project)
}

async function main(): Promise<void> {
  const params = new URLSearchParams(location.search)
  const projectId = params.get('project')
  if (!projectId) return fail('缺 ?project=<工程id> 参数')
  const workspaceId = params.get('workspace')

  if (!workspaceId) {
    // Only an explicit HTTP-dev URL may use repository content. A local workspace that lost its
    // handle must fail loudly instead of silently opening another project with the same id.
    await bootGame(await loadPlayProject(projectId))
    return
  }
  let record: WorkspaceHandleRecord
  try {
    record = await resolvePlayWorkspaceRecord(workspaceId, projectId)
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error))
  }
  // 本地工程:授权门。已 granted 直接起;否则要用户手势(浏览器安全要求)。
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
        gateHint.textContent = '未授权,无法读取工程文件夹'
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
