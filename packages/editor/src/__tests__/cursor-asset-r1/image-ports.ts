/**
 * 浏览器硬件端口（createImageBitmap 真实 PNG 解码 / Node Blob+crypto / DataTransfer）。
 * 只读复用 kimi-editor-workflows/kit 的端口实现，不修改其文件；业务核心全部真实。
 */
export {
  atlasColors,
  dispatchDragEvent,
  installBrowserHardwarePorts,
  MemoryDataTransfer,
  pngFileOf,
  pngRgba,
  solidAtlasPng,
  solidRgba,
} from '../../ui/__tests__/kimi-editor-workflows/kit.js'
