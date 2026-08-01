import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputPath = resolve(packageRoot, 'test-fixtures/pal-oracle/v1/r13-source-semantics.json')

if (process.argv[2] !== '--write') {
  throw new Error('use --write to regenerate the R13-6A golden from a live source-backed canary')
}

// The dynamic import is intentional: the producer fixture reads this gate during module
// initialization, so setting it after a static import would make the update path fail closed.
process.env.TYPE_PAL_MIGRATE_TEST_GATE = 'canary'
const { buildR13SourceSemanticsCanaryFixture, buildR13SourceSemanticsCanaryGolden } = await import(
  '../src/experimental/script-v5/r13-source-semantics-canary.js'
)
const fixture = buildR13SourceSemanticsCanaryFixture()
const golden = buildR13SourceSemanticsCanaryGolden(fixture)
await import('node:fs').then(({ writeFileSync }) => {
  writeFileSync(outputPath, `${JSON.stringify(golden, null, 2)}\n`)
})
console.log(`R13-6A canary golden written: ${outputPath}`)
