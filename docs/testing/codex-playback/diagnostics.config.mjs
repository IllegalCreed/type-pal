import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export default {
  root,
  test: { include: ['docs/testing/codex-playback/diagnostics.test.ts'], maxWorkers: 1 },
}
