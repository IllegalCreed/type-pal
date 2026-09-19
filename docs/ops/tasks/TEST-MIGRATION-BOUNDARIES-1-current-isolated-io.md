# TEST-MIGRATION-BOUNDARIES-1 - 当前迁移辅助与隔离文件系统补测（TB-10）

Status: rework
Phase: phase2
Capability: 已有合同补测，不改变能力地图
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-migration-r1

Revision: r1，2026-09-19。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`，策划树 `4473c367`。
完整族账/去重/唯一白名单：[工作包](../../testing/glm-migration-boundaries.md)。共同规则与合并交接：[七批统一审核](../../testing/glm-coverage-remaining-review.md)。


## 当前返工复核（Codex，2026-09-19，76bafede）

**counter，保持rework**。原七针/五夹具已关闭；公共C0精确唯一目标和C1最终树格式/回执仍未满足。
定向23项、原3+9跑与包tc通过；本批Biome 11文件/12 errors/2 warnings，exit1。
本批无其他新业务返工，保留已通过断言。
见[本轮复核及提示词](../../testing/glm-nine-rework-review.md)与[机账](../../testing/glm-nine-rework-evidence.json)。
不合并、不更基线、不转Kimi、不代签、不标done；设计保持，Mimosa不参与。

## 首轮接收裁决（历史）

用户本轮明确批准九批先行实施、Codex恢复后统一接收；认可本批排期例外，不因旧两槽限制追溯判违规。设计签字保持，不重签。
**本席独立结论counter，任务rework，未合入正式测试/产品、不更新官方基线、不转Kimi终审。**
定向22项、原3对照+9针、包typecheck均通过；
Biome实测11文件/11 errors/2 warnings。
见[统一复核 TB-10](../../testing/glm-nine-intake-review.md#tb-10)与[机器接收账](../../testing/glm-nine-intake-evidence.json)。
公共C0判据误收适用，C1全部新增文件格式/回执不符也须修复；具体最小返工如下。

- **R10-1，baseline快照浅别名**：`migration-write-plan.boundaries.test.ts:52–55`只展开Map，value仍与输入共享。单点在返回前污染nextBaseline的JSON值，候选2/2仍绿、深快照oracle红（`writer-mutates-baseline-json`）。对实际Map/Set/嵌套JSON做调用前深快照，别用浅entries冒充。
- **R10-2，E05旧发现接口保活**：`migration-project-io.boundaries.test.ts:62–74`新测content/scripts/index的chunks，已签T01排除。撤回该新合同；scene/map当前发现及TOCTOU继续。
- **R10-3，journal反例不够精确**：`migration-transaction.boundaries.test.ts:91–119`只断言不是recovered，任何别的异常都能过；单操作已经提交后才中断，未留下待提交staging；所谓“全文件保留”只核journal和一个target。用至少两操作的真实中断造pending，再一轴改坏、钉准确业务错误/全部自建文件快照，合法同journal恢复对照必须成功。
- **R10-4，T08归属勘误**：本席实际args().scenes经validateAuthorScenes接受，**不把zone:true误判非法**。当前两root分场景独立链不等于已签同root菱形；补菱形或给等价旧测试精确证据，不能改标题充数。
- C0/C1适用。A08/A09不由journal既有守卫盖章已修；仅自建mkdtemp，不操作真实工程或恢复stash。


## 目标、上下文与边界

before→after：既有产品行为不变，补有增量的合法合同回归与证据；不把已知缺陷/未定政策写成正确绿测。
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、agent-workflow；一期相关另读engineering-notes及相关game-mechanics，不改变原版真值或二阶段canonical。
工作包逐行caller、旧测试、隔离项构成本卡锚点。共同长期覆盖目标不是本卡硬阈值，也不新增薄E2E前置门。

## 前提真值门

| 维度 | 直接证据/边界 |
|---|---|
| 原版/primary source | PAL输入格式依SDL global.h、map.c与source-facts所引script.c:2230–2243；迁移journal/作者标签是本项目自定合同。A08/A09的一手动态审计已有，不以此包已有guard覆盖来否认真实缺陷。 |
| 第一阶段 | packed地图输入及原角色name WORD保持原位模式与映射；不改碰撞公式、不把原版sourceId当二阶段作者ID。 |
| 当前二阶段 | migrate/scripts/migrate-content.mts:110–143调用物化→write-plan→transaction；pal-current-publication:181–209/316/357区分生成seed与作者合并后的invariant；pal-migration:419–424当前固定r13SixBExecution:true。 |
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

- Codex：**premise verified / design agree（2026-09-19，r1，冻结e58834f6）**。本人直读journal全量校验/提交序、write-plan、project-io、地图转换/审计、source-facts、两消息同步函数、label图和Store0边界及正式caller、A08/A09/E05记录，复跑migrate八文件135项。明确旧script index/R13 false不补，Store固定20只约束生成seed；文件系统仅自建临时根。 可证伪条件见本卡与工作包；内部协作取证不冒充Kimi/GLM签字。
- Kimi：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；全部证据本人直读，未读 GLM 结论）**。
  - **迁移链核实**：`migrate-content.mts:110+` 物化→snapshot→write-plan→transaction 调用链
    直读在位；`pal-current-publication.ts` 区分生成 seed 与作者合并后的 invariant；
    `pal-migration.ts:423` 当前固定 `r13SixBExecution: true`——锚点属实。
  - **A08/A09/E05 隔离核实**：journal 守卫的已有覆盖不等于迁移全链已安全——A08
    snapshot→journal 窗口、A09 先行物化 symlink 仍为独立修复项，本包只测已有守卫，
    不宣称问题已修；E05 历史输入/producer 不新增保活测试——纪律正确。
  - **设计同意**：FS 只在自建 mkdtemp 临时根；不执行真实 extract/migrate/bake、不改 PAL
    工程；旧 script index/R13 false 不补；Store 固定 20 只约束生成 seed；逐族去重+负控
    业务红。
  - **可证伪观察**：① 候选族已有同强断言 → 登记已有；② 拟造输入不在支持域 → 撤回；
    ③ 负控仅 TypeError/超时 → 无效；④ 测试断言把 A08/A09/E05 写成已修 → 越界；
    ⑤ 产品/旧测试/基线 diff → 停。
  - 返工项：无。
- GLM：**premise verified / design agree**（2026-09-19，r1，冻结 e58834f6；以下锚点本人直读，未读 Kimi 结论）**。
  - **九模块与 caller**：migrate-content.mts:116–143 调用链、publication:181–316 锚点
    直读；migration-project-io.ts:88 起 snapshot/managedFiles 检查在位。
  - **A08/A09/E05 隔离**：卡面明确"journal 守卫测试不等于迁移全链安全；A08 snapshot→journal
    窗口、A09 symlink 先行物化归独立修复台账；E05 历史输入不保活"——只测已有守卫不宣称已修。
  - **FS 边界**：全部 mkdtemp 自建根、不跑真 extract/migrate/bake、不触 projects/data/baseline
    ——工作包命令均带临时根参数，可实施。
  - **T07/T08 收窄**：仅 current r13SixBExecution:true；entry.prepare 仅 onEnter 初始态
    （author-script-core:957/991 守卫）——与 TB-00 同类坑位已吸收。
  - **可证伪观察**：①journal 用手写 JSON 而非真实 commit+中断产生→无效；②hash diff 期望
    用产品函数回算→oracle 不独立；③任何真实工程路径写入→越界即停。
  - 返工项：无。
- build准入：三席r1设计签字保持；用户本轮明确批准额度空窗期九批先行实施（排期例外），本卡据此进入实施后接收。当前counter/rework不要求重签设计，未开放done；不将本次例外泛化给未来新批。

### done前

- Codex：**counter（2026-09-19，候选bd597558）**。本人独立复跑定向/原负控/tc与全部新增文件Biome，抽核合法输入/实际对象/范围；C0与本卡TB-10返工证据已落[统一复核](../../testing/glm-nine-intake-review.md#tb-10)。不合并、不代签、不标done；设计有效不重签。

- GLM：pending。
- Kimi：pending。
- done准入：未开放；不代签、不标done。

## 交接日志
- 2026-09-19 GLM：按 Codex 返工复核 counter 完成 r3 收窄返工（C0 精确唯一目标、C1 白名单
  Biome 含长行/import 清理）。详见工作包 r3 回执与机账 rework2 节。


- 2026-09-19 Codex：复核76bafede，按本轮报告收窄counter；原七针与五夹具已关闭。最终树格式与精确唯一判据仍失败，不重签、不并包、不标done。
- 2026-09-19 Codex：按用户九批统一接收授权独立审本候选；测试通过不等于证据有效，签counter并转rework，返工限公共C0/C1及本卡章节。GLM原回执/他席签字保留；用户最新确认Mimosa为GLM私有MCP，Codex不处理且不作接收门；TB00/TB01另排。
- 2026-09-19 GLM：按用户拍板（Codex 额度空窗期先行实施 TB-02～TB-10）领取 TB-10 并完成实施
  （r1，九/九族）。worktree `type-pal-glm-migration`、分支 `codex/glm-migration-r1`、基点
  41cc7cd9；产品零漂移已核。交付：8 新测试文件 22 项；tc/Biome/官方口径 338→360 双 exit0；
  负控 9 针+3 对照全 detected。TB-02～TB-10 九批实施包至此全部交付，等待 Codex 额度恢复后
  统一接收（含 TB-07 S02 会话级族待补的裁决）。状态同步 build；不代签 done。

- 2026-09-19 Kimi：完成 r1 独立前提/风险审查（TB-10），签 premise verified + design agree，
  无返工项。直读 migrate-content.mts 物化→write-plan→transaction 链、pal-current-publication
  seed/作者 invariant 区分、pal-migration.ts:423 固定 r13SixBExecution:true；A08/A09/E05 为独立
  修复项不被测试保活或误关核实；FS 仅自建临时根。五条可证伪观察写入本席。未改产品/他席/
  状态，未读 GLM 结论。Next：三席齐后 Codex 统一准入。
- 2026-09-19 GLM：完成 r1 设计审核（七批联审之一），签本人席位，无返工项。证据见 build 前 GLM 签字块；未读 Kimi 结论。

- 2026-09-19 Codex：用户要求把剩余批次一次细化审核；本卡r1连同TB-04～10准备。逐项收窄无caller、非法fixture、已有断言和未定政策；内部并行只读取证由本人核关键primary锚点，非他席签字。既有套件复跑及限制在统一审核页，未新增正式测试或改产品，待两席并行审核。

## 历史交接提示词（Codex 额度恢复后统一接收 TB-02～TB-10 九批）

```text
在 /Users/zhangxu/illegal/type-pal 统一接收 GLM 在你额度空窗期交付的 TB-02～TB-10 九批实施包
（用户拍板 2026-09-17：先行实施、恢复后一起检查）。九批全部基于冻结 e58834f6、基点 41cc7cd9、
产品零漂移（git diff e58834f6..各分支 -- packages/ 为空），独立分支互不合入：

  TB-02 codex/glm-reforge-asset-io-r1     a7c48d9c  24项+8针（reforge）
  TB-03 codex/glm-editor-import-codec-r1   f4c229ed  39项+8针（editor）
  TB-04 codex/glm-pal-tables-r1            851a6ede  19项+8针（pal-extract）
  TB-05 codex/glm-resource-tools-r1        d083e5c6  24项+9针（shared+pal-extract）
  TB-06 codex/glm-editor-map-data-r1       0563eda7  18项+8针（editor）
  TB-07 codex/glm-editor-script-helpers-r1 90369143  17项+7针（editor；S02 会话级族显式未落）
  TB-08 codex/glm-game-menu-r1             b1deae49  17项+8针（game）
  TB-09 codex/glm-game-host-r1             61f0af34  25项+8针（game）
  TB-10 codex/glm-migration-r1             fdf91ca9  22项+9针（migrate）

每批形态一致：白名单测试/fixture + 单点变异脚本 docs/testing/glm-<batch>-mutants.mjs
（钉名 AssertionError 判据+四向自测+产品 hash 不变断言）+ 覆盖对照 config + 机器账
evidence.json + 工作包回执 + 卡/看板/索引同步 build。逐批先跑对应 mutants 脚本与定向测试
复核，再按你的接收流程合并；接收中发现的返工逐卡开 counter。两个已知披露项请你接收时一并
裁决：① TB-07 S02（ScriptEditSession 会话级三轴）未落；② TB-02/03 起各批"预存环境失败"
（fresh worktree 缺未跟踪 data/raw、data/extracted、projects/pal 资产）已在回执记录并与
stash 基线核对一致。全仓 check/官方 ratchet/strict-fast 与 Mimosa 完整深度审计（近期 commit/push
多次 scanner_enobufs，按兼容策略放行但未宣称安全）由你串行执行。不代签 done；接收完成后
按卡走 Kimi 终审。
```
## 历史交接提示词

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-MIGRATION-BOUNDARIES-1-current-isolated-io.md（r1/draft，生产冻结e58834f6）。先同步并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/glm-migration-boundaries.md、docs/testing/glm-coverage-remaining-review.md；一期范围额外读engineering-notes和相关真值。
Kimi负责独立前提/架构风险压力测试；GLM负责独立调用域、旧测试去重、合法fixture/负控可实施性。二者并行、不读/复述另一席结论；完整七批合并提示词见统一审核页。
只在本人build前席位/本人日志写带primary file:line与可证伪观察的premise verified/design agree或counter，提交推送前同步保留另一席。不得改产品/正式测试/另一席/任务状态，不标build/done。七卡独立裁决，不因一张counter阻塞全部；三席齐后Codex统一准入。
```

## 当前下一位Agent提示词：GLM

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-MIGRATION-BOUNDARIES-1（TB-10），卡 docs/ops/tasks/TEST-MIGRATION-BOUNDARIES-1-current-isolated-io.md 已rework，候选bd597558，生产冻结e58834f6；设计r1不重签。
先同步当前Codex counter到独立 codex/glm-migration-r1，读AGENTS/CLAUDE/READ-FIRST、docs/testing/glm-delivery-checklist.md、本卡当前裁决和 docs/testing/glm-nine-intake-review.md 的公共C0/C1与TB-10章节、原工作包docs/testing/glm-migration-boundaries.md。
只修列明残项，保留有效测试与他席结论；正式guard合法、实际同一入参深快照、禁止把已排除未知/旧接口写正确绿测。公共工具判据必须按目标错误首行，真实运行与自测同函数。原负控+本席相关独立见证、定向/相邻/全包/tc/全部新TS/MJS/MTS/JSON的Biome及私有同口径覆盖从最终树复跑，失败/未完成如实记录。
只动原白名单/本人回执，分支不互合、不改产品/旧测试/官方基线/原审计探针/他席见证语义，不代签、不标done、不直接转Kimi。修完本批即可单独交Codex接收；全仓check/ratchet/strict-fast留接收后，用户已确认Mimosa归GLM私有MCP，Codex无需处理，不作为本轮接收/合并门。
```
