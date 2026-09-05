# OPS-TST-PERF-B → ARCH-CURRENT-ONLY-1 迁移 / proof 交接

Date: 2026-08-20

Source HEAD: `8148083b61506441912b69ad4ae5f3464f559df4`

Status: **B 保持 `build`；current-v4 authority 候选 focused gate 失败，未形成可提交实现检查点。**

## 停线结论

B 的 runner/proof protocol 本身没有出现新的语义漂移。阻塞点位于旧 C1/B2/R13 发布证明链：当前
canonical v4 source 可以机械重建语义等价的 authority，但重建器产生的 JSON 对象插入顺序不等于
当前 baseline/editor serializer 已发布的原始表示。B2 的 `publicationSurfaceDigest` 对序列化字节哈希，
因此 focused gate 在 import 阶段以 `B2 battlefield rewind: successor surface 漂移` fail-closed。

直接对照当前 `_state.files` 与 source-backed rebuild report 的 `publishedChain.state.files`：两边均为
551 files、managed list 与 generator epoch 相同；**295 个 hash 不同，恰为 `content/items.json` 1 个
+ `content/scenes/s000.json..s293.json` 294 个**。代表样本：

| path | 当前 canonical sha256 | rebuild sha256 |
|---|---|---|
| `content/items.json` | `aad0ba5b57aae56441abe94e8421827c971cc1914d4593b9de21f47359d622fb` | `fa4922ca1ef6f3ff5b0716f5b77c23d62c9bca8bd02f2174eed84856ead950e4` |
| `content/scenes/s000.json` | `6ecb33970bb028244ce346465c33b2f91bfef0ee4c0f3a0375ccb1d7954ff72f` | `854083c1a70d018d1d3382ce302c81f8e4eea90123220211a3f1848d504f1bba` |
| `content/scenes/s001.json` | `94edf20538455505fc3c1a09559d916cd8e48bac80d10cf2cc5fe77078a43526` | `aca80f6f870a8b132cd56995264166c4d5986d124050a52da1c9bf6a100dd4bb` |

试验性的 current-key-order transplant 只能把 295 降到 192；继续把 key order 注入 C1 dialogue
upgrader 后，回投立即在真实输入
`content/items.json#/229/use/effects/0/script/body/1/cue` 失败：seal 记录 `rows,portrait`，当前输入为
`portrait,rows`。现有 `legacyCueOrders` 只记录旧发布例外，无法表达完整 current canonical 表示。
该试验代码和 callback 已全部撤销。继续修复必然新增 full representation converter / proof schema，
属于 ARCH-CURRENT-ONLY-1 随后需要删除的开发期兼容层；B 按用户停线规则不实现。

可复核输入：

- current state：`packages/migrate/baselines/pal/_state.json`
- rebuild state：
  `build/release-runs/v4-authority-rebuild-8148083b/current-v4-opaque-c1-authority-resume.json`
- source checkpoint：
  `build/release-runs/v4-authority-rebuild-8148083b/current-v4-opaque-chain.c1-checkpoint.json`
- focused failure 对应已安装候选：
  `build/release-runs/v4-authority-rebuild-8148083b/current-v4-opaque-install-audit.json`

## PB3：15 个 transition / seal digest 域

机械报告：
`build/release-runs/v4-authority-rebuild-8148083b/pb3-pb4-final-blocked.json`。枚举必须恰为
15 项；缺项、重复或未分类会让审计脚本非零。

| transition / seal | v4 map 影响 | checkpoint | digest 域 | 唯一语义 owner |
|---|---|---|---|---|
| `b10-enemy-team-slots-v1` | direct-hash-surface | rebuild | enemy-team 内容 + 全 managed publication hash surface + R13 controls | `pal-b10-enemy-team-slots.ts` |
| `b2-battle-field-domain-v1` | direct-hash-surface | rebuild | 全 managed publication hash surface + C1 NPC parent + battlefield source | `pal-b2-battle-field-domain.ts` |
| `c1-dialogue-identity-v1` | transitive-parent | rebuild | C1 successor file hashes + W9 parent seal | `pal-c1-dialogue-identity.ts` |
| `c1-npc-curation-v1` | direct-hash-surface | rebuild | 全 managed publication hash surface + C1 dialogue parent + approved edits | `pal-c1-npc-curation-transition.ts` |
| `c8-item-use-v5-v1` | none | preserve | item-use owned targets + script-v4-v5 parent ledger | `experimental/script-v5/c8-item-use-mg2.ts` |
| `r13-6c-lossy-closure-v1` | transitive-parent | rebuild | lossy closure ledger + source-semantics parent | `pal-r13-six-c.ts` |
| `r13-cadence-v1` | none | preserve | cadence evidence + C8 parent | `experimental/script-v5/r13-cadence-mg2.ts` |
| `r13-confirm-v1` | none | preserve | confirm evidence/audits + item-throw parent | `experimental/script-v5/r13-confirm-mg2.ts` |
| `r13-cross-activation-v1` | none | preserve | cross-activation evidence + cadence parent | `experimental/script-v5/r13-cross-activation-mg2.ts` |
| `r13-enemy-script-v1` | direct-body | rebuild | whole managed parent/successor bodies + enemy/script evidence | `experimental/script-v5/r13-enemy-script-augmentation.ts` |
| `r13-item-throw-v1` | none | preserve | item-throw evidence + cross-activation parent | `experimental/script-v5/r13-item-throw-mg2.ts` |
| `r13-source-semantics-v1` | direct-body | rebuild | whole managed parent/successor bodies + source controls | `experimental/script-v5/r13-source-semantics-mg2.ts` |
| `r13-z-source-closure-v1` | transitive-parent | rebuild | source/runtime closure + source-semantics parent | `experimental/script-v5/r13-z-transition-mg2.ts` |
| `script-v4-v5` | none | preserve | script identity ledger + source audit | `experimental/script-v5/p2-transform.ts` |
| `w9-entity-lifecycle-v1` | direct-hash-surface | rebuild | 全 managed publication hash surface + B10/R13 graph | `pal-w9-entity-lifecycle.ts` |

汇总：**9 rebuild / 6 preserve；2 direct-body / 4 direct-hash-surface /
3 transitive-parent / 6 unaffected**。

## PB4：enemy/script owned leaf 不漂移

重建前报告：`build/release-runs/v4-authority-rebuild-11fda923/pre.json`。最终逐文件对照：
`build/release-runs/v4-authority-rebuild-8148083b/pb3-pb4-final-blocked.json`。

每个 profile 均覆盖 `content/enemies.json`、`content/scripts/index.json` 与 307 个 script chunks，
合计 **927 files**；`driftCount=0`、`exactMatch=true`。

| profile | files | before/after aggregate sha256 |
|---|---:|---|
| `r13-4-v9` | 309 | `b5c9f3b8c62f85818dad4ff5539000382b5e28887e85f71492454fa756a5b575` |
| `r13-5-v10` | 309 | `ee5115bfab5a25a94b92f362b82cc72e8d4ac9836a68b7f362b67b5fb482559e` |
| `r13-6a-v10` | 309 | `14e14f7f32de10790fd4c3a6d6a67966b42e82e4f234a4e46862f4631314781c` |

PB4 证明 enemy/script owned leaf 没有随 map v4 authority 重建漂移；它不证明旧 rewind/seal 的
JSON 表示合同仍值得在 current-only 开发树保留。

## ARCH 逐项处置清单

表内“产品路径”指 editor/game/content 的当前运行时；`packages/migrate` 的开发期生成、测试与 release
proof 单独标明。

| artifact | 当前用途 | 唯一调用方 / 调用域 | 产品路径 | ARCH 建议 | 临时保留时的真实输入与删除条件 |
|---|---|---|---|---|---|
| `baselines/pal/_state.json` | 当前 PAL baseline 的 managed/hash/transition authority | `migration-baseline.ts` loader；所有 migrate proof 由此统一进入 | 不进运行时；进入 migrate/release | **fold into current**：ARCH 完成后只描述一个 current canonical publication | 输入是当前 baseline；旧 transition metadata 清零/折叠并且 current release route 通过后删除历史字段 |
| `baselines/pal/_transitions/{15 files}` | 逐阶段 seal/ledger；PB3 表列出全部域 | 每项唯一语义 owner 见 PB3；公共读取边界为 baseline loader / `pal-test-oracle.ts` | 不进运行时；进入 migrate/release | **delete 或 fold into current**：按 ARCH 决定保留 current producer proof，不保留开发期版本链 | 仅当 ARCH 尚需验证一次 current 重建时临时保留；current-only baseline、manifest、canary 与 B focused 通过即删旧链 |
| `content/migrations/script-v4-v5-save.json`（baseline + project） | source-semantics 将其当 opaque sidecar，manifest 仍记录其 hash | 唯一语义消费边界 `r13-source-semantics-mg2.ts`；manifest 只引用路径/hash | 当前产品 manifest 可见，但内容只服务旧 save migration | **isolated source converter 或 delete**，不得继续混入 current canonical producer | 真实文件两份 sha256 均为 `30ce8717aa9f6f21e14d862cde2aa44dff8f3652833826b4506e49bc7a6a2ed0`；确认无必须消费的真实 v4 save 或完成一次隔离转换后删除 |
| `pal-current-c1-rewind.ts` | current publication 回卷 C1-3→C1-2→W9，按 byte-level seal 验签 | 唯一调用域是 migrate tests/audit scripts；多个测试共享这个 gateway，无 editor/game caller | 否 | **delete**；若 ARCH 留 current proof，则只 fold 正向 current assertion，不保留 rewind | 真实输入是当前 baseline + v14/v16 manifest +旧 seals；ARCH 删除 C1/B2 历史链或以 current-only proof 取代后立即删 |
| `historical-enemy-team-authority.ts` | current stable `enemyTeamId` 与历史 numeric team 的验证边界 | 多个 migrate historical validators；无 runtime loader caller | 否 | 优先 **delete**；若仍有不可重生历史输入，只保留 isolated source converter | 真实输入是 Git 中旧 R13 proof/baseline；历史 validators 折叠到 current stable IDs 后删 |
| `experimental/script-v5/published-r13-source-semantics-test-fixture.ts` | 回卷已发布 R13 source-semantics baseline/transition | 只被 migrate integration/canary/published enemy fixture 调用 | 否 | **delete** 或 fold 为 current source-backed fixture | current canary 不再要求历史 rewind 后删除 |
| `experimental/script-v5/published-v4-snapshot.ts` | 组合 published v4 transitions 供 shadow migration/test | `pal-test-fixture.ts`、`migrate-script-v5-shadow.mts` 及自身测试 | 否 | **delete**；若 shadow 仍必需则改为 current snapshot producer | current-only shadow/fixture 改造完成后删除 |
| `scripts/build-v4-r13-authority.mts` | 一次性从 current v4 source 构造 R13→C1 checkpoint | 人工 CLI；无产品 caller | 否 | **delete**；不要升级为长期 compat builder | 真实输入是当前 project/baseline、6 preserved transitions 与 opaque sidecar；ARCH 产出 current-only authority 后删 |
| `scripts/resume-v4-c1-authority.mts` | 从 C1 checkpoint 继续构造 C1 NPC/B2/current chain | 人工 CLI；无产品 caller | 否 | **delete** | 真实输入是上述 checkpoint + user-approved decision digest；旧 C1/B2 chain 折叠后删 |
| `scripts/install-v4-authority-report.mts` | 把一次性报告中的 9 个 rebuilt seals 写回 baseline | 人工 CLI；无产品 caller | 否 | **delete** | 仅用于本次未通过 focused 的候选；ARCH 不应把该候选当 authority 安装 |
| `scripts/audit-v4-c1-approval-rebind.mts` | 比较 173 个 C1 approval decisions 的语义等价 | 人工 CLI；无产品 caller | 否 | **delete** 或 fold 为 current approval audit | current-only approval/provenance 确定后删 |
| `scripts/audit-v4-authority-rebuild.mts` | PB3 15-seal census + PB4 927-file sha256 对照 | 人工 CLI；无产品 caller | 否 | 暂时 **fold into current audit**，B 最终 proof 后可删 | 真实输入是 pre/post report；ARCH 完成 transition inventory 处置、B final proof 固定后删除 |
| `historical-map-surface-authority.ts` + test | 已判错的 pre-v4 map hash/body 投影 | 曾由 `pal-current-c1-rewind.ts` / fixture/canary 调用 | 否 | **delete（工作树已删除，禁止恢复）** | 无可批准真实输入；Git 保留历史即可 |

## ARCH 接手约束

1. 不得把当前 295 个表示差异解释成地图 v4 语义错误；PB4 已证明 enemy/script owned leaf 不漂移，
   当前地图仍只接受 canonical v4。
2. 不得恢复 v2/v3 parser、adapter、compat fallback、pre-v4 map body/hash 投影或 current-key-order
   transplant 产品层。
3. 若 ARCH 认定仍有无法重生且必须消费的真实输入，只能建立隔离 source converter，并在 ARCH 卡
   写明输入、唯一调用方和删除条件；现有证据只确认 `script-v4-v5-save.json` 是真实 opaque sidecar。
4. ARCH 完成单版本收口、形成干净固定提交并让 focused/manifest/canary 快速门禁通过后，B 才能在
   最终测试拓扑上运行一次验收要求的完整 serial/parallel proof。
5. 本轮生成的 9-seal authority 候选不应直接提交或安装为 current truth；它通过内部 rebuild chain，
   但没有通过当前 baseline 的 B2 successor surface 验证。
