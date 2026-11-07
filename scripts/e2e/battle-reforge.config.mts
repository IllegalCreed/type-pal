import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import base from '../../packages/reforge/vite.config'
import {
  instrumentReforgeBattle,
  REFORGE_BATTLE_TARGETS,
} from './battle-reforge-instrumentation.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const counter = process.env.Q2_COUNTER ?? 'none'
if (!['none', 'double-herb'].includes(counter))
  throw new Error(`unknown battle counter: ${counter}`)
const plugin: Plugin = {
  name: 'q2-battle-foundation',
  apply: 'serve',
  enforce: 'pre',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/q2-battle.html') return next()
      try {
        const html = await server.transformIndexHtml(
          '/q2-battle.html',
          '<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>Q2 battle fixture</title><style>body{margin:0;background:#000;color:white}canvas{display:block;width:960px;max-width:100vw;height:auto;image-rendering:pixelated}</style></head><body><canvas id="screen" width="1280" height="800"></canvas><script type="module" src="/@fs/' +
            resolve(root, 'scripts/e2e/battle-reforge-adapter.mjs') +
            '"></script></body></html>',
        )
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(html)
      } catch (error) {
        next(error)
      }
    })
  },
  transform(code, id) {
    const file = id.split('?')[0].replaceAll('\\', '/')
    const target = REFORGE_BATTLE_TARGETS.find((entry) => file === resolve(root, entry))
    return target ? { code: instrumentReforgeBattle(code, target, counter).code, map: null } : null
  },
}

export default { ...base, plugins: [...base.plugins, plugin] }
