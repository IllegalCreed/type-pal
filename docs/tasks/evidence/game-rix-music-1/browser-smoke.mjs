import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const preview = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '6007',
    '--strictPort',
  ],
  { cwd: 'packages/game', env: { ...process.env, E2E: '1' }, detached: true, stdio: 'ignore' },
)
try {
  for (let i = 0; i < 100; i++) {
    try {
      await fetch('http://localhost:6007/')
      break
    } catch {
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } })
  await context.addInitScript(() => {
    window.__qaMessages = []
    const NativeWorklet = window.AudioWorkletNode
    window.AudioWorkletNode = class extends NativeWorklet {
      constructor(...args) {
        super(...args)
        args[0].qaMusic = true
        if (args[1] === 'type-pal-rix') {
          const original = this.port.postMessage.bind(this.port)
          this.port.postMessage = (message, ...rest) => {
            window.__qaMessages.push(message)
            return original(message, ...rest)
          }
        }
      }
    }
    const Native = window.AudioContext
    window.__qaAudio = []
    window.__qaNative = Native
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args)
        this.qaGains = []
        window.__qaAudio.push(this)
      }
      createGain() {
        const gain = super.createGain()
        this.qaGains.push(gain)
        return gain
      }
    }
  })
  const page = await context.newPage()
  const errors = []
  const requests = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('request', (r) => requests.push(r.url()))
  await page.goto('http://localhost:6007/?skip-intro=1')
  await page
    .getByText('拒绝', { exact: true })
    .click({ timeout: 3000 })
    .catch(() => {})
  await page.locator('#boot-loading-enter-btn').click({ timeout: 30000 })
  await page.waitForFunction(() => !document.getElementById('boot-loading-enter-btn'))
  await page.locator('#tp-tools-launcher').click({ timeout: 30000 })
  await page.locator('.tp-tab').filter({ hasText: '系统' }).click()
  await page.locator('#tp-music-source').selectOption('rix')
  await page.waitForFunction(
    () => document.querySelector('#tp-music-source-status')?.textContent === '',
    { timeout: 15000 },
  )
  await page.waitForTimeout(1000)
  async function output() {
    return page.evaluate(async () => {
      const ctx = window.__qaAudio.findLast((c) => c.state === 'running' && c.qaMusic)
      if (!ctx) throw new Error('No live music context')
      const gain = ctx.qaGains[0]
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      const silent = window.__qaNative.prototype.createGain.call(ctx)
      silent.gain.value = 0
      gain.connect(analyser)
      analyser.connect(silent)
      silent.connect(ctx.destination)
      const values = new Float32Array(2048)
      let peak = 0
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 100))
        analyser.getFloatTimeDomainData(values)
        for (const v of values) peak = Math.max(peak, Math.abs(v))
      }
      gain.disconnect(analyser)
      analyser.disconnect()
      silent.disconnect()
      return {
        peak,
        gain: gain.gain.value,
        activeContexts: window.__qaAudio.filter((c) => c.state !== 'closed' && c.qaMusic).length,
      }
    })
  }
  const fmOutput = await output()
  if (fmOutput.peak <= 0.001) throw new Error('FM is silent')
  await page.getByRole('button', { name: '🔊 静音', exact: true }).click()
  const mutedOutput = await output()
  if (mutedOutput.peak !== 0) throw new Error('Mute leaked audio')
  await page.getByRole('button', { name: '🔇 已静音', exact: true }).click()
  await page.locator('#tp-music-source').selectOption('midi')
  await page.waitForFunction(
    () => document.querySelector('#tp-music-source-status')?.textContent === '',
  )
  await page.waitForTimeout(500)
  const midiOutput = await output()
  if (midiOutput.peak <= 0.001) throw new Error('MIDI is silent after switching')
  await page.locator('#tp-music-source').selectOption('rix')
  await page.waitForFunction(
    () => document.querySelector('#tp-music-source-status')?.textContent === '',
  )
  const requestStart = requests.length
  await page.reload()
  await page.locator('#boot-loading-enter-btn').click({ timeout: 30000 })
  await page.waitForFunction(() => !document.getElementById('boot-loading-enter-btn'))
  await page.locator('#tp-tools-launcher').click()
  await page.locator('.tp-tab').filter({ hasText: '系统' }).click()
  await page.waitForFunction(
    () => document.querySelector('#tp-music-source-status')?.textContent === '',
  )
  if ((await page.locator('#tp-music-source').inputValue()) !== 'rix')
    throw new Error('FM preference not restored')
  const fmReloadRequests = requests.slice(requestStart)
  if (fmReloadRequests.some((u) => u.includes('soundfont')))
    throw new Error('FM boot downloaded SoundFont')
  const restoredOutput = await output()
  console.log(
    'RESTORED',
    restoredOutput,
    await page.evaluate(() => ({
      messages: window.__qaMessages,
      audio: window.__qaAudio.map((c) => ({
        state: c.state,
        gains: c.qaGains.map((g) => g.gain.value),
      })),
      stored: localStorage.getItem('tp-muted'),
    })),
  )
  if (restoredOutput.peak <= 0.001) throw new Error('FM silent after refresh')
  console.log(
    'CACHE',
    await page.evaluate(async () => ({
      controller: !!navigator.serviceWorker.controller,
      keys: await caches.keys(),
      allAssets: (
        await Promise.all(
          (
            await caches.keys()
          ).map(async (key) => (await (await caches.open(key)).keys()).map((r) => r.url)),
        )
      )
        .flat()
        .filter((u) => u.includes('/assets/')),
      music: (
        await Promise.all(
          (
            await caches.keys()
          ).map(async (key) => (await (await caches.open(key)).keys()).map((r) => r.url)),
        )
      )
        .flat()
        .filter((u) => u.includes('rix') || u.endsWith('/music/mus.mkf')),
    })),
  )
  await page.waitForFunction(async () => {
    const keys = await caches.keys()
    const urls = (
      await Promise.all(
        keys.map(async (key) => (await (await caches.open(key)).keys()).map((r) => r.url)),
      )
    ).flat()
    return (
      !!navigator.serviceWorker.controller &&
      urls.some((u) => u.endsWith('/music/mus.mkf')) &&
      urls.some((u) => u.endsWith('.wasm'))
    )
  })
  const cachedRix = await page.evaluate(async () => {
    const keys = await caches.keys()
    return (
      await Promise.all(
        keys.map(async (key) => (await (await caches.open(key)).keys()).map((r) => r.url)),
      )
    )
      .flat()
      .filter(
        (u) => u.endsWith('/music/mus.mkf') || u.endsWith('.wasm') || u.includes('rix-worklet'),
      )
  })
  await page.locator('#tp-music-source').selectOption('midi')
  await page.waitForFunction(
    () => document.querySelector('#tp-music-source-status')?.textContent === '',
  )
  process.kill(-preview.pid, 'SIGTERM')
  await new Promise((r) => setTimeout(r, 300))
  let serverStopped = false
  try {
    await fetch('http://localhost:6007/')
  } catch {
    serverStopped = true
  }
  if (!serverStopped) throw new Error('QA preview did not stop')
  await context.setOffline(true)
  await page.locator('#tp-music-source').selectOption('rix')
  await page.waitForFunction(
    () => document.querySelector('#tp-music-source-status')?.textContent === '',
  )
  const offlineOutput = await output()
  if (offlineOutput.peak <= 0.001) throw new Error('Cached FM silent offline')
  const evidence = {
    serverStopped,
    cachedRix,
    offlineOutput,
    fmOutput,
    mutedOutput,
    midiOutput,
    restoredOutput,
    fmReloadSoundfontRequests: fmReloadRequests.filter((u) => u.includes('soundfont')),
  }

  console.log(
    await page.evaluate(() => ({
      text: document.querySelector('.tp-body')?.textContent,
      audio: window.__qaAudio.map((c) => ({
        state: c.state,
        rate: c.sampleRate,
        gains: c.qaGains.map((g) => g.gain.value),
      })),
    })),
  )
  await page.screenshot({ path: 'build/game-rix-music/fm-desktop.png' })
  await page.setViewportSize({ width: 375, height: 667 })
  await page.waitForTimeout(250)
  await page.screenshot({ path: 'build/game-rix-music/fm-mobile.png' })
  if (errors.length) throw new Error(JSON.stringify(errors))
  if ([fmOutput, midiOutput, restoredOutput, offlineOutput].some((o) => o.activeContexts !== 1))
    throw new Error('Retired music context remains active')
  await writeFile(
    'build/game-rix-music/first-smoke.json',
    JSON.stringify({ errors, requests, ...evidence }, null, 2),
  )
  await browser.close()
} finally {
  try {
    process.kill(-preview.pid, 'SIGTERM')
  } catch {}
}
