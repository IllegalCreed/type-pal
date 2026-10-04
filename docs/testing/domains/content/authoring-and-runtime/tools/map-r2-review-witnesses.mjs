import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Preserve all three r1 mutations and the actual candidate judge. The legal r2 fixture now loads
// asynchronously, so only await its two uses and make appended oracle callbacks async.
const root = resolve(process.argv[2])
const directory = dirname(fileURLToPath(import.meta.url))
let source = readFileSync(join(directory, 'cursor-map-review-witnesses.mjs'), 'utf8')
function replaceOnce(from, to) {
  assert.equal(source.split(from).length, 2, from)
  source = source.replace(from, to)
}
replaceOnce(
  'const directory = dirname(fileURLToPath(import.meta.url))',
  `const directory = ${JSON.stringify(directory)}`,
)
replaceOnce(
  "new EditSession(editorStateWithMap('map-a',input))",
  "new EditSession(await editorStateWithMap('map-a',input))",
)
replaceOnce(
  "const state=editorStateWithMap('map-a',maps.group);let rejection;",
  "const state=await editorStateWithMap('map-a',maps.group);let rejection;",
)
replaceOnce(
  'writeFileSync(path, runner)',
  `assert.equal(runner.split(${JSON.stringify('},()=>{')}).length, 2);\nrunner = runner.replace(${JSON.stringify('},()=>{')}, ${JSON.stringify('},async()=>{')});\nwriteFileSync(path, runner)`,
)
const output = mkdtempSync(join(tmpdir(), 'codex-map-r2-wrapper-'))
const path = join(output, 'runner.mjs')
writeFileSync(path, source)
const env = { ...process.env }
delete env.NODE_COMPILE_CACHE
const result = spawnSync(process.execPath, [path, root], { env, stdio: 'inherit' })
assert.equal(result.signal, null)
assert.equal(result.status, 0)
