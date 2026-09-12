// Full PAL clone + incremental save measurement on fresh, isolated OPFS only.
// Requires localhost:6011 editor dev server; PAL source files are only read. No user profiles used.
// No timings are CI thresholds; run without concurrent check/coverage and compare like-for-like.

import { mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const runtime = process.env.TYPE_PAL_PLAYWRIGHT_PACKAGE_JSON
if (!runtime)
  throw new Error(
    'Set TYPE_PAL_PLAYWRIGHT_PACKAGE_JSON to an absolute external runtime package.json providing playwright',
  )
const require = createRequire(runtime)
const { chromium } = require('playwright')
const out = mkdtempSync(join(tmpdir(), 'type-pal-save-measure-'))
console.log('EVIDENCE_DIRECTORY', out)
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const mode = process.argv[2] ?? 'current'
if (!/^[a-z0-9-]+$/.test(mode))
  throw new Error('Measurement label must contain only lowercase letters, digits, hyphens')
const browser = await chromium.launch({
  executablePath:
    process.env.TYPE_PAL_CHROME_EXECUTABLE ??
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
const context = await browser.newContext()
let ticker
try {
  const page = await context.newPage()
  page.on('console', (message) => console.log(message.text()))
  await page.goto('http://localhost:6011/projects/pal/manifest.json')
  const cdp = await context.newCDPSession(page)
  let samples = 0,
    chain = Promise.resolve()
  const peak = { usedSize: 0, totalSize: 0, embedderHeapUsedSize: 0, backingStorageSize: 0 }
  ticker = setInterval(() => {
    chain = chain
      .then(async () => {
        const value = await cdp.send('Runtime.getHeapUsage')
        samples++
        for (const key of Object.keys(peak)) peak[key] = Math.max(peak[key], value[key] ?? 0)
      })
      .catch((error) => console.log('SAMPLE ERROR', error.message))
  }, 500)
  const result = await page.evaluate(
    async ({ mode, sourceModule }) => {
      const { cloneFromPal } = await import('/src/core/clone.ts')
      const { httpSource } = await import(sourceModule)
      const { createLocalWorkspaceContext } = await import('/src/core/workspace-context.ts')
      const {
        authorizeFirstSaveTarget,
        withAuthorizedWorkspaceMutation,
        registerAuthorizedWorkspaceMutation,
      } = await import('/src/core/workspace-persistence.ts')
      const { finishOpen } = await import('/src/core/open-actions.ts')
      const source = httpSource('/projects/pal')
      const catalog = await source.readJson('assets/index.json')
      const assets = Object.values(catalog.assets)
      const target = await (await navigator.storage.getDirectory()).getDirectoryHandle(
        `pal-bench-${mode}`,
        { create: true },
      )
      const context = createLocalWorkspaceContext('pal', 'pal-development-snapshot-clone')
      const streams = new WeakMap()
      const create = FileSystemFileHandle.prototype.createWritable
      const write = FileSystemWritableFileStream.prototype.write
      const close = FileSystemWritableFileStream.prototype.close
      let stagingBytes = 0,
        authorBytes = 0,
        closes = 0,
        firstAuthorMs = null
      const start = performance.now()
      FileSystemFileHandle.prototype.createWritable = async function (...args) {
        const stream = await create.apply(this, args)
        streams.set(stream, { name: this.name, size: 0 })
        return stream
      }
      FileSystemWritableFileStream.prototype.write = async function (data) {
        const info = streams.get(this)
        if (info)
          info.size =
            data instanceof Blob
              ? data.size
              : typeof data === 'string'
                ? new TextEncoder().encode(data).byteLength
                : (data.byteLength ?? 0)
        return write.call(this, data)
      }
      FileSystemWritableFileStream.prototype.close = async function (...args) {
        const result = await close.apply(this, args)
        const info = streams.get(this)
        if (info) {
          closes++
          if (/^[a-f0-9]{64}$/.test(info.name) || info.name === 'plan.json')
            stagingBytes += info.size
          else if (info.name !== 'save-state.json') {
            firstAuthorMs ??= performance.now() - start
            authorBytes += info.size
          }
          if (closes % 250 === 0)
            console.log('CLOSES', closes, 'elapsedMs', Math.round(performance.now() - start))
        }
        return result
      }
      let last = -1
      try {
        const result = await withAuthorizedWorkspaceMutation(
          await authorizeFirstSaveTarget(context, target),
          async (mutation) => {
            await registerAuthorizedWorkspaceMutation(mutation, context, target.name)
            return cloneFromPal(source, mutation, (done, total) => {
              const percent = Math.floor((done / total) * 100)
              if (percent >= last + 10) {
                last = percent
                console.log('CLONE', percent, 'elapsedMs', Math.round(performance.now() - start))
              }
            })
          },
        )
        const copyMs = performance.now() - start
        const opened = await finishOpen(target)
        const withOpenMs = performance.now() - start
        const { toEditorState, serializeProjectWithMapCopies, diffFiles, writeProject } =
          await import('/src/core/project-io.ts')
        const { authorizeBoundWorkspaceTarget } = await import('/src/core/workspace-persistence.ts')
        const state = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
        const files = await serializeProjectWithMapCopies(state, opened.project.source)
        const previous = new Map()
        await diffFiles(new Map(), files, previous)
        files['manifest.json'] = { ...files['manifest.json'], name: 'PAL incremental measurement' }
        const incrementalStart = performance.now()
        await writeProject(
          await authorizeBoundWorkspaceTarget(opened.workspace, target, opened.authorBaseline),
          files,
          { prevSnapshot: previous },
        )
        const incrementalMs = performance.now() - incrementalStart
        return {
          mode,
          assets: assets.length,
          resourceBytes: assets.reduce((s, r) => s + r.bytes, 0),
          largestResource: Math.max(...assets.map((r) => r.bytes)),
          copyMs,
          withOpenMs,
          incrementalMs,
          stagingBytes,
          authorBytes,
          firstAuthorMs,
          closes,
          projectId: opened.project.manifest.id,
          cleanupWarning: result?.cleanupWarning ?? null,
        }
      } catch (error) {
        return {
          mode,
          failed: error.message,
          stack: error.stack,
          elapsedMs: performance.now() - start,
          stagingBytes,
          authorBytes,
          firstAuthorMs,
          closes,
        }
      } finally {
        FileSystemFileHandle.prototype.createWritable = create
        FileSystemWritableFileStream.prototype.write = write
        FileSystemWritableFileStream.prototype.close = close
      }
    },
    { mode, sourceModule: `/@fs${repoRoot}packages/reforge/src/file-source.ts` },
  )
  clearInterval(ticker)
  await chain
  const evidence = {
    ...result,
    cdpPeak: peak,
    samples,
    note: 'CDP sampled every 500ms; not total browser RSS; local dev server; not concurrent with check/coverage',
  }
  writeFileSync(`${out}/pal-${mode}.json`, JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence, null, 2))
  if (result.failed) process.exitCode = 1
} finally {
  clearInterval(ticker)
  await context.close()
  await browser.close()
}
