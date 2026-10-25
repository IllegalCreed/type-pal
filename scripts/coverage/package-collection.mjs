/** Own package collection ordering; the caller supplies the actual report/IO job. */
export async function collectPackages(coveragePackages, collectPackage, parallelEditor) {
  const packages = {}
  if (parallelEditor) {
    const editor = coveragePackages.find((packageConfig) => packageConfig.id === 'editor')
    if (!editor) throw new Error('fast coverage parallel editor 配置缺失')
    let editorResult
    for (const packageConfig of coveragePackages) {
      if (packageConfig.id === 'editor') continue
      if (packageConfig.id === 'game') editorResult = collectPackage(editor)
      packages[packageConfig.id] = await collectPackage(packageConfig)
    }
    packages[editor.id] = await editorResult
  } else {
    for (const packageConfig of coveragePackages) {
      packages[packageConfig.id] = await collectPackage(packageConfig)
    }
  }
  return packages
}
