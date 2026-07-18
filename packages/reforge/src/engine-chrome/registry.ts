type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type Frame = `0${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`

export type EngineChromeUiSlot =
  | `battle/icon-${'attack' | 'magic' | 'coop' | 'misc'}.png`
  | `${'box' | 'box-red' | 'scroll' | 'itembox'}/frame-${Frame}.png`
  | `cursor/${'down' | 'grid' | 'settle-arrow' | 'up-red' | 'up'}.png`
  | 'magic/playerbox.png'
  | `${'num' | 'num-blue' | 'num-cyan'}/${Digit}.png`
  | 'num/slash.png'
  | 'status/bg.png'
  | 'status/slot.png'
  | `status/equip-demo/${'accessory' | 'amulet' | 'body' | 'feet' | 'head' | 'weapon'}.png`

export type EngineChromeImageSlot = EngineChromeUiSlot | 'opening.default-title'

const frameSlots = (dir: 'box' | 'box-red' | 'scroll' | 'itembox'): EngineChromeUiSlot[] =>
  Array.from({ length: 9 }, (_, index) => `${dir}/frame-0${index}.png` as EngineChromeUiSlot)
const digitSlots = (dir: 'num' | 'num-blue' | 'num-cyan'): EngineChromeUiSlot[] =>
  Array.from({ length: 10 }, (_, index) => `${dir}/${index}.png` as EngineChromeUiSlot)

/** 构建必须携带的 85 个默认 UI slot；保留 6 个状态装备示例作为已发布 chrome。 */
export const ENGINE_CHROME_UI_SLOTS: readonly EngineChromeUiSlot[] = [
  'battle/icon-attack.png',
  'battle/icon-magic.png',
  'battle/icon-coop.png',
  'battle/icon-misc.png',
  ...frameSlots('box'),
  ...frameSlots('box-red'),
  'cursor/down.png',
  'cursor/grid.png',
  'cursor/settle-arrow.png',
  'cursor/up-red.png',
  'cursor/up.png',
  ...frameSlots('itembox'),
  'magic/playerbox.png',
  ...digitSlots('num'),
  ...digitSlots('num-blue'),
  ...digitSlots('num-cyan'),
  'num/slash.png',
  ...frameSlots('scroll'),
  'status/bg.png',
  'status/slot.png',
  'status/equip-demo/accessory.png',
  'status/equip-demo/amulet.png',
  'status/equip-demo/body.png',
  'status/equip-demo/feet.png',
  'status/equip-demo/head.png',
  'status/equip-demo/weapon.png',
]

const bundledUi = import.meta.glob('./assets/ui/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** 非项目资源；URL 全由 bundler 生成，支持 standalone/editor play 和非根 base。 */
export const ENGINE_CHROME = {
  fontBdf: new URL('../../../../data/raw/unifont-cn.bdf', import.meta.url).href,
  dialogCursor: new URL('./assets/dialog-icons-raw.json', import.meta.url).href,
  defaultTitle: new URL('./assets/title.png', import.meta.url).href,
  provenance: new URL('./assets/PROVENANCE.md', import.meta.url).href,
  unifontOfl: new URL('./assets/licenses/OFL-1.1.txt', import.meta.url).href,
  unifontCopying: new URL('./assets/licenses/COPYING', import.meta.url).href,
} as const

export function engineChromeUiUrl(slot: EngineChromeUiSlot): string {
  const url = bundledUi[`./assets/ui/${slot}`]
  if (!url) throw new Error(`引擎 chrome 缺少 UI slot "${slot}"`)
  return url
}

export function assertEngineChromeComplete(): void {
  const missing = ENGINE_CHROME_UI_SLOTS.filter(
    (slot) => bundledUi[`./assets/ui/${slot}`] === undefined,
  )
  const extras = Object.keys(bundledUi)
    .map((path) => path.replace('./assets/ui/', ''))
    .filter((slot) => !ENGINE_CHROME_UI_SLOTS.includes(slot as EngineChromeUiSlot))
  if (missing.length || extras.length)
    throw new Error(
      `引擎 chrome UI registry 不完整:missing=[${missing.join(', ')}], extras=[${extras.join(', ')}]`,
    )
}

const imageCache = new Map<EngineChromeImageSlot, Promise<ImageBitmap>>()

/** 必需 chrome 图像：缺文件或解码失败均携 slot 报错，不做 404/文字静默回退。 */
export function loadEngineChromeImage(slot: EngineChromeImageSlot): Promise<ImageBitmap> {
  const hit = imageCache.get(slot)
  if (hit) return hit
  const url =
    slot === 'opening.default-title' ? ENGINE_CHROME.defaultTitle : engineChromeUiUrl(slot)
  const pending = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.blob()
    })
    .then((blob) => createImageBitmap(blob))
    .catch((error: unknown) => {
      imageCache.delete(slot)
      throw new Error(
        `引擎 chrome 图像 slot "${slot}" 加载失败:` +
          `${error instanceof Error ? error.message : String(error)}`,
      )
    })
  imageCache.set(slot, pending)
  return pending
}
