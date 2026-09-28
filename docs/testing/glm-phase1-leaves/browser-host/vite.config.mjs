// TEST-GLM-PHASE1-LEAVES-3 隔离短视觉宿主：repo 根为 root，/extracted 只读指向主仓已提取数据。
// 端口 6082–6085（避开用户 6005/6010/6050、Kimi 6062–6065、GLM① 6066–6069、GLM② 6072–6075）。

import { createReadStream, existsSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '../../../..')
const extractedRoot = '/Users/zhangxu/illegal/type-pal/data/extracted'

function extractedMiddleware() {
  return {
    name: 'extracted-readonly',
    configureServer(server) {
      server.middlewares.use('/extracted', (req, res, _next) => {
        const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname)
        const file = normalize(join(extractedRoot, rel))
        if (!file.startsWith(extractedRoot) || !existsSync(file)) {
          res.statusCode = 404
          return res.end('not found')
        }
        res.setHeader(
          'content-type',
          rel.endsWith('.json') ? 'application/json' : 'application/octet-stream',
        )
        createReadStream(file).pipe(res)
      })
    },
  }
}

export default {
  root: repoRoot,
  publicDir: false,
  server: { port: Number(process.env.PORT ?? 6082), strictPort: true, fs: { strict: false } },
  plugins: [extractedMiddleware()],
  logLevel: 'error',
}
