/** Own package collection ordering; the caller supplies the actual report/IO job. */
export async function collectPackages(coveragePackages, collectPackage, parallelEditor) {
  const packages = {}
  if (parallelEditor) {
    const editor = coveragePackages.find((packageConfig) => packageConfig.id === 'editor')
    if (!editor) throw new Error('fast coverage parallel editor 配置缺失')
    let editorResult
    try {
      for (const packageConfig of coveragePackages) {
        if (packageConfig.id === 'editor') continue
        if (packageConfig.id === 'game') {
          // Observe rejection as soon as the parallel job starts. The main
          // sequence may still be collecting game when editor has failed.
          editorResult = collectPackage(editor).then(
            (value) => ({ kind: 'success', value }),
            (error) => ({ kind: 'failure', error }),
          )
        }
        packages[packageConfig.id] = await collectPackage(packageConfig)
      }
      const editorOutcome = await editorResult
      if (editorOutcome.kind === 'failure') throw editorOutcome.error
      packages[editor.id] = editorOutcome.value
    } finally {
      // A failed foreground package must not leave a report job writing after
      // this owner has returned. Its handled outcome cannot mask that failure.
      await editorResult
    }
  } else {
    for (const packageConfig of coveragePackages) {
      packages[packageConfig.id] = await collectPackage(packageConfig)
    }
  }
  return packages
}
