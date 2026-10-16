# R23 ops audits independent readonly review

- Base: `81d01fa9993b38f0905ed7a54fc9a0b1c73f8fa5`
- Scope: 9 files under `docs/ops/archive/audits/`; no repository writes, migration, registry, review, routing or catalog changes.
- Verdict: **accept-readonly-proposal**; blocking counters: 0; non-blocking counters: 2.

## Template proposal

- 8 files → `audit-report-v1@1.0.0` with historical archive overlay.
- `README.md` → `governance-index-v1@1.0.0`; its existing `audit-report` registry binding is a content classification error.
- `OPS-TST-PERF-g1-coverage-map.md` stays `audit-report-v1` because it is a historical ops audit mapping; adopting `test-domain-report-v1` requires a separate frozen design and consumer proof.

## Per-document review

### `docs/ops/archive/audits/b10-1-source-slot-census-2026-08-09.md`

- **Classification:** `audit-report` / `audit-report-v1@1.0.0`; status `historical`; history overlay `true.`
- **Exact source:** 77 lines, 3238 bytes, SHA-256 `6961c437cabdaf0095d0e433683dc18e80c47859b588b2a498862e0823c66d7b`; `afterSha256` matches exactly.
- **Semantic outline:** 只读审计证据与 B10-1 G1/G2 使用边界；三份输入 JSON 与不可写复现命令；380 源敌队 / 1900 原始条目 / 861 语义槽 / 757 有效敌槽 / 104 空槽等总账；20 支含空槽且带 summon/divide 定义的队伍交叉清单；65535 与 0 的槽位解释、v11 只保留有效成员、v12 应保留 Array<string|null> 的复审说明。
- **Primary sources:** data/extracted/data/enemy-teams.json；projects/pal/content/enemy-teams.json；projects/pal/content/enemies.json；docs/ops/archive/tasks/done/B10-1-enemy-confused-attack.md。
- **Issues:** 历史 census 未在当前树重跑，输入 SHA 与 v12 迁移目标需要当前候选重新绑定；仅静态源/生成数据核对；不证明 runtime、敌人 summon/divide、站位或 RNG 行为。
- **Counters:** none。
- **Boundary/next:** 保留历史原始 census；若用于当前迁移，重跑三份输入并把结果接入当前 canonical 证据。

### `docs/ops/archive/audits/codex-p7-r13-three-way-adjudication.md`

- **Classification:** `audit-report` / `audit-report-v1@1.0.0`; status `historical`; history overlay `true.`
- **Exact source:** 230 lines, 15315 bytes, SHA-256 `7305185f5dfde388978cfdd52518bf57be03879633bea1490504d2895e120854`; `afterSha256` matches exactly.
- **Semantic outline:** 两份双盲审计与 Codex 金丝雀、s048/e796 反例的统一裁决边界；A1-A11 确认缺口、补回项与尚需动态裁决项；Kimi/GLM 报告纠正与不可收敛的计数/语义差异；R13-0 到 R13-6 与 R13-Z 的分批 build 设计和 fail-closed 要求；完整构建/投掷守恒复跑命令摘要。
- **Primary sources:** packages/migrate/src/translate-events.ts；packages/migrate/src/translate-enemy-scripts.ts；packages/reforge/src/main.ts；reference/sdlpal/script.c；R13-0~R13-Z 后继任务卡与 evidence。
- **Issues:** 历史文档明确 R13 仍 rework、Kimi/GLM build 前签字 pending，不能当作当前已修复；正文并列 48/58 throw、10/14 pendingSkills、0x76/0x9B、旧版本等争议，需以当时上下文和后继记录解释；包含迁移/运行时设计提案，未给出现行候选的 runtime/E2E/visual/coverage 证明。
- **Counters:** 旧结论与后续 R13 账本可能有数字差异，写 wrapper 时必须保留原值并指向后继复核。
- **Boundary/next:** 保留历史裁决和原始冲突；任何当前修复引用必须绑定新的 source-backed disposition、runtime canary 与版本。

### `docs/ops/archive/audits/codex-r13-4-confirm-control-flow-audit.md`

- **Classification:** `audit-report` / `audit-report-v1@1.0.0`; status `historical`; history overlay `true.`
- **Exact source:** 275 lines, 16555 bytes, SHA-256 `f0644f9c6174f90bddd86bbed86ff91e6e0d1b5074b443b239101c1cd2331c29`; `afterSha256` matches exactly.
- **Semantic outline:** 26 RAW / 28 logical / 31 physical confirm 口径与 digest；逐站 No 目标、Yes fallthrough、terminal lifecycle 与 22/31 有损节点；买水果、买米、s009 的用户可见 No 分支反例；P3/P7 根因、冻结旧 projector 与 append-only augmentation 约束；R13 evidence/MG2、content/SAVE epoch、Reforge/Editor 控制器和最低验收矩阵。
- **Primary sources:** data/extracted/events/all.json；packages/migrate/src/experimental/script-v5/p7-canonical.ts；packages/reforge/src/main.ts；R13-4 published seal/MG2 records。
- **Issues:** 当前 main 的 content/SAVE 版本已变化，文中 content9/SAVE8 epoch 方案不能直接视为现行契约；确认框运行时、存档屏障、Editor v5 预览和浏览器 canary 均为当时验收要求，不是本篇静态证据；No/Yes 语义和 31 个物理节点必须以当前 canonical 产物复核，旧 digest 不能单独授权 build。
- **Counters:** 历史版本号与现行版本存在适用范围冲突，应在 archive overlay 中显式标注。
- **Boundary/next:** 保留 26/28/31 及反例；当前实现只可由新 source census、双跑 MG2、真实 confirm 两臂与 Editor/runtime evidence 重新证明。

### `docs/ops/archive/audits/codex-r13-5-enemy-source-semantics-audit.md`

- **Classification:** `audit-report` / `audit-report-v1@1.0.0`; status `historical`; history overlay `true.`
- **Exact source:** 150 lines, 10866 bytes, SHA-256 `172f2eb76b22b3efe77b6509f44fab3b94b37dbad6a210b5e783240e8e0f944f`; `afterSha256` matches exactly.
- **Semantic outline:** enemyObjects 三类 hook 与最终 EnemyDef/boss overlay/Reforge 消费范围；153 raw/projection/final、54 带脚本敌人、12 pending/31 source site 账；12 个 pending 敌人逐项 disposition（420/421/422/435/463/469/483/486/499/519/539/547）；enemy-496 双臂、enemy-483 时序、enemy-519 八项成长的动态金丝雀；公共 delta、最低机器验收与代码锚点。
- **Primary sources:** packages/migrate/src/translate-enemy-scripts.ts；packages/migrate/src/pal-boss-overlay.ts；packages/reforge/src/battle/battle-session.ts；reference/sdlpal/fight.c；reference/sdlpal/script.c。
- **Issues:** pending hook、battle choreography、battleEnd stages[0] 和 0x79 双臂缺口均未由本篇实际运行闭合；敌人持久 cursor、battle-only choreography、onDefeated canonical authority、fail-loud 生成门禁属于未决公共 delta；只读报告不授予敌人脚本、战斗演出、存档或 runtime 验收信用。
- **Counters:** 与 GLM/Kimi 对 pendingScripts 是否落最终文件的表述有历史口径差异；保留双方原结论，当前以 buildPalMigration 与最终产物逐项重核。
- **Boundary/next:** 保留 pending disposition 与动态验收矩阵；当前不把 153/153 产物存在性当成语义闭合。

### `docs/ops/archive/audits/documentation-2026-09-06.md`

- **Classification:** `audit-report` / `audit-report-v1@1.0.0`; status `historical`; history overlay `true.`
- **Exact source:** 318 lines, 20409 bytes, SHA-256 `1b365f1a45b3af0fc425d9b0ad84c3f983668a76b4a3ad42aabc6a5342cbdf4d`; `afterSha256` matches exactly.
- **Semantic outline:** 2026-09-06 main@4cbbf758 只读基线和未启动清理声明；文档规模、判断优先级与 P1 当前误导问题 DOC-01~DOC-06；P2 历史边界/目录职责/自动保鲜 DOC-07~DOC-09；32 次断链/27 个唯一目标与裸路径台账；批次 A-D 整理顺序、保留项和可复跑探针。
- **Primary sources:** packages/content/src/character.ts；docs/phase2/README.md；docs/phase2/roadmap.md；docs/phase2/capability-map.md；package.json；scripts/docs。
- **Issues:** 基线日期、文件数、content19/20、任务状态和断链数字属于旧快照，不能直接作为当前 docs 分母或完成度；建议批次未全部实施；文档明确清理、迁移、自动门禁均未开始；部分历史建议与后续 current-only/模板治理规则需由新 governance index 和 task card 接管。
- **Counters:** 旧断链与规模快照必须作为 dated evidence 保留，不能在 archive wrapper 中洗成当前统计。
- **Boundary/next:** 保留 2026-09-06 诊断与建议；当前治理应以实际树重新分类、当前 registry/catalog 和 check:docs 输出为准。

### `docs/ops/archive/audits/glm-p7-r13-source-semantics-audit.md`

- **Classification:** `audit-report` / `audit-report-v1@1.0.0`; status `historical`; history overlay `true.`
- **Exact source:** 327 lines, 19750 bytes, SHA-256 `b592b6ca150c1a51bee5edeeab6bcd68dbc2941013219c2590813702eb4c34ff`; `afterSha256` matches exactly.
- **Semantic outline:** 43,503 source commands 的独立方法与普通/敌人/技能/物品/palette 全域矩阵；setPalette、lossySkills、敌人 opcode、pendingSkills 的确认缺失；C8/overlay 补回项与 0x08、pendingThrow、0x76 风险；no-op/approved-lossy、Codex 差集反证、573 段转移池；门禁建议、复跑命令及附录修正（14 pendingSkills、47/48 pendingThrow、schema item-only）。
- **Primary sources:** data/extracted/events/all.json；packages/migrate/src/translate-events.ts；packages/migrate/src/translate-enemy-scripts.ts；packages/migrate/src/migration-diagnostic.ts；projects/pal/content/migration-diagnostics.json。
- **Issues:** 正文主表与附录对 pendingSkills 10/14、pendingThrow 48/47、敌人 pendingScripts 0/12 有明确历史自我修正；静态审计和内存 report 不提供当前 runtime/E2E/visual/coverage 证明；setPalette/0x08/0x76/no-op 与敌人语义需要后继 source disposition 和动态验收。
- **Counters:** 必须保留正文与附录的相互纠正，不可挑选一个数字替代历史差异。
- **Boundary/next:** 保留 GLM 独立反证；当前采用前先重跑完整 buildPalMigration、最终产物与相应 canary，并记录差集。

### `docs/ops/archive/audits/kimi-p7-r13-source-semantics-audit.md`

- **Classification:** `audit-report` / `audit-report-v1@1.0.0`; status `historical`; history overlay `true.`
- **Exact source:** 214 lines, 19435 bytes, SHA-256 `c9d4f16b801da222cdb89399922f9501406e183c1819f8eccc2b6b3e9d6ccbd1`; `afterSha256` matches exactly.
- **Semantic outline:** d263efd3/c3d620a9 基线与 SDLPal/迁移器/运行时三路重建；M1-M9 确认缺失：callScript owner、0x08、confirm、idleFrames、敌人 hooks、choreography、battleEnd、0x79、palette；等价补回、动态风险和 approved no-op/近似分类；可复跑普查命令、Codex 差集/误报与 G1-G6 fail-closed 门禁建议。
- **Primary sources:** reference/sdlpal/script.c；reference/sdlpal/scene.c；reference/sdlpal/play.c；packages/migrate/src/translate-events.ts；packages/migrate/src/translate-enemy-scripts.ts；packages/reforge/src/main.ts。
- **Issues:** 基线 c3d620a9 与当前工程版本不同，所有源/最终 digest 和版本口径需重新绑定；报告把若干结构性开放口列为风险或缺失，明确要求动态验证；静态读证不能升格为当前缺陷已修复或已重现；提出 instruction disposition、diagnostics、context matrix、身份 oracle、副作用重放和单源翻译器等后继设计，但未实施。
- **Counters:** 与 GLM/Codex 对 0x08、0x76、0x9B、pendingThrow 等口径存在差集合并需求。
- **Boundary/next:** 保留 Kimi 红队独立证据和反例；当前只按新的 source-backed disposition、runtime/save canary 和用户裁决采纳。

### `docs/ops/archive/audits/OPS-TST-PERF-g1-coverage-map.md`

- **Classification:** `audit-report` / `audit-report-v1@1.0.0`; status `historical`; history overlay `true.`
- **Exact source:** 68 lines, 11920 bytes, SHA-256 `38c8f2921086034e0584cd8b0db27bcf996eb9b0efec11a60a62ad159f6c60d3`; `afterSha256` matches exactly.
- **Semantic outline:** fast-synthetic、pal-oracle、canary、release-shared 四种证明路由定义；44 条旧 PAL-heavy 断言逐条映射到后继测试标题和路由；映射守恒、G1 append-only 状态机、source proof 边界和共享 lease 探针。
- **Primary sources:** docs/ops/archive/audits/OPS-TST-PERF-g1-coverage-map.md；packages/migrate/src/experimental/script-v5/* tests；docs/testing/catalog.json；对应后继 test files。
- **Issues:** 此表是测试覆盖路由映射，不是执行结果；fast-synthetic 不能证明 PAL/source，pal-oracle/canary 仍需实际运行；44 条映射中的旧测试与后继测试文件/标题属于历史快照，当前运行状态需由 testing catalog/evidence 核对；位于 ops archive 且正文是历史审计映射，暂不改绑 test-domain-report；若未来迁移为测试域报告，需先冻结新 template/consumer 设计。
- **Counters:** content-based audit-report 绑定可接受；目录位置不能单独决定 test-domain-report。
- **Boundary/next:** 保留 44 条映射与证明边界；当前测试信用只来自 catalog 配对 report/evidence 的真实执行。

### `docs/ops/archive/audits/README.md`

- **Classification:** `governance-index` / `governance-index-v1@1.0.0`; status `historical`; history overlay `false.`
- **Exact source:** 17 lines, 1038 bytes, SHA-256 `255f52adba79b0312e691901e928a17764c3bcb46d187f26aeb3745c7f71ba71`; `afterSha256` matches exactly.
- **Semantic outline:** 历史审计回执的导航目的和当前状态边界；上级运维历史归档入口；8 篇审计正文与 worktree retirement 历史记录的链接索引。
- **Primary sources:** docs/ops/archive/audits/*.md。
- **Issues:** 现有 registry 将 README 误绑为 audit-report；正文是索引导航，应改 governance-index-v1；列表本身不提供审计事实、执行证明或当前状态；其链接目标仍需由各篇 review/SHA 独立治理；README 已含后续新增 worktree-retirement 链接，必须以当前 SHA 记录，不回写旧 review。
- **Counters:** classification correction: audit-report → governance-index；非正文迁移，不新增 runtime/E2E/visual/coverage 信用。
- **Boundary/next:** 以 governance-index 模板重绑并保留历史导航；索引只负责入口，不承载当前结论。

## Independent acceptance boundary

All nine files were read in full from the clean candidate tree. This receipt accepts only the readonly classification/proposal; it does not authorize bulk migration, current truth, runtime, E2E, visual, coverage, or product completion.
