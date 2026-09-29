# Wave J 回执（r2）— TEST-GLM-NEW-J-1 迁移编排与发布前校验

分支 `codex/glm-new-j-r1`（worktree `/Users/zhangxu/.codex/worktrees/glm-new-j/type-pal`）。
**r1 候选完整 SHA：`009c557851e43759b20e10d4d1284bdf1aa21247`**；本 r2 按
`docs/testing/glm-new-waves/codex-review-J-009c5578.md` 两项必须返工收窄，
**r2 候选完整 SHA 见本文件底部与交接回执**。基点仍为派发 `2948810f`
（verify-targets Wave J digest `5d835075…a58a1b` 与卡面一致）。
本 wave 只改 12 个同目录测试文件与本证据目录，零产品/旧测/共享配置改动。

## r1 → r2 返工对照

1. **migrationScenes 三例删除**（Codex 审核项 1）：`migrationScenes`
   （pal-migration.ts:703-707）自述仅供审计/测试，仓内除 r1 新测外无调用者；
   正文缺失臂只是源码 `as unknown as SceneDef` 的现状而非有效 `SceneDef[]` 合同。
   按卡面「现行 caller」停止线删除三个测试并登记 **`unreachable/未证`**；
   同文件保留有生产调用者（`buildPalMigration` pal-migration.ts:392 唯一解析口径）的
   `palSoundAssetForSources` 两例。未把 `[undefined]` 现状钉为正确行为。
2. **J06 毒断言收窄为一手核实范围**（Codex 审核项 2）：oracle 全部换锚
   `docs/phase1/game-mechanics.md`——:1187-1201 等级/每回合表（551 −7/−7、552 −12、
   553 −20、554 −32、556-560 −50/−100）、:1210-1216 三尸蛊逐回合（0→−1→−2→−3→−200 后
   0x2B 自解；−111→−222→−333 后 0x2A 自解）、:1219 无影毒 `0x5B` 半血上限 1000
   （script.c:1895-1905）且 level 173 谁都解不了、:1227-1232 相克单向 6 元环逐边与
   三对致死双向组合、:1246-1253 解毒 `0x2C` 等级上限（灵血咒/九节菖蒲 ≤2 → 551-554
   common；复活 ≤3 → 555-560 severe；173/4 级 → 137/561/562 incurable）。
   r1 的「13 条全表逐条深等」标题与回执宣称已修正：现在 **11 毒（551-560+137）逐条深等 +
   全表 id 序/颜色透传/结构关系**；**561/562 只断言一手可证身份字段**（名/可解性/颜色/
   无 lethal/counters），其精确 tick 数据化（每回合 −1×7 + 末回合 −8 + grantItem
   '145'/'149' + selfCure）在 doc 中仅有「寄生、每回合 −1、到期掉道具（灵蛊/赤血蚕）」
   形状描述、无数值锚，已移出深等并登记**未证**。137 的 `selfCure:true` 为
   「一次性结算」（:1219）加脚本指针推进机制（:1206-1209）的必然蕴含，随深等保留并在此注明。

## 运行门禁（r2 全量复跑）

| 门 | 结果 |
|---|---|
| `pnpm --filter @type-pal/migrate run typecheck`（tsc --noEmit） | PASS |
| **完整 `pnpm lint`**（全仓零诊断硬门） | **PASS — 2639 files; 0 errors / 0 warnings / 0 infos** |
| 定向新测（12 文件，maxWorkers 1，unit project） | 58/58 passed，exit 0 |
| 相邻定向（17 个既有套件） | 177/177 passed，exit 0 |
| `pnpm check:docs` | 37/37 子测试 PASS；唯一 issue 仍为共享目录缺 `wave-J` 导航链接（Codex r1 已认领该共享索引写入，非 GLM 返工项） |
| diff 白名单 | 仅 12 个 `packages/migrate/src/*.glm-next-wave.test.ts` + 本目录；r2 相对 r1 只改 `pal-migration.glm-next-wave.test.ts`、`pal-derived-content.glm-next-wave.test.ts` 与本 README |

环境注记：worktree 的 gitignored `data/extracted/` 以只读符号链接指向主仓（不进提交），
仅使两个消费真实提取数据的旧套件可加载；本 wave 新测全部为合成输入/纯函数/自有 mkdtemp，
未运行任何真实 migrate/extract/bake/publish，未写 `data/`、`projects/`、baseline。

## 逐组旧证 → 新差异（r2 口径）

| 组 | 源 | 旧证（不重复） | 新增直接断言（r2） |
|---|---|---|---|
| J01 | `pal-migration.ts` | pal-assets 系列；`palSoundAssetForSources` 零直接断言 | 2 tests：catalog 内 kind=sound 才映射、缺失/非 sound/非整数/≤0 → undefined、幂等。~~migrationScenes 三例~~ 删除，登记 unreachable/未证 |
| J01 | `pal-assets.ts` | pal-assets.test.ts；pal-manifest.test.ts 只透传 roles | 4 tests：PAL_AUDIO_ROLES/PAL_SOUND_ROLES 精确 AssetId（002/003/004/037/028/029/045/047）、键不相交、PAL_ASSET_ROLES 并集+三非音频角色、PAL_RNG_LEGACY_PALETTE {3:2,6:3,7:6} |
| J02 | `migrate-content.ts` | migrate-content.test.ts + migrate-scenes.* | 5 tests：`resolveSceneScriptPatches` 首次直接断言（_addr→callScript 根、私有键全拆、同 key 复用、两类 0x6D gap、源链深保真）；`migratedSpriteId` |
| J02 | `pal-current-publication.ts` | pal-current-publication.pal.test.ts | 4 tests：`palAssetPreconditions` 首次直接断言（排序 projects/pal 前置、空 catalog→[]、缺 index 与非法 sha256 fail-loud、深保真） |
| J03 | `translate-event-motion.ts` | translate-event-motion.test.ts 8 臂 | 9 tests：0x0c/0x0d、0x70/0x7a、0x3f/0x97、五类无属主 gap、0x87 有属主、0x6e 无 layer、0x4c 无 floating、空操作数原点投影 |
| J03 | `migration-baseline.ts` | migration-baseline(.pure.boundaries).test.ts | 6 tests：原子地图 hash-only 加载、哈希不符/缺文件/缺 hash fail-loud、无 state→undefined、_state.json 漂移臂、baselineWrites 不落原子图正文 |
| J04 | `migration-project-io.ts` | migration-project-io(.boundaries).test.ts | 3 tests：托管坏 JSON fail-loud 含 cause、原始字节 sha256 锚、托管缺失跳过、PAL_PROJECT_REL |
| J04 | `legacy-dialog.ts` | legacy-dialog.test.ts | 5 tests：`legacyDialogueTextId` 基准/变体 key、同 messageIndex 异原文冲突 fail-loud、`(` 光标帧 2、行尾孤立反斜杠、空行默认态 |
| J05 | `migrate-enemies.ts` | migrate-enemies(.wave2).test.ts | 4 tests：withScript 计数、reportHookSources=false v9 形状、缺省音效五路+负号拆分、enemySlug/teamSlug |
| J05 | `sound-migration.ts` | 仅经 0x47 间接消费；`palOptionalSoundAssetId` 零测试 | 3 tests：全 undefined 臂、缺省解析、注入 resolver 真实调用且其结果胜出、非法号不调 resolver |
| J06 | `migration-write-plan.ts` | migration-write-plan(.boundaries).test.ts | 4 tests：write `expectedPreviousHash` 锚（已有正文=字节 hash、新文件=null）+ 两条缺快照 fail-loud + 深保真 |
| J06 | `pal-derived-content.ts` | pal-derived-content.test.ts 只盖 shops | 9 tests：11 毒一手深等（含 555 逐回合、137 半血上限、556-560 fixed −50/−100 + lethal/counters 逐边）、561/562 仅身份字段、全表 id 序/颜色透传/结构关系、缺 id fail-loud、深保真 |

## 反控（r2 全套重采，判据隔离，仅本目录）

对照与注入全部 `--reporter=json --outputFile` 采集（`/tmp/type-pal-glm-new-wave/J/`）。
三枚注入均为单点变异、跑完即还原，还原后三文件 17/17 回绿。

| # | 类型 | 注入点（唯一） | exit | 实际执行 | 恰红 fullName（绝对 file + test） | r2 证据 JSON SHA256 |
|---|---|---|---|---|---|---|
| 0 | 对照 exit0 | 无 | 0 | 12 文件 58/58 passed | —（全绿） | `c74316938e7245bb3080e1ddb4d40ce4a671c82bf4216d4af994b87218d67618`（j-wave-r2-control-exit0.json；另 58/58 明细同内容 `8f504499…` j-wave-r2-green.json） |
| A | 恰 exit1 业务红 | sound 测试 `palOptionalSoundAssetId(1)` 期望 `sound.pal.001`→`002` | 1 | 3 tests：1 failed | `.../packages/migrate/src/sound-migration.glm-next-wave.test.ts` ‖ `palOptionalSoundAssetId：0 或空 chunk 的显式 undefined 边界 正整数映射 palSoundAssetId；undefined/非整数/≤0 一律 undefined` | `063b23bb2e84506288ca6bd71de7113ca7301166b3b5fe77496afbeb8cfce68f` |
| B | 恰 exit1 业务红 | 毒测试三尸蛊 golden `hpDelta: -200`→`-201` | 1 | 9 tests：1 failed | `.../packages/migrate/src/pal-derived-content.glm-next-wave.test.ts` ‖ `migratePalPoisons：一手核实的逐条深等（game-mechanics 锚定） 三尸蛊 555：逐回合推进 + 末回合自解（:1210-1216 逐回合段）` | `152dd5b84539d44bed05bfd05bc3ed4bc41696b3cf15b150e40f3172dce0bf6e` |
| C | 恰 exit1 业务红 | 0x6D 期望根 id `stage-0`→`stage-1` | 1 | 5 tests：1 failed | `.../packages/migrate/src/migrate-content.glm-next-wave.test.ts` ‖ `resolveSceneScriptPatches：0x6D 覆写占位解析为 registry 分片根 占位 _addr 解析成 callScript 根绑定并删除全部迁移期私有键` | `cdbbf65d83c8e40434fcb9caf029b1d1f76abb01f5b3ad0f766111d3216945e9` |

无混错、无 skip、无 timeout、无零执行、无 exit2；r1 反控 JSON（needle-sound/poison/patch 旧版）作废，以本表 r2 采集为准。

## 未证 / 风险登记（r2）

- `migrationScenes`（pal-migration.ts:703-707）：**unreachable/未证**——仓内无本 wave 之外调用者；
  正文缺失行为（`as unknown as SceneDef` 现状）未钉为合同。若未来出现真实消费方，另立证据再测。
- `migratePalPoisons` 561/562 的精确 tick 数据化（−1×7、末 −8、grantItem '145'/'149'、selfCure）：
  **未证**——doc（:1200）只有形状描述且明确「561/562 自身 tick 脚本为空，寄生逻辑在投掷道具脚本」；
  如需钉值须先核 items 144/147 的 wScriptOnThrow 原始脚本（另卡/另行取证）。
- 本 wave 无浏览器视觉要求，未做视觉取证。
- `data/extracted` 只读符号链接是本地环境修复（gitignored），不进提交。

## 候选

- r1：`009c557851e43759b20e10d4d1284bdf1aa21247`（已按审核意见返工，不再是候选）。
- **r2 候选：见下方推送记录与交接回执的完整 SHA**（单提交于 `codex/glm-new-j-r1`）。
不合 main、不标 done，待 Codex 再审。
