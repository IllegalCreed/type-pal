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
    caches.open(CACHE_NAME).then(async (cache) => {
      const hit = await cache.match(req)
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok) cache.put(req, res.clone())
      return res
    }),
  )
})

// ── 后台预缓存:页面 postMessage({type:'precache'}) 触发 ──
const CONCURRENCY = 8 // 节流并发,防饿死前台 fetch
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
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    post({ type: 'precache-done', total, totalBytes: manifest.totalBytes })
  } catch (err) {
    post({ type: 'precache-error', message: String(err) })
  } finally {
    precaching = false
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'precache') void precacheAll()
})
