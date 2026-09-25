// ARCH-REGRESSION-LAB-GLM-1 显式候选配置：只收集本目录 candidates/**；
// 诊断红例（diagnostics/**）由 diagnostics.vitest.mjs 单独运行，不进绿套件。
// 复用各包既有解析/环境合同；不改仓库任何配置。
import { createEditorProjectTestConfig } from './project-configs.mjs'

export default createEditorProjectTestConfig({
  include: ['candidates/editor/**/*.test.{ts,tsx}'],
})
