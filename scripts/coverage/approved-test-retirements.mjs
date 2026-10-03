// User approval: 2026-10-03, QUALITY-OPQ-RETIREMENT-1.
// Exact historical snapshots only; this is not a scope-removal switch.
export const approvedTestRetirements = Object.freeze(
  [
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
      fileSha256: '3d3d2ca26cdb812e7d4a789f12d1ac4961e2f592e39eb09e098ad28cb399b6b1',
    },
    {
      file: 'packages/game/src/core/command-bus.test.ts',
      previous: 9,
      current: 6,
      previousIdentityDigest: 'f2af6faf54355e2f5633a0dff4e18fe713f1df6557030db0450c43b9d91df796',
      currentIdentityDigest: '736f547d102e1581733d3aadae0328e7ce3d33d9f66d3383a97936a27601a7fe',
      fileSha256: 'e51a7c04e5236379f98f7ed851e45d9079cd4a09b645169546649b2f0bf2c93b',
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
