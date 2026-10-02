/** DOM 读回 helper：从真实产品目录行采集 oracle，不伪造过滤结果。 */

export function scrapeCatalogRowMetas(rootSelector: string): string[] {
  return [...document.querySelectorAll(`${rootSelector} .ds-catalog-row__meta`)]
    .map((node) => node.textContent?.trim() ?? '')
    .filter((value) => value.length > 0)
}

export function scrapeWorldSpriteVisibleAssets(): string[] {
  return scrapeCatalogRowMetas('.world-sprite-outliner')
}

export function scrapeBattleSpriteVisibleAssets(): string[] {
  return scrapeCatalogRowMetas('.battle-sprite-outliner')
}

export function scrapeAudioCatalogIds(): string[] {
  return scrapeCatalogRowMetas('.audio-library-outliner')
}

const PURPOSE_LABEL_TO_KIND: Record<string, string> = {
  全部: 'all',
  玩家战斗: 'player-fighter',
  敌人: 'enemy',
  召唤: 'summon',
  未配置: 'unconfigured',
}

export function readPurposeFilterValue(): string {
  const native = document.querySelector('select[aria-label="用途筛选"]')
  if (native instanceof HTMLSelectElement && native.value) return native.value
  const trigger = document.querySelector<HTMLElement>(
    '[role="combobox"][aria-label="用途筛选"], button.ds-select[aria-label="用途筛选"], [aria-label="用途筛选"]',
  )
  if (!trigger) return ''
  const label = (
    trigger.querySelector('.ds-select__value')?.textContent ??
    trigger.textContent ??
    ''
  )
    .replace(/\s+/g, ' ')
    .trim()
  if (PURPOSE_LABEL_TO_KIND[label]) return PURPOSE_LABEL_TO_KIND[label]!
  for (const [text, kind] of Object.entries(PURPOSE_LABEL_TO_KIND)) {
    if (text && label.includes(text)) return kind
  }
  return label
}

export function readWorldFilterText(): string {
  return (
    document.querySelector<HTMLInputElement>(
      '[data-surface="world-sprite"] input[aria-label="过滤大世界精灵库"]',
    )?.value ??
    document.querySelector<HTMLInputElement>(
      '[data-surface="world-sprite"] input[placeholder="名称 / id"]',
    )?.value ??
    ''
  )
}

export function sampleProductPreviewCanvas(): {
  ok: boolean
  opaqueCount: number
  centerPixel: number[]
  width: number
  height: number
} {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas.preview-canvas--interactive')
  if (!canvas) {
    return { ok: false, opaqueCount: 0, centerPixel: [], width: 0, height: 0 }
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return {
      ok: false,
      opaqueCount: 0,
      centerPixel: [],
      width: canvas.width,
      height: canvas.height,
    }
  }
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let opaqueCount = 0
  for (let index = 3; index < image.data.length; index += 4) {
    if (image.data[index] === 255) opaqueCount += 1
  }
  const cx = Math.floor(canvas.width / 2)
  const cy = Math.floor(canvas.height / 2)
  const offset = (cy * canvas.width + cx) * 4
  const centerPixel = [
    image.data[offset] ?? 0,
    image.data[offset + 1] ?? 0,
    image.data[offset + 2] ?? 0,
    image.data[offset + 3] ?? 0,
  ]
  return {
    ok: opaqueCount > 0 && centerPixel[3] === 255,
    opaqueCount,
    centerPixel,
    width: canvas.width,
    height: canvas.height,
  }
}

export function readUploaderError(): string {
  return document.querySelector('.bsu .err')?.textContent?.trim() ?? ''
}

export function readNumberFieldDraft(flowId: string): {
  inputValue: string
  committedAttr: string | null
} {
  const root = document.querySelector(`[data-flow-id="${flowId}"]`)
  const input = root?.querySelector<HTMLInputElement>(
    'input[type="number"], input[inputmode="numeric"]',
  )
  return {
    inputValue: input?.value ?? '',
    committedAttr:
      root?.querySelector('[data-draft-state]')?.getAttribute('data-draft-state') ?? null,
  }
}
