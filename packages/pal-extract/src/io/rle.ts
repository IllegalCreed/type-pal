/**
 * RLE 解码已搬到 `@type-pal/shared`(extractor 与 runtime 共用同一份解码逻辑,
 * 见 tileset 资源管线优化 S1)。本文件 re-export,保持 extractor 内部
 * `import { decodeRle } from '../io/rle.js'` 路径不变。
 */
export { decodeRle, parseSpriteChunk, type RleFrame } from '@type-pal/shared'
