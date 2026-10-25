// Exact S48 pilot identities. Carrier provenance and historical source remain separate.
const pilots = [
  {
    id: 'A-red',
    path: 'docs/ops/evidence/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/mutation-logs/K1-cascade-layer-offset.red.json',
    family: 'raw-reporter',
    templateId: 'test-machine-evidence-v1',
    variant: 'historical-vitest-native-v1',
    carrierSha256: '669a6cfe04675a85682ab6d9157b06c9650d8d9167eaa2cccabe7e67cea21592',
    carrierGitObject: 'ed699c58ae8430f7812da5eb3a5b3e0d81003a5d',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r86-ops-evidence-artifacts.json',
    reviewIndex: 99,
    sourceSha256: '669a6cfe04675a85682ab6d9157b06c9650d8d9167eaa2cccabe7e67cea21592',
    sourceGitRevision: '664b35ad204ebb1fad93bb72a8cc29cb88ab412e',
  },
  {
    id: 'A-green',
    path: 'docs/ops/evidence/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/mutation-logs/K1-cascade-layer-offset.green.json',
    family: 'raw-reporter',
    templateId: 'test-machine-evidence-v1',
    variant: 'historical-vitest-native-v1',
    carrierSha256: 'd139e484b9b82e60f24a64043cbd4bf9be8f8f8bca92d034745215c6be9f309b',
    carrierGitObject: 'e88e8b058288762193f749f97799651d9905c366',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r86-ops-evidence-artifacts.json',
    reviewIndex: 98,
    sourceSha256: 'd139e484b9b82e60f24a64043cbd4bf9be8f8f8bca92d034745215c6be9f309b',
    sourceGitRevision: '664b35ad204ebb1fad93bb72a8cc29cb88ab412e',
  },
  {
    id: 'A-summary',
    path: 'docs/testing/archive/legacy/batches/glm-leaf-workflows/batch-a-directed.json',
    family: 'totals-summary',
    templateId: 'test-machine-evidence-v1',
    variant: 'historical-test-summary-native-v1',
    carrierSha256: 'f519eb6a94e548f1cc0fb51694e7b5ab9759789a853bd24018b5710197d86e40',
    carrierGitObject: '807139bbf24602108536986151258db248058c3d',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r74-testing-archive.json',
    reviewIndex: 40,
    sourceSha256: 'f519eb6a94e548f1cc0fb51694e7b5ab9759789a853bd24018b5710197d86e40',
    sourceGitRevision: 'b9af6517a6298e0fb247b97a3b653294d6b45fa2',
  },
  {
    id: 'A-distilled',
    path: 'docs/ops/evidence/TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1/directed/instrumentation-r1.json',
    family: 'distilled-reporter',
    templateId: 'test-machine-evidence-v1',
    variant: 'historical-distilled-vitest-native-v1',
    carrierSha256: 'dca9f35f33ec1874b5f7f2f527609852a2d2e70f09101a4c417d1be7f1b4ccfb',
    carrierGitObject: '3838233e807baa5a1bd181326d73fc39523d133b',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r87-ops-evidence-artifacts.json',
    reviewIndex: 55,
    sourceSha256: 'dca9f35f33ec1874b5f7f2f527609852a2d2e70f09101a4c417d1be7f1b4ccfb',
    sourceGitRevision: 'b44b2af2955498b996bfedd81a6e6a583231d9c6',
  },
  {
    id: 'B-command',
    path: 'docs/ops/evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/mutation-logs/SHARED-original.json',
    family: 'command-summary',
    templateId: 'evidence-receipt-v1',
    variant: 'historical-command-summary-native-v1',
    carrierSha256: '64941a9c66adf30e604196b61af73d628ef61fa3335b06637be95d4e10d36eb3',
    carrierGitObject: 'ac0c5910c0cd919a90b1a78513143d5720fa23f7',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r40-ops-machine-json.json',
    reviewIndex: 11,
    sourceSha256: '64941a9c66adf30e604196b61af73d628ef61fa3335b06637be95d4e10d36eb3',
    sourceGitRevision: '170d97c7f782aa3e4d1981f605a31299554dbd6e',
  },
  {
    id: 'D-identity',
    path: 'docs/testing/archive/legacy/batches/glm-large-wave/batch-a-directed.json',
    family: 'test-identity-array',
    templateId: 'test-machine-evidence-v1',
    variant: 'historical-test-identity-native-v1',
    carrierSha256: 'c215a982dd1a818726194639e29a0dafbcecccba7485a4c85d73f827de3a6060',
    carrierGitObject: '041f83dbefa45d185a75f2314ccac231d4f48ab3',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r74-testing-archive.json',
    reviewIndex: 18,
    sourceSha256: 'c215a982dd1a818726194639e29a0dafbcecccba7485a4c85d73f827de3a6060',
    sourceGitRevision: 'b9af6517a6298e0fb247b97a3b653294d6b45fa2',
  },
  {
    id: 'D-mutation',
    path: 'docs/ops/evidence/TEST-COVERAGE85-GLM-GAME-1/mutation-points.json',
    family: 'mutation-definition-array',
    templateId: 'evidence-receipt-v1',
    variant: 'historical-mutation-definition-native-v1',
    carrierSha256: 'd0bf114205b1762738283a18b59cd8f20667222cb6db85e6dfabc5d58864383a',
    carrierGitObject: 'b6045c26948a5a2bbba73519c3af8b4caea166d4',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r40-ops-machine-json.json',
    reviewIndex: 2,
    sourceSha256: 'd0bf114205b1762738283a18b59cd8f20667222cb6db85e6dfabc5d58864383a',
    sourceGitRevision: '170d97c7f782aa3e4d1981f605a31299554dbd6e',
  },
  {
    id: 'D-map',
    path: 'docs/ops/archive/ops-governance-layout-20261004.json',
    family: 'historical-path-map',
    templateId: 'evidence-receipt-v1',
    variant: 'historical-path-map-native-v1',
    carrierSha256: '9a78b3c772d82032ace0a5e6e897f55911777f55cebfd4e060fa13ba3140aeb4',
    carrierGitObject: '35e019c95185d37dcad6d2cb0515e4c46b0f92a4',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r54-ops-audits-layout.json',
    reviewIndex: 2,
    sourceSha256: '9a78b3c772d82032ace0a5e6e897f55911777f55cebfd4e060fa13ba3140aeb4',
    sourceGitRevision: '516872a827ed0f6321aa18162aa8a522edbab3c4',
  },
]
const contracts = {
  'raw-reporter': {
    templateId: 'test-machine-evidence-v1',
    variant: 'historical-vitest-native-v1',
    format: 'json-native',
    templateVersion: '1.0.0',
    metadataLocation: 'current-review',
    sourceCarrierRevision: '83743275bb560a4ea4bbbd2a15baf7f138f9145b',
  },
  'distilled-reporter': {
    templateId: 'test-machine-evidence-v1',
    variant: 'historical-distilled-vitest-native-v1',
    format: 'json-native',
    templateVersion: '1.0.0',
    metadataLocation: 'existing-current-review',
    sourceCarrierRevision: '83743275bb560a4ea4bbbd2a15baf7f138f9145b',
  },
  'totals-summary': {
    templateId: 'test-machine-evidence-v1',
    variant: 'historical-test-summary-native-v1',
    format: 'json-native',
    templateVersion: '1.0.0',
    metadataLocation: 'existing-current-review',
    sourceCarrierRevision: '83743275bb560a4ea4bbbd2a15baf7f138f9145b',
  },
  'command-summary': {
    templateId: 'evidence-receipt-v1',
    variant: 'historical-command-summary-native-v1',
    format: 'json-native',
    templateVersion: '1.0.0',
    metadataLocation: 'existing-current-review',
    sourceCarrierRevision: '83743275bb560a4ea4bbbd2a15baf7f138f9145b',
  },
  'test-identity-array': {
    templateId: 'test-machine-evidence-v1',
    variant: 'historical-test-identity-native-v1',
    format: 'json-native',
    templateVersion: '1.0.0',
    metadataLocation: 'existing-current-review',
    sourceCarrierRevision: '83743275bb560a4ea4bbbd2a15baf7f138f9145b',
  },
  'mutation-definition-array': {
    templateId: 'evidence-receipt-v1',
    variant: 'historical-mutation-definition-native-v1',
    format: 'json-native',
    templateVersion: '1.0.0',
    metadataLocation: 'existing-current-review',
    sourceCarrierRevision: '83743275bb560a4ea4bbbd2a15baf7f138f9145b',
  },
  'historical-path-map': {
    templateId: 'evidence-receipt-v1',
    variant: 'historical-path-map-native-v1',
    format: 'json-native',
    templateVersion: '1.0.0',
    metadataLocation: 'existing-current-review',
    sourceCarrierRevision: '83743275bb560a4ea4bbbd2a15baf7f138f9145b',
  },
}
function freeze(value) {
  for (const item of Object.values(value)) if (item && typeof item === 'object') freeze(item)
  return Object.freeze(value)
}
export const nativeFamilyPilots = freeze(pilots)
export const nativeFamilyContracts = freeze(contracts)
export const nativeFamilyCarrierRevision = '83743275bb560a4ea4bbbd2a15baf7f138f9145b'
export function nativeFamilyAdmission(path) {
  return pilots.find((pilot) => pilot.path === path)
}

// Exact independently accepted S50 content; source/runtime claims remain separate.
export const nativeFamilyContentAcceptance = freeze({
  reviewer: 'Codex independent reviewer /root/s50_admission_review',
  reportSha256: '4d7d7fab16bd1ac823a2b94cf04e953c0e1d6db94cb61a9fb5e7f698fc1863c2',
  contentByPath: {
    'docs/ops/evidence/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/mutation-logs/K1-cascade-layer-offset.red.json':
      '07f309d99f4b5a1b49ade1bdf31dcc24e4b4a32c0605a7dc63ce8a865c18e0c9',
    'docs/ops/evidence/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/mutation-logs/K1-cascade-layer-offset.green.json':
      '9597b285912aaeb4f1d2c0d1d97280f0e5e38b6dfc23669ff581dc8ef71168b1',
    'docs/testing/archive/legacy/batches/glm-leaf-workflows/batch-a-directed.json':
      '065ab9fd437533c9c6a561b69f2cf7df86335d1e4fa32d2082662ee2d26294c2',
    'docs/ops/evidence/TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1/directed/instrumentation-r1.json':
      'b709d8b10a08d9884bfc55d8b4e4328ea5d850305d56cb75ebf1dbc19a6b9f12',
    'docs/ops/evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/mutation-logs/SHARED-original.json':
      '07dac08ce00f5df3ec673624761c81c96e40794910406bf7aeddd6d1053271fb',
    'docs/testing/archive/legacy/batches/glm-large-wave/batch-a-directed.json':
      '28c65cd13de0289dfa0d94b55f87d830289d3601a50335205df4a8a997fde877',
    'docs/ops/evidence/TEST-COVERAGE85-GLM-GAME-1/mutation-points.json':
      '986062ff8cc52e7e1a94c887fe031ae416346fa177138d26726f2a5d709c3717',
    'docs/ops/archive/ops-governance-layout-20261004.json':
      '5980c28cd4ba70623c32f913aa9386c8b36604dcef5c38e78b136ed4ba45119e',
  },
})
