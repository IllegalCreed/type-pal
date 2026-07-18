import { createReadStream, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

/**
 * 工程化资源映射(跨平台,无 symlink)。
 *
 * 历史:public/projects、public/extracted 曾是 Unix symlink → Windows 协作者 clone 后
 * git checkout 成普通文件(内容是文本路径),dev server fetch 404。改用 vite 中间件把
 * URL 映射到仓库根真实目录,零 symlink 依赖,macOS/Linux/Windows 一致。
 *
 * 映射:
 *   /projects/*  → <repo-root>/projects/*     (工程 JSON + assets;loader fetch)
 *   /extracted/* → <repo-root>/data/extracted/* (尚未迁移的 tilemap/sprite/palette)
 *
 * 工程静态图由项目 catalog 读取；默认 UI/字形/光标由 engine-chrome registry 打包，不走这里。
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function serveDir(urlPrefix: string, fsDir: string): Plugin {
  // dev + preview 同款中间件:dev 服务源码、preview 服务 dist;两者都要把 /projects、/extracted 映射到仓库根。
  const mw = (req: { url?: string }, res: NodeJS.WritableStream, next: () => void): void => {
    const url = req.url ?? ''
    if (!url.startsWith(urlPrefix)) {
      next()
      return
    }
    // 去掉前缀 + query,拼 fs 路径;防路径穿越(../)。
    // ⚠ 去前导斜杠:urlPrefix 无尾斜杠 → slice 余 '/demo/…';resolve(fsDir,'/abs') 会当绝对路径丢弃 fsDir
    const rel = decodeURIComponent(url.slice(urlPrefix.length).split('?')[0] ?? '').replace(
      /^\/+/,
      '',
    )
    if (rel.includes('..')) {
      next()
      return
    }
    const file = resolve(fsDir, rel)
    // 确保解析后仍在 fsDir 内(再防穿越)
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
      next() // 不存在 → 交回 vite(返 404)
      return
    }
    // 流式返回;不设 Content-Type,让 vite/浏览器按扩展名嗅探(.json/.rle/.png)
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
    serveDir('/projects', resolve(repoRoot, 'projects')),
    serveDir('/extracted', resolve(repoRoot, 'data/extracted')),
  ],
}
