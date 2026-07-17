# A7-1 - SFX 音效资源闭包与编辑工作台

Status: rework
Phase: phase2
Capability: A7 / R3 / R7 / X2 / B5
Coding Owner: Codex
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

**权威冻结（2026-07-17,Opus 独立实测,全部可复现脚本;取代上段临时估算)**:
- 现状:位点 **1,953**(=主扫 1,944 + summon 深层 9)/ 非零 **1,661** / 唯一 abs **325**(含空槽 122;
  其余 324 全非空 → **missing=0 实证**);122 仅 1 位点(s145);45 已被 s145/s086 两处 playSound 引用。
- 0x47 恢复面(真实翻译器/链扫描全量重演):skill 链恰 1 条(**377/飞龙探云手 → 174**,重演全部 104 spells);
  item-use 链恰 1 条已翻译被丢(**151/引路蜂 → 45**,重演 102 use + 76 throw;throw 零命中);
  **260/圣灵珠的 0x47(sound 260,非空槽 69,304B)不属恢复面**——其整链未翻译(产物无 use),记消费矩阵。
- 迁移后四项权威(两套口径曾并存,**Opus 设计签字已裁定口径 B 为权威**,理由见签字行):
  - 口径 A(仅恢复 skill 377/174,草案原范围):sound edges = 1,661−1(删122)+1(174)+4(roles) = 1,665;
    项目总引用 = 1,354 + 1,665 = 3,019。
  - **口径 B(+同轮恢复 item-use 151/45,权威)**:sound edges = **1,666**;项目总引用 = **3,020**。
  - 两口径下均为:**被引用唯一 sound = 328、unused = 35**(修正草案 327/36;根因:45 已被引用,
    四 roles 编号 {28,29,45,47} 中 novel 仅 {28,29,47};324+174+3=328)、项目总 unused warning = 15+35 = **50**、
    missing/kind mismatch = **0**。
- 3,015/3,018/3,019 口径差确定性分解:**3,019 = 全计净变化(−122+174+4roles)**;**3,018 = 计删 122 与
  roles、漏恢复 174(唯一分解)**;**3,015 = 未计 roles+4**(删 122/恢复 174 恰 ±1 相抵,故与"全未计净变化"
  数值不可分辨,共同特征是漏 roles)。三个临时口径均未计 item 151/45。

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
- Opus: **agree（2026-07-17,附 R1-R4 必落 + 口径 B 裁定,见下与主审立场）**。数据面独立实测冻结
  (见"设计期数据基线·权威冻结"节:1,953/1,661/325/missing=0;恢复面精确 = skill 377/174 + item-use
  151/45,260 不属恢复面;**328 被引用/35 unused,修正草案 327/36**;权威 edges=1,666/总引用=3,020),
  七问架构裁定:
  1. **四 roles = global role 成立(裁 G4)**:物品使用 28/合击 29/逃跑 45/变身 47 是**战斗系统级提示音,
     无自然宿主实体**(使用音不属于某件物品,属"使用"这个动作)——与 defaultBattleMusic/bossVictoryMusic
     同性质,归 `manifest.assets.roles` 正确;engine-config 会造第二种全局配置机制,违单 catalog+roles。
     可选(非音乐式全量必填)+ 全局资源 UI 必须四项全覆盖(A7-0A 教训:role 无编辑面 = 隐藏配置)。
  2. **suppressMagicEffectSound 放 EnemySounds 成立**:源自同一 PAL magicSound 负号源值,语义"该敌施法时
     抑制技能特效音",归敌人音效配置;放 SkillAnimation 会让技能定义背敌人特例,放呈现层丢数据来源。
  3. **readiness 契约冻结**:全量预解码否决(363 条解码 PCM 估 40-70MB,同 A7-3 R3 内存教训)。分阶段:
     **战斗 = 进场屏障预载本场引用集**(本场敌五项 + 在队 actor 七项 + 已学技能音 + 四 roles,量级几十条,
     字节+解码预热——战斗本有载入拍,不加感知时延);**大世界 = 场景切换拍预取当前场景脚本引用集**;
     **编辑器试听 = 单项 await**。解码 buffer LRU 上限显式(建议 ≤64 条,数 MB 级);suspended AudioContext
     沿 bgm 先例(首手势 resume,resume 前 tryPlay 只记账不出声不算失败);预载不阻塞首屏(懒初始化同构)。
     挂帧点不迟播不提前 = 由进场屏障保证就绪,而非播放点等待。
  4. **播放器契约**:lastSFX 一阶段同构状态机(同号在播拒/异号覆盖/markEnded 清当前)——**现 sfx.ts 的
     16ms 时间防抖是自造 workaround,必须退役**(一阶段真值是状态机不是时间窗);in-flight promise
     await 前缓存、失败删 promise 允许重试、成功存 buffer;错误带 project/AssetId/path/kind;替换单条
     invalidate、session 切换全量 dispose——与 bgm/A7-0 契约同构。
  5. **旧 v3 升级边界成立**:legacy.families 含 sound 判据/打开边界一次性/manifest-last/幂等,与 A7-0A
     completeLocalProjectV3AudioRoles 先例同构;**注意本次含 363 个 WAV ≈ 18MB 二进制复制**,比音乐角色
     补全重——FSA 写入加进度提示；manifest-last 只保证旧 family 判据不提前退出，中途失败可能已留下完整的
     二进制/JSON，下一次打开必须按旧判据幂等重入并滚前完成；HTTP 只读给明确提示(卡已列)。
  6. **SoundTab/SoundPicker 复用成立**:MusicTab/过场页已验收形态 + 共享 SoundPicker(脚本/角色/敌人/
     技能/roles 同一控件),roles 落"全局资源与启动"页(X7-1 先例),无隐藏字段。
  7. **消费矩阵切分成立**:actor dying/death、enemy attack 等无 runtime 事件的槽 = 数据先迁 + B5 债务
     如实列账,不伪造事件;ED-3 不抢跑(walker 扩展即可,A7-1 不建 ProjectReferenceIndex)。
  8. **恢复口径裁定 B(权威)**:item-use 151/45 与 skill 377/174 完全同性质(链已静态翻译、表现层 0x47
     被丢)——不同轮修 = 明知上游 lossy 还重迁,违"迁移类 bug 必须先修上游"铁律;260 圣灵珠链未翻译,
     不属本卡恢复面,记消费矩阵防误算。权威终值 edges=1,666/总引用=3,020。
  **R1-R4(build 必落)**:R1 = 审计脚本入仓断言全部权威数(1,953/1,661/325/1,666/328/35/3,020/50 +
  引用集⊆非空集);R2 = 45 双站点(battle-anim:1132/1220 共用 escape role)归零与 golden 点名两处;
  R3 = walker 测试必含 summon 深层节点 fixture(本轮普查主扫曾漏 9 条 = 浅层遍历假闭包现场实证);
  R4 = GLM 的 G1-G3/G5 全纳入(0x47 三 drop site 处置按口径 B/upgrade sound 路径/walker 扩展/metadata
  dict 读法),G4 已由本签字裁定。
- GLM: **agree（2026-07-17;附 G1-G5 build 必落，见下）**。六项独立实测逐条。

  **(1) 普查对账（独立重扫）** ✅：
  - **SOUNDS 槽 505 / 非空 363 / 空 142 / 18,110,864 B**——sounds-metadata.json `{chunkCount:505, chunks:505}` 结构（非 array），逐项精确匹配。WAV 文件 363 个全非空，字节精确。✅
  - **Actor 42**——6 actors × 7 fields（attack/critical/weapon/magic/cover/dying/death），全正非零。路径 `actor.battler.sounds`（非顶层 sounds）。✅
  - **Enemy 765 = 454 正 + 286 零 + 25 负**——153 enemies × 5 fields（action/attack/magic/death/call），25 个负值全在 `magic` 字段。✅
  - **Skill 112 = 103 animation + 9 summon**——103 个 `animation.sound`（其中 6 个 =0：skill 347/348/350/351/377/392）；9 个 summon 在 `effects[?kind==summon].sound`（非 `summon.sound`——卡内脚本路径有误但总数正确）。✅
  - **playSound 1034** = script chunks 1021 + scenes 3 + enemies.json 10。全非零（zero count = 0）。✅
  - **非零 unique**：144 个不同正数 sound id 被引用，143 命中非空槽，1 命中空槽（122），0 超范围。✅

  **(2) 三口径差异解释 + 删除 122 + 恢复 174 + 四 roles 后权威数** ✅：
  - **3,015/3,018/3,019 差异根因**：三种口径分别来自不同递归策略（是否含 scene inline / enemy choreography inline / confirm.onYes 等嵌套臂）+ 是否计入四 roles 引用边。**这不是数据矛盾而是统计边界差异**。
  - **删除 122**：1 条 playSound(soundId=122) 在 s145 onEnter override L-23975 stage-0 index 86（唯一引用空槽），迁移删除后 -1 occurrence。
  - **恢复 174**：0x47 174 在 L_43144（skill 377 scriptOnSuccess 首命令），恢复后 +1 reference edge + animation.sound 或 playSound overlay。
  - **增加四 roles**：+4 role 引用边。
  - **权威口径（build 时由审计脚本钉死）**：
    - 非零 occurrence = 1,953 原始数字位点
    - 删除 122 后非零 occurrence = 1,952（-1 空槽引用）
    - 恢复 174 后 = 1,953（+1 上游恢复）
    - 四 roles 后 reference edges 总数 = **A7-3 基线 1,354 其他资源 + 1,665 sound edges（含恢复 174）± 1（删除 122 不产生 edge）≈ 3,018-3,019**
    - **精确数字 build 时由审计脚本产出**，missing/kind mismatch 必须 = 0
    - 被引用 sound 数 ≈ 327 / unused warning ≈ 36（待审计脚本确认）

  **(3) 迁移/overlay 入口 + 377/174 + opcode 0x47** ✅ + **G1（build 必落）**：
  - **377/174 根因确认**：migrate-content.ts:468-470 `case 0x47` 显式 lossy discard（"SkillAnimation 暂无 sound 槽"），但注释已 stale——animation.sound 字段已存在（:110 从 m.sound 填充）。源 bytecode L_43144 首命令 `{opcode:71, operands:[174,0,0]}` = 0x47 playSound 174。✅
  - **⚠ G1（build 必落，关键发现）**：**item-use（:852）和 item-throw（:906）的 0x47 静默丢弃——无 lossyNote**。卡内只提了 skill 377/174 的恢复，但还有两个 0x47 drop site 不报 lossy note。**A7-1 须确认这三个 0x47 drop site 是否一并恢复**，不能只恢复 skill 路径而漏 item-use/throw。
  - **迁移入口清单**（5 处数字生成 + 1 处 overlay）：
    - translate-events.ts:1014 `0x47 → {kind:'playSound', soundId:o[0]}`
    - translate-enemy-scripts.ts:253 `0x47 → {kind:'playSound', soundId:ops[0]}`
    - migrate-enemies.ts:156-162 `EnemySounds from stats.*Sound`
    - migrate-content.ts:42-48,270-278 `BattlerSounds from rgw*Sound`
    - migrate-content.ts:81,110 `SkillAnimation.sound from m.sound`
    - pal-authored-overlays.ts 硬编码 animation.sound 数字值
  - **pal-assets.ts 零 sound 生成**——无 palSoundAssetId，无 kind:sound 记录。A7-1 须新增。✅

  **(4) authored 整条所有权 + 二进制事务顺序 + 双跑零计划** ✅：
  - **migration-merge.ts:278-289** authored 所有权 pattern **generic by AssetId/path**——不按 kind 分支，sound WAV 替换无需扩展，与 music/video 同构。✅
  - **二进制不进 baseline**——managedFiles 只含 JSON，MigrationPlan.writes Map<string,MigrationJson>。✅
  - **事务顺序**：源/目标预检 → 物化 WAV → 核 bytes/hash → journal → JSON 提交 → manifest 最后写。
    journal 发布前失败保持原 JSON；发布后可能部分前进，由恢复逻辑按已校验 journal 滚前。二进制物化先行，失败时
    允许留下尚未被 manifest/catalog 引用的完整文件，不承诺事务级回滚。✅
  - **双跑零计划**——与 A7-0/A7-3 同构（catalog 按 AssetId key merge + authored 整条保留）。✅

  **(5) v2/旧 v3/FSA/HTTP 升级矩阵 + 静态归零** ✅ + **G2-G4（build 必落）**：
  - **⚠ G2（build 必落）**：upgrade-local-v2.ts `buildAudioCatalog` **只处理 music + soundfont，零 sound 路径**。A7-1 须扩展 v2→v3 升级 + 新增 v3 sound-family backfill（沿 A7-0A `completeLocalProjectV3AudioRoles` 先例，在 open-local.ts 调用链中 slot in）。
  - **v3 判据**：`legacy.families` 含 `'sound'` → 触发一次性升级（复制 WAV + 登记 catalog + 改写引用 + 删 family），闭包后幂等 no-op。✅ 方向正确。
  - **⚠ G3（build 必落）**：**collectAssetReferences 完全不覆盖 SFX**——playSound 不在 collectCommandAssets（:298-348 只认 playMusic/startBattle.music/playVideo/playFrameAnimation/quitToTitle.videos）；actors/skills 不在 AssetReferenceSource（:282-288 只有 entryPoints/scenes/scriptChunks/enemies）。A7-1 须扩展 walker + AssetReferenceSource。
  - **静态归零清单**：soundId / 公开数字 sound 字段 / assetBase.sounds / legacy.sounds / /extracted/sounds / `${id}.wav` / ScriptDrawer 数字模板 / runtime 28/29/45/47。当前 manifest legacy families 含 `'sound'` + `legacy.sounds: "/extracted/sounds"`。✅ 归零方向明确。
  - **⚠ G4（build 必落，设计疑问）**：**四个 SFX roles 的必要性存疑**——SFX 是 per-entity/per-skill 引用（类似 sprite 的 EntityDef.sprite），不像音乐/视频是全局 runtime role（manifest.assets.roles）。28/29/45/47 四个硬编码音效确实需要某种全局表达，但全局 role vs 某种 engine-config 字段是设计选择。**建议 Opus 在签字时裁定 role vs config**。

  **(6) 代码逻辑审查（不止跑测试——读源码推演边界）** ✅：
  - **负 magic 语义**：一阶段 game/src/core/battle/actions/magic.ts:968-1003 确认负 magicSound → `Math.abs(id)` 播施法音 + 抑制 effect sound。A7-1 迁移拆 `magic?: AssetId` + `suppressMagicEffectSound?: boolean` 在语义上正确。✅
  - **lastSFX 去重**：game/src/shell/audio.ts:51-70 确认只记最近一个编号，同号拒绝/异号覆盖/markEnded 只清当前。A7-1 SfxPlayer 须复刻此状态机。✅
  - **sfx.ts 裸 fetch**：reforge/src/audio/sfx.ts:10-80 `${baseUrl}/${id}.wav` + 16ms 防抖 + 吞失败。A7-1 须改 resolver + 显式错误。✅
  - **大世界 playSound no-op**：reforge/src/main.ts:218,1213 ScriptHost playSound 是 no-op（未接线）。A7-1 须接通。✅

  **总结**：普查全精确匹配（505/363/142/18,110,864B + actor42/enemy765/skill112/playSound1034 + 122唯一 + 377/174 lossy确认）；三口径差异=统计边界非数据矛盾；迁移入口 5+1 处全定位；authored 所有权 generic 可复用；升级矩阵方向正确但 v2/v3 须新增 sound 路径（G2）；walker 须扩展（G3）；0x47 有三个 drop site 非仅 skill（G1）；四 roles 必要性待 Opus 裁定（G4）；代码逻辑层面负 magic/lastSFX/sfx.ts/no-op 四项确认。**agree**。

  **G1-G5 build 必落（非阻塞，纳入 build 范围）**：
  - **G1**：0x47 三个 drop site（skill :468 + item-use :852 + item-throw :906）——确认是否一并恢复，非仅 skill 377/174。
  - **G2**：upgrade-local-v2 新增 v2→v3 sound 升级 + v3 sound-family backfill。
  - **G3**：collectAssetReferences 扩展 playSound + actors + skills + enemy sounds struct。
  - **G4**：四 SFX roles 必要性——Opus 裁定 global role vs engine-config。
  - **G5**：sounds-metadata.json 是 `{chunkCount, chunks}` dict 非 array——审计脚本须读 `.chunks`。

- counter / 分歧处理:**原 build 准入时无 counter，三签全 agree；当前 readiness counter 见下节。**
  与 GLM 签字的三处口径差已由 Opus 签字调和并冻结:
  ① GLM"≈327/36 待确认"→ 权威 **328/35**(45 已被 s145/s086 引用,roles novel 仅 {28,29,47});
  ② GLM"非零 unique=144"系**仅 playSound 命令**口径(143 非空+122),权威唯一数以全位点 **325** 为准,
  两者不可混写;③ GLM 三口径"递归策略差异"说法不充分,确定性分解见基线节(3,018=漏 174 唯一分解/
  3,015=漏 roles 与全未计不可分辨)。GLM G4(roles 形态)已由 Opus 裁定 global role;G1 三 drop site 已
  量化到条并按口径 B 处置(item-throw 侧 76 链实测零命中,收窄为 use 链;260 不属恢复面)。
  pal-authored-overlays.ts 4 处数字 sound(:25/:46/:67/:88)实证——输出已含于产物位点账不重复计,
  schema 改造同轮改写(设计 B 节已覆盖)。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed。** R1-R4(Opus)+
  G1-G5(GLM,G4 已裁)+ 口径 B 权威数全部纳入 build 范围,交 Codex 按 A7-1A→E 分段 build。

### build 中 readiness 反证与重新设计门禁（2026-07-17）

- Codex: **counter（仅针对原 readiness 第 3 条）**。入仓审计
  `pnpm --filter @type-pal/reforge run audit:sfx-readiness` 复用正式 collector 实测：294 scenes 场景峰值 9，
  380 enemy teams 的默认 `new-game` 峰值 27；但李逍遥+赵灵儿+林月如按 manifest 初技和全部升级技能，
  `team-291` 已达 **67**，再纳入静态 `learnSkill` 为 **74**，六角色作者意图包络为 **94**。三项均会被
  `SfxPlayer.prepare` 的 64 上限在进战前直接拒绝。故“进战一次性预载全部已学技能”与“LRU ≤64”不能同时
  成立，默认开局 27 不能替代可编辑入口/存档的真实工作集。
- 推荐重签方案 B：保持单播放器解码 LRU 64；进战屏障只准备队员固定音、敌人/变身/召唤/敌 AI 技能闭包、
  roles 和遭遇演出；玩家技能/物品改为“本轮已提交动作”屏障，所有队员选招完成后，先准备
  `battleBase ∪ 本轮动作音效`，完成才进入 `performAction`。播放仍在原动画帧同步命中，不在 dispatch 提前播，
  也不对冷缓存迟到补播。每轮集合超过 64 继续 fail-loud。
- 否决仅把上限提高到 96 作为终态：它能覆盖当前 PAL 的 94，但编辑器可继续配置更多技能，仍把合法工程规模
  绑定到一次性全技能预载，结构问题没有消失。
- 独立既有缺口：`buildWorld/applySetParty` 尚未把 `ActorDef.initialMagic` 注入 `world.learnedSkills`；本卡不借
  readiness 返工顺手扩大范围。即使完全不计 initialMagic，67 的反证仍成立。
- 当前门禁：任务转 `rework`；A7-1A/B/D 已完成部分和只读/测试工作保留，但在 Opus、GLM 对方案 B 重新签
  `agree` 前，Codex 不再修改 readiness/BattleSession 公共契约，也不进入浏览器验收或 `review`。
- Opus 重签: **agree（2026-07-17,方案 B 成立;附 B1-B5 冻结项 + 对 GLM 矩阵一处调和,纳入 build 范围)**。
  **公开自认**:被证伪的 readiness 第 3 条("进战屏障预载在队已学技能,量级几十条")是我设计期裁定——
  按默认开局估算,低估了成长后期已学技能(67/74)与六角色作者包络(94);与 A7-0"恰四个"同格式记录在案。
  独立复验:audit 复跑 **9/27/67/74/94、leased=0、violations=3、exit 1** 与 Codex/GLM 逐项一致;
  sfx.ts 实证 prepare 超 64 即 throw(:101-104)、play 冷缓存同步 false 绝不补播(:108-113);
  battle-session 实证**全填收口点唯一**(:653-658——auto/粘滞 F·R·A/合击占位全部汇于
  `nextSelecting()===undefined → stepBattle`),方案 B 第二级屏障恰插此单点,状态机可行。
  **否决"上限改 96"认同**:上限追数据 = 把合法工程规模绑死在一次性全技能预载;两级屏障把上界从
  "作者可配技能总量"改为"battleBase + 单轮动作数",与工程规模解耦,是结构解。LRU 64 保持。
  **八竞态逐一裁定**:① 自动战斗(0x8A):逐帧填 pendingActions 汇于同一全填点,**走同一屏障不绕过**;
  ② 强行/粘滞 F/R/A:同一全填点 ✓;③ 重复:per-turn 集按本轮 pendingActions 实际枚举,天然覆盖 ✓;
  ④ 合击:占位 attack(:448)不贡献集合,**coop 技能音裁定留 battleBase**(与现 collector cooperativeSkillIds
  归属一致、集合 ≤队员数、确认瞬间即演出,消灭一类提交后时序)——GLM 矩阵"单轮合击 = base ∪ {coop}"
  行相应调和为"合击确认 → 音已在 base 内命中",数值断言不变;⑤ 无菜单 = ①;⑥ 敌方先手:敌动作音
  全在 battleBase(敌 AI 闭包),敌先手轮不经玩家提交点直接 perform 合法,无需第二级屏障;⑦ 取消:
  全填前 Esc 由选招消费,**preparing 态不接受取消**(prepare 幂等无副作用、热缓存亚 ms/冷缓存几十 ms,
  可感知窗口极小),不引入可取消分支;⑧ 退出竞态:preparing 期战斗终止(fleeBattle 演出/dispose)→
  **token 守卫**(bgm requestSerial 同款先例),悬空 promise 回调作废,不得再 stepBattle。
  **B1-B5 冻结(build 必落)**:
  - **B1 接口**:collector 切两级——`collectBattleBaseSounds`(队员 battler 固定音 + 敌 BFS 闭包(五项/
    变身/召唤/AI cast/偷取物品链)+ 进战活跃毒链 + **coop 技能音** + SFX roles + 遭遇演出脚本)与
    `collectTurnActionSounds(pendingActions)`(本轮实际技能/物品音 + 其施毒链);复用现有 add*/
    enqueuePoison/BFS,不建第二套 walker。
  - **B2 per-turn 屏障集 = battleBase ∪ 本轮动作音 ∪ 当前活跃毒 tick 音(每轮重算)**——战中新施毒
    次轮起靠"活跃毒"项维持 readiness;严格"readiness 集全驻留 LRU"语义不得依赖缓存运气。
  - **B3 状态机**:全填点新增显式 `preparing` 态(选招全填 → preparing(发起 prepare,带 token)→
    完成回调校验 token → stepBattle → acting);preparing 期渲染等待帧、输入锁定;GLM"拒绝重复提交/
    退出竞态"测试行由 token 机制落地。
  - **B4 失败语义**:屏障 await 失败(decode 失败/缺资源)→ 捕获 → 记一次带 project/AssetId/path 上下文
    诊断 → **照常进入 performAction 降级**(play() 冷缓存同步 false 静默)——音效永不卡死战斗、绝不迟播。
  - **B5 审计新口径**:audit 增补方案 B 输出——**battleBase 峰值**(380 teams 全扫)与**最坏单轮增量上界**
    (5 队员 × 最大单动作音数 + 活跃毒上界),断言 `battleBase ∪ 最坏增量 ≤ 64`;9/27/67/74/94 旧口径
    保留为反证记录;violations 空则 exit 0(与 GLM 冻结断言"B 落地后 violations=0"同一物)。
  **验收测试补充(并入 GLM 矩阵)**:八竞态各一条(auto/粘滞/重复/合击-in-base/无菜单/敌先手直 perform/
  preparing 不可取消/token 作废);B2 毒跨轮 readiness 专测(施毒轮 → 次轮 DoT tick 音已就绪);
  B4 失败降级(prepare reject → 战斗继续 + 诊断恰一次)。
- GLM 重签: **agree（2026-07-17;冻结计数 + 验收断言 + 测试矩阵,见下）**。独立复跑 `audit:sfx-readiness` 确认 + 代码逻辑审查枚举完整性。

  **审计输出确认（独立复跑）** ✅：
  scenes=294 / chunks=297 / teams=380 / startBattles=173 / sceneOverrides=61 / maxScene=9(s176) / maxSceneWithItems=10(s176) / entry new-game=27(team-27) / startBattleMaximum=27(team-27) / **stress progression-three=67 / progression-three+script-learn=74 / author-intent-six=94(team-27)** / scriptStore leased=0 / violations=3(67/74/94 > 64)。逐项精确匹配卡内预期。

  **枚举完整性——代码逻辑审查（读 sfx-readiness.ts 源码逐路径推演）** ✅：

  **`collectBattleSoundAssets`（:99-199）闭包路径逐条**：
  1. **队员 BattlerSounds 7 项/人**（:140 `addBattlerSounds`）✅
  2. **玩家技能 animation.sound + summon sound**（:141-142 `includeSkill` → `addSkillSounds` 遍历 effects[summon].sound）✅
  3. **合击 cooperativeSkillId**（:133-135）✅
  4. **物品 use.sound + throw.sound**（:143 `includeItem`）✅
  5. **四 SOUND_ASSET_ROLES**（:146-147 遍历 `SOUND_ASSET_ROLES`）✅
  6. **敌人 BFS（:149-178）**：
     - enemy.sounds 5 项（:156-160）✅
     - steal item sound（:161 `itemsById[enemy.steal.itemId]`）✅
     - attackEquivItem item sound（:162-165 `includeSounds=false`——同 item 的 use/throw 效果链仍扫 applyPoison 但不重复 sound，合理）✅
     - choreography + onDefeated → scriptRoots（:166 → :196 collectScriptSoundAssets 递归）✅
     - **AI rules（:167-177）**：cast→includeSkill（含该 skill 的 animation.sound + summon + applyPoison 链）/ transform→BFS 入队目标 enemy（再遍历其 sounds + AI + choreography）/ summon→BFS 入队（同 transform）✅
  7. **毒→物品 BFS（:180-194）**：三入口入队——activePlayerPoisons（:144-145）/ skill applyPoison（:133）/ item applyPoison（:138）；BFS 按 tickIndex 感知，从 `max(start, 0)` 扫 grantItem（:189-193）✅
  8. **ScriptRef 递归（:196 `collectScriptSoundAssets`）**：visitScriptRefs + resolver.resolve + 环检测 seen Set + lease release finally ✅

  **漏项排查结果：零漏项** ✅：
  - **ScriptRef** — collectScriptSoundAssets 递归穿过 callScript/jumpScript（visitScriptRefs）✅
  - **敌变身/召唤** — BFS 入队 transform/summon 目标，目标 enemy 的 sounds + AI + choreography 被递归遍历 ✅
  - **敌 AI 技能** — ai.rules cast→includeSkill（含 skill 的 sound + summon + applyPoison 链）✅
  - **毒→物品链** — BFS 从 active poisons + skill/item applyPoison 入队，按 tickIndex 感知扫 grantItem ✅
  - **合击** — cooperativeSkillId + cooperativeMagicSkillId ✅
  - **入口 startWorld** — entryEnvelopes 遍历 manifest.entryPoints 每个 startWorld ✅
  - **静态 learnSkill** — learnedByRole 从全产物扫描 learnSkill 命令，progressionWithScripts 纳入 → 74 ✅
  - **Actor.initialMagic** — allSixStart 显式纳入 `actor.battler?.initialMagic`（:222）。**既有缺口**：runtime `buildWorld/applySetParty` 尚未把 initialMagic 注入 `world.learnedSkills`——这是 **runtime 侧既有缺陷非审计侧漏项**（审计直接从 actor 定义读，正确）。即使不计 initialMagic，progression-three=67 仍 > 64 反证成立。✅

  **67/74/94 反证成立确认** ✅：
  - 67 = progression-three（李+赵+林 startWorld 初技 + 全升级技能 + 全物品 + 全毒 vs team-291）——不含 initialMagic
  - 74 = + learnSkill 脚本习得技能
  - 94 = 六角色全包络（含 initialMagic + levelUp + learnSkill + 全物品 + 全毒，全 380 队取最大 team-27）
  - 三项均 > LRU 64，证明"全部已学技能进战预载 + LRU≤64"不可同时成立。✅

  **冻结验收断言**：
  - `audit:sfx-readiness` **violations 非零**（当前 3 项：67/74/94 > 64）= 方案 B 两级屏障的**正确基线**——进战全量预载不可行，须改两级。
  - 方案 B 落地后 violations 应 = 0（两级屏障保证工作集 ≤ 64）。
  - `leased=0` 全循环后零泄漏 = 必须持续保持。

  **两级 readiness 屏障测试矩阵（build 必落）**：

  **屏障 1：战斗进场（battleBase）**
  | 测试行 | 输入 | 预期 |
  |---|---|---|
  | battleBase 集合 | 队员 BattlerSounds × N + 敌人 BFS 闭包(5项+AI cast/transform/summon 递归) + 四 roles + 遭遇 choreography 脚本 | 集合 ⊆ 64 且 ⊆ 非空 catalog |
  | battleBase 冷缓存 | fake adapter 所有 AssetId 未解码 | prepare 完成后全解码，播放挂帧同步 |
  | battleBase 超限 | 构造 > 64 unique sounds 的敌队 | fail-loud（进战屏障拒绝） |
  | battleBase leased | prepare 后/script resolve 后 | leased=0 |

  **屏障 2：单轮动作集（perRound）**
  | 测试行 | 输入 | 预期 |
  |---|---|---|
  | 单轮普通攻击 | battleBase ∪ {攻击 sound} | ≤ 64 |
  | 单轮法术 | battleBase ∪ {法术 animation.sound} | ≤ 64 |
  | 单轮物品 | battleBase ∪ {item use.sound} | ≤ 64 |
  | 单轮合击 | battleBase ∪ {coop skill sound} | ≤ 64 |
  | 自动/重复 | 全自动或重复同一技能 | 不重新 prepare 已就绪集 |
  | 敌 AI 施法 | 敌 cast skill 在 battleBase 已含 | 命中已解码 buffer |

  **边界与失败**
  | 测试行 | 输入 | 预期 |
  |---|---|---|
  | 选招提交后等待 | 所有队员提交 → await prepare perRound → performAction | 等待态可见、拒绝重复提交/退出竞态 |
  | perRound 超限 | 构造 > 64 的单轮集 | fail-loud |
  | 冷缓存首挂帧 | 首次播放某 sound | 在动画帧同步命中，不迟到补播不提前 dispatch |
  | 场景恢复 | 战斗结束 → 场景切换拍预取 | scene sounds 集准备完毕 |
  | 编辑器任意技能规模 | 构造 > 64 技能的作者工程 | 试听单项 await 正常；进战/场景屏障对大集 fail-loud 而非静默截断 |

  **fail-loud 边界明确**：
  - battleBase > 64 → 进战屏障拒绝，不进入战斗
  - perRound > 64 → 动作提交屏障拒绝，不进入 performAction
  - 编辑器试听 → 无上限（单项 await，不走 LRU 批量）
  - 场景预取 > 64 → 场景切换拍 fail-loud（但当前 maxScene=9/10 远低于 64，实际不会触发）

  **总结**：审计输出精确匹配（294/297/380/173/61 + 9/10/27/67/74/94 + leased=0）；代码逻辑逐路径推演确认枚举零漏项（ScriptRef 递归 / 敌 BFS 变身+召唤+AI cast / 毒 BFS grantItem / 合击 / 入口 startWorld / learnSkill / initialMagic 区分既有缺口）；67/74/94 反证成立。**agree（方案 B 两级屏障 + 冻结计数 + 验收断言）。**

  **GLM 的 counter 条件**（当前不触发）：若枚举漏项被独立发现（如某 ScriptRef 路径未被穿过、某 enemy transform/summon 闭包截断、毒 grantItem tickIndex 计算错误），或审计输出与预期不符，则签 counter 并列精确阻塞点。当前零漏项。
- 用户裁决: 无需——Codex counter 后 Opus/GLM 均对方案 B 重签 **agree**,无分歧;唯一口径差(合击音归
  battleBase 还是 per-turn)已由 Opus 裁定留 battleBase(与现 collector 归属一致),GLM 矩阵该行同步调和,
  数值断言不变。**重签齐,readiness 返工解除,Codex 可按 B1-B5 + GLM 矩阵恢复 build**;其余 build 工作
  (A7-1C 剩余/A7-1E)继续原范围。
- Codex 恢复 build（2026-07-17）：已复核 Opus/GLM 重签均为 `agree` 且无 `counter`，按 B1-B5 接回唯一
  Coding Owner；实现与自测完成前不得进入 `review`。

### readiness 重签后的 side-aware 毒链与屏障结算反证（二次门禁，2026-07-17）

- Codex: **counter（触发 GLM 明列的枚举漏项条件）**。恢复 build 后的只读实现复核发现，现
  `sfx-readiness.ts` 的毒 BFS 只以 `poisonId` 为身份，且固定读取 `playerTicks`；但 `battle-core.ts`
  明确让玩家毒走 `playerTicks`、敌人毒走 `enemyTicks`，PAL 的 561/562 产物 `grantItem` 又只存在于
  `enemyTicks`。因此“毒 BFS 零漏项”结论不成立；旧 collector 扫全技能/全背包会掩盖这一缺口，两级缩集后
  必须显式修正，不能靠缓存偶然命中。
- 同轮只读审查还证伪了 B4 的一个隐含前提：`SfxPlayer.prepare` 当前先在无 adapter 时直接返回，预算检查在后；
  有 adapter 时又使用 `Promise.all`，首个资源失败会提前 reject，而同批其他 decode 仍在后台完成。若此时降级
  进入 `performAction`，首挂帧是否命中将取决于异步完成时机，违反“不迟播、屏障释放后状态确定”的冻结语义。
- 修订稿（待 Opus/GLM 重签）：
  - **B1′ side-aware collector**：导出 `collectBattleBaseSounds` 与 `collectTurnActionSounds`；毒种子身份改为
    `(side, poisonId, tickIndex)`，visited key 为 `${side}:${poisonId}`（代码模板字面量）。玩家 cast 仅在实际敌方目标
    技能（`oneEnemy/allEnemies`）有 `applyPoison` 时走 `enemyTicks`，throw 同样走 `enemyTicks`；item use、
    敌 AI cast、`attackEquivItem.use.effects` 走 `playerTicks`；coop 保留 battleBase 并按实际技能目标映射；
    `grantItem` 后分别沿 use→player、throw→enemy 继续闭包。两级输入都能携带
    `activePlayerPoisons + activeEnemyPoisons`，同毒两侧不得互相吞。
  - **B2′ 会话快照**：`BattleTurnReadinessSnapshot` 固化本轮 `pendingActions` 及敌我两侧活跃毒；
    `BattleSession` 只在壳层增加 `preparing/token`，不污染同步/headless `BattlePhase`。普通攻击、敌动作、合击音
    仍由 battleBase 保证；本轮实际 cast/item/throw 与本轮新施毒/次轮活跃毒由 turn collector 保证。
  - **B4′ typed failure**：预算超限使用独立 `SfxReadinessBudgetError`，必须在启动任何 decode、甚至判断 adapter
    前 fail-loud，禁止进入 `performAction`；合法集合用 `Promise.allSettled` 等全部请求落定后才汇总抛 recoverable
    资源错误，成功项保持 ready，BattleSession 诊断恰一次后可降级继续。token/dispose 使悬空回调作废；fatal
    状态必须可见，不能伪装成永久 preparing。
  - **B5′ 新审计实数**（只读脚本重算）：380 队 + 六角色作者包络的 `battleBase` 峰值
    **team-27 = 51**；默认入口 base 与 173 个 startBattle 峰值均 **26**；单动作峰值为 skill 315 的
    **2** 个音（103 + summon 349）；两侧 PAL 活跃毒显式音增量峰值 **0**。代码没有五人队上限，故采用更强的
    六人门禁 **51 + 6×2 + 0 = 63 ≤ 64**（五人值 61 仅报告）；旧 **67/74/94** 留作
    `legacyFullLoadEvidence`，不得再算新 violations。目标报告为 `violations=[]`、`leased=0`。
- 当前门禁：任务再次转 `rework`；本轮恢复 build 后**没有修改实现文件**。Opus/GLM 对 B1′/B2′/B4′/B5′
  重新签 `agree` 前，Codex 不修改 readiness/BattleSession/SfxPlayer 公共契约，也不进入浏览器验收。
- Opus 二次重签: **agree（2026-07-17,B1′/B2′/B4′/B5′ 全部冻结;附 O1-O5 精确化 + 补测清单)**。
  两个反证独立坐实:① **毒单侧**——battle-core.ts:349-356 明确双侧(玩家 playerTicks/敌 enemyTicks),
  而 sfx-readiness.ts:188 硬编码 `playerTicks`;PAL 产物 561/562 的 `grantItem` **只在 enemyTicks**
  (逐条核验)——玩家对敌施 561/562 后敌侧 DoT 物品音链被现 collector 完全漏掉,GLM counter 条件命中
  成立;② **prepare 结算**——sfx.ts:99 无 adapter 早 return 在预算 throw(:101-104)之前(无 Web Audio
  环境超限集静默通过),:105 `Promise.all` 首败早 reject 而同批 decode 仍在飞,屏障 reject 后首挂帧命中
  取决于后台时机——"屏障释放后状态确定"被破坏。两处均为真缺陷,二次 rework 正当。
  **六项冻结裁定**:
  1. **B1′ (side,poisonId,tickIndex) 身份成立**:visited key `${side}:${poisonId}`,同毒两侧独立链不互吞
     (561 玩家侧空链/敌侧 grantItem 链是两条真实不同的可达集)。**action→side 映射逐条核验**:玩家 cast
     敌方目标技能(oneEnemy/allEnemies)带 applyPoison → enemyTicks ✓;throw(全对敌)→ enemyTicks ✓;
     item use(自/队友)→ playerTicks ✓;敌 AI cast(施于玩家)→ playerTicks ✓;
     **attackEquivItem 是 EnemyDef 字段**(enemy.ts:105,敌攻带物品效果作用于玩家)→ playerTicks ✓
     修订稿正确;coop 留 battleBase 按实际目标映射(合体技全对敌 → enemyTicks)✓;grantItem 后
     use→player/throw→enemy 继续闭包 ✓。
  2. **B2′ 快照成立**:`BattleTurnReadinessSnapshot { actions, activePlayerPoisons, activeEnemyPoisons }`
     每轮从 core state 拍——把一次重签 B2 的"当前活跃毒每轮重算"精确为双侧,正确收敛。
  3. **异步态只在壳层成立**:preparing/token 只进 BattleSession,battle-core/stepBattle 保持纯同步
     headless——core 可测性与"呈现态不入核"方针一致,不得让 BattlePhase 出现异步分支。
  4. **B4′ typed fatal 成立**:`SfxReadinessBudgetError` 在计算 unique 后**立即**检查、先于 adapter 判空、
     先于任何 decode;fatal 禁止进入 performAction。**O2 分界钉死**:预算超限 = 作者工程配置错误
     (fatal,fail-loud,进不了战斗——降级会静默掩盖工程超限);资源 decode 失败 = 运行时瞬态
     (recoverable,降级继续)。两类错误不得互串。
  5. **recoverable = allSettled 全落定成立**:合法集合等**全部请求落定**后汇总抛(带全部失败 AssetId
     上下文),屏障释放时零在飞 decode = 状态确定;成功项保持 ready;**O3**:失败项必须已从 in-flight
     缓存删除(现有失败删 promise 语义),下轮屏障可重试。
  6. **可见性/token/guard/done 成立**:preparing 渲染等待帧;fatal 显式可见态(不伪装永久 preparing);
     token 轮次化,dispose/cancel 即失效;**main 侧 identity guard**(await 回来校验 session 同一性,
     A7-3 C1 后的 guard 文化)与壳层 token 双护栏;**O4**:`done` resolve 是最高优先终止信号——win/lose/flee
     已 resolve 后屏障回调一律作废,不得再 stepBattle。
  **B5′ 预算抽验通过**:skill 315 = sound.pal.103 + summon 349 恰 2 音(产物核验,单动作峰值成立);
  毒显式音增量 0 合理(毒链贡献经 grantItem→物品音,已入闭包);六人上界 51+6×2+0=63 ≤ 64,较五人 61
  更强且代码无五人上限,采六人正确。**O5:边距 1 是 PAL 事实而非设计余量**——审计 63≤64 断言必须进
  CI 门禁,未来任何新增音效字段/角色使其 >64 时必须 fail-loud 重审,不得调预算消音。LRU 64 不动 ✓。
  **补测清单(并入测试节,build 必落)**:① budget-before-adapter(无 adapter 超限集也 throw typed
  fatal);② allSettled 全落定(mock 快成功+慢失败,断言屏障 settle 时零在飞、成功项 ready);
  ③ 561/562 敌侧链专测(玩家 cast 施毒技能 → 敌侧 enemyTicks grantItem 物品音入集;固定 playerTicks
  的旧行为作为回归反例);④ 同毒双侧不互吞(561 两侧独立 visited);⑤ attackEquivItem→playerTicks
  映射行;⑥ fatal 可见态(非永久 preparing);⑦ done resolve 后屏障回调作废(token+identity 双护栏);
  ⑧ 审计断言 51/26/2/0/63 且 violations=[]、legacyFullLoadEvidence 保留 67/74/94。
- GLM 二次重签: **agree（2026-07-17;冻结 side-aware 计数 + 验收断言,见下）**。独立复核 side-aware 毒映射逻辑 + 数据自洽性。

  **counter 条件触发确认** ✅：旧 `collectBattleSoundAssets` 毒 BFS（sfx-readiness.ts:180-194）固定读 `poisonDefs[poisonId]?.playerTicks`——但 PAL 561/562 的 `grantItem` 只在 `enemyTicks`（实测：561 playerTicks=0/enemyTicks=8 grantItem=145@tick7；562 同理 grantItem=149@tick7）。**我第一次重签列的 counter 条件确实已触发。**

  **battle-core side mapping 独立验证（读源码逐路径推演）** ✅：
  - 玩家 cast oneEnemy/allEnemies applyPoison → `applyPoisonToEnemy`（battle-core:951）→ enemy → enemyTicks
  - 玩家 throw applyPoison → `applyPoisonToEnemy`（:1472）→ enemy → enemyTicks
  - 玩家 item use applyPoison → `applyPoisonToPlayer`（:1371）→ player → playerTicks
  - 敌 AI cast applyPoison → `applyPoisonToEnemy`（:951，敌视角 oneEnemy=打队员 :1571 onParty 反转）→ player → playerTicks
  - attackEquivItem.use.effects applyPoison → `applyPoisonToPlayer`（:1846 附毒攻击自毒）→ player → playerTicks
  - Codex B1′ side-aware 映射与此一致 ✅

  **数据自洽性** ✅：
  - Items 145/149（灵蛊/赤血蚕）均无 use.sound/throw.sound（纯 healMp/healHp）→ activePoisonUpper=0 自洽
  - Skill 315 animation.sound=103 + summon 349 = 2 → maxSingleAction=2 自洽
  - 新数 51/26/2/0/63：51(battleBase team-27) + 6×2(六人单轮) + 0(毒产物) = 63 ≤ 64 → violations=[] ✅
  - 旧 67/74/94 保留为 legacyFullLoadEvidence ✅

  **side-aware 枚举完整性** ✅：visited key `${side}:${poisonId}` 不互吞；grantItem 后 use→player throw→enemy 继续闭包；coop 按 target 映射。
- 用户裁决: 无需(Opus 二次重签 agree,无产品分歧;待 GLM 二次重签齐后直接恢复 build)。

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
  manifest 最后落盘；失败时旧 family 判据仍在，但此前完成的文件/JSON 可保留，下一次打开幂等滚前完成。
  已闭包 v3 幂等 no-op。HTTP 只读旧工程不能原地升级时给出明确操作提示。
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
  - 缓解:源/目标和完整 WAV 预检前置；manifest/journal 最后发布判据。错误注入测试验证发布前不切判据、
    发布后可安全重入滚前，不虚构跨文件 FSA/文件系统事务回滚。
- 风险:四个 SFX roles 变成隐藏 manifest 配置或空白工程被 PAL 角色绑死。
  - 缓解:roles 可选、kind 严格；PAL 填齐；全局资源 UI 必须覆盖每一 role，空白工程可缺省。
- 风险:把资源闭包扩大成缺失战斗能力开发，范围失控。
  - 缓解:消费矩阵区分“已有事件接线”和“事件能力缺失”；后者只记 B5 债务，不在本卡造新玩法。

### 主审立场

- Reviewer:Opus 主审 schema/runtime/UX；GLM 主审数据/迁移/测试矩阵。
- 结论(Opus,2026-07-17):**agree,七问全裁**(global roles 成立/suppress 放 EnemySounds/分阶段 readiness
  =战斗进场屏障+场景切换拍预取+试听单项 await、LRU ≤64、AudioContext 沿 bgm 先例/lastSFX 状态机取代
  16ms 防抖 workaround/旧 v3 判据成立但注意 18MB 二进制复制加进度/SoundTab 复用已验收形态/消费矩阵
  如实分账)。数据面独立实测冻结权威数并裁定恢复口径 B(见设计签字与基线"权威冻结"节)。
- 必改项:122 删除、**174+45 双恢复(口径 B)**、25 负值显式化、cold-cache readiness、world no-op 接线、
  四硬编码数据化(45 双站点点名)、旧 v3 升级、typed walker(含 summon 深层 fixture)与所有作者 UI 缺一不可;
  R1-R4 + G1-G5 全纳入。
- 是否建议进入 build:**是——三签齐,build allowed**。

### 三方争议记录

- Codex:选择四个可选 assets roles；`suppressMagicEffectSound` 暂放 EnemySounds；删除 122；恢复 174；
  以显式 readiness 保证冷缓存挂帧（工作集/预算待 Opus 冻结）；旧 v3 以 sound family 判据升级。
- Opus:**agree**。裁定:四 roles = global role(战斗系统级提示音无宿主实体,engine-config 会造第二套全局
  配置);suppress 放 EnemySounds(同源 PAL 负号值);readiness 分阶段(战斗进场屏障/场景切换拍/试听
  await,全量预解码 40-70MB 否决);**恢复口径 B**(item-use 151/45 与 377/174 同性质已翻译链 lossy,
  不同修即明知上游 bug 重迁);权威数冻结 328/35/1,666/3,020(修正草案与 GLM 的 ≈327/36——45 已被
  s145/s086 引用;GLM 的 144 系仅 playSound 口径,权威唯一数 = 全位点 325)。
- GLM: **agree**。普查全精确匹配(505/363/142/18,110,864B + actor42/enemy765/skill112/playSound1034 + 122唯一引用 + 377/174 0x47 lossy确认)；三口径(3015/3018/3019)=统计边界差异非数据矛盾；迁移入口 5+1 处全定位；authored 所有权 generic 可复用(migration-merge:278-289 不按 kind 分支)；代码逻辑层面确认负 magic abs+抑制/lastSFX 状态机/sfx.ts 裸 fetch+吞失败/playSound no-op。**G1关键:0x47 三个 drop site(skill468+item-use852+item-throw906)非仅 skill 377**；G2 upgrade 须新增 sound 路径；G3 walker 须扩展 playSound+actors+skills；G4 四 roles 必要性待 Opus 裁定(per-entity vs global role)；G5 metadata 结构是 dict 非 array。
- 用户拍板:无分歧时不需要；任一 `counter` 时停止并请用户裁决。

## 额度 / 代班记录

- 缺席 Agent:none
- 缺席原因:N/A
- 代班 Agent:N/A（Opus 与 GLM 各签本职;两份独立数据普查的口径差在 Opus 签字与争议记录中调和）
- 代班范围:N/A
- 风险:N/A
- 是否需要补审:N/A
- 用户裁决:N/A（恢复口径 B 已由 Opus 设计签字裁定,无遗留分歧）

## Build:实现与自测

- Coding Owner:Codex
- 修改文件:content/migrate/reforge/editor 的 A7-1 纵向闭包与两棵 PAL 生成 JSON；完整清单待恢复 build 后由
  `git diff --name-only 08cb9050...` 固化。
- 实现摘要:
  - A7-1A/B：AssetId-only schema/walker/validator，363 WAV 迁移与 122/174/45/25 负值修复，MG2
    manifest-last+journal 校验，本地 v2/v3 sound-family 滚前升级。
  - A7-1C（未完成）：AssetId-only SfxPlayer、world/battle 接线和原版帧挂载已实现；工作集 collector 的
    “全部已学技能进战预载”被正式审计证伪，等待两级屏障重签。
  - A7-1D：SoundTab/SoundPicker、作者字段、四 roles、诊断/深链/删除保护、FSA 命令 undo 资源恢复已实现；
    仍待浏览器验收。
  - 差异白名单：`audit:a7-sound-diff` 从固定 base 用窄 upgrader 重建 oracle；606 个 baseline JSON、223
    原子地图 hash、147 个允许生成变更、两棵树各 148 个 Git 变更及 363 WAV 集合/bytes/hash 全闭合，
    `nonWhitelistChanges=0`。
- 运行命令:
  - `pnpm --filter @type-pal/migrate run audit:a7-sound-diff` ✅
  - `pnpm --filter @type-pal/editor typecheck && pnpm --filter @type-pal/editor test -- --run` ✅ 29 files / 222 tests
  - `pnpm --filter @type-pal/reforge typecheck && pnpm --filter @type-pal/reforge test -- --run` ✅ 45 files / 387 tests
  - `pnpm --filter @type-pal/reforge run audit:sfx-readiness` ❌（设计反证门禁：67/74/94 > 64；预期非零）
- 浏览器 / 手工检查:pending
- 跳过的检查及原因:当前因 readiness 设计需重签，尚未进入 cold-cache 浏览器、FSA、MG2 双跑、全仓静态
  归零和三 build；恢复 build 后不得跳过。

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
  Evidence:本卡”设计期数据基线””设计结论””推进签字”。Next:Opus/GLM 分别做设计压力测试并签
  `agree/counter`；三签未齐不得进入 build。
- 2026-07-17 GLM: 数据/迁移/测试矩阵设计审查签 **agree**。六项独立实测：(1)普查 505/363/142/18,110,864B 精确匹配(sounds-metadata.json {chunkCount:505,chunks:505} dict)；actor 42(6×7 battler.sounds)/enemy 765(454+286+25 magic 负)/skill 112(103 anim 含 6 个=0 +9 summon effects)/playSound 1034(1021 chunks+3 scenes+10 enemies 全非零)；144 unique 正数 sound id，143 命中非空+1 空(122)+0 超范围。(2)三口径 3015/3018/3019=统计边界差异(scene inline/enemy choreography/confirm 嵌套臂/recursion 策略不同)。(3)**377/174 确认**——migrate-content:468 0x47 lossy discard 注释 stale(animation.sound 字段已存在)；源 L_43144 `{opcode:71,operands:[174,0,0]}` 首命令。(4)**G1 关键发现:0x47 三个 drop site(skill:468 有 lossyNote + item-use:852 + item-throw:906 均 silent 无 lossyNote)**——卡内只提 skill 377/174 恢复，漏 item 两处。(5)authored 所有权 migration-merge:278-289 generic 不按 kind 分支 sound 无需扩展。(6)代码逻辑审查——负 magic abs+抑制(audio.ts:968-1003 确认)/lastSFX 状态机(audio.ts:51-70 同号拒绝异号覆盖)/sfx.ts 裸 fetch+吞失败(:10-80)/playSound no-op(main.ts:218)。**G1-G5**:G1 0x47 三 drop site/G2 upgrade 新增 sound/G3 walker 扩展/G4 四 roles 必要性待 Opus/G5 metadata dict。Evidence: 设计签字 GLM 行。Next: 待 Opus 签后三齐 build allowed。未改实现文件。
- 2026-07-17 Opus: 设计主审签 **agree,三签齐,build allowed**。数据面独立实测冻结权威数(与 GLM 普查
  交叉对账并调和三处口径差):现状 1,953/1,661/325、missing=0 实证;**恢复面精确量化**——真实
  translateSkillScript 重演 104 spells 命中恰 377/174,线性链扫 102 use+76 throw 得 item-use 恰 1 条已翻译
  被丢(**151 引路蜂→45**),260 圣灵珠整链未翻译不属恢复面(记消费矩阵),throw 零命中;**裁定恢复
  口径 B**(151/45 与 377/174 同性质,不同修即明知上游 lossy 重迁);权威终值 **edges=1,666/总引用=3,020/
  被引用 328/unused=35(修正草案与 GLM ≈327/36:45 已被 s145/s086 引用,roles novel 仅 {28,29,47})/
  总 warning=50**;三口径确定性分解入基线节;GLM 的 144 系仅 playSound 口径,权威唯一数=全位点 325。
  架构面七问全裁:global roles(裁 G4)/suppress 放 EnemySounds/分阶段 readiness(战斗进场屏障+场景
  切换拍+试听 await,LRU≤64,全量预解码 40-70MB 否决)/lastSFX 状态机取代 16ms 防抖 workaround/
  旧 v3 判据成立注意 18MB 二进制复制/SoundTab 复用/消费矩阵如实分账。R1-R4 必落(审计脚本入仓断言
  权威数/45 双站点 1132+1220 点名/summon 深层 fixture——本轮主扫曾漏 9 条即现场实证/G1-G3·G5 纳入)。
  pal-authored-overlays 4 处数字 sound 实证(产物账不重复计,同轮改写)。Evidence: 设计签字 Opus 行 +
  基线"权威冻结"节,审计脚本留 scratchpad 可复跑。Next: Codex 按 A7-1A→E 分段 build(提示词见下);
  实现完成自验后转 review。未改实现文件与生成产物。
- 2026-07-17 Codex: 复核 Codex/Opus/GLM 三方设计签字均为 **agree**，`build 准入结论`为
  **build allowed**，同步任务状态 `draft → build` 并接任唯一活跃 Coding Owner。Evidence: 本卡设计签字表、
  提交 `08cb9050`。Next: 按 A7-1A→E 分段实现；W8 已准入但排队，不与本卡并行修改实现文件。
- 2026-07-17 Codex: build 中用正式 collector 全工作区审计，证伪“全部已学技能进战预载 + LRU 64”可兼容性；
  默认入口峰值 27，但三人正常成长已 67，脚本习得 74，作者包络 94。任务 `build → rework`，Codex 对
  原 readiness 条款签 `counter` 并建议两级屏障 B。Evidence:`packages/reforge/scripts/audit-sfx-readiness.mts`
  及本卡“build 中 readiness 反证”。Next:Opus/GLM 只读复核并对 B 重签；签齐前不得继续改 runtime 公共契约。
- 2026-07-17 GLM: readiness 返工数据复核签 **agree（方案 B 两级屏障）**。独立复跑 audit:sfx-readiness 确认 294/297/380/173/61 + 9/10/27/67/74/94 + leased=0 全精确匹配。代码逻辑审查（读 sfx-readiness.ts 逐路径推演）确认枚举零漏项：collectBattleSoundAssets 8 条闭包路径（队员 7 项/技能含 summon/合击/物品/四 roles/敌人 BFS 5 项+AI cast/transform/summon 递归/毒 BFS grantItem/ScriptRef 递归）全覆盖；ScriptRef/敌变身召唤/AI 技能/毒物品链/合击/入口 startWorld/learnSkill/initialMagic 逐项排查无遗漏。initialMagic 区分为 runtime 既有缺口（buildWorld 未注入）非审计漏项，且即使不计 initialMagic 67 仍 > 64 反证成立。冻结验收断言：violations 非零（3 项）= 方案 B 正确基线；方案 B 落地后 violations=0；leased=0 持续保持。给出两级屏障测试矩阵（battleBase 4 行 + perRound 6 行 + 边界失败 5 行）+ fail-loud 边界明确（battleBase/perRound > 64 拒绝；编辑器试听无上限；场景预取 9/10 远低于 64）。Evidence: readiness 反证 GLM 行。Next: 待 Opus 重签方案 B 后三齐恢复 build；签齐前 Codex 不得改 runtime 公共契约。未改实现文件。
- 2026-07-17 Opus: readiness 返工架构重签 **agree(方案 B),重签齐,返工解除**。**公开自认:被证伪的
  第 3 条是我设计期裁定**(按默认开局估"量级几十条",低估成长态 67/74 与包络 94)——与 A7-0"恰四个"
  同格式记录。独立复验:audit 复跑 9/27/67/74/94/leased=0/violations=3/exit 1 逐项一致;sfx.ts prepare
  超限 throw + play 冷缓存同步 false 实证;battle-session 全填收口点唯一(:653-658)——第二级屏障恰插
  此单点。八竞态逐一裁定(auto/粘滞走同一屏障、重复按实际枚举、**合击音留 battleBase**(调和 GLM 矩阵
  一行,数值断言不变)、敌先手直 perform 合法、preparing 不可取消、退出竞态 token 守卫)。B1-B5 冻结:
  两级 collector 接口/per-turn 集含当前活跃毒(每轮重算)/显式 preparing 态+token/失败降级不卡战斗
  不迟播/审计新口径 battleBase 峰值+最坏单轮增量 ≤64 断言。否决"上限改 96"认同(结构问题不消失)。
  验收补八竞态+毒跨轮+失败降级测试行。Evidence: readiness 反证节 Opus 重签行。Next: Codex 按
  B1-B5 + GLM 矩阵恢复 build(A7-1C 剩余接线+A7-1E);实现完成自验后转 review。未改实现文件。
- 2026-07-17 Codex: 重签后只读实现复核发现 poison BFS 固定 `playerTicks`，与 battle-core 敌我双侧语义及
  561/562 仅 `enemyTicks.grantItem` 的 PAL 数据冲突，命中 GLM 自列 counter 条件；同时发现
  `prepare` 的 budget-after-adapter 与 Promise.all 早退会破坏屏障确定性。任务再次 `build → rework`，未改
  实现文件。Evidence: 本卡“readiness 重签后的 side-aware 毒链与屏障结算反证”。Next: Opus/GLM 对
  B1′/B2′/B4′/B5′ 聚焦重签；签齐前不得继续实现。
- 2026-07-17 Opus: readiness 二次返工架构重签 **agree(B1′/B2′/B4′/B5′ 全冻结 + O1-O5 + 八条补测)**。
  两反证独立坐实:毒单侧(battle-core:349-356 双侧 vs sfx-readiness:188 硬编码 playerTicks;561/562
  grantItem 仅 enemyTicks 产物核验——玩家施毒的敌侧物品音链现被全漏)与 prepare 结算(sfx.ts:99
  adapter 早 return 先于预算 throw + :105 Promise.all 早退致屏障释放后在飞不确定)。六项裁定:
  (side,poisonId,tickIndex) 身份+visited `${side}:${poisonId}` 双侧不互吞;action→side 映射逐条核验
  (attackEquivItem 系 EnemyDef 字段→playerTicks 正确;coop 留 base 按目标映射);快照三元每轮拍;
  异步态只进壳层(core 纯同步不破);**O2 fatal/recoverable 分界钉死**(预算超限=工程配置错 fatal
  不进战斗/decode 失败=瞬态 recoverable 降级,不得互串);allSettled 全落定零在飞+失败项出 in-flight
  可重试(O3);done resolve 最高优先终止(O4)+token/main identity 双护栏;fatal 显式可见非永久
  preparing。B5′ 抽验:skill 315=sound.pal.103+summon 349 恰 2 音,六人 51+12+0=63≤64 采信,
  **O5:边距 1 是 PAL 事实非设计余量,63≤64 断言进 CI,超限必 fail-loud 重审不得调预算**。LRU 64 不动。
  Evidence: 二次门禁节 Opus 二次重签行。Next: GLM 二次重签(两侧毒映射/51/26/2/0/63/violations 口径,
  补测 ③④⑤ 可直接引用);签齐后 Codex 恢复 build;不得标 review/done。未改实现文件。
- 2026-07-17 GLM: readiness 二次返工数据复核签 **agree（side-aware 两级屏障）**。counter 条件触发确认：旧毒 BFS 固定 playerTicks 漏 enemyTicks 561/562（实测 561 playerTicks=0/enemyTicks=8 grantItem=145@7；562 同理 149@7——561/562 是 PAL 全产物唯二带 grantItem 的毒）。battle-core side mapping 逐路径读源码验证：cast oneEnemy/allEnemies+throw→applyPoisonToEnemy→enemyTicks(:951/:1472)；item use+attackEquivItem→applyPoisonToPlayer→playerTicks(:1371/:1846)；敌 AI cast→onParty 反转→playerTicks(:1571)。数据自洽：items 145/149 无 sound→activePoisonUpper=0；skill315 103+349→maxSingleAction=2；51+6×2+0=63≤64→violations=[]；旧67/74/94 保留 legacyFullLoadEvidence。side-aware 枚举完整：visited key `${side}:${poisonId}` 不互吞、grantItem 后 use→player throw→enemy 继续闭包、coop 按 target 映射。Evidence: 二次门禁 GLM 行。Next: Opus+GLM 二次重签齐，Codex 恢复 build（side-aware collector 实现）。未改实现文件。

## 下一位 Agent 提示词

### 给 GLM(readiness 二次重签)

```text
接手 A7-1 readiness 二次返工数据复核,只读,不得修改实现文件。
任务卡:docs/ops/tasks/A7-1-sfx-asset-closure.md
当前状态:rework;Codex 二次 counter(毒单侧+prepare 结算)后,Opus 已对 B1'/B2'/B4'/B5' 二次重签 agree(附 O1-O5+八条补测),GLM 二次重签 pending(最后一签)
必读:本卡"readiness 重签后的 side-aware 毒链与屏障结算反证"全节(重点 Opus 二次重签行)、packages/reforge/src/audio/sfx-readiness.ts:180-199、packages/reforge/src/battle/battle-core.ts:349-356、projects/pal/content/poisons.json 的 561/562
请重点复核(数据面,与 Opus 架构面互补):
1. 两侧毒映射矩阵独立复算:玩家 cast 敌方目标技能→enemyTicks/throw→enemyTicks/item use→playerTicks/敌 AI cast→playerTicks/attackEquivItem(敌字段)→playerTicks/coop 按目标→enemyTicks/grantItem 后 use→player·throw→enemy——逐条给出 PAL 产物反例或确认;
2. 561/562 独立核验:playerTicks 无 grantItem/enemyTicks 有——确认玩家施毒敌侧物品音链的具体音集;
3. B5' 五数复算:battleBase 峰值 51(team-27)/默认入口与 173 startBattle 峰值 26/单动作峰值 2(skill 315=103+summon 349)/两侧活跃毒显式音增量 0/六人门禁 63≤64(五人 61 仅报告);
4. 新 violations 口径:violations=[] 为目标、67/74/94 移入 legacyFullLoadEvidence 不再计新违例、leased=0 保持;
5. Opus 八条补测与你既有三张矩阵的合并去重(③④⑤ 与你映射复核同源);
6. visited key ${side}:${poisonId} 的去重正确性(同毒双侧独立、同侧幂等)。
不要做:不改实现;不标 review/done;签齐前 Codex 不得恢复实现。
输出:在"二次门禁"节 GLM 二次重签行写 agree 或 counter+精确阻塞点,补交接日志并提交;签齐后用户裁决行改"重签齐,恢复 build",Codex 按 B1'/B2'/B4'/B5'+O1-O5+合并测试清单恢复。
```
