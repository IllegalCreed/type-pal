import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildPalTestOracleManifest,
  buildPalTestOracleProjection,
  loadPalTestOracle,
  PAL_TEST_ORACLE_MANIFEST,
} from '../src/experimental/script-v5/pal-test-oracle.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const manifestPath = resolve(repo, PAL_TEST_ORACLE_MANIFEST)
const projectionPath = resolve(repo, 'packages/migrate/test-fixtures/pal-oracle/v1/projection.json')
const projection = buildPalTestOracleProjection()
const manifest = buildPalTestOracleManifest(projection)

const expectedProjection = `${JSON.stringify(projection, null, 2)}\n`
const expectedManifest = `${JSON.stringify(manifest, null, 2)}\n`
const mode = process.argv[2] ?? '--check'

if (mode === '--check') {
  loadPalTestOracle()
  if (readFileSync(projectionPath, 'utf8') !== expectedProjection)
    throw new Error('PAL oracle projection 与 published baseline 不一致；请显式运行 --write')
  if (readFileSync(manifestPath, 'utf8') !== expectedManifest)
    throw new Error('PAL oracle manifest 与当前输入不一致；请显式运行 --write')
  console.log('PAL oracle: manifest/projection verified')
} else if (mode === '--print') {
  console.log(JSON.stringify({ manifest, projection }, null, 2))
} else if (mode === '--write') {
  mkdirSync(dirname(manifestPath), { recursive: true })
  writeFileSync(projectionPath, expectedProjection)
  writeFileSync(manifestPath, expectedManifest)
  console.log('PAL oracle: wrote manifest and projection; review git diff and run canary')
} else {
  throw new Error(`unknown mode ${mode}; use --check, --print or --write`)
}
