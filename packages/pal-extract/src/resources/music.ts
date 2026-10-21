import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { writeBinary, writeJson } from '../io/write.js'
import { inspectRixArchive } from './parsers/rix.js'

/** Write music bytes/manifests to a caller-owned tree; RIX uses the existing header check. */
export function writeMusicAssets(rawRoot: string, outputRoot: string): void {
  const musicsDir = resolve(rawRoot, 'Musics')
  const midiNums: number[] = []
  const cdTracks: string[] = []
  for (const name of readdirSync(musicsDir).sort()) {
    const lower = name.toLowerCase()
    if (lower.endsWith('.mid')) {
      const num = Number(name.replace(/\.mid$/i, ''))
      const out = `${String(num).padStart(3, '0')}.mid`
      writeBinary(
        resolve(outputRoot, 'music', out),
        new Uint8Array(readFileSync(resolve(musicsDir, name))),
      )
      if (Number.isFinite(num)) midiNums.push(num)
    } else if (lower.endsWith('.ogg')) {
      writeBinary(
        resolve(outputRoot, 'music', name),
        new Uint8Array(readFileSync(resolve(musicsDir, name))),
      )
      cdTracks.push(name)
    }
  }
  midiNums.sort((a, b) => a - b)
  // Preserve the original RIX archive and sparse track numbering for DOS FM playback.
  // (文件名在盘上即小写 mus.mkf,与其余大写 *.MKF 不同;此处按实际名读,勿"纠正"为大写。)
  const rixBytes = new Uint8Array(readFileSync(resolve(rawRoot, 'mus.mkf')))
  const rixTracks = inspectRixArchive(rixBytes)
  writeBinary(resolve(outputRoot, 'music', 'mus.mkf'), rixBytes)
  writeJson(resolve(outputRoot, 'data', 'music-manifest.json'), { midi: midiNums, cdTracks })
  console.log(
    `[pal-extract] Musics: ${midiNums.length} MIDI + ${cdTracks.length} CD ogg + ${rixTracks.length} RIX → music/`,
  )
}
