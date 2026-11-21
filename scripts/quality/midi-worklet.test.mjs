import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))

function dependencyRoot(owner, packageName) {
  const from = createRequire(join(owner, 'package.json'))
  return dirname(from.resolve(`${packageName}/package.json`))
}

function mappedSources(file) {
  const { sources, sourcesContent } = JSON.parse(readFileSync(file, 'utf8'))
  return new Map(sources.map((name, index) => [name, sourcesContent[index]]))
}

for (const app of ['game', 'reforge']) {
  test(`${app} ships the supplier's paired MIDI processor and its licenses`, () => {
    const owner = join(root, 'packages', app)
    const lib = dependencyRoot(owner, 'spessasynth_lib')
    const core = dependencyRoot(lib, 'spessasynth_core')
    if (app === 'reforge') {
      // MIDI analysis imports Core directly; playback reaches it through the library.
      const direct = createRequire(join(owner, 'package.json')).resolve('spessasynth_core')
      const throughLib = createRequire(join(lib, 'package.json')).resolve('spessasynth_core')
      assert(
        readFileSync(direct).equals(readFileSync(throughLib)),
        'MIDI analysis and playback must use the same core',
      )
    }
    const vorbis = dependencyRoot(core, 'stb-vorbis')
    const coreRequire = createRequire(join(core, 'package.json'))
    const fflate = dirname(dirname(coreRequire.resolve('fflate')))
    const bundled = mappedSources(join(lib, 'dist/spessasynth_processor.min.js.map'))
    const coreSources = mappedSources(join(core, 'dist/index.js.map'))
    const prefix = '../node_modules/spessasynth_core/src/'
    const pairedCore = [...bundled].filter(([path]) => path.startsWith(prefix))
    assert(pairedCore.length > 0, 'the publisher map must expose the embedded core')
    for (const [path, content] of pairedCore) {
      assert.equal(
        coreSources.get(`../src/${path.slice(prefix.length)}`) === content,
        true,
        `processor and installed core disagree on ${path}`,
      )
    }
    for (const [bundlePath, installed] of [
      ['../node_modules/stb-vorbis/dist/index.js', join(vorbis, 'dist/index.js')],
      ['../node_modules/fflate/esm/browser.js', join(fflate, 'esm/browser.js')],
    ]) {
      assert.equal(bundled.get(bundlePath) === readFileSync(installed, 'utf8'), true, bundlePath)
    }
    assert(
      readFileSync(join(owner, 'public/spessasynth_processor.min.js')).equals(
        readFileSync(join(lib, 'dist/spessasynth_processor.min.js')),
      ),
      'the copied worklet must match the installed library',
    )
    const license = readFileSync(join(owner, 'public/spessasynth-LICENSE.txt'))
    for (const packageRoot of [lib, core, vorbis]) {
      const metadata = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
      assert.equal(metadata.license, 'Apache-2.0', metadata.name)
      assert.deepEqual(license, readFileSync(join(packageRoot, 'LICENSE')))
    }
    assert.deepEqual(
      readFileSync(join(owner, 'public/spessasynth-fflate-LICENSE.txt')),
      readFileSync(join(fflate, 'LICENSE')),
    )
  })
}
