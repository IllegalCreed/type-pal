/**
 * YJ2 解压已搬到 `@type-pal/shared`(extractor 与 runtime 共用同一份;runtime 的 RNG
 * 动画解码 decodeRngFrames 需要它)。本文件 re-export,保持 extractor 内部
 * `import { decompressYj2 } from '../io/yj2.js'` 等路径不变。
 */
export { decompressYj2 } from '@type-pal/shared'
