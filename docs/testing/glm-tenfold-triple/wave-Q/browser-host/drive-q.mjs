/**
 * GLM Wave Q 真实浏览器功能操作取证 —— 严格非剧情（标题菜单 / gallery / battle-preview /
 * shop-trial 公开功能面；不选择开局项、不进入 PAL 001/002 叙事路线）。
 *
 * 10 条流程：
 *   F1  媒体 autoplay 恢复与跳过取消链：?menu 播 trademark→splash 视频（autoplay 被拒则
 *       点击 overlay 恢复），Space 跳过两段（跳过键消费 + 500ms 缓冲），落到标题菜单。
 *   F2  标题菜单 ArrowDown 选中移动（可见差分 + 截图）。
 *   F3  ArrowUp 环绕到「旧的回忆」→ Enter 进读取进度（空档存档浏览）。
 *   F4  空档浏览 ArrowLeft 原地钳制（画面无变化）→ Escape 退回菜单（相位差分）。
 *   F5  菜单相位未处理键 passthrough（'a' 不拦截、无相位变化）。
 *   F6  ?gallery 速查表直返（console 标记 + 非零画布）。
 *   F7  ?battle-preview=24 静态摆位（console 标记 + 非零画布）。
 *   F8  shop-trial 非法参数失败恢复（reforge ERR 错误画屏 + console.error 分类）。
 *   F9  shop-trial=1 合法开店渲染 → Escape 退出资源（role=status 终态 + canvas 隐藏）。
 *   F10 shop-trial resize 适配（视口变化 → 画布重钳制）。
 *
 * 用法：先起 `pnpm --filter @type-pal/reforge dev:pal`（6051），再 node 本脚本。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const shotDir = resolve(here, '../browser-evidence')
mkdirSync(shotDir, { recursive: true })

const { chromium } = createRequire(resolve(here, '../../../../../packages/editor/package.json'))(
  'playwright',
)

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

/** 画布可见像素采样（缩到 160×100 降低闪烁噪声）。 */
function makeSampler(page) {
  return () =>
    page.evaluate(() => {
      const canvas = document.getElementById('screen')
      if (!canvas || canvas.width === 0) return null
      const off = document.createElement('canvas')
      off.width = 160
      off.height = 100
      const ctx = off.getContext('2d')
      ctx.drawImage(canvas, 0, 0, 160, 100)
      return Array.from(ctx.getImageData(0, 0, 160, 100).data)
    })
}

const diffRatio = (a, b) => {
  if (!a || !b) return 1
  let changed = 0
  for (let i = 0; i < a.length; i += 4) {
    if (
      Math.abs(a[i] - b[i]) > 8 ||
      Math.abs(a[i + 1] - b[i + 1]) > 8 ||
      Math.abs(a[i + 2] - b[i + 2]) > 8
    )
      changed++
  }
  return changed / (a.length / 4)
}

function attachPage(page, bucket) {
  page.on('console', (message) =>
    bucket.console.push({ type: message.type(), text: message.text().slice(0, 300) }),
  )
  page.on('pageerror', (error) =>
    bucket.console.push({ type: 'pageerror', text: String(error).slice(0, 300) }),
  )
  page.on('response', (response) => {
    if (response.status() >= 400)
      bucket.failedRequests.push({
        url: response.url().replace('http://localhost:6051', ''),
        status: response.status(),
      })
  })
  page.on('requestfailed', (request) => {
    bucket.failedRequests.push({
      url: request.url().replace('http://localhost:6051', ''),
      status: null,
      failure: request.failure()?.errorText,
    })
  })
}

// 宿主 autoplay 行为在无头 Chrome 下不确定（同参数多次启动拒绝/放行不一致）：
// F1 如实记录实际播放行为；overlay 恢复臂不在浏览器层宣称（N03 jsdom 已覆盖该合同）。
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const flows = []
const shotPaths = []

/** F1 媒体 autoplay 恢复与跳过取消链。 */
{
  const bucket = { console: [], failedRequests: [] }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  attachPage(page, bucket)
  const sample = makeSampler(page)
  const url = 'http://localhost:6051/?menu'
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  // 记录真实行为：video 挂载后 play() 是否被宿主拒绝（overlay 出现=拒绝；否则放行播放）。
  await page.waitForSelector('video', { timeout: 20000 })
  await page.waitForTimeout(1500)
  const videoState = await page.evaluate(() => {
    const v = document.querySelector('video')
    return {
      playing: !!v && !v.paused,
      overlayShown: [...document.querySelectorAll('div')].some((d) =>
        d.textContent?.includes('点击屏幕开始'),
      ),
    }
  })
  const videoPlaying = videoState.playing
  const overlayClicked = false
  const videoCount = await page.evaluate(() => document.querySelectorAll('video').length)
  const videoVisible = await page.evaluate(() => {
    const v = document.querySelector('video')
    return !!v && v.style.display !== 'none'
  })
  const f1Shot = resolve(shotDir, 'f1-trademark-video.png')
  await page.screenshot({ path: f1Shot, fullPage: true })
  shotPaths.push(f1Shot)
  // Space 跳过第一段（跳过键消费 + 500ms 缓冲后切第二段或收尾）。
  await page.keyboard.press('Space')
  await page.waitForTimeout(900)
  // 可能进入第二段（splash）→ 再跳一次；若已到菜单则循环结束。
  let menuSeen = false
  for (let i = 0; i < 4 && !menuSeen; i++) {
    const observe = await page.evaluate(() => {
      const o = Reflect.get(window, '__tpObserve')
      return !!o && typeof o.readBoot === 'function'
    })
    const hasVideo = await page.evaluate(() => document.querySelectorAll('video').length > 0)
    if (observe && !hasVideo) {
      menuSeen = true
      break
    }
    if (hasVideo) {
      const overlay = await page.$('div[style*="z-index: 10002"]')
      if (overlay) await overlay.click()
      await page.keyboard.press('Space')
      await page.waitForTimeout(900)
    } else {
      await page.waitForTimeout(500)
    }
  }
  if (!menuSeen) throw new Error('title menu not reached after skipping videos')
  await page.waitForTimeout(1500)
  const menuSample = await sample()
  if (!menuSample || diffRatio(menuSample, menuSample) !== 0) throw new Error('menu canvas missing')
  const f1MenuShot = resolve(shotDir, 'f1-menu-after-videos.png')
  await page.screenshot({ path: f1MenuShot, fullPage: true })
  shotPaths.push(f1MenuShot)
  const worldMounted = await page.evaluate(() => Reflect.has(window, '__rfWorld'))
  if (worldMounted) throw new Error('F1 entered story route')
  flows.push({
    id: 'F1',
    name: '媒体播放与跳过取消链（trademark/splash 视频 → 标题菜单）',
    url,
    autoplayBehavior: videoState.overlayShown
      ? 'host rejected autoplay (overlay shown); recovery not clicked'
      : 'host allowed autoplay; no overlay',
    // 如实撤回 r1 的「autoplay 被拒→点 overlay 恢复」表述：本环境宿主行为不确定，
    // 浏览器层不做恢复臂宣称；该合同由 N03 jsdom 用例「autoplay 被拒：点击 overlay 后重试
    // 成功并移除 overlay」覆盖。
    overlayRecoveryClaim: 'withdrawn — covered at jsdom level by N03',
    autoplayOverlayClicked: overlayClicked,
    videoPlaying,
    videoElementsSeen: videoCount,
    videoVisible,
    menuReached: menuSeen,
    worldMounted,
    shots: ['f1-trademark-video.png', 'f1-menu-after-videos.png'],
    console: bucket.console,
    failedRequests: bucket.failedRequests,
  })
  await page.close()
}

/** F2–F5 标题菜单内键盘流程（共用一个页面，skip-startup 直达菜单）。 */
{
  const bucket = { console: [], failedRequests: [] }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  attachPage(page, bucket)
  const sample = makeSampler(page)
  const url = 'http://localhost:6051/?menu&skip-startup=1'
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const observe = Reflect.get(window, '__tpObserve')
      return !!observe && typeof observe.readBoot === 'function'
    },
    null,
    { timeout: 60000 },
  )
  await page.waitForTimeout(1500)
  const baseline = await sample()

  // F2 ArrowDown 选中移动。
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(400)
  const afterMove = await sample()
  const moveDiff = diffRatio(baseline, afterMove)
  const openingAfterMove = await page.evaluate(
    () => Reflect.get(window, '__tpObserve').readBoot().opening,
  )
  const f2Shot = resolve(shotDir, 'f2-menu-move.png')
  await page.screenshot({ path: f2Shot, fullPage: true })
  shotPaths.push(f2Shot)
  flows.push({
    id: 'F2',
    name: '标题菜单 ArrowDown 选中移动',
    moveDiff,
    visibleChange: moveDiff > 0.001,
    cursorAfterMove: openingAfterMove?.cursor ?? null,
    cursorMoved: openingAfterMove?.cursor === 1,
    shots: ['f2-menu-move.png'],
  })

  // F3 pal 菜单仅 2 项（新的故事 / 旧的回忆）：F2 后光标已在「旧的回忆」→ Enter 进读取进度。
  await page.keyboard.press('Enter')
  let loadDiff = 0
  let stable = 0
  for (let i = 0; i < 40 && stable < 3; i++) {
    await page.waitForTimeout(250)
    const current = await sample()
    const d = diffRatio(baseline, current)
    if (d > 0.03 && Math.abs(d - loadDiff) < 0.005) stable++
    else stable = 0
    loadDiff = d
  }
  const openingInLoad = await page.evaluate(
    () => Reflect.get(window, '__tpObserve').readBoot().opening,
  )
  const loadBrowserVisible = openingInLoad?.phase === 'load'
  const f3Shot = resolve(shotDir, 'f3-load-browser.png')
  await page.screenshot({ path: f3Shot, fullPage: true })
  shotPaths.push(f3Shot)
  const loadSample = await sample()
  flows.push({
    id: 'F3',
    name: '光标在「旧的回忆」上 Enter 进空档存档浏览',
    loadDiff,
    loadBrowserVisible,
    shots: ['f3-load-browser.png'],
  })

  // F4 ArrowLeft 原地钳制（空档首页无左翻 → 画面无变化）→ Escape 退回菜单。
  const clampSamples = []
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(200)
    clampSamples.push(await sample())
  }
  const clampMaxDiff = Math.max(
    diffRatio(loadSample, clampSamples[0]),
    diffRatio(clampSamples[0], clampSamples[1]),
    diffRatio(clampSamples[1], clampSamples[2]),
  )
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  const backSample = await sample()
  const backDiff = diffRatio(loadSample, backSample)
  // 光标仍停在「旧的回忆」：ArrowDown 环绕回首项（仅移动，绝不 Enter）。
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(300)
  const wrapSample = await sample()
  const wrapDiff = diffRatio(backSample, wrapSample)
  const openingAfterWrap = await page.evaluate(
    () => Reflect.get(window, '__tpObserve').readBoot().opening,
  )
  const f4Shot = resolve(shotDir, 'f4-back-to-menu.png')
  await page.screenshot({ path: f4Shot, fullPage: true })
  shotPaths.push(f4Shot)
  flows.push({
    id: 'F4',
    name: '空档浏览 ArrowLeft 原地钳制 → Escape 退回菜单 → ArrowDown 环绕',
    clampMaxDiff,
    clampHeld: clampMaxDiff < 0.05,
    backDiff,
    backVisible: backDiff > 0.03,
    wrapDiff,
    wrapVisible: wrapDiff > 0.001,
    cursorAfterWrap: openingAfterWrap?.cursor ?? null,
    wrappedToFirst: openingAfterWrap?.cursor === 0 && openingAfterWrap?.phase === 'menu',
    shots: ['f4-back-to-menu.png'],
  })

  // F5 未处理键 passthrough：'a' 不拦截、无相位变化。
  const beforeA = await page.evaluate(() => Reflect.get(window, '__tpObserve').readBoot().opening)
  await page.keyboard.press('a')
  await page.waitForTimeout(400)
  const afterA = await sample()
  const aDiff = diffRatio(backSample, afterA)
  const afterAOpening = await page.evaluate(
    () => Reflect.get(window, '__tpObserve').readBoot().opening,
  )
  flows.push({
    id: 'F5',
    name: '菜单相位未处理键 passthrough',
    aDiff,
    blinkOnly: aDiff < 0.05,
    cursorBefore: beforeA?.cursor ?? null,
    cursorAfter: afterAOpening?.cursor ?? null,
    cursorHeld: beforeA?.cursor === afterAOpening?.cursor,
  })

  const worldMounted = await page.evaluate(() => Reflect.has(window, '__rfWorld'))
  if (worldMounted) throw new Error('F2-F5 entered story route')
  flows.find((f) => f.id === 'F2').worldMounted = worldMounted
  flows.find((f) => f.id === 'F2').console = bucket.console
  flows.find((f) => f.id === 'F2').failedRequests = bucket.failedRequests
  await page.close()
}

/** F6 ?gallery 直返；F7 ?battle-preview 摆位；各自独立页面。 */
for (const [id, url, logMarker, shotName] of [
  ['F6', 'http://localhost:6051/?gallery', 'sprite gallery', 'f6-gallery.png'],
  ['F7', 'http://localhost:6051/?battle-preview=24', 'battle preview', 'f7-battle-preview.png'],
]) {
  const bucket = { console: [], failedRequests: [] }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  attachPage(page, bucket)
  const sample = makeSampler(page)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const marker = bucket.console.find((c) => c.text.includes(logMarker))
  if (!marker) throw new Error(`${id} console marker missing: ${logMarker}`)
  const pixels = await sample()
  const nonzero = pixels ? pixels.filter((v, i) => i % 4 !== 3 && v > 8).length : 0
  const shot = resolve(shotDir, shotName)
  await page.screenshot({ path: shot, fullPage: true })
  shotPaths.push(shotName)
  const worldMounted = await page.evaluate(() => Reflect.has(window, '__rfWorld'))
  flows.push({
    id,
    name: id === 'F6' ? '?gallery 速查表直返' : '?battle-preview=24 静态摆位',
    url,
    consoleMarker: marker.text,
    nonzeroChannels: nonzero,
    canvasPainted: nonzero > 100,
    worldMounted,
    shots: [shotName],
    console: bucket.console,
    failedRequests: bucket.failedRequests,
  })
  await page.close()
}

/** F8 shop-trial 非法参数失败恢复；F9 合法开店 + Escape 退出资源；F10 resize 适配。 */
{
  const bucket = { console: [], failedRequests: [] }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  attachPage(page, bucket)
  const sample = makeSampler(page)
  const badUrl = 'http://localhost:6051/?shop-trial=1&money=abc'
  await page.goto(badUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const errLogged = bucket.console.find((c) => c.type === 'error' && c.text.includes('[reforge]'))
  const f8Shot = resolve(shotDir, 'f8-shop-trial-error.png')
  await page.screenshot({ path: f8Shot, fullPage: true })
  shotPaths.push(f8Shot)
  const errorPixels = await sample()
  flows.push({
    id: 'F8',
    name: 'shop-trial 非法参数失败恢复（reforge ERR 错误画屏）',
    url: badUrl,
    errorLogged: !!errLogged,
    errorText: errLogged?.text ?? null,
    canvasPainted: (errorPixels ?? []).filter((v, i) => i % 4 !== 3 && v > 8).length > 50,
    shots: ['f8-shop-trial-error.png'],
    console: bucket.console,
    failedRequests: bucket.failedRequests,
  })
  await page.close()

  const bucket2 = { console: [], failedRequests: [] }
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  attachPage(page2, bucket2)
  const sample2 = makeSampler(page2)
  const goodUrl = 'http://localhost:6051/?shop-trial=1&money=88'
  await page2.goto(goodUrl, { waitUntil: 'domcontentloaded' })
  await page2.waitForTimeout(5000)
  const beforePixels = await sample2()
  const f9Shot = resolve(shotDir, 'f9-shop-open.png')
  await page2.screenshot({ path: f9Shot, fullPage: true })
  shotPaths.push(f9Shot)
  const canvasBefore = await page2.evaluate(() => {
    const c = document.getElementById('screen')
    return { width: c?.width ?? 0, height: c?.height ?? 0, hidden: c?.hidden ?? true }
  })
  // F10 resize 重钳制。
  await page2.setViewportSize({ width: 800, height: 600 })
  await page2.waitForTimeout(800)
  const canvasAfter = await page2.evaluate(() => {
    const c = document.getElementById('screen')
    return { width: c?.width ?? 0, height: c?.height ?? 0, hidden: c?.hidden ?? true }
  })
  const f10Shot = resolve(shotDir, 'f10-shop-resize.png')
  await page2.screenshot({ path: f10Shot, fullPage: true })
  shotPaths.push(f10Shot)
  // F9 退出资源：Escape → 终态 status + canvas 隐藏。
  await page2.keyboard.press('Escape')
  await page2.waitForTimeout(1200)
  const exitStatus = await page2.evaluate(() => {
    const p = document.querySelector('p[role="status"]')
    const c = document.getElementById('screen')
    return { status: p?.textContent ?? null, hidden: c?.hidden ?? false }
  })
  const f9ExitShot = resolve(shotDir, 'f9-shop-exit.png')
  await page2.screenshot({ path: f9ExitShot, fullPage: true })
  shotPaths.push(f9ExitShot)
  flows.push({
    id: 'F9',
    name: 'shop-trial=1 合法开店渲染',
    url: goodUrl,
    canvasBefore,
    shopPainted: (beforePixels ?? []).filter((v, i) => i % 4 !== 3 && v > 8).length > 100,
    shots: ['f9-shop-open.png', 'f9-shop-exit.png'],
    console: bucket2.console,
    failedRequests: bucket2.failedRequests,
  })
  flows.push({
    id: 'F10',
    name: 'shop-trial resize 适配重钳制',
    canvasAfter,
    resized: canvasBefore.width !== canvasAfter.width,
    exitStatus,
    exitedCleanly: exitStatus.status !== null && exitStatus.hidden === true,
    shots: ['f10-shop-resize.png'],
  })
  await page2.close()
}

await browser.close()

// 汇总判据检查。
const failures = []
for (const f of flows) {
  if (
    f.id === 'F1' &&
    !(f.videoElementsSeen >= 1 && f.menuReached && !f.worldMounted && f.videoPlaying)
  )
    failures.push('F1')
  if (f.id === 'F2' && !(f.visibleChange && f.cursorMoved)) failures.push('F2')
  if (f.id === 'F3' && !(f.loadBrowserVisible && f.loadDiff > 0.03)) failures.push('F3')
  if (f.id === 'F4' && !(f.clampHeld && f.backVisible && f.wrappedToFirst)) failures.push('F4')
  if (f.id === 'F5' && !(f.blinkOnly && f.cursorHeld)) failures.push('F5')
  if (f.id === 'F6' && !(f.canvasPainted && !f.worldMounted)) failures.push('F6')
  if (f.id === 'F7' && !(f.canvasPainted && !f.worldMounted)) failures.push('F7')
  if (f.id === 'F8' && !(f.errorLogged && f.canvasPainted)) failures.push('F8')
  if (f.id === 'F9' && !f.shopPainted) failures.push('F9')
  if (f.id === 'F10' && !(f.resized && f.exitedCleanly)) failures.push('F10')
}
const evidence = {
  capturedAt: new Date().toISOString(),
  server: 'pnpm --filter @type-pal/reforge dev:pal (http://localhost:6051, real pal project)',
  browser: 'chrome headless 1440×900 (playwright channel:chrome)',
  scope:
    '严格非剧情：标题菜单/gallery/battle-preview/shop-trial 公开功能面；全程未选择开局项、无 __rfWorld；未进入 PAL 001/002 叙事路线',
  flows,
  screenshots: Object.fromEntries(shotPaths.map((name) => [name, sha256(resolve(shotDir, name))])),
}
writeFileSync(resolve(shotDir, 'browser-evidence.json'), JSON.stringify(evidence, null, 2))
if (failures.length) throw new Error(`flow criteria failed: ${failures.join(',')}`)
console.log(`OK: ${flows.length} flows captured; screenshots=${shotPaths.length}`)
for (const f of flows) console.log(`  ${f.id} ${f.name}`)
