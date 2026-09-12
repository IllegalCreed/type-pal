import { fileURLToPath } from 'node:url'
export default {
  test: {
    root: fileURLToPath(new URL('../../../../packages/editor', import.meta.url)),
    include: [fileURLToPath(new URL('./probe-open-identity-boundaries.test.mjs', import.meta.url))],
    maxWorkers: 1,
  },
}
