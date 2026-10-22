// Authorization is per batch/entry, not inherited from a ledger-wide approval.
// QUALITY-OPQ-RETIREMENT-1 (2026-10-03) covers only its original five snapshots.
// Later rows need their own authority; the old five-file approval does not extend.
// Six snapshots used by f544b9b94: see receipt-audit/retirement-authorizations.json
// under docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates.
// Those instruction sources are not individual user signatures or a general waiver.
// Exact historical snapshots only; this is not a scope-removal switch.
export const approvedTestRetirements = Object.freeze(
  [
    // GAME-SCRIPT-CORRECTIONS-1: the runtime treasure patch and its two tests retire.
    // The same three rewards now have guarded extraction and real resource/caller tests.
    // User authorized both-phase script correction and corresponding test changes.
    {
      file: 'packages/game/src/core/event-system.test.ts',
      previous: 326,
      current: 324,
      previousIdentityDigest: '24e82b8729c2a4e0a52585be13715f384ba7f1d445b70d77004e6cd0169a1bde',
      currentIdentityDigest: 'fa4c6ed40c3eba6b3d4963a1656a864520a7519ac3554bb35e8fcae576310822',
      fileSha256: '8fbee836f3f25165daa6156cb807a515a746836040b9c6423869b4828fd75f96',
    },
    // CODE2 2026-10-21: later small-plane duplicate transfers to retained complete
    // MARK-plane delta oracle; exact failure-set subtraction in shared-codecs/evidence.json.
    {
      file: 'packages/shared/src/rng.boundaries.test.ts',
      previous: 17,
      current: 16,
      previousIdentityDigest: '31fb86b20cb39bf54a8c122f19b95557ad62adb4e3c7a7531d0daa15fef5fa7a',
      currentIdentityDigest: '3c4b172f0bad3cf14018ff9b65854fbfc9e34166ae10d579d63ab4f6167a9723',
      fileSha256: '941aa095d350a5b093e37b4de2ea082d92a74b7ec3f3c0e27bd3385153c3649b',
    },
    // User2026-10-21: delete unused OGG backend and its two release tests.
    // Current MIDI/RIX/manager oracles retained; exact removed identities and
    // source preservation proof are in the pre94 input/audio closeout receipt.
    {
      file: 'packages/game/src/shell/audio.test.ts',
      previous: 20,
      current: 18,
      previousIdentityDigest: 'b59841fd098d9d90e1af14028a26f84b385210e133c873934e4b4267d9650b7c',
      currentIdentityDigest: 'c8e6f8253b3f2f05dca3392a27a3f44e8b0f948687b66f3fabc40a2a6e1918bd',
      fileSha256: '080bf74a0a111219093299908f93728d44c8735dbfbf3c3bb1f6ce86a56f1475',
    },
    // User2026-10-20 complete pre94 + standing quality/dedup authority.
    // CODE43-47: exact duplicate/no-product/sparse-fixture retirements;
    // contract destinations and full native identities: present-leaves-local.json.
    {
      file: 'packages/game/src/present/draw-sprite-clip.grok-r1.test.ts',
      previous: 8,
      current: 7,
      previousIdentityDigest: '2d759a3882d8f4edb40a4fb51841e9b65904650f48a27eebdb35afcc5cece457',
      currentIdentityDigest: 'c99d72fdd8f7b69d34ab0c89bb705e289f73ff075b94f8ffb705c7104f5d1b3f',
      fileSha256: '72e2e06ce3b72b4877c9b24cfe064699a880efe1d95394f7d3e30f53ea0d006d',
    },
    {
      file: 'packages/game/src/present/follower-render-gap.grok-r1.test.ts',
      previous: 4,
      current: 3,
      previousIdentityDigest: 'f45e3d68b49b72d1355ddcf6455a174890504b6d9bb8882378952d257bd0152d',
      currentIdentityDigest: 'e5fe95c23e045031fe4aadc8c00e5409a10617fc2be2e35982203427f71b0063',
      fileSha256: '546e86fa49e027289554d79297578a163b177358774b1e65253a247f00a326cc',
    },
    {
      file: 'packages/game/src/present/font-width.grok-r1.test.ts',
      previous: 14,
      current: 10,
      previousIdentityDigest: '78375df326e9d603337bf01614068b5058b7ade1b5676fcd2ebfe4f9805e4fc4',
      currentIdentityDigest: '229690aeaad0984ebae36553d1bd131da7f90049eaeaaecb1dd10bcb900f436f',
      fileSha256: '1b5024cd2d448c38a619cb8a545a3c92d51851185b7b1b7fcaf54a819cb616f3',
    },
    {
      file: 'packages/game/src/present/font.test.ts',
      previous: 15,
      current: 13,
      previousIdentityDigest: '64c0e0987fa1dbf02d678d704405e0df9309afef0dcb1ee935eb27a508c30ce9',
      currentIdentityDigest: '3ad5f16d871ba526e0598c7c0cdc57a7f5108a4d2d5ecc332436e2775b5c4dc7',
      fileSha256: 'd502acc90f477b56a28eef745e17e4f219514ffacb9bbcf96d39992d3219cc6f',
    },
    {
      file: 'packages/game/src/present/menu/draw-box.glm-phase1-leaves.test.ts',
      previous: 5,
      current: 4,
      previousIdentityDigest: 'bdd0b805e6ed539b0d052213e7fca4ad029ea08817ccc4b0f8e25ee5496d5c2b',
      currentIdentityDigest: '0a0afb1cd010018b305e6c94f97425b71017b7e969aa4aa923a3f94b2948267b',
      fileSha256: '2ddaa6efbaf2016f40191c7c8cf49f77191ad62c187c76a2ac25aaa5e54c4295',
    },
    // User2026-10-20 complete pre94 + standing test-quality/dedup authority.
    // CODE51 weak cursor subset -> precise L12 colors; CODE54 test-only wrapper
    // -> public drawTilemap subrow/A01/A04 pixel contracts. Exact maps/native:
    // docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-local.json
    {
      file: 'packages/game/src/present/menu/draw-opening-menu.test.ts',
      previous: 7,
      current: 6,
      previousIdentityDigest: '0f01489a0ffa307688e36c0515eac199b8f77231e20db2230f76d7aab18f0bbd',
      currentIdentityDigest: 'dce325b87355bf895244e0efe2d15c34e2b3553355011d69adcf3edee8f21c9b',
      fileSha256: 'e95f8638f167900a8600086c126d1a770d04624793459cc37bbd69795e27dd36',
    },
    {
      file: 'packages/game/src/present/draw-tilemap-pixels.grok-r1.test.ts',
      previous: 11,
      current: 10,
      previousIdentityDigest: 'd98e3f0efa261f0ccd1787a599448288e91719dd49ca8bfb9c69e960c0b5b17f',
      currentIdentityDigest: 'f773a1c54f4691aa1f4d21cef18b0d2e7b41f0607b49ac7d965c77d0112dbcbd',
      fileSha256: '77d84c6b6a974bcb50631dcd3d59e18e3153d901016d5e0ea868fdac9bc82487',
    },
    // User2026-10-20 complete pre94 + standing test-quality/dedup authority.
    // CODE62/64/67: H07 and leaf duplicate assertions move to canonical detectors.
    // Exact transfer/oracle map: pre94 present-speedrun-local.json; no predicate changes.
    {
      file: 'packages/game/src/tools/speedrun/timer.boundaries.test.ts',
      previous: 6,
      current: 3,
      previousIdentityDigest: '663e4d930277b1e9f7c28485439836454d9c19035766385e7560d5747f07ac0c',
      currentIdentityDigest: '37a51262d5836e57f22ee399b9ce714585eab39e92ca2a22b7f60aedaca04283',
      fileSha256: 'd23e3b3a2e5cf85515c7769c4c8587b28f65e8ea429da916c7151110349b6d90',
    },
    {
      file: 'packages/game/src/tools/speedrun/detectors.glm-phase1-leaves.test.ts',
      previous: 4,
      current: 3,
      previousIdentityDigest: 'e9d38b19b402b9c9d27a5c4bfbbc09d523beef0622e11327334731bd5cad96a1',
      currentIdentityDigest: 'cf5817d2ba128fa2454d2414c2e3ce7996ed3198339a9fc1f7099ff606061248',
      fileSha256: 'c13eaf0ad4f95c7e0d4cddcaa71824b9b685872ff7a3b7098089b8928ea5eacc',
    },
    // User2026-10-20 complete pre94 + standing dedup authority. CODE88: identical
    // input as retained MP-sufficient case; exact label list already implies length=2.
    // No lost zero-slot contract. Proof: pre94 menu-core-closeout.json.
    {
      file: 'packages/game/src/core/menu/__tests__/item-magic-select.test.ts',
      previous: 11,
      current: 10,
      previousIdentityDigest: 'f7eb8ac2da235ba950efe122d8c30cd1f7303ad5c0711b42f30624bc8c4145da',
      currentIdentityDigest: '6cfcd76b318d44b6db25ca39e8e2ba51e4ac4ad070be5ce8d15899d85e2c91a5',
      fileSha256: 'ea9a22b9f58621ad3ac06ed0cd2a394292e1f29dbd086127daef819970ca89d6',
    },
    // User2026-10-20 five-card necessary rework + standing test-quality/dedup authority.
    // CODE90 seven weaker/invalid cases map to stronger retained tests;three names corrected.
    // CODE80 fake-mode party case maps to realstartBattle DOM lifecycle tests.
    // Exact native old/new identities,assertion transfers and business counters:
    // docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json
    {
      file: 'packages/game/src/core/menu/magic-script.test.ts',
      previous: 37,
      current: 31,
      previousIdentityDigest: 'b54cf21e965db09f3701c947dbb2401a5b4cd9ab1676d2e77a542cf41df4b9ba',
      currentIdentityDigest: 'b0cd51bab955bbc043143ffe6608ffd9a856f5e190cb85a66a313b49b2ecb228',
      fileSha256: 'e9128ddd85480e1230c2bde6b7eb809d1a28116d4b67266451a0d9afe1a4d796',
    },
    {
      file: 'packages/game/src/dev/dev-panel.glm-next-wave.test.ts',
      previous: 4,
      current: 3,
      previousIdentityDigest: '6e91e1d96388458d039cbc139fd7c10147c9c2b8d64d52cf06be428e753c8ac0',
      currentIdentityDigest: 'e4afc9331554032827966b60d868476397d5d8538d3e5f721eaa728484d28a70',
      fileSha256: 'ba9b3b17067c32305fc1f1dec50e7fc26bb6f2011da56a6171c9987f020f9c9f',
    },
    // CODE3u, Codex 2026-10-18: duplicate player-snapshot assertions transferred
    // to the stronger main case, including source mutation/isolation. Both old
    // and retained tests reject the missing-scriptPrevHp mutant. Standing user
    // test-quality authority; 2026-10-20 closeout forbids restoring weak tests.
    // Proof directory: docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3u-state-factory/
    // Files: assertion-transfers.json and snapshot-conservation.json.
    {
      file: 'packages/game/src/core/battle/battle-state.glm-next-wave.test.ts',
      previous: 4,
      current: 3,
      previousIdentityDigest: '1182f6845ae1357b585818e1f98fb31d566ea8969d71267e2d0adff61b1be558',
      currentIdentityDigest: '7905303e5cc3ae432c17e1bad4dd2a6700dab267a12f4fd80be2eee54e536686',
      fileSha256: 'cdbe9414af48e3da5dca54b77c7516f3df1ba5556ef0193adaa4771ed348128d',
    },
    // CODE-QUALITY-93, 2026-10-14: user-required precision/deduplication.
    // The non-empty shrink/clamp oracle remains in sell-menu.test.ts.
    // Pin this exact accepted file snapshot; no future retirement is authorized.
    {
      file: 'packages/game/src/core/menu/sell-menu.glm-phase1-leaves.test.ts',
      previous: 3,
      current: 2,
      previousIdentityDigest: 'dd67b18ef8f80d571eb72081f40814f9714ac2c3468eaa803997a21a09019064',
      currentIdentityDigest: 'fd69e9746ea0c03527cef4411f4cc5c0256daf750e7f15de7d9d5934cff1d7f1',
      fileSha256: '8d12759e5045d6cef2abcd52897ea9b1510c3ea0d89990e612f4a968e2509a5f',
    },
    // Original OPQ approval: only the following four migrate snapshots and render.test.ts.
    {
      file: 'packages/migrate/src/pal-authored-overlays.test.ts',
      previous: 9,
      current: 7,
      previousIdentityDigest: '780bbc530a2977c1c7de6f3eb811a1ff59dc437b1a60213bc65566bf2942a575',
      currentIdentityDigest: '7c1553cce3b077559d53217b63869f7010bffa6e8e478e3956b1955b8073b2eb',
      fileSha256: 'f6803fdee87e573551cca66c0f393a88030714e5ac5fd48b0325d5f072c7bc14',
    },
    {
      file: 'packages/migrate/src/pal-battle-sprites.glm-runtime-resource.test.ts',
      previous: 8,
      current: 1,
      previousIdentityDigest: '90fb15943fb53f520eaf141f163c7821bd4657773b6945078746086291e19bc7',
      currentIdentityDigest: '27764260b6d82fcc6c73213133c21ecabbc470544f4bf628a4b24ada7b6d07e0',
      fileSha256: '1da70dfe87bd21e56dd83fb1ab238ec2cc52f4f50a6149dc6bbed98094e9fb6a',
    },
    {
      file: 'packages/migrate/src/source-facts.boundaries.test.ts',
      previous: 3,
      current: 1,
      previousIdentityDigest: 'e1b7db2bd53c26f9bdbd36baf9ed1d9611dc7d95f92166622e724631157df3f6',
      currentIdentityDigest: '7e0720ea0cae3984fc77e0b590bc311ed6e25ff03165e5b61159370bcbafe7e1',
      fileSha256: '40500d5ed102f4dbb4a3873b18a49da80a8f93260b2a9a3a1bd8da3c6c5772c9',
    },
    {
      file: 'packages/migrate/src/world-sprite-layout-registry.test.ts',
      previous: 12,
      current: 11,
      previousIdentityDigest: 'baba8c49c53ef8a741ef1c605723ba72d227914206784bc3a5f719e12c8ff8ee',
      currentIdentityDigest: '1fa632b86555f5bd13b1050a308fd3f0b4267d6fe361da86e80a7bf83eb68849',
      fileSha256: '2aaef0130d9b20abe8af37183618648c82efcbb6fa15052b8f0e4b184fdfa3ea',
    },
    {
      file: 'packages/reforge/src/render.test.ts',
      previous: 5,
      current: 1,
      previousIdentityDigest: '9d10d12f28431582e8c59f761f4f03296f9e621129ff30389321edbe89d62deb',
      currentIdentityDigest: '6ff88bee5f7e7fd6fb2b7d4103d73c9db56948d05fabb39498f3746bdeb0cb4a',
      fileSha256: 'a4a475aea163b36b20a457cf1ca28805c2d3dec55c63e47d9b507e0301aed3da',
    },
    // User-approved 2026-10-15 CODE94 C5 rework (Codex codex-r2-review R2 counter
    // ordered removal of proven-duplicate / self-model tests; GLM handoff instruction
    // of the same date). Exact snapshots only, same rules as above.
    {
      file: 'packages/game/src/core/menu/equip-menu.glm-phase1-leaves.test.ts',
      previous: 4,
      current: 3,
      previousIdentityDigest: 'e78dc305842326ee719ff997624584df2de2b9e7156b5a2f56c18f6765c19cd4',
      currentIdentityDigest: '1889fb5557bfcc610ea4f3e25add02813e2c7044012cf70c08b8d61d30eac619',
      fileSha256: '5e3524a285f8ddf34e7fbe4f197b97cacdeee58ad716a62e1aaa7f2b0dc9ebf9',
    },
    {
      file: 'packages/game/src/core/menu/opening-menu.glm-phase1-leaves.test.ts',
      previous: 3,
      current: 2,
      previousIdentityDigest: 'bd2f2514088aac7ebd9d4c4dc924499c960d819ed3b6e12fad431342ef311b1a',
      currentIdentityDigest: '9f078317d0ffa967d9e6fb2731d2bf9899822c8f81e257bc30e61688bc087112',
      fileSha256: '28c3ba868156fd1db229dd152f030b5bb7e4b0e228e511a4beec88df974bea46',
    },
    {
      file: 'packages/game/src/core/menu/save-slot-menu.test.ts',
      previous: 15,
      current: 14,
      previousIdentityDigest: 'f8c83187e00a0e5bf0f71a81659c7d4aa219a17414f0851499cd440b2caf6581',
      currentIdentityDigest: '6490d967d5d342759dd36c5ee94f33b235394a5dd23d320da2b98b479ed52fda',
      fileSha256: 'e2292069dcf1c6b57cf31810d2ee10effa88a996746481fb16dd0ffd0f8c8174',
    },
    // User-approved 2026-10-03 audit baseline reconciliation. These six files
    // were already stale relative to main 8efe0486; pin exact identities so
    // protected strict distinguishes this migration from later deletions.
    {
      file: 'packages/content/src/author-flow.guard-residual.test.ts',
      previous: 9,
      current: 4,
      previousIdentityDigest: '13c27a6c3c9f584e6fb13ccd41bb3beb9babae9036d3e9458099726c04894162',
      currentIdentityDigest: '64753f83f76dc41707d78a06199f5032028c6b66025cb0da48666d78ef9934b0',
      fileSha256: '046c66948bf93089f7b11460186c6a6b53e193b9a77a7336bc6faf8d4bf4227d',
    },
    {
      file: 'packages/content/src/author-script-core.test.ts',
      previous: 29,
      current: 26,
      previousIdentityDigest: '5ae993ecc1564c1ee1e538e5b33a428358b17066e24c4faa07b7dafa7bbccdf3',
      currentIdentityDigest: '4cfa7567fa8108fbe66e33aa6dfab23513e7827def0b52ebc264572809793b54',
      fileSha256: 'c7b2af89257f6bda499ea2d89256b84bd8cd1de4c6326acef54d1a149f0f5b8c',
    },
    {
      file: 'packages/editor/src/ui/AudioAssetWorkbench.glm-ui-wave.test.tsx',
      previous: 3,
      current: 2,
      previousIdentityDigest: 'e370b496fa3aebb4ff5e099547f613f275bd9e75da39387e9d693b179a70f923',
      currentIdentityDigest: '241cacea581b93adf617e3c1508a6b503ab912341289a167bfa27e1d21df23c1',
      fileSha256: 'b5698bd4f76c53c0c770029b0e9ae7ccf3302a078a37236442b953f8b392088a',
    },
    {
      file: 'packages/reforge/src/script-compiler-core.test.ts',
      previous: 4,
      current: 3,
      previousIdentityDigest: 'c7cff4082e307f0846d3a517808774b79a9a1c428c0061ca9fd668a298565543',
      currentIdentityDigest: '271b8af0a37bafebbdcfe778e12e87885b6258410fbd735c0a0be485772cc87e',
      fileSha256: 'ec78840bce3538d8c8fd7078949e63a947e4f1e4eb25a84c10573ab3ac803633',
    },
    {
      file: 'packages/reforge/src/script-runner-core.test.ts',
      previous: 21,
      current: 15,
      previousIdentityDigest: '3eec519eab220a0dc8a05d9f214907f336aead009ee85be9606e39f7b170ca9b',
      currentIdentityDigest: '8c4e8aa7f8e757efd025dffb5ea8f33f465cb8b793c8a0242a32b4057833d791',
      fileSha256: 'f4cf0daa775d8e8f10b4ad88713b4e23ad9bef2abcac42ef9356759e0582c6a1',
    },
    {
      file: 'packages/reforge/src/script-world.test.ts',
      previous: 15,
      current: 12,
      previousIdentityDigest: '32466b8856fa1cdbd366d9396d95736c8da13f1e379c9c168919110c2d426c76',
      currentIdentityDigest: 'd9d50583a636a229d30864551087460355ef98c2a321bd28de2db76081e599ed',
      fileSha256: 'fa794cf41a5d96e9ab8d27943b99255a5a6399d1d9fcd9e19a7c21ebcddd6417',
    },
    {
      file: 'packages/game/src/core/command-bus.test.ts',
      previous: 9,
      current: 6,
      previousIdentityDigest: 'f2af6faf54355e2f5633a0dff4e18fe713f1df6557030db0450c43b9d91df796',
      currentIdentityDigest: '736f547d102e1581733d3aadae0328e7ce3d33d9f66d3383a97936a27601a7fe',
      fileSha256: 'e51a7c04e5236379f98f7ed851e45d9079cd4a09b645169546649b2f0bf2c93b',
    },
    // 2026-10-07 Codex accepted TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1.
    // Six old rows all exercised both version conditions; three independent
    // representatives retain those oracles and isolate the two conditions.
    // Exact authorized test-precision snapshot, not a general removal waiver.
    {
      file: 'packages/reforge/src/save/current-save.current-characterization.test.ts',
      previous: 8,
      current: 6,
      previousIdentityDigest: '32bcd877b5a9d4376e45c3b2514dcb6c9618b8e2969b9eff2b5581b806444db1',
      currentIdentityDigest: 'cf8fc4b33d31182258a66a795db02590d18e497ee54f25985b08087c9c384d23',
      fileSha256: 'ef558dde1c1fa027c448666aefd8e05a63e3c4e96ff0e4642618fccf49805ddc',
    },
    // User2026-10-21 explicitly approved QUALITY-LEGACY-OGG-RETIREMENT-1.
    // Supersedes the old GAME-RIX-MUSIC-1 live snapshot for this file; that exact
    // 3->2 approval remains in Git and the input/audio retirement receipt.
    // Only the unused OGG volume case retires; the MIDI no-WebAudio case remains.
    {
      file: 'packages/game/src/shell/audio.glm-phase1-leaves.test.ts',
      previous: 2,
      current: 1,
      previousIdentityDigest: '4266df0b0afa52f15590c4750f6d6033b93691311e52be95fcc96904fe7c36f5',
      currentIdentityDigest: 'bef7ce839ab718a0425a5f682b2682d9201a5c59202887e4d3cbeae1ca742fe3',
      fileSha256: '8745b7ef54dd4ed3593d043c87c4a5e6e7694fbde4ac80030fb271f98cb1f6f8',
    },
    // Codex 2026-10-15, standing test-quality rule: C01 G01-10/G03-09/G03-10
    // are strict subsets of G07-06/G03-04/G03-05. Exact snapshots, no relaxed matcher.
    {
      file: 'packages/editor/src/ui/WorldSpriteLibrary.c01.cursor-r1.test.tsx',
      previous: 70,
      current: 67,
      previousIdentityDigest: '46baea1df50d2f6a042bf0921c9e8d1bb1316a3a85a872893003acc20ba90386',
      currentIdentityDigest: 'c85fe64ea13ce0c0b0dd4c0042aada51629b133373157a3f7b4051b667a7e892',
      fileSha256: '3daa2ec60779d95959cbd21fcdbf120e48afe5844b327d45b0aea08da3079d56',
    },
    // Codex 2026-10-15: G04-04 disk restore oracles merged into G04-05 undo/redo.
    // Exact C02 snapshot under the standing test-quality rule; predicates unchanged.
    {
      file: 'packages/editor/src/ui/BattleSpriteLibrary.c02-g04.cursor-r1.test.tsx',
      previous: 10,
      current: 9,
      previousIdentityDigest: '7bf7e47e40a170aaa72d29130bc792cf3f7ab87aeeb1959cce36a31abdcd12b5',
      currentIdentityDigest: '7bb478138d4d76b9b49fb0e408de429bba1616f31e4e525237f457b4a026c44e',
      fileSha256: 'e967c34abf1c71d590cca61dcfd5ac8df3ba1bf208c8f3c3121b426ae3428927',
    },
    // Codex 2026-10-15: G01-02 draft-reset oracles merged into G01-03.
    // Same external shrink input; oracle-transfer mutants recorded in diagnostics-3.
    {
      file: 'packages/editor/src/ui/BattleSpriteLibrary.c02-g01.cursor-r1.test.tsx',
      previous: 10,
      current: 9,
      previousIdentityDigest: 'eb92a404a3d7f85c7e94297d886cf65acbe67907cd105149f07b1e4d6212f315',
      currentIdentityDigest: '941f34314dc0e9a0a11b92388b596b2a42ff37fdbb3b94b04f3999452e02f157',
      fileSha256: '43951ad480d24a6f28d84773741d3bbdf20d1a632300a444836195dbea740b13',
    },
    // Codex 2026-10-15 C08: G03-10 only rendered a test-host placeholder.
    // Actual viewer call-through positive/absence traces retained; exact snapshot only.
    // Human authority: standing-test-quality and warehouse-governance;
    // plus editor-review-scope. Codex decision 2026-10-15.
    // Exact human source IDs: receipt-audit/retirement-authorizations.json.
    {
      file: 'packages/editor/src/ui/SpriteResourceViewer.c03-g03.cursor-r1.test.tsx',
      previous: 10,
      current: 9,
      previousIdentityDigest: '5772ecfbe5ee2d180df9ff094b09cc394198efabe2ca48e1f8cf25182a4acdb2',
      currentIdentityDigest: '4fabf6e373581b9b37868b1092b6365d903c4943403d26b4c47b6adc9eef84da',
      fileSha256: 'b1af3b6bca4725a5d310818597bd8179f48d1a43b76a9abf03b59dd5b40bbcf5',
    },
    // Codex 2026-10-16 CODE2 rereview: the small-surface delta case is covered by
    // the full-plane preservation oracle in rng.boundaries.test.ts; exact snapshot only.
    // Human authority: standing-test-quality and warehouse-governance;
    // plus all-pre94-review-scope. Codex decision 2026-10-16.
    // Exact human source IDs: receipt-audit/retirement-authorizations.json.
    {
      file: 'packages/shared/src/rng.test.ts',
      previous: 7,
      current: 6,
      previousIdentityDigest: 'c82002802a1d8ed74b892153bb9044c639050feac85457c28c582dda4b46446e',
      currentIdentityDigest: '641b8706672be8b2cabcdef152037416505698c1a20c892a2d3da9964acef0e2',
      fileSha256: '5d7a5003aca652fd319118df5a73d85f101b2239f8ead7d15c192254c139101a',
    },
    // Codex 2026-10-16 CODE2b: four YJ2 cases move from this mixed file to the
    // stronger canonical byte/negative/determinism oracles; RLE bodies stay unchanged.
    // Human authority: standing-test-quality and warehouse-governance;
    // plus all-pre94-review-scope. Codex decision 2026-10-16.
    // Exact human source IDs: receipt-audit/retirement-authorizations.json.
    {
      file: 'packages/shared/src/rle.glm-o.test.ts',
      previous: 13,
      current: 9,
      previousIdentityDigest: '2bdb40b1ccfa60356eb0170a3115e9316fd93362296be501bd400ea6478f9400',
      currentIdentityDigest: '8fd8702977aa55db3bc17df8f85d0574cb9193e3390b5a94f828bdb7025bf848',
      fileSha256: 'b4ff29b83abd05b88307f3cad9eeed7957cc4508cda2f753c60925b20a97ddfc',
    },
    // Codex 2026-10-16 CODE3/3f: missing-name and raw passthrough oracles move
    // to the stronger boundary/actual-input suite; only this exact 9->6 snapshot.
    // Human authority: standing-test-quality and warehouse-governance;
    // plus all-pre94-review-scope. Codex decision 2026-10-16.
    // Exact human source IDs: receipt-audit/retirement-authorizations.json.
    {
      file: 'packages/pal-extract/src/events/annotate.test.ts',
      previous: 9,
      current: 6,
      previousIdentityDigest: 'a209db9c0916cd71bcd4b6890576e6ad6f7e6ef234cf9e2fe540f37f2457812f',
      currentIdentityDigest: 'd6cf3075334ed29bb5cc2e924d93771383fc3b4965f347d3208e1be6d689c62d',
      fileSha256: '3b9e4ee25e88f59523ce87daa23ee6ac627fcdb1669b7a09557452fc3e89093d',
    },
    // Codex C1: exact duplicate bare-prefix case transfers to the full PNG oracle.
    // Human authority: standing-test-quality and warehouse-governance;
    // plus all-pre94-review-scope. Codex decision 2026-10-16.
    // Exact human source IDs: receipt-audit/retirement-authorizations.json.
    {
      file: 'packages/pal-extract/src/resources/parsers/ball.glm-runtime-resource.test.ts',
      previous: 5,
      current: 4,
      previousIdentityDigest: '42d8a66508e7ba7a3f3a9e30c6b5d4bc29806a189bec974ca833395899822846',
      currentIdentityDigest: '2a3c1107905b8a668d0e63cb23d3cce8a8db28cab54c48637c4327e07dee7a7c',
      fileSha256: '1047364fe2958538103ab65aa398c695bd627d4f36fb1dffe8b4636d20aaef83',
    },
    // Codex C10: G07-03/09 weak subsets transfer to G07-02/04.
    // Human authority: standing-test-quality and warehouse-governance;
    // plus all-pre94-review-scope. Codex decision 2026-10-16.
    // Exact human source IDs: receipt-audit/retirement-authorizations.json.
    {
      file: 'packages/editor/src/ui/SpriteUploadWizard.c03-g07.cursor-r1.test.tsx',
      previous: 10,
      current: 8,
      previousIdentityDigest: 'fc9bebd5c34d31489d370fc8b30d8a8a594f9b5dcf137c62d7295eb15f9f44c4',
      currentIdentityDigest: 'c8eefd745361b56760813d1bdf57f471bf10377ee6a68f62709b93a54c56ab5f',
      fileSha256: 'ba9ef577509da8aa427dffaf37cddf56b92e95e9fdb8edfaa1498f93695d4bb5',
    },
    // Codex CODE3h: A04 and L23 bad-Blob subsets move to the full native cause oracle.
    {
      file: 'packages/game/src/assets/png-decode.grok-r1.test.ts',
      previous: 5,
      current: 4,
      previousIdentityDigest: '978aefb40b45b58a493b116319599673c4c3443a5efc0dedb7153100215f0e39',
      currentIdentityDigest: '16119a6654a2b67d2886ae0814162e008ca43071d4b243c61044345944ca3290',
      fileSha256: 'f5f9376a910a8ca5942e6339f1a5037029d02e9a732be47e3429df6601e75c15',
    },
    {
      file: 'packages/game/src/assets/png.glm-phase1-leaves.test.ts',
      previous: 2,
      current: 1,
      previousIdentityDigest: 'ae803708fa9f8fe2f30bff06fe7b74aaf02172f3db26a5f2bad4749e71370018',
      currentIdentityDigest: 'd7224527d2ccf4893eefb5ec6fad84b84b1d11824e99ecd7b6e5092affd7bd86',
      fileSha256: '5b087d2c8d8d530a3a5d8b636de3289354441b84abc95da121563eb51ab61428',
    },
    // Codex CODE3h bootstrap: glyph degradation transfers to the stronger held-resource case.
    {
      file: 'packages/game/src/shell/bootstrap-resources.test.ts',
      previous: 4,
      current: 3,
      previousIdentityDigest: '820efc27ef15c3c737fb37250049bcc193e09461862305b53dd1cd415ad22d24',
      currentIdentityDigest: 'a9f2fee19cf165466ec949abbcb3cb5a56d1edae92d106402365d34e495b96e9',
      fileSha256: '4ae59bab77937826270a8f005dd6ad4bd64a5f75668365ac09a1a697b8e1d47b',
    },
  ].map((entry) => Object.freeze(entry)),
)

export function isApprovedTestRetirement({ removal, previous, current, fileSha256 }) {
  const approval = approvedTestRetirements.find((entry) => entry.file === removal.value)
  return Boolean(
    approval &&
      removal.kind === 'test-count' &&
      removal.previous === approval.previous &&
      removal.current === approval.current &&
      previous?.file === approval.file &&
      previous.testCount === approval.previous &&
      previous.identityDigest === approval.previousIdentityDigest &&
      current?.file === approval.file &&
      current.testCount === approval.current &&
      current.identityDigest === approval.currentIdentityDigest &&
      fileSha256 === approval.fileSha256,
  )
}
