import base from '../../packages/game/vite.config'
import { instrumentErrandTrace } from './errand-trace-plugin.mjs'
import { FAIRY_MAZE_GAME_TRACE_TARGETS } from './fairy-island-maze-game-observer.mjs'

export default {
  ...base,
  plugins: [
    ...base.plugins,
    {
      name: 'isolated-fairy-maze-game-trace',
      apply: 'serve' as const,
      enforce: 'pre' as const,
      transform(source: string, id: string) {
        const file = FAIRY_MAZE_GAME_TRACE_TARGETS.find((path) => id.endsWith(`/${path}`))
        return file ? { code: instrumentErrandTrace(source, file).code, map: null } : null
      },
    },
  ],
}
