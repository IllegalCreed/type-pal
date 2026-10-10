import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  encodeEvidenceArtifact,
  readEvidenceArtifact,
  writeEvidenceArtifact,
} from './evidence-artifact.mjs'
import { writeLongEvidenceArtifact } from './long-evidence.mjs'
import { readNpcTrace } from './npc-transition-contract.mjs'

test('actual artifact writer and NPC reader bind raw bytes before projecting story scope', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'pal-evidence-binding-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const value = { causes: [], events: [], pages: [], errors: [], overflow: false }
  const reference = await writeLongEvidenceArtifact(directory, 'trace.json', value)
  const reportPath = join(directory, 'report.json')
  await writeFile(reportPath, JSON.stringify({ fragment: '006', contextTraces: [reference] }))
  const first = await readNpcTrace(reportPath)
  assert.equal(first.artifactBinding.status, 'verified')
  assert.deepEqual(first.rawTrace, value)
  assert.equal(first.trace.storyScopeMissing, true, 'binding does not manufacture story evidence')
  const before = await readFile(join(directory, reference.path))
  await assert.rejects(writeEvidenceArtifact(directory, reference.path, { changed: true }), {
    code: 'EEXIST',
  })
  assert.deepEqual(await readFile(join(directory, reference.path)), before)
  await assert.rejects(
    readEvidenceArtifact(directory, { ...reference, byteLength: reference.byteLength + 1 }),
    /byte count differs/,
  )
  // Same-length changed bytes cannot keep an earlier report's acceptance.
  await writeFile(join(directory, reference.path), before.toString().replace('false', 'true '))
  await assert.rejects(readNpcTrace(reportPath), /recorded hash/)
  const unbound = await readEvidenceArtifact(directory, { path: reference.path })
  assert.deepEqual(unbound.binding, { status: 'unknown', missing: ['sha256', 'byteLength'] })
  await assert.rejects(readEvidenceArtifact(directory, { path: '../trace.json' }), /escapes/)
  const outside = await mkdtemp(join(tmpdir(), 'pal-evidence-outside-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await writeFile(join(outside, 'external.json'), '{}')
  await symlink(outside, join(directory, 'outside'))
  await assert.rejects(
    readEvidenceArtifact(directory, { path: 'outside/external.json' }),
    /symlink escapes/,
  )
  await assert.rejects(writeEvidenceArtifact(directory, 'outside/new.json', {}), /symlink escapes/)
  await assert.rejects(readFile(join(outside, 'new.json')), { code: 'ENOENT' })
  const encoded = encodeEvidenceArtifact({ text: '你好' })
  assert.equal(encoded.byteLength, Buffer.byteLength(encoded.bytes))
  assert.throws(
    () => encodeEvidenceArtifact({ text: '你好' }, encoded.byteLength - 1),
    /byte budget/,
  )
})
