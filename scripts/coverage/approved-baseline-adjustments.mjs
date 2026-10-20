import { createHash } from 'node:crypto'
import { aggregateMetrics, normalizeMetrics } from './metrics.mjs'

// User-authorized structural recounts, pinned to complete old baseline and current
// source bytes. These are finite migrations, never a percentage tolerance or flag.
const approvedAdjustments = [
  // Current five-card exact recount. Reviewed source/test delta and native old floor retained.
  {
    id: 'pre94-five-card-game-recount-20261020',
    authority:
      '用户已授权合理结构/测试质量整改造成比例变化可调整baseline，不恢复死代码或堆弱测试；2026-10-20明确完成53/79/80/81/90必要返工。Codex按原件/合同映射裁定本次精确game计数。',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json',
    baselineSha256: 'b8adadb70945ecb0be91f83f1b70c5a00c3a488d286c808aecfde75e4ac4477d',
    sources: [
      {
        path: 'packages/game/src/core/battle/actions/item-poison-boundary.test.ts',
        sha256: 'd7cee8005fa0fce17cad4aecb38e23d2b2e5d705f1b94a44796c108633cb1755',
      },
      {
        path: 'packages/game/src/core/battle/battle-opcodes.ts',
        sha256: 'b50112e57b47b92cf629560d43e4fc44886958afde9886730100de5599797b86',
      },
      {
        path: 'packages/game/src/core/battle/battle-system.ts',
        sha256: 'a3fed8fc2206af344a9eef7836bfa9ac3e3dd5f9187e92e2cb84d760518dccb5',
      },
      {
        path: 'packages/game/src/core/inspect/battle-inspect.test.ts',
        sha256: '4ea35bf6d7faad7c189760cbdaacadf34ba542503785ada3f9728a7df4134842',
      },
      {
        path: 'packages/game/src/core/menu/magic-script.glm-next-wave.test.ts',
        sha256: '70b257f07528c82723c1aab2bc3491e1aeaf0181bf9fddb282a386382473c059',
      },
      {
        path: 'packages/game/src/core/menu/magic-script.test.ts',
        sha256: 'e9128ddd85480e1230c2bde6b7eb809d1a28116d4b67266451a0d9afe1a4d796',
      },
      {
        path: 'packages/game/src/core/menu/magic-script.ts',
        sha256: '7607a00b0f4eb06a11ab1292795e7957c975c1a8e9135117349bf77caeec3979',
      },
      {
        path: 'packages/game/src/core/player-poison-state.ts',
        sha256: '98a08d77f9a738a7f5945278624e87033569f927914d6ddbd0e3194d980a5ad8',
      },
      {
        path: 'packages/game/src/dev/dev-panel-party-lifecycle.test.ts',
        sha256: '16344f4a175edd588d998ce20be1a4e2307930f421b819593650809e997e59dd',
      },
      {
        path: 'packages/game/src/dev/dev-panel-picker-lifecycle.test.ts',
        sha256: 'f09432cb5f7e93ddd4f9b79f9897fb45fb892fc998887ec68539eaf7b334330f',
      },
      {
        path: 'packages/game/src/dev/dev-panel.glm-next-wave.test.ts',
        sha256: 'ba9b3b17067c32305fc1f1dec50e7fc26bb6f2011da56a6171c9987f020f9c9f',
      },
      {
        path: 'packages/game/src/dev/dev-panel.test.ts',
        sha256: 'ad7cdc33e52173e681b22511f5f838258436ab4002b5b492ed8c485f83b2dd91',
      },
      {
        path: 'packages/game/src/dev/dev-panel.ts',
        sha256: 'd23f4cceda7b457573c00f64f4ca8c19ce96874e7323cabebc67ac127eaf91e0',
      },
      {
        path: 'packages/game/src/present/menu/draw-player-status.glm-phase1-leaves.test.ts',
        sha256: '2b62e7610e11be7bf435540e728d7d42ff95f546ff7f18dfa5bc952a14a8cc01',
      },
      {
        path: 'packages/game/src/present/menu/draw-player-status.test.ts',
        sha256: 'ef5974c4d5c5953832b43f5e8d32b452d07779509480f4993d819b4883d84211',
      },
      {
        path: 'packages/game/src/present/menu/status-vitals-pixels.grok-r1.test.ts',
        sha256: 'ce687bd8e9979db67da774d18de118250ef7be44519844bb4e39baee6428bd6c',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: '9845f41bf51e01b1ec809c7515305ec2534aff59b9e7c3c7557db1c68bdcca35',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: 'be7ccf13711c763c909061bc37ee7d5bf2938e93d94f24bd6a0b8a4661fdd2c3',
      },
      {
        path: 'packages/game/vitest.config.ts',
        sha256: 'eebb89f531c5ae56b8b3e2b0971605f22d4739feba33f8008b5178fff0897d43',
      },
      {
        path: 'data/raw/SSS.MKF',
        sha256: 'ce448a90c9797648eea315fe589b2bd434139ffc423bf0a5954dae6f4c8b4756',
      },
      {
        path: 'data/extracted/events/all.json',
        sha256: '3f54bc1aba2eb82653f71d7384260f6de4e3e5e1977ee48ffdbb31a27c409c8d',
      },
      {
        path: 'data/extracted/data/object-poisons.json',
        sha256: '9a16d16817405b7a2a368bc6f36e48935a78c7d10e95ed715dcf2fff231f6722',
      },
      {
        path: 'data/extracted/data/spells.json',
        sha256: 'dd31c1e269018b37ae9b07bad7294c685b491a83c4ae4ff2bab975834a1945bd',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 14365,
            total: 16090,
          },
          branches: {
            covered: 9355,
            total: 11643,
          },
          functions: {
            covered: 1677,
            total: 1966,
          },
          lines: {
            covered: 12813,
            total: 14103,
          },
        },
        after: {
          statements: {
            covered: 14359,
            total: 16083,
          },
          branches: {
            covered: 9336,
            total: 11634,
          },
          functions: {
            covered: 1677,
            total: 1966,
          },
          lines: {
            covered: 12807,
            total: 14097,
          },
        },
      },
    },
  },
  {
    id: 'glm-foundation-branch-20261020',
    authority:
      '用户2026-10-20：合理重构造成的覆盖率下降可以调整baseline；不得恢复死代码或堆弱测试。',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/gate-closeout.json',
    baselineSha256: '4e15beba8673f80876ab03238e59f7912ac90da80041e952047fe7d2c0f26a30',
    sources: [
      {
        path: 'packages/pal-extract/src/io/word.ts',
        sha256: 'dbcd851a23f10829f2f04ef7fd7ec427c0362ea3d0796714a7186da9f35323a6',
      },
      {
        path: 'packages/pal-extract/scripts/extract-videos.ts',
        sha256: '0c149a276bca4fe592142ddfeef06c2268c1642e03dcf05883f5292cbbc22218',
      },
      {
        path: 'packages/reforge/src/audio/bgm.ts',
        sha256: '23de6a662e77b50d58dfbf99c89f24159419b86996da038201cfcff15a784e35',
      },
    ],
    packages: {
      'pal-extract': {
        before: {
          statements: {
            covered: 1085,
            total: 1548,
          },
          branches: {
            covered: 475,
            total: 599,
          },
          functions: {
            covered: 113,
            total: 141,
          },
          lines: {
            covered: 959,
            total: 1369,
          },
        },
        after: {
          statements: {
            covered: 1082,
            total: 1546,
          },
          branches: {
            covered: 473,
            total: 597,
          },
          functions: {
            covered: 114,
            total: 142,
          },
          lines: {
            covered: 957,
            total: 1368,
          },
        },
      },
      reforge: {
        before: {
          statements: {
            covered: 16999,
            total: 18885,
          },
          branches: {
            covered: 10807,
            total: 13097,
          },
          functions: {
            covered: 2767,
            total: 3073,
          },
          lines: {
            covered: 15208,
            total: 16477,
          },
        },
        after: {
          statements: {
            covered: 16992,
            total: 18878,
          },
          branches: {
            covered: 10805,
            total: 13095,
          },
          functions: {
            covered: 2767,
            total: 3073,
          },
          lines: {
            covered: 15202,
            total: 16471,
          },
        },
      },
    },
  },
  {
    id: 'glm-foundation-protected-main-20261020',
    authority:
      '用户2026-10-20：合理重构造成的覆盖率下降可以调整baseline；不得恢复死代码或堆弱测试。',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/gate-closeout.json',
    baselineSha256: 'b96ee9b9c20766e5c45150a425118e69a7fc43b6cc90581874c01c69c67328eb',
    sources: [
      {
        path: 'packages/reforge/src/audio/bgm.ts',
        sha256: '23de6a662e77b50d58dfbf99c89f24159419b86996da038201cfcff15a784e35',
      },
    ],
    packages: {
      reforge: {
        before: {
          statements: {
            covered: 16999,
            total: 18885,
          },
          branches: {
            covered: 10807,
            total: 13097,
          },
          functions: {
            covered: 2767,
            total: 3073,
          },
          lines: {
            covered: 15208,
            total: 16477,
          },
        },
        after: {
          statements: {
            covered: 16992,
            total: 18878,
          },
          branches: {
            covered: 10805,
            total: 13095,
          },
          functions: {
            covered: 2767,
            total: 3073,
          },
          lines: {
            covered: 15202,
            total: 16471,
          },
        },
      },
    },
  },
]

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Rebase only an exact approved snapshot; ordinary ratcheting remains strict. */
export async function adjustApprovedBaseline(
  baseline,
  readSource,
  approvals = approvedAdjustments,
) {
  const approval = approvals.find(
    (entry) => entry.baselineSha256 === digest(JSON.stringify(baseline)),
  )
  if (!approval) return { baseline, applied: [] }
  for (const source of approval.sources) {
    if (digest(await readSource(source.path)) !== source.sha256)
      throw new Error(`覆盖率结构调整源码已变化，拒绝沿用授权: ${source.path}`)
  }
  const adjusted = structuredClone(baseline)
  for (const [id, change] of Object.entries(approval.packages)) {
    if (
      JSON.stringify(normalizeMetrics(baseline.packages[id]?.metrics)) !==
      JSON.stringify(normalizeMetrics(change.before))
    )
      throw new Error(`覆盖率结构调整旧计数不匹配: ${id}`)
    adjusted.packages[id].metrics = normalizeMetrics(change.after)
  }
  adjusted.total = aggregateMetrics(Object.values(adjusted.packages).map((item) => item.metrics))
  return { baseline: adjusted, applied: [approval.id] }
}
