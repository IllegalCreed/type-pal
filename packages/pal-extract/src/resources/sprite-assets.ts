/** Resource writers borrow explicit roots; CLI owns preflight, cleanup and invocation order. */
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { chunkCount, openMkf, readChunk } from '../io/mkf.js'
import { readBinary } from '../io/read.js'
import { writeBinary, writeJson } from '../io/write.js'
import { decompressYj2 } from '../io/yj2.js'
import { parseSpriteChunk } from './sprite.js'

interface BattleSpriteRef {
  id: number
  kind: 'enemy' | 'player'
}

/** Dump every MGO slot: scripts may request sprites absent from static scene/role fields. */
export function writeCharacterSpriteAssets(rawRoot: string, outputRoot: string): void {
  const loadFile = (name: string): Uint8Array => readBinary(resolve(rawRoot, name))
  function spriteBlobPath(spriteId: number): string {
    return resolve(outputRoot, 'data', 'sprite', `${spriteId}.rle`)
  }

  console.log('[pal-extract] character sprites: 全 MGO.MKF chunks (dump-all, no filter) …')

  const mgoMkf = openMkf(loadFile('MGO.MKF'))
  const mgoChunkCount = chunkCount(mgoMkf)
  // 保留完整扫描后才落盘，Map本身同时提供有序ID与字节，不再镜像一份Set。
  const mgoChunks = new Map<number, Uint8Array>()
  for (let id = 0; id < mgoChunkCount; id++) {
    const raw = readChunk(mgoMkf, id)
    if (raw.byteLength === 0) continue
    try {
      mgoChunks.set(id, decompressYj2(raw))
    } catch (err) {
      console.warn(`[pal-extract] sprite ${id} YJ2 fail, skip:`, err)
    }
  }
  console.log(`[pal-extract] sprite scan: ${mgoChunks.size} / ${mgoChunkCount} MGO chunks 可解`)

  let spriteFramesTotal = 0
  for (const [id, chunk] of mgoChunks) {
    writeBinary(spriteBlobPath(id), gzipSync(chunk))
    spriteFramesTotal += parseSpriteChunk(chunk).length
  }

  console.log(
    `[pal-extract] sprite blobs written: ${mgoChunks.size} sprites, ${spriteFramesTotal} frames total`,
  )
}

/** F/ABC use separate player/enemy ID spaces. Preserve decode-all-before-write ordering. */
export function writeBattleSpriteAssets(rawRoot: string, outputRoot: string): BattleSpriteRef[] {
  const loadFile = (name: string): Uint8Array => readBinary(resolve(rawRoot, name))
  function battleSpriteBlobPath(kind: 'enemy' | 'player', id: number): string {
    return resolve(outputRoot, 'data', 'battle-sprite', kind, `${id}.rle`)
  }

  // F按队员sprite ID、ABC按敌人ID索引，不能按当前引用过滤源槽位。
  console.log('[pal-extract] battle sprites: 全 F.MKF + ABC.MKF chunks (dump-all) …')

  const fMkf = openMkf(loadFile('F.MKF'))
  const fChunkCount = chunkCount(fMkf)
  const abcMkf = openMkf(loadFile('ABC.MKF'))
  const abcChunkCount = chunkCount(abcMkf)
  // 一个记录同时持有ID与字节；扫描完F、ABC后才写出，避免平行容器脱节。
  const battleSprites: Array<BattleSpriteRef & { chunk: Uint8Array }> = []

  const loadBattleMkf = (
    kind: 'player' | 'enemy',
    mkf: ReturnType<typeof openMkf>,
    total: number,
  ): void => {
    for (let id = 0; id < total; id++) {
      const raw = readChunk(mkf, id)
      if (raw.byteLength === 0) continue
      // 保留TS既有raw回退；MGO阶段的解压失败则跳过，不能共用同一失败策略。
      let decompressed: Uint8Array
      try {
        decompressed = decompressYj2(raw)
      } catch {
        decompressed = raw
      }
      battleSprites.push({ id, kind, chunk: decompressed })
    }
  }
  loadBattleMkf('player', fMkf, fChunkCount)
  loadBattleMkf('enemy', abcMkf, abcChunkCount)

  let battleFramesTotal = 0
  for (const { id, kind, chunk } of battleSprites) {
    writeBinary(battleSpriteBlobPath(kind, id), gzipSync(chunk))
    battleFramesTotal += parseSpriteChunk(chunk).length
  }

  console.log(
    `[pal-extract] battle sprite blobs written: ${battleSprites.length} sprites, ${battleFramesTotal} frames total`,
  )
  return battleSprites.map(({ id, kind }) => ({ id, kind }))
}

/** CLI deliberately writes this manifest after backgrounds, following the original failure order. */
export function writeBattleSpriteManifest(
  outputRoot: string,
  battleSpriteIds: readonly BattleSpriteRef[],
): void {
  const battleSpriteManifest = battleSpriteIds.map((s) => ({
    kind: s.kind,
    id: s.id,
  }))
  writeJson(resolve(outputRoot, 'data', 'battle-sprites.json'), { sprites: battleSpriteManifest })
}
