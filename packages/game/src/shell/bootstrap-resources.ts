import { type DialogAssets, loadDialogAssets } from '../assets/dialog-assets.js'
import { type LoadedAssets, loadAll } from '../assets/loader.js'
import { type GlyphTable, loadGlyphs } from '../present/font.js'

export interface BootstrapInitialResources {
  assets: LoadedAssets
  glyphs: GlyphTable | undefined
  dialogAssets: DialogAssets
}

export interface BootstrapResourcePorts {
  fetchSoundfont: () => Promise<ArrayBuffer>
  loadAssets: (sceneId: number) => Promise<LoadedAssets>
  loadGlyphs: () => Promise<GlyphTable>
  loadDialogAssets: () => Promise<DialogAssets>
  warn: (message: string, error: unknown) => void
}

export interface BootstrapResourceLoad {
  /** 原始 promise 注入 MIDI backend；失败仍须保持 rejection 语义。 */
  soundfontData: Promise<ArrayBuffer>
  /** 只表达 settle，不把 soundfont 失败升级为启动阻断。 */
  soundfontSettled: Promise<void>
  /** 场景主资源、glyph 降级与 dialog 资产的并发 ready barrier。 */
  resourcesReady: Promise<BootstrapInitialResources>
}

const defaultPorts: BootstrapResourcePorts = {
  fetchSoundfont: async () => {
    const response = await fetch('/soundfont.sf3')
    if (!response.ok) throw new Error(`soundfont HTTP ${response.status}`)
    return response.arrayBuffer()
  },
  loadAssets: loadAll,
  loadGlyphs,
  loadDialogAssets,
  warn: (message, error) => console.warn(message, error),
}

/**
 * 同步启动四类 boot 下载，并把“资源可装配”与“soundfont 已 settle”保持为两个独立 barrier。
 */
export function startBootstrapResourceLoad(
  sceneId: number,
  ports: BootstrapResourcePorts = defaultPorts,
): BootstrapResourceLoad {
  // soundfont 必须最先起跑；大文件下载与其余 boot 资源重叠。
  const soundfontData = ports.fetchSoundfont()
  const soundfontSettled = soundfontData.then(
    () => {},
    () => {},
  )

  const resourcesReady = Promise.all([
    ports.loadAssets(sceneId),
    ports.loadGlyphs().catch((error: unknown) => {
      ports.warn('[bootstrap] loadGlyphs failed, text will render as tofu:', error)
      return undefined
    }),
    ports.loadDialogAssets(),
  ]).then(([assets, glyphs, dialogAssets]) => ({ assets, glyphs, dialogAssets }))

  return { soundfontData, soundfontSettled, resourcesReady }
}
