/**
 * Task 4 浏览器验收(D15 核心):?pal=0 vs ?pal=2 对话色/姓名/头像/光标必须完全一致。
 * 一次性验收脚本,非测试套件(跑完即弃)。用 packages/game 的 playwright 驱动。
 * 跑法:cp 到 packages/game/_verify-dialog.mts 后 `pnpm exec tsx _verify-dialog.mts`(那里有 @playwright/test)。
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const OUT = 'docs/phase2/foundation/verify-dialog'
mkdirSync(OUT, { recursive: true })

const CURSOR_YELLOWS: ReadonlyArray<readonly number[]> = [
  [247, 231, 109], [235, 211, 97], [227, 190, 89],
  [219, 174, 81], [231, 195, 93], [243, 219, 105],
]

/** 浏览器内探测当前画布是否含光标黄(任意 6 色之一)。 */
async function hasCursorYellow(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate((cols) => {
    const cv = document.getElementById('screen') as HTMLCanvasElement
    const cx = cv.getContext('2d')
    if (!cx) return false
    const d = cx.getImageData(0, 0, cv.width, cv.height).data
    for (let i = 0; i < d.length; i += 4) {
      for (const [r, g, b] of cols) {
        if (d[i] === r && d[i + 1] === g && d[i + 2] === b) return true
      }
    }
    return false
  }, CURSOR_YELLOWS as readonly (readonly number[])[])
}

/** 驱动游戏进对话:瞬移玩家到鬼旁(1280,832),按空格开对话,瞬显全字 + 光标。 */
async function capture(palId: number, label: string): Promise<void> {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
  const url = `http://localhost:5173/?pal=${palId}`
  process.stdout.write(`[${label}] goto ${url}\n`)
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => Boolean((window as unknown as { __reforge?: unknown }).__reforge), undefined, {
    timeout: 10_000,
  })
  // 瞬移玩家到鬼旁(鬼 1280,832),进 48px 交互圈
  await page.evaluate(() => {
    const r = (window as unknown as { __reforge: { player: { pos: { x: number; y: number } } } }).__reforge
    r.player.pos.x = 1280
    r.player.pos.y = 832
  })
  await page.waitForTimeout(300)
  await page.keyboard.press('Space') // 开对话
  await page.waitForFunction(
    () => (window as unknown as { __reforge?: { dialogue: boolean } }).__reforge?.dialogue === true,
    undefined,
    { timeout: 5_000 },
  )
  await page.waitForTimeout(900) // 等打字完一截
  await page.keyboard.press('Space') // 瞬显全字 + 光标(pageDone=true)
  // 光标每 100ms 换色,采样多帧挑含光标黄的(确保光标验收)
  let bestPath = ''
  for (let t = 0; t < 20; t++) {
    await page.waitForTimeout(90)
    if (await hasCursorYellow(page)) {
      bestPath = `${OUT}/pal${palId}-${label}.png`
      await page.screenshot({ path: bestPath })
      process.stdout.write(`[${label}] cursor captured at sample ${t} → ${bestPath}\n`)
      break
    }
  }
  if (!bestPath) {
    bestPath = `${OUT}/pal${palId}-${label}.png`
    await page.screenshot({ path: bestPath })
    process.stdout.write(`[${label}] NO cursor found in 20 samples → fallback ${bestPath}\n`)
  }
  await browser.close()
}

await capture(0, 'dialog')
await capture(2, 'dialog')
process.stdout.write('done\n')
