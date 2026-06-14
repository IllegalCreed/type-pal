// packages/game/public/sw.js — 原生 Service Worker(离线资源预缓存)。
// vanilla JS,不经 vite 打包;register 时 updateViaCache:'none' 保证本文件改动即时生效。
/* eslint-disable no-restricted-globals */
const CACHE_PREFIX = 'type-pal-'
let CACHE_NAME = `${CACHE_PREFIX}bootstrap` // 真正名字在拿到 manifest.version 后定(setCacheVersion)
const MANIFEST_URL = '/extracted/asset-manifest.json'

self.addEventListener('install', () => {
  self.skipWaiting() // 新 SW 立即接管(配合 clients.claim)
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
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
    // 跨所有 type-pal-* cache 匹配:SW 被浏览器重启后顶层 CACHE_NAME 重置回 'type-pal-bootstrap'
    // (precacheAll 已 done 不再 setCacheVersion 修正它),只在它里面找会全 miss → 退化直连、打网络
    // (2026-06-14 竞速零网络验证暴露)。caches.match 跨 cache 命中 version cache 的预缓存资源。
    caches.match(req).then(async (hit) => {
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(req, res.clone())
      }
      return res
    }),
  )
})

// ── 后台预缓存:页面 postMessage({type:'precache'}) 触发 ──
// 让路:可玩前低并发不抢 boot 必要资源带宽;用户进入(precache-boost)后提到全速。
const INITIAL_CONCURRENCY = 2
const BOOST_CONCURRENCY = 8
let boosted = false
let spawnMore = null // precacheAll 运行期暴露:boost 时 spawn 额外 worker 到 BOOST
let precaching = false

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
        const { url, size } = urls[cursor++]
        try {
          // 续传:已缓存跳过
          if (!(await cache.match(url))) {
            const res = await fetch(url, { cache: 'no-cache' })
            if (res.ok) await cache.put(url, res.clone())
          }
          bytes += size
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
    // 可增长 worker 池:boost 时 spawn 额外 worker(共享 cursor 续传)。
    // while(length 变化) 重复 Promise.all 等到 boost 后新加的 worker 也结束。
    const pool = []
    const addWorkers = (n) => {
      for (let i = 0; i < n; i++) pool.push(worker())
    }
    spawnMore = () => addWorkers(BOOST_CONCURRENCY - pool.length)
    addWorkers(boosted ? BOOST_CONCURRENCY : INITIAL_CONCURRENCY)
    let prevLen = -1
    while (pool.length !== prevLen) {
      prevLen = pool.length
      await Promise.all(pool)
    }
    post({ type: 'precache-done', total, totalBytes: manifest.totalBytes })
  } catch (err) {
    post({ type: 'precache-error', message: String(err) })
  } finally {
    precaching = false
    spawnMore = null
  }
}

self.addEventListener('message', (event) => {
  if (!event.data) return
  if (event.data.type === 'precache') {
    // waitUntil 保活:precacheAll 是长任务(本地数十秒、生产数分钟),不挂 waitUntil 则 SW 在
    // ~30s idle(无 pending event)后被浏览器终止,预缓存中途停(2026-06-14 验证停在 76%)。
    // 被终止后靠续传(cache.match 跳过)续:重访/重触发从未缓存项继续。
    event.waitUntil(precacheAll())
  } else if (event.data.type === 'precache-boost') {
    boosted = true
    if (spawnMore) spawnMore() // 已在跑 → 立即补 worker;未跑 → 下次 precacheAll 直接全速
  }
})
