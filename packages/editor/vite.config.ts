import react from '@vitejs/plugin-react'
import { createReadStream, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

/**
 * editor vite 配置(抄 reforge/vite.config.ts 的 serveDir)。
 *
 * 映射(跨平台,无 symlink,macOS/Linux/Windows 一致):
 *   /projects/*  → <repo-root>/projects/*     (工程 JSON + assets;loader fetch)
 *   /extracted/* → <repo-root>/data/extracted/* (原版提取资源;tilemap/sprite/palette)
 *
 * editor 复用 reforge 的 loadProject → 同样需要这两条映射。
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function serveDir(urlPrefix: string, fsDir: string): Plugin {
  // dev + preview 同款中间件(见 reforge/vite.config.ts;⚠ 去前导斜杠 bug 已修,照抄)。
  const mw = (req: { url?: string }, res: NodeJS.WritableStream, next: () => void): void => {
    const url = req.url ?? ''
    if (!url.startsWith(urlPrefix)) return next()
    // 去前缀 + query + 前导斜杠;防路径穿越(../)。
    const rel = decodeURIComponent(url.slice(urlPrefix.length).split('?')[0] ?? '').replace(/^\/+/, '')
    if (rel.includes('..')) return next()
    const file = resolve(fsDir, rel)
    if (!file.startsWith(fsDir)) return next()
    try {
      const stat = statSync(file)
      if (!stat.isFile()) return next()
    } catch {
      return next()
    }
    createReadStream(file).pipe(res)
  }
  return {
    name: `serve-${urlPrefix.replace(/\//g, '')}`,
    configureServer(server) {
      server.middlewares.use(mw)
    },
    configurePreviewServer(server) {
      server.middlewares.use(mw)
    },
  }
}

export default {
  plugins: [
    react(),
    serveDir('/projects', resolve(repoRoot, 'projects')),
    serveDir('/extracted', resolve(repoRoot, 'data/extracted')),
  ],
}
