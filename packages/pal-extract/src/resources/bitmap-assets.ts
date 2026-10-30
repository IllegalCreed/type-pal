/** Resource writers borrow explicit roots; CLI owns preflight, cleanup and invocation order. */
import { resolve } from 'node:path'
import { chunkCount, openMkf, readChunk } from '../io/mkf.js'
import { readBinary } from '../io/read.js'
import { writeBinary, writeJson } from '../io/write.js'
import { decompressYj2 } from '../io/yj2.js'
import { decodePalette } from './palette.js'
import { decodeBallIcon } from './parsers/ball.js'
import { decodeRgmPortrait } from './parsers/rgm.js'
import { encodeIndexedPng } from './sprite.js'

/** Portrait and item parsers own empty/invalid-frame admission; keep source chunk IDs. */
export function writePortraitAssets(rawRoot: string, outputRoot: string): void {
  const loadFile = (name: string): Uint8Array => readBinary(resolve(rawRoot, name))

  const rgmMkf = openMkf(loadFile('RGM.MKF'))
  const n = chunkCount(rgmMkf)
  const manifest: Array<{ chunkIndex: number; width: number; height: number }> = []
  let written = 0
  for (let i = 0; i < n; i++) {
    const portrait = decodeRgmPortrait(i, readChunk(rgmMkf, i))
    if (!portrait) continue
    writeBinary(
      resolve(outputRoot, 'images', 'portraits', `${i.toString().padStart(2, '0')}.png`),
      portrait.pngBytes,
    )
    manifest.push({
      chunkIndex: portrait.chunkIndex,
      width: portrait.width,
      height: portrait.height,
    })
    written++
  }
  writeJson(resolve(outputRoot, 'data', 'portraits.json'), { count: n, portraits: manifest })
  console.log(
    `[pal-extract] RGM.MKF written: ${written} / ${n} portraits → images/portraits/{NN}.png`,
  )
}

export function writeItemIconAssets(rawRoot: string, outputRoot: string): void {
  const loadFile = (name: string): Uint8Array => readBinary(resolve(rawRoot, name))

  const ballMkf = openMkf(loadFile('BALL.MKF'))
  const n = chunkCount(ballMkf)
  const manifest: Array<{ chunkIndex: number; width: number; height: number }> = []
  let written = 0
  for (let i = 0; i < n; i++) {
    const icon = decodeBallIcon(i, readChunk(ballMkf, i))
    if (!icon) continue
    writeBinary(
      resolve(outputRoot, 'images', 'items', `${i.toString().padStart(3, '0')}.png`),
      icon.pngBytes,
    )
    manifest.push({ chunkIndex: icon.chunkIndex, width: icon.width, height: icon.height })
    written++
  }
  writeJson(resolve(outputRoot, 'data', 'items-icons.json'), { count: n, icons: manifest })
  console.log(`[pal-extract] BALL.MKF written: ${written} / ${n} icons → images/items/{NNN}.png`)
}

/** WIN95 splash uses FBP chunks 3/4. Unlike battle backgrounds, YJ2 failure is skipped silently. */
export function writeSplashAssets(rawRoot: string, outputRoot: string): void {
  const loadFile = (name: string): Uint8Array => readBinary(resolve(rawRoot, name))

  const splashFbpMkf = openMkf(loadFile('FBP.MKF'))
  const splashIds = [
    { id: 0x03, name: 'splash-up-win95' },
    { id: 0x04, name: 'splash-down-win95' },
  ] as const
  for (const { id, name } of splashIds) {
    const raw = readChunk(splashFbpMkf, id)
    if (raw.byteLength === 0) continue
    let pixels: Uint8Array
    try {
      pixels = decompressYj2(raw)
    } catch {
      continue
    }
    if (pixels.byteLength !== 320 * 200) {
      console.warn(
        `[pal-extract] splash FBP chunk ${id}: 解压后 ${pixels.byteLength} bytes ≠ 64000, skip`,
      )
      continue
    }
    writeBinary(
      resolve(outputRoot, 'images', 'splash', `${name}.png`),
      encodeIndexedPng(320, 200, pixels),
    )
  }
  console.log('[pal-extract] splash written → images/splash/')
}

/** Pass whole PAT chunks so decodePalette retains the optional night palette. */
export function writePaletteAssets(rawRoot: string, outputRoot: string): void {
  const loadFile = (name: string): Uint8Array => readBinary(resolve(rawRoot, name))
  function dataSubdirPath(subdir: 'palette', name: string): string {
    return resolve(outputRoot, 'data', subdir, `${name}.json`)
  }

  const patMkf = openMkf(loadFile('PAT.MKF'))
  const patChunkCount = chunkCount(patMkf)
  let palWritten = 0
  for (let i = 0; i < patChunkCount; i++) {
    const palBuf = readChunk(patMkf, i)
    if (palBuf.byteLength < 768) continue // 跳过非调色板 chunk
    writeJson(dataSubdirPath('palette', String(i)), decodePalette(palBuf))
    palWritten++
  }
  console.log(`[pal-extract] palette written (${palWritten} chunks)`)
}

/** Dump all valid FBP backgrounds, including IDs not referenced by the battle-field table. */
export function writeBattleBackgroundAssets(rawRoot: string, outputRoot: string): void {
  const loadFile = (name: string): Uint8Array => readBinary(resolve(rawRoot, name))
  function imageBattleBgPath(bgId: number): string {
    return resolve(outputRoot, 'images', 'battle', 'bg', `${bgId.toString().padStart(3, '0')}.png`)
  }

  // FBP解压结果必须是320×200索引像素，失败只跳过当前chunk。
  console.log('[pal-extract] battle backgrounds from FBP.MKF …')
  const fbpMkf = openMkf(loadFile('FBP.MKF'))
  const fbpChunkCount = chunkCount(fbpMkf)
  const bgIds: number[] = []
  for (let i = 0; i < fbpChunkCount; i++) {
    const raw = readChunk(fbpMkf, i)
    if (raw.byteLength === 0) continue // 空 chunk 跳过
    let pixels: Uint8Array
    try {
      pixels = decompressYj2(raw)
    } catch (err) {
      console.warn(`[pal-extract] FBP chunk ${i} YJ2 fail, skip:`, err)
      continue
    }
    if (pixels.byteLength !== 320 * 200) {
      console.warn(`[pal-extract] FBP chunk ${i}: 解压后 ${pixels.byteLength} bytes ≠ 64000,skip`)
      continue
    }
    writeBinary(imageBattleBgPath(i), encodeIndexedPng(320, 200, pixels))
    bgIds.push(i)
  }
  // Manifest只列出已写出的ID，loader按列表请求。
  writeJson(resolve(outputRoot, 'data', 'battle-bgs.json'), { count: fbpChunkCount, ids: bgIds })
  console.log(`[pal-extract] battle backgrounds written: ${bgIds.length} / ${fbpChunkCount} chunks`)
}
