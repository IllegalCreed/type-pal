# A7-1 - SFX 音效资源闭包与编辑工作台

Status: draft
Phase: phase2
Capability: A7 / R3 / R7 / X2 / B5
Coding Owner: Codex（三方设计签字齐后）
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: main

## 目标

完成 SFX 资源族的完整纵向闭包：脚本、角色、敌人、技能、召唤和战斗提示音统一引用稳定
`AssetId`；PAL 的非空 WAV 全部进入工程 catalog 并只经 `AssetResolver -> FileSource` 读取；编辑器能导入、
替换、改名、试听、选择和安全删除音效；HTTP、FSA、本地升级、重迁和正式运行不再依赖
`legacy.sounds`、数字号拼路径或静默回退。A7-1 只退出 `sound` 这一项 legacy family，不冒充 A7 全部完成。

## 范围

- 范围内:
  - `playSound`、角色七项战斗音效、敌人五项音效、技能动画音效、召唤音效及战斗派生帧全链改为
    `AssetId`；无声使用字段缺席，不保留 `0`、负数或 number/string 双格式。
  - 把 25 个负 `EnemySounds.magic` 的过载源值烘成“`abs(id)` 施法音 + 显式抑制技能特效音”两项干净语义。
  - PAL 的 363 个非空 WAV 全部登记、物化和校验；142 个空 chunk 不创建假资产。
  - 把使用物品、合击起手、逃跑、敌人变身四个引擎硬编码音效改为可选、typed、可编辑的工程资源角色。
  - 扩展现有 typed asset walker，使脚本、角色、敌人、技能和 SFX roles 的引用统一服务诊断、保存门禁、
    删除保护、迁移校验和资源页反向引用。
  - `SfxPlayer` 改为只接 `AssetId` 和窄字节读取接口，接通当前静默的大世界 `playSound` host，复刻一阶段
    `lastSFX/onended` 去重语义，并覆盖预解码、失败重试、替换失效、resume 和 dispose。
  - 编辑器资源模块新增“音效”工作台；脚本、角色、敌人、技能和全局资源页提供音效选择、试听与定向跳转。
  - PAL 迁移、MG2 作者接管、旧 v2/旧 v3 本地工程的一次性 sound-family 退出升级、HTTP/FSA 保存重开闭环。
- 范围外:
  - BGM、MIDI soundfont 与标题菜单音乐；已由 A7-0/A7-0A 闭环，只做回归。
  - 头像、物品图标、UI、字形、FIRE 精灵、战斗背景、瓦片和角色/敌人图像等 A7-2/后续动态资源族。
  - 视频与 frame-animation 的身份、解码和编排；已由 A7-3 闭环，SFX 仍由脚本/技能/战斗呈现独立编排。
  - A7-4 的 contentVersion 4、全 legacy 归零、全工程 clone/zip 和发行包。
  - ED-3 全工程通用引用图；本卡只扩展既有 typed asset walker，不另造 `ProjectReferenceIndex`。
  - 新音频格式、混音器、声道/音量/空间音频；首切片只接收经 RIFF/WAVE 校验的 WAV。
  - X6 战斗 BGM 揭场时序、R8 替代资源生成和缺失战斗能力本身。
- 明确不做:
  - 不新增第二套 `sfx` kind、`sounds.json` 或从 `sound.pal.NNN` 反推文件路径的规则。
  - 不为源数据空槽 122 生成零字节、静音占位或 missing allowlist；其命令按原始空 chunk 语义在迁移边界删除并报告。
  - 不把 PAL 的 28/29/45/47 改成引擎硬编码 `sound.pal.*`；语义提示音必须来自工程配置。
  - 不让 runtime/editor 长期接受 `soundId: number`、负 AssetId、`number | AssetId` 或 legacy 路径回退。
  - 不因音效字段已经闭包就声称缺失的暴击/替挡等战斗表现能力也已实现；消费矩阵必须如实分开“有事件已接线”
    与“事件能力尚未落地”。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`: schema、migration、asset pipeline、跨包接口和 capability-map 变化必须开卡三签；迁移缺陷先修上游
    并重生成，不能只手改 `projects/pal`。
  - `docs/phase2/READ-FIRST.md:11-18`:运行模型只保留一套干净 schema；对象与引用使用稳定 id；边界一次性升级，
    核心不背双格式。
  - `docs/phase2/roadmap.md:190-230`:R3/A7+R7 先于 ED-3、ED-4/5 和大规模 Q1 E2E。
  - `docs/phase2/capability-map.md:124`:X2 引擎已可用而编辑器仍为 ⚠️，明确由 A7-1 补 SFX 稳定 id、导入/替换
    和资源闭包。
  - `docs/phase2/editor/project-lifecycle-design.md`:工程资源统一经 `FileSource`，FSA 工程保存后必须自包含。
- 一阶段真值:
  - `CLAUDE.md` 的忠实还原规则；第二阶段不得凭感觉改写原版可观察行为。
  - `packages/game/src/shell/audio.ts:51-70`、`packages/game/src/shell/audio.test.ts:112-136`:
    `lastSFX` 只记最近一个编号；同号未结束时拒绝，异号覆盖最近编号，`markEnded` 只清当前编号。
  - `packages/game/src/core/battle/actions/magic.ts:968-1003`、
    `packages/game/src/core/battle/__tests__/actions.test.ts:1386-1449`:敌人负 `magicSound` 仍按绝对值播施法音，
    同时抑制技能 effect sound。
  - `docs/phase2/foundation/phase1-knowledge-harvest.md:404-407`:SFX 同号去重和音频行为摘录。
  - `docs/phase2/battle-presentation-audit-2026-07-05.md`:法术音挂演出帧，不得为了异步加载提前到命令 dispatch 播放。
- 代码锚点(`file:line`):
  - `packages/content/src/asset.ts:6-25,63-115,221-435`:`sound` kind 已存在；legacy 仍有 `sound/sounds`；
    helper、role 校验和 asset walker 尚未闭合 SFX/actors/skills。
  - `packages/content/src/script.ts:145`:`playSound.soundId:number`。
  - `packages/content/src/actor.ts:17-39`、`enemy.ts:91-98`、`skill.ts:60-63,89-90`:
    角色、敌人、技能和召唤仍用数字音效。
  - `packages/reforge/src/audio/sfx.ts:10-80`:播放器按 `${baseUrl}/${id}.wav` 裸 fetch、16ms 防抖且吞失败。
  - `packages/reforge/src/main.ts:218,1213`:播放器由 `assetBase.sounds` 构造；大世界 ScriptHost 的
    `playSound` 仍是 no-op。
  - `packages/reforge/src/battle/battle-anim.ts:352,748,835,976,1008,1132,1220,1240`:
    28/29/45/47 硬编码及负 `magicSound` 语义丢失。
  - `packages/reforge/src/asset-resolver.ts`、`packages/reforge/src/audio/bgm.ts:21-32`:
    可复用的 catalog kind 校验和窄字节 reader 先例。
  - `packages/migrate/src/pal-assets.ts:200-366`:唯一 PAL 资源登记/物化入口和 authored 接管先例。
  - `packages/migrate/src/migrate-content.ts:468-470`:技能 377 的源 opcode `0x47` sound 174 被错误记作有损丢弃。
  - `packages/migrate/src/translate-events.ts:1014`、`translate-enemy-scripts.ts:252-255`、
    `migrate-enemies.ts:156-162`:数字 `playSound`/敌人音效生成入口。
  - `packages/editor/src/ui/editor-navigation.ts:132-161`、`DataMode.tsx`:资源页目前无“音效”。
  - `packages/editor/src/ui/CommandForm.tsx:843-847`、`ScriptTree.tsx:244-245`、
    `core/command-catalog.ts:265-270`:脚本音效仍是数字输入/展示；catalog 的 opcode 标注需核对为 `0x47`。
  - `packages/editor/src/ui/SkillTab.tsx:682-683`、`FireEffectPreview.tsx:67-102`:
    技能音效仍为数字且预览直接拼路径。
  - `packages/editor/src/core/open-local.ts:32-42`、`upgrade-local-v2.ts`:
    打开边界目前只有 v2 升级与音乐角色补全，没有旧 v3 sound-family 退出。
- 已知坑 / 审计文档:
  - `docs/phase2/foundation/a7-resource-closure-audit.md`:单 catalog、AssetResolver、MG2 与 A7 分片的总设计。
  - `docs/phase2/foundation/x-shell-audit.md:188-235`:一阶段 SDL 音效播放/去重语义与当前实现差距。
  - `docs/ops/tasks/A7-0-resource-closure-registry.md`:catalog、role、resolver、编辑 CRUD、MG2 作者所有权与
    contentVersion 3 legacy 债务区先例。
  - `docs/ops/tasks/A7-3-cutscene-asset-workbench.md`:已获用户验收的资源工作台形态和 HTTP/FSA 视觉验证方法。
  - 当前角色 `dying/death`、敌人 `attack` 等部分作者槽没有对应 runtime 消费点；闭包报告必须列消费矩阵。
- 不得重新引入:
  - `manifest.assets.legacy.sounds`、`assetBase.sounds`、`/extracted/sounds`、应用根 URL、数字补零和 `<id>.wav` 猜路径。
  - runtime/editor 对旧数字 schema 的容错分支；旧工程只在打开/升级边界一次性转换。
  - 每个编辑页各自扫描引用、各自决定删除规则；全部复用同一 typed walker 和资源命令。
  - 二进制进入 MG2 JSON baseline，或迁移器逐字段污染 `origin=authored` 的同 AssetId 记录。
- 相关测试:
  - `packages/game/src/shell/audio.test.ts:112-136`:lastSFX 真值测试移植来源。
  - `packages/game/src/core/battle/__tests__/actions.test.ts:1386-1449`:负 magicSound 真值测试移植来源。
  - `packages/content/src/asset.test.ts`:catalog/roles/walker/path/kind 表驱动入口。
  - `packages/migrate/src/pal-migration-integration.test.ts`:全量计数、双跑零计划和作者接管集成入口。
  - `packages/migrate/src/migration-merge.test.ts:268-323`:authored AssetRecord 整条所有权先例。
  - `packages/editor/src/core/project-io.test.ts`、`project-diagnostics.test.ts`:保存重开和诊断/跳转入口。

## 设计期数据基线

以下是三份独立只读普查的共同基线；派生总数在 GLM 签字时必须用可复现审计脚本对账，不把临时 grep 当终值。

| 项目 | 设计期实测 | 终态要求 |
|---|---:|---|
| SOUNDS 槽位 | 505 | 不把槽位号当资产总数 |
| 非空 WAV | 363 / 18,110,864 B | catalog 精确 363 条 `kind:sound`，bytes/hash 全匹配 |
| 空 chunk | 142 | 0 条假资产 |
| 数字 SFX 原始位点 | 1,953 | 公开 schema 数字位点归零 |
| 角色七项 | 42 | 全部 AssetId |
| 敌人五项 | 765 = 454 正 + 286 零 + 25 负 | 0 缺席；负号拆成 AssetId + 显式语义 |
| 技能 animation + summon | 112 = 103 + 9 | 全部 AssetId；恢复技能 377 / sound 174 |
| `playSound` | 1,034 = script chunks 1,021 + scenes 3 + enemies.json 10 | 全部 `asset`；删除空 chunk 122 命令 |
| 当前非零源位点 | 1,661 occurrences / 325 个 legacy 编号（按绝对值去重） | 122 一减、遗漏 174 一加；最终引用边与唯一资产数由审计脚本钉死 |
| 特殊问题 | 122 唯一被引用空槽；25 个负 magic；377/174 上游丢失 | 三项均有 golden test |

上表的 `site/occurrence` 是旧 schema 槽位，asset walker 的 `reference edge` 是迁移后引用，`unique asset` 是按
AssetId 去重的物理资产，三者不得混写。设计草案按“删除 122、恢复 174、增加四个 SFX role”临时估算新增
1,665 条 sound reference edges；若当前 A7-3 基线 1,354 条其他资源引用不变，则项目总引用约 3,019。
该数字以及“327 个被引用 sound / 36 个 unused”都只是待对账假设，不是验收断言或 build 准入事实；GLM 必须
解释独立普查中 3,015/3,018/3,019 的口径差，冻结 occurrence/edge/unique/warning 四项权威结果后才能签
`agree`。无论最终计数为何，missing/kind mismatch 必须为 0。

## 验收条件

- 功能:
  - `AssetKind:'sound'` 的 catalog 是唯一物理真值；`palSoundAssetId(n)` 只用于迁移生成稳定 id，运行时不从 id
    推路径。PAL 363 个非空 WAV 全闭包，`sound`/`sounds` 从 PAL legacy 和 `AssetBase` 退出。
  - `playSound`、Actor、Enemy、Skill、summon 和 runtime AnimFrame 全链使用 `AssetId`。0 变缺席；负 enemy magic
    变 `magic?: AssetId` + `suppressMagicEffectSound?: boolean`（确切字段位置待 Opus 签字确认）。
  - 负 magic 的施法帧仍播绝对值音效，技能 effect 帧不播；正值和 0 的行为分别有 golden。
  - 技能 377 的 sound 174 从上游迁移恢复；s145 的空 sound 122 命令被上游删除并产生可审计 warning。
  - 四个提示音用可选 assets roles 表达，PAL 填齐、空白/非战斗工程可缺省；所有 role 都在“全局资源与启动”
    的战斗音效分组可编辑，不能成为隐藏 manifest 字段。
  - SfxPlayer 只经 resolver 读字节，并有显式 readiness/prepare 契约；首次冷缓存仍必须在挂帧点播放，不能迟到或
    为等加载而提前到 dispatch。预加载集合、启动时延/解码内存预算及 suspended AudioContext 策略由 Opus 设计签字
    冻结；编辑器显式试听可 await 单项准备。
  - SfxPlayer 精确复刻 lastSFX 最近一项语义；并发同资产只读/解码一次，失败不永久毒化缓存，替换后失效，
    `resume`/`dispose` 完整，错误含 project/AssetId/path/kind 上下文且不静默。
  - 大世界、战斗脚本、角色/敌人/技能动画和四个提示音都走同一播放器。已存在相应演出事件的作者音效槽全部接线；
    尚不存在事件能力的槽列入消费矩阵，不伪造事件。
  - 编辑器新增音效页，复用音乐/过场工作台的信息架构和蓝色控件：过滤、导入 WAV、试听、改名、同 id 替换、
    引用列表、引用保护删除、未引用删除、undo/redo、稳定 deep link `module=asset&page=sound&object=<AssetId>`。
  - Script/Actor/Enemy/Skill/全局资源字段全部用 SoundPicker，可试听并跳到资产；ScriptDrawer/新建 Enemy/Skill
    不再写数字默认值，FireEffectPreview 不再拼路径。
  - 旧 v3 工程以 `legacy.families` 含 `sound` 为升级判据，在进入 EditSession 前一次性复制/登记 WAV、改写引用、
    删除本族 legacy，manifest 最后写；v2 升级链同步支持。不能闭包时 actionable fail，不保留 runtime 双轨。
    schema 纯变换归 `@type-pal/content`，文件编排归 editor；editor 不得新增 `@type-pal/migrate` 依赖。
  - authored 替换同 AssetId 后重迁整条记录与字节保持作者所有；迁移源/目标文件在 JSON 提交前预检，失败不留下
    半提交 catalog。
- 测试:
  - content:helper、schema validator、可选 roles、role kind、family 排他、walker 精确 site/expectedKind；actors、
    enemy sounds/choreography、skills、scripts 和 roles 全覆盖。
  - migrate:505/363/142/18,110,864B、122 删除、377/174 恢复、25 负号正/负/0 golden、精确引用数、
    363 条 size/hash、0 missing/kind mismatch 和权威 unused warning 数。
  - migrate/MG2:同 AssetId authored WAV 替换、迁移兄弟项更新、源缺失事务失败、二次 dry-run
    `writes=0 deletes=0 conflicts=0`。
  - runtime:SfxPlayer fake adapter 表驱动覆盖 resolver path/kind、prepare 冷缓存、in-flight cache、失败重试、
    替换失效、开关/resume/dispose 和一阶段三条 lastSFX/onended 真值；世界 host 与战斗各至少一条集成测试。
  - battle:负 magicSound 仍在施法帧播且 effect 帧静音；正/0 对照；28/29/45/47 runtime 字面量归零。
  - editor:SoundTab CRUD/导入 RIFF-WAVE 校验/替换/引用禁删/未引用删除/undo-redo/预览/pending blob/
    保存重开；四类作者字段、roles、诊断和 deep link；窄视口零溢出。
  - upgrade:v2、旧 v3 sound family、已闭包 v3 三类 fixture；幂等、manifest-last、缺源 fail-loud、FSA 可写和
    HTTP 只读边界均有测试；依赖规则断言 editor 仍为零 migrate 依赖。
  - 静态扫描归零:`soundId`、公开数字 sound 字段、`assetBase.sounds`、`legacy.sounds`、`/extracted/sounds`、
    `${id}.wav` 推断、ScriptDrawer 数字模板和 runtime 28/29/45/47。
  - 全仓 `pnpm check`、content/reforge/editor/migrate 定向测试和三个 Vite build 全绿。
- 文档:
  - 更新 content schema、asset pipeline、project lifecycle、编辑器帮助、A7 闭包审计、capability-map 与
    A7-1 结果报告；只在所有 SFX 作者字段可编辑且运行/预览闭包后把 X2 编辑器改为 ✅。
  - A7/R7 继续保持未完成；报告列 363/142/bytes/hash、引用权威数、122、174、25 负值、unused、
    unconsumed sound slots 和剩余 legacy families。
- 视觉 / 手工验证:
  - HTTP PAL 与真实 FSA 克隆工程各完成：资源页试听两项、替换一项、改名、引用禁删、未引用删除/撤销、保存重开。
  - 6051 从冷加载实走一条大世界 `playSound`、普通攻击/法术/敌人负 magic、物品 28、逃跑或变身提示音；
    声音挂帧不提前，控制台 0 资源 404/HTML fallback/静默 decode 失败。
  - 临时断开 `data/extracted/sounds` 和 manifest legacy sound 路径后，HTTP/FSA 的运行与编辑试听仍成功。
  - Opus 独立复验首次冷缓存声画时序、同号去重/结束后再放、引用删除 UX 和浏览器窄视口。

## 推进签字

签字是阶段门禁。本卡触碰 schema、migration、asset pipeline、跨包接口和 capability-map；三方设计签字未齐，
不得修改实现文件或把状态改成 `build`。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-17）**。三份只读普查共同证明这不是播放器小改，而是 schema→PAL 迁移→typed walker→
  resolver/runtime→editor→旧工程升级的完整 SFX 纵切。Codex 选择：空 122 删除、377/174 上游恢复、负 magic
  拆 AssetId+显式布尔、四个可选且有 UI 的 SFX roles、用显式 readiness 保证冷缓存挂帧、旧 v3 按 sound family
  一次性退出；实现与验证可落。具体预加载集合/预算由 Opus 冻结，派生引用总数由 GLM 冻结。
- Opus: pending（主审：schema/roles、负 magic 语义、runtime 时序/预解码、旧 v3 边界与 UI 信息架构）。
- GLM: pending（主审：363/142/bytes、1,953 位点、122/174/25 负值、引用口径、迁移/MG2/升级测试矩阵）。
- counter / 分歧处理:任何一方对四个 roles、负值字段位置、prepare 契约、122 处理或旧 v3 升级策略签
  `counter`，任务留在 draft 并由用户拍板。
- 缺签豁免: N/A
- build 准入结论: **blocked（等待 Opus + GLM 设计签字）**

### 进入 done 前:审查签字

- Codex: pending（全仓测试、迁移重生成、HTTP/FSA 浏览器自验、静态归零）。
- Opus: pending（独立运行/视觉主审：冷缓存声画、lastSFX、HTTP/FSA 试听、字段选择与删除体验）。
- GLM: pending（独立数据主审：363/142/bytes/hash、122/174/25、权威引用数、MG2 双跑和剩余 legacy）。
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft:设计与风险

### 设计结论

#### A. schema 与引用只有一套

- 增加 `palSoundAssetId(n) -> sound.pal.NNN`，但 AssetId 始终不透明；实际路径只读 catalog 的显式 record。
- `playSound` 终态为 `{ kind:'playSound'; asset: AssetId }`。
- `BattlerSounds`、`EnemySounds` 的物理声音字段和 `SkillAnimation.sound`、summon sound 变为可选 `AssetId`；
  缺字段表示无声。
- 设计首选把 `suppressMagicEffectSound?: boolean` 放在 `EnemySounds`，因为它来自同一个 PAL
  `magicSound` 源值且只控制敌人施法音链；Opus 可在签字时提出更干净的表现配置位置。
- 四个可选 role 首选命名：`audio.battleItemUseSound`、`audio.battleCoopCastSound`、
  `audio.battleEscapeSound`、`audio.battleEnemyTransformSound`。它们进入封闭 role kind 表并在全局资源 UI 显示；
  不加入“只要有任意 audio 就全部必填”的音乐角色校验，PAL 填齐、空白工程可缺省。
- `collectAssetReferences` 接收 actors/skills 并遍历所有 SFX 作者边；runtime AnimFrame 是派生边，不重复计入项目引用。

#### B. PAL 迁移先修上游

- `pal-assets.ts` 读取 metadata/manifest/文件三方，登记并确定性物化全部 363 个非空 WAV 到
  `assets/migrated/sounds/NNN.wav`；空槽不登记。
- 所有数字生成入口和 authored overlay 同轮改写；122 命令删除并报告，技能 377/174 从当前 lossy 分支恢复。
- 负 enemy magic 在迁移边界取绝对值建 AssetId，同时写抑制标记；runtime 不知道 PAL SHORT 符号协议。
- PAL manifest 删除 `sound` family 和 `legacy.sounds`，但保留其他尚未迁移 family，contentVersion 仍为 3。
- 迁移计划在提交 JSON 前验证所有迁移源/作者目标可读；物化后核 bytes/hash。catalog 的 authored 整条所有权和
  `assets/migrated/**`/`assets/authored/**` 路径规则沿用 A7-0，二进制不进 baseline。

#### C. runtime 保持挂帧语义

- SfxPlayer 依赖 `{ readBytes(asset, 'sound') }` 和可注入 audio adapter，不依赖 `AssetBase`、EditorState 或 migrate。
- 首选方案是由 typed walker/运行阶段给 `prepare(referencedAssets)` 提供有界工作集，并在相应世界/战斗阶段可交互前
  建立 readiness；若全量预解码不满足启动时延或内存预算，Opus 可签等价的分阶段预载方案。无论采用哪种，播放点
  仍留在原有动画帧，不能因 async decode 提前到 dispatch 或冷缓存迟播；字节/解码 readiness 与用户手势后的
  AudioContext resume 分开测试。资源加载失败进入统一诊断并阻止“闭包成功”，播放循环可降级继续但必须报一次
  带上下文错误。
- cache 分为成功 buffer 与 in-flight promise；失败删除 promise 允许重试。编辑器替换或 session 切换显式
  invalidate/dispose，不让旧 AudioBuffer 冒充新 bytes。
- 去重使用一阶段同构状态机：`tryPlay(asset)`、`markEnded(asset)`，只跟踪最近 AssetId，不变成“所有在播集合”。
- 大世界 ScriptHost 与 BattleSession 共用 player；战斗硬编码改读 roles；所有 runtime number 签名退出。

#### D. editor 与旧工程边界

- SoundTab 复用已验收 MusicTab/过场页的过滤、列表、详情、预览、引用与命令形态，不发明另一套按钮和布局。
- WAV 导入先验 RIFF/WAVE，生成稳定 authored AssetId/内容 hash 路径；替换保持 AssetId，改名只改 label。
- SoundPicker 是共享控件，脚本/角色/敌人/技能/全局 roles 使用同一候选、预览、清空和跳转语义。
- 打开旧 v3 时若 `legacy.families` 含 sound，先做文件感知的一次性 upgrader，再建 EditSession；升级写临时内容并
  manifest 最后落盘，失败保留旧工程。已闭包 v3 幂等 no-op。HTTP 只读旧工程不能原地升级时给出明确操作提示。
- schema 重写放在 content 的纯函数，editor 只通过注入的 FileSource/写入边界搬运字节；不反向依赖 migrate。
- runtime 对旧 v3 fail-loud 并提示“用编辑器升级”，不保留兼容 parser；v2 打开链必须直接得到本卡终态。

#### E. 分段实现与每段门禁

1. A7-1A:content schema、roles、walker、validator 和审计脚本；定向测试绿后才能改生成产物。
2. A7-1B:migrate/PAL 物化、122/174/负值、MG2 和旧工程 upgrader；重生成与双跑零计划后进入 runtime。
3. A7-1C:resolver SfxPlayer、prepare、world/battle 接线、硬编码退役和一阶段 golden。
4. A7-1D:SoundTab、SoundPicker、所有作者字段、全局 roles、诊断/深链/保存重开与浏览器验证。
5. A7-1E:全仓静态归零、报告、capability-map 事实更新；三方 review 未齐不得 done。

### 已知风险

- 风险:1,953 原始位点的派生引用总数有 3,015/3,018/3,019 三种临时口径。
  - 缓解:build 前由 GLM 用纳入仓库的审计脚本按 occurrence/reference edge/unique asset 拆账并解释每一项差值；
    集成测试只断言权威脚本输出。
- 风险:冷缓存 decode 使音效迟于动画挂帧，热缓存测试看不出。
  - 缓解:Opus 冻结有预算的 readiness/分阶段 prepare 契约；fake adapter 测冷缓存，Opus 用新浏览器会话独立验声画。
- 风险:负 enemy magic 的符号一旦只取 abs，会悄悄恢复错误的 effect sound。
  - 缓解:正/负/0 三组迁移和 runtime golden，复用一阶段测试语义。
- 风险:旧 v3 与新 v3 同版本，普通版本号升级器无法区分。
  - 缓解:以显式 `legacy.families` 含 sound 为一次性 family-exit 判据；闭包后删除判据，测试幂等。
- 风险:迁移先提交 JSON 再发现 WAV 缺失会留下半闭包工程。
  - 缓解:源/目标预检前置，manifest 最后写，错误注入测试验证原工程不变。
- 风险:四个 SFX roles 变成隐藏 manifest 配置或空白工程被 PAL 角色绑死。
  - 缓解:roles 可选、kind 严格；PAL 填齐；全局资源 UI 必须覆盖每一 role，空白工程可缺省。
- 风险:把资源闭包扩大成缺失战斗能力开发，范围失控。
  - 缓解:消费矩阵区分“已有事件接线”和“事件能力缺失”；后者只记 B5 债务，不在本卡造新玩法。

### 主审立场

- Reviewer:Opus 主审 schema/runtime/UX；GLM 主审数据/迁移/测试矩阵。
- 结论:Codex 建议按完整 SFX 纵切进入 build，但必须先补齐 Opus、GLM 两份 `agree`。
- 必改项:122 删除、174 恢复、25 负值显式化、cold-cache readiness、world no-op 接线、四硬编码数据化、旧 v3 升级、
  typed walker 与所有作者 UI 缺一不可。
- 是否建议进入 build:pending（当前 blocked）。

### 三方争议记录

- Codex:选择四个可选 assets roles；`suppressMagicEffectSound` 暂放 EnemySounds；删除 122；恢复 174；
  以显式 readiness 保证冷缓存挂帧（工作集/预算待 Opus 冻结）；旧 v3 以 sound family 判据升级。
- Opus:pending；重点判断 role/字段位置、预解码内存与时序、旧 v3 HTTP/FSA 边界是否成立。
- GLM:pending；重点解决引用总数差异并确认迁移/测试矩阵零漏项。
- 用户拍板:无分歧时不需要；任一 `counter` 时停止并请用户裁决。

## 额度 / 代班记录

- 缺席 Agent:none
- 缺席原因:N/A
- 代班 Agent:N/A
- 代班范围:N/A
- 风险:N/A
- 是否需要补审:N/A
- 用户裁决:N/A

## Build:实现与自测

- Coding Owner:Codex（三方设计签字齐后）
- 修改文件:pending
- 实现摘要:pending
- 运行命令:pending
- 浏览器 / 手工检查:pending
- 跳过的检查及原因:不得跳过 cold-cache、FSA、MG2 或静态归零。

## 资源生成记录

- Generation Owner:N/A（本卡搬运已有 PAL WAV，不做 AI 生成或替代资源创作）
- 生成目的 / 替换对象:N/A
- 提示词要点 / 风格约束:N/A
- 输出路径:`assets/migrated/sounds/NNN.wav`（build 后由迁移器确定性物化）
- 尺寸 / 格式 / 透明背景 / 调色约束:保留源 WAV bytes，不重编码
- 资源登记位置:`assets/index.json`
- 验证方式:363/bytes/hash + dry-run zero plan

## 视觉验证记录

- Visual Verification Owner:Codex + Opus
- 验证方式:pending
- 截图 / 像素检查路径:pending
- 结论:pending
- 未完成项:全部

## Review:审查与返工

- Reviewer:Opus + GLM
- 审查结论:pending
- 必须返工项:pending
- Accept / rework:pending

## 用户验收

- 用户结论:pending
- 后续任务:A7-2/剩余动态资源族与 A7-4 全 legacy 收口，按 capability-map 重新选择。

## 交接日志

- 2026-07-17 Codex:完成 A7-1 三路只读普查和 draft 设计，自签 `agree`；未修改任何实现文件。
  Evidence:本卡“设计期数据基线”“设计结论”“推进签字”。Next:Opus/GLM 分别做设计压力测试并签
  `agree/counter`；三签未齐不得进入 build。

## 下一位 Agent 提示词

### 给 Claude Opus

```text
接手任务:A7-1 SFX 音效资源闭包与编辑工作台设计主审
任务卡:docs/ops/tasks/A7-1-sfx-asset-closure.md
当前状态:draft；Codex 已签 agree，Opus/GLM pending，build 准入 blocked
你的角色:Opus 架构/runtime/UX 主审；只审设计，不改实现或生成产物，可回写任务卡签字与意见
先读:AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/phase2/foundation/a7-resource-closure-audit.md、
docs/phase2/foundation/phase1-knowledge-harvest.md 的 SFX 段、
docs/ops/tasks/A7-0-resource-closure-registry.md，以及本任务卡全部内容。
重点代码:packages/content/src/{asset,script,actor,enemy,skill}.ts；
packages/reforge/src/audio/sfx.ts、asset-resolver.ts、main.ts、battle/battle-anim.ts；
packages/editor/src/ui/{MusicTab,CommandForm,SkillTab,FireEffectPreview}.tsx；
packages/editor/src/core/{open-local,upgrade-local-v2}.ts。
已完成:三份只读普查；锁定 505/363/142/18,110,864B、1,953 原始数字位点、空 122、
技能 377/174 上游丢失、25 个负 magicSound、world playSound no-op、28/29/45/47 硬编码。
请你做:压力测试并裁定 1)四个可选 SFX roles 是否是正确边界且 UI 必须覆盖；
2)suppressMagicEffectSound 字段位置；3)哪种有预算的 readiness/分阶段 prepare 能保证冷缓存挂帧，
并明确预加载集合、启动时延、解码内存和 suspended AudioContext 契约；
4)lastSFX/in-flight/error/invalidate/dispose 契约；5)旧 v3 sound-family 升级和 HTTP/FSA 失败边界；
6)SoundTab/SoundPicker 是否完整复用现有工作台且没有隐藏字段；7)消费矩阵与 A7-2/A7-4/ED-3 切分。
不要做:不得修改实现文件、生成产物、capability-map 状态或把任务改为 build/done；
允许只修改本任务卡的 Opus 设计签字、主审意见、争议记录和交接日志。
输出要求:把结论写回任务卡并明确签 agree 或 counter；agree 可附 build 必落项，counter 必须给出可执行替代方案。
最后给用户一段可直接转给 GLM/Codex 的提示词。三签未齐前明确写“不得开始实现”。
```

### 给 GLM

```text
接手任务:A7-1 SFX 音效资源闭包与编辑工作台数据/迁移设计审查
任务卡:docs/ops/tasks/A7-1-sfx-asset-closure.md
当前状态:draft；Codex 已签 agree，Opus/GLM pending，build 准入 blocked
你的角色:GLM 覆盖、数据、迁移、MG2、升级和测试矩阵主审；只审设计，不改实现或生成产物，可回写任务卡签字与意见
先读:AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/phase2/foundation/a7-resource-closure-audit.md、docs/ops/tasks/A7-0-resource-closure-registry.md、
docs/ops/tasks/MG2-incremental-migration-merge.md，以及本任务卡全部内容。
重点代码/数据:data/extracted/data/sounds-metadata.json、data/extracted/sounds、
packages/migrate/src/{pal-assets,migrate-content,migrate-enemies,translate-events,translate-enemy-scripts,
migration-validate,migration-merge}.ts、packages/content/src/asset.ts、
packages/editor/src/core/{project-diagnostics,open-local,upgrade-local-v2}.ts、projects/pal/content。
已完成:三份只读普查共同确认 505 槽/363 非空/142 空/18,110,864B、1,953 数字位点、
空 122、技能 377/174 被丢、25 个负 enemy magic。临时派生总数出现 3,015/3,018/3,019 口径差，
本卡故意未把其中一个冒充权威终值。
请你做:1)用可复现扫描逐项对账 actor42/enemy765/skill112/playSound1034 与非零/unique；
2)解释 3,015/3,018/3,019 差异，给出删除122+恢复174+四roles后的权威总引用、被引用 sound 数和 unused warning；
3)核对全部迁移/overlay 入口、377/174 根因与 command opcode 0x47；4)验证 authored 整条所有权、
二进制事务顺序和双跑零计划；5)补齐 v2/旧v3/FSA/HTTP 升级矩阵；6)审查静态归零与测试矩阵是否漏项。
不要做:不得修改实现文件、生成产物、capability-map 状态或把任务改为 build/done；
允许只修改本任务卡的 GLM 设计签字、数据基线、主审意见和交接日志。
输出要求:把权威口径和证据写回任务卡，明确签 agree 或 counter；若数据尚不能闭合就签 counter 并列阻塞点。
最后给用户一段可直接转给 Opus/Codex 的提示词。三签未齐前明确写“不得开始实现”。
```
