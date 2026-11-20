import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { link, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { gunzipSync } from 'node:zlib'
import { tsImport } from 'tsx/esm/api'
import { checkWorldDialoguePixels, decodeWorldDialoguePixels } from './world-dialogue-pixels.mjs'

const run = promisify(execFile)
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sha256 = async (path) => hash(await readFile(path))

let spriteDecoder
export async function readWorldSpritePose(spriteId, frame, night = false) {
  spriteDecoder ??= tsImport('../../packages/shared/src/rle.ts', import.meta.url)
  const { parsePalSpriteChunk } = await spriteDecoder
  const paths = [`data/extracted/data/sprite/${spriteId}.rle`, 'data/extracted/data/palette/0.json']
  const files = await Promise.all(
    paths.map((path) => readFile(new URL(`../../${path}`, import.meta.url))),
  )
  const [sprite, colors] = files
  const { width, height, anchorX, anchorY, pixels, opaque } = parsePalSpriteChunk(
    gunzipSync(sprite),
  )[frame]
  const palette = JSON.parse(colors)
  return {
    width,
    height,
    anchorX,
    anchorY,
    pixels,
    opaque,
    palette: night ? palette.nightColors : palette.colors,
    sources: Object.fromEntries(paths.map((path, i) => [path, hash(files[i])])),
  }
}

export async function checkWorldSpritePixels(video, seconds, expected, panel) {
  const viewport = panel === undefined ? '' : `crop=640:400:${panel * 640}:0,`
  const { width, height, pixelPosition } = expected
  const [x, y] = pixelPosition
  const { stdout } = await run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-nostdin',
      '-ss',
      seconds.toFixed(6),
      '-i',
      video,
      '-frames:v',
      '1',
      '-vf',
      `${viewport}scale=320:200:flags=area,crop=${width}:${height}:${x}:${y}`,
      '-pix_fmt',
      'rgb24',
      '-f',
      'rawvideo',
      'pipe:1',
    ],
    { encoding: 'buffer' },
  )
  assert.equal(stdout.length, width * height * 3, 'missing decoded actor pixels')
  let totalError = 0
  let opaquePixels = 0
  for (const [index, drawn] of expected.opaque.entries()) {
    if (!drawn) continue
    const rgb = expected.palette[expected.pixels[index]]
    totalError += rgb.reduce(
      (sum, value, channel) => sum + Math.abs(value - stdout[index * 3 + channel]),
      0,
    )
    opaquePixels++
  }
  const paletteError = totalError / (opaquePixels * 3)
  return {
    status: paletteError < 14 ? 'passed' : 'wrong-actor-pixels',
    seconds,
    opaquePixels,
    paletteError,
    pixelPosition,
    sources: expected.sources,
  }
}

export async function inspectDialogueBackground(video, spans, { trim = 0, panel } = {}) {
  assert(spans.length > 0, 'world dialogue needs declared visible background windows')
  const frames = await decodeWorldDialoguePixels(video, panel)
  return {
    lastSeconds: frames.at(-1).seconds,
    background: spans.map(({ id, start, end, minLitFraction }) => ({
      id,
      ...checkWorldDialoguePixels(frames, {
        start: start - trim,
        end: end - trim,
        minLitFraction,
      }),
    })),
  }
}

export async function publishWorldDialogueSplit(comparison, output, receiptPath, checkScene) {
  assert.equal(comparison.status, 'passed')
  assert.equal(dirname(output), dirname(receiptPath))
  assert.deepEqual(
    comparison.recordings.map(({ engine }) => engine),
    ['game', 'reforge'],
  )
  for (const side of comparison.recordings) {
    assert(side.spans.length > 0, `${side.engine} needs declared dialogue windows`)
    assert.equal(await sha256(side.recording), side.recordingSha256)
  }
  const temporary = await mkdtemp(join(dirname(output), '.dialogue-review-'))
  try {
    const clip = join(temporary, 'split.mp4')
    const preroll = Math.min(0.34, ...comparison.recordings.map(({ anchor }) => anchor))
    const sides = comparison.recordings.map((entry) => ({ ...entry, trim: entry.anchor - preroll }))
    const duration = Math.max(...sides.map(({ lastSeconds, trim }) => lastSeconds - trim))
    const filters = sides.flatMap(({ trim, lastSeconds }, i) => [
      `[${i}:v]trim=start=${trim},setpts=PTS-${trim}/TB,fps=60:start_time=0,scale=640:400:flags=neighbor,setsar=1,tpad=stop_mode=clone:stop_duration=${duration - lastSeconds + trim + 0.12}[v${i}]`,
      `[${i}:a]atrim=start=${trim},asetpts=PTS-${trim}/TB,aresample=async=1:first_pts=0,aformat=channel_layouts=stereo,pan=mono|c0=0.5*c0+0.5*c1,apad[a${i}]`,
    ])
    filters.push('[v0][v1]hstack=inputs=2[v]', '[a0][a1]join=inputs=2:channel_layout=stereo[a]')
    await run('ffmpeg', [
      '-v',
      'error',
      '-nostdin',
      '-n',
      '-copyts',
      ...sides.flatMap(({ recording }) => ['-i', recording]),
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-t',
      duration.toFixed(6),
      '-c:v',
      'libx264',
      '-preset',
      'fast',
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
      clip,
    ])
    const decoded = []
    for (const [panel, source] of sides.entries()) {
      const { background: spans } = await inspectDialogueBackground(clip, source.spans, {
        trim: source.trim,
        panel,
      })
      assert(
        spans.every(({ status }) => status === 'passed'),
        JSON.stringify({ engine: source.engine, spans }),
      )
      const sceneChecks = await checkScene(source, clip, source.trim, panel)
      assert(
        sceneChecks.length > 0 && sceneChecks.every(({ status }) => status === 'passed'),
        JSON.stringify({ engine: source.engine, sceneChecks }),
      )
      decoded.push({ engine: source.engine, spans, sceneChecks, trim: source.trim })
    }
    const { stdout } = await run(
      'ffmpeg',
      [
        '-v',
        'error',
        '-nostdin',
        '-i',
        clip,
        '-map',
        '0:a:0',
        '-vn',
        '-ar',
        '8000',
        '-f',
        's16le',
        'pipe:1',
      ],
      { encoding: 'buffer', maxBuffer: Math.ceil((duration + 1) * 8000 * 4) },
    )
    const peaks = [0, 0]
    for (let i = 0; i < stdout.length; i += 2) {
      const channel = (i / 2) % 2
      peaks[channel] = Math.max(peaks[channel], Math.abs(stdout.readInt16LE(i)))
    }
    assert(
      peaks.every((peak) => peak >= 16),
      'the split needs both engines’ original audio',
    )
    const receipt = join(temporary, 'receipt.json')
    await writeFile(
      receipt,
      `${JSON.stringify(
        {
          ...comparison,
          target: output,
          sha256: await sha256(clip),
          duration,
          speed: 1,
          channels: { left: 'game', right: 'reforge' },
          decoded,
          peaks,
        },
        null,
        2,
      )}\n`,
    )
    await link(receipt, receiptPath)
    try {
      await link(clip, output)
    } catch (error) {
      await rm(receiptPath)
      throw error
    }
  } finally {
    await rm(temporary, { recursive: true })
  }
}
