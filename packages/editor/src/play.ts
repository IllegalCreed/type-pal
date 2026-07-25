/**
 * 编辑器同源试玩页(X5 落地本地工程)。「引擎试玩/试打/试放」都开本页。
 *
 * 为什么在编辑器里开引擎:本地工程 = FSA 文件夹句柄,**跨不了源** —— 6051 那台独立
 * reforge 永远读不到你的工程(曾写死 6051 → 空白工程试玩开出 pal 的李逍遥,作者报)。
 * 编辑器同源:句柄存 IndexedDB(handle-store),本页取出 → fsaSource → bootGame。
 *
 * 双路:?project=<id> → ① IndexedDB 有句柄(本地工程)= 手势授权后从磁盘启动
 * (读已保存内容,未保存改动不可见);② 无句柄 = 回退 dev 种子 http(projects/<id>,pal 走这)。
 * 其余 URL 参数(scene/pos/facing/battle/skill…)由 bootGame 自己读 location.search,原样生效。
 */
import { bootGame, fsaSource, loadProjectV5, loadProjectV5From } from '@type-pal/reforge'
import { ensurePermission, loadHandle } from './core/handle-store.js'

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

async function bootFromDir(dir: FileSystemDirectoryHandle): Promise<void> {
  const project = await loadProjectV5From(fsaSource(dir))
  await bootGame(project)
}

async function main(): Promise<void> {
  const projectId = new URLSearchParams(location.search).get('project')
  if (!projectId) return fail('缺 ?project=<工程id> 参数')

  const dir = await loadHandle(projectId).catch(() => null)
  if (!dir) {
    // 无句柄 → dev 种子回退(pal / demo 等仓库内工程,editor dev 服务 /projects)
    await bootGame(await loadProjectV5(projectId))
    return
  }
  // 本地工程:授权门。已 granted 直接起;否则要用户手势(浏览器安全要求)。
  const state = await ensurePermission(dir, { withRequest: false })
  if (state === 'granted') {
    await bootFromDir(dir)
    return
  }
  gate.hidden = false
  gateBtn.onclick = () => {
    void (async () => {
      const s = await ensurePermission(dir, { withRequest: true })
      if (s !== 'granted') {
        gateHint.textContent = '未授权,无法读取工程文件夹'
        return
      }
      gate.hidden = true
      await bootFromDir(dir).catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)))
    })()
  }
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)))
