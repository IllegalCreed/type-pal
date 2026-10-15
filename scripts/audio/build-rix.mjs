import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const compiler = process.env.RIX_EMXX || 'em++'
const version = execFileSync(compiler, ['--version'], { encoding: 'utf8' })
if (!version.includes('4.0.23')) throw new Error('RIX requires Emscripten 4.0.23')
const source = resolve(root, 'packages/game/vendor/rix')
const destination = resolve(root, 'packages/game/src/shell/rix/rix.wasm')
mkdirSync(dirname(destination), { recursive: true })
execFileSync(
  compiler,
  [
    `${source}/bridge.cpp`,
    `${source}/rix.cpp`,
    `${source}/player.cpp`,
    '-std=c++17',
    '-O3',
    '-Wall',
    '-Wextra',
    '-Werror',
    '-fno-exceptions',
    '-fno-rtti',
    '-sSTANDALONE_WASM=1',
    '-sFILESYSTEM=0',
    '-sABORTING_MALLOC=0',
    '-sINITIAL_MEMORY=8388608',
    '-sALLOW_MEMORY_GROWTH=0',
    '-sEXPORTED_FUNCTIONS=["_malloc","_free","_rix_create","_rix_play","_rix_render","_rix_destroy"]',
    '--no-entry',
    '-o',
    destination,
  ],
  { stdio: 'inherit' },
)
const module = new WebAssembly.Module(readFileSync(destination))
if (WebAssembly.Module.imports(module).length !== 0) {
  throw new Error('RIX must not depend on SDL, filesystem, shared memory or host imports')
}
