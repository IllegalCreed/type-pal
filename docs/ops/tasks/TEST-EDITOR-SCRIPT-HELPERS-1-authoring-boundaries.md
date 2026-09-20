# TEST-EDITOR-SCRIPT-HELPERS-1 - 脚本与内容编辑辅助补测（TB-07）

Status: review
Phase: phase2
Capability: 已有合同补测，不改变能力地图
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-editor-script-helpers-r1

Revision: r1，2026-09-19。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`，策划树 `4473c367`。
完整族账/去重/唯一白名单：[工作包](../../testing/glm-editor-script-helpers.md)。共同规则与合并交接：[七批统一审核](../../testing/glm-coverage-remaining-review.md)。


## 当前接收复核（Codex，2026-09-20，源10cc9d4d）

本批收窄counter全部闭合，已按白名单集成；当前review，待统一check/ratchet/严格fast后本席签accept。
定向21项、原负控、包tc和完整自有文件Biome均通过；C0精确唯一判据/C1格式与回执已关闭，不重开旧有效断言。
见[本轮独立接收](../../testing/glm-nine-final-review.md)与[机账](../../testing/glm-nine-final-evidence.json)。
GLM是测试贡献者；待统一质量门后交Kimi终审，当前不代签、不标done。

## 上轮返工复核（历史）（Codex，2026-09-19，b86f235d）

**counter，保持rework**。原七针/五夹具已关闭；公共C0精确唯一目标和C1最终树格式/回执仍未满足。
定向21项、原3+7跑与包tc通过；本批Biome 10文件/4 errors/1 warnings，exit1。
R07-nonempty-redo：错误清redo仍MISSED；state保真/default/清理已修。
见[本轮复核及提示词](../../testing/glm-nine-rework-review.md)与[机账](../../testing/glm-nine-rework-evidence.json)。
不合并、不更基线、不转Kimi、不代签、不标done；设计保持，Mimosa不参与。

## 首轮接收裁决（历史）

用户本轮明确批准九批先行实施、Codex恢复后统一接收；认可本批排期例外，不因旧两槽限制追溯判违规。设计签字保持，不重签。
**本席独立结论counter，任务rework，未合入正式测试/产品、不更新官方基线、不转Kimi终审。**
定向17项、原3对照+7针、包typecheck均通过；
Biome实测9文件/2 errors。
见[统一复核 TB-07](../../testing/glm-nine-intake-review.md#tb-07)与[机器接收账](../../testing/glm-nine-intake-evidence.json)。
公共C0判据误收适用，C1全部新增文件格式/回执不符也须修复；具体最小返工如下。

- **R07-1，三个实际正控被正式guard拒绝**：`author-command-edit.boundaries.test.ts:19`是未知/退役kind dialogue；S03 makeCanonical().scenes的hooks是数组，报`scenes[0].hooks: 期望对象`；S06 gourdItem缺use.consuming，报期望boolean（还须继续过完整guard，不能只补首个报错）。请从当前合法作者对象构造，不用as unknown洗白。shell从当前投影产生，实际消费前自证。
- **R07-2，排除项反向写绿**：`item-alchemy.boundaries.test.ts:132`测试maxRoll1/rewards空的fallback；`script-reference-catalog.boundaries.test.ts:58`测试authorScripts缺席退旧library。两轴均在设计中明确不扩，撤回新增合同，保留合法扩容/显式空数组不退回的轴。
- **R07-3，S02留本卡补齐**：SaveSceneHookDetails默认项隔离、缺target后session/history不变、最后未引用hook清理三轴确实未交。不是已有证据，不因“会话面大”自动减项；本席裁决并入本卡返工，无需另开小卡/重新三签。
- C0/C1适用；D01全局history、保存缺正文和D06/D07修复归属不扩。


## 目标、上下文与边界

before→after：既有产品行为不变，补有增量的合法合同回归与证据；不把已知缺陷/未定政策写成正确绿测。
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、agent-workflow；一期相关另读engineering-notes及相关game-mechanics，不改变原版真值或二阶段canonical。
工作包逐行caller、旧测试、隔离项构成本卡锚点。共同长期覆盖目标不是本卡硬阈值，也不新增薄E2E前置门。

## 前提真值门

| 维度 | 直接证据/边界 |
|---|---|
| 原版/primary source | 作者编辑数据为本项目自定合同；原版机制N/A，敌人奖励这里只验已定命令树/文本片段，不执行数值或改变概率。 |
| 第一阶段 | N/A——一期没有这些作者编辑API，不用一期运行时形状替代当前canonical作者模型。 |
| 当前二阶段 | ScriptEditor.tsx:3313/3318/3326，ScriptBehaviorInspector:187/264/297、ScriptSceneHookInspector:135/242/253、ItemAlchemyTab:152/160/315与EnemyTab:691是真实调用域；author守卫与canonical/shell分工保留。 |
| 本任务目标 | 只验证已确定且当前有消费的合同；新增文件按工作包白名单。无生产/旧测试/公共fixture/官方基线变更 |

最强替代解释：覆盖空臂已由相邻包测试、输入被上游守卫排除、历史导出无caller、宿主替身替换了真正逻辑、原版/当前行为存在未裁决差异。
可证伪：任一候选找不到实际调用/合法输入，或旧测试已有同一强断言、负控仅超时/TypeError/未执行即“成功”，应分类剔除或counter，不以统计推动实现。
运行时分类、参考行为、原始解码、测试模型四类替代解释均由工作包收窄项显式排查；此卡不授权修迁移/重写生成内容。

## 实施、验证、风险与回滚

1. 三席同r1签齐后由Codex核定准入；GLM每批从最新已接收main开独立分支/worktree，不在主树切分支、不恢复stash、不串未接收成果。
2. 逐族去重，正式合法正控→仅坏目标轴→完整业务断言/实际输入保真；只新增白名单测试/薄fixture/诊断/账，不改产品导出以便测。
3. 宿主窄替身只替边界，实际产品链仍执行；entered/deferred/事件见证替代sleep。负控具体族与最小代表数见工作包，不机械一模块一针。
4. GLM跑定向/相邻/全包/tc/Biome、隔离负控、私有同口径覆盖；Codex独立接收后串行check→ratchet→受保护strict-fast；Kimi独立终审。
5. 真缺陷/未定合同单独归属，不skip/test.fails、不固化错绿；本批可缩减，重大前提变化重签受影响卡，其他卡不陪绑。
风险：虚高覆盖、假合法fixture、输入别名漏测、历史接口保活、跨worktree污染。对策详见工作包；回滚只revert本批测试/文档提交，不恢复旧产品或资产。

## 推进签字

### build前（r1）

- Codex：**premise verified / design agree（2026-09-19，r1，冻结e58834f6）**。本人核script-editor导出实际调用census、script-reference-catalog:130及三caller、item-alchemy:62–130和content/validate:965–980；复跑15文件156项。剔除五个仅测试用CRUD导出、legacy library fallback、非法empty rewards臂；D06/D07不写错绿。 可证伪条件见本卡与工作包；内部协作取证不冒充Kimi/GLM签字。
- Kimi：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；全部证据本人直读，未读 GLM 结论）**。
  - **真实调用域核实**：ScriptEditor.tsx:3313/3318/3326、ScriptBehaviorInspector:187/264/297、
    ScriptSceneHookInspector:135/242/253、ItemAlchemyTab:152/160/315、EnemyTab:691 在册；
    `script-reference-catalog.ts:130` orderedChoices 以 authorScripts ?? scriptIndex.library 回退
    （直读）；item-alchemy:62-130 与 content/validate:965-980 调用链在位。
  - **排除项核实**：五个 script CRUD 导出无当前 caller、legacy library fallback、非法 empty
    rewards 臂被 content 守卫挡住——剔除正确；D-06/D-07 不写错绿。
  - **设计同意**：作者编辑辅助为工程自定合同；只验已定命令树/文本片段（敌人奖励不执行数值
    不改概率）；author 守卫与 canonical/shell 分工保留；逐族去重+合法正控+负控业务红。
  - **可证伪观察**：① 候选族无现行 caller 或已有同强断言 → 剔除/登记；② 拟造输入不在
    支持域 → 撤回；③ 负控仅 TypeError/超时 → 无效；④ 以作者壳数据冒充 canonical 输入 →
    域错；⑤ 产品/旧测试/基线 diff → 停。
  - 返工项：无。
- GLM：**premise verified / design agree**（2026-09-19，r1，冻结 e58834f6；以下锚点本人直读，未读 Kimi 结论）**。
  - **七模块与 caller**：script-reference-catalog 消费点（ScriptEditor.tsx:41 import；
    App/DataMode/ItemTab 传 authorScripts）直读；五个 CRUD 导出（Copy/Rename/SetInitial 等）
    仅定义/测试无 UI 使用——工作包"只分类不保活"正确。
  - **S03 projection 边界**："承诺 clone 处验别名、刻意复用 canonical 字段不强测全域无 alias"
    的分域口径比一刀切 immutability 正确——与 TB-00 返工教训（原地改 state 是合同）同源。
  - **item-alchemy 防御臂**：:76 空 rewards / :92 缺 use 被前置守卫拦——不造非法正控刷臂正确。
  - **D-06/D-07 隔离**：留 Codex 修复、不承诺默认红转绿——与本席历次审查口径一致。
  - **可证伪观察**：①CRUD 导出找到真实 UI caller→升级为候选重验；②投影 callback 用同值
    canonical/shell 测不出取舍→须不同值；③mutator 原地改克隆断言要比实际 session 而非另克隆。
  - 返工项：无。
- build准入：三席r1设计签字保持；用户本轮明确批准额度空窗期九批先行实施（排期例外），本卡据此进入实施后接收。当前counter/rework不要求重签设计，未开放done；不将本次例外泛化给未来新批。

### done前

- Codex：pending（2026-09-20，源10cc9d4d本地接收通过且已集成；统一质量门完成后补最终accept，先前counter已闭合，历史证据见上文）。
- GLM：pending。
- Kimi：pending。
- done准入：未开放；不代签、不标done。

## 交接日志

- 2026-09-20 Codex：独立复核10cc9d4d，本批残项闭合并逐批集成，待统一质量门。不代签、不标done；当前提示词以本轮报告为准。

- 2026-09-19 GLM：按 Codex 返工复核 counter 完成 r3 收窄返工（C0 精确唯一目标、C1 白名单
  Biome、R07-3 S02 非空 redo 在缺 target 拒绝后完整保留与精确重放、撤回 audit 归因）。
  详见工作包 r3 回执与机账 rework2 节。


- 2026-09-19 Codex：复核b86f235d，按本轮报告收窄counter；原七针与五夹具已关闭。最终树格式与精确唯一判据仍失败，不重签、不并包、不标done。
- 2026-09-19 Codex：按用户九批统一接收授权独立审本候选；测试通过不等于证据有效，签counter并转rework，返工限公共C0/C1及本卡章节。GLM原回执/他席签字保留；用户最新确认Mimosa为GLM私有MCP，Codex不处理且不作接收门；TB00/TB01另排。
- 2026-09-19 GLM：按用户拍板（Codex 额度空窗期先行实施 TB-02～TB-10）领取 TB-07 并完成实施
  （r1，六/七族）。worktree `type-pal-glm-script-helpers`、分支
  `codex/glm-editor-script-helpers-r1`、基点 41cc7cd9；产品零漂移已核。交付：6 新测试文件
  17 项；tc/Biome/官方口径 2359→2376 双 exit0；负控 7 针+3 对照全 detected。**S02 会话级族
  显式未落**（SaveSceneHookDetails/缺 target/最后 hook 清理三轴留待补批，见工作包回执）。
  状态同步 build；不代签 done，等 Codex 恢复额度后统一接收（S02 待补请接收时一并裁决）。

- 2026-09-19 Kimi：完成 r1 独立前提/风险审查（TB-07），签 premise verified + design agree，
  无返工项。直读 ScriptEditor/两个 Inspector/ItemAlchemyTab/EnemyTab 真实调用域、
  script-reference-catalog.ts:130 回退、item-alchemy 与 validate 链；五个无 caller CRUD 导出与
  非法 empty rewards 臂剔除核实。五条可证伪观察写入本席。未改产品/他席/状态，未读 GLM 结论。
  Next：三席齐后 Codex 统一准入。
- 2026-09-19 GLM：完成 r1 设计审核（七批联审之一），签本人席位，无返工项。证据见 build 前 GLM 签字块；未读 Kimi 结论。

- 2026-09-19 Codex：用户要求把剩余批次一次细化审核；本卡r1连同TB-04～10准备。逐项收窄无caller、非法fixture、已有断言和未定政策；内部并行只读取证由本人核关键primary锚点，非他席签字。既有套件复跑及限制在统一审核页，未新增正式测试或改产品，待两席并行审核。

## 历史交接提示词

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-EDITOR-SCRIPT-HELPERS-1-authoring-boundaries.md（r1/draft，生产冻结e58834f6）。先同步并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/glm-editor-script-helpers.md、docs/testing/glm-coverage-remaining-review.md；一期范围额外读engineering-notes和相关真值。
Kimi负责独立前提/架构风险压力测试；GLM负责独立调用域、旧测试去重、合法fixture/负控可实施性。二者并行、不读/复述另一席结论；完整七批合并提示词见统一审核页。
只在本人build前席位/本人日志写带primary file:line与可证伪观察的premise verified/design agree或counter，提交推送前同步保留另一席。不得改产品/正式测试/另一席/任务状态，不标build/done。七卡独立裁决，不因一张counter阻塞全部；三席齐后Codex统一准入。
```

## 当前下一位Agent提示词：GLM

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-EDITOR-SCRIPT-HELPERS-1（TB-07），卡 docs/ops/tasks/TEST-EDITOR-SCRIPT-HELPERS-1-authoring-boundaries.md 已rework，候选90369143，生产冻结e58834f6；设计r1不重签。
先同步当前Codex counter到独立 codex/glm-editor-script-helpers-r1，读AGENTS/CLAUDE/READ-FIRST、docs/testing/glm-delivery-checklist.md、本卡当前裁决和 docs/testing/glm-nine-intake-review.md 的公共C0/C1与TB-07章节、原工作包docs/testing/glm-editor-script-helpers.md。
只修列明残项，保留有效测试与他席结论；正式guard合法、实际同一入参深快照、禁止把已排除未知/旧接口写正确绿测。公共工具判据必须按目标错误首行，真实运行与自测同函数。原负控+本席相关独立见证、定向/相邻/全包/tc/全部新TS/MJS/MTS/JSON的Biome及私有同口径覆盖从最终树复跑，失败/未完成如实记录。
只动原白名单/本人回执，分支不互合、不改产品/旧测试/官方基线/原审计探针/他席见证语义，不代签、不标done、不直接转Kimi。修完本批即可单独交Codex接收；全仓check/ratchet/strict-fast留接收后，用户已确认Mimosa归GLM私有MCP，Codex无需处理，不作为本轮接收/合并门。
```
