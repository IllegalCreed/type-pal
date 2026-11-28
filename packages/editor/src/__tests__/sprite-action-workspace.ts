import type { SpriteDef } from '@type-pal/content'
import { act } from 'react'
import { clickButtonByText } from './cursor-asset-r1/kit.js'
import { type setupWorldSpriteLibrarySuite, waitMeta } from './world-sprite-library-gestures.js'
import type { MountedWorldSpriteLibrary } from './world-sprite-library-test-host.js'
import { loadWorldSpriteProject } from './world-sprite-project.js'

export const ACTION_SPRITE = 'action-sprite'
export const ACTION_ASSET = 'sprite.authored.action-sprite'

export function loadActionProject(name: string, poses?: SpriteDef['poses']) {
  return loadWorldSpriteProject(name, [
    {
      asset: ACTION_ASSET,
      label: '动作源帧',
      frameCount: 4,
      definitions: [{ id: ACTION_SPRITE, label: '动作精灵', layout: { kind: 'static' }, poses }],
    },
  ])
}

export async function mountActionWorkspace(
  suite: ReturnType<typeof setupWorldSpriteLibrarySuite>,
  name: string,
  poses?: SpriteDef['poses'],
  bindings?: NonNullable<Parameters<typeof suite.mount>[1]>['bindings'],
) {
  const project = await loadActionProject(name, poses)
  const library = await suite.mount(project, { focus: ACTION_SPRITE, bindings })
  await waitMeta(library.host, 4, 1)
  return library
}

export function actionPoses(library: MountedWorldSpriteLibrary): SpriteDef['poses'] {
  return library.session.getState().sprites.find((entry) => entry.id === ACTION_SPRITE)?.poses
}

export function actionDialog(library: MountedWorldSpriteLibrary): HTMLDialogElement {
  const dialog = library.host.querySelector<HTMLDialogElement>('dialog.sprite-action-dialog[open]')
  if (!dialog) throw new Error('预制动作编辑对话框未打开')
  return dialog
}

export async function openActionEditor(
  library: MountedWorldSpriteLibrary,
): Promise<HTMLDialogElement> {
  const poseCount = Object.keys(actionPoses(library) ?? {}).length
  await clickButtonByText(library.host, `编辑预制动作（${poseCount}）`)
  return waitForActionDialog(library)
}

export async function waitForActionDialog(
  library: MountedWorldSpriteLibrary,
): Promise<HTMLDialogElement> {
  // DsDialog focuses its first field on the frame after opening.
  await act(async () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
  return actionDialog(library)
}
