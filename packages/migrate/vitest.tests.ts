export const ALL_MIGRATE_TESTS = ['src/**/*.test.ts'] as const

export const PAL_SHARED_TESTS = [
  'src/experimental/script-v5/c8-item-use-augmentation.test.ts',
  'src/experimental/script-v5/legacy-enemy-script-v9-authority.pal.test.ts',
  'src/experimental/script-v5/p2-shadow.pal.test.ts',
  'src/experimental/script-v5/p3-shadow.pal.test.ts',
  'src/experimental/script-v5/p4-shadow.pal.test.ts',
  'src/experimental/script-v5/p5-shadow.pal.test.ts',
  'src/experimental/script-v5/p6-shadow.pal.test.ts',
  'src/experimental/script-v5/r13-cadence-mg2.pal.test.ts',
  'src/experimental/script-v5/r13-cross-activation-mg2.pal.test.ts',
  'src/experimental/script-v5/r13-confirm-control-flow.pal.test.ts',
  'src/experimental/script-v5/r13-confirm-mg2.pal.test.ts',
  'src/experimental/script-v5/r13-enemy-audits.pal.test.ts',
  'src/experimental/script-v5/r13-enemy-source-disposition.pal.test.ts',
  'src/experimental/script-v5/r13-item-throw-augmentation.pal.test.ts',
  'src/experimental/script-v5/r13-item-throw-mg2.pal.test.ts',
  'src/experimental/script-v5/r13-source-semantics-mg2.pal.test.ts',
  'src/experimental/script-v5/source-instruction-disposition.pal.test.ts',
] as const

export const PAL_FRESH_TESTS = [
  'src/pal-migration-integration.test.ts',
  'src/pal-sprite-action-census.pal.test.ts',
  'src/script-control-flow-audit.pal.test.ts',
] as const

export const PAL_HEAVY_TESTS = [...PAL_SHARED_TESTS, ...PAL_FRESH_TESTS] as const
