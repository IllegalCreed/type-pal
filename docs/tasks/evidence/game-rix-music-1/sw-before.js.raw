// packages/game/public/sw.js — 原生 Service Worker(离线资源预缓存)。
// vanilla JS,不经 vite 打包;register 时 updateViaCache:'none' 保证本文件改动即时生效。
// rev: 2026-06-22 activate 改按版本清缓存(保留当前版本,只删旧版本)。
/* eslint-disable no-restricted-globals */
const CACHE_PREFIX = 'type-pal-'
let CACHE_NAME = `${CACHE_PREFIX}bootstrap` // 真正名字在拿到 manifest.version 后定(setCacheVersion)
const MANIFEST_URL = '/extracted/asset-manifest.json'

self.addEventListener('install', () => {
  self.skipWaiting() // 新 SW 立即接管(配合 clients.claim)
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 激活即按 manifest 版本归位 CACHE_NAME,并删**非当前版本**的旧缓存(含迁移前老格式),再接管页面。
      //   为何删旧版本:fetch handler 跨 cache 匹配,若旧格式 cache 还在,会在新壳下被命中 → 版本错位崩
      //   (2026-06-22:tileset/sprite/动画/战斗/magic 改 gzip blob 后,旧 cache 的 tilemap 无 tileset →
      //    `tilemap.tileset` undefined → fetch `/extracted/data/undefined` 404 → bootstrap 崩)。
      //   为何**不**删当前版本:纯 app 发版(数据版本不变)若连当前版本整份预缓存也清,老用户每次发版后
      //    都要在慢网(prod ~440KB/s,~200MB≈8min)重下 → 进度卡虚线(2026-06-22 用户实测「停在虚线」根因;
      //    此前误用「清所有」即此)。版本不变 → 保留缓存 → 续访 precache 全 cache.match 命中、秒满。
      //   离线:manifest 取不到 → 不误删用户已有缓存,保持现状(setCacheVersion 抛 → catch 跳过)。
      // ⚠️ 凡 `pnpm extract` 改了资源格式/路径,manifest.version 会变(extractor 按内容哈希),本清理据此
      //    生效;无需再手改本文件触发 activate(版本变更 → setCacheVersion 删旧版本即可)。
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
    // 跨所有 type-pal-* cache 匹配:SW 被浏览器重启后顶层 CACHE_NAME 重置回 'type-pal-bootstrap'
    // (precacheAll 已 done 不再 setCacheVersion 修正它),只在它里面找会全 miss → 退化直连、打网络
    // (2026-06-14 竞速零网络验证暴露)。caches.match 跨 cache 命中 version cache 的预缓存资源。
    caches.match(req).then(async (hit) => {
      if (hit) return hit
      const res = await fetch(req)
      // 只缓存完整 200;206 Partial(<video> 的 Range 请求)Cache.put 不支持。put 必须 fire-forget + 吞错——
      // 若 await 且 put 抛(206),respondWith 会 reject → 资源 net::ERR_FAILED(开场 AVI 全挂 + 黑屏,
      // 2026-06-15 生产回归:改 caches.match 时误加了 await + 用 res.ok 含 206;原版本就是 fire-forget)。
      if (res.status === 200) {
        caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone())).catch(() => {})
      }
      return res
    }),
  )
})

// ── 后台预缓存:页面 postMessage({type:'precache'}) 触发(虚线后由 startPrecache 启动)──
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
  if (!event.data) return
  if (event.data.type === 'precache') {
    // waitUntil 保活:precacheAll 是长任务(本地数十秒、生产数分钟),不挂 waitUntil 则 SW 在
    // ~30s idle(无 pending event)后被浏览器终止,预缓存中途停(2026-06-14 验证停在 76%)。
    // 被终止后靠续传(cache.match 跳过)续:重访/重触发从未缓存项继续。
    event.waitUntil(precacheAll())
  } else if (event.data.type === 'precache-pause') {
    paused = true // 开场视频期间:worker 在 waitWhilePaused 挂起
  } else if (event.data.type === 'precache-resume') {
    resumePrecaching()
    // SW 若在暂停期间被浏览器终止(precaching 随之重置)→ resume 时重启 precacheAll 续传。
    if (!precaching) event.waitUntil(precacheAll())
  }
})
