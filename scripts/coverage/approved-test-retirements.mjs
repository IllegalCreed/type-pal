// Authorization is per batch/entry, not inherited from a ledger-wide approval.
// QUALITY-OPQ-RETIREMENT-1 (2026-10-03) covers only its original five snapshots.
// Later rows need their own authority; the old five-file approval does not extend.
// Six snapshots used by f544b9b94: see receipt-audit/retirement-authorizations.json
// under docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates.
// Those instruction sources are not individual user signatures or a general waiver.
// Exact historical snapshots only; this is not a scope-removal switch.
export const approvedTestRetirements = Object.freeze(
  [
    // User2026-10-27: precise quality deduplication and current-producer transfers.
    // Six exact main/current snapshots and case maps: QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/recount.json.
    {
      file: 'packages/game/src/assets/scene-cache.grok-r1.test.ts',
      previous: 10,
      current: 9,
      previousIdentityDigest: '2c89a4bd5f39660f4ce2e3f5f787315dcf4d0b42316d2f19081cbb71b3e3644d',
      currentIdentityDigest: '2e552d12f8025046b8d606a859e535ac238490018c8bc7f1e774b01728be6ff9',
      fileSha256: '4ab6a1fa912fdfed0b961bf43b0734c7d69a41eb5e7b61eedc98d7da61e6dce0',
    },
    {
      file: 'packages/pal-extract/src/events/disasm.test.ts',
      previous: 14,
      current: 12,
      previousIdentityDigest: 'dca24c92e2400cf3ca1bb44e766a8dbe4d5973cbd7be7b72302f8295ce966231',
      currentIdentityDigest: '93ecb99064c0a8c6470bb4b1a04cecd461d812c7c4beeb49db35a83e57a2bd56',
      fileSha256: 'eeb11963b6761c5ad16694df2046aab3e1a627161af891f2e1f613e8eef70df2',
    },
    {
      file: 'packages/pal-extract/src/font/__tests__/bdf-to-json.test.ts',
      previous: 2,
      current: 1,
      previousIdentityDigest: '6425f15ef52f6ae8b40a6a935b681135fd32f543868dbe503ff04246003f9db0',
      currentIdentityDigest: '7c43f1b9f85de76953cb3d5c5dcaec3deed77620c0c60fec69ce619797922e30',
      fileSha256: 'cd19f360ffd314bf602920c5f5bfcc47e7d5ebe52db872300d56741742e2d4d6',
    },
    {
      file: 'packages/pal-extract/src/io/rle.test.ts',
      previous: 3,
      current: 1,
      previousIdentityDigest: '89cb40d8b1829accec2a93a68df4cf412aed9e214614fa7a74476eb423140fad',
      currentIdentityDigest: '108ccdbbdb6ab7c57fe9093600aa6312f45519209ffa16350f20ad9c493b34a1',
      fileSha256: '16b2f6ab8b5cfe0a5b1aa2203aa45e16033085bf84cd7a79264289861f18b074',
    },
    {
      file: 'packages/pal-extract/src/resources/scene.test.ts',
      previous: 5,
      current: 3,
      previousIdentityDigest: 'e38950e400c0826b63c6586c882c6b8ce3d73422e4c194dce86ffe9db5f2037d',
      currentIdentityDigest: 'd69654b5cc00e9cf804bbe545d9f496e25f9ba1f4b6f77ab1d835923a2822054',
      fileSha256: 'bd602764b568f4a7610fd601d5dacca96abd3ab8dd9f55d1713489ef05851373',
    },
    // User2026-10-26 explicit sprite-wrapper and bus-protocol retirement.
    // Exact protected old/new identities and kept contracts: review52 retirement-freeze.json.
    {
      file: 'packages/pal-extract/src/resources/misc-guards.kimi-r1.test.ts',
      previous: 16,
      current: 15,
      previousIdentityDigest: 'fa35f09edc8a7c4eed46f61204faf8f6d027004ffc9a50c5d51957367f3ca3be',
      currentIdentityDigest: '3891ac1cd63e163a4ad2d00e5252529df678d763e79c34118d8ea5ec6b6cb504',
      fileSha256: '229c6433140e78fcb7df5a9e8a4e576698ff7cae3909011316f19718db2d9790',
    },
    {
      file: 'packages/pal-extract/src/resources/sprite.glm-runtime-resource.test.ts',
      previous: 4,
      current: 3,
      previousIdentityDigest: 'e4c4d3dcb8cc086f2825b866b2e8fe9c9177d3abfaf60278710b2a08d82cbc66',
      currentIdentityDigest: '6fd045f04a02606659fcd8ee87364fad16b5ab4ea38c82f9ad98c14f362a10d9',
      fileSha256: 'c02fe8adea672225ac43017baa84d1b0039a23e762d6b24487455890e11acc80',
    },
    // User2026-10-25 approved old-menu API removal; exact per-file mappings
    // and native originals are in CODE94 approved-closeout. Predicate unchanged.
    {
      file: 'packages/game/src/core/menu/__tests__/primitives.test.ts',
      previous: 18,
      current: 7,
      previousIdentityDigest: '02f0e03fcd5d9af00f5b6b64d1f576581ca42e8a7ed07476c613834e68d8424a',
      currentIdentityDigest: '53e74497733cfa8a25fe094f17a8b901cea1d00388db38073602a7fc73867df0',
      fileSha256: 'f2a43473509d2a9fd6ea9bba334b027e6398f4c6fdb2ffd971944e00ff0031c3',
    },
    {
      file: 'packages/game/src/core/menu/primitives.glm-phase1-leaves.test.ts',
      previous: 10,
      current: 3,
      previousIdentityDigest: '4eb15ca39810af7ebf75ce75bc07cc15795205e3558d5344d09ff856825174ea',
      currentIdentityDigest: '7abcb86c340744e419d790ba59860e9fd5444cac3e3b2aaa3c3bf597ada34b1f',
      fileSha256: '3deb623f2073ddf3b08aa8f459cf177f0bf9aec9a4c62f6cfe0e021944f4b0f9',
    },
    {
      file: 'packages/game/src/core/menu/item-select.glm-phase1-leaves.test.ts',
      previous: 8,
      current: 5,
      previousIdentityDigest: '3693e9e4c0a653f71743386441f80365952db3433f2bef9e24d57bf010a36779',
      currentIdentityDigest: 'edc458e8a07d95e035a9c4394f10e2d297ff1db3d19af78caf395584e1a8a236',
      fileSha256: '767dc6720228343197421a3e4e2a80237ca87a30fa3c8f1cff0fb77cf72276fa',
    },
    // User standing exact-dedup/dead-code authority; CODE42 getDialogBoxRect had no production/E2E caller.
    // Two exact placeholder-only identities removed; mapping and official/native snapshots: final-pre94-gates/recount.json.
    {
      file: 'packages/game/src/present/dialog-box-chrome.grok-r1.test.ts',
      previous: 13,
      current: 12,
      previousIdentityDigest: '16800c9fcd0d82decff30d83e1b96334e318c89618fe216c66e5f810a7fa6480',
      currentIdentityDigest: 'ac2379ec430460fc1ab5b6f2c13672192b3ef5930ac12a7c4bb1adf3c1a4a97b',
      fileSha256: 'a91059d33c007b149b7ada27401f85952aa7dd5f6acb523f1273e9f42a4d7b0c',
    },
    {
      file: 'packages/game/src/present/dialog-box.test.ts',
      previous: 69,
      current: 68,
      previousIdentityDigest: 'f6d9ffd17c974be20f3ec3f3582735926eac4be082e46ee0c61dcdc3a394fe2d',
      currentIdentityDigest: 'b4234ba5b207bef23640e8280bd55b65bef884176645266f9b0e3bf0868d2470',
      fileSha256: 'bb5f191093ab1ed738bd4df29af5a18c3add9a88f07b0725f97a610bc052c6fe',
    },
    // User2026-10-24 pre94 quality scope and standing exact-dedup authority.
    // Same-position keep assertion transfers to exact append content case; see battle-dialog-quality.
    {
      file: 'packages/game/src/core/battle/__tests__/battle-dialog.test.ts',
      previous: 13,
      current: 12,
      previousIdentityDigest: 'd9312ec7b02e005ff9672d5ee6cd7c11e635567afda9e5e72744822eb5aabafa',
      currentIdentityDigest: '6b709c786a9223c79b41388d0276195dd1de1fdd0031f73bb713c03ad900238f',
      fileSha256: '87f17696fe6e5fb649601a6fb27212f0e6d872964a9dc7c1dbc507e65b5982cd',
    },
    // User2026-10-24 current pre94 test-quality instruction and standing exact-dedup authority.
    // Two overlapping contracts retained in full-status tick and dependency-ownership history.
    // Native identities/old-to-new assertions: pre94/battle-core-fade-quality/review.json.
    {
      file: 'packages/game/src/core/battle/__tests__/status.test.ts',
      previous: 7,
      current: 6,
      previousIdentityDigest: '1f95c2cb88e3d8c93e43de80d5147f78689862c5f1617119c3aa48d6ed515ca8',
      currentIdentityDigest: '45304ac5e9e9f9e2585e43044c735be396fbb6c9ee41395ebca6939f787a8026',
      fileSha256: 'c6db00a9d1c3963487abda7a03d7bc49e90065eee560029062050ee8a8d6aca3',
    },
    {
      file: 'packages/game/src/core/cross-module-boundaries.test.ts',
      previous: 4,
      current: 3,
      previousIdentityDigest: 'a37e666648b00c40c4a54d437302c013d4beb32cf977edd8173cfd48f49848d6',
      currentIdentityDigest: 'e2a7fe63737fff4194259ab6816da594b10219ae9dcd5649e30e88e9baf9cb4f',
      fileSha256: '18349e6552d9b5bf181d60db94a207b9a055bf4c2d76bbb72337e4d5575887c4',
    },
    // User2026-10-24 pre94 test quality / standing precise-dedup authority.
    // 32 cases move to collision/loading files; 4 redundant cases merge into stronger oracles.
    // Native all-111 mapping and business counters: pre94/scene-quality/review.json.
    {
      file: 'packages/game/src/core/scene-system.test.ts',
      previous: 111,
      current: 75,
      previousIdentityDigest: '83990a58b44244ed68b06125a966cc2dbae7ddcfab70c32eb4b3de8f2b891e18',
      currentIdentityDigest: '2f450b9636dcd731c5fb1445ce2147aae9829a21783375cd170ed8c7102a1a77',
      fileSha256: '5be484c2c918aca6514b86eb638dd224638e6f22322725274e0f866f37b4633e',
    },
    // CODE3l: standing user authority for proven dead-code and duplicate-test retirement.
    // Exact old-to-new contracts and native originals: pre94/battle-present-quality/review.json.
    {
      file: 'packages/game/src/present/battle/__tests__/draw-battle-sprites.test.ts',
      previous: 51,
      current: 40,
      previousIdentityDigest: 'ad981d1daf19bc820424df598189311402fbdb6c5c3537d2cf3652ac7c9aef56',
      currentIdentityDigest: '189ff0e5a0f5f6a61faf4c7cb1ff117f98b293fa1a2c5a2978c85fb0e9d2be7b',
      fileSha256: '7cd301dd7793d46158b3ff2ce9795c685ce6df42e49d38b07a7f668a69b9dc2e',
    },
    {
      file: 'packages/game/src/present/battle/__tests__/draw-battle-ui.test.ts',
      previous: 31,
      current: 21,
      previousIdentityDigest: 'aa82218faf15e82bb4436380f9c087b58fe8447b2100cfb39ab7f33fa3a3787f',
      currentIdentityDigest: '2f12e8c8f92e6f2e77adb15780750428dc1ee43c7adadfc056dcc9ec1e3ea9d3',
      fileSha256: '04ede6eb0d4e913868d4d1f1c211af2495d41cf0598633535af4cbb41d1457bd',
    },
    {
      file: 'packages/game/src/present/battle/__tests__/present-battle.test.ts',
      previous: 25,
      current: 20,
      previousIdentityDigest: '01b1c8c92a9f600c8c89a3a5ea69bb551637092d5ce7ae454e2afffdeea7a427',
      currentIdentityDigest: '48eef6b9d9961afd1bafa9f50f22a811ded7a901e6dd262b32e9c74bc36b22ed',
      fileSha256: '1867a092d5873b149574fdafb4602b062845ee2487f706de1b2e69f08f258d0d',
    },
    // CODE3k/3l: user standing precise-dedup authority; full old-to-new contracts,
    // native identities and restored counters in pre94/present-primitives-quality/review.json.
    {
      file: 'packages/game/src/present/battle/__tests__/draw-battle-num.test.ts',
      previous: 6,
      current: 4,
      previousIdentityDigest: '38150445e96fa2cca4cc74c403bfccced5cb710078e81987c0b944bfb4da9d17',
      currentIdentityDigest: 'd85730d4dca5aa15f086b4be5d36bbf60ce68acde86aca8048e89b8eab56f074',
      fileSha256: '9bfe64fbda591834aa6bb05b1941a9fee98468849c6897e8c0f74984d7621f23',
    },
    {
      file: 'packages/game/src/present/follower-pos.test.ts',
      previous: 10,
      current: 6,
      previousIdentityDigest: 'f13e4b4b9aee465fa9e971e72855969d1fcd5a18b937919f4bd52d7e2aacb5ab',
      currentIdentityDigest: '3bb146a4417fe7ff1cb44734217c648681b7a18ca60cac1298bd81361edfdb49',
      fileSha256: '2c6989647938b42e379a0ffaee99baa64aec72b9544da42a44033c58dfb8576c',
    },
    {
      file: 'packages/game/src/present/screen-shake.test.ts',
      previous: 6,
      current: 4,
      previousIdentityDigest: 'af7db43d48d4075af846b424197df1c5d45355f90a13a0445c18a1cab5cf839c',
      currentIdentityDigest: 'd13d4597f2e42ee8ad27557c649281cc8cd285c5d8c18cfeb1f700d31061b158',
      fileSha256: '947d456cc8f6d9aad80bd2f4f590ce0f4b6e94a2ddffe0813171d30ff489e786',
    },
    {
      file: 'packages/game/src/present/screen-wave.glm-phase1-leaves.test.ts',
      previous: 4,
      current: 3,
      previousIdentityDigest: '70528b5a0ff7aacfe8af752c9e5975b539ca626577e262eb5642300af647c418',
      currentIdentityDigest: 'a45176126d36651bc0adc70e42d04508f008d89837d9d37ccb6e4fb151243fa7',
      fileSha256: '7a0758ed115203df0d0cea41cf5f2beb95120a25985d482a65f00c72f78f7a81',
    },
    {
      file: 'packages/game/src/present/screen-wave.test.ts',
      previous: 5,
      current: 4,
      previousIdentityDigest: '7848c46807ad12cc7d2b374016f72eb559824047e8ffe214c6dcb06103813bf7',
      currentIdentityDigest: 'a935519fd611da8df3e47453c7f0890ffa7574a3b8c54a5fe2b5a1e4ffc24063',
      fileSha256: 'aa3c4e54215380dcbfab2919839b9a716c11ebc22156d699fb94734032eeceff',
    },
    // CODE3i: ready-after start/pause/resume duplicate transfers to the exact ordered
    // main-client protocol case; the unique early pause/resume negative remains.
    // User current 3i test-quality instruction + standing precise-dedup authority.
    {
      file: 'packages/game/src/shell/precache-client.glm-phase1-leaves.test.ts',
      previous: 2,
      current: 1,
      previousIdentityDigest: '9fa0085a93536699ce589564f03b6e71870cb1d4f1e27f54ea7324272d3b2fd3',
      currentIdentityDigest: '0182a4e4b78c1559218f78ed2c14f34f32e33ab4550ff12e037a8e7211ce56b8',
      fileSha256: '67256f548bd47c406cfecaaedd1bcff9dec9ad005d5a3342ffeea5f1b717be5c',
    },
    // CODE3h: four shared-codec repetitions transfer to existing canonical full-plane
    // oracles; internal game facade keeps only its live dialog entry.
    // User current RLE dedup instruction + standing test-quality authority.
    {
      file: 'packages/game/src/assets/rle-decode.test.ts',
      previous: 6,
      current: 2,
      previousIdentityDigest: 'b202ef061bcbad3589734304e5ec144778120cd6aae2d4ed2121be7eb8054503',
      currentIdentityDigest: '4ae69c1cb9241cc4431fa204e693d41ffaa5295e4567767f42252ab5b3fd0b17',
      fileSha256: '37f6896cfc773c970652f0aab175160a47f2df5f64c99f08cf0b99a0954e9284',
    },
    // CODE3h blob/dialog exact snapshots: standing user test-quality/dedup authority.
    // Full assertion transfers/native identities: pre94 3h/blob-quality/review.json.
    {
      file: 'packages/game/src/assets/tileset-blob.test.ts',
      previous: 15,
      current: 13,
      previousIdentityDigest: '7b4dc1698d94e06f095034788959cbc4ff537728a57eb074e2720c5300ca716a',
      currentIdentityDigest: '244d7e5a4cf432f66ec318c9b50674abad671fceb88c3c21c58838a3a9cd6a8e',
      fileSha256: '60ac6e213354989a5e34a06612fc7917e48e349a6bc9e372c536fe10b362f1b7',
    },
    {
      file: 'packages/game/src/assets/tileset-gzip.grok-r1.test.ts',
      previous: 9,
      current: 8,
      previousIdentityDigest: 'd146d281cd8951bfbc2ca34be73029e821f9862816448b0fe2985424ee5a722b',
      currentIdentityDigest: 'd3d931a7a5d324bfea991d409a09a9c3d4cc46cfaca7c8dcf7529f3a573abad0',
      fileSha256: 'b855fe0b4072e7bc2f4c077aff77d8ed8bf2afc62a6d47d0f6ef8f4d77cd75e9',
    },
    {
      file: 'packages/game/src/assets/dialog-icons.grok-r1.test.ts',
      previous: 14,
      current: 13,
      previousIdentityDigest: 'e7d4c3d2569a08c09b8d0d2b0b8240ac22f018ea02bd64cd682552aac3b9831a',
      currentIdentityDigest: '0c8a791fb0ad1635ef9ff0823384c99b3718971fb0d80ea709882055b7335b66',
      fileSha256: 'c4acee0bdd146721ffffa1355c149c8b22e438033a0334bec60903cc220fd500',
    },
    {
      file: 'packages/game/src/assets/dialog-assets.glm-phase1-leaves.test.ts',
      previous: 2,
      current: 1,
      previousIdentityDigest: '55ea28df2daa97d3705047bae4dc387f5526d1891231c1f8ca39984152a961ac',
      currentIdentityDigest: '608c146cbe209e2e7b492d8e4fb89ea1dc756a13eb6b83c4820f26d730b1b933',
      fileSha256: '60bf26531054a6f3e213703a18edcb7929f9c4e9806dfb76b64b10eb245cd744',
    },
    // CODE3h: weak HTTP, generic hit and field subsets transfer to G01-B07/D01
    // and retained LRU results. User standing test-quality/dedup authority.
    // Exact contracts/native proofs: pre94 3h/assets-quality/quality.json.
    {
      file: 'packages/game/src/assets/loader.test.ts',
      previous: 7,
      current: 4,
      previousIdentityDigest: '5f98ca22f6e487c5cc5f4fef1b753d6f1bd87a962c0041c10d08262c34abb431',
      currentIdentityDigest: '8462c7758c5590e831f140d410f5f3708fab13e0a22a0c1315a639b22fd4f776',
      fileSha256: '9bfb8abd59603935e60ce8ee2baa2e9510b18a336244dc788bf272e12c01b437',
    },
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
    // User2026-10-25: six old item-factory cases retire;four real magic contracts remain.
    // Previous exact snapshot retained in Git and CODE94 approved-closeout mapping.
    {
      file: 'packages/game/src/core/menu/__tests__/item-magic-select.test.ts',
      previous: 10,
      current: 4,
      previousIdentityDigest: '6cfcd76b318d44b6db25ca39e8e2ba51e4ac4ad070be5ce8d15899d85e2c91a5',
      currentIdentityDigest: 'eff142c43507abf695d43361ef954cdc5fceb8da6750103eea868dc900311a30',
      fileSha256: '8bdf986b89edbc5f7b74cd28ae1eccea91854ea00861d5037e736d92cbfcc702',
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
    // User2026-10-25 94–102 quality repair and standing proven-dedup authority.
    // savedTimes=42 moves to the existing API list case; old approval snapshot
    // remains in Git and CODE94/current-review/review.json. Predicate unchanged.
    {
      file: 'packages/game/src/core/menu/save-slot-menu.test.ts',
      previous: 15,
      current: 14,
      previousIdentityDigest: '4338d808cd9f5745822ba6621d8a53a07ed8306eda97dd13d8d63e21ea808f63',
      currentIdentityDigest: 'f6a16d9a1cc984e5883367385e63e5417fae61b51a39366aac5c47eda15a582c',
      fileSha256: '5a5dbbf360731197f763bd93921e968db9b6602d64ba681597d935942636ff41',
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
      previous: 6,
      current: 3,
      previousIdentityDigest: '736f547d102e1581733d3aadae0328e7ce3d33d9f66d3383a97936a27601a7fe',
      currentIdentityDigest: '39245a5a74e429f89967f93523a8027a6762c7d39cdd9d6e3afa867ddf3b4fb2',
      fileSha256: 'b495592913a8458f125aa6025ee23074959d5b78f0d5325be345acea61989178',
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
    // User2026-10-03/18 precise-dedup + current complete-pre94 instruction.
    // CODE1 2026-10-25: seven main-suite duplicates transfer to retained full oracles.
    // All59 old identities/contract destinations and controls: pre94/rle/quality-closeout.
    {
      file: 'packages/shared/src/rle.test.ts',
      previous: 26,
      current: 19,
      previousIdentityDigest: '77d4afa83ab7f7792f5dc0bc5b87c06ee945e1869ecae9cd2091dc7841ffb72b',
      currentIdentityDigest: 'b4afaa74c82e91c72f3475ea86524a129114386269256f5f0c684c02cabe7975',
      fileSha256: 'ed84d346193a2001b271c65206d791405047e49841a4b191f81cdfbe241579b1',
    },
    // Historical CODE2b13->9 YJ2 move; current CODE1 GLM-o input-axis split has
    // twelve cases, so this old snapshot does not apply to the current candidate.
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
      previous: 4,
      current: 3,
      previousIdentityDigest: '16119a6654a2b67d2886ae0814162e008ca43071d4b243c61044345944ca3290',
      currentIdentityDigest: 'c5a738582c4539f2af688ac597869c823f2b7533f8863f5ac1040cd17119b61d',
      fileSha256: '58fa7709e4a859fdc57ab5eae736806a392e8cfe668df1c06c88e1ad05d097b7',
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
    // User2026-10-03/18/24 pre94 test-quality authority: two type-only cases, one
    // illegal caller and two JSON-self oracles retire; required fields migrate to
    // real save-io codec. Exact identities/proof: gamestate-save-closeout/review.json.
    {
      file: 'packages/game/src/core/game-state.test.ts',
      previous: 61,
      current: 56,
      previousIdentityDigest: '5c2929f5339eeef64004a6c7cb40a34c552cdd2b4f3c7d5fdddbcb690d500812',
      currentIdentityDigest: '0620f5871091791b7eeca26a9cdcdf4f77d446f9e019bc4d64912d7a26cb77a6',
      fileSha256: '59fa4eda5dc5f088df79d4e6c8e8bc0bb8c3d89c7b832967470cd714bb2b664c',
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
