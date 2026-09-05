/** A disposable use of the real shop menu. No world boot, scripts or save store. */
import { lookupText, type WorldState } from '@type-pal/content'
import { assertEngineChromeComplete } from './engine-chrome/registry.js'
import { loadMenuAssets } from './menu/menu-box.js'
import { drawShop, openShopUi, shopInput } from './menu/shop-box.js'
import type { LoadedCurrentProject } from './project-loader.js'
import { projectItemsView } from './runtime-project-view.js'
import { loadGlyphs } from './text/glyph.js'

export interface ShopTrialParameters {
  shopId: number
  money: number
}

export function parseShopTrialParameters(params: URLSearchParams): ShopTrialParameters | undefined {
  if (!params.has('shop-trial')) return undefined
  for (const key of params.keys()) {
    if (!['project', 'workspace', 'shop-trial', 'money'].includes(key))
      throw new Error(`独立试买不能同时使用参数 ${key}`)
    if (params.getAll(key).length !== 1) throw new Error(`独立试买参数 ${key} 重复`)
  }
  const number = (key: string): number => {
    const raw = params.get(key)
    if (raw === null || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)))
      throw new Error(`独立试买参数 ${key} 必须为非负安全整数`)
    return Number(raw)
  }
  return { shopId: number('shop-trial'), money: number('money') }
}

export async function runShopTrial(
  project: LoadedCurrentProject,
  trial: ShopTrialParameters,
): Promise<void> {
  const shop = project.shops.find(({ id }) => id === trial.shopId)
  if (!shop) throw new Error(`独立试买：商店 ${trial.shopId} 不存在，请先保存项目`)
  const items = projectItemsView(project.items)
  for (const id of shop.items)
    if (!items[id]) throw new Error(`独立试买：商店 ${shop.id} 引用不存在的物品 ${id}`)
  const canvas = document.getElementById('screen') as HTMLCanvasElement | null
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) throw new Error('独立试买：缺少可用画布')
  assertEngineChromeComplete()
  const [glyphs, assets] = await Promise.all([
    loadGlyphs(),
    loadMenuAssets(items, project.imageCache),
  ])
  let scale = 4
  const fit = (): void => {
    scale = Math.max(1, Math.min(4, Math.floor(Math.min(innerWidth / 320, innerHeight / 200))))
    canvas.width = 320 * scale
    canvas.height = 200 * scale
    canvas.style.width = `${canvas.width}px`
    canvas.style.height = `${canvas.height}px`
  }
  fit()
  document.title = `商店 ${shop.id} · 独立试买`
  canvas.setAttribute(
    'aria-label',
    `商店 ${shop.id} 独立试买；方向键选择，空格或回车确认，Escape退出`,
  )
  const ui = openShopUi('buy', [...shop.items])
  let world: WorldState = { money: trial.money, inventory: [], party: [], learnedSkills: {} }
  const locale = {
    no: lookupText('menu.system.no', project.locale),
    yes: lookupText('menu.system.yes', project.locale),
  }
  const keys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Escape'])
  await new Promise<void>((resolve, reject) => {
    let stopped = false
    let frame = 0
    const pressed = new Set<string>()
    const keydown = (event: KeyboardEvent): void => {
      if (!keys.has(event.key)) return
      event.preventDefault()
      if (!event.repeat) pressed.add(event.key)
    }
    const blur = (): void => pressed.clear()
    const cleanup = (): void => {
      stopped = true
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('blur', blur)
      window.removeEventListener('pagehide', pagehide)
      window.removeEventListener('resize', fit)
      pressed.clear()
    }
    const pagehide = (): void => {
      cleanup()
      resolve()
    }
    const tick = (now: number): void => {
      if (stopped) return
      try {
        const result = shopInput(ui, pressed, world, items, (next) => {
          world = next
        })
        pressed.clear()
        if (result === 'close') {
          cleanup()
          const status = document.createElement('p')
          status.setAttribute('role', 'status')
          status.textContent = '试买已结束，可关闭此标签页。本次金钱和物品不会保存。'
          status.style.color = '#d7dce5'
          canvas.after(status)
          canvas.hidden = true
          canvas.style.display = 'none'
          resolve()
          return
        }
        ctx.save()
        try {
          ctx.setTransform(scale, 0, 0, scale, 0, 0)
          ctx.imageSmoothingEnabled = false
          ctx.fillStyle = '#1a1d24'
          ctx.fillRect(0, 0, 320, 200)
          drawShop(ctx, ui, world, items, assets, glyphs, now, locale)
        } finally {
          ctx.restore()
        }
        frame = requestAnimationFrame(tick)
      } catch (error) {
        cleanup()
        reject(error)
      }
    }
    window.addEventListener('keydown', keydown)
    window.addEventListener('blur', blur)
    window.addEventListener('pagehide', pagehide)
    window.addEventListener('resize', fit)
    frame = requestAnimationFrame(tick)
  })
}
