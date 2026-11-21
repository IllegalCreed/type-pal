import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { link, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { recompareRecording } from '../recompare-recording.mjs'
import { fragment } from './contract.mjs'

const [game, reforge, output, proof, ...extra] = process.argv.slice(2)
assert(
  game && reforge && output && proof && !extra.length,
  'usage: split.mjs GAME_REPORT REFORGE_REPORT NEW_MP4 NEW_RECEIPT_JSON',
)
assert.equal(
  dirname(resolve(proof)),
  dirname(resolve(output)),
  'keep formal receipt beside the clip',
)
assert.notEqual(resolve(proof), resolve(output), 'separate video and receipt paths are required')

const run = promisify(execFile)
async function publish(files) {
  const linked = []
  try {
    for (const [source, path] of files) {
      await link(source, path)
      linked.push(path)
    }
  } catch (error) {
    await Promise.all(linked.map((path) => rm(path)))
    throw error
  }
}
const compare = await recompareRecording(fragment, game, reforge)
const stale = compare.sourceChanges.filter(({ impact }) => impact !== 'declared-oracle')
if (stale.length) {
  compare.status = 'needs-review'
  compare.comparison.findings.push({ type: 'changed-execution-sources', sources: stale })
}
if (compare.status !== 'passed') {
  await writeFile(proof, `${JSON.stringify(compare, null, 2)}\n`, { flag: 'wx' })
  process.exitCode = 1
  console.error(`正式分屏拒绝：${compare.comparison.findings.length} 项未通过；${proof}`)
} else {
  const temp = await mkdtemp(join(dirname(resolve(output)), '.pillar-split-'))
  try {
    const accepted = join(temp, 'comparison.json')
    const sage = join(temp, 'sage.json')
    const media = join(temp, 'media.json')
    const clip = join(temp, 'paired.mp4')
    const renderedSage = join(temp, 'sage-decode.json')
    const film = join(temp, 'first-film-decode.json')
    for (const [name, value] of [
      [accepted, compare],
      [sage, compare.comparison.sage],
    ])
      await writeFile(name, JSON.stringify(value), { flag: 'wx' })
    const script = (name) => fileURLToPath(new URL(`./${name}`, import.meta.url))
    await run('python3', ['-B', script('compose.py'), accepted, clip, media])
    await Promise.all([
      run('python3', ['-B', script('compare-sage-encoded.py'), sage, media, renderedSage]),
      run('python3', [
        '-B',
        script('validate-first-film-images.py'),
        resolve(reforge),
        media,
        film,
      ]),
    ])
    const json = async (path) => JSON.parse(await readFile(path, 'utf8'))
    const [localMedia, sageDecode, firstFilmDecode] = await Promise.all(
      [media, renderedSage, film].map(json),
    )
    assert.equal(sageDecode.status, 'passed')
    assert.equal(firstFilmDecode.status, 'passed')
    const artifacts = []
    const prefix = basename(output, extname(output))
    for (const still of Object.values(sageDecode.phaseStills)) {
      const path = resolve(dirname(output), `${prefix}-${basename(still.path)}`)
      artifacts.push([still.path, path])
      still.path = path
    }
    const packet = join(temp, 'receipt.json')
    // The verifier's original JSON is the root of this media receipt.
    const { comparison: _temporaryComparison, ...boundMedia } = localMedia
    await writeFile(
      packet,
      `${JSON.stringify(
        {
          ...compare,
          media: {
            ...boundMedia,
            video: resolve(output),
            sageDecode: { ...sageDecode, video: resolve(output) },
            firstFilmDecode,
          },
        },
        null,
        2,
      )}\n`,
      { flag: 'wx' },
    )
    await publish([...artifacts, [packet, resolve(proof)], [clip, resolve(output)]])
    console.log(`原速带声分屏：${resolve(output)}`)
  } finally {
    await rm(temp, { recursive: true })
  }
}
