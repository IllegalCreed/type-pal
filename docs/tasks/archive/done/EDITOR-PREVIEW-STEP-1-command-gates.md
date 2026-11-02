# EDITOR-PREVIEW-STEP-1 — canonical 预览单步的无可见阶段门

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: dev-functional（正式页面最小播放/暂停/单步核验）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是编辑器预览播放/暂停/单步窄修历史卡（2026-09-28）：TEST-CODEX-PLAYBACK-1 补测暴露单步缺陷——script-runner-core.ts:165 阶段入口 awaitGate 与 :304 命令前 awaitGate 令首次 step 被无 onStep 事件的阶段门消费（playback.ts:493-505 只释放 gateQueue 首项、:179 尾安全点门）。

## 目标

按用户确认的交互实现：现有播放按钮切换播放/暂停/恢复（不新增按钮）；普通对话连续自动推进（时长=min(8s,1.2s+每 Unicode 码点 80ms)、按倍速缩放、手动“下一句”可提前）、选项必须手动；单步真实首条、一条一停、无内部空门，显示当前指令序号。

## 范围

- 范围内：editor Playback/PreviewCanvas/SceneScriptWorkspace 与直接回归、reforge ScriptRunnerCore 可选 beforeStep 调试钩子与回归、本卡/看板/索引/回执、shared-script-author-guide 合同同步；对话动作改称“下一句”。
- 范围外：schema/存档/生成工程；删除运行时生产 safe-point 门（保留全部宿主/阶段/安全点门，未接钩子正式路径不变）；命令行高亮（当前未接，不冒称已有——保留公开 activePath+工具栏指令序号反馈）。

## 前提与证据

用户裁决（2026-09-28）确认上述交互；“只换按钮标题即可”的替代解释被既有首次单步 AssertionError 与真实 runner 双层门反证。来源证据：补测批从 SceneScriptWorkspace.tsx:245 构造单条 setPartyFacing current flow，playCanonical({paused:true}) 后公开 step 一次仍 down（预期 left 断言红、非 timeout）。
- 当前状态：done（历史终态）

## 验收

原卡记录：既有 D1 红诊断转绿并纳入正式回归；新增 15 项，editor 定向 91/reforge 相邻 77、11 正控+11 单点业务红；全部 TC 与 lint 2392 文件 0/0/0；完整 check10191→官方 ratchet→保护 2f59be7f 单次严格 fast 9730/730 串行通过；全仓 B47667/63393=75.19%（新增产品分母 32 与覆盖分子 30 分列）。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡不关闭 E2E001/002、音频与完整剧情验证；真实游戏未用预览调试钩子或自动对话政策。无下一位 Agent 提示词。本页治理不重开。

## 历史范围

发现于 2026-09-26 补测批（基点 82863cf2），2026-09-28 用户确认交互并收口；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：阶段门适配修复后单步真实一条一停，经正式 6010 功能核验收口。原卡全文在下方 quote 保全。

## 当时证据

script-runner-core.ts:165/179/304、playback.ts:487-505、PreviewCanvas.tsx:453-472 锚点；codex-playback 批回执；preview-controls.md 最终回执。本页治理未新增执行。

## 当前有效性

historical。预览交互现行形态以当前编辑器代码为准。

## 继任文档

来源批[TEST-CODEX-PLAYBACK-1](TEST-CODEX-PLAYBACK-1-canonical-controls.md)；shared-script-author-guide 为现行预览合同入口。

## 原文保全

固定源 revision `cddbd73c682e3264e5d981ba84affab894986be4`，source SHA `0a1bffe195153e065c3fcb691cd6118a6405930cf6312c043f367a255f9dd7ca`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # EDITOR-PREVIEW-STEP-1 — canonical 预览单步的无可见阶段门
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: dev-functional（正式页面最小播放/暂停/单步核验）
>
> ## 收口（2026-09-28）
>
> Codex按用户确认完成实现：原播放按钮切换暂停/恢复，普通对话自动/选项手选；单步真实首条、
> 一条一停、无内部空门，显示当前指令序号。正式6010功能核验通过，既有D1红诊断转绿并纳入正式回归。
> 新增15项，editor定向91/reforge相邻77、11正控+11单点业务红均通过；全部TC与lint2,392文件
> error/warning/info全零。完整check10,191→官方ratchet→保护2f59be7f的单次严格fast9,730/730文件
> 串行通过；全仓B47,667/63,393=75.19%，新增产品分母32与覆盖分子30分列，另五包基线对象不变。
> Codex核定review→done，单人模式不需额外席位；无下一位Agent提示词。
> [最终回执](../../../../testing/archive/legacy/editor/editor-workflows/preview-controls.md)含浏览器证据/限制/失败修正记录。
> 不关闭E2E001/002、音频与完整剧情验证；真实游戏未使用预览调试钩子或自动对话政策。
>
> ## 本轮准入（2026-09-28）
>
> 用户已确认：不新增按钮，现有播放按钮切换播放/暂停/恢复播放；普通对话连续自动推进，
> 选项必须手动选择；单步执行一条命令后停顿。对话动作改称“下一句”。Codex build allowed。
> 原版/第一阶段N/A（编辑器作者预览新交互，不改游戏交互）；当前二阶段证据是
> PreviewCanvas.tsx:453-470的按钮入口、playback.ts:487-505的手动对话与单步gate队列、
> script-runner-core.ts:165/179/304的结构门和命令门。before→after：所有对话等确认→
> 连播按已解析文本长度倒计时、暂停冻结倒计时、单步不会跨过多个命令或替用户选择。
>
> 最强替代解释“只换按钮标题即可”：已由既有首次单步AssertionError与真实runner双层门反证。
> 采用可选beforeStep调试钩子，编辑器只在真实命令前等待；保留全部宿主/阶段/安全点门，
> 未接钩子的正式运行时路径不改变，不移除取消复核。分支/共享调用各自按可高亮命令步进；
> entry呈现/状态转移/尾安全点不另吃空步。初次单步即放行首条，空flow正常结束。
> 异步移动/等待已开始则完成当前命令后停，不积攒快速连点；对话中的单步确认当前句再放行一条，
> 选项只由明确选择提交。对话阅读时长=min(8s,1.2s+每Unicode码点80ms)，使用实际locale文本，
> 按现有倍速缩放；手动下一句可提前推进，切源/停止清除旧倒计时。
> 当前界面未接命令行高亮，不能声称已有可见高亮：保留公开activePath对应已进入命令，
> 工具栏补当前指令序号（非按钮），音乐/状态等无画面变化指令也提供明确单步反馈。
>
> 白名单：editor Playback/PreviewCanvas/SceneScriptWorkspace与直接回归、reforge ScriptRunnerCore
> 可选命令调试钩子与回归、本卡/看板/索引/回执、已有诊断闭环与反控锚点维护、官方基线。
> 同步shared-script-author-guide当前按钮/预览合同与coverage最近快照。
> 无schema/存档/生成工程改动。
> 先红后绿覆盖首步、分支/共享/状态/entry、取消、安全门、自动对话/暂停/倍速/换源/选项；
> 最小浏览器功能实测，整批串行check→ratchet→保护2f59be7f的strict-fast，静态零诊断后集成。
> 无下一位Agent提示词，Codex独立实施验收；E2E001/002独立保留。
>
> ## 来源与证据
>
> [补测批](TEST-CODEX-PLAYBACK-1-canonical-controls.md)从正式 `SceneScriptWorkspace.tsx:245`
> 调用域构造合法、单条setPartyFacing的current flow。`Playback.playCanonical(...,{paused:true})` 后，
> 公开step一次仍down；预期left的AssertionError已复现，非timeout。源码起点82863cf2。
> 复现命令/原始日志见[批回执](../../../../testing/archive/legacy/batches/codex-playback/README.md)。
>
> 根因锚：`script-runner-core.ts:165`阶段入口awaitGate、`:304`命令前awaitGate，
> 而`playback.ts:493-505`只释放gateQueue首项；第一次step被无onStep事件的阶段门消费。
> 末尾`:179`还有safe-point门。`PreviewCanvas.tsx:464-472`初次单步点击仅以paused启动，
> 后续才调用step，所以UI控制不能绕过此问题。`playback.ts:493`说明的是“一条命令”。
>
> ## 历史待定实施边界（本轮准入已确定）
>
> 仅修编辑器单步与真实runner阶段/命令边界适配；不得直接删除运行时生产safe-point门，
> 不得影响游戏取消/提交协调，不能为让测试绿擅改全局runner gate合同。
> 进入build前核阶段/分支/状态机/entry/confirm/共享调用的步进合同，明确命令高亮是否应
> 与已提交动作同步；至少一个隔离浏览器按钮闭环。当前没有产品改动，不算已修、不随补测卡done关闭。
> 三签退休，后续由Codex核准/实施/验证；不等待GLM。
<!-- original-source-quote:end -->
