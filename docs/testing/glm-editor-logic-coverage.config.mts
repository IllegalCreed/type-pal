/**
 * TEST-EDITOR-LOGIC-COVERAGE-1 定向诊断配置（非正式统计配置）。
 * 复刻 editor 包官方 fast 排除口径（scripts/coverage/config.mjs coverageTestExcludes），
 * 供回执覆盖对照命令直接复制；GLM_ED_EXCLUDE_BOUNDARIES=1 时额外排除本批八个
 * boundaries 测试文件（before 侧）。
 * 完整可复制命令见 docs/testing/glm-editor-logic-coverage-receipt.md「覆盖对照」节。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../packages/editor/', import.meta.url))
const configRaw = readFileSync(
  fileURLToPath(new URL('../../scripts/coverage/config.mjs', import.meta.url)),
  'utf8',
)
const editorBlock = configRaw.slice(
  configRaw.indexOf("id: 'editor'"),
  configRaw.indexOf('])', configRaw.indexOf("id: 'editor'")),
)
const officialFastExcludes = [...editorBlock.matchAll(/'(src\/[^']+)'/g)].map((m) => m[1]!)
const boundariesExcludes =
  process.env.GLM_ED_EXCLUDE_BOUNDARIES === '1'
    ? [
        'src/core/commands-world.boundaries.test.ts',
        'src/core/commands-catalog.boundaries.test.ts',
        'src/core/commands-map.boundaries.test.ts',
        'src/core/commands-assets.boundaries.test.ts',
        'src/core/actor-dialogue-commands.boundaries.test.ts',
        'src/core/stamp-commands.boundaries.test.ts',
        'src/core/project-reference.boundaries.test.ts',
        'src/core/project-reference-adapters.boundaries.test.ts',
      ]
    : []

export default {
  root,
  test: {
    passWithNoTests: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: [...officialFastExcludes, ...boundariesExcludes],
    maxWorkers: 2,
  },
}
