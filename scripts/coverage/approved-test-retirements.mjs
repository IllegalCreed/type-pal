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
