import assert from 'node:assert/strict'

/** Explicit non-import inputs used by the scenario entry/renderer outside its
 * story contract. Both producer and verifier use this trusted declaration.
 */
export function producerExtraInputs(fragment, engine) {
  assert(['001', '002', '003', '004', '005', '006'].includes(fragment))
  assert(['game', 'reforge'].includes(engine))
  return [
    ...(engine === 'reforge'
      ? ['projects/pal/manifest.json', 'projects/pal/assets/index.json']
      : []),
    ...(fragment === '001' && engine === 'game'
      ? [
          'data/extracted/data/scene/0.json',
          'data/extracted/data/scene/1.json',
          'data/extracted/videos/3.mp4',
        ]
      : []),
    ...(fragment === '002' ? ['projects/pal/content/sprites.json'] : []),
  ]
}

export function assertDeclaredInputs(manifest, contractPaths, fragment, engine) {
  for (const path of [...contractPaths, ...producerExtraInputs(fragment, engine)]) {
    assert(manifest.definition.declared.includes(path), `missing required producer input ${path}`)
    assert(Object.hasOwn(manifest.hashes, path), `missing required producer input hash ${path}`)
  }
}
