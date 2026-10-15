# ARCH-REGRESSION-LAB-GLM-1 — Codex 二轮独立接收

Governance Owner: Codex（history_cards_a；作者候选，待根与非作者独立接收）
Last reviewed: 2026-10-16
Template: audit-report-v1 / 1.0.0
History overlay: archive-record-v1 / 1.0.0

原文未设显式 Owner / Status 元数据字段；治理负责人不冒作原字段。原始标题、日期原句、候选身份与结论完整保留在历史层。

## 审计问题

核33个候选全绿与回执、机账、最终树是否同一证据集合；同时核新断言是否已到真实业务消费者。

## 范围与证据

该轮九文件33/33及启动单针、六张截图；原生产冻结与中途99f1fd08主线合入须分开归因。贡献增量99f1fd08..候选只在lab，不把授权main带入的10文件+477/-9判为GLM越界，也不声称原起点到最终树零diff。

该篇一手文档为本页完整保留的29行源；本轮sourceRevision为fd5042551af1170d99af93218aa6a43d7f645f69，Git blob 4e55fecccced52952e0457977c359c0ba937615b。原执行结论仅由旧正文和其producer承载，本轮只作内容治理。

## 发现

实账40=38 candidate-green/1 existing-proof/1 blocked，README/receipt仍写39=36/1/1/1，转述另报39=37/1/2。G02实际rerender与G04 entered改善，但仍缺会话业务选区、旧草稿确认/undo、真实tick等完整结果。

截图账只有16位前缀；verify会回写results.json，未验真实fullName/status/cwd/exit。React act warning原样保留，不能当业务通过或今天零诊断；该轮没有独立TS配置/结果。

## 结论

整批counter，不转正式测试、不计官方覆盖率。33绿与启动反控仅是该候选机械事实；账本矛盾和caller缺口不因总数上升而闭合。

## 整改与复核

当轮提出的后继返工要求（历史记录，不恢复当前执行）：三轮必须对最终执行JSON核精确测试身份，修回执与只读核验器，并分别登记起点冻结/主线合入/贡献范围。不得把两种39口径选一当正确，也不得为消除反证只改标题。

## 原标题入口

以下同名标题保留历史链接入口，均指向本页固定源；不恢复旧执行授权。

### 逐组裁决

原文第5行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 机械核验与门禁

原文第22行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

## 历史范围

2026-09-25；2026-09-25/26 第二阶段跨 editor/content/migrate 与 G07 第一阶段消费者的隔离准备包；不是本轮产品审计。原候选 af43311ad8eb470b0d72552264c981339c5fc8d3。本页不是重新运行或新的产品build，旧命令/交接提示只供溯源。

## 原始结论

下列原文完整逐字节引用；去除每行引用前缀可回读固定Git blob，未改原数字、中文、状态、链接或指令。

<!-- I-SOURCE-BEGIN -->

> # ARCH-REGRESSION-LAB-GLM-1 — Codex 二轮独立接收
>
> 2026-09-25；候选 `af43311ad8eb470b0d72552264c981339c5fc8d3`。结论：**counter，不转正式测试，不计官方覆盖率**。本轮确有 33 项候选测试全绿、启动单针业务红；但交付总账与最终树不一致，数个组仍未进入其声称的目标调用链。保留以下窄证据，不以作者自验充独立证明。上一轮反证见[首轮复核](architecture-regression-lab-codex-review.md)。
>
> ## 逐组裁决
>
> | 组 | 本轮可保留证据 | 未达正式转正的直接反证 |
> |---|---|---|
> | G01 | 笔划正常提交及 cancel/lostcapture/blur 零写入；取消平移后还能画笔（`g01-map-gesture.test.tsx:283-300`） | G01-05 `:257-280` 只计通知，不核实际选区；G01-06 不核平移 view 的取消结果。只接收窄例，不接收完整手势组。 |
> | G02 | G02-01/02 活跃笔划换会话/地图后比较两侧 tiles | G02-03 `g02-map-scope.test.tsx:97-117` 虽已真换会话，但只查通知文案，不查选区或新会话状态。 |
> | G03 | 挂载命令上屏、旧会话卸载后 fail-loud | `g03-app-lifecycle.test.tsx:198-209` 的 Cmd+S 只比 `document.body.textContent`，无法检出已卸载后错误保存 IO；没有 derivedStore worker、媒体/试玩 owner 的实测收口。 |
> | G04 | 弹层 entered 后确认恰一笔、关闭零笔（`g04-script-draft.test.tsx:69-110`） | `:55-67` 仅重渲染 body，未触发真实 session undo/redo；`:113-123` 外部替换后只数行，未确认旧草稿不能写回新对象。 |
> | G05 | `stop` 清 mode/path 的局部行为 | `g05-playback-scope.test.tsx:58-72` 新源后立即再次 stop，假时钟不推进 Playback 的 `tick()` 计时器（生产 `playback.ts:597-652`），不能证明旧源 wait 不复活；`:90-99` 手动设 `onUi=undefined` 不等于工作区卸载；`:27-41` 仍用 `as unknown as AuthorScriptFlow` 遮盖 fixture。 |
> | G06 | 合法 hook 流与非法叶的局部 validator 结果 | `g06-validation-crosscalls.test.ts:91-108` 标题称 enemy→author，实调 `checkBaseAuthorCommands`，没有经过 `checkEnemyHookFlow` / `enemy-script.ts:598`；多处 `as never`，七臂跨调用未证。 |
> | G07 | 背包实例隔离与装备 getter 的局部正控 | `g07-core-boundaries.test.ts:12-23` 的 map getter 仍从 scene-system 导入，未调 event-system；`:36-42` 直接写装备槽并读 getter，没有调用 battle opcode（产品 `battle-opcodes.ts:343`）。 |
> | G08 | 重复调用/输入保真、globalRoots 计数的局部证据 | `g08-conversion-isolation.test.ts:49-60` 声称 sound 回调调用/产物入账，实只比较两份 scriptChunks；`:72-81` 的“异常路径”不抛错且 `gapCount===undefined || >=0` 对缺口无鉴别力。 |
> | V01 | 三图真实显示角色名初始→修改→undo | 截图不能证明 Enter 与 blur 仅提交一次、焦点恢复和其余五类表单的键盘合同；图中多处角色图像缺失，不能作为资源正控。 |
> | V02 | `V02-02` 的旧 PanelResizeHandle 三组断言可按 existing-proof 保留 | `v02-01` 是 720px 角色页，不是非空场景/地图/脚本工作区；无实际分隔条/zoom 操作证据。 |
> | V03 | 无效 objectId 深链归一化的窄可见事实 | 与一次性读取失败、A→B 迟到、错误→重试恢复三态无关。 |
> | V04 | `V04-01` 可改判为脏页 `beforeunload` 预期中止；`V04-02` 可记缺合法精灵二进制的环境阻断 | `results.json:731` 的 fullName 仍写“被覆写回 actor”，`:758` 的 attribution 仍称确切机制待定，README/receipt 仍写旧 reproduced-defect；没有合法资源正控，也没有 fit/1:1/替换矩阵。 |
>
> ## 机械核验与门禁
>
> - 候选 `pnpm exec vitest run --config docs/testing/archive/legacy/batches/glm-architecture-regression-lab/configs/candidates.vitest.mts --reporter=dot`：9 文件 **33/33**，exit0（G03 React `act` 警告未作为业务通过证据）。`node tools/red-control.mjs`：`detected`、exit1/1执行/1失败/AssertionError/见证1/产品 hash 不变；runner 生成的本席临时目录已移至 `/tmp/type-pal-arch-lab-red-hWsiwj`，候选树恢复干净。随后全目录 Biome 20 文件通过。
> - `results.json` 实有 **40 条：candidate-green 38 / existing-proof 1 / blocked-environment 1**；README 与 receipt 仍报历史 **39 条：36/1/1 reproduced/1 blocked**，与交付说明的 **39 条：37/1/2** 又不一致。G04 新增第 40 条未同步人类回执。此项不是舍入差，不能签整包 accept。
> - `git diff a3ceaf05..HEAD --name-only` **不在白名单内**：中途合入主线 `99f1fd08` 带入其它文档/工具。`git diff 86e928b5..HEAD -- packages/ scripts/` 亦非空（10 文件、477 增/9 删）；可归因于主线合入而非 GLM 实施，但不能继续声称最终候选树对原冻结零 diff。按合入点 `99f1fd08..HEAD` 算，GLM 自身增量仅实验目录且 packages/scripts 零 diff；后续回执须写明两个口径。
> - 六张截图都存在，本席逐张目视，当前完整 SHA-256 的前 16 位分别与 `results.json` 中 `sha256_16` 相符；机账**未保存完整 hash**，不能声称“完整 SHA 与机账一致”。`tools/verify.mjs:55-74` 会回写并格式化 `results.json`，且只验文件存在及 16 位前缀，不核 Vitest JSON fullName/status/执行数；因此本席未拿它作为只读独立见证。候选目录无独立 TS/TSX 类型检查配置/结果。
>
> 返工只改 GLM 实验目录及其回执/机账，不动产品、正式测试、基线或其它 Agent 的结论。先纠正账与冻结口径，再让各组标题/状态严格等于实际到达的调用链；完整组做不到可降为窄候选/待证，不靠新绿例凑齐。V04-02 可继续保持环境阻断，但不得说媒体矩阵已经验证。任务保持 draft，未开放 build/done。

<!-- I-SOURCE-END -->

## 当时证据

原文身份为 4e55fecccced52952e0457977c359c0ba937615b / SHA256 3138f03fcb3880767e9a5d1017edd0aef4acc063a847749db02069ce5ad725a3。源中2026-09-25日期及 af43311ad8eb470b0d72552264c981339c5fc8d3 为历史候选引用，具体原句以完整引用为准；不推测未提供的环境或SHA。原脚本、临时JSON和截图路径的当前可用性本轮未检查，保留unknown；没有新raw/浏览器/coverage执行。

GLM候选贡献与Codex当轮复核按原文分工。相邻轮与[最终回执](architecture-regression-lab-completion.md)是不同revision的producer，不能相加运行数或把后继修复倒写成这一轮已通过。

## 当前有效性

仅对原2026-09-25候选的审查结论有效：整批counter，不转正式测试、不计官方覆盖率。33绿与启动反控仅是该候选机械事实；账本矛盾和caller缺口不因总数上升而闭合。 本次只形成模板候选，未获独立accept，不标I14完成；机器JSON仍未迁移。历史警告、误归因撤回和未证轴均留原时点，静态治理不代替现行[测试质量合同](../../governance.md)。

## 继任文档

[直接继任](architecture-regression-lab-codex-r3-review.md)承接后续时点；[历史原文目录](README.md)与[合并索引](../architecture-regression-lab-history.md)只负责导航。历史授权/最终范围回到[原任务卡](../../../ops/archive/tasks/done/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)，当前新工作依[现行工作流](../../../ops/agent-workflow.md)另核准入；无本次产品执行授权。
