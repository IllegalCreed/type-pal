import { expect, test } from 'vitest'
import {
  dProjectFiles,
  dStampFile,
  memoryFileSource,
} from './__tests__/glm-runtime-contract-fixtures.js'
import { loadCurrentProjectFrom, loadStampTemplates } from './project-loader.js'

test('合法非空内容 → loadStampTemplates 过守卫返回模板；缺席 → []（对照）', async () => {
  const files = dProjectFiles({ withStamps: true })
  files['content/stamps.json'] = dStampFile()
  const project = await loadCurrentProjectFrom(memoryFileSource(files))
  const templates = await loadStampTemplates(project)
  expect(templates.map((t) => t.id)).toEqual(['sign-1'])
  // 缺席（manifest 无 stamps 路径）→ 合法空数组，不冒称新政策
  const bare = await loadCurrentProjectFrom(memoryFileSource(dProjectFiles()))
  expect(await loadStampTemplates(bare)).toEqual([])
})
test('坏内容只坏一轴：origin 非法即拒；读失败传播底层错误', async () => {
  const files = dProjectFiles({ withStamps: true })
  const canonical = dStampFile()
  if (!Array.isArray(canonical) || !canonical[0]) throw new Error('缺少测试组合模板')
  files['content/stamps.json'] = [{ ...canonical[0], origin: 'mystery' }]
  const project = await loadCurrentProjectFrom(memoryFileSource(files))
  await expect(loadStampTemplates(project)).rejects.toThrow(/origin/)
  const files2 = dProjectFiles({ withStamps: true })
  files2['content/stamps.json'] = dStampFile()
  const project2 = await loadCurrentProjectFrom(memoryFileSource(files2, 'content/stamps.json'))
  await expect(loadStampTemplates(project2)).rejects.toThrow('boom-json:content/stamps.json')
})
