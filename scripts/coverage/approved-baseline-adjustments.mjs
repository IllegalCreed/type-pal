import { createHash } from 'node:crypto'
import { aggregateMetrics, normalizeMetrics } from './metrics.mjs'

// User-authorized structural recounts, pinned to complete old baseline and current
// source bytes. These are finite migrations, never a percentage tolerance or flag.
const approvedAdjustments = [
  // User-authorized finite structural recount; only the exact baseline and17source/test bytes.
  {
    id: 'pre94-renderer-shared-primitives-20261021',
    authority:
      '用户2026-10-20：合理重构造成覆盖率下降可精确调整baseline，不恢复死代码或堆弱测试；本项仅同体opaque/颜色共享与测试专用包装退役。',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-recount.json',
    baselineSha256: 'd7817bb742c761a31bd029a88fbd1d6edf1405fbd6cbde10bcec3bcc24b2bbdf',
    sources: [
      {
        path: 'packages/game/src/core/menu/inventory-menu.ts',
        sha256: '4ed0e50d54faf012079cf9d6d2ee01357698d07f9e3ba5d8f324b84e3bf28f2b',
      },
      {
        path: 'packages/game/src/core/menu/menu-colors.ts',
        sha256: '43be7381df1880e54fba0430e9f5a18ae27dfeadb9156d99c60be740d4a18a6b',
      },
      {
        path: 'packages/game/src/present/__tests__/grok-present/p04-shop.test.ts',
        sha256: '0899e5c48cc0c4bc634522bec7d8819a01c495657b527ef74e11f2c34c251ef2',
      },
      {
        path: 'packages/game/src/present/blit-indexed-sprite.ts',
        sha256: '28b22d87ba93cac1b09b8c2b909b65fed9ca075d3e079f7fab3a1919170f4c8f',
      },
      {
        path: 'packages/game/src/present/draw-tilemap-pixels.grok-r1.test.ts',
        sha256: '77d84c6b6a974bcb50631dcd3d59e18e3153d901016d5e0ea868fdac9bc82487',
      },
      {
        path: 'packages/game/src/present/draw-tilemap.test.ts',
        sha256: '6d05455949e1f87ce1208236cd4fd1e1e98a8a27772246ba022cfc4a8813c794',
      },
      {
        path: 'packages/game/src/present/draw-tilemap.ts',
        sha256: '8ad57e0042e6d6797303bb863f8696312ea72e813da94e04d4a1829470272b1e',
      },
      {
        path: 'packages/game/src/present/menu/draw-equip.ts',
        sha256: 'a9283b6cc0b09e47352eb945f2c801af65dbb57dbdce2e203c745cb128e42d51',
      },
      {
        path: 'packages/game/src/present/menu/draw-inventory.ts',
        sha256: '4621e385b2cc67a8b9f7aaa29af8b095d4de87f38ff149a7cfbdb81d5d37e5b4',
      },
      {
        path: 'packages/game/src/present/menu/draw-menu.test.ts',
        sha256: '6fa7aaf7e88c7df5110d9962c014365a566ce89f582b674bb5583853910d57f9',
      },
      {
        path: 'packages/game/src/present/menu/draw-menu.ts',
        sha256: 'c19da1b18b398bf807cdac556450b89cae52ed678cf5ce144432c44a8965a0e3',
      },
      {
        path: 'packages/game/src/present/menu/draw-opening-menu.glm-phase1-leaves.test.ts',
        sha256: '315d86f360b02b3f62ae7debc1f5f0f649715b7c8596888a6778a4b39c52c2a7',
      },
      {
        path: 'packages/game/src/present/menu/draw-opening-menu.test.ts',
        sha256: 'e95f8638f167900a8600086c126d1a770d04624793459cc37bbd69795e27dd36',
      },
      {
        path: 'packages/game/src/present/menu/draw-opening-menu.ts',
        sha256: '28265833b5bfdf3a79354022de5e05637b0ab59ce8b9bfdf13b5cd82e3418549',
      },
      {
        path: 'packages/game/src/present/menu/draw-shop.glm-phase1-leaves.test.ts',
        sha256: '6d8a21ba658297d226af7274718fffaead3e871d34b848f7fdea4cb9f23089f2',
      },
      {
        path: 'packages/game/src/present/menu/draw-shop.ts',
        sha256: '820163557b1a99147dcf05d18618eb92964b9d1f93569c731dfc02e5f0bb2cf8',
      },
      {
        path: 'packages/game/src/present/menu/shop-preview-pixels.grok-r1.test.ts',
        sha256: 'e89506fc4ecabbd79ed878342cbc9f74ce37dcd4d5ea32a9c88be24eb1f7cf90',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 14349,
            total: 16085,
          },
          branches: {
            covered: 9338,
            total: 11632,
          },
          functions: {
            covered: 1679,
            total: 1968,
          },
          lines: {
            covered: 12795,
            total: 14096,
          },
        },
        after: {
          statements: {
            covered: 14315,
            total: 16051,
          },
          branches: {
            covered: 9336,
            total: 11628,
          },
          functions: {
            covered: 1672,
            total: 1961,
          },
          lines: {
            covered: 12766,
            total: 14067,
          },
        },
      },
    },
  },
  {
    id: 'pre94-menu-valid-dialog-fixture-20261020',
    authority:
      '用户授权合理代码/测试质量整改造成覆盖率变化可精确调整baseline，不恢复死代码或堆弱测试。Codex冻结旧测试全包复现原floor，LCOV仅旧非法对话夹具引起的越界/旧fallback计数减少。',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-gate-diagnostics.json',
    baselineSha256: 'eb186a03856b7d7b4788dc3de8750b119ef816054149063c91cc451e570971b9',
    sources: [
      {
        path: 'packages/game/src/core/event-system.glm-event-control-flow.test.ts',
        sha256: 'e78448b39b02a39b29c1f83d4140a0692c0b7f566a85dd94d0f3be8667e9bb6d',
      },
      {
        path: 'packages/game/src/core/event-system.glm-event-k06.test.ts',
        sha256: '3149fd807f9b2360cb14890b6ff4cfbdc97630c2ff98c7dfd1f353b50b3f1618',
      },
      {
        path: 'packages/game/src/core/event-system.glm-event-state-opcodes.test.ts',
        sha256: '0326438d65bb1e1b799c90f6ff860930c9edd8aecb99ca675768129777c12371',
      },
      {
        path: 'packages/game/src/core/event-system.ts',
        sha256: '4bdfc8e1fa9347d6bcb3531dbd74a01e700ce517b77fe76ddedcafc3d55e04dc',
      },
      {
        path: 'packages/game/src/core/menu/__tests__/inventory-menu.test.ts',
        sha256: 'f00b0aa6ef3451448e6e53c11c14b814323c9d6e44e81af69c186c1829d38bbb',
      },
      {
        path: 'packages/game/src/core/menu/__tests__/item-magic-select.test.ts',
        sha256: 'ea9a22b9f58621ad3ac06ed0cd2a394292e1f29dbd086127daef819970ca89d6',
      },
      {
        path: 'packages/game/src/core/menu/__tests__/magic-cost-fixture.ts',
        sha256: '7fd3bf1ac0c7203c62dc66d316c6da092d2e0dce2a51e1468e76aedef82dd109',
      },
      {
        path: 'packages/game/src/core/menu/equip-menu.ts',
        sha256: '4772de391847ad8f1adc86029a4f6479b2874d97d09cd9bcdc418733642289f1',
      },
      {
        path: 'packages/game/src/core/menu/in-game-magic-menu.boundaries.test.ts',
        sha256: 'be6d3c92e120609fa7f78413d9acc2560e2a20f2d1935de27ff703d72954e219',
      },
      {
        path: 'packages/game/src/core/menu/in-game-magic-menu.glm-phase1-leaves.test.ts',
        sha256: '927a9fc1ee6696b4d632a7932b04847c72dd74d13df6788274b61a4b44da2abe',
      },
      {
        path: 'packages/game/src/core/menu/in-game-magic-menu.test.ts',
        sha256: '2448a923a06960f0461c4a0c3a65edbba38e0f40b063268dd819be7cf9492188',
      },
      {
        path: 'packages/game/src/core/menu/in-game-magic-menu.ts',
        sha256: '33ef8d4a1e71537533ebb38b799642f903b23c6f50ba53ae7ae30059d61ab14f',
      },
      {
        path: 'packages/game/src/core/menu/in-game-menu.boundaries.test.ts',
        sha256: 'af352cee89772ea59adf77c0b127250d837f9e84faf6751435a60bd313f1497e',
      },
      {
        path: 'packages/game/src/core/menu/in-game-menu.glm-phase1-leaves.test.ts',
        sha256: '3b2cfe9179561746f790cb72a67cfa33762b19c8d2565c5ee26d14ae20eb5a55',
      },
      {
        path: 'packages/game/src/core/menu/in-game-menu.ts',
        sha256: '0252edd4a38dff6612decf42ef4d61d36fa689c0aa5471ab41b36be3115bc480',
      },
      {
        path: 'packages/game/src/core/menu/inventory-action-menu.ts',
        sha256: 'f809ecede6a78cb803df3b23615fd7eaa2b910d76b9b16e756d2ed26064831fd',
      },
      {
        path: 'packages/game/src/core/menu/magic-select.boundaries.test.ts',
        sha256: '01c9290e0f87266e70e33bc91336ba96031d0a73275ca064b13358d99fea7484',
      },
      {
        path: 'packages/game/src/core/menu/magic-select.glm-phase1-leaves.test.ts',
        sha256: '7426d25723fe5e8b006ffcd1d04c900e8cc0bb51da80c86bb07865f3b3c9521d',
      },
      {
        path: 'packages/game/src/core/menu/magic-select.ts',
        sha256: '60898f2b0a25d9aabf965cb247d2f7d00defad9f3450967259ea7ace0efe6fbb',
      },
      {
        path: 'packages/game/src/core/menu/menu-mode.ts',
        sha256: 'bb7a60e8d2f1660b96502b0361f996e84dca32ecadbb24326bab8e78af4d3d94',
      },
      {
        path: 'packages/game/src/core/menu/menu-stack.ts',
        sha256: '7f18301a0ada526074c619586001fb40c3e28e52ea3377eef099d276a6e55c46',
      },
      {
        path: 'packages/game/src/core/menu/shop-menu.test.ts',
        sha256: '3a05fc9e29925a77e57e0ef21f11a166505f1e5f2406f6bcaae055312d4e073c',
      },
      {
        path: 'packages/game/src/core/mode.test.ts',
        sha256: '47a5301a3250c4c8e231605b967f5e09e929fa36a95575652ee5f5f20feec62f',
      },
      {
        path: 'packages/game/src/core/mode.ts',
        sha256: '4025164dd238bc88588cef534255dca71d22c187dadde80f4b39756e5a974328',
      },
      {
        path: 'packages/game/src/core/scene-system.test.ts',
        sha256: 'f96ec2fe2c09eed0bbf5cbb8300dbcf5f224fa0315876f7ea359c1bfce534eb2',
      },
      {
        path: 'packages/game/src/present/dialog-box.ts',
        sha256: 'd326e5b04d37a4c92a31166307e551dab6c5d61dfbf790ad61b9494e8d993eec',
      },
      {
        path: 'packages/game/src/shell/avi-player.glm-next-wave.test.ts',
        sha256: 'e281ff32cbba090e93c2d1cf28376c7700d9c0812096ed6c7265d7a30a2935a5',
      },
      {
        path: 'packages/game/src/shell/avi-player.test.ts',
        sha256: '3e7e858605aa0828ac442a31d145ab9864aec8d7bc01651653dacd82297c46f5',
      },
      {
        path: 'packages/game/src/shell/rng-window.grok-r1.test.ts',
        sha256: '36a751339800f6efa684ea351916e2c39b1b3c7825edb73bf1585efdff527dbd',
      },
      {
        path: 'packages/game/vitest.config.ts',
        sha256: 'eebb89f531c5ae56b8b3e2b0971605f22d4739feba33f8008b5178fff0897d43',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: '7968e44488786d6c7f30c383082b4a8830803f1423820c834601b18818cc21f0',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: '9845f41bf51e01b1ec809c7515305ec2534aff59b9e7c3c7557db1c68bdcca35',
      },
    ],
    packages: {
      game: {
        before: {
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
        after: {
          statements: {
            covered: 14346,
            total: 16083,
          },
          branches: {
            covered: 9333,
            total: 11634,
          },
          functions: {
            covered: 1677,
            total: 1966,
          },
          lines: {
            covered: 12795,
            total: 14097,
          },
        },
      },
    },
  },
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
