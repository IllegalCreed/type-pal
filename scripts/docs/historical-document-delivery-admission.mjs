// Fixed S33 pilot admission; six carrier identities, never a semantic/execution receipt.
// S30 accepted input + bounded Owner corrections (aec49572); family expansion needs new admission.
const pilots = [
  {
    path: 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/independent-r23-ops-audits-candidate-acceptance-20261017.json',
    sourceSha256: '8a39d62d5a759e9911e7e2bf5e23bef7ae967b42f4b1b7ae55bca1dd7a8e3d22',
    gitObject: 'e68940c2b5f47e352ae5300a412e91390d984932',
    historicalSourceSha256: '8a39d62d5a759e9911e7e2bf5e23bef7ae967b42f4b1b7ae55bca1dd7a8e3d22',
    historicalSourceGitRevision: '2dd1768c675dd7cd694a00d803dac0c7b1375071',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r89-ops-evidence-artifacts.json',
    reviewIndex: 88,
    historicalRole: 'candidate-acceptance-verdict',
    historicalBoundarySha256: 'bfd56a056c54cb4cb72446013c2c46397d424c5277a13116acb88d5ae5d6d553',
    requiredWitnessPointers: ['/counters'],
  },
  {
    path: 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/independent-r28-phase1-plans-review-20261017.json',
    sourceSha256: '880e444fb2518bf419316876b691a877e2af5c1d9cd710596a86b7944a5a470f',
    gitObject: 'ab6ce1cd2568d517fba61c10fbfac7e2d81f3050',
    historicalSourceSha256: '880e444fb2518bf419316876b691a877e2af5c1d9cd710596a86b7944a5a470f',
    historicalSourceGitRevision: '2dd1768c675dd7cd694a00d803dac0c7b1375071',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r90-ops-evidence-artifacts.json',
    reviewIndex: 5,
    historicalRole: 'readonly-review-verdict',
    historicalBoundarySha256: 'a173b295e8de1f5e9965bc952526164c3be054abf53672e6149cc91f4f4bb2ef',
    requiredWitnessPointers: ['/blockingCounters', '/nonBlockingCounters'],
  },
  {
    path: 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-r53-ops-archive-task-20261017.json',
    sourceSha256: '068e83000c762243530a61814f3e3e9956c590b2c885be76ebace41830dadfc2',
    gitObject: 'c7c88e786991e045d14dda94b1c80eaf52ed7be7',
    historicalSourceSha256: '068e83000c762243530a61814f3e3e9956c590b2c885be76ebace41830dadfc2',
    historicalSourceGitRevision: '2dd1768c675dd7cd694a00d803dac0c7b1375071',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r89-ops-evidence-artifacts.json',
    reviewIndex: 44,
    historicalRole: 'author-contribution-ledger',
    historicalBoundarySha256: '8281962fd0b2df98c19e06c1a6a83a2a35a8a40d394062b0fdde258466e2aa7f',
    requiredWitnessPointers: ['/policy'],
  },
  {
    path: 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/independent-r65-ops-evidence-readmes-candidate-acceptance-20261017.json',
    sourceSha256: '7f5d8a2462b4401c2648b55d31d75c25869310404464051f543cb68506c346cd',
    gitObject: '4ddd6bc0bb6b3ece8555b9a95a4db3148caba0fc',
    historicalSourceSha256: '8541d1f9f7f327a26028ea894b693855328a289d75a75c941e591fdf762c1a1b',
    historicalSourceGitRevision: '2dd1768c675dd7cd694a00d803dac0c7b1375071',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r91-ops-evidence-artifacts.json',
    reviewIndex: 26,
    historicalRole: 'candidate-acceptance-verdict',
    historicalBoundarySha256: '319b9c334d8eb0458a830476aebd1846fd0b4ba9bcd76b9ee6c3190c770a7820',
    requiredWitnessPointers: ['/recordIntegrityCorrection20261018'],
  },
  {
    path: 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/independent-r89-ops-evidence-artifacts-candidate-acceptance-20261017.json',
    sourceSha256: '6ebdc2ac84bc2a7cc01e04ccdb21de52c02e5637bfd46dd2d7923a562b1874d4',
    gitObject: 'ecf7aa35a6d3edde7156e0775043aa4816b9f74b',
    historicalSourceSha256: '2473d0f3529b5a06b5deff4b2b3bdfda56e372aeb54f8c41a48c59902f31fce9',
    historicalSourceGitRevision: 'bff13f74a4f95bbba05a8353651b5997fea7fc95',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json',
    reviewIndex: 14,
    historicalRole: 'candidate-acceptance-verdict',
    historicalBoundarySha256: '2c9fe92ccb3f2a6e873213010c9e87623af249a15ace81c1538c28a9f0d443e8',
    requiredWitnessPointers: ['/recordIntegrityCorrection20261018'],
  },
  {
    path: 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/independent-r92-phase-governance-artifacts-candidate-acceptance-20261017.json',
    sourceSha256: '04c18bc1edc27fcd870bfa658774daf4a67a8d52c7509669fd75ce89f1ef940c',
    gitObject: '386d4aa6c9136f2670cf47bcb7c6a632a7321de8',
    historicalSourceSha256: '8b0b924c93872f00d9e85ffa10e4b0d48c8dc259807b94fbd10caa45e014f640',
    historicalSourceGitRevision: 'bff13f74a4f95bbba05a8353651b5997fea7fc95',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json',
    reviewIndex: 2,
    historicalRole: 'candidate-acceptance-verdict',
    historicalBoundarySha256: '78a4175c377e4d3e60753b79d25a5c066ef2311bb3b0cf0188ac9d29c5f36a29',
    requiredWitnessPointers: ['/recordIntegrityCorrection20261018'],
  },
]
export const historicalDeliveryPilots = Object.freeze(
  pilots.map((pilot) => {
    Object.freeze(pilot.requiredWitnessPointers)
    return Object.freeze(pilot)
  }),
)
export const historicalDeliveryReadDomain = Object.freeze({
  actualScope:
    '本篇 native JSON 全文程序解析（全部顶层键与结构）+ 关键字段定向核读（kind/date/sourceRevision/scope 计数/counters 首条/entries 首条/勘误块）；manifest 身份元组与现行 review 绑定经准入 verify 机械核验；全仓 git grep 入站引用实测；同批三角色回执交叉引用核对',
  notRead: [
    'entries/documents 所引用的下游 Markdown/HTML 正文未逐篇重读（S19/record-integrity 既有裁定沿用）',
    'DOCS-RECORD-INTEGRITY-1/raw/*.inputs.log 等原始命令日志未逐个展开复核',
    '当时（2026-10-17）的命令执行输出原件未重放',
  ],
})
Object.freeze(historicalDeliveryReadDomain.notRead)
export const historicalDeliveryIntegritySource = Object.freeze({
  path: 'docs/ops/evidence/DOCS-RECORD-INTEGRITY-1/integrity-audit.json',
  revision: 'd9a3a0a0a7c45fc75f922ae3dffd13a68ca29a5e',
  sha256: 'd4186dd26528640f26408af58f3efe78c13001dc937fcc06a9dd547324ad2bc9',
})
