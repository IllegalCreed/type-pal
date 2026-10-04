/**
 * RV1 artifact 生成（TEST-GLM-RUNTIME-RESOURCE-2 / 批A）。
 * 全部调用真实函数：parseFirSprite（真实 YJ2 解压 + sprite chunk 解析 + encodeIndexedPng）
 * 与 quantizeToRleFrame（真实最近邻量化）。输出 hosts/rv1/artifact.json 供浏览器宿主
 * 用真实 Canvas 绘制（PNG 经 createImageBitmap 真解码；量化结果按真实输出数组上屏）。
 * 用法：pnpm exec tsx docs/testing/archive/legacy/batches/glm-runtime-resource-wave/tools/rv1-artifact.ts
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { YJ2_SPRITE_CHUNK_2X2 } from '../../../../../../../packages/pal-extract/src/__tests__/glm-runtime-resource/yj2-sprite-chunk-vector.ts'
import { parseFirSprite } from '../../../../../../../packages/pal-extract/src/resources/parsers/fire.ts'
import { quantizeToRleFrame } from '../../../../../../../packages/reforge/src/quantize.ts'
import type { Palette } from '../../../../../../../packages/shared/src/resources.ts'

const fire = parseFirSprite(3, YJ2_SPRITE_CHUNK_2X2)

const palette: Palette = {
  colors: [
    [200, 40, 40], // 0 红
    [40, 160, 60], // 1 绿
    [50, 80, 220], // 2 蓝
  ],
  cycles: [],
}
// 2×2 输入：绿、透明、蓝、红 —— 与 fire 帧同尺寸，含两种非同色实心像素
const rgba = Uint8Array.from([40, 160, 60, 255, 0, 0, 0, 0, 50, 80, 220, 255, 200, 40, 40, 255])
const quantized = quantizeToRleFrame(rgba, 2, 2, palette)

const artifact = {
  note: '全部字段来自真实函数输出（parseFirSprite / quantizeToRleFrame），见 wave/tools/rv1-artifact.ts',
  fire: {
    frameCount: fire.frameCount,
    width: fire.frames[0]!.width,
    height: fire.frames[0]!.height,
    pngBase64: Buffer.from(fire.frames[0]!.pngBytes).toString('base64'),
  },
  quantize: {
    width: quantized.width,
    height: quantized.height,
    pixels: [...quantized.pixels],
    opaque: [...quantized.opaque],
    palette,
  },
}
const out = join(import.meta.dirname, '../hosts/rv1/artifact.json')
writeFileSync(out, `${JSON.stringify(artifact, null, 2)}\n`)
console.log(`written ${out}`)
