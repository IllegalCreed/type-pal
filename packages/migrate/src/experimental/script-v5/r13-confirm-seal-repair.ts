import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import {
  assertPalBaselineRepairCandidateCurrent,
  loadPalBaseline,
  type MigrationSnapshot,
  PAL_BASELINE_REL,
  serializeMigrationJson,
  sha256,
} from '../../migration-baseline.js'
import {
  commitMigrationTransaction,
  hasPendingMigrationTransaction,
} from '../../migration-transaction.js'
import type { MigrationJson } from '../../pal-migration.js'
import {
  R13_CONFIRM_SEAL_PATH,
  R13_CONFIRM_TRANSITION_ID,
  type R13ConfirmTransitionSealV1,
} from './r13-confirm-mg2.js'
import { stableJsonSha256 } from './stable-json.js'

export interface R13ConfirmSealRepairResult {
  path: typeof R13_CONFIRM_SEAL_PATH
  digest: string
  fileSha256: string
}

/**
 * 显式恢复“已发布 state 仍在、单个 untracked seal 正文被外部清理”的唯一白名单。
 *
 * expectedSeal 必须由同一 immutable source authority 当场重建；本函数只在 state 的 transition
 * digest 与 file SHA 双重匹配时，通过单项 baseline transaction 补正文，不改 `_state.json`。
 */
export function repairMissingR13ConfirmSeal(args: {
  repo: string
  baseline: MigrationSnapshot
  expectedSeal: R13ConfirmTransitionSealV1
}): R13ConfirmSealRepairResult {
  if (hasPendingMigrationTransaction(args.repo))
    throw new Error('R13 confirm seal 修复拒绝：存在待恢复迁移事务')
  assertPalBaselineRepairCandidateCurrent(args.repo, args.baseline, R13_CONFIRM_SEAL_PATH)
  const { digest, ...body } = args.expectedSeal
  if (stableJsonSha256(body) !== digest)
    throw new Error('R13 confirm seal 修复拒绝：authority seal 自摘要不符')
  const stateDigest = args.baseline.baselineMetadata?.transitions[R13_CONFIRM_TRANSITION_ID]
  if (stateDigest !== digest)
    throw new Error('R13 confirm seal 修复拒绝：transition digest 与 authority 不符')
  const content = serializeMigrationJson(
    args.expectedSeal as unknown as MigrationJson,
    R13_CONFIRM_SEAL_PATH,
  )
  const fileSha256 = sha256(content)
  if (args.baseline.hashes?.get(R13_CONFIRM_SEAL_PATH) !== fileSha256)
    throw new Error('R13 confirm seal 修复拒绝：file SHA 与 authority 不符')

  const statePath = `${PAL_BASELINE_REL}/_state.json`
  const stateBefore = readFileSync(`${args.repo}/${statePath}`, 'utf8')
  commitMigrationTransaction(args.repo, [
    {
      target: `${PAL_BASELINE_REL}/${R13_CONFIRM_SEAL_PATH}`,
      scope: 'baseline',
      content,
    },
  ])
  const stateAfter = readFileSync(`${args.repo}/${statePath}`, 'utf8')
  if (stateAfter !== stateBefore)
    throw new Error('R13 confirm seal 修复错误修改了 baseline _state.json')
  const repaired = loadPalBaseline(args.repo)
  if (!repaired) throw new Error('R13 confirm seal 修复后 baseline 缺失')
  if (!isDeepStrictEqual(repaired.files.get(R13_CONFIRM_SEAL_PATH), args.expectedSeal))
    throw new Error('R13 confirm seal 修复后正文与 authority 不符')
  return {
    path: R13_CONFIRM_SEAL_PATH,
    digest,
    fileSha256,
  }
}
