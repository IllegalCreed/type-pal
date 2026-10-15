# ARCH-REGRESSION-LAB-GLM-1 r7 独立接收

Governance Owner: Codex（历史文档治理；非作者独立语义验收后根接收）
Last reviewed: 2026-10-16
Template: audit-report-v1 / 1.0.0
History overlay: archive-record-v1 / 1.0.0

原文未设显式 Owner / Status 元数据字段；治理负责人不冒作原字段。原始标题、日期原句、候选身份与结论完整保留在历史层。

## 审计问题

核本轮真实测试变动后哪些合同已补上，哪些仍被弱断言掩盖。

## 范围与证据

相对33df9378有11个candidate/fixture文件+597/-191；新鲜32/32、40账38/1/1、启动反控、类型/docs/diff原通过。最终提交candidates-exec.json未格式化，目录Biome exit1；六张旧图没重拍。

该篇一手文档为本页完整保留的32行源；本轮sourceRevision为fd5042551af1170d99af93218aa6a43d7f645f69，Git blob 78306f9c4266f4c8d4850310c410dedaefb5a5ab。原执行结论仅由旧正文和其producer承载，本轮只作内容治理。

## 发现

G02换独立会话后实际删选区并比较两地图、G04外部换body后旧草稿零写回/重开新稿已可接收。G01仍缺平移view。

G03未断言save-state committed，以300ms静默代事务完成；G05没有确认旧wait进入且stopSpy可能由启动已调用而假绿。G06只enemy方向、G07缺装备脚本中间入口、G08缺options/中段异常；V操作矩阵仍未证。

## 结论

整批counter，G02/G04当前候选合同accept，G01/G06/G07/G08只部分accept。原任务draft与不正式接入不变；32绿不补足被明确pending的轴。

## 整改与复核

当轮提出的后继返工要求（历史记录，不恢复当前执行）：八轮定点补G03事务终态、G05真实挂起与卸载前后stop增量，配单点反控；修最终JSON格式。其它组不补剩余轴就收窄，旧图无需重复拍来冒充新矩阵。

## 原标题入口

以下同名标题保留历史链接入口，均指向本页固定源；不恢复旧执行授权。

### 机械复跑

原文第5行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 逐组裁决

原文第12行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 收窄返工范围

原文第26行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

## 历史范围

2026-09-26；2026-09-25/26 第二阶段跨 editor/content/migrate 与 G07 第一阶段消费者的隔离准备包；不是本轮产品审计。原候选 9a197825（内容）/fb251df8（登记树）。本页不是重新运行或新的产品build，旧命令/交接提示只供溯源。

## 原始结论

下列原文完整逐字节引用；去除每行引用前缀可回读固定Git blob，未改原数字、中文、状态、链接或指令。

<!-- I-SOURCE-BEGIN -->

> # ARCH-REGRESSION-LAB-GLM-1 r7 独立接收
>
> 2026-09-26；候选内容 `9a197825`，登记树 `fb251df8`。结论：**counter，隔离候选暂不转正**；任务保持 `draft`，不计入官方覆盖率、不合入产品或正式测试。GLM 是候选贡献者，以下是 Codex 独立复核。
>
> ## 机械复跑
>
> - `33df9378..fb251df8` 的 candidates/fixtures 有 11 文件、`+597/-191`，本轮确有真实测试改动。候选工作树干净，HEAD 与远端一致。
> - 新鲜 JSON 写入 `/tmp/codex-glm-r7-candidates.json`：32/32；`tools/verify.mjs` 对该 JSON PASS，40 条账为 38 candidate-green / 1 existing-proof / 1 blocked-environment；`tools/red-control.mjs` 为 `detected`，exit1、1 执行、AssertionError、产品 hash 未变。`tsc --project configs/tsconfig.json --noEmit`、`node scripts/docs/check.mjs`、`git diff --check` 均 exit0。
> - **目录 Biome exit1**：最终提交树中的 `configs/candidates-exec.json` 是未格式化的一行 JSON；独立运行 `pnpm exec biome check docs/testing/archive/legacy/batches/glm-architecture-regression-lab` 报该文件 formatter 错。GLM 回执声称目录 Biome exit0 与最终树不符。新鲜执行 JSON 应放临时目录，或在提交前格式化并重新核验。
> - 六张旧视觉截图由 verify 核完整 SHA；本轮未重拍，也不能据此将 V01–V04 未执行矩阵视作已证。
>
> ## 逐组裁决
>
> | 组 | 本轮可接收的窄证据 | 完整组裁决 |
> |---|---|---|
> | G01 | `g01-map-gesture.test.tsx` 的取消后无选区预览、正控选区后删除实际 session 瓦片，已由新断言及 32/32 执行支持。 | **部分 accept**；平移 view 变化仍由回执自列 pending，不作为完整组转正。 |
> | G02 | `g02-map-scope.test.tsx` 用独立深拷贝会话，并在新会话选区删除后比较新旧地图，闭合上一轮“只查通知/DOM”的反证。 | **accept 当前三项候选合同**，正式接入时仍需去重与官方门禁。 |
> | G03 | `g03-app-lifecycle.test.tsx:207-249` 确实从 `initialDir` 进入、Cmd+S 后检查 `manifest.json` 和 `content/` 写闭，卸载后检查零新增写闭。 | **counter**：注释/回执声称“save-state 终写”，实际没有断言 `.type-pal/save-state.json` 写闭或 `phase=committed`；以连续 300ms 静默代替事务完成。不能称完整保存闭环。 |
> | G04 | `g04-script-draft.test.tsx:113-151` 的旧草稿翻转、外部换 body、弹层关闭且零写回、重开新草稿确认写回两行新 body，闭合上一轮弱例。 | **accept 当前四项候选合同**，正式接入仍待统一门禁。 |
> | G05 | 新 `ScriptStage[]` 输入及真实 `CanonicalSceneScriptWorkspace` 挂载是进展。 | **counter**：`g05-playback-scope.test.tsx:61-71` 新源 80ms 到 `done` 即停循环，未保证推进超过旧源余下 300ms，且旧 `wait` 已进入没有见证；“旧尾命令不复活”未证。`:184-220` 只要求 `stopSpy` 曾调用，而生产 `Playback.playCanonical` 在 `playback.ts:299` **启动时就调用 stop**，`SceneScriptWorkspace.tsx:191-194` 挂载/换源 effect 也调用 stop；即使删掉卸载 cleanup，该断言仍可绿。须在卸载前取调用数/实例状态，卸载后验证增量及旧 pending 收口。 |
> | G06 | `g06-validation-crosscalls.test.ts:45-141` 改走真实 `validateEnemies`、合法 `EnemyDef` 无强转、非法叶 path 与输入深等，可保留。 | **部分 accept**；当前用例均从 enemy 定义入口进入，未覆盖工作包所列 author→enemy choreography 的另一个方向及七入口代表组合。回执“全组闭环”须收窄或补测试。 |
> | G07 | `g07-core-boundaries.test.ts:37-49,64-83` 的 event-system 对话历史按 scene 图号入账，以及 0x30 消费装备派生 getter，确实到达先前缺失的消费者。 | **部分 accept**；工作包还列装备脚本经 event 表执行，本轮仍由测试直接调用 `writeEquipmentEffectField`，该中间调用链未证。 |
> | G08 | `g08-conversion-isolation.test.ts:69-102` 的 0x47 sound 回调调用/产物和非法 opcode gap 见证成立。 | **部分 accept**；工作包列出的 `globalRoots/options` 差异见证、异常路径不污染下次调用仍未证；gap 不抛并非异常路径。 |
> | V01–V04 | 六图及 V04-01 预期 beforeunload 中止、V04-02 环境阻断分类维持既有窄事实。 | **未转正**；六类表单键盘、非空工作区分隔条、失败→重试/A-B 乱序、合法媒体操作矩阵仍在回执中明确未证。不得用 40 条账本总数替代这些操作链。 |
>
> ## 收窄返工范围
>
> 1. 先修最终树 Biome 与回执不一致，重新跑目录门。
> 2. G03 钉住真实保存事务终态；G05-02 钉旧 wait 已进入、推进越过旧窗口；G05-04 钉卸载前后 stop **增量**，最好分别加单点反控证明鉴别力。
> 3. G06/G07/G08 若不补剩余原工作包轴，就在候选/机账/回执中明确降为窄合同，不宣称全组完成；V01–V04 维持未证，不必重拍旧图。
>
> 本轮不改 GLM 候选语义、不代签、不标 done。无 Kimi 提示词（用户豁免）。

<!-- I-SOURCE-END -->

## 当时证据

原文身份为 78306f9c4266f4c8d4850310c410dedaefb5a5ab / SHA256 852acc49cb06dc6fcc39fb6ad0fb6530efafebcd8358561be48fd37c7187fc48。源中2026-09-26日期及 9a197825（内容）/fb251df8（登记树） 为历史候选引用，具体原句以完整引用为准；不推测未提供的环境或SHA。原脚本、临时JSON和截图路径的当前可用性本轮未检查，保留unknown；没有新raw/浏览器/coverage执行。

GLM候选贡献与Codex当轮复核按原文分工。相邻轮与[最终回执](architecture-regression-lab-completion.md)是不同revision的producer，不能相加运行数或把后继修复倒写成这一轮已通过。

## 当前有效性

仅对原2026-09-26候选的审查结论有效：整批counter，G02/G04当前候选合同accept，G01/G06/G07/G08只部分accept。原任务draft与不正式接入不变；32绿不补足被明确pending的轴。 2026-10-16本篇文档迁移已获非作者history_cards_c_tail语义验收，根Codex接收；配对r10 JSON的1.4原生保真pilot另获独立验收。这只接收文档与机器格式，不改变原历史counter或授产品、运行信用。历史警告、误归因撤回和未证轴均留原时点，静态治理不代替现行[测试质量合同](../../governance.md)。

## 继任文档

[直接继任](architecture-regression-lab-codex-r8-review.md)承接后续时点；[历史原文目录](README.md)与[合并索引](../architecture-regression-lab-history.md)只负责导航。历史授权/最终范围回到[原任务卡](../../../ops/archive/tasks/done/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)，当前新工作依[现行工作流](../../../ops/agent-workflow.md)另核准入；无本次产品执行授权。
