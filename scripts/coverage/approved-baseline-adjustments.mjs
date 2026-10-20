import { createHash } from 'node:crypto'
import { aggregateMetrics, normalizeMetrics } from './metrics.mjs'

// User-authorized structural recounts, pinned to complete old baseline and current
// source bytes. These are finite migrations, never a percentage tolerance or flag.
const approvedAdjustments = [
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
