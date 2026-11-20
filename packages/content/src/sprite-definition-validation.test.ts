import { expect, test } from 'vitest'
import { audioProjectAssetFixture, spriteAssetRecord } from './__tests__/asset-catalog-fixtures.js'
import { expectRejectUnchanged } from './__tests__/validation-assertions.js'
import { validateAssetCatalog } from './asset.js'
import type { SpriteDef } from './sprite.js'
import { validateSprites } from './validate.js'

const spriteId = 'sprite.guide'
const soundId = 'sound.pal.045'
const catalogInput = () => ({
  version: 1,
  assets: {
    [spriteId]: spriteAssetRecord(spriteId),
    ...audioProjectAssetFixture().catalog.assets,
  },
})

function sprite(): SpriteDef {
  return { id: 'guide', asset: spriteId, label: '向导', layout: { kind: 'static' } }
}

function action() {
  return {
    label: '招手',
    steps: [{ frame: 0, durationMs: 100, cues: [{ kind: 'sound' as const, asset: soundId }] }],
  }
}

test('retains a directional definition and its authored sound cue with valid catalog records', () => {
  const input = {
    ...sprite(),
    layout: { kind: 'directional', framesPerDir: 2 },
    poses: { wave: action() },
  } satisfies SpriteDef
  expect(validateSprites([input], validateAssetCatalog(catalogInput()))).toEqual([input])
})

test.each([
  [{ kind: 'directional' }, 'directional 缺 framesPerDir(number)'],
  [{ kind: 'directional', framesPerDir: 0 }, 'directional framesPerDir 期望正整数'],
  [{ kind: 'loop' }, 'kind 非法("loop")'],
])('rejects invalid persisted sprite layout %j', (layout, reason) => {
  expectRejectUnchanged(validateSprites, [{ ...sprite(), layout }], `sprites[0].layout: ${reason}`)
})

test('requires the definition asset to be a registered sprite', () => {
  const catalog = validateAssetCatalog(catalogInput())
  expect(validateSprites([sprite()], catalog)).toEqual([sprite()])
  const validate = (input: unknown) => validateSprites(input, catalog)
  expectRejectUnchanged(
    validate,
    [{ ...sprite(), asset: 'sprite.missing' }],
    'sprites[0].asset: AssetId "sprite.missing" 不在 catalog',
  )
  expectRejectUnchanged(
    validate,
    [{ ...sprite(), asset: 'music.pal.002' }],
    'sprites[0].asset: AssetId "music.pal.002" 期望 sprite，实际 music',
  )
})

test('rejects a numeric sprite address in a valid current definition', () => {
  expectRejectUnchanged(
    validateSprites,
    [{ ...sprite(), spriteNum: 3 }],
    'sprites[0].spriteNum: 已退役；请升级为 asset AssetId',
  )
})

test.each([
  [{ steps: [] }, '.steps: 期望非空数组'],
  [{ loopFrom: 1 }, '.loopFrom: 期望小于 steps.length 的非负整数'],
  [{ label: ' ' }, '.label: 期望非空 string'],
])('rejects an invalid action field %j', (patch, reason) => {
  expectRejectUnchanged(
    validateSprites,
    [{ ...sprite(), poses: { wave: { ...action(), ...patch } } }],
    `sprites[0].poses["wave"]${reason}`,
  )
})

test.each([
  [{ kind: 'fade', asset: soundId }, '.kind: 首期只允许 sound'],
  [{ kind: 'sound', asset: 'sound.missing' }, '.asset: AssetId "sound.missing" 不在 catalog'],
])('reports the exact field of an invalid sprite action cue %j', (cue, reason) => {
  const catalog = validateAssetCatalog(catalogInput())
  const motion = action()
  const [step] = motion.steps
  expectRejectUnchanged(
    (input) => validateSprites(input, catalog),
    [{ ...sprite(), poses: { wave: { ...motion, steps: [{ ...step, cues: [cue] }] } } }],
    `sprites[0].poses["wave"].steps[0].cues[0]${reason}`,
  )
})
