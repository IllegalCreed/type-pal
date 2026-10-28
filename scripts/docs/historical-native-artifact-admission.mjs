import { nativeArtifactBindings } from './historical-native-artifact-bindings.mjs'

function freeze(value) {
  for (const v of Object.values(value)) if (v && typeof v === 'object') freeze(v)
  return Object.freeze(value)
}

// One native format, three existing document roles. No parent/default contract changes.
export const nativeArtifactContracts = freeze(
  Object.fromEntries(
    ['evidence-receipt-v1', 'test-machine-evidence-v1', 'archive-record-v1'].map((templateId) => [
      templateId,
      {
        templateId,
        variant: `historical-${templateId.replace(/-v1$/u, '')}-artifact-native-v1`,
        format: 'json-native',
        templateVersion: '1.0.0',
        metadataLocation: 'existing-current-review',
        purpose:
          'Explain a fixed historical native artifact without rewriting its machine fields or granting execution credit.',
      },
    ]),
  ),
)
freeze(nativeArtifactBindings)
const byPath = new Map(nativeArtifactBindings.map((entry) => [entry.path, entry]))
if (byPath.size !== 473) throw new Error('native artifact admission requires exact473 paths')
export const nativeArtifactAdmission = (path) => byPath.get(path)
export { nativeArtifactBindings }
