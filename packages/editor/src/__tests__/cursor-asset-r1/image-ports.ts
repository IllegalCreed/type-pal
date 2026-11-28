/**
 * 浏览器硬件端口（createImageBitmap 真实 PNG 解码 / Node Blob+crypto / DataTransfer）。
 * 只读复用 kimi-editor-workflows/kit 的端口实现，不修改其文件；业务核心全部真实。
 */

export { installBrowserHardwarePorts } from '../bitmap-test-port.js'
export { dispatchDragEvent, MemoryDataTransfer } from '../drag-test-ports.js'
export { atlasColors, pngFileOf, pngRgba, solidAtlasPng, solidRgba } from '../png-fixtures.js'
