/**
 * TEST-CURSOR-ASSET-UI-LARGE-1：12 条真实功能视觉流程驱动。
 * 自有 vite 宿主（默认 6013），Playwright chrome headless；证据落 flows/FLOW-* 子目录。
 */

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import net from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { summarizeConsole } from './lib/console-classify.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..', '..', '..', '..')
const hostDir = resolve(here, 'browser-host')
const editorPkg = resolve(repoRoot, 'packages/editor/package.json')
const require = createRequire(editorPkg)
const { chromium } = require('playwright')

async function pickPort(start = 6013) {
  for (let port = start; port < start + 20; port += 1) {
    const free = await new Promise((resolvePort) => {
      const server = net.createServer()
      server.once('error', () => resolvePort(false))
      server.once('listening', () => server.close(() => resolvePort(true)))
      server.listen(port, '127.0.0.1')
    })
    if (free) return port
  }
  throw new Error('no free port in range')
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

async function waitForServer(url, timeoutMs = 120_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`server not ready: ${url}`)
}

function startVite(port) {
  const viteBin = resolve(repoRoot, 'packages/editor/node_modules/vite/bin/vite.js')
  const child = spawn(
    process.execPath,
    [
      viteBin,
      '--config',
      resolve(hostDir, 'vite.config.mts'),
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: hostDir,
      env: { ...process.env, CURSOR_FLOWS_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  return child
}

async function readSnapshot(page) {
  return page.evaluate(() => window.__cursorFlow?.getSnapshot?.() ?? null)
}

async function captureShot(page, path) {
  await page.screenshot({ path, fullPage: true })
  return {
    path,
    sha256: sha256File(path),
    width: page.viewportSize()?.width,
    height: page.viewportSize()?.height,
  }
}

const FLOW_DEFS = [
  {
    id: 'FLOW-R01',
    category: 'resource',
    contract: 'dom-filter-oracle',
    title: '世界精灵库搜索过滤',
    wide: { width: 1280, height: 800 },
    narrow: { width: 720, height: 640 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-R01`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-surface="world-sprite"]', { timeout: 120_000 })
      const before = await readSnapshot(page)
      const search = page.getByRole('textbox', { name: '过滤大世界精灵库' })
      await search.fill('Beta')
      await page.waitForFunction(
        () => {
          const rows = window.__cursorFlow?.getSnapshot?.()?.oracle?.visibleAssetIds ?? []
          return rows.length === 1 && rows[0] === 'sprite.flow.beta'
        },
        null,
        { timeout: 10_000 },
      )
      const betaValue = await search.inputValue()
      const afterBeta = await readSnapshot(page)
      const shotWide = await captureShot(page, resolve(outDir, 'wide-filtered.png'))
      await page.setViewportSize({ width: 720, height: 640 })
      await search.fill('')
      await search.fill('Alpha')
      await page.waitForFunction(
        () => {
          const rows = window.__cursorFlow?.getSnapshot?.()?.oracle?.visibleAssetIds ?? []
          return rows.length === 1 && rows[0] === 'sprite.flow.alpha'
        },
        null,
        { timeout: 10_000 },
      )
      const alphaValue = await search.inputValue()
      const after = await readSnapshot(page)
      const shotNarrow = await captureShot(page, resolve(outDir, 'narrow-filtered.png'))
      const betaRows = afterBeta?.oracle?.visibleAssetIds ?? []
      const alphaRows = after?.oracle?.visibleAssetIds ?? []
      return {
        contract: 'dom-filter-oracle',
        expect: 'Beta/Alpha 过滤后 visibleAssetIds 精确匹配单资产行',
        before,
        after,
        steps: ['wide: fill Beta', 'narrow: fill Alpha'],
        shots: [shotWide, shotNarrow],
        actual: { betaValue, alphaValue, betaRows, alphaRows },
        pass:
          betaValue.includes('Beta') &&
          alphaValue.includes('Alpha') &&
          betaRows.length === 1 &&
          betaRows[0] === 'sprite.flow.beta' &&
          alphaRows.length === 1 &&
          alphaRows[0] === 'sprite.flow.alpha' &&
          (before?.oracle?.visibleAssetIds?.length ?? 0) >= 2,
      }
    },
  },
  {
    id: 'FLOW-R02',
    category: 'resource',
    contract: 'select-purpose-oracle',
    title: '战斗精灵用途筛选',
    wide: { width: 1280, height: 900 },
    narrow: { width: 900, height: 720 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-R02`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[aria-label="用途筛选"]', { timeout: 120_000 })
      const before = await readSnapshot(page)
      const select = page.getByRole('combobox', { name: '用途筛选' })
      await select.focus()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      await page.waitForFunction(
        () => {
          const oracle = window.__cursorFlow?.getSnapshot?.()?.oracle
          const rows = oracle?.visibleAssetIds ?? []
          return (
            oracle?.purposeFilter === 'enemy' &&
            rows.includes('battle-sprite.flow.enemy-pack') &&
            !rows.includes('battle-sprite.flow.player-pack')
          )
        },
        null,
        { timeout: 30_000 },
      )
      const afterFilter = await readSnapshot(page)
      const shotWide = await captureShot(page, resolve(outDir, 'wide-purpose.png'))
      await page.setViewportSize({ width: 900, height: 720 })
      await select.focus()
      await page.keyboard.press('Home')
      await page.keyboard.press('Enter')
      await page.waitForFunction(
        () => {
          const rows = window.__cursorFlow?.getSnapshot?.()?.oracle?.visibleAssetIds ?? []
          return (
            rows.includes('battle-sprite.flow.enemy-pack') &&
            rows.includes('battle-sprite.flow.player-pack')
          )
        },
        null,
        { timeout: 30_000 },
      )
      const after = await readSnapshot(page)
      const shotNarrow = await captureShot(page, resolve(outDir, 'narrow-purpose-reset.png'))
      const filtered = afterFilter?.oracle?.visibleAssetIds ?? []
      const reset = after?.oracle?.visibleAssetIds ?? []
      const beforeRows = before?.oracle?.visibleAssetIds ?? []
      return {
        contract: 'select-purpose-oracle',
        expect: '敌人筛选含 enemy-pack 且不含 player-pack；重置后两包均可见',
        before,
        after,
        steps: ['purpose=敌人', 'narrow reset 全部'],
        shots: [shotWide, shotNarrow],
        actual: {
          purposeFilter: afterFilter?.oracle?.purposeFilter,
          filtered,
          reset,
          battleSpriteCount: afterFilter?.oracle?.battleSpriteCount,
        },
        pass:
          afterFilter?.oracle?.purposeFilter === 'enemy' &&
          filtered.includes('battle-sprite.flow.enemy-pack') &&
          !filtered.includes('battle-sprite.flow.player-pack') &&
          beforeRows.includes('battle-sprite.flow.enemy-pack') &&
          beforeRows.includes('battle-sprite.flow.player-pack') &&
          reset.includes('battle-sprite.flow.enemy-pack') &&
          reset.includes('battle-sprite.flow.player-pack') &&
          (afterFilter?.oracle?.battleSpriteCount ?? 0) >= 2,
      }
    },
  },
  {
    id: 'FLOW-R03',
    category: 'resource',
    contract: 'focus-object-oracle',
    title: '静态图资源对象聚焦',
    wide: { width: 1200, height: 800 },
    narrow: { width: 800, height: 700 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-R03`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-flow-id="FLOW-R03"]', { timeout: 60_000 })
      const before = await readSnapshot(page)
      await page.waitForSelector('[data-flow-id="FLOW-R03"] .image-asset-list .ds-catalog-row', {
        timeout: 60_000,
      })
      const firstRow = page
        .locator('[data-flow-id="FLOW-R03"] .image-asset-list .ds-catalog-row')
        .first()
      await firstRow.click()
      await page.waitForFunction(
        () => window.__cursorFlow?.getSnapshot?.()?.oracle?.focusObjectId === 'image.flow.alpha',
        null,
        { timeout: 10_000 },
      )
      const after = await readSnapshot(page)
      const shotWide = await captureShot(page, resolve(outDir, 'wide-focus.png'))
      await page.setViewportSize({ width: 800, height: 700 })
      await page.keyboard.press('Tab')
      const afterKb = await readSnapshot(page)
      const shotNarrow = await captureShot(page, resolve(outDir, 'narrow-keyboard.png'))
      return {
        contract: 'focus-object-oracle',
        expect: '点击目录行后 focusObjectId 为 image.flow.alpha',
        before,
        after: afterKb,
        steps: ['click first catalog row', 'Tab at narrow width'],
        shots: [shotWide, shotNarrow],
        pass:
          before?.oracle?.focusObjectId == null &&
          after?.oracle?.focusObjectId === 'image.flow.alpha' &&
          (after?.oracle?.catalogSize ?? 0) >= 2,
      }
    },
  },
  {
    id: 'FLOW-R04',
    category: 'resource',
    contract: 'canvas2d-pixel-oracle',
    title: '预览 Canvas2D 像素采样',
    wide: { width: 800, height: 600 },
    narrow: { width: 800, height: 600 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-R04`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-flow-id="FLOW-R04"]', { timeout: 30_000 })
      const before = await readSnapshot(page)
      const canvas2d = await page.evaluate(() => window.__cursorFlow?.probeCanvas2d?.())
      if (!canvas2d?.ok) {
        const shot = await captureShot(page, resolve(outDir, 'blocked.png'))
        return {
          contract: 'canvas2d-pixel-oracle',
          status: 'blocked',
          blockedReason: canvas2d?.note ?? 'Canvas2D unavailable',
          before,
          after: before,
          steps: ['probe Canvas2D'],
          shots: [shot],
          pass: false,
        }
      }
      await page.waitForFunction(
        () =>
          window.__cursorFlow?.getSnapshot?.()?.oracle?.productPreview === true &&
          window.__cursorFlow?.getSnapshot?.()?.oracle?.opaqueSampleOk === true,
        null,
        { timeout: 120_000 },
      )
      const after = await readSnapshot(page)
      const shot = await captureShot(page, resolve(outDir, 'pixel-sample.png'))
      return {
        contract: 'canvas2d-pixel-oracle',
        expect: '产品 PreviewCanvas 就绪且主画布有不透明像素',
        before,
        after,
        steps: ['mount PreviewCanvas', 'wait ready + opaque sample'],
        shots: [shot],
        pass:
          after?.oracle?.productPreview === true &&
          after?.oracle?.opaqueSampleOk === true &&
          (after?.oracle?.opaqueCount ?? 0) > 50 &&
          (after?.oracle?.canvasWidth ?? 0) >= 80,
      }
    },
  },
  {
    id: 'FLOW-R05',
    category: 'resource',
    contract: 'tileset-selection-oracle',
    title: '瓦片集选择',
    wide: { width: 1200, height: 800 },
    narrow: { width: 760, height: 680 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-R05`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-flow-id="FLOW-R05"]', { timeout: 90_000 })
      const before = await readSnapshot(page)
      const shotWide = await captureShot(page, resolve(outDir, 'wide-tileset.png'))
      await page.waitForSelector('[data-flow-id="FLOW-R05"] .tileset-library-row .mono', {
        timeout: 90_000,
      })
      await page
        .locator('[data-flow-id="FLOW-R05"] .tileset-library-row')
        .filter({ hasText: 'flow-tileset' })
        .click()
      await page.waitForFunction(
        () => window.__cursorFlow?.getSnapshot?.()?.oracle?.selectedTileset === 'flow-tileset',
        null,
        { timeout: 30_000 },
      )
      const afterSelect = await readSnapshot(page)
      await page.setViewportSize({ width: 760, height: 680 })
      const after = await readSnapshot(page)
      const shotNarrow = await captureShot(page, resolve(outDir, 'narrow-tileset.png'))
      return {
        contract: 'tileset-selection-oracle',
        expect: '初始未选 flow-tileset；点击后 selectedTileset=flow-tileset',
        before,
        after,
        steps: ['wide before select', 'click flow-tileset row', 'narrow viewport'],
        shots: [shotWide, shotNarrow],
        actual: { afterSelect: afterSelect?.oracle?.selectedTileset },
        pass:
          before?.oracle?.selectedTileset == null &&
          after?.oracle?.selectedTileset === 'flow-tileset' &&
          Array.isArray(after?.oracle?.tilesetIds) &&
          after.oracle.tilesetIds.includes('flow-tileset'),
      }
    },
  },
  {
    id: 'FLOW-R06',
    category: 'resource',
    contract: 'missing-asset-warning-oracle',
    title: '音效缺失警告与组合框恢复',
    wide: { width: 1280, height: 820 },
    narrow: { width: 820, height: 700 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-R06`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-surface="sound-tab"]', { timeout: 60_000 })
      await page.waitForFunction(
        () => window.__cursorFlow?.getSnapshot?.()?.oracle?.showsMissing === true,
        null,
        { timeout: 60_000 },
      )
      const before = await readSnapshot(page)
      const shotMissing = await captureShot(page, resolve(outDir, 'wide-missing.png'))
      const validId = before?.oracle?.validSoundId ?? 'sound.flow.valid'
      await page.evaluate((id) => {
        const row = [
          ...document.querySelectorAll(
            '[data-surface="sound-tab"] .audio-library-outliner .ds-catalog-row',
          ),
        ].find((node) => node.textContent?.includes(id))
        if (row instanceof HTMLElement) row.click()
      }, validId)
      await page.waitForFunction(
        () => window.__cursorFlow?.getSnapshot?.()?.oracle?.showsMissing === false,
        null,
        { timeout: 30_000 },
      )
      await page.setViewportSize({ width: 820, height: 700 })
      const after = await readSnapshot(page)
      const shotRecovered = await captureShot(page, resolve(outDir, 'narrow-recovered.png'))
      return {
        contract: 'missing-asset-warning-oracle',
        expect: 'ghost 深链缺失 → 点击合法音效后 showsMissing=false',
        before,
        after,
        steps: ['capture missing ghost focus', 'click valid sound row'],
        shots: [shotMissing, shotRecovered],
        pass:
          before?.oracle?.showsMissing === true &&
          before?.oracle?.focusAsset === 'sound.ghost.missing' &&
          after?.oracle?.showsMissing === false &&
          after?.oracle?.focusAsset === validId,
      }
    },
  },
  {
    id: 'FLOW-DS01',
    category: 'design-system',
    contract: 'reorder-order-oracle',
    title: 'DsReorder 键盘前移',
    wide: { width: 900, height: 600 },
    narrow: { width: 640, height: 560 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-DS01`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-ds-reorder-handle="true"]', { timeout: 30_000 })
      const before = await readSnapshot(page)
      const handleB = page.locator(
        '[data-flow-id="FLOW-DS01"] [data-ds-reorder-handle="true"][data-reorder-key="b"]',
      )
      await handleB.focus()
      const focusBeforeKb = await page.evaluate(
        () => document.activeElement?.getAttribute?.('data-reorder-key') ?? null,
      )
      await page.keyboard.press('Enter')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(150)
      const afterKeyboard = await readSnapshot(page)
      const focusAfterKb = await page.evaluate(
        () => document.activeElement?.getAttribute?.('data-reorder-key') ?? null,
      )
      const keyboardOrderOk =
        Array.isArray(afterKeyboard?.oracle?.order) && afterKeyboard.oracle.order[0] === 'b'
      const keyboardPass =
        JSON.stringify(before?.oracle?.order) === JSON.stringify(['a', 'b', 'c']) &&
        keyboardOrderOk &&
        focusBeforeKb === 'b'
      let afterMouse = null
      let usedFallback = false
      if (!keyboardPass) {
        usedFallback = true
        await page
          .locator('[data-flow-id="FLOW-DS01"]')
          .getByRole('button', { name: /前移 B/ })
          .click()
        await page.waitForTimeout(150)
        afterMouse = await readSnapshot(page)
      }
      const after = keyboardPass ? afterKeyboard : afterMouse
      const shotWide = await captureShot(page, resolve(outDir, 'wide-reorder.png'))
      await page.setViewportSize({ width: 640, height: 560 })
      const shotNarrow = await captureShot(page, resolve(outDir, 'narrow-reorder.png'))
      const mousePass =
        usedFallback &&
        Array.isArray(afterMouse?.oracle?.order) &&
        afterMouse.oracle.order[0] === 'b'
      return {
        contract: 'reorder-order-oracle',
        expect: '手柄聚焦后 ArrowUp 将 b 移到首位（键盘合同；鼠标前移另列）',
        before,
        afterKeyboard,
        afterMouse,
        after,
        focusBeforeKb,
        focusAfterKb,
        usedFallback,
        keyboardPass,
        mousePass,
        steps: keyboardPass
          ? ['focus handle b', 'Enter', 'ArrowUp', 'Enter']
          : ['focus handle b', 'Enter', 'ArrowUp', 'Enter', 'mouse fallback 前移 B'],
        shots: [shotWide, shotNarrow],
        // 键盘合同独立判定；鼠标纠正不得把 keyboardPass 改写成 true。
        pass: keyboardPass,
        counter: !keyboardPass,
      }
    },
  },
  {
    id: 'FLOW-DS02',
    category: 'design-system',
    contract: 'select-value-oracle',
    title: 'DsSelect 键盘改值',
    wide: { width: 800, height: 600 },
    narrow: { width: 640, height: 520 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-DS02`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-flow-select]', { timeout: 30_000 })
      const before = await readSnapshot(page)
      const combo = page.getByRole('combobox', { name: 'flow select' })
      await combo.focus()
      await page.keyboard.press('Space')
      await page.waitForTimeout(100)
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      await page.waitForFunction(
        () => window.__cursorFlow?.getSnapshot?.()?.oracle?.value === 'c',
        null,
        { timeout: 10_000 },
      )
      const afterWideKeyboard = await readSnapshot(page)
      const shotWide = await captureShot(page, resolve(outDir, 'wide-select.png'))
      await page.setViewportSize({ width: 640, height: 520 })
      await combo.click()
      await page.waitForTimeout(80)
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('Enter')
      const afterNarrowKeyboard = await readSnapshot(page)
      const shotNarrow = await captureShot(page, resolve(outDir, 'narrow-select.png'))
      const wideKeyboardPass =
        before?.oracle?.value === 'b' && afterWideKeyboard?.oracle?.value === 'c'
      return {
        contract: 'select-value-oracle',
        expect: '宽窗键盘 ArrowDown+Enter：b→c；窄窗相位另记（回 b 不否决宽窗）',
        before,
        afterWideKeyboard,
        afterNarrowKeyboard,
        // 兼容旧读字段：after 保留窄窗终态；pass 只认已证宽窗键盘相位。
        after: afterNarrowKeyboard,
        phases: {
          wideKeyboard: {
            value: afterWideKeyboard?.oracle?.value ?? null,
            pass: wideKeyboardPass,
          },
          narrowKeyboard: {
            value: afterNarrowKeyboard?.oracle?.value ?? null,
            note: '窄窗回 b 不是宽窗键盘失败',
          },
        },
        steps: ['open select', 'wide ArrowDown+Enter → c', 'narrow ArrowUp+Enter'],
        shots: [shotWide, shotNarrow],
        pass: wideKeyboardPass,
      }
    },
  },
  {
    id: 'FLOW-DS03',
    category: 'design-system',
    contract: 'number-escape-draft-oracle',
    title: 'DsNumberField Escape 取消草稿',
    wide: { width: 800, height: 600 },
    narrow: { width: 640, height: 520 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-DS03`, { waitUntil: 'networkidle' })
      const input = page
        .locator(
          '[data-flow-id="FLOW-DS03"] input[type="number"], [data-flow-id="FLOW-DS03"] input[inputmode="numeric"]',
        )
        .first()
      await input.waitFor({ timeout: 30_000 })
      const before = await readSnapshot(page)
      await input.click()
      await input.fill('17')
      await page.waitForTimeout(150)
      const mid = await readSnapshot(page)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(150)
      const after = await readSnapshot(page)
      const shotWide = await captureShot(page, resolve(outDir, 'wide-escape.png'))
      await page.setViewportSize({ width: 640, height: 520 })
      const shotNarrow = await captureShot(page, resolve(outDir, 'narrow-escape.png'))
      return {
        contract: 'number-escape-draft-oracle',
        expect: '编辑中 midDraft=true；Escape 后 value 仍为 2',
        before,
        after,
        mid,
        steps: ['edit draft 17', 'Escape'],
        shots: [shotWide, shotNarrow],
        pass:
          before?.oracle?.value === 2 &&
          mid?.oracle?.midDraft === true &&
          after?.oracle?.value === 2 &&
          after?.oracle?.inputValue === '2',
      }
    },
  },
  {
    id: 'FLOW-DS04',
    category: 'design-system',
    contract: 'virtual-scroll-oracle',
    title: 'DsVirtualList 滚动窗口',
    wide: { width: 900, height: 600 },
    narrow: { width: 480, height: 520 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-DS04`, { waitUntil: 'networkidle' })
      await page.waitForSelector('.ds-virtual-list', { timeout: 30_000 })
      const before = await readSnapshot(page)
      const list = page.locator('.ds-virtual-list')
      await list.evaluate((el) => {
        el.scrollTop = 640
        el.dispatchEvent(new Event('scroll', { bubbles: true }))
      })
      await page.waitForTimeout(100)
      const afterScroll = await readSnapshot(page)
      const shotWide = await captureShot(page, resolve(outDir, 'wide-scroll.png'))
      await page.setViewportSize({ width: 480, height: 520 })
      await list.evaluate((el) => {
        el.scrollTop = 960
        el.dispatchEvent(new Event('scroll', { bubbles: true }))
      })
      const after = await readSnapshot(page)
      const shotNarrow = await captureShot(page, resolve(outDir, 'narrow-scroll.png'))
      return {
        contract: 'virtual-scroll-oracle',
        expect: 'firstVisibleIndex 随 scrollTop 增大',
        before,
        after,
        steps: ['scrollTop=640 wide', 'scrollTop=960 narrow'],
        shots: [shotWide, shotNarrow],
        pass:
          (afterScroll?.oracle?.firstVisibleIndex ?? 0) >= 10 &&
          (after?.oracle?.firstVisibleIndex ?? 0) > (before?.oracle?.firstVisibleIndex ?? 0),
      }
    },
  },
  {
    id: 'FLOW-AR01',
    category: 'async-fail-recover',
    contract: 'upload-invalid-then-recover',
    title: '战斗上传非法文件失败与 PNG 恢复',
    wide: { width: 1000, height: 720 },
    narrow: { width: 820, height: 640 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-AR01`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-flow-id="FLOW-AR01"]', { timeout: 60_000 })
      const before = await readSnapshot(page)
      const bad = resolve(outDir, 'bad.txt')
      writeFileSync(bad, 'not-a-png')
      const input = page.locator('input[type="file"]').first()
      await input.setInputFiles(bad)
      await page.waitForTimeout(800)
      const afterBad = await readSnapshot(page)
      const shotFail = await captureShot(page, resolve(outDir, 'wide-invalid.png'))
      const png = resolve(outDir, 'tiny.png')
      writeFileSync(
        png,
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        ),
      )
      await input.setInputFiles(png)
      await page.waitForTimeout(800)
      const apply = page.getByRole('button', { name: '应用外观' })
      if (await apply.count()) await apply.click()
      await page.waitForTimeout(800)
      await page.setViewportSize({ width: 820, height: 640 })
      const after = await readSnapshot(page)
      const shotRecover = await captureShot(page, resolve(outDir, 'narrow-recovered.png'))
      return {
        contract: 'upload-invalid-then-recover',
        expect: 'bad 阶段 uploadError 非空；恢复后 status 含 applied',
        before,
        afterBad,
        after,
        steps: ['upload bad.txt', 'upload 1x1 png + apply'],
        shots: [shotFail, shotRecover],
        pass:
          Boolean(afterBad?.oracle?.uploadError) &&
          !String(afterBad?.oracle?.status ?? '').includes('applied') &&
          String(after?.oracle?.status ?? '').includes('applied') &&
          !String(before?.oracle?.status ?? '').includes('applied'),
      }
    },
  },
  {
    id: 'FLOW-AR02',
    category: 'async-fail-recover',
    contract: 'decode-fail-then-switch-asset',
    title: 'SpriteResourceViewer 损坏解码与切换恢复',
    wide: { width: 1100, height: 800 },
    narrow: { width: 820, height: 680 },
    async run(page, baseUrl, outDir) {
      await page.goto(`${baseUrl}?flow=FLOW-AR02`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-action="pick-bad"]', { timeout: 120_000 })
      const before = await readSnapshot(page)
      await page.waitForTimeout(1500)
      const afterBad = await readSnapshot(page)
      const shotBad = await captureShot(page, resolve(outDir, 'wide-corrupt.png'))
      await page.click('[data-action="pick-good"]')
      await page.waitForTimeout(1500)
      await page.setViewportSize({ width: 820, height: 680 })
      const after = await readSnapshot(page)
      const shotGood = await captureShot(page, resolve(outDir, 'narrow-recovered.png'))
      return {
        contract: 'decode-fail-then-switch-asset',
        expect: '损坏资产 loadProof=error；切换 good 后 error=false 且 loadProof 含 frames:',
        before,
        after,
        steps: ['load corrupt asset', 'click 正常'],
        shots: [shotBad, shotGood],
        pass:
          afterBad?.oracle?.error === true &&
          afterBad?.oracle?.loadProof === 'error' &&
          after?.oracle?.error === false &&
          String(after?.oracle?.loadProof ?? '').startsWith('frames:'),
      }
    },
  },
]

async function main() {
  const port = Number(process.env.CURSOR_FLOWS_PORT ?? (await pickPort(6013)))
  const baseUrl = `http://127.0.0.1:${port}/`
  const vite = startVite(port)
  let viteLog = ''
  vite.stdout?.on('data', (chunk) => {
    viteLog += chunk.toString()
  })
  vite.stderr?.on('data', (chunk) => {
    viteLog += chunk.toString()
  })

  try {
    await waitForServer(baseUrl)
    const browser = await chromium.launch({ channel: 'chrome', headless: true })
    const only = process.env.CURSOR_FLOW_ONLY?.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
    const selectedDefs = only?.length ? FLOW_DEFS.filter((def) => only.includes(def.id)) : FLOW_DEFS
    const summary = []
    for (const def of selectedDefs) {
      const outDir = resolve(here, def.id)
      mkdirSync(outDir, { recursive: true })
      const consoleLog = []
      const failedRequests = []
      const page = await browser.newPage({ viewport: def.wide })
      page.on('console', (msg) =>
        consoleLog.push({ type: msg.type(), text: msg.text().slice(0, 500) }),
      )
      page.on('pageerror', (err) =>
        consoleLog.push({ type: 'pageerror', text: String(err).slice(0, 500) }),
      )
      page.on('response', (res) => {
        if (res.status() >= 400) failedRequests.push({ url: res.url(), status: res.status() })
      })
      page.on('requestfailed', (req) => {
        failedRequests.push({ url: req.url(), status: null, failure: req.failure()?.errorText })
      })
      let result
      try {
        result = await def.run(page, baseUrl, outDir)
      } catch (error) {
        result = {
          contract: def.contract,
          status: 'error',
          error: String(error),
          before: null,
          after: null,
          steps: [],
          shots: [],
          pass: false,
        }
      }
      await page.close()
      const consoleSummary = summarizeConsole(consoleLog, failedRequests)
      const evidence = {
        id: def.id,
        category: def.category,
        title: def.title,
        contract: def.contract,
        host: baseUrl,
        viewport: { wide: def.wide, narrow: def.narrow },
        ...result,
        console: consoleSummary,
        recordedAt: new Date().toISOString(),
      }
      writeFileSync(resolve(outDir, 'before.json'), `${JSON.stringify(result.before, null, 2)}\n`)
      writeFileSync(resolve(outDir, 'after.json'), `${JSON.stringify(result.after, null, 2)}\n`)
      writeFileSync(resolve(outDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
      summary.push({
        id: def.id,
        category: def.category,
        contract: def.contract,
        pass: result.pass,
        status: result.status ?? (result.pass ? 'passed' : 'failed'),
        consoleAttested: consoleSummary.consoleAttested,
        dir: pathToFileURL(outDir).href,
      })
    }
    await browser.close()
    let indexFlows = summary
    if (only?.length) {
      // Partial re-run: merge into existing full index so CURSOR_FLOW_ONLY cannot shrink 12→N.
      try {
        const prev = JSON.parse(readFileSync(resolve(here, 'flow-index.json'), 'utf8'))
        const byId = new Map((prev.flows ?? []).map((entry) => [entry.id, entry]))
        for (const entry of summary) byId.set(entry.id, entry)
        indexFlows = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
      } catch {
        indexFlows = summary
      }
    }
    writeFileSync(
      resolve(here, 'flow-index.json'),
      `${JSON.stringify({ port, baseUrl, flows: indexFlows }, null, 2)}\n`,
    )
    console.log(JSON.stringify({ ok: true, port, flows: summary }, null, 2))
  } finally {
    vite.kill('SIGTERM')
    if (viteLog) writeFileSync(resolve(here, 'vite-run.log'), viteLog)
  }
}

await main()
