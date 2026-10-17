# 逐文件代码治理账本

Status: current
Last reviewed: 2026-10-17
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

本账本是 CODE-QUALITY 专项逐路径状态与证据索引，也是 `code-quality-ledger.mjs` 的机器输入。`已验证/保留`表示专项已登记的历史核验，不是本轮重新读过相应产品或认证旧测试质量；全包绿灯、文档迁移和机器PASS都不自动增加已闭合数量。

## 范围

起始基点为 `b9ba7e0faadf56519da024c0343f5b44b9a5c447`。现行清单从Git tracked的packages/scripts指定代码扩展与JSON生成；七包名单仅domain标记，静态caller不是完整运行图。未显式登记的清单路径仍待核，不能静默视为无问题。

原表234条被消费者读取的记录逐路径保留category/status；原末3条GLM待核行在空行后，旧parser未消费，本稿明确归并到唯一连续表，状态仍待核。G批次新增7条本任务docs工具/测试（5tool+2test）仍全部待核；K0另新增1个退休入口合同测试，L再新增1个索引生成链合同测试，九项均仅库存登记；F1再新增真实Git Buffer reader与focused baseline测试各一项pending；A8再新增五个格式工具和一个合同测试，六项均待核，不重设旧状态或增加已闭合核验。

## 当前状态

起始基点机器清单：2,962。当前 tracked 清单：3,311。
当前已闭合核验：228；已读但待审：41；尚未逐文件核验：3,042；合计未闭合：3,083。

以下是唯一live机器表。证据描述属于各原卡/日期，尚未再核的当前源码、raw、测试质量或运行结果不继承；Q3k反控摘要只按原卡与总纲明确文字纠正，未重新执行反控。

| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |
|---|---|---|---|---|
| `packages/shared/src/rle.ts` | product | 已验证 | CODE-QUALITY-1；RLE 定向、shared 全包、check、ratchet、protected fast、lint | generic/strict framing 边界已收 |
| `packages/shared/src/rle.test.ts` | test | 已验证 | CODE-QUALITY-1；合法帧与回归 oracle | 只登记合同，不以数量验收 |
| `packages/shared/src/rle.boundaries.test.ts` | test | review | [pre-94 CODE1 RLE复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/README.md)；strict framing、相邻 offset 截断反例 | 新增前一帧帧头截断合同；注释/整卡/统一门仍待，不计 closed |
| `packages/shared/src/rle.glm-runtime-resource.test.ts` | test | 已验证 | CODE-QUALITY-1；真实 runtime resource caller | 宽容入口合同 |
| `packages/shared/src/mkf.ts` | product | 已验证 | CODE-QUALITY-2；raw 2,373 chunks、shared 全包、全仓门 | offset table 边界 |
| `packages/shared/src/mkf.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-2；截断/越界/倒序 offset | 纯 codec 合同 |
| `packages/shared/src/rng.ts` | product | 已验证 | CODE-QUALITY-2；raw 1,464 frames、shared 全包、全仓门 | payload/surface 边界 |
| `packages/shared/src/rng.boundaries.test.ts` | test | review | [pre-94 CODE2 MKF/RNG复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/2/README.md)；opcode payload/surface 与连续 delta surface ownership | 新增同一 surface 连续 delta 累加合同；不扩展 runtime 语义，整卡/统一门仍待 |
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
| `packages/pal-extract/src/cli.ts` | product | rework | [Q3g/C1共享输出反控](../evidence/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1/c1/README.md)；根pnpm extract caller、真实临时树与marker oracle | suffix guard未验证data/data-extracted所有权；旧关闭撤回，方案A guard已实现；全仓覆盖率基线回退仍待收口 |
| `packages/pal-extract/src/cli-error-exits.kimi-r1.test.ts` | test | review | [C1共享输出反控](../evidence/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1/c1/README.md)；公开CLI子进程、symlink/marker/exit oracle | 新增OUT根与data父symlink两个轴；定向9/9、相邻包72/434通过；仍保留review，未以全绿自动关闭 |
| `packages/pal-extract/src/output-boundary.ts` | product | review | [C1输出所有权实现](../tasks/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md)；CLI清理前 `lstat` caller、方案A symlink反例 | 只拒绝 data/data-extracted 根节点链接；data/raw 与内部子项行为保持；统一 coverage/全仓门仍待 |
| `packages/pal-extract/src/output-boundary.test.ts` | test | review | [C1输出所有权合同](../tasks/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md)；prepareOutputRoot 与真实临时 symlink/marker oracle | 3 个合法/拒绝合同；不以独立单元绿灯替代 CLI 全链和统一门 |
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
| `packages/game/src/shell/fetch-retry.ts` | product | rework | [CODE71/C1取消生命周期反例](../evidence/QUALITY-FETCH-ABORT-LIFECYCLE-1/c1/README.md)；main.ts唯一生产安装caller、audio-midi signal caller、Fetch Request/Abort primary | 旧实现退避不可取消、Request自定义reason会重复attempt；当前私有waitForRetry已修，最新main同步后待复跑；不关闭文件 |
| `packages/game/src/shell/bootstrap-resources.ts` | product | 已验证 | CODE-QUALITY-3h；bootstrap.ts 真实 soundfont/resourcesReady caller、并发屏障和 rejection/degradation tests | soundfont 原始 rejection 与 settle barrier 分离；glyph 仅显式 tofu 降级；未发现直接缺陷 |
| `packages/game/src/shell/fetch-retry.boundaries.test.ts` | test | review | [CODE71/C1取消生命周期反例](../evidence/QUALITY-FETCH-ABORT-LIFECYCLE-1/c1/README.md)；不同attempt Error/Response身份、Request/init signal与timer/listener oracle | 旧关闭撤回；当前修复待最新main同步后复跑，过期网关“拒绝”注释已校正 |
| `packages/game/src/shell/fetch-retry.cancellation.test.ts` | test | review | [C1取消生命周期反控](../evidence/QUALITY-FETCH-ABORT-LIFECYCLE-1/c1/README.md)；真实Request/AbortController、typed transport、原生构造错误与listener/timer oracle | 新增7例覆盖已取消Request、退避取消、显式signal/null覆盖；最新main同步后待复跑 |
| `packages/game/src/assets/dialog-assets.ts` | product | 已验证 | CODE-QUALITY-3i；portrait/icon manifest callers、PNG/RLE adapters、dialog-assets/host tests 与 game typecheck | 资产缺失按现行空 map 降级；不伪造 manifest 帧，不改资源格式 |
| `packages/game/src/shell/precache-client.ts` | product | 已验证 | CODE-QUALITY-3i；main/bootstrap SW caller、ready/start/pause/resume/unavailable tests | onPlayable 前不启动 precache，ready race 仅缓冲 start；现行 SW 协议保留 |
| `packages/game/src/shell/precache-ui.ts` | product | 已验证 | CODE-QUALITY-3i 当前复审；DOM widget/unified phase tests、host boundary 23 contracts、main/bootstrap caller | 修复 NaN/Infinity/负字节污染单调进度；合法两段进度与进入/完成/失败生命周期保留 |
| `packages/game/src/shell/audio-volume.ts` | product | 已验证 | CODE-QUALITY-3i；bootstrap 三通道 caller、storage/key tests、NaN negative control | 修复 NaN 音量进入 sink/localStorage；有限/0..1 合法行为不变 |
| `packages/game/src/shell/trademark-fallback.ts` | product | 已验证 | CODE-QUALITY-3i；reference/sdlpal main.c:197-203、rng-player caller、trademark/splash framebuffer/timing tests | 只纠正过时 skipKeys 注释；DOS chunk 6/1000ms/600ms 行为未改 |
| `packages/game/src/shell/audio-volume.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3i；NaN/0/default/三通道共享 mute 合同；删除 NaN guard 的 mutant 失败 | 直接 setter/storage/sink oracle，不重复 clamp 主干 |
| `packages/game/src/tools/display-scale.ts` | product | 已验证 | [pre-94 CODE3j display-scale/fps复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-scale-fps/README.md)；canvas/localStorage/fullscreen callers、scale tests；NaN negative control | 修复 NaN 百分比写入 NaN CSS/storage；有限百分比 clamp/居中形态不变；本片未发现新缺陷 |
| `packages/game/src/tools/fps-overlay.ts` | product | 已验证 | [pre-94 CODE3j display-scale/fps复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-scale-fps/README.md)；tools-panel/rAF caller、启停/采样/DOM tests | module sampling state 在停用时清零；非法持久值仅 `'1'` 开启；本片未发现新缺陷 |
| `packages/game/src/tools/toast.ts` | product | 已验证 | [pre-94 CODE3j toast/map/checkpoints复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-toast-map-checkpoints/README.md)；save/tool callers、success/error/info/stack lifecycle tests | DOM 单例/多 toast 到期自删合同完整；本片未发现直接缺陷 |
| `packages/game/src/tools/quick-save.ts` | product | 已验证 | [CODE-QUALITY-102 Codex独立复核](../evidence/CODE-QUALITY-102/codex-current-review.md)；bootstrap setupQuickSave真实注入、Save API/IDB caller、quick-save/toast tests | F5/F9 时机门、preventDefault、错误反馈、SSR no-op、disposer 与依赖 ownership 逐文件核验；无直接缺陷 |
| `packages/game/src/tools/quick-save.test.ts` | test | 已验证 | [CODE-QUALITY-102 Codex独立复核](../evidence/CODE-QUALITY-102/codex-current-review.md)；真实 GameState/KeyboardEvent、save/load/toast oracle 与 finally 清理 | 8 tests；E-13 `as never` 夹具已移除，异步失败/空槽/解绑/计时器和 DOM 隔离均有判别力；无重复 toast 原语断言 |
| `packages/game/src/core/save/api.ts` | product | review | [CODE-QUALITY-101 Codex当前逐文件复核](../evidence/CODE-QUALITY-101/codex-current-review.md)；Save API 双路径 caller、MAX_SAVE_SLOTS=5、内存/IndexedDB 边界 | 已完整读取；NaN/无穷/小数只通过范围守卫，双路径输入合同未裁决；见 GAME-SAVE-INPUT-DOMAIN-1，禁止实现或标已验证 |
| `packages/game/src/core/save/indexed-db.ts` | product | review | [CODE-QUALITY-101 Codex当前逐文件复核](../evidence/CODE-QUALITY-101/codex-current-review.md)；真实事务测试、IndexedDB 生命周期与公共 Save caller | 事务 complete/abort 由 GAME-SAVE-IDB-COMMIT-1 维护；open 失败缓存与 db.close 生命周期仍缺主路径证据，保持 review |
| `packages/game/src/core/save/__tests__/api.test.ts` | test | review | [CODE-QUALITY-101 Codex当前逐文件复核](../evidence/CODE-QUALITY-101/codex-current-review.md)；真实 GameState fixture、Save API oracle 与隔离 | 8 个内存路径合同有判别力，但 jsdom 无 IndexedDB；双路径非法数值反例待 GAME-SAVE-INPUT-DOMAIN-1 裁决 |
| `packages/game/src/core/menu/save-slot-menu.ts` | product | 已验证 | [CODE-QUALITY-100 Codex当前独立复核](../evidence/CODE-QUALITY-100/codex-current-review.md)；menu-driver 标题/系统 save-load caller、draw-menu SlotMeta oracle、Save API/IDB 边界、sdlpal uigame.c:169-242 | 选择状态、1-based/defaultSlot、非顺序 id、空表与异步元数据 ownership 逐文件核验；无 schema/写路径或直接产品缺陷 |
| `packages/game/src/core/menu/save-slot-menu.test.ts` | test | 已验证 | [CODE-QUALITY-100 Codex当前独立复核](../evidence/CODE-QUALITY-100/codex-current-review.md)；真实 Save.listSlots caller、menu-save-chain/menu-driver oracle | 58 定向测试中的菜单/真链合同；移除三条重复 Save API roundtrip，补首项环绕、reject warning、异步 resolve/刷新 id 与 afterEach spy 隔离；无弱断言遗留 |
| `packages/game/src/core/menu/save-slot-menu.glm-phase1-leaves.test.ts` | test | 已验证 | [CODE-QUALITY-100 Codex当前独立复核](../evidence/CODE-QUALITY-100/codex-current-review.md)；公开工厂同步合同与 sdlpal defaultSlot oracle | 非顺序 id、越界 defaultSlot、空表 Up/Down 反例；与 IO/dispatcher 测试排重 |
| `packages/game/src/tools/map-names.ts` | product | 已验证 | [pre-94 CODE3j toast/map/checkpoints复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-toast-map-checkpoints/README.md)；shared authored map-name caller 与 known/fallback tests | 缺名保持 `地图N` 回退，不改 authored table |
| `packages/game/src/tools/speedrun/time-format.ts` | product | review | [pre-94 CODE3j time-format 当前复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-time-format/README.md)；store/overlay/tools-panel caller、三份直接测试 | 发现超长数字可形成 Infinity 并在 JSON 持久化时静默变 null；已补 finite 反例与解析守卫，整卡/统一门仍待 |
| `packages/game/src/tools/speedrun/countdown.ts` | product | 已验证 | [pre-94 CODE3j countdown复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-countdown/README.md)；speedrun/index caller、singleton/update/remove DOM tests | 单节点复用、null 幂等移除、disabled 清理；本片未发现直接缺陷，3j 整卡仍 partial |
| `packages/game/src/tools/speedrun/checkpoints.ts` | product | 已验证 | [pre-94 CODE3j toast/map/checkpoints复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-toast-map-checkpoints/README.md)；speedrun store/detectors caller、21-id/monotonic/BANANA tests 与 PalTimer 注释 | 只读核对坐标/物品/检测器；坐标实跑仍 unknown，不擅改速通数据 |
| `packages/game/src/tools/display-scale.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3j；NaN/round/fullscreen/FPS lifecycle 合同；删除 NaN guard 的 mutant 失败 | 合并现有 display-scale/FPS 合同，不堆弱断言 |
| `packages/game/src/present/framebuffer.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present/draw-tilemap/draw-sprite caller、framebuffer + leaves tests | 默认/离屏尺寸、边界静默写、palette 缺色 fallback 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/screen-shake.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:710-715 caller、sdlpal video.c:571-620、shake/bounds tests | 奇偶垂直搬移、level 越界、advance=false 补帧和 shakeTime 递减逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/screen-wave.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:313-317 caller、sdlpal scene.c:365-430、global.h:379/538-539、wave/leaves/mirror tests | `<=0` guard、256 关断、相位/循环与 advance=false 逐文件核验；历史 raw/mutant 结果未在本片重跑 |
| `packages/game/src/present/dither-fade.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:658-673、battle fade caller、video.c/battle.c、dither/nibble tests | 72-step RG_INDEX/低位逼近与 backup ownership 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/draw-number.ts` | product | review | CODE-QUALITY-3k 当前复审；battle/menu/dialog callers、sdlpal ui.c:640-732、draw-number/slots tests | 合法颜色/对齐/R-to-L/truncate/opaque mask/缺帧合同完整；正 Infinity 会卡在长度循环，生产可达性未证，留 review |
| `packages/game/src/present/follower-pos.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:393-417、sdlpal scene.c:658-780、follower tests | walking/静止冻结/障碍回退/朝向源/trail fallback 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/framebuffer.test.ts` | test | 已验证 | CODE-QUALITY-3k；默认尺寸/write-clear/toImageData RGBA 合同 | 直接 framebuffer oracle |
| `packages/game/src/present/framebuffer.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3k；越界、自定义尺寸、缺色 fallback 反例 | 高判别力边界合同 |
| `packages/game/src/present/screen-shake.test.ts` | test | 已验证 | CODE-QUALITY-3k；奇偶搬移/递减/level 0/连续帧合同 | 公式 oracle |
| `packages/game/src/present/screen-shake-bounds.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；level 199/200/256、advance=false 边界合同 | 不重复主干 |
| `packages/game/src/present/screen-wave.test.ts` | test | 已验证 | CODE-QUALITY-3k；渐弱/清零/循环守恒合同 | 相位 reset 隔离 |
| `packages/game/src/present/screen-wave.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3k；advance=false/循环/跨帧相位/真实 raw 负 progression 收尾合同；原卡/总纲 mutant 4 total/3 passed/1 failed→恢复 4/4；旧3 fail误述保留于原snapshot | typed indices + raw oracle |
| `packages/game/src/present/screen-wave-mirror.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；镜像 wave 表/关断/累加边界合同 | 独立行 shift oracle |
| `packages/game/src/present/dither-fade.test.ts` | test | 已验证 | CODE-QUALITY-3k；step0/outer1/72-step 收敛合同 | 原版 nibble oracle |
| `packages/game/src/present/dither-fade-nibble.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；RG_INDEX 顺序/低位回退/邻接不动合同 | 相位合同 |
| `packages/game/src/present/draw-number.test.ts` | test | 已验证 | CODE-QUALITY-3k；align/color/truncate/缺帧合同 | sdlpal UI oracle |
| `packages/game/src/present/draw-number-slots.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；opaque mask/末行/缺位/nLength=0 合同 | 直接 framebuffer oracle |
| `packages/game/src/present/follower-pos.test.ts` | test | 已验证 | CODE-QUALITY-3k；walking/frozenOffset/0x46/船/隐龙窟回归合同 | 一阶段行为回归 |
| `packages/game/src/present/follower-pos-axis.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；方向轴/障碍/短 trail/静止不调用 caller 合同 | 轴向反例 |
| `packages/game/src/present/battle/draw-battle-bg.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle caller、battle.c:50-90/565-620/982、bg tests | 索引0不透明、尺寸裁剪、召唤低 nibble 染色逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-effect.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle overlay caller、fight.c:2183/2188/2760、effect/pixel tests | 底中 anchor、opaque mask、缺资源/坏 frame no-op 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-num.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle showDamageNum caller、uibattle.c:1746-1810、num/pixel tests | 40ms age、0..10 寿命、y上移、5位 right align/颜色合同逐文件核验；未发现新直接缺陷 |
| `packages/game/src/present/battle/draw-battle-settlement.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle caller、battle.c:991-1373、ui.c:640-732、settlement pixel tests | exp/cash/level/hidden-exp/learn-magic screens 的布局、文字、数字、mask 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-sprites.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle/battle-positions caller、battle/fight/uibattle/palcommon primary、sprite pixel/leaves tests | target highlight、idle/death/fade、color shift、Y-sort/opaque mask/边缘裁剪逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-ui.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle caller、player-poison-state mapper、uibattle/magicmenu/itemmenu primary、UI pixel/leaves tests | dialog/escape/auto early return、menu/target/status layers、party-slot poison color、grid/MP/amount layout 逐文件核验；未发现直接缺陷 |
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
| `packages/game/src/core/battle/formulas.ts` | product | 已验证 | CODE-QUALITY-3m 3m-formulas-magic；fight.c:131-389、battle callers、formula tests | SHORT/WORD、CLASSIC base/physical/magic/dex、resistance/field steps 逐段核对；未发现直接缺陷 |
| `packages/game/src/core/battle/magic-damage.ts` | product | 已验证 | CODE-QUALITY-3m 3m-formulas-magic；fight.c:4270-4318/5300-5400/4673-4853、inline/Simulate/throw/coop callers、magic tests | per-target RNG/minDamage/def/resistance/autoDefend/defeated skip/object magic 合同逐段核对；未发现直接缺陷 |
| `packages/game/src/core/battle/status.ts` | product | 已验证 | CODE-QUALITY-3m 3m-status；fight.c:1632-1661、battle-system turn-end caller、battle-finalization、status/actions/state-machine tests | 全 status counter tick；敌方按 SDLPal 全槽位递减（含死槽）；canAct/canCast 与 <=999 清理边界已核；3m 整卡仍 partial |
| `packages/game/src/core/battle/turn-queue.ts` | product | 已验证 | CODE-QUALITY-3m 当前只读复审；battle-system:680-770 caller、fight.c:1451-1584、battle.h ACTIONQUEUE、queue/state-machine tests | stable dex sort、dualMove dex2/legacy fallback、enemy-first tie 逐文件核验；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-positions.ts` | product | 已验证 | CODE-QUALITY-3m 当前只读复审；battle-state/opcode/present/UI/sprite callers、battle.c:27/903-939、global.h:401-404、position tests | 1/2/3 人 SDL 表、4/5 fallback、EnemyPos fallback/idx bounds 逐文件核验；未发现直接缺陷 |
| `packages/game/src/core/rng.ts` | product | 已验证 | CODE-QUALITY-3m 3m-rng；util.c:169-275、battle/event/progression callers、rng tests | mulberry32 deterministic state/range APIs；`to<=from` 返回起点且不消费状态；SDLPal LCG 差异为已记录设计 |
| `packages/game/src/core/battle/__tests__/formulas.test.ts` | test | 已验证 | CODE-QUALITY-3m；base/physical/magic/dex formula contracts | primary-source numeric oracle |
| `packages/game/src/core/battle/__tests__/magic-damage.test.ts` | test | 已验证 | CODE-QUALITY-3m；inline/Simulate/enemy magic/autoDefend contracts | real BattleState caller oracle |
| `packages/game/src/core/battle/__tests__/status.test.ts` | test | 已验证 | CODE-QUALITY-3m 3m-status；all status tick、死敌槽位反例、canAct/canCast、相邻 battle lifecycle contracts | counter lifecycle oracle；旧“死敌不 tick”弱 oracle 已改为 primary 全槽位语义 |
| `packages/game/src/core/battle/__tests__/turn-queue.test.ts` | test | 已验证 | CODE-QUALITY-3m；sort/tie/dualMove/dex2 contracts | queue identity oracle |
| `packages/game/src/core/rng.test.ts` | test | 已验证 | CODE-QUALITY-3m 3m-rng；same seed/different seed/half-open/inclusive/float/state/invalid-bound contracts | deterministic RNG oracle；边界反例验证无额外抽样 |
| `packages/game/src/core/palette-fade.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；palette.c:123-666、event-system/present callers、palette/direct boundary tests | fade60/fade63/PaletteFade `/31` integer truncation/approach/freeze/nightColors contracts；已修复 Math.round 差异 |
| `packages/game/src/core/scene-identity.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap/scene-system load/restore callers、history/map-name readers | single current map identity setter/getter；caller ownership explicit |
| `packages/game/src/core/word-lookup.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap setWordTable、menu/settlement/event callers、word tests | table-first/fallback/empty/out-of-range contract；未改 WORD schema |
| `packages/game/src/core/script-catalog.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap setGlobalEvents、event-system resolveLabel/getCmds callers、dependency ownership tests；prototype label negative controls | inherited label 防护与 own-property/null-prototype、zero-item fixup 边界逐文件核对；未发现新缺陷 |
| `packages/game/src/core/palette-fade.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；fade60/fade63/PaletteFade `/31`/approach/finalize/bounds contracts | primary palette oracle；0→1 截断反例 |
| `packages/game/src/core/word-lookup.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；unloaded/fallback/table priority/out-of-range contracts | direct WORD caller oracle |
| `packages/game/src/core/dependency-ownership.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；catalog/scene identity ownership、prototype label negative controls、cross-entrypoint identity | 真实公开 entrypoint oracle |
| `packages/game/src/core/cross-module-boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；scene/event/equipment/battle cross-module caller contracts | 相邻模块回归证据 |
| `packages/game/src/core/dialog-history.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；event-system history writer/bootstrap restore/menu caller、dialog-history tests | trim/连续去重/map 维度/CAP/restore 老档归一合同逐文件核对；未发现新缺陷 |
| `packages/game/src/core/mode.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；main-loop caller、event/scene/battle/menu mode tests | frameNum、autoScript gate、mode dispatch、同步 event 再驱动合同逐文件核对；未发现新缺陷 |
| `packages/game/src/core/player-poison-state.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；event-opcode/equipment/battle callers、ownership/poison tests | poison definition ownership/level99/party-slot dedup/cure/runner 合同逐文件核对；未发现新缺陷 |
| `packages/game/src/core/scene-system-search.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；scene-system Confirm caller、play.c:362-510、search tests | 13-cell range、trigger mode 阈值、grid/h/sState/first-hit 合同逐文件核对；反直觉阈值保留 |
| `packages/game/src/core/scene-system.ts` | product | 已验证 | CODE-QUALITY-3q 3q-scene-system；play.c:25-238,362-591、scene.c:512-847、map.c:277-299、res.c:229-301、global.h:75-121,512-531；mode/event/bootstrap callers | 662行逐段重读；移动/碰撞/触发/scene load合同与467定向相邻回归核对；未发现新缺陷，统一门仍待 |
| `packages/game/src/core/event-system.ts` | product | 已验证 | CODE-QUALITY-3r 当前复审；3r-event-system；script.c:30-307,608-750,1140-1410,1600-1815,1850-1990,2050-2145,2290-2385,2385-2555,2570-2775,2970-3070；play.c:56-238；scene.c:779-930；mode/bootstrap/scene/menu callers | 5,117 行完整读取；global ip、auto/event/runScript、waiting/fade/modal、scene/battle/menu resume、raw opcode、对象解析与移动逐段核验；game package 321 files/3,619 tests、typecheck通过，未发现新 direct defect；coverage/ratchet/protected/full check 未在本小批运行 |
| `packages/game/src/core/battle/battle-opcodes.ts` | product | 已验证 | CODE-QUALITY-3t；script.c:867-950,1026-1102,1175-1425,1437-1449,1573-1640,1848-2054,2547-2668,2776-2995,3267-3297；fight.c:602-716,2387-2390,4214-4323,5193-5400；battle.c:1397-1434；event-system/actions/battle-system callers | 1528 行逐段核验 dispatch、BattleCtx ownership、目标/状态/伤害/毒、召唤/分裂/变身/逃跑、动画/偷窃/战斗结果与 consumed/newIp；定向/相邻 470 tests、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷；0x2E `>=` 为 game-mechanics 已记录的原版后期产品决策 |
| `packages/game/src/core/battle/__tests__/battle-opcodes.test.ts` | test | 已验证 | CODE-QUALITY-3t；2386 行全文、主 oracle、script.c/fight.c caller/合同、470 定向/相邻 tests | 合法目标、边界、失败分支、目标缺失、动画/资源副作用与 consumed/newIp 反控；无弱化断言 |
| `packages/game/src/core/battle/battle-opcodes.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3t；1189 行全文、dispatch family branch contracts、470 定向/相邻 tests | 真实 state/ctx caller 合同、非法/缺资源/满槽/无目标反例；不以 coverage 数量单独验收 |
| `packages/game/src/core/battle/battle-opcodes.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3t；70 行全文、0x05/0x8E dialog clear 与 0x6B signed blow-away primary contract | 清框只影响下一段对白、SHORT 负值边界与 negative control |
| `packages/game/src/battle-summon-slot-reuse.glm-q.test.ts` | test | 已验证 | CODE-QUALITY-3t；203 行全文、0x9E 战中死亡空槽复用/对象身份/阵型重算 oracle | 活槽不复用、毒/身份清理与阵型锚点反例 |
| `packages/game/src/core/battle/battle-state.ts` | product | 已验证 | CODE-QUALITY-3u；battle.h:49-119,158-206；global.h:395-404,441-444；battle.c:900-943,1531-1775；fight.c:117-127,2173-2190,3209-3245；battle-system/finalization/anim callers | 918 行逐段核验 BattleState 字段、phase/UI/queue、玩家/敌人快照、null 空槽、对象身份、脚本/毒/动画/结算 ownership；55 定向/相邻 tests、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-runtime-context.ts` | product | 已验证 | CODE-QUALITY-3u；battle.c:1741-1754,1838-1857；battle-system:324-344；battle-finalization:63；runtime/finalization callers | 98 行逐段核验资源表与 runner stash、live-role identity、override 优先级和 finalize release；未发现跨战斗残留或清理缺口 |
| `packages/game/src/core/battle/__tests__/battle-state.test.ts` | test | 已验证 | CODE-QUALITY-3u；BattleState 工厂/位置/状态 seed oracle，定向/相邻 55 tests | 383 行逐段读取；未知 role、>3 player、状态 seed、快照、EnemyPos/fallback/y offset 和独立坐标对象反例 |
| `packages/game/src/core/battle/battle-state.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3u；null 空槽、maxHealth/object identity、autoBattle/scriptPrevHp oracle，定向/相邻 55 tests | 81 行逐段读取；0 占位槽不压缩、真实槽浅拷贝、开战 seed 反例 |
| `packages/game/src/core/battle/battle-finalization.test.ts` | test | 已验证 | CODE-QUALITY-3u；finalization cleanup/resume caller oracle，定向/相邻 55 tests | 80 行逐段读取；状态/波场/模式/资源释放顺序与 0x07 resume 反例 |
| `packages/game/src/core/battle/actions/attack.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:3618-3754,4910-5148,4591-4654；battle-system action caller；action/anim/formula callers | 614 行实现全文核验玩家/敌方物攻、群攻/DualAttack、auto-defend/cover/protect、equiv poison、混乱友敌与 timeline 委托；定向6 files/154 tests通过，未发现 direct defect；coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/actions/attack-mate.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:3760-3853；battle-system attack-mate dispatch；attack-mate/action tests | 111 行实现全文核验随机活友军、目标防御/protect、HP clamp、武器声、动画与无目标 Pass；定向6 files/154 tests通过，未发现 direct defect；coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/actions/defend.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:4110-4117,4924-4929；battle-system dispatch；actions tests | 20 行实现全文核验；只写 defending，减伤由 enemy attack owner 消费，越界 no-op 合同闭合；定向6 files/154 tests通过 |
| `packages/game/src/core/battle/actions/flee.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:4119-4172；battle.c:1455-1528；battle-system dispatch；actions tests | 81 行实现全文核验 flee rate/装备、已批准敌吉运修复、boss RNG、空槽/SHORT 溢出、失败动画与 exp；未发现 direct defect；定向6 files/154 tests通过 |
| `packages/game/src/core/battle/__tests__/attack-mate.test.ts` | test | 已验证 | CODE-QUALITY-3v；111 行实现对应的 7 个 AttackMate oracle，154 定向/相邻 tests | 148 行全文读取；随机 self/dead 跳过、protect/defend/clamp/无活友军/武器声与 HP ownership 反例 |
| `packages/game/src/core/battle/actions/attack.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；64 行命中特效帧基号/缺表反例，定向6 files/154 tests | 全文读取；flat index `sprite*2+1`、×3、undefined fallback 与真实 timeline oracle；未发现重复或弱断言 |
| `packages/game/src/core/battle/battle-finalization.ts` | product | 已验证 | CODE-QUALITY-3w；battle.c:1822-1857；battle-system:415,530；finalization/settlement callers | 67 行全文核验 outcome、状态/毒/装备/波场/mode/runtime/postBattle cleanup 顺序；196 定向/相邻 tests、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-settlement.ts` | product | 已验证 | CODE-QUALITY-3w；battle.c:991-1373；battle-system:390-530；progression/settlement callers | 246 行全文核验 exp/cash/HP-MP 回写、屏序/timeout、Phase E once、对话 hold、半血与 finalize；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-settlement.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3w；settlement screen/timeout/Phase E/half-heal oracle，196 定向/相邻 tests | 259 行全文读取；首帧残键、74+1 timeout、屏序、Phase E once/dialog hold/半血恢复反例 |
| `packages/game/src/core/dialog-history.test.ts` | test | 已验证 | CODE-QUALITY-3o；trim/dedup/map/CAP/restore contracts | direct history oracle |
| `packages/game/src/core/mode.test.ts` | test | 已验证 | CODE-QUALITY-3o；mode/frame/autoScript/event dispatch contracts | main loop dispatch oracle |
| `packages/game/src/core/scene-system-search.test.ts` | test | 已验证 | CODE-QUALITY-3q 3q-scene-system；13-cell/facing/trigger threshold/first hit contracts | primary search oracle |
| `packages/game/src/core/scene-system.test.ts` | test | 已验证 | CODE-QUALITY-3q 3q-scene-system；真实 tickSceneSystem/tickEventSystem/SceneAssetsCache/setGlobalEvents caller，play.c/scene.c/map.c oracle | 2064行全文重读；方向/顺序、4..8 trigger、vanish/revive、blocker push、tile h/bit13、trail/步态、loadScene/cache/onEnter、TouchFar 死锁和 invalid-label 反例均有高判别力合同；相邻warning仍待统一清零 |
| `packages/game/src/core/event-system.test.ts` | test | 已验证 | CODE-QUALITY-3r 当前复审；3r-event-system；真实 tickEventSystem/tickAutoScripts/runScript/runEnterScript callers，script.c/play.c/scene.c/text.c oracle | 5,974 行主测试全文核验；dialog/wait/confirm/end、battle fallback、global ip/call、移动/镜头/fade、scene/item/poison/object 条件与特效生命周期合同完整；当前 package test 321 files/3,619 tests通过，未以覆盖率或旧全仓回执替代本轮证据 |
| `packages/game/src/core/battle/battle-system.ts` | product | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；`mode.ts`、`bootstrap.ts`、battle-finalization/settlement/actions callers；`battle.c`/`fight.c`/`script.c`/`global.h` primary | 3,141 行实现全文核验；startBattle 资源/敌槽/对象脚本/复活与装备播种、tickBattle phase/hold/stall、行动队列/RNG、dialog/animation/flee/escape、毒/status、结算/cleanup/resume owner 与真实 caller 对齐；未发现 direct defect；本片仅修测试隔离 |
| `packages/game/src/core/battle/__tests__/battle-system.test.ts` | test | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；公开 startBattle/tickBattle/mode/menu/actions callers，battle.c/fight.c/uibattle.c/script.c oracle | 4,248 行主生命周期/UI测试全文核验；start/phase/queue/cleanup、菜单/target、动画/dialog、毒/状态/逃跑、敌槽/dualMove、Repeat、投掷/道具/召唤和波场 contracts；测试隔离 spy 已恢复；定向9 files/242 tests通过，coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/battle-system.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；公开 startBattle/tickBattle/tickEnemyIdleGestures callers，battle.c/fight.c oracle | 330 行 branch guard/phase/idle/资源缺失/settlement contracts；两个 console.error spy 已用 try/finally 恢复；定向9 files/242 tests通过，coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/battle-system.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；公开 startBattle/tickBattle + event-system battle script caller，battle.c turn-start oracle | 122 行 turn-start dialog-clear 与终态 break contracts；定向9 files/242 tests通过，coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/battle-runtime-context.test.ts` | test | 已验证 | CODE-QUALITY-3s；startBattle 安装/cleanup 与 runScript fallback caller | resource/live-role identity、runner override/clear ownership contracts，3 tests 通过 |
| `packages/game/src/core/event-opcode-player.ts` | product | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；script.c/global.c opcode 0x17-0x2F/0x41/0x55/0x56/0x8D、event-system/equip/inventory/poison callers、四 direct tests | role/slot/SHORT/WORD/fScriptSuccess/owner contracts逐段核对；未发现新缺陷 |
| `packages/game/src/core/event-opcode-player.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；player/equipment/HP-MP/revive/poison/status/magic opcode contracts | direct opcode oracle |
| `packages/game/src/core/event-opcode-player.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；opcode family branch contracts | branch boundary oracle |
| `packages/game/src/core/event-opcode-player.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；role context/slot/poison runner/invalid input contracts | independent caller/negative oracle |
| `packages/game/src/core/__tests__/stats/e2-equipment-effects.test.ts` | test | review | [QUALITY-GAME-RUNTIME-DIAGNOSTICS-1/C2](../evidence/QUALITY-GAME-RUNTIME-DIAGNOSTICS-1/c2/README.md)；真实 `writeEquipmentEffectField`/`removeEquipmentEffect` caller、完整 stats fixture、SDLPal row/part 边界与 warning oracle | 8 tests；未知 row 999 与越界 no-op 合同；warning 已显式捕获并断言，保留 review 等剩余诊断与统一门 |
| `packages/game/src/core/__tests__/stats/e4-run-equip-script.test.ts` | test | review | [QUALITY-GAME-RUNTIME-DIAGNOSTICS-1/C2](../evidence/QUALITY-GAME-RUNTIME-DIAGNOSTICS-1/c2/README.md)；公开 `runEquipScript` 入口、全局 label map、`equip-effect.ts` runner 与 typed command fixture | 8 tests；未注册 `L_99999`、goto/end/signExtend/tick limit；warning 已显式捕获并断言，保留 review 等剩余诊断与统一门 |
| `packages/editor/src/ui/command-form-control.residual.glm.test.tsx` | test | review | [CODE-QUALITY-103 Codex当前逐文件复核](../evidence/CODE-QUALITY-103/codex-current-review.md)；真实 CanonicalScriptBodyEditor→EntityAddressEditor caller、合法 EntityAddress 与自动改绑 oracle | 1合同/4定向测试通过；相邻测试有22条 React act诊断，保持 review，不标已验证 |
| `packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx` | test | review | [CODE-QUALITY-103 Codex当前逐文件复核](../evidence/CODE-QUALITY-103/codex-current-review.md)；真实 ItemTab/loader/EditSession/save-gate caller、R1/R3/R5 oracle | 3合同/4定向测试通过；相邻测试有22条 React act诊断，P1 puppet/battleOnly仍是产品裁决，保持 review |
| `packages/editor/src/ui/ItemTab.glm-m.test.tsx` | test | review | [CODE-QUALITY-104 Codex act 生命周期复核](../evidence/CODE-QUALITY-104/codex-current-review.md)；真实 ItemTab/EditSession caller、交易/说明 oracle | 原生 undo 事件已包 act；定向/相邻/全仓 check 零诊断，coverage ratchet/protected 仍受既有 baseline 回退阻塞 |
| `packages/editor/src/ui/ItemUseEffectEditor.glm-m.test.tsx` | test | review | [CODE-QUALITY-104 Codex act 生命周期复核](../evidence/CODE-QUALITY-104/codex-current-review.md)；真实 ItemEffectChainEditor/EditSession caller、效果 schema/undo oracle | 原生 click/undo/redo 已包 act；定向/相邻/全仓 check 零诊断，coverage ratchet/protected 仍受既有 baseline 回退阻塞 |
| `packages/reforge/src/menu/menu-box.residual.glm.test.ts` | test | review | CODE-QUALITY-105；Codex 当前逐文件复核 MenuBox.render 公开 caller、R1/R2/S1/S2/S3 合同与 K1–K5 反控 | 25/25 定向通过；menu 相邻 118/118 但 reward-gain 未 await 诊断；coverage/unified 门仍阻塞，保持 review |
| `packages/reforge/src/menu/reward-gain-queue.boundaries.test.ts` | test | review | CODE-QUALITY-106；真实 RewardGainQueue.present/handleRewardGainInput caller、Promise resolve/AbortError oracle | 定向5/5、相邻21/118零 stderr；全仓 coverage 仍待批次收口，保持 review |
| `packages/game/src/core/menu/primitives.ts` | product | review | CODE-QUALITY-107；SDLPal ui.c:510-572 cursor、真实 menu/battle/inventory caller、E-4 test-only page API | 纯状态 helper 已完整读取；定向/相邻证据待批次收口，E-4 不删公共出口 |
| `packages/game/src/core/menu/item-select.ts` | product | review | CODE-QUALITY-107；SDLPal itemmenu/play/uigame filter caller、typed Item/Inventory oracle、E-5 无生产 caller | filter/建表合同已完整读取；important 为工程近似，E-5 不删公共出口 |
| `packages/game/src/core/menu/__tests__/primitives.test.ts` | test | review | CODE-QUALITY-107；Selection/Confirm/Triple/Switch 主干与公开 helper oracle | 7 文件定向 78 tests；相邻有 2 条白名单外预期 stderr，保持 review |
| `packages/game/src/core/menu/primitives.boundaries.test.ts` | test | review | CODE-QUALITY-107；空表/单项/跨页视窗/输入不改写 oracle | 7 文件定向 78 tests；未将 test-only page API 当产品真值 |
| `packages/game/src/core/menu/primitives.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-107；pageUp/down 现状、全 disabled、负 cursor、identity oracle | 7 文件定向 78 tests；E-4 保留待另卡 |
| `packages/game/src/core/menu/item-select.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-107；filter 真值、目录外 id、缺名、空库存、奇数卖价 oracle | 7 文件定向 78 tests；important 近似显式披露 |
| `packages/game/src/core/menu/__tests__/item-magic-select.test.ts` | test | review | CODE-QUALITY-107；真实 item/magic selection caller、MP disabled/排序/rightText oracle | 7 文件定向 78 tests；相邻 magic-script 诊断保持开放 |
| `packages/game/src/core/menu/magic-script.ts` | product | review | CODE-QUALITY-108；SDLPal uigame.c:740-873、script.c:867-1102；menu-driver/in-game-magic 与 battle runScript callers | 258 行完整读取；大世界 runner 的全局 label、HP/MP、复活和 warning ownership 已核；本批未改生产，整卡等统一门 |
| `packages/game/src/core/menu/magic-script.test.ts` | test | review | CODE-QUALITY-108；真实 castOverworldMagic caller、typed global command fixture、warning/HP/return oracle | 37 tests；缺失 label 两项 warning 已精确捕获并恢复 spy，定向与 menu 相邻 0 stderr；整卡等统一门 |
| `packages/game/src/analytics/install-analytics.ts` | product | review | CODE-QUALITY-109；main.ts 唯一生产 caller、consent UI/Google Analytics lifecycle、DNT/GPC 与 dataLayer oracle | 57 行完整读取；安装/销毁 ownership 与生产 gate 对齐；本批未改生产，整卡等统一门 |
| `packages/game/src/analytics/install-analytics.test.ts` | test | review | CODE-QUALITY-109；真实 installation return、DOM/storage/dataLayer oracle | 2 tests；补 afterEach destroy，修复第二例 listener/UI 跨用例泄漏；game analytics 6/23 通过，整卡等统一门 |
| `packages/game/src/present/draw-sprite.ts` | product | review | CODE-QUALITY-110；SDLPal palcommon.c:36-130/scene.c:210-316；present/FBP/ending/dialog callers | 49 行完整读取；逐帧 anchor、opaque mask、palette-0 和 Framebuffer clipping 对齐；无直接缺陷 |
| `packages/game/src/present/draw-sprite.test.ts` | test | review | CODE-QUALITY-110；Framebuffer pixel oracle、present sprite contract | 3 合同/定向 17 tests；帧高、脚底、透明孔、palette-0、屏外均有判别力 |
| `packages/game/src/present/draw-sprite-clip.grok-r1.test.ts` | test | review | CODE-QUALITY-110；真实 drawSprite/Framebuffer caller、G03-B clip oracle | 8 边界；奇数宽、左右/上下裁剪、identity、透明孔；与主干排重 |

| `packages/editor/src/ui/command-form-control.residual.glm.test.tsx` | test | review | [CODE-QUALITY-103 Codex当前逐文件复核](../evidence/CODE-QUALITY-103/codex-current-review.md)；真实 CanonicalScriptBodyEditor→EntityAddressEditor caller、合法 EntityAddress 与自动改绑 oracle | 1合同/4定向测试通过；相邻测试有22条 React act诊断，保持 review，不标已验证 |
| `packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx` | test | review | [CODE-QUALITY-103 Codex当前逐文件复核](../evidence/CODE-QUALITY-103/codex-current-review.md)；真实 ItemTab/loader/EditSession/save-gate caller、R1/R3/R5 oracle | 3合同/4定向测试通过；相邻测试有22条 React act诊断，P1 puppet/battleOnly仍是产品裁决，保持 review |
| `packages/reforge/src/menu/menu-box.residual.glm.test.ts` | test | review | CODE-QUALITY-105；Codex 当前逐文件复核 MenuBox.render 公开 caller、R1/R2/S1/S2/S3 合同与 K1–K5 反控 | 25/25 定向通过；menu 相邻 118/118 但 reward-gain 未 await 诊断；coverage/unified 门仍阻塞，保持 review |
| `packages/reforge/src/menu/reward-gain-queue.boundaries.test.ts` | test | review | CODE-QUALITY-106；真实 RewardGainQueue.present/handleRewardGainInput caller、Promise resolve/AbortError oracle | 定向5/5、相邻21/118零 stderr；全仓 coverage 仍待批次收口，保持 review |
| `packages/game/src/core/menu/primitives.ts` | product | review | CODE-QUALITY-107；SDLPal ui.c:510-572 cursor、真实 menu/battle/inventory caller、E-4 test-only page API | 纯状态 helper 已完整读取；定向/相邻证据待批次收口，E-4 不删公共出口 |
| `packages/game/src/core/menu/item-select.ts` | product | review | CODE-QUALITY-107；SDLPal itemmenu/play/uigame filter caller、typed Item/Inventory oracle、E-5 无生产 caller | filter/建表合同已完整读取；important 为工程近似，E-5 不删公共出口 |
| `packages/game/src/core/menu/__tests__/primitives.test.ts` | test | review | CODE-QUALITY-107；Selection/Confirm/Triple/Switch 主干与公开 helper oracle | 7 文件定向 78 tests；相邻有 2 条白名单外预期 stderr，保持 review |
| `packages/game/src/core/menu/primitives.boundaries.test.ts` | test | review | CODE-QUALITY-107；空表/单项/跨页视窗/输入不改写 oracle | 7 文件定向 78 tests；未将 test-only page API 当产品真值 |
| `packages/game/src/core/menu/primitives.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-107；pageUp/down 现状、全 disabled、负 cursor、identity oracle | 7 文件定向 78 tests；E-4 保留待另卡 |
| `packages/game/src/core/menu/item-select.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-107；filter 真值、目录外 id、缺名、空库存、奇数卖价 oracle | 7 文件定向 78 tests；important 近似显式披露 |
| `packages/game/src/core/menu/__tests__/item-magic-select.test.ts` | test | review | CODE-QUALITY-107；真实 item/magic selection caller、MP disabled/排序/rightText oracle | 7 文件定向 78 tests；相邻 magic-script 诊断保持开放 |
| `packages/game/src/core/menu/magic-script.ts` | product | review | CODE-QUALITY-108；SDLPal uigame.c:740-873、script.c:867-1102；menu-driver/in-game-magic 与 battle runScript callers | 258 行完整读取；大世界 runner 的全局 label、HP/MP、复活和 warning ownership 已核；本批未改生产，整卡等统一门 |
| `packages/game/src/core/menu/magic-script.test.ts` | test | review | CODE-QUALITY-108；真实 castOverworldMagic caller、typed global command fixture、warning/HP/return oracle | 37 tests；缺失 label 两项 warning 已精确捕获并恢复 spy，定向与 menu 相邻 0 stderr；整卡等统一门 |
| `packages/game/src/analytics/install-analytics.ts` | product | review | CODE-QUALITY-109；main.ts 唯一生产 caller、consent UI/Google Analytics lifecycle、DNT/GPC 与 dataLayer oracle | 57 行完整读取；安装/销毁 ownership 与生产 gate 对齐；本批未改生产，整卡等统一门 |
| `packages/game/src/analytics/install-analytics.test.ts` | test | review | CODE-QUALITY-109；真实 installation return、DOM/storage/dataLayer oracle | 2 tests；补 afterEach destroy，修复第二例 listener/UI 跨用例泄漏；game analytics 6/23 通过，整卡等统一门 |
| `packages/game/src/present/draw-sprite.ts` | product | review | CODE-QUALITY-110；SDLPal palcommon.c:36-130/scene.c:210-316；present/FBP/ending/dialog callers | 49 行完整读取；逐帧 anchor、opaque mask、palette-0 和 Framebuffer clipping 对齐；无直接缺陷 |
| `packages/game/src/present/draw-sprite.test.ts` | test | review | CODE-QUALITY-110；Framebuffer pixel oracle、present sprite contract | 3 合同/定向 17 tests；帧高、脚底、透明孔、palette-0、屏外均有判别力 |
| `packages/game/src/present/draw-sprite-clip.grok-r1.test.ts` | test | review | CODE-QUALITY-110；真实 drawSprite/Framebuffer caller、G03-B clip oracle | 8 边界；奇数宽、左右/上下裁剪、identity、透明孔；与主干排重 |
| `scripts/docs/check-document-model.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/document-model.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/document-model.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/frozen-document-source.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/git-document-source.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/historical-execution-source.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/report-governance-progress.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/retired-document-writers.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1 K0；历史文档writer真实CLI退休/零写合同，专项语义仍待核 | 仅新增库存；不计产品运行、coverage或代码治理closed |
| `scripts/docs/testing-index-governance.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1 L；索引真实writer/CLI与whole-file consumer合同，专项语义仍待核 | 仅新增库存；不计产品运行、coverage或代码治理closed |
| `scripts/docs/git-document-snapshot.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 F1；固定commit/path/regular-blob原Buffer读取合同，专项语义仍待核 | 仅新增库存；不计代码治理closed |
| `scripts/docs/frozen-binding-baseline.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1 F1；default等值与真实root/view/progress联改反例，专项语义仍待核 | 仅新增库存；不计产品运行或coverage |
| `scripts/docs/terminal-json.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 A8；有界 UTF8/JSON 语法、重复键与原生字段读取；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |
| `scripts/docs/terminal-codec.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 A8；固定 gzip header/单流 footer/CRC/ISIZE 精确 framing；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |
| `scripts/docs/terminal-git.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 A8；真实 Git 工作树发现与元数据边界；合法 caller symlink 归一化；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |
| `scripts/docs/terminal-namespace.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 A8；唯一工作树 namespace/FD 与 source-format-partial 协调；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |
| `scripts/docs/terminal-contract.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 A8；终端 JSON 记录/事件格式合同；不授审批与完成信用；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |
| `scripts/docs/terminal-codec.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1 A8；34 个格式/真实公开 caller/反控合同；不计旧业务测试或覆盖率；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |

## 入口与责任

[生成器](../../../scripts/quality/code-quality-inventory.mjs)提供路径集合，读取本表的[完整性门](../../../scripts/quality/code-quality-ledger.mjs)要求唯一汇总、唯一表、合法状态/类别、证据和真实数量相等。Codex维护登记与后继独立验收；[路线](code-quality-governance.md)只导航，不复制一套当前数值或自动授build。

源与状态所属卡决定语义信用。未核项保待核；`review/blocked/rework`必须保留具体缺口，不能为了清零账本删候选或把机器字段批量改已验证。表后原三待核行归并只改变消费者可见性，inventory缺省本已将其计pending，因此不增加任何关闭数。

## 证据与下一步

2026-10-16 G相对原3283新增7项，K0和L各新增1项，F1新增2项，A8新增6项，累计17项均在scripts/docs且仍待核；实际tracked集合当前3300，未删路径。原229closed/5review保持；A8独立格式验收仅为source-format-partial，不关闭CODE-QUALITY专项状态。治理期间须在新增/删除真实tracked路径的同一提交同步库存。当前机器结果只证明记录完整性，专项仍有3066待核和5待审文件。

历史Q3k的“4 total/3 fail”误述现改为卡/总纲一致的“4 total/3 passed/1 failed”，旧错句在下方完整snapshot原字节保留；没有以文档一致性充当第二次运行。Q2b131/129及Q3t/u同215时点仍unknown，u/w依各卡排重；新反例按[现行协作流程](../agent-workflow.md)开互斥卡，不恢复旧prompt。

## 历史范围

原273行包含b9ba7e0起始、后继3283库存及截至2026-10-15的增量说明。原234消费记录及空行后三待核均保留；下方完整原稿放fenced text以防旧汇总/表被真实消费者重复读取，可提取原UTF8字节。

## 原始结论

原已闭合229、待审5、待核3049是3283库存的旧状态投影，不等于今天全部源码被本轮读过。原五review风险与三GLM待核不消失；Q3k“3 fail”原错句保留，只纠正live摘要。

## 当时证据

每行原卡/原测试/primary说明逐字保留（唯一Q3k摘要纠错另列）；10-07/11/12/14/15新增文件不授语义闭合的原说明完整保留。旧raw/test/coverage不是本次再执行，失效路径不自动删除或改已验证。

## 当前有效性

live机器字段属于持续维护输入，历史原文属于不可升格的出处。真实consumer只证明tracked集合、唯一记录/状态/证据与汇总一致；未列路径继续待核，不能以PASS宣布全仓语义治理或当前测试质量通过。

## 继任文档

[路线](code-quality-governance.md)与[当前协作](../agent-workflow.md)控制新批准入。G原7、K0与L各1、F1两项及A8六项docs工具/测试只有库存待核信用；全量专项仍待实际逐文件阅读/合法输入与caller/oracle、反控和独立验收。

固定原稿来自revision `22eead43a6c825e1345feb92441e09d340d22c18`，Git blob `8195bf08cf7193b1dffc0c5676629e6692e50b92`；保留所有原日期、结论和证据边界。

<!-- original-source-fenced:start -->
~~~~text
# 逐文件代码治理账本

基点：`b9ba7e0faadf56519da024c0343f5b44b9a5c447`。机器全量清单由
[`code-quality-inventory.mjs`](../../../scripts/quality/code-quality-inventory.mjs) 生成；本账本只登记已经由
Codex 直接读过源码、生产 caller/合同和验证证据的文件，不把“所在包全绿”推成文件已审。

起始基点机器清单：2,962。当前 tracked 清单（含预览、RNG 回归及第一阶段音乐音源）：3,283。
当前已闭合核验：229；已读但待审：5；尚未逐文件核验：3,049；合计未闭合：3,054。
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

2026-10-14 酒剑仙传功修复新增 `event-rng-scene-restore.test.ts`，tracked inventory 增加一项并计入待核。
专项四合同、像素回归与反控见[修复证据](../evidence/game-rng-scene-restore-1/README.md)，不自动增加本账本治理闭合数量。

2026-10-15 第一阶段音乐音源与缓存回归新增16项tracked记录，均计入待核；功能/独立复核不自动增加本专项语义治理闭合数。精确路径见[新增机器清单](../evidence/game-rix-music-1/release-inventory-delta.json)。

| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |
|---|---|---|---|---|
| `packages/shared/src/rle.ts` | product | 已验证 | CODE-QUALITY-1；RLE 定向、shared 全包、check、ratchet、protected fast、lint | generic/strict framing 边界已收 |
| `packages/shared/src/rle.test.ts` | test | 已验证 | CODE-QUALITY-1；合法帧与回归 oracle | 只登记合同，不以数量验收 |
| `packages/shared/src/rle.boundaries.test.ts` | test | review | [pre-94 CODE1 RLE复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/README.md)；strict framing、相邻 offset 截断反例 | 新增前一帧帧头截断合同；注释/整卡/统一门仍待，不计 closed |
| `packages/shared/src/rle.glm-runtime-resource.test.ts` | test | 已验证 | CODE-QUALITY-1；真实 runtime resource caller | 宽容入口合同 |
| `packages/shared/src/mkf.ts` | product | 已验证 | CODE-QUALITY-2；raw 2,373 chunks、shared 全包、全仓门 | offset table 边界 |
| `packages/shared/src/mkf.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-2；截断/越界/倒序 offset | 纯 codec 合同 |
| `packages/shared/src/rng.ts` | product | 已验证 | CODE-QUALITY-2；raw 1,464 frames、shared 全包、全仓门 | payload/surface 边界 |
| `packages/shared/src/rng.boundaries.test.ts` | test | review | [pre-94 CODE2 MKF/RNG复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/2/README.md)；opcode payload/surface 与连续 delta surface ownership | 新增同一 surface 连续 delta 累加合同；不扩展 runtime 语义，整卡/统一门仍待 |
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
| `packages/game/src/shell/fetch-retry.ts` | product | 已验证 | CODE-QUALITY-3h；main.ts 唯一生产安装 caller；GET/HTTP/非幂等合同、定向测试与 invalid-options negative control | 非法 retries 不再零次请求后 `throw undefined`；非法 backoff 不再交给平台钳制；有效配置行为不变 |
| `packages/game/src/shell/bootstrap-resources.ts` | product | 已验证 | CODE-QUALITY-3h；bootstrap.ts 真实 soundfont/resourcesReady caller、并发屏障和 rejection/degradation tests | soundfont 原始 rejection 与 settle barrier 分离；glyph 仅显式 tofu 降级；未发现直接缺陷 |
| `packages/game/src/shell/fetch-retry.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3h；无效配置合同、HTTP/method/backoff/最终身份反例；删除 guard 的 mutant 失败 | 高判别力输入合同，不以数量验收 |
| `packages/game/src/assets/dialog-assets.ts` | product | 已验证 | CODE-QUALITY-3i；portrait/icon manifest callers、PNG/RLE adapters、dialog-assets/host tests 与 game typecheck | 资产缺失按现行空 map 降级；不伪造 manifest 帧，不改资源格式 |
| `packages/game/src/shell/precache-client.ts` | product | 已验证 | CODE-QUALITY-3i；main/bootstrap SW caller、ready/start/pause/resume/unavailable tests | onPlayable 前不启动 precache，ready race 仅缓冲 start；现行 SW 协议保留 |
| `packages/game/src/shell/precache-ui.ts` | product | 已验证 | CODE-QUALITY-3i 当前复审；DOM widget/unified phase tests、host boundary 23 contracts、main/bootstrap caller | 修复 NaN/Infinity/负字节污染单调进度；合法两段进度与进入/完成/失败生命周期保留 |
| `packages/game/src/shell/audio-volume.ts` | product | 已验证 | CODE-QUALITY-3i；bootstrap 三通道 caller、storage/key tests、NaN negative control | 修复 NaN 音量进入 sink/localStorage；有限/0..1 合法行为不变 |
| `packages/game/src/shell/trademark-fallback.ts` | product | 已验证 | CODE-QUALITY-3i；reference/sdlpal main.c:197-203、rng-player caller、trademark/splash framebuffer/timing tests | 只纠正过时 skipKeys 注释；DOS chunk 6/1000ms/600ms 行为未改 |
| `packages/game/src/shell/audio-volume.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3i；NaN/0/default/三通道共享 mute 合同；删除 NaN guard 的 mutant 失败 | 直接 setter/storage/sink oracle，不重复 clamp 主干 |
| `packages/game/src/tools/display-scale.ts` | product | 已验证 | [pre-94 CODE3j display-scale/fps复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-scale-fps/README.md)；canvas/localStorage/fullscreen callers、scale tests；NaN negative control | 修复 NaN 百分比写入 NaN CSS/storage；有限百分比 clamp/居中形态不变；本片未发现新缺陷 |
| `packages/game/src/tools/fps-overlay.ts` | product | 已验证 | [pre-94 CODE3j display-scale/fps复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-scale-fps/README.md)；tools-panel/rAF caller、启停/采样/DOM tests | module sampling state 在停用时清零；非法持久值仅 `'1'` 开启；本片未发现新缺陷 |
| `packages/game/src/tools/toast.ts` | product | 已验证 | [pre-94 CODE3j toast/map/checkpoints复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-toast-map-checkpoints/README.md)；save/tool callers、success/error/info/stack lifecycle tests | DOM 单例/多 toast 到期自删合同完整；本片未发现直接缺陷 |
| `packages/game/src/tools/map-names.ts` | product | 已验证 | [pre-94 CODE3j toast/map/checkpoints复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-toast-map-checkpoints/README.md)；shared authored map-name caller 与 known/fallback tests | 缺名保持 `地图N` 回退，不改 authored table |
| `packages/game/src/tools/speedrun/time-format.ts` | product | review | [pre-94 CODE3j time-format 当前复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-time-format/README.md)；store/overlay/tools-panel caller、三份直接测试 | 发现超长数字可形成 Infinity 并在 JSON 持久化时静默变 null；已补 finite 反例与解析守卫，整卡/统一门仍待 |
| `packages/game/src/tools/speedrun/countdown.ts` | product | 已验证 | [pre-94 CODE3j countdown复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-countdown/README.md)；speedrun/index caller、singleton/update/remove DOM tests | 单节点复用、null 幂等移除、disabled 清理；本片未发现直接缺陷，3j 整卡仍 partial |
| `packages/game/src/tools/speedrun/checkpoints.ts` | product | 已验证 | [pre-94 CODE3j toast/map/checkpoints复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-toast-map-checkpoints/README.md)；speedrun store/detectors caller、21-id/monotonic/BANANA tests 与 PalTimer 注释 | 只读核对坐标/物品/检测器；坐标实跑仍 unknown，不擅改速通数据 |
| `packages/game/src/tools/display-scale.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3j；NaN/round/fullscreen/FPS lifecycle 合同；删除 NaN guard 的 mutant 失败 | 合并现有 display-scale/FPS 合同，不堆弱断言 |
| `packages/game/src/present/framebuffer.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present/draw-tilemap/draw-sprite caller、framebuffer + leaves tests | 默认/离屏尺寸、边界静默写、palette 缺色 fallback 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/screen-shake.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:710-715 caller、sdlpal video.c:571-620、shake/bounds tests | 奇偶垂直搬移、level 越界、advance=false 补帧和 shakeTime 递减逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/screen-wave.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:313-317 caller、sdlpal scene.c:365-430、global.h:379/538-539、wave/leaves/mirror tests | `<=0` guard、256 关断、相位/循环与 advance=false 逐文件核验；历史 raw/mutant 结果未在本片重跑 |
| `packages/game/src/present/dither-fade.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:658-673、battle fade caller、video.c/battle.c、dither/nibble tests | 72-step RG_INDEX/低位逼近与 backup ownership 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/draw-number.ts` | product | review | CODE-QUALITY-3k 当前复审；battle/menu/dialog callers、sdlpal ui.c:640-732、draw-number/slots tests | 合法颜色/对齐/R-to-L/truncate/opaque mask/缺帧合同完整；正 Infinity 会卡在长度循环，生产可达性未证，留 review |
| `packages/game/src/present/follower-pos.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:393-417、sdlpal scene.c:658-780、follower tests | walking/静止冻结/障碍回退/朝向源/trail fallback 逐文件核验；未发现直接缺陷 |
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
| `packages/game/src/present/battle/draw-battle-bg.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle caller、battle.c:50-90/565-620/982、bg tests | 索引0不透明、尺寸裁剪、召唤低 nibble 染色逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-effect.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle overlay caller、fight.c:2183/2188/2760、effect/pixel tests | 底中 anchor、opaque mask、缺资源/坏 frame no-op 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-num.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle showDamageNum caller、uibattle.c:1746-1810、num/pixel tests | 40ms age、0..10 寿命、y上移、5位 right align/颜色合同逐文件核验；未发现新直接缺陷 |
| `packages/game/src/present/battle/draw-battle-settlement.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle caller、battle.c:991-1373、ui.c:640-732、settlement pixel tests | exp/cash/level/hidden-exp/learn-magic screens 的布局、文字、数字、mask 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-sprites.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle/battle-positions caller、battle/fight/uibattle/palcommon primary、sprite pixel/leaves tests | target highlight、idle/death/fade、color shift、Y-sort/opaque mask/边缘裁剪逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-ui.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle caller、player-poison-state mapper、uibattle/magicmenu/itemmenu primary、UI pixel/leaves tests | dialog/escape/auto early return、menu/target/status layers、party-slot poison color、grid/MP/amount layout 逐文件核验；未发现直接缺陷 |
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
| `packages/game/src/core/battle/formulas.ts` | product | 已验证 | CODE-QUALITY-3m 3m-formulas-magic；fight.c:131-389、battle callers、formula tests | SHORT/WORD、CLASSIC base/physical/magic/dex、resistance/field steps 逐段核对；未发现直接缺陷 |
| `packages/game/src/core/battle/magic-damage.ts` | product | 已验证 | CODE-QUALITY-3m 3m-formulas-magic；fight.c:4270-4318/5300-5400/4673-4853、inline/Simulate/throw/coop callers、magic tests | per-target RNG/minDamage/def/resistance/autoDefend/defeated skip/object magic 合同逐段核对；未发现直接缺陷 |
| `packages/game/src/core/battle/status.ts` | product | 已验证 | CODE-QUALITY-3m 3m-status；fight.c:1632-1661、battle-system turn-end caller、battle-finalization、status/actions/state-machine tests | 全 status counter tick；敌方按 SDLPal 全槽位递减（含死槽）；canAct/canCast 与 <=999 清理边界已核；3m 整卡仍 partial |
| `packages/game/src/core/battle/turn-queue.ts` | product | 已验证 | CODE-QUALITY-3m 当前只读复审；battle-system:680-770 caller、fight.c:1451-1584、battle.h ACTIONQUEUE、queue/state-machine tests | stable dex sort、dualMove dex2/legacy fallback、enemy-first tie 逐文件核验；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-positions.ts` | product | 已验证 | CODE-QUALITY-3m 当前只读复审；battle-state/opcode/present/UI/sprite callers、battle.c:27/903-939、global.h:401-404、position tests | 1/2/3 人 SDL 表、4/5 fallback、EnemyPos fallback/idx bounds 逐文件核验；未发现直接缺陷 |
| `packages/game/src/core/rng.ts` | product | 已验证 | CODE-QUALITY-3m 3m-rng；util.c:169-275、battle/event/progression callers、rng tests | mulberry32 deterministic state/range APIs；`to<=from` 返回起点且不消费状态；SDLPal LCG 差异为已记录设计 |
| `packages/game/src/core/battle/__tests__/formulas.test.ts` | test | 已验证 | CODE-QUALITY-3m；base/physical/magic/dex formula contracts | primary-source numeric oracle |
| `packages/game/src/core/battle/__tests__/magic-damage.test.ts` | test | 已验证 | CODE-QUALITY-3m；inline/Simulate/enemy magic/autoDefend contracts | real BattleState caller oracle |
| `packages/game/src/core/battle/__tests__/status.test.ts` | test | 已验证 | CODE-QUALITY-3m 3m-status；all status tick、死敌槽位反例、canAct/canCast、相邻 battle lifecycle contracts | counter lifecycle oracle；旧“死敌不 tick”弱 oracle 已改为 primary 全槽位语义 |
| `packages/game/src/core/battle/__tests__/turn-queue.test.ts` | test | 已验证 | CODE-QUALITY-3m；sort/tie/dualMove/dex2 contracts | queue identity oracle |
| `packages/game/src/core/rng.test.ts` | test | 已验证 | CODE-QUALITY-3m 3m-rng；same seed/different seed/half-open/inclusive/float/state/invalid-bound contracts | deterministic RNG oracle；边界反例验证无额外抽样 |
| `packages/game/src/core/palette-fade.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；palette.c:123-666、event-system/present callers、palette/direct boundary tests | fade60/fade63/PaletteFade `/31` integer truncation/approach/freeze/nightColors contracts；已修复 Math.round 差异 |
| `packages/game/src/core/scene-identity.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap/scene-system load/restore callers、history/map-name readers | single current map identity setter/getter；caller ownership explicit |
| `packages/game/src/core/word-lookup.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap setWordTable、menu/settlement/event callers、word tests | table-first/fallback/empty/out-of-range contract；未改 WORD schema |
| `packages/game/src/core/script-catalog.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap setGlobalEvents、event-system resolveLabel/getCmds callers、dependency ownership tests；prototype label negative controls | inherited label 防护与 own-property/null-prototype、zero-item fixup 边界逐文件核对；未发现新缺陷 |
| `packages/game/src/core/palette-fade.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；fade60/fade63/PaletteFade `/31`/approach/finalize/bounds contracts | primary palette oracle；0→1 截断反例 |
| `packages/game/src/core/word-lookup.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；unloaded/fallback/table priority/out-of-range contracts | direct WORD caller oracle |
| `packages/game/src/core/dependency-ownership.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；catalog/scene identity ownership、prototype label negative controls、cross-entrypoint identity | 真实公开 entrypoint oracle |
| `packages/game/src/core/cross-module-boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；scene/event/equipment/battle cross-module caller contracts | 相邻模块回归证据 |
| `packages/game/src/core/dialog-history.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；event-system history writer/bootstrap restore/menu caller、dialog-history tests | trim/连续去重/map 维度/CAP/restore 老档归一合同逐文件核对；未发现新缺陷 |
| `packages/game/src/core/mode.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；main-loop caller、event/scene/battle/menu mode tests | frameNum、autoScript gate、mode dispatch、同步 event 再驱动合同逐文件核对；未发现新缺陷 |
| `packages/game/src/core/player-poison-state.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；event-opcode/equipment/battle callers、ownership/poison tests | poison definition ownership/level99/party-slot dedup/cure/runner 合同逐文件核对；未发现新缺陷 |
| `packages/game/src/core/scene-system-search.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；scene-system Confirm caller、play.c:362-510、search tests | 13-cell range、trigger mode 阈值、grid/h/sState/first-hit 合同逐文件核对；反直觉阈值保留 |
| `packages/game/src/core/scene-system.ts` | product | 已验证 | CODE-QUALITY-3q 3q-scene-system；play.c:25-238,362-591、scene.c:512-847、map.c:277-299、res.c:229-301、global.h:75-121,512-531；mode/event/bootstrap callers | 662行逐段重读；移动/碰撞/触发/scene load合同与467定向相邻回归核对；未发现新缺陷，统一门仍待 |
| `packages/game/src/core/event-system.ts` | product | 已验证 | CODE-QUALITY-3r 当前复审；3r-event-system；script.c:30-307,608-750,1140-1410,1600-1815,1850-1990,2050-2145,2290-2385,2385-2555,2570-2775,2970-3070；play.c:56-238；scene.c:779-930；mode/bootstrap/scene/menu callers | 5,117 行完整读取；global ip、auto/event/runScript、waiting/fade/modal、scene/battle/menu resume、raw opcode、对象解析与移动逐段核验；game package 321 files/3,619 tests、typecheck通过，未发现新 direct defect；coverage/ratchet/protected/full check 未在本小批运行 |
| `packages/game/src/core/battle/battle-opcodes.ts` | product | 已验证 | CODE-QUALITY-3t；script.c:867-950,1026-1102,1175-1425,1437-1449,1573-1640,1848-2054,2547-2668,2776-2995,3267-3297；fight.c:602-716,2387-2390,4214-4323,5193-5400；battle.c:1397-1434；event-system/actions/battle-system callers | 1528 行逐段核验 dispatch、BattleCtx ownership、目标/状态/伤害/毒、召唤/分裂/变身/逃跑、动画/偷窃/战斗结果与 consumed/newIp；定向/相邻 470 tests、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷；0x2E `>=` 为 game-mechanics 已记录的原版后期产品决策 |
| `packages/game/src/core/battle/__tests__/battle-opcodes.test.ts` | test | 已验证 | CODE-QUALITY-3t；2386 行全文、主 oracle、script.c/fight.c caller/合同、470 定向/相邻 tests | 合法目标、边界、失败分支、目标缺失、动画/资源副作用与 consumed/newIp 反控；无弱化断言 |
| `packages/game/src/core/battle/battle-opcodes.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3t；1189 行全文、dispatch family branch contracts、470 定向/相邻 tests | 真实 state/ctx caller 合同、非法/缺资源/满槽/无目标反例；不以 coverage 数量单独验收 |
| `packages/game/src/core/battle/battle-opcodes.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3t；70 行全文、0x05/0x8E dialog clear 与 0x6B signed blow-away primary contract | 清框只影响下一段对白、SHORT 负值边界与 negative control |
| `packages/game/src/battle-summon-slot-reuse.glm-q.test.ts` | test | 已验证 | CODE-QUALITY-3t；203 行全文、0x9E 战中死亡空槽复用/对象身份/阵型重算 oracle | 活槽不复用、毒/身份清理与阵型锚点反例 |
| `packages/game/src/core/battle/battle-state.ts` | product | 已验证 | CODE-QUALITY-3u；battle.h:49-119,158-206；global.h:395-404,441-444；battle.c:900-943,1531-1775；fight.c:117-127,2173-2190,3209-3245；battle-system/finalization/anim callers | 918 行逐段核验 BattleState 字段、phase/UI/queue、玩家/敌人快照、null 空槽、对象身份、脚本/毒/动画/结算 ownership；55 定向/相邻 tests、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-runtime-context.ts` | product | 已验证 | CODE-QUALITY-3u；battle.c:1741-1754,1838-1857；battle-system:324-344；battle-finalization:63；runtime/finalization callers | 98 行逐段核验资源表与 runner stash、live-role identity、override 优先级和 finalize release；未发现跨战斗残留或清理缺口 |
| `packages/game/src/core/battle/__tests__/battle-state.test.ts` | test | 已验证 | CODE-QUALITY-3u；BattleState 工厂/位置/状态 seed oracle，定向/相邻 55 tests | 383 行逐段读取；未知 role、>3 player、状态 seed、快照、EnemyPos/fallback/y offset 和独立坐标对象反例 |
| `packages/game/src/core/battle/battle-state.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3u；null 空槽、maxHealth/object identity、autoBattle/scriptPrevHp oracle，定向/相邻 55 tests | 81 行逐段读取；0 占位槽不压缩、真实槽浅拷贝、开战 seed 反例 |
| `packages/game/src/core/battle/battle-finalization.test.ts` | test | 已验证 | CODE-QUALITY-3u；finalization cleanup/resume caller oracle，定向/相邻 55 tests | 80 行逐段读取；状态/波场/模式/资源释放顺序与 0x07 resume 反例 |
| `packages/game/src/core/battle/actions/attack.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:3618-3754,4910-5148,4591-4654；battle-system action caller；action/anim/formula callers | 614 行实现全文核验玩家/敌方物攻、群攻/DualAttack、auto-defend/cover/protect、equiv poison、混乱友敌与 timeline 委托；定向6 files/154 tests通过，未发现 direct defect；coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/actions/attack-mate.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:3760-3853；battle-system attack-mate dispatch；attack-mate/action tests | 111 行实现全文核验随机活友军、目标防御/protect、HP clamp、武器声、动画与无目标 Pass；定向6 files/154 tests通过，未发现 direct defect；coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/actions/defend.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:4110-4117,4924-4929；battle-system dispatch；actions tests | 20 行实现全文核验；只写 defending，减伤由 enemy attack owner 消费，越界 no-op 合同闭合；定向6 files/154 tests通过 |
| `packages/game/src/core/battle/actions/flee.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:4119-4172；battle.c:1455-1528；battle-system dispatch；actions tests | 81 行实现全文核验 flee rate/装备、已批准敌吉运修复、boss RNG、空槽/SHORT 溢出、失败动画与 exp；未发现 direct defect；定向6 files/154 tests通过 |
| `packages/game/src/core/battle/__tests__/attack-mate.test.ts` | test | 已验证 | CODE-QUALITY-3v；111 行实现对应的 7 个 AttackMate oracle，154 定向/相邻 tests | 148 行全文读取；随机 self/dead 跳过、protect/defend/clamp/无活友军/武器声与 HP ownership 反例 |
| `packages/game/src/core/battle/actions/attack.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；64 行命中特效帧基号/缺表反例，定向6 files/154 tests | 全文读取；flat index `sprite*2+1`、×3、undefined fallback 与真实 timeline oracle；未发现重复或弱断言 |
| `packages/game/src/core/battle/battle-finalization.ts` | product | 已验证 | CODE-QUALITY-3w；battle.c:1822-1857；battle-system:415,530；finalization/settlement callers | 67 行全文核验 outcome、状态/毒/装备/波场/mode/runtime/postBattle cleanup 顺序；196 定向/相邻 tests、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-settlement.ts` | product | 已验证 | CODE-QUALITY-3w；battle.c:991-1373；battle-system:390-530；progression/settlement callers | 246 行全文核验 exp/cash/HP-MP 回写、屏序/timeout、Phase E once、对话 hold、半血与 finalize；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-settlement.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3w；settlement screen/timeout/Phase E/half-heal oracle，196 定向/相邻 tests | 259 行全文读取；首帧残键、74+1 timeout、屏序、Phase E once/dialog hold/半血恢复反例 |
| `packages/game/src/core/dialog-history.test.ts` | test | 已验证 | CODE-QUALITY-3o；trim/dedup/map/CAP/restore contracts | direct history oracle |
| `packages/game/src/core/mode.test.ts` | test | 已验证 | CODE-QUALITY-3o；mode/frame/autoScript/event dispatch contracts | main loop dispatch oracle |
| `packages/game/src/core/scene-system-search.test.ts` | test | 已验证 | CODE-QUALITY-3q 3q-scene-system；13-cell/facing/trigger threshold/first hit contracts | primary search oracle |
| `packages/game/src/core/scene-system.test.ts` | test | 已验证 | CODE-QUALITY-3q 3q-scene-system；真实 tickSceneSystem/tickEventSystem/SceneAssetsCache/setGlobalEvents caller，play.c/scene.c/map.c oracle | 2064行全文重读；方向/顺序、4..8 trigger、vanish/revive、blocker push、tile h/bit13、trail/步态、loadScene/cache/onEnter、TouchFar 死锁和 invalid-label 反例均有高判别力合同；相邻warning仍待统一清零 |
| `packages/game/src/core/event-system.test.ts` | test | 已验证 | CODE-QUALITY-3r 当前复审；3r-event-system；真实 tickEventSystem/tickAutoScripts/runScript/runEnterScript callers，script.c/play.c/scene.c/text.c oracle | 5,974 行主测试全文核验；dialog/wait/confirm/end、battle fallback、global ip/call、移动/镜头/fade、scene/item/poison/object 条件与特效生命周期合同完整；当前 package test 321 files/3,619 tests通过，未以覆盖率或旧全仓回执替代本轮证据 |
| `packages/game/src/core/battle/battle-system.ts` | product | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；`mode.ts`、`bootstrap.ts`、battle-finalization/settlement/actions callers；`battle.c`/`fight.c`/`script.c`/`global.h` primary | 3,141 行实现全文核验；startBattle 资源/敌槽/对象脚本/复活与装备播种、tickBattle phase/hold/stall、行动队列/RNG、dialog/animation/flee/escape、毒/status、结算/cleanup/resume owner 与真实 caller 对齐；未发现 direct defect；本片仅修测试隔离 |
| `packages/game/src/core/battle/__tests__/battle-system.test.ts` | test | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；公开 startBattle/tickBattle/mode/menu/actions callers，battle.c/fight.c/uibattle.c/script.c oracle | 4,248 行主生命周期/UI测试全文核验；start/phase/queue/cleanup、菜单/target、动画/dialog、毒/状态/逃跑、敌槽/dualMove、Repeat、投掷/道具/召唤和波场 contracts；测试隔离 spy 已恢复；定向9 files/242 tests通过，coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/battle-system.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；公开 startBattle/tickBattle/tickEnemyIdleGestures callers，battle.c/fight.c oracle | 330 行 branch guard/phase/idle/资源缺失/settlement contracts；两个 console.error spy 已用 try/finally 恢复；定向9 files/242 tests通过，coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/battle-system.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；公开 startBattle/tickBattle + event-system battle script caller，battle.c turn-start oracle | 122 行 turn-start dialog-clear 与终态 break contracts；定向9 files/242 tests通过，coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/battle-runtime-context.test.ts` | test | 已验证 | CODE-QUALITY-3s；startBattle 安装/cleanup 与 runScript fallback caller | resource/live-role identity、runner override/clear ownership contracts，3 tests 通过 |
| `packages/game/src/core/event-opcode-player.ts` | product | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；script.c/global.c opcode 0x17-0x2F/0x41/0x55/0x56/0x8D、event-system/equip/inventory/poison callers、四 direct tests | role/slot/SHORT/WORD/fScriptSuccess/owner contracts逐段核对；未发现新缺陷 |
| `packages/game/src/core/event-opcode-player.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；player/equipment/HP-MP/revive/poison/status/magic opcode contracts | direct opcode oracle |
| `packages/game/src/core/event-opcode-player.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；opcode family branch contracts | branch boundary oracle |
| `packages/game/src/core/event-opcode-player.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；role context/slot/poison runner/invalid input contracts | independent caller/negative oracle |

| `packages/editor/src/ui/command-form-control.residual.glm.test.tsx` | test | 待核 | TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1；Codex 接收 1 合同与 2 针反控；语义治理待后续专专项读取 | 测试合同已独立验收，未计入逐文件代码治理闭合 |
| `packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx` | test | 待核 | TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1；Codex 接收 3 合同与 3 针反控；语义治理待后续专项读取 | P1 puppet product-counter 保留，未固化产品行为 |
| `packages/reforge/src/menu/menu-box.residual.glm.test.ts` | test | review | CODE-QUALITY-105；Codex 当前逐文件复核 MenuBox.render 公开 caller、R1/R2/S1/S2/S3 合同与 K1–K5 反控 | 25/25 定向通过；menu 相邻 118/118 但 reward-gain 未 await 诊断；coverage/unified 门仍阻塞，保持 review |

后续每个 Q3b/Q3c/Q4/Q5/Q6 子批都必须先把文件加入这里并写直接证据；只跑 `pnpm check`、只看 lint、只看覆盖率或只看静态计数，都不能把 `待核` 变成已审。全量账本未清零前，专项不得宣布“所有代码治理完成”。
~~~~
<!-- original-source-fenced:end -->
