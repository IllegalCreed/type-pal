# A7-0 - 工程资源闭包地基与音乐注册表首切片

Status: review
Phase: phase2
Capability: A7 / R3 / R7 / W5 / X2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: current

## 目标

建立全工程唯一的 `AssetId -> AssetRecord -> FileSource` 资源链,并用音乐/MIDI 音色库完成第一个纵向切片:
PAL 和空白工程的音乐引用、编辑、试听、运行、保存与重迁不再依赖数字号拼文件名或应用根 `fetch`；
`content/music.json` 退役,作者替换资源不会被下一次迁移覆盖。该切片只完成 A7 地基与音乐族,不冒充全资源闭包完成。

## 范围

- 范围内:
  - `@type-pal/content` 新增 AssetId、AssetKind、AssetCatalogV1、具名运行角色、严格路径校验和音乐引用 walker。
  - manifest `contentVersion: 3` 迁移期形态:`assets.catalog/roles` 承载新资源族；未迁移资源族集中进
    `assets.legacy` 债务区。提供 v2 -> v3 项目迁移,运行时内部不保留 v2 双轨。
  - `@type-pal/reforge` 新增只经 `FileSource` 读取的 AssetResolver；移除音乐裸 fetch、数字补零路径和 soundfont 应用根读取。
  - 音乐 schema 改为 AssetId/null/显式 `stopMusic`；持久当前曲改到 typed `WorldState.audio`,移除 `sys:music`。
  - PAL 迁移生成音乐与 soundfont 资源记录、物化工程内文件、改写全部音乐引用并删除 `content/music.json`。
  - 编辑器音乐页从 catalog 派生,完成 MIDI 导入、改名、替换、引用保护删除、试听、保存重开闭环。
  - A7 闭包检查地基:引用存在、kind、规范路径、文件存在、bytes、SHA-256、未引用 warning；输出全量剩余缺口。
  - MG2 对 `assets/migrated/**` 与 `assets/authored/**` 分所有权,保护同 AssetId 的作者替换。
- 范围外:
  - SFX、头像、图标、UI、字形、颜色表、瓦片、精灵、战斗/法术资源、RNG、视频的实际迁移；后续 A7-1..A7-3。
  - A7-4 克隆/另存/zip 全量闭包改造、legacy 归零、v3 -> v4 收口与“断开外部目录仍完整运行”最终验收。
  - OGG/流媒体音乐后端；本切片只保证当前 MIDI + soundfont 链。
  - ED-3 全内容引用图；本卡只产出可被 ED-3 复用的资产引用边。
- 明确不做:
  - 不保留同一音乐引用的 number/string、`musicId/music`、AssetId/path 两套长期字段。
  - 不用 `0` 伪装停曲资源,不让 AssetId 推导文件名,不接受绝对路径或 URL 作为工程资源。
  - 不把完整 200MB 二进制塞进 JSON baseline 或本提交；受保护迁移字节保持本地可再生。
  - 不更新 capability-map 为 A7/R7 done；A7-0 完成后全量闭包仍应如实报告其他资源族缺口。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`:资产管线、schema、跨包公共接口必须三签；数据迁移缺陷必须先修上游并重生成。
  - `docs/phase2/READ-FIRST.md:15`:对象、引用、状态键使用稳定 id,不得把数组位置/数字下标当身份。
  - `docs/phase2/READ-FIRST.md:11-14`:新架构只保留一套干净运行模型,不靠兼容层和隐式全局槽。
  - `docs/phase2/editor/project-lifecycle-design.md:18-35`:一个工程文件夹包含整个游戏的全部资源,克隆后零服务器依赖。
  - `docs/phase2/editor/project-lifecycle-design.md:47-69`:内容与素材统一走 FileSource,blob URL 生命周期必须受管理。
  - `docs/phase2/roadmap.md:173,177,224-230`:A7 资源闭包、R7 稳定注册表及其先于大规模 Q1 E2E 的依赖顺序。
- 代码锚点(`file:line`):
  - `packages/content/src/character.ts:59-84`:LoadedManifest.assets 仍是目录约定并允许绝对路径。
  - `packages/content/src/index.ts:18-26,119-133`:MusicDef 是数字壳；场景/战斗音乐仍是 number。
  - `packages/content/src/script.ts:129-156`:playMusic/playSound/startBattle.musicId 的数字 schema。
  - `packages/reforge/src/file-source.ts:4-18`:绝对路径绕过工程根。
  - `packages/reforge/src/assets.ts:12-62,102-144`:AssetBase 可无 source；精灵 number/path 双轨。
  - `packages/reforge/src/audio/bgm.ts:16-32,57-98`:数字 BGM、文件名拼接、MIDI/soundfont 裸 fetch。
  - `packages/reforge/src/main.ts:706-707,1158-1160,1370-1373,1628-1629,1700-1703,2372-2374`:场景/脚本/战斗/存档的数字音乐与 `sys:music`。
  - `packages/editor/src/main.tsx:47-51`:dev 工程音乐表绕开 FileSource。
  - `packages/editor/src/core/clone.ts:37-38`、`packages/editor/src/core/seed.ts:173-223`:按仓库提取清单复制全部资源。
  - `packages/migrate/src/pal-derived-content.ts:170-172`、`packages/migrate/src/pal-migration.ts:149`:music.json 只生成 `{id}`。
- 已知坑 / 审计文档:
  - `docs/phase2/foundation/a7-resource-closure-audit.md`:本卡的完整现状证据、终态契约、旁路清单与分期。
  - `docs/phase2/foundation/am-asset-migrate-audit.md`:既有提取/解码/资产管线审计；A7 不重写 MKF/RLE 真值。
  - 当前克隆 3,232 文件/208,744,309 字节,但运行仍可绕过工程；“复制完成”不能作为闭包证据。
  - PAL 实现前有 86 MIDI、1,227 个旧播放语义站点、36 场景槽、80 个静态战斗槽、31 单场槽；
    build 权威审计已钉死最终形态为 1,174 `playMusic` + 53 `stopMusic`，动态覆盖归位后 81 个战斗槽。
  - `packages/reforge/src/fsa-source.ts:50-51` object URL 每次新建且无统一 revoke。
- 不得重新引入:
  - `manifest.assets.root/music/sounds/...` 继续作为顶层或新资源族真值；未迁移族只能位于显式 `assets.legacy`,
    并由全量闭包报告持续报错。
  - 数字号补零猜文件名、可选 path fallback、应用根 `/extracted`/`/baked`/`/ui` 资源回退。
  - `sys:music` 或其他字符串魔法全局槽。
  - paletteId/多调色板概念；后续旧资源仅允许唯一 `color-table` 角色。
  - runtime 同时理解 contentVersion 2/3；v2 只允许在迁移边界读取并一次性产出 v3。A7-4 同理把 v3
    legacy 工程一次性产出无 legacy 的 v4。
- 相关测试:
  - `packages/reforge/src/fsa-source.test.ts`:现有 FileSource/FSA 基线,需补 URL 缓存与 revoke。
  - `packages/editor/src/core/project-io.test.ts:448-463`:旧 music.json round-trip,本卡应替换成 catalog round-trip/CRUD。
  - `packages/migrate/src/pal-migration-integration.test.ts`:MG2 连跑零计划与作者态保护。
  - `packages/migrate/src/migration-validate.ts:255-301`:迁移结果引用校验入口,应接 asset closure。

## 验收条件

- 功能:
  - manifest v3 的新资源只走 `assets.catalog/roles`;未迁移资源只位于 `assets.legacy`。音乐族不得在 legacy
    留任何目录、number/path 或回退；AssetId 到音乐物理路径只经一个 catalog 和 AssetResolver。
  - PAL 86 个 MIDI 与 soundfont 都登记为工程资源；BGM 运行、编辑器试听和本地 FSA 工程使用同一 resolver。
  - `SceneDef`、`startBattle`、脚本命令和存档当前曲全部使用 AssetId/null/显式 stop,行为保持“缺省延续、指定切曲、显式停曲”。
  - `content/music.json`、MusicDef 与数字 BGM API 退役；旧别名转换为 catalog label。
  - 编辑器音乐页可导入 MIDI、改名、替换、预览；被引用条目不能删除,未引用条目可删除；保存重开不丢引用或字节。
  - 作者替换 `music.pal.031` 后重迁仍指向 `assets/authored/<hash>.mid`,不被 migrated 版本覆盖。
  - 全量闭包报告继续列出尚未迁移的资源族,不得用兜底/allowlist 报绿。
- 测试:
  - 路径 guard 与 catalog/role/kind 校验表驱动全覆盖；坏路径、缺 id、kind mismatch、缺文件、size/hash 不符均 fail-loud。
  - 迁移计数精确覆盖 86 MIDI、1,174 playMusic、53 stopMusic、36 scene、81 battle、31 个显式
    startBattle.music；正数引用零缺失。
  - 静态扫描 `content/music.json`、`MusicDef`、音乐 `musicId/battleMusicId`、`sys:music`、`<NNN>.mid` 路径拼接和 BGM 裸 fetch 为 0。
  - 旧 v2 工程 -> v3 -> serialize/reload 无双格式；旧 music 别名与旧存档当前曲专测。
  - FSA/HTTP 相同 fixture 结果一致；切工程/dispose 后创建的 object URL 全部 revoke。
  - MG2 两次迁移后第二次 `writes/deletes/conflicts = 0`,作者音乐替换和 label 保留。
  - `pnpm check`、content/reforge/editor/migrate 相关测试与 build 全绿。
- 文档:
  - 更新 content schema、manifest/project lifecycle、asset pipeline 和音乐编辑说明；明确应用壳与工程资源边界。
  - 生成 A7 全量缺口报告和 A7-0 音乐族闭包报告；记录实际文件数、字节数和 hash 结果。
  - capability-map 只更新 W5/X2 的音乐资源生命周期事实,A7/R7 保持未完成直至 A7-4。
- 视觉 / 手工验证:
  - HTTP PAL 工程与本地 FSA 克隆工程各试听至少两首、切换同曲不重启、停曲、关闭/开启音乐后恢复。
  - 新游戏 s000 -> s001、普通战、首领战/胜利曲、读档恢复当前曲各跑一条,控制台零资源 404/HTML fallback。
  - 编辑器导入/改名/替换/删除保护/保存重开完整走一轮,并检查资源列表 id/label/path 不互相冒充。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-15）**。现状审计确认复制链、加载链和引用链未闭合；建议采用单 catalog + AssetResolver,
  以音乐/soundfont 首切片验证 contentVersion、MG2、编辑器 CRUD、运行时与本地工程全链。
- Opus: **agree（2026-07-15,附 R1-R4 必改 + S1-S2 建议,见主审立场）**。七项压力测试全过,独立地面重验:
  音乐引用普查逐项吻合(playMusic **1,227** 含停曲 **53**、场景 musicId **36**、battleMusicId **80**、
  startBattle.musicId **31**、正数去重 **71**、music.json **86** 条且全为 `{id}` 数字壳);硬编码锚点实证
  (main.ts:1372 战斗曲 37、:1629 胜利曲 boss?2:3、bgm.ts:88 `/soundfont.sf3` 应用根、:61 MIDI 裸 fetch);
  `sys:music` 魔法槽三站点(:1159/:1702/:2373+3313);fsa-source urlFor 每调用新建 object URL 无 revoke;
  编辑器 main.tsx:47-51 音乐表绕 source——审计证据全部坐实。**bgm.play 全站点普查**(707/1160/1373/1629/
  1703/2374/3313):除四个硬编码角色外全部数据驱动,**roles 封闭集 = 恰四个**(defaultBattleMusic/
  bossVictoryMusic/normalVictoryMusic/midiSoundfont),无第五个隐藏常量。单 catalog 架构裁定成立:
  Record<AssetId,Record> 合并键/引用键/选择键三合一,id 不透明不可推路径,与 R2/N1-1 的"单一模型+
  fail-loud"先例同构;v3 显式 legacy 债务区优于两种替代(v2 平铺新旧字段 = 同族双真值,一步到 v4 =
  3,232 文件四包一卡,均否);战斗临时曲不落持久态 + WorldState.audio 典型化 = X3/RNG 呈现态与持久态
  分离先例的音频版。范围裁定:地基+音乐纵向切片不再切(地基无切片验证 = 未证抽象;音乐族 86 文件
  最小完整,半族分卡必留旧回退,违铁律)。
- GLM: **agree（2026-07-15;附 G1-G5 build 必落范围澄清,见下）**。六项独立实测逐条：

  **(1) 音乐引用普查独立对账** ✅（核心结论全确认，精确口径 build 钉死）：
  - 场景 musicId **36** / battleMusicId **80** / startBattle.musicId **31**（携 musicId 字段的 31 个，其中 12 正数 19 零停）/ music.json **86** 条全 `{id}` 数字壳——全精确匹配。✅
  - 正数去重 **71**（playMusic 60 + startBattle 12 + scene musicId 28 + scene battleMusicId 8 的并集）= 86 MIDI 子集。✅
  - **86 MIDI（1..87 缺 29）与正数引用零缺源**——71 正数全在 86 MIDI 集合内。✅
  - **⚠️ G1（build 必落精确口径）**：playMusic 总数实测 **1,223**（泛型递归遍历全 list field）vs 卡内 **1,227**；停曲 musicId=0 实测 **52** vs 卡内 **53**。差异 4+1 可能是递归策略不同（branch/confirm/setSceneOnEnter.stages 等嵌套臂）。**build 时必须用审计脚本产出权威数字替换卡内 1,227/53，定性结论不变。**
  - **⚠️ G2（build 必落勘误）**：MIDI 实际路径是 `data/extracted/music/NNN.mid`（零填充三位），非卡内验证命令的 `data/extracted/audio/midi/*.mid`。bgm.ts:60 `padStart(3,'0')` 确认零填充约定。

  **(2) 旁路清单完备性** ✅：
  - 审计 §3.5 **十四处**全量逐一核对存在——assets.ts/bgm.ts(3 处)/sfx.ts/rng-player/glyph/dialog-assets/menu-box/main.ts(4 处)/editor main.tsx/CutsceneTab/BattleFieldPicker。✅
  - 反向扫 reforge/editor 音频/音乐 fetch：全部映射到已有 §3.5 行。✅
  - **G3（非阻塞，记录后续范围）**：发现 1 处 §3.5 漏列——`packages/editor/src/ui/ItemTab.tsx:273` `/baked/ui/items` fallback（物品图标预览）。属后续 A7-1..3 资源族范围，不阻塞音乐切片，但应补入审计清单。

  **(3) roles 封闭集反证** ✅：
  - bgm.play 全站点（main.ts 707/1160/1373/1629/1703/2374/3313）+ bgm.stop（无独立调用——stop 走 `bgm.play(0)`→`stopPlayback` bgm.ts:117-119）+ bgm.setEnabled/resume（数据驱动 pref/菜单）全扫描。
  - **硬编码音乐字面量恰三个**：main.ts:1372 `?? 37`（defaultBattleMusic）+ :1629 `boss?2:3`（bossVictory/normalVictory）+ bgm.ts:88 `fetch('/soundfont.sf3')`（midiSoundfont）。✅
  - **无第五个音乐硬编码**——bgm.ts 无其他音乐常量，sfx.ts 零音乐耦合，音量/静音路径全数据驱动。✅ roles 封闭集 = 恰四个。
  - R4 字面量归零断言目标集 = main.ts `{37,2,3}` + bgm.ts `{baseUrl='/extracted/music', padStart NNN.mid, '/soundfont.sf3'}`。

  **(4) 验收测试矩阵逐条可落** ✅：
  - §94 path guard + catalog 表驱动 / §95 迁移计数 / §96 静态扫描零 / §97 v2→v3 serialize/reload / §98 FSA+HTTP + URL revoke / §99 MG2 二跑零计划 / §100 pnpm check——每条有明确测试落点。✅
  - **R1 族排他断言**：catalog 含 kind:'music' + legacy.families 含 'music' → validator fail-loud throw（表驱动）。✅
  - **R2 归包 + editor 零 migrate 依赖**：v2→v3 纯变换归 content（先例 dialogue-upgrade.ts，loader.ts:33 已用）；editor 零 migrate 依赖**已为真**（package.json 仅依赖 content+reforge）——测试形态 = 依赖规则 lint 断言。✅
  - **R3 二进制三条门禁**：(a) 物化幂等（二次重建字节相同）；(b) 写后闭包（bytes+sha256）；(c) MG2 判据排除二进制（**已结构性成立**：MigrationPlan.writes 是 Map<string,MigrationJson>，二进制从不入 managedFiles）。✅
  - **R4 字面量归零**：grep/AST 扫 main.ts+bgm.ts 音乐字面量+应用根音乐字符串为零。✅
  - **⚠️ G4（build 必落措辞精确化）**：§95 "31 startBattle"应写明"31 个 startBattle 携 musicId 字段"（总 startBattle 173 个，142 个继承默认）。

  **(5) v2→v3 迁移矩阵** ✅（每条可落专测）：
  - **旧 music.json 别名保留为 label**：实测 music.json 只有 `{id}` 无别名/name——label 将 post-migration 新建（MusicDef.name? 存在但 PAL 未用）。专测 = 迁移后 catalog label 字段可填、不丢 id 映射。✅
  - **musicId:0→null/stopMusic**：bgm.ts:117-119 `track<=0→stopPlayback()`。三站点（playMusic/scene/startBattle）的 0 映射到 null/显式 stop。✅
  - **旧存档 sys:music 归一化**：实测 sys:music 5 处文本出现（main.ts 1159 write + 1702/2373/3312 read），全在 main.ts。S1 normalizer = load 边界一次性 sys:music→audio.currentMusic。✅
  - **demo/空白模板直接产 v3（S2）**：实测 demo/e2e-own 无 music.json（manifest content.music=None），三工程均 contentVersion 2。demo 产 v3 = 空 music catalog，trivially satisfied。✅

  **(6) MG2 面** ✅ + **⚠️ G5（build 必落关键）**：
  - **二进制不进 baseline（R3c）**：已结构性成立——migration-baseline.ts managedFiles 只含 JSON，MigrationPlan.writes 是 Map<string,MigrationJson>。✅
  - **作者替换双跑零计划**：pal-migration-integration.test.ts:119-122 已有二跑零计划骨架，需扩展音乐替换+label 保留。✅
  - **⚠️ G5（build 必落关键）**：实测 `migration-merge.ts:41-57` arrayMode **没有 `assets/index.json` 条目**——catalog（Record<AssetId,AssetRecordV1>，object 非 array）当前会 fall through 到 `'atomic'` 整文件替换，**违作者替换保护设计**。**build 必须新增 `assets/index.json` → AssetId-keyed mergeObject 路由 + 所有权 validator（migrator 只可更新 origin=legacy-migrated 且 path 在 migrated/** 的记录）。** 这是隐含在设计中的实现细节，但未显式列为 build 任务——不补则作者替换音乐会被 atomic 覆盖。

  - **Codex 对 G5 的实现前复核（2026-07-15，口径修正）**：G5 指出的作者所有权风险成立，但
    “缺 `arrayMode` 条目会让 Record 整文件 atomic”不成立。`arrayMode` 只在数组分支调用；catalog 根是
    object，`mergeNode` 已在 `migration-merge.ts:292-293` 递归进入 `mergeObject`，天然按 AssetId key
    合并。最小三方实跑也确认：作者把 `a` 改为 `origin=authored/path=assets/authored/**`，同时迁移器更新
    `b` 并新增 `c`，结果无冲突且三项分别正确保留。因此 build **不得往 arrayMode 加死路条件**；G5
    的实际必落项修正为：为 `assets/index.json` 增加显式的 catalog 所有权合并策略/validator，确保作者
    接管的 AssetRecord 整条不被迁移侧字段拼入，迁移器只管理允许的 origin/path，并补上述三方回归测试。

  **总结**：核心普查全确认（36/80/31/71/86 + MIDI 零缺源 + roles 恰四 + 旁路十四处全存在）；playMusic 精确数字 build 时审计脚本钉死（G1）；MG2 catalog 合并路由缺失是 build 必落关键项（G5）；测试矩阵+R1-R4+迁移矩阵全可落。**agree**。

  **G1-G5 build 必落范围澄清（非阻塞，纳入 build 范围）**：
  - **G1**：playMusic 精确数字（1,223 vs 1,227 / 52 vs 53）用审计脚本钉死，替换卡内数字。
  - **G2**：MIDI 路径勘误 `data/extracted/music/NNN.mid`。
  - **G3**：§3.5 补 ItemTab.tsx:273 漏列（非音乐族，后续范围记录）。
  - **G4**：§95 "31 startBattle"→"31 携 musicId 字段"。
  - **G5（关键，Codex 复核后修正）**：通用 `mergeObject` 已按 AssetId key 合并；新增
    `assets/index.json` 显式所有权策略 + `plan.target` validator + 作者接管/迁移兄弟条目并行更新回归测试，
    不向只处理数组的 `arrayMode` 添加无效路由。

- counter / 分歧处理: Opus 无架构 counter;R1-R4 为设计必补,GLM 无设计 counter(标 G1-G5 build 必落)。Codex 已用 `mergeNode` 控制流和最小三方实跑修正 G5 的“Record atomic”事实口径；三方对“catalog 必须按 AssetId 保护作者所有权并有硬门禁”方向无分歧。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed。** R1-R4 必改 + S1-S2 + G1(精确数字钉死)/G2(MIDI路径勘误)/G3(ItemTab漏列记录)/G4(31措辞)/G5(**catalog所有权策略+plan.target validator+三方合并回归**)纳入 build 范围。

### 进入 done 前:审查签字

- Codex: **accept（2026-07-15）**。完成实现、自测、迁移重生成、静态扫描、6010 音乐页与 6051
  s000 -> s001 浏览器复验；全仓 `pnpm check` 与三个 Vite build 全绿。完整证据见 Build/视觉记录和
  `docs/phase2/foundation/a7-0-music-resource-closure-report.md`。
- Opus: **accept（2026-07-15,实现/运行/视觉主审,零返工项）**。六项复核全过:
  1. **单链路无回退**:bgm.ts MIDI 经 `resolver.readBytes(asset,'music')`(:67)、soundfont 经
     `readRoleBytes('audio.midiSoundfont')`(:94)+RIFF 魔数 fail-loud(:96-100)、worklet 留应用壳
     (`/spessasynth_processor.min.js` :91);静态面:`sys:music` 仅剩 save/ops 归一化读边界(:79/:96,
     转换后删除),`musicId` 仅剩 content/project-upgrade 升级器,main.ts 七个 bgm.play 站点全数据/
     角色驱动零数字字面量;roles 封闭联合在 content/asset.ts(R4 落地)。**R1 族排他机械门禁落地**
     (asset.ts:205-211 catalog 族×legacy.families 互斥抛错 + 音乐切片强制四角色齐 + 角色 kind 匹配);
     **R2 落地**(升级器在 content,editor 对 migrate 依赖数=0)。
  2. **G5 所有权 + 二进制**:migration-merge.ts:278-289 作者接管(ours origin=authored × theirs 非
     authored)= **整条记录克隆**,禁逐字段拼接;二进制不进 baseline 为结构性事实(仅 catalog JSON 入
     基线),87 文件 bytes/sha256 抽查逐一吻合(R3 写后闭包在写盘链)。
  3. **battle marker 修复**:BattleCfgMarker 纯迁移期内部形态(translate-events:1500-1521),
     finalizeBattleConfig 同时作用于全场景(:1786)与动态 setSceneOnEnter 根(:1773);机械兜底 =
     music-reference-audit 对**最终产物**计数 internalBattleCfgMarkers 断言 0(任何漏烘必炸);
     产物 grep 零残留;s106 battleMusic=music.pal.037 烘回与「0x4A 持久全局退役→场景默认」既定
     拍板一致,误烘面不存在。产物对账:catalog 86+1、v3 四角色精确(037/002/003/soundfont.default)、
     legacy families 不含 music/soundfont、引用 1,174+53/36/81/31/71/缺失 0——与闭包报告逐项吻合;
     dry-run 零计划(asset-refs=1326 warnings=13 全 unused);四包套件 193/351/180/192+1skip 全绿。
  4. **6010 音乐页全链**:86 行 label/id/path 分列;试听网络证据 = 恰取 `assets/migrated/music/003.mid`
     (catalog 路径,零数字应用根);双曲单路切换;改名 blur 提交+undo 复原;删除保护(被引 disabled +
     "有 991 处引用,不能删除")与未引用删→undo 双向。
  5. **真实 FSA 工程(OPFS 句柄,918 文件含 87 音频)**:音乐页 86 首;**两首试听零 HTTP 音频请求**
     (字节纯走 FileSource = 音乐族真自包含);改名→保存→OPFS 字节级验证(label 落盘、origin 保留)→
     重载重连持久。6051 听感面:`world.audio.currentMusic='music.pal.031'`(typed,`sys:music` 槽消失);
     战斗触发 → **037.mid**(默认战斗角色);真实打赢(持键输入)→ **003.mid**(普通胜利曲),
     currentMusic 全程不被临时曲污染;标题读档 auto → 冷启动取 **soundfont.sf3+031.mid** 恢复;
     系统菜单音乐开关翻转持久(`reforge:audio` 键)且恢复后状态完好。
  6. **console**:6010/6051 全会话 0 error/0 warning/0 404/0 HTML fallback。
  边界备注(非返工):首领胜利曲 002 与显式 startBattle.music(048)未能实走(s108 boss 触发受剧情旗
  门禁,dev startBattle 钩子不带 opts)——与已实走的 003 属同一行角色/资产选择逻辑,单测已覆盖,
  留 GLM 核对单测行;方法论记录:初次用 resolveDone('win') 捷径绕过了胜利结算致 003 未响,
  改真实打赢后取证成功(捷径≠合法路径,已在证据中剔除)。
- GLM: pending
- counter / 返工处理: 无(Opus 零返工项)。
- 缺签豁免: N/A
- done 准入结论: blocked（待 GLM 终审与用户验收）

## Draft: 设计与风险

### 设计结论

#### A. catalog 是唯一物理真值

- `assets/index.json` 使用 `Record<AssetId, AssetRecordV1>`,记录 kind、显式工程相对 path、mediaType、bytes、sha256、
  label 与 origin。
- manifest v3 只指向 catalog 和封闭的具名运行角色；不再声明资源根/子目录。
- AssetId 是稳定不透明身份。改名、换文件、换扩展名、迁移到 authored 路径都不改变引用。
- `validateProjectRelativePath` 同时服务 FileSource、catalog、保存、克隆和 zip；绝对/越界路径在入口拒绝。

#### B. A7-0 runtime 只认识 v3,资源族不双轨

- `@type-pal/migrate` 提供一次性 v2 -> v3 变换；PAL 生成器和空白工程模板直接产 v3。尚未迁移的资源族
  被搬进 `assets.legacy`,只由隔离 LegacyAssetAdapter 读取；普通 FileSource 从本卡起拒绝绝对路径。
- editor 打开 v2 时先执行迁移并要求保存/另存,进入 EditSession 前已是 v3；reforge 正式 loader 不留 v2 回退。
- 若存档 schema 需提升版本,写显式 normalizer；旧数字 `sys:music` 转成 typed currentMusic 后删除。
- A7-4 在 legacy families 归零后生成 v4 并删除 LegacyAssetAdapter；同一资源族任何时刻只能在 catalog 或
  legacy 其中一侧,不能两边都可解析。

#### C. 音乐首切片

- 迁移 id 形态固定 `music.pal.<三位号>`；它是稳定 id,文件 path 明写在 catalog,不可反推。
- `playMusic(asset)` 与 `stopMusic` 分开；场景/战斗字段用 AssetId/null/缺席三态。
- 普通战斗、首领胜利、普通胜利和 MIDI soundfont 由 manifest 具名角色引用,删除 main.ts 数字常量。
- `WorldState.audio.currentMusic` 是持久场景 BGM 真值；战斗音乐是临时呈现态,结束恢复该字段。
- MusicTab/MusicPicker 直接看 catalog 的 music entries。导入只接 `.mid`；替换保持 AssetId；删除先问 asset reference walker。

#### D. 所有权与二进制

- `migrated/**` 由迁移器拥有；`authored/<sha256>.<ext>` 由作者拥有；`runtime/**` 有明确 license/ref。
- catalog 按 AssetId 合并；只要记录已转 authored,重迁必须保留整条作者记录。迁移器不得删除 authored blob。
- `mergeManagedFile` 对 Record 已经递归按 key 合并；本卡新增的 catalog 专用策略负责“作者接管后整条记录归作者”
  的所有权语义，不能依赖逐字段偶然合并，也不能误把对象路由塞进 `arrayMode`。
- 大二进制不放 MG2 JSON baseline；catalog 和内容引用进入 baseline,二进制由 hash/所有权门禁验证。

#### E. A7-0 之后

- A7-0 仅要求音乐族全链无旧回退,公共 resolver/closure 可扩展；其他族在具名 legacy 债务区持续报红。
- 后续按 SFX -> 静态 UI/字形/图像 -> 动态资源 -> 克隆/zip 总门禁推进。
- 每接一族补 typed walker 与闭包计数并删除该族旧解析；全量报告不得因“暂未迁移”假装通过。

### 已知风险

- 风险: v3 一次改动跨 content/reforge/editor/migrate,测试面大。
- 缓解: 公共契约和音乐纵向切片同卡完成,不同时迁其他资源族；以 v2->v3、MG2、HTTP/FSA 双链为硬门禁。
- 风险: `music.pal.031` 看起来仍含数字,被误当文件名约定。
- 缓解: id 只作不透明 key；测试把同 id 的 path 改成哈希文件仍可播放,并禁止 resolver 从 id 推导 path。
- 风险: authored 替换被重迁覆盖。
- 缓解: 目录所有权 + origin + 按 key merge 三重约束,专测同 AssetId 替换后两次重迁。
- 风险: soundfont 约 6MB,重复进每个工程增加体积。
- 缓解: 自包含优先；后续可在克隆传输层去重,但工程目录和导出包仍必须物理拥有它。
- 风险: 全量哈希拖慢启动。
- 缓解: runtime 按需读；迁移/保存/导出/CI/显式检查才跑全量 hash。
- 风险: 本卡只迁音乐却被误报 A7 done。
- 缓解: 看板/能力表注明 A7-0；验收强制保留其余资源族红色缺口报告。

### 主审立场

- Reviewer: Opus
- 结论(Opus,2026-07-15): **agree — 单 catalog + AssetResolver + v3 债务区 + 音乐首切片,七问逐项裁定如下**:
  1. **单 catalog + roles 覆盖 runtime**:成立。物理真值单点(catalog),运行角色是 content 定义的封闭联合
     (实测普查恰四个,见签字行),`project-files.json` 传输清单已声明为派生只读非第二作者数据;
     包边界 content(schema/walker 纯数据)← reforge(resolver 持 FileSource)← editor(零自建解析器)方向正确。
     AssetKind 全集先定义、未迁族零条目,不构成双真值。
  2. **v3 legacy 债务区 / v4 收口**:方案干净且优于两种替代——v2 平铺新旧字段 = 同族双真值(违 READ-FIRST
     铁律),一步到 v4 = 四包 3,232 文件一卡(不可审)。"同族任一时刻只在一侧"必须机械化(R1),
     不能靠约定。旧工程一次性迁移方向对,但变换归包有倒置风险(R2)。
  3. **音乐语义**:AssetId/null/缺席三态与 sceneScriptOverrides 三态先例同构;playMusic/stopMusic 分离
     替代 0 哨兵、WorldState.audio.currentMusic 替代 sys:music 魔法槽、战斗临时曲不覆盖持久 BGM
     战后恢复——与一阶段行为(缺省延续/指定切曲/显式停曲、胜利曲不落账)逐条对应;musicId:0 →
     null(战斗静音忠实原版)映射正确。
  4. **MG2 所有权**:catalog Record 按 AssetId 键合并;"迁移器只可更新 origin=legacy-migrated 且 path 在
     migrated/** 的记录"+作者替换双跑零计划专测,与 ED-4A 漂移门禁同构。二进制不进 JSON baseline
     正确,但门禁三条须明示(R3)。
  5. **soundfont/worklet 边界**:soundfont=工程资源(licensed 角色,自包含铁律要求物理拥有,6MB 可接受
     且用户已拍板 TimGM6mb 不换);worklet=引擎代码=应用壳。划线正确。object URL 收敛到
     resolver/source 级缓存+dispose 统一 revoke,修 fsa-source:50-51 泄漏,正确。
  6. **范围**:不再切。地基不带纵向切片 = 未验证的抽象;音乐族最小完整(86 文件/单一消费链);
     半族分卡必留旧回退。工作量与 N1-1/R2 同量级,可一卡完成。
  7. **验收矩阵**:普查数字已由我独立坐实(1,227/53/36/80/31/71/86),验收 §95 的计数基线可直接对账。
- 必改项(R,设计层面补明,build 必落):
  - **R1 族排他性机械门禁**:content validator 必须断言「catalog 中出现的 AssetKind 所属资源族」与
    「manifest.assets.legacy.families」**互斥**——音乐族入 catalog 后 families 含 music/soundfont 即
    fail-loud;任何族两侧同时可解析 = 校验错误而非约定。A7-1..3 每迁一族此断言自动收紧,A7-4 断言
    families 为空后升 v4。
  - **R2 v2→v3 变换归包与 IO 契约**:变换的纯逻辑层放 **@type-pal/content**(先例:dialogue-upgrade.ts
    loader 边界升级器),文件读取(bytes/sha256)经注入的最小 reader 接口;migrate 包装它做 PAL/CLI 侧,
    editor 在打开边界调用并强制保存——**editor 不得新增对 @type-pal/migrate 的包依赖**(现状零依赖,
    migrate 携 Node 侧重依赖,进浏览器 bundle 即包边界倒置)。
  - **R3 二进制物化门禁三条明示**:迁移物化 `assets/migrated/music/**` 与 `assets/runtime/**` 不在 MG2
    JSON 事务内,验收须写明:(a) 二进制写入确定性可重建且幂等;(b) 写盘后立即跑文件闭包
    (bytes/sha256)作为写后门禁;(c) MG2 双跑零计划判据明确不含二进制,二进制以闭包报告为唯一门禁
    ——防"JSON 零计划但二进制缺/烂"的假绿。
  - **R4 roles 封闭集钉死**:audio 角色联合 = {midiSoundfont, defaultBattleMusic, bossVictoryMusic,
    normalVictoryMusic} 恰四个(Opus 已普查全部 bgm.play 站点,余者皆数据驱动);build 静态断言
    main.ts/bgm.ts 音乐数字字面量与 `/soundfont.sf3` 归零,roles 缺一即闭包报红。
- 建议项(S,不阻塞):
  - S1 存档 normalizer 时机写进设计:load 边界一次性转换(sys:music → audio.currentMusic),X1 auto-save
    自然写回新形态,不迁存量档(CLAUDE.md 修 bug 不迁旧档缺省;normalizer 只管读入)。
  - S2 projects/demo 与空白模板同步直接产 v3(demo-project.test 是真值锚,别漏)。
- 是否建议进入 build: **待 GLM 覆盖复核(迁移矩阵/测试面);R1-R4 纳入 build 范围后 build**。

### 三方争议记录(按需)

- Codex: 支持单 catalog、manifest v3、runtime 零双轨；建议音乐/soundfont 为首切片并退役 music.json。
  对 G5 补充事实修正：Record 已走通用 `mergeObject`，无需 `arrayMode` 路由；build 仍必须增加 catalog
  专用所有权策略、合并后 validator 与作者替换三方回归，防逐字段拼接污染 authored 整条记录。
- Opus: **agree**。单 catalog/v3 债务区/音乐首切片三判全立(替代方案 v2 平铺=双真值、直跳 v4=不可审,
  均否);普查数字独立坐实、roles 封闭集=恰四个;附 R1(族排他机械门禁)/R2(v2→v3 归 content 防包倒置)/
  R3(二进制门禁三条)/R4(roles 钉死+字面量归零断言)+S1-S2。
- GLM: **agree**。核心普查全确认(36/80/31/71/86+MIDI零缺源+roles恰四+旁路十四处全存在)；playMusic精确数字build审计钉死(G1:1223 vs 1227/52 vs 53)；**G5关键: migration-merge.ts arrayMode 无 assets/index.json 条目→catalog 当前 fall through atomic 违作者替换保护,build 必落 AssetId-keyed mergeObject 路由+所有权 validator**；测试矩阵+R1-R4+迁移矩阵全可落。G1-G5 build 必落非阻塞。
- 用户拍板: 用户于 2026-07-15 同意按推荐顺序开始；三签齐前只允许设计审查。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（三方设计签字齐后进入 build）
- 修改文件:
  - content：`asset.ts`、`project-upgrade.ts`、manifest/场景/脚本/世界音频 schema、引用/形状校验与专测。
  - reforge：`asset-resolver.ts`、FileSource URL 缓存/dispose、AssetId BGM、typed world/save audio、loader/main。
  - migrate：`pal-assets.ts`、`music-reference-audit.ts`、migration merge/validate/content、CLI 与集成测试；
    重生成 baseline 和 `projects/pal`。
  - editor：catalog/blob 工程 I/O、v2 本地升级、音乐 CRUD/选择器/试听页、Command/undo 与保存测试。
  - docs/project：四份架构说明、A7 审计/闭包报告、capability map、三工程 v3 manifest/catalog。
- 实现摘要:
  - 建立唯一 `AssetId -> AssetRecord -> AssetResolver -> FileSource` 链，四个音频角色封闭校验；路径、引用、
    kind、bytes、SHA-256 全部可机械门禁，音乐族与 legacy 互斥。
  - PAL 物化 86 MIDI + 1 soundfont，共 6,737,214 字节；最终 1,174 play + 53 stop = 1,227 旧语义站点，
    36 scene music、81 battleMusic、31 显式 startBattle.music、71 唯一音乐引用、0 缺失。
  - 修复动态 `setSceneOnEnter` 根绕过 finalize 导致 `overrideSceneBattle` 泄漏的上游缺陷；s106 曲目 37
    正确烘回场景，最终内部标记为 0。
  - G5 按修正方案落地 catalog 专用所有权策略与 target validator；作者接管记录、迁移兄弟更新/新增和
    二进制排除 baseline 均有回归测试。
  - 本地 v2 只在 editor 打开边界单向升级；运行时/工作态只认 v3。音乐页支持导入、改名、替换、
    引用保护删除和同 resolver 试听。
- 运行命令:
  - `pnpm --filter @type-pal/migrate migrate:content -- --write`：829 托管 JSON，87 音频文件重读闭包；
    二次生成零计划。
  - `pnpm --filter @type-pal/migrate migrate:content`：最终 dry-run `writes=0 deletes=0 conflicts=0`，
    `asset-refs=1326 asset-warnings=13`（13 条均为 unused warning）。
  - `pnpm check`：content 193、shared 111、reforge 351、migrate 192+1 skip、pal-extract 251、
    game 2,294、editor 180 tests 全过；Biome 690 files 零问题。
  - `pnpm -r --if-present run build`：game/reforge/editor 三个 Vite production build 全过；仅既有大 chunk warning。
  - 静态扫描：PAL + baseline 的 `musicId/battleMusicId`、`overrideSceneBattle`、`content/music.json` 均 0；
    `git diff --check` 通过。
- 浏览器 / 手工检查:
  - 6010 `?module=asset&page=music`：86 行 label/id/path 分列；两首 MIDI 依次试听、单路切换；临时改名进入
    undo 并恢复；引用禁删/未引用可删；操作按钮横排，页面无资源错误提示。
  - 6051 `?menu`：标题选择新游戏，s000 对话逐步推进到 s001；画面/切场正常，6051 日志 0 error/0 warn。
- 跳过的检查及原因:
  - 未自动操作原生 FSA 目录选择器做人工保存重开；已由 v2 本地升级、catalog/blob serialize-reload、
    FSA URL 缓存/dispose 集成测试覆盖，留 Opus 用真实目录补验。
  - 未在本轮手工完整跑普通战、首领战/胜利曲、读档听感和系统音乐开关；对应角色/引用/存档归一化与
    runner 路径有自动测试，作为 Opus 运行/听感主审清单，不在此冒充已手验。

## 资源生成记录(如适用)

- Generation Owner: N/A（本卡不进行 AI 生图；PAL 音频仅做确定性迁移/物化）
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: `projects/pal/assets/migrated/music/*.mid`（86 个）、
  `projects/pal/assets/runtime/soundfont.sf3`（1 个）；可由本地合法源确定性重建，不提交二进制副本。
- 尺寸 / 格式 / 透明背景 / 调色约束: MIDI/SF3,不适用图像约束
- 资源登记位置: `assets/index.json`
- 验证方式: 87 文件逐项 bytes/SHA-256 + 6010 两首切换试听 + 6051 新游戏 + MG2 二跑零计划。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Opus
- 验证方式: Codex in-app browser，6010 音乐资源页截图/DOM/交互；6051 标题、s000、s001 截图与日志。
- 截图 / 像素检查路径: N/A（本卡以音频/交互验证为主）
- 结论: Codex 视觉/交互自验通过；音乐表名称、AssetId、路径和操作不再相互挤压，开场场景链无回归。
- Opus 独立复验(2026-07-15): 通过,方法独立于 Codex(CDP + 网络/PerformanceObserver 取证 + OPFS 真
  FSA 工程)。原留予 Opus 的全部未完成项已补:**真实 FSA 目录**(OPFS 句柄 918 文件)两首试听零 HTTP
  音频请求+改名保存重开字节级持久;**普通战** 037.mid(默认角色)、**普通胜利曲** 003.mid(真实打赢
  取证)、**读档恢复**(auto 档冷启 soundfont.sf3+031.mid,currentMusic 复原)、**系统音乐开关**
  (reforge:audio 持久+恢复完好)。首领胜利曲 002/显式 048 受剧情旗门禁未实走,单测承接(见签字行
  边界备注)。console 全会话零 404/零 HTML fallback。
- 未完成项: 无(002/048 一行选择逻辑由单测覆盖,GLM 终审核对)。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: Codex self-review accept；**Opus 实现/运行/视觉主审 accept(2026-07-15,证据见 done 前
  签字 Opus 行)**;GLM pending。
- 必须返工项: 无(Opus)。
- Accept / rework: Opus **accept**;待 GLM 覆盖/数据/测试矩阵终审。

## 用户验收

- 用户结论: pending
- 后续任务: A7-1 SFX 资源族,再按审计分期推进。

## 交接日志

- 2026-07-15 Codex: 完成 A7/R7 现状审计、终态契约、分期和 A7-0 任务卡；Codex 设计签 agree。
  Evidence: `docs/phase2/foundation/a7-resource-closure-audit.md`；当前只改文档。
  Next: Opus 架构/实现可行性主审并签 agree/counter；不得开始实现。
- 2026-07-15 Opus: 设计主审签 **agree + R1-R4 必改 + S1-S2 建议**。独立地面重验:音乐引用普查
  1,227/53/36/80/31/71/86 逐项吻合;硬编码 37/2/3+`/soundfont.sf3`+sys:music 三站点+fsa urlFor 泄漏+
  编辑器音乐旁路全坐实;bgm.play 全站点普查 → roles 封闭集恰四个。裁定:单 catalog(Record 键三合一/
  id 不可推路径)、v3 显式债务区(优于 v2 平铺与直跳 v4)、三态音乐语义(与 sceneScriptOverrides 同构)、
  MG2 所有权(与 ED-4A 漂移门禁同构)、soundfont 工程资源/worklet 应用壳、范围不再切——七问全立。
  R1=族排他 validator 断言;R2=v2→v3 纯变换归 content+注入 reader,editor 禁增 migrate 依赖(防包倒置);
  R3=二进制物化"幂等/写后闭包/MG2 判据排除二进制"三条明示;R4=roles 四角色钉死+音乐字面量归零断言。
  Evidence: 主审立场+普查脚本输出。Next: GLM 覆盖/迁移/测试矩阵复核;三签齐后 Codex build;
  不得抢跑实现。未改实现文件。
- 2026-07-15 GLM: 设计复核签 **agree**。六项独立实测：(1)普查 36/80/31/71/86+MIDI零缺源全确认,playMusic精确数字build审计钉死(G1:1223 vs 1227/52 vs 53),MIDI路径勘误(G2:extracted/music/NNN.mid非audio/midi/)；(2)旁路§3.5十四处全存在,G3发现ItemTab.tsx:273漏列(非音乐族后续范围)；(3)roles恰四——硬编码音乐字面量仅main.ts{37,2,3}+bgm.ts{/soundfont.sf3},无第五,bgm.stop走play(0),音量静音全数据驱动；(4)测试矩阵§93-100+R1-R4全可落,R2 editor零migrate依赖已为真；(5)v2→v3矩阵全可落——music.json仅{id}无别名label post-migration新建/musicId0→null三站点/sys:music 5文本处main.ts/demo无music.json产v3 trivially；(6)**G5关键: migration-merge.ts:41-57 arrayMode无assets/index.json条目→catalog fall through atomic违作者替换保护,build必落AssetId-keyed mergeObject路由+所有权validator**；二进制不进baseline已结构性成立。G1-G5 build必落非阻塞。Evidence: 设计签字GLM行。Next: 三签齐已build allowed,交Codex build。未改实现文件。
- 2026-07-15 Codex: 对 G5 做实现前控制流复核与最小三方实跑。确认 catalog Record 已经由通用
  `mergeObject` 按 AssetId key 合并，不会因缺 `arrayMode` 条目整文件 atomic；同时确认通用逐字段合并
  仍不足以表达“authored 整条归作者”的所有权边界。G5 修正为 catalog 专用所有权策略 + plan.target
  validator + 作者接管/迁移兄弟条目并行更新回归，禁止添加无效 arrayMode 路由。Evidence:
  `migration-merge.ts:279-293` 与本地 tsx 三方 fixture（a authored 保留、b 更新、c 新增、0 conflicts）。
  Next: Codex build 时按修正后的 G5 落地。
- 2026-07-15 Codex: A7-0 build 完成并签 self-review accept，任务转 `review`。音乐族 schema、迁移、运行时、
  编辑器、保存与 MG2 所有权闭环；87 文件/6,737,214 字节 hash 全匹配，权威计数
  1,174 play + 53 stop / 36 scene / 81 battle / 31 startBattle，最终旧键与内部 marker 为 0；全仓 check、
  三个 build、迁移零计划、6010/6051 浏览器检查通过。Next: Opus 做实现/运行/视觉主审并签 accept/counter；
  不得标 done，之后交 GLM 做覆盖/数据/测试矩阵终审。
- 2026-07-15 Opus: review 主审签 **accept,零返工项**。代码面:单链路无回退(readBytes/readRoleBytes+
  RIFF fail-loud,worklet 留壳,sys:music 仅归一化读边界,零数字字面量)、R1 族排他门禁与音乐四角色
  强制落地(asset.ts:205-229)、R2 升级器归 content 且 editor 零 migrate 依赖、G5 authored 整条克隆
  (migration-merge:278-289)、marker 修复双位点+审计零断言兜底(s106 烘 037 合既定拍板)。产物面:
  catalog 86+1 hash 抽查全符、v3 四角色精确、引用 1174+53/36/81/31/71/0 全吻合、dry-run 零计划、
  四包套件全绿。运行/听感面:6010 试听取 catalog 路径+CRUD 全链;**OPFS 真 FSA 工程两首试听零 HTTP
  音频请求**+改名存重开字节级持久;6051 typed currentMusic=031、战斗 037、真实打赢 003、读档冷启
  soundfont+031 恢复、音乐开关持久;console 全程零 404/零 fallback。边界:002/048 受剧情旗未实走,
  单测承接交 GLM 核对;方法论记录 resolveDone 捷径曾致 003 假阴性,改真实打赢后取证。
  Evidence: done 前签字 Opus 行+视觉记录。Next: GLM 覆盖/数据/测试矩阵终审;齐签后交用户验收;
  不得标 done。未改实现文件。

## 下一位 Agent 提示词

```text
接手任务:A7-0 工程资源闭包地基与音乐注册表首切片,覆盖/数据/测试矩阵终审(GLM)
任务卡:docs/ops/tasks/A7-0-resource-closure-registry.md
当前状态:review;done 前 Codex accept + Opus accept(实现/运行/视觉主审,零返工项),GLM pending(最后一签);不得标 done
你的角色:GLM,覆盖面/数据/测试矩阵终审;只改任务卡,不得改实现或生成产物
先读:AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部(重点 done 前签字三行与你设计期 G1-G5)、docs/phase2/foundation/a7-0-music-resource-closure-report.md、packages/content/src/asset.ts、packages/migrate/src/music-reference-audit.ts
请重点复核(数据/测试面,与 Opus 的实现/听感面互补):
1. 你设计期 G1-G5 的落地验收:G1 权威计数已由审计钉死(1,174 play+53 stop=1,227 旧口径,重扫核对);G2 MIDI 路径口径(assets/migrated/music/NNN.mid);G3 ItemTab 旁路属后续族(确认未混入本卡);G4(若有)与 G5 catalog 所有权(mergeNode assets/index.json 特例 :278-289 + target validator + 作者接管/兄弟更新回归测试)逐项确认;
2. 产物对账:用独立脚本重扫——catalog 86 music+1 soundfont、87 文件 bytes/sha256 全量核(Opus 抽查 6 个)、引用 1,174/53/36/81/31/71/缺失 0、旧键(musicId/battleMusicId/music.json/sys:music 除归一化)全仓 0、13 unused warning 清单列出;
3. 测试矩阵:验收 §93-100 逐条落点(路径 guard 表驱动/catalog 校验 fail-loud/迁移计数/静态扫描/v2→v3 双格式/FSA-HTTP 一致/URL revoke/MG2 作者替换双跑);R1 族排他与四角色强制的测试行;**002 首领胜利曲与 048 显式 startBattle.music 的单测行**(Opus 实走受剧情旗门禁,单测是唯一承接——精确到测试名);
4. v2→v3 与存档矩阵:旧别名保留、musicId:0→null/stopMusic 分站点、旧存档 sys:music 归一化专测、demo/空白模板 v3;
5. marker 门禁:music-reference-audit 的 internalBattleCfgMarkers=0 断言 + 动态 setSceneOnEnter 根 finalize 回归测试存在;s106 烘 037 记录在审计文档;
6. MG2 面:二进制排除 baseline 判据(R3c)可测、双跑与独立 dry-run 零计划、asset-refs=1326/warnings=13 口径与报告一致。
已验证(勿重复,可抽查):Opus 已做单链路/R1/R2/G5 代码实证、产物对账、6010 CRUD+试听取证、OPFS 真 FSA 工程零 HTTP 音频+保存重开、6051 typed 状态+037/003/读档恢复/开关、console 全程零 404
不要做:不改实现文件;不重生成 PAL;不把 A7/R7/capability-map 标 done(A7-0 完成≠A7 完成);GLM 签后仍需用户验收
输出要求:在本卡 GLM review 签字行写 accept 或 counter+理由,补交接日志并提交;三签齐后 done 准入结论改为"等用户验收"
```
