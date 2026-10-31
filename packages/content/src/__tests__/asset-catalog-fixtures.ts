/** Synthetic sprite catalog metadata for guard tests.
 * Shape alone does not prove file bytes or PNG validity; closure tests supply their own bytes/hash.
 */
export const spriteAssetRecord = (id: string, sha: string = 'a'.repeat(64)) => ({
  kind: 'sprite' as const,
  path: `assets/generated/${id}.png`,
  mediaType: 'image/png',
  bytes: 3,
  sha256: sha,
  origin: { kind: 'generated' as const },
  label: id,
})
