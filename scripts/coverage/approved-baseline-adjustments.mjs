import { createHash } from 'node:crypto'
import { aggregateMetrics, normalizeMetrics } from './metrics.mjs'

// User-authorized structural recounts, pinned to complete old baseline and current
// source bytes. These are finite migrations, never a percentage tolerance or flag.
const approvedAdjustments = [
  {
    id: 'responsibility-test-organization-20261031',
    authority:
      'User2026-10-29/31 authorizes responsibility-based restructuring, precise deduplication, approved migration/input repairs and justified exact baseline adjustments instead of restoring dead code or adding weak tests. One official20199-test collection:10 per-source metric deltas are fully attributed. Recount only game statements to15493/17150 and branch denominator12233->12248 while retaining old9927 covered floor; the actual10 covered-branch gain remains for ratcheting. New/shared fixtures and approved own-key guard add finite denominator; dead magic arguments remove two statements. Existing selection counts these fixture modules; no new exclusion. All other game floors and all six other package floors are unchanged, including migration whose ratio improves after authorized removals/guards. Eleven exact file-count snapshots primarily represent responsibility transfers, not blanket case retirement. First draft over-rebased improved migration floors and was correctly rejected before writing baseline; this revision narrows adjustment to the two necessary game floors. Runner/comparator/predicate/selection and zero-diagnostic rules unchanged.',
    evidence: 'docs/ops/evidence/QUALITY-PENDING-100-3/coverage-recount.json',
    baselineSha256: '1e33ba8339591862422fdb61a98918d97feff4befa9af9432bde06cc7fc5f44b',
    sources: [
      {
        path: 'packages/game/src/__tests__/asset-fetch-fixture.ts',
        sha256: 'ff84eca6c30fea07e3b00828b2c4be96716751e7509f1531eb88d9625d6e504a',
      },
      {
        path: 'packages/game/src/__tests__/asset-load-scenario.ts',
        sha256: '5f934ec14f37768b9418ed5a693084e644d279257b5abf99cbdad595424b259d',
      },
      {
        path: 'packages/game/src/__tests__/battle-fixture.test.ts',
        sha256: 'e43a978b2749005659947a28a5ab67af6c979f7efb9b0809a63e5f787de432e4',
      },
      {
        path: 'packages/game/src/__tests__/battle-fixture.ts',
        sha256: 'a206ad63f9f8f4302380b5996a5c2f96715e9b598e4b4a41b9501f40d446a32c',
      },
      {
        path: 'packages/game/src/__tests__/battle-records.ts',
        sha256: 'e06702ce034d7b7b7680b649d2c6d11d948acd6daa9aeac0ad20478c62afc575',
      },
      {
        path: 'packages/game/src/__tests__/coverage85-glm-game/harness.ts',
        sha256: 'f8bb20fe42370423e506b4ef9ad1aa634fe3ca6ac8f547f2b85e2170d8071e5c',
      },
      {
        path: 'packages/game/src/__tests__/menu-clock-fixture.ts',
        sha256: '3369307f1425eeb83b3af39613ecddb8142df5fbf552fb8253d4151e74fadce5',
      },
      {
        path: 'packages/game/src/__tests__/menu-text-fixture.ts',
        sha256: '97b96d85209f644ada8e23f7bdaa3afeb930bc732f3592115e24a6748b017250',
      },
      {
        path: 'packages/game/src/__tests__/png-atlas.ts',
        sha256: '33aae796cd3b4cbeea4430f6a43d91025f4939b5eff47466f9b752e72b42eef6',
      },
      {
        path: 'packages/game/src/__tests__/precache-client-host.ts',
        sha256: 'a361c21347341c0baa9fe41c4998875309bf49b933a0e7b63d1b7e48a2146dfa',
      },
      {
        path: 'packages/game/src/__tests__/precache-ui-host.ts',
        sha256: '0bdc991cdfd963230ab4b8c103517e1469e2919d58fa1e10eb1eebb6042b2104',
      },
      {
        path: 'packages/game/src/__tests__/rgba-png.ts',
        sha256: '2d560bc0abf7a40698e3aa532b54580492eab080abf60f389bfd8c00a65aa00a',
      },
      {
        path: 'packages/game/src/__tests__/scene-cache-fixtures.ts',
        sha256: '4314b401bb67f4848e4de804527741829c92b1abc1dfd336634c8a6e851fe37d',
      },
      {
        path: 'packages/game/src/__tests__/scripted-rng.test.ts',
        sha256: 'a15ac450c9fe45fee8357e6b29aca300878360b94ad92de9c8aeb44c6d745386',
      },
      {
        path: 'packages/game/src/__tests__/scripted-rng.ts',
        sha256: 'a6938391f6d3169d3c62ffb0e93b9b6877eb1d9ae483157a3393689d48c3eb47',
      },
      {
        path: 'packages/game/src/assets/dialog-assets.lifecycle.test.ts',
        sha256: 'c6dd984971c01194e4cc0b9b1e7faca9f78794e622cf36358493b53a4d9cf7f1',
      },
      {
        path: 'packages/game/src/assets/dialog-assets.loading.test.ts',
        sha256: '41de5d8dc74c3e6dbbf1db4c55dedfe8d246cfd7644efacb38d8b30d3e68ca46',
      },
      {
        path: 'packages/game/src/assets/fetch-palette.test.ts',
        sha256: '3776b8675b6e58baeb4290b3c9a21596930558bb1d04ce60c02e095e69d88213',
      },
      {
        path: 'packages/game/src/assets/load-all-ui-frame-identity.test.ts',
        sha256: 'd0623dc9fcaa0bde0fb905fcf4eca1b4016c745bc07ab887ae367ce128568312',
      },
      {
        path: 'packages/game/src/assets/load-all.assembly.test.ts',
        sha256: '558eeb2568ef04db749925bbbda58faed1f67598eacd2f19309ae22125d9dffa',
      },
      {
        path: 'packages/game/src/assets/load-all.boundaries.test.ts',
        sha256: '5cafb9da014b2bb4deccad3044651414255a56662c91836ddb5b45112fc6b287',
      },
      {
        path: 'packages/game/src/assets/load-all.optional-assets.test.ts',
        sha256: '6a0fd1f45afe5d870c0b75dac1f2830b0cd3c25cbd5c052fc7ea7f4ebf038b1c',
      },
      {
        path: 'packages/game/src/assets/png.test.ts',
        sha256: 'c72d07bebed3a482cf89bb82773b146821e12076758c61211fc6ad4fd448ae66',
      },
      {
        path: 'packages/game/src/assets/rle-decode.test.ts',
        sha256: '4af965a3d3ca5227a5d791a6e59b21bb9bbbaf0b7e560ad820ff2d35eed653e3',
      },
      {
        path: 'packages/game/src/assets/scene-cache.callbacks.test.ts',
        sha256: '18d62c017b96c59a369d06a92f69c7e8635fd009e16a05123bf9f61d2166e967',
      },
      {
        path: 'packages/game/src/assets/scene-cache.eviction.test.ts',
        sha256: '5ca1c46fb150689aec32a4a31e7441afc991da9244542adf6bbe0a4cde3ae511',
      },
      {
        path: 'packages/game/src/assets/scene-cache.lifecycle.test.ts',
        sha256: '881c955daef73112a380d627746532dd3127e0d3d4135922aa4ce40c656b8b9a',
      },
      {
        path: 'packages/game/src/assets/tileset-blob.fetch.test.ts',
        sha256: '2c0de4aea8617bb4beba8ac92600107dd947935d5e1d58777252dd3762a3b0ca',
      },
      {
        path: 'packages/game/src/assets/tileset-blob.frames.test.ts',
        sha256: '3631bf76b46d0d510532eadc71957476d9de947ae7a8a374c3b2309a648b4cff',
      },
      {
        path: 'packages/game/src/assets/tileset-blob.gzip.test.ts',
        sha256: '9a18af6808bd140734f9e2db3cbfeb76a52f5321f6818649e815f7ee8f812d55',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/attack-mate.test.ts',
        sha256: '41322fd42285e28b8c93825df11c4bacde847369fd3e068ee1f6555698552749',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/battle-levelup.test.ts',
        sha256: 'b0d7f5fd7565f21666b9e1e90c27b4d9a9ea9462fb15ab04bb69ccf33485612b',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/battle-opcodes.test.ts',
        sha256: 'cee51dbfdeb665e6378a5eb9b2682c4071bb288956af82403bece9ad64d3fb7d',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/battle-state.test.ts',
        sha256: '08f0cc3e0f581e2ec688a9386dd5dbd2c7cf7c8e813623f2369fd00c8f62c9fb',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/magic-damage.test.ts',
        sha256: 'a3e86e4dd730a83b3b5d6cae36197821ca8f194efb2a4f4ba353a446cdcfebf1',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/magic-numeric-assignment.test.ts',
        sha256: 'a31d48fe788c85adf524784d66d7f88c6ab7f092ffc2e738f18faaa734d890d1',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/magic-parity.test.ts',
        sha256: '9ed8c47fa6411daa70486c8818a26ed67256f133ce92a6bd6c71ba729442e9a6',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/object-script-progress.test.ts',
        sha256: '0ec25613899eec637e5a020c71975f718eb34cf71e8eb9552f1845abd71230c2',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/status.test.ts',
        sha256: '1ccb13259e04b0d5032534c29532fc893587c2563daa698f16e9e9b620037b15',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/turn-queue-parity.test.ts',
        sha256: 'fd934eefee0494c1ac5ecf1fe20f1d973ad069ebbc1d12c3bd19e938f19ec335',
      },
      {
        path: 'packages/game/src/core/battle/actions/attack-effects.test.ts',
        sha256: 'bd79409573b930e49980e75f835cc757060960c7b9b9c45ac0c32de2d35c3e48',
      },
      {
        path: 'packages/game/src/core/battle/actions/coop-magic.glm-next-wave.test.ts',
        sha256: '9a2313e98c10700b64789636262043fb79f48663434a988bc6fab4b705c78a78',
      },
      {
        path: 'packages/game/src/core/battle/actions/item-poison-boundary.test.ts',
        sha256: '9362e5a3a4a1ad9d89865276804722160712b6f2e6519a5999e00bd9b525120e',
      },
      {
        path: 'packages/game/src/core/battle/actions/magic.glm-next-wave.test.ts',
        sha256: '3506f3b620e4abe12287a68ddf459cd07e528b2d767dc820d1455ad3ef8a85a0',
      },
      {
        path: 'packages/game/src/core/battle/battle-dialog.script.test.ts',
        sha256: '71dc7b00e3a642f3d297858956046630e8f7b5affb27656b69e0b2e792f169e0',
      },
      {
        path: 'packages/game/src/core/battle/battle-lifecycle.test-fixtures.ts',
        sha256: 'c0e36172655ee59615290cd210a06956f26e0bae9e5f78691a7ca4e20da08a76',
      },
      {
        path: 'packages/game/src/core/battle/battle-opcodes.cov85.test.ts',
        sha256: '1973920570f28749d1e12bae5aef0288a6cef5c093f8056c3651c7bf458c2521',
      },
      {
        path: 'packages/game/src/core/battle/battle-opcodes.summon-slots.test.ts',
        sha256: '3ce311b32156a789862937827bdd9f2eba6ac0c180eb2c90bc55cbafc5175fa5',
      },
      {
        path: 'packages/game/src/core/battle/battle-progression.hidden-exp.test.ts',
        sha256: '1688e439a8f7fe465f6bfa8d86511d6b1911486a328e28d590b502f9a39fdc70',
      },
      {
        path: 'packages/game/src/core/battle/battle-settlement.screens.test.ts',
        sha256: '8980d4aaa57417f060ecaeb0c5f3d22dfab190b2d809213fd68c3baa286cd32c',
      },
      {
        path: 'packages/game/src/core/battle/battle-settlement.scripts.test.ts',
        sha256: '89061cc2ec89962aa9979a8a215ea66440d8c2684e9a9930e42ada2c94686456',
      },
      {
        path: 'packages/game/src/core/battle/battle-settlement.test-fixtures.ts',
        sha256: '659ac474aa8dccc3c2f130a86444e81de21b3163d5f579f06067d06d052a7fef',
      },
      {
        path: 'packages/game/src/core/battle/battle-system.cov85.test.ts',
        sha256: '2535058ab864e0f3ede02d384d9e01aecab9028793a51326e96a4f8277675b22',
      },
      {
        path: 'packages/game/src/core/battle/battle-system.script-boundaries.test.ts',
        sha256: '911c0b82ff995b9b6ee138da80a15733736f4faba3a716b10870830179c8ec8e',
      },
      {
        path: 'packages/game/src/core/cross-module-boundaries.test.ts',
        sha256: 'a9c102b84743f778f82a35e155b5eb2b787f4cdd8fb821238d8bea7a5a570622',
      },
      {
        path: 'packages/game/src/core/event-opcode-player.cov85.test.ts',
        sha256: 'c76b60c9e44575586fa313ae98fa018e27f33b0b7612734abbb19e431773a901',
      },
      {
        path: 'packages/game/src/core/event-opcode-player.state-transitions.test.ts',
        sha256: '5268d4622ea6771b29d458a7a2bbf854e75bf04e5366658a1e57203e3ad8459b',
      },
      {
        path: 'packages/game/src/core/event-opcode-player.test-fixtures.ts',
        sha256: '6555d6ce7f6737b3eac355ae211b9d6ffec5e77ee3fcaf18e3f4ca73e1af21ea',
      },
      {
        path: 'packages/game/src/core/event-opcodes.cov85.test.ts',
        sha256: '77921c7c660aa1fd4c1254ae798c99df2dbe74ac096230b1a533f1ce99da15f7',
      },
      {
        path: 'packages/game/src/core/event-system.glm-event-contracts.test.ts',
        sha256: '61798186460528146afd938f94df33c76baff7d7b7c082e602a6f4e9ec9cf083',
      },
      {
        path: 'packages/game/src/core/event-system.map-change.test.ts',
        sha256: '1d22c39edb1744da89e4da3e27b4cbcba3c1b48a8bc9c2a5901e049dc46681f6',
      },
      {
        path: 'packages/game/src/core/event-system.object-layer.test.ts',
        sha256: '15ba81c7fbca2b044e38d5f027d65fb7908f4a96734f80efe143a21eda7bdd6f',
      },
      {
        path: 'packages/game/src/core/game-state.sprites.test.ts',
        sha256: 'd329359ee35ebbe75fb090535b0a4f593d57b3b94f0c82a3b52273771aae8642',
      },
      {
        path: 'packages/game/src/core/game-state.test.ts',
        sha256: '873b1b3aa52836b1bf8c38fc8a8bff8d4a097f26155f3b9342a4bae3177830c3',
      },
      {
        path: 'packages/game/src/core/inspect/__tests__/readout-fixture.ts',
        sha256: 'b1e027a62f78138d89c78a7c456162f58d774565987e4c33f7734d7c97f25053',
      },
      {
        path: 'packages/game/src/core/inspect/battle-inspect.enemy.test.ts',
        sha256: '0bc10b83e7fb13d556cfa76e316adc557546f2da4e293291e45f8eb0f917196b',
      },
      {
        path: 'packages/game/src/core/inspect/battle-inspect.field.test.ts',
        sha256: '058d15e51438848047e740bdf9bb4373e4844de5711ab5abf7e7319b6576bcfc',
      },
      {
        path: 'packages/game/src/core/inspect/battle-inspect.ownership.test.ts',
        sha256: '8db8ddbc104b34668241ac879e84a5ffe940596b3a003f4fc53b167015f160e5',
      },
      {
        path: 'packages/game/src/core/inspect/battle-inspect.party.test.ts',
        sha256: 'f743ed696c5f776ae3a91c11286e01536e414eb78d282193dd689638567b5856',
      },
      {
        path: 'packages/game/src/core/menu/__tests__/inventory-fixture.ts',
        sha256: 'f15703ad4128d029d190bf7dbb21a5a63d70494af1e5f1f94789357baf85fd3c',
      },
      {
        path: 'packages/game/src/core/menu/__tests__/magic-menu-catalog.ts',
        sha256: '80262794f8523ccc6f514ad8d10c681adbbb6f2c6882b2326639a1739d4a2844',
      },
      {
        path: 'packages/game/src/core/menu/__tests__/magic-menu-scenario.ts',
        sha256: 'c6ec8ddfa0526096309bb57ffa200c4bc3596c630ea5456ea7ba4578832a29c4',
      },
      {
        path: 'packages/game/src/core/menu/__tests__/magic-script-fixture.ts',
        sha256: 'e7901de36b827f686720b667559a851493ea2b823fdc03a2ca64bb197595f17c',
      },
      {
        path: 'packages/game/src/core/menu/__tests__/trading-fixture.ts',
        sha256: '47715c76d7401d4105ec205391d4680b7c13ae0546497a79e15b2465b4f3c131',
      },
      {
        path: 'packages/game/src/core/menu/equip-menu.test.ts',
        sha256: 'ceff3573558f0f65a8d9749f6442bb810e42041f2b5a8d68f6dfe348c0c85237',
      },
      {
        path: 'packages/game/src/core/menu/equip-menu.ts',
        sha256: '78ab856edb7b1ed15f5c536d4d702580b14feb81b883bf7ec68ef918072bd5f5',
      },
      {
        path: 'packages/game/src/core/menu/in-game-magic-menu.casters.test.ts',
        sha256: '06a75045b96d3ce34df1f94ad7586fd6d7df46c4c5a4c29644d545d9ba4862ac',
      },
      {
        path: 'packages/game/src/core/menu/in-game-magic-menu.lifecycle.test.ts',
        sha256: '841bddd3aee6891ec3ae8e3f8ac98c7ce7814703ec4204a099738204de6fc4cb',
      },
      {
        path: 'packages/game/src/core/menu/in-game-magic-menu.navigation.test.ts',
        sha256: '68a4af79505df6029d16e4928aea6cf18039f6f24815320ab6f6b52698ae2ce7',
      },
      {
        path: 'packages/game/src/core/menu/in-game-magic-menu.requests.test.ts',
        sha256: '89de252cf61cc2b9c09d96e854d8158a53b46207a4c9717b12185b5c9ccce16f',
      },
      {
        path: 'packages/game/src/core/menu/in-game-magic-menu.ts',
        sha256: '5f5409e405f2121c6f02acf705df7480e96aedd733c0f8c95d734e2ed4514ad5',
      },
      {
        path: 'packages/game/src/core/menu/in-game-menu.test.ts',
        sha256: '72f81daadc1071b55cbe19839fc53839b56a796f6170bfecee2d37e2efd68e23',
      },
      {
        path: 'packages/game/src/core/menu/inventory-action-menu.test.ts',
        sha256: '8b6f76f95fe052eff989bdd17817d9019de69eb1d31749eb902162cf5ef5723f',
      },
      {
        path: 'packages/game/src/core/menu/inventory-menu.navigation.test.ts',
        sha256: '3d5725832bf8f40823a44ed23463d7bef10acd3d9ec522323ed89a7f0847530a',
      },
      {
        path: 'packages/game/src/core/menu/inventory-menu.rules.test.ts',
        sha256: '43947648a9bfb918acf921f4604c8925df0db4e0759b9d94c08e5b7d0b405c19',
      },
      {
        path: 'packages/game/src/core/menu/inventory-menu.target.test.ts',
        sha256: '8e4393e6cb7275daf3d138af11635a261dcce984ec78a5ed40ee59184ad77e34',
      },
      {
        path: 'packages/game/src/core/menu/inventory-menu.test.ts',
        sha256: 'c3e79347951efb08c9661d84f09abd6741709b5c9a0816abef09805032f32b70',
      },
      {
        path: 'packages/game/src/core/menu/inventory-menu.ts',
        sha256: '4001b9ec49c06c67a554ea5b3fa4e0260083d5eb34f2d453e176aa1b0b07fb1f',
      },
      {
        path: 'packages/game/src/core/menu/item-select.test.ts',
        sha256: '05b2037277fbfba8a74500ce0517c1b1e1fdb35c90c671288c9e61be4aaf756a',
      },
      {
        path: 'packages/game/src/core/menu/magic-script.control.test.ts',
        sha256: '1ac77893485d67518de8010f9ffd994ec0fdc02c65e34b0dc3d4f3f763bfb34a',
      },
      {
        path: 'packages/game/src/core/menu/magic-script.test.ts',
        sha256: '62cb16ed0f10305f9b809bb5970dd60b5e8d9ec6cc61cd5885dfe6bf03d6a570',
      },
      {
        path: 'packages/game/src/core/menu/magic-script.ts',
        sha256: 'af2cbcd4e13bb8315a7ce23f34af46a773015fda68c06391cd31de2c7eac8c4d',
      },
      {
        path: 'packages/game/src/core/menu/magic-script.vitals.test.ts',
        sha256: 'd1c5d179f13f64c4a18a9656a2569b1f4cebd2126a2c705aa8644a7d9b9933bd',
      },
      {
        path: 'packages/game/src/core/menu/magic-select.test.ts',
        sha256: '201c6849702a5acd436a9d45a930ccb23e9d89eac00a6f626a94e6794b5155bc',
      },
      {
        path: 'packages/game/src/core/menu/magic-select.ts',
        sha256: 'bdf4336d4858245ec71283d20d0524845b210d898dd5a1ce3f04343b7eb32545',
      },
      {
        path: 'packages/game/src/core/menu/menu-driver.cov85.test.ts',
        sha256: '1d245e33205ccef8f15c87b29a8d56b5549471e430f3eacff75254c18cad688d',
      },
      {
        path: 'packages/game/src/core/menu/menu-driver.test.ts',
        sha256: '81695c8dc3d1176e74407b81c141728ff68183c6353dee7c6284282baac14f76',
      },
      {
        path: 'packages/game/src/core/menu/menu-driver.ts',
        sha256: '9aa46527f424b15f03e2ca78b302885a70d4ee2b18462261c9a0cce03da3269c',
      },
      {
        path: 'packages/game/src/core/menu/opening-menu.test.ts',
        sha256: '08100f04c49888db72a5d1a42a60777c414c6c39251b9b5374a0bb9764aff439',
      },
      {
        path: 'packages/game/src/core/menu/primitives.test.ts',
        sha256: '73a0fb3e328aa7de7ead1e9f60f9fbad5b287b72b4d5fb71e32f3b06d17f1d9d',
      },
      {
        path: 'packages/game/src/core/menu/save-slot-menu.metadata.test.ts',
        sha256: '0de5883301f4a4fd6146b827d801721e244bb13ff22db939cb599be03e962351',
      },
      {
        path: 'packages/game/src/core/menu/save-slot-menu.test.ts',
        sha256: 'fff1072bc467edc6c95c089e00d640ed0ed123d80eadf3134ca1ca5ee49397be',
      },
      {
        path: 'packages/game/src/core/menu/sell-menu.test.ts',
        sha256: '2f3b5ed96152d81adabe94ce739a012b04f0e8d83fbd2f6a1bb9d83f485fe03e',
      },
      {
        path: 'packages/game/src/core/menu/sell-menu.ts',
        sha256: '3467c4dc6ab5608dd62f3fb8797529b7ddd38a8055a3cff4815832db379eee6f',
      },
      {
        path: 'packages/game/src/core/menu/shop-menu.flow.test.ts',
        sha256: '18c9d0e4c7565bf4873fbcebaee31c38a6415134c23df2167892f01ab9e7ea27',
      },
      {
        path: 'packages/game/src/core/menu/shop-menu.test.ts',
        sha256: '730b0a77877ea48c85093984f9e39df3696c43c1a91f5f018c43882e7e407bd7',
      },
      {
        path: 'packages/game/src/core/menu/shop-menu.ts',
        sha256: '76f0e8d3eee8e16915cd9871d882b25de8faf6f5d7d0e7039529ae2293ad4780',
      },
      {
        path: 'packages/game/src/core/object-script-progress.test.ts',
        sha256: 'ba1edf13a583eb43178ce01eec847cfc0bbacf869fb98e873541e3f9ebee207d',
      },
      {
        path: 'packages/game/src/core/scene-system.test.ts',
        sha256: '809da377c3b49295f718bd6b6bc72542710b158d08eb305464632dd94c7367c1',
      },
      {
        path: 'packages/game/src/dev/dev-panel-party-lifecycle.test.ts',
        sha256: '58aaae796a0ce6e078a55f946e54ed49294391bb9d5bb41a2e70549c70126bbf',
      },
      {
        path: 'packages/game/src/dev/dev-panel-picker-lifecycle.test.ts',
        sha256: '373d9e32a09ae2c1490389d017bd8282581344f3500f2f5f375e680504ef7cd2',
      },
      {
        path: 'packages/game/src/dev/dev-panel.hotkeys.test.ts',
        sha256: 'd619223cde59dba51609b7501546c4e882f04ff9fc330393a8fc9052e7e92724',
      },
      {
        path: 'packages/game/src/dev/dev-panel.pure.test.ts',
        sha256: 'ea76f484d117bc40a22e1e109ff51bab6ca40bda0056f09a8a8632a772899fa3',
      },
      {
        path: 'packages/game/src/localization/messages.test.ts',
        sha256: '50fbf49a3d9dce585f277b2694f64cc56a350d3a6486a74f883f57101b636139',
      },
      {
        path: 'packages/game/src/localization/presentation.test.ts',
        sha256: '0bb7c9fcaf9ebb25c0e3fe94a431993a8131fd0c7d31dd06e1d6ffc7426e488e',
      },
      {
        path: 'packages/game/src/present/__tests__/battle-render-fixtures.ts',
        sha256: 'f9aabbe8c147ac9fd2bb846c17dc1485c85839e306c0a8db7bd2b918e064403e',
      },
      {
        path: 'packages/game/src/present/__tests__/composition-colors.ts',
        sha256: '2c4c5f759531520fa7734d195f72dfc45114bab0e4dee6feb0da3a20146258bf',
      },
      {
        path: 'packages/game/src/present/__tests__/dialog-state-fixtures.ts',
        sha256: '884531244c2ef67f6df959c99a0eeee76d3c9814e9f4feee26763164d5e6beb2',
      },
      {
        path: 'packages/game/src/present/__tests__/glyph-fixtures.ts',
        sha256: '226f7b472f8c065034db07c1f308ba5b5cc03a5f6d31b6f624f9cef27b701e2f',
      },
      {
        path: 'packages/game/src/present/__tests__/magic-menu-fixtures.ts',
        sha256: 'b82d37d28172c62d4fa43517e7bfdc88a1e4ccc3d1ff88b968439d4c03b9d305',
      },
      {
        path: 'packages/game/src/present/__tests__/menu-state-fixtures.ts',
        sha256: '0ce7df25cce554b54c080659494116c76908a531dd289359a32f4323fbabce7f',
      },
      {
        path: 'packages/game/src/present/__tests__/menu-ui-fixtures.ts',
        sha256: '0a5af0e46bd20ebe7ca655b9b75e0d63e4b7cc5321928cf83a5acbdaa71cd331',
      },
      {
        path: 'packages/game/src/present/__tests__/raster-fixtures.ts',
        sha256: '982d0ab4a7a73bd1d432554562ff9f628d097098be32af9e9b059bd1dbb2d291',
      },
      {
        path: 'packages/game/src/present/__tests__/render-input-snapshots.test.ts',
        sha256: '1673f6ac5a94deefd6ac0647a8cd52b96ed0c96b1b0452440e5c028bb0d63660',
      },
      {
        path: 'packages/game/src/present/__tests__/render-input-snapshots.ts',
        sha256: 'f2faddfd6a3c6dcbefe752eff487e8fabd92035b62cf673bd6c81289d8dd17b6',
      },
      {
        path: 'packages/game/src/present/__tests__/scene-render-fixtures.ts',
        sha256: 'e86d3b4d1facc1574dd2ffed6f64ba53e341f154c6ce1b1185fea4d307ebdd0c',
      },
      {
        path: 'packages/game/src/present/__tests__/shop-state-fixtures.ts',
        sha256: '832708399773559f19c2b117cebb88e0a0713e1da0e8f278d156eb4d35e327ce',
      },
      {
        path: 'packages/game/src/present/__tests__/status-state-fixtures.ts',
        sha256: 'f76fe730e092d215c04e442daaee4c6af6f991590b21f446a854c71453dbaf51',
      },
      {
        path: 'packages/game/src/present/__tests__/uniform-glyphs.ts',
        sha256: 'c1074d184e865cbe788b5e459b9390e32148c8ba9b2747aa4340861a85c01f87',
      },
      {
        path: 'packages/game/src/present/__tests__/world-composition.test.ts',
        sha256: '2403813cb65f21fc64cef3d5de59727aef9c28c1a370e874ce27aa55cff6796d',
      },
      {
        path: 'packages/game/src/present/__tests__/world-effects.test.ts',
        sha256: 'a391ac3a7e3c611aaadfb831fdf240e5e4796a95c46569c5c15734b3457958e5',
      },
      {
        path: 'packages/game/src/present/__tests__/world-render-fixtures.ts',
        sha256: '66e124e01c1dcdbc69d944a3de8c99d146efa6b215f8720e4b304db994946fb2',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/battle-action-availability.test.ts',
        sha256: '9e030d5d81feb25b506de7e51619f6c2a0b0a167acff0cd2dc43f0d20636b44b',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/battle-effects-composition.test.ts',
        sha256: 'c4883a17243502d45307378bd39ad750fb66fdec115d8b5fde92598589d06cbb',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/battle-feedback-composition.test.ts',
        sha256: '3cb8b69703b6322d4b5533ea55c39888ab245bc9186e493c5487709c283670b4',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/battle-present-lifecycle.test.ts',
        sha256: '89a7ab1da27ab92cbe20ec86a6026567718d5356299041862cf9d7aef8e5a814',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/battle-sprite-frames.ts',
        sha256: '11bb25a21c6e402b2cccd1fdfd04635f35ad5ed88e04e7a2d24a57d22abc1086',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/battle-sprite-pose.test.ts',
        sha256: '92abdc508bd67bec32c606879e6fa06bc7c5bb9f4adea466c7d24f9ab0aeda87',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/battle-sprite-state.ts',
        sha256: '5c5b325d666a1906fa1a7f7ca0a3c8a4abfdac139e01cdb09b2e8a201bfea4b4',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/battle-ui-fixtures.ts',
        sha256: 'e4ec11c23da545df309f56937495e5dcb702c305dcf55f4344e6d29481ecb450',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/blit-battle-frame.test.ts',
        sha256: '42dc2c7d700275e320e797a7b832d7824880382e829ece2ad792635cae13d698',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-bg.test.ts',
        sha256: 'e7e251010a6f732c93c647c2626c09fed72761db63e341333582859f81415905',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-effect.test.ts',
        sha256: 'd6a1dc259c5fff5aa8ef4cc781c3546000b7543cb98b7edccd56ceacb643756d',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-num.test.ts',
        sha256: 'a935d197b21bad6227b62d846589dffd62cfeb96c14fcc8703ec1ed8de68d541',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-settlement.formula.test.ts',
        sha256: '1dbc094f09a1d3bae7567bfd050e78508b1b9c6c18ad92244f6ea316662d3e48',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-settlement.test.ts',
        sha256: 'bcb090f5377afe6d3ac1f90b0ff41da0b92a7ad111e665b1b8b589f573d78674',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-sprites.test.ts',
        sha256: '741c1edf76e98ca06147bb5039bd4cf4108f11110c3291afeee15bdabde75bf8',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-ui.menu-pixels.test.ts',
        sha256: 'a8ea5ff666e15731f6ea61e4e54e11e702455d503416ccbd0a411f4692d4ec91',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-ui.player-info.test.ts',
        sha256: '42ecbb9c956517689f118619312f55ee3161378d21077822782e5fa6f4a0bc6a',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-ui.selection-pixels.test.ts',
        sha256: 'da3ac95e7df40d13172386fc37cfa25b8c3cb06f851ad3854d8fbb5dd4de3146',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-ui.test.ts',
        sha256: 'd283ca82dfed5b42661360afa97af77fa10c04b5825758ecda0725ef4726196c',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/player-face-color.test.ts',
        sha256: '806250159f4aab363af117b86a3e22b72757d9d416894e76f4c3ff7ec866298b',
      },
      {
        path: 'packages/game/src/present/dialog-box.composition.test.ts',
        sha256: 'a390b96d710377ec4e10daace4ac4eb978e5f79f40afbd13dae5960b56efc273',
      },
      {
        path: 'packages/game/src/present/dialog-box.test.ts',
        sha256: 'a0d8da9139561d8f3d454ceb1ec565b8d6b4dfaaaaa57b53fc69205c955c9554',
      },
      {
        path: 'packages/game/src/present/dialog-draw.canvas.test.ts',
        sha256: '9fcd2ba9e076dcb66a6de861cbe2d7eb606a4d222f202869e918eb7bc3be9b6e',
      },
      {
        path: 'packages/game/src/present/dialog-draw.layout.test.ts',
        sha256: '22603ecedb9dc121574ee0ace4896420665257a5a5b9fde5cd5294b97b692c51',
      },
      {
        path: 'packages/game/src/present/dialog-draw.test.ts',
        sha256: '00797a15407accc52fd7754cf4480b8786ac07d87af082c444ca57fe728d9cc2',
      },
      {
        path: 'packages/game/src/present/dialog-text.test.ts',
        sha256: 'dfece6dd4342407182aba641e46703cf5ff85d07185d5cb77d473d396a060ac4',
      },
      {
        path: 'packages/game/src/present/dither-fade.test.ts',
        sha256: 'ff8a6b0269da5dede77ef3adbb935068b8e529ae9a09df62ccbee0140ac5f5fe',
      },
      {
        path: 'packages/game/src/present/draw-number-nonfinite.test.ts',
        sha256: '74b92e8f7ac50c325b4a72c1dde7bc55822025f98d1ebdc3697976f0131303d5',
      },
      {
        path: 'packages/game/src/present/draw-number.test.ts',
        sha256: '8bf78783295ffebe9a1545fb1dfb0b5582f6e1be8ee59a5a2bb26b244c49ceb9',
      },
      {
        path: 'packages/game/src/present/draw-sprite.test.ts',
        sha256: 'e8d1cb90d5b16e76dfd7018b73d522e3af44c1f1990cd6cb6a3d44e994c88c07',
      },
      {
        path: 'packages/game/src/present/draw-tilemap-seams.test.ts',
        sha256: 'ba1d40a35da50ca04d3f8c8a40d26301c4fda80a96d2ee3234f09de85b9d813f',
      },
      {
        path: 'packages/game/src/present/draw-tilemap.test.ts',
        sha256: '7e977efeb8fbbad90eab4e7f413619021690623b8e73a2438d4e8f59a4ae951d',
      },
      {
        path: 'packages/game/src/present/follower-pos.test.ts',
        sha256: '388aea8acd03a04d5e2afd4f2ad816b4087157e2fb811af7500e34467c9c9d20',
      },
      {
        path: 'packages/game/src/present/follower-render.test.ts',
        sha256: '623847d2ed93579bc3bc8351cf4be638fe1e6db288b04afae5a3c71759c8ea69',
      },
      {
        path: 'packages/game/src/present/font-layout.test.ts',
        sha256: '3a634ccf185cfa226f01fcff1abca663478628a89789b6665b2c6adcfb253ce4',
      },
      {
        path: 'packages/game/src/present/font-loading.test.ts',
        sha256: 'b827c3fb915b2c0b4021553b3b3d7afe621eedc53b9295e19574f9e856bc5a06',
      },
      {
        path: 'packages/game/src/present/font.test.ts',
        sha256: 'c882888716c896d59970011ecafa27981e3eb50b6e4d1d4f3fb223213a429dce',
      },
      {
        path: 'packages/game/src/present/framebuffer.test.ts',
        sha256: 'fbe0b6e8657502552fa58392b87b98dd181ec69e18c28d9acc43082aa6124026',
      },
      {
        path: 'packages/game/src/present/menu/draw-box.test.ts',
        sha256: '176df22835866bb25cc4e1112feceeac413ee271a0d2b47aa827836abb2c5714',
      },
      {
        path: 'packages/game/src/present/menu/draw-confirm.test.ts',
        sha256: '8038c25b2c934bd01446f28c594979cb58f380dc4428a1e2898b712fe190a88a',
      },
      {
        path: 'packages/game/src/present/menu/draw-equip.test.ts',
        sha256: '66b2493921c31ec8f573fab48e8bbb79198b33e0600ec2aa36c64540d31627d9',
      },
      {
        path: 'packages/game/src/present/menu/draw-inventory.canvas.test.ts',
        sha256: 'c5d0a89d695b8b9f0d19d743d28362f4dca33fe521d7e22774ba1b7f7059093e',
      },
      {
        path: 'packages/game/src/present/menu/draw-inventory.description.test.ts',
        sha256: 'eb05303036ef32ea64bc9cf8e68797554c03c562cc75bc80b15d202826b69077',
      },
      {
        path: 'packages/game/src/present/menu/draw-inventory.list.test.ts',
        sha256: 'd9571bd40f56eca154525b9f9e8ad25a92951570d4febd33d9f9af098ff9aa27',
      },
      {
        path: 'packages/game/src/present/menu/draw-inventory.target.test.ts',
        sha256: 'ae0087220b41ef4325f0abc258e12b626d9fe4b6eb423ecfc4b2a9e5f6c0be7e',
      },
      {
        path: 'packages/game/src/present/menu/draw-magic.caster.test.ts',
        sha256: '6cb37eeff6b52c6c88b77adb3a03318a700ca0ea47c2f897a42981a8d79eecac',
      },
      {
        path: 'packages/game/src/present/menu/draw-magic.target.test.ts',
        sha256: '6d2c8076ff39a1182013e0eb3f4f80cd4c4bb379d75d2729748b2068f9d8342b',
      },
      {
        path: 'packages/game/src/present/menu/draw-magic.test.ts',
        sha256: 'e74171706cb7f16c7e2c4b08ea1b89d7dcc36b2b9f12d0fe0439f7f7d947ba5c',
      },
      {
        path: 'packages/game/src/present/menu/draw-menu.test.ts',
        sha256: '71f17d4f0998f31cd97e778cf88015e4b1922a0f6f61e29a64bc9583c73ed381',
      },
      {
        path: 'packages/game/src/present/menu/draw-opening-menu.test.ts',
        sha256: 'a807b68eeb81f6b1d629e7541c7a11ed38b639e4cb9a051a55e5d6005e2738f2',
      },
      {
        path: 'packages/game/src/present/menu/draw-player-status.entry.test.ts',
        sha256: '753bedbe5961881972c9d1b6d9e002a586d7a4cf3ea906f34dd031faf244d753',
      },
      {
        path: 'packages/game/src/present/menu/draw-player-status.equipment.test.ts',
        sha256: 'aceeeedc2e891e1f5452bbefd0b4c0bb49fdf997dcc7019ad2ceb73e3d7d4fd0',
      },
      {
        path: 'packages/game/src/present/menu/draw-player-status.poison.test.ts',
        sha256: 'b07726e04f06be18fe06ecffb1e37c3933db6514a72d9c07632e71ecff94e854',
      },
      {
        path: 'packages/game/src/present/menu/draw-player-status.test.ts',
        sha256: '83b0f387908eeb37fe60cc81b55889ddc97e230e062661f118a106a4fdf2323a',
      },
      {
        path: 'packages/game/src/present/menu/draw-sell-overlay.test.ts',
        sha256: '26568be47b5885955803637e0c8fabd818ff9c268556f881bc285361af6f216c',
      },
      {
        path: 'packages/game/src/present/menu/draw-shop.canvas.test.ts',
        sha256: 'd50368ab288e9df24cd336ea104df9ffdb4d18858edf644ba8e3d3355435cb3a',
      },
      {
        path: 'packages/game/src/present/menu/draw-shop.test.ts',
        sha256: '5283c029b6c6efbaa3a16028b87423bfcd6b9883cd96affc758c19a4af59f08b',
      },
      {
        path: 'packages/game/src/present/menu/magic-player-info.integration.test.ts',
        sha256: '4ae7aaaadad816ccface7a829cfcbdcc5e140905be633056a943d1fe0727a465',
      },
      {
        path: 'packages/game/src/present/present.canvas.test.ts',
        sha256: 'ef57ff018a3ba5ef3a09e3d8c61358f63ebfcafe414f35578e65e8465487b7fd',
      },
      {
        path: 'packages/game/src/present/present.fade.test.ts',
        sha256: 'f92ccf22a349d8ac36823ebfe69351c77029ffad4bd3ace7d793e3d9a0896737',
      },
      {
        path: 'packages/game/src/present/present.palette.test.ts',
        sha256: 'fc043d8b292064ae108834586630558d0be02b71ceb0d7de8f2c43e9b3297302',
      },
      {
        path: 'packages/game/src/present/present.party.test.ts',
        sha256: 'b104be4b68bab9f863dae57acd21201a52a4a3853e6384e16ad1de7b8f79ce1c',
      },
      {
        path: 'packages/game/src/present/present.scene.test.ts',
        sha256: 'bf359126322bebccaa57e0feab2f9fc79631035e0bd3829cfef25fa0bc346f86',
      },
      {
        path: 'packages/game/src/present/present.test.ts',
        sha256: 'e7e130033bf84abe1c84818ff31f67367e78e8704c2dc3d735be58901bb9a7f3',
      },
      {
        path: 'packages/game/src/present/present.ts',
        sha256: '05d47d41a8933fcdd8eab65fc340d9098c202ae813d901a6038a0367bf371219',
      },
      {
        path: 'packages/game/src/present/screen-shake.test.ts',
        sha256: '3c47e505b1000040406a4bab92b7a654d7dd282d53125fe8b8bee3c3b0c18f77',
      },
      {
        path: 'packages/game/src/present/screen-wave.test.ts',
        sha256: '02dba6c726e3d175a8a23f69fccf42e53a867e433e889fa56f6c3d3fed4d816f',
      },
      {
        path: 'packages/game/src/shell/__tests__/boot-loading-host.ts',
        sha256: '7aa88d404bdb68d4eaa1e3b0af0e9dee6ac82f7d22fc6fdb35fbff0bd3e847c6',
      },
      {
        path: 'packages/game/src/shell/__tests__/bootstrap-resource-load.ts',
        sha256: '9848955fd1153585a8cbd80d774748930dad84a80c2cc00299ea1b1565a98f4e',
      },
      {
        path: 'packages/game/src/shell/__tests__/keyboard-events.ts',
        sha256: '114a40f161efc139dfa68e01626cea6757e82957c9ec218637ab23f4187cb12c',
      },
      {
        path: 'packages/game/src/shell/__tests__/loop-context.ts',
        sha256: 'd938d2189a345dcc89fb08602aea1b07b7a08da481d4d944f1543549fea481cd',
      },
      {
        path: 'packages/game/src/shell/__tests__/loop-tilemap.ts',
        sha256: '7fe5d2a42be69889c5c529536be29d7d135f02bd127ff45082b587ec17232689',
      },
      {
        path: 'packages/game/src/shell/__tests__/opening-playback.ts',
        sha256: 'ff6d9e4d4ea130ad81111a6deee29b2c6522bfcd4aac19bc9e468f378c31701d',
      },
      {
        path: 'packages/game/src/shell/__tests__/rng-frames.ts',
        sha256: '6a71ffb63e8daaf7f0981af21971316e8e326dd86bdd2e628f8968a47543501d',
      },
      {
        path: 'packages/game/src/shell/audio-midi.fallback.test.ts',
        sha256: '407f9ce86b35615e37e304722ac002dbcb4a38607d32876ac0fc41f61f1e81ea',
      },
      {
        path: 'packages/game/src/shell/avi-player.async-lifecycle.test.ts',
        sha256: 'b989a672bdbb6a7d21ac833efd606d6bc547ee0f87111ca477858c1f9438402a',
      },
      {
        path: 'packages/game/src/shell/avi-player.autoplay.test.ts',
        sha256: 'fad19ddecde24882668192f1e9fde0ba219da0a9864e5ee1a03a63e33e657b5d',
      },
      {
        path: 'packages/game/src/shell/avi-player.test.ts',
        sha256: '4933e3396ca51f24a51c46f544b82b7b779b719236f26dc31f6a57fc248b5056',
      },
      {
        path: 'packages/game/src/shell/avi-player.volume.test.ts',
        sha256: 'dcc3a745a5f0526c14f1b9fce34d56f8bc3400e7ed0191ead46453a2bca7b544',
      },
      {
        path: 'packages/game/src/shell/boot-loading.dom.test.ts',
        sha256: '55e0e7309ecfad8900c6f05d977faf407b8b567f8351bf17a9e5e4bb2c3aede2',
      },
      {
        path: 'packages/game/src/shell/boot-loading.test.ts',
        sha256: '82cb65c725151cea7430738c80a30106aa701aebb45b4803f62b9c550cc3eab2',
      },
      {
        path: 'packages/game/src/shell/bootstrap-resources.http.test.ts',
        sha256: '5b32efd82bf8a80475150893397aeb1aba5260580fee6bb539cce89fdfda8193',
      },
      {
        path: 'packages/game/src/shell/bootstrap-resources.test.ts',
        sha256: 'ef2fbd4bee9fe3224682f6b5f56525812194b03a65354eb36e10ea38a7df7f7e',
      },
      {
        path: 'packages/game/src/shell/bootstrap.error.test.ts',
        sha256: 'facec95b90f51609c99047b7ba6d106c1be58b6e44736dd337b7ce982ff9fef0',
      },
      {
        path: 'packages/game/src/shell/ending-player.palette.test.ts',
        sha256: '8fed69e6489bfe09f134298d13ba90a795ea8426b14613235ce698c72e2571c5',
      },
      {
        path: 'packages/game/src/shell/ending-player.test.ts',
        sha256: 'c8d8337275c7148c251a0a48f631902a5de671458002d924ac05d01b3fde96d2',
      },
      {
        path: 'packages/game/src/shell/ending-player.wait-key.test.ts',
        sha256: 'bd3ae660da6801e4dedabfccb10a8f5912a4b327634c85f9297bd18a2b3952f9',
      },
      {
        path: 'packages/game/src/shell/fbp-player.scroll.test.ts',
        sha256: 'b63d93f406235d2b73cc3fd30c3df82bb5458ad2632c04c49dc22d0f7703c0a4',
      },
      {
        path: 'packages/game/src/shell/fbp-player.test.ts',
        sha256: 'b5b979e6a0e665024311e805ef65e29f8398ad461dbd402897de0422ce9e3906',
      },
      {
        path: 'packages/game/src/shell/fetch-retry.test.ts',
        sha256: '9c19458e3e5618560e432c8b34ba770b9d3846edcc823210460fcb135184a156',
      },
      {
        path: 'packages/game/src/shell/input.keyboard.test.ts',
        sha256: 'fdcc27629aa01a9e027e590ac63242984344b1ec30a45183f3212151a799987a',
      },
      {
        path: 'packages/game/src/shell/input.keymap-ownership.test.ts',
        sha256: 'e0ff559bf1873b2edaa36ce8d0ea235ce6343707fde9979f7f76d8f1ee0f789e',
      },
      {
        path: 'packages/game/src/shell/input.keymap.test.ts',
        sha256: '3c485d94c03339146d5ae3cf9ae40520b343ccd57bbb7b7a24ba70f8f98ddb3a',
      },
      {
        path: 'packages/game/src/shell/input.record-replay.test.ts',
        sha256: 'dc648349cb04bbf02c53a8bf1a80fcf56e4c723655982193526a696285a3b5f9',
      },
      {
        path: 'packages/game/src/shell/input.ts',
        sha256: '55a394a61514d6a6c4b4bae97f0fb30a257f741a4dc9dbc55a8de3eb0678640f',
      },
      {
        path: 'packages/game/src/shell/main-loop.lifecycle.test.ts',
        sha256: 'f134d4649b34c04227a4bc9a673bc0768c5805a2ffa1247e0b499ed85a0e3957',
      },
      {
        path: 'packages/game/src/shell/main-loop.menu-input.test.ts',
        sha256: 'e56dba5c6c2b0481bc607639d3c1ec289d8bb3c866eca2a543267a70a8437bbd',
      },
      {
        path: 'packages/game/src/shell/main-loop.test.ts',
        sha256: 'c5b534e65e468eedc0d2d893dcb1bafc0cd4585ab03f614b41fd08839ab25124',
      },
      {
        path: 'packages/game/src/shell/precache-client.test.ts',
        sha256: 'b470cc3890ae5125ff153945c70a699d1fe34f834be678f67a3756a97ac5db7f',
      },
      {
        path: 'packages/game/src/shell/precache-ui.test.ts',
        sha256: '384ecaffdfaac8c3c754e92744cd7bd5c2836bf327b27ab215a64782ec85b96b',
      },
      {
        path: 'packages/game/src/shell/precache-widget.test.ts',
        sha256: 'b2dd57adabc086f9d5958d7f5b407d51c17881a391ad35c030a006dbe2818077',
      },
      {
        path: 'packages/game/src/shell/rng-player.cache.test.ts',
        sha256: '7af1bba562be83e057890f5bb4a219dbbf0113c984cb1bccab23f4187b2b1912',
      },
      {
        path: 'packages/game/src/shell/rng-player.effects.test.ts',
        sha256: '62bc61882a5ac0cce70201236883bfb384f12e56cff451fa6c7871aab635ff62',
      },
      {
        path: 'packages/game/src/shell/rng-player.test.ts',
        sha256: '4ce384cb78af94c10fcf14a85eca6b439929797bf39a018dd9d181d3581c10f1',
      },
      {
        path: 'packages/game/src/shell/shell-bootstrap.glm-shell.test.ts',
        sha256: '19fbd37f6288a3f1718992cbcf57c369150c8fecd9f1c6f856517c1d9a66502b',
      },
      {
        path: 'packages/game/src/shell/splash-fallback.test.ts',
        sha256: 'a4109d1642f53527589cafa34e755fa9e5ae25cbae4366e3af8077874eba03de',
      },
      {
        path: 'packages/game/src/shell/trademark-fallback.test.ts',
        sha256: '992ba49b77ecb483e75948f3640c40df8523273c2b3d99e86cf7291a57d3c4ff',
      },
      {
        path: 'packages/game/src/tools/display-scale.test.ts',
        sha256: '2f40fb5b81c14132019eddb28dd18927a9104fc9afd8e2764fc9e6234d7d00f6',
      },
      {
        path: 'packages/game/src/tools/fps-overlay.test.ts',
        sha256: 'b7aa396816301d072f587072514c9864fed4388706ec0b43ad1a5cbc29c360ab',
      },
      {
        path: 'packages/game/src/tools/minimap.canvas.test.ts',
        sha256: 'c091d54a40a49a66c54df11088792362e1d6074d2c6fed93f32b4995055e1b90',
      },
      {
        path: 'packages/game/src/tools/minimap.controller.test.ts',
        sha256: 'b7924a7cf5252ebe02e49f9911c9cc6e3a26fce49f9e604aee7e94061eca7f37',
      },
      {
        path: 'packages/game/src/tools/minimap.model.test.ts',
        sha256: '14eb9c53d666448200ba0b98b0a3c847245a3819d86a898238a8597ba4d045f8',
      },
      {
        path: 'packages/game/src/tools/speedrun/countdown.test.ts',
        sha256: '108ebd9ed11281016c19f816ef4ba9421be3e5af998305db3c47741786a78053',
      },
      {
        path: 'packages/game/src/tools/speedrun/detectors.test.ts',
        sha256: '6af58bd39ddc7cf2b735a0bec939358c572e9fb9d02b1a671af68a8ea28bbd49',
      },
      {
        path: 'packages/game/src/tools/speedrun/index.test.ts',
        sha256: '5518316a1a45d5b89b9c187fccf5a314ffaa0c432b15fd723c53e3a3a8ec3809',
      },
      {
        path: 'packages/game/src/tools/speedrun/overlay.test.ts',
        sha256: '47deea61ed573130d556b1a867e9ac605ae078929b49704cc772903f398470c9',
      },
      {
        path: 'packages/game/src/tools/speedrun/store.test.ts',
        sha256: '07ad4871244e529da6db6aa449d12a610b6458d6c3567b48fb6214a16bb5f839',
      },
      {
        path: 'packages/game/src/tools/speedrun/time-format.test.ts',
        sha256: 'd37e1c62f593763a2a826b32534c0d628189cd04e4bb0b0ec4bf2c099ecbee27',
      },
      {
        path: 'packages/game/src/tools/speedrun/timer.test.ts',
        sha256: '1854cd0fd9324e6455d4bdd9f9b592ad2b1d2982532ebf61d925eb0f3b7c6a1f',
      },
      {
        path: 'packages/game/src/tools/tools-panel.display.test.ts',
        sha256: '812df8dcd521299b7b819896953b4418323212f396184975e9f35b0b7ed6a9a6',
      },
      {
        path: 'packages/game/src/tools/tools-panel.test-fixtures.ts',
        sha256: '1f1787b6460e0f98ceb76b218a3e20383b75de3aab6d070ab3c8e0257dd3a9d2',
      },
      {
        path: 'packages/game/src/tools/tools-panel.test.ts',
        sha256: '77d01b92d316b928ae2fa07ee0d55bd4bb1aacfe121104f55b5b2358d59df09d',
      },
      {
        path: 'packages/migrate/src/__tests__/migration-journal-fixture.ts',
        sha256: 'dc62130fa41ac612c114e5511a41e716701867e25fe454fcff661d89bcd4c7e1',
      },
      {
        path: 'packages/migrate/src/__tests__/transaction-contracts.ts',
        sha256: '778a9d057f4591488ffb98b584488927db9ecec4478fbe945a19da5e9937cf40',
      },
      {
        path: 'packages/migrate/src/migration-baseline-paths.test.ts',
        sha256: '061edd595233552325a32e5c6f50a64378fe386751e7d4885bacc7f68a1552c3',
      },
      {
        path: 'packages/migrate/src/migration-baseline.io.test.ts',
        sha256: '20d834726a86d4c34bc6209826c8aa675323cfb61c5931ad7f263ac04f0a93f3',
      },
      {
        path: 'packages/migrate/src/migration-baseline.snapshot.test.ts',
        sha256: 'fca44fa165edf5ca259e28e33cb2955d71e692e1a8e0765b42a8990eb2cd8435',
      },
      {
        path: 'packages/migrate/src/migration-baseline.ts',
        sha256: 'f1071d957dd1a5054e129a191e684afabb4475a85f9cd3b5d442fc9771415ee0',
      },
      {
        path: 'packages/migrate/src/migration-control-paths.test.ts',
        sha256: '9336b20ef21b42edc543f30a07203377783e804e0735b8b9da963f2e6f05fc74',
      },
      {
        path: 'packages/migrate/src/migration-hash.ts',
        sha256: '1dec1945762492a6a9737ee02568f21ec826a4d417e800066762ec3a6481d222',
      },
      {
        path: 'packages/migrate/src/migration-merge.arrays.test.ts',
        sha256: 'f692c459502e642787bd218aa42b8ed7b6fd377a0ba0365b5388b60675430386',
      },
      {
        path: 'packages/migrate/src/migration-merge.content-records.test.ts',
        sha256: '628c4ee87b6f0405ee80bcbfe22579634128ba2bf5099b208f559c05d0db0373',
      },
      {
        path: 'packages/migrate/src/migration-merge.json.test.ts',
        sha256: '026c8b0d0b43fe285020651ce9960e9a3cabe2ef9576ba2dd070e8f2e368218d',
      },
      {
        path: 'packages/migrate/src/migration-merge.test.ts',
        sha256: 'bbc86b8ec0c78c3d681c9266141ef5ed5b009924de68be6b58f0c24f5b4bb2a0',
      },
      {
        path: 'packages/migrate/src/migration-merge.ts',
        sha256: '5522c4158773effdf14f265136ff91add2b8159559e8ce5c709e8abab64ec182',
      },
      {
        path: 'packages/migrate/src/migration-path.test.ts',
        sha256: 'b3bb47476968142ae1ce07325dad382d01856096e0815cea2d0e2dea148a931a',
      },
      {
        path: 'packages/migrate/src/migration-plan.files.test.ts',
        sha256: 'c243eeacba3532ddd06717b05d21fe51d3af0a5647501d3ba88c148f29e3c1f5',
      },
      {
        path: 'packages/migrate/src/migration-plan.maps.test.ts',
        sha256: '35a4ca7cfe5ebcff9cc0d73867c39d3802249327a45d1b4078e1d4104e4f33f2',
      },
      {
        path: 'packages/migrate/src/migration-plan.ts',
        sha256: '5c8a2dd8ad0f16c14c9aea866195ccbcbcf3f96175f4be20b465d4f38a5c0d43',
      },
      {
        path: 'packages/migrate/src/migration-project-io.discovery.test.ts',
        sha256: '96a306ebc0f88dc62ced88161e1b0162a6346fcc6297f19c7f718ccec26b1a88',
      },
      {
        path: 'packages/migrate/src/migration-project-io.snapshot.test.ts',
        sha256: '0aec6e3d3622cea59d6774db068f76a617d42f4c796fb62c7cd0273771737476',
      },
      {
        path: 'packages/migrate/src/migration-project-io.ts',
        sha256: '76ff36d1655b5b87d4581581d30a653621a79451a6e4047ebd081ce1d9d0a742',
      },
      {
        path: 'packages/migrate/src/migration-transaction-ownership.test.ts',
        sha256: '2e280069f6d84514e1c8ceb3fccef83cf6519c2e88214c97854eafcaffad7305',
      },
      {
        path: 'packages/migrate/src/migration-transaction.inputs.test.ts',
        sha256: 'afb6e0bedc078d64a6f74fdce3d59d40d2031fbf5ee2cfd958a769c059892c93',
      },
      {
        path: 'packages/migrate/src/migration-transaction.journal.test.ts',
        sha256: '10a5e793f46365986710e2dd806257d55951d5aacc8454a20d8296da8b978ada',
      },
      {
        path: 'packages/migrate/src/migration-transaction.lifecycle.test.ts',
        sha256: '64e14860e54d4103c943c07c52d1cce5bfebb6363f9cc4c484e0bd823aa37640',
      },
      {
        path: 'packages/migrate/src/migration-transaction.ts',
        sha256: '799ab52026c2ff0bd5546860a8bdc7922f3d78c87cc3e0343242b702089cf529',
      },
      {
        path: 'packages/migrate/src/migration-write-guard.test.ts',
        sha256: '36c11c4d5f3aeda40b52e9db2816127abc91010a0c1e3f16b3d05984c467bc8f',
      },
      {
        path: 'packages/migrate/src/migration-write-plan.baseline.test.ts',
        sha256: '0ae7e3544c50066274309da04a0233677d79bc4215c117e66661c8c01bbd7ac6',
      },
      {
        path: 'packages/migrate/src/migration-write-plan.ordering.test.ts',
        sha256: 'f00dc3ea6001545225e1790827692ca6e725a529c854a8649317ad2bb691844e',
      },
      {
        path: 'packages/migrate/src/migration-write-plan.project.test.ts',
        sha256: 'b9d1e7745ab751a305f650a2b73b14ca107c38b7d1223a22728e01e6f9867f32',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: 'd22144643747896424eab57e4a5c431510ef997eced817dff5a20d81d8d0be7e',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: 'decb63dda5d12a2269bef1dd75c3d1eb4efca071887c759deca8e9b06ef17a25',
      },
      {
        path: 'scripts/coverage/inventory.mjs',
        sha256: '8a709dbd233b4108d1f624f8b74e3b5b225db0e7553dea31c2dd4bf36cf1b6a2',
      },
      {
        path: 'scripts/coverage/metrics.mjs',
        sha256: '5bc99f26d81e11816a73f9d5e673769ed0ff1b0a7883eda7c130db1e4466dd74',
      },
      {
        path: 'scripts/coverage/protected-baseline.mjs',
        sha256: 'a36a3150baa4350fa5ce48d5b676071a1543aa85b32748ef7760b0522ca2f3c2',
      },
      {
        path: 'scripts/coverage/run.mjs',
        sha256: '87c5e8049444e8d5b6195b5d01ced2061420f04ed9a572a7e8f80f9b67a29d45',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 15469,
            total: 17123,
          },
          branches: {
            covered: 9927,
            total: 12233,
          },
          functions: {
            covered: 1873,
            total: 2153,
          },
          lines: {
            covered: 13800,
            total: 15021,
          },
        },
        after: {
          statements: {
            covered: 15493,
            total: 17150,
          },
          branches: {
            covered: 9927,
            total: 12248,
          },
          functions: {
            covered: 1873,
            total: 2153,
          },
          lines: {
            covered: 13800,
            total: 15021,
          },
        },
      },
    },
  },
  {
    id: 'recent200-owned-definitions-path-extraction-20261028',
    authority:
      'User2026-10-28 requests full remaining200 recheck; standing explicit authorization permits justified exact baseline adjustments after quality refactors, never weak tests/dead code restoration. Content-only recount: two fully covered duplicate path policies share one internal14-branch policy; preserve public wrappers/errors. Statement -10/-10, branch -11/-10, line -8/-8. Added shop guard is fully covered; locale own-key guard adds2 branches, with3/4 covered: inner nullish fallback for an owned undefined value is outside legal Locale string inputs; do not fabricate an invalid typed fixture. Retain old function floor812/827 so the actual813/828 gain stays real. Other six package floors remain unchanged. Full main artifact member versus current per-file report has exactly five deltas, archived untrimmed with pinned CI artifact source. No runner/comparator/selection/threshold/deadline/ignore changes.',
    evidence: 'docs/ops/evidence/QUALITY-RECENT-200-CONTENT-AUDIT-2/coverage-recount.json',
    baselineSha256: '6fe5297747ce54c3902809f704c03d5f1044c510bc30ab9949692feaa74b4f8c',
    sources: [
      {
        path: 'packages/content/src/locale.ts',
        sha256: '16aa937f2dece69d1fd7d58a5c738ce9a360f1e7529154629d45903426d62275',
      },
      {
        path: 'packages/content/src/map-index.ts',
        sha256: '565841f541e3e7cb9f4424622835c813024337aa53e31e7ca69f0a73c9510f4c',
      },
      {
        path: 'packages/content/src/project-json-path.ts',
        sha256: 'ff6ab6db271e923d87071a7929afba2997d3ec329fa026da042c0b52b40e22f1',
      },
      {
        path: 'packages/content/src/scene-index.ts',
        sha256: '0c02defd836dc8e6fc37ab9fae73e6b66cf061b7805477359257166468d05ee9',
      },
      {
        path: 'packages/content/src/shop.ts',
        sha256: '01ba2f28e378b10b00e35a12e48509dab8f292a67c637fd70b5617063dd11121',
      },
      {
        path: 'packages/content/src/locale.test.ts',
        sha256: 'afd2d9c36d4b7b4f8ef10b09ae59f4a3413a0906e8260c7d48d1391db37799c7',
      },
      {
        path: 'packages/content/src/shop.test.ts',
        sha256: '1fe3e993e5dce21fbeda7c8521641cb800bcee802f790e46b9af3b5834fc543b',
      },
      {
        path: 'packages/content/src/map-index.contracts.test.ts',
        sha256: '56b758fc152ac41c936fd09db89e90532067e83d644f2c0f9b08635cf9605891',
      },
      {
        path: 'packages/content/src/scene-index.boundaries.test.ts',
        sha256: '5224a6f1a468b8bf7740c692f106730b74c73062432f8d0c57c0b3a9bc6438d3',
      },
      {
        path: 'packages/content/src/tileset.test.ts',
        sha256: 'a6c691b0f9fcbad80683c344319ee0cf0a724f858cd8056208204541abc41e6f',
      },
      {
        path: 'scripts/coverage/run.mjs',
        sha256: '87c5e8049444e8d5b6195b5d01ced2061420f04ed9a572a7e8f80f9b67a29d45',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: '9845f41bf51e01b1ec809c7515305ec2534aff59b9e7c3c7557db1c68bdcca35',
      },
      {
        path: 'scripts/coverage/metrics.mjs',
        sha256: '5bc99f26d81e11816a73f9d5e673769ed0ff1b0a7883eda7c130db1e4466dd74',
      },
      {
        path: 'scripts/coverage/inventory.mjs',
        sha256: '8a709dbd233b4108d1f624f8b74e3b5b225db0e7553dea31c2dd4bf36cf1b6a2',
      },
      {
        path: 'scripts/coverage/protected-baseline.mjs',
        sha256: 'a36a3150baa4350fa5ce48d5b676071a1543aa85b32748ef7760b0522ca2f3c2',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: '49b54478478b0ca1f1af953b0572d7086be8ec40932df1b1290bfbb254bd5a41',
      },
    ],
    packages: {
      content: {
        before: {
          statements: {
            covered: 5671,
            total: 5879,
          },
          branches: {
            covered: 4835,
            total: 5135,
          },
          functions: {
            covered: 812,
            total: 827,
          },
          lines: {
            covered: 5063,
            total: 5200,
          },
        },
        after: {
          statements: {
            covered: 5661,
            total: 5869,
          },
          branches: {
            covered: 4824,
            total: 5125,
          },
          functions: {
            covered: 812,
            total: 827,
          },
          lines: {
            covered: 5055,
            total: 5192,
          },
        },
      },
    },
  },
  {
    id: 'quality-window100-exact-test-migration-20261027',
    authority:
      'User2026-10-27 explicitly approved three unused extractor APIs retirement and test migration; standing instructions permit justified exact baseline adjustment after code/test quality improvements, never dead code restoration or weak tests. Only pal-extract branch floor changes673/796→661/790:12 removed covered branches (6 from retired adapters,6 from stronger legally parsed inputs/test transfers into existing fast-excluded files),6total branches removed. Keep4 real animation-writer branch gains. Other metrics and six packages retain old floors. Ten per-file deltas and six exact test-retirement identities are independently pinned; one official collection reused. No runner, comparator, selection, predicate, threshold, timeout or ignore changes.',
    evidence: 'docs/ops/evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/recount.json',
    baselineSha256: 'f569c4c715ad0031c70c9e6bf4f359d8460f423b588da0cb0fa72887d857ac1c',
    sources: [
      {
        path: 'packages/pal-extract/src/io/read.ts',
        sha256: '2dcd57f6a51469b9ce5b50d50a817e0922295e3281ef895c8a03e66a42ce75e2',
      },
      {
        path: 'packages/pal-extract/src/io/write.ts',
        sha256: '664539a20d5a23f296dcaeb08e54d32cba0a4789fc5fc8feb56b7de0bffbda77',
      },
      {
        path: 'packages/pal-extract/src/resources/animation-assets.ts',
        sha256: 'ba474bac4b6dc2dcb034f165a92d25186f2a29a6343bad835016ce04e58645b9',
      },
      {
        path: 'packages/pal-extract/src/resources/map.ts',
        sha256: '081d8e15132b74ae2d41f7300147bf5966e4a187e5f72ca7b5bc833f892bae9c',
      },
      {
        path: 'packages/pal-extract/src/resources/scene.ts',
        sha256: '2980e190a4133f2123cee42cab14b942e4ba7661932aa26170ba679cf8dfceee',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/data-misc.ts',
        sha256: 'bae489b9c04bc8a4ec85d82419b0b08694c25dfdfdb8a9afdd389a1de5bab5f2',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/spells.ts',
        sha256: '3bf94340d337fb9fee0ca019ce3a9a66f52cf42d671b748e9dfd68868ed4815d',
      },
      {
        path: 'packages/game/src/assets/png-decode.grok-r1.test.ts',
        sha256: '58fa7709e4a859fdc57ab5eae736806a392e8cfe668df1c06c88e1ad05d097b7',
      },
      {
        path: 'packages/game/src/assets/scene-cache.grok-r1.test.ts',
        sha256: '4ab6a1fa912fdfed0b961bf43b0734c7d69a41eb5e7b61eedc98d7da61e6dce0',
      },
      {
        path: 'packages/pal-extract/src/events/disasm.test.ts',
        sha256: 'eeb11963b6761c5ad16694df2046aab3e1a627161af891f2e1f613e8eef70df2',
      },
      {
        path: 'packages/pal-extract/src/font/__tests__/bdf-to-json.test.ts',
        sha256: 'cd19f360ffd314bf602920c5f5bfcc47e7d5ebe52db872300d56741742e2d4d6',
      },
      {
        path: 'packages/pal-extract/src/io/rle.test.ts',
        sha256: '16b2f6ab8b5cfe0a5b1aa2203aa45e16033085bf84cd7a79264289861f18b074',
      },
      {
        path: 'packages/pal-extract/src/resources/scene.test.ts',
        sha256: 'bd602764b568f4a7610fd601d5dacca96abd3ab8dd9f55d1713489ef05851373',
      },
      {
        path: 'packages/pal-extract/src/resources/animation-assets.fire.test.ts',
        sha256: 'ba4cd460bd6947c7a8afe3f44e56610ea27036bf6b39eb96bf44a53fc3b8e3d2',
      },
      {
        path: 'packages/pal-extract/src/resources/animation-assets.rng.test.ts',
        sha256: '50a55707f9ac594cf5c8bde3b60106f465b2d0736b337fcda015d7e72b36149c',
      },
      {
        path: 'packages/pal-extract/src/resources/map.test.ts',
        sha256: 'e12128fbee820a1b3b7f2f132af5ad8f5f9a60d3df5b12dba13b2dcad977bf5a',
      },
      {
        path: 'packages/pal-extract/src/resources/scene.glm-runtime-resource.test.ts',
        sha256: '021124b1842f5f7ac94a497843a965e30ed095351e377d6fcfbe70260a3ab6cb',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/data-misc.test.ts',
        sha256: '831237c3fe3f42969c0f204ad686202ae170e544d475bdd87fb6d298ad35470f',
      },
      {
        path: 'packages/pal-extract/src/resources/tables.test.ts',
        sha256: 'f1977858301e9d01e609ba2f3a0a6d6ecb5a9b38f875d2f4f62cb5a71947ac28',
      },
      {
        path: 'scripts/coverage/run.mjs',
        sha256: '87c5e8049444e8d5b6195b5d01ced2061420f04ed9a572a7e8f80f9b67a29d45',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: '9845f41bf51e01b1ec809c7515305ec2534aff59b9e7c3c7557db1c68bdcca35',
      },
      {
        path: 'scripts/coverage/metrics.mjs',
        sha256: '5bc99f26d81e11816a73f9d5e673769ed0ff1b0a7883eda7c130db1e4466dd74',
      },
      {
        path: 'scripts/coverage/inventory.mjs',
        sha256: '8a709dbd233b4108d1f624f8b74e3b5b225db0e7553dea31c2dd4bf36cf1b6a2',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: '5a43a8cccde1289e24f5614ebb3b54af6a0b4f80d217d1c8cb9e67d92c738302',
      },
      {
        path: 'packages/pal-extract/src/resources/animation-assets.rng.pal.test.ts',
        sha256: '54c93e4df0dc4db712b4a5ca6a622da31d4a87849afbf5d31d07870a04f747f3',
      },
    ],
    packages: {
      'pal-extract': {
        before: {
          statements: { covered: 1366, total: 1810 },
          branches: { covered: 673, total: 796 },
          functions: { covered: 134, total: 193 },
          lines: { covered: 1199, total: 1590 },
        },
        after: {
          statements: { covered: 1366, total: 1810 },
          branches: { covered: 661, total: 790 },
          functions: { covered: 134, total: 193 },
          lines: { covered: 1199, total: 1590 },
        },
      },
    },
  },
  {
    id: 'review52-approved-video-guards-and-sprite-retirement-20261026',
    authority:
      'User2026-10-26 explicitly approved output symlink rejection/atomic publish and zero-caller sprite-wrapper retirement; standing instruction permits justified exact baseline changes without dead-code restoration or weak tests. This finite adjustment includes behavioral CLI guards, not just pure restructuring: CLI subprocess byte/error regressions pass but the standalone script is outside in-process V8 execution. Its new uncovered denominators stay visible. Exactly two per-file deltas explain the pal-extract package change; other six packages and their real gains are not rebased. One official collection reused; no metric tolerance, exclusion, rule or predicate change.',
    evidence: 'docs/ops/evidence/QUALITY-REVIEW-52-CLOSEOUT-1/uniform.json',
    baselineSha256: '8851d8d5b176469254e5504a3971917f1f02aa5541f6fba62983d91a49469c4a',
    sources: [
      {
        path: 'packages/pal-extract/scripts/extract-videos.ts',
        sha256: 'af09a60afc0340809c0edaa4289dffe1700ebdffe1bb1ea49c58d70791d01f20',
      },
      {
        path: 'packages/pal-extract/src/resources/sprite.ts',
        sha256: '95e171528c60e7c06f3b82aade6e991bed39546b7cff93e62a69037334b15b9a',
      },
      {
        path: 'packages/pal-extract/src/output-boundary.ts',
        sha256: '2b7f92f1d5713dd9d1753c14917dca80582add06f304712be857d1cc4e6a0bdd',
      },
      {
        path: 'packages/pal-extract/src/cli-entrypoint-paths.test.ts',
        sha256: 'f622af31fdef664f7607681b0e9f04512709c1123e5adf7ac4a95aee4c607f2b',
      },
      {
        path: 'packages/pal-extract/src/resources/sprite.test.ts',
        sha256: '03b9a0a2172040c0fca3e823956029d1b45196dad6f3e460e4bb1fed555e803f',
      },
      {
        path: 'packages/pal-extract/src/resources/sprite.glm-runtime-resource.test.ts',
        sha256: 'c02fe8adea672225ac43017baa84d1b0039a23e762d6b24487455890e11acc80',
      },
      {
        path: 'packages/pal-extract/src/resources/misc-guards.kimi-r1.test.ts',
        sha256: '229c6433140e78fcb7df5a9e8a4e576698ff7cae3909011316f19718db2d9790',
      },
      {
        path: 'scripts/coverage/run.mjs',
        sha256: '87c5e8049444e8d5b6195b5d01ced2061420f04ed9a572a7e8f80f9b67a29d45',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: '9845f41bf51e01b1ec809c7515305ec2534aff59b9e7c3c7557db1c68bdcca35',
      },
      {
        path: 'scripts/coverage/metrics.mjs',
        sha256: '5bc99f26d81e11816a73f9d5e673769ed0ff1b0a7883eda7c130db1e4466dd74',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: 'b86ca4f3d13fc0b2b5c05d87781bba2652ad518f40eadf2b569170b5e71f9c3d',
      },
    ],
    packages: {
      'pal-extract': {
        before: {
          statements: {
            covered: 1350,
            total: 1782,
          },
          branches: {
            covered: 648,
            total: 761,
          },
          functions: {
            covered: 133,
            total: 190,
          },
          lines: {
            covered: 1186,
            total: 1567,
          },
        },
        after: {
          statements: {
            covered: 1341,
            total: 1785,
          },
          branches: {
            covered: 646,
            total: 766,
          },
          functions: {
            covered: 132,
            total: 191,
          },
          lines: {
            covered: 1177,
            total: 1568,
          },
        },
      },
    },
  },
  {
    id: 'quality94-102-unused-menu-api-removal-20261025',
    authority:
      'User explicitly approved unused old-menu API deletion and the corresponding test retirement; standing authority permits justified exact structural rebaselining. Only the three unchanged-active-body helpers are recounted from old/current per-file official data. No uncovered-count increase in those files. Driver, Save API and IDB gains are excluded from the adjustment and retained; all other packages/scope/threshold algorithms unchanged. One official collection, original rejection retained, no recollection.',
    evidence: 'docs/ops/evidence/CODE-QUALITY-94/approved-closeout/review.json',
    baselineSha256: '3bc57dac8baa099e65b84b43becfc25c4edba186a21e6e97659bf70989873ff8',
    sources: [
      {
        path: 'packages/game/src/core/menu/item-select.ts',
        sha256: '869e931e9fa5b0ccde9655514920e146ad3b827aa4be23fbbf614f7d90a0591d',
      },
      {
        path: 'packages/game/src/core/menu/player-status.ts',
        sha256: '55f0108d2f4ddfa0a45f8f00a83fe25bdd87230a51a1bc0448f2f0b414a87d2a',
      },
      {
        path: 'packages/game/src/core/menu/primitives.ts',
        sha256: '16dcc14b8a072542614f6456b4649f086c07059d06dd3df993ff522cab81d6e1',
      },
      {
        path: 'packages/game/src/core/menu/__tests__/primitives.test.ts',
        sha256: 'f2a43473509d2a9fd6ea9bba334b027e6398f4c6fdb2ffd971944e00ff0031c3',
      },
      {
        path: 'packages/game/src/core/menu/primitives.boundaries.test.ts',
        sha256: '78bfaff615553f6dcb1d0e1645969958a64691ffb61a0135c99d762885a17a9f',
      },
      {
        path: 'packages/game/src/core/menu/primitives.glm-phase1-leaves.test.ts',
        sha256: '3deb623f2073ddf3b08aa8f459cf177f0bf9aec9a4c62f6cfe0e021944f4b0f9',
      },
      {
        path: 'packages/game/src/core/menu/item-select.glm-phase1-leaves.test.ts',
        sha256: '767dc6720228343197421a3e4e2a80237ca87a30fa3c8f1cff0fb77cf72276fa',
      },
      {
        path: 'packages/game/src/core/menu/__tests__/item-magic-select.test.ts',
        sha256: '8bdf986b89edbc5f7b74cd28ae1eccea91854ea00861d5037e736d92cbfcc702',
      },
      {
        path: 'packages/game/src/core/menu/player-status.test.ts',
        sha256: '5c731ad6ff6766895e26c2d4551fb75881b6d8a00c83f517299eb4b98840ec1c',
      },
      {
        path: 'packages/game/src/core/menu/menu-driver.ts',
        sha256: '81db674f145043b7a78aea5ac705baa8c975502cbce66bcf88908574acd596f5',
      },
      {
        path: 'packages/game/src/core/save/api.ts',
        sha256: '385f8df40e4e2b804dbb86ecd23e49c10f4a46f4f7e6f742b56bbed4cf5e7cd8',
      },
      {
        path: 'packages/game/src/core/save/indexed-db.ts',
        sha256: '87f3f66db9595314df1756609dd73f8f00d355b4f34c0c002ff6dbf849a3ebb1',
      },
      {
        path: 'packages/game/src/core/save/__tests__/slot-domain.test.ts',
        sha256: 'e4d6d2a47f71d236e62337a1cc029ebeb56db2639c82369cdf88eb238279ebd0',
      },
      {
        path: 'scripts/coverage/run.mjs',
        sha256: '8bc85e90639bf707d25d96c3ee36fe84d67eae39596c6aa83454b51c9a1bf684',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: '9845f41bf51e01b1ec809c7515305ec2534aff59b9e7c3c7557db1c68bdcca35',
      },
      {
        path: 'scripts/coverage/metrics.mjs',
        sha256: '5bc99f26d81e11816a73f9d5e673769ed0ff1b0a7883eda7c130db1e4466dd74',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: 'f87270fb2290cb0f232a1fd402a6d0f4e859f8f2fba9e8f24404b520a9b16bf2',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 15432,
            total: 17106,
          },
          branches: {
            covered: 9914,
            total: 12247,
          },
          functions: {
            covered: 1869,
            total: 2153,
          },
          lines: {
            covered: 13766,
            total: 15000,
          },
        },
        after: {
          statements: {
            covered: 15384,
            total: 17057,
          },
          branches: {
            covered: 9884,
            total: 12216,
          },
          functions: {
            covered: 1850,
            total: 2134,
          },
          lines: {
            covered: 13726,
            total: 14960,
          },
        },
      },
    },
  },
  {
    id: 'pre94-cli-stage-structural-recount-20261025',
    authority:
      'User standing authority: justified structural refactoring may update exact baseline; no dead-code restoration, weak tests or metric tolerance. Nine-file CLI stage split has whole-body reconstruction proofs, unchanged 39 real CLI contracts/child execution and byte-identical 809 output files. Parent V8 does not instrument CLI child processes. Only structural statement/function/line deltas rebased; events/slice behavioral gains and branch floor are preserved. One original official collection retained, no recollection.',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/final-pre94-gates/recount.json',
    baselineSha256: '251bd24327f3fd792aaa706e49a8325dea990e4b50f1d4d78def03a48dc3394a',
    sources: [
      {
        path: 'packages/pal-extract/src/cli.ts',
        sha256: '1e467403d0bce8f169b0d4be83dd8dfdb02c22831ed2929374a711002eb54387',
      },
      {
        path: 'packages/pal-extract/src/io/read.ts',
        sha256: '2dcd57f6a51469b9ce5b50d50a817e0922295e3281ef895c8a03e66a42ce75e2',
      },
      {
        path: 'packages/pal-extract/src/resources/data-assets.ts',
        sha256: 'e1e1a9cee093d57bfbcf9080b920a75087a0388c0f3f77e5b53ea17e7feeb11d',
      },
      {
        path: 'packages/pal-extract/src/resources/animation-assets.ts',
        sha256: 'ba474bac4b6dc2dcb034f165a92d25186f2a29a6343bad835016ce04e58645b9',
      },
      {
        path: 'packages/pal-extract/src/resources/bitmap-assets.ts',
        sha256: 'd468feacaf206d7f053d1fec47d23579009678104206bfdcfcfdf0126a6f80d5',
      },
      {
        path: 'packages/pal-extract/src/resources/sprite-assets.ts',
        sha256: '1769334589117d87db9bf82e2c589a5f5c0897bbb7d090d390bb1f97a84e97af',
      },
      {
        path: 'packages/pal-extract/src/resources/sound-assets.ts',
        sha256: '38a20ddb87e56e7c4a47fe8aeb5253a8fb6f6a9b5c4e915da9d9c2a248b3fb0b',
      },
      {
        path: 'packages/pal-extract/src/resources/lookup-assets.ts',
        sha256: '02edaa5ba40a47fdf7a4590f5da4c4933ba9176ebd0eb9b3ce28130b8963ec28',
      },
      {
        path: 'packages/pal-extract/src/resources/world-assets.ts',
        sha256: '6618ee3e1129036411230c215e7cfffeb77ab99b00d5b189f1655e615d9d62c7',
      },
      {
        path: 'packages/pal-extract/src/cli-battle-assets.glm-q.test.ts',
        sha256: 'acf20e9fda9aa82c66b64734a04344a410ab22cc5b4622727ae7b46966123fdc',
      },
      {
        path: 'packages/pal-extract/src/cli-entrypoint-paths.test.ts',
        sha256: '77d75e081d309cde9a917308ac2407fa136690ce42e71b7bf015c9f4fdbf5519',
      },
      {
        path: 'packages/pal-extract/src/cli-error-exits.kimi-r1.test.ts',
        sha256: '586c8987a642a1212d3d690da8775d3df2851c2b736afa3db0a7757ad117b16f',
      },
      {
        path: 'packages/pal-extract/src/cli-font-lookup.glm-q.test.ts',
        sha256: '724102f0cc54b03400c287453ef2e3a60a04a946118a0ba636e95e0d30880a21',
      },
      {
        path: 'packages/pal-extract/src/cli-global-entries.glm-q.test.ts',
        sha256: 'f23e419c1849b7c25d4530332bbb071e2830e2431f215c6750da69ab8f4b6d89',
      },
      {
        path: 'packages/pal-extract/src/cli-isolated.glm-q.test.ts',
        sha256: '1b05cc32c9341086d46975558bfa1e145d81d3a0ee2a8dc26ca99e9cf664491c',
      },
      {
        path: 'packages/pal-extract/src/events/slice.ts',
        sha256: '5f1640541831116b78bf4fb1c701dd0f70d47b90981599b7bb6a6a5e747b3c8d',
      },
      {
        path: 'packages/pal-extract/vitest.config.ts',
        sha256: '34a27a3287b44e6986ecc51fa51b18511b677bfb9a13890447adf3bd673b2f64',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: '9845f41bf51e01b1ec809c7515305ec2534aff59b9e7c3c7557db1c68bdcca35',
      },
      {
        path: 'scripts/coverage/run.mjs',
        sha256: '8bc85e90639bf707d25d96c3ee36fe84d67eae39596c6aa83454b51c9a1bf684',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: '1fba6c83a9867a411fc674ae304bf623bd9cee5ad91a893cee6fa4f2941fbb31',
      },
    ],
    packages: {
      'pal-extract': {
        before: {
          statements: {
            covered: 1361,
            total: 1741,
          },
          branches: {
            covered: 643,
            total: 758,
          },
          functions: {
            covered: 133,
            total: 161,
          },
          lines: {
            covered: 1199,
            total: 1540,
          },
        },
        after: {
          statements: {
            covered: 1343,
            total: 1775,
          },
          branches: {
            covered: 643,
            total: 758,
          },
          functions: {
            covered: 133,
            total: 190,
          },
          lines: {
            covered: 1181,
            total: 1562,
          },
        },
      },
    },
  },
  {
    id: 'pre94-number-shared-blit-recount-20261024',
    authority:
      'User standing authority permits exact baseline adjustment for justified refactoring. Only draw-number source coverage changes: shared existing blit replaces byte-equivalent private body; approved nonfinite guard offsets part of removed covered code. Source remains100% (statements37→32, branches11 unchanged, functions2→1, lines33→29). No tests retired; all13 existing identities retained and4 meaningful cases added. Only game statements/functions/lines rebased to measured counts; all other metrics/packages/scopes/rules unchanged. Full original policy rejection and same single official collection retained.',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3k-number-quality/review.json',
    baselineSha256: '1bcc9268a3d062cd2348ecd2191d1894650fe0d338f0828dd35ff0a538255f84',
    sources: [
      {
        path: 'packages/game/src/present/draw-number.ts',
        sha256: '148ad2df307b8b9aa316662d71440153762714fdc0027a5c3486e3f7af8e3684',
      },
      {
        path: 'packages/game/src/present/draw-number-slots.grok-r1.test.ts',
        sha256: '6cb8a530e70a1797a35e1795cffd70e78353ccd4f7119f8bc960ffaa5b37e28c',
      },
      {
        path: 'packages/game/src/present/draw-number-nonfinite.test.ts',
        sha256: 'd4169c259788e16a080762f332665a514c80a3ea6f0aff3f3f094478f6c78f7c',
      },
      {
        path: 'packages/game/src/present/draw-number.test.ts',
        sha256: '4251c96b758cb2eae081861eada535db545e695e636239cc408e0a795ec03e9e',
      },
      {
        path: 'packages/game/src/present/blit-indexed-sprite.ts',
        sha256: '28b22d87ba93cac1b09b8c2b909b65fed9ca075d3e079f7fab3a1919170f4c8f',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: '9845f41bf51e01b1ec809c7515305ec2534aff59b9e7c3c7557db1c68bdcca35',
      },
      {
        path: 'scripts/coverage/run.mjs',
        sha256: '8bc85e90639bf707d25d96c3ee36fe84d67eae39596c6aa83454b51c9a1bf684',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 15272,
            total: 17039,
          },
          branches: {
            covered: 9880,
            total: 12220,
          },
          functions: {
            covered: 1829,
            total: 2127,
          },
          lines: {
            covered: 13618,
            total: 14940,
          },
        },
        after: {
          statements: {
            covered: 15267,
            total: 17034,
          },
          branches: {
            covered: 9880,
            total: 12220,
          },
          functions: {
            covered: 1828,
            total: 2126,
          },
          lines: {
            covered: 13614,
            total: 14936,
          },
        },
      },
    },
  },
  {
    id: 'pre94-battle-present-dedup-recount-20261023',
    authority:
      'Standing user authority permits exact baseline adjustment for justified refactoring and proven weak-test retirement. Two identical blits become one; unused idle helper and always-false target-arrow path removed. Six-person unsupported smoke and the incorrectly ignored showBattleMessage input no longer receive incidental branch credit. Remaining message lifecycle stays review. Exact old/new contracts, six-file coverage deltas, original rejection and single official collection retained. Only game branches/functions comparison rebased; statements/lines still ratchet from the old value. No rule, exclusion, tolerance or behavior change.',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/review.json',
    baselineSha256: '04adac41f64db1d1906942c601dc28e89768f3f50c2f02a56fd62f50906cb31d',
    sources: [
      {
        path: 'packages/game/src/present/battle/draw-battle-settlement.ts',
        sha256: '86e247937a178a7052b7c30ed18fe842ba063b97cfdd27602598de9c2290450e',
      },
      {
        path: 'packages/game/src/present/battle/draw-battle-sprites.ts',
        sha256: '3fc14745f59a500b8417db1dd0b7757d3279c54df778c91d0874942bbd295540',
      },
      {
        path: 'packages/game/src/present/battle/draw-battle-ui.ts',
        sha256: '96714e12d8a34a07bf440f39f559d8f74af894c95e526d00a6ba305dd6e4c37c',
      },
      {
        path: 'packages/game/src/present/battle/present-battle.ts',
        sha256: '75dc24f5a931a4a8642c289e53b8027be9f8da3af480049442c62954c8b6b3e8',
      },
      {
        path: 'packages/game/src/present/battle/blit-ui-frame.ts',
        sha256: '7635925cacad5e9642e34ec9b5e487daf4a67ac7ef8ec03e071ebad4f1b19103',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-sprites.test.ts',
        sha256: '7cd301dd7793d46158b3ff2ce9795c685ce6df42e49d38b07a7f668a69b9dc2e',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/draw-battle-ui.test.ts',
        sha256: '04ede6eb0d4e913868d4d1f1c211af2495d41cf0598633535af4cbb41d1457bd',
      },
      {
        path: 'packages/game/src/present/battle/__tests__/present-battle.test.ts',
        sha256: '1867a092d5873b149574fdafb4602b062845ee2487f706de1b2e69f08f258d0d',
      },
      {
        path: 'packages/game/src/present/battle/draw-battle-settlement.glm-phase1-leaves.test.ts',
        sha256: 'b321f904c77031a3cbbb4b9d5e205bfc3024a6b2e8abea256ad6620adf16b8ca',
      },
      {
        path: 'packages/game/src/present/battle/draw-battle-sprites.glm-phase1-leaves.test.ts',
        sha256: '2891953e04cfb5200dad7bafb2985fb63a39fb3dd750a70b62c390027810320e',
      },
      {
        path: 'packages/game/src/present/battle/draw-battle-ui.glm-phase1-leaves.test.ts',
        sha256: '6dcd3bc9ca16f22c9daae99bf853452bd641ad5ab9dfcde1c6c1b00debc1ef60',
      },
      {
        path: 'packages/game/src/present/battle/battle-settlement-pixels.grok-r1.test.ts',
        sha256: '58af32b51be9a025ea5f12607750cb6cbc7e1850a7782e0db2e3d63417616493',
      },
      {
        path: 'packages/game/src/present/battle/battle-sprite-pixels.grok-r1.test.ts',
        sha256: '5b63c47a79607ca9100299fbe534fb11657e9972b1423c0fa31fe9b7f494e126',
      },
      {
        path: 'packages/game/src/present/battle/battle-ui-pixels.grok-r1.test.ts',
        sha256: 'a82d686149c924abd845c4ee62f951f7e3e7166f7025cb997b1ddd67aa8136b9',
      },
      {
        path: 'packages/game/src/core/battle/battle-positions.ts',
        sha256: 'd068e5b70e39af41d57672c9ccb7d952184e76de8836865756f714657d3e372d',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: '9845f41bf51e01b1ec809c7515305ec2534aff59b9e7c3c7557db1c68bdcca35',
      },
      {
        path: 'scripts/coverage/run.mjs',
        sha256: '8bc85e90639bf707d25d96c3ee36fe84d67eae39596c6aa83454b51c9a1bf684',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: '08dfbba7516defe64752ad5f3d30651e01364b527b6b3ed48e9e6d9e29530d03',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 15288,
            total: 17074,
          },
          branches: {
            covered: 9904,
            total: 12274,
          },
          functions: {
            covered: 1835,
            total: 2135,
          },
          lines: {
            covered: 13628,
            total: 14962,
          },
        },
        after: {
          statements: {
            covered: 15288,
            total: 17074,
          },
          branches: {
            covered: 9891,
            total: 12264,
          },
          functions: {
            covered: 1832,
            total: 2132,
          },
          lines: {
            covered: 13628,
            total: 14962,
          },
        },
      },
    },
  },
  {
    id: 'pre94-follower-walking-guard-recount-20261023',
    authority:
      'User standing authority permits exact baseline adjustment for justified refactoring. Current3k removes a redundant walking test after the nonwalking branch returns; sole production collision callback does not mutate walking. Same16 retained tests before/current V8: covered statement -1, branches covered -1/total -2 (the unreachable nonwalking arm), functions/lines unchanged. No thresholds, tolerance, scope, or formulas changed.',
    evidence:
      'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/review.json',
    baselineSha256: '9d3d6ab2358d23faa7399097486f1b817706839a57edad8de18670575a3da890',
    sources: [
      {
        path: 'packages/game/src/present/follower-pos.ts',
        sha256: '1a55cf4137c888e12ba3660d9006367fcef8fb82cdff7e4c3ec2a8a0c0397ca6',
      },
      {
        path: 'packages/game/src/present/follower-pos.test.ts',
        sha256: '2c6989647938b42e379a0ffaee99baa64aec72b9544da42a44033c58dfb8576c',
      },
      {
        path: 'packages/game/src/present/follower-pos-axis.grok-r1.test.ts',
        sha256: '6d838ab74b66081af05cbda9c33641cbed9493d88113940c8698f9081177f7b7',
      },
      {
        path: 'packages/game/src/present/present.ts',
        sha256: 'a95de9032a6fbed6500ea11151b04a010f05ffb6d1ee2fd89dffc2bd2c31a2b5',
      },
    ],
    packages: {
      game: {
        before: {
          statements: { covered: 15289, total: 17075 },
          branches: { covered: 9905, total: 12276 },
          functions: { covered: 1835, total: 2135 },
          lines: { covered: 13628, total: 14962 },
        },
        after: {
          statements: { covered: 15288, total: 17074 },
          branches: { covered: 9904, total: 12274 },
          functions: { covered: 1835, total: 2135 },
          lines: { covered: 13628, total: 14962 },
        },
      },
    },
  },
  {
    id: 'pre94-time-format-private-default-recount-20261023',
    authority:
      'User standing authority permits exact baseline adjustment for justified refactoring without restoring dead code or weak tests. Current3j removes only unexported pad width default; all six callers pass one argument and fixed width2 is unchanged. Same14 unchanged strong tests before/current V8 prove only one covered default-arg branch removed (line2,37hits); all other branch locations/hits and statements/functions/lines unchanged. Pin complete old baseline and four source/test bytes. No tolerance, scope/comparator/timeout or behavior change.',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/review.json',
    baselineSha256: '4fdc2286c5338060524aaf6c160f08797cbbd681f23c0499318ead4027171187',
    sources: [
      {
        path: 'packages/game/src/tools/speedrun/time-format.ts',
        sha256: 'ba19622f9f2f969a58e5f88fb6ca5c32983931493915a769afb4f72553c32a92',
      },
      {
        path: 'packages/game/src/tools/speedrun/time-format.test.ts',
        sha256: '61046994eb6a6dd74a1fc16df10f6411aa470565fe30d94bbd34fbb174a9be75',
      },
      {
        path: 'packages/game/src/tools/speedrun/time-format.boundaries.test.ts',
        sha256: 'ce31751bf2f91e1707bea710ae157e7bd15094d802c3757f9c896c1f60d9051f',
      },
      {
        path: 'packages/game/src/tools/speedrun/time-format.glm-phase1-leaves.test.ts',
        sha256: '79411da90343bc7a2346df5e4743c3ab47146df823e15d160e9f20d7ecab5076',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 15289,
            total: 17075,
          },
          branches: {
            covered: 9906,
            total: 12277,
          },
          functions: {
            covered: 1835,
            total: 2135,
          },
          lines: {
            covered: 13628,
            total: 14962,
          },
        },
        after: {
          statements: {
            covered: 15289,
            total: 17075,
          },
          branches: {
            covered: 9905,
            total: 12276,
          },
          functions: {
            covered: 1835,
            total: 2135,
          },
          lines: {
            covered: 13628,
            total: 14962,
          },
        },
      },
    },
  },
  {
    id: 'pre94-precache-private-formatter-recount-20261023',
    authority:
      'User standing authority permits exact baseline adjustment for justified refactoring; current3i scope includes reuse, test quality and concentrated final coverage. Consolidate two byte-for-byte same-input MiB formatter arrows into one private named formatter. Frozen same35 strong tests old/current V8 independently measure only covered counters removed:3statements/1function/1line, zero branch delta, all uncovered counters unchanged. TS normalized full-body proof checks the shared expression against both old arrows. Only these game counters rebased against this complete baseline; no tolerance, scope, comparator or project behavior changed.',
    evidence:
      'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/review.json',
    baselineSha256: '63e37d95e612ff31b62749f16c1673e27a242c893cfb13906dd7e10d6809e162',
    sources: [
      {
        path: 'packages/game/src/shell/precache-ui.ts',
        sha256: 'c4cd5d12f0bc2dbcc070f5ddcfbb98757353f238bf1b498b3bd15f3d4f87d614',
      },
      {
        path: 'packages/game/src/shell/precache-client.ts',
        sha256: 'abba42fb5f84f0c04f97f1ee589d5cb933ded67cef7e52c0a8a835d9a1930694',
      },
      {
        path: 'packages/game/src/shell/trademark-fallback.ts',
        sha256: 'ad6995cb2b1927d569400cb8f2ec391c6838713af4e611288d41d0fd307308ee',
      },
      {
        path: 'packages/game/src/shell/precache-ui.test.ts',
        sha256: '07fff6677212ba351c0e9cef53c3e93725627253151760e7824353bc9d2eb16d',
      },
      {
        path: 'packages/game/src/shell/precache-ui-host.grok-r1.test.ts',
        sha256: 'fa3bd28549ee88ca59711a90ca10270db7e296f330d4309c4ade63eef1dd013f',
      },
      {
        path: 'packages/game/src/shell/precache-client.test.ts',
        sha256: '28ce0d5003acf0b193eb544daae13f93ae6f76d20d1fa71e65b2dc861be0b2c1',
      },
      {
        path: 'packages/game/src/shell/precache-client.glm-phase1-leaves.test.ts',
        sha256: '67256f548bd47c406cfecaaedd1bcff9dec9ad005d5a3342ffeea5f1b717be5c',
      },
      {
        path: 'packages/game/src/shell/trademark-fallback.test.ts',
        sha256: '20ef23c546e899e2325d7720420a14697282b11c8b98e6bb8bbe919bba5ffe47',
      },
      {
        path: 'packages/game/src/shell/trademark-splash.grok-r1.test.ts',
        sha256: 'c5d2cfdce1a5b5d6372a1ee5249936be3e93beffd3b167f9579910ec010eb00b',
      },
      {
        path: 'packages/game/src/__tests__/precache-ui-host.ts',
        sha256: '4f2cc02f49b8d0885d33d8ca9581b64d5835918fafb6b0de8aebd97a64d87997',
      },
      {
        path: 'packages/game/src/__tests__/precache-client-host.ts',
        sha256: '973b3a485956111622f1b1bd9be058f1da52cb20ec17b0020ce855fb7e724694',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: '70811672262ddf2d5541281666fa444497f389b81275c48e90e5bc683d3df63b',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.test.mjs',
        sha256: 'e7a12869bd4940f733ebd5c51a09ee7295896c0500c4601377f454d17c80882e',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 15290,
            total: 17078,
          },
          branches: {
            covered: 9904,
            total: 12277,
          },
          functions: {
            covered: 1835,
            total: 2136,
          },
          lines: {
            covered: 13627,
            total: 14963,
          },
        },
        after: {
          statements: {
            covered: 15287,
            total: 17075,
          },
          branches: {
            covered: 9904,
            total: 12277,
          },
          functions: {
            covered: 1834,
            total: 2135,
          },
          lines: {
            covered: 13626,
            total: 14962,
          },
        },
      },
    },
  },
  {
    id: 'pre94-ui-frame-index-main-sync-recount-20261022',
    authority:
      'User standing authority allows exact coverage recount for justified cleanup, without restoring dead code or weak tests. Approved UI original-index fix removes success-only packing, 1 function/2 statements/2 branches/1 line; all removed counters were covered. Existing three uncovered diagnostic lines are unchanged. Only game counters rebased by the measured single-source delta; all other baseline floors, scope, predicates and configuration unchanged. Latest main6a29 contains separate script fixes and a measured baseline; repeat only the same already measured loader structural delta against this exact full baseline. No other counter adjusted.',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/main-sync.json',
    baselineSha256: 'ac88089bea8aeeff7a7451b84a9215a5cd910a3b866357a11cae4855d43b2c6c',
    sources: [
      {
        path: 'packages/game/src/__tests__/grok-render-r1/legal-host.ts',
        sha256: '895cd55fee073b5f0a7a286af31bbeab2e41d4fc0829306d773c8681184c4bcc',
      },
      {
        path: 'packages/game/src/assets/load-all-assemble.grok-r1.test.ts',
        sha256: '1d21d4085cc12a016be2468928a8eb876fb5eb7ae337339463e0cf0eaee72228',
      },
      {
        path: 'packages/game/src/assets/load-all-recover.grok-r1.test.ts',
        sha256: 'bafbf8a7c6ca9b3197ea764cf112df7a94ca77f010527a264fc93fcd2059e059',
      },
      {
        path: 'packages/game/src/assets/load-all-ui-frame-identity.test.ts',
        sha256: '590c3f5a389f6267d547e8ab22644eabd435f2eeb47b3727d45b41a4203a9c87',
      },
      {
        path: 'packages/game/src/assets/loader.test.ts',
        sha256: '9bfb8abd59603935e60ce8ee2baa2e9510b18a336244dc788bf272e12c01b437',
      },
      {
        path: 'packages/game/src/assets/loader.ts',
        sha256: '9c3c3a333e5b04d25cd220e17d04863b0ff5c759e273d05c3b82af758756788f',
      },
      {
        path: 'packages/game/src/assets/rle-decode.ts',
        sha256: '28d312c4792b1cc6c7f2d4f156a764aab80e98f3228a47c567cc40a9a8d1603f',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: 'd8c128d29f50d815840591e8d1d47256ac2add15f62fea8a8682accf6a8f7c25',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.test.mjs',
        sha256: '528bd0caef8d403f5d518bac15a41aa58a8d5b19b504b4c68e034252b88232c3',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 14813,
            total: 16569,
          },
          branches: {
            covered: 9601,
            total: 11920,
          },
          functions: {
            covered: 1762,
            total: 2056,
          },
          lines: {
            covered: 13211,
            total: 14526,
          },
        },
        after: {
          statements: {
            covered: 14811,
            total: 16567,
          },
          branches: {
            covered: 9599,
            total: 11918,
          },
          functions: {
            covered: 1761,
            total: 2055,
          },
          lines: {
            covered: 13210,
            total: 14525,
          },
        },
      },
    },
  },
  {
    id: 'pre94-ui-frame-index-assembly-recount-20261022',
    authority:
      'User standing authority allows exact coverage recount for justified cleanup, without restoring dead code or weak tests. Approved UI original-index fix removes success-only packing, 1 function/2 statements/2 branches/1 line; all removed counters were covered. Existing three uncovered diagnostic lines are unchanged. Only game counters rebased by the measured single-source delta; all other baseline floors, scope, predicates and configuration unchanged.',
    evidence:
      'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/fixture-refresh.json',
    baselineSha256: 'a2beab0a46435a9bd17c877f2e858a787295a1b621689a1d3502d967f07eda3f',
    sources: [
      {
        path: 'packages/game/src/__tests__/grok-render-r1/legal-host.ts',
        sha256: '895cd55fee073b5f0a7a286af31bbeab2e41d4fc0829306d773c8681184c4bcc',
      },
      {
        path: 'packages/game/src/assets/load-all-assemble.grok-r1.test.ts',
        sha256: '1d21d4085cc12a016be2468928a8eb876fb5eb7ae337339463e0cf0eaee72228',
      },
      {
        path: 'packages/game/src/assets/load-all-recover.grok-r1.test.ts',
        sha256: 'bafbf8a7c6ca9b3197ea764cf112df7a94ca77f010527a264fc93fcd2059e059',
      },
      {
        path: 'packages/game/src/assets/load-all-ui-frame-identity.test.ts',
        sha256: '590c3f5a389f6267d547e8ab22644eabd435f2eeb47b3727d45b41a4203a9c87',
      },
      {
        path: 'packages/game/src/assets/loader.test.ts',
        sha256: '9bfb8abd59603935e60ce8ee2baa2e9510b18a336244dc788bf272e12c01b437',
      },
      {
        path: 'packages/game/src/assets/loader.ts',
        sha256: '9c3c3a333e5b04d25cd220e17d04863b0ff5c759e273d05c3b82af758756788f',
      },
      {
        path: 'packages/game/src/assets/rle-decode.ts',
        sha256: '28d312c4792b1cc6c7f2d4f156a764aab80e98f3228a47c567cc40a9a8d1603f',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: 'b5b3bbb04edb4bfd9b52fcd929b0f75fa6994ab2a26f1facd88b34392396607a',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.test.mjs',
        sha256: 'ffd6288b09072d7317308829575ba77d94b43b1d5f503f437fa356346f59b425',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 14785,
            total: 16542,
          },
          branches: {
            covered: 9576,
            total: 11892,
          },
          functions: {
            covered: 1756,
            total: 2050,
          },
          lines: {
            covered: 13184,
            total: 14498,
          },
        },
        after: {
          statements: {
            covered: 14783,
            total: 16540,
          },
          branches: {
            covered: 9574,
            total: 11890,
          },
          functions: {
            covered: 1755,
            total: 2049,
          },
          lines: {
            covered: 13183,
            total: 14497,
          },
        },
      },
    },
  },
  {
    id: 'pre94-basic-typed-fixture-recount-20261022',
    authority:
      '用户2026-10-20/21允许合理重构与测试质量整改的覆盖率下降精确调整baseline，禁止恢复死代码/堆弱测试。原7例用合法typed BattleState代替三字段强转；protect未定义回退与缺动画锚的即时数字分支不再被旧伪fixture偶然覆盖。仅game已覆盖branch9557→9555，其它旧指标下限保持；无规则/谓词/范围/超时变化。',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/recount.json',
    baselineSha256: '33dd8c7315460e96caca0632fe24080f656935e6f0a11f8944f8b9af21d5c97d',
    sources: [
      {
        path: 'packages/game/src/__tests__/glm-next-wave/H/harness.ts',
        sha256: '0c3b15371cda3f5a0e936c7c1e73dee516617f239dbc4e3c6a4c3ea3cd9640e0',
      },
      {
        path: 'packages/game/src/analytics/install-analytics.test.ts',
        sha256: '3780e1911f96d60f8ef75cd3cce40909cb116713b31b905a0fd4b321c93bd300',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/actions.test.ts',
        sha256: '0bd0e53f63267b9212b34c7df6162413686eb4ecabee0c5f0b44fd880e5cb31a',
      },
      {
        path: 'packages/game/src/core/battle/__tests__/attack-mate.test.ts',
        sha256: '9c5df1343e7d51d4ddb0b87ce75cc78c93a208182fa6bca8c953fdef5d0f1c8d',
      },
      {
        path: 'packages/game/src/core/battle/actions/attack-mate.ts',
        sha256: '217f36879c652d015b3dc26302d6b67db7dcc3c380f8bfa030d4094999458591',
      },
      {
        path: 'packages/game/src/core/battle/actions/attack.ts',
        sha256: '30e61e9fcbf5578391effce111c98e9b73c2d4abeef2934e3441b84d27ae1374',
      },
      {
        path: 'packages/game/src/core/battle/actions/flee.ts',
        sha256: '9baeac60c72bfec5c04dfa6e7e534ff1f53c351965025cdbb1a4b544eb6bf463',
      },
      {
        path: 'packages/game/src/core/battle/battle-state.ts',
        sha256: '584fab309cc044973207f0ea4d44e3a48bff11c3b1d7ae0d0287a6c2d8774c86',
      },
      {
        path: 'packages/game/src/core/battle/battle-system.ts',
        sha256: '784961100c58233d34c7294615112bc19faf80efa49a58b44ceb23444cfc9874',
      },
      {
        path: 'packages/game/src/shell/avi-player.glm-next-wave.test.ts',
        sha256: '8b154915ffdcb01f7d0d31b761f85a621c4db4c11e4762686b9fb5b4866a08bf',
      },
      {
        path: 'packages/game/src/shell/avi-player.ts',
        sha256: 'dcb53dc1f6b4ce8f35208362be06f7edd806b3cd32f195b06bc8170f4e4e2834',
      },
      {
        path: 'packages/game/src/tools/display-scale.ts',
        sha256: '1485971b96faead4c8ef1acb3e1bdd5257a2c1755595d5f110db3a54e7c84df6',
      },
      {
        path: 'packages/game/src/tools/fps-overlay.ts',
        sha256: 'a6487b7d2b6ee2f5fe597d4fdfec11cd9c2ee9407f8fcfff580468b289c98020',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 14755,
            total: 16514,
          },
          branches: {
            covered: 9557,
            total: 11869,
          },
          functions: {
            covered: 1749,
            total: 2044,
          },
          lines: {
            covered: 13160,
            total: 14476,
          },
        },
        after: {
          statements: {
            covered: 14755,
            total: 16514,
          },
          branches: {
            covered: 9555,
            total: 11869,
          },
          functions: {
            covered: 1749,
            total: 2044,
          },
          lines: {
            covered: 13160,
            total: 14476,
          },
        },
      },
    },
  },
  {
    id: 'pre94-extract-control-and-io-recount-20261022',
    authority:
      'User2026-10-20/21 authorizes exact baseline adjustment for reasonable refactor,never dead-code restoration or weak tests;2026-10-22 approves the two slice control fixes. Standing authorization permits file reorganization. This finite recount covers deduplicated BFS and unchanged moved IO/music bodies only; no rule/selection/threshold relaxation.',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-io-closeout/review.json',
    baselineSha256: '131f7ec3de15f966fcddb4f218b971861b2b1f95282a27245687ddb77c3ad692',
    sources: [
      {
        path: 'packages/pal-extract/README.md',
        sha256: 'ef3fc9f781bbe58504e5bce6b8736162f894ad254b82fce645bb708a5205b3b2',
      },
      {
        path: 'packages/pal-extract/audit-data-mkf.mjs',
        sha256: 'dc6d386620a54dc8f3036b754f0cc1173fa037a40c9f19e85936cd61f818afc5',
      },
      {
        path: 'packages/pal-extract/package.json',
        sha256: 'c267ca338e26c4a5e0a4b24bde218bf32f16adfcb1f122cb689b04d07f229f34',
      },
      {
        path: 'packages/pal-extract/scripts/extract-videos.ts',
        sha256: '0c149a276bca4fe592142ddfeef06c2268c1642e03dcf05883f5292cbbc22218',
      },
      {
        path: 'packages/pal-extract/scripts/find-scenes-without-setpartypos.mjs',
        sha256: 'da5d9bc73921f38a2fd5b525761379647a1241ff570021cd8a4dc8e6c11900d9',
      },
      {
        path: 'packages/pal-extract/scripts/grep-sdlpal-chunks.ts',
        sha256: '3539416fef83525ddc76c93562e7c29191038db52d3c1ecd0181156517b7061f',
      },
      {
        path: 'packages/pal-extract/src/__tests__/asset-manifest.boundaries.test.ts',
        sha256: '46866511c87751ad77f2d43763d04beb3947b69046877a1f9601342f811f6b86',
      },
      {
        path: 'packages/pal-extract/src/__tests__/asset-manifest.test.ts',
        sha256: '47e20b7d623e3549cd43271a321c349bb749684c6d88f4a7487474060bc11d00',
      },
      {
        path: 'packages/pal-extract/src/__tests__/cli-host.test.ts',
        sha256: '9095e62d4768e00a0ce374685e39f1e807c0ea674735c2be6941881f95ae4177',
      },
      {
        path: 'packages/pal-extract/src/__tests__/cli-host.ts',
        sha256: '6da3976c58acf663493472e23bddb6ad7eb9382d11c5257b9a3153445b23ea95',
      },
      {
        path: 'packages/pal-extract/src/__tests__/glm-foundation-fixtures.ts',
        sha256: 'dedcadf9aa816f9b64e01acb840d405dfae89f2eb1e407efd1cc1cd9d3a30ba8',
      },
      {
        path: 'packages/pal-extract/src/__tests__/glm-q/cli-global-entry-inputs.ts',
        sha256: '855cf2a0031725eb6af1f944c4ad7b7b67082031dd7bea038d6b0054fd915239',
      },
      {
        path: 'packages/pal-extract/src/__tests__/glm-q/cli-pipeline-inputs.ts',
        sha256: 'ef6393d93a79eba8ab3d1cdbc87e8ddcf2ce32887ee920fa99d8970936597dbd',
      },
      {
        path: 'packages/pal-extract/src/__tests__/glm-q/yj2-encoder.ts',
        sha256: '7fd2291608c9a2581adafb86a37e868c7f16640f693b89b0dcb97d76b83fa215',
      },
      {
        path: 'packages/pal-extract/src/__tests__/glm-runtime-resource/yj2-sprite-chunk-vector.ts',
        sha256: '6627be6794027e7f1071c8da0d6ffb0c2161851b820c7e9f8f506a495687faab',
      },
      {
        path: 'packages/pal-extract/src/__tests__/glm-tb04-fixtures.ts',
        sha256: 'aa81e2e672a88a28eaa24acf2e123f1b672f260f073499e14cfe2fa1a3173d2c',
      },
      {
        path: 'packages/pal-extract/src/__tests__/parser-diagnostics.ts',
        sha256: '81e4c3b53d339c6c95a34ca9cd257d7b2a4541dec9be5ea8f3213d0af45e8010',
      },
      {
        path: 'packages/pal-extract/src/audit-data-mkf.test.ts',
        sha256: '2ba45d0947f9dc087911131d9288a1feae0bac3ea19c6fecf972dd4225c19e15',
      },
      {
        path: 'packages/pal-extract/src/cli-battle-assets.glm-q.test.ts',
        sha256: '20bb5fa429fcdaa161d4b5a51a2b38a36fc819833e82fd08880ac67bea555de5',
      },
      {
        path: 'packages/pal-extract/src/cli-entrypoint-paths.test.ts',
        sha256: '77d75e081d309cde9a917308ac2407fa136690ce42e71b7bf015c9f4fdbf5519',
      },
      {
        path: 'packages/pal-extract/src/cli-error-exits.kimi-r1.test.ts',
        sha256: '4b00dec25c948419a6b35e0d278b5b4995e48473b040503999c2e6d2e9f638b7',
      },
      {
        path: 'packages/pal-extract/src/cli-font-lookup.glm-q.test.ts',
        sha256: 'ded6e69d721824c14c15d74ed51af4ff57b1900d5bfd13d31ff563a58d4b2c4b',
      },
      {
        path: 'packages/pal-extract/src/cli-global-entries.glm-q.test.ts',
        sha256: '845dd66a1ac2f2de8eaf84154b82e75e8c822d26dbd6bf0806e629dd169bd5a1',
      },
      {
        path: 'packages/pal-extract/src/cli-isolated.glm-q.test.ts',
        sha256: '42e74aab061c667d84ca37bd62f54480d84e1177c22b40edffeed0e709906c66',
      },
      {
        path: 'packages/pal-extract/src/cli.ts',
        sha256: '33e00dd6737c5feaa537736b54e1a82795ccc45503586418f5ee97dce79b78b2',
      },
      {
        path: 'packages/pal-extract/src/events/annotate.glm-runtime-resource.test.ts',
        sha256: 'cf18e63bd8be2d9ec4db111d0155bc12c1191975e17d3b1bdf22d500364285e7',
      },
      {
        path: 'packages/pal-extract/src/events/annotate.test.ts',
        sha256: '3b9e4ee25e88f59523ce87daa23ee6ac627fcdb1669b7a09557452fc3e89093d',
      },
      {
        path: 'packages/pal-extract/src/events/annotate.ts',
        sha256: 'ef31df8d85c291cabc2d1ad836bec706c4f70e8de9c6c20d15d1b098ac86e673',
      },
      {
        path: 'packages/pal-extract/src/events/disasm.boundaries.test.ts',
        sha256: '2513464e090d42e3ef7c1c2e23cbe4280909fa43c67c4e1be545da9b12c28698',
      },
      {
        path: 'packages/pal-extract/src/events/disasm.glm-runtime-resource.test.ts',
        sha256: 'd8f42c22376c31c7aef1a8e9f1849ffb119c5971927e47f6e80307cd9a9d9ce9',
      },
      {
        path: 'packages/pal-extract/src/events/disasm.kimi-r1.test.ts',
        sha256: 'a50f4d05fc2dae1e259d5e46b89ff7f4aea73bc0dbc740c0b952f00333294400',
      },
      {
        path: 'packages/pal-extract/src/events/disasm.test.ts',
        sha256: 'b1d13d7320a52098b2b5278de91f0755a4df08abc9066f71c554822dd7adc1f9',
      },
      {
        path: 'packages/pal-extract/src/events/disasm.ts',
        sha256: 'e9f628cd665d70f738f44cb0216a9dcf3f8f60a3c853da465b620f584414033b',
      },
      {
        path: 'packages/pal-extract/src/events/opcodes.test.ts',
        sha256: '8189eedb5cbe6a14a1f3e9817d1af79e904c9bcf1624bce3b12854392726770c',
      },
      {
        path: 'packages/pal-extract/src/events/opcodes.ts',
        sha256: 'cacf6a313be2ab3298fb74be07825c12d43c9b21505301a7c037102b28b1bee4',
      },
      {
        path: 'packages/pal-extract/src/events/recompile.boundaries.test.ts',
        sha256: '02766ba23acb6c203738d38ad5f2c7accf9eb52d33127967fe3160e70c01999c',
      },
      {
        path: 'packages/pal-extract/src/events/recompile.glm-runtime-resource.test.ts',
        sha256: '53c33d150aff71d0d2bb58b6e30fe00170d7d580ed762c3817d84082749b6500',
      },
      {
        path: 'packages/pal-extract/src/events/recompile.test.ts',
        sha256: 'fa5a24dacc0ac97130ff84eef80804538e739bb763b407b9203935b09f9a41e8',
      },
      {
        path: 'packages/pal-extract/src/events/recompile.ts',
        sha256: '70a5ac15d498c2a9316080ccfaa2333664b9a99e18e186ec8f524086e2fb209f',
      },
      {
        path: 'packages/pal-extract/src/events/roundtrip.kimi-r1.test.ts',
        sha256: 'ec1ba7fd79340e57f2e9792017a7531059a6545a5c3e286141a7a13dceb66c02',
      },
      {
        path: 'packages/pal-extract/src/events/roundtrip.test.ts',
        sha256: 'ee6cfbf035101be7a78b95c8fb09e2902a42f4e61f69d57fdd12c6ba7229daf2',
      },
      {
        path: 'packages/pal-extract/src/events/roundtrip.ts',
        sha256: '06e63ab104777ec60a1317d5f9170f9911ccae45d580ec170c337c951c660906',
      },
      {
        path: 'packages/pal-extract/src/events/script-entries.test.ts',
        sha256: '188724f87e35e1fa775346b7d678ec89607029015e8f6a374ba745d59199b869',
      },
      {
        path: 'packages/pal-extract/src/events/script-entries.ts',
        sha256: '33879340659cd516df13adc41b8f1eca627c88f52eae931f7dc6e2e186ee2c04',
      },
      {
        path: 'packages/pal-extract/src/events/slice.boundaries.test.ts',
        sha256: 'cd6589766f62c3236080b3df551895b405f236b0b2daca590efc2a44b64a1021',
      },
      {
        path: 'packages/pal-extract/src/events/slice.glm-runtime-resource.test.ts',
        sha256: 'b5e9d9216141d620da39d60c2c94df873185169d0e3c5b3e8a748db55f116d04',
      },
      {
        path: 'packages/pal-extract/src/events/slice.kimi-r1.test.ts',
        sha256: '638bd917be66aec18addc6ec5baa8e7b4cf4397bf551daaead6f53a337b2acd8',
      },
      {
        path: 'packages/pal-extract/src/events/slice.test.ts',
        sha256: '7d5ce4302ff885a2e41cafd0cab5dd0d198d0615e0a1ff3b14e47df6d1816eb8',
      },
      {
        path: 'packages/pal-extract/src/events/slice.ts',
        sha256: '249ef69f1cb4e9e5ed79adbc740c32cd8dd0b7c5cafaf71d6adb79bf43c60e2a',
      },
      {
        path: 'packages/pal-extract/src/font/__tests__/bdf-to-json.boundaries.test.ts',
        sha256: '05b54e3d21e5c097451ffb2dc9c39c27969a250f50785d8dd75fc74ced2230d8',
      },
      {
        path: 'packages/pal-extract/src/font/__tests__/bdf-to-json.test.ts',
        sha256: '1795ab0f4412d0a6b44ab35fce8512263301ca1d584bf925cccc0018be8ffc90',
      },
      {
        path: 'packages/pal-extract/src/font/bdf-to-json.glm-runtime-resource.test.ts',
        sha256: '8b2b58de7b41cdb5f0b2671a16bf469fade4b721e8872118d6de3337247db707',
      },
      {
        path: 'packages/pal-extract/src/font/bdf-to-json.ts',
        sha256: '4d57203361b505557c165398d580404579c61964014e2b99aac935307d85aa50',
      },
      {
        path: 'packages/pal-extract/src/io/mkf.test.ts',
        sha256: '7da6a589a75cac60a352cc156da790c70505235d7be335ddc01d461090dfebb0',
      },
      {
        path: 'packages/pal-extract/src/io/mkf.ts',
        sha256: 'ca53d95c262a6fe6d7b31fe0ec149804e4e759875803b3cf63c8f7c713cb0fd3',
      },
      {
        path: 'packages/pal-extract/src/io/msg.boundaries.test.ts',
        sha256: 'fcdce8e656c2fb289e79a5f0181043885304111de80e0d36d3eb18bc5e41721f',
      },
      {
        path: 'packages/pal-extract/src/io/msg.test.ts',
        sha256: '564ffa152841040b412826e238291103fa69756e6cef236557776cfeb24d4816',
      },
      {
        path: 'packages/pal-extract/src/io/msg.ts',
        sha256: '1aeede31eec0e5807ca450c7614d3b9719a2e3c1e8ac5940f8a2dd3a3f092006',
      },
      {
        path: 'packages/pal-extract/src/io/rle.test.ts',
        sha256: '73dcec2dd9260c0449e58b57e904a42a053629c6aa5ee11001d4fd88148222c0',
      },
      {
        path: 'packages/pal-extract/src/io/rle.ts',
        sha256: '181195581652f4d2985681490e80a4ec9b7f371280fb71aef320a930aa0726bb',
      },
      {
        path: 'packages/pal-extract/src/io/sss.boundaries.test.ts',
        sha256: '617dd83725bacfe92ca0af771cb3fb61b5b41ff1e801d46c0b22bef28da11eff',
      },
      {
        path: 'packages/pal-extract/src/io/sss.test.ts',
        sha256: '34207e32602a42b6d2390e7a11e9cf78e44341555f2e3db9376008383fac254f',
      },
      {
        path: 'packages/pal-extract/src/io/sss.ts',
        sha256: 'a1f950905bdeb18baef4086203a4e3590c2b43a71150c7d0a0dca2898842a518',
      },
      {
        path: 'packages/pal-extract/src/io/word.boundaries.test.ts',
        sha256: '2f169f1fe001832e42d3483ea6be2dffb07a22cefe5a23ecc8cdd0759f0f8e0b',
      },
      {
        path: 'packages/pal-extract/src/io/word.test.ts',
        sha256: '451ffeb0872156a1ff2660ba039d087642f08efdc596cddf1f38f073e986a760',
      },
      {
        path: 'packages/pal-extract/src/io/word.ts',
        sha256: 'dbcd851a23f10829f2f04ef7fd7ec427c0362ea3d0796714a7186da9f35323a6',
      },
      {
        path: 'packages/pal-extract/src/io/write.ts',
        sha256: '664539a20d5a23f296dcaeb08e54d32cba0a4789fc5fc8feb56b7de0bffbda77',
      },
      {
        path: 'packages/pal-extract/src/io/yj2.test.ts',
        sha256: '597ec5e65d42105a76e23c1cae4abca602a4143b5843b9355834feafd1c978dd',
      },
      {
        path: 'packages/pal-extract/src/io/yj2.ts',
        sha256: 'b01a32ad4f2a313c52accc8ebecc67e550994fa61c802c031d91a7ad31f126c0',
      },
      {
        path: 'packages/pal-extract/src/output-boundary.test.ts',
        sha256: '367ed813ba41b1797c0c4928d42745aa64f36384fb7c66e53aab26f582f11ea7',
      },
      {
        path: 'packages/pal-extract/src/output-boundary.ts',
        sha256: '2b7f92f1d5713dd9d1753c14917dca80582add06f304712be857d1cc4e6a0bdd',
      },
      {
        path: 'packages/pal-extract/src/resources/asset-manifest.glm-runtime-resource.test.ts',
        sha256: 'bfdd1a65bfc5ce183c9801495793b3d040c8b3b1a06d96779a50d01e7ac0f51a',
      },
      {
        path: 'packages/pal-extract/src/resources/asset-manifest.ts',
        sha256: '6946220262cdd9f490e5469c26e209554e5e87eb8188fb2d144f46d23b801a4b',
      },
      {
        path: 'packages/pal-extract/src/resources/battle-sprite.test.ts',
        sha256: '9489e0a90ab292172d0edac4c6eaa22bc56b15b70b5086931656bcfc9c690422',
      },
      {
        path: 'packages/pal-extract/src/resources/battle-sprite.ts',
        sha256: '17027e7427166a332690e9618a3e454e12d1e412963edbc87403ce17bfe8bb68',
      },
      {
        path: 'packages/pal-extract/src/resources/enemy-pos.boundaries.test.ts',
        sha256: 'd8dc28e53680629b4408cb2f2b1429eb45dddb09cd88d7acf792dcfdf1e781d9',
      },
      {
        path: 'packages/pal-extract/src/resources/enemy-pos.ts',
        sha256: '2fe29a2a1c485929009f6cffec7ad75a75ac695721e0929418f33edd30910505',
      },
      {
        path: 'packages/pal-extract/src/resources/map.test.ts',
        sha256: '53a65a217b5befb52e01db818722cd3dff57f4720a1de1066204bd3df54e3585',
      },
      {
        path: 'packages/pal-extract/src/resources/map.ts',
        sha256: '5695f47064b4c2d83d1cbd7f624450feda2b98fe335a6170d6147e5338d4e678',
      },
      {
        path: 'packages/pal-extract/src/resources/misc-guards.kimi-r1.test.ts',
        sha256: 'cf730e725e7131806402f962e5f390a2d21bbb828ae510e330bfeb97754ea1f4',
      },
      {
        path: 'packages/pal-extract/src/resources/music.ts',
        sha256: 'dd488c3e3d1485de41f15d8a9fc95866a2c294d34a9fb8d9e0436b649de65926',
      },
      {
        path: 'packages/pal-extract/src/resources/palette.boundaries.test.ts',
        sha256: '86724be02c3415531d8ce0d8b502df7c4b1b67b73db3fbc6ce061fae1fc152bf',
      },
      {
        path: 'packages/pal-extract/src/resources/palette.glm-runtime-resource.test.ts',
        sha256: 'c13ab1fa32032954f6cf97ca9c866f83ce6402a7ea87ad7036347a173dc3b84b',
      },
      {
        path: 'packages/pal-extract/src/resources/palette.test.ts',
        sha256: 'ad2650b6b0e28a3498b02f91288061caf114a6a43e0ebb9efd8c2525fa2dcdc8',
      },
      {
        path: 'packages/pal-extract/src/resources/palette.ts',
        sha256: 'ad806bc60aa51e5dd61bbb8c9fe50c2c20ae66feed9fa89944393714d3272ba9',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/battle-fields.boundaries.test.ts',
        sha256: 'a6f7262bf137ed4958e3e39727b1636f236408c33a0d65deaa64e4976132935b',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/data-misc.boundaries.test.ts',
        sha256: '7fbc1f8639c9190f32b886cf261115a0125c156fa6d11cdb5fa709662f6684b3',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/data-misc.test.ts',
        sha256: '3f13dc170743e59be27cd006bb5bac11b84e0058b480f536ed93435373dc32d0',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/enemies.boundaries.test.ts',
        sha256: '60f468590d88560dfd77d04c472cf2f620ae3fcb59b9457b41269f31b832784d',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/enemy-teams.boundaries.test.ts',
        sha256: 'b20e652c9d85ff27a6e5a64f97a56c18f88dcd09fe3bce7cbf8ddefbc48f19ea',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/indexed-frame-digest.ts',
        sha256: 'ccdb9eeb55af7027c94087451e27286bfb90a969730addcef0d9b39433284850',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/items.boundaries.test.ts',
        sha256: '91cadfd35e0f7c206089503aca0d3da7db4d96179bb8ec41d4fb30f8f308209f',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/misc-mkf.test.ts',
        sha256: '6a4f30672f726cc9ec5b3d4066953762051b2562fa074edb984cbc09e74acdb2',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/player-roles.boundaries.test.ts',
        sha256: '7c0719614bf246e4d43ff5b5ccd0222a008551b1bf465bef56c5f554550bdff3',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/player-roles.event-boundaries-1.test.ts',
        sha256: '8892d438a8c88ea2c9f544f2aef90b90283d1934c9618c7d2bbb88d1120d015f',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/rix.test.ts',
        sha256: 'def06f201d8c5c0b622c8a59b3bd3f6998e637b23b77abcd4008e00a09beee75',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/sounds.test.ts',
        sha256: '0945a301f7e9996069d9dad0259580cdc8a494598f0e0d4abff6e3f0c3615105',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/spells.boundaries.test.ts',
        sha256: '1ef19189f922b888a40debfd56d951df272bdcaa92e9f1f015dc12e419949280',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/__tests__/stores.boundaries.test.ts',
        sha256: 'c6a79ba5737d556536715fb93e3f28aa2e7b8810083da5767561c93e4aa5d762',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/_utils.ts',
        sha256: '958dea6b7bec38ca3ae2a467b2d372c28263bedcf2b8a6f92d28f72fee9b3215',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/ball.glm-runtime-resource.test.ts',
        sha256: '1047364fe2958538103ab65aa398c695bd627d4f36fb1dffe8b4636d20aaef83',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/ball.ts',
        sha256: '8a8f6de4be9ccaa69e6a50ad1adea06b1b9f20f6503fed8e2f358d0927f09688',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/battle-fields.glm-runtime-resource.test.ts',
        sha256: '2698d991fea5c3c24349c18356b78a65f7ecbb2410482777e4e141307ce4110c',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/battle-fields.ts',
        sha256: 'df5ed939b9761da191590e48fe9dd4c1b334c211b4a523cdc4b18df22a9848a2',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/data-misc.ts',
        sha256: 'be0f30fa87b04813a7f3e8247ceecceb104d6575df573feb6fdc2970f5e6e74c',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/enemies.ts',
        sha256: '12c0fba0960792c066859a832120c894483d3cdec3d29e0e250db4277573f9b6',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/enemy-teams.glm-runtime-resource.test.ts',
        sha256: '5ac390a1b612c97ce6d199abd86a172079ac5505643dab330a58292caa1c1c8a',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/enemy-teams.ts',
        sha256: 'eb8369584d1ea80317fca82764ef9c0a88f653b9bcf6d8808b5cb92e41c8f5b0',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/fire.glm-runtime-resource.test.ts',
        sha256: '53ad57980bdb47bf3a90832cb87b052bbdd4a3d8eecd6c83e9ad67754335cc15',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/fire.ts',
        sha256: '0cfc135544de7ae6e1a2571fdb643333eac35833649e17a4e1b57a167849ac76',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/items.glm-runtime-resource.test.ts',
        sha256: '2eb46bfcb73055f3302707ab791eb41659959249bb3c137f6c71c07ca2f0ef1b',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/items.ts',
        sha256: 'ce10629b77c6ca18c32e755e1b9f7dfd57287558da7eed0e27528fbac52ba7dc',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/player-roles.ts',
        sha256: 'faddc5642418cfcf1eb639850bc71fbdde2a8784190263fa022d2af42d03da4d',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/rgm.glm-runtime-resource.test.ts',
        sha256: '326f352769f56e742ed76d449814ab6a4ede96fc9b43db24f73be54a40aa7d8c',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/rgm.ts',
        sha256: '92883a8e074005d2b9e25ff9ae3bc31e68619ff165dde4fed2c5a08c3e876b65',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/rix.ts',
        sha256: '769745e4f7e176fa5ef24d7120d0d6aa8e4651718420ae77a135604edf09e91e',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/rng-frames.test.ts',
        sha256: '6bc9aab5f5e7d10fac8fe428df6c87dd0611e86d49930142941dda1fbfc09617',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/rng-frames.ts',
        sha256: '9a4b1431e8a8d683795b9b5ca1b28e6bc0f22a408cc0cf02c4663ae431f99094',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/sounds.ts',
        sha256: '8e46e879621a448028ce3ed3cbd7a4aca5da85659191ea446b395f5d9e1dce64',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/spells.ts',
        sha256: '3bf94340d337fb9fee0ca019ce3a9a66f52cf42d671b748e9dfd68868ed4815d',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/stores.glm-runtime-resource.test.ts',
        sha256: 'bda5f984c13ca2c8e42b29154ff656ff053b93a4bcef6835892476d9b00dbb3e',
      },
      {
        path: 'packages/pal-extract/src/resources/parsers/stores.ts',
        sha256: 'ac63cfe2cee9ba7ab01d6dd055fb93a78bf0b8a6d61648ac98be0d118d6fc0f4',
      },
      {
        path: 'packages/pal-extract/src/resources/scene.glm-runtime-resource.test.ts',
        sha256: 'd64535347174d2c2ec6f872ba3a6165286c6426eb9065cd35109e4846dfc75b2',
      },
      {
        path: 'packages/pal-extract/src/resources/scene.test.ts',
        sha256: 'fe38963013805973a8bb7500a0270f164ee3f5573fce1fdadf80a3a152f130fe',
      },
      {
        path: 'packages/pal-extract/src/resources/scene.ts',
        sha256: '59dd66f60f240ebb9bf0ac8141d4c595d6e6e58dcd50fc0e1a66515adbcf1e61',
      },
      {
        path: 'packages/pal-extract/src/resources/sprite.boundaries.test.ts',
        sha256: 'a1fb4b2867d8e5c9474b7a9c3c90552091afacc13dd600fa83f9ef26976c2846',
      },
      {
        path: 'packages/pal-extract/src/resources/sprite.glm-runtime-resource.test.ts',
        sha256: '01041e1c52c81ba451f889a80c5a1de9d8ca16059afe55f7a1f2f59ca543fd9d',
      },
      {
        path: 'packages/pal-extract/src/resources/sprite.test.ts',
        sha256: '214717da50e69860e28775f14ec84a701579e515a4914b0154c1de45a7df623c',
      },
      {
        path: 'packages/pal-extract/src/resources/sprite.ts',
        sha256: '5ed13fc9c404449f1543fe85474d97a418397b5fb98a5e71af928855e614e96e',
      },
      {
        path: 'packages/pal-extract/src/resources/tables.test.ts',
        sha256: '1d223df93228b3bd45a4058ce61bd57ad4ee6999b17fa5f4c201353590d78403',
      },
      {
        path: 'packages/pal-extract/src/resources/tables.ts',
        sha256: '74df97a4874d86525378189cc4f59d118e8d5a002caa3f852212c50c8a409ccd',
      },
      {
        path: 'packages/pal-extract/src/utils/gbk.test.ts',
        sha256: '6efac88e323fdeaf028e282874efaf3b8a437665b511d658fa0dbd162f7a0dfe',
      },
      {
        path: 'packages/pal-extract/src/utils/gbk.ts',
        sha256: 'cf74eb8e8b37ab04e8746a9c42391c699f85af9cc02b8e4f1b08b7d7c9ea1a8b',
      },
      {
        path: 'packages/pal-extract/tsconfig.json',
        sha256: 'c495913f16faed5087b5f04fdf57ea15147633743e2c2b0f4352383a2453ac1b',
      },
      {
        path: 'packages/shared/src/__tests__/glm-foundation-fixtures.ts',
        sha256: '6444bc2f80029d5bd827699e2cac29e916fc278858447bf13d6492ac47a181d3',
      },
      {
        path: 'packages/shared/src/__tests__/public-contracts.ts',
        sha256: '9feeacc7e78e6e9a12c47e03779b489426a34c0028e280953fe3c7c243c7f6a4',
      },
      {
        path: 'packages/shared/src/__tests__/yj2-rescale.json',
        sha256: 'af83186c6135ab84e29ed27b7ecab8b126db33ab96122e119850bd1707bd29e1',
      },
      {
        path: 'packages/shared/src/events.ts',
        sha256: 'fbe669229da412574ec13a811b077918d97ab3399da5a3adfdcb10c91b5c7d0f',
      },
      {
        path: 'packages/shared/src/index.test.ts',
        sha256: 'fc92b682b1037bd56eb6e11004013abe4290052ee933a8ecee931f660d4d5ef5',
      },
      {
        path: 'packages/shared/src/index.ts',
        sha256: 'aa5e78f8a222de107f814d11cd9dc52239cc23135fe9c794db754f28b868d99d',
      },
      {
        path: 'packages/shared/src/input.ts',
        sha256: 'f986d4ca00d2661f76e10ae4974e40c2421734773094bcccdc4f104b9f8109c3',
      },
      {
        path: 'packages/shared/src/mkf.boundaries.test.ts',
        sha256: '9e2c09bd6f12e02955091a10afbc2411ec3248c10df8d17bcaf4237dff1b57be',
      },
      {
        path: 'packages/shared/src/mkf.ts',
        sha256: '7d4504527745800dee8ef1675269c6385ff028896d322f4fb66fde378bfc42cc',
      },
      {
        path: 'packages/shared/src/pal-authored-map-names.ts',
        sha256: '69d57d63ed58dda873776b48878f05f3578e80d3be667e521131065a3293547a',
      },
      {
        path: 'packages/shared/src/pal-map-names.test.ts',
        sha256: '3a381f468e7107b93efb25592e6a499d5d62cc0e40fe368701b992dcbe1741fc',
      },
      {
        path: 'packages/shared/src/resources.ts',
        sha256: 'daf404181b9244c98dfb859c7bb5c3befde2fdb1d16027a9318b5f98fff0d1ed',
      },
      {
        path: 'packages/shared/src/rle-encode.boundaries.test.ts',
        sha256: 'fc93e0f04f5be79be3c2c15ab83dfc62311d817ef571a9dc3054800dcd7558e3',
      },
      {
        path: 'packages/shared/src/rle-encode.glm-runtime-resource.test.ts',
        sha256: '2a2bb0336aa3b579462c74832971bb113c7d7b302cecc5c731c8974256d4418e',
      },
      {
        path: 'packages/shared/src/rle-encode.test.ts',
        sha256: '604eacd989af1111a252f5415700ca070017d60186b8b049955256034deaefe6',
      },
      {
        path: 'packages/shared/src/rle-encode.ts',
        sha256: '047b96879d4889a99f745525f894c6ebcc3714a65bca73c2e609912e0162ba36',
      },
      {
        path: 'packages/shared/src/rle.boundaries.test.ts',
        sha256: '1620ef98dd15a38b908badb32af8d5209e7d070b8f3b69c304d4090d039d800b',
      },
      {
        path: 'packages/shared/src/rle.glm-o.test.ts',
        sha256: 'b4ff29b83abd05b88307f3cad9eeed7957cc4508cda2f753c60925b20a97ddfc',
      },
      {
        path: 'packages/shared/src/rle.glm-runtime-resource.test.ts',
        sha256: 'cc41e134f9ff96fdceedc7419bde3a6e95e63efb2a18a6410918ed4ab1727f3b',
      },
      {
        path: 'packages/shared/src/rle.test.ts',
        sha256: '3f43d8a28da5e41c4b239c6b556bf9b6bae0bfaf4560add747f9ce9a31105e67',
      },
      {
        path: 'packages/shared/src/rle.ts',
        sha256: '91c3091ae09e8e577373a7679328e5a1ceba95e78b8f66736b366ff4f162744e',
      },
      {
        path: 'packages/shared/src/rng.boundaries.test.ts',
        sha256: '941aa095d350a5b093e37b4de2ea082d92a74b7ec3f3c0e27bd3385153c3649b',
      },
      {
        path: 'packages/shared/src/rng.test.ts',
        sha256: '5d7a5003aca652fd319118df5a73d85f101b2239f8ead7d15c192254c139101a',
      },
      {
        path: 'packages/shared/src/rng.ts',
        sha256: 'b8824d4d228febdb1f0e1994d3bc92c3b0c6892e20d93020e90b5e8c20db961e',
      },
      {
        path: 'packages/shared/src/tables.ts',
        sha256: 'efc0ed3c6cd2b50e002f783a738be1306bde0b727d3f3701a2aee18b55279828',
      },
      {
        path: 'packages/shared/src/yj2.boundaries.test.ts',
        sha256: '44b74b006f31d689b3720c8bc792b94b492034231fa19227b39dc23994ad1c52',
      },
      {
        path: 'packages/shared/src/yj2.ts',
        sha256: 'd26cfe8fc7680330de5f167f30d9b970e74e68dc6a3ddebbc58daa46a7acd0b4',
      },
      {
        path: 'pnpm-lock.yaml',
        sha256: '3e9c669950c68c0f996a7007fdd198270a079630e277b1e6de575ec1d738da65',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: '9845f41bf51e01b1ec809c7515305ec2534aff59b9e7c3c7557db1c68bdcca35',
      },
      {
        path: 'scripts/coverage/inventory.mjs',
        sha256: '8a709dbd233b4108d1f624f8b74e3b5b225db0e7553dea31c2dd4bf36cf1b6a2',
      },
      {
        path: 'scripts/coverage/metrics.mjs',
        sha256: '5bc99f26d81e11816a73f9d5e673769ed0ff1b0a7883eda7c130db1e4466dd74',
      },
      {
        path: 'scripts/coverage/run.mjs',
        sha256: '8bc85e90639bf707d25d96c3ee36fe84d67eae39596c6aa83454b51c9a1bf684',
      },
    ],
    packages: {
      'pal-extract': {
        before: {
          statements: {
            covered: 1120,
            total: 1542,
          },
          branches: {
            covered: 503,
            total: 597,
          },
          functions: {
            covered: 115,
            total: 143,
          },
          lines: {
            covered: 979,
            total: 1364,
          },
        },
        after: {
          statements: {
            covered: 1089,
            total: 1512,
          },
          branches: {
            covered: 482,
            total: 576,
          },
          functions: {
            covered: 116,
            total: 145,
          },
          lines: {
            covered: 955,
            total: 1341,
          },
        },
      },
    },
  },
  // Exact four covered temporary-copy declarations removed from SSS parsing.
  {
    id: 'pre94-sss-raw-copy-20261021',
    authority:
      'User permits exact baseline adjustment after reasonable refactor;four covered temporary copy/view declarations removed,not tests or live behavior. User2026-10-21 requires multiple cards per expensive gate window;native first failure retained and final gates deferred to that window.',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/closeout/evidence.json',
    baselineSha256: 'aa096be5d236d60f9f673eb850f3ed296021fceda212e28ab810b6a38562c898',
    sources: [
      {
        path: 'packages/pal-extract/src/io/sss.ts',
        sha256: 'a1f950905bdeb18baef4086203a4e3590c2b43a71150c7d0a0dca2898842a518',
      },
      {
        path: 'packages/pal-extract/src/io/sss.boundaries.test.ts',
        sha256: '617dd83725bacfe92ca0af771cb3fb61b5b41ff1e801d46c0b22bef28da11eff',
      },
      {
        path: 'packages/pal-extract/src/io/sss.test.ts',
        sha256: '34207e32602a42b6d2390e7a11e9cf78e44341555f2e3db9376008383fac254f',
      },
      {
        path: 'packages/pal-extract/src/__tests__/glm-tb04-fixtures.ts',
        sha256: 'aa81e2e672a88a28eaa24acf2e123f1b672f260f073499e14cfe2fa1a3173d2c',
      },
      {
        path: 'packages/shared/src/mkf.ts',
        sha256: '7d4504527745800dee8ef1675269c6385ff028896d322f4fb66fde378bfc42cc',
      },
      {
        path: 'scripts/coverage/config.mjs',
        sha256: '9845f41bf51e01b1ec809c7515305ec2534aff59b9e7c3c7557db1c68bdcca35',
      },
    ],
    packages: {
      'pal-extract': {
        before: {
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
        after: {
          statements: {
            covered: 1078,
            total: 1542,
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
            covered: 953,
            total: 1364,
          },
        },
      },
    },
  },
  // Approved legacy OGG deletion and current-direction ownership; exact measured snapshot.
  {
    id: 'pre94-input-ogg-retirement-20261021',
    authority:
      'User2026-10-21 explicitly approves unused OGG retirement and SDLPal direction fix; standing2026-10-20 authorization permits exact measured baseline adjustment after reasonable cleanup,never weak tests/dead code restoration.',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json',
    baselineSha256: 'b85f8a6a5e4dc684f220c704103a6d83f54b968a074a7a89111614ecfa2cbdae',
    sources: [
      {
        path: 'packages/game/src/core/scene-system.ts',
        sha256: '861d2e43437970d01a59a4507f8165e954057c343c35739b51ec226e812a1cdf',
      },
      {
        path: 'packages/game/src/shell/audio-midi.test.ts',
        sha256: '7f202281beb0e1c7222b41895aa646737620daa83664ae2568b810520fc6ee17',
      },
      {
        path: 'packages/game/src/shell/audio-midi.ts',
        sha256: '505aacc33f806af3fcbf522b4342a891bbf3ea591d9e1eef52000ca89199baf4',
      },
      {
        path: 'packages/game/src/shell/audio-volume.ts',
        sha256: '2cf70c4cf469c3b337341f999018bfa5f82ab3b21c9a2d95a3794c1c3dc17778',
      },
      {
        path: 'packages/game/src/shell/audio.glm-phase1-leaves.test.ts',
        sha256: '8745b7ef54dd4ed3593d043c87c4a5e6e7694fbde4ac80030fb271f98cb1f6f8',
      },
      {
        path: 'packages/game/src/shell/audio.test.ts',
        sha256: '080bf74a0a111219093299908f93728d44c8735dbfbf3c3bb1f6ce86a56f1475',
      },
      {
        path: 'packages/game/src/shell/audio.ts',
        sha256: '7feba4baae97b20fd367c097f8c6aed2d5a62ced1d2f5ed17c993a7b92bb6f52',
      },
      {
        path: 'packages/game/src/shell/avi-player.ts',
        sha256: '495d3f4c95180244a3f4edbfadb23154604f4c33eeeb1ba12e7db31ed847c5e4',
      },
      {
        path: 'packages/game/src/shell/bootstrap.ts',
        sha256: '67f008abc2d6013744ce84049556cf987c1c76aff605bc912377f166445c9c8a',
      },
      {
        path: 'packages/game/src/shell/input.test.ts',
        sha256: '6b2629e4f965c32476a799255fea0c54c8303c87a9728a7a599c38cdcbbd4c4d',
      },
      {
        path: 'packages/game/src/shell/input.ts',
        sha256: '1798b523ecbb3594a8144697844531d955acb23e0b701f7474d66630f15a0704',
      },
      {
        path: 'packages/game/src/shell/main-loop.ts',
        sha256: '01842b519dd9bc8bee3a221c962d2c9cdec043f7c912f848efd2ef3e1c559847',
      },
      {
        path: 'packages/game/src/shell/music-source.ts',
        sha256: '5ec5f2a68a4214cda4ba75b585d704ef8a32deb5fa26e01b97ac7c9028cfff4e',
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
            covered: 14307,
            total: 16042,
          },
          branches: {
            covered: 9333,
            total: 11622,
          },
          functions: {
            covered: 1672,
            total: 1961,
          },
          lines: {
            covered: 12758,
            total: 14059,
          },
        },
        after: {
          statements: {
            covered: 14286,
            total: 16019,
          },
          branches: {
            covered: 9331,
            total: 11618,
          },
          functions: {
            covered: 1668,
            total: 1956,
          },
          lines: {
            covered: 12738,
            total: 14038,
          },
        },
      },
    },
  },
  // Exact covered guard-line retirement; old baseline +9 pinned module inputs only.
  {
    id: 'pre94-shell-dead-dump-20261021',
    authority:
      'User2026-10-20 permits exact baseline adjustment after reasonable refactor; this removes one private unreachable dump branch,not tests or live behavior.',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json',
    baselineSha256: '800d61d3cefe3b3795ef3ccaf5d6146d02698fbb493b691feaa19531948c0f18',
    sources: [
      {
        path: 'packages/game/src/shell/__tests__/audio-element-fixture.ts',
        sha256: '15ad51f2efbeed5325590f3d110ea35683bdc779b855e68107ed814f106cfdc8',
      },
      {
        path: 'packages/game/src/shell/audio-midi.ts',
        sha256: 'acff05c05fe6ac204f8c5d050fba2768da0c8254da8488795605bca3c5a47322',
      },
      {
        path: 'packages/game/src/shell/audio.glm-phase1-leaves.test.ts',
        sha256: '80758a5d5799b736eda79c98b1fab76d0b6720653381aea650e85d4726f4f1b7',
      },
      {
        path: 'packages/game/src/shell/audio.test.ts',
        sha256: 'ec1b6053b13e148ab4560f4995b5c22d115f8d0de62d4736f4e3926699c5159d',
      },
      {
        path: 'packages/game/src/shell/audio.ts',
        sha256: 'bef9ea3289e8c76e3694151346a3784983bae153c4446a21bea3a2fdae578d2e',
      },
      {
        path: 'packages/game/src/shell/avi-player.glm-next-wave.test.ts',
        sha256: '4b874a206b4b33aeb97b8656ce57cfb5d7f7472974cea9de6b460421895bef2d',
      },
      {
        path: 'packages/game/src/shell/avi-player.ts',
        sha256: '848064b0d0c20f39930754af0686af38f3a1cf032011289cf7f57fad3a553216',
      },
      {
        path: 'packages/game/src/shell/main-loop.ts',
        sha256: '01842b519dd9bc8bee3a221c962d2c9cdec043f7c912f848efd2ef3e1c559847',
      },
      {
        path: 'packages/game/src/shell/rng-player.ts',
        sha256: '726d13f8e6293bb3f50ef42637f3a45e54f20f7d66bb7a9c056c78d3b15c6f04',
      },
    ],
    packages: {
      game: {
        before: {
          statements: {
            covered: 14308,
            total: 16044,
          },
          branches: {
            covered: 9334,
            total: 11626,
          },
          functions: {
            covered: 1672,
            total: 1961,
          },
          lines: {
            covered: 12759,
            total: 14060,
          },
        },
        after: {
          statements: {
            covered: 14307,
            total: 16042,
          },
          branches: {
            covered: 9333,
            total: 11622,
          },
          functions: {
            covered: 1672,
            total: 1961,
          },
          lines: {
            covered: 12758,
            total: 14059,
          },
        },
      },
    },
  },
  // Finite user-authorized glyph-shadow/count sharing; exact baseline +19inputs.
  {
    id: 'pre94-present-glyph-shadow-20261021',
    authority:
      '用户2026-10-20：合理重构造成覆盖率下降可精确调整baseline；本项仅font同体字形阴影共享及confirm委托既有色规则，不恢复死代码或堆弱测试。',
    evidence: 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-recount.json',
    baselineSha256: '6a101c82be5991859d874e283d38d19b37a5ec9e1a8ad16a23918033210425ca',
    sources: [
      {
        path: 'packages/game/src/present/draw-sprite-clip.grok-r1.test.ts',
        sha256: '72e2e06ce3b72b4877c9b24cfe064699a880efe1d95394f7d3e30f53ea0d006d',
      },
      {
        path: 'packages/game/src/present/draw-sprite.test.ts',
        sha256: '7b362e551d29920b87d3739da0d0d377429f65019f945c380f7336887977f364',
      },
      {
        path: 'packages/game/src/present/draw-sprite.ts',
        sha256: 'bd2fbc1abb0527267b032298e779ac5946089745fd83159181dd0af84f8ffcef',
      },
      {
        path: 'packages/game/src/present/follower-render-gap.grok-r1.test.ts',
        sha256: '546e86fa49e027289554d79297578a163b177358774b1e65253a247f00a326cc',
      },
      {
        path: 'packages/game/src/present/follower-render.test.ts',
        sha256: '4b7e687c809ce88817f668231a9881012b3fcad0cdb6dfd0485e7e854a315d75',
      },
      {
        path: 'packages/game/src/present/follower-render.ts',
        sha256: 'fe1bc4db16a6e3732cadaecc8247028c12209974ab8d03f4aa4432af7ce00e29',
      },
      {
        path: 'packages/game/src/present/font-width.grok-r1.test.ts',
        sha256: '1b5024cd2d448c38a619cb8a545a3c92d51851185b7b1b7fcaf54a819cb616f3',
      },
      {
        path: 'packages/game/src/present/font.glm-phase1-leaves.test.ts',
        sha256: '5d96d0ae5501f96c5a7075ce996c3ac2a3b586f52641cf9198eb00c73174c693',
      },
      {
        path: 'packages/game/src/present/font.test.ts',
        sha256: 'd502acc90f477b56a28eef745e17e4f219514ffacb9bbcf96d39992d3219cc6f',
      },
      {
        path: 'packages/game/src/present/font.ts',
        sha256: '0af092f60efef7dd1f39c82f4c492512dbf957092f0d20b13da27b5518fd7fe4',
      },
      {
        path: 'packages/game/src/present/menu/box-shadow-pixels.grok-r1.test.ts',
        sha256: '4adaf21e23bfd2d6da685430c237e7f1549377001d5fef2ea23145829650fee6',
      },
      {
        path: 'packages/game/src/present/menu/draw-box.glm-phase1-leaves.test.ts',
        sha256: '2ddaa6efbaf2016f40191c7c8cf49f77191ad62c187c76a2ac25aaa5e54c4295',
      },
      {
        path: 'packages/game/src/present/menu/draw-box.test.ts',
        sha256: 'a5fa29d9b440cebec03a20be4014696c47c3c14c3034d37e06dcb876cc1fe173',
      },
      {
        path: 'packages/game/src/present/menu/draw-box.ts',
        sha256: '2ab2d6e4aafcaa9848cab7e74ccfef8ac0669678a4f4fe58c7577ac89bafb4b4',
      },
      {
        path: 'packages/game/src/present/menu/draw-confirm.glm-phase1-leaves.test.ts',
        sha256: '4f6eae08db3ab3cecddcba64a72ae62e4a51f62963954d01ce3ad74836d7b9d2',
      },
      {
        path: 'packages/game/src/present/menu/draw-confirm.ts',
        sha256: '3488c60aac789360d5c9c49c78bb00a47120213f8b02bbb7342a3279d3a45b2d',
      },
      {
        path: 'packages/game/src/present/menu/opening-confirm-pixels.grok-r1.test.ts',
        sha256: '1fc84cda595debed5b09e20db9d24a79edd1c44b1bbf030717e9f2cedea02abf',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.mjs',
        sha256: 'ce02d41304b559b03c9c15c93e574ca48daeaf1352dac8cc3e71710b9ddaa84c',
      },
      {
        path: 'scripts/coverage/approved-test-retirements.test.mjs',
        sha256: '6fcc0dc1cfc9407be68f3a32c9f31ba919de6762441ba777affb9967a09498df',
      },
    ],
    packages: {
      game: {
        before: {
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
        after: {
          statements: {
            covered: 14308,
            total: 16044,
          },
          branches: {
            covered: 9334,
            total: 11626,
          },
          functions: {
            covered: 1672,
            total: 1961,
          },
          lines: {
            covered: 12759,
            total: 14060,
          },
        },
      },
    },
  },
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
