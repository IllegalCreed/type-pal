# Wave J 回执 — TEST-GLM-NEW-J-1 迁移编排与发布前校验

分支 `codex/glm-new-j-r1`（worktree `/Users/zhangxu/.codex/worktrees/glm-new-j/type-pal`）。
基线 `2948810f`（生产冻结 `ced193f4` 检查通过：`node docs/testing/glm-new-waves/verify-targets.mjs`
输出 Wave J digest `5d835075e94d8fe2c7b934d101e05e758c4158f7fadbc3c10999d4c462e58a1b` 与卡面一致）。
候选 SHA 见交接回执（分支推送 head）；本 wave 只新增 12 个同目录测试文件与本证据目录，零产品/旧测/共享配置改动。

## 运行门禁

| 门 | 结果 |
|---|---|
| `pnpm --filter @type-pal/migrate run typecheck`（tsc --noEmit） | PASS |
| Biome check（精确 12 个新增文件） | error 0 / warning 0 / info 0（"No fixes applied"，无 ignore/降级） |
| 定向新测（12 文件，maxWorkers 1，unit project） | 55/55 passed，exit 0 |
| 相邻定向（17 个既有套件：12 源旧测 + conversion-isolation + scenes.defaults + pal-assets paths/retirements/ownership） | 177/177 passed（110+67），exit 0 |
| `pnpm check:docs` | 37/37 子测试 PASS；唯一 issue「子目录未进入导航：docs/testing/glm-new-waves/wave-J」——共享 README/targets 对本 wave 只读（卡面白名单），导航注册留给 Codex 集成时统一添加（A–E 证据目录落地时同理），非本 wave 可修项 |
| diff 白名单 | 仅 `packages/migrate/src/*.glm-next-wave.test.ts` ×12 + 本目录；未碰 A–E/产品/旧测/共享配置 |

环境注记：本 worktree 缺 gitignored `data/extracted/`，以符号链接指向主仓同名只读目录后，
两个消费真实提取数据的旧套件（`migrate-content.test.ts`、`migrate-enemies.test.ts`）方可加载；
本 wave 新测全部为合成输入/纯函数/自有 mkdtemp，不消费该目录，未运行任何真实 migrate/extract/bake/publish，
未写 `data/`、`projects/`、baseline（migration-baseline/project-io/write-plan 测试的 IO 全在 `mkdtempSync` 临时根）。

## 逐组旧证 → 新差异

| 组 | 源 | 旧证（不重复） | 新增直接断言 |
|---|---|---|---|
| J01 | `pal-migration.ts` | pal-assets 系列（物化/退役/真源加载）；`palSoundAssetForSources`、`migrationScenes` 全仓零直接断言 | 5 tests：catalog 内 kind=sound 才映射、缺失/非 sound/非整数/≤0 一律 undefined、幂等；migrationScenes 按 index 序抽取、输入深保真、正文缺失暴露 undefined、非法 index fail-loud |
| J01 | `pal-assets.ts` | pal-assets.test.ts 盖 format/load/materialize；pal-manifest.test.ts 只透传 roles | 4 tests：PAL_AUDIO_ROLES/PAL_SOUND_ROLES 精确 AssetId 绑定（002/003/004/037/028/029/045/047）、键不相交、PAL_ASSET_ROLES 并集+三非音频角色、PAL_RNG_LEGACY_PALETTE 冻结 {3:2,6:3,7:6} |
| J02 | `migrate-content.ts` | migrate-content.test.ts + migrate-scenes.*（deepStrip/finalize/propagate/bindings 均有旧证） | 5 tests：`resolveSceneScriptPatches` 首次直接断言——_addr→callScript 根（绝对 ref id/chunk）、私有键全拆、同 key 复用不重复注册、目标场景缺失/目标脚本不可译两类 0x6D gap、源链深保真；`migratedSpriteId` 稳定 id 形状 |
| J02 | `pal-current-publication.ts` | pal-current-publication.pal.test.ts 走真实全量 baseline | 4 tests：`palAssetPreconditions` 首次直接断言——按 target 排序 projects/pal 前置、hash 取 catalog、空 catalog→[]、缺 assets/index.json 与非法 sha256 两条 fail-loud、输入深保真 |
| J03 | `translate-event-motion.ts` | translate-event-motion.test.ts 8 臂 | 9 tests：0x0c/0x0d 方向、0x70/0x7a slow/fast、0x3f/0x97 骑乘 slow/run、walkTo/骑乘/animate/moveObject/walkOneStep 五类无属主具名 gap、0x87 有属主、0x6e 无 layer 键、0x4c 无 floating 键、空操作数原点投影 |
| J03 | `migration-baseline.ts` | migration-baseline.test.ts + pure.boundaries（state v1/序列化/D5 null/缺席） | 6 tests：`loadPalBaseline` 原子地图 hash-only 加载（正文缺席仍可加载）、哈希不符/缺文件/缺 hash 三类 fail-loud、无 state→undefined、`assertPalBaselineSnapshotCurrent` _state.json 漂移臂、`baselineWrites` 不落原子图正文且 state 含其 hash |
| J04 | `migration-project-io.ts` | migration-project-io(.boundaries).test.ts（discover/load 正控、TOCTOU、越界） | 3 tests：托管正文坏 JSON fail-loud 含 cause（旧证只有 discover 索引臂）、hashes=原始字节 sha256、托管缺失跳过、PAL_PROJECT_REL 冻结 |
| J04 | `legacy-dialog.ts` | legacy-dialog.test.ts（解码颜色/速度/终止/变速） | 5 tests：`legacyDialogueTextId` 基准 key vs `v-<8hex>` 变体且确定；`putLegacyDialogueText` 同 messageIndex 异原文落同 key 冲突 fail-loud（双方 JSON）、同值幂等；`(` 光标帧 2、行尾孤立反斜杠、空行默认态 |
| J05 | `migrate-enemies.ts` | migrate-enemies.test.ts（真实 census）+ wave2（合成 stats/fallback/dangling/队槽） | 4 tests：`withScript` 脚本指针计数、`reportHookSources=false` v9 报告形状（无 hookSources 键，toEqual 精确）、无 tctx 缺省音效五路 + 负 magicSound 拆分、enemySlug/teamSlug join 键 |
| J05 | `sound-migration.ts` | resolveSoundAsset 仅经 mapScenesStatic 0x47 间接消费；`palOptionalSoundAssetId` 全仓零测试 | 3 tests：0/空/负/非整数/undefined 全 undefined 臂、缺省 palSoundAssetId、注入 resolver 以原始号真实调用且其结果（含 undefined）胜出、非法号不调用注入 resolver |
| J06 | `migration-write-plan.ts` | migration-write-plan(.boundaries).test.ts（排序/去重/manifest-last/退役/baseline 跳写） | 4 tests：工程 write 的 `expectedPreviousHash` TOCTOU 锚首次断言（已有正文=字节 hash、新文件=null）、「未纳入规划快照」「缺原始字节 hash」两条 fail-loud、plan/snapshot 深保真 |
| J06 | `pal-derived-content.ts` | pal-derived-content.test.ts 只盖 migratePalShops | 3 tests：`migratePalPoisons` 13 毒全表冻结（id 序/names/curability/ticks/lethal 互指/counters 环/grantItem/halveHp）、颜色透传提取表、缺 id fail-loud、输入深保真。注释声明字段为一阶段实测/反汇编数据化 overlay；颜色为合成值透传，不冒称原版实测 |

## 反控（判据隔离，仅本目录）

对照与注入全部用 `--reporter=json --outputFile` 采集（`/tmp/type-pal-glm-new-wave/J/`，SHA256 见下）。
三枚注入均为**单点变异、跑完即还原**，还原后三文件重跑 11/11 绿。

| # | 类型 | 注入点（唯一） | exit | 实际执行 | 恰红 fullName（绝对 file + test） | 证据 JSON SHA256 |
|---|---|---|---|---|---|---|
| 0 | 对照 exit0 | 无 | 0 | 12 文件 55/55 passed | —（全绿） | `713956321a9bba232bc95ff1ae90c3ae649afa4339db182761c22816ee556fd4`（j-wave-control-exit0.json） |
| A | 恰 exit1 业务红 | sound-migration 测试内 `palOptionalSoundAssetId(1)` 期望 `sound.pal.001`→`002` | 1 | 该文件 3 tests：2 passed 1 failed | `.../packages/migrate/src/sound-migration.glm-next-wave.test.ts` ‖ `palOptionalSoundAssetId：0 或空 chunk 的显式 undefined 边界 正整数映射 palSoundAssetId；undefined/非整数/≤0 一律 undefined` | `514b61bd1fc6874c1fd3dda45bf6c804e09711a293dc837186924744f28b8ba9` |
| B | 恰 exit1 业务红 | pal-derived-content 赤毒 golden `hpDelta: -7`→`-8` | 1 | 该文件 3 tests：2 passed 1 failed | `.../packages/migrate/src/pal-derived-content.glm-next-wave.test.ts` ‖ `migratePalPoisons：受保护迁移 overlay 的全表冻结 13 条毒：id/名/可解性/每回合数值/相克配对逐条深等，颜色透传提取表` | `5e58815f6456b1682f21079c8d5a6381775e98a5ec4d14704936f42659050893` |
| C | 恰 exit1 业务红 | migrate-content 期望根 id `stage-0`→`stage-1` | 1 | 该文件 5 tests：4 passed 1 failed | `.../packages/migrate/src/migrate-content.glm-next-wave.test.ts` ‖ `resolveSceneScriptPatches：0x6D 覆写占位解析为 registry 分片根 占位 _addr 解析成 callScript 根绑定并删除全部迁移期私有键` | `2a645ff63e9202207937ab3e543f0c2f3f2d7f06b8939cc486fbef97287e3f2d` |

无混错、无 skip、无 timeout、无零执行、无 exit2；三枚红的 failed 计数恰为 1 且失败用例与注入断言一一对应。

## 未证 / 风险登记

- 本 wave 无浏览器视觉要求（纯结果/临时 FS 测试），未做任何视觉取证。
- `migrationScenes` 正文缺失臂现为「暴露 undefined 元素」而非 throw：这是现行实现形状，
  消费方（审计）需自行判空；若 Codex 认为应 fail-loud，属产品行为变更，另卡裁决。
- `migratePalPoisons` 全表深等是 overlay 漂移钉（golden pin）；数值出处为源文件注释声明的一阶段
  实测/反汇编结论，本次未重新核 `data/raw`（本卡红线禁止真实迁移/提取消费，且该表既有 goldens
  已由 pal-current-publication.pal 测试间接消费）。
- `data/extracted` 符号链接是本地环境修复（gitignored，只读），不进提交。

## 候选

单提交推送于 `codex/glm-new-j-r1`；完整候选 SHA 以交接回执为准。不合 main、不标 done，待 Codex 独立验收。
