import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { runBrowserJourney } from './browser-journey.mjs'
import { CONTINUOUS_STORY_FRAGMENTS } from './continuous-story.mjs'
import { readGame } from './game-observer.mjs'

const args = process.argv.slice(2),
  engine = args.includes('--reforge') ? 'reforge' : 'game',
  headless = args.includes('--headless'),
  hold = args.includes('--hold'),
  tapePath = args[args.indexOf('--tape') + 1]
assert(tapePath, 'continuous replay requires --tape')
const tape = JSON.parse(await readFile(resolve(tapePath), 'utf8'))
assert.equal(tape.mode, 'story-only')
const entries = tape.actions[engine]
assert.deepEqual(
  entries.map((entry) => entry.fragment),
  CONTINUOUS_STORY_FRAGMENTS.map(({ id }) => id),
)

const read =
  engine === 'game'
    ? () => page.evaluate(readGame)
    : () =>
        page.evaluate(() => ({
          runtime: window.__tpObserve?.readRuntime?.(),
          scene: window.__tpObserve?.readRuntime?.()?.sceneId,
        }))
let page
let previousAtMs = null
const report = { engine, mode: 'continuous', storyOnly: true, fragments: [], actions: [] }
const waitRelease = (fragment) =>
  new Promise((resolveRelease, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`barrier release timeout ${fragment}`)),
      hold ? 12 * 60 * 60 * 1000 : 180000,
    )
    process.once('message', (message) => {
      if (message?.release !== fragment)
        return reject(new Error(`unexpected barrier release ${message?.release}`))
      clearTimeout(timer)
      resolveRelease()
    })
  })

await runBrowserJourney({
  name: `continuous-${engine}`,
  packageName: `@type-pal/${engine}`,
  environment: engine === 'game' ? { E2E: '1' } : { VITE_PROJECT_ID: 'pal' },
  arguments: [headless ? '--headless' : '--headed'],
  browserArgs: headless
    ? []
    : [`--window-size=756,982`, `--window-position=${engine === 'game' ? 0 : 756},0`],
  viewport: { width: 756, height: 900 },
  journeyTimeoutMs: hold ? 12 * 60 * 60 * 1000 : 240_000,
  sources: ['scripts/e2e/continuous-story.mjs', 'scripts/e2e/continuous-story-replay-engine.mjs'],
  journey: async ({ newPage, baseURL, out, until, health }) => {
    page = await newPage(`continuous-${engine}`)
    await page.goto(engine === 'reforge' ? `${baseURL}/?menu` : baseURL)
    await page.addStyleTag({
      content:
        'html,body{margin:0!important;width:100vw!important;height:100vh!important;overflow:hidden!important;background:#111!important;display:grid!important;place-items:center!important}#screen{width:100vw!important;height:auto!important;max-width:100vw!important;max-height:100vh!important;aspect-ratio:8/5!important;object-fit:contain!important;image-rendering:pixelated!important}',
    })
    await until(
      async () => {
        const overlay = page.getByText('点击屏幕开始 / Click to start', { exact: true })
        if (await overlay.isVisible()) await overlay.click()
        return read()
      },
      () => true,
      'continuous browser boot',
      60000,
    )
    for (const entry of entries) {
      const fragmentReport = {
        fragment: entry.fragment,
        actions: entry.actions.length,
        startedAt: Date.now(),
      }
      for (const action of entry.actions) {
        health()
        if (Number.isFinite(action.atMs) && previousAtMs !== null) {
          const gap = Math.max(0, Math.min(3000, action.atMs - previousAtMs))
          if (gap) await delay(gap)
        }
        previousAtMs = Number.isFinite(action.atMs) ? action.atMs : previousAtMs
        if (action.kind === 'down') await page.keyboard.down(action.key)
        else if (action.kind === 'up') await page.keyboard.up(action.key)
        else {
          await page.keyboard.down(action.key)
          await page.keyboard.up(action.key)
        }
        report.actions.push({ fragment: entry.fragment, ...action })
        await delay(action.key === 'Enter' ? 80 : 20)
      }
      const state = await read()
      fragmentReport.state = state
      fragmentReport.finishedAt = Date.now()
      report.fragments.push(fragmentReport)
      await page.screenshot({ path: resolve(out, `continuous-${entry.fragment}-checkpoint.png`) })
      if (process.send) process.send({ checkpoint: entry.fragment, engine, state })
      if (entry.fragment !== '006') await waitRelease(entry.fragment)
    }
    if (hold) await waitRelease('finish')
    await writeFile(resolve(out, 'continuous-report.json'), `${JSON.stringify(report, null, 2)}\n`)
  },
})
