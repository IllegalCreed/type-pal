# 逐文件代码治理账本

基点：`b9ba7e0faadf56519da024c0343f5b44b9a5c447`。机器全量清单由
[`code-quality-inventory.mjs`](../../../scripts/quality/code-quality-inventory.mjs) 生成；本账本只登记已经由
Codex 直接读过源码、生产 caller/合同和验证证据的文件，不把“所在包全绿”推成文件已审。

起始基点机器清单：2,962。当前 tracked 清单（含当前主线与治理分支文件）：3,267。
当前已闭合核验：338；已读但待审：10；尚未逐文件核验：2,919；合计未闭合：2,929。
`待核` 不等于“没有问题”，也不等于允许跳过；只有补齐职责、调用方、风险判断、证据和验证后才可改为 `已验证`、`保留`、`blocked` 或 `rework`。

2026-10-07存档测试有限集成新增`current-codec.contracts.test.ts`，仅同步tracked机器清单及待核数；本专项已审/待审状态不变。测试合同验收见[存档三审](../evidence/TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/codex-review-r3.md)，不以测试通过替代本专项逐文件语义审核。

2026-10-11 合入 E2E-CONTINUOUS-001-006 后，实际 inventory 比原清单净增 166 项，计入待核，
不因此增加本专项已闭合数量。PAL 引用测试已核保留独立 collector/index blocker parity，当前
内容 census 与真实 loader 回归通过；coverage 配置仅移除已删除 `pal-project.test.ts` 的排除项，
其历史质量证据不重写。主线验收与本专项全仓逐文件审核仍分开记录。

2026-10-11 CI 干净 checkout 修复新增一份原始记录测试夹具，仅同步库存与待核数；
测试断言及原始 SSS 字节核验不自动计为本专项逐文件审核完成。

2026-10-11 三个 GLM 有限测试包新增三个测试文件，库存增加三项并计入待核；
本次合同验收不自动增加本专项逐文件治理闭合数量。

2026-10-12 编辑器初始状态方案新增两个实现文件、两个测试文件和一份合法场景夹具，
实际 inventory 增加五项并计入待核；功能验收与本专项逐文件治理分开记录。

2026-10-13 CODE53候选复核：毒键语义与0x61额外机制边界使两个已有实现恢复review；没有新增关闭。状态页、battle-system、inspect、dev-panel仍pending，待整文件/生命周期证据与统一门。

2026-10-13 CODE53 ownership补证：离队角色5条合同、正式0x75清毒与装备重建共7个有效反控已记录；两份测试仍待整文件验收。CODE80只读复现dev换队生命周期并等待产品裁决；没有新增关闭，计数仍338/10/2919。

2026-10-13 CODE80裁决与实现：用户批准战斗期间 B 面板禁止入队/离队、大世界照常编辑；dev-panel 队伍卡增加 battle disabled/mode guard，探索切队补正式 `updateAllEquipments` 重建伪毒。新增 party-lifecycle 测试与两个实现后反控；最终 check/ratchet/protected fast/lint/docs/ledger 全部通过，但没有新增关闭；dev-panel listener/observer/thumbnail 生命周期风险继续 pending。

| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |
|---|---|---|---|---|
| `packages/shared/src/rle.ts` | product | 已验证 | CODE-QUALITY-1；RLE 定向、shared 全包、check、ratchet、protected fast、lint | generic/strict framing 边界已收 |
| `packages/shared/src/rle.test.ts` | test | 已验证 | CODE-QUALITY-1；合法帧与回归 oracle | 只登记合同，不以数量验收 |
| `packages/shared/src/rle.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-1；截断/越界反例 | 高判别力反例 |
| `packages/shared/src/rle.glm-runtime-resource.test.ts` | test | 已验证 | CODE-QUALITY-1；真实 runtime resource caller | 宽容入口合同 |
| `packages/shared/src/mkf.ts` | product | 已验证 | CODE-QUALITY-2；raw 2,373 chunks、shared 全包、全仓门 | offset table 边界 |
| `packages/shared/src/mkf.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-2；截断/越界/倒序 offset | 纯 codec 合同 |
| `packages/shared/src/rng.ts` | product | 已验证 | CODE-QUALITY-2；raw 1,464 frames、shared 全包、全仓门 | payload/surface 边界 |
| `packages/shared/src/rng.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-2；opcode payload/surface 反例 | 不扩展 runtime 语义 |
| `packages/editor/src/core/project-reference.pal.test.ts` | test | 已验证 | CODE-QUALITY-1b；collector 直接结果与历史提交证据 | 仅更新过期 oracle |
| `packages/pal-extract/src/events/annotate.ts` | product | 已验证 | CODE-QUALITY-3a + Q3f；typed annotation 与 symbols sidecar boundary、全仓 gates | Q3f done |
| `packages/pal-extract/src/events/annotate.test.ts` | test | 已验证 | CODE-QUALITY-3a；annotation 合同 | 纯转换输出 |
| `packages/pal-extract/src/events/annotate.glm-runtime-resource.test.ts` | test | 已验证 | CODE-QUALITY-3a + Q3f；真实 annotation 与 symbols malformed contracts | Q3f done |
| `packages/pal-extract/src/events/slice.ts` | product | 已验证 | CODE-QUALITY-3a；BFS/recompile round-trip、全包、全仓门 | typed visitor boundary |
| `packages/pal-extract/src/events/slice.test.ts` | test | 已验证 | CODE-QUALITY-3a；scene/global/shared 合同 | 不以 coverage 单独验收 |
| `packages/pal-extract/src/events/slice.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3a；切分边界反例 | 真实 caller |
| `packages/pal-extract/src/events/slice.glm-runtime-resource.test.ts` | test | 已验证 | CODE-QUALITY-3a；真实资源 slice 合同 | 不改生成物 |
| `packages/pal-extract/src/io/msg.ts` | product | 已验证 | CODE-QUALITY-3b；offset 越界/倒序 34/34，pal-extract/full check、ratchet、protected fast | Q3b done |
| `packages/pal-extract/src/io/msg.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3b；越界/倒序反例 | Q3b done |
| `packages/pal-extract/src/io/sss.ts` | product | 已验证 | CODE-QUALITY-3b；chunk2/3/4 对齐反例，真实 SSS，全包/check/ratchet/protected | Q3b done |
| `packages/pal-extract/src/io/sss.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3b；结构未对齐 34/34 | Q3b done |
| `packages/shared/package.json` | product | 已验证 | shared check/typecheck；仅 workspace 元数据 | 无运行时逻辑 |
| `packages/shared/tsconfig.json` | product | 已验证 | shared typecheck；编译边界 | 无产品行为 |
| `packages/shared/src/events.ts` | product | 已验证 | 直接读取 Command union；shared typecheck/events 合同 | 类型 schema，未改公共接口 |
| `packages/shared/src/input.ts` | product | 已验证 | 直接读取 AbstractKey/InputSource；input type contract | 类型 schema，未改输入语义 |
| `packages/shared/src/index.ts` | product | 已验证 | 直接读取 barrel exports；shared typecheck | 公共出口保持 |
| `packages/shared/src/pal-authored-map-names.ts` | product | 已验证 | authored fixture hash/222 entries 测试 | 缺名显式 undefined，无 fallback |
| `packages/shared/src/resources.ts` | product | 已验证 | 直接读取全部资源接口；pal-extract/game callers 与 typecheck | 纯类型合同 |
| `packages/shared/src/rle-encode.ts` | product | 已验证 | encode roundtrip、独立 byte oracle、128KB guard | 与 RLE decoder 合同一致 |
| `packages/shared/src/tables.ts` | product | 已验证 | 直接读取表类型与 pal-extract/game callers；typecheck/tables type contract | 纯类型合同 |
| `packages/shared/src/yj2.ts` | product | 已验证 | CODE-QUALITY-2b；2,626 raw chunks / 34,367,608B 逐字节一致，位流/回引边界与反控 | Q2b done |
| `packages/shared/src/__tests__/glm-foundation-fixtures.ts` | test | 已验证 | YJ2/MKF/RNG 固定向量直接被 shared tests 消费 | test-only fixture |
| `packages/shared/src/__tests__/resources-types.ts` | test | 已验证 | shared type fixtures；typecheck | test-only fixture |
| `packages/shared/src/events.test.ts` | test | 已验证 | Command union type contract | 不以数量验收 |
| `packages/shared/src/index.test.ts` | test | 已验证 | timing constants contract | 公共常量 oracle |
| `packages/shared/src/input.test.ts` | test | 已验证 | AbstractKey/InputSnapshot/InputSource contract | 类型 contract |
| `packages/shared/src/pal-map-names.test.ts` | test | 已验证 | 222 entries/hash/undefined gaps | authored fixture oracle |
| `packages/shared/src/rle-encode.boundaries.test.ts` | test | 已验证 | 126/127/128 byte oracle、pad/offset | 高判别力反控 |
| `packages/shared/src/rle-encode.glm-runtime-resource.test.ts` | test | 已验证 | 真实 runtime resource encoder contract | caller oracle |
| `packages/shared/src/rle-encode.test.ts` | test | 已验证 | encoder/decoder roundtrip、128KB guard | 合法输入合同 |
| `packages/shared/src/rle.glm-o.test.ts` | test | 已验证 | shared RLE/YJ2 public entry contracts | Q1/Q2 相邻 oracle |
| `packages/shared/src/rng.test.ts` | test | 已验证 | RNG public decoder contract | Q2 相邻 oracle |
| `packages/shared/src/tables.test.ts` | test | 已验证 | type-only Item contract | 类型 contract |
| `packages/shared/src/yj2.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-2b；9 cases 含位流/回引反例、shared 全包 131 tests | Q2b done |
| `packages/pal-extract/src/resources/sprite.ts` | product | 已验证 | CODE-QUALITY-3d；indexed PNG 尺寸/pixels/opaque 输入边界，callers、全包/check/ratchet/protected/lint | Q3d done |
| `packages/pal-extract/src/resources/sprite.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3d；非法尺寸/短 pixels/短 opaque 反例与 negative control | Q3d done |
| `packages/editor/src/ui/SpriteFrameWorkbench.tsx` | product | 已验证 | CODE-QUALITY-3c；174 行缺帧 fallback branch 逐文件定位；公开组件回归与 coverage gate | Q3c done |
| `packages/editor/src/ui/SpriteFrameWorkbench.animation-boundary.test.tsx` | test | 已验证 | CODE-QUALITY-3c；缺帧动画时序合同与 fallback mutant 反控 | Q3c done |
| `packages/pal-extract/src/resources/parsers/_utils.ts` | product | 已验证 | 直接读取 layout 常量与 u16/s16 helper；所有 parser callers、typecheck | 纯布局 helper |
| `packages/pal-extract/src/resources/parsers/ball.ts` | product | 已验证 | RLE header/坏帧 skip、BALL caller 与 parser tests；全包通过 | 保留空 chunk skip |
| `packages/pal-extract/src/resources/parsers/battle-fields.ts` | product | 已验证 | 12B fixed record/signed effects guard、真实 DATA caller 与 tests | 非整除显式失败 |
| `packages/pal-extract/src/resources/parsers/data-misc.ts` | product | 已验证 | level-up/effect table contracts、现有短输入宽容测试与 real DATA caller | 宽容截断合同有直接测试，未擅改 |
| `packages/pal-extract/src/resources/parsers/enemies.ts` | product | 已验证 | ENEMY/OBJECT fixed layout、signed fields、name/map callers 与 tests | short map helper 合同保留 |
| `packages/pal-extract/src/resources/parsers/enemy-teams.ts` | product | 已验证 | 10B team record、slot sentinel/translation/name map tests | 0/FFFF 语义保真 |
| `packages/pal-extract/src/resources/parsers/fire.ts` | product | 已验证 | FIRE YJ2/raw fallback、empty/short group guard 与 callers/tests | 不改资源降级 |
| `packages/pal-extract/src/resources/parsers/items.ts` | product | 已验证 | OBJECT item range/truncation guard、wObjectID/MengShe split 与 tests | 稳定全局 ID |
| `packages/pal-extract/src/resources/parsers/player-roles.ts` | product | 已验证 | 900B SoA exact guard/cursor check、DATA caller/role fixtures | 不改角色 schema |
| `packages/pal-extract/src/resources/parsers/rgm.ts` | product | 已验证 | RGM header/RLE/PNG caller 与 tests | 空 chunk skip |
| `packages/pal-extract/src/resources/parsers/rng-frames.ts` | product | 已验证 | shared RNG decoder + PNG adapter caller/fixtures | 不复制 codec |
| `packages/pal-extract/src/resources/parsers/sounds.ts` | product | 已验证 | metadata pure mapping、SOUNDS caller/tests | 不解析 WAV 内容 |
| `packages/pal-extract/src/resources/parsers/spells.ts` | product | 已验证 | OBJECT magic/union fields、DATA magic callers/tests | 保持 scriptDesc offset contract |
| `packages/pal-extract/src/resources/parsers/stores.ts` | product | 已验证 | 18B STORE guard、zero sentinel/real DATA tests | 不改 store IDs |
| `packages/pal-extract/src/events/disasm.ts` | product | 已验证 | SSS raw disasm/roundtrip callers、事件全包与真实 bytecode | 未改 opcode 语义 |
| `packages/pal-extract/src/events/recompile.ts` | product | 已验证 | roundtrip inverse 与全量 bytecode digest | 结构命令 fail-loud |
| `packages/pal-extract/src/events/opcodes.ts` | product | 已验证 | opcode table 与 primary script.c、disasm/slice callers | raw fallback 保持 |
| `packages/pal-extract/src/events/roundtrip.ts` | product | 已验证 | parseSss/parseMessages/disasm/recompile 真实入口 | mismatch 报告合同 |
| `packages/pal-extract/src/font/bdf-to-json.ts` | product | 已验证 | BDF parser/glyph JSON tests 与 optional CLI caller | 非法行宽容合同已有反例 |
| `packages/pal-extract/src/io/mkf.ts` | product | 已验证 | shared MKF re-export、2,373 raw chunks、shared check | 无重复 codec |
| `packages/pal-extract/src/io/rle.ts` | product | 已验证 | shared RLE re-export、extractor callers | 无重复 codec |
| `packages/pal-extract/src/io/word.ts` | product | 已验证 | WORD raw/content pins 与宽容短输入既有合同 | 不擅改并行宽容行为 |
| `packages/pal-extract/src/io/yj2.ts` | product | 已验证 | shared YJ2 re-export、2,626 raw segments | 无重复 codec |
| `packages/pal-extract/src/resources/asset-manifest.ts` | product | 已验证 | manifest determinism/DS_Store/self exclusion tests、CLI caller | path/version pure contract |
| `packages/pal-extract/src/resources/battle-sprite.ts` | product | 已验证 | kind/id composite key、missing chunk skip、PNG callers/tests | 不混 enemy/player identity |
| `packages/pal-extract/src/resources/enemy-pos.ts` | product | 已验证 | 100B fixed table/signed layout boundary tests、CLI caller | layout transpose explicit |
| `packages/pal-extract/src/resources/map.ts` | product | 已验证 | 65536B map guard、real MAP/GOP decode、CLI caller | raw tilemap output |
| `packages/pal-extract/src/resources/palette.ts` | product | 已验证 | VGA/night color pins、short-input宽容既有合同、CLI caller | 不改变 palette mapping |
| `packages/pal-extract/src/resources/scene.ts` | product | 已验证 | scene range dump/real resource tests、CLI caller | dense scene bounds |
| `packages/pal-extract/src/resources/tables.ts` | product | 已验证 | parser barrel exports、all table callers/typecheck | 无运行时实现 |
| `packages/pal-extract/src/cli.ts` | product | 已验证 | Q3f/Q3g；全量 73-896 行 IO/清理/降级/manifest 直接审计；full check/ratchet/protected/lint | Q3g done |
| `packages/content/src/asset.ts` | product | 已验证 | 直接读取 AssetCatalog/path/origin/role closure validators 与 1490 content tests/full check | 保持 stable AssetId/path ownership |
| `packages/content/src/project-map.ts` | product | 已验证 | 直接读取 canonical version 4/map matrix/stamp placement validator 与 content tests | 不改 schema |
| `packages/content/src/scene-index.ts` | product | 已验证 | 直接读取 stable scene id/path/index validator 与 content tests | 路径 fail-closed |
| `packages/content/src/validate-runtime.ts` | product | 已验证 | 直接读取 runtime scene/hooks/entities validator 与 content tests | 旧 cast 仅校验后 DTO 投影 |
| `packages/content/src/actor-condition.ts` | product | 已验证 | 直接读取 carried-status/condition shape guards 与 content contract tests | 稳定 status/poison 引用 |
| `packages/content/src/entity-lifecycle.ts` | product | 已验证 | 直接读取 lifecycle shape/reference closure/normalization 与 content tests | 缺 map 归一空表合同 |
| `packages/content/src/map-index.ts` | product | 已验证 | 直接读取 stable map id/path/index guards 与 content tests | 路径 fail-closed |
| `packages/content/src/migration-diagnostic.ts` | product | 已验证 | 直接读取 migration sidecar schema/category/source validation 与 content tests | 仅迁移诊断，不污染运行时 schema |
| `packages/content/src/runtime-scene.ts` | product | 已验证 | 直接读取 runtime hostile/chase/victory/flee policy guards 与 content tests | explicit policy contract |
| `packages/content/src/enemy-team.ts` | product | 已验证 | 直接读取 stable enemy-team id/slot/reference validators 与 content tests | 不用数组位置当身份 |
| `packages/content/src/enemy-ai-condition-guard.ts` | product | 已验证 | 直接读取 AI condition recursive guard 与 content tests | 条件联合边界明确 |
| `packages/migrate/src/migration-transaction.ts` | product | 已验证 | 直接读取 journal v2/path/scope/precondition/atomic rename/recovery；migrate 95/723 与 transaction boundary suites | 事务写盘 ownership 已有反控 |
| `packages/migrate/src/pal-source-io.ts` | product | review | 直接读取 extracted source partitions/scene and asset callers；发现 generic JSON casts 需后续 schema/source-contract 批次 | 不改 generated source |
| `packages/migrate/src/migration-project-io.ts` | product | review | 直接读取 managed-file discovery/TOCTOU hash ownership；JSON shape validation 与 content validators 的边界留 Q4 | 不改 project output |
| `scripts/quality/lint-zero.mjs` | tool | 已验证 | whole-repository Biome JSON report/fail-closed wrapper；3198-file zero-diagnostic runs | 不接受过滤参数 |
| `scripts/quality/code-quality-inventory.mjs` | tool | 已验证 | scoped git inventory/caller propagation、quality inventory tests | machine snapshot 不冒充 verdict |
| `scripts/quality/code-quality-ledger.mjs` | tool | 已验证 | CODE-QUALITY-6a；真实 inventory/ledger uniqueness/status/count verifier、37 quality-tool tests | 只校验记录完整性，不把机器 PASS 当语义审查 verdict；fail-closed |
| `scripts/quality/code-quality-ledger.test.mjs` | test | 已验证 | CODE-QUALITY-6a；9 个独立反例/真实仓库调用：重复、未知路径、计数漂移、表形状/状态/证据缺失、inventory 变更 | 真实 Node quality runner 纳入；不修改 ledger |
| `packages/game/src/core/battle/battle-progression.ts` | product | 已验证 | CODE-QUALITY-3x；battle.c:991-1373,1226-1328；global.c:2347-2454；settlement/battle-system callers | 306 行逐段核验主升级、隐藏经验池顺序/整数截断/99 边界、主升级 cap、HP/MP 时机、法术学习去重与 snapshot 有效值；205 定向/相邻 tests、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-progression.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3x；139 行全文、CHECK_HIDDEN_EXP/主升级边界与 205 定向/相邻 tests | wLevel>99、隐藏无999 cap、池 RNG 顺序、无主升级不回满/主升级含隐藏回满反例 |
| `packages/game/src/core/battle/__tests__/battle-levelup.test.ts` | test | 已验证 | CODE-QUALITY-3x；340 行全文、主升级/法术/投影 oracle 与 205 定向/相邻 tests | 活人 gate、阈值/余数/连升/满级、STAT_LIMIT、法术去重/level gate、runtime→battle projection 反例 |
| `scripts/docs/check.mjs` | tool | 已验证 | Markdown link/task/board/index verifier；docs check runs | fail-closed task state |
| `scripts/docs/check-testing.mjs` | tool | 已验证 | testing catalog/index/legacy flat verifier；testing docs runs | 独立测试文档门 |
| `scripts/docs/config.mjs` | tool | 已验证 | current docs versions/sections/exceptions source | 不改历史格式 |
| `scripts/coverage/metrics.mjs` | tool | 已验证 | exact integer ratio/aggregate comparison tests | 不用 pct 四舍五入 |
| `scripts/coverage/inventory.mjs` | tool | 已验证 | source/test scope diff and removal contracts | 不静默缩窄范围 |
| `scripts/coverage/environment.mjs` | tool | 已验证 | compile-cache disabled child environment contract | 保留无关环境 |
| `scripts/coverage/protected-baseline.mjs` | tool | 已验证 | protected baseline bootstrap/compare fail-closed tests | 无 baseline 不 fail-open |
| `scripts/coverage/config.mjs` | tool | 已验证 | seven-package source/test selection and fast exclusions | E2E exclusion boundaries |
| `scripts/coverage/run.mjs` | tool | 已验证 | direct read of package runner/ratchet/protected orchestration; Q3c SpriteFrame branch fixed and support-mode gates passed | Q6 runner audit slice |
| `scripts/script-governance/run.mjs` | tool | 已验证 | canonical install census CLI, output symlink guard, script-governance tests | 不写产品数据 |
| `packages/pal-extract/package.json` | product | 已验证 | package scripts/dependency boundary；pal-extract check/full gates | 无运行时逻辑 |
| `packages/pal-extract/tsconfig.json` | product | 已验证 | source/scripts include 与 typecheck | 无产品行为 |
| `packages/pal-extract/src/utils/gbk.ts` | product | 已验证 | GBK/PUA residue mapping tests与M.MSG caller | 资源正文转码合同 |
| `packages/pal-extract/scripts/grep-sdlpal-chunks.ts` | product | 已验证 | execFile 参数数组、reference-only read helper | 无写盘 |
| `packages/pal-extract/scripts/extract-videos.ts` | product | review | ffmpeg external IO/mtime skip/empty output 直接读过 | 需后续工具失败反控，不与主 extract 混写 |
| `packages/pal-extract/scripts/find-scenes-without-setpartypos.mjs` | product | review | scene/event/tilemap BFS 与写盘脚本直接读过 | 诊断生成器需后续 path/input 复核 |
| `packages/pal-extract/audit-data-mkf.mjs` | product | review | DATA.MKF diagnostic census 直接读过；发现绝对 repo path 与 shared MKF duplicate | 仅诊断脚本，Q6/CLI tool audit 待核 |
| `packages/game/src/assets/loader.ts` | product | 已验证 | CODE-QUALITY-3h；全量读取 loadAll/fetchPalette/SceneAssetsCache，真实 bootstrap caller、asset tests、game 定向测试 | fetch/status 与可选资源降级均有 caller；cache LRU/protect 合同保留，未发现直接缺陷 |
| `packages/game/src/assets/tileset-blob.ts` | product | 已验证 | CODE-QUALITY-3h；gzip/raw blob、shared parseSpriteChunk、tileset/NPC/battle/magic callers 与 snapshot/load tests | gzip 魔数防双解压、HTTP 状态和帧 key 合同已有反例；未改资源格式 |
| `packages/game/src/assets/png.ts` | product | 已验证 | CODE-QUALITY-3h；createImageBitmap/canvas/alpha mask caller 与 PNG failure/close tests | 解码失败保留 cause，bitmap finally close；未发现直接缺陷 |
| `packages/game/src/assets/rle-decode.ts` | product | 已验证 | CODE-QUALITY-3h；shared codec re-export、dialog-assets base64 caller、identity tests | 无重复 codec；base64 非法输入继续 fail-loud |
| `packages/game/src/shell/fetch-retry.ts` | product | 已验证 | CODE-QUALITY-71；main/bootstrap fetch callers、HTTP/method/backoff/uninstall/AbortError tests；18 tests、全仓 check/ratchet/protected fast/lint | AbortError/signal aborted fail-fast；重试合同与公共 API保持 |
| `packages/game/src/shell/bootstrap-resources.ts` | product | 已验证 | CODE-QUALITY-3h；bootstrap.ts 真实 soundfont/resourcesReady caller、并发屏障和 rejection/degradation tests | soundfont 原始 rejection 与 settle barrier 分离；glyph 仅显式 tofu 降级；未发现直接缺陷 |
| `packages/game/src/shell/fetch-retry.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3h；无效配置合同、HTTP/method/backoff/最终身份反例；删除 guard 的 mutant 失败 | 高判别力输入合同，不以数量验收 |
| `packages/game/src/assets/dialog-assets.ts` | product | 已验证 | CODE-QUALITY-3i；portrait/icon manifest callers、PNG/RLE adapters、dialog-assets/host tests 与 game typecheck | 资产缺失按现行空 map 降级；不伪造 manifest 帧，不改资源格式 |
| `packages/game/src/shell/precache-client.ts` | product | 已验证 | CODE-QUALITY-3i；main/bootstrap SW caller、ready/start/pause/resume/unavailable tests | onPlayable 前不启动 precache，ready race 仅缓冲 start；现行 SW 协议保留 |
| `packages/game/src/shell/precache-ui.ts` | product | 已验证 | CODE-QUALITY-3i；DOM widget/unified phase tests、host boundary 20 contracts、功能性 DOM 状态 | 两段进度单调/clamp、进入/完成/失败生命周期已有合同；未发现直接缺陷 |
| `packages/game/src/shell/audio-volume.ts` | product | 已验证 | CODE-QUALITY-3i；bootstrap 三通道 caller、storage/key tests、NaN negative control | 修复 NaN 音量进入 sink/localStorage；有限/0..1 合法行为不变 |
| `packages/game/src/shell/trademark-fallback.ts` | product | 已验证 | CODE-QUALITY-3i；reference/sdlpal main.c:197-203、rng-player caller、trademark/splash framebuffer/timing tests | 只纠正过时 skipKeys 注释；DOS chunk 6/1000ms/600ms 行为未改 |
| `packages/game/src/shell/audio-volume.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3i；NaN/0/default/三通道共享 mute 合同；删除 NaN guard 的 mutant 失败 | 直接 setter/storage/sink oracle，不重复 clamp 主干 |
| `packages/game/src/shell/fetch-retry.test.ts` | test | 已验证 | CODE-QUALITY-71；GET/HTTP/POST/idempotent/AbortError 主 oracle；6 tests | 取消不重复请求 |
| `packages/game/src/shell/fetch-retry.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-71；uninstall/重新安装生命周期 oracle；2 tests | 还原后不再重试 |
| `packages/game/src/tools/display-scale.ts` | product | 已验证 | CODE-QUALITY-3j；canvas/localStorage/fullscreen callers、scale tests；NaN negative control | 修复 NaN 百分比写入 NaN CSS/storage；有限百分比 clamp/居中形态不变 |
| `packages/game/src/tools/fps-overlay.ts` | product | 已验证 | CODE-QUALITY-3j；tools-panel/rAF caller、启停/采样/DOM tests | module sampling state 在停用时清零；非法持久值仅 `'1'` 开启 |
| `packages/game/src/tools/toast.ts` | product | 已验证 | CODE-QUALITY-3j；save/tool callers、success/error/info/stack lifecycle tests | DOM 单例/多 toast 到期自删合同完整，未发现直接缺陷 |
| `packages/game/src/tools/map-names.ts` | product | 已验证 | CODE-QUALITY-3j；shared authored map-name caller 与 known/fallback tests | 缺名保持 `地图N` 回退，不改 authored table |
| `packages/game/src/tools/speedrun/time-format.ts` | product | 已验证 | CODE-QUALITY-3j；speedrun store/overlay callers、format/parse boundary + leaves tests | 合法时钟/解析/符号/负数合同完整，未发现直接缺陷 |
| `packages/game/src/tools/speedrun/countdown.ts` | product | 已验证 | CODE-QUALITY-3j；speedrun store caller、singleton/update/remove DOM tests | 单节点复用、null 幂等移除；未发现直接缺陷 |
| `packages/game/src/tools/speedrun/checkpoints.ts` | product | 已验证 | CODE-QUALITY-3j；speedrun store/detectors caller、21-id/monotonic/BANANA tests 与 PalTimer 注释 | 只读核对坐标/物品/检测器；不擅改速通数据 |
| `packages/game/src/tools/display-scale.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3j；NaN/round/fullscreen/FPS lifecycle 合同；删除 NaN guard 的 mutant 失败 | 合并现有 display-scale/FPS 合同，不堆弱断言 |
| `packages/game/src/present/framebuffer.ts` | product | 已验证 | CODE-QUALITY-3k；present.ts/scene thumbnails/shell callers、framebuffer + leaves tests | fixed-size/default 与离屏尺寸、边界静默写、palette 缺色 fallback 合同完整；未发现直接缺陷 |
| `packages/game/src/present/screen-shake.ts` | product | 已验证 | CODE-QUALITY-3k；present.ts:707-715 caller、sdlpal video.c anchor、shake/bounds tests | 奇偶垂直搬移、level 越界、advance=false 补帧和 shakeTime 递减合同完整 |
| `packages/game/src/present/screen-wave.ts` | product | 已验证 | CODE-QUALITY-3k；present.ts:313-317 caller、sdlpal scene.c:389-399、global.h:379 WORD、real raw opcode 0x71 `[255,65532,0]`、wave/leaves/mirror tests | 修复 JS number 负 progression 跨过 0 未关断；`<=0` 对齐 C WORD 回绕后 `>=256` 收尾，既有相位/循环行为不变 |
| `packages/game/src/present/dither-fade.ts` | product | 已验证 | CODE-QUALITY-3k；present.ts:658-673 caller、battle fade caller、dither/nibble tests | 72-step RG_INDEX/低位逼近合同完整；不改 fade 公式 |
| `packages/game/src/present/draw-number.ts` | product | 已验证 | CODE-QUALITY-3k；battle/menu/dialog callers、sdlpal ui.c:640-732、draw-number/slots tests | color base/alignment/R-to-L/truncate/opaque mask/缺帧合同完整 |
| `packages/game/src/present/follower-pos.ts` | product | 已验证 | CODE-QUALITY-3k；present.ts:393-417 caller、sdlpal scene.c:658/745、follower tests | walking/静止冻结/障碍回退/朝向源/trail fallback 合同完整；坐标保持原版 |
| `packages/game/src/present/framebuffer.test.ts` | test | 已验证 | CODE-QUALITY-3k；默认尺寸/write-clear/toImageData RGBA 合同 | 直接 framebuffer oracle |
| `packages/game/src/present/framebuffer.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3k；越界、自定义尺寸、缺色 fallback 反例 | 高判别力边界合同 |
| `packages/game/src/present/screen-shake.test.ts` | test | 已验证 | CODE-QUALITY-3k；奇偶搬移/递减/level 0/连续帧合同 | 公式 oracle |
| `packages/game/src/present/screen-shake-bounds.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；level 199/200/256、advance=false 边界合同 | 不重复主干 |
| `packages/game/src/present/screen-wave.test.ts` | test | 已验证 | CODE-QUALITY-3k；渐弱/清零/循环守恒合同 | 相位 reset 隔离 |
| `packages/game/src/present/screen-wave.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3k；advance=false/循环/跨帧相位/真实 raw 负 progression 收尾合同；mutant 4 total/3 fail→恢复 4/4 | typed indices + raw oracle |
| `packages/game/src/present/screen-wave-mirror.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；镜像 wave 表/关断/累加边界合同 | 独立行 shift oracle |
| `packages/game/src/present/dither-fade.test.ts` | test | 已验证 | CODE-QUALITY-3k；step0/outer1/72-step 收敛合同 | 原版 nibble oracle |
| `packages/game/src/present/dither-fade-nibble.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；RG_INDEX 顺序/低位回退/邻接不动合同 | 相位合同 |
| `packages/game/src/present/draw-number.test.ts` | test | 已验证 | CODE-QUALITY-3k；align/color/truncate/缺帧合同 | sdlpal UI oracle |
| `packages/game/src/present/draw-number-slots.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；opaque mask/末行/缺位/nLength=0 合同 | 直接 framebuffer oracle |
| `packages/game/src/present/follower-pos.test.ts` | test | 已验证 | CODE-QUALITY-3k；walking/frozenOffset/0x46/船/隐龙窟回归合同 | 一阶段行为回归 |
| `packages/game/src/present/follower-pos-axis.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；方向轴/障碍/短 trail/静止不调用 caller 合同 | 轴向反例 |
| `packages/game/src/present/battle/draw-battle-bg.ts` | product | 已验证 | CODE-QUALITY-3l；present-battle caller、battle.c:982 FBP 320×200、draw-battle-bg tests | 背景索引 0 不透明；尺寸裁剪/召唤低 nibble 染色合同完整 |
| `packages/game/src/present/battle/draw-battle-effect.ts` | product | 已验证 | CODE-QUALITY-3l；fight.c:2183/2188/2760 anchor、effect/magic overlay callers/tests | 底中 anchor、opaque mask、缺资源/坏 frame no-op 合同完整 |
| `packages/game/src/present/battle/draw-battle-num.ts` | product | 已验证 | CODE-QUALITY-3l；uibattle.c:1746-1808、present-battle showDamageNum caller、num tests | 40ms age、0..10 寿命、y 上移、5 位 right align 合同完整 |
| `packages/game/src/present/battle/draw-battle-settlement.ts` | product | 已验证 | CODE-QUALITY-3l；battle.c:1037-1321、word lookup/drawNumber/font callers、settlement pixel tests | exp/cash/level/hidden-exp/learn-magic screens 保持布局与 mask |
| `packages/game/src/present/battle/draw-battle-sprites.ts` | product | 已验证 | CODE-QUALITY-3l；battle.c/fight.c/uibattle.c anchors、present-battle caller、sprite pixel/leaves tests | target highlight、idle/death/fade、color shift、Y-sort/opaque mask 合同完整 |
| `packages/game/src/present/battle/draw-battle-ui.ts` | product | 已验证 | CODE-QUALITY-3l；uibattle.c UI state/early-return anchors、draw UI pixel/leaves tests | dialog/escape early return、menu/target/status layers 保持现行形态 |
| `packages/game/src/present/battle/present-battle.ts` | product | 已验证 | CODE-QUALITY-3l；battle.c scene order、screen-wave/shake/dither callers、present-battle tests | bg→wave→sprites→nums→UI→fade/shake 装配顺序直接核对 |
| `packages/game/src/present/battle/__tests__/draw-battle-bg.test.ts` | test | 已验证 | CODE-QUALITY-3l；背景写入/低 nibble shift 合同 | 直接 framebuffer oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-effect.test.ts` | test | 已验证 | CODE-QUALITY-3l；overlay anchor/mask/缺资源合同 | 直接 framebuffer oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-num.test.ts` | test | 已验证 | CODE-QUALITY-3l；floating nums age/position/clear 合同 | 真实 layer caller |
| `packages/game/src/present/battle/__tests__/draw-battle-settlement.test.ts` | test | 已验证 | CODE-QUALITY-3l；各结算 screen 合法输入合同 | typed settlement oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-sprites.test.ts` | test | 已验证 | CODE-QUALITY-3l；anchor/idle/color shift/death 合同 | battle state oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-ui.test.ts` | test | 已验证 | CODE-QUALITY-3l；UI state/early-return/menu/grid 合同 | typed UI oracle |
| `packages/game/src/present/battle/__tests__/present-battle.test.ts` | test | 已验证 | CODE-QUALITY-3l；装配顺序/命令消费/跨帧状态合同 | 真实 BattlePresent caller |
| `packages/game/src/present/battle/draw-battle-settlement.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3l；结算文字/布局 leaves 合同 | 不重复主干 |
| `packages/game/src/present/battle/draw-battle-sprites.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3l；sprite state/target/fade leaves 合同 | 不重复主干 |
| `packages/game/src/present/battle/draw-battle-ui.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3l；UI 分支/对话/目标 leaves 合同 | 不重复主干 |
| `packages/game/src/present/battle/battle-effect-num-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；effect/number pixel 证据 | 高判别力像素 oracle |
| `packages/game/src/present/battle/battle-settlement-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；settlement pixel/word layout 证据 | 高判别力像素 oracle |
| `packages/game/src/present/battle/battle-sprite-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；sprite pixel/mask/z-order 证据 | 高判别力像素 oracle |
| `packages/game/src/present/battle/battle-ui-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；battle UI pixel/early-return 证据 | 高判别力像素 oracle |
| `packages/game/src/core/battle/formulas.ts` | product | 已验证 | CODE-QUALITY-3m；fight.c:131-389 primary source、battle callers、formula tests | SHORT cast/CLASSIC formula/resist/element field 合同逐段核对；未发现直接缺陷 |
| `packages/game/src/core/battle/magic-damage.ts` | product | 已验证 | CODE-QUALITY-3m；fight.c:4270-4318/5300-5400/4673-4853、inline/Simulate/throw callers、magic tests | per-target RNG/minDamage/def/resistance/autoDefend/defeated skip 合同逐段核对 |
| `packages/game/src/core/battle/status.ts` | product | 已验证 | CODE-QUALITY-3m；fight.c:1632-1661、battle-system turn-end caller、status/actions tests | 全 status counter tick、alive enemy、canAct/canCast 合同完整 |
| `packages/game/src/core/battle/turn-queue.ts` | product | 已验证 | CODE-QUALITY-3m；fight.c:1451-1584、battle-system caller、turn-queue tests | stable dex sort、dualMove dex2/legacy fallback、enemy-first tie 合同完整 |
| `packages/game/src/core/battle/battle-positions.ts` | product | 已验证 | CODE-QUALITY-3m；battle.c g_rgPlayerPos/ENEMYPOS anchors、present core callers、UI/sprite tests | party count layouts/fallback/idx bounds 合同完整 |
| `packages/game/src/core/rng.ts` | product | 已验证 | CODE-QUALITY-3m；battle/event/shell callers、rng tests、seed state contract | mulberry32 deterministic state/range APIs；sdlpal LCG 差异为已记录设计，不擅改 |
| `packages/game/src/core/battle/__tests__/formulas.test.ts` | test | 已验证 | CODE-QUALITY-3m；base/physical/magic/dex formula contracts | primary-source numeric oracle |
| `packages/game/src/core/battle/__tests__/magic-damage.test.ts` | test | 已验证 | CODE-QUALITY-3m；inline/Simulate/enemy magic/autoDefend contracts | real BattleState caller oracle |
| `packages/game/src/core/battle/__tests__/status.test.ts` | test | 已验证 | CODE-QUALITY-3m；all status tick/alive enemy/canAct contracts | counter lifecycle oracle |
| `packages/game/src/core/battle/__tests__/turn-queue.test.ts` | test | 已验证 | CODE-QUALITY-3m；sort/tie/dualMove/dex2 contracts | queue identity oracle |
| `packages/game/src/core/rng.test.ts` | test | 已验证 | CODE-QUALITY-3m；same seed/different seed/range/state contracts | deterministic RNG oracle |
| `packages/game/src/core/palette-fade.ts` | product | 已验证 | CODE-QUALITY-3n；event-system fade builders、present/present-battle callers、palette-fade tests | fade60/fade63/lerp/approach/freeze/nightColors contracts；caller normalizes zero delays |
| `packages/game/src/core/scene-identity.ts` | product | 已验证 | CODE-QUALITY-3n；bootstrap scene load/restore callers、history/map-name readers | single current map identity setter/getter；caller ownership explicit |
| `packages/game/src/core/word-lookup.ts` | product | 已验证 | CODE-QUALITY-3n；bootstrap setWordTable、menu/settlement/event callers、word tests | table-first/fallback/empty/out-of-range contract；未改 WORD schema |
| `packages/game/src/core/script-catalog.ts` | product | 已验证 | CODE-QUALITY-3n；bootstrap setGlobalEvents、event-system resolveLabel/getCmds callers、dependency ownership tests；prototype-label negative controls | 修复 inherited `toString`/`constructor`/`__proto__` 被误解析为脚本 IP；global label map 改为 own-property/null-prototype，zero-item fixup 边界保留 |
| `packages/game/src/core/palette-fade.test.ts` | test | 已验证 | CODE-QUALITY-3n；fade60/fade63/lerp/approach/finalize/bounds contracts | primary palette oracle |
| `packages/game/src/core/word-lookup.test.ts` | test | 已验证 | CODE-QUALITY-3n；unloaded/fallback/table priority/out-of-range contracts | direct WORD caller oracle |
| `packages/game/src/core/dependency-ownership.test.ts` | test | 已验证 | CODE-QUALITY-3n；catalog/scene identity ownership、prototype label negative controls、cross-entrypoint identity | 真实公开 entrypoint oracle |
| `packages/game/src/core/cross-module-boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3n；scene/event/equipment/battle cross-module caller contracts | 相邻模块回归证据 |
| `packages/game/src/core/dialog-history.ts` | product | 已验证 | CODE-QUALITY-3o；event-system history writer/tools caller、dialog-history tests | trim/连续去重/map 维度/CAP/restore 老档归一合同完整 |
| `packages/game/src/core/mode.ts` | product | 已验证 | CODE-QUALITY-3o；main-loop caller、event/scene/battle/menu mode tests | frameNum、autoScript gate、mode dispatch、同步 event 再驱动合同完整 |
| `packages/game/src/core/player-poison-state.ts` | product | review | CODE-QUALITY-3o；event-opcode/equipment/battle callers、ownership/poison tests | poison definition ownership/level99/slot dedup/cure/runner 合同完整  CODE53 当前键语义候选待验；旧结论为历史，0x61额外边界见CODE79 |
| `packages/game/src/core/scene-system-search.ts` | product | 已验证 | CODE-QUALITY-3o；scene-system Confirm caller、play.c:362-510、search tests | 13-cell range、trigger mode 阈值、grid/h/sState/first-hit 合同完整 |
| `packages/game/src/core/scene-system.ts` | product | 已验证 | CODE-QUALITY-3q；play.c:25-238,423-591、scene.c:512-847、map.c:277-299、res.c:229-301、global.h:75-121；mode/event/bootstrap/dev callers | 662 行逐段核验；131 定向测试、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/event-system.ts` | product | 已验证 | CODE-QUALITY-3r；script.c:30-307,608-750,1140-1410,1600-1815,1850-1990,2050-2145,2290-2385,2385-2555,2570-2775,2970-3070；mode/bootstrap/scene/battle/menu/equipment/poison callers | 5110 行逐段核验全局脚本表、auto/event/runScript、waiting/fade/modal、scene/battle resume、raw opcode、对象解析与移动；定向 370、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过，未发现直接缺陷 |
| `packages/game/src/core/battle/battle-opcodes.ts` | product | review | CODE-QUALITY-3t；script.c:867-950,1026-1102,1175-1425,1437-1449,1573-1640,1848-2054,2547-2668,2776-2995,3267-3297；fight.c:602-716,2387-2390,4214-4323,5193-5400；battle.c:1397-1434；event-system/actions/battle-system callers | 1528 行逐段核验 dispatch、BattleCtx ownership、目标/状态/伤害/毒、召唤/分裂/变身/逃跑、动画/偷窃/战斗结果与 consumed/newIp；定向/相邻 470 tests、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷；0x2E `>=` 为 game-mechanics 已记录的原版后期产品决策  CODE53 当前键语义候选待验；旧结论为历史，0x61额外边界见CODE79 |
| `packages/game/src/core/battle/__tests__/battle-opcodes.test.ts` | test | 已验证 | CODE-QUALITY-3t；2386 行全文、主 oracle、script.c/fight.c caller/合同、470 定向/相邻 tests | 合法目标、边界、失败分支、目标缺失、动画/资源副作用与 consumed/newIp 反控；无弱化断言 |
| `packages/game/src/core/battle/battle-opcodes.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3t；1189 行全文、dispatch family branch contracts、470 定向/相邻 tests | 真实 state/ctx caller 合同、非法/缺资源/满槽/无目标反例；不以 coverage 数量单独验收 |
| `packages/game/src/core/battle/battle-opcodes.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3t；70 行全文、0x05/0x8E dialog clear 与 0x6B signed blow-away primary contract | 清框只影响下一段对白、SHORT 负值边界与 negative control |
| `packages/game/src/battle-summon-slot-reuse.glm-q.test.ts` | test | 已验证 | CODE-QUALITY-3t；203 行全文、0x9E 战中死亡空槽复用/对象身份/阵型重算 oracle | 活槽不复用、毒/身份清理与阵型锚点反例 |
| `packages/game/src/core/battle/battle-state.ts` | product | 已验证 | CODE-QUALITY-3u；battle.h:49-119,158-206；global.h:395-404,441-444；battle.c:900-943,1531-1775；fight.c:117-127,2173-2190,3209-3245；battle-system/finalization/anim callers | 918 行逐段核验 BattleState 字段、phase/UI/queue、玩家/敌人快照、null 空槽、对象身份、脚本/毒/动画/结算 ownership；55 定向/相邻 tests、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-runtime-context.ts` | product | 已验证 | CODE-QUALITY-3u；battle.c:1741-1754,1838-1857；battle-system:324-344；battle-finalization:63；runtime/finalization callers | 98 行逐段核验资源表与 runner stash、live-role identity、override 优先级和 finalize release；未发现跨战斗残留或清理缺口 |
| `packages/game/src/core/battle/__tests__/battle-state.test.ts` | test | 已验证 | CODE-QUALITY-3u；BattleState 工厂/位置/状态 seed oracle，定向/相邻 55 tests | 383 行逐段读取；未知 role、>3 player、状态 seed、快照、EnemyPos/fallback/y offset 和独立坐标对象反例 |
| `packages/game/src/core/battle/battle-state.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3u；null 空槽、maxHealth/object identity、autoBattle/scriptPrevHp oracle，定向/相邻 55 tests | 81 行逐段读取；0 占位槽不压缩、真实槽浅拷贝、开战 seed 反例 |
| `packages/game/src/core/battle/battle-finalization.test.ts` | test | 已验证 | CODE-QUALITY-3u；finalization cleanup/resume caller oracle，定向/相邻 55 tests | 80 行逐段读取；状态/波场/模式/资源释放顺序与 0x07 resume 反例 |
| `packages/game/src/core/battle/actions/attack.ts` | product | 已验证 | CODE-QUALITY-3v；fight.c:3618-3754,4910-5148,4591-4654；battle-system:2769-2825；action/anim/formula callers | 614 行逐段核验玩家/敌方物攻、群攻/DualAttack、auto-defend/cover/protect、equiv poison、混乱友敌与 timeline/legacy fallback；154 定向/相邻 tests、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/actions/attack-mate.ts` | product | 已验证 | CODE-QUALITY-3v；fight.c:3760-3853；battle-system attack-mate dispatch；attack-mate/action tests | 111 行逐段核验随机活友军、目标防御/protect、HP clamp、武器声、动画与无目标 Pass；未发现直接缺陷 |
| `packages/game/src/core/battle/actions/defend.ts` | product | 已验证 | CODE-QUALITY-3v；fight.c:4110-4117,4924-4929；battle-system dispatch；actions tests | 20 行全文核验；只写 defending，减伤由 enemy attack owner 消费，越界 no-op 合同闭合 |
| `packages/game/src/core/battle/actions/flee.ts` | product | 已验证 | CODE-QUALITY-3v；fight.c:4119-4172；battle.c:1455-1528；battle-system dispatch；actions tests | 81 行逐段核验 flee rate/装备、敌吉运修复、boss RNG、空槽/SHORT 溢出、失败动画与 exp；未发现直接缺陷 |
| `packages/game/src/core/battle/__tests__/attack-mate.test.ts` | test | 已验证 | CODE-QUALITY-3v；111 行实现对应的 7 个 AttackMate oracle，154 定向/相邻 tests | 148 行全文读取；随机 self/dead 跳过、protect/defend/clamp/无活友军/武器声与 HP ownership 反例 |
| `packages/game/src/core/battle/actions/attack.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3v；64 行命中特效帧基号/缺表反例，154 定向/相邻 tests | 全文读取；flat index `sprite*2+1`、×3、undefined fallback 与真实 timeline oracle |
| `packages/game/src/core/battle/battle-finalization.ts` | product | 已验证 | CODE-QUALITY-3w；battle.c:1822-1857；battle-system:415,530；finalization/settlement callers | 67 行全文核验 outcome、状态/毒/装备/波场/mode/runtime/postBattle cleanup 顺序；196 定向/相邻 tests、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-settlement.ts` | product | 已验证 | CODE-QUALITY-3w；battle.c:991-1373；battle-system:390-530；progression/settlement callers | 246 行全文核验 exp/cash/HP-MP 回写、屏序/timeout、Phase E once、对话 hold、半血与 finalize；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-settlement.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3w；settlement screen/timeout/Phase E/half-heal oracle，196 定向/相邻 tests | 259 行全文读取；首帧残键、74+1 timeout、屏序、Phase E once/dialog hold/半血恢复反例 |
| `packages/game/src/core/dialog-history.test.ts` | test | 已验证 | CODE-QUALITY-3o；trim/dedup/map/CAP/restore contracts | direct history oracle |
| `packages/game/src/core/mode.test.ts` | test | 已验证 | CODE-QUALITY-3o；mode/frame/autoScript/event dispatch contracts | main loop dispatch oracle |
| `packages/game/src/core/scene-system-search.test.ts` | test | 已验证 | CODE-QUALITY-3o；13-cell/facing/trigger threshold/first hit contracts | primary search oracle |
| `packages/game/src/core/scene-system.test.ts` | test | 已验证 | CODE-QUALITY-3q；真实 tickSceneSystem/tickEventSystem/SceneAssetsCache/setGlobalEvents caller，play.c/scene.c/map.c oracle | 2064 行全文核验；方向/顺序、4..8 trigger、vanish/revive、blocker push、tile h/bit13、trail/步态、loadScene/cache/onEnter、TouchFar 死锁和 invalid-label 反例均有高判别力合同 |
| `packages/game/src/core/event-system.test.ts` | test | 已验证 | CODE-QUALITY-3r；真实 tickEventSystem/tickAutoScripts/runScript/runEnterScript callers，script.c/play.c/scene.c/text.c oracle | 5973 行主测试全文核验；dialog/wait/confirm/end、battle fallback、global ip/call、移动/镜头/fade、scene/item/poison/object 条件与特效生命周期合同完整 |
| `packages/game/src/core/battle/__tests__/battle-system.test.ts` | test | 已验证 | CODE-QUALITY-3s；公开 startBattle/tickBattle/mode/menu/actions callers，battle.c/fight.c/uibattle.c/script.c oracle | 4182 行主生命周期/UI测试全文核验；start/phase/queue/cleanup、菜单/target、动画/dialog、毒/状态/逃跑、敌槽/dualMove、Repeat、投掷/道具/召唤和波场 contracts |
| `packages/game/src/core/battle/battle-system.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3s；公开 startBattle/tickBattle/tickEnemyIdleGestures callers，battle.c/fight.c oracle | 276 行 branch guard/phase/idle/资源缺失/settlement contracts，18 tests 通过 |
| `packages/game/src/core/battle/battle-system.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3s；公开 startBattle/tickBattle + event-system battle script caller，battle.c turn-start oracle | 122 行 turn-start dialog-clear 与终态 break contracts，2 tests 通过 |
| `packages/game/src/core/battle/battle-runtime-context.test.ts` | test | 已验证 | CODE-QUALITY-3s；startBattle 安装/cleanup 与 runScript fallback caller | resource/live-role identity、runner override/clear ownership contracts，3 tests 通过 |
| `packages/game/src/core/event-opcode-player.ts` | product | 已验证 | CODE-QUALITY-3p；script.c/global.c opcode 0x17-0x2F/0x41/0x55/0x56/0x8D、event-system caller、event/equip/poison tests | role/slot/SHORT/WORD/fScriptSuccess/owner contracts逐段核对；未发现直接缺陷 |
| `packages/game/src/core/event-opcode-player.test.ts` | test | 已验证 | CODE-QUALITY-3p；player/equipment/HP-MP/revive/poison/status/magic opcode contracts | direct opcode oracle |
| `packages/game/src/core/event-opcode-player.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3p；opcode family branch contracts | branch boundary oracle |
| `packages/game/src/core/event-opcode-player.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3p；role context/slot/poison runner/invalid input contracts | independent caller/negative oracle |
| `packages/editor/src/ui/command-form-control.residual.glm.test.tsx` | test | 待核 | TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1；Codex 接收 1 合同与 2 针反控；语义治理待后续专专项读取 | 测试合同已独立验收，未计入逐文件代码治理闭合 |
| `packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx` | test | 待核 | TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1；Codex 接收 3 合同与 3 针反控；语义治理待后续专项读取 | P1 puppet product-counter 保留，未固化产品行为 |
| `packages/reforge/src/menu/menu-box.residual.glm.test.ts` | test | 待核 | TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1；Codex 接收 5 合同与 5 针反控；语义治理待后续专项读取 | draw-call oracle 测试文件，未计入逐文件代码治理闭合 |
| `packages/game/src/analytics/analytics-consent.ts` | product | 已验证 | CODE-QUALITY-3y；install-analytics/main callers、analytics tests、定向 Vitest | storage/DNT-GPC/广播/失败关闭合同逐段核验 |
| `packages/game/src/analytics/analytics-consent.test.ts` | test | 已验证 | CODE-QUALITY-3y；真实 consent public functions 与 storage/event oracle | 合法选择、损坏存储、隐私信号与 unsubscribe 合同 |
| `packages/game/src/analytics/analytics-consent.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3y；宿主边界与异常 EventTarget oracle | getter/dispatch 异常、非 CustomEvent、stored 优先级反例 |
| `packages/game/src/analytics/google-analytics.ts` | product | 已验证 | CODE-QUALITY-3z；install-analytics/main callers、Google tests、URL/consent lifecycle oracle、game full test | measurement ID、UTM sanitization、page-view dedupe、script retry、disable flag、异常隔离逐段核验 |
| `packages/game/src/analytics/google-analytics.test.ts` | test | 已验证 | CODE-QUALITY-3z；真实 startGoogleAnalytics caller 与 dataLayer/page-view oracle | 合法/非法 ID、敏感 URL、路径去重、撤回、脚本失败、gtag arguments 合同 |
| `packages/game/src/analytics/google-analytics.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3z；真实 window/dataLayer 与宿主网络隔离 oracle | ID/UTM 长度边界、无 page subscriber、regrant、disable flag 反例 |
| `packages/game/src/analytics/install-analytics.ts` | product | 已验证 | CODE-QUALITY-40；main.ts production caller、consent/google/UI lifecycle、game typecheck/full test | enabled 开关、navigator privacy 传递、storage ownership、destroy cleanup 与异常隔离逐段核验 |
| `packages/game/src/analytics/install-analytics.test.ts` | test | 已验证 | CODE-QUALITY-40；真实 installTypePalAnalytics public entry、DOM/dataLayer oracle、game full test | 开发零副作用、DNT/GPC 默认关闭、UI/安装生命周期和销毁合同 |
| `packages/game/src/analytics/analytics-consent-ui.ts` | product | 已验证 | CODE-QUALITY-41；install-analytics caller、DOM/ARIA lifecycle、UI test、local dev AX/screenshot | consent panel/preferences visibility、button ownership、storage failure、destroy cleanup 与现有布局合同 |
| `packages/game/src/analytics/analytics-consent-ui.test.ts` | test | 已验证 | CODE-QUALITY-41；真实 mountAnalyticsConsentUi public entry、DOM/focus/storage oracle、game full test | panel placement、privacy signal、choice persistence、storage failure 与 destroy 反例 |
| `packages/game/src/present/dialog-box.ts` | product | 已验证 | CODE-QUALITY-42；event-system/present callers、text.c/uigame.c、dialog tests与pixel oracle | 几何/边框/文字/头像、分页/清理、资源失败与 framebuffer ownership逐段核验 |
| `packages/game/src/present/dialog-box.test.ts` | test | 已验证 | CODE-QUALITY-42；公开 dialog draw/clear caller、直接 framebuffer/状态 oracle | 合法布局、分页、头像、清理、缺资源与边界反例 |
| `packages/game/src/present/dialog-box.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-42；真实 dialog/present caller 与分页/残留边界 oracle | 82项定向合同排重、合法输入、负控与跨帧清理判别力 |
| `packages/game/src/present/draw-sprite.ts` | product | 已验证 | CODE-QUALITY-43；present.ts/battle sprite callers、scene.c anchors、framebuffer/pixel tests | 逐帧 anchor、opaque mask、palette-0、屏外裁剪与 buffer ownership逐段核验 |
| `packages/game/src/present/draw-sprite.test.ts` | test | 已验证 | CODE-QUALITY-43；公开 drawSprite/toSpriteImages caller、直接 framebuffer oracle | 高度剖面/底边、mask、palette-0、屏外反例 |
| `packages/game/src/present/draw-sprite-clip.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-43；真实 framebuffer caller 与奇数宽/裁剪/孔洞 oracle | 合法 typed 输入、8 条边界合同、无弱化断言 |
| `packages/game/src/present/font.ts` | product | 已验证 | CODE-QUALITY-44；dialog/menu/battle/present callers、text.c/font.c/ui.c、font tests | glyph load/failure、tofu、逐字/阴影、颜色 fallback、measure/Pal width 与 framebuffer ownership逐段核验 |
| `packages/game/src/present/font.test.ts` | test | 已验证 | CODE-QUALITY-44；真实 renderText/measure/pal width public oracle | 合法 glyph、CJK/ASCII width、tofu、empty 与 framebuffer反例 |
| `packages/game/src/present/font.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-44；renderColoredText/缺字形/阴影真实 oracle | 逐字颜色、缺色 0x4F、三影和 tofu 像素合同 |
| `packages/game/src/present/font-width.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-44；loadGlyphs fetch caller与width/render framebuffer oracle | HTTP 状态/baseUrl、codepoint width、shadow/底色保留合同 |
| `packages/game/src/present/follower-render.ts` | product | 已验证 | CODE-QUALITY-45；present.ts caller、scene.c/res.c anchors、follower tests | 0x98 sprite chunk、trail[3+k]、direction/3-frame step、standing/walking、缺槽 ownership逐段核验 |
| `packages/game/src/present/follower-render.test.ts` | test | 已验证 | CODE-QUALITY-45；公开 computeFollowerRenderItems oracle | 空 follower、缺槽、位置/身份、站立/行走步帧、多 follower 合同 |
| `packages/game/src/present/follower-render-gap.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-45；真实 typed trail/follower caller与边界 oracle | 越界 step、稀疏槽、朝左步帧、第二 follower 缺槽反例 |
| `packages/game/src/present/menu/draw-confirm.ts` | product | 已验证 | CODE-QUALITY-46；present/menu/shop callers、uigame.c:242-388、confirm pixel tests | 双框坐标、selectedColor 时间生命周期、labels 复用、shadow 与 framebuffer ownership逐段核验 |
| `packages/game/src/present/menu/draw-confirm.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-46；真实 drawConfirmBox public caller、fixture framebuffer oracle | 默认/右选、0xF9/0x4F、三影、关/开标签合同 |
| `packages/game/src/present/menu/opening-confirm-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-46；opening/menu/confirm pixel caller与state clone oracle | 空/多字标签、背景 sentinel、光标隔离与框体像素反例 |
| `packages/game/src/present/menu/draw-box.ts` | product | 已验证 | CODE-QUALITY-47；dialog/menu/shop/battle callers、ui.c/uigame.c、draw-box/pixel tests | 9-slice/单行框 frame identity、shadow、opaque mask、边界裁剪、menuTextMaxCols 与 fail-loud 合同逐段核验 |
| `packages/game/src/present/menu/draw-box.test.ts` | test | 已验证 | CODE-QUALITY-47；公开 drawBox framebuffer oracle | style/rows-cols/grid、动态 shadow、缺帧反例 |
| `packages/game/src/present/menu/draw-box.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-47；drawBox/drawSingleLineBox/menuTextMaxCols typed caller oracle | 缺 44-46、shadow=0、屏外、空 rows-cols、width 合同 |
| `packages/game/src/present/menu/box-shadow-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-47；像素 framebuffer 与透明孔/单行框 caller oracle | 12 条高判别力阴影、透明孔、palette-0、标签宽度合同 |
| `packages/game/src/present/menu/draw-opening-menu.ts` | product | 已验证 | CODE-QUALITY-51；draw-menu/present callers、uigame.c:42-167、ui.c:458、opening-menu state | FBP 全屏背景、两行文案、长文案 x 公式、闪烁色、shadow 与缺背景边界逐段核验；未发现直接缺陷 |
| `packages/game/src/present/menu/draw-opening-menu.test.ts` | test | 已验证 | CODE-QUALITY-51；drawOpeningMenu/openingItemX 真实 caller 与 framebuffer oracle | 5 tests；背景/缺背景、两行坐标、cursor 差异、长文案 x 公式与输入合同 |
| `packages/game/src/present/menu/draw-opening-menu.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-51；词表/fixture glyph 与 framebuffer oracle | 3 tests；选中/未选色、三影、词表 fallback 与无 frames 合同；与 opening-confirm 像素测试排重 |
| `packages/game/src/present/menu/draw-shop.ts` | product | 已验证 | CODE-QUALITY-52；draw-menu/present/menu-driver callers、uigame.c:1503-1777、shop-menu state | 买/卖列表与价格、预览框/图标、库存+装备 ownedCount、金钱、确认框、卖价半价与缺资源边界逐段核验；未发现直接缺陷 |
| `packages/game/src/present/menu/draw-shop.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-52；真实 drawShopMenu/drawSellOverlay caller 与 framebuffer oracle | 4 tests；owned equipment、空店、非卖品、空 cursor/半价 overlay 合同 |
| `packages/game/src/present/menu/shop-preview-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-52；P04 caller、像素/palette oracle与输入快照 | 13 tests；rightText 价格、shadow/缺帧/缺图标、确认层、库存/装备 owned、0 金钱、半价与 palette 合同 |
| `packages/game/src/present/menu/draw-magic.ts` | product | 已验证 | CODE-QUALITY-50；draw-menu/present/menu-driver callers、magicmenu.c:36-299/301-484、uigame.c:653-875、uibattle.c:31-269 | 施法人/仙术/目标三阶段、PlayerInfoBox、MP/说明、禁用色、分页/光标、缺帧与 runtime stats 逐段核验；未发现直接缺陷 |
| `packages/game/src/present/menu/draw-magic.test.ts` | test | 已验证 | CODE-QUALITY-50；真实 drawInGameMagicMenu caller、magicmenu.c WIN95 MP/说明 oracle | 2 tests；多行说明、左侧 MP 与右侧空区布局，合法 typed state 与 global script fixture |
| `packages/game/src/present/menu/draw-magic.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-50；真实状态/fixture framebuffer oracle | 5 tests；死亡/MP 禁用色、空表、缺 catalog、role/name fallback 与缺资源边界，排重 P06 |
| `packages/game/src/present/menu/magic-menu-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-50；P06 相邻 caller 与直接像素 oracle | 15 tests；坐标/说明多行/头像/HP-MP/缺帧/目标箭头/透明孔/运行时数值隔离 |
| `packages/game/src/present/menu/draw-inventory.ts` | product | 已验证 | CODE-QUALITY-49；draw-menu/present/menu-driver callers、itemmenu.c:28-310、uigame.c:1289-1470、P01/P02 与 menu-driver oracle | list/use-target 布局、6 色规则、live inventory、缺帧/资源、描述/noDesc 与 framebuffer ownership 逐段核验；修复数量归零时仍绘制目标物品图标/名称的 bug；未改退出状态机 |
| `packages/game/src/present/menu/draw-inventory.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-49；真实 drawInventoryMenu caller 与 fixture framebuffer oracle | 未知目录/过滤混列/use-target 缺上下文反例；与 P01/P02、像素测试排重，3 tests 通过 |
| `packages/game/src/present/menu/inventory-list-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-49；真实大世界目标层 live-count 与 framebuffer pixel oracle | 12 tests；先以最后一件物品归零反例证实旧实现失败，再验证 SDLPal 语义下图标/名称/数字均隐藏；其余 shadow、数量差额、缺帧、属性和 palette oracle 保持 |
| `packages/game/src/present/menu/draw-equip.ts` | product | 已验证 | CODE-QUALITY-48；draw-menu/present/menu-driver callers、uigame.c:1793-2055、itemmenu.c:28-224、装备绘制 tests | list 复用 InventoryMenu；pick-role 背景/图标/装备槽/运行时属性/角色四色/数量投影、缺资源与 framebuffer ownership 逐段核验；未发现直接缺陷 |
| `packages/game/src/present/menu/draw-equip.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-48；真实 drawEquipMenu caller 与 fixture framebuffer oracle | 非顺序 party/roleId 位、未知已装备、空槽、缺 role 行反例；与 P03/像素测试排重，3 tests 通过 |
| `packages/game/src/present/menu/equip-role-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-48；真实 EquipMenu state 与 framebuffer pixel oracle | 单人框高、done/缺目录/越界光标/数量 0、运行时属性与 live inventory 反例；11 tests 通过，输入快照隔离 |
| `packages/game/src/present/draw-tilemap.ts` | product | 已验证 | CODE-QUALITY-54；SDLPal map.c/scene.c、present/bootstrap callers、extractor exact 64×128 contract；tilemap/present 定向 20 + 相邻 58 tests、全仓 check/ratchet/protected fast/lint | 坐标、layer、height、cover 与 primary 一致；seam repair 是 TS 持久帧补偿，bootstrap 缩略图未纳入本批；未发现直接缺陷 |
| `packages/game/src/present/draw-tilemap.test.ts` | test | 已验证 | CODE-QUALITY-54；direct framebuffer/coverage oracle；9 tests 通过，波次全门通过 | h 子行、fence、9-bit id、fallback、coverage、seam dilation 合同；高判别力反例 |
| `packages/game/src/present/draw-tilemap-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-54；真实 drawTilemap/repair caller、像素与裁剪 oracle；11 tests 通过，波次全门通过 | 缺帧、透明/opaque palette-0、边界裁剪、扫描顺序与 maxPasses 反例；不覆盖 bootstrap 缩略图 |
| `packages/game/src/present/menu/draw-menu.ts` | product | 已验证 | CODE-QUALITY-55；uigame.c/ui.c、present/menu-driver callers、P05 stack oracle；draw-menu/P05 15 + 波次相邻共 93 tests、全仓 check/ratchet/protected fast/lint | stack 顺序、坐标/颜色、cash/slot/overlay/placeholder 与资源转发已读；不拥有 poison key，runtime-zero 风险留 CODE-QUALITY-53；未发现直接缺陷 |
| `packages/game/src/present/menu/draw-menu.test.ts` | test | 已验证 | CODE-QUALITY-55；drawMenuStack framebuffer/state oracle；6 tests 通过，波次全门通过 | 空栈、主/系统/confirm、stack 叠层、缺帧 fail-loud；与 P05/GLM leaves 排重 |
| `packages/game/src/present/menu/draw-menu.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-55；save-slot/inventory-action/switch/shop-sell/placeholder 真实 state 与像素 oracle；5 tests 通过，波次全门通过 | savedTimes、选中色、overlay、缺 extra 与输入快照隔离；不替代 runtime/poison ownership 审计 |
| `packages/game/src/tools/minimap.ts` | product | 已验证 | CODE-QUALITY-56；bootstrap/tools-panel/dev-panel callers、draw-tilemap/world pixel contract；定向 20 + 相邻 68 tests、game typecheck、全仓 check/ratchet/protected fast/lint | worldToThumb、分类、缩放、底图 cache 与 Image 生命周期逐段核验；失败反例证明并修复 loading ownership；bootstrap seam repair 差异留后续卡 |
| `packages/game/src/tools/minimap.test.ts` | test | 已验证 | CODE-QUALITY-56；world/trigger/data oracle；14 tests 全绿，波次全门通过 | 合法命令、label fallback、item/teleport/NPC 分类与 zoom 边界；与 leaves 排重 |
| `packages/game/src/tools/minimap.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-56；真实 canvas 与 localStorage/controller oracle；6 tests 全绿，波次全门通过 | 像素、toggle、持久化、延迟 Image.onload 与 decode failure 资源反控；不替代 bootstrap seam repair 审计 |
| `packages/game/src/shell/bootstrap.ts` | product | review | CODE-QUALITY-57；SDLPal scene.c、present/draw-tilemap、dev-panel/tools-panel/minimap callers；bootstrap 全文件读取，定向 helper/资源 tests 6 通过 | 资源/scene/save/modal ownership 已读；thumbnail 直绘未调用 seam repair，缺真实 thumbnail pixel oracle，保持 review |
| `packages/game/src/shell/bootstrap-load.test.ts` | test | review | CODE-QUALITY-57；bootstrap palette transition oracle；1 test 通过 | helper 合同真实且独立；不覆盖 bootstrap thumbnail closure，随卡保留 review |
| `packages/game/src/shell/bootstrap.glm-next-wave.test.ts` | test | review | CODE-QUALITY-57；showError canvas port oracle；2 tests 通过 | 启动失败显示/无 2D context 反例；不覆盖 thumbnail closure，随卡保留 review |
| `packages/game/src/tools/tools-panel.ts` | product | 已验证 | CODE-QUALITY-58；bootstrap/minimap/save/inspect callers；定向 18 + save wave 29 tests、全仓 check/ratchet/protected fast/lint | tab/DOM/键盘/委托/战斗签名/工具状态逐段读取；save version 由 CODE-QUALITY-59 收口 |
| `packages/game/src/tools/tools-panel.test.ts` | test | 已验证 | CODE-QUALITY-58；DOM/keyboard/audio/dialog/timer/battle oracle；16 tests、全仓门通过 | 真实注入依赖、受控 timer、输入传播与状态隔离 |
| `packages/game/src/tools/tools-panel.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-58；display-scale/fullscreen/FPS delegation oracle；2 tests、全仓门通过 | 公开委托参数与持久键观察 |
| `packages/game/src/tools/save-io.ts` | product | 已验证 | CODE-QUALITY-59；tools-panel/Save API callers、phase1 VERSION=1 plan、phase2 SAVE12 boundary；wrong-version 失败反例、全仓门通过 | `VERSION=1` guard fail-closed；不改 Save API/旧 upgrader |
| `packages/game/src/tools/save-io.test.ts` | test | 已验证 | CODE-QUALITY-59；serialize/parse合法、格式/必填/wrong-version 反例；4 tests | 失败反例先行，未知 version 不再送入 Save API |
| `packages/game/src/tools/save-import-quicksave.glm-msio.test.ts` | test | 已验证 | CODE-QUALITY-59；真实 parse/quick-save caller与必填守卫；4 tests、全仓门通过 | 当前合法输入、缺字段、快存错误反馈合同 |
| `packages/game/src/tools/quick-save.ts` | product | 已验证 | CODE-QUALITY-60；bootstrap Save/load caller、save-io boundary、F5/F9 tests；save wave full check/ratchet/protected fast/lint | explore/no dialog/no menu gate、slot 1、preventDefault、解绑与错误 toast逐段核验；未发现直接缺陷 |
| `packages/game/src/tools/quick-save.test.ts` | test | 已验证 | CODE-QUALITY-60；canQuickSave、F5/F9、战斗拒绝与 caller oracle；4 tests、save wave全门通过 | 合法准入、反例、异步委托与输入隔离合同 |
| `packages/game/src/tools/speedrun/store.ts` | product | 已验证 | CODE-QUALITY-61；speedrun/index/tools-panel/overlay callers；非法值反例、小数毫秒反例、全仓 check/ratchet/protected fast/lint | localStorage settings/bests 默认副本、坏 JSON/未知 key/非法容器 fail-closed；有限非负小数成绩保留 |
| `packages/game/src/tools/speedrun/store.test.ts` | test | 已验证 | CODE-QUALITY-61；defaults/round-trip/真实 SpeedrunTimer 小数毫秒 oracle；5 tests | 合法合同与存储 round-trip |
| `packages/game/src/tools/speedrun/store.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-61；坏 JSON/ghost key/settings/非法数值/非法容器 oracle；4 tests | 非法值反控；不堆弱断言 |
| `packages/game/src/tools/speedrun/timer.ts` | product | 已验证 | CODE-QUALITY-62；index/snapshot/detectors/tools-panel callers；timer 主/GLM/boundary 与全仓质量门 | wall-clock/暂停/PB/setStep 状态机逐段核验，未发现直接缺陷 |
| `packages/game/src/tools/speedrun/timer.test.ts` | test | 已验证 | CODE-QUALITY-62；起表/打点/PB/香蕉/手动暂停 oracle；timer wave 全门通过 | 主合同 |
| `packages/game/src/tools/speedrun/timer.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-62；countdown/dirty/reset oracle；timer wave 全门通过 | 一次性 flags 与恢复边界 |
| `packages/game/src/tools/speedrun/snapshot.ts` | product | 已验证 | CODE-QUALITY-63；index/main-loop/timer callers；6 tests、game 全包/check/ratchet/protected fast/lint | inventory/BattleSnap/canMove 门控逐文件核验，未发现直接缺陷 |
| `packages/game/src/tools/speedrun/snapshot.test.ts` | test | 已验证 | CODE-QUALITY-63；snapshot/canMove 合同；6 tests | count>0、battle HP、sceneLoading/paletteFade/suspendRaf 反例 |
| `packages/game/src/tools/speedrun/detectors.ts` | product | 已验证 | CODE-QUALITY-64；timer/checkpoints/snapshot callers；detector 主/边界 13 tests、全仓门 | prev/mem/容差/彩依两段状态机逐段核验，未发现直接缺陷 |
| `packages/game/src/tools/speedrun/detectors.test.ts` | test | 已验证 | CODE-QUALITY-64；enter/leave/spot/boss/item/music/caiyi 主 oracle；7 tests | 主合同 |
| `packages/game/src/tools/speedrun/detectors.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-64；null prev、集合、容差、自定义 enemy 边界 oracle；6 tests | 边界合同 |
| `packages/game/src/tools/speedrun/checkpoints.test.ts` | test | 已验证 | CODE-QUALITY-67；21-id/单调/首尾/香蕉配置 oracle；3 tests、speedrun wave 全门 | 无重复弱断言，数据合同完整 |
| `packages/game/src/tools/speedrun/timer.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-67；同 now/finished/暂停边界/setStep/mem 隔离/detector boundary oracle；6 tests、speedrun wave 全门 | 状态机边界判别力完整 |
| `packages/game/src/tools/speedrun/countdown.test.ts` | test | 已验证 | CODE-QUALITY-68；挂出/更新/null remove DOM oracle；2 tests、speedrun wave 全门 | 倒计时元素生命周期 |
| `packages/game/src/tools/speedrun/countdown.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-68；单例复用/重建/pointer-events oracle；2 tests | DOM 单节点合同 |
| `packages/game/src/tools/speedrun/time-format.test.ts` | test | 已验证 | CODE-QUALITY-69；clock/HMS/parse/diff 合法值 oracle；4 tests | 常规格式合同 |
| `packages/game/src/tools/speedrun/time-format.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-69；进位/负数/符号/非法 parse boundary oracle；3 tests | 高判别力边界合同 |
| `packages/game/src/tools/speedrun/time-format.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-69；小时进位/负数 oracle；2 tests | 与主/边界测试排重 |
| `packages/game/src/shell/audio-volume.test.ts` | test | 已验证 | CODE-QUALITY-70；主 volume/mute/storage oracle；3 tests | 主合同 |
| `packages/game/src/shell/audio.ts` | product | 已验证 | CODE-QUALITY-74；SDLPal sound/midi caller、bootstrap/dev-panel callers、audio 主/边界 tests；27 定向 tests、全仓质量门 | SFX queue ownership、BGM track/loop、同号去重、开关/补播、OGG release 逐段核验；未发现直接缺陷；MIDI async race 留 CODE-QUALITY-75 |
| `packages/game/src/shell/audio.test.ts` | test | 已验证 | CODE-QUALITY-74；URL/track、AudioManager、SFX mapping/dedup、OGG lifecycle oracle；主合同全绿 | 合法输入、真实 MusicBackend caller、资源释放与高判别力反例；不覆盖 MIDI fetch 逆序 |
| `packages/game/src/shell/audio.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-74；OGG volume 与 audio-midi no-WebAudio/no-op 端口 oracle；27 定向 tests 全绿 | 与主合同排重；audio-midi async race 明确留 CODE-QUALITY-75 |
| `packages/game/src/shell/audio-midi.ts` | product | 已验证 | CODE-QUALITY-75；SDLPal `midi_tsf.c:137-168`、bootstrap/dev-panel caller；定向 29、game 3528、全仓质量门 | `playGeneration` 在 play/stop 与 resume/fetch/arrayBuffer 后 fail-closed，旧曲/停止响应不再 load/play；公共 API/曲目选择未变 |
| `packages/game/src/shell/audio-midi.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-75；真实 `createSpessaSynthBackend`/fake Sequencer oracle；逆序响应与 stop 在途反控 red→green | 2 个高判别力竞态合同；不以 mock backend 替代真实入口 |
| `packages/game/src/shell/main-loop.ts` | product | 已验证 | CODE-QUALITY-76；SDLPal `game.c:43-86`/`play.c:513-565`、bootstrap/mode/speedrun callers；33 定向、全仓质量门 | fixed cadence、accumulator、mode clamp、freeze、present/input gates、scene context、RAF cancel 逐段核验；未发现直接缺陷 |
| `packages/game/src/shell/main-loop.test.ts` | test | 已验证 | CODE-QUALITY-76；tickN/interval/accumulator/present/fade/input oracle；12 tests | 主合同与 SDLPal cadence 对照 |
| `packages/game/src/shell/main-loop-gates.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-76；drain/nowMs/dump/freeze/mode-switch/RAF cancel boundary oracle；13 tests | 宿主边界与主合同排重 |
| `packages/game/src/shell/rng-player.ts` | product | 已验证 | CODE-QUALITY-77；SDLPal `rngplay.c:372-448`/`main.c:197-203`/`video.c:571-616`、bootstrap/event/trademark callers；33 定向、全仓质量门 | frame window、chunk in-flight cache、失败驱逐、fade、skip、shake、flush lifecycle 逐段核验；未发现直接缺陷 |
| `packages/game/src/shell/rng-player.test.ts` | test | 已验证 | CODE-QUALITY-77；合法播放/失败/skip/shake/fade/cache oracle；主合同全绿 | 直接 framebuffer/canvas 与真实 loader seam，26 tests |
| `packages/game/src/shell/rng-player.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-77；窗口外零请求、失败 Promise 驱逐 oracle；2 tests | 补齐未占用 frame window 与 retry 合同 |
| `packages/game/src/shell/avi-player.ts` | product | 已验证 | CODE-QUALITY-78；SDLPal `aviplay.c:643-747`、bootstrap/main/ending callers；32 定向/相邻、全仓质量门 | video DOM/cleanup、skip/500ms、autoplay fallback、warm-up、volume owner、迟到 Promise 生命周期逐段核验；未发现直接缺陷 |
| `packages/game/src/shell/avi-player.test.ts` | test | 已验证 | CODE-QUALITY-78；video creation/ended/error/skip/volume/cleanup oracle；主合同全绿 | 合法视频与生命周期反例，13 tests |
| `packages/game/src/shell/avi-player.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-78；autoplay reject overlay、warm-up resolve/reject oracle；2 tests | 补齐浏览器拒绝与同步手势解锁边界 |
| `packages/game/src/shell/boot-loading.ts` | product | 已验证 | CODE-QUALITY-72；bootstrap/main-loop/DOM caller；20 tests、全仓 check/ratchet/protected fast/lint | fetch counting、进度、SW onProgress、finish/fail/restore、rAF fallback lifecycle 逐段核验 |
| `packages/game/src/shell/boot-loading.test.ts` | test | 已验证 | CODE-QUALITY-72；计数/进度/finish/fail/nop DOM oracle；9 tests | 主合同 |
| `packages/game/src/shell/boot-loading-host.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-72；host DOM/缺节点/rAF/onProgress 反例；11 tests | 宿主边界合同 |
| `packages/game/src/shell/input.ts` | product | 已验证 | CODE-QUALITY-73；main-loop/input caller、SDLPal input.c key map、主/边界/回放 tests；31 tests、全仓门 | held/pressed/repeat/fade suppression/detach 与回放 ownership逐段核验，未发现直接缺陷 |
| `packages/game/src/shell/input.test.ts` | test | 已验证 | CODE-QUALITY-73；key map/held/pressed/replay/recording 主 oracle；19 tests | 主合同与原版键位映射 |
| `packages/game/src/shell/input.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-73；alias/detach/unknown keyup/fade boundary oracle；3 tests | 宿主边界 |
| `packages/game/src/shell/input-replay.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-73；multi-source/order/replay cursor/recording ownership oracle；11 tests | 回放与多源生命周期 |
| `packages/game/src/tools/speedrun/index.ts` | product | 已验证 | CODE-QUALITY-65；main-loop/tools-panel/timer/store/overlay/countdown callers；12 tests、game 全包/check/ratchet/protected fast/lint | 单例/tick/暂停/快捷键/PB 持久化编排逐段核验，未发现直接缺陷 |
| `packages/game/src/tools/speedrun/index.test.ts` | test | 已验证 | CODE-QUALITY-65；disabled/tick/overlay/hotkey/pause oracle；10 tests | 主编排合同 |
| `packages/game/src/tools/speedrun/index.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-65；解绑/未启用 shortcut 反例；2 tests | 输入监听生命周期 |
| `packages/game/src/tools/speedrun/overlay.ts` | product | 已验证 | CODE-QUALITY-66；index/timer/time-format caller；6 tests、game 全包/check/ratchet/protected fast/lint | DOM row/ETA/diff/clock/pause/style ownership逐段核验，未发现直接缺陷 |
| `packages/game/src/tools/speedrun/overlay.test.ts` | test | 已验证 | CODE-QUALITY-66；overlay row/value oracle；4 tests | 功能性 DOM 合同 |
| `packages/game/src/tools/speedrun/overlay.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-66；DOM cleanup/diff/paused prefix 反例；2 tests | 视觉形态保持，不做剧情 E2E |


后续每个 Q3b/Q3c/Q4/Q5/Q6 子批都必须先把文件加入这里并写直接证据；只跑 `pnpm check`、只看 lint、只看覆盖率或只看静态计数，都不能把 `待核` 变成已审。全量账本未清零前，专项不得宣布“所有代码治理完成”。
