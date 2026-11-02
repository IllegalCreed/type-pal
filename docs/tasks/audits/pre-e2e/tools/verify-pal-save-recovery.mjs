// Native PAL save-recovery API check, not an OS picker/visual/story E2E.
// Requires an editor dev server on localhost:6011 and an externally supplied Playwright runtime.
// Each invocation creates a fresh browser profile and writes ONLY its own OPFS fixture.
// /projects/pal HTTP requests are mirrored from that fixture, never from the real PAL directory.
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const runtime = process.env.TYPE_PAL_PLAYWRIGHT_PACKAGE_JSON
if (!runtime)
  throw new Error(
    'Set TYPE_PAL_PLAYWRIGHT_PACKAGE_JSON to a package.json whose runtime provides playwright; no dependency is installed by this probe',
  )
const require = createRequire(resolve(runtime))
const { chromium } = require('playwright')
const out = mkdtempSync(join(tmpdir(), 'type-pal-native-recovery-'))
console.log('EVIDENCE_DIRECTORY', out)
const origin = 'http://localhost:6011'
let context
const evidence = {
  scope:
    'isolated OPFS + real IDB/Web Locks; HTTP reads mirror the same fixture directory; no OS picker or production PAL data',
  rounds: [],
}
async function openPage() {
  context = await chromium.launchPersistentContext(`${out}/profile`, {
    executablePath:
      process.env.TYPE_PAL_CHROME_EXECUTABLE ??
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  })
  const page = await context.newPage()
  page.on('console', (m) => console.log('BROWSER', m.text()))
  await page.route(`${origin}/__pal-save-check`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Isolated PAL recovery check</title>',
    }),
  )
  await page.route(`${origin}/projects/pal/**`, async (route) => {
    const path = decodeURIComponent(
      new URL(route.request().url()).pathname.slice('/projects/pal/'.length),
    )
    const result = await page.evaluate(async (path) => {
      try {
        let dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('pal-native')
        const names = path.split('/')
        const file = names.pop()
        for (const name of names) dir = await dir.getDirectoryHandle(name)
        return {
          bytes: Array.from(
            new Uint8Array(await (await (await dir.getFileHandle(file)).getFile()).arrayBuffer()),
          ),
        }
      } catch (error) {
        if (error.name === 'NotFoundError') return { missing: true }
        throw error
      }
    }, path)
    await route.fulfill(
      result.missing
        ? { status: 404, body: '' }
        : {
            status: 200,
            body: Buffer.from(result.bytes),
            contentType: path.endsWith('.json') ? 'application/json' : 'application/octet-stream',
            headers: { 'Cache-Control': 'no-store' },
          },
    )
  })
  await page.goto(`${origin}/__pal-save-check`)
  return page
}
async function snapshot(page) {
  return page.evaluate(async () => {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('pal-native')
    const result = {}
    const walk = async (d, p = '') => {
      for await (const [name, h] of d.entries()) {
        const path = p + name
        if (h.kind === 'directory') await walk(h, `${path}/`)
        else {
          const bytes = await (await h.getFile()).arrayBuffer()
          result[path] = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
            .map((x) => x.toString(16).padStart(2, '0'))
            .join('')
        }
      }
    }
    await walk(dir)
    return result
  })
}
try {
  let page = await openPage()
  const initial = await page.evaluate(async () => {
    const { buildBlankProject } = await import('/src/core/seed.ts')
    const { PAL_DEVELOPMENT_SENTINEL_PATH } = await import('/src/core/workspace-context.ts')
    const files = await buildBlankProject('pal')
    const workspaceId = crypto.randomUUID()
    files[PAL_DEVELOPMENT_SENTINEL_PATH] = {
      kind: 'type-pal-editor-pal-development',
      version: 1,
      projectId: 'pal',
      workspaceId,
    }
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('pal-native', { create: true })
    for (const [path, value] of Object.entries(files)) {
      const names = path.split('/')
      const file = names.pop()
      let d = dir
      for (const name of names) d = await d.getDirectoryHandle(name, { create: true })
      const w = await (await d.getFileHandle(file, { create: true })).createWritable()
      await w.write(
        value instanceof ArrayBuffer
          ? new Blob([value])
          : typeof value === 'string'
            ? value
            : `${JSON.stringify(value, null, 2)}\n`,
      )
      await w.close()
    }
    return { workspaceId, fileCount: Object.keys(files).length, secure: isSecureContext }
  })
  assert.equal(initial.secure, true)
  evidence.initial = initial
  console.log('SETUP', JSON.stringify(initial))
  const interrupted = await page.evaluate(async () => {
    const { finishOpen } = await import('/src/core/open-actions.ts')
    const { toEditorState, serializeProjectWithMapCopies, writeProject } = await import(
      '/src/core/project-io.ts'
    )
    const { authorizeBoundWorkspaceTarget } = await import('/src/core/workspace-persistence.ts')
    const { createCanonicalPlacedEntity } = await import('/src/core/entity-placement.ts')
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('pal-native')
    const opened = await finishOpen(dir)
    const state = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
    const actor = structuredClone(state.actors[0])
    actor.id = 'native-pal-added'
    actor.battler.baseStats.maxHP = 237
    state.actors.push(actor)
    state.scenes[0].entities.push(
      createCanonicalPlacedEntity(
        'native-pal-placed',
        { col: 10, row: 0, height: 0 },
        { mode: 'actor', actorId: actor.id },
      ),
    )
    const files = await serializeProjectWithMapCopies(state, opened.project.source)
    const names = new WeakMap(),
      create = FileSystemFileHandle.prototype.createWritable,
      close = FileSystemWritableFileStream.prototype.close
    FileSystemFileHandle.prototype.createWritable = async function (...a) {
      const s = await create.apply(this, a)
      names.set(s, this.name)
      return s
    }
    FileSystemWritableFileStream.prototype.close = async function (...a) {
      if (names.get(this) === 'actors.json') throw new Error('native-pal-interrupted')
      return close.apply(this, a)
    }
    let error
    try {
      await writeProject(
        await authorizeBoundWorkspaceTarget(opened.workspace, dir, opened.authorBaseline),
        files,
      )
    } catch (e) {
      error = e.message
    } finally {
      FileSystemFileHandle.prototype.createWritable = create
      FileSystemWritableFileStream.prototype.close = close
    }
    const diskActors = await opened.project.source.readJson(state.manifest.content.actors)
    const diskScene = await opened.project.source.readJson(state.sceneIndex.scenes[0].path)
    return {
      error,
      policy: opened.workspace.persistencePolicy,
      workspaceId: opened.workspace.workspaceId,
      state: await opened.project.source.readJson('.type-pal/save-state.json'),
      actorMissing: !diskActors.some((a) => a.id === actor.id),
      sceneReferencesNew: diskScene.entities.some((e) => e.actor === actor.id),
    }
  })
  console.log('INTERRUPTED', JSON.stringify(interrupted))
  evidence.rounds.push(interrupted)
  assert.equal(interrupted.error, 'native-pal-interrupted')
  assert.equal(interrupted.policy, 'pal-bound')
  assert.equal(interrupted.workspaceId, initial.workspaceId)
  assert.equal(interrupted.state.phase, 'pending')
  assert.equal(interrupted.actorMissing, true)
  assert.equal(interrupted.sceneReferencesNew, true)
  await context.close()
  context = undefined
  page = await openPage()
  const restored = await page.evaluate(async (workspaceId) => {
    const { openExistingProject, finishOpen } = await import('/src/core/open-actions.ts')
    const { toEditorState, serializeProjectWithMapCopies, writeProject } = await import(
      '/src/core/project-io.ts'
    )
    const { authorizeBoundWorkspaceTarget } = await import('/src/core/workspace-persistence.ts')
    const { loadWorkspaceRecord } = await import('/src/core/handle-store.ts')
    const { loadPlayProject } = await import('/src/core/load-play-project.ts')
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('pal-native')
    window.showDirectoryPicker = async () => dir
    let recovering = 0,
      lockObserved = null
    const get = FileSystemFileHandle.prototype.getFile
    FileSystemFileHandle.prototype.getFile = async function (...a) {
      if (this.name === 'actors.json' && lockObserved === null)
        lockObserved = await navigator.locks.request(
          `type-pal-workspace:${workspaceId}`,
          { ifAvailable: true },
          (lock) => (lock ? 'available' : 'held'),
        )
      return get.apply(this, a)
    }
    let opened
    try {
      opened = await openExistingProject({ onRecovering: () => recovering++ })
    } finally {
      FileSystemFileHandle.prototype.getFile = get
    }
    const state = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
    const actor = state.actors.find((a) => a.id === 'native-pal-added')
    const hp = actor?.battler.baseStats.maxHP
    actor.battler.baseStats.maxHP = 238
    await writeProject(
      await authorizeBoundWorkspaceTarget(opened.workspace, dir, opened.authorBaseline),
      await serializeProjectWithMapCopies(state, opened.project.source),
    )
    const fresh = await finishOpen(dir),
      play = await loadPlayProject('pal', dir)
    const record = await loadWorkspaceRecord(workspaceId)
    return {
      recovering,
      lockObserved,
      lockReleased: await navigator.locks.request(
        `type-pal-workspace:${workspaceId}`,
        { ifAvailable: true },
        (lock) => !!lock,
      ),
      hp,
      finalHp: fresh.project.actorsById['native-pal-added'].battler.baseStats.maxHP,
      playHp: play.actorsById['native-pal-added'].battler.baseStats.maxHP,
      reference: fresh.scenes[0].entities.some((e) => e.actor === 'native-pal-added'),
      policy: fresh.workspace.persistencePolicy,
      workspaceId: fresh.workspace.workspaceId,
      recordMode: record?.mode,
      sameHandle: await record.handle.isSameEntry(dir),
      state: await fresh.project.source.readJson('.type-pal/save-state.json'),
    }
  }, initial.workspaceId)
  console.log('RESTORED', JSON.stringify(restored))
  evidence.rounds.push(restored)
  assert.equal(restored.hp, 237)
  assert.equal(restored.finalHp, 238)
  assert.equal(restored.playHp, 238)
  assert.equal(restored.reference, true)
  assert.equal(restored.workspaceId, initial.workspaceId)
  assert.equal(restored.policy, 'pal-bound')
  assert.equal(restored.recordMode, 'pal-development')
  assert.equal(restored.sameHandle, true)
  assert.equal(restored.state.phase, 'committed')
  assert.equal(restored.lockObserved, 'held')
  assert.equal(restored.lockReleased, true)
  assert.ok(restored.recovering > 0)
  const conflictSetup = await page.evaluate(async () => {
    const { finishOpen } = await import('/src/core/open-actions.ts')
    const { toEditorState, serializeProjectWithMapCopies, writeProject } = await import(
      '/src/core/project-io.ts'
    )
    const { authorizeBoundWorkspaceTarget } = await import('/src/core/workspace-persistence.ts')
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('pal-native')
    const opened = await finishOpen(dir),
      state = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
    state.actors.find((a) => a.id === 'native-pal-added').battler.baseStats.maxHP = 239
    const input = await serializeProjectWithMapCopies(state, opened.project.source)
    const names = new WeakMap(),
      create = FileSystemFileHandle.prototype.createWritable,
      close = FileSystemWritableFileStream.prototype.close
    FileSystemFileHandle.prototype.createWritable = async function (...a) {
      const s = await create.apply(this, a)
      names.set(s, this.name)
      return s
    }
    FileSystemWritableFileStream.prototype.close = async function (...a) {
      if (names.get(this) === 'actors.json') throw new Error('native-pal-second-interruption')
      return close.apply(this, a)
    }
    let error
    try {
      await writeProject(
        await authorizeBoundWorkspaceTarget(opened.workspace, dir, opened.authorBaseline),
        input,
      )
    } catch (e) {
      error = e.message
    } finally {
      FileSystemFileHandle.prototype.createWritable = create
      FileSystemWritableFileStream.prototype.close = close
    }
    const actors = await opened.project.source.readJson(state.manifest.content.actors)
    actors.find((a) => a.id === 'native-pal-added').battler.baseStats.maxHP = 777
    const content = await dir.getDirectoryHandle('content'),
      w = await (await content.getFileHandle('actors.json')).createWritable()
    await w.write(`${JSON.stringify(actors, null, 2)}\n`)
    await w.close()
    return { error }
  })
  assert.equal(conflictSetup.error, 'native-pal-second-interruption')
  const beforeConflict = await snapshot(page)
  await context.close()
  context = undefined
  page = await openPage()
  const conflict = await page.evaluate(async () => {
    const { openExistingProject } = await import('/src/core/open-actions.ts')
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('pal-native')
    window.showDirectoryPicker = async () => dir
    const create = FileSystemFileHandle.prototype.createWritable
    let writes = 0,
      error
    FileSystemFileHandle.prototype.createWritable = async function (...a) {
      writes++
      return create.apply(this, a)
    }
    try {
      await openExistingProject()
    } catch (e) {
      error = e.message
    } finally {
      FileSystemFileHandle.prototype.createWritable = create
    }
    return { error, writes }
  })
  assert.match(conflict.error, /恢复冲突/)
  assert.equal(conflict.writes, 0)
  assert.deepEqual(await snapshot(page), beforeConflict)
  evidence.rounds.push(conflict)
  console.log('CONFLICT', JSON.stringify(conflict))
  writeFileSync(`${out}/native-pal.json`, JSON.stringify(evidence, null, 2))
} catch (error) {
  evidence.failure = { message: error.message, stack: error.stack }
  writeFileSync(`${out}/native-pal.json`, JSON.stringify(evidence, null, 2))
  throw error
} finally {
  await context?.close()
}
