import { expect, test } from 'vitest'
import { audioProjectAssetFixture } from './__tests__/asset-catalog-fixtures.js'
import { expectRejectUnchanged } from './__tests__/validation-assertions.js'
import {
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type CurrentManifest,
} from './character.js'
import { validateCurrentManifestStartup } from './validate.js'

function startupManifest(): CurrentManifest {
  return {
    id: 'campaign',
    name: '仙灵岛',
    contentVersion: CONTENT_VERSION,
    minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
    defaultEntryId: 'main',
    content: { scenes: 'content/scenes/' },
    assets: audioProjectAssetFixture().assets,
    entryPoints: [
      {
        id: 'main',
        label: '开始',
        scene: 'arrival',
        startWorld: { party: ['hero'], money: 0, inventory: [] },
      },
    ],
  }
}

test('checked startup returns the registered entry and preserves its scene and opening party', () => {
  const manifest = startupManifest()
  expect(validateCurrentManifestStartup(manifest, ['arrival']).defaultEntry).toEqual(
    manifest.entryPoints[0],
  )
})

test('requires the main manifest identity', () => {
  const { id: _id, ...withoutId } = startupManifest()
  expectRejectUnchanged(validateCurrentManifestStartup, withoutId, 'manifest: 缺键 "id"')
})

test('rejects a stale minimum save version independently of the current content version', () => {
  expectRejectUnchanged(
    validateCurrentManifestStartup,
    { ...startupManifest(), minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION - 1 },
    `manifest.minimumSaveVersion: 期望 ${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}`,
  )
})

test.each([
  [{ ' ': 'content/scenes/' }, 'manifest.content: 内容键不能为空'],
  [{ scenes: '' }, 'manifest.content.scenes: 期望非空工程相对路径'],
])('reports malformed content directory registration %j', (content, error) => {
  expectRejectUnchanged(validateCurrentManifestStartup, { ...startupManifest(), content }, error)
})

test('locates a missing entry scene identity at its index', () => {
  const manifest = startupManifest()
  const { scene: _scene, ...invalid } = manifest.entryPoints[0]
  expectRejectUnchanged(
    validateCurrentManifestStartup,
    { ...manifest, entryPoints: [invalid] },
    'manifest.entryPoints[0]: 缺键 "scene"',
  )
})

test('rejects an otherwise valid entry with padded identity before selecting a default', () => {
  const manifest = startupManifest()
  expectRejectUnchanged(
    validateCurrentManifestStartup,
    {
      ...manifest,
      defaultEntryId: ' main',
      entryPoints: [{ ...manifest.entryPoints[0], id: ' main' }],
    },
    'manifest.entryPoints[0].id: 不得包含首尾空格',
  )
})
