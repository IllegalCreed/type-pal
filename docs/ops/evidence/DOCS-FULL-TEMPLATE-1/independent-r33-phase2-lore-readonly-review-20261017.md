# R33 phase2/lore readonly review

**verdict:** `accept-readonly-proposal` · **scope:** `18/18` · **issues:** 0

独立全文读取 18 篇 phase2/lore 文档（固定 source revision `0d5311075b4f5e67362d1953a138d678c0a4aa42`），严格 UTF-8 解码并记录 SHA-256；本报告不授 runtime/E2E/视觉/coverage 信用。

- 12 篇 Markdown 按现有职责模板迁移并追加 archive overlay。
- 3 篇 HTML 原型保留原字节，使用 `archive-record-v1` artifact envelope 记录用途、来源、状态和 artifact 归属。
- 3 篇 lore/phase2 Markdown 其余按原职责绑定模板。

| # | File | Format | Existing type | Proposed treatment | Bytes | Source SHA |
|---:|---|---|---|---|---:|---|
| 1 | `docs/lore/ideas/guijie/beat-sheet.md` | markdown | reference-canon | archive-reference-canon | 41376 | `ef0776b5e401b611c97cff380359c125675cb87544135dd67db0011be38919ff` |
| 2 | `docs/lore/ideas/guijie/brainstorm.md` | markdown | reference-canon | archive-reference-canon | 38347 | `5e102bea7e6d978296cf454b6b0ab1ebd6961dff6718808aed0c103240b5a5cd` |
| 3 | `docs/lore/timeline.md` | markdown | plan-status | archive-plan-status | 39087 | `49bed5ff4012203c8ba4759e368146122e9803fa0017bd7fc1d1a44581d45c88` |
| 4 | `docs/phase2/archive/mockups/actor-mode-v1.html` | html | archive-record | html-artifact-archive-record | 17110 | `0f1ecdeaa85d9d49eeba091859d1eb07d50d5ca562cbcdaa937b777747646e3f` |
| 5 | `docs/phase2/archive/mockups/actor-mode-v2.html` | html | archive-record | html-artifact-archive-record | 19978 | `688008dcc0c1db9d478a15f375ce60bbbf139ed8910e0667aa78dc7de367ba60` |
| 6 | `docs/phase2/archive/mockups/place-mode.html` | html | archive-record | html-artifact-archive-record | 14856 | `aacdffba3f76e92554ddf29e1317062b47e83ae4a3d184a2c495cfb8a05b136d` |
| 7 | `docs/phase2/capability-map.md` | markdown | governance-index | archive-governance-index | 46587 | `b0c23417830e4e871249f2ac839cff7897136272d3a900fcce5f017b90d80702` |
| 8 | `docs/phase2/decisions.md` | markdown | governance-index | archive-governance-index | 62257 | `b981d3883174306a6483bfdf6cd19a587bf356720bbc9d505c0ed2d3378703e0` |
| 9 | `docs/phase2/design-backlog.md` | markdown | design-spec | archive-design-spec | 35685 | `49838c395ace5b7501a389d8aeab0b13454c0a169c98bfec23b6ab027270c8ae` |
| 10 | `docs/phase2/READ-FIRST.md` | markdown | governance-index | archive-governance-index | 12281 | `1169ee7f0506c8bc3efbe9c5ea55071ac064477686342fc40970279983feef58` |
| 11 | `docs/phase2/reference/dialogue-presentation.md` | markdown | reference-canon | archive-reference-canon | 17519 | `b493813d09a14f76fdee1b38c0dc754fa1b13c5cbdf9ae7bd70f1ac342baf920` |
| 12 | `docs/phase2/reference/phase1-knowledge-harvest.md` | markdown | reference-canon | archive-reference-canon | 47742 | `b655054bfb6cb95ea0d3fdface86bf81d6d0f1b97a99a37e49c9d01f28c269b4` |
| 13 | `docs/phase2/roadmap.md` | markdown | plan-status | archive-plan-status | 31125 | `2a488824a2dcc6195c76c31a691c2db691eac99c6bfdd6d0a2e2b72562ed43b5` |
| 14 | `docs/phase2/specs/content-schema.md` | markdown | design-spec | archive-design-spec | 9137 | `ee9188e215f0b88f01724092559edc2345df7893eb843f2f5a71418267bd6d62` |
| 15 | `docs/phase2/specs/editor-architecture.md` | markdown | design-spec | archive-design-spec | 26639 | `e17805c77f9b2425ae2178886f4411a733d37c0749624ac896146a124643d91a` |
| 16 | `docs/phase2/specs/editor-design-system.md` | markdown | design-spec | archive-design-spec | 112915 | `f89afdc32ac36148c0c294282056018cb48c3ca333d556b6362b781d9b19a7d8` |
| 17 | `docs/phase2/specs/project-lifecycle.md` | markdown | design-spec | archive-design-spec | 15237 | `3079dc0850edf532ca817913f8af92a13204a3d107586afc57dbb036add3681a` |
| 18 | `docs/phase2/specs/script-system.md` | markdown | design-spec | archive-design-spec | 16129 | `28fefb1eeca344d583a050d7602d90e09c3d3f9842d12aabc35a5711c3030666` |

## Intake conclusion

- 18/18 文档已完整读取；HTML 原型用途保留为历史视觉/交互探索证据，不代表当前 UI 合同。
- Markdown 迁移保留原始语义、日期、冲突和链接；HTML 不改写原始 markup。
- 本批不授 runtime/E2E/视觉/coverage 信用。
