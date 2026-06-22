/**
 * MKF 归档读取已搬到 `@type-pal/shared`(extractor 与 runtime 共用;runtime 的 RNG
 * 动画解码需要读 RNG chunk 内层 sub-MKF)。本文件 re-export,保持 extractor 内部
 * `import { openMkf, readChunk, chunkCount } from '../io/mkf.js'` 等路径不变。
 */
export { type Mkf, chunkCount, openMkf, readChunk } from '@type-pal/shared'
