# TEST-MIGRATION-BOUNDARIES-1 - 当前迁移辅助与隔离文件系统补测（TB-10）

Status: draft
Phase: phase2
Capability: 已有合同补测，不改变能力地图
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-migration-boundaries-r1（准入后独立worktree使用）

Revision: r1，2026-09-19。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`，策划树 `4473c367`。
完整族账/去重/唯一白名单：[工作包](../../testing/glm-migration-boundaries.md)。共同规则与合并交接：[七批统一审核](../../testing/glm-coverage-remaining-review.md)。

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
- build准入：**未开放**。本批是已细化待审核，不因队列存在或其他批签字自动开始实现。签齐后Codex再核；TB-00返工优先、未接收实施包合计最多两批。

### done前

- GLM：pending。
- Codex：pending。
- Kimi：pending。
- done准入：未开放；不代签、不标done。

## 交接日志
- 2026-09-19 Kimi：完成 r1 独立前提/风险审查（TB-10），签 premise verified + design agree，
  无返工项。直读 migrate-content.mts 物化→write-plan→transaction 链、pal-current-publication
  seed/作者 invariant 区分、pal-migration.ts:423 固定 r13SixBExecution:true；A08/A09/E05 为独立
  修复项不被测试保活或误关核实；FS 仅自建临时根。五条可证伪观察写入本席。未改产品/他席/
  状态，未读 GLM 结论。Next：三席齐后 Codex 统一准入。
- 2026-09-19 GLM：完成 r1 设计审核（七批联审之一），签本人席位，无返工项。证据见 build 前 GLM 签字块；未读 Kimi 结论。

- 2026-09-19 Codex：用户要求把剩余批次一次细化审核；本卡r1连同TB-04～10准备。逐项收窄无caller、非法fixture、已有断言和未定政策；内部并行只读取证由本人核关键primary锚点，非他席签字。既有套件复跑及限制在统一审核页，未新增正式测试或改产品，待两席并行审核。

## 下一位Agent提示词

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-MIGRATION-BOUNDARIES-1-current-isolated-io.md（r1/draft，生产冻结e58834f6）。先同步并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/glm-migration-boundaries.md、docs/testing/glm-coverage-remaining-review.md；一期范围额外读engineering-notes和相关真值。
Kimi负责独立前提/架构风险压力测试；GLM负责独立调用域、旧测试去重、合法fixture/负控可实施性。二者并行、不读/复述另一席结论；完整七批合并提示词见统一审核页。
只在本人build前席位/本人日志写带primary file:line与可证伪观察的premise verified/design agree或counter，提交推送前同步保留另一席。不得改产品/正式测试/另一席/任务状态，不标build/done。七卡独立裁决，不因一张counter阻塞全部；三席齐后Codex统一准入。
```
