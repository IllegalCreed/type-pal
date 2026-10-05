# TEST-GLM-MIGRATE-ASSET-SUPPLY-1 排重账

口径：source:line × 公开 caller × 合成合法输入 × business oracle × 既有 fullName。覆盖证据 =
fast（unit 工程剔除 `.pal.test.ts`）v8 lcov 一手测量 + `.pal`（真实语料，经
`loadPalContentSupplySources → loadPalSourcePartitions → loadPalAssets` 全链）+ 既有套件
源码核对。判定分类：existing-proof（旧测已闭合）/ **净新合同**（本卡 15 测试）/ unreachable
（结构不可达，附一手理由）/ product-counter（产品防御重复，不设针）。

基线：`origin/main` `f4dbd0e3d`；唯一新增测试文件
`packages/migrate/src/pal-migrate-asset-supply.glm-r1.test.ts`（15 tests）。

## 1. pal-assets.ts（1318 行）

| source:line | 公开 caller | 判定 | 依据 |
|---|---|---|---|
| :60-72 PalBinaryAssetSource | 类型 | existing-proof | 全套件广泛使用 |
| :136-228 冻结坏尾/digest 常量 | loadPalWorldSprites/loadPalBattleSprites | existing-proof | pal-assets.test:451/548（真实语料精确冻结） |
| :230-264 format 报告 | pal-sprite-report.fast.test | existing-proof | 2 tests |
| :266-291 PAL_*_ROLES | glm-next-wave 4 tests | existing-proof | 角色表全键冻结 |
| :293-316 fileSource/generatedSource/sourceBytes | 内部 | existing-proof | 全 loader 测试间接闭合 |
| :322-344 readPalette/bakeIndexedPng | loadPalStaticImages | existing-proof | palette.test（主面）；**:340 PNG 像素长度 guard unreachable**：PNG.sync.read 恒产出 w*h*4（kimi-r1 ledger 同判） |
| :346-359 assertIndexedBattleBackground | 同上 | existing-proof | backgrounds.test + kimi-r1 :348/:353 双轴 |
| :361-497 loadPalStaticImages | 公开导出 | existing-proof | kimi-r1 合法全量 378 记录 + 7 拒收轴；portraits/items/palette 边界；**:412 unreachable**（PAL_PLAYER_FACE_FRAME_BY_ROLE_ID/ROLE_SLUGS 冻结常量闭包） |
| :499-554 loadPalEffectSprites | **仅 loadPalAssets（模块私有）** | **净新 ×2**（EFFECT-CENSUS / EFFECT-GZIP-MAGIC 针） | fast 0%；kimi-r1 ledger 判合成不可达（「合法 YJ2 只能由 pal-extract fixture 产生」）——本卡一手修正：YJ2 无 magic、初始树为 yj2.ts:74-81 文档化平衡树，单字面量位流可由 parent(n)=0x141+(n>>1) 确定构造（decompressYj2 实解码验证）；真实语料 happy path 属 .pal/full profile。**:533 unreachable**：parseSpriteChunkStrict 对 sentinel-only 块先抛「offset 越界」（本卡一手实探：gzip([01 00 00 00])） |
| :556-573 bakeRgbaFrames | loadPalFrameAnimations | existing-proof（执行） | 本卡合成链 + .pal 全链执行；**:559/:564 拒收臂 unreachable**：decodeRngFrames 帧索引恒连续（rng.ts:218 push 顺序）+ readPalette 256 色校验后 colors[i] 恒存在 |
| :575-681 loadPalSoundAssets | 公开导出 | existing-proof | kimi-r1 363/142 全绿 + 段号轴；glm-o 形状边界 8 tests；sound-closure/sound-metadata |
| :683-753 loadPalFrameAnimations | 仅 loadPalAssets | existing-proof（守卫） | kimi-r1 5 manifest 守卫（经 loadPalAssets）；happy path 由本卡合成链 + .pal 执行（产出经 :1040 推进性间接观测） |
| :755-847 loadPalWorldSprites | 公开导出 | existing-proof | kimi-r1 + pal-assets.test:409-511；**:793 unreachable**（parseWorldSpriteChunk 对全 sentinel 先抛，kimi 实探）；**:821-833 真实数据冻结哨兵**（.pal/full） |
| :849-976 loadPalBattleSprites | 公开导出 | existing-proof | kimi-r1 + pal-assets.test:513-619；**:949-959 同上** |
| :979-1120 loadPalAssets | 公开（pal-source-io:63） | mixed | midi/tileset/catalog 段：.pal 真实全链 existing-proof；**:1050-1103 冻结哨兵合成不可构造**（kimi ledger 确认）；effect 段 = 本卡净新入口观测 |
| :1122-1139/1181-1195 assertBytes/assertSourceBytes/syncPath | materialize 内部 | existing-proof | glm-o/ownership/paths 全套 |
| :1141-1179 planPalAssetRetirements + assertRetirableMigratedPath | 公开导出 | existing-proof | glm-o 248-318 + retirements 4 + pal-assets.test:50-121；**:1154 unreachable/product-counter**：validateAssetCatalog 强制 legacy-migrated 前缀 `assets/migrated/`（asset.ts:152-162）且 validateProjectRelativePath（asset.ts:111-123）已拒绝对绝对路径/反斜杠/空段/./..——公开入口先 validate 两 catalog，守卫臂不可注入 |
| :1201-1318 materializePalAssets | 公开导出 | existing-proof | glm-o O04 18 tests + ownership 10 + paths 10 + kimi-r1 2 + pal-assets.test:150-384；**:1253 unreachable/product-counter**：:1225-1230 预检循环先以同条件 fail-loud |

## 2. pal-authored-overlays.ts（155 行）

| source:line | 判定 | 依据 |
|---|---|---|
| :4-26 applyPalItemOverlays | existing-proof | pal-authored-overlays.test:10/23 + glm-o publication:141 隐蛊 |
| :28-110 applyPalGeneratedCraftMessages | existing-proof | test:41/100/134 + boundaries T07 双 effect |
| :112-155 applyPalGeneratedResourcePoolMessages | mixed | test:174/227 覆盖 message 非法/结构漂移；boundaries T07 覆盖跨 kind；**净新 ×2**：:135 缺 current（POOL-MESSAGE-MISSING-CURRENT 针）+ :148 姐妹池对位不同步/输入不可变（POOL-MESSAGE-SYNC 针） |

## 3. project-map-converter.ts（165 行）

| source:line | 判定 | 依据 |
|---|---|---|
| :9-48 masks/decodeSourceMapWord | existing-proof | converter.test:24/96 + boundaries:144 |
| :12-22 mapId/tilesetId guards | mixed | mapId(0) 已测（converter.test:60）；**净新 ×1**：tilesetIdFromSourceNumber(0)（ENCODE 家族伴随，未单设针） |
| :50-72 encodeProjectMapWord | mixed | 0/15 边界与往返已测；**净新 ×1**：三域越界守卫（ENCODE-LAYER0-RANGE 针） |
| :74-148 convertSourceTilemap/assertSourceShape | mixed | 行/列缺口 boundaries:74；**净新 ×1**：宽/高非正整数（未单设针，同函数族） |
| :150-161 sourceWordFromProjectMap | mixed | 往返已测；**净新 ×1**：缺 layer-1（SOURCE-WORD-LAYERS 针） |
| :163-165 formattedProjectMapBytes | existing-proof | R27 glm-runtime-resource |

## 4. pal-store-boundary.ts（201 行）

| source:line | 判定 | 依据 |
|---|---|---|
| :4-14 PAL_STORE0_REWARD_ITEM_IDS | existing-proof | 全套件 |
| :44-72 assertVesselRecipes | mixed | 消息漂移/配方序/buffer+pool 已测（test:160-181+）；**净新 ×1**：craft 数量(2)/配方数(3) 两未走方向（VESSEL-CRAFT-COUNT 针） |
| :74-102 assertSpiritGourd | mixed | 奖励档位漂移已测（test:126）；**净新 ×2**：:78-79 源九档换序（STORE0-SOURCE-TIERS 针）+ :84 双资源池（GOURD-POOL-COUNT 针） |
| :104-128 collectOpenShops | existing-proof | boundaries T09 嵌套计数/计数独立 |
| :131-142 assertPalAlchemyBoundaryInvariant | 经本卡三针直接驱动 | 拒收臂见上两行；.pal 真实全绿 |
| :145-201 assertPalStoreBoundaryInvariant | existing-proof | test 5 it + boundaries 3 it + pal.pal.test |

## 5. pal-current-publication.ts（409 行）

| source:line | 判定 | 依据 |
|---|---|---|
| :97-200 buildPalCurrentPublication | existing-proof | glm-o O01 22 tests + pal.pal.test 4 it |
| :175 SceneIndex 缺更新目标 | unreachable | applyPalWorldSpriteSemanticAliases 的 updatedScenes ⊆ 输入 currentScenes（同 index 派生），公开输入不可构造缺登记目标 |
| :184-186 地图分区数量漂移 | unreachable | buildPalContentSupply 由 sources.tilemaps 1:1 产图；重复 mapNum 在地图审计先拒（glm-o:210 证）；供应核内部不变量 |
| :203-399 validatePalCurrentPublication | existing-proof + **净新 ×1** | glm-o O01:272-522 16 拒收/放行合同；**:358-365 referenceErrors 汇总门净新**（PUBLICATION-REFERENCE-GATE 针，glm-o 只证 assetErrors :383-390） |
| :402-409 palAssetPreconditions | existing-proof | glm-next-wave 4 tests |

## 6. pal-casualty-scripts.ts（189 行）

| source:line | 判定 | 依据 |
|---|---|---|
| :38-42 PAL_CASUALTY_LOCALE_KEYS | existing-proof | wave2:15 冻结 36 键 |
| :44-119 parseBranch | mixed | 未知 opcode/入口缺失/门序/style/回满/stat 已测（test:40-128 + wave2）；**净新 ×1**：:102 0x05 参数非空（CASUALTY-0x05-OPERANDS 针，含 :131 两元 operands nil 方向）；**:54 unreachable**：JSON 无洞数组，commands[ip]（ip<length）恒非空；**:109 `opcode ?? 0`**：raw 变体类型闭包含 opcode，nil 方向不可注入 |
| :121-147 translateCasualtyScript | existing-proof | test:40 + wave2:64（0x06 参数无效臂经 fixtures 覆盖） |
| :149-189 applyPalCasualtyOverlays | mixed | 四入口/36 键/输入保真已测；**净新 ×1**：:175 角色 2 缺 battler（CASUALTY-BATTLER-GUARD 针） |

## 7. pal-world-sprite-registry.ts（194 行）

| source:line | 判定 | 依据 |
|---|---|---|
| :12-14 migratedSpriteId | existing-proof | registry.test:50 |
| :17-194 createPalWorldSpriteRegistry | mixed | test 3 it（场景证据/未声明拒绝/语义别名）+ kimi-r1 5 tests（loop 键/缺帧/tie-break/overlay×语义/幂等）；**净新 ×1**：overlay 为 primary 且被场景物化——pal-overlay 证据胜出 + 异布局 -f 变体冲突（OVERLAY-EVIDENCE-SOURCE 针）；**:93 unreachable**（冻结常量无重复，kimi ledger）；**:109 `?? 0` nil 方向 unreachable**（无 overlay 且无语义时 spriteNum 必来自场景证据，kimi ledger 同判） |

## 针账（13 针，全部定向执行集内唯一红）

| 针 | 合同 | 变异定义点 | 三态 |
|---|---|---|---|
| EFFECT-CENSUS | :546-549 census 计数闭包 | 诊断消息定义点 | 绿→红→绿 |
| EFFECT-GZIP-MAGIC | :530-531 magic 门 | throw 定义点 | 绿→红→绿 |
| STORE0-SOURCE-TIERS | :78-79 源九档 | 守卫条件短路 | 绿→红→绿 |
| GOURD-POOL-COUNT | :84 池数量 | 数量哨兵 | 绿→红→绿 |
| VESSEL-CRAFT-COUNT | :46-49 craft/配方数量 | 数量哨兵 | 绿→红→绿 |
| ENCODE-LAYER0-RANGE | :58-59 回编码域 | 域上界 | 绿→红→绿 |
| SOURCE-WORD-LAYERS | :153 双层要求 | 守卫条件弱化 | 绿→红→绿 |
| POOL-MESSAGE-MISSING-CURRENT | :135 缺 current | 诊断消息定义点 | 绿→红→绿 |
| POOL-MESSAGE-SYNC | :151 对位同步 | 同步赋值 | 绿→红→绿 |
| CASUALTY-0x05-OPERANDS | :102 0x05 参数 | 操作数哨兵 | 绿→红→绿 |
| CASUALTY-BATTLER-GUARD | :175 battler 守卫 | 守卫条件短路 | 绿→红→绿 |
| OVERLAY-EVIDENCE-SOURCE | :131 overlay 证据 | 证据来源字段 | 绿→红→绿 |
| PUBLICATION-REFERENCE-GATE | :359 汇总门 | 守卫条件短路 | 绿→红→绿 |

未设针净新合同（同函数族判别力已由邻针证明）：tilesetIdFromSourceNumber(0)、
encodeProjectMapWord 另两域、convertSourceTilemap 宽/高轴。
