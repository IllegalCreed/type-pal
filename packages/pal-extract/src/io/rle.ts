/**
 * RLE 解码已搬到 `@type-pal/shared`(extractor 与 runtime 共用同一份解码逻辑,
 * 原盘入口显式选择PAL来源规则)。本文件 re-export,保持 extractor 内部
 * `import { decodeRle } from '../io/rle.js'` 路径不变。
 */
export {
  decodePalRle as decodeRle,
  parsePalSpriteChunk as parseSpriteChunk,
  type RleFrame,
} from '@type-pal/shared'
