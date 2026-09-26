import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const target = resolve(root, 'packages/editor/src/ui/CommandForm.tsx')
export default {
  root,
  plugins:
    process.env.FORM_DIAGNOSTIC_FIX === 'true'
      ? [
          {
            name: 'isolated-facing-oracle',
            enforce: 'pre',
            load(file) {
              if (file !== target) return
              const source = readFileSync(file, 'utf8')
              const from = 'onChange(rebuild(targetMode, f || undefined))'
              assert.equal(source.split(from).length, 2)
              return source.replace(
                from,
                'onChange(makeLoadScene(cmd.scene, targetMode, f || undefined, cmd.transition))',
              )
            },
          },
        ]
      : [],
  test: { include: ['docs/testing/codex-command-forms/diagnostics.test.ts'], maxWorkers: 1 },
}
