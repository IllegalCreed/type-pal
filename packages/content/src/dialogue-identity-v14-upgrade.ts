import type { LegacyManifestV13, ManifestV14 } from './character.js'
import type { EnemyDef } from './enemy.js'
import type { EnemyDefV14 } from './enemy-v14.js'
import type { ItemDataV5 } from './item-v5.js'
import type { ItemDataV14 } from './item-v14.js'
import type { SceneDefV13 } from './scene-v13.js'
import type { SceneDefV14 } from './scene-v14.js'
import type { SharedScriptLibraryV13 } from './script-v13.js'
import {
  type SharedScriptLibraryV14,
  upgradeDialogueTreeV13ToV14WithCount,
} from './script-v14.js'

export interface DialogueIdentityV14UpgradeSummary {
  scenes: number
  items: number
  sharedScripts: number
  enemies: number
  total: number
}

export interface DialogueIdentityProjectV13 {
  scenes: readonly SceneDefV13[]
  items: readonly ItemDataV5[]
  sharedScripts: SharedScriptLibraryV13
  enemies: readonly EnemyDef[]
}

export interface DialogueIdentityProjectV14 {
  scenes: SceneDefV14[]
  items: ItemDataV14[]
  sharedScripts: SharedScriptLibraryV14
  enemies: EnemyDefV14[]
}

/**
 * G1：四个表域分别计数，再由同一递归 walker 穿透 enemy ai.hooks/state body、onDefeated、
 * choreography 及所有 command arms；任何重复升级半状态都会在写盘前失败。
 */
export function upgradeDialogueIdentityProjectV13ToV14(
  input: DialogueIdentityProjectV13,
): { project: DialogueIdentityProjectV14; summary: DialogueIdentityV14UpgradeSummary } {
  const scenes = upgradeDialogueTreeV13ToV14WithCount(input.scenes)
  const items = upgradeDialogueTreeV13ToV14WithCount(input.items)
  const sharedScripts = upgradeDialogueTreeV13ToV14WithCount(input.sharedScripts)
  const enemies = upgradeDialogueTreeV13ToV14WithCount(input.enemies)
  const summary = {
    scenes: scenes.upgradedCues,
    items: items.upgradedCues,
    sharedScripts: sharedScripts.upgradedCues,
    enemies: enemies.upgradedCues,
    total:
      scenes.upgradedCues +
      items.upgradedCues +
      sharedScripts.upgradedCues +
      enemies.upgradedCues,
  }
  return {
    project: {
      scenes: scenes.value as SceneDefV14[],
      items: items.value as ItemDataV14[],
      sharedScripts: sharedScripts.value,
      enemies: enemies.value as EnemyDefV14[],
    },
    summary,
  }
}

export function upgradeManifestV13ToV14(value: unknown): ManifestV14 {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('manifest: 期望对象')
  const manifest = value as Partial<LegacyManifestV13>
  if (manifest.contentVersion !== 13)
    throw new Error(`manifest: 期望 contentVersion 13，收到 ${String(manifest.contentVersion)}`)
  if (manifest.minimumSaveVersion !== 8)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion 13 期望 8，收到 ${String(manifest.minimumSaveVersion)}`,
    )
  return {
    ...(JSON.parse(JSON.stringify(value)) as LegacyManifestV13),
    contentVersion: 14,
    minimumSaveVersion: 8,
  }
}
