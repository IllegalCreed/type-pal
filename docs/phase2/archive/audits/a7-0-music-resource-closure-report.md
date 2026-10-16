# A7-0 音乐资源闭包报告

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-16
Template: evidence-receipt-v1 / 1.0.0

原状态与时点：2026-07-15音乐族闭包通过；A7总体未完成；07-16追加A7-0A勘误。

## 证据身份

本回执保存07-15音乐首切片及07-16追加勘误。文档源Git身份是下方固定blob，不代替原执行candidate；原报告未给统一的执行SHA，本轮不补造。治理Owner为Codex，原产品署名与验收分别取[A7-0卡](../../../ops/archive/tasks/done/A7-0-resource-closure-registry.md)和[A7-0A卡](../../../ops/archive/tasks/done/A7-0A-opening-menu-music-role.md)。本次只核文档。

## 来源与输入

原输入为86份MIDI（001..087缺029）与1份soundfont，经Scene/Command/WorldState的AssetId、manifest catalog/roles、AssetResolver/FileSource读取；worklet属引擎壳，MIDI与soundfont属工程。第五标题菜单角色绑定004，不能把splash005并入，也不写WorldState.audio.currentMusic。旧v2→v3只按当时输入边界保留，不恢复当前兼容。

## 断言与业务 oracle

原业务要求是稳定AssetId指向唯一工程字节，文件bytes/SHA与kind/路径相符；引用保护删除、同ID作者接管、迁移双跑零计划和URL释放分别有职责。文件存在/引用正确与实际听到声音是不同证据；两首试听不能证明所有曲目或002/048已完整走场。对拍与产品测试本轮均未重做。

## 结果

原87文件/6,737,214B＝86 MIDI/767,426B＋1 soundfont/5,969,788B。1174 playMusic＋53 stopMusic＝1227旧语义站点；36场景、81战斗槽、31显式startBattle、71唯一曲是不同分母，80→81来自动态finalize根纠正。1327 typed引用/12 unused及829 JSON/294场景/297脚本chunk保持原轮范围；unused不是缺失或自动删除授权。报告日期07-15与07-16追加五角色勘误并存，不能倒写最初就已穷尽。

## 限制与复核

原报告未闭合A7-1/2/3/4的段落是当时债务，不重新打开后来已收口资源族。G5“Record被arrayMode当原子对象”的旧归因已被配对卡反证，不能从本报告MG2摘要恢复该错误解释。原raw/音频未恢复或重听；002仅binding、048无独立走场与O2统一回执缺口沿配对卡保留。当前准入按[二阶段规则](../../READ-FIRST.md)，不从本历史报告发起产品build。

## 历史范围

07-15结果正文与07-16角色勘误是两层日期；先前1326/13和后继1327/12不互相回填。原升级和未完成清单只指当时。

## 当时证据

原文完整保存文件/引用表、试听、序列化重开、FSA URL dispose和MG2结果；迁移producer及目录归属原样保留。原执行candidate和动态raw未恢复，不能由本次source/blob证明旧实跑可重放。

以下保留原公开标题入口；导航只转本页历史说明，不恢复旧命令或准入：

### 1. 单一链路

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### 2. 文件闭包

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### 3. 引用闭包

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### 4. 运行与编辑闭环

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### 5. 迁移与所有权

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### A7-0A 勘误（2026-07-16）

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### 6. 未闭合范围

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

## 当前有效性

historical。保留AssetId与所有权设计来源，四角色穷尽说法已撤回；当前运行/听觉/测试质量未核。旧升级器、normalizer和legacy回退不能由历史测试描述重新准入。

## 继任文档

[第五角色纠正](../../../ops/archive/tasks/done/A7-0A-opening-menu-music-role.md)接替遗漏；[总审计](a7-resource-closure-audit.md)按各自日期记录后继资源族，当前约束取[READ-FIRST](../../READ-FIRST.md)。缺动态证据由新的明确范围任务处理，不重复执行旧命令或旧提示词。

## 原始结论

固定音乐批次的文件/引用/编辑与MG2结果，不是全部A7通过或当前运行认证；四角色错误由第五标题菜单角色纠正。

完整原文源Git blob `bb4a6a3052c7da0dc253f841668311f94b6b8dcf`，revision `bb90428668808368e816bd8e2ddeb5da57e4b166`。以下逐行增加quote前缀（非空行`> `、空行`>`）；原第3/4行的两个末尾空格分别重编码为CommonMark反斜杠硬换行，逆回读时还原双空格，其余字节不变；其中“当前”、命令、旧版本和已撤回主张均指原日期，不是本次执行授权。

<!-- original-source-quote:start -->

> # A7-0 音乐资源闭包报告
>
> > 日期:2026-07-15\
> > 范围:音乐 MIDI、MIDI soundfont、音乐引用、编辑器生命周期、PAL 迁移与 MG2 所有权。\
> > 结论:音乐族闭包通过；A7 全资源闭包仍未完成。
>
> ## 1. 单一链路
>
> ```text
> SceneDef / Command / WorldState 中的 AssetId
>   -> manifest.assets.catalog / roles
>   -> assets/index.json 的 AssetRecord
>   -> AssetResolver
>   -> 当前工程 FileSource
>   -> MIDI / soundfont 字节
> ```
>
> - `content/music.json` 已删除，AssetId 不推导路径。
> - `musicId/battleMusicId` 和数字 0 停曲哨兵已退出最终 content；停曲使用 `stopMusic` 或字段 `null`。
> - MIDI worklet 是应用壳；MIDI 与 soundfont 是工程资源。HTTP、FSA、游戏运行和编辑器试听不再各建解析器。
> - 旧 v2 仅能在项目打开/迁移边界单向升级；v3 内存和保存产物没有双格式。
>
> ## 2. 文件闭包
>
> | 项目 | 数量 | 字节 |
> |---|---:|---:|
> | MIDI (`kind=music`) | 86 | 767,426 |
> | soundfont (`kind=soundfont`) | 1 | 5,969,788 |
> | 合计 | 87 | 6,737,214 |
>
> - 86 个 MIDI 的来源为 `data/extracted/music/001.mid` 至 `087.mid`，缺 029；工程目标为
>   `assets/migrated/music/NNN.mid`。
> - soundfont 目标为 `assets/runtime/soundfont.sf3`，角色为 `audio.midiSoundfont`。
> - 物化阶段对 87 个目标逐个检查存在性、登记 bytes 和 SHA-256；本轮错误数为 0。
> - catalog 来源统计：86 个 `legacy-migrated`，1 个 `licensed`。受保护二进制不进入 git JSON baseline，
>   但本地迁移可确定性重建。
>
> ## 3. 引用闭包
>
> 权威扫描对象是最终迁移文件，不按文本行数或只扫顶层命令：
>
> | 引用/语义 | 数量 |
> |---|---:|
> | `playMusic` | 1,174 |
> | `stopMusic` | 53 |
> | 旧语义站点合计 | 1,227 |
> | `SceneDef.music` | 36 |
> | `SceneDef.battleMusic` | 81 |
> | 显式 `startBattle.music` | 31 |
> | 唯一音乐 AssetId | 71 |
> | 缺失音乐 AssetId | 0 |
> | 旧 `musicId/battleMusicId` 键 | 0 |
> | 泄漏 `overrideSceneBattle` 标记 | 0 |
>
> 完整 typed walker 共收集 1,327 条资产引用，错误为 0。12 个 catalog 曲目目前未被引用，按规则只报
> `unused-asset` warning；它们仍是有效工程资源，不能由迁移器或编辑器静默删除。
>
> 静态表在实现前只显示 80 个战斗音乐槽。迁移时发现动态 `setSceneOnEnter` 根曾绕过正常 finalize，导致
> s106 的内部 battle 配置标记泄漏；修复后该根先剥离标记并把曲目 37 烘回场景，最终权威数为 81。
>
> ## 4. 运行与编辑闭环
>
> - reforge 的 BGM player 只接受 AssetId，五个具名角色分别承载 soundfont、默认战斗曲、首领胜利曲、
>   普通胜利曲和标题菜单音乐。`audio.openingMenuMusic` 在 PAL 工程绑定 `music.pal.004`，只在“新的故事 /
>   旧的回忆”标题菜单显示期间播放，不写入 `WorldState.audio.currentMusic`。
> - `AssetResolver` 校验 id/kind/path；同一资源 URL 复用，工程切换或 dispose 后统一 revoke。
> - 编辑器“资源 -> 音乐”显示 86 首的名称、AssetId 和路径；导入/改名/替换/删除均走 Command。
>   导入与替换写入 `assets/authored/<sha256>.mid`，替换保留 AssetId。
> - 引用中的资源禁删，未引用资源可删；场景、脚本和共享脚本选择器均从同一 catalog 派生。
> - 6010 浏览器实测两首 MIDI 可依次试听且保持单路；临时改名进入 undo，撤销后恢复；页面无资源错误提示。
> - 本地 v2 -> v3 集成测试覆盖旧别名、引用、MIDI 字节、soundfont、manifest 最后写入和旧
>   `content/music.json` 删除。catalog/blob serialize-reload 与 FSA URL dispose 有独立测试。
>
> ## 5. 迁移与所有权
>
> - `assets/migrated/**` 归迁移器，`assets/authored/**` 归作者，`assets/runtime/**` 保存授权运行资源。
> - MG2 对 catalog 采用 AssetId-keyed 合并与专用所有权校验。作者接管同一 AssetId 后，迁移器不能向其记录
>   拼入 migrated 字段；迁移兄弟记录仍可正常更新和新增。
> - 正式写盘后重新读取源数据再生成；最终 dry-run 为 `writes=0 deletes=0 conflicts=0`。
> - 最终 PAL 迁移规模：829 个托管 JSON 文件、294 个场景、297 个脚本 chunk；资产引用门禁 1,327 条，
>   缺引用/kind mismatch 为 0。
>
> ### A7-0A 勘误（2026-07-16）
>
> A7-0 最初把“现有 Reforge 播放站点只有四种角色”误当成完整需求证明，因而漏掉了尚未实现的标题菜单音乐。
> 反查一阶段全部 `wNumMusic` 赋值后确认：交互式标题菜单使用 track 4，splash 使用的 track 5 不属于本角色。
> 本次新增第五个封闭角色并修复删除保护；教训是“扫描现实现站点”只能描述现状，不能发现整段漏实现的需求。
>
> ## 6. 未闭合范围
>
> A7-0 不能把 A7/R7 整体标成完成。以下仍是明确债务：
>
> 1. A7-1：SFX 与角色/敌人/技能音效的 AssetId、导入替换和运行链。
> 2. A7-2：头像、物品图标、战场图、UI、字形与唯一颜色表，清除 `/baked`、`/ui` 旁路。
> 3. A7-3：瓦片、精灵、战斗/法术动画、RNG、视频，清除数字/path 双轨。
> 4. A7-4：克隆/另存/ZIP 只按 catalog 闭包枚举，legacy 归零并升级 v4；断开仓库资源目录做最终验收。
>
> 这些缺口必须继续由全量闭包报告呈现，不得用 allowlist 或 silent fallback 报绿。
