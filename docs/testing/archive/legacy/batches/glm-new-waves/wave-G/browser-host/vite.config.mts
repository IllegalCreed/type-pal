import { createReadStream, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { extname, join, resolve } from 'node:path'

// vite 8 将 config 打包到 node_modules/.vite-temp：import.meta.url 与 __dirname shim 都
// 不指真实 config 目录。用「cwd 向上找 pnpm-workspace.yaml」锚定仓库根（本宿主只从
// browser-host 目录启动 vite）。
function findRepoRoot(start) {
  let dir = resolve(start)
  for (let i = 0; i < 12; i += 1) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = resolve(dir, '..')
    if (parent === dir) break
    dir = parent
  }
  throw new Error(`repo root not found from ${start}`)
}

const repoRoot = findRepoRoot(process.cwd())
// vite 不在仓库根 node_modules：经 editor 包的依赖解析（worktree 环境惯例）。
const { defineConfig } = createRequire(join(repoRoot, 'packages/editor/package.json'))('vite')

const MIME = {
  '.json': 'application/json',
  '.png': 'image/png',
  '.rle': 'application/octet-stream',
  '.bdf': 'text/plain',
  '.mp3': 'audio/mpeg',
  '.mid': 'audio/midi',
}

/** /projects/*、/data/* → 仓库根真实目录（与 packages/reforge/vite.config.ts 同型的最小实现）。 */
function serveDir(urlPrefix, fsDir) {
  return {
    name: `serve ${urlPrefix}`,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith(urlPrefix)) {
          next()
          return
        }
        // ⚠ 去前导斜杠：resolve(fsDir,'/abs') 会当绝对路径丢弃 fsDir。
        const rel = decodeURIComponent(url.slice(urlPrefix.length).split('?')[0] ?? '').replace(
          /^\//,
          '',
        )
        const path = resolve(fsDir, rel)
        if (!path.startsWith(fsDir) || !existsSync(path) || !statSync(path).isFile()) {
          res.statusCode = 404
          res.end('not found')
          return
        }
        res.setHeader('Content-Type', MIME[extname(path)] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-store')
        createReadStream(path).pipe(res)
      })
    },
  }
}

export default defineConfig({
  server: { port: 6092, strictPort: true, fs: { allow: [repoRoot] } },
  plugins: [
    serveDir('/projects/', join(repoRoot, 'projects')),
    serveDir('/data/', join(repoRoot, 'data')),
  ],
  resolve: {
    alias: {
      '@type-pal/content': join(repoRoot, 'packages/content/src/index.ts'),
      '@type-pal/shared': join(repoRoot, 'packages/shared/src/index.ts'),
    },
  },
})
