import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// The callback contracts distinguish notification functions from acceptance functions.
// This cleanup must not introduce wrappers, extra invocations, branches or discarded false.
const base = '89485589ada4bc5201115af27dc44b4f618a3e7b'
const files = [
  'packages/editor/src/ui/EnemyAnimPreview.tsx',
  'packages/editor/src/ui/LayerStackControls.tsx',
  'packages/editor/src/ui/design-system/add-picker.tsx',
  'packages/editor/src/ui/design-system/draft-input-state.ts',
  'packages/editor/src/ui/design-system/number-inputs.tsx',
  'packages/editor/src/ui/design-system/reorder.tsx',
]
const results = files.map((file) => {
  const before = execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' })
  const after = readFileSync(file, 'utf8')
  const emit = (source) =>
    ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        removeComments: true,
      },
    }).outputText
  assert.equal(emit(after), emit(before), `${file}: callback cleanup must be type-only`)
  return {
    file,
    identicalRuntimeJavaScript: true,
    sha256: createHash('sha256').update(emit(after)).digest('hex'),
  }
})
console.log(JSON.stringify({ base, results }, null, 2))
