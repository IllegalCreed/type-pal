import { createReadStream, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
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
  const mw = (
    req: { url?: string },
    res: NodeJS.WritableStream & { setHeader?: (k: string, v: string) => void },
    next: () => void,
  ): void => {
    const url = req.url ?? ''
    if (!url.startsWith(urlPrefix)) {
      next()
      return
    }
    // 去前缀 + query + 前导斜杠;防路径穿越(../)。
    const rel = decodeURIComponent(url.slice(urlPrefix.length).split('?')[0] ?? '').replace(
      /^\/+/,
      '',
    )
    if (rel.includes('..')) {
      next()
      return
    }
    const file = resolve(fsDir, rel)
    if (!file.startsWith(fsDir)) {
      next()
      return
    }
    try {
      const stat = statSync(file)
      if (!stat.isFile()) {
        next()
        return
      }
    } catch {
      next()
      return
    }
    // .js 必须带 JS MIME:audioWorklet.addModule 严格校验 Content-Type(fetch 不挑,worklet 挑)
    if (file.endsWith('.js') || file.endsWith('.mjs'))
      res.setHeader?.('Content-Type', 'text/javascript')
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
  build: {
    rollupOptions: {
      // 多页:主编辑器 + 同源试玩页(play.html;本地工程 FSA 句柄跨不了源,试玩必须同源)
      input: {
        main: resolve(dirname(fileURLToPath(import.meta.url)), 'index.html'),
        play: resolve(dirname(fileURLToPath(import.meta.url)), 'play.html'),
      },
    },
  },
  plugins: [
    react(),
    serveDir('/projects', resolve(repoRoot, 'projects')),
    serveDir('/extracted', resolve(repoRoot, 'data/extracted')),
    serveDir('/baked', resolve(repoRoot, 'data/baked')), // bake 产物库层(立绘/战斗头像/物品图标)
    // W5 BGM 试听:reforge BgmPlayer 按应用绝对路径拉 worklet + soundfont(在 reforge/public);
    // editor 不复制 6MB 资产,单文件映射过去(serveDir prefix=完整路径 → rel='' → 命中该文件)。
    serveDir('/soundfont.sf3', resolve(repoRoot, 'packages/reforge/public/soundfont.sf3')),
    serveDir(
      '/spessasynth_processor.min.js',
      resolve(repoRoot, 'packages/reforge/public/spessasynth_processor.min.js'),
    ),
  ],
}
