import type { GameState } from '../core/game-state.js'
import { PARTYOFFSET_X, PARTYOFFSET_Y } from '../core/game-state.js'
import { getMapName, hasMapName } from '../tools/map-names.js'
import type { DevPanelDeps, SceneJump } from './dev-panel.js'

/**
 * 场景缩略图 dataURL 缓存(key = `m{mapNum}` / 无 map 时 `s{sceneId}`)—— **模块级**,跨 picker 开关存活,
 * 同 map 多场景共享。renderSceneThumbnail(bootstrap)内部另按 mapNum 缓存渲染结果;这里再缓存一层
 * 让重开面板 / 同 map 卡片立即出图不闪。
 */
const sceneThumbCache = new Map<string, string>()

type ScenePanelDeps = Pick<DevPanelDeps, 'sceneJumps' | 'renderSceneThumbnail'> & {
  gs: Pick<GameState, 'party' | 'camera'>
}

/** 场景页拥有本次列表/observer/迟到DOM写入；成功缩略图缓存按页面模块存活。 */
export function mountDevScenePanel(
  body: HTMLDivElement,
  deps: ScenePanelDeps,
  onSelect: (jump: SceneJump) => void,
): () => void {
  // picker-owned async resources must stop observing the old DOM before a new
  // picker takes ownership. The generation also fences deferred thumbnail
  // results after filtering or closing; the shared URL cache remains useful.
  let pickerClosed = false
  let sceneGeneration = 0
  let sceneObserver: IntersectionObserver | undefined
  const cleanupPicker = (): void => {
    if (pickerClosed) return
    pickerClosed = true
    sceneObserver?.disconnect()
    sceneObserver = undefined
  }

  // M4 P3 T6: scene jump section —— input + 配置内场景过滤列表。
  // ── 🗺 场景 tab ──
  const sceneH = document.createElement('h4')
  sceneH.textContent = '🗺 场景跳转'
  sceneH.className = 'tp-dev-section-h'
  body.appendChild(sceneH)

  const sceneInput = document.createElement('input')
  sceneInput.type = 'text'
  sceneInput.placeholder = '过滤:场景 id / map id / 地名'
  sceneInput.style.cssText =
    'width:100%; box-sizing:border-box; margin-bottom:4px; padding:3px 6px; font-family:monospace; font-size:12px'
  body.appendChild(sceneInput)

  // 计数 / 状态提示覆盖全部配置，不按固定数量截断
  const sceneCount = document.createElement('div')
  sceneCount.style.cssText = 'font-size:10px; color:#999; margin-bottom:4px'
  body.appendChild(sceneCount)

  // 📍 坐标传送:同场景内直接搬 party(x,y 世界像素坐标)+ camera 跟随。
  //   跳场景卡片无 partyStart 时落点可能不合法(困在水面/墙里),用这个救;也方便对准触发垫调试。
  const teleRow = document.createElement('div')
  teleRow.style.cssText = 'display:flex; gap:4px; margin-bottom:6px; align-items:center'
  const teleLabel = document.createElement('span')
  teleLabel.textContent = '📍'
  teleLabel.title = '坐标传送(世界像素坐标)'
  const teleX = document.createElement('input')
  const teleY = document.createElement('input')
  for (const [inp, ph] of [
    [teleX, 'x'],
    [teleY, 'y'],
  ] as const) {
    inp.type = 'number'
    inp.placeholder = ph
    inp.style.cssText = 'width:72px; padding:3px 6px; font-family:monospace; font-size:12px'
  }
  const teleBtn = document.createElement('button')
  teleBtn.textContent = '传送'
  teleBtn.addEventListener('click', () => {
    const x = Number(teleX.value)
    const y = Number(teleY.value)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    deps.gs.party.x = x
    deps.gs.party.y = y
    deps.gs.camera = { x: x - PARTYOFFSET_X, y: y - PARTYOFFSET_Y }
    console.log(`[dev-panel] teleport → (${x}, ${y})`)
  })
  teleRow.append(teleLabel, teleX, teleY, teleBtn)
  body.appendChild(teleRow)

  // 缩略图卡片网格:全部场景,可滚动;缩略图 IntersectionObserver lazy 渲染。
  const sceneList = document.createElement('div')
  sceneList.style.cssText =
    'display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:5px; max-height:360px; overflow-y:auto; padding:2px 0 4px; background:#1a1a1a'
  body.appendChild(sceneList)

  const thumbKeyOf = (j: SceneJump): string =>
    j.mapNum !== undefined ? `m${j.mapNum}` : `s${j.sceneId}`
  // 场景无名,只有地图有名(map-names)。供搜索过滤用。
  const mapNameOf = (j: SceneJump): string =>
    j.mapNum !== undefined && hasMapName(j.mapNum) ? getMapName(j.mapNum) : ''

  // 缩略图 lazy 加载:命中模块级缓存立即出图;否则调 bootstrap renderSceneThumbnail(按 mapNum 缓存)。
  const loadThumb = (
    img: HTMLImageElement,
    ph: HTMLElement,
    j: SceneJump,
    generation: number,
  ): void => {
    const key = thumbKeyOf(j)
    const apply = (url: string): void => {
      if (pickerClosed || generation !== sceneGeneration) return
      img.src = url
      img.style.display = 'block'
      ph.style.display = 'none'
    }
    const cached = sceneThumbCache.get(key)
    if (cached) {
      apply(cached)
      return
    }
    if (!deps.renderSceneThumbnail) return
    ph.textContent = '渲染中…'
    void deps
      .renderSceneThumbnail(j.sceneId, j.mapNum)
      .then((url) => {
        // Keep successful results in the shared cache even when this picker or
        // list generation is gone; only the stale DOM write is suppressed.
        if (url) sceneThumbCache.set(key, url)
        if (pickerClosed || generation !== sceneGeneration) return
        if (!url) {
          ph.textContent = j.mapNum !== undefined ? `map ${j.mapNum}` : '—'
          return
        }
        apply(url)
      })
      .catch(() => {
        if (pickerClosed || generation !== sceneGeneration) return
        ph.textContent = j.mapNum !== undefined ? `map ${j.mapNum}` : '—'
      })
  }

  // 单一 observer,每次 filter 重建(列表重建)。场景 tab 初始 display:none → observer 不触发;
  // 用户切到场景 tab 显示后,可见卡片才渲染缩略图(避免一次启动全部场景的缩略图请求)。
  const hasIO = typeof IntersectionObserver !== 'undefined'

  const renderSceneList = (filter: string): void => {
    if (pickerClosed) return
    const generation = ++sceneGeneration
    sceneObserver?.disconnect()
    sceneList.textContent = ''
    const f = filter.toLowerCase()
    const filtered = deps.sceneJumps.jumps.filter((e) => {
      if (!f) return true
      const name = mapNameOf(e)
      return (
        String(e.sceneId).includes(f) ||
        e.label.toLowerCase().includes(f) ||
        name.toLowerCase().includes(f) ||
        (e.mapNum !== undefined && String(e.mapNum).includes(f))
      )
    })
    const total = deps.sceneJumps.jumps.length
    sceneCount.textContent =
      (filter ? `匹配 ${filtered.length} / 共 ${total}` : `共 ${total} 个场景`) +
      (deps.renderSceneThumbnail ? ' · 缩略图滚动加载' : ' · 无缩略图渲染器')

    const cardToJump = new WeakMap<Element, SceneJump>()
    if (hasIO) {
      sceneObserver = new IntersectionObserver(
        (entries, obs) => {
          if (pickerClosed || generation !== sceneGeneration) return
          for (const ent of entries) {
            if (!ent.isIntersecting) continue
            const j = cardToJump.get(ent.target)
            const img = ent.target.querySelector<HTMLImageElement>('img')
            const ph = ent.target.querySelector<HTMLElement>('[data-ph]')
            if (j && img && ph) loadThumb(img, ph, j, generation)
            obs.unobserve(ent.target)
          }
        },
        { root: sceneList, rootMargin: '150px' },
      )
    }

    for (const jump of filtered) {
      const card = document.createElement('div')
      card.title = jump.label
      card.style.cssText =
        'min-width:0; cursor:pointer; border:1px solid #3a3a42; border-radius:4px; background:#222; padding:3px; display:flex; flex-direction:column; align-items:center; gap:2px'
      card.addEventListener('mouseenter', () => (card.style.borderColor = '#6c8eef'))
      card.addEventListener('mouseleave', () => (card.style.borderColor = '#3a3a42'))

      const thumbWrap = document.createElement('div')
      thumbWrap.style.cssText =
        'width:100%; aspect-ratio:1 / 1; max-height:96px; background:#111; display:flex; align-items:center; justify-content:center; overflow:hidden; border:1px solid #2a2a2a'
      const ph = document.createElement('div')
      ph.dataset.ph = '1'
      ph.textContent = jump.mapNum !== undefined ? `map ${jump.mapNum}` : '…'
      ph.style.cssText = 'font-size:10px; color:#555'
      const img = document.createElement('img')
      img.alt = ''
      img.style.cssText = 'max-width:100%; max-height:100%; image-rendering:auto; display:none'
      thumbWrap.append(ph, img)
      card.appendChild(thumbWrap)

      // 第一行:场景号(场景无名)。
      const sceneLine = document.createElement('div')
      sceneLine.textContent = `#${jump.sceneId}`
      sceneLine.style.cssText =
        'font-size:12px; line-height:1.2; text-align:center; width:100%; color:#ddd; font-family:monospace'
      card.appendChild(sceneLine)

      // 第二行:地图号 + 地图名(map-names);未起名灰色显「地图N」,方便补名。
      const mn = jump.mapNum
      const named = mn !== undefined && hasMapName(mn)
      const mapLine = document.createElement('div')
      mapLine.textContent = mn !== undefined ? `map-${mn} ${getMapName(mn)}` : 'map-?'
      mapLine.style.cssText = `font-size:10px; line-height:1.2; font-family:monospace; width:100%; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; color:${named ? '#fdf6a8' : '#888'}`
      card.appendChild(mapLine)

      card.addEventListener('click', () => onSelect(jump))
      sceneList.appendChild(card)
      cardToJump.set(card, jump)
      if (sceneObserver) sceneObserver.observe(card)
      else loadThumb(img, ph, jump, generation) // 无 IO 兜底:直接加载(命中缓存即出图)
    }
  }

  sceneInput.addEventListener('input', () => renderSceneList(sceneInput.value.trim()))
  renderSceneList('')

  // M5.6 UX hotfix:底部 Cancel 按钮删除 — 走右上角 X(已加在 div 内)

  return cleanupPicker
}
