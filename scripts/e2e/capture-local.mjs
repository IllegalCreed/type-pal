import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { open, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { installLocalCapture } from './capture-browser.mjs'

export const CAPTURE_SOURCES = ['scripts/e2e/capture-browser.mjs', 'scripts/e2e/capture-local.mjs']
export const readableMs = (text) =>
  Math.min(5000, Math.max(1000, [...String(text ?? '').replace(/\s/gu, '')].length * 95))
// 60 s boot + 50 s longest native intro + 120 s route/animation + 80 readable pages at <=5 s.
// Only capture gets this independent budget; verification retains its existing limits.
export const CAPTURE_BUDGET_MS = 60_000 + 50_000 + 120_000 + 80 * 5000
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
export const captureCleanupComplete = (cleanup) =>
  ['complete', 'prototypesRestored', 'mixerClosed', 'tracksEnded'].every(
    (key) => cleanup?.[key] === true,
  )

export const isAudioFailureMessage = (type, text) =>
  ['warning', 'error'].includes(type) &&
  /^\[(audio|bgm|sfx)\]/iu.test(text) &&
  /fail|error|失败|静默|不可用|停用|取不到|拒绝|不是有效/iu.test(text)
export function isAudioResource(url) {
  const path = new URL(url).pathname
  return (
    /\.(wav|mid|midi|ogg|mp3|m4a|sf2|sf3)$/iu.test(path) ||
    /\/spessasynth_processor(?:\.min)?\.js$/u.test(path)
  )
}

/** Detached live observation; no save-slot writes or invented checkpoint envelope. */
export async function readCaptureWorld(page, engine) {
  return page.evaluate(async (engine) => {
    if (engine === 'game') {
      const { serializeSave } = await import('/src/tools/save-io.ts')
      return JSON.parse(serializeSave(window.__tpgs))
    }
    const runtime = window.__tpObserve.readRuntime()
    if (!runtime || !window.__rfWorld) throw new Error('capture end world unavailable')
    return structuredClone({
      world: window.__rfWorld,
      position: { sceneId: runtime.sceneId, ...runtime.position, facing: runtime.facing },
    })
  }, engine)
}

export function assertCaptureMedia(info, pcm, stats) {
  const video = info.streams.filter((stream) => stream.codec_type === 'video')
  const audio = info.streams.filter((stream) => stream.codec_type === 'audio')
  assert.equal(video.length, 1, 'capture needs one video stream')
  assert.equal(audio.length, 1, 'capture needs one audio stream')
  assert.equal(video[0].codec_name, 'h264')
  assert.equal(audio[0].codec_name, 'aac')
  assert.equal(video[0].width, 1280)
  assert.equal(video[0].height, 800)
  assert.equal(audio[0].sample_rate, '48000')
  const duration = Number(info.format.duration)
  assert(Number.isFinite(duration) && duration > 0.25, 'empty capture duration')
  assert(Math.abs(duration * 1000 - stats.durationMs) < 1500, 'capture duration drift/truncation')
  assert(stats.canvasFrames > 0 && stats.renderedFrames > 0, 'missing actual canvas frames')
  assert(stats.audioContexts > 0, 'no application audio context was observed')
  assert.equal(stats.phase, 'stopped')
  assert.deepEqual(stats.failures, [])
  assert(captureCleanupComplete(stats.cleanup), 'capture cleanup incomplete')
  assert(pcm.length > 0 && pcm.length % 4 === 0, 'empty audio decode')
  let sum = 0
  let peak = 0
  for (let i = 0; i < pcm.length; i += 4) {
    const value = pcm.readFloatLE(i)
    assert(Number.isFinite(value), 'nonfinite decoded audio')
    sum += value * value
    peak = Math.max(peak, Math.abs(value))
  }
  const rms = Math.sqrt(sum / (pcm.length / 4))
  assert(rms > 0.00001 && peak > 0.0001, 'recorded original audio is silent')
  return { duration, rms, peak, video: video[0], audio: audio[0] }
}

export function createLocalCapture({ enabled, report, out, health }) {
  let activePage
  let start
  let completed = false
  const audioFailures = []
  const observations = new Map()
  const healthy = () => {
    health()
    assert.deepEqual(audioFailures, [], 'captured audio pipeline failed')
  }
  const audioFailure = (detail) => {
    if (audioFailures.length < 20) audioFailures.push(detail)
    report.errors ??= []
    if (report.errors.length < 50) report.errors.push(`[capture-audio] ${detail}`)
  }
  const check = async (page) => {
    healthy()
    const state = await page.evaluate(() => window.__localCapture.state())
    assert.deepEqual(state.failures, [], 'browser capture failed')
    return state
  }
  return {
    enabled,
    async install(context) {
      if (enabled) await context.addInitScript(installLocalCapture)
    },
    observe(page) {
      if (!enabled || observations.has(page)) return
      const listeners = {
        console: (message) => {
          if (isAudioFailureMessage(message.type(), message.text())) audioFailure(message.text())
        },
        response: (response) => {
          if (response.status() >= 400 && isAudioResource(response.url()))
            audioFailure(`HTTP ${response.status()}: ${response.url()}`)
        },
        requestfailed: (request) => {
          if (isAudioResource(request.url()))
            audioFailure(`request failed: ${request.url()} ${request.failure()?.errorText ?? ''}`)
        },
      }
      for (const [name, listener] of Object.entries(listeners)) page.on(name, listener)
      observations.set(page, listeners)
    },
    async arm(page, semantic, videoPath = null, startOnVideo = Boolean(videoPath)) {
      if (!enabled) return
      assert(!activePage, 'one capture context per fragment')
      activePage = page
      start = semantic
      report.profile = 'capture'
      report.media = { status: 'running', kind: 'local-fragment-capture', semanticStart: semantic }
      await page.evaluate((value) => window.__localCapture.arm(value), { videoPath, startOnVideo })
      await check(page)
    },
    async readable(text, key, readKey) {
      if (!enabled) return true
      assert(
        typeof text === 'string' && text.trim().length > 0,
        'capture requires actual rendered dialogue text',
      )
      const until = performance.now() + readableMs(text)
      do {
        await check(activePage)
        if ((await readKey()) !== key) return false
        await delay(50)
      } while (performance.now() < until)
      return (await readKey()) === key
    },
    async finish(page, semantic) {
      if (!enabled) return
      assert.equal(page, activePage)
      const stats = await page.evaluate(() => window.__localCapture.finish())
      report.media.browser = stats
      assert.equal(stats.phase, 'stopped', stats.failures.join('\n'))
      assert(captureCleanupComplete(stats.cleanup), 'browser capture cleanup incomplete')
      const native = resolve(out, 'story.webm')
      const target = resolve(out, 'story.mp4')
      const handle = await open(native, 'wx')
      try {
        for (let offset = 0; offset < stats.bytes; offset += 1024 * 1024) {
          const bytes = await page.evaluate(
            ({ offset, length }) => window.__localCapture.chunk(offset, length),
            { offset, length: 1024 * 1024 },
          )
          await handle.write(Buffer.from(bytes, 'base64'))
        }
      } finally {
        await handle.close()
      }
      execFileSync(
        'ffmpeg',
        [
          '-v',
          'error',
          '-nostdin',
          '-i',
          native,
          '-c:v',
          'libx264',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-movflags',
          '+faststart',
          target,
        ],
        { timeout: 120_000 },
      )
      const info = JSON.parse(
        execFileSync(
          'ffprobe',
          ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', target],
          { encoding: 'utf8', timeout: 30_000 },
        ),
      )
      const pcm = execFileSync(
        'ffmpeg',
        [
          '-v',
          'error',
          '-nostdin',
          '-i',
          target,
          '-vn',
          '-af',
          'pan=mono|c0=c0',
          '-ar',
          '8000',
          '-f',
          'f32le',
          '-',
        ],
        { maxBuffer: 32 * 1024 * 1024, timeout: 30_000 },
      )
      const measured = assertCaptureMedia(info, pcm, stats)
      const frames = []
      for (const [index, fraction] of [0.05, 0.5, 0.95].entries()) {
        const path = resolve(out, `story-frame-${index + 1}.png`)
        execFileSync(
          'ffmpeg',
          [
            '-v',
            'error',
            '-nostdin',
            '-ss',
            String(measured.duration * fraction),
            '-i',
            target,
            '-frames:v',
            '1',
            path,
          ],
          { timeout: 30_000 },
        )
        const pixels = execFileSync(
          'ffmpeg',
          [
            '-v',
            'error',
            '-nostdin',
            '-i',
            path,
            '-vf',
            'scale=32:20',
            '-f',
            'rawvideo',
            '-pix_fmt',
            'rgb24',
            '-',
          ],
          { timeout: 30_000 },
        )
        frames.push({
          path,
          sha256: hash(await readFile(path)),
          nonBlack: [...pixels].some((channel) => channel > 8),
        })
      }
      assert(
        frames.some((frame) => frame.nonBlack),
        'all sampled frames are empty/black',
      )
      const receipt = {
        status: 'running',
        kind: 'local-fragment-capture',
        semanticStart: start,
        semanticEnd: semantic,
        fragment: report.fragment ?? '001',
        engine: report.engine ?? report.name?.split('-')[0],
        revision: report.revision,
        input: report.predecessor ?? { kind: 'canonical-new-game' },
        sources: report.hashes ?? report.runnerHashes,
        browser: stats,
        measured,
        frames,
        native: { path: native, sha256: hash(await readFile(native)) },
        video: { path: target, sha256: hash(await readFile(target)) },
      }
      try {
        // Encoding/decoding yields late browser/server failures and interrupts. A valid
        // media file cannot overrule the journey's health when publishing its receipt.
        healthy()
        report.media = { ...receipt, status: 'passed' }
        await writeFile(resolve(out, 'capture.json'), `${JSON.stringify(report.media, null, 2)}\n`)
        healthy()
        completed = true
      } catch (error) {
        report.media = { ...receipt, status: 'failed', failure: String(error) }
        await writeFile(resolve(out, 'capture.json'), `${JSON.stringify(report.media, null, 2)}\n`)
        throw error
      }
    },
    async cleanup(failed = false) {
      for (const [page, listeners] of observations)
        for (const [name, listener] of Object.entries(listeners)) page.off(name, listener)
      observations.clear()
      if (!enabled || !activePage || (completed && !failed)) return
      report.media ??= { kind: 'local-fragment-capture' }
      report.media.status = 'failed'
      if (!completed && !activePage.isClosed()) {
        report.media.browser = await activePage.evaluate(() => window.__localCapture.finish(true))
      }
      await writeFile(resolve(out, 'capture.json'), `${JSON.stringify(report.media, null, 2)}\n`)
    },
    assertComplete() {
      if (enabled) assert(completed, 'capture did not reach its semantic end')
    },
  }
}
