import assert from 'node:assert/strict'
import test from 'node:test'
import {
  bindSceneHandoffVideo,
  compareSceneHandoff,
  HANDOFF_SAMPLE_HEIGHT,
  HANDOFF_SAMPLE_WIDTH,
  requireSceneTransferCoverage,
} from './scene-handoff.mjs'

const source = { scene: 's002', map: 'map-012', camera: [1216, 592] }
const target = {
  scene: 's001',
  map: 'map-012',
  camera: [1168, 136],
  leader: { position: [1328, 248], sprite: 193, frame: 11 },
}
const contract = { source: source.scene, sourceCue: 'parting', targetCue: 'wake', target }

function luma(background, dialogue) {
  return Buffer.from(
    Array.from({ length: HANDOFF_SAMPLE_WIDTH * HANDOFF_SAMPLE_HEIGHT }, (_, i) =>
      i < HANDOFF_SAMPLE_WIDTH * 20 ? background : dialogue,
    ),
  )
}

function example() {
  const frames = []
  const draw = (world, dialogue, effect, pixels) => {
    const i = frames.length
    frames.push({
      world,
      dialogue,
      effect,
      id: i,
      captureFrame: i,
      atMs: i * (1000 / 60),
      luma: pixels.toString('base64'),
    })
  }
  draw(source, ['parting'], 0, luma(100, 180))
  for (let i = 1; i <= 31; i++) {
    const light = 1 - i / 32
    draw(source, ['parting'], 1 - light, luma(Math.round(100 * light), Math.round(180 * light)))
  }
  draw(source, [], 1, luma(0, 0))
  for (let i = 0; i < 13; i++) draw(target, [], 0, luma(200, 200))
  draw(target, ['wake'], 0, luma(200, 200))
  return frames
}

test('every visible reveal frame needs the actual target camera and feet', () => {
  const valid = example()
  const baseline = compareSceneHandoff(valid, contract)
  assert.equal(baseline.status, 'passed')
  const bad = structuredClone(valid)
  const row = bad.find((row) => row.captureFrame === baseline.firstVisible.captureFrame)
  row.world = {
    ...row.world,
    camera: [1040, 248],
    leader: { ...row.world.leader, position: [1200, 360] },
  }
  assert.equal(bad.filter((candidate) => candidate.world.camera[0] === 1040).length, 1)
  const proof = compareSceneHandoff(bad, contract)
  assert.equal(proof.status, 'rejected')
  assert.deepEqual(
    proof.findings.map(({ issue, captureFrame }) => [issue, captureFrame]),
    [['wrong-visible-scene-frame', row.captureFrame]],
  )
})

test('a retained portrait and text must fade with the background', () => {
  const frames = example()
  const bad = frames[12]
  bad.luma = luma(62, 180).toString('base64')
  const proof = compareSceneHandoff(frames, contract)
  assert.equal(proof.status, 'rejected')
  assert.equal(proof.findings[0].issue, 'dialogue-did-not-fade-with-scene')
  assert.equal(proof.findings[0].captureFrame, bad.captureFrame)
})

test('a foreign frame in the encoded handoff fails despite a correct draw journal', () => {
  const recording = example()
  const proof = compareSceneHandoff(recording, contract)
  const encoded = recording.map(({ atMs, luma }) => ({
    seconds: atMs / 1000,
    luma: Buffer.from(luma, 'base64'),
  }))
  assert.equal(bindSceneHandoffVideo(encoded, recording, proof, 0).status, 'passed')
  const index = proof.firstVisible.captureFrame
  encoded[index].luma = luma(20, 240)
  const bad = bindSceneHandoffVideo(encoded, recording, proof, 0)
  assert.equal(bad.status, 'encoded-handoff-mismatch')
  assert.equal(bad.firstUnmatchedSeconds, encoded[index].seconds)
})

test('an extra scene cannot bypass review by returning to the expected route', () => {
  const frames = example()
  assert.equal(requireSceneTransferCoverage(frames, ['s002', 's001']), null)
  const altered = [
    ...frames.slice(0, 18),
    { ...frames[17], world: { ...frames[17].world, scene: 's017' } },
    ...frames.slice(18),
  ]
  assert.deepEqual(requireSceneTransferCoverage(altered, ['s002', 's001']).route, [
    's002',
    's017',
    's002',
    's001',
  ])
})
