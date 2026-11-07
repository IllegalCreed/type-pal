import type { AcquisitionStage, AuthorAcquisitionFlow } from './item-acquisition.js'

/** Pure metadata projection, also usable by native Node script-governance tooling. */
export function acquisitionPreviewStages(flow: AuthorAcquisitionFlow): AcquisitionStage[] {
  return flow.recipe === 'builtin/item/pickup'
    ? [flow.stages.available]
    : [flow.stages.available, flow.stages.collected]
}
