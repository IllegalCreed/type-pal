/**
 * TEST-EDITOR-LOGIC-COVERAGE-1 定向诊断配置（非正式统计配置，R4 重建）。
 * 直接消费官方 `testSelection(editor, 'fast')`（scripts/coverage/config.mjs）的结构化
 * excludes/testArgs，不再用正则猜配置；因此 before/after 与官方 fast 的测试选择只差
 * 本批八个 boundaries 文件（GLM_ED_EXCLUDE_BOUNDARIES=1 为 before 形态）。
 * 完整可复制命令见 docs/testing/glm-editor-logic-coverage-receipt.md「覆盖对照」节。
 */
import { fileURLToPath } from 'node:url'
import { coveragePackages, testSelection } from '../../scripts/coverage/config.mjs'

const root = fileURLToPath(new URL('../../packages/editor/', import.meta.url))
const editorPackage = coveragePackages.find((config) => config.id === 'editor')
if (!editorPackage) throw new Error('scripts/coverage/config.mjs 缺 editor 包配置')

const selection = testSelection(editorPackage, 'fast')
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
    include: ['src/**/*.test.{ts,tsx,mts,js,jsx,mjs,cjs}'],
    exclude: [...selection.excludes, ...boundariesExcludes],
    maxWorkers: 2,
  },
}
