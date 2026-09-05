// Diagnostic-only config: runs the ORIGINAL first-phase resource tests, never edits them.
// pnpm --filter @type-pal/game exec vitest run --config <absolute path to this file> <filter>
import { fileURLToPath } from 'node:url'
import gameConfig from '../../../../packages/game/vitest.config.ts'

const gameRoot = fileURLToPath(new URL('../../../../packages/game/', import.meta.url))
export default {
  ...gameConfig,
  root: gameRoot,
  server: { hmr: false, ws: false, watch: null },
  test: {
    ...gameConfig.test,
    include: [
      'src/assets/rng-blob-snapshot.test.ts',
      'src/assets/tileset-blob-snapshot.test.ts',
      'src/assets/sprite-blob-snapshot.test.ts',
    ],
    fileParallelism: false,
    setupFiles: [
      fileURLToPath(new URL('../../../../packages/game/vitest.setup.ts', import.meta.url)),
      fileURLToPath(new URL('./probe-test-gates.setup.ts', import.meta.url)),
    ],
  },
}
