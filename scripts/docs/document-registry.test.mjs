import assert from 'node:assert/strict'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join } from 'node:path'
import { test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import {
  documentRegistryLimit,
  frozenRegistrySource,
  loadDocumentRegistry,
  summarizeDocumentRegistry,
  writeDocumentRegistry,
} from './document-registry.mjs'
import { saveDocumentRegistryFixture } from './document-registry.test-support.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const modulePath = join(root, 'scripts/docs/document-registry.mjs')
const digest = (value) => createHash('sha256').update(value).digest('hex')
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const saveJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const entry = (path, phase = 'ops') => ({
  path,
  phase,
  docType: 'guide-runbook',
  templateId: 'guide-runbook-v1',
  templateCompliance: 'needs-migration',
  reviewStatus: 'partial-review-unknown',
  reviewRecord: 'fixture.json',
})
function fixture(t) {
  const directory = realpathSync(mkdtempSync('/tmp/type-pal-registry-storage-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const entries = [
    entry('docs/ops/one.md'),
    entry('docs/ops/two.md'),
    entry('docs/phase2/three.md', 'phase2'),
  ]
  Object.assign(entries[0], {
    artifactOnly: true,
    historyOverlay: false,
    retentionException: { reason: 'fixture native object' },
  })
  const manifestPath = saveDocumentRegistryFixture(directory, entries)
  const shardPath = join(dirname(manifestPath), 'document-registry.ops.json')
  const mutateShard = (mutate) => {
    const shard = readJson(shardPath)
    mutate(shard)
    saveJson(shardPath, shard)
    const manifest = readJson(manifestPath)
    manifest.shards[0].sha256 = digest(readFileSync(shardPath))
    saveJson(manifestPath, manifest)
  }
  return { directory, entries, manifestPath, shardPath, mutateShard }
}
function actualConsumers(f) {
  let rejection
  try {
    loadDocumentRegistry(f)
  } catch (error) {
    rejection = error.message
  }
  assert(rejection, 'the corrupted package must itself be rejected')
  cpSync(join(root, 'scripts/docs'), join(f.directory, 'scripts/docs'), { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: f.directory })
  for (const name of ['check-content-review', 'report-governance-progress']) {
    const result = spawnSync(process.execPath, [`scripts/docs/${name}.mjs`], {
      cwd: f.directory,
      encoding: 'utf8',
    })
    assert.equal(result.error, undefined)
    assert.equal(result.status, 1, result.stdout + result.stderr)
    assert(result.stderr.includes(rejection), result.stderr)
  }
}
function packageBytes(f) {
  return [
    f.manifestPath,
    ...readJson(f.manifestPath).shards.map((s) => join(dirname(f.manifestPath), s.path)),
  ].map((path) => [path, readFileSync(path).toString('base64')])
}

test('summary counts treat inherited property names as untrusted data without granting docType validity', () => {
  const entries = ['constructor', '__proto__', 'toString'].map((docType) => ({
    ...entry('docs/ops/input.md'),
    docType,
  }))
  const summary = summarizeDocumentRegistry(entries)
  for (const docType of ['constructor', '__proto__', 'toString']) {
    assert.equal(Object.hasOwn(summary.byType, docType), true)
    assert.equal(summary.byType[docType], 1)
  }
})

test('v2 roundtrip preserves native optional absence, false flags, keys and global order', (t) => {
  const f = fixture(t)
  const loaded = loadDocumentRegistry(f)
  assert.equal(JSON.stringify(loaded.registry.entries), JSON.stringify(f.entries))
  assert.equal(Object.hasOwn(loaded.registry.entries[0], 'templateVersion'), false)
  loaded.registry.scopeNote = 'intentional caller update'
  const next = writeDocumentRegistry(loaded)
  assert.equal(JSON.stringify(next.registry.entries), JSON.stringify(f.entries))
  assert.equal(next.registry.scopeNote, 'intentional caller update')
  for (const input of next.loadedSource.files) {
    const bytes = readFileSync(input.path)
    assert(bytes.length < documentRegistryLimit)
    assert.equal(digest(bytes), input.sha256)
    const formatted = execFileSync(
      process.execPath,
      [
        createRequire(import.meta.url).resolve('@biomejs/biome/bin/biome'),
        'format',
        '--stdin-file-path',
        input.path,
      ],
      { input: bytes, encoding: 'utf8' },
    )
    assert.equal(formatted, bytes.toString('utf8'))
  }
  assert.equal(existsSync(`${f.manifestPath}.lock`), false)
})

const corruptions = [
  ['missing shard', (f) => rmSync(f.shardPath)],
  ['changed bytes', (f) => writeFileSync(f.shardPath, `${readFileSync(f.shardPath)} `)],
  [
    'forged descriptor hash',
    (f) => {
      const m = readJson(f.manifestPath)
      m.shards[0].sha256 = '0'.repeat(64)
      saveJson(f.manifestPath, m)
    },
  ],
  [
    'forged count',
    (f) => {
      const m = readJson(f.manifestPath)
      m.shards[0].total++
      saveJson(f.manifestPath, m)
    },
  ],
  [
    'forged summary',
    (f) => {
      const m = readJson(f.manifestPath)
      m.summary.byType['guide-runbook']++
      saveJson(f.manifestPath, m)
    },
  ],
  [
    'duplicate position',
    (f) =>
      f.mutateShard((s) => {
        s.positions[1] = s.positions[0]
      }),
  ],
  [
    'missing position',
    (f) => {
      f.mutateShard((s) => {
        s.positions.pop()
        s.entries.pop()
      })
      const m = readJson(f.manifestPath)
      m.shards[0].total--
      saveJson(f.manifestPath, m)
    },
  ],
  ...[-1, 0.5, 3].map((position) => [
    `invalid position ${position}`,
    (f) =>
      f.mutateShard((s) => {
        s.positions[0] = position
      }),
  ]),
  [
    'shard phase drift',
    (f) =>
      f.mutateShard((s) => {
        s.phase = 'testing'
      }),
  ],
  [
    'entry phase drift',
    (f) =>
      f.mutateShard((s) => {
        s.entries[0].phase = 'testing'
      }),
  ],
  [
    'duplicate document path',
    (f) =>
      f.mutateShard((s) => {
        s.entries[1].path = s.entries[0].path
      }),
  ],
  [
    'missing native field',
    (f) =>
      f.mutateShard((s) => {
        delete s.entries[0].reviewRecord
      }),
  ],
  [
    'duplicate shard alias',
    (f) => {
      const m = readJson(f.manifestPath)
      m.shards.push({ ...m.shards[0], key: 'alias' })
      saveJson(f.manifestPath, m)
    },
  ],
  ...[
    '../document-registry.ops.json',
    '/tmp/document-registry.ops.json',
    'sub/document-registry.ops.json',
    'sub\\document-registry.ops.json',
  ].map((path) => [
    `unsafe path ${path}`,
    (f) => {
      const m = readJson(f.manifestPath)
      m.shards[0].path = path
      saveJson(f.manifestPath, m)
    },
  ]),
  [
    'symlink shard',
    (f) => {
      const bytes = readFileSync(f.shardPath)
      rmSync(f.shardPath)
      const outside = join(f.directory, 'outside.json')
      writeFileSync(outside, bytes)
      symlinkSync(outside, f.shardPath)
    },
  ],
  [
    'flat v1 live source',
    (f) => saveJson(f.manifestPath, { schemaVersion: 1, entries: f.entries }),
  ],
  [
    'duplicate decoded key',
    (f) => {
      const raw = readFileSync(f.manifestPath, 'utf8')
      writeFileSync(
        f.manifestPath,
        raw.replace('"schemaVersion": 2', '"schemaVersion": 2, "schema\\u0056ersion": 2'),
      )
    },
  ],
  [
    'invalid UTF8',
    (f) =>
      writeFileSync(
        f.manifestPath,
        Buffer.concat([readFileSync(f.manifestPath), Buffer.from([0xff])]),
      ),
  ],
]
for (const [name, mutate] of corruptions)
  test(`both real consumers reject ${name} before accepting a logical registry`, (t) => {
    const f = fixture(t)
    mutate(f)
    assert.throws(() => loadDocumentRegistry(f))
    actualConsumers(f)
  })

test('writer rejects forged tokens, external source edits and reused stale snapshots without publication', (t) => {
  const f = fixture(t)
  const first = loadDocumentRegistry(f)
  const stale = loadDocumentRegistry(f)
  const before = packageBytes(f)
  assert.throws(() => {
    first.loadedSource.files[0].sha256 = '0'.repeat(64)
  }, TypeError)
  assert.throws(() => {
    first.loadedSource.files.push({})
  }, TypeError)
  assert.throws(
    () =>
      writeDocumentRegistry({ registry: first.registry, loadedSource: { ...first.loadedSource } }),
    /public loader/,
  )
  assert.deepEqual(packageBytes(f), before)
  writeFileSync(f.shardPath, `${readFileSync(f.shardPath)} `)
  const external = packageBytes(f)
  assert.throws(() => writeDocumentRegistry(first), /source-conflict/)
  assert.deepEqual(packageBytes(f), external)
  writeFileSync(f.shardPath, Buffer.from(before[1][1], 'base64'))
  first.registry.scopeNote = 'first successful update'
  writeDocumentRegistry(first)
  const published = packageBytes(f)
  stale.registry.scopeNote = 'must not overwrite first update'
  assert.throws(() => writeDocumentRegistry(stale), /source-conflict/)
  assert.deepEqual(packageBytes(f), published)
  assert.equal(loadDocumentRegistry(f).registry.scopeNote, 'first successful update')
  assert.equal(existsSync(`${f.manifestPath}.lock`), false)
})

test('oversized output fails before publication and releases only its own lock', (t) => {
  const f = fixture(t)
  const loaded = loadDocumentRegistry(f),
    before = packageBytes(f)
  loaded.registry.scopeNote = 'x'.repeat(documentRegistryLimit)
  assert.throws(() => writeDocumentRegistry(loaded), /1 MiB|format failed/)
  assert.deepEqual(packageBytes(f), before)
  assert.equal(existsSync(`${f.manifestPath}.lock`), false)
})

const worker = `
const fs = await import('node:fs');
const { createRequire, syncBuiltinESMExports } = await import('node:module');
const require = createRequire(import.meta.url), mutable = require('node:fs');
const [modulePath, manifestPath, prefix, mode] = process.argv.slice(2);
const pause = (path) => { while (!fs.existsSync(path)) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10) };
let renameCount = 0;
const originalRename = mutable.renameSync;
mutable.renameSync = (...args) => {
  renameCount++;
  if ((mode === 'hold' && renameCount === 1) || (mode === 'interrupt' && renameCount === 2)) {
    fs.writeFileSync(prefix + '.publishing', String(renameCount));
    pause(prefix + '.continue');
  }
  return originalRename(...args);
};
syncBuiltinESMExports();
const { loadDocumentRegistry, writeDocumentRegistry } = await import(modulePath);
const loaded = loadDocumentRegistry({ manifestPath });
loaded.registry.scopeNote = prefix;
if (mode === 'interrupt') loaded.registry.entries[0].templateVersion = '1.0.0';
fs.writeFileSync(prefix + '.loaded', 'loaded');
pause(prefix + '.start');
try { writeDocumentRegistry(loaded); console.log('published'); }
catch (error) { console.error(error.message); process.exitCode = 1; }
`
function startWorker(t, f, name, mode) {
  const path = join(f.directory, 'writer.mjs'),
    prefix = join(f.directory, name)
  writeFileSync(path, worker)
  const child = spawn(process.execPath, [path, modulePath, f.manifestPath, prefix, mode], {
    encoding: 'utf8',
  })
  let stdout = '',
    stderr = ''
  child.stdout.on('data', (bytes) => {
    stdout += bytes
  })
  child.stderr.on('data', (bytes) => {
    stderr += bytes
  })
  const done = new Promise((resolve) =>
    child.on('exit', (code, signal) => resolve({ code, signal, stdout, stderr })),
  )
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  })
  return { child, prefix, done }
}
async function waitFile(path) {
  const deadline = Date.now() + 10_000
  while (!existsSync(path) && Date.now() < deadline) await setTimeout(10)
  assert(existsSync(path), `worker did not reach ${path}`)
}
const release = (prefix, suffix) => writeFileSync(`${prefix}.${suffix}`, 'continue')

test('two actual writer processes loaded from one source serialize and cannot lose the first update', async (t) => {
  const f = fixture(t),
    a = startWorker(t, f, 'writer-a', 'hold'),
    b = startWorker(t, f, 'writer-b', 'normal')
  await Promise.all([waitFile(`${a.prefix}.loaded`), waitFile(`${b.prefix}.loaded`)])
  release(a.prefix, 'start')
  await waitFile(`${a.prefix}.publishing`)
  assert.throws(() => loadDocumentRegistry(f), /busy/)
  release(b.prefix, 'start')
  const rejected = await b.done
  assert.equal(rejected.code, 1)
  assert.match(rejected.stderr, /writer busy/)
  release(a.prefix, 'continue')
  assert.deepEqual(await a.done, { code: 0, signal: null, stdout: 'published\n', stderr: '' })
  assert.equal(loadDocumentRegistry(f).registry.scopeNote, a.prefix)
})

test('actual mid-publication SIGKILL retains lock, every previous byte and recovery hashes; consumers fail closed', async (t) => {
  const f = fixture(t),
    before = packageBytes(f),
    a = startWorker(t, f, 'interrupted', 'interrupt')
  await waitFile(`${a.prefix}.loaded`)
  release(a.prefix, 'start')
  await waitFile(`${a.prefix}.publishing`)
  a.child.kill('SIGKILL')
  assert.equal((await a.done).signal, 'SIGKILL')
  assert.deepEqual(readFileSync(f.manifestPath).toString('base64'), before[0][1])
  assert.notEqual(readFileSync(f.shardPath).toString('base64'), before[1][1])
  const oldManifest = JSON.parse(Buffer.from(before[0][1], 'base64'))
  assert.notEqual(digest(readFileSync(f.shardPath)), oldManifest.shards[0].sha256)
  const mixed = fixture(t)
  for (const [path] of before) cpSync(path, join(dirname(mixed.manifestPath), basename(path)))
  assert.throws(() => loadDocumentRegistry(mixed), /shard SHA drift/)
  actualConsumers(mixed)
  const lock = `${f.manifestPath}.lock`,
    recovery = readJson(join(lock, 'recovery.json'))
  assert.equal(recovery.token, readJson(join(lock, 'owner.json')).token)
  assert.equal(recovery.publicationOrder.at(-1), f.manifestPath)
  for (const [path, bytes] of before) {
    const retained = recovery.previous.find((item) => item.path === path)
    assert(retained)
    const old = readFileSync(join(lock, retained.retainedPath))
    assert.equal(old.toString('base64'), bytes)
    assert.equal(digest(old), retained.sha256)
  }
  assert.throws(() => loadDocumentRegistry(f), /busy or interrupted/)
  actualConsumers(f)
  assert.equal(existsSync(lock), true)
  // No automatic stale-lock cleanup, even if a retained owner PID is no longer alive.
  const owner = readJson(join(lock, 'owner.json'))
  owner.pid = -1
  saveJson(join(lock, 'owner.json'), owner)
  assert.throws(() => loadDocumentRegistry(f), /busy or interrupted/)
  assert.equal(existsSync(lock), true)
})

test('migration CLI reserves a writable exclusive mapping output before touching the frozen source', (t) => {
  const directory = mkdtempSync('/tmp/type-pal-registry-output-preflight-')
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const manifestPath = join(directory, 'document-registry.json')
  const source = execFileSync(
    'git',
    ['show', `${frozenRegistrySource.revision}:${frozenRegistrySource.path}`],
    { cwd: root },
  )
  const existing = join(directory, 'existing.json')
  writeFileSync(existing, 'immutable existing artifact')
  for (const mapping of [existing, join(directory, 'absent-parent', 'mapping.json')]) {
    writeFileSync(manifestPath, source)
    const result = spawnSync(
      process.execPath,
      [
        join(root, 'scripts/docs/migrate-document-registry.mjs'),
        '--manifest',
        manifestPath,
        '--mapping',
        mapping,
      ],
      { encoding: 'utf8' },
    )
    assert.equal(result.status, 1)
    assert.deepEqual(readFileSync(manifestPath), source)
    assert.equal(
      readdirSync(directory).filter((name) => /^document-registry\..+\.json$/.test(name)).length,
      0,
    )
    assert.equal(readFileSync(existing, 'utf8'), 'immutable existing artifact')
    assert.equal(existsSync(`${manifestPath}.lock`), false)
  }
})

test('fixed-source migration CLI preserves all 2374 native entries, metadata and order with an explicit mapping', (t) => {
  const directory = mkdtempSync('/tmp/type-pal-registry-frozen-migration-')
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const source = execFileSync(
    'git',
    ['show', `${frozenRegistrySource.revision}:${frozenRegistrySource.path}`],
    { cwd: root },
  )
  const manifestPath = join(directory, 'document-registry.json'),
    mappingPath = join(directory, 'mapping.json')
  writeFileSync(manifestPath, source)
  const cli = spawnSync(
    process.execPath,
    [
      join(root, 'scripts/docs/migrate-document-registry.mjs'),
      '--manifest',
      manifestPath,
      '--mapping',
      mappingPath,
    ],
    { encoding: 'utf8' },
  )
  assert.equal(cli.status, 0, cli.stderr)
  const original = JSON.parse(source),
    { registry } = loadDocumentRegistry({ manifestPath }),
    mapping = readJson(mappingPath)
  assert.equal(JSON.stringify(registry.entries), JSON.stringify(original.entries))
  for (const key of Object.keys(original).filter(
    (key) => !['schemaVersion', 'entries'].includes(key),
  ))
    assert.equal(JSON.stringify(registry[key]), JSON.stringify(original[key]), key)
  assert.equal(registry.generatedBy, 'scripts/docs/classify-governed-documents.mjs')
  assert.equal(registry.shards.length, 7)
  assert.equal(mapping.entries.length, 2374)
  assert(
    mapping.entries.every(
      (item, index) =>
        item.nativeEqual &&
        item.sourceIndex === index &&
        item.sourceObjectSha256 === digest(JSON.stringify(original.entries[index])),
    ),
  )
  assert(mapping.nativeMetadata.every((item) => item.nativeEqual))
  assert.equal(mapping.nonAuthorReviewer, false)
  const before = readFileSync(manifestPath)
  const repeat = spawnSync(
    process.execPath,
    [
      join(root, 'scripts/docs/migrate-document-registry.mjs'),
      '--manifest',
      manifestPath,
      '--mapping',
      join(directory, 'second.json'),
    ],
    { encoding: 'utf8' },
  )
  assert.equal(repeat.status, 1)
  assert.match(repeat.stderr, /frozen v1 source SHA mismatch/)
  assert.deepEqual(readFileSync(manifestPath), before)
})

test('migration mapping stays bound to its published snapshot when a second real writer publishes after release', (t) => {
  const directory = mkdtempSync('/tmp/type-pal-registry-mapping-race-')
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const manifestPath = join(directory, 'document-registry.json')
  const mappingPath = join(directory, 'mapping.json')
  const original = execFileSync(
    'git',
    ['show', `${frozenRegistrySource.revision}:${frozenRegistrySource.path}`],
    { cwd: root },
  )
  writeFileSync(manifestPath, original)
  const childCode = `
    import { createRequire, syncBuiltinESMExports } from 'node:module';
    import { spawnSync } from 'node:child_process';
    const fs = createRequire(import.meta.url)('node:fs');
    const [modulePath, manifestPath, mappingPath] = process.argv.slice(2);
    const originalRemove = fs.rmSync;
    let intervened = false;
    fs.rmSync = (path, options) => {
      originalRemove(path, options);
      if (path === manifestPath + '.lock' && !intervened) {
        intervened = true;
        const code = "const {loadDocumentRegistry,writeDocumentRegistry}=await import(process.argv[1]);const loaded=loadDocumentRegistry({manifestPath:process.argv[2]});loaded.registry.entries.reverse();writeDocumentRegistry(loaded);";
        const other = spawnSync(process.execPath, ['--input-type=module', '-e', code, modulePath, manifestPath], {encoding:'utf8'});
        if (other.status !== 0) throw new Error(other.stderr);
      }
    };
    syncBuiltinESMExports();
    const {migrateFrozenDocumentRegistry} = await import(modulePath);
    const {mapping} = migrateFrozenDocumentRegistry({manifestPath});
    fs.writeFileSync(mappingPath, JSON.stringify(mapping));
    if (!intervened) throw new Error('release interposition did not run');
  `
  const childPath = join(directory, 'migration-race.mjs')
  writeFileSync(childPath, childCode)
  const result = spawnSync(process.execPath, [childPath, modulePath, manifestPath, mappingPath], {
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  const source = JSON.parse(original),
    mapping = readJson(mappingPath),
    live = loadDocumentRegistry({ manifestPath })
  assert.equal(live.registry.entries[0].path, source.entries.at(-1).path)
  const phaseIndex = new Map()
  for (const [sourceIndex, originalEntry] of source.entries.entries()) {
    const targetIndex = phaseIndex.get(originalEntry.phase) ?? 0
    assert.equal(mapping.entries[sourceIndex].targetIndex, targetIndex)
    phaseIndex.set(originalEntry.phase, targetIndex + 1)
  }
  const oldOps = mapping.targets.find((file) => file.path.endsWith('document-registry.ops.json'))
  assert.notEqual(digest(readFileSync(oldOps.path)), oldOps.sha256)
})

test('three retired bulk writers exit before prerequisites and preserve every fixture byte regardless of flags', (t) => {
  const f = fixture(t)
  const names = [
    'classify-governed-documents',
    'generate-structured-content-reviews',
    'enrich-review-metadata',
  ]
  const snapshot = (directory) =>
    readdirSync(directory)
      .sort()
      .flatMap((name) => {
        const path = join(directory, name)
        return lstatSync(path).isDirectory() ? snapshot(path) : [[path, digest(readFileSync(path))]]
      })
  mkdirSync(join(f.directory, 'scripts/docs'), { recursive: true })
  for (const name of names)
    cpSync(join(root, `scripts/docs/${name}.mjs`), join(f.directory, `scripts/docs/${name}.mjs`))
  for (const name of names)
    for (const args of [[], ['--write', '--force', '--legacy']]) {
      const before = snapshot(f.directory)
      const result = spawnSync(process.execPath, [`scripts/docs/${name}.mjs`, ...args], {
        cwd: f.directory,
        encoding: 'utf8',
      })
      assert.equal(result.status, 1)
      assert.equal(result.stdout, '')
      assert.match(result.stderr, /Retired documentation writer:/)
      assert.match(
        result.stderr,
        /Historical source: 911ac4dcbb3ea2288ae215769ae9acd6e333d763 \(blob [a-f0-9]{40}\)/,
      )
      assert.deepEqual(snapshot(f.directory), before)
    }
})
