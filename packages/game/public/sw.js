// 原生Service Worker，不经Vite打包；页面以updateViaCache:'none'注册，更新脚本不读HTTP缓存。
// 运行时按需缓存与后台预缓存共用资源；worker重启后内存状态会重置。
const CACHE_PREFIX = 'type-pal-'
let CACHE_NAME = `${CACHE_PREFIX}bootstrap` // 真正名字在拿到 manifest.version 后定(setCacheVersion)
const MANIFEST_URL = '/extracted/asset-manifest.json'

self.addEventListener('install', () => {
  self.skipWaiting() // 新 SW 立即接管(配合 clients.claim)
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 清除旧资源版本，避免跨cache查询命中旧格式；保留当前版本，避免只更新壳层也重下全量。
      // manifest由提取器按排序后的path/size/sha256生成版本。activate与每次precache都会检查，
      // 资源更新不依赖修改sw.js来触发activate。离线取不到manifest时保留已有缓存。
      try {
        await setCacheVersion()
      } catch {
        /* manifest 不可达(离线)→ 保留现有缓存,勿清 */
      }
      await self.clients.claim()
    })(),
  )
})

/** 只缓存同源 GET 的静态资源:/extracted/* 与构建产物 /assets/*。 */
function shouldCache(url) {
  if (url.origin !== self.location.origin) return false
  return url.pathname.startsWith('/extracted/') || url.pathname.startsWith('/assets/')
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (!shouldCache(url)) return // 导航/index.html/其它 → 走默认网络(SW 可自更新)
  event.respondWith(
    // 查询同源CacheStorage全部cache：worker重启后CACHE_NAME回到bootstrap，不能只查该空cache。
    // 旧type-pal版本由setCacheVersion清理；这里没有额外的cache名称过滤。
    caches.match(req).then(async (hit) => {
      if (hit) return hit
      const res = await fetch(req)
      // 只缓存完整200；Cache.put拒绝206视频Range响应。写缓存不阻塞响应，写入失败也不拒绝响应；
      // waitUntil仍延长事件生命周期，不是放任写入在worker终止时丢失。
      if (res.status === 200) {
        // Clone before returning the response: the client can consume it while caches.open awaits.
        const copy = res.clone()
        event.waitUntil(
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(req, copy))
            .catch(() => {}),
        )
      }
      return res
    }),
  )
})

// 页面在必要资源就绪后postMessage启动预缓存；单worker全局只允许一轮，重启后靠cache续传。
const CONCURRENCY = 8 // 全速:虚线后必要资源已下完,预缓存不再抢它的带宽
let precaching = false
// 开场视频期间暂停:worker 挂起、不发起 fetch,不抢视频 Range 请求 / 用户输入的带宽 IO
// (否则点击「进入游戏」/ 空格跳过视频后延迟很大,2026-06-15 用户实测)。
let paused = false
let resumeWaiters = []
function waitWhilePaused() {
  if (!paused) return Promise.resolve()
  return new Promise((resolve) => resumeWaiters.push(resolve))
}
function resumePrecaching() {
  paused = false
  const ws = resumeWaiters
  resumeWaiters = []
  ws.forEach((r) => r())
}

async function setCacheVersion() {
  const res = await fetch(MANIFEST_URL, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`manifest ${res.status}`)
  const manifest = await res.json()
  CACHE_NAME = `${CACHE_PREFIX}${manifest.version}`
  // 版本失效:删掉所有非当前版本的旧缓存
  const keys = await caches.keys()
  await Promise.all(
    keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k)),
  )
  return manifest
}

function post(msg) {
  return self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage(msg)))
}

async function precacheAll() {
  if (precaching) return
  precaching = true
  try {
    const manifest = await setCacheVersion()
    const cache = await caches.open(CACHE_NAME)
    const files = manifest.files
    const total = files.length
    let done = 0
    let bytes = 0
    let lastPost = 0
    const urls = files.map((f) => ({ url: `/extracted/${f.path}`, size: f.size }))
    let cursor = 0
    async function worker() {
      while (cursor < urls.length) {
        await waitWhilePaused() // 视频期间挂起:不消费 cursor、不发起 fetch
        if (cursor >= urls.length) break // 恢复后可能已被别的 worker 取完
        const { url, size } = urls[cursor++]
        try {
          // 续传:已缓存跳过
          if (!(await cache.match(url))) {
            const res = await fetch(url, { cache: 'no-cache' })
            if (res.ok) await cache.put(url, res.clone())
          }
          bytes += size // 已处理清单字节，含HTTP非成功响应；不是实际下载/成功缓存字节。
        } catch {
          // 单文件失败不致命:运行时按需 fetch 兜底
        }
        done++
        const now = Date.now()
        if (now - lastPost > 200 || done === total) {
          lastPost = now
          post({ type: 'precache-progress', done, total, bytes, totalBytes: manifest.totalBytes })
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    post({ type: 'precache-done', total, totalBytes: manifest.totalBytes })
  } catch (err) {
    post({ type: 'precache-error', message: String(err) })
  } finally {
    precaching = false
  }
}

self.addEventListener('message', (event) => {
  if (!event.data) return
  if (event.data.type === 'precache') {
    // 将整轮promise挂到消息事件，延长worker生命周期；浏览器仍可能终止worker。
    // 失败或终止后的下一轮通过cache.match跳过已有资源，并非持久化进度游标。
    event.waitUntil(precacheAll())
  } else if (event.data.type === 'precache-pause') {
    paused = true // 开场视频期间:worker 在 waitWhilePaused 挂起
  } else if (event.data.type === 'precache-resume') {
    resumePrecaching()
    // SW 若在暂停期间被浏览器终止(precaching 随之重置)→ resume 时重启 precacheAll 续传。
    if (!precaching) event.waitUntil(precacheAll())
  }
})
