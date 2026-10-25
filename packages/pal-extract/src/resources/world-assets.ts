/**
 * 地图、场景与全局事件对象的写出阶段；调用方先完成输出所有权和资源预检。
 * 只借用已解析的场景/对象与可选修订metadata，不清理输出，不改原始资源。
 * MAP/GOP读入、解码失败跳过、逐场景写出和全局表的顺序由本阶段统一保持。
 */
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import type { EventObjectMetadata } from '../events/script-corrections.js'
import { chunkCount, openMkf, readChunk } from '../io/mkf.js'
import { readBinary } from '../io/read.js'
import type { EventObject, Scene } from '../io/sss.js'
import { writeBinary, writeJson } from '../io/write.js'
import { decompressYj2 } from '../io/yj2.js'
import { parseMap } from './map.js'
import { dumpAllEventObjects, dumpScene } from './scene.js'

export function writeWorldAssets(
  rawRoot: string,
  outputRoot: string,
  scenes: Scene[],
  eventObjects: EventObject[],
  eventMetadata?: ReadonlyMap<number, EventObjectMetadata>,
): void {
  // 沿用.rle后缀存gzip字节；runtime仍负责解压，避免与传输层重复处理。
  function tilesetBlobRelPath(mapNum: number): string {
    return `tileset/${mapNum}.rle`
  }

  function tilesetBlobPath(mapNum: number): string {
    return resolve(outputRoot, 'data', tilesetBlobRelPath(mapNum))
  }

  function dataSubdirPath(subdir: 'tilemap' | 'scene', name: string): string {
    return resolve(outputRoot, 'data', subdir, `${name}.json`)
  }

  function loadFile(name: string): Uint8Array {
    return readBinary(resolve(rawRoot, name))
  }

  const mapMkf = openMkf(loadFile('MAP.MKF'))
  const mapChunkCount = chunkCount(mapMkf)
  const gopMkf = openMkf(loadFile('GOP.MKF'))

  {
    const allSceneCount = scenes.length
    const uniqueMapNums = new Set<number>()
    // 引用计数沿用从场景1起；实际输出还会补全档非空块。
    for (let sliceId = 1; sliceId < allSceneCount; sliceId++) {
      const scene = scenes[sliceId]
      if (!scene) continue
      if (scene.mapNum >= mapChunkCount) {
        console.warn(
          `[pal-extract] scene ${sliceId} mapNum=${scene.mapNum} >= MAP chunks ${mapChunkCount}, skip`,
        )
        continue
      }
      uniqueMapNums.add(scene.mapNum)
    }
    const sceneRefCount = uniqueMapNums.size
    // 全量提取包括未被场景引用的非空地图，不能只按引用过滤。
    for (let m = 0; m < mapChunkCount; m++) {
      if (uniqueMapNums.has(m)) continue
      if (readChunk(mapMkf, m).byteLength > 0) uniqueMapNums.add(m)
    }
    console.log(
      `[pal-extract] full scope: ${allSceneCount} scenes, ${sceneRefCount} scene-ref mapNums + ${uniqueMapNums.size - sceneRefCount} unreferenced non-empty = ${uniqueMapNums.size} total`,
    )

    let tilesetsWritten = 0
    for (const mapNum of uniqueMapNums) {
      const rawMapChunk = readChunk(mapMkf, mapNum)
      if (rawMapChunk.byteLength === 0) {
        console.warn(`[pal-extract] mapNum=${mapNum}: MAP.MKF chunk 为空,skip`)
        continue
      }
      let mapBytes: Uint8Array
      try {
        mapBytes = decompressYj2(rawMapChunk)
      } catch (err) {
        console.warn(`[pal-extract] mapNum=${mapNum}: YJ2 解压失败,skip —— ${err}`)
        continue
      }
      const gopBytes = readChunk(gopMkf, mapNum)
      const mapResult = parseMap(mapBytes, gopBytes)

      // 保留GOP原字节，不重编码像素；tilemap用相对路径指向同一blob。
      writeBinary(tilesetBlobPath(mapNum), gzipSync(gopBytes))
      writeJson(dataSubdirPath('tilemap', String(mapNum)), {
        ...mapResult.tilemap,
        tileset: tilesetBlobRelPath(mapNum),
      })
      tilesetsWritten++
    }
    console.log(
      `[pal-extract] tilesets written: ${tilesetsWritten} / ${uniqueMapNums.size} unique mapNums`,
    )
  }

  // 场景对象独立写出，不从对象引用反向过滤精灵档案。
  {
    let sceneWritten = 0
    // sceneId与events切片均为0-based，开场scene0也必须写出。
    for (let allSceneId = 0; allSceneId < scenes.length; allSceneId++) {
      const s = scenes[allSceneId]
      if (!s) continue
      const sceneObjs = dumpScene(allSceneId, scenes, eventObjects, eventMetadata)
      writeJson(dataSubdirPath('scene', String(allSceneId)), sceneObjs)
      sceneWritten++
    }
    console.log(`[pal-extract] scenes written: ${sceneWritten}`)
  }

  // 最后写全局对象表，保留全局id和各场景的半开区间。
  {
    const allEvtObjs = dumpAllEventObjects(scenes, eventObjects, eventMetadata)
    writeJson(resolve(outputRoot, 'data', 'event-objects.json'), allEvtObjs)
    console.log(
      `[pal-extract] event-objects.json written: ${allEvtObjs.eventObjects.length} objects, ` +
        `${Object.keys(allEvtObjs.sceneRanges).length} scene ranges`,
    )
  }
}
