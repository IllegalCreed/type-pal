# 场景删除引用保护 · 实现与验证

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 EDITOR-SCENE-REF-GUARD-1（r1/done）实现与验证：实现前基线 830db139（与设计冻结 3bc20273 一致）、Owner Codex；候选 83598cc4 单文件 adapter 修复+22 项正式回归+最小真实 App 功能验证；三席 accept 无返工，2026-09-19 done 归档。

## Scope

唯一生产文件 project-reference-adapters.ts：command 白名单接入 selectSceneHooks（收 inherit/disabled scene 边；复合边→父 scene 桶映射不双收）；transitionVisits 每 state.next 根交现有 typed collector（只转 scene 目标、复用 source/where/deletePolicy/locator）。回归：scene-guards 12 项（六 command owner、混合/双 use 去重、四类状态机 owner、输入保真、删除集合内部豁免）+deletion-workflow 10 项（三类拒删不变、去引用→删除→真实 serializer→loader 重开→undo/redo、三类自引用可删、冷暖 guard 一致）。先红后绿：未修复 14 业务红/3 正控绿。三针反控（漏 selectSceneHooks 准入/漏 transition 接线/重复 use-hook 边）。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| - 定向+反控+真机+统一门 | 22 项+相邻 8 文件 108/108、typecheck；三针各 exit1 指定 AssertionError；真实 App 浏览器操作（6010、1280×720：3 处阻断→删除两条正文指令+改条件→0 处→删除 2→1→撤销恢复）；完整 check 7442 项、ratchet 6954 项/617 源、保护 830db139 单次严格 fast 提升 0 | Codex | 实现令分母 +6 行/+6 语句/+4 函数/+3 臂、命中 +15/+17/+6/+21，不把全部增长叫纯补测 | 失败记录如实：fixture not/of 误写、locator 期望 stage→step、PAL rows 25188→25189 census 联动（s172 双 disabled s182 依赖）正确修复非抖动 |

## Results

历史结果（原卡时点，本页未复跑）：

done：只关闭 D-02 三漏边；D-06/D-07、G-R06、缓存、技能试玩、GLM 补测与完整 E2E 保持各自归属。

## Evidence

- 证据路径：本验证正文（quote 保全）；/tmp/type-pal-scene-ref-build.CyLL0V/ 与生成脚本在 quote 提及。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 场景引用保护 | 2026-09-18/19 | adapter+22 项+3 针+真机+统一门 | done（三席 accept 83598cc4） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/authoring-and-runtime 的场景引用保护；固定来源与 source SHA 见下方保全节。

## 原始结论

done：只关闭 D-02 三漏边；D-06/D-07、G-R06、缓存、技能试玩、GLM 补测与完整 E2E 保持各自归属。

## 当时证据

真机四步操作、失败记录、质量门数字在 quote 保全。

## 当前有效性

historical。数字为收口时点。

## 继任文档

当前结论归 EDITOR-SCENE-REF-GUARD-1 完成卡。

## 原文保全

固定源 revision `3dc90ad8f6dde5a7ddcafc6b749b61dd53152751`，source SHA `1026169f5d5465514d34b4f41961786b9eda625ad3a74b2772874bac53967405`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 场景删除引用保护 · 实现与验证
>
> 任务：[EDITOR-SCENE-REF-GUARD-1](../../../../../ops/archive/tasks/done/EDITOR-SCENE-REF-GUARD-1-scene-deletion-reference-closure.md)，r1/done。
> 实现前基线`830db139`（产品与设计冻结3bc20273一致）；Owner Codex。GLM运行时五组补测为另一独立分支，不计入本卡。
> 当前：单文件adapter修复、22项正式回归及最小真实App功能验证完成；最终check/ratchet/受保护单次strict-fast全绿。
> 候选`83598cc4e58828ff5ec586c1491da685d564c85c`；三席accept、无返工，2026-09-19用户要求继续推进，Codex核候选零漂移后done归档。
> 收口未改生产/测试/基线，沿用已完成质量门与最小功能验证，不要求重复签字。基线正确口径2322→2344、旧219文件保留，与本回执原记录一致。
>
> ## 实现边界
>
> 唯一生产文件`packages/editor/src/core/project-reference-adapters.ts`：
>
> - command白名单接入selectSceneHooks，收inherit/disabled的scene边；具体scene-hook仍由既有scheme adapter拥有。
>   有use时沿用复合边→父scene桶映射，不额外收一条父边/同一hook边。两槽混合与双use均有精确计数回归。
> - transitionVisits每个state.next根交现有content typed collector，只转scene目标；命令body与entity-address域不重复扫描。
>   复用source/where/deletePolicy和script-owner locator，不新增公共类型/递归器，不改schema、保存校验或删除事务。
> - 冷provider、诊断collector、派生worker均走同一snapshot构建器。自己/同删除集合内部来源仍豁免，外部来源仍阻断。
>
> ## 正式回归与负控
>
> 新测试两文件22项：
>
> - `project-reference-scene-guards.test.ts`12项：六个command owner、混合use/双use的复合边去重，
>   四类状态机owner（两个scene槽、entity trigger/auto）下all/any/not/嵌套transition与command body不重复；
>   完整target/where/locator/owner/relation/deletePolicy及输入保真、删除集合内部豁免。
> - `scene-reference-deletion-workflow.test.ts`10项：三类拒删不变/零新增历史/保存结果不变；
>   去引用→删除→真实serializer输出经正式loader重开→undo/redo（完整author scenes逐值相等、删除路径兑现、未改资产字节保留）；三类自引用可删；
>   三类真实derived store/worker init与patch、撤销重做后冷暖一致。保留旧空暖视图时，当前冷guard依然拒删。
> - fixture来自真实buildBlankProject→内存FSA→loadCurrentProjectFrom/loadAllAuthorScenes→真实两session/Coordinator；
>   主输入先过正式保存校验，无loader/validator/collector替身。typed当前物品补齐全部必填字段，未使用旧scene.onEnter。
>   重开验证是序列化文件集→内存目录→正式loader，不冒称OS写盘或完整Root打开/保存E2E。
>
> 先红后绿：未修复adapter下最终合法fixture为**14业务红/3正控绿**；修复后最初17全绿，补真实worker与自引用矩阵后共22项。
> 定向连相邻8文件**108/108**，editor typecheck通过；初始fixture/断言订正过程见下方失败记录，不把它们算产品红。
>
> 可重建隔离工具：[scene-reference-guard-mutants.mjs](../../../../domains/editor/authoring-and-runtime/tools/scene-reference-guard-mutants.mjs)。
> 一正常对照+三条单点变异：漏selectSceneHooks准入、漏transition接线、重复use-hook边。
> 每次22项实际执行；正常全绿、变异须exit1且指定新测试AssertionError红。marker在函数执行体，不是模块load日志；
> JSON核精确测试标题，拒TypeError/超时/未处理异常，判据含混合错误自测；产品sha256前后不变。
>
> ```sh
> pnpm --filter @type-pal/editor exec vitest run src/core/project-reference-scene-guards.test.ts src/core/scene-reference-deletion-workflow.test.ts src/core/project-reference.test.ts src/core/project-reference-adapters.test.ts src/core/project-reference-adapters.boundaries.test.ts src/core/scene-lifecycle.test.ts src/core/project-diagnostics.test.ts src/core/editor-derived-store.test.ts --no-file-parallelism
> pnpm --filter @type-pal/editor run typecheck
> node docs/testing/domains/editor/authoring-and-runtime/tools/scene-reference-guard-mutants.mjs
> ```
>
> 原审计probe未修改；它们断言“缺陷存在”，不能再用修复后旧probe绿作为准入条件。
>
> ## Codex最小功能验证（dev-functional）
>
> 运行[准备脚本](../../unresolved-tools/scene-reference-guard-visual.mjs)，复用既有6010 dev服务，打开
> `http://localhost:6010/build/scene-ref-verify.html`。脚本仅生成gitignored的packages/editor/build两个验证入口文件。
> 真实App、真实derived worker、真实命令/历史、当前合法seed；使用内存测试工程及sandbox身份，未改用户/PAL工程，未注入引用结果。
> 不是Root/原生文件夹打开端到端测试；不是视觉美术验收。生成器可重建本次入口，不需修改生产文件。
>
> 本席实际浏览器操作（1280×720，2026-09-18）：
>
> 1. 切换到“目标场景”→引用：显示**3处阻断**、两条正文.scene和一条next.cond.scene；面板无重叠，截图已在本会话浏览器工具记录。
>    更多操作的“删除当前场景”为disabled，不能先删后报保存错误。
> 2. 点击转换条件引用：切至start/进场脚本/来源方案/连续流程“检查场景”，目标选择器显示target。
>    点击正文引用另验精确定位状态提示“第1条指令”，对应treeitem获得焦点；转换只承诺owner级定位。
> 3. 在真实脚本表单删除两条正文指令，并把转换条件目标改为start；再选target，引用**0处**、删除入口可用。
> 4. 确认删除，场景总数2→1；工具栏撤销恢复target，选项重新出现。继续撤销三次修改，target引用数0→1→2→3，正文定位依然可用。
>
> 仅删除了隔离内存工程中的target，已通过撤销恢复；没有任何真实文件删除。当前实现不新增UI按钮、布局或文字。
> 完整创作保存/重开及OS目录链继续归R4，本卡代码回归已核serializer/loader；不以本次小样替代E2E。
>
> ## 质量门及失败记录
>
> 最终串行质量门全部exit0：
>
> 1. `pnpm check`：**7442项**，七包typecheck/test及文档工具20/coverage工具17全绿；lint无error，48warnings/11infos为未改既有文件。
> 2. `pnpm coverage:ratchet`：**6954项/617生产文件**，editor **2344项/221测试文件/219生产文件**。
> 3. `TYPE_PAL_COVERAGE_BASE_REF=830db139 pnpm coverage:fast`：**单次通过**，相对新基线提升0项，无重试择绿。
>
> 全仓行49138/69088（71.12%）、语句54476/78938（69.01%）、函数10284/14516（70.85%）、分支38996/62031（62.87%）。
> editor行22226/27834（79.85%）、语句24695/31845（77.55%）、函数6150/8106（75.87%）、分支19195/27579（69.60%）。
> 全部219个editor旧fast测试文件identity/计数、617生产清单/scopeDigest、其它六包完整基线对象不变；
> 本轮新增实现令分母+6行/+6语句/+4函数/+3臂，命中+15/+17/+6/+21，不把全部增长叫纯补测；未改统计范围/阈值。
> GLM运行时测试尚未接收，不计入6954；本次未跑coverage:full或完整E2E。
> 旧版本兼容审查：pass；生产无版本分支/旧upgrader/fallback改动，新fixture只消费当前canonical。
>
> 本席过程日志`/tmp/type-pal-scene-ref-build.CyLL0V/`：
>
> - 首次fixture的not误写of（当前应cond），typecheck/loader拒；物品先缺buyPrice等字段，随后补完整typed AuthorItemData并经正式loader确认。
>   `red.log`、`red-validated.log`等早期失败不作产品鉴别证据，最终`red-final.log`才是14条纯业务红。
> - 首次绿跑4条locator期望误写stage，按当前ScriptCommandContainer修为step/section/stepId，不修改正确产品locator。
>   `green.log`为17+相邻绿，`green-final.log`为最终22+相邻108绿；typecheck-final.log通过。
> - 负控初稿最后一针钉名遗漏Vitest给$label加的单引号，工具按fail-closed拒绝接收；依据实际JSON标题精确订正，
>   未放宽判据、未改测试期望；最终四跑结果另记mutants-final.log。
> - 最小UI入口初次传了非规范workspaceId，身份guard正确拒绝；改用真实createSandboxWorkspaceContext生成身份后完成全部操作。
>   这属于验证入口准备错误，不是产品缺陷；最终入仓生成器已使用合法构造器默认身份。
> - 首次完整check被既有PAL引用总数钉住：rows25188→25189。直接核s172.json:1435双disabled的s182依赖，
>   只更新project-reference.pal.test.ts的rows/targetEdgeIds各+1并加该新增边的完整业务断言；hook293/behavior4459等原断言不变。
>   是正确修复后的census联动，非随机抖动；不修改工程数据，不靠重跑多数通过。
> - PAL定向与第二次完整check通过后，最终收口加强重开例的完整正文/资产字节/删除路径断言；22项及typecheck再次通过。
>   为避免将前次检查覆盖面冒称最终测试树，发布前串行门另写check-release/ratchet/strict-fast日志，不复用早期失败或弱断言日志。
>
> ## 后续
>
> 本卡通过后只关闭D-02对应三漏边。D-06/D-07、G-R06未知根字段、缓存、技能试玩、GLM补测与完整E2E保持各自归属。
> 本卡终审与收口已完成。GLM运行时测试返工及其它审计缺陷仍独立推进，不因本卡完成而关闭。
>
<!-- original-source-quote:end -->
