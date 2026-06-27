/**
 * Task 2 浏览器验收:静态 NPC 碰撞。一次性验收脚本。
 * 验 4 项:① 穿不过鬼 ② 撞停后能对话 ③ ?collision 鬼格显红 ④ 四向都挡 + 能绕过。
 * 跑法:cp 到 packages/game/_verify-npc.mts,cd packages/game && pnpm exec tsx _verify-npc.mts
 * (借 packages/game 的 @playwright/test;URL 用 reforge dev 的 5173)。
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const OUT = 'docs/phase2/slice1-indoor/verify-npc-collision'
mkdirSync(OUT, { recursive: true })

const GHOST = { x: 1280, y: 832 }
// WALK_STEP(dir) 复刻 main.ts:down{-16,8} up{16,-8} left{-16,-8} right{16,8}
const DIRS = { down: 'ArrowDown', up: 'ArrowUp', left: 'ArrowLeft', right: 'ArrowRight' } as const

// 复刻 collision.ts pixelToTile + sameTile(严格判定:是否进鬼格)。
const TILE_W = 32
const TILE_H = 16
function tile(x: number, y: number): string {
  let col = Math.floor(x / TILE_W)
  let row = Math.floor(y / TILE_H)
  let h = 0
  const xr = ((x % TILE_W) + TILE_W) % TILE_W
  const yr = ((y % TILE_H) + TILE_H) % TILE_H
  if (xr + yr * 2 >= 16) {
    if (xr + yr * 2 >= 48) { col++; row++ }
    else if (TILE_W - xr + yr * 2 < 16) { col++ }
    else if (TILE_W - xr + yr * 2 < 48) { h = 1 }
    else { row++ }
  }
  return `${col},${row},h${h}`
}
function inGhostTile(x: number, y: number): boolean {
  return tile(x, y) === tile(GHOST.x, GHOST.y)
}

/** 把玩家 pos 设到某世界坐标(直接 mutate __reforge.player.pos)。 */
async function setPlayerPos(page: import('@playwright/test').Page, x: number, y: number): Promise<void> {
  await page.evaluate(([px, py]) => {
    const r = (window as unknown as { __reforge: { player: { pos: { x: number; y: number } } } }).__reforge
    r.player.pos.x = px
    r.player.pos.y = py
  }, [x, y] as const)
}

async function playerPos(page: import('@playwright/test').Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const r = (window as unknown as { __reforge: { player: { pos: { x: number; y: number } } } }).__reforge
    return { x: r.player.pos.x, y: r.player.pos.y }
  })
}

/** 按住 dir 键 N 帧(每帧 ~16ms tick + 余量),松开。游戏 tick 在 rAF。 */
async function holdAndStep(page: import('@playwright/test').Page, dir: string, frames: number): Promise<void> {
  await page.keyboard.down(dir)
  // 每帧 STEP_MS=100ms 一步;N 步需 ~N*100ms + 余量。多按点保证走到(或撞停)。
  await page.waitForTimeout(frames * 120 + 200)
  await page.keyboard.up(dir)
  await page.waitForTimeout(150) // 等停步复位
}

const results: string[] = []
function log(s: string): void {
  process.stdout.write(s + '\n')
  results.push(s)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 960, height: 600 } })

// ── ① 穿不过鬼:从鬼左边(1232,832,相邻格)向右走,应停在鬼前、不进鬼格 ──
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => Boolean((window as unknown as { __reforge?: unknown }).__reforge), undefined, { timeout: 10_000 })
// 玩家放鬼左相邻(1280-48=1232,同 y)。向右走 8 步逼近鬼。
await setPlayerPos(page, 1232, 832)
await holdAndStep(page, DIRS.right, 10)
const afterRight = await playerPos(page)
// 严格判定:玩家终点是否进了鬼格(同格 = 穿过)。等距坐标系 x 可能略大于鬼 x,不能粗暴比 x。
const blockedFromLeft = !inGhostTile(afterRight.x, afterRight.y)
log(`① 从左向右逼近鬼:终点(${afterRight.x},${afterRight.y}) 鬼格=${tile(GHOST.x, GHOST.y)} 终点格=${tile(afterRight.x, afterRight.y)} → ${blockedFromLeft ? '✅ 被挡,没进鬼格' : '❌ 进鬼格了!'}`)

// ── ② 撞停后能对话 ──
await page.keyboard.press('Space')
let dialogueOpen = false
try {
  await page.waitForFunction(
    () => (window as unknown as { __reforge?: { dialogue: boolean } }).__reforge?.dialogue === true,
    undefined,
    { timeout: 3000 },
  )
  dialogueOpen = true
} catch {
  dialogueOpen = false
}
log(`② 撞停后按空格:对话${dialogueOpen ? '✅ 开启' : '❌ 没开'}`)
await page.screenshot({ path: `${OUT}/01-collide-and-talk.png` })
// 关掉对话,继续测
await page.keyboard.press('Space')
await page.waitForTimeout(300)

// ── ③ ?collision 鬼格显红 ──
await page.goto('http://localhost:5173/?collision', { waitUntil: 'networkidle' })
await page.waitForFunction(() => Boolean((window as unknown as { __reforge?: unknown }).__reforge), undefined, { timeout: 10_000 })
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/02-collision-debug.png` })
// 探鬼格附近画布像素是否有红(255,40,40)
const hasRedAtGhost = await page.evaluate((g) => {
  const cv = document.getElementById('screen') as HTMLCanvasElement
  const cx = cv.getContext('2d')
  if (!cx) return false
  const d = cx.getImageData(0, 0, cv.width, cv.height).data
  // 鬼世界 (1280,832),屏幕坐标 = 世界 - 相机。先粗扫全屏找 (255,40,40) 红块。
  // debug 红是 'rgba(255,40,40,0.95)',判 R>240 && G<80 && B<80。
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] > 240 && d[i + 1] < 80 && d[i + 2] < 80) return true
  }
  return false
}, GHOST)
log(`③ ?collision debug 层:${hasRedAtGhost ? '✅ 画面有红(禁入)格' : '❌ 没红格'}`)

// ── ④ 四向都挡 + 能绕过 ──
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => Boolean((window as unknown as { __reforge?: unknown }).__reforge), undefined, { timeout: 10_000 })
// 四向:从鬼的上/下/左/右相邻各走 10 步朝鬼,检查没进鬼格。
// 相邻格坐标(一步 ±16/±8):左(1264,824? 实际同 h0 邻格)。直接用对称的 4 个起点 + 朝鬼方向。
const cases: Array<{ name: string; start: { x: number; y: number }; dir: string }> = [
  { name: '左→右', start: { x: 1232, y: 832 }, dir: DIRS.right },
  { name: '右→左', start: { x: 1328, y: 832 }, dir: DIRS.left },
  { name: '上→下', start: { x: 1280, y: 784 }, dir: DIRS.down },
  { name: '下→上', start: { x: 1280, y: 880 }, dir: DIRS.up },
]
for (const c of cases) {
  await setPlayerPos(page, c.start.x, c.start.y)
  await holdAndStep(page, c.dir, 10)
  const p = await playerPos(page)
  // 严格判定:终点是否进了鬼格(同格 = 穿过)。
  const passed = !inGhostTile(p.x, p.y)
  log(`④ ${c.name}:终点(${p.x},${p.y}) → 终点格=${tile(p.x, p.y)} ${passed ? '✅ 挡住(没进鬼格)' : '❌ 穿/进鬼格'}`)
}
// 能绕过:从鬼左走 → 向上绕 → 再向右到鬼上方/右侧(不进鬼格)。
await setPlayerPos(page, 1232, 832)
await holdAndStep(page, DIRS.up, 6) // 先上移绕开鬼
await holdAndStep(page, DIRS.right, 8) // 再右移到鬼上方/右侧
const bypass = await playerPos(page)
// 绕过成功:玩家移动了(没被鬼卡死在原地)+ 没进鬼格。
const bypassOk = (bypass.x !== 1232 || bypass.y !== 832) && !inGhostTile(bypass.x, bypass.y)
log(`④ 绕过测试:经上方绕行到(${bypass.x},${bypass.y}) 终点格=${tile(bypass.x, bypass.y)} → ${bypassOk ? '✅ 能绕(动了 + 没进鬼格)' : '❌ 卡住/进鬼格'}`)

await browser.close()
process.stdout.write('\n=== 验收结果汇总 ===\n' + results.join('\n') + '\n')
