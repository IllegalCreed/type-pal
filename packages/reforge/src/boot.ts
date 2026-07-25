/**
 * 独立 reforge 页入口壳:按 VITE_PROJECT_ID 加载工程 → bootGame。
 * (引擎本体在 main.ts 的 bootGame(project) —— 页面无关可复用;编辑器 play 页同源试玩
 * 走同一函数,传 FSA/HTTP source 装出的工程。)
 */
import { loadProjectV5 } from './loader-v5.js'
import { bootGame } from './main.js'

async function boot(): Promise<void> {
  const PROJECT_ID = import.meta.env.VITE_PROJECT_ID ?? 'demo'
  await bootGame(await loadProjectV5(PROJECT_ID))
}

boot().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e)
  const canvas = document.getElementById('screen') as HTMLCanvasElement | null
  const ctx = canvas?.getContext('2d')
  if (canvas && ctx) {
    ctx.fillStyle = '#200'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#f55'
    ctx.font = '12px monospace'
    ctx.fillText(`reforge ERR: ${msg}`, 10, 24)
  }
  console.error('[reforge]', e)
})
