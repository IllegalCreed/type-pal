// @vitest-environment jsdom

import type { AssetRecordV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { UpsertAssetCommand } from '../core/asset-commands.js'
import { EditSession } from '../core/edit-session.js'
import { AddSkillCommand } from '../core/skill-commands.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import {
  decodeEditorLocation,
  editorLocationHref,
  normalizeEditorLocation,
  sameEditorLocation,
} from './editor-navigation.js'
import { editorObjectTargetMissing } from './editor-target.js'

await stubNodeTestHost()

const assetRecord = (kind: AssetRecordV1['kind'], id: string): AssetRecordV1 => ({
  kind,
  path: `assets/runtime/${id}.bin`,
  mediaType: 'application/octet-stream',
  bytes: 4,
  sha256: `sha-${id}`,
  origin: { kind: 'authored' },
})

async function legalSession() {
  const legal = await loadLegalUiProject('glm-leaf-editor-target')
  const session = new EditSession(legal.state)
  const actorId = session.getState().actors[0]!.id
  const sceneId = session.getState().scenes[0]!.id
  const mapId = session.getState().mapIndex.maps[0]!.id
  return { session, actorId, sceneId, mapId }
}

describe('editorObjectTargetMissing 剩余域', () => {
  test('scene/map/actor workspaces accept only existing stable ids', async () => {
    const { session, actorId, sceneId, mapId } = await legalSession()
    const state = session.getState()
    expect(
      editorObjectTargetMissing(state, {
        module: 'scene',
        subpage: 'workspace',
        objectId: sceneId,
      }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'scene',
        subpage: 'workspace',
        objectId: 'scene.gone',
      }),
    ).toBe(true)
    expect(
      editorObjectTargetMissing(state, { module: 'map', subpage: 'workspace', objectId: mapId }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'map',
        subpage: 'workspace',
        objectId: 'map.gone',
      }),
    ).toBe(true)
    expect(
      editorObjectTargetMissing(state, {
        module: 'actor',
        subpage: 'workspace',
        objectId: actorId,
      }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'actor',
        subpage: 'workspace',
        objectId: 'actor.gone',
      }),
    ).toBe(true)
  })

  test('skill deep links resolve against real session skills', async () => {
    const { session } = await legalSession()
    session.dispatch(new AddSkillCommand('skill.lab.001', '实验技能'))
    const state = session.getState()
    expect(
      editorObjectTargetMissing(state, {
        module: 'battle',
        subpage: 'skill',
        objectId: 'skill.lab.001',
      }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'battle',
        subpage: 'skill',
        objectId: 'skill.gone',
      }),
    ).toBe(true)
  })

  test('music, sound, image and cutscene deep links check the asset kind', async () => {
    const { session } = await legalSession()
    session.dispatch(
      new UpsertAssetCommand(
        'music.leaf.001',
        assetRecord('music', 'music.leaf.001'),
        new ArrayBuffer(2),
      ),
    )
    session.dispatch(
      new UpsertAssetCommand(
        'sound.leaf.001',
        assetRecord('sound', 'sound.leaf.001'),
        new ArrayBuffer(2),
      ),
    )
    session.dispatch(
      new UpsertAssetCommand(
        'portrait.leaf.001',
        assetRecord('portrait', 'portrait.leaf.001'),
        new ArrayBuffer(2),
      ),
    )
    session.dispatch(
      new UpsertAssetCommand(
        'video.leaf.001',
        assetRecord('video', 'video.leaf.001'),
        new ArrayBuffer(2),
      ),
    )
    const state = session.getState()
    const expectMissing = (subpage: string, objectId: string) =>
      editorObjectTargetMissing(state, {
        module: 'asset',
        subpage,
        objectId,
      })
    expect(expectMissing('music', 'music.leaf.001')).toBe(false)
    expect(expectMissing('music', 'sound.leaf.001')).toBe(true)
    expect(expectMissing('sound', 'sound.leaf.001')).toBe(false)
    expect(expectMissing('sound', 'music.leaf.001')).toBe(true)
    expect(expectMissing('image', 'portrait.leaf.001')).toBe(false)
    expect(expectMissing('image', 'music.leaf.001')).toBe(true)
    expect(expectMissing('image', 'asset.gone')).toBe(true)
    expect(expectMissing('cutscene', 'video.leaf.001')).toBe(false)
    expect(expectMissing('cutscene', 'portrait.leaf.001')).toBe(true)
  })

  test('battle sprite domain splits definition ids from battle-sprite asset ids', async () => {
    const { session } = await legalSession()
    const state = session.getState()
    const worldDefinition = { module: 'asset', subpage: 'sprite', objectId: 'hero' } as const
    expect(editorObjectTargetMissing(state, worldDefinition)).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'asset',
        subpage: 'sprite',
        objectId: 'hero',
        view: 'asset',
      }),
    ).toBe(true)
    expect(
      editorObjectTargetMissing(state, {
        module: 'asset',
        subpage: 'sprite',
        objectId: 'hero',
        domain: 'battle',
      }),
    ).toBe(true)
  })
})

describe('editor-navigation 剩余合同', () => {
  test('href rewriting keeps unrelated query parameters and the hash', () => {
    const href = editorLocationHref(
      { module: 'actor', subpage: 'workspace', objectId: 'hero' },
      `http://localhost:6010/editor?project=pal&module=asset&view=asset#${encodeURIComponent('调试面板')}`,
    )
    expect(href).toBe(
      '/editor?project=pal&module=actor&page=workspace&object=hero#' +
        encodeURIComponent('调试面板'),
    )
    const stale = editorLocationHref(
      { module: 'scene', subpage: 'workspace' },
      `http://localhost:6010/editor?project=pal&module=actor&page=workspace&object=hero&domain=world&view=definition&action=basic#${encodeURIComponent('锚点')}`,
    )
    expect(stale).toBe(
      `/editor?project=pal&module=scene&page=workspace#${encodeURIComponent('锚点')}`,
    )
  })

  test('normalization trims identifiers and keeps actor workspace sections', () => {
    expect(
      normalizeEditorLocation({ module: 'actor', subpage: 'workspace', objectId: '  hero  ' }),
    ).toEqual({ module: 'actor', subpage: 'workspace', objectId: 'hero' })
    const withSection = normalizeEditorLocation({
      module: 'actor',
      subpage: 'workspace',
      objectId: 'hero',
      actionId: 'battle',
    })
    expect(withSection.actionId).toBe('battle')
    expect(
      normalizeEditorLocation({
        module: 'actor',
        subpage: 'workspace',
        objectId: 'hero',
        actionId: 'not-a-section',
      }).actionId,
    ).toBeUndefined()
    expect(
      normalizeEditorLocation({
        module: 'asset',
        subpage: 'sprite',
        objectId: 'hero',
        actionId: 'basic',
      }).actionId,
    ).toBe('basic')
    expect(
      normalizeEditorLocation({
        module: 'asset',
        subpage: 'sprite',
        objectId: 'hero',
        view: 'asset',
      }).actionId,
    ).toBeUndefined()
  })

  test('round-trips a battle sprite asset location through the URL encoding', () => {
    const location = normalizeEditorLocation({
      module: 'asset',
      subpage: 'sprite',
      objectId: 'sprite.lab.001',
      domain: 'battle',
      view: 'asset',
    })
    const href = editorLocationHref(location, 'http://localhost:6010/editor?project=pal')
    expect(decodeEditorLocation(new URL(href, 'http://localhost:6010').search)).toEqual(location)
    expect(
      sameEditorLocation(
        location,
        decodeEditorLocation(new URL(href, 'http://localhost:6010').search),
      ),
    ).toBe(true)
  })
})
